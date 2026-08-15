-- ═══════════════════════════════════════════════════════════════════
-- CAMPUSFLOW — BUG REPORTS & SKY POINTS TRANSACTIONS
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Table bug_reports
CREATE TABLE IF NOT EXISTS bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL DEFAULT 'Anonyme',
    user_role TEXT NOT NULL DEFAULT 'student', -- 'student' | 'teacher' | 'admin'
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    org_name TEXT,
    org_slug TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    screenshot_url TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'in_progress' | 'resolved' | 'wontfix'
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for bug_reports
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "users_insert_bug_reports" ON bug_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can read their own reports
CREATE POLICY "users_read_own_bug_reports" ON bug_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Superadmin can read all bug reports (SECURITY DEFINER RPC)
CREATE POLICY "superadmin_read_bug_reports" ON bug_reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
    );

-- 2. Table sky_points_transactions (historique)
CREATE TABLE IF NOT EXISTS sky_points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_type TEXT NOT NULL DEFAULT 'superadmin', -- 'superadmin'
    to_entity_type TEXT NOT NULL, -- 'org' | 'user'
    to_entity_id UUID NOT NULL,
    to_entity_name TEXT,
    org_name TEXT,
    amount INTEGER NOT NULL, -- positif = crédit, négatif = débit
    note TEXT,
    performed_by TEXT DEFAULT 'superadmin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for sky_points_transactions
ALTER TABLE sky_points_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all_sky_transactions" ON sky_points_transactions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
    );

-- 3. Table announcements_history (pour lister les annonces envoyées par le superadmin)
CREATE TABLE IF NOT EXISTS superadmin_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'all', -- 'all' | 'org'
    target_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    target_org_name TEXT,
    ann_type TEXT NOT NULL DEFAULT 'info', -- 'info' | 'warning' | 'success' | 'urgent'
    sent_to_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT DEFAULT 'superadmin'
);

ALTER TABLE superadmin_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all_announcements" ON superadmin_announcements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
    );

-- 4. Trigger to update updated_at on bug_reports
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bug_reports_updated_at ON bug_reports;
CREATE TRIGGER bug_reports_updated_at
    BEFORE UPDATE ON bug_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. RPC to get all bug reports (for superadmin)
CREATE OR REPLACE FUNCTION superadmin_get_bug_reports()
RETURNS SETOF bug_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is platform admin
    IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    RETURN QUERY SELECT * FROM bug_reports ORDER BY created_at DESC LIMIT 500;
END;
$$;

-- 6. RPC to get sky points transaction history
CREATE OR REPLACE FUNCTION superadmin_get_points_history()
RETURNS SETOF sky_points_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    RETURN QUERY SELECT * FROM sky_points_transactions ORDER BY created_at DESC LIMIT 500;
END;
$$;

-- 7. RPC to get superadmin announcements history
CREATE OR REPLACE FUNCTION superadmin_get_announcements_history()
RETURNS SETOF superadmin_announcements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    RETURN QUERY SELECT * FROM superadmin_announcements ORDER BY created_at DESC LIMIT 200;
END;
$$;

-- 8. Update organizations select to fix the orgs loading issue
-- Fixed superadmin_get_orgs with all required columns
CREATE OR REPLACE FUNCTION superadmin_get_orgs()
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    school_type TEXT,
    city TEXT,
    country TEXT,
    custom_domain TEXT,
    domain_verified BOOLEAN,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    logo_url TEXT,
    student_count BIGINT,
    teacher_count BIGINT,
    sky_points INTEGER,
    phone TEXT,
    email TEXT,
    brand_color TEXT,
    landing_layout TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    RETURN QUERY
    SELECT
        o.id,
        o.name::TEXT,
        o.slug::TEXT,
        COALESCE(o.school_type, o.type, 'École')::TEXT AS school_type,
        COALESCE(o.city, '')::TEXT,
        COALESCE(o.country, 'Cameroun')::TEXT,
        o.custom_domain::TEXT,
        COALESCE(o.domain_verified, FALSE),
        COALESCE(o.is_active, TRUE),
        o.created_at,
        o.logo_url::TEXT,
        (SELECT COUNT(*) FROM student_profiles sp WHERE sp.organization_id = o.id)::BIGINT,
        (SELECT COUNT(*) FROM teacher_profiles tp WHERE tp.organization_id = o.id)::BIGINT,
        COALESCE(o.sky_points, 0),
        o.phone::TEXT,
        o.email::TEXT,
        o.brand_color::TEXT,
        o.landing_layout::TEXT
    FROM organizations o
    ORDER BY o.created_at DESC;
END;
$$;
