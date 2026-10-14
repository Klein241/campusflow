-- ==============================================================================
-- CLOUDFLARE D1 SCHEMA (SQLite Serverless)
-- Script d'initialisation pour le Studio de Personnalisation & les Templates
-- Exécution via Wrangler CLI :
--   wrangler d1 execute <VOTRE_DATABASE_NAME> --file=./schema-d1.sql
-- ==============================================================================

-- 1. Configuration principale de la Landing Page et du Studio
CREATE TABLE IF NOT EXISTS landing_configs (
    id TEXT PRIMARY KEY,                       -- org_id ou slug unique
    org_id TEXT NOT NULL,
    org_slug TEXT NOT NULL,
    org_name TEXT NOT NULL,
    brand_color TEXT DEFAULT '#F59E0B',
    landing_layout TEXT DEFAULT 'bento_grid',  -- ex: 'bento_grid', 'product_mastery', 'coach_pastelle', etc.
    hero_template TEXT DEFAULT 'split',        -- 'split' | 'minimal' | 'full'
    template_config TEXT DEFAULT '{}',         -- JSON sérialisé de TemplateCustomConfig (hero, cta, citations, stats, etc.)
    gallery_images TEXT DEFAULT '[]',          -- JSON Array des URLs d'images R2
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_landing_configs_org_id ON landing_configs(org_id);
CREATE INDEX IF NOT EXISTS idx_landing_configs_slug ON landing_configs(org_slug);

-- 2. Formations, Cours ou Offres synchronisées
CREATE TABLE IF NOT EXISTS landing_programs (
    id TEXT PRIMARY KEY,                       -- UUID ou slug
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Cursus Professionnel',
    duration_months INTEGER DEFAULT 6,
    duration_text TEXT DEFAULT '6 mois',
    price INTEGER DEFAULT 0,                   -- Prix en FCFA (ou unité de référence)
    original_price INTEGER,                    -- Prix barré de référence
    promo_badge TEXT,                          -- ex: '-35%', 'Offre Rentrée'
    certification_label TEXT DEFAULT 'Certification PRO',
    cta_text TEXT DEFAULT 'Postuler',
    description TEXT,
    poster_url TEXT,                           -- Image d'affiche stockée sur Cloudflare R2
    schedule_config TEXT DEFAULT '{}',         -- JSON: sessions, tranches de paiement, etc.
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_landing_programs_org_id ON landing_programs(org_id);

-- 3. Journal des fichiers médias téléversés sur Cloudflare R2
CREATE TABLE IF NOT EXISTS landing_media (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,                      -- Clé d'objet dans le bucket Cloudflare R2
    public_url TEXT NOT NULL,                  -- URL publique CDN R2
    file_name TEXT,
    content_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_landing_media_org_id ON landing_media(org_id);
