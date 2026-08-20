-- ============================================================
-- MIGRATION 053 — Sky Agent Superadmin & Multi-Level Gateway
-- ============================================================
-- Permet au Superadmin d'avoir ses propres Sky Agents avec des
-- permissions globales : support, Sky Points, bugs, annonces, relances.
-- ============================================================

-- ── 1. Adapter les tables pour supporter les clés Superadmin ───

-- Rendre organization_id optionnel (NULL pour superadmin)
ALTER TABLE public.ai_agent_keys
    ALTER COLUMN organization_id DROP NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_agent_keys' AND column_name = 'is_superadmin'
    ) THEN
        ALTER TABLE public.ai_agent_keys ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

ALTER TABLE public.ai_agent_logs
    ALTER COLUMN organization_id DROP NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_agent_logs' AND column_name = 'is_superadmin'
    ) THEN
        ALTER TABLE public.ai_agent_logs ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

ALTER TABLE public.ai_pending_actions
    ALTER COLUMN organization_id DROP NOT NULL;

-- ── 2. Ajouter les permissions Superadmin au catalogue ─────────

INSERT INTO public.ai_permission_catalog (id, category, label, description, risk_level, sort_order)
VALUES
    ('superadmin:all',           'Superadmin', 'Contrôle Total Plateforme', 'Accès sans restriction à tous les outils superadmin', 'high', 100),
    ('superadmin:support',       'Superadmin', 'Support & Messages',        'Lire et répondre aux tickets et demandes Sky Requests', 'medium', 101),
    ('superadmin:points',        'Superadmin', 'Gestion des Sky Points',    'Valider et créditer les recharges de Sky Points', 'high', 102),
    ('superadmin:bugs',          'Superadmin', 'Rapports de Bugs',         'Consulter, analyser et mettre à jour les statuts de bugs', 'low', 103),
    ('superadmin:announcements', 'Superadmin', 'Annonces Globales',         'Diffuser des annonces à toutes les organisations', 'high', 104),
    ('superadmin:orgs',          'Superadmin', 'Audit Organisations',       'Lister les organisations, détecter les inactives et auditer', 'medium', 105),
    ('superadmin:emails',        'Superadmin', 'Envoi d''Emails Système',    'Envoyer des emails transactionnels ou de relance', 'medium', 106)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    risk_level = EXCLUDED.risk_level,
    category = EXCLUDED.category;

-- ── 3. Helper : Vérifier si l'utilisateur est Platform Admin ───

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE user_id = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon;

-- ── 4. RPC : CREATE_SUPERADMIN_SKY_AGENT_KEY ───────────────────

