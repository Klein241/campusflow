-- ═══════════════════════════════════════════════════════════════
-- SUPERADMIN SETUP — Version corrigée (safe to re-run)
-- Colle ce script dans Supabase SQL Editor et exécute-le
-- ═══════════════════════════════════════════════════════════════

-- Étape 1: Supprimer les policies existantes (évite l'erreur 42710)
DROP POLICY IF EXISTS "platform_admins_self_read" ON platform_admins;

-- Étape 2: Recréer la policy
CREATE POLICY "platform_admins_self_read" ON platform_admins
    FOR SELECT USING (auth.uid() = user_id);

-- Étape 3: Recréer toutes les RPCs (idempotent avec OR REPLACE)
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION superadmin_get_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_orgs INTEGER; v_students INTEGER; v_teachers INTEGER;
    v_domains INTEGER; v_new_orgs INTEGER;
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
    SELECT COUNT(*) INTO v_orgs FROM organizations;
    SELECT COUNT(*) INTO v_students FROM student_profiles;
    SELECT COUNT(*) INTO v_teachers FROM teacher_profiles;
    SELECT COUNT(*) INTO v_domains FROM organizations WHERE custom_domain IS NOT NULL AND custom_domain != '';
    SELECT COUNT(*) INTO v_new_orgs FROM organizations WHERE created_at > NOW() - INTERVAL '7 days';
    RETURN json_build_object(
        'total_orgs', v_orgs, 'total_students', v_students,
        'total_teachers', v_teachers, 'total_users', v_students + v_teachers,
        'custom_domains', v_domains, 'new_orgs_week', v_new_orgs
    );
END;
$$;

CREATE OR REPLACE FUNCTION superadmin_get_orgs()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
    SELECT json_agg(row_to_json(t)) INTO result FROM (
        SELECT o.id, o.name, o.slug, o.school_type, o.city, o.country,
               o.custom_domain, o.domain_verified, o.is_active, o.created_at, o.logo_url,
               COALESCE(s.cnt, 0) AS student_count,
               COALESCE(tc.cnt, 0) AS teacher_count
        FROM organizations o
        LEFT JOIN (SELECT organization_id, COUNT(*) cnt FROM student_profiles GROUP BY organization_id) s ON s.organization_id = o.id
        LEFT JOIN (SELECT organization_id, COUNT(*) cnt FROM teacher_profiles GROUP BY organization_id) tc ON tc.organization_id = o.id
        ORDER BY o.created_at DESC
    ) t;
    RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION superadmin_get_users(p_limit INTEGER DEFAULT 200, p_offset INTEGER DEFAULT 0)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
    SELECT json_agg(row_to_json(u)) INTO result FROM (
        SELECT sp.id, sp.first_name || ' ' || sp.last_name AS full_name, sp.email,
               'student' AS role, o.name AS org_name, o.slug AS org_slug, sp.created_at
        FROM student_profiles sp LEFT JOIN organizations o ON o.id = sp.organization_id
        UNION ALL
        SELECT tp.id, tp.first_name || ' ' || tp.last_name AS full_name, tp.email,
               'teacher' AS role, o.name AS org_name, o.slug AS org_slug, tp.created_at
        FROM teacher_profiles tp LEFT JOIN organizations o ON o.id = tp.organization_id
        ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset
    ) u;
    RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION superadmin_toggle_org(p_org_id UUID, p_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
    UPDATE organizations SET is_active = p_active WHERE id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION superadmin_verify_domain(p_org_id UUID, p_verified BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
    UPDATE organizations SET domain_verified = p_verified WHERE id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION superadmin_delete_org(p_org_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
    DELETE FROM organizations WHERE id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION superadmin_send_announcement(p_title TEXT, p_body TEXT, p_org_id UUID DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER := 0; v_content TEXT; v_org RECORD;
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
    v_content := '📣 ' || p_title || E'\n\n' || p_body;
    IF p_org_id IS NOT NULL THEN
        INSERT INTO tutoring_requests (user_id, content, category, is_anonymous, prayer_count, prayed_by)
        SELECT (SELECT id FROM platform_admins WHERE user_id = auth.uid() LIMIT 1),
               v_content, 'admin_actus', false, 0, '{}'::text[]
        WHERE EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id);
        v_count := 1;
    ELSE
        FOR v_org IN SELECT id FROM organizations WHERE is_active = true LOOP
            INSERT INTO tutoring_requests (user_id, content, category, is_anonymous, prayer_count, prayed_by)
            VALUES ((SELECT id FROM platform_admins WHERE user_id = auth.uid() LIMIT 1),
                    v_content, 'admin_actus', false, 0, '{}'::text[]);
            v_count := v_count + 1;
        END LOOP;
    END IF;
    RETURN json_build_object('success', true, 'sent_to', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION superadmin_get_recent_activity()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
    SELECT json_agg(row_to_json(a)) INTO result FROM (
        SELECT 'org' AS type, name AS label, slug AS meta, created_at FROM organizations
        UNION ALL
        SELECT 'student', first_name || ' ' || last_name, email, created_at FROM student_profiles
        UNION ALL
        SELECT 'teacher', first_name || ' ' || last_name, email, created_at FROM teacher_profiles
        ORDER BY created_at DESC LIMIT 20
    ) a;
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Étape 4: Grants
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_orgs() TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_users(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_toggle_org(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_verify_domain(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_delete_org(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_send_announcement(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_recent_activity() TO authenticated;

-- Étape 5: Ajouter colonne is_active si manquante
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE FINALE : Insérer le compte superadmin
-- (remplace si déjà existant)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO platform_admins (user_id, email, name)
SELECT id, email, 'SuperAdmin SYGMA-TECH'
FROM auth.users
WHERE email = 'taptuemeicky@yahoo.fr'
ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name  = EXCLUDED.name;

-- Vérification
SELECT
    pa.id,
    pa.email,
    pa.name,
    pa.created_at,
    au.id AS auth_user_id,
    'SUCCESS - SuperAdmin configuré !' AS status
FROM platform_admins pa
JOIN auth.users au ON au.id = pa.user_id
WHERE pa.email = 'taptuemeicky@yahoo.fr';
