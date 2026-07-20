-- ================================================
-- 020: Fix chapters/lessons - add organization_id column
-- Run in Supabase SQL Editor
-- ================================================

-- 1. Add organization_id to chapters if missing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='chapters' AND column_name='organization_id'
    ) THEN
        ALTER TABLE chapters ADD COLUMN organization_id UUID;
    END IF;
END $$;

-- 2. Add organization_id to lessons if missing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='lessons' AND column_name='organization_id'
    ) THEN
        ALTER TABLE lessons ADD COLUMN organization_id UUID;
    END IF;
END $$;

-- 3. Add description to chapters if missing (used in teacher form)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='chapters' AND column_name='description'
    ) THEN
        ALTER TABLE chapters ADD COLUMN description TEXT;
    END IF;
END $$;

-- 4. Backfill organization_id in chapters from subjects
UPDATE chapters ch
SET organization_id = s.organization_id
FROM subjects s
WHERE ch.subject_id = s.id
AND ch.organization_id IS NULL
AND s.organization_id IS NOT NULL;

-- 5. Backfill organization_id in lessons from chapters
UPDATE lessons l
SET organization_id = ch.organization_id
FROM chapters ch
WHERE l.chapter_id = ch.id
AND l.organization_id IS NULL
AND ch.organization_id IS NOT NULL;

-- 6. Ensure exercises table has graded column (for teacher manual grading)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='exercise_submissions' AND column_name='graded'
    ) THEN
        ALTER TABLE exercise_submissions ADD COLUMN graded BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='exercise_submissions' AND column_name='teacher_comment'
    ) THEN
        ALTER TABLE exercise_submissions ADD COLUMN teacher_comment TEXT;
    END IF;
END $$;

-- 7. RLS for exercise_submissions
ALTER TABLE exercise_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_exercise_submissions_select" ON exercise_submissions;
DROP POLICY IF EXISTS "rls_exercise_submissions_insert" ON exercise_submissions;
DROP POLICY IF EXISTS "rls_exercise_submissions_update" ON exercise_submissions;
CREATE POLICY "rls_exercise_submissions_select" ON exercise_submissions FOR SELECT USING (true);
CREATE POLICY "rls_exercise_submissions_insert" ON exercise_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "rls_exercise_submissions_update" ON exercise_submissions FOR UPDATE USING (true);

-- 8. RLS for exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_exercises_select" ON exercises;
DROP POLICY IF EXISTS "rls_exercises_insert" ON exercises;
DROP POLICY IF EXISTS "rls_exercises_update" ON exercises;
DROP POLICY IF EXISTS "rls_exercises_delete" ON exercises;
CREATE POLICY "rls_exercises_select" ON exercises FOR SELECT USING (true);
CREATE POLICY "rls_exercises_insert" ON exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "rls_exercises_update" ON exercises FOR UPDATE USING (true);
CREATE POLICY "rls_exercises_delete" ON exercises FOR DELETE USING (true);

SELECT 'Migration 020 applied successfully! chapters/lessons now have organization_id.' as status;
