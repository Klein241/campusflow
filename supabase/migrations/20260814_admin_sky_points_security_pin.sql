-- ════════════════════════════════════════════════════════════════
-- CAMPUSFLOW — Migration: Admin Sky Points & Security PIN System
-- ════════════════════════════════════════════════════════════════

-- 1. Add sky_points (default 1000), security_pin, monitoring_unlocked and last_daily_claim to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sky_points INTEGER DEFAULT 1000;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS security_pin TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS monitoring_unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_daily_claim DATE;

-- 2. Ensure existing organizations have at least 1000 sky_points
UPDATE organizations 
SET sky_points = 1000 
WHERE sky_points IS NULL OR sky_points < 1000;
