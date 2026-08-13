-- ═══════════════════════════════════════════════════════════════════════
-- Migration 038: Ajout champs tuteur, nationalité et classe dans inscription_requests
-- Nouveaux champs correspondant au formulaire d'inscription landing page
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.inscription_requests
    ADD COLUMN IF NOT EXISTS nationality    TEXT,
    ADD COLUMN IF NOT EXISTS guardian_name  TEXT,
    ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
    ADD COLUMN IF NOT EXISTS classroom_id   UUID REFERENCES classrooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inscription_requests_classroom_id
    ON public.inscription_requests(classroom_id);

COMMENT ON COLUMN public.inscription_requests.nationality    IS 'Nationalité de l''étudiant';
COMMENT ON COLUMN public.inscription_requests.guardian_name  IS 'Nom du tuteur / parent';
COMMENT ON COLUMN public.inscription_requests.guardian_phone IS 'Téléphone du tuteur / parent';
COMMENT ON COLUMN public.inscription_requests.classroom_id   IS 'Classe choisie à l''inscription';
