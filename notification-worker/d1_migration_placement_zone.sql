-- D1 migration: add placement_zone to advertisements
-- SQLite syntax (no IF NOT EXISTS on ADD COLUMN in older SQLite)
ALTER TABLE advertisements ADD COLUMN placement_zone TEXT DEFAULT 'feed';
