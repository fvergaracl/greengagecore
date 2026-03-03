-- GreenCrowd V2 — PostgreSQL init script
-- Creates the PostGIS extension and the Keycloak schema

-- PostGIS (required for geospatial geometries)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Separate schema for Keycloak (shares the same DB)
CREATE SCHEMA IF NOT EXISTS keycloak;

-- Helper function for auditing: returns the current timestamp in UTC
CREATE OR REPLACE FUNCTION now_utc()
RETURNS TIMESTAMPTZ AS $$
  SELECT NOW() AT TIME ZONE 'UTC';
$$ LANGUAGE SQL STABLE;
