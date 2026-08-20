-- ============================================================
-- MIGRATION 051 — Correction des RPCs Agents IA
-- Problème : teacher_profiles.role n'existe pas.
-- Solution  : vérification via organizations.owner_id
-- ============================================================

-- ── 1. Corriger create_ai_agent_key ─────────────────────────

CREATE OR REPLACE FUNCTION public.create_ai_agent_key(
    p_org_id               UUID,
    p_name                 TEXT,
    p_description          TEXT DEFAULT NULL,
    p_permissions          TEXT[] DEFAULT '{}',
    p_rate_limit           INT DEFAULT 10,
    p_bulk_threshold       INT DEFAULT 5,
    p_expires_at           TIMESTAMPTZ DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id       UUID := auth.uid();
    v_is_admin      BOOLEAN := FALSE;
    v_raw_key       TEXT;
    v_key_hash      TEXT;
    v_key_prefix    TEXT;
    v_agent_id      UUID;
    v_full_key      TEXT;
BEGIN
    -- Vérifier que l'utilisateur est owner de cette org
    SELECT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = p_org_id
          AND owner_id = v_user_id
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Accès refusé : vous devez être propriétaire de l''organisation pour créer une clé agent IA'
            USING ERRCODE = 'P0001';
    END IF;

    -- Valider le nom
    IF length(trim(p_name)) < 3 THEN
        RAISE EXCEPTION 'Le nom de l''agent doit faire au moins 3 caractères'
            USING ERRCODE = 'P0002';
    END IF;

    -- Générer la clé : format "cf_live_<32bytes_hex>"
    v_raw_key   := encode(gen_random_bytes(32), 'hex');
    v_full_key  := 'cf_live_' || v_raw_key;
    v_key_prefix := 'cf_live_' || left(v_raw_key, 8) || '...';
    v_key_hash  := encode(digest(v_full_key, 'sha256'), 'hex');

    -- Insérer la clé (seul le hash est stocké)
    INSERT INTO public.ai_agent_keys (
        organization_id, created_by, name, description,
        key_prefix, key_hash, permissions,
        rate_limit_per_minute, bulk_action_threshold, expires_at
    ) VALUES (
        p_org_id, v_user_id, p_name, p_description,
        v_key_prefix, v_key_hash, p_permissions,
        p_rate_limit, p_bulk_threshold, p_expires_at
    ) RETURNING id INTO v_agent_id;

    -- Retourner la clé complète UNE SEULE FOIS
    RETURN json_build_object(
        'id',          v_agent_id,
        'full_key',    v_full_key,
        'key_prefix',  v_key_prefix,
        'name',        p_name,
        'permissions', p_permissions,
        'message',     'Copiez cette clé maintenant — elle ne sera plus affichée.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_ai_agent_key(UUID, TEXT, TEXT, TEXT[], INT, INT, TIMESTAMPTZ)
    TO authenticated;


-- ── 2. Corriger get_ai_agent_stats ──────────────────────────

CREATE OR REPLACE FUNCTION public.get_ai_agent_stats(
    p_org_id UUID
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id       UUID := auth.uid();
    v_is_admin      BOOLEAN;
    v_total_keys    INT;
    v_active_keys   INT;
    v_total_actions INT;
    v_pending_count INT;
    v_today_actions INT;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = p_org_id AND owner_id = v_user_id
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*) INTO v_total_keys
        FROM public.ai_agent_keys WHERE organization_id = p_org_id;
    SELECT COUNT(*) INTO v_active_keys
        FROM public.ai_agent_keys WHERE organization_id = p_org_id AND is_active = TRUE;
    SELECT COUNT(*) INTO v_total_actions
        FROM public.ai_agent_logs WHERE organization_id = p_org_id;
    SELECT COUNT(*) INTO v_pending_count
        FROM public.ai_pending_actions WHERE organization_id = p_org_id AND status = 'pending';
    SELECT COUNT(*) INTO v_today_actions
        FROM public.ai_agent_logs
        WHERE organization_id = p_org_id AND executed_at > NOW() - INTERVAL '24 hours';

    RETURN json_build_object(
        'total_keys',    v_total_keys,
        'active_keys',   v_active_keys,
        'total_actions', v_total_actions,
        'pending_count', v_pending_count,
        'today_actions', v_today_actions
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_agent_stats(UUID) TO authenticated;


-- ── 3. Corriger review_ai_pending_action ────────────────────

CREATE OR REPLACE FUNCTION public.review_ai_pending_action(
    p_action_id    UUID,
    p_decision     TEXT,
    p_comment      TEXT DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id   UUID := auth.uid();
    v_org_id    UUID;
    v_is_admin  BOOLEAN;
BEGIN
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Décision invalide : utilisez approved ou rejected';
    END IF;

    SELECT organization_id INTO v_org_id
    FROM public.ai_pending_actions WHERE id = p_action_id AND status = 'pending';

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Action introuvable ou déjà traitée';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = v_org_id AND owner_id = v_user_id
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.ai_pending_actions
    SET status         = p_decision,
        reviewed_by    = v_user_id,
        reviewed_at    = NOW(),
        review_comment = p_comment
    WHERE id = p_action_id;

    UPDATE public.ai_agent_logs
    SET status              = p_decision,
        human_approved_by   = v_user_id,
        human_approved_at   = NOW()
    FROM public.ai_pending_actions pa
    WHERE pa.id = p_action_id
      AND public.ai_agent_logs.id = pa.log_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_ai_pending_action(UUID, TEXT, TEXT) TO authenticated;


-- ── 4. Corriger la politique RLS ai_pending_actions ─────────

DROP POLICY IF EXISTS "ai_pending_admin_select" ON public.ai_pending_actions;
CREATE POLICY "ai_pending_admin_select"
    ON public.ai_pending_actions FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND organization_id IN (
            SELECT id FROM public.organizations
            WHERE owner_id = auth.uid()
        )
    );


-- ── 5. Corriger les politiques RLS ai_agent_keys ────────────

DROP POLICY IF EXISTS "ai_agent_keys_admin_select" ON public.ai_agent_keys;
CREATE POLICY "ai_agent_keys_admin_select"
    ON public.ai_agent_keys FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "ai_agent_keys_admin_update" ON public.ai_agent_keys;
CREATE POLICY "ai_agent_keys_admin_update"
    ON public.ai_agent_keys FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "ai_agent_keys_admin_delete" ON public.ai_agent_keys;
CREATE POLICY "ai_agent_keys_admin_delete"
    ON public.ai_agent_keys FOR DELETE
    USING (
        auth.uid() IS NOT NULL
        AND organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );


-- ── 6. Corriger les politiques RLS ai_agent_logs ────────────

DROP POLICY IF EXISTS "ai_agent_logs_admin_select" ON public.ai_agent_logs;
CREATE POLICY "ai_agent_logs_admin_select"
    ON public.ai_agent_logs FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

SELECT 'Migration 051 OK — RPCs et RLS Agents IA corrigés (owner_id)' AS status;
