-- ════════════════════════════════════════════════════════════════
-- CAMPUSFLOW — Migration: Signature, Cachet, Sky Points & Security PIN System
-- À exécuter dans le SQL Editor de Supabase pour recharger le cache du schéma
-- ════════════════════════════════════════════════════════════════

-- 1. Colonnes officielles Signature & Cachet de l'établissement
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stamp_url TEXT;

-- 2. Colonnes Sky Points & Sécurité PIN
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sky_points INTEGER DEFAULT 1000;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS security_pin TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS monitoring_unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_daily_claim DATE;

-- 3. Initialiser les comptes existants avec 1 000 Sky Points
UPDATE organizations 
SET sky_points = 1000 
WHERE sky_points IS NULL OR sky_points < 1000;

-- 4. Forcer le rechargement immédiat du cache de schéma PostgREST / Supabase
NOTIFY pgrst, 'reload schema';
