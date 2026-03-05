-- Add timezone to campaigns for campaign-level local scheduling semantics.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';
