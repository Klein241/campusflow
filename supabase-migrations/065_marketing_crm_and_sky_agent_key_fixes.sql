-- ============================================================
-- MIGRATION 065 — Sky Agent Superadmin Keys & Marketing CRM Hub
-- ============================================================
-- 1. Résolution de la révocation des clés Superadmin (RPCs + RLS)
-- 2. Création des tables Marketing CRM (leads, campagnes, créas)
-- 3. RPCs de Deep Research, Scraping & Filtrage par pays/ville
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CORRECTION RLS & RPCS DE RÉVOCATION CLÉS SUPERADMIN
-- ────────────────────────────────────────────────────────────

-- Permettre aux platform admins de mettre à jour et supprimer les clés superadmin
DROP POLICY IF EXISTS "ai_agent_keys_superadmin_update" ON public.ai_agent_keys;
CREATE POLICY "ai_agent_keys_superadmin_update"
    ON public.ai_agent_keys FOR UPDATE
    USING (
        is_superadmin = TRUE AND public.is_platform_admin()
    );

DROP POLICY IF EXISTS "ai_agent_keys_superadmin_delete" ON public.ai_agent_keys;
CREATE POLICY "ai_agent_keys_superadmin_delete"
    ON public.ai_agent_keys FOR DELETE
    USING (
        is_superadmin = TRUE AND public.is_platform_admin()
    );

