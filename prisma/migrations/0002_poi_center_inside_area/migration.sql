-- Enforce POI center containment in parent area polygon.
-- This runs at DB level to prevent bypass via direct SQL writes.

CREATE OR REPLACE FUNCTION enforce_poi_center_inside_area()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  center_geom geometry;
  inside_area boolean;
BEGIN
  center_geom := COALESCE(
    NEW.location::geometry,
    ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)
  );

  SELECT ST_Covers(a.polygon::geometry, center_geom)
    INTO inside_area
  FROM areas a
  WHERE a.id = NEW.area_id;

  IF inside_area IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION
      'POI center must be inside area polygon (area_id=%).',
      NEW.area_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_poi_inside_area ON points_of_interest;
CREATE TRIGGER trg_enforce_poi_inside_area
  BEFORE INSERT OR UPDATE OF area_id, latitude, longitude, location
  ON points_of_interest
  FOR EACH ROW
  EXECUTE FUNCTION enforce_poi_center_inside_area();
