-- GreenCrowd V2 — PostGIS spatial columns & constraints
-- This migration is applied AFTER the initial `prisma migrate deploy`.
-- Adds GEOGRAPHY columns, GIST indexes, domain constraints and Row Level Security.

-- ─────────────────────────────────────────────────────────────
-- GEOGRAPHY columns for Areas and POIs
-- ─────────────────────────────────────────────────────────────

-- Area: polygon GEOGRAPHY(POLYGON, 4326) column
ALTER TABLE areas
  ADD COLUMN IF NOT EXISTS polygon geography(POLYGON, 4326);

-- GIST index for spatial queries on areas
CREATE INDEX IF NOT EXISTS areas_polygon_gist
  ON areas USING GIST (polygon);

-- Point of Interest: location GEOGRAPHY(POINT, 4326) column
ALTER TABLE points_of_interest
  ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- GIST index for proximity queries
CREATE INDEX IF NOT EXISTS poi_location_gist
  ON points_of_interest USING GIST (location);

-- Function to sync lat/lng with the geography column
CREATE OR REPLACE FUNCTION sync_poi_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_poi_location
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON points_of_interest
  FOR EACH ROW EXECUTE FUNCTION sync_poi_location();

-- UserTrajectory: location GEOGRAPHY(POINT, 4326) column
ALTER TABLE user_trajectories
  ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

CREATE INDEX IF NOT EXISTS user_trajectories_location_gist
  ON user_trajectories USING GIST (location);

CREATE OR REPLACE FUNCTION sync_trajectory_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_trajectory_location
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON user_trajectories
  FOR EACH ROW EXECUTE FUNCTION sync_trajectory_location();

-- GIST index on contributions for geospatial queries
CREATE INDEX IF NOT EXISTS contributions_location_idx
  ON contributions USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  );

-- ─────────────────────────────────────────────────────────────
-- XOR constraint on Task: poi_id XOR area_id
-- ─────────────────────────────────────────────────────────────
ALTER TABLE tasks
  ADD CONSTRAINT task_poi_xor_area
  CHECK (
    (poi_id IS NOT NULL AND area_id IS NULL)
    OR
    (poi_id IS NULL AND area_id IS NOT NULL)
  );

-- ─────────────────────────────────────────────────────────────
-- Unique index for contribution idempotency (single response)
-- The app sends a unique local_id; the server prevents duplicates.
-- ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS contributions_local_id_uidx
  ON contributions (local_id)
  WHERE local_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- Materialized views for Analytics (refreshed every 15 min via cron)
-- ─────────────────────────────────────────────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS v_campaign_stats AS
SELECT
  c.id AS campaign_id,
  c.name,
  c.status,
  COUNT(DISTINCT co.user_id) AS unique_contributors,
  COUNT(co.id) AS total_contributions,
  COUNT(co.id) FILTER (WHERE co.status = 'submitted') AS submitted_contributions,
  COUNT(co.id) FILTER (WHERE co.status = 'validated') AS validated_contributions,
  COUNT(co.id) FILTER (WHERE co.status = 'flagged') AS flagged_contributions,
  COALESCE(SUM(re.points), 0) AS total_points_awarded
FROM campaigns c
LEFT JOIN contributions co ON co.campaign_id = c.id
LEFT JOIN reward_events re ON re.campaign_id = c.id AND re.status = 'applied'
GROUP BY c.id, c.name, c.status;

CREATE UNIQUE INDEX IF NOT EXISTS v_campaign_stats_uidx
  ON v_campaign_stats (campaign_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS v_contributions_geo AS
SELECT
  co.id,
  co.campaign_id,
  co.user_id,
  co.task_id,
  co.status,
  co.submitted_at,
  ST_SetSRID(ST_MakePoint(co.longitude, co.latitude), 4326)::geography AS location,
  co.accuracy_meters
FROM contributions co
WHERE co.status IN ('submitted', 'validated');

CREATE INDEX IF NOT EXISTS v_contributions_geo_location_gist
  ON v_contributions_geo USING GIST (location);
CREATE INDEX IF NOT EXISTS v_contributions_geo_campaign_idx
  ON v_contributions_geo (campaign_id);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────

-- Enable RLS on tables with campaign_id
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_of_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- The app sets app.current_user_id and app.user_role before queries
-- via SET LOCAL in each transaction

-- Policy: campaigns — researcher sees only their campaigns; superadmin sees all
CREATE POLICY campaign_isolation ON campaigns
  USING (
    researcher_id = current_setting('app.current_user_id', true)::uuid
    OR current_setting('app.user_role', true) = 'superadmin'
  );

-- Policy: areas — inherits campaign visibility
CREATE POLICY area_isolation ON areas
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
    )
  );

-- Policy: contributions — contributor sees only their contributions; researcher sees their campaign's
CREATE POLICY contribution_isolation ON contributions
  USING (
    user_id = current_setting('app.current_user_id', true)::uuid
    OR campaign_id IN (
      SELECT id FROM campaigns
      WHERE researcher_id = current_setting('app.current_user_id', true)::uuid
    )
    OR current_setting('app.user_role', true) = 'superadmin'
  );

-- ─────────────────────────────────────────────────────────────
-- Materialized views refresh function
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_campaign_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_contributions_geo;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- Generic audit trigger
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role TEXT;
BEGIN
  v_actor_id := current_setting('app.current_user_id', true)::uuid;
  v_actor_role := current_setting('app.user_role', true);

  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (actor_id, actor_role, entity_type, entity_id, action, old_value)
    VALUES (v_actor_id, v_actor_role, TG_TABLE_NAME, OLD.id::uuid, 'delete', row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (actor_id, actor_role, entity_type, entity_id, action, old_value, new_value)
    VALUES (v_actor_id, v_actor_role, TG_TABLE_NAME, NEW.id::uuid, 'update', row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (actor_id, actor_role, entity_type, entity_id, action, new_value)
    VALUES (v_actor_id, v_actor_role, TG_TABLE_NAME, NEW.id::uuid, 'create', row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_campaigns
  AFTER INSERT OR UPDATE OR DELETE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
