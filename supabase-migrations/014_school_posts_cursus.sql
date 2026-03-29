-- ============================================================
-- CAMPUSFLOW — Migration 014: School Posts + Cursus Program
-- Nouvelles tables pour Actus et Cursus prof
-- ============================================================

-- ── 1. SCHOOL POSTS (Actus de l'école, remplace tutoring_requests) ──
CREATE TABLE IF NOT EXISTS public.school_posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    user_type       TEXT NOT NULL DEFAULT 'student' CHECK (user_type IN ('teacher','student','admin')),
    content         TEXT NOT NULL,
    photos          TEXT[] DEFAULT '{}',
    is_pinned       BOOLEAN DEFAULT FALSE,
    like_count      INTEGER DEFAULT 0,
    liked_by        UUID[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_posts_org ON public.school_posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_school_posts_user ON public.school_posts(user_id);

ALTER TABLE public.school_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_posts_read" ON public.school_posts;
CREATE POLICY "school_posts_read" ON public.school_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "school_posts_insert" ON public.school_posts;
CREATE POLICY "school_posts_insert" ON public.school_posts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "school_posts_update" ON public.school_posts;
CREATE POLICY "school_posts_update" ON public.school_posts FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "school_posts_delete" ON public.school_posts;
CREATE POLICY "school_posts_delete" ON public.school_posts FOR DELETE TO authenticated USING (true);

-- ── 2. SUBJECT PROGRAMS (Cursus du prof — chapitres par matière) ──
CREATE TABLE IF NOT EXISTS public.subject_programs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id      UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    chapter_number  INTEGER NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    is_completed    BOOLEAN DEFAULT FALSE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_programs_subject ON public.subject_programs(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_programs_org ON public.subject_programs(organization_id);

ALTER TABLE public.subject_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_programs_read" ON public.subject_programs;
CREATE POLICY "subject_programs_read" ON public.subject_programs FOR SELECT USING (true);

DROP POLICY IF EXISTS "subject_programs_insert" ON public.subject_programs;
CREATE POLICY "subject_programs_insert" ON public.subject_programs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "subject_programs_update" ON public.subject_programs;
CREATE POLICY "subject_programs_update" ON public.subject_programs FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "subject_programs_delete" ON public.subject_programs;
CREATE POLICY "subject_programs_delete" ON public.subject_programs FOR DELETE TO authenticated USING (true);

-- ── 3. Ensure graded_by column exists in grades ──
DO $$ BEGIN
    ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS graded_by UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ── 4. Ensure anon can read essential tables (for non-auth campus flow) ──
DROP POLICY IF EXISTS "teacher_anon_read" ON public.teacher_profiles;
CREATE POLICY "teacher_anon_read" ON public.teacher_profiles FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "student_anon_read" ON public.student_profiles;
CREATE POLICY "student_anon_read" ON public.student_profiles FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "classroom_anon_read" ON public.classrooms;
CREATE POLICY "classroom_anon_read" ON public.classrooms FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "subject_anon_read" ON public.subjects;
CREATE POLICY "subject_anon_read" ON public.subjects FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "evaluation_anon_read" ON public.evaluations;
CREATE POLICY "evaluation_anon_read" ON public.evaluations FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "grade_anon_read" ON public.grades;
CREATE POLICY "grade_anon_read" ON public.grades FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "timetable_slot_anon_read" ON public.timetable_slots;
CREATE POLICY "timetable_slot_anon_read" ON public.timetable_slots FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "school_payment_anon_read" ON public.school_payments;
CREATE POLICY "school_payment_anon_read" ON public.school_payments FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "filiere_anon_read" ON public.filieres;
CREATE POLICY "filiere_anon_read" ON public.filieres FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "school_posts_anon_read" ON public.school_posts;
CREATE POLICY "school_posts_anon_read" ON public.school_posts FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "subject_programs_anon_read" ON public.subject_programs;
CREATE POLICY "subject_programs_anon_read" ON public.subject_programs FOR SELECT TO anon USING (true);

-- ── 5. Anon insert/update policies for grades/evaluations (campus uses non-auth sessions) ──
DROP POLICY IF EXISTS "grade_anon_insert" ON public.grades;
CREATE POLICY "grade_anon_insert" ON public.grades FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "grade_anon_update" ON public.grades;
CREATE POLICY "grade_anon_update" ON public.grades FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "evaluation_anon_insert" ON public.evaluations;
CREATE POLICY "evaluation_anon_insert" ON public.evaluations FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "school_posts_anon_insert" ON public.school_posts;
CREATE POLICY "school_posts_anon_insert" ON public.school_posts FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "school_posts_anon_update" ON public.school_posts;
CREATE POLICY "school_posts_anon_update" ON public.school_posts FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "subject_programs_anon_insert" ON public.subject_programs;
CREATE POLICY "subject_programs_anon_insert" ON public.subject_programs FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "subject_programs_anon_update" ON public.subject_programs;
CREATE POLICY "subject_programs_anon_update" ON public.subject_programs FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "subject_programs_anon_delete" ON public.subject_programs;
CREATE POLICY "subject_programs_anon_delete" ON public.subject_programs FOR DELETE TO anon USING (true);

-- Done!
