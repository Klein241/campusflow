-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: STYLES PREMIUM, LAYOUTS & GRILLE TARIFAIRE SUPERADMIN
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Colonnes pour les organisations (modèles choisis & styles débloqués)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hero_template text DEFAULT 'minimal';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS landing_layout text DEFAULT 'classic';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS unlocked_styles jsonb DEFAULT '["minimal", "classic"]'::jsonb;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sky_points integer DEFAULT 0;

-- 2. Table pour les paramètres globaux de la plateforme (dont la grille tarifaire Super Admin)
CREATE TABLE IF NOT EXISTS platform_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz DEFAULT now()
);

-- Activer RLS sur platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour platform_settings
DROP POLICY IF EXISTS "Public read platform_settings" ON platform_settings;
CREATE POLICY "Public read platform_settings" ON platform_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage platform_settings" ON platform_settings;
CREATE POLICY "Admins manage platform_settings" ON platform_settings
    FOR ALL USING (true) WITH CHECK (true);

-- 3. Initialiser les tarifs par défaut des styles et bannières
INSERT INTO platform_settings (key, value, updated_at)
VALUES (
    'premium_styles_pricing',
    '{
        "minimal": 0,
        "full": 500,
        "split": 750,
        "classic": 0,
        "hub_onglets": 5000,
        "segmented_hub": 6000,
        "glass_showcase": 7000,
        "bento_grid": 75000,
        "bento_box": 85000
    }'::jsonb,
    now()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

-- 4. Notifier le cache Supabase
NOTIFY pgrst, 'reload schema';
