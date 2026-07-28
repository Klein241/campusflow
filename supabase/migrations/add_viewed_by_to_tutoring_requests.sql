-- Migration pour le compteur de vues des publications Actus (tutoring_requests)
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor)

-- 1. Ajouter la colonne viewed_by si elle n'existe pas encore
ALTER TABLE tutoring_requests 
ADD COLUMN IF NOT EXISTS viewed_by TEXT[] DEFAULT '{}'::text[];

-- 2. Mise à jour de la colonne si elle était NULL pour certains posts existants
UPDATE tutoring_requests 
SET viewed_by = '{}'::text[] 
WHERE viewed_by IS NULL;
