-- ══════════════════════════════════════════════════════════════
-- FIX RLS: subjects, chapters, lessons, exercises, lesson_progress
-- Permet aux Administrateurs et Enseignants (session sur-mesure)
-- d'ajouter et modifier les matières, chapitres et leçons.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.subjects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress    ENABLE ROW LEVEL SECURITY;

-- ── SUBJECTS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "subjects_open_select" ON public.subjects;
DROP POLICY IF EXISTS "subjects_open_insert" ON public.subjects;
DROP POLICY IF EXISTS "subjects_open_update" ON public.subjects;
DROP POLICY IF EXISTS "subjects_open_delete" ON public.subjects;

CREATE POLICY "subjects_open_select" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "subjects_open_insert" ON public.subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "subjects_open_update" ON public.subjects FOR UPDATE USING (true);
CREATE POLICY "subjects_open_delete" ON public.subjects FOR DELETE USING (true);

-- ── CHAPTERS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "chapters_open_select" ON public.chapters;
DROP POLICY IF EXISTS "chapters_open_insert" ON public.chapters;
DROP POLICY IF EXISTS "chapters_open_update" ON public.chapters;
DROP POLICY IF EXISTS "chapters_open_delete" ON public.chapters;

CREATE POLICY "chapters_open_select" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "chapters_open_insert" ON public.chapters FOR INSERT WITH CHECK (true);
CREATE POLICY "chapters_open_update" ON public.chapters FOR UPDATE USING (true);
CREATE POLICY "chapters_open_delete" ON public.chapters FOR DELETE USING (true);

-- ── LESSONS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "lessons_open_select" ON public.lessons;
DROP POLICY IF EXISTS "lessons_open_insert" ON public.lessons;
DROP POLICY IF EXISTS "lessons_open_update" ON public.lessons;
DROP POLICY IF EXISTS "lessons_open_delete" ON public.lessons;

CREATE POLICY "lessons_open_select" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "lessons_open_insert" ON public.lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "lessons_open_update" ON public.lessons FOR UPDATE USING (true);
CREATE POLICY "lessons_open_delete" ON public.lessons FOR DELETE USING (true);

-- ── EXERCISES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "exercises_open_select" ON public.exercises;
DROP POLICY IF EXISTS "exercises_open_insert" ON public.exercises;
DROP POLICY IF EXISTS "exercises_open_update" ON public.exercises;
DROP POLICY IF EXISTS "exercises_open_delete" ON public.exercises;

CREATE POLICY "exercises_open_select" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "exercises_open_insert" ON public.exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "exercises_open_update" ON public.exercises FOR UPDATE USING (true);
CREATE POLICY "exercises_open_delete" ON public.exercises FOR DELETE USING (true);

-- ── EXERCISE SUBMISSIONS ──────────────────────────────────────
DROP POLICY IF EXISTS "exercise_submissions_open_select" ON public.exercise_submissions;
DROP POLICY IF EXISTS "exercise_submissions_open_insert" ON public.exercise_submissions;
DROP POLICY IF EXISTS "exercise_submissions_open_update" ON public.exercise_submissions;

CREATE POLICY "exercise_submissions_open_select" ON public.exercise_submissions FOR SELECT USING (true);
CREATE POLICY "exercise_submissions_open_insert" ON public.exercise_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "exercise_submissions_open_update" ON public.exercise_submissions FOR UPDATE USING (true);

-- ── LESSON PROGRESS ───────────────────────────────────────────
DROP POLICY IF EXISTS "lesson_progress_open_select" ON public.lesson_progress;
DROP POLICY IF EXISTS "lesson_progress_open_insert" ON public.lesson_progress;
DROP POLICY IF EXISTS "lesson_progress_open_update" ON public.lesson_progress;

CREATE POLICY "lesson_progress_open_select" ON public.lesson_progress FOR SELECT USING (true);
CREATE POLICY "lesson_progress_open_insert" ON public.lesson_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "lesson_progress_open_update" ON public.lesson_progress FOR UPDATE USING (true);
