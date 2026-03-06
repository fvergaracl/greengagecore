-- GreenCrowd V2 — PostGIS migration
-- Adds GEOGRAPHY columns, GIST indexes, RLS policies, and views
-- that cannot be expressed in the Prisma schema.
-- Apply AFTER prisma db push / prisma migrate deploy.

-- ── GEOGRAPHY columns ─────────────────────────────────────────────────────────

-- areas.polygon: GEOGRAPHY(POLYGON, 4326)
ALTER TABLE areas
  ADD COLUMN IF NOT EXISTS polygon geography(Polygon, 4326);

-- points_of_interest.location: GEOGRAPHY(POINT, 4326)
ALTER TABLE points_of_interest
  ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- user_trajectories.position: GEOGRAPHY(POINT, 4326)
ALTER TABLE user_trajectories
  ADD COLUMN IF NOT EXISTS position geography(Point, 4326);

-- ── GIST spatial indexes ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_areas_polygon
  ON areas USING GIST (polygon);

CREATE INDEX IF NOT EXISTS idx_pois_location
  ON points_of_interest USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_trajectories_position
  ON user_trajectories USING GIST (position);

-- ── Populate geography from existing GeoJSON data (idempotent) ────────────────

UPDATE areas
  SET polygon = ST_GeomFromGeoJSON(polygon_geojson::text)::geography
  WHERE polygon IS NULL
    AND polygon_geojson IS NOT NULL;

-- ── Row-Level Security ────────────────────────────────────────────────────────

-- Enable RLS on tables that need per-user isolation
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trajectories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- contributions: user can only see their own; researchers see campaign contributions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contributions' AND policyname='contributions_user_isolation') THEN
    CREATE POLICY contributions_user_isolation ON contributions
      USING (
        user_id = current_setting('app.current_user_id', true)::uuid
        OR current_setting('app.current_user_role', true) IN ('researcher', 'superadmin')
      );
  END IF;

  -- reward_events: user sees only their own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reward_events' AND policyname='reward_events_user_isolation') THEN
    CREATE POLICY reward_events_user_isolation ON reward_events
      USING (
        user_id = current_setting('app.current_user_id', true)::uuid
        OR current_setting('app.current_user_role', true) = 'superadmin'
      );
  END IF;

  -- user_settings: user sees only their own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_settings' AND policyname='user_settings_isolation') THEN
    CREATE POLICY user_settings_isolation ON user_settings
      USING (user_id = current_setting('app.current_user_id', true)::uuid);
  END IF;

  -- user_wallets: user sees only their own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_wallets' AND policyname='user_wallets_isolation') THEN
    CREATE POLICY user_wallets_isolation ON user_wallets
      USING (user_id = current_setting('app.current_user_id', true)::uuid);
  END IF;

  -- user_trajectories: user sees only their own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_trajectories' AND policyname='user_trajectories_isolation') THEN
    CREATE POLICY user_trajectories_isolation ON user_trajectories
      USING (user_id = current_setting('app.current_user_id', true)::uuid);
  END IF;

  -- questionnaire_responses: user sees only their own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='questionnaire_responses' AND policyname='questionnaire_responses_isolation') THEN
    CREATE POLICY questionnaire_responses_isolation ON questionnaire_responses
      USING (
        user_id = current_setting('app.current_user_id', true)::uuid
        OR current_setting('app.current_user_role', true) IN ('researcher', 'superadmin')
      );
  END IF;
END$$;

-- ── Materialized view: campaign stats ─────────────────────────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_campaign_stats AS
  SELECT
    c.id                                              AS campaign_id,
    COUNT(DISTINCT cn.user_id)                        AS unique_contributors,
    COUNT(cn.id)                                      AS total_contributions,
    COUNT(cn.id) FILTER (WHERE cn.status = 'validated') AS validated_contributions,
    COALESCE(SUM(re.points), 0)                       AS total_points_awarded,
    MAX(cn.submitted_at)                              AS last_contribution_at
  FROM campaigns c
  LEFT JOIN areas a ON a.campaign_id = c.id
  LEFT JOIN points_of_interest p ON p.area_id = a.id
  LEFT JOIN tasks t ON t.poi_id = p.id
  LEFT JOIN contributions cn ON cn.task_id = t.id
  LEFT JOIN reward_events re ON re.contribution_id = cn.id AND re.status = 'applied'
  GROUP BY c.id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_campaign_stats_campaign_id
  ON mv_campaign_stats (campaign_id);

-- ── Trigger: refresh materialized view on contribution change ─────────────────

CREATE OR REPLACE FUNCTION refresh_campaign_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campaign_stats;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_campaign_stats ON contributions;
CREATE TRIGGER trg_refresh_campaign_stats
  AFTER INSERT OR UPDATE OR DELETE ON contributions
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_campaign_stats();