CREATE OR REPLACE FUNCTION public.create_superadmin_sky_agent_key(
    p_name                 TEXT,
    p_description          TEXT DEFAULT NULL,
    p_permissions          TEXT[] DEFAULT '{"superadmin:all"}',
    p_rate_limit           INT DEFAULT 30,
    p_bulk_threshold       INT DEFAULT 10,
    p_expires_at           TIMESTAMPTZ DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id       UUID := auth.uid();
    v_is_sa         BOOLEAN;
    v_raw_key       TEXT;
    v_key_hash      TEXT;
    v_key_prefix    TEXT;
    v_agent_id      UUID;
    v_full_key      TEXT;
BEGIN
    -- Vérification superadmin
    SELECT public.is_platform_admin() INTO v_is_sa;
    IF NOT v_is_sa THEN
        RAISE EXCEPTION 'Accès refusé : réservé aux superadministrateurs de la plateforme'
            USING ERRCODE = 'P0001';
    END IF;

    IF length(trim(p_name)) < 3 THEN
        RAISE EXCEPTION 'Le nom de l''agent doit faire au moins 3 caractères'
            USING ERRCODE = 'P0002';
    END IF;

    -- Génération de clé Superadmin (préfixe sk_live_ ou cf_live_)
    v_raw_key    := encode(gen_random_bytes(32), 'hex');
    v_full_key   := 'cf_live_sa_' || v_raw_key;
    v_key_prefix := 'cf_live_sa_' || left(v_raw_key, 6) || '...';
    v_key_hash   := encode(digest(v_full_key, 'sha256'), 'hex');

    INSERT INTO public.ai_agent_keys (
        organization_id, is_superadmin, created_by, name, description,
        key_prefix, key_hash, permissions,
        rate_limit_per_minute, bulk_action_threshold, expires_at
    ) VALUES (
        NULL, TRUE, v_user_id, p_name, p_description,
        v_key_prefix, v_key_hash, p_permissions,
        p_rate_limit, p_bulk_threshold, p_expires_at
    ) RETURNING id INTO v_agent_id;

    RETURN json_build_object(
        'id',          v_agent_id,
        'full_key',    v_full_key,
        'key_prefix',  v_key_prefix,
        'name',        p_name,
        'permissions', p_permissions,
        'is_superadmin', TRUE,
        'message',     'Clé Superadmin Sky Agent générée avec succès.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_superadmin_sky_agent_key(TEXT, TEXT, TEXT[], INT, INT, TIMESTAMPTZ) TO authenticated;

-- ── 5. RPC : GET_SUPERADMIN_SKY_AGENT_STATS ────────────────────

CREATE OR REPLACE FUNCTION public.get_superadmin_sky_agent_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_is_sa         BOOLEAN;
    v_total_keys    INT;
    v_active_keys   INT;
    v_total_actions INT;
    v_pending_count INT;
    v_today_actions INT;
BEGIN
    SELECT public.is_platform_admin() INTO v_is_sa;
    IF NOT v_is_sa THEN
        RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*) INTO v_total_keys
        FROM public.ai_agent_keys WHERE is_superadmin = TRUE;
    SELECT COUNT(*) INTO v_active_keys
        FROM public.ai_agent_keys WHERE is_superadmin = TRUE AND is_active = TRUE;
    SELECT COUNT(*) INTO v_total_actions
        FROM public.ai_agent_logs WHERE is_superadmin = TRUE;
    SELECT COUNT(*) INTO v_pending_count
        FROM public.ai_pending_actions pa
        JOIN public.ai_agent_keys k ON k.id = pa.agent_key_id
        WHERE k.is_superadmin = TRUE AND pa.status = 'pending';
    SELECT COUNT(*) INTO v_today_actions
        FROM public.ai_agent_logs
        WHERE is_superadmin = TRUE AND executed_at > NOW() - INTERVAL '24 hours';

    RETURN json_build_object(
        'total_keys',    v_total_keys,
        'active_keys',   v_active_keys,
        'total_actions', v_total_actions,
        'pending_count', v_pending_count,
        'today_actions', v_today_actions
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_superadmin_sky_agent_stats() TO authenticated;

-- ── 6. RPC : VERIFY_AI_AGENT_KEY (SUPPORT SUPERADMIN) ──────────

CREATE OR REPLACE FUNCTION public.verify_ai_agent_key(
    p_raw_key TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_key_hash      TEXT;
    v_key_record    RECORD;
    v_org_record    RECORD;
    v_req_count     INT;
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

    -- Si clé superadmin
    IF v_key_record.is_superadmin THEN
        -- Rate limit check
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

    -- Si clé d'organisation
    SELECT * INTO v_org_record
    FROM public.organizations
    WHERE id = v_key_record.organization_id;

    IF v_org_record.id IS NULL THEN
        RETURN json_build_object('valid', false, 'error', 'Organisation associée introuvable');
    END IF;

    SELECT COUNT(*) INTO v_req_count
    FROM public.ai_agent_logs
    WHERE agent_key_id = v_key_record.id
      AND executed_at > NOW() - INTERVAL '1 minute';

    IF v_req_count >= v_key_record.rate_limit_per_minute THEN
        RETURN json_build_object(
            'valid', false,
            'error', format('Rate limit dépassé (%s req/min)', v_key_record.rate_limit_per_minute)
        );
    END IF;

    UPDATE public.ai_agent_keys
    SET last_used_at = NOW()
    WHERE id = v_key_record.id;

    RETURN json_build_object(
        'valid',                 true,
        'agent_id',              v_key_record.id,
        'agent_name',            v_key_record.name,
        'is_superadmin',         false,
        'organization_id',       v_org_record.id,
        'org_name',              v_org_record.name,
        'org_slug',              v_org_record.slug,
        'permissions',           v_key_record.permissions,
        'rate_limit_per_minute', v_key_record.rate_limit_per_minute,
        'bulk_action_threshold', v_key_record.bulk_action_threshold
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_ai_agent_key(TEXT) TO anon, authenticated;

-- ── 7. RPC : LOG_AI_ACTION (AVEC SUPPORT SUPERADMIN) ──────────

CREATE OR REPLACE FUNCTION public.log_ai_action(
    p_agent_key_id   UUID,
    p_org_id         UUID,
    p_tool_name      TEXT,
    p_input_summary  TEXT,
    p_output_summary TEXT,
    p_status         TEXT DEFAULT 'success',
    p_error_message  TEXT DEFAULT NULL,
    p_duration_ms    INT  DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_log_id UUID;
    v_is_sa  BOOLEAN := FALSE;
BEGIN
    SELECT is_superadmin INTO v_is_sa
    FROM public.ai_agent_keys WHERE id = p_agent_key_id;

    INSERT INTO public.ai_agent_logs (
        agent_key_id, organization_id, is_superadmin, tool_name,
        input_summary, output_summary,
        status, error_message, duration_ms
    ) VALUES (
        p_agent_key_id, p_org_id, COALESCE(v_is_sa, FALSE), p_tool_name,
        p_input_summary, p_output_summary,
        p_status, p_error_message, p_duration_ms
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_ai_action(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INT) TO anon, authenticated;

-- ── 8. RLS Policies pour le Superadmin ──────────────────────────

DROP POLICY IF EXISTS "superadmin_ai_keys_select" ON public.ai_agent_keys;
CREATE POLICY "superadmin_ai_keys_select"
    ON public.ai_agent_keys FOR SELECT
    USING (public.is_platform_admin());

DROP POLICY IF EXISTS "superadmin_ai_logs_select" ON public.ai_agent_logs;
CREATE POLICY "superadmin_ai_logs_select"
    ON public.ai_agent_logs FOR SELECT
    USING (public.is_platform_admin());

DROP POLICY IF EXISTS "superadmin_ai_pending_select" ON public.ai_pending_actions;
CREATE POLICY "superadmin_ai_pending_select"
    ON public.ai_pending_actions FOR SELECT
    USING (public.is_platform_admin());

SELECT 'Migration 053 OK — Sky Agent Superadmin opérationnel' AS status;

