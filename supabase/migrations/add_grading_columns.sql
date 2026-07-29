-- Migration: Add feedback and graded_at columns to exercise_submissions
-- + Add feedback and graded_at columns to exam_participants (correct table name)

ALTER TABLE public.exercise_submissions
    ADD COLUMN IF NOT EXISTS feedback        TEXT,
    ADD COLUMN IF NOT EXISTS graded_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS submitted_at    TIMESTAMPTZ DEFAULT NOW();

-- Also ensure score column exists (may already exist)
ALTER TABLE public.exercise_submissions
    ADD COLUMN IF NOT EXISTS score           NUMERIC(5,2);

-- Add answer_key field visibility: ensure exam_papers has questions column
-- (already JSONB from previous migration, this is idempotent)

-- exam_participants (correct name from exam_room_tables.sql): add missing columns
-- NOTE: 'score' column already exists in exam_participants from the original migration
ALTER TABLE public.exam_participants
    ADD COLUMN IF NOT EXISTS feedback        TEXT,
    ADD COLUMN IF NOT EXISTS graded_at       TIMESTAMPTZ;

-- Grade disputes table: ensure it exists with correct columns
CREATE TABLE IF NOT EXISTS public.grade_disputes (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    student_id      UUID NOT NULL,
    exercise_id     UUID,
    submission_id   UUID,
    subject_id      UUID,
    message         TEXT NOT NULL,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.grade_disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grade_disputes_open" ON public.grade_disputes;
CREATE POLICY "grade_disputes_open" ON public.grade_disputes FOR ALL USING (true) WITH CHECK (true);
