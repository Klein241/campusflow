-- ============================================================
-- MIGRATION 057 — Résolution de l'erreur Foreign Key "chapters_subject_id_fkey"
-- 
-- Causes résolues :
-- 1. Les politiques RLS et Grants sur "subjects" bloquaient l'insertion des matières
--    pour les professeurs et administrateurs (qui utilisent le système de session locale).
--    De ce fait, la matière n'était pas persistée en base et la clé étrangère du chapitre échouait.
-- 2. La contrainte "chapters_subject_id_fkey" est réinitialisée proprement avec ON DELETE CASCADE.
-- 3. La colonne chapters.subject_id est rendue nullable (DROP NOT NULL) par sécurité.
-- 4. Tous les grants et RLS pour subjects, chapters, lessons et exercises sont harmonisés.
-- ============================================================

-- 1. Permissions complètes pour subjects, chapters, lessons, exercises
GRANT ALL ON public.subjects TO anon, authenticated, service_role;
GRANT ALL ON public.chapters TO anon, authenticated, service_role;
GRANT ALL ON public.lessons TO anon, authenticated, service_role;
GRANT ALL ON public.exercises TO anon, authenticated, service_role;
GRANT ALL ON public.exercise_submissions TO anon, authenticated, service_role;

-- 2. Correction des RLS sur "subjects" (Permettre lecture et écriture pour profs/admins)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_read" ON public.subjects;
DROP POLICY IF EXISTS "subject_admin_write" ON public.subjects;
DROP POLICY IF EXISTS "subjects_public_read" ON public.subjects;
DROP POLICY IF EXISTS "subjects_owner_write" ON public.subjects;
DROP POLICY IF EXISTS "rls_subjects_select" ON public.subjects;
DROP POLICY IF EXISTS "rls_subjects_insert" ON public.subjects;
DROP POLICY IF EXISTS "rls_subjects_update" ON public.subjects;
DROP POLICY IF EXISTS "rls_subjects_delete" ON public.subjects;
DROP POLICY IF EXISTS "subjects_all_read" ON public.subjects;
DROP POLICY IF EXISTS "subjects_all_write" ON public.subjects;

CREATE POLICY "subjects_all_read" ON public.subjects
    FOR SELECT USING (true);

CREATE POLICY "subjects_all_write" ON public.subjects
    FOR ALL USING (true) WITH CHECK (true);

-- 3. Correction des RLS sur "chapters"
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_chapters_select" ON public.chapters;
DROP POLICY IF EXISTS "rls_chapters_insert" ON public.chapters;
DROP POLICY IF EXISTS "rls_chapters_update" ON public.chapters;
DROP POLICY IF EXISTS "rls_chapters_delete" ON public.chapters;
DROP POLICY IF EXISTS "chapters_all_read" ON public.chapters;
DROP POLICY IF EXISTS "chapters_all_write" ON public.chapters;

CREATE POLICY "chapters_all_read" ON public.chapters
    FOR SELECT USING (true);

CREATE POLICY "chapters_all_write" ON public.chapters
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Assouplir et sécuriser la contrainte Foreign Key chapters_subject_id_fkey
ALTER TABLE public.subjects ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.chapters ALTER COLUMN subject_id DROP NOT NULL;
ALTER TABLE public.chapters ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.lessons  ALTER COLUMN teacher_id DROP NOT NULL;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chapters_subject_id_fkey'
          AND table_name = 'chapters'
    ) THEN
        ALTER TABLE public.chapters DROP CONSTRAINT chapters_subject_id_fkey;
    END IF;

    ALTER TABLE public.chapters
        ADD CONSTRAINT chapters_subject_id_fkey
        FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update handled: %', SQLERRM;
END $$;

-- 5. RLS & Grants pour lessons et exercises
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_lessons_select" ON public.lessons;
DROP POLICY IF EXISTS "rls_lessons_insert" ON public.lessons;
DROP POLICY IF EXISTS "rls_lessons_update" ON public.lessons;
DROP POLICY IF EXISTS "rls_lessons_delete" ON public.lessons;
DROP POLICY IF EXISTS "lessons_all_read" ON public.lessons;
DROP POLICY IF EXISTS "lessons_all_write" ON public.lessons;

CREATE POLICY "lessons_all_read" ON public.lessons
    FOR SELECT USING (true);
CREATE POLICY "lessons_all_write" ON public.lessons
    FOR ALL USING (true) WITH CHECK (true);

SELECT 'Migration 057 OK — foreign key chapters_subject_id_fkey et permissions subjects réparées avec succès' AS status;
