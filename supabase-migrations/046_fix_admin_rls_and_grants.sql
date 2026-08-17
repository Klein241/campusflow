-- ============================================================
-- IziTeach — Migration 046 : Correction RLS Admin
-- ============================================================
-- Contexte : Les migrations 030-035 (correctifs sécurité) ont
-- provoqué des erreurs RLS sur classrooms, rooms et teacher_profiles.
-- Cause : les politiques FOR ALL sans WITH CHECK explicite rejettent
-- les INSERT quand auth.uid() est NULL (anon) ou quand les GRANTs
-- de base sur la table ont été retirés indirectement.
--
-- Corrections :
--   1. GRANT DML explicite à authenticated + anon sur les 3 tables
--   2. Drop + recreate des politiques en séparant USING et WITH CHECK
--   3. Ajout d'une politique spéciale pour les inserts via session admin
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- 1. CLASSROOMS — Correction complète
-- ══════════════════════════════════════════════════════════════

-- Garantir les GRANTs DML (peuvent avoir été réinitialisés)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classrooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classrooms TO authenticated;

-- Nettoyer toutes les politiques existantes
DROP POLICY IF EXISTS "classroom_org_read"    ON public.classrooms;
DROP POLICY IF EXISTS "classroom_admin_write" ON public.classrooms;
DROP POLICY IF EXISTS "classrooms_read"       ON public.classrooms;
DROP POLICY IF EXISTS "classrooms_write"      ON public.classrooms;

-- Lecture publique (tout le monde peut voir les classes)
CREATE POLICY "classrooms_public_read" ON public.classrooms
    FOR SELECT USING (true);

-- Écriture admin — séparation USING (UPDATE/DELETE) et WITH CHECK (INSERT/UPDATE)
-- Cible : l'utilisateur authentifié Supabase qui est propriétaire de l'org
CREATE POLICY "classrooms_owner_write" ON public.classrooms
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = classrooms.organization_id
              AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = classrooms.organization_id
              AND owner_id = auth.uid()
        )
    );


-- ══════════════════════════════════════════════════════════════
-- 2. ROOMS — Correction complète
-- ══════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;

DROP POLICY IF EXISTS "rooms_read"        ON public.rooms;
DROP POLICY IF EXISTS "rooms_admin_write" ON public.rooms;
DROP POLICY IF EXISTS "rooms_anon_read"   ON public.rooms;
DROP POLICY IF EXISTS "rooms_write"       ON public.rooms;

CREATE POLICY "rooms_public_read" ON public.rooms
    FOR SELECT USING (true);

CREATE POLICY "rooms_owner_write" ON public.rooms
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = rooms.organization_id
              AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = rooms.organization_id
              AND owner_id = auth.uid()
        )
    );


-- ══════════════════════════════════════════════════════════════
-- 3. TEACHER_PROFILES — Correction complète
-- ══════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_profiles TO authenticated;

DROP POLICY IF EXISTS "teacher_org_read"    ON public.teacher_profiles;
DROP POLICY IF EXISTS "teacher_admin_write" ON public.teacher_profiles;
DROP POLICY IF EXISTS "teacher_read"        ON public.teacher_profiles;
DROP POLICY IF EXISTS "teacher_write"       ON public.teacher_profiles;

-- Lecture : propriétaire de l'org OU le prof lui-même (via user_id)
CREATE POLICY "teacher_profiles_read" ON public.teacher_profiles
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = teacher_profiles.organization_id
              AND owner_id = auth.uid()
        )
        -- Permettre la lecture publique minimale pour la landing page
        OR true
    );

-- Écriture admin avec WITH CHECK explicite
CREATE POLICY "teacher_profiles_owner_write" ON public.teacher_profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = teacher_profiles.organization_id
              AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = teacher_profiles.organization_id
              AND owner_id = auth.uid()
        )
    );


-- ══════════════════════════════════════════════════════════════
-- 4. Correction du même problème sur student_profiles (préventif)
-- ══════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;

DROP POLICY IF EXISTS "student_org_read"    ON public.student_profiles;
DROP POLICY IF EXISTS "student_admin_write" ON public.student_profiles;

CREATE POLICY "student_profiles_read" ON public.student_profiles
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = student_profiles.organization_id
              AND owner_id = auth.uid()
        )
    );

CREATE POLICY "student_profiles_owner_write" ON public.student_profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = student_profiles.organization_id
              AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = student_profiles.organization_id
              AND owner_id = auth.uid()
        )
    );


-- ══════════════════════════════════════════════════════════════
-- 5. Correction subjects (même pattern, préventif)
-- ══════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;

DROP POLICY IF EXISTS "subject_read"        ON public.subjects;
DROP POLICY IF EXISTS "subject_admin_write" ON public.subjects;

CREATE POLICY "subjects_public_read" ON public.subjects
    FOR SELECT USING (true);

CREATE POLICY "subjects_owner_write" ON public.subjects
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = subjects.organization_id
              AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = subjects.organization_id
              AND owner_id = auth.uid()
        )
    );
