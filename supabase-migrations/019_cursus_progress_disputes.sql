-- ================================================
-- 019: Lesson progress + Grade disputes
-- Run in Supabase SQL Editor
-- ================================================

-- 1. Lesson progress tracking
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_lesson_progress_select" ON lesson_progress;
DROP POLICY IF EXISTS "rls_lesson_progress_insert" ON lesson_progress;
DROP POLICY IF EXISTS "rls_lesson_progress_update" ON lesson_progress;
CREATE POLICY "rls_lesson_progress_select" ON lesson_progress FOR SELECT USING (true);
CREATE POLICY "rls_lesson_progress_insert" ON lesson_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "rls_lesson_progress_update" ON lesson_progress FOR UPDATE USING (true);

-- 2. Grade disputes (réclamations)
CREATE TABLE IF NOT EXISTS grade_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    student_name TEXT,
    subject_id UUID,
    exercise_id UUID,
    submission_id UUID,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
    response TEXT,
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE grade_disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_grade_disputes_select" ON grade_disputes;
DROP POLICY IF EXISTS "rls_grade_disputes_insert" ON grade_disputes;
DROP POLICY IF EXISTS "rls_grade_disputes_update" ON grade_disputes;
CREATE POLICY "rls_grade_disputes_select" ON grade_disputes FOR SELECT USING (true);
CREATE POLICY "rls_grade_disputes_insert" ON grade_disputes FOR INSERT WITH CHECK (true);
CREATE POLICY "rls_grade_disputes_update" ON grade_disputes FOR UPDATE USING (true);

-- 3. Ensure chapters have status column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chapters' AND column_name='status') THEN
        ALTER TABLE chapters ADD COLUMN status TEXT DEFAULT 'published';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chapters' AND column_name='position') THEN
        ALTER TABLE chapters ADD COLUMN position INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chapters' AND column_name='resources') THEN
        ALTER TABLE chapters ADD COLUMN resources JSONB DEFAULT '[]';
    END IF;
END $$;

-- 4. Ensure lessons have status + position
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='status') THEN
        ALTER TABLE lessons ADD COLUMN status TEXT DEFAULT 'published';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='position') THEN
        ALTER TABLE lessons ADD COLUMN position INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='resources') THEN
        ALTER TABLE lessons ADD COLUMN resources JSONB DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='estimated_minutes') THEN
        ALTER TABLE lessons ADD COLUMN estimated_minutes INT DEFAULT 15;
    END IF;
END $$;

-- 5. Set existing chapters to published by default
UPDATE chapters SET status = 'published' WHERE status IS NULL OR status = 'draft';
UPDATE lessons SET status = 'published' WHERE status IS NULL OR status = 'draft';

-- 6. Subjects: ensure organization_id is set where missing (use org from classroom)
UPDATE subjects s
SET organization_id = c.organization_id
FROM classrooms c
WHERE s.classroom_id = c.id AND s.organization_id IS NULL;

-- 7. Ensure exercises have chapter_id index
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='chapter_id') THEN
        ALTER TABLE exercises ADD COLUMN chapter_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='subject_id') THEN
        ALTER TABLE exercises ADD COLUMN subject_id UUID;
    END IF;
END $$;

-- 8. RLS for chapters, lessons
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_chapters_select" ON chapters;
DROP POLICY IF EXISTS "rls_chapters_insert" ON chapters;
DROP POLICY IF EXISTS "rls_chapters_update" ON chapters;
DROP POLICY IF EXISTS "rls_chapters_delete" ON chapters;
CREATE POLICY "rls_chapters_select" ON chapters FOR SELECT USING (true);
CREATE POLICY "rls_chapters_insert" ON chapters FOR INSERT WITH CHECK (true);
CREATE POLICY "rls_chapters_update" ON chapters FOR UPDATE USING (true);
CREATE POLICY "rls_chapters_delete" ON chapters FOR DELETE USING (true);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_lessons_select" ON lessons;
DROP POLICY IF EXISTS "rls_lessons_insert" ON lessons;
DROP POLICY IF EXISTS "rls_lessons_update" ON lessons;
DROP POLICY IF EXISTS "rls_lessons_delete" ON lessons;
CREATE POLICY "rls_lessons_select" ON lessons FOR SELECT USING (true);
CREATE POLICY "rls_lessons_insert" ON lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "rls_lessons_update" ON lessons FOR UPDATE USING (true);
CREATE POLICY "rls_lessons_delete" ON lessons FOR DELETE USING (true);

-- 9. Subjects RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_subjects_select" ON subjects;
DROP POLICY IF EXISTS "rls_subjects_insert" ON subjects;
DROP POLICY IF EXISTS "rls_subjects_update" ON subjects;
DROP POLICY IF EXISTS "rls_subjects_delete" ON subjects;
CREATE POLICY "rls_subjects_select" ON subjects FOR SELECT USING (true);
CREATE POLICY "rls_subjects_insert" ON subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "rls_subjects_update" ON subjects FOR UPDATE USING (true);
CREATE POLICY "rls_subjects_delete" ON subjects FOR DELETE USING (true);

SELECT 'Migration 019 applied successfully!' as status;
