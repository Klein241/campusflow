-- ══════════════════════════════════════════════════════════════
-- Migration: Admin Recovery Requests + Suspension Reason + Safe Deduplication + Realtime
-- ══════════════════════════════════════════════════════════════

-- 1. Ajout de la colonne suspension_reason sur les organisations
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- 2. Table des demandes de récupération d'accès administrateur
-- NOTE: La pièce d'identité N'EST JAMAIS stockée en base (transit éphémère local uniquement)
CREATE TABLE IF NOT EXISTS admin_recovery_requests (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id             UUID REFERENCES organizations(id) ON DELETE CASCADE,
    org_slug           TEXT NOT NULL,
    org_name           TEXT NOT NULL,
    owner_first_name   TEXT NOT NULL,
    owner_last_name    TEXT NOT NULL,
    what_lost          TEXT NOT NULL CHECK (what_lost IN ('email', 'password', 'both')),
    new_email          TEXT,
    status             TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'processing', 'resolved', 'rejected')),
    superadmin_note    TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at        TIMESTAMPTZ
);

-- Activation RLS
ALTER TABLE admin_recovery_requests ENABLE ROW LEVEL SECURITY;

-- Insertion autorisée pour toute demande
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_recovery_requests' 
        AND policyname = 'admin_recovery_insert'
    ) THEN
        CREATE POLICY "admin_recovery_insert" ON admin_recovery_requests FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_recovery_requests' 
        AND policyname = 'admin_recovery_superadmin_select'
    ) THEN
        CREATE POLICY "admin_recovery_superadmin_select" ON admin_recovery_requests
            FOR SELECT USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_recovery_requests' 
        AND policyname = 'admin_recovery_superadmin_update'
    ) THEN
        CREATE POLICY "admin_recovery_superadmin_update" ON admin_recovery_requests
            FOR UPDATE USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));
    END IF;
END $$;

-- 3. Fonction RPC : Mise à jour de l'email de l'administrateur par le Superadmin
CREATE OR REPLACE FUNCTION superadmin_update_admin_email(
    p_org_id   UUID,
    p_new_email TEXT,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    -- Mise à jour de l'email du propriétaire de l'organisation
    UPDATE organizations
    SET email = p_new_email
    WHERE id = p_org_id;

    -- Clôture de la demande
    UPDATE admin_recovery_requests
    SET status = 'resolved', resolved_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_update_admin_email(UUID, TEXT, UUID) TO authenticated;

-- 4. Fonction RPC : Réinitialisation du mot de passe par le Superadmin
CREATE OR REPLACE FUNCTION superadmin_reset_admin_password(
    p_org_id     UUID,
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    SELECT email INTO v_email FROM organizations WHERE id = p_org_id;

    UPDATE admin_recovery_requests
    SET status = 'processing', superadmin_note = 'Lien de réinitialisation envoyé'
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_reset_admin_password(UUID, UUID) TO authenticated;

-- 5. Index de performance
CREATE INDEX IF NOT EXISTS idx_admin_recovery_org_id ON admin_recovery_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_admin_recovery_status ON admin_recovery_requests(status);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- 6. DÉDOUBLONNAGE SÉCURISÉ DES DONNÉES EXISTANTES (Évite l'erreur 23505)
-- Renomme les doublons existants créés lors des tests sans supprimer aucune donnée
WITH numbered_orgs AS (
    SELECT id, name, ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(name))
        ORDER BY created_at ASC NULLS LAST, id ASC
    ) as rn
    FROM organizations
)
UPDATE organizations o
SET name = o.name || ' (' || n.rn || ')'
FROM numbered_orgs n
WHERE o.id = n.id AND n.rn > 1;

WITH numbered_students AS (
    SELECT id, first_name, last_name, organization_id, ROW_NUMBER() OVER (
        PARTITION BY organization_id, LOWER(TRIM(first_name)), LOWER(TRIM(last_name))
        ORDER BY created_at ASC NULLS LAST, id ASC
    ) as rn
    FROM student_profiles
    WHERE first_name IS NOT NULL AND last_name IS NOT NULL
)
UPDATE student_profiles s
SET first_name = s.first_name || ' (' || n.rn || ')'
FROM numbered_students n
WHERE s.id = n.id AND n.rn > 1;

WITH numbered_teachers AS (
    SELECT id, first_name, last_name, organization_id, ROW_NUMBER() OVER (
        PARTITION BY organization_id, LOWER(TRIM(first_name)), LOWER(TRIM(last_name))
        ORDER BY created_at ASC NULLS LAST, id ASC
    ) as rn
    FROM teacher_profiles
    WHERE first_name IS NOT NULL AND last_name IS NOT NULL
)
UPDATE teacher_profiles t
SET first_name = t.first_name || ' (' || n.rn || ')'
FROM numbered_teachers n
WHERE t.id = n.id AND n.rn > 1;

-- 7. CRÉATION DES INDEX UNIQUES (Verrouillage strict anti-doublon)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_unique_name 
    ON organizations(LOWER(TRIM(name)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_name_per_org 
    ON student_profiles(organization_id, LOWER(TRIM(first_name)), LOWER(TRIM(last_name)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_unique_name_per_org 
    ON teacher_profiles(organization_id, LOWER(TRIM(first_name)), LOWER(TRIM(last_name)));

-- 8. Activation de Supabase Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'organizations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'admin_recovery_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE admin_recovery_requests;
    END IF;
END $$;
