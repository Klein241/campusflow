-- ════════════════════════════════════════════════════════════
-- EXAM_PAPERS — Ajout colonnes PDF interactif
-- Exécuter dans Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- Ajouter les colonnes PDF si elles n'existent pas encore
ALTER TABLE exam_papers
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_annotations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exam_mode TEXT DEFAULT 'structured'
    CHECK (exam_mode IN ('structured', 'pdf'));

-- Ajouter manual_grades à exam_participants si pas déjà fait
ALTER TABLE exam_participants
  ADD COLUMN IF NOT EXISTS manual_grades JSONB DEFAULT '{}'::jsonb;

-- Vérification rapide
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('exam_papers', 'exam_participants')
  AND column_name IN ('pdf_url', 'pdf_annotations', 'exam_mode', 'manual_grades')
ORDER BY table_name, column_name;
