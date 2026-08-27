-- ==============================================================================
-- 073: SCHEMA PRO TRAINING CENTERS & INDEPENDENT TRAINERS
-- Description: Supports vocational training centers (sessions, cohorts, durations,
--              rhythms, competencies, certificate verification, and payment milestones)
-- ==============================================================================

-- 1. Organizations: Add pro training center & trainer fields
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS school_type TEXT DEFAULT 'k12_school',
ADD COLUMN IF NOT EXISTS session_duration TEXT DEFAULT '3_months',
ADD COLUMN IF NOT EXISTS cohort_rhythm TEXT DEFAULT 'Plein temps',
ADD COLUMN IF NOT EXISTS training_mode TEXT DEFAULT 'hybrid',
ADD COLUMN IF NOT EXISTS pricing_plan TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'XAF',
ADD COLUMN IF NOT EXISTS pro_accreditation_number TEXT,
ADD COLUMN IF NOT EXISTS default_signatory_name TEXT,
ADD COLUMN IF NOT EXISTS default_signatory_title TEXT DEFAULT 'Le Directeur du Centre';

-- 2. Classrooms (Sessions / Cohortes Pro): Add duration, rhythms, dates, pricing
ALTER TABLE public.classrooms
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS training_duration TEXT,
ADD COLUMN IF NOT EXISTS rhythm TEXT DEFAULT 'Cours du Jour (Plein temps)',
ADD COLUMN IF NOT EXISTS tuition_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS registration_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS certification_type TEXT DEFAULT 'attestation_reussite',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS lead_trainer_id UUID,
ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS competencies_list JSONB DEFAULT '[]'::jsonb;

-- 3. Student Profiles: Add pro enrollment & certification tracking
ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS enrollment_date TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS certification_status TEXT DEFAULT 'in_training',
ADD COLUMN IF NOT EXISTS final_grade NUMERIC,
ADD COLUMN IF NOT EXISTS certificate_code TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS competencies_acquired JSONB DEFAULT '[]'::jsonb;

-- 4. Subjects (Modules Métier): Add hours, practical weight & competencies
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS module_hours INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS is_practical BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS competency_description TEXT;

-- 5. Create Pro Session Milestones table (Jalons de formation / Projets / Soutenances)
CREATE TABLE IF NOT EXISTS public.pro_session_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    milestone_type TEXT DEFAULT 'project', -- 'project', 'midterm_exam', 'final_defense', 'workshop', 'cert_ceremony'
    due_date DATE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for speed
CREATE INDEX IF NOT EXISTS idx_pro_milestones_org ON public.pro_session_milestones(organization_id);
CREATE INDEX IF NOT EXISTS idx_pro_milestones_class ON public.pro_session_milestones(classroom_id);

-- Enable RLS
ALTER TABLE public.pro_session_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pro_session_milestones
DO $$
BEGIN
    DROP POLICY IF EXISTS "pro_milestones_select" ON public.pro_session_milestones;
    CREATE POLICY "pro_milestones_select" ON public.pro_session_milestones
    FOR SELECT USING (true);

    DROP POLICY IF EXISTS "pro_milestones_all" ON public.pro_session_milestones;
    CREATE POLICY "pro_milestones_all" ON public.pro_session_milestones
    FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 6. RPC: Verify Certificate Code (Public lookup)
CREATE OR REPLACE FUNCTION public.verify_pro_certificate(p_certificate_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'valid', true,
        'student_name', sp.first_name || ' ' || sp.last_name,
        'matricule', sp.matricule,
        'cohort_name', cl.name,
        'organization_name', org.name,
        'organization_city', org.city,
        'certification_status', sp.certification_status,
        'completion_date', sp.completion_date,
        'certificate_code', sp.certificate_code,
        'final_grade', sp.final_grade
    ) INTO v_result
    FROM public.student_profiles sp
    JOIN public.organizations org ON org.id = sp.organization_id
    LEFT JOIN public.classrooms cl ON cl.id = sp.classroom_id
    WHERE LOWER(sp.certificate_code) = LOWER(TRIM(p_certificate_code))
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Certificat introuvable ou code invalide.');
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pro_certificate(TEXT) TO anon, authenticated;
