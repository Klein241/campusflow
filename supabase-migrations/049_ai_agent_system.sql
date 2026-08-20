-- ═══════════════════════════════════════════════════════════════════════════
-- IziTeach — Migration 049 : Système d'Agents IA (MCP Gateway)
-- ═══════════════════════════════════════════════════════════════════════════
-- Objectif : Permettre aux agents IA de se connecter à l'app via des clés
--            dédiées, avec des permissions définies par l'admin, sans jamais
--            utiliser de vrais comptes utilisateurs.
--
-- Tables créées :
--   1. ai_agent_keys       — Clés d'API pour agents IA
--   2. ai_agent_logs       — Journal d'audit de toutes les actions IA
--   3. ai_pending_actions  — File d'attente pour approbation humaine
--
-- RPCs créés :
--   - create_ai_agent_key()         — Création clé (admin only)
--   - verify_ai_agent_key()         — Vérification interne (Security Definer)
--   - revoke_ai_agent_key()         — Révocation clé (admin only)
--   - log_ai_action()               — Logging depuis Edge Function
--   - get_ai_agent_logs()           — Récupérer les logs (admin only)
--   - approve_ai_pending_action()   — Approuver action en attente
--   - reject_ai_pending_action()    — Rejeter action en attente
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. TABLE AI_AGENT_KEYS ────────────────────────────────────────────────
-- Une clé par agent IA, définie par l'admin de l'organisation.
-- La clé réelle n'est JAMAIS stockée — seulement son hash SHA-256.

