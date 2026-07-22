-- ============================================================
-- Migration 023: Fix sky_point_requests FK constraint
-- The user_id and credited_by columns reference auth.users(id)
-- but CampusFlow users are stored in student_profiles / teacher_profiles
-- (they authenticate via access codes, NOT Supabase Auth).
-- This migration drops those FK constraints so custom user IDs work.
-- ============================================================

-- 1. Drop the foreign key on user_id (if it exists)
ALTER TABLE sky_point_requests
    DROP CONSTRAINT IF EXISTS sky_point_requests_user_id_fkey;

-- 2. Drop the foreign key on credited_by (if it exists)
ALTER TABLE sky_point_requests
    DROP CONSTRAINT IF EXISTS sky_point_requests_credited_by_fkey;

-- 3. Ensure the columns are UUID type (they should already be)
-- ALTER TABLE sky_point_requests ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- 4. Add sensible indexes for query performance
CREATE INDEX IF NOT EXISTS idx_sky_point_requests_user_id ON sky_point_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sky_point_requests_org_id ON sky_point_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_sky_point_requests_status ON sky_point_requests(status);

-- 5. Make sure RLS policies allow superadmin to read/update
-- (Run with superadmin service_role key — no RLS needed for admin)

-- 6. Grant insert to anon/authenticated (students use anon key)
GRANT INSERT, SELECT ON sky_point_requests TO anon;
GRANT INSERT, SELECT, UPDATE ON sky_point_requests TO authenticated;
