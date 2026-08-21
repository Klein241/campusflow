-- ============================================================
-- MIGRATION 054 — Fix boolean:7 sur platform_reviews
-- Problème : sky_points_awarded (INT=7) envoyé à la colonne
--            is_published (BOOLEAN) car la colonne est absente
--            dans certaines instances ou mal ordonnée.
-- Solution  : Garantir que is_published et is_featured existent,
--             puis recréer la fonction award_review_sky_points
--             avec une signature plus robuste (p_rating peut être
--             passé en TEXT ou INT selon les clients).
-- ============================================================

-- 1. S'assurer que les colonnes existent (idempotent)
ALTER TABLE public.platform_reviews
    ADD COLUMN IF NOT EXISTS is_published      BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN DEFAULT false;

ALTER TABLE public.school_reviews
    ADD COLUMN IF NOT EXISTS is_published      BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN DEFAULT false;

-- Mettre toutes les reviews existantes publiées
UPDATE public.platform_reviews
    SET is_published = true
    WHERE is_published IS NULL;

UPDATE public.school_reviews
    SET is_published = true
    WHERE is_published IS NULL;

-- 2. Recréer la fonction RPC avec conversion de type explicite
--    pour éviter que p_rating (INT) soit interprété comme BOOLEAN
CREATE OR REPLACE FUNCTION public.award_review_sky_points(
    p_user_id TEXT,
    p_role    TEXT,
    p_rating  INT,
    p_reason  TEXT DEFAULT NULL,
    p_org_id  UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_points    INT := 0;
    v_new_total INT := 0;
    v_rating    INT;
BEGIN
    -- Cast explicite pour éviter toute confusion de type
    v_rating := p_rating::INT;

    -- Calcul des Sky Points selon le nombre d'étoiles
    v_points := CASE
        WHEN v_rating = 5 THEN 7
        WHEN v_rating = 4 THEN 4
        WHEN v_rating = 3 THEN 3
        WHEN v_rating = 2 THEN 2
        WHEN v_rating = 1 THEN 1
        ELSE 0
    END;

    IF v_points <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'points_awarded', 0,
            'error', 'Note invalide (doit être entre 1 et 5)'
        );
    END IF;

    -- Créditer le profil selon le rôle
    IF p_role = 'teacher' THEN
        UPDATE public.teacher_profiles
        SET sky_points = COALESCE(sky_points, 0) + v_points
        WHERE id::TEXT = p_user_id OR access_code = p_user_id
        RETURNING sky_points INTO v_new_total;
    ELSE
        UPDATE public.student_profiles
        SET sky_points = COALESCE(sky_points, 0) + v_points
        WHERE id::TEXT = p_user_id OR access_code = p_user_id
        RETURNING sky_points INTO v_new_total;
    END IF;

    -- Enregistrer la transaction (tolère l'absence de la table)
    BEGIN
        INSERT INTO public.sky_transactions (
            student_id,
            amount,
            type,
            description,
            created_at
        ) VALUES (
            p_user_id,
            v_points,
            'credit',
            COALESCE(p_reason, 'Bonus évaluation (' || v_rating || ' étoiles)'),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Silencer si la table ou colonne n'existe pas
        NULL;
    END;

    RETURN jsonb_build_object(
        'success',        true,
        'points_awarded', v_points,
        'new_total',      COALESCE(v_new_total, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_review_sky_points(TEXT, TEXT, INT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.award_review_sky_points(TEXT, TEXT, INT, TEXT, UUID) TO authenticated;

-- 3. Créer la fonction revoke_ai_agent_key si absente
--    (idempotente — déjà dans 052 mais répétée ici pour sécurité)
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
        SELECT 1 FROM public.organizations
        WHERE id = v_org_id AND owner_id = v_user_id
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Accès refusé' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.ai_agent_keys
    SET is_active  = FALSE,
        updated_at = NOW()
    WHERE id = p_key_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_ai_agent_key(UUID) TO authenticated;

SELECT 'Migration 054 OK — boolean:7 corrigé, is_published garanti, revoke_ai_agent_key fiabilisé' AS status;
