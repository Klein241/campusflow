-- ═══════════════════════════════════════════════════════════════════════
-- Migration 039: Correction des colonnes de student_profiles et auto-sync
-- S'assure que student_profiles contient toutes les colonnes nécessaires
-- et synchronise les enregistrements orphelins de inscription_requests
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS nationality    TEXT,
    ADD COLUMN IF NOT EXISTS guardian_name  TEXT,
    ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending'
        CHECK (approval_status IN ('pending','approved','rejected','info_needed')),
    ADD COLUMN IF NOT EXISTS access_code    TEXT,
    ADD COLUMN IF NOT EXISTS pin_code       TEXT,
    ADD COLUMN IF NOT EXISTS pin_set        BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sky_points     INTEGER DEFAULT 100;

-- S'assurer d'un index sur access_code
CREATE INDEX IF NOT EXISTS idx_student_profiles_access_code
    ON public.student_profiles(access_code) WHERE access_code IS NOT NULL;

-- Synchroniser TOUTES les demandes d'inscription existantes vers student_profiles (auto-repair)
INSERT INTO public.student_profiles (
    organization_id,
    first_name,
    last_name,
    phone,
    email,
    address,
    birth_date,
    gender,
    classroom_id,
    filiere_id,
    access_code,
    pin_code,
    pin_set,
    sky_points,
    approval_status,
    nationality,
    guardian_name,
    guardian_phone,
    is_active
)
SELECT 
    ir.organization_id,
    ir.first_name,
    ir.last_name,
    ir.phone,
    ir.email,
    ir.address,
    ir.birth_date,
    ir.gender,
    ir.classroom_id,
    ir.filiere_id,
    ir.access_code,
    ir.pin_code,
    TRUE,
    100,
    COALESCE(ir.status, 'pending'),
    ir.nationality,
    ir.guardian_name,
    ir.guardian_phone,
    TRUE
FROM public.inscription_requests ir
WHERE ir.access_code IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.student_profiles sp 
      WHERE sp.access_code = ir.access_code
  )
ON CONFLICT (access_code) DO NOTHING;
