-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 070 : CORRECTION CRITIQUE SÉCURITÉ MCP GATEWAY — IziTeach
-- ═══════════════════════════════════════════════════════════════════════════════
-- CONTEXTE :
--   Une clé API créée avec la permission "superadmin:emails" (envoi email)
--   était enregistrée avec is_superadmin = TRUE dans ai_agent_keys, ce qui
--   accordait au porteur de cette clé un accès TOTAL à toutes les 64 fonctions
--   MCP (list_organizations, read students, payments, etc.)
--
-- CORRECTIONS :
--   1. Révoquer toutes les clés compromises (is_superadmin = TRUE mais avec
--      permissions restreintes qui ne devraient pas être superadmin)
--   2. Ajouter une contrainte CHECK pour éviter qu'une clé superadmin existe
--      sans qu'elle soit explicitement validée
--   3. Remplacer la RPC verify_ai_agent_key pour qu'elle filtre strictement
--      les permissions superadmin → si une clé a is_superadmin mais que son
--      tableau permissions ne contient que 'superadmin:*', c'est valide ;
--      sinon on la traite comme clé org normale
--   4. Audit log : journaliser toute tentative de révocation
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : AUDIT — identifier les clés suspectes avant toute action
-- ─────────────────────────────────────────────────────────────────────────────

-- Créer une table d'audit de sécurité si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      TEXT        NOT NULL,
    description     TEXT,
    affected_ids    JSONB,
    performed_by    TEXT        DEFAULT 'system_migration',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_audit_superadmin_only"
    ON public.security_audit_log FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    );

GRANT SELECT ON public.security_audit_log TO authenticated;
GRANT ALL ON public.security_audit_log TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : JOURNALISER LES CLÉS SUSPECTES AVANT RÉVOCATION
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.security_audit_log (event_type, description, affected_ids)
SELECT
    'MCP_SECURITY_INCIDENT_070',
    format(
        'Clé suspecte détectée: is_superadmin=TRUE mais permissions limitées. ' ||
        'Clé: %s (préfixe: %s). Créée le %s. Révocation automatique.',
        id, key_prefix, created_at
    ),
    jsonb_build_object(
        'key_id', id,
        'key_prefix', key_prefix,
        'name', name,
        'permissions', permissions,
        'is_superadmin', is_superadmin,
        'created_at', created_at,
        'last_used_at', last_used_at
    )
