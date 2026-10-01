-- ==============================================================================
-- 079: CLASSROOMS MARKETING & PEDAGOGICAL CONTENT FIELDS
-- Description: Adds direct columns to classrooms for course descriptions,
--              promotional strikethrough prices, and duration in months.
-- ==============================================================================

ALTER TABLE public.classrooms
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS prix_barre NUMERIC DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS duree_mois INTEGER DEFAULT NULL;
