-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 071 : CORRECTION SYNTAXE SQL VERIFY_AI_AGENT_KEY
-- ═══════════════════════════════════════════════════════════════════════════════
-- Correction du bug PostgreSQL : "set-returning functions are not allowed in WHERE"
-- Remplacement de `WHERE unnest(...)` par `FROM unnest(...) AS p WHERE p ...`
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.verify_ai_agent_key(
    p_raw_key TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_key_hash          TEXT;
    v_key_record        RECORD;
    v_org_record        RECORD;
    v_req_count         INT;
    v_effective_superadmin BOOLEAN;
    v_superadmin_perms  TEXT[] := '{}';
    v_org_perms         TEXT[] := '{}';
BEGIN
    IF p_raw_key IS NULL OR length(trim(p_raw_key)) < 10 THEN
        RETURN json_build_object('valid', false, 'error', 'Clé API absente ou format invalide');
    END IF;

    v_key_hash := encode(digest(trim(p_raw_key), 'sha256'), 'hex');

    SELECT * INTO v_key_record
    FROM public.ai_agent_keys
    WHERE key_hash = v_key_hash;

    IF v_key_record.id IS NULL THEN
        RETURN json_build_object('valid', false, 'error', 'Clé API invalide');
    END IF;

    IF NOT v_key_record.is_active THEN
        RETURN json_build_object('valid', false, 'error', 'Cette clé API a été révoquée');
    END IF;

    IF v_key_record.expires_at IS NOT NULL AND v_key_record.expires_at < NOW() THEN
        RETURN json_build_object('valid', false, 'error', 'Cette clé API a expiré');
    END IF;

    -- ── Extraction sécurisée des permissions superadmin (syntaxe PostgreSQL valide) ──
    SELECT COALESCE(array_agg(p), '{}'::TEXT[]) INTO v_superadmin_perms
    FROM unnest(COALESCE(v_key_record.permissions, '{}'::TEXT[])) AS p
    WHERE p LIKE 'superadmin:%';

    -- Si marquée superadmin et a des permissions superadmin:* (ou pas de permissions)
    IF v_key_record.is_superadmin AND (
        array_length(v_key_record.permissions, 1) IS NULL
        OR array_length(v_superadmin_perms, 1) > 0
    ) THEN
        v_effective_superadmin := TRUE;
    ELSE
        v_effective_superadmin := FALSE;

        -- Journaliser toute tentative d'escalade
        IF v_key_record.is_superadmin THEN
            INSERT INTO public.security_audit_log (event_type, description, affected_ids)
            VALUES (
                'MCP_SUPERADMIN_PRIVILEGE_ESCALATION_BLOCKED',
                format('Tentative escalade privilège bloquée. Clé %s (is_superadmin=TRUE) sans permissions superadmin:* valides. Dégradée en clé org.', v_key_record.id),
                jsonb_build_object('key_id', v_key_record.id, 'key_prefix', v_key_record.key_prefix, 'permissions', v_key_record.permissions)
            );
        END IF;
    END IF;

    -- ── Rate limit check ──
    SELECT COUNT(*) INTO v_req_count
    FROM public.ai_agent_logs
    WHERE agent_key_id = v_key_record.id
      AND executed_at > NOW() - INTERVAL '1 minute';

    IF v_req_count >= v_key_record.rate_limit_per_minute THEN
        RETURN json_build_object(
            'valid', false,
            'error', format('Rate limit dépassé (%s req/min pour cette clé)', v_key_record.rate_limit_per_minute)
        );
    END IF;

    UPDATE public.ai_agent_keys
    SET last_used_at = NOW()
    WHERE id = v_key_record.id;

    -- ── Si SUPERADMIN RÉEL ──
    IF v_effective_superadmin THEN
        RETURN json_build_object(
            'valid',                 true,
            'agent_id',              v_key_record.id,
            'agent_name',            v_key_record.name,
            'is_superadmin',         true,
            'organization_id',       NULL,
            'org_name',              'SUPERADMIN PLATFORM',
            'org_slug',              'superadmin',
            'permissions',           v_key_record.permissions,
            'rate_limit_per_minute', v_key_record.rate_limit_per_minute,
            'bulk_action_threshold', v_key_record.bulk_action_threshold
        );
    END IF;

    -- ── Si clé org normale ──
    IF v_key_record.organization_id IS NULL THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Clé invalide : organisation non définie pour cet agent'
        );
    END IF;

    SELECT * INTO v_org_record
    FROM public.organizations
    WHERE id = v_key_record.organization_id;

    IF v_org_record.id IS NULL THEN
        RETURN json_build_object('valid', false, 'error', 'Organisation associée introuvable');
    END IF;

    -- Extraction sécurisée des permissions org (syntaxe PostgreSQL valide)
    SELECT COALESCE(array_agg(p), '{}'::TEXT[]) INTO v_org_perms
    FROM unnest(COALESCE(v_key_record.permissions, '{}'::TEXT[])) AS p
    WHERE p NOT LIKE 'superadmin:%';

    RETURN json_build_object(
        'valid',                 true,
        'agent_id',              v_key_record.id,
        'agent_name',            v_key_record.name,
        'is_superadmin',         false,
        'organization_id',       v_org_record.id,
        'org_name',              v_org_record.name,
        'org_slug',              v_org_record.slug,
        'permissions',           v_org_perms,
        'rate_limit_per_minute', v_key_record.rate_limit_per_minute,
        'bulk_action_threshold', v_key_record.bulk_action_threshold
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_ai_agent_key(TEXT) TO anon, authenticated, service_role;
