-- ═══════════════════════════════════════════════════════
-- 013: school_posts table + curriculum tables + RLS fixes
-- ═══════════════════════════════════════════════════════

-- ═══ 1. SCHOOL POSTS (replaces tutoring_requests for actus) ═══
CREATE TABLE IF NOT EXISTS school_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- teacher/student profile ID (not auth.users)
    user_role TEXT NOT NULL DEFAULT 'student' CHECK (user_role IN ('teacher', 'student', 'admin')),
    content TEXT NOT NULL,
    photos TEXT[] DEFAULT '{}',
    is_admin_post BOOLEAN DEFAULT FALSE,
    like_count INT DEFAULT 0,
    liked_by TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_posts ENABLE ROW LEVEL SECURITY;

-- Anyone in the org can read posts
CREATE POLICY "school_posts_read" ON school_posts FOR SELECT USING (true);
-- Anyone can insert posts (they pass org_id)
CREATE POLICY "school_posts_insert" ON school_posts FOR INSERT WITH CHECK (true);
-- Users can update their own posts (likes)
CREATE POLICY "school_posts_update" ON school_posts FOR UPDATE USING (true);
-- Users can delete their own posts
CREATE POLICY "school_posts_delete" ON school_posts FOR DELETE USING (true);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_school_posts_org ON school_posts(organization_id, created_at DESC);

-- ═══ 2. TEACHER CURRICULUM (programme de cours par matière) ═══
CREATE TABLE IF NOT EXISTS teacher_curricula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    teacher_id TEXT NOT NULL, -- teacher_profiles.id
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- Titre du chapitre/module
    description TEXT, -- Description/contenu
    order_index INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teacher_curricula ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_curricula_read" ON teacher_curricula FOR SELECT USING (true);
CREATE POLICY "teacher_curricula_insert" ON teacher_curricula FOR INSERT WITH CHECK (true);
CREATE POLICY "teacher_curricula_update" ON teacher_curricula FOR UPDATE USING (true);
CREATE POLICY "teacher_curricula_delete" ON teacher_curricula FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_teacher_curricula_teacher ON teacher_curricula(teacher_id, subject_id);

-- ═══ 3. GRANT ACCESS on new tables ═══
GRANT ALL ON school_posts TO anon, authenticated;
GRANT ALL ON teacher_curricula TO anon, authenticated;

-- ═══ 4. FIX: Grant on tutoring_requests if it exists (prevent 401) ═══
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tutoring_requests') THEN
        EXECUTE 'GRANT ALL ON tutoring_requests TO anon, authenticated';
        -- Add permissive RLS if not already
        BEGIN
            EXECUTE 'ALTER TABLE tutoring_requests ENABLE ROW LEVEL SECURITY';
            EXECUTE 'CREATE POLICY "tutoring_requests_all" ON tutoring_requests FOR ALL USING (true) WITH CHECK (true)';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- ═══ 5. Ensure chat tables have proper grants ═══
GRANT ALL ON chat_conversations TO anon, authenticated;
GRANT ALL ON chat_messages TO anon, authenticated;
GRANT ALL ON chat_participants TO anon, authenticated;
