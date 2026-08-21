-- ============================================================
-- MIGRATION 055 — Bento Grid & Deux Colonnes Studio par défaut
-- 1. Toutes les écoles déjà créées passent par défaut sur Bento Grid et Deux Colonnes Studio
-- 2. Les colonnes landing_layout et hero_template ont comme DEFAULT 'bento_grid' et 'split'
-- ============================================================

-- 1. S'assurer que les colonnes existent avec les nouvelles valeurs par défaut
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS landing_layout TEXT DEFAULT 'bento_grid',
    ADD COLUMN IF NOT EXISTS hero_template  TEXT DEFAULT 'split';

-- 2. Mettre à jour la valeur par défaut au niveau du schéma PostgreSQL
ALTER TABLE public.organizations 
    ALTER COLUMN landing_layout SET DEFAULT 'bento_grid',
    ALTER COLUMN hero_template  SET DEFAULT 'split';

-- 3. Mettre à jour toutes les écoles existantes (pour les organisations sans template spécifique ou restées sur classic/minimal/full)
UPDATE public.organizations
    SET landing_layout = 'bento_grid'
    WHERE landing_layout IS NULL OR landing_layout = 'classic';

UPDATE public.organizations
    SET hero_template = 'split'
    WHERE hero_template IS NULL OR hero_template = 'minimal' OR hero_template = 'full';

SELECT 'Migration 055 OK — Bento Grid et Deux Colonnes Studio appliqués par défaut à toutes les écoles' AS status;
