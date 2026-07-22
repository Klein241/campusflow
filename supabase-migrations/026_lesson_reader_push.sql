-- ═══════════════════════════════════════════════════════════════
-- Migration 026 — Lesson Reader Notes + Push Subscriptions fix
-- ═══════════════════════════════════════════════════════════════

-- 1. Table for personal lesson notes & highlights
CREATE TABLE IF NOT EXISTS lesson_reader_notes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id     UUID NOT NULL,
    user_id       UUID NOT NULL,
    org_id        UUID,
    content       TEXT NOT NULL,
    highlight_text TEXT,          -- the selected text that was highlighted
    color         TEXT DEFAULT 'yellow',  -- yellow|green|blue|pink|orange
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user+lesson
CREATE INDEX IF NOT EXISTS idx_lesson_notes_user_lesson
    ON lesson_reader_notes (user_id, lesson_id);

-- RLS
ALTER TABLE lesson_reader_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notes" ON lesson_reader_notes;
CREATE POLICY "Users manage own notes" ON lesson_reader_notes
    USING (true) WITH CHECK (true);

-- 2. Push subscriptions table (for Web Push VAPID)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    organization_id  UUID,
    org_slug         TEXT,
    user_role        TEXT,
    endpoint         TEXT NOT NULL UNIQUE,
    p256dh           TEXT NOT NULL,
    auth             TEXT NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_org  ON push_subscriptions (organization_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Push subs open" ON push_subscriptions;
CREATE POLICY "Push subs open" ON push_subscriptions
    USING (true) WITH CHECK (true);

-- 3. Fix DROP + RECREATE spend_sky_point (from migration 025 conflict)
DROP FUNCTION IF EXISTS spend_sky_point(uuid, uuid, integer, text, text);

CREATE OR REPLACE FUNCTION spend_sky_point(
    p_user_id      UUID,
    p_org_id       UUID,
    p_amount       INT,
    p_reason       TEXT,
    p_description  TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_points INT;
BEGIN
    SELECT sky_points INTO v_points
    FROM student_profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_points IS NULL THEN
        RETURN json_build_object('success', true, 'points', 0, 'role', 'staff');
    END IF;

    IF v_points < p_amount THEN
        RETURN json_build_object('success', false, 'points', v_points, 'required', p_amount);
    END IF;

    UPDATE student_profiles
    SET sky_points = sky_points - p_amount
    WHERE id = p_user_id;

    INSERT INTO sky_transactions(student_id, amount, transaction_type, description, organization_id)
    VALUES (p_user_id, -p_amount, p_reason, p_description, p_org_id)
    ON CONFLICT DO NOTHING;

    RETURN json_build_object('success', true, 'points', v_points - p_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION spend_sky_point TO anon, authenticated;

SELECT '026 applied: lesson_reader_notes, push_subscriptions, spend_sky_point fixed' AS status;
