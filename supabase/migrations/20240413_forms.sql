-- ════════════════════════════════════════════════════════════════
-- MIGRATION: Forms (COLLECTE D'INFOS) — CampusFlow
-- Run this in your Supabase SQL Editor
-- Date: 2026-04-13
-- ════════════════════════════════════════════════════════════════

-- ── 1. FORMS TABLE ──────────────────────────────────────────────
create table if not exists public.forms (
    id                          uuid default gen_random_uuid() primary key,
    organization_id             uuid references public.organizations(id) on delete cascade not null,
    created_by_role             text not null default 'teacher', -- 'teacher' | 'student' | 'admin'
    created_by_id               text not null,                    -- teacher/student profile id
    title                       text not null,
    description                 text,
    slug                        text unique not null,
    form_type                   text not null default 'survey',   -- 'survey' | 'quiz' | 'registration'
    is_published                boolean not null default false,
    accepts_responses           boolean not null default true,
    show_results_to_respondents boolean not null default false,
    created_at                  timestamptz default now(),
    updated_at                  timestamptz default now()
);

-- ── 2. FORM FIELDS TABLE ─────────────────────────────────────────
create table if not exists public.form_fields (
    id             uuid default gen_random_uuid() primary key,
    form_id        uuid references public.forms(id) on delete cascade not null,
    field_type     text not null,
    -- 'short_text' | 'long_text' | 'multiple_choice' | 'checkbox'
    -- | 'dropdown' | 'date' | 'time' | 'rating' | 'number' | 'section_header'
    label          text not null,
    description    text,
    options        jsonb,          -- string[] for MC / checkbox / dropdown
    required       boolean not null default false,
    sort_order     integer not null default 0,
    correct_answer text,           -- for quiz: the correct value
    points         integer not null default 0, -- for quiz: points per question
    created_at     timestamptz default now()
);

-- ── 3. FORM RESPONSES TABLE ──────────────────────────────────────
create table if not exists public.form_responses (
    id               uuid default gen_random_uuid() primary key,
    form_id          uuid references public.forms(id) on delete cascade not null,
    respondent_name  text,
    respondent_email text,
    total_score      integer default 0,
    submitted_at     timestamptz default now()
);

-- ── 4. FORM ANSWERS TABLE ────────────────────────────────────────
create table if not exists public.form_answers (
    id           uuid default gen_random_uuid() primary key,
    response_id  uuid references public.form_responses(id) on delete cascade not null,
    field_id     uuid references public.form_fields(id) on delete cascade not null,
    answer_value jsonb  -- string | string[] | number | null
);

-- ════════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════════
create index if not exists idx_forms_org_id  on public.forms(organization_id);
create index if not exists idx_forms_slug    on public.forms(slug);
create index if not exists idx_form_fields_form_id on public.form_fields(form_id);
create index if not exists idx_form_responses_form_id on public.form_responses(form_id);
create index if not exists idx_form_answers_response_id on public.form_answers(response_id);
create index if not exists idx_form_answers_field_id on public.form_answers(field_id);

-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════
alter table public.forms          enable row level security;
alter table public.form_fields    enable row level security;
alter table public.form_responses enable row level security;
alter table public.form_answers   enable row level security;

-- ── FORMS: anyone can read published forms, anyone can manage their own ──
create policy "Public read published forms"
    on public.forms for select
    using (is_published = true);

create policy "Creators read their own forms"
    on public.forms for select
    using (true); -- open read — filter done client-side per created_by_id

create policy "Anyone can create forms"
    on public.forms for insert
    with check (true);

create policy "Creator can update forms"
    on public.forms for update
    using (true);

create policy "Creator can delete forms"
    on public.forms for delete
    using (true);

-- ── FORM FIELDS ──────────────────────────────────────────────────
create policy "Read fields if form is accessible"
    on public.form_fields for select
    using (
        exists (select 1 from public.forms f where f.id = form_id)
    );

create policy "Anyone can insert fields"
    on public.form_fields for insert
    with check (true);

create policy "Anyone can update fields"
    on public.form_fields for update
    using (true);

create policy "Anyone can delete fields"
    on public.form_fields for delete
    using (true);

-- ── FORM RESPONSES ────────────────────────────────────────────────
create policy "Anyone can submit responses"
    on public.form_responses for insert
    with check (true);

create policy "Anyone can read responses"
    on public.form_responses for select
    using (true);

create policy "Anyone can update responses"
    on public.form_responses for update
    using (true);

-- ── FORM ANSWERS ─────────────────────────────────────────────────
create policy "Anyone can insert answers"
    on public.form_answers for insert
    with check (true);

create policy "Anyone can read answers"
    on public.form_answers for select
    using (true);

-- ════════════════════════════════════════════════════════════════
-- DONE ✅
-- After running this migration:
-- 1. Go to CampusFlow > Login as teacher/student
-- 2. Click the "Forms" tab in the bottom nav
-- 3. Create your first form and share the link!
-- ════════════════════════════════════════════════════════════════
