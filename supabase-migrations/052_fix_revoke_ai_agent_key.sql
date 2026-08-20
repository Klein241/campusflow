-- ============================================================
-- MIGRATION 052 — Correction RPC revoke_ai_agent_key
-- Problème : teacher_profiles.role n'existe pas
-- Solution  : vérification via organizations.owner_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.revoke_ai_agent_key(
    p_key_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id   UUID := auth.uid();
    v_org_id    UUID;
    v_is_admin  BOOLEAN := FALSE;
BEGIN
    -- Récupérer l'org de la clé
    SELECT organization_id INTO v_org_id
    FROM public.ai_agent_keys WHERE id = p_key_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Clé introuvable' USING ERRCODE = 'P0001';
    END IF;

    -- Vérifier que l'user est bien owner de cette org
    SELECT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = v_org_id
          AND owner_id = v_user_id
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0002';
    END IF;

    -- Révoquer la clé
    UPDATE public.ai_agent_keys
    SET is_active  = FALSE,
        updated_at = NOW()
    WHERE id = p_key_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_ai_agent_key(UUID) TO authenticated;

SELECT 'Migration 052 OK — revoke_ai_agent_key corrigé (owner_id)' AS status;
