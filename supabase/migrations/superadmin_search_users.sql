-- ══════════════════════════════════════════════════════════════
-- RPC: superadmin_search_users  (v2 — fix UNION ALL + LIMIT)
-- SECURITY DEFINER → bypass RLS pour recherche cross-org
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION superadmin_search_users(p_query TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    SELECT json_agg(row_to_json(u)) INTO result FROM (
        -- ── Étudiants ──────────────────────────────────────
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

        -- ── Professeurs ────────────────────────────────────
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

-- ══════════════════════════════════════════════════════════════
-- TABLE: sky_transactions (journal des mouvements de points)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sky_transactions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    amount      INTEGER     NOT NULL DEFAULT 0,
    type        TEXT        NOT NULL CHECK (type IN ('credit', 'debit')),
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sky_transactions_user_id_idx ON sky_transactions(user_id);

ALTER TABLE sky_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sky_tx_open" ON sky_transactions;
CREATE POLICY "sky_tx_open" ON sky_transactions FOR ALL USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════
-- RPC: superadmin_update_sky_points
-- Met à jour sky_points + log dans sky_transactions
-- SECURITY DEFINER → bypass RLS
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION superadmin_update_sky_points(
    p_user_id     UUID,
    p_role        TEXT,
    p_new_balance INTEGER,
    p_delta       INTEGER,
    p_note        TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF p_role = 'student' THEN
        UPDATE student_profiles
        SET sky_points = p_new_balance
        WHERE id = p_user_id;
    ELSIF p_role = 'teacher' THEN
        UPDATE teacher_profiles
        SET sky_points = p_new_balance
        WHERE id = p_user_id;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid role');
    END IF;

    BEGIN
        INSERT INTO sky_transactions (user_id, amount, type, description)
        VALUES (
            p_user_id,
            ABS(p_delta),
            CASE WHEN p_delta >= 0 THEN 'credit' ELSE 'debit' END,
            COALESCE(p_note, 'Ajustement SuperAdmin')
        );
    EXCEPTION WHEN OTHERS THEN
        NULL; -- ignore log error
    END;

    RETURN json_build_object('success', true, 'new_balance', p_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_search_users(TEXT)
    TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION superadmin_update_sky_points(UUID, TEXT, INTEGER, INTEGER, TEXT)
    TO anon, authenticated, service_role;
