-- ============================================================
-- MIGRATION 008: Enrichir subjects avec filiere_id + duration
-- Structure: Filière → Matières (avec prof + durée totale)
-- ============================================================

-- 1. Ajouter filiere_id aux matières (pour lier matière → filière)
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS filiere_id UUID REFERENCES public.filieres(id) ON DELETE SET NULL;

-- 2. Ajouter la durée totale d'une matière en heures
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS total_hours INTEGER DEFAULT 40;

-- 3. Ajouter description aux matières
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Ajouter is_active aux matières
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 5. S'assurer que subjects.teacher_id pointe vers teacher_profiles
-- (déjà fait en migration 007, mais sécurité)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'subjects_teacher_id_fkey'
        AND table_name = 'subjects'
    ) THEN
        ALTER TABLE public.subjects DROP CONSTRAINT subjects_teacher_id_fkey;
    END IF;
    ALTER TABLE public.subjects
        ADD CONSTRAINT subjects_teacher_id_fkey
        FOREIGN KEY (teacher_id) REFERENCES public.teacher_profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Index pour filiere_id
CREATE INDEX IF NOT EXISTS idx_subject_filiere ON public.subjects(filiere_id);

-- 7. Ajouter photo_url aux teacher_profiles et student_profiles
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 8. S'assurer que filieres a bien organization_id
-- (déjà dans le schéma, mais vérifier)
ALTER TABLE public.filieres ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 9. RLS pour filieres (lecture publique)
DROP POLICY IF EXISTS filieres_select ON public.filieres;
CREATE POLICY filieres_select ON public.filieres FOR SELECT USING (true);

DROP POLICY IF EXISTS filieres_insert ON public.filieres;
CREATE POLICY filieres_insert ON public.filieres FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS filieres_update ON public.filieres;
CREATE POLICY filieres_update ON public.filieres FOR UPDATE USING (true);

DROP POLICY IF EXISTS filieres_delete ON public.filieres;
CREATE POLICY filieres_delete ON public.filieres FOR DELETE USING (true);

-- Activer RLS sur filieres
ALTER TABLE public.filieres ENABLE ROW LEVEL SECURITY;
