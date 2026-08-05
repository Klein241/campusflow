-- ===============================================================
-- FEATURE 4: Rattrapage sur exercices
-- Ajoute rattrapage_enabled si elle n'existe pas encore
-- Executer dans Supabase SQL Editor
-- ===============================================================

-- Ajouter la colonne rattrapage_enabled si elle n'existe pas
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS rattrapage_enabled boolean DEFAULT false;

-- Activer le rattrapage pour un exercice (exemple d'usage pour admin/prof):
-- UPDATE exercises SET rattrapage_enabled = true WHERE id = 'uuid-de-lexercice';

-- Verification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'exercises' AND column_name = 'rattrapage_enabled';
