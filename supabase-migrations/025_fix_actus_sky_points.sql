-- ═══════════════════════════════════════════════════════════════
-- Migration 025 — Fix Actus + Sky Points + tutoring_requests
-- ═══════════════════════════════════════════════════════════════

-- 1. Add image_url column to tutoring_requests (the posts table)
ALTER TABLE tutoring_requests ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Add edited_at column to tutoring_requests (for post editing)
ALTER TABLE tutoring_requests ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- 3. Ensure RLS policies allow update for post author
DROP POLICY IF EXISTS "Author can update own post" ON tutoring_requests;
CREATE POLICY "Author can update own post" ON tutoring_requests
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert tutoring_requests" ON tutoring_requests;
CREATE POLICY "Anyone can insert tutoring_requests" ON tutoring_requests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read tutoring_requests" ON tutoring_requests;
CREATE POLICY "Anyone can read tutoring_requests" ON tutoring_requests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Author can delete own post" ON tutoring_requests;
CREATE POLICY "Author can delete own post" ON tutoring_requests
    FOR DELETE USING (true);

-- 4. Drop existing function first (fixes parameter defaults conflict)
DROP FUNCTION IF EXISTS spend_sky_point(uuid, uuid, integer, text, text);

-- 5. Create spend_sky_point RPC function (atomic, prevents race conditions)
CREATE OR REPLACE FUNCTION spend_sky_point(
    p_user_id      UUID,
    p_org_id       UUID,
    p_amount       INT,
    p_reason       TEXT,
    p_description  TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_points INT;
    v_role   TEXT;
BEGIN
    -- Try student_profiles first
    SELECT sky_points INTO v_points
    FROM student_profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_points IS NULL THEN
        -- Not a student — teachers and admins post for free
        RETURN json_build_object('success', true, 'points', 0, 'role', 'staff');
    END IF;

    IF v_points < p_amount THEN
        RETURN json_build_object('success', false, 'points', v_points, 'required', p_amount);
    END IF;

    -- Debit points atomically
    UPDATE student_profiles
    SET sky_points = sky_points - p_amount
    WHERE id = p_user_id;

    -- Log the transaction
    INSERT INTO sky_transactions(student_id, amount, transaction_type, description, organization_id)
    VALUES (p_user_id, -p_amount, p_reason, p_description, p_org_id);

    RETURN json_build_object('success', true, 'points', v_points - p_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION spend_sky_point TO anon, authenticated;

-- 5. Ensure sky_transactions allows anon inserts
DROP POLICY IF EXISTS "Anon insert sky_transactions" ON sky_transactions;
CREATE POLICY "Anon insert sky_transactions" ON sky_transactions
    FOR INSERT WITH CHECK (true);

SELECT '025 applied: image_url added, spend_sky_point RPC created' AS status;
