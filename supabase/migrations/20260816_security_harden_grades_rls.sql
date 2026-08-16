-- ══════════════════════════════════════════════════════════
-- CAMPUSFLOW — Durcissement Sécurité RLS : evaluations & grades
-- Date : 2026-08-16
-- Version : 2.0 (Deadlock-Safe, exécution séparée et sécurisée)
-- ══════════════════════════════════════════════════════════

-- Définir un timeout de verrou pour éviter tout blocage concurrent
SET lock_timeout = '4s';

-- ──────────────────────────────────────────────────────────
-- ÉTAPE 1 : Table EVALUATIONS
-- ──────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evaluations_open" ON public.evaluations;
DROP POLICY IF EXISTS "evaluations_open_select" ON public.evaluations;
DROP POLICY IF EXISTS "evaluations_open_insert" ON public.evaluations;
DROP POLICY IF EXISTS "evaluations_open_update" ON public.evaluations;
DROP POLICY IF EXISTS "evaluations_open_delete" ON public.evaluations;
DROP POLICY IF EXISTS "evaluations_org_read" ON public.evaluations;
DROP POLICY IF EXISTS "evaluations_authorized_write" ON public.evaluations;

-- Lecture : accessible à tous les membres connectés ou service_role
CREATE POLICY "evaluations_org_read" ON public.evaluations
    FOR SELECT USING (true);

-- Écriture : strictement Enseignant responsable ou Direction
CREATE POLICY "evaluations_authorized_write" ON public.evaluations
    FOR ALL USING (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = evaluations.organization_id AND o.owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.subjects s
            WHERE s.id = evaluations.subject_id AND s.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = evaluations.organization_id AND o.owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.subjects s
            WHERE s.id = evaluations.subject_id AND s.teacher_id = auth.uid()
        )
    );

-- ──────────────────────────────────────────────────────────
-- ÉTAPE 2 : Table GRADES (Notes)
-- ──────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grades_open" ON public.grades;
DROP POLICY IF EXISTS "grades_open_select" ON public.grades;
DROP POLICY IF EXISTS "grades_open_insert" ON public.grades;
DROP POLICY IF EXISTS "grades_open_update" ON public.grades;
DROP POLICY IF EXISTS "grades_open_delete" ON public.grades;
DROP POLICY IF EXISTS "grades_authorized_read" ON public.grades;
DROP POLICY IF EXISTS "grades_authorized_write" ON public.grades;

-- Lecture des notes : élève concerné, enseignant de la matière, admin ou service_role
CREATE POLICY "grades_authorized_read" ON public.grades
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR
        student_id::text = auth.uid()::text
        OR
        EXISTS (
            SELECT 1 FROM public.evaluations e
            JOIN public.subjects s ON s.id = e.subject_id
            WHERE e.id = grades.evaluation_id AND s.teacher_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.evaluations e
            JOIN public.organizations o ON o.id = e.organization_id
            WHERE e.id = grades.evaluation_id AND o.owner_id = auth.uid()
        )
    );

-- Écriture des notes (INSERT / UPDATE / DELETE) : STRICTEMENT enseignant ou direction
CREATE POLICY "grades_authorized_write" ON public.grades
    FOR ALL USING (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM public.evaluations e
            JOIN public.subjects s ON s.id = e.subject_id
            WHERE e.id = grades.evaluation_id AND s.teacher_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.evaluations e
            JOIN public.organizations o ON o.id = e.organization_id
            WHERE e.id = grades.evaluation_id AND o.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM public.evaluations e
            JOIN public.subjects s ON s.id = e.subject_id
            WHERE e.id = grades.evaluation_id AND s.teacher_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.evaluations e
            JOIN public.organizations o ON o.id = e.organization_id
            WHERE e.id = grades.evaluation_id AND o.owner_id = auth.uid()
        )
    );
