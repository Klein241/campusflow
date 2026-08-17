-- ============================================================
-- IziTeach — Migration 047: Chat Permissions, Exercises RLS,
-- Bug Reports, Feature Suggestions & Reviews System
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. CHAT TABLES: GRANT DML to anon & authenticated
-- (Fixes "permission denied for table chat_conversations")
-- ══════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_participants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_participants TO authenticated;

-- RLS chat_conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conv_all_public" ON public.chat_conversations;
DROP POLICY IF EXISTS "conv_read_org_scoped" ON public.chat_conversations;
DROP POLICY IF EXISTS "conv_insert_org_scoped" ON public.chat_conversations;
DROP POLICY IF EXISTS "conv_update_org_scoped" ON public.chat_conversations;
DROP POLICY IF EXISTS "conv_delete_creator_only" ON public.chat_conversations;

CREATE POLICY "conv_read_all" ON public.chat_conversations FOR SELECT USING (true);
CREATE POLICY "conv_insert_all" ON public.chat_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "conv_update_all" ON public.chat_conversations FOR UPDATE USING (true);
CREATE POLICY "conv_delete_all" ON public.chat_conversations FOR DELETE USING (true);

-- RLS chat_participants
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "part_all_public" ON public.chat_participants;
DROP POLICY IF EXISTS "part_read_org_scoped" ON public.chat_participants;
DROP POLICY IF EXISTS "part_insert_org_scoped" ON public.chat_participants;
DROP POLICY IF EXISTS "part_update_self" ON public.chat_participants;
DROP POLICY IF EXISTS "part_delete_allowed" ON public.chat_participants;

CREATE POLICY "part_read_all" ON public.chat_participants FOR SELECT USING (true);
CREATE POLICY "part_insert_all" ON public.chat_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "part_update_all" ON public.chat_participants FOR UPDATE USING (true);
CREATE POLICY "part_delete_all" ON public.chat_participants FOR DELETE USING (true);

-- RLS chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msg_all_public" ON public.chat_messages;
DROP POLICY IF EXISTS "msg_read_org_scoped" ON public.chat_messages;
DROP POLICY IF EXISTS "msg_insert_org_scoped" ON public.chat_messages;
DROP POLICY IF EXISTS "msg_update_author_only" ON public.chat_messages;
DROP POLICY IF EXISTS "msg_delete_author_only" ON public.chat_messages;

CREATE POLICY "msg_read_all" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "msg_insert_all" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "msg_update_all" ON public.chat_messages FOR UPDATE USING (true);
CREATE POLICY "msg_delete_all" ON public.chat_messages FOR DELETE USING (true);


-- ══════════════════════════════════════════════════════════════
-- 2. EXERCISES & CURSUS: GRANT DML to anon & authenticated
-- (Fixes exercise creation error)
-- ══════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_submissions TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_exercises_select" ON public.exercises;
DROP POLICY IF EXISTS "rls_exercises_insert" ON public.exercises;
DROP POLICY IF EXISTS "rls_exercises_update" ON public.exercises;
DROP POLICY IF EXISTS "rls_exercises_delete" ON public.exercises;

CREATE POLICY "exercises_read_all"   ON public.exercises FOR SELECT USING (true);
CREATE POLICY "exercises_insert_all" ON public.exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "exercises_update_all" ON public.exercises FOR UPDATE USING (true);
CREATE POLICY "exercises_delete_all" ON public.exercises FOR DELETE USING (true);

ALTER TABLE public.exercise_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_submissions_select" ON public.exercise_submissions;
DROP POLICY IF EXISTS "rls_submissions_insert" ON public.exercise_submissions;
DROP POLICY IF EXISTS "rls_submissions_update" ON public.exercise_submissions;

CREATE POLICY "submissions_read_all"   ON public.exercise_submissions FOR SELECT USING (true);
CREATE POLICY "submissions_insert_all" ON public.exercise_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "submissions_update_all" ON public.exercise_submissions FOR UPDATE USING (true);


-- ══════════════════════════════════════════════════════════════
-- 3. BUG REPORTS TABLE (with mandatory screenshot)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    org_name TEXT,
    user_id TEXT,
    user_name TEXT,
    user_role TEXT DEFAULT 'student',
    user_email TEXT,
    description TEXT NOT NULL,
    screenshot_url TEXT NOT NULL, -- Obligatoire
    page_url TEXT,
    browser_info TEXT,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bug_reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bug_reports TO authenticated;

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bug_reports_read_all" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_insert_all" ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_update_all" ON public.bug_reports;

CREATE POLICY "bug_reports_read_all"   ON public.bug_reports FOR SELECT USING (true);
CREATE POLICY "bug_reports_insert_all" ON public.bug_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "bug_reports_update_all" ON public.bug_reports FOR UPDATE USING (true);


