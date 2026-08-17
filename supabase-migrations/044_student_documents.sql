-- =====================================================================
-- Migration 044 : Table student_documents
-- Permet à l'admin de publier des Bulletins, Certificats et Relevés de notes
-- pour que l'étudiant puisse les consulter et les télécharger (coût : 3 Sky Points)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.student_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    doc_type            TEXT NOT NULL CHECK (doc_type IN ('bulletin', 'certificat', 'releve')),
    title               TEXT NOT NULL,
    data                JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_published        BOOLEAN NOT NULL DEFAULT TRUE,
    template_id         INTEGER NOT NULL DEFAULT 1,
    unlocked_by_student BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour requêtes rapides par étudiant et organisation
CREATE INDEX IF NOT EXISTS idx_student_documents_student
    ON public.student_documents (student_id, is_published);

CREATE INDEX IF NOT EXISTS idx_student_documents_org
    ON public.student_documents (organization_id);

-- Activer RLS
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour anon et authenticated (filtrage par student_id / organization_id)
DROP POLICY IF EXISTS "student_documents_select_policy" ON public.student_documents;
CREATE POLICY "student_documents_select_policy" ON public.student_documents
    FOR SELECT TO public
    USING (true);

-- Politique d'insertion et mise à jour
DROP POLICY IF EXISTS "student_documents_all_policy" ON public.student_documents;
CREATE POLICY "student_documents_all_policy" ON public.student_documents
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.student_documents IS 'Documents officiels (bulletins, certificats, relevés) publiés par l''établissement pour les élèves';
