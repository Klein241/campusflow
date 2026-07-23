-- ══════════════════════════════════════════════════════════════
-- RPC: superadmin_search_users  (v3 — sans sky_transactions)
-- SECURITY DEFINER → bypass RLS pour recherche cross-org
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION superadmin_search_users(p_query TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    SELECT json_agg(row_to_json(u)) INTO result FROM (
        SELECT * FROM (
            SELECT
                sp.id,
                sp.first_name,
                sp.last_name,
                COALESCE(sp.sky_points, 0) AS sky_points,
                sp.organization_id,
                o.name  AS org_name,
                o.slug  AS org_slug,
                'student'::text AS role
            FROM student_profiles sp
            LEFT JOIN organizations o ON o.id = sp.organization_id
            WHERE
                sp.first_name  ILIKE '%' || p_query || '%' OR
                sp.last_name   ILIKE '%' || p_query || '%' OR
                sp.access_code ILIKE '%' || p_query || '%'
            LIMIT 15
        ) AS students

        UNION ALL

        SELECT * FROM (
            SELECT
                tp.id,
                tp.first_name,
                tp.last_name,
                COALESCE(tp.sky_points, 0) AS sky_points,
                tp.organization_id,
                o.name  AS org_name,
                o.slug  AS org_slug,
                'teacher'::text AS role
            FROM teacher_profiles tp
            LEFT JOIN organizations o ON o.id = tp.organization_id
            WHERE
                tp.first_name ILIKE '%' || p_query || '%' OR
                tp.last_name  ILIKE '%' || p_query || '%'
            LIMIT 10
        ) AS teachers

        ORDER BY last_name, first_name
    ) u;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_search_users(TEXT)
    TO anon, authenticated, service_role;

-- ══════════════════════════════════════════════════════════════
-- RPC: superadmin_update_sky_points  (v3 — sans sky_transactions)
-- Met à jour sky_points d'un utilisateur (student ou teacher)
-- SECURITY DEFINER → bypass RLS
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION superadmin_update_sky_points(
    p_user_id     UUID,
    p_role        TEXT,
    p_new_balance INTEGER,
    p_delta       INTEGER,
    p_note        TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_rows INTEGER;
BEGIN
    IF p_role = 'student' THEN
        UPDATE student_profiles
        SET sky_points = p_new_balance
        WHERE id = p_user_id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
    ELSIF p_role = 'teacher' THEN
        UPDATE teacher_profiles
        SET sky_points = p_new_balance
        WHERE id = p_user_id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid role: must be student or teacher');
    END IF;

    IF v_rows = 0 THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    RETURN json_build_object(
        'success',      true,
        'new_balance',  p_new_balance,
        'delta',        p_delta,
        'note',         COALESCE(p_note, 'Ajustement SuperAdmin')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_update_sky_points(UUID, TEXT, INTEGER, INTEGER, TEXT)
    TO anon, authenticated, service_role;
