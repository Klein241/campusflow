-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION 076 — Rapport configurable par le Superadmin + Confidentialité
-- ═══════════════════════════════════════════════════════════════════════
--
-- 1. Ajoute l'heure UTC configurable pour l'envoi du rapport (report_hour_utc)
-- 2. Ajoute l'email de réception configurable (superadmin_email)
-- 3. Marque clairement que SEULES des métriques agrégées anonymisées
--    sont envoyées à DeepSeek (aucun nom, aucun email, aucune donnée perso)
--
-- APPLIQUER dans : Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Heure d'envoi du rapport (0-23 UTC) configurable par le superadmin
ALTER TABLE dame_sky_config
    ADD COLUMN IF NOT EXISTS report_hour_utc       INTEGER DEFAULT 20 CHECK (report_hour_utc BETWEEN 0 AND 23),
    ADD COLUMN IF NOT EXISTS report_minute_utc     INTEGER DEFAULT 0  CHECK (report_minute_utc BETWEEN 0 AND 59),
    ADD COLUMN IF NOT EXISTS superadmin_email      TEXT    DEFAULT 'kleintaptue1@gmail.com',
    ADD COLUMN IF NOT EXISTS auto_email_report_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS last_email_report_sent_at TIMESTAMPTZ;

-- 2. Champs pour l'usage Marketing IA (Landing page copy generation)
ALTER TABLE dame_sky_config
    ADD COLUMN IF NOT EXISTS marketing_ai_enabled  BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS landing_ai_enabled    BOOLEAN DEFAULT true;

-- 3. Commentaires de documentation (confidentialité DeepSeek)
COMMENT ON TABLE dame_sky_config IS
'Configuration Dame SKY. RÈGLE RGPD : Seules des métriques AGRÉGÉES ANONYMISÉES
(totaux, compteurs) sont transmises à DeepSeek. Aucun nom, email, téléphone,
matricule ou donnée identifiante d''un étudiant ou professeur ne transite vers
les APIs externes (DeepSeek, etc.). Toute donnée personnelle reste exclusivement
dans la base Supabase.';

-- 4. Mettre à jour la valeur par défaut si une ligne existe déjà
UPDATE dame_sky_config
   SET report_hour_utc  = COALESCE(report_hour_utc, 20),
       report_minute_utc = COALESCE(report_minute_utc, 0)
 WHERE report_hour_utc IS NULL;