CREATE TABLE IF NOT EXISTS public.ai_agent_keys (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,           -- Ex: "MANUS Assistant Cursus"
    description     TEXT,                           -- Ex: "Agent qui crée les leçons"
    key_prefix      TEXT        NOT NULL,           -- 8 premiers chars affichés : "cf_xxxxx"
    key_hash        TEXT        NOT NULL UNIQUE,    -- SHA-256 de la clé complète
    -- Permissions granulaires : array de strings
    -- Ex: ["read:curriculum", "write:curriculum", "read:students"]
    permissions     TEXT[]      NOT NULL DEFAULT '{}',
    -- Limites
    rate_limit_per_minute  INT  NOT NULL DEFAULT 10,
    bulk_action_threshold  INT  NOT NULL DEFAULT 5,  -- Au-delà → pending_approval
    -- Durée de vie
    expires_at      TIMESTAMPTZ,                    -- NULL = pas d'expiration
    -- Statut
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_keys_org
    ON public.ai_agent_keys (organization_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_agent_keys_hash
    ON public.ai_agent_keys (key_hash) WHERE is_active = TRUE;

ALTER TABLE public.ai_agent_keys ENABLE ROW LEVEL SECURITY;

-- Seul l'admin authentifié de l'org peut voir ses clés agents
CREATE POLICY "ai_agent_keys_admin_select"
    ON public.ai_agent_keys FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND organization_id IN (
            SELECT organization_id FROM public.teacher_profiles
            WHERE id = auth.uid()
        )
    );

-- Pas d'accès direct en écriture depuis le client — uniquement via RPCs
CREATE POLICY "ai_agent_keys_no_direct_write"
    ON public.ai_agent_keys FOR INSERT USING (false);
CREATE POLICY "ai_agent_keys_no_direct_update"
    ON public.ai_agent_keys FOR UPDATE USING (false);
CREATE POLICY "ai_agent_keys_no_direct_delete"
    ON public.ai_agent_keys FOR DELETE USING (false);

GRANT SELECT ON public.ai_agent_keys TO authenticated;


-- ── 2. TABLE AI_AGENT_LOGS ────────────────────────────────────────────────
-- Journal complet de toutes les actions effectuées par les agents IA.

CREATE TABLE IF NOT EXISTS public.ai_agent_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_key_id    UUID        NOT NULL REFERENCES public.ai_agent_keys(id) ON DELETE CASCADE,
    organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    -- Action effectuée
    tool_name       TEXT        NOT NULL,  -- Ex: "create_lesson", "list_students"
    input_summary   TEXT,                  -- Résumé des paramètres (pas de données sensibles)
    output_summary  TEXT,                  -- Résumé du résultat
    -- Métadonnées
    status          TEXT        NOT NULL DEFAULT 'success'
                                CHECK (status IN ('success', 'error', 'pending_approval', 'rejected')),
    error_message   TEXT,                  -- Si status = 'error'
    duration_ms     INT,                   -- Durée d'exécution
    -- Approbation humaine (si status = 'pending_approval')
    human_approved_by   UUID    REFERENCES auth.users(id),
    human_approved_at   TIMESTAMPTZ,
    -- Timing
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_key
    ON public.ai_agent_logs (agent_key_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_org
    ON public.ai_agent_logs (organization_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_status
    ON public.ai_agent_logs (status) WHERE status != 'success';

ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agent_logs_admin_select"
    ON public.ai_agent_logs FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND organization_id IN (
            SELECT organization_id FROM public.teacher_profiles
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "ai_agent_logs_no_direct_write"
    ON public.ai_agent_logs FOR INSERT USING (false);

GRANT SELECT ON public.ai_agent_logs TO authenticated;


-- ── 3. TABLE AI_PENDING_ACTIONS ───────────────────────────────────────────
-- Actions en attente d'approbation humaine (bulk operations > threshold).

CREATE TABLE IF NOT EXISTS public.ai_pending_actions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_key_id    UUID        NOT NULL REFERENCES public.ai_agent_keys(id) ON DELETE CASCADE,
    organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    log_id          UUID        REFERENCES public.ai_agent_logs(id),
    -- Détails de l'action
    tool_name       TEXT        NOT NULL,
    action_data     JSONB       NOT NULL DEFAULT '{}',  -- Données complètes à exécuter si approuvé
    item_count      INT         NOT NULL DEFAULT 1,     -- Nombre d'items à créer/modifier
    description     TEXT,                               -- Description lisible pour l'admin
    -- Statut
    status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
    -- Approbation
    reviewed_by     UUID        REFERENCES auth.users(id),
    reviewed_at     TIMESTAMPTZ,
    review_comment  TEXT,
    -- Timing
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours'
);

CREATE INDEX IF NOT EXISTS idx_ai_pending_org_status
    ON public.ai_pending_actions (organization_id, status, created_at DESC);

ALTER TABLE public.ai_pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_pending_admin_select"
    ON public.ai_pending_actions FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND organization_id IN (
            SELECT organization_id FROM public.teacher_profiles
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "ai_pending_no_direct_write"
    ON public.ai_pending_actions FOR INSERT USING (false);

GRANT SELECT ON public.ai_pending_actions TO authenticated;


-- ── 4. LISTE DES PERMISSIONS DISPONIBLES ─────────────────────────────────
-- Table de référence des permissions que l'admin peut accorder aux agents IA

CREATE TABLE IF NOT EXISTS public.ai_permission_catalog (
    id          TEXT PRIMARY KEY,              -- Ex: "read:curriculum"
    category    TEXT NOT NULL,                 -- Ex: "Contenu pédagogique"
    label       TEXT NOT NULL,                 -- Ex: "Lire le cursus"
    description TEXT,                          -- Description détaillée
    risk_level  TEXT NOT NULL DEFAULT 'low'    -- 'low', 'medium', 'high'
                CHECK (risk_level IN ('low', 'medium', 'high')),
    sort_order  INT NOT NULL DEFAULT 0
);

INSERT INTO public.ai_permission_catalog (id, category, label, description, risk_level, sort_order) VALUES
    -- Lecture
    ('read:curriculum',  'Contenu pédagogique', 'Lire le cursus',             'Accès en lecture aux matières, chapitres et leçons',             'low',    10),
    ('read:students',    'Étudiants',           'Voir les étudiants',         'Voir la liste des étudiants (sans données sensibles)',           'low',    20),
    ('read:grades',      'Évaluations',         'Voir les notes',             'Accès en lecture aux notes des étudiants',                       'medium', 30),
    ('read:attendance',  'Présence',            'Voir les présences',         'Accès en lecture aux données de présence',                       'low',    40),
    ('read:timetable',   'Emploi du temps',     'Voir les horaires',          'Accès en lecture a l emploi du temps',                          'low',    50),
    -- Écriture contenu
    ('write:curriculum', 'Contenu pédagogique', 'Créer/modifier le cursus',   'Créer et modifier des matières, chapitres, leçons, exercices',   'medium', 60),
    ('write:exercises',  'Contenu pédagogique', 'Créer des exercices',        'Créer et modifier des exercices uniquement',                     'medium', 70),
    -- Écriture avancée
    ('write:grades',     'Évaluations',         'Saisir des notes',           'Saisir et modifier les notes des étudiants',                     'high',   80),
    ('write:timetable',  'Emploi du temps',     'Modifier les horaires',      'Créer et modifier l emploi du temps',                          'high',   90),
    -- Bulk operations
    ('write:bulk',       'Opérations',          'Créations en masse',         'Créer plusieurs éléments en une seule opération',               'medium', 100)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_permission_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_permission_catalog_public_read"
    ON public.ai_permission_catalog FOR SELECT USING (true);
GRANT SELECT ON public.ai_permission_catalog TO anon, authenticated;


-- ── 5. RPC : CREATE_AI_AGENT_KEY ─────────────────────────────────────────
-- Crée une nouvelle clé d'API pour un agent IA.
-- Retourne la clé en clair UNE SEULE FOIS (non stockée).

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
    -- Vérifier que l'utilisateur est admin de cette org
    SELECT EXISTS (
        SELECT 1 FROM public.teacher_profiles
        WHERE id = v_user_id
          AND organization_id = p_org_id
          AND role IN ('director', 'superadmin', 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Accès refusé : vous devez être directeur ou superadmin pour créer une clé agent IA'
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
        'full_key',    v_full_key,    -- ⚠️ À copier immédiatement, ne sera plus affiché
        'key_prefix',  v_key_prefix,
        'name',        p_name,
        'permissions', p_permissions,
        'message',     'Copiez cette clé maintenant — elle ne sera plus affichée.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_ai_agent_key(UUID, TEXT, TEXT, TEXT[], INT, INT, TIMESTAMPTZ)
    TO authenticated;


-- ── 6. RPC : VERIFY_AI_AGENT_KEY ─────────────────────────────────────────
-- Vérifie une clé d'API et retourne les infos de l'agent.
-- Appelé par la Supabase Edge Function mcp-gateway.

CREATE OR REPLACE FUNCTION public.verify_ai_agent_key(
    p_raw_key TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_key_hash  TEXT;
    v_agent     RECORD;
BEGIN
    v_key_hash := encode(digest(p_raw_key, 'sha256'), 'hex');

    SELECT
        k.id, k.organization_id, k.name, k.permissions,
        k.rate_limit_per_minute, k.bulk_action_threshold,
        k.expires_at, k.is_active
    INTO v_agent
    FROM public.ai_agent_keys k
    WHERE k.key_hash = v_key_hash
      AND k.is_active = TRUE;

    IF v_agent.id IS NULL THEN
        RETURN json_build_object('valid', FALSE, 'error', 'Clé invalide ou révoquée');
    END IF;

    -- Vérifier expiration
    IF v_agent.expires_at IS NOT NULL AND v_agent.expires_at < NOW() THEN
        UPDATE public.ai_agent_keys SET is_active = FALSE WHERE id = v_agent.id;
        RETURN json_build_object('valid', FALSE, 'error', 'Clé expirée');
    END IF;

    -- Mettre à jour last_used_at
    UPDATE public.ai_agent_keys SET last_used_at = NOW() WHERE id = v_agent.id;

    RETURN json_build_object(
        'valid',           TRUE,
        'agent_id',        v_agent.id,
        'org_id',          v_agent.organization_id,
        'agent_name',      v_agent.name,
        'permissions',     v_agent.permissions,
        'rate_limit',      v_agent.rate_limit_per_minute,
        'bulk_threshold',  v_agent.bulk_action_threshold
    );
END;
$$;

-- Pas de GRANT public — appelé uniquement par l'Edge Function avec service_role
REVOKE ALL ON FUNCTION public.verify_ai_agent_key(TEXT) FROM anon, authenticated;


-- ── 7. RPC : REVOKE_AI_AGENT_KEY ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.revoke_ai_agent_key(
    p_key_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id   UUID := auth.uid();
    v_org_id    UUID;
    v_is_admin  BOOLEAN := FALSE;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM public.ai_agent_keys WHERE id = p_key_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Clé introuvable' USING ERRCODE = 'P0001';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.teacher_profiles
        WHERE id = v_user_id
          AND organization_id = v_org_id
          AND role IN ('director', 'superadmin', 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.ai_agent_keys
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = p_key_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_ai_agent_key(UUID) TO authenticated;


-- ── 8. RPC : LOG_AI_ACTION ────────────────────────────────────────────────
-- Appelé par l'Edge Function pour loguer chaque action.

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
BEGIN
    INSERT INTO public.ai_agent_logs (
        agent_key_id, organization_id, tool_name,
        input_summary, output_summary,
        status, error_message, duration_ms
    ) VALUES (
        p_agent_key_id, p_org_id, p_tool_name,
        p_input_summary, p_output_summary,
        p_status, p_error_message, p_duration_ms
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- Appelé uniquement par l'Edge Function (service_role)
REVOKE ALL ON FUNCTION public.log_ai_action(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INT) FROM anon, authenticated;


-- ── 9. RPC : GET_AI_AGENT_STATS ───────────────────────────────────────────
-- Statistiques agrégées pour le dashboard admin.

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
        SELECT 1 FROM public.teacher_profiles
        WHERE id = v_user_id AND organization_id = p_org_id
          AND role IN ('director', 'superadmin', 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*) INTO v_total_keys FROM public.ai_agent_keys WHERE organization_id = p_org_id;
    SELECT COUNT(*) INTO v_active_keys FROM public.ai_agent_keys WHERE organization_id = p_org_id AND is_active = TRUE;
    SELECT COUNT(*) INTO v_total_actions FROM public.ai_agent_logs WHERE organization_id = p_org_id;
    SELECT COUNT(*) INTO v_pending_count FROM public.ai_pending_actions WHERE organization_id = p_org_id AND status = 'pending';
    SELECT COUNT(*) INTO v_today_actions FROM public.ai_agent_logs
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


-- ── 10. RPC : APPROVE / REJECT PENDING ACTION ──────────────────────────────

CREATE OR REPLACE FUNCTION public.review_ai_pending_action(
    p_action_id    UUID,
    p_decision     TEXT,   -- 'approved' ou 'rejected'
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
        SELECT 1 FROM public.teacher_profiles
        WHERE id = v_user_id AND organization_id = v_org_id
          AND role IN ('director', 'superadmin', 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.ai_pending_actions
    SET status = p_decision,
        reviewed_by = v_user_id,
        reviewed_at = NOW(),
        review_comment = p_comment
    WHERE id = p_action_id;

    -- Mettre à jour le log associé
    UPDATE public.ai_agent_logs
    SET status = p_decision,
        human_approved_by = v_user_id,
        human_approved_at = NOW()
    FROM public.ai_pending_actions pa
    WHERE pa.id = p_action_id
      AND public.ai_agent_logs.id = pa.log_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_ai_pending_action(UUID, TEXT, TEXT) TO authenticated;
