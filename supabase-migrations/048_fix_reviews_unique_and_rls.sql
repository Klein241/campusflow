-- ================================================================
-- MIGRATION 048 — Fix Reviews System
-- 1. Contrainte UNIQUE : un seul avis par utilisateur par école
-- 2. Contrainte UNIQUE : un seul avis IziTeach par utilisateur
-- 3. RLS SELECT pour school_reviews et platform_reviews
-- 4. Fix bug_reports : RLS SELECT pour permettre vérification
--
-- CORRECTIF : Cast explicite UUID → TEXT pour éviter l'erreur
--   "operator does not exist: uuid = text" sur auth.uid()
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 0. DÉDUPLICATION — Supprimer les doublons avant contrainte UNIQUE
--    Stratégie : garder le plus RÉCENT par (user_id, organization_id)
-- ────────────────────────────────────────────────────────────────

-- Dédupliquer school_reviews
DELETE FROM school_reviews
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, organization_id) id
    FROM school_reviews
    ORDER BY user_id, organization_id, created_at DESC
);

-- Dédupliquer platform_reviews
DELETE FROM platform_reviews
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM platform_reviews
    ORDER BY user_id, created_at DESC
);


-- ────────────────────────────────────────────────────────────────
-- 1. UNIQUE : Un seul avis école par utilisateur par organisation
-- ────────────────────────────────────────────────────────────────

ALTER TABLE school_reviews
    DROP CONSTRAINT IF EXISTS unique_school_review_per_user;

ALTER TABLE school_reviews
    ADD CONSTRAINT unique_school_review_per_user
    UNIQUE (user_id, organization_id);


-- ────────────────────────────────────────────────────────────────
-- 2. UNIQUE : Un seul avis IziTeach par utilisateur
-- ────────────────────────────────────────────────────────────────

ALTER TABLE platform_reviews
    DROP CONSTRAINT IF EXISTS unique_platform_review_per_user;

ALTER TABLE platform_reviews
    ADD CONSTRAINT unique_platform_review_per_user
    UNIQUE (user_id);


-- ────────────────────────────────────────────────────────────────
-- 3. RLS school_reviews
--    CORRECTIF : auth.uid()::text pour éviter uuid = text
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own school reviews" ON school_reviews;
CREATE POLICY "Users can view own school reviews"
    ON school_reviews FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id::text OR is_published = true);

DROP POLICY IF EXISTS "Users can insert own school reviews" ON school_reviews;
CREATE POLICY "Users can insert own school reviews"
    ON school_reviews FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own school reviews" ON school_reviews;
CREATE POLICY "Users can update own school reviews"
    ON school_reviews FOR UPDATE TO authenticated
    USING (auth.uid()::text = user_id::text);


-- ────────────────────────────────────────────────────────────────
-- 4. RLS platform_reviews
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own platform reviews" ON platform_reviews;
CREATE POLICY "Users can view own platform reviews"
    ON platform_reviews FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id::text OR is_published = true);

DROP POLICY IF EXISTS "Users can insert own platform reviews" ON platform_reviews;
CREATE POLICY "Users can insert own platform reviews"
    ON platform_reviews FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own platform reviews" ON platform_reviews;
CREATE POLICY "Users can update own platform reviews"
    ON platform_reviews FOR UPDATE TO authenticated
    USING (auth.uid()::text = user_id::text);


-- ────────────────────────────────────────────────────────────────
-- 5. RLS bug_reports
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own bug reports" ON bug_reports;
CREATE POLICY "Users can view own bug reports"
    ON bug_reports FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id::text);


-- ────────────────────────────────────────────────────────────────
-- 6. Publier les avis existants
-- ────────────────────────────────────────────────────────────────

UPDATE school_reviews
    SET is_published = true
    WHERE is_published IS NULL OR is_published = false;

UPDATE platform_reviews
    SET is_published = true
    WHERE is_published IS NULL OR is_published = false;


-- ────────────────────────────────────────────────────────────────
-- VÉRIFICATION
-- ────────────────────────────────────────────────────────────────

SELECT
    'school_reviews'    AS table_name,
    COUNT(*)            AS total_avis,
    SUM(CASE WHEN is_published THEN 1 ELSE 0 END) AS published
FROM school_reviews

UNION ALL

SELECT
    'platform_reviews',
    COUNT(*),
    SUM(CASE WHEN is_published THEN 1 ELSE 0 END)
FROM platform_reviews;
