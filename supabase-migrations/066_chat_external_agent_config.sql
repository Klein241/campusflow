-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 066 — Configuration Agent IA Externe pour Bulle Dame SKY
-- ═══════════════════════════════════════════════════════════════════════════════
-- Permet au Superadmin de connecter Claude, MANUS, ou tout agent OpenAI-compatible
-- à la bulle de chat Dame SKY d'une organisation.
-- L'agent externe ne voit que les messages et les cours publics (zéro donnée sensible).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
--  1. Colonnes de configuration agent externe dans ai_agent_keys
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE ai_agent_keys
    ADD COLUMN IF NOT EXISTS external_api_url      TEXT        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS external_api_key_enc  TEXT        DEFAULT NULL,  -- clé chiffrée (jamais exposée client)
    ADD COLUMN IF NOT EXISTS external_model        TEXT        DEFAULT NULL,  -- ex: 'claude-opus-4-5', 'gpt-4o'
    ADD COLUMN IF NOT EXISTS external_provider     TEXT        DEFAULT NULL,  -- 'anthropic' | 'openai' | 'custom'
    ADD COLUMN IF NOT EXISTS chat_access_courses   BOOLEAN     NOT NULL DEFAULT TRUE,  -- accès aux cours publics
    ADD COLUMN IF NOT EXISTS chat_org_id           UUID        DEFAULT NULL   -- org cible (NULL = toutes les orgs)
        REFERENCES organizations(id) ON DELETE SET NULL;

COMMENT ON COLUMN ai_agent_keys.external_api_url     IS 'URL endpoint de l''API IA externe (Claude, OpenAI, MANUS, etc.)';
COMMENT ON COLUMN ai_agent_keys.external_api_key_enc IS 'Clé API externe stockée côté serveur. Jamais exposée au client.';
COMMENT ON COLUMN ai_agent_keys.external_model       IS 'Identifiant du modèle IA (claude-opus-4-5, gpt-4o, etc.)';
COMMENT ON COLUMN ai_agent_keys.external_provider    IS 'Provider: anthropic | openai | custom';
COMMENT ON COLUMN ai_agent_keys.chat_access_courses  IS 'Autorise l''agent à lire les cours publics de l''organisation';
COMMENT ON COLUMN ai_agent_keys.chat_org_id          IS 'Organisation cible pour la délégation du chat. NULL = plateforme globale.';

-- ─────────────────────────────────────────────────────────────────────────────
--  2. Fonction : Récupérer la configuration d'agent chat actif pour une org
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_active_chat_agent(p_org_id UUID)
RETURNS TABLE (
    key_id              UUID,
    external_api_url    TEXT,
    external_api_key_enc TEXT,
    external_model      TEXT,
    external_provider   TEXT,
    chat_access_courses BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.external_api_url,
        k.external_api_key_enc,
        k.external_model,
        k.external_provider,
        k.chat_access_courses
    FROM ai_agent_keys k
    WHERE k.is_active = TRUE
      AND k.is_superadmin = TRUE
      AND 'chat:dame_sky' = ANY(k.permissions)
      AND k.external_api_url IS NOT NULL
      AND k.external_api_key_enc IS NOT NULL
      AND (k.chat_org_id IS NULL OR k.chat_org_id = p_org_id)
      AND (k.expires_at IS NULL OR k.expires_at > NOW())
    ORDER BY
        -- Priorité : clé spécifique à l'org avant la clé globale
        CASE WHEN k.chat_org_id = p_org_id THEN 0 ELSE 1 END,
        k.created_at DESC
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_active_chat_agent IS
'Retourne la configuration de l''agent IA externe actif pour la bulle de chat Dame SKY d''une organisation donnée. Utilisée par le Worker Cloudflare (SECURITY DEFINER, service role uniquement).';

-- ─────────────────────────────────────────────────────────────────────────────
--  3. Fonction : Récupérer les cours publics d'une organisation (pour l'agent IA)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_public_courses_for_agent(p_org_id UUID, p_limit INT DEFAULT 20)
RETURNS TABLE (
    course_id    UUID,
    title        TEXT,
    description  TEXT,
    subject      TEXT,
    level        TEXT,
    chapters     JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.title::TEXT,
        COALESCE(c.description, '')::TEXT,
        COALESCE(c.subject, '')::TEXT,
        COALESCE(c.level, '')::TEXT,
        COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object(
                    'title', ch.title,
                    'order', ch.order_index
                ) ORDER BY ch.order_index)
                FROM chapters ch
                WHERE ch.course_id = c.id
            ),
            '[]'::jsonb
        )
    FROM courses c
    WHERE c.organization_id = p_org_id
      AND c.is_published = TRUE
    ORDER BY c.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_public_courses_for_agent IS
'Retourne les cours publiés d''une organisation pour enrichir le contexte de l''agent IA externe. Données non-sensibles uniquement (titre, matière, niveau, chapitres).';

-- ─────────────────────────────────────────────────────────────────────────────
--  4. Index pour performance
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ai_agent_keys_chat_dame_sky
    ON ai_agent_keys (is_active, is_superadmin, chat_org_id)
    WHERE 'chat:dame_sky' = ANY(permissions);

-- ─────────────────────────────────────────────────────────────────────────────
--  5. RLS : la clé API externe n'est jamais accessible côté client
-- ─────────────────────────────────────────────────────────────────────────────

-- La colonne external_api_key_enc est masquée dans toutes les vues client
-- via la politique RLS existante sur ai_agent_keys (is_superadmin check).
-- get_active_chat_agent est SECURITY DEFINER → appelée uniquement par le Worker
-- via la service_key (server-side), jamais depuis le navigateur.

-- Vérification que les fonctions existent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_active_chat_agent'
    ) THEN
        RAISE EXCEPTION 'Migration 066: get_active_chat_agent function not created';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_public_courses_for_agent'
    ) THEN
        RAISE EXCEPTION 'Migration 066: get_public_courses_for_agent function not created';
    END IF;
    RAISE NOTICE '✅ Migration 066 appliquée avec succès — Agent IA externe pour Dame SKY configuré';
END;
$$;
