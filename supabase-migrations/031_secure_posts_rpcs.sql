-- ============================================================
-- CampusFlow — Migration 031 : RPCs sécurisées school_posts
-- ============================================================
-- DÉPEND DE : Migration 030 (session_tokens + resolve_session)
-- ============================================================

-- ── 1. REMPLACER LES POLITIQUES RLS OUVERTES ──────────────

DROP POLICY IF EXISTS "school_posts_read"   ON public.school_posts;
DROP POLICY IF EXISTS "school_posts_insert" ON public.school_posts;
DROP POLICY IF EXISTS "school_posts_update" ON public.school_posts;
DROP POLICY IF EXISTS "school_posts_delete" ON public.school_posts;
DROP POLICY IF EXISTS "school_posts_rpc_only" ON public.school_posts;
DROP POLICY IF EXISTS "school_posts_admin_read" ON public.school_posts;
DROP POLICY IF EXISTS "school_posts_admin_write" ON public.school_posts;

-- Accès direct bloqué pour anon — passer par les RPCs
CREATE POLICY "school_posts_block_direct_anon"
    ON public.school_posts FOR ALL TO anon
    USING (false);

-- Admin (owner) peut tout faire directement
CREATE POLICY "school_posts_admin_all"
    ON public.school_posts FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = school_posts.organization_id
            AND owner_id = auth.uid()
        )
    );


-- ── 2. get_school_posts ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_school_posts(
    p_token  TEXT,
    p_limit  INT DEFAULT 50,
    p_offset INT DEFAULT 0
) RETURNS SETOF public.school_posts
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id   UUID;
    v_profile_type TEXT;
    v_org_id       UUID;
BEGIN
    SELECT v_profile_id, v_profile_type, v_org_id
    INTO v_profile_id, v_profile_type, v_org_id
    FROM public.resolve_session(p_token);

    RETURN QUERY
    SELECT * FROM public.school_posts
    WHERE organization_id = v_org_id
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_posts(TEXT, INT, INT) TO anon, authenticated;


-- ── 3. create_school_post ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_school_post(
    p_token   TEXT,
    p_content TEXT,
    p_photos  TEXT[] DEFAULT '{}'
) RETURNS public.school_posts
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id   UUID;
    v_profile_type TEXT;
    v_org_id       UUID;
    v_new_post     public.school_posts;
BEGIN
    SELECT v_profile_id, v_profile_type, v_org_id
    INTO v_profile_id, v_profile_type, v_org_id
    FROM public.resolve_session(p_token);

    IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
        RAISE EXCEPTION 'Post content cannot be empty';
    END IF;
    IF length(p_content) > 5000 THEN
        RAISE EXCEPTION 'Post content too long (max 5000 chars)';
    END IF;

    INSERT INTO public.school_posts (
        organization_id, user_id, user_type, content, photos
    ) VALUES (
        v_org_id, v_profile_id, v_profile_type,
        trim(p_content), COALESCE(p_photos, '{}')
    )
    RETURNING * INTO v_new_post;

    RETURN v_new_post;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_school_post(TEXT, TEXT, TEXT[]) TO anon, authenticated;


-- ── 4. update_school_post (auteur seulement) ──────────────

CREATE OR REPLACE FUNCTION public.update_school_post(
    p_token   TEXT,
    p_post_id UUID,
    p_content TEXT,
    p_photos  TEXT[] DEFAULT NULL
) RETURNS public.school_posts
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id   UUID;
    v_profile_type TEXT;
    v_org_id       UUID;
    v_updated      public.school_posts;
BEGIN
    SELECT v_profile_id, v_profile_type, v_org_id
    INTO v_profile_id, v_profile_type, v_org_id
    FROM public.resolve_session(p_token);

    IF NOT EXISTS (
        SELECT 1 FROM public.school_posts
        WHERE id = p_post_id AND user_id = v_profile_id AND organization_id = v_org_id
    ) THEN
        RAISE EXCEPTION 'Post not found or you are not the author' USING ERRCODE = 'P0005';
    END IF;

    IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
        RAISE EXCEPTION 'Post content cannot be empty';
    END IF;

    UPDATE public.school_posts
    SET content = trim(p_content),
        photos  = COALESCE(p_photos, photos),
        updated_at = NOW()
    WHERE id = p_post_id
    RETURNING * INTO v_updated;

    RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_school_post(TEXT, UUID, TEXT, TEXT[]) TO anon, authenticated;


-- ── 5. delete_school_post (auteur seulement) ──────────────

CREATE OR REPLACE FUNCTION public.delete_school_post(
    p_token   TEXT,
    p_post_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id   UUID;
    v_profile_type TEXT;
    v_org_id       UUID;
BEGIN
    SELECT v_profile_id, v_profile_type, v_org_id
    INTO v_profile_id, v_profile_type, v_org_id
    FROM public.resolve_session(p_token);

    DELETE FROM public.school_posts
    WHERE id = p_post_id AND user_id = v_profile_id AND organization_id = v_org_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Post not found or you are not the author' USING ERRCODE = 'P0005';
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_school_post(TEXT, UUID) TO anon, authenticated;


-- ── 6. toggle_like_post ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.toggle_like_post(
    p_token   TEXT,
    p_post_id UUID
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id    UUID;
    v_profile_type  TEXT;
    v_org_id        UUID;
    v_liked_by      UUID[];
    v_already_liked BOOLEAN;
    v_new_count     INT;
BEGIN
    SELECT v_profile_id, v_profile_type, v_org_id
    INTO v_profile_id, v_profile_type, v_org_id
    FROM public.resolve_session(p_token);

    SELECT liked_by INTO v_liked_by
    FROM public.school_posts
    WHERE id = p_post_id AND organization_id = v_org_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0006';
    END IF;

    v_already_liked := (v_profile_id = ANY(COALESCE(v_liked_by, '{}'::UUID[])));

    IF v_already_liked THEN
        UPDATE public.school_posts
        SET liked_by   = array_remove(liked_by, v_profile_id),
            like_count = GREATEST(0, like_count - 1)
        WHERE id = p_post_id RETURNING like_count INTO v_new_count;
    ELSE
        UPDATE public.school_posts
        SET liked_by   = array_append(COALESCE(liked_by, '{}'::UUID[]), v_profile_id),
            like_count = like_count + 1
        WHERE id = p_post_id RETURNING like_count INTO v_new_count;
    END IF;

    RETURN json_build_object('liked', NOT v_already_liked, 'like_count', v_new_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_like_post(TEXT, UUID) TO anon, authenticated;
