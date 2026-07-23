-- ══════════════════════════════════════════════════════════════
-- FIX RLS: forms, form_fields, form_responses, form_answers
-- CampusFlow n'utilise pas Supabase Auth (auth.uid() = null)
-- On ouvre les politiques RLS pour permettre le CRUD via les RPC/Service
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.forms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_answers   ENABLE ROW LEVEL SECURITY;

-- ── FORMS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read published forms" ON public.forms;
DROP POLICY IF EXISTS "Creators read their own forms" ON public.forms;
DROP POLICY IF EXISTS "Anyone can create forms"      ON public.forms;
DROP POLICY IF EXISTS "Creator can update forms"     ON public.forms;
DROP POLICY IF EXISTS "Creator can delete forms"     ON public.forms;
DROP POLICY IF EXISTS "forms_open_select"            ON public.forms;
DROP POLICY IF EXISTS "forms_open_insert"            ON public.forms;
DROP POLICY IF EXISTS "forms_open_update"            ON public.forms;
DROP POLICY IF EXISTS "forms_open_delete"            ON public.forms;

CREATE POLICY "forms_open_select" ON public.forms FOR SELECT USING (true);
CREATE POLICY "forms_open_insert" ON public.forms FOR INSERT WITH CHECK (true);
CREATE POLICY "forms_open_update" ON public.forms FOR UPDATE USING (true);
CREATE POLICY "forms_open_delete" ON public.forms FOR DELETE USING (true);

-- ── FORM FIELDS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Read fields if form is accessible" ON public.form_fields;
DROP POLICY IF EXISTS "Anyone can insert fields"          ON public.form_fields;
DROP POLICY IF EXISTS "Anyone can update fields"          ON public.form_fields;
DROP POLICY IF EXISTS "Anyone can delete fields"          ON public.form_fields;
DROP POLICY IF EXISTS "form_fields_open_select"           ON public.form_fields;
DROP POLICY IF EXISTS "form_fields_open_insert"           ON public.form_fields;
DROP POLICY IF EXISTS "form_fields_open_update"           ON public.form_fields;
DROP POLICY IF EXISTS "form_fields_open_delete"           ON public.form_fields;

CREATE POLICY "form_fields_open_select" ON public.form_fields FOR SELECT USING (true);
CREATE POLICY "form_fields_open_insert" ON public.form_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "form_fields_open_update" ON public.form_fields FOR UPDATE USING (true);
CREATE POLICY "form_fields_open_delete" ON public.form_fields FOR DELETE USING (true);

-- ── FORM RESPONSES ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.form_responses;
DROP POLICY IF EXISTS "Anyone can read responses"   ON public.form_responses;
DROP POLICY IF EXISTS "Anyone can update responses" ON public.form_responses;
DROP POLICY IF EXISTS "form_responses_open_select"  ON public.form_responses;
DROP POLICY IF EXISTS "form_responses_open_insert"  ON public.form_responses;
DROP POLICY IF EXISTS "form_responses_open_update"  ON public.form_responses;

CREATE POLICY "form_responses_open_select" ON public.form_responses FOR SELECT USING (true);
CREATE POLICY "form_responses_open_insert" ON public.form_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "form_responses_open_update" ON public.form_responses FOR UPDATE USING (true);

-- ── FORM ANSWERS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can insert answers" ON public.form_answers;
DROP POLICY IF EXISTS "Anyone can read answers"   ON public.form_answers;
DROP POLICY IF EXISTS "form_answers_open_select"  ON public.form_answers;
DROP POLICY IF EXISTS "form_answers_open_insert"  ON public.form_answers;

CREATE POLICY "form_answers_open_select" ON public.form_answers FOR SELECT USING (true);
CREATE POLICY "form_answers_open_insert" ON public.form_answers FOR INSERT WITH CHECK (true);
