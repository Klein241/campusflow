-- =====================================================================
-- Migration 043 : Ajout de la colonne suspension_reason
-- Tâche 3 : Permettre à l'admin de suspendre un compte avec un motif
-- =====================================================================

-- Ajouter suspension_reason à student_profiles si elle n'existe pas
ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL;

-- Ajouter suspension_reason à teacher_profiles si elle n'existe pas
ALTER TABLE public.teacher_profiles
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL;

-- Index pour filtrer les comptes actifs/suspendus facilement
CREATE INDEX IF NOT EXISTS idx_student_profiles_is_active
    ON public.student_profiles (is_active)
    WHERE is_active = FALSE;

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_is_active
    ON public.teacher_profiles (is_active)
    WHERE is_active = FALSE;

-- Commentaire
COMMENT ON COLUMN public.student_profiles.suspension_reason IS 'Motif de suspension du compte étudiant par l''administrateur';
COMMENT ON COLUMN public.teacher_profiles.suspension_reason IS 'Motif de suspension du compte professeur par l''administrateur';