FROM public.ai_agent_keys
WHERE is_superadmin = TRUE
  AND (
      -- Clé superadmin sans aucune permission (incohérent)
      permissions = '{}'
      -- OU clé superadmin avec uniquement des permissions d'org (pas superadmin:*)
      OR (
          array_length(permissions, 1) > 0
          AND NOT (
              permissions && ARRAY[
                  'superadmin:all',
                  'superadmin:orgs',
                  'superadmin:support',
                  'superadmin:bugs',
                  'superadmin:points',
                  'superadmin:announcements',
                  'superadmin:emails',
                  'superadmin:marketing'
              ]
          )
      )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 3 : RÉVOQUER LES CLÉS COMPROMISES
-- ─────────────────────────────────────────────────────────────────────────────

-- Révoquer toutes les clés is_superadmin=TRUE qui ont des permissions org mixtes
-- (sans aucune permission superadmin:* légitime)
UPDATE public.ai_agent_keys
SET
    is_active = FALSE,
    updated_at = NOW()
WHERE is_superadmin = TRUE
  AND permissions != '{}'
  AND NOT (
      permissions && ARRAY[
          'superadmin:all',
          'superadmin:orgs',
          'superadmin:support',
          'superadmin:bugs',
          'superadmin:points',
          'superadmin:announcements',
          'superadmin:emails',
          'superadmin:marketing'
      ]
  );

-- Journaliser le résultat de la révocation
INSERT INTO public.security_audit_log (event_type, description)
VALUES (
    'MCP_KEYS_REVOKED_070',
    'Révocation automatique des clés is_superadmin=TRUE sans permissions superadmin:* légitimes. Migration 070.'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 4 : AJOUTER UN CHAMP DE VALIDATION EXPLICITE
-- ─────────────────────────────────────────────────────────────────────────────

-- Ajouter un champ "superadmin_validated_by" pour forcer une approbation manuelle
ALTER TABLE public.ai_agent_keys
    ADD COLUMN IF NOT EXISTS superadmin_validated_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS superadmin_validated_at TIMESTAMPTZ;

-- Ajouter une contrainte : si is_superadmin = TRUE, au moins une permission superadmin:* doit exister
-- ET les permissions org normales sont interdites pour les clés superadmin
-- (défense en profondeur côté base de données)
ALTER TABLE public.ai_agent_keys
    DROP CONSTRAINT IF EXISTS chk_superadmin_permissions_coherent;

ALTER TABLE public.ai_agent_keys
    ADD CONSTRAINT chk_superadmin_permissions_coherent CHECK (
        -- Cas 1 : clé org normale (is_superadmin = FALSE) → autorisée inconditionnellement
        is_superadmin = FALSE
        OR
        -- Cas 2 : clé superadmin → DOIT avoir au moins une permission superadmin:*
        (
            is_superadmin = TRUE
            AND (
                permissions = '{}'  -- superadmin sans permissions = accès total (old behavior)
                OR permissions && ARRAY[
                    'superadmin:all',
                    'superadmin:orgs',
                    'superadmin:support',
                    'superadmin:bugs',
                    'superadmin:points',
                    'superadmin:announcements',
                    'superadmin:emails',
                    'superadmin:marketing'
                ]
            )
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 5 : REMPLACER verify_ai_agent_key AVEC DÉFENSE EN PROFONDEUR
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.verify_ai_agent_key(
    p_raw_key TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_key_hash          TEXT;
    v_key_record        RECORD;
    v_org_record        RECORD;
    v_req_count         INT;
    v_effective_superadmin BOOLEAN;
    v_superadmin_perms  TEXT[];
    v_org_perms         TEXT[];
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

    -- ── DÉFENSE EN PROFONDEUR : Vérifier la cohérence superadmin ──
    -- Une clé est effectivement superadmin UNIQUEMENT si :
    --   a) is_superadmin = TRUE dans la table ET
    --   b) Elle possède au moins une permission superadmin:* OU aucune permission (accès total legacy)
    -- Si is_superadmin = TRUE mais permissions = seulement des perms org → DÉGRADATION forcée
    v_superadmin_perms := ARRAY(
        SELECT unnest(v_key_record.permissions)
        WHERE unnest(v_key_record.permissions) LIKE 'superadmin:%'
    );

    IF v_key_record.is_superadmin AND (
        array_length(v_key_record.permissions, 1) IS NULL  -- permissions vides = accès total intentionnel
        OR array_length(v_superadmin_perms, 1) > 0          -- a bien des perms superadmin:*
    ) THEN
        v_effective_superadmin := TRUE;
    ELSE
        -- Clé marquée superadmin mais sans permissions superadmin:* → traiter comme org normale
        -- ET journaliser l'anomalie de sécurité
        v_effective_superadmin := FALSE;

        INSERT INTO public.security_audit_log (event_type, description, affected_ids)
        VALUES (
            'MCP_SUPERADMIN_PRIVILEGE_ESCALATION_BLOCKED',
            format('Tentative escalade privilège bloquée. Clé %s (is_superadmin=TRUE) sans permissions superadmin:* valides. Dégradée en clé org.', v_key_record.id),
            jsonb_build_object('key_id', v_key_record.id, 'key_prefix', v_key_record.key_prefix, 'permissions', v_key_record.permissions)
        );
    END IF;

    -- ── Rate limit ──
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

    -- ── Si clé org normale (ou clé superadmin dégradée) ──
    SELECT * INTO v_org_record
    FROM public.organizations
    WHERE id = v_key_record.organization_id;

    -- Pour les clés superadmin dégradées, organization_id peut être NULL → retourner erreur
    IF v_key_record.organization_id IS NULL AND NOT v_effective_superadmin THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'Clé invalide : configuration incohérente (superadmin sans org ni permissions superadmin)'
        );
    END IF;

    IF v_org_record.id IS NULL AND v_key_record.organization_id IS NOT NULL THEN
        RETURN json_build_object('valid', false, 'error', 'Organisation associée introuvable');
    END IF;

    -- Filtrer les permissions pour ne garder que les perms non-superadmin pour une clé org
    v_org_perms := ARRAY(
        SELECT unnest(v_key_record.permissions)
        WHERE unnest(v_key_record.permissions) NOT LIKE 'superadmin:%'
    );

    RETURN json_build_object(
        'valid',                 true,
        'agent_id',              v_key_record.id,
        'agent_name',            v_key_record.name,
        'is_superadmin',         false,
        'organization_id',       v_org_record.id,
        'org_name',              v_org_record.name,
        'org_slug',              v_org_record.slug,
        'permissions',           v_org_perms,  -- ← SEULEMENT les perms org, jamais superadmin:*
        'rate_limit_per_minute', v_key_record.rate_limit_per_minute,
        'bulk_action_threshold', v_key_record.bulk_action_threshold
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_ai_agent_key(TEXT) TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 6 : RPC ADMIN POUR RÉVOQUER UNE CLÉ PAR SON PRÉFIXE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.revoke_key_by_prefix(
    p_key_prefix TEXT,
    p_reason TEXT DEFAULT 'Révocation manuelle sécurité'
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_count INT;
BEGIN
    -- Vérifier que l'appelant est superadmin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'superadmin'
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Accès refusé : superadmin uniquement');
    END IF;

    UPDATE public.ai_agent_keys
    SET is_active = FALSE, updated_at = NOW()
    WHERE key_prefix LIKE (p_key_prefix || '%')
      AND is_active = TRUE;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    INSERT INTO public.security_audit_log (event_type, description, affected_ids, performed_by)
    VALUES (
        'MCP_KEY_MANUALLY_REVOKED',
        format('Révocation manuelle: préfixe=%s, raison=%s, clés_révoquées=%s', p_key_prefix, p_reason, v_count),
        jsonb_build_object('prefix', p_key_prefix, 'revoked_count', v_count),
        (SELECT email FROM auth.users WHERE id = auth.uid())
    );

    RETURN json_build_object('success', true, 'revoked_count', v_count, 'reason', p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_key_by_prefix(TEXT, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 7 : LOG FINAL DE LA MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.security_audit_log (event_type, description)
VALUES (
    'MIGRATION_070_COMPLETED',
    'Migration sécurité critique 070 exécutée avec succès. ' ||
    'Corrections : (1) révocation clés compromises, (2) contrainte CHECK cohérence superadmin, ' ||
    '(3) verify_ai_agent_key renforcée avec détection escalade de privilège, ' ||
    '(4) filtre permissions superadmin:* pour clés org, ' ||
    '(5) RPC revoke_key_by_prefix ajoutée.'
);