-- ══════════════════════════════════════════════════════════════
-- 4. FEATURE SUGGESTIONS TABLE (for Superadmin)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.feature_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    org_name TEXT,
    user_id TEXT,
    user_name TEXT,
    user_role TEXT DEFAULT 'student',
    user_email TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'general', -- 'pedagogy', 'design', 'mobile_money', 'chat', 'admin', 'other'
    status TEXT DEFAULT 'submitted', -- 'submitted', 'reviewing', 'planned', 'implemented', 'declined'
    superadmin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_suggestions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_suggestions TO authenticated;

ALTER TABLE public.feature_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feature_suggestions_read_all" ON public.feature_suggestions;
DROP POLICY IF EXISTS "feature_suggestions_insert_all" ON public.feature_suggestions;
DROP POLICY IF EXISTS "feature_suggestions_update_all" ON public.feature_suggestions;

CREATE POLICY "feature_suggestions_read_all"   ON public.feature_suggestions FOR SELECT USING (true);
CREATE POLICY "feature_suggestions_insert_all" ON public.feature_suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "feature_suggestions_update_all" ON public.feature_suggestions FOR UPDATE USING (true);


-- ══════════════════════════════════════════════════════════════
-- 5. SCHOOL REVIEWS TABLE (Reviews for a specific school)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.school_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_name TEXT,
    user_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT DEFAULT 'Étudiant',
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    sky_points_awarded INT DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_reviews TO authenticated;

ALTER TABLE public.school_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_reviews_read_all" ON public.school_reviews;
DROP POLICY IF EXISTS "school_reviews_insert_all" ON public.school_reviews;

CREATE POLICY "school_reviews_read_all"   ON public.school_reviews FOR SELECT USING (true);
CREATE POLICY "school_reviews_insert_all" ON public.school_reviews FOR INSERT WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- 6. PLATFORM REVIEWS TABLE (Reviews for IziTeach SaaS app)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    school_name TEXT,
    user_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT DEFAULT 'Étudiant',
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    sky_points_awarded INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_reviews TO authenticated;

ALTER TABLE public.platform_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_reviews_read_all" ON public.platform_reviews;
DROP POLICY IF EXISTS "platform_reviews_insert_all" ON public.platform_reviews;

CREATE POLICY "platform_reviews_read_all"   ON public.platform_reviews FOR SELECT USING (true);
CREATE POLICY "platform_reviews_insert_all" ON public.platform_reviews FOR INSERT WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- 7. REWARD SKY POINTS RPC FUNCTION (1★=1, 2★=2, 3★=3, 4★=4, 5★=7)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.award_review_sky_points(
    p_user_id TEXT,
    p_role TEXT,
    p_rating INT,
    p_reason TEXT,
    p_org_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_points INT := 0;
    v_new_total INT := 0;
    v_user_uuid UUID;
BEGIN
    -- Calculate Sky Points based on stars
    IF p_rating = 5 THEN
        v_points := 7; -- Bonus 5 étoiles = 7 sky points
    ELSIF p_rating = 4 THEN
        v_points := 4;
    ELSIF p_rating = 3 THEN
        v_points := 3;
    ELSIF p_rating = 2 THEN
        v_points := 2;
    ELSIF p_rating = 1 THEN
        v_points := 1;
    ELSE
        v_points := 0;
    END IF;

    IF v_points <= 0 THEN
        RETURN jsonb_build_object('success', false, 'points', 0, 'error', 'Note invalide');
    END IF;

    -- Credit to student_profiles or teacher_profiles
    IF p_role = 'teacher' THEN
        -- Try by ID or access_code
        UPDATE public.teacher_profiles
        SET sky_points = COALESCE(sky_points, 0) + v_points
        WHERE id::TEXT = p_user_id OR access_code = p_user_id
        RETURNING sky_points INTO v_new_total;
    ELSE
        UPDATE public.student_profiles
        SET sky_points = COALESCE(sky_points, 0) + v_points
        WHERE id::TEXT = p_user_id OR access_code = p_user_id
        RETURNING sky_points INTO v_new_total;
    END IF;

    -- Record transaction in sky_transactions if table exists
    BEGIN
        INSERT INTO public.sky_transactions (
            student_id,
            amount,
            type,
            description,
            created_at
        ) VALUES (
            p_user_id,
            v_points,
            'credit',
            COALESCE(p_reason, 'Bonus évaluation (' || p_rating || ' étoiles)'),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if table structure differs
    END;

    RETURN jsonb_build_object(
        'success', true,
        'points_awarded', v_points,
        'new_total', v_new_total
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_review_sky_points TO anon;
GRANT EXECUTE ON FUNCTION public.award_review_sky_points TO authenticated;
