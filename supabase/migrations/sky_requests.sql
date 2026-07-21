-- ══════════════════════════════════════════════════════════════════
-- SKY POINTS REQUESTS TABLE
-- Stores chat messages between users and SKYs Klein (superadmin)
-- Used by sky-points-store.tsx chat feature
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sky_point_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name       TEXT NOT NULL,
    org_id          UUID REFERENCES organizations(id) ON DELETE SET NULL,
    org_slug        TEXT,

    -- Pack info
    pack_id         TEXT,           -- 'starter', 'populaire', 'pro', 'premium'
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
    credited_by     UUID REFERENCES auth.users(id),

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sky_point_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "sky_requests_self_read" ON sky_point_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "sky_requests_self_insert" ON sky_point_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Platform admins can see all
CREATE POLICY "sky_requests_admin_all" ON sky_point_requests
    FOR ALL USING ((SELECT is_platform_admin()));

-- ── RPC: superadmin_credit_sky_points ────────────────────────────────
-- Called from superadmin panel to credit points to a user
CREATE OR REPLACE FUNCTION superadmin_credit_sky_points(
    p_request_id    UUID,
    p_user_id       UUID,
    p_points        INTEGER,
    p_response      TEXT DEFAULT 'Vos points ont été crédités !'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    -- Credit points to student profile if exists
    UPDATE student_profiles
    SET sky_points = COALESCE(sky_points, 0) + p_points
    WHERE id = p_user_id;

    -- Also try teacher profiles
    UPDATE teacher_profiles
    SET sky_points = COALESCE(sky_points, 0) + p_points
    WHERE id = p_user_id;

    -- Record transaction
    INSERT INTO sky_transactions (user_id, amount, type, description)
    VALUES (p_user_id, p_points, 'credit', 'Achat via SKYs Klein')
    ON CONFLICT DO NOTHING;

    -- Update request status
    UPDATE sky_point_requests SET
        status = 'credited',
        response = p_response,
        responded_at = NOW(),
        points_credited = p_points,
        credited_at = NOW(),
        credited_by = auth.uid()
    WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_credit_sky_points(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- ── RPC: superadmin_get_sky_requests ─────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_get_sky_requests()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
    IF NOT (SELECT is_platform_admin()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
    SELECT json_agg(row_to_json(r)) INTO result FROM (
        SELECT * FROM sky_point_requests ORDER BY created_at DESC LIMIT 100
    ) r;
    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_get_sky_requests() TO authenticated;

-- ── RPC: admin_distribute_sky_points ─────────────────────────────────
-- Called by school admin to distribute their purchased SKY points to users
CREATE OR REPLACE FUNCTION admin_distribute_sky_points(
    p_from_admin_id UUID,       -- admin's student/teacher/profile id
    p_to_user_id    UUID,       -- recipient profile id
    p_to_role       TEXT,       -- 'student' or 'teacher'
    p_points        INTEGER,
    p_org_id        UUID
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_admin_balance INTEGER;
BEGIN
    -- Get admin balance
    SELECT sky_points INTO v_admin_balance
    FROM student_profiles WHERE id = p_from_admin_id AND organization_id = p_org_id;

    IF v_admin_balance IS NULL OR v_admin_balance < p_points THEN
        RETURN json_build_object('success', false, 'error', 'Solde insuffisant');
    END IF;

    -- Deduct from admin
    UPDATE student_profiles SET sky_points = sky_points - p_points WHERE id = p_from_admin_id;

    -- Credit to recipient
    IF p_to_role = 'teacher' THEN
        UPDATE teacher_profiles SET sky_points = COALESCE(sky_points, 0) + p_points WHERE id = p_to_user_id;
    ELSE
        UPDATE student_profiles SET sky_points = COALESCE(sky_points, 0) + p_points WHERE id = p_to_user_id;
    END IF;

    -- Record transaction
    INSERT INTO sky_transactions (user_id, amount, type, description)
    VALUES (p_to_user_id, p_points, 'credit', 'Distribution par administrateur');

    RETURN json_build_object('success', true, 'distributed', p_points);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_distribute_sky_points(UUID, UUID, TEXT, INTEGER, UUID) TO authenticated;

-- ── Add sky_points column to teacher_profiles if missing ──────────────
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS sky_points INTEGER DEFAULT 0;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS sky_points INTEGER DEFAULT 0;
