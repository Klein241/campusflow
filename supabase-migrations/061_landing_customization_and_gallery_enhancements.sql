-- ══════════════════════════════════════════════════════════════════
-- MIGRATION 061 — Personnalisation Avancée Landing Pages, Boutons CTA & Galerie
-- Assure la présence des colonnes template_config (JSONB), gallery_images (TEXT[])
-- et landing_layout sur la table organizations, ainsi que les index de performance.
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Colonnes de personnalisation sur organizations ──────────────
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS landing_layout TEXT DEFAULT 'product_mastery';

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS hero_subtitle TEXT;

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS about_text TEXT;

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS motto TEXT;

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS unlocked_styles TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ── 2. Index de performance GIN sur template_config ────────────────
CREATE INDEX IF NOT EXISTS idx_organizations_template_config 
    ON public.organizations USING gin (template_config);

CREATE INDEX IF NOT EXISTS idx_organizations_landing_layout 
    ON public.organizations (landing_layout);

-- ── 3. Droits d'accès et permissions RLS ───────────────────────────
GRANT SELECT, UPDATE ON public.organizations TO authenticated, service_role;
GRANT SELECT ON public.organizations TO anon;

SELECT 'Migration 061 OK — Landing layout, template_config JSONB et gallery_images TEXT[] opérationnels' AS status;
