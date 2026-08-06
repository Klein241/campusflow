-- ============================================================
-- CampusFlow — Migration 030 : Correctifs sécurité critiques
-- ============================================================
-- Ordre d'exécution :
--   1. Révoquer les GRANT ALL TO anon dangereux
--   2. Activer pgcrypto + hasher les PINs existants
--   3. Créer pin_attempts (rate limiting)
--   4. Créer session_tokens
--   5. Remplacer verify_pin + set_pin par versions bcrypt
--   6. Créer verify_pin_and_create_session
--   7. Créer resolve_session (helper interne)
-- ============================================================

-- ── 1. RÉVOQUER LES GRANTS DANGEREUX ──────────────────────

REVOKE ALL ON public.school_posts        FROM anon;
REVOKE ALL ON public.teacher_curricula   FROM anon;
REVOKE ALL ON public.chat_conversations  FROM anon;
REVOKE ALL ON public.chat_messages       FROM anon;
REVOKE ALL ON public.chat_participants   FROM anon;

-- Lectures minimalistes pour anon (RPCs feront le vrai filtrage)
GRANT SELECT ON public.school_posts       TO anon;
GRANT SELECT ON public.chat_conversations TO anon;
GRANT SELECT ON public.chat_messages      TO anon;
GRANT SELECT ON public.chat_participants  TO anon;

-- Droits complets pour authenticated (admin/owner via supabase.auth)
GRANT ALL ON public.school_posts        TO authenticated;
GRANT ALL ON public.teacher_curricula   TO authenticated;
GRANT ALL ON public.chat_conversations  TO authenticated;
GRANT ALL ON public.chat_messages       TO authenticated;
GRANT ALL ON public.chat_participants   TO authenticated;


-- ── 2. ACTIVER PGCRYPTO + HASHER LES PINS EXISTANTS ───────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ⚠️ FIX CRITIQUE : pin_code était VARCHAR(4) — bcrypt produit 60 chars
-- On élargit la colonne AVANT de hasher, sinon : "value too long for VARCHAR(4)"
ALTER TABLE public.teacher_profiles
    ALTER COLUMN pin_code TYPE TEXT;

ALTER TABLE public.student_profiles
    ALTER COLUMN pin_code TYPE TEXT;

-- Hasher les PINs teachers existants (en clair → bcrypt)
-- ATTENTION : irréversible — exécuter UNE SEULE FOIS
DO $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN
        SELECT id, pin_code FROM public.teacher_profiles
        WHERE pin_code IS NOT NULL AND pin_set = TRUE
          AND pin_code NOT LIKE '$2%'   -- déjà hashé si commence par $2
    LOOP
        UPDATE public.teacher_profiles
        SET pin_code = crypt(rec.pin_code, gen_salt('bf', 10))
        WHERE id = rec.id;
    END LOOP;
END;
$$;

-- Hasher les PINs students existants
DO $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN
        SELECT id, pin_code FROM public.student_profiles
        WHERE pin_code IS NOT NULL AND pin_set = TRUE
          AND pin_code NOT LIKE '$2%'
    LOOP
        UPDATE public.student_profiles
        SET pin_code = crypt(rec.pin_code, gen_salt('bf', 10))
        WHERE id = rec.id;
    END LOOP;
END;
$$;


-- ── 3. TABLE PIN_ATTEMPTS (rate limiting) ─────────────────

CREATE TABLE IF NOT EXISTS public.pin_attempts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id   UUID        NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pin_attempts_profile_time
    ON public.pin_attempts (profile_id, attempted_at DESC);

ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pin_attempts_no_direct_access"
    ON public.pin_attempts FOR ALL USING (false);

-- Nettoyage des tentatives > 24h
CREATE OR REPLACE FUNCTION public.cleanup_pin_attempts()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
    DELETE FROM public.pin_attempts
    WHERE attempted_at < NOW() - INTERVAL '24 hours';
$$;


