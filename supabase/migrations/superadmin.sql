-- ═══════════════════════════════════════════════════════════════
-- SUPERADMIN — Platform-level administration
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── Table: platform_admins ────────────────────────────────────
-- Stores user_ids that have platform-level (superadmin) access.
CREATE TABLE IF NOT EXISTS platform_admins (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    name         TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    last_login   TIMESTAMPTZ,
    UNIQUE(user_id)
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read their own row
CREATE POLICY "platform_admins_self_read" ON platform_admins
    FOR SELECT USING (auth.uid() = user_id);

-- ─── RPC: is_platform_admin ────────────────────────────────────
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    );
$$;

-- ─── RPC: superadmin_get_stats ─────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_get_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_orgs      INTEGER;
    v_students  INTEGER;
    v_teachers  INTEGER;
    v_domains   INTEGER;
    v_new_orgs  INTEGER;
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    SELECT COUNT(*) INTO v_orgs FROM organizations;
    SELECT COUNT(*) INTO v_students FROM student_profiles;
    SELECT COUNT(*) INTO v_teachers FROM teacher_profiles;
    SELECT COUNT(*) INTO v_domains FROM organizations WHERE custom_domain IS NOT NULL AND custom_domain != '';
    SELECT COUNT(*) INTO v_new_orgs FROM organizations WHERE created_at > NOW() - INTERVAL '7 days';

    RETURN json_build_object(
        'total_orgs',     v_orgs,
        'total_students', v_students,
        'total_teachers', v_teachers,
        'total_users',    v_students + v_teachers,
        'custom_domains', v_domains,
        'new_orgs_week',  v_new_orgs
    );
END;
$$;

-- ─── RPC: superadmin_get_orgs ──────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_get_orgs()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    SELECT json_agg(row_to_json(t)) INTO result FROM (
        SELECT
            o.id,
            o.name,
            o.slug,
            o.school_type,
            o.city,
            o.country,
            o.custom_domain,
            o.domain_verified,
            o.is_active,
            o.created_at,
            COALESCE(s.cnt, 0) AS student_count,
            COALESCE(t.cnt, 0) AS teacher_count,
            o.logo_url
        FROM organizations o
        LEFT JOIN (
            SELECT organization_id, COUNT(*) cnt FROM student_profiles GROUP BY organization_id
        ) s ON s.organization_id = o.id
        LEFT JOIN (
            SELECT organization_id, COUNT(*) cnt FROM teacher_profiles GROUP BY organization_id
        ) t ON t.organization_id = o.id
        ORDER BY o.created_at DESC
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ─── RPC: superadmin_get_users ─────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_get_users(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    result JSON;
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    SELECT json_agg(row_to_json(u)) INTO result FROM (
        SELECT
            sp.id,
            sp.first_name || ' ' || sp.last_name AS full_name,
            sp.email,
            'student' AS role,
            o.name AS org_name,
            o.slug AS org_slug,
            sp.created_at
        FROM student_profiles sp
        LEFT JOIN organizations o ON o.id = sp.organization_id
        UNION ALL
        SELECT
            tp.id,
            tp.first_name || ' ' || tp.last_name AS full_name,
            tp.email,
            'teacher' AS role,
            o.name AS org_name,
            o.slug AS org_slug,
            tp.created_at
        FROM teacher_profiles tp
        LEFT JOIN organizations o ON o.id = tp.organization_id
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) u;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ─── RPC: superadmin_toggle_org ────────────────────────────────
-- Suspend or reactivate an organization
CREATE OR REPLACE FUNCTION superadmin_toggle_org(p_org_id UUID, p_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    UPDATE organizations SET is_active = p_active WHERE id = p_org_id;
END;
$$;

-- ─── RPC: superadmin_verify_domain ─────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_verify_domain(p_org_id UUID, p_verified BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    UPDATE organizations SET domain_verified = p_verified WHERE id = p_org_id;
END;
$$;

-- ─── Grant permissions ─────────────────────────────────────────
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_orgs() TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_users(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_toggle_org(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_verify_domain(UUID, BOOLEAN) TO authenticated;

-- ─── Add is_active column to organizations if missing ──────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
