-- ==============================================================================
-- 078: CORRECTIF DEFINITIF — RLS + RPC SUPERADMIN UPDATE ORG
-- Applique en force la politique RLS et recrée le RPC avec SECURITY DEFINER
-- À coller dans l'éditeur SQL de Supabase → Run
-- ==============================================================================

-- 1. Supprimer et recréer la politique RLS superadmin sur organizations
DROP POLICY IF EXISTS "organizations_superadmin_all" ON public.organizations;
DROP POLICY IF EXISTS "superadmin_can_update_orgs" ON public.organizations;
DROP POLICY IF EXISTS "platform_admin_full_access" ON public.organizations;

CREATE POLICY "organizations_superadmin_all" ON public.organizations
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

-- 2. Recréer le RPC avec SECURITY DEFINER (bypass RLS garanti)
CREATE OR REPLACE FUNCTION public.superadmin_update_org(
    p_org_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_type TEXT,
    p_school_type TEXT,
    p_city TEXT,
    p_country TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_custom_domain TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_norm_type TEXT;
    v_new_slug TEXT;
    v_res JSON;
BEGIN
    -- Vérification des privilèges Superadmin
    IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Non autorisé — réservé aux administrateurs de la plateforme';
    END IF;

    -- Normalisation du type enum DB
    v_norm_type := LOWER(TRIM(COALESCE(p_type, '')));
    IF v_norm_type IN ('lycée', 'lycee', 'k12_school') THEN
        v_norm_type := 'lycee';
    ELSIF v_norm_type IN ('collège', 'college') THEN
        v_norm_type := 'college';
    ELSIF v_norm_type IN ('université', 'universite') THEN
        v_norm_type := 'universite';
    ELSIF v_norm_type IN ('centre de formation', 'centre_formation', 'academie_en_ligne', 'formateur_independant', 'formation') THEN
        v_norm_type := 'centre_formation';
    ELSIF v_norm_type IN ('institut') THEN
        v_norm_type := 'institut';
    ELSIF v_norm_type NOT IN ('college', 'lycee', 'universite', 'centre_formation', 'institut', 'autre') THEN
        v_norm_type := 'autre';
    END IF;

    v_new_slug := LOWER(TRIM(p_slug));

    -- Mise à jour directe dans organizations (SECURITY DEFINER bypass toute RLS)
    UPDATE public.organizations
    SET name = TRIM(p_name),
        slug = v_new_slug,
        type = v_norm_type,
        school_type = COALESCE(NULLIF(TRIM(p_school_type), ''), v_norm_type),
        city = TRIM(p_city),
        country = TRIM(p_country),
        phone = TRIM(p_phone),
        email = TRIM(p_email),
        custom_domain = NULLIF(TRIM(p_custom_domain), ''),
        updated_at = NOW()
    WHERE id = p_org_id;

    -- Cascade du nouveau slug sur les tables associées
    UPDATE public.student_profiles SET org_slug = v_new_slug WHERE organization_id = p_org_id;
    UPDATE public.teacher_profiles SET org_slug = v_new_slug WHERE organization_id = p_org_id;
    UPDATE public.student_pending_registrations SET org_slug = v_new_slug WHERE organization_id = p_org_id;
    UPDATE public.admin_recovery_requests SET org_slug = v_new_slug WHERE org_id = p_org_id;

    SELECT row_to_json(o) INTO v_res FROM public.organizations o WHERE o.id = p_org_id;
    RETURN json_build_object('success', true, 'org', v_res);
END;
$$;

GRANT EXECUTE ON FUNCTION public.superadmin_update_org(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 3. Vérification : lister les politiques actives sur organizations
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'organizations' ORDER BY policyname;
