-- ═══════════════════════════════════════════════════════════════════════
-- Migration 041: Dual PIN verification (plain-text + bcrypt) with auto-upgrade
-- Permet la vérification instantanée du PIN pour TOUS les étudiants/enseignants,
-- qu'il soit stocké en clair (inscription landing) ou déjà hashé bcrypt.
-- Auto-upgrade les PINs en clair vers bcrypt lors de la première validation réussie.
-- ═══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Update verify_pin RPC ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_pin(
    p_profile_id UUID,
    p_role       TEXT,
    p_pin        TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_stored_pin    TEXT;
    v_attempt_count INT;
    v_pin_ok        BOOLEAN := FALSE;
BEGIN
    -- Rate limiting (max 5 tentatives par 15 min)
    SELECT COUNT(*) INTO v_attempt_count
    FROM public.pin_attempts
    WHERE profile_id   = p_profile_id
      AND attempted_at > NOW() - INTERVAL '15 minutes';

    IF v_attempt_count >= 5 THEN
        RAISE EXCEPTION 'Trop de tentatives PIN. Veuillez patienter 15 minutes.'
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.pin_attempts (profile_id) VALUES (p_profile_id);

    IF p_role = 'teacher' THEN
        SELECT pin_code INTO v_stored_pin FROM public.teacher_profiles
        WHERE id = p_profile_id AND (pin_set = TRUE OR pin_code IS NOT NULL);
    ELSIF p_role = 'student' THEN
        SELECT pin_code INTO v_stored_pin FROM public.student_profiles
        WHERE id = p_profile_id AND (pin_set = TRUE OR pin_code IS NOT NULL);
    ELSE
        RAISE EXCEPTION 'Role invalide: %', p_role;
    END IF;

    IF v_stored_pin IS NULL OR v_stored_pin = '' THEN
        RETURN FALSE;
    END IF;

    -- Dual check: bcrypt ou plain text
    IF v_stored_pin LIKE '$2%' THEN
        v_pin_ok := (v_stored_pin = crypt(p_pin, v_stored_pin));
    ELSE
        v_pin_ok := (v_stored_pin = p_pin);
        IF v_pin_ok THEN
            -- Auto-upgrade vers bcrypt
            IF p_role = 'student' THEN
                UPDATE public.student_profiles SET pin_code = crypt(p_pin, gen_salt('bf')), pin_set = TRUE WHERE id = p_profile_id;
            ELSIF p_role = 'teacher' THEN
                UPDATE public.teacher_profiles SET pin_code = crypt(p_pin, gen_salt('bf')), pin_set = TRUE WHERE id = p_profile_id;
            END IF;
        END IF;
    END IF;

    RETURN v_pin_ok;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pin(UUID, TEXT, TEXT) TO anon, authenticated;


-- ── 2. Update verify_pin_and_create_session RPC ──────────────────────────
CREATE OR REPLACE FUNCTION public.verify_pin_and_create_session(
    p_profile_id UUID,
    p_role       TEXT,
    p_pin        TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_stored_pin    TEXT;
    v_org_id        UUID;
    v_attempt_count INT;
    v_token         TEXT;
    v_expires_at    TIMESTAMPTZ;
    v_pin_ok        BOOLEAN := FALSE;
BEGIN
    -- Rate limiting
    SELECT COUNT(*) INTO v_attempt_count
    FROM public.pin_attempts
    WHERE profile_id   = p_profile_id
      AND attempted_at > NOW() - INTERVAL '15 minutes';

    IF v_attempt_count >= 5 THEN
        RAISE EXCEPTION 'Trop de tentatives PIN. Veuillez patienter 15 minutes.'
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.pin_attempts (profile_id) VALUES (p_profile_id);

    IF p_role = 'teacher' THEN
        SELECT pin_code, organization_id INTO v_stored_pin, v_org_id
        FROM public.teacher_profiles
        WHERE id = p_profile_id AND (pin_set = TRUE OR pin_code IS NOT NULL);
    ELSIF p_role = 'student' THEN
        SELECT pin_code, organization_id INTO v_stored_pin, v_org_id
        FROM public.student_profiles
        WHERE id = p_profile_id AND (pin_set = TRUE OR pin_code IS NOT NULL);
    ELSE
        RAISE EXCEPTION 'Role invalide: %', p_role;
    END IF;

    IF v_stored_pin IS NULL OR v_stored_pin = '' THEN
        RETURN NULL;
    END IF;

    -- Dual check: bcrypt ou plain text
    IF v_stored_pin LIKE '$2%' THEN
        v_pin_ok := (v_stored_pin = crypt(p_pin, v_stored_pin));
    ELSE
        v_pin_ok := (v_stored_pin = p_pin);
        IF v_pin_ok THEN
            -- Auto-upgrade vers bcrypt
            IF p_role = 'student' THEN
                UPDATE public.student_profiles SET pin_code = crypt(p_pin, gen_salt('bf')), pin_set = TRUE WHERE id = p_profile_id;
            ELSIF p_role = 'teacher' THEN
                UPDATE public.teacher_profiles SET pin_code = crypt(p_pin, gen_salt('bf')), pin_set = TRUE WHERE id = p_profile_id;
            END IF;
        END IF;
    END IF;

    IF NOT v_pin_ok THEN
        RETURN NULL;
    END IF;

    -- Générer session_token (64 chars hex)
    v_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := NOW() + INTERVAL '8 hours';

    INSERT INTO public.active_sessions (
        session_token, profile_id, role, organization_id, expires_at
    ) VALUES (
        v_token, p_profile_id, p_role, v_org_id, v_expires_at
    );

    RETURN json_build_object(
        'session_token', v_token,
        'profile_id',    p_profile_id,
        'role',          p_role,
        'org_id',        v_org_id,
        'expires_at',    v_expires_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pin_and_create_session(UUID, TEXT, TEXT) TO anon, authenticated;
