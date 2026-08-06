-- ============================================================
-- CampusFlow — Migration 032 : RPCs sécurisées chat
-- ============================================================
-- Toutes les écritures sur chat_messages passent par des RPCs
-- SECURITY DEFINER qui vérifient le session_token ET la
-- participation de l'utilisateur à la conversation.
-- DÉPEND DE : Migration 030 (session_tokens + resolve_session)
-- ============================================================

-- ── 1. REMPLACER LES POLITIQUES OUVERTES DU CHAT ─────────

-- chat_messages
DROP POLICY IF EXISTS "msg_read_participant"   ON public.chat_messages;
DROP POLICY IF EXISTS "msg_insert_participant" ON public.chat_messages;
DROP POLICY IF EXISTS "msg_update_own"         ON public.chat_messages;
DROP POLICY IF EXISTS "msg_delete_own"         ON public.chat_messages;
DROP POLICY IF EXISTS "msg_read"   ON public.chat_messages;
DROP POLICY IF EXISTS "msg_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "msg_update" ON public.chat_messages;
DROP POLICY IF EXISTS "msg_delete" ON public.chat_messages;

-- Bloquer accès direct — uniquement via RPCs
CREATE POLICY "chat_messages_admin_only"
    ON public.chat_messages FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations cc
            JOIN public.organizations o ON o.id = cc.organization_id
            WHERE cc.id = chat_messages.conversation_id
              AND o.owner_id = auth.uid()
        )
    );

-- chat_conversations
DROP POLICY IF EXISTS "conv_read_org_scoped"    ON public.chat_conversations;
DROP POLICY IF EXISTS "conv_insert_org_scoped"  ON public.chat_conversations;
DROP POLICY IF EXISTS "conv_update_org_scoped"  ON public.chat_conversations;
DROP POLICY IF EXISTS "conv_delete_creator_only" ON public.chat_conversations;

CREATE POLICY "chat_conversations_admin_only"
    ON public.chat_conversations FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = chat_conversations.organization_id
              AND owner_id = auth.uid()
        )
    );

-- chat_participants
DROP POLICY IF EXISTS "part_read_org_scoped"  ON public.chat_participants;
DROP POLICY IF EXISTS "part_insert_org_scoped" ON public.chat_participants;
DROP POLICY IF EXISTS "part_update_self"       ON public.chat_participants;
DROP POLICY IF EXISTS "part_delete_allowed"    ON public.chat_participants;

CREATE POLICY "chat_participants_admin_only"
    ON public.chat_participants FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations cc
            JOIN public.organizations o ON o.id = cc.organization_id
            WHERE cc.id = chat_participants.conversation_id
              AND o.owner_id = auth.uid()
        )
    );


-- ── 2. get_chat_messages — lecture sécurisée ─────────────
-- Vérifie que l'utilisateur participe à la conversation

CREATE OR REPLACE FUNCTION public.get_chat_messages(
    p_token           TEXT,
    p_conversation_id UUID,
    p_limit           INT DEFAULT 50,
    p_before_id       UUID DEFAULT NULL
) RETURNS SETOF public.chat_messages
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id   UUID;
    v_profile_type TEXT;
    v_org_id       UUID;
BEGIN
    SELECT v_profile_id, v_profile_type, v_org_id
    INTO v_profile_id, v_profile_type, v_org_id
    FROM public.resolve_session(p_token);

    -- Vérifier que l'utilisateur est participant
    IF NOT EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE conversation_id = p_conversation_id
          AND user_id = v_profile_id
    ) THEN
        RAISE EXCEPTION 'You are not a participant of this conversation'
            USING ERRCODE = 'P0007';
    END IF;

    -- Vérifier que la conversation appartient à l'org du token
    IF NOT EXISTS (
        SELECT 1 FROM public.chat_conversations
        WHERE id = p_conversation_id
          AND organization_id = v_org_id
    ) THEN
        RAISE EXCEPTION 'Conversation not found in your organization'
            USING ERRCODE = 'P0008';
    END IF;

    RETURN QUERY
    SELECT * FROM public.chat_messages
    WHERE conversation_id = p_conversation_id
      AND (p_before_id IS NULL OR id < p_before_id)
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_messages(TEXT, UUID, INT, UUID) TO anon, authenticated;


-- ── 3. send_chat_message — envoi sécurisé ────────────────

CREATE OR REPLACE FUNCTION public.send_chat_message(
    p_token           TEXT,
    p_conversation_id UUID,
    p_content         TEXT,
    p_type            TEXT DEFAULT 'text'
) RETURNS public.chat_messages
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_profile_id   UUID;
    v_profile_type TEXT;
    v_org_id       UUID;
    v_new_msg      public.chat_messages;
BEGIN
    SELECT v_profile_id, v_profile_type, v_org_id
    INTO v_profile_id, v_profile_type, v_org_id
    FROM public.resolve_session(p_token);

    -- Validation contenu
    IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
        RAISE EXCEPTION 'Message content cannot be empty';
    END IF;
    IF length(p_content) > 10000 THEN
        RAISE EXCEPTION 'Message too long (max 10000 chars)';
    END IF;

    -- Valider le type
    IF p_type NOT IN ('text', 'image', 'audio', 'file', 'system') THEN
        RAISE EXCEPTION 'Invalid message type: %', p_type;
    END IF;

    -- Vérifier participation ET appartenance à l'org
    IF NOT EXISTS (
        SELECT 1 FROM public.chat_participants cp
        JOIN public.chat_conversations cc ON cc.id = cp.conversation_id
        WHERE cp.conversation_id = p_conversation_id
          AND cp.user_id = v_profile_id
          AND cc.organization_id = v_org_id
    ) THEN
        RAISE EXCEPTION 'You are not a participant of this conversation'
            USING ERRCODE = 'P0007';
    END IF;

    INSERT INTO public.chat_messages (
        conversation_id,
        sender_id,
        content,
        type
    ) VALUES (
        p_conversation_id,
        v_profile_id,
        trim(p_content),
        p_type
    )
    RETURNING * INTO v_new_msg;

    -- Mettre à jour last_message_at sur la conversation
    UPDATE public.chat_conversations
    SET last_message_at = NOW(),
        last_message    = left(trim(p_content), 100)
    WHERE id = p_conversation_id;

    RETURN v_new_msg;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_chat_message(TEXT, UUID, TEXT, TEXT) TO anon, authenticated;


-- ── 4. delete_chat_message — suppression (auteur seulement) ─

CREATE OR REPLACE FUNCTION public.delete_chat_message(
    p_token      TEXT,
    p_message_id UUID
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

    DELETE FROM public.chat_messages
    WHERE id = p_message_id
      AND sender_id = v_profile_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found or you are not the sender'
            USING ERRCODE = 'P0009';
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_chat_message(TEXT, UUID) TO anon, authenticated;


-- ── 5. invalidate_session — déconnexion propre ────────────

CREATE OR REPLACE FUNCTION public.invalidate_session(
    p_token TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.session_tokens
    SET is_active = FALSE
    WHERE token = p_token;

    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invalidate_session(TEXT) TO anon, authenticated;
