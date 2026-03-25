-- ============================================================
-- CAMPUSFLOW — Table des notes (grades)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.grades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id   UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    score           NUMERIC(5,2),
    comment         TEXT,
    graded_by       UUID REFERENCES public.teacher_profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(evaluation_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_grades_eval ON public.grades(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.grades(student_id);

-- RLS
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Teachers can read/write grades for their evals
DROP POLICY IF EXISTS "grades_read" ON public.grades;
CREATE POLICY "grades_read" ON public.grades FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "grades_insert" ON public.grades;
CREATE POLICY "grades_insert" ON public.grades FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "grades_update" ON public.grades;
CREATE POLICY "grades_update" ON public.grades FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "grades_delete" ON public.grades;
CREATE POLICY "grades_delete" ON public.grades FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.evaluations e
        JOIN public.organizations o ON e.organization_id = o.id
        WHERE e.id = grades.evaluation_id AND o.owner_id = auth.uid()
    )
);
