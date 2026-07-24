-- ══════════════════════════════════════════════════════════════
-- FIX: superadmin_credit_sky_request — ordre paramètres corrigé
-- Erreur: "Could not find the function public.superadmin_credit_sky_request
--          (p_points, p_request_id, p_response, p_role, p_user_id)"
-- La fonction doit accepter les paramètres dans n'importe quel ordre
-- car Supabase JS SDK les passe par nom.
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS superadmin_credit_sky_request(UUID, UUID, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS superadmin_credit_sky_request(INTEGER, UUID, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION superadmin_credit_sky_request(
    p_request_id    UUID,
    p_user_id       UUID,
    p_role          TEXT DEFAULT 'student',
    p_points        INTEGER DEFAULT 0,
    p_response      TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_new_balance INTEGER := 0;
BEGIN
    -- Créditer selon le rôle
    IF p_role = 'teacher' THEN
        UPDATE teacher_profiles
        SET sky_points = COALESCE(sky_points, 0) + p_points
        WHERE id = p_user_id
        RETURNING sky_points INTO v_new_balance;
    ELSE
        UPDATE student_profiles
        SET sky_points = COALESCE(sky_points, 0) + p_points
        WHERE id = p_user_id
        RETURNING sky_points INTO v_new_balance;
    END IF;

    -- Mettre à jour la demande
    UPDATE public.sky_point_requests SET
        status         = 'credited',
        response       = COALESCE(p_response, '✅ ' || p_points || ' Sky Points crédités ! Profitez-en 🎉'),
        responded_at   = NOW(),
        points_credited = p_points,
        credited_at    = NOW()
    WHERE id = p_request_id;

    RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_credit_sky_request(UUID, UUID, TEXT, INTEGER, TEXT)
    TO anon, authenticated, service_role;

-- ══════════════════════════════════════════════════════════════
-- FIX: Colonne image_url manquante dans tutoring_requests
-- ══════════════════════════════════════════════════════════════
ALTER TABLE tutoring_requests
    ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ══════════════════════════════════════════════════════════════
-- FIX: S'assurer que student_profiles et teacher_profiles
-- ont bien la colonne sky_points avec valeur par défaut
-- ══════════════════════════════════════════════════════════════
ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS sky_points INTEGER NOT NULL DEFAULT 100;

ALTER TABLE teacher_profiles
    ADD COLUMN IF NOT EXISTS sky_points INTEGER NOT NULL DEFAULT 100;

-- Attribuer 100 pts à tous ceux qui ont NULL
UPDATE student_profiles SET sky_points = 100 WHERE sky_points IS NULL;
UPDATE teacher_profiles  SET sky_points = 100 WHERE sky_points IS NULL;
