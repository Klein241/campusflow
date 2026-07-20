-- ================================================
-- 021: Fix chapters teacher_id nullable + lessons teacher_id
-- Run in Supabase SQL Editor
-- ================================================

-- Rendre teacher_id nullable dans chapters (pour l'admin qui crée sans prof assigné)
ALTER TABLE chapters ALTER COLUMN teacher_id DROP NOT NULL;

-- Rendre teacher_id nullable dans lessons si la colonne existe
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='lessons' AND column_name='teacher_id'
    ) THEN
        ALTER TABLE lessons ALTER COLUMN teacher_id DROP NOT NULL;
    END IF;
END $$;

SELECT 'Migration 021 applied: teacher_id is now nullable in chapters/lessons.' as status;
