-- ═══════════════════════════════════════════════════════════════════════
-- INSCRIPTION SYSTEM COMPLETE FIX
-- Supabase SQL Editor — exécuter en une seule fois
-- ═══════════════════════════════════════════════════════════════════════

-- 1. S'assurer que student_profiles a toutes les colonnes nécessaires
ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS access_code    TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS pin_code       TEXT,
    ADD COLUMN IF NOT EXISTS pin_set        BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sky_points     INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS gender         TEXT,
    ADD COLUMN IF NOT EXISTS address        TEXT,
    ADD COLUMN IF NOT EXISTS birth_date     DATE,
    ADD COLUMN IF NOT EXISTS filiere_id     UUID,
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending'
        CHECK (approval_status IN ('pending','approved','rejected','info_needed'));

-- 2. S'assurer que inscription_requests a toutes les colonnes
ALTER TABLE public.inscription_requests
    ADD COLUMN IF NOT EXISTS pin_code       TEXT,
    ADD COLUMN IF NOT EXISTS filiere_id     UUID,
    ADD COLUMN IF NOT EXISTS address        TEXT,
    ADD COLUMN IF NOT EXISTS gender         TEXT,
    ADD COLUMN IF NOT EXISTS birth_date     DATE,
    ADD COLUMN IF NOT EXISTS admin_message  TEXT,     -- message admin → étudiant
    ADD COLUMN IF NOT EXISTS document_url   TEXT,     -- document envoyé par l'étudiant
    ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','info_needed'));

-- 3. RLS : permettre lecture de student_profiles avec access_code (login sans auth)
DROP POLICY IF EXISTS "student_self_read" ON public.student_profiles;
CREATE POLICY "student_self_read" ON public.student_profiles
    FOR SELECT USING (true);  -- lecture ouverte (auth custom, pas auth.uid())

DROP POLICY IF EXISTS "student_self_update" ON public.student_profiles;
CREATE POLICY "student_self_update" ON public.student_profiles
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "student_insert_worker" ON public.student_profiles;
CREATE POLICY "student_insert_worker" ON public.student_profiles
    FOR INSERT WITH CHECK (true);

-- 4. RLS : permettre lecture de inscription_requests (admin + étudiant par access_code)
DROP POLICY IF EXISTS "inscription_read_open" ON public.inscription_requests;
CREATE POLICY "inscription_read_open" ON public.inscription_requests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "inscription_update_open" ON public.inscription_requests;
CREATE POLICY "inscription_update_open" ON public.inscription_requests
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "inscription_insert_open" ON public.inscription_requests;
CREATE POLICY "inscription_insert_open" ON public.inscription_requests
    FOR INSERT WITH CHECK (true);

-- 5. Trigger : quand inscription approuvée → mettre approval_status = 'approved' dans student_profiles
CREATE OR REPLACE FUNCTION sync_approval_to_profile()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IN ('approved','rejected','info_needed')
       AND OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE public.student_profiles
        SET approval_status = NEW.status,
            updated_at = now()
        WHERE access_code = NEW.access_code
          AND organization_id = NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_approval ON public.inscription_requests;
CREATE TRIGGER trg_sync_approval
    AFTER UPDATE ON public.inscription_requests
    FOR EACH ROW
    EXECUTE FUNCTION sync_approval_to_profile();

-- 6. Ajouter updated_at si manquant
ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'student_profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;
