-- =============================================================================
-- IziTeach — Migration 050 : Traçabilité IA dans les tables cursus
-- =============================================================================
-- Ajoute les colonnes created_by_ai et ai_agent_name aux tables du cursus
-- afin de tracer quels contenus ont été créés par des agents IA.
--
-- Tables réelles utilisées par l'app :
--   chapters  (pas cursus_chapters)
--   lessons   (pas cursus_lessons)
--   exercises (pas cursus_exercises)
-- =============================================================================

-- ── Subjects ──────────────────────────────────────────────────────────────
ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ai_agent_name TEXT;

-- ── Chapters ─────────────────────────────────────────────────────────────
ALTER TABLE public.chapters
    ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ai_agent_name TEXT;

-- ── Lessons ───────────────────────────────────────────────────────────────
ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ai_agent_name TEXT;

-- ── Exercises ─────────────────────────────────────────────────────────────
ALTER TABLE public.exercises
    ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ai_agent_name TEXT;

-- Index partiels pour filtrer rapidement les contenus créés par IA
CREATE INDEX IF NOT EXISTS idx_chapters_created_by_ai
    ON public.chapters (subject_id) WHERE created_by_ai = TRUE;

CREATE INDEX IF NOT EXISTS idx_lessons_created_by_ai
    ON public.lessons (chapter_id) WHERE created_by_ai = TRUE;

CREATE INDEX IF NOT EXISTS idx_exercises_created_by_ai
    ON public.exercises (lesson_id) WHERE created_by_ai = TRUE;
