-- ═══════════════════════════════════════════════════════════════════════
-- Fix: Ajout colonnes access_code, pin_code, classroom_id dans inscription_requests
-- + S'assurer que la politique RLS anon INSERT est bien active
-- À exécuter dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Ajout des colonnes manquantes (IF NOT EXISTS = safe à re-exécuter)
ALTER TABLE inscription_requests
    ADD COLUMN IF NOT EXISTS access_code  text,
    ADD COLUMN IF NOT EXISTS pin_code     text,
    ADD COLUMN IF NOT EXISTS classroom_id uuid REFERENCES classrooms(id) ON DELETE SET NULL;

-- 2. S'assurer que RLS est activé
ALTER TABLE inscription_requests ENABLE ROW LEVEL SECURITY;

-- 3. Recréer la politique anon INSERT (DROP d'abord pour éviter les doublons)
DROP POLICY IF EXISTS "anon_insert_inscription" ON inscription_requests;
CREATE POLICY "anon_insert_inscription" ON inscription_requests
    FOR INSERT TO anon WITH CHECK (true);

-- 4. S'assurer que le rôle anon a bien le droit INSERT
GRANT INSERT ON inscription_requests TO anon;

-- 5. Vérification : liste les colonnes de la table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inscription_requests'
ORDER BY ordinal_position;
