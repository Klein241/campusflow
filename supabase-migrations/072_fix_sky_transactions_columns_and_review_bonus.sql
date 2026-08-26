-- ═══════════════════════════════════════════════════════════════════════
-- Migration 072 : Fix sky_transactions columns + review bonus policy
-- - Ajoute user_id, organization_id, type à sky_transactions (si absent)
-- - Permet les insertions par utilisateurs authentifiés (review_bonus, superadmin_adjustment)
-- - Ajoute une policy RLS pour que les utilisateurs voient leurs propres transactions
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Ajouter les colonnes manquantes à sky_transactions
ALTER TABLE public.sky_transactions
    ADD COLUMN IF NOT EXISTS user_id         UUID,
    ADD COLUMN IF NOT EXISTS organization_id UUID,
    ADD COLUMN IF NOT EXISTS type            TEXT;

-- 2. Remplir user_id depuis student_id pour la rétrocompatibilité
UPDATE public.sky_transactions
SET user_id = student_id
WHERE user_id IS NULL AND student_id IS NOT NULL;

-- 3. Créer un index sur user_id pour les performances
CREATE INDEX IF NOT EXISTS idx_sky_transactions_user_id ON public.sky_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sky_transactions_org_id  ON public.sky_transactions(organization_id);

-- 4. RLS : Les utilisateurs peuvent voir leurs propres transactions
DROP POLICY IF EXISTS "Users can read own transactions" ON public.sky_transactions;
CREATE POLICY "Users can read own transactions"
    ON public.sky_transactions FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR user_id  = auth.uid()
    );

-- 5. RLS : Les utilisateurs authentifiés peuvent insérer des transactions (credit/debit)
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.sky_transactions;
CREATE POLICY "Authenticated users can insert transactions"
    ON public.sky_transactions FOR INSERT TO authenticated
    WITH CHECK (true);

-- 6. Assurer que les colonnes sky_points existent sur organizations (sécurité)
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS sky_points INT DEFAULT 1000;

-- 7. Assurer que les colonnes sky_points existent sur teacher_profiles et student_profiles
ALTER TABLE public.teacher_profiles
    ADD COLUMN IF NOT EXISTS sky_points INT DEFAULT 0;

ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS sky_points INT DEFAULT 0;

-- 8. RLS sur teacher_profiles — les authentifiés peuvent mettre à jour
-- (Pour que le superadmin/service puisse sync les points vers le profil owner)
DROP POLICY IF EXISTS "Superadmin can update teacher sky_points" ON public.teacher_profiles;
CREATE POLICY "Superadmin can update teacher sky_points"
    ON public.teacher_profiles FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Superadmin can update student sky_points" ON public.student_profiles;
CREATE POLICY "Superadmin can update student sky_points"
    ON public.student_profiles FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- 9. Vérification
SELECT
    'sky_transactions' AS table_name,
    COUNT(*)           AS row_count,
    MAX(created_at)    AS latest
FROM public.sky_transactions
UNION ALL
SELECT
    'organizations sky_points OK' AS table_name,
    COUNT(*) AS row_count,
    NOW()    AS latest
FROM public.organizations
WHERE sky_points IS NOT NULL;

SELECT 'Migration 072 appliquée avec succès ✅' AS status;
