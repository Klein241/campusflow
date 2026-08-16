-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: RPC SUPERADMIN UPDATE SKY POINTS (ORGANISATIONS & UTILISATEURS)
-- Résout le problème de synchronisation des Sky Points entre Superadmin et Admin
-- ═══════════════════════════════════════════════════════════════════════

-- 1. RPC pour mettre à jour les Sky Points d'une organisation (SECURITY DEFINER = bypass RLS)
CREATE OR REPLACE FUNCTION superadmin_update_org_sky_points(
    p_org_id      UUID,
    p_new_balance INTEGER,
    p_delta       INTEGER DEFAULT 0,
    p_note        TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_name TEXT;
    v_updated_balance INTEGER;
BEGIN
    -- Mise à jour du solde de l'organisation
    UPDATE organizations
    SET sky_points = p_new_balance
    WHERE id = p_org_id
    RETURNING name, sky_points INTO v_org_name, v_updated_balance;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Établissement introuvable');
    END IF;

    -- Enregistrer dans l'historique des transactions
    BEGIN
        INSERT INTO sky_points_transactions (
            from_entity_type,
            to_entity_type,
            to_entity_id,
            to_entity_name,
            org_name,
            amount,
            note,
            performed_by
        ) VALUES (
            'superadmin',
            'org',
            p_org_id,
            v_org_name,
            v_org_name,
            p_delta,
            COALESCE(p_note, 'Recharge Superadmin Établissement'),
            'superadmin'
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ne pas bloquer la mise à jour si la table de log a un souci
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_updated_balance,
        'org_name', v_org_name,
        'delta', p_delta
    );
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_update_org_sky_points(UUID, INTEGER, INTEGER, TEXT)
    TO anon, authenticated, service_role;

-- 2. Mise à jour de superadmin_update_sky_points pour gérer aussi les rôles 'admin' et 'org'
CREATE OR REPLACE FUNCTION superadmin_update_sky_points(
    p_user_id     UUID,
    p_role        TEXT,
    p_new_balance INTEGER,
    p_delta       INTEGER,
    p_note        TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_rows INTEGER;
BEGIN
    IF p_role = 'student' THEN
        UPDATE student_profiles
        SET sky_points = p_new_balance
        WHERE id = p_user_id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
    ELSIF p_role = 'teacher' THEN
        UPDATE teacher_profiles
        SET sky_points = p_new_balance
        WHERE id = p_user_id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
    ELSIF p_role = 'admin' OR p_role = 'org' OR p_role = 'organization' THEN
        UPDATE organizations
        SET sky_points = p_new_balance
        WHERE id = p_user_id;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Rôle invalide : doit être student, teacher ou admin');
    END IF;

    IF v_rows = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Entité introuvable');
    END IF;

    RETURN json_build_object(
        'success',      true,
        'new_balance',  p_new_balance,
        'delta',        p_delta,
        'note',         COALESCE(p_note, 'Ajustement SuperAdmin')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_update_sky_points(UUID, TEXT, INTEGER, INTEGER, TEXT)
    TO anon, authenticated, service_role;

-- 3. Activation Realtime sur la table organizations
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
END $$;

NOTIFY pgrst, 'reload schema';
