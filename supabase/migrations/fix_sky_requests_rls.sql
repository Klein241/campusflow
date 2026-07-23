-- ══════════════════════════════════════════════════════════════
-- FIX RLS & SCHEMA: sky_point_requests
-- Pour le chat persistant SKYs Klein <-> SuperAdmin
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sky_point_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    user_name       TEXT NOT NULL,
    org_id          UUID,
    org_slug        TEXT,

    -- Pack info
    pack_id         TEXT,
    pack_name       TEXT,
    points_requested INTEGER,
    amount          NUMERIC(10,2),
    currency        TEXT DEFAULT 'EUR',

    -- Message
    message         TEXT NOT NULL,

    -- Status: pending | confirmed | credited | rejected
    status          TEXT NOT NULL DEFAULT 'pending',

    -- SKYs Klein response
    response        TEXT,
    responded_at    TIMESTAMPTZ,

    -- Credit info
    points_credited INTEGER,
    credited_at     TIMESTAMPTZ,
    credited_by     UUID,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Désactiver contrainte auth.users si elle existait
ALTER TABLE public.sky_point_requests DROP CONSTRAINT IF EXISTS sky_point_requests_user_id_fkey;

-- Activer RLS
ALTER TABLE public.sky_point_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sky_requests_open_select" ON public.sky_point_requests;
DROP POLICY IF EXISTS "sky_requests_open_insert" ON public.sky_point_requests;
DROP POLICY IF EXISTS "sky_requests_open_update" ON public.sky_point_requests;
DROP POLICY IF EXISTS "sky_requests_self_read"   ON public.sky_point_requests;
DROP POLICY IF EXISTS "sky_requests_self_insert" ON public.sky_point_requests;
DROP POLICY IF EXISTS "sky_requests_admin_all"   ON public.sky_point_requests;

CREATE POLICY "sky_requests_open_select" ON public.sky_point_requests FOR SELECT USING (true);
CREATE POLICY "sky_requests_open_insert" ON public.sky_point_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "sky_requests_open_update" ON public.sky_point_requests FOR UPDATE USING (true);

-- ── RPC: superadmin_get_sky_requests ─────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_get_sky_requests()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    SELECT json_agg(row_to_json(r)) INTO result FROM (
        SELECT * FROM public.sky_point_requests ORDER BY created_at DESC LIMIT 100
    ) r;
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ── RPC: superadmin_credit_sky_request ───────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_credit_sky_request(
    p_request_id    UUID,
    p_user_id       UUID,
    p_role          TEXT,
    p_points        INTEGER,
    p_response      TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_new_balance INTEGER := 0;
BEGIN
    IF p_role = 'teacher' THEN
        UPDATE teacher_profiles
        SET sky_points = COALESCE(sky_points, 0) + p_points
        WHERE id = p_user_id
        RETURNING sky_points INTO v_new_balance;
    ELSE
        UPDATE student_profiles
        SET sky_points = COALESCE(sky_points, 0) + p_points
        WHERE id = p_user_id
        RETURNING sky_points INTO v_new_balance;
    END IF;

    UPDATE public.sky_point_requests SET
        status = 'credited',
        response = COALESCE(p_response, '✅ Vos ' || p_points || ' Sky Points ont été crédités ! Profitez-en bien 🎉'),
        responded_at = NOW(),
        points_credited = p_points,
        credited_at = NOW()
    WHERE id = p_request_id;

    RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_get_sky_requests() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION superadmin_credit_sky_request(UUID, UUID, TEXT, INTEGER, TEXT) TO anon, authenticated, service_role;
