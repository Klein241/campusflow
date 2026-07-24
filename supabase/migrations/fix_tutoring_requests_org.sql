-- ══════════════════════════════════════════════════════════════
-- FIX: Ajouter organization_id à tutoring_requests
-- Permet de compartimenter les publications par établissement
-- ══════════════════════════════════════════════════════════════

ALTER TABLE tutoring_requests ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE tutoring_requests ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_tutoring_requests_org ON tutoring_requests(organization_id);
