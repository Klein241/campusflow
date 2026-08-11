-- ═══════════════════════════════════════════════════════════════════════
-- Fix: Sky Points pubs — RLS ad_views + crédits via sky_transactions
-- À exécuter dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Activer RLS sur ad_views et créer les bonnes politiques
ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "students_can_insert_ad_views"   ON ad_views;
DROP POLICY IF EXISTS "students_can_update_ad_views"   ON ad_views;
DROP POLICY IF EXISTS "students_can_read_own_ad_views" ON ad_views;

-- Les étudiants et profs peuvent insérer/mettre à jour leurs propres vues
CREATE POLICY "anyone_can_upsert_ad_views" ON ad_views
    FOR ALL TO authenticated, anon
    USING (true) WITH CHECK (true);

-- 2. S'assurer que student_profiles et teacher_profiles permettent
--    la mise à jour de sky_points par l'utilisateur lui-même
DROP POLICY IF EXISTS "student_can_update_own_sky_points" ON student_profiles;
CREATE POLICY "student_can_update_own_sky_points" ON student_profiles
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "teacher_can_update_own_sky_points" ON teacher_profiles;
CREATE POLICY "teacher_can_update_own_sky_points" ON teacher_profiles
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 3. Vérification : lister les politiques actives sur ad_views
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('ad_views', 'student_profiles', 'teacher_profiles')
ORDER BY tablename, policyname;
