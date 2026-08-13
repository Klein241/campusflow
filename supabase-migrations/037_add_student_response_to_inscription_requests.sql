-- =======================================================================
-- MIGRATION 037: Ajout de student_response dans inscription_requests
-- Permet aux étudiants d'envoyer des réponses textuelles + pièces justificatives
-- =======================================================================

ALTER TABLE public.inscription_requests
    ADD COLUMN IF NOT EXISTS student_response TEXT;

-- Index pour accélérer le filtrage par organization_id
CREATE INDEX IF NOT EXISTS idx_inscription_requests_org_id
    ON public.inscription_requests (organization_id);

-- Activer Realtime sur la table inscription_requests (si pas déjà actif)
ALTER PUBLICATION supabase_realtime ADD TABLE public.inscription_requests;
