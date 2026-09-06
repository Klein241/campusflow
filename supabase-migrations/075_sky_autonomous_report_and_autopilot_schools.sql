-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 075: DAME SKY AUTONOMOUS EMAIL REPORTS & AUTOPILOT SCHOOLS ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Champs pour les rapports email autonomes dans dame_sky_config
ALTER TABLE IF EXISTS public.dame_sky_config
    ADD COLUMN IF NOT EXISTS superadmin_email TEXT DEFAULT 'kleintaptue1@gmail.com',
    ADD COLUMN IF NOT EXISTS auto_email_report_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS email_report_frequency TEXT DEFAULT 'daily',
    ADD COLUMN IF NOT EXISTS last_email_report_sent_at TIMESTAMPTZ;

-- Mettre à jour l'enregistrement existant si nécessaire
UPDATE public.dame_sky_config
SET superadmin_email = 'kleintaptue1@gmail.com',
    auto_email_report_enabled = TRUE
WHERE superadmin_email IS NULL;

-- 2. Champs pour les écoles en "Pilote Automatique" dans organizations
ALTER TABLE IF EXISTS public.organizations
    ADD COLUMN IF NOT EXISTS is_autopilot BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS autopilot_filieres TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS autopilot_status TEXT DEFAULT 'active', -- 'active', 'paused'
    ADD COLUMN IF NOT EXISTS autopilot_last_pulse_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS autopilot_pulse_count INT DEFAULT 0;

-- Index pour requêtes ultra-rapides du Worker sur les écoles en pilote auto
CREATE INDEX IF NOT EXISTS idx_organizations_autopilot ON public.organizations(is_autopilot, autopilot_status) WHERE is_autopilot = TRUE;

-- 3. Accorder les droits d'accès
GRANT ALL ON public.dame_sky_config TO authenticated, service_role;
GRANT SELECT ON public.dame_sky_config TO anon;
GRANT ALL ON public.organizations TO authenticated, service_role;
GRANT SELECT ON public.organizations TO anon;
