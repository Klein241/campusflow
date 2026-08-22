-- ════════════════════════════════════════════════════════════════
-- MIGRATION 062: FORMS, SURVEYS, QUIZZES & REGISTRATION SYSTEM
-- Table definitions, indexes and open RLS policies (CampusFlow SPA auth)
-- ════════════════════════════════════════════════════════════════

-- ── 1. FORMS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forms (
    id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id             UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_by_role             TEXT NOT NULL DEFAULT 'teacher', -- 'teacher' | 'student' | 'admin'
    created_by_id               TEXT NOT NULL,                    -- teacher/student profile id
    title                       TEXT NOT NULL,
    description                 TEXT,
    slug                        TEXT UNIQUE NOT NULL,
    form_type                   TEXT NOT NULL DEFAULT 'survey',   -- 'survey' | 'quiz' | 'registration'
    is_published                BOOLEAN NOT NULL DEFAULT TRUE,
    accepts_responses           BOOLEAN NOT NULL DEFAULT TRUE,
    show_results_to_respondents BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ── 2. FORM FIELDS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.form_fields (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id        UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
    field_type     TEXT NOT NULL,
    -- 'short_text' | 'long_text' | 'multiple_choice' | 'checkbox'
    -- | 'dropdown' | 'date' | 'time' | 'rating' | 'number' | 'section_header'
    label          TEXT NOT NULL,
    description    TEXT,
    options        JSONB,          -- string[] for MC / checkbox / dropdown
    required       BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    correct_answer TEXT,           -- for quiz: the correct value
    points         INTEGER NOT NULL DEFAULT 0, -- for quiz: points per question
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── 3. FORM RESPONSES TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.form_responses (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id          UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
    respondent_name  TEXT,
    respondent_email TEXT,
    total_score      INTEGER DEFAULT 0,
    submitted_at     TIMESTAMPTZ DEFAULT now()
);

-- ── 4. FORM ANSWERS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.form_answers (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id  UUID REFERENCES public.form_responses(id) ON DELETE CASCADE NOT NULL,
    field_id     UUID REFERENCES public.form_fields(id) ON DELETE CASCADE NOT NULL,
    answer_value JSONB  -- string | string[] | number | null
);

-- ════════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_forms_org_id          ON public.forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug            ON public.forms(slug);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id   ON public.form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON public.form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_answers_resp_id  ON public.form_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_form_answers_field_id ON public.form_answers(field_id);

-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — Open for SPA client-side role management
-- ════════════════════════════════════════════════════════════════
ALTER TABLE public.forms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_answers   ENABLE ROW LEVEL SECURITY;

-- FORMS
DROP POLICY IF EXISTS "forms_open_select" ON public.forms;
DROP POLICY IF EXISTS "forms_open_insert" ON public.forms;
DROP POLICY IF EXISTS "forms_open_update" ON public.forms;
DROP POLICY IF EXISTS "forms_open_delete" ON public.forms;

CREATE POLICY "forms_open_select" ON public.forms FOR SELECT USING (true);
CREATE POLICY "forms_open_insert" ON public.forms FOR INSERT WITH CHECK (true);
CREATE POLICY "forms_open_update" ON public.forms FOR UPDATE USING (true);
CREATE POLICY "forms_open_delete" ON public.forms FOR DELETE USING (true);

-- FORM FIELDS
DROP POLICY IF EXISTS "form_fields_open_select" ON public.form_fields;
DROP POLICY IF EXISTS "form_fields_open_insert" ON public.form_fields;
DROP POLICY IF EXISTS "form_fields_open_update" ON public.form_fields;
DROP POLICY IF EXISTS "form_fields_open_delete" ON public.form_fields;

CREATE POLICY "form_fields_open_select" ON public.form_fields FOR SELECT USING (true);
CREATE POLICY "form_fields_open_insert" ON public.form_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "form_fields_open_update" ON public.form_fields FOR UPDATE USING (true);
CREATE POLICY "form_fields_open_delete" ON public.form_fields FOR DELETE USING (true);

-- FORM RESPONSES
DROP POLICY IF EXISTS "form_responses_open_select" ON public.form_responses;
DROP POLICY IF EXISTS "form_responses_open_insert" ON public.form_responses;
DROP POLICY IF EXISTS "form_responses_open_update" ON public.form_responses;

CREATE POLICY "form_responses_open_select" ON public.form_responses FOR SELECT USING (true);
CREATE POLICY "form_responses_open_insert" ON public.form_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "form_responses_open_update" ON public.form_responses FOR UPDATE USING (true);

-- FORM ANSWERS
DROP POLICY IF EXISTS "form_answers_open_select" ON public.form_answers;
DROP POLICY IF EXISTS "form_answers_open_insert" ON public.form_answers;

CREATE POLICY "form_answers_open_select" ON public.form_answers FOR SELECT USING (true);
CREATE POLICY "form_answers_open_insert" ON public.form_answers FOR INSERT WITH CHECK (true);
