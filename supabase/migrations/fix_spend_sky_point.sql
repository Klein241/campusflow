-- ══════════════════════════════════════════════════════════════
-- RPC: spend_sky_point — Débit atomique de Sky Points
-- Fonctionne pour TOUS les rôles (étudiants, enseignants, admins)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION spend_sky_point(
    p_user_id     UUID,
    p_org_id      UUID DEFAULT NULL,
    p_amount      INTEGER DEFAULT 1,
    p_reason      TEXT DEFAULT 'usage',
    p_description TEXT DEFAULT 'Utilisation de Sky Point'
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_current    INTEGER := 100;
    v_new_bal    INTEGER := 0;
    v_is_teacher BOOLEAN := FALSE;
BEGIN
    -- 1. Déterminer la table de profil
    IF EXISTS (SELECT 1 FROM teacher_profiles WHERE id = p_user_id) THEN
        v_is_teacher := TRUE;
        SELECT COALESCE(sky_points, 100) INTO v_current FROM teacher_profiles WHERE id = p_user_id;
    ELSIF EXISTS (SELECT 1 FROM student_profiles WHERE id = p_user_id) THEN
        SELECT COALESCE(sky_points, 100) INTO v_current FROM student_profiles WHERE id = p_user_id;
    ELSE
        -- Si l'utilisateur n'est trouvé dans aucune des deux tables, lui accorder 100 par défaut
        v_current := 100;
    END IF;

    -- 2. Vérifier le solde
    IF v_current < p_amount THEN
        RETURN json_build_object(
            'success', false,
            'points', v_current,
            'error', 'Solde insuffisant — ' || p_amount || ' Sky Point(s) requis'
        );
    END IF;

    v_new_bal := v_current - p_amount;

    -- 3. Mettre à jour le solde
    IF v_is_teacher THEN
        UPDATE teacher_profiles SET sky_points = v_new_bal WHERE id = p_user_id;
    ELSE
        UPDATE student_profiles SET sky_points = v_new_bal WHERE id = p_user_id;
    END IF;

    -- 4. Journaliser la transaction
    INSERT INTO sky_transactions (
        user_id,
        student_id,
        amount,
        transaction_type,
        description,
        organization_id
    ) VALUES (
        p_user_id,
        CASE WHEN NOT v_is_teacher THEN p_user_id ELSE NULL END,
        -p_amount,
        p_reason,
        p_description,
        p_org_id
    ) ON CONFLICT DO NOTHING;

    RETURN json_build_object('success', true, 'points', v_new_bal);
END;
$$;

GRANT EXECUTE ON FUNCTION spend_sky_point(UUID, UUID, INTEGER, TEXT, TEXT) TO anon, authenticated, service_role;