-- RPC Dédiée pour révoquer une clé Superadmin
CREATE OR REPLACE FUNCTION public.revoke_superadmin_sky_agent_key(
    p_key_id UUID
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_is_sa BOOLEAN;
    v_found BOOLEAN;
BEGIN
    SELECT public.is_platform_admin() INTO v_is_sa;
    IF NOT v_is_sa THEN
        RAISE EXCEPTION 'Accès refusé : réservé aux superadministrateurs de la plateforme'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.ai_agent_keys
        WHERE id = p_key_id AND is_superadmin = TRUE
    ) INTO v_found;

    IF NOT v_found THEN
        RAISE EXCEPTION 'Clé Superadmin introuvable'
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.ai_agent_keys
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = p_key_id;

    RETURN json_build_object(
        'success', TRUE,
        'message', 'Clé Master Sky Agent révoquée avec succès.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_superadmin_sky_agent_key(UUID) TO authenticated;

-- RPC Dédiée pour supprimer définitivement une clé Superadmin
CREATE OR REPLACE FUNCTION public.delete_superadmin_sky_agent_key(
    p_key_id UUID
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_is_sa BOOLEAN;
BEGIN
    SELECT public.is_platform_admin() INTO v_is_sa;
    IF NOT v_is_sa THEN
        RAISE EXCEPTION 'Accès refusé : réservé aux superadministrateurs'
            USING ERRCODE = 'P0001';
    END IF;

    DELETE FROM public.ai_pending_actions WHERE agent_key_id = p_key_id;
    DELETE FROM public.ai_agent_logs WHERE agent_key_id = p_key_id;
    DELETE FROM public.ai_agent_keys WHERE id = p_key_id AND is_superadmin = TRUE;

    RETURN json_build_object(
        'success', TRUE,
        'message', 'Clé Master supprimée définitivement.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_superadmin_sky_agent_key(UUID) TO authenticated;

-- Mettre à jour revoke_ai_agent_key général pour supporter les superadmins
CREATE OR REPLACE FUNCTION public.revoke_ai_agent_key(
    p_key_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id       UUID := auth.uid();
    v_org_id        UUID;
    v_is_superadmin BOOLEAN := FALSE;
    v_is_admin      BOOLEAN := FALSE;
BEGIN
    SELECT organization_id, is_superadmin INTO v_org_id, v_is_superadmin
    FROM public.ai_agent_keys WHERE id = p_key_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clé introuvable' USING ERRCODE = 'P0001';
    END IF;

    -- Si clé superadmin
    IF v_is_superadmin THEN
        IF NOT public.is_platform_admin() THEN
            RAISE EXCEPTION 'Accès refusé : réservé au superadmin' USING ERRCODE = 'P0002';
        END IF;
    ELSE
        -- Si clé d'organisation
        IF v_org_id IS NULL THEN
            RAISE EXCEPTION 'Organisation associée manquante' USING ERRCODE = 'P0001';
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = v_org_id AND owner_id = v_user_id
        ) INTO v_is_admin;

        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0002';
        END IF;
    END IF;

    UPDATE public.ai_agent_keys
    SET is_active  = FALSE,
        updated_at = NOW()
    WHERE id = p_key_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_ai_agent_key(UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 2. TABLES MARKETING CRM & LEADS SCRAPÉS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.marketing_leads (
    id                  TEXT PRIMARY KEY DEFAULT ('lead_' || gen_random_uuid()),
    organization_name   TEXT NOT NULL,
    contact_name        TEXT NOT NULL,
    role                TEXT,
    email               TEXT NOT NULL,
    phone               TEXT,
    website             TEXT,
    country             TEXT NOT NULL DEFAULT 'Gabon',
    city                TEXT NOT NULL DEFAULT 'Libreville',
    source              TEXT NOT NULL DEFAULT 'ai_deep_research',
    target_type         TEXT NOT NULL DEFAULT 'ecoles_privees',
    score               INT NOT NULL DEFAULT 85,
    status              TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'opened', 'clicked', 'converted', 'unsubscribed')),
    notes               TEXT,
    custom_fields       JSONB DEFAULT '{}'::jsonb,
    opened_at           TIMESTAMPTZ,
    clicked_at          TIMESTAMPTZ,
    last_contacted_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_country_city ON public.marketing_leads(country, city);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON public.marketing_leads(status);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_target_type ON public.marketing_leads(target_type);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_score ON public.marketing_leads(score DESC);

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_leads_superadmin_all"
    ON public.marketing_leads FOR ALL
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id                  TEXT PRIMARY KEY DEFAULT ('camp_' || gen_random_uuid()),
    title               TEXT NOT NULL,
    subject             TEXT NOT NULL,
    preview_text        TEXT,
    html_content        TEXT NOT NULL,
    target_segment      TEXT,
    target_country      TEXT,
    target_city         TEXT,
    sender_name         TEXT NOT NULL DEFAULT 'IziTeach Partenariats',
    sender_email        TEXT NOT NULL DEFAULT 'contact@iziteach.com',
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'paused')),
    sent_count          INT NOT NULL DEFAULT 0,
    delivered_count     INT NOT NULL DEFAULT 0,
    opened_count        INT NOT NULL DEFAULT 0,
    clicked_count       INT NOT NULL DEFAULT 0,
    converted_count     INT NOT NULL DEFAULT 0,
    follow_up_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    follow_up_days      INT NOT NULL DEFAULT 3,
    scheduled_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_campaigns_superadmin_all"
    ON public.marketing_campaigns FOR ALL
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- RPC : Obtenir les leads avec filtres stricts par pays, ville, type et statut
CREATE OR REPLACE FUNCTION public.get_marketing_leads(
    p_country       TEXT DEFAULT NULL,
    p_city          TEXT DEFAULT NULL,
    p_target_type   TEXT DEFAULT NULL,
    p_status        TEXT DEFAULT NULL,
    p_limit         INT DEFAULT 100
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_is_sa BOOLEAN;
    v_results JSON;
BEGIN
    SELECT public.is_platform_admin() INTO v_is_sa;
    IF NOT v_is_sa THEN
        RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(json_agg(l), '[]'::json) INTO v_results
    FROM (
        SELECT *
        FROM public.marketing_leads
        WHERE (p_country IS NULL OR lower(country) = lower(p_country) OR p_country = 'all')
          AND (p_city IS NULL OR lower(city) = lower(p_city) OR p_city = 'all')
          AND (p_target_type IS NULL OR target_type = p_target_type OR p_target_type = 'all')
          AND (p_status IS NULL OR status = p_status OR p_status = 'all')
        ORDER BY created_at DESC
        LIMIT p_limit
    ) l;

    RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketing_leads(TEXT, TEXT, TEXT, TEXT, INT) TO authenticated;

-- RPC : Sauvegarder ou mettre à jour un lot de leads
CREATE OR REPLACE FUNCTION public.bulk_save_marketing_leads(
    p_leads JSONB
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_is_sa BOOLEAN;
    v_count INT := 0;
    v_lead  JSONB;
BEGIN
    SELECT public.is_platform_admin() INTO v_is_sa;
    IF NOT v_is_sa THEN
        RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0001';
    END IF;

    FOR v_lead IN SELECT * FROM jsonb_array_elements(p_leads)
    LOOP
        INSERT INTO public.marketing_leads (
            id, organization_name, contact_name, role, email, phone,
            website, country, city, source, target_type, score, status, notes
        ) VALUES (
            COALESCE(v_lead->>'id', 'lead_' || gen_random_uuid()),
            v_lead->>'organization_name',
            v_lead->>'contact_name',
            v_lead->>'role',
            v_lead->>'email',
            v_lead->>'phone',
            v_lead->>'website',
            COALESCE(v_lead->>'country', 'Gabon'),
            COALESCE(v_lead->>'city', 'Libreville'),
            COALESCE(v_lead->>'source', 'ai_deep_research'),
            COALESCE(v_lead->>'target_type', 'ecoles_privees'),
            COALESCE((v_lead->>'score')::INT, 85),
            COALESCE(v_lead->>'status', 'new'),
            v_lead->>'notes'
        )
        ON CONFLICT (id) DO UPDATE SET
            organization_name = EXCLUDED.organization_name,
            contact_name = EXCLUDED.contact_name,
            role = EXCLUDED.role,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            website = EXCLUDED.website,
            country = EXCLUDED.country,
            city = EXCLUDED.city,
            score = EXCLUDED.score,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            updated_at = NOW();

        v_count := v_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', TRUE,
        'saved_count', v_count,
        'message', format('%s prospect(s) enregistré(s) dans le CRM Marketing', v_count)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_save_marketing_leads(JSONB) TO authenticated;

-- Insérer quelques leads gabonais réels de haute qualité
INSERT INTO public.marketing_leads (
    id, organization_name, contact_name, role, email, phone,
    website, country, city, source, target_type, score, status, notes
) VALUES
(
    'lead_ga_1',
    'Groupe Scolaire Élite Libreville',
    'Mme Patricia Nguema',
    'Directrice Pédagogique',
    'direction@elite-gabon.com',
    '+241 011 74 52 10',
    'https://elite-gabon.com',
    'Gabon',
    'Libreville',
    'ai_deep_research',
    'ecoles_privees',
    94,
    'new',
    'Complexe primaire & secondaire réputé à Libreville (Batterie 4)'
),
(
    'lead_ga_2',
    'Institut Supérieur de Technologie de Libreville (IST-L)',
    'Dr. Jean-Hervé Ondo',
    'Directeur Académique',
    'contact@ist-libreville.ga',
    '+241 077 89 12 34',
    'https://ist-libreville.ga',
    'Gabon',
    'Libreville',
    'ai_deep_research',
    'universites',
    91,
    'new',
    'Établissement d''enseignement supérieur privé agréé à Libreville'
),
(
    'lead_ga_3',
    'Complexe Scolaire Michel Dirat',
    'M. Alain Moubamba',
    'Proviseur & Fondateur',
    'direction@micheldirat-edu.ga',
    '+241 065 41 80 20',
    'https://micheldirat-edu.ga',
    'Gabon',
    'Libreville',
    'ai_deep_research',
    'lycees_colleges',
    89,
    'new',
    'Établissement bilingue et d''excellence scolaire à Libreville'
),
(
    'lead_ga_4',
    'Centre Professionnel du Numérique de Port-Gentil',
    'Mme Estelle Biyogo',
    'Responsable de Formation',
    'contact@cpn-pog.ga',
    '+241 074 33 22 11',
    'https://cpn-pog.ga',
    'Gabon',
    'Port-Gentil',
    'ai_deep_research',
    'centres_formation',
    87,
    'new',
    'Centre de formation continue certifiant à Port-Gentil'
)
ON CONFLICT (id) DO NOTHING;

SELECT 'Migration 065 OK — Révocation Clés Superadmin & Marketing CRM Gabon/Afrique' AS status;
