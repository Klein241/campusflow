-- ═══════════════════════════════════════════════════════════════════════
-- Migration 034: Ajout access_code, pin_code, classroom_id à inscription_requests
-- Permet aux étudiants de créer leur code d'accès dès l'inscription
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE inscription_requests
  ADD COLUMN IF NOT EXISTS access_code  VARCHAR(12) UNIQUE,
  ADD COLUMN IF NOT EXISTS pin_code     VARCHAR(4),
  ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;

-- Index pour recherche rapide par code d'accès
CREATE INDEX IF NOT EXISTS idx_inscription_access_code
  ON inscription_requests(access_code)
  WHERE access_code IS NOT NULL;

-- Commentaire
COMMENT ON COLUMN inscription_requests.access_code IS 'Code d''accès de 12 caractères généré automatiquement lors de l''inscription en ligne';
COMMENT ON COLUMN inscription_requests.pin_code     IS 'Code PIN à 4 chiffres choisi par l''étudiant lors de l''inscription';
COMMENT ON COLUMN inscription_requests.classroom_id IS 'Classe souhaitée sélectionnée par l''étudiant';
