-- ═══════════════════════════════════════════════════════════════════════
-- Migration 040: Hash des PINs en clair + RPC upsert_student_from_inscription
-- Problème : la migration 039 a inséré les pin_code EN CLAIR depuis
-- inscription_requests. La RPC verify_pin_and_create_session utilise bcrypt
-- (crypt/gen_salt pgcrypto), donc la comparaison échoue toujours.
-- Solution :
--   1. Hasher tous les PINs en clair existants dans student_profiles
--   2. Créer une RPC upsert_student_from_inscription pour les futurs inserts
-- ═══════════════════════════════════════════════════════════════════════

-- 1. S'assurer que pgcrypto est activé
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Hasher les PINs en clair dans student_profiles
--    (ceux qui ne commencent pas déjà par '$2' = bcrypt hash)
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT id, pin_code
        FROM public.student_profiles
        WHERE pin_code IS NOT NULL
          AND pin_code != ''
          AND pin_code NOT LIKE '$2%'
          AND length(pin_code) <= 10  -- PINs en clair = courts (4 chiffres)
    LOOP
        UPDATE public.student_profiles
        SET pin_code = crypt(rec.pin_code, gen_salt('bf'))
        WHERE id = rec.id;
    END LOOP;
END;
$$;

-- 3. RPC : upsert_student_from_inscription
--    Crée ou récupère un student_profile depuis une inscription_request
--    avec le PIN correctement hashé via bcrypt.
--    Retourne le student_profile complet.
CREATE OR REPLACE FUNCTION public.upsert_student_from_inscription(
    p_access_code  TEXT,
    p_org_id       UUID
)
RETURNS TABLE (
    id              UUID,
    first_name      TEXT,
    last_name       TEXT,
    organization_id UUID,
    classroom_id    UUID,
    approval_status TEXT,
    pin_set         BOOLEAN,
    sky_points      INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ir        RECORD;
    v_sp        RECORD;
    v_mat       TEXT;
BEGIN
    -- Chercher d'abord si le student_profile existe déjà
    SELECT * INTO v_sp
    FROM public.student_profiles
    WHERE access_code = p_access_code
      AND organization_id = p_org_id
    LIMIT 1;

    IF FOUND THEN
        -- Déjà existant, le retourner directement
        RETURN QUERY
        SELECT v_sp.id, v_sp.first_name, v_sp.last_name,
               v_sp.organization_id, v_sp.classroom_id,
               v_sp.approval_status, v_sp.pin_set, v_sp.sky_points;
        RETURN;
    END IF;

    -- Pas encore de student_profile → chercher dans inscription_requests
    SELECT * INTO v_ir
    FROM public.inscription_requests
    WHERE access_code = p_access_code
      AND organization_id = p_org_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN; -- Rien trouvé → retourne vide
    END IF;

    -- Générer matricule
    v_mat := 'STU-' || upper(substring(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));

    -- Insérer avec PIN hashé via bcrypt
    INSERT INTO public.student_profiles (
        organization_id,
        first_name,
        last_name,
        phone,
        email,
        address,
        birth_date,
        gender,
        classroom_id,
        filiere_id,
        access_code,
        pin_code,
        pin_set,
        sky_points,
        is_active,
        approval_status,
        matricule,
        nationality,
        guardian_name,
        guardian_phone
    ) VALUES (
        v_ir.organization_id,
        v_ir.first_name,
        v_ir.last_name,
        v_ir.phone,
        v_ir.email,
        v_ir.address,
        v_ir.birth_date,
        v_ir.gender,
        v_ir.classroom_id,
        v_ir.filiere_id,
        v_ir.access_code,
        -- Hash le PIN avec bcrypt seulement s'il est en clair
        CASE
            WHEN v_ir.pin_code IS NOT NULL AND v_ir.pin_code NOT LIKE '$2%'
            THEN crypt(v_ir.pin_code, gen_salt('bf'))
            ELSE v_ir.pin_code
        END,
        TRUE,
        100,
        TRUE,
        COALESCE(v_ir.status, 'pending'),
        v_mat,
        v_ir.nationality,
        v_ir.guardian_name,
        v_ir.guardian_phone
    )
    ON CONFLICT (access_code) DO NOTHING
    RETURNING * INTO v_sp;

    -- Si l'INSERT a réussi, retourner le nouveau profil
    IF v_sp.id IS NOT NULL THEN
        RETURN QUERY
        SELECT v_sp.id, v_sp.first_name, v_sp.last_name,
               v_sp.organization_id, v_sp.classroom_id,
               v_sp.approval_status, v_sp.pin_set, v_sp.sky_points;
    ELSE
        -- Conflit d'access_code : récupérer l'existant
        RETURN QUERY
        SELECT sp.id, sp.first_name, sp.last_name,
               sp.organization_id, sp.classroom_id,
               sp.approval_status, sp.pin_set, sp.sky_points
        FROM public.student_profiles sp
        WHERE sp.access_code = p_access_code
          AND sp.organization_id = p_org_id
        LIMIT 1;
    END IF;
END;
$$;

-- 4. Droits d'accès
GRANT EXECUTE ON FUNCTION public.upsert_student_from_inscription(TEXT, UUID) TO anon, authenticated;
