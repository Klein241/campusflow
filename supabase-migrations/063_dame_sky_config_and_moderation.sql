-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 063: DAME SKY CONFIGURATION, TEMPERAMENT & MODERATION / FRAUD ALERTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Configuration globale SuperAdmin pour Dame SKY
CREATE TABLE IF NOT EXISTS dame_sky_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    temperament TEXT NOT NULL DEFAULT 'strict_pedagogue'
        CHECK (temperament IN ('caring', 'strict_pedagogue', 'uncompromising', 'strategic_mentor')),
    custom_instructions TEXT DEFAULT '',
    fraud_detection_sensitivity TEXT NOT NULL DEFAULT 'high'
        CHECK (fraud_detection_sensitivity IN ('low', 'medium', 'high')),
    auto_bug_report_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    safety_moderation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['admin', 'prof', 'student'],
    llm_model TEXT NOT NULL DEFAULT '@cf/meta/llama-3.1-8b-instruct',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insérer la configuration par défaut de Dame SKY si aucune n'existe
INSERT INTO dame_sky_config (id, is_active, temperament, custom_instructions, fraud_detection_sensitivity, auto_bug_report_enabled, safety_moderation_enabled, allowed_roles)
SELECT 
    gen_random_uuid(), 
    true, 
    'strict_pedagogue', 
    'Dame SKY est bienveillante mais sans complaisance. Elle valorise le travail authentique et recadre fermement la paresse ou la triche.', 
    'high', 
    true, 
    true, 
    ARRAY['admin', 'prof', 'student']
WHERE NOT EXISTS (SELECT 1 FROM dame_sky_config LIMIT 1);

-- 2. Table des alertes de sécurité, détection de fraude et de propos inappropriés
CREATE TABLE IF NOT EXISTS dame_sky_safety_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    org_name TEXT,
    org_slug TEXT,
    user_id UUID,
    user_name TEXT,
    user_role TEXT DEFAULT 'student',
    alert_type TEXT NOT NULL CHECK (alert_type IN ('fraud_attempt', 'violence_threat', 'sexual_content', 'deviation_extremism', 'suspicious_account', 'plagiarism')),
    severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    context_snippet TEXT,
    detected_reason TEXT NOT NULL,
    action_taken TEXT NOT NULL DEFAULT 'warned_and_logged',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_dame_sky_safety_alerts_org ON dame_sky_safety_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_dame_sky_safety_alerts_status ON dame_sky_safety_alerts(status);
CREATE INDEX IF NOT EXISTS idx_dame_sky_safety_alerts_type ON dame_sky_safety_alerts(alert_type);

-- 3. Activation RLS
ALTER TABLE dame_sky_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dame_sky_safety_alerts ENABLE ROW LEVEL SECURITY;

-- Politiques RLS dame_sky_config
DROP POLICY IF EXISTS "Allow public read dame_sky_config" ON dame_sky_config;
CREATE POLICY "Allow public read dame_sky_config" ON dame_sky_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all on dame_sky_config for superadmin and service role" ON dame_sky_config;
CREATE POLICY "Allow all on dame_sky_config for superadmin and service role" ON dame_sky_config FOR ALL USING (true) WITH CHECK (true);

-- Politiques RLS dame_sky_safety_alerts
DROP POLICY IF EXISTS "Allow read dame_sky_safety_alerts" ON dame_sky_safety_alerts;
CREATE POLICY "Allow read dame_sky_safety_alerts" ON dame_sky_safety_alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert dame_sky_safety_alerts" ON dame_sky_safety_alerts;
CREATE POLICY "Allow insert dame_sky_safety_alerts" ON dame_sky_safety_alerts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update dame_sky_safety_alerts" ON dame_sky_safety_alerts;
CREATE POLICY "Allow update dame_sky_safety_alerts" ON dame_sky_safety_alerts FOR UPDATE USING (true) WITH CHECK (true);
