-- ============================================================
-- MIGRATION 056 — Configuration de personnalisation des templates
-- Ajoute la colonne template_config (JSONB) pour stocker tous les réglages
-- de contenu, photos, textes et commutateurs de visibilité des landing pages.
-- ============================================================

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}'::jsonb;

-- Assurer que la colonne unlocked_styles existe pour les achats
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS unlocked_styles TEXT[] DEFAULT ARRAY[]::TEXT[];

SELECT 'Migration 056 OK — template_config et unlocked_styles opérationnels' AS status;