-- ── 4. TABLE SESSION_TOKENS ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_tokens (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    token           TEXT        NOT NULL UNIQUE
                                DEFAULT encode(gen_random_bytes(32), 'hex'),
    profile_id      UUID        NOT NULL,
    profile_type    TEXT        NOT NULL
                                CHECK (profile_type IN ('teacher','student','admin')),
    organization_id UUID        NOT NULL
                                REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '8 hours',
    last_used_at    TIMESTAMPTZ,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_session_tokens_token
    ON public.session_tokens (token) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_session_tokens_profile
    ON public.session_tokens (profile_id, expires_at DESC);

ALTER TABLE public.session_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_tokens_no_direct_access"
    ON public.session_tokens FOR ALL USING (false);

-- Nettoyage des sessions expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
    UPDATE public.session_tokens SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE;
$$;


-- ── 5. SET_PIN — version bcrypt ───────────────────────────

DROP FUNCTION IF EXISTS public.set_pin(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.set_pin(
    p_profile_id UUID,
    p_role       TEXT,
    p_pin        TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF p_pin !~ '^\d{4}$' THEN
        RAISE EXCEPTION 'PIN must be exactly 4 digits';
    END IF;

    IF p_role = 'teacher' THEN
        UPDATE public.teacher_profiles
        SET pin_code = crypt(p_pin, gen_salt('bf', 10)), pin_set = TRUE
        WHERE id = p_profile_id;
    ELSIF p_role = 'student' THEN
        UPDATE public.student_profiles
        SET pin_code = crypt(p_pin, gen_salt('bf', 10)), pin_set = TRUE
        WHERE id = p_profile_id;
    ELSE
        RAISE EXCEPTION 'Invalid role: %', p_role;
    END IF;

    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_pin(UUID, TEXT, TEXT) TO anon, authenticated;


-- ── 6. VERIFY_PIN — version bcrypt + rate limiting ────────

DROP FUNCTION IF EXISTS public.verify_pin(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_pin(
    p_profile_id UUID,
    p_role       TEXT,
    p_pin        TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_stored_pin    TEXT;
    v_attempt_count INT;
BEGIN
    SELECT COUNT(*) INTO v_attempt_count
    FROM public.pin_attempts
    WHERE profile_id   = p_profile_id
      AND attempted_at > NOW() - INTERVAL '15 minutes';

    IF v_attempt_count >= 5 THEN
        RAISE EXCEPTION 'Too many PIN attempts. Please wait 15 minutes.'
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.pin_attempts (profile_id) VALUES (p_profile_id);

    IF p_role = 'teacher' THEN
        SELECT pin_code INTO v_stored_pin FROM public.teacher_profiles
        WHERE id = p_profile_id AND pin_set = TRUE;
    ELSIF p_role = 'student' THEN
        SELECT pin_code INTO v_stored_pin FROM public.student_profiles
        WHERE id = p_profile_id AND pin_set = TRUE;
    ELSE
        RAISE EXCEPTION 'Invalid role: %', p_role;
    END IF;

    IF v_stored_pin IS NULL THEN RETURN FALSE; END IF;

    RETURN v_stored_pin = crypt(p_pin, v_stored_pin);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pin(UUID, TEXT, TEXT) TO anon, authenticated;


-- ── 7. VERIFY_PIN_AND_CREATE_SESSION ─────────────────────

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
BEGIN
    -- Rate limiting
    SELECT COUNT(*) INTO v_attempt_count
    FROM public.pin_attempts
    WHERE profile_id   = p_profile_id
      AND attempted_at > NOW() - INTERVAL '15 minutes';

    IF v_attempt_count >= 5 THEN
        RAISE EXCEPTION 'Too many PIN attempts. Please wait 15 minutes.'
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.pin_attempts (profile_id) VALUES (p_profile_id);

    -- Récupérer PIN + org
    IF p_role = 'teacher' THEN
        SELECT pin_code, organization_id INTO v_stored_pin, v_org_id
        FROM public.teacher_profiles
        WHERE id = p_profile_id AND pin_set = TRUE AND is_active = TRUE;
    ELSIF p_role = 'student' THEN
        SELECT pin_code, organization_id INTO v_stored_pin, v_org_id
        FROM public.student_profiles
        WHERE id = p_profile_id AND pin_set = TRUE AND is_active = TRUE;
    ELSE
        RAISE EXCEPTION 'Invalid role: %', p_role;
    END IF;

    IF v_stored_pin IS NULL OR v_org_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found or PIN not set'
            USING ERRCODE = 'P0002';
    END IF;

    -- Vérification bcrypt
    IF v_stored_pin != crypt(p_pin, v_stored_pin) THEN
        RAISE EXCEPTION 'Invalid PIN'
            USING ERRCODE = 'P0003';
    END IF;

    -- Invalider les anciennes sessions actives
    UPDATE public.session_tokens
    SET is_active = FALSE
    WHERE profile_id = p_profile_id AND is_active = TRUE;

    -- Créer la nouvelle session
    INSERT INTO public.session_tokens (profile_id, profile_type, organization_id)
    VALUES (p_profile_id, p_role, v_org_id)
    RETURNING token, expires_at INTO v_token, v_expires_at;

    RETURN json_build_object(
        'session_token', v_token,
        'profile_id',    p_profile_id,
        'role',          p_role,
        'org_id',        v_org_id,
        'expires_at',    v_expires_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pin_and_create_session(UUID, TEXT, TEXT)
    TO anon, authenticated;


-- ── 8. RESOLVE_SESSION — helper interne ──────────────────
-- NON exposé directement : appelé uniquement par les RPCs SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.resolve_session(
    p_token           TEXT,
    OUT v_profile_id  UUID,
    OUT v_profile_type TEXT,
    OUT v_org_id      UUID
) RETURNS RECORD LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    SELECT profile_id, profile_type, organization_id
    INTO v_profile_id, v_profile_type, v_org_id
    FROM public.session_tokens
    WHERE token      = p_token
      AND is_active  = TRUE
      AND expires_at > NOW();

    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired session token'
            USING ERRCODE = 'P0004';
    END IF;

    UPDATE public.session_tokens
    SET last_used_at = NOW()
    WHERE token = p_token;
END;
$$;

-- Pas d'accès direct à resolve_session depuis le client
REVOKE ALL ON FUNCTION public.resolve_session(TEXT) FROM anon, authenticated;
