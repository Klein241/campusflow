-- ═══════════════════════════════════════════════════════════════════
-- Migration: Group chat enhancements
-- - message_reactions : réactions emoji sur les messages
-- - soft delete pour les messages (deleted_at)
-- - admin_role dans chat_participants (déjà existe, on vérifie)
-- ═══════════════════════════════════════════════════════════════════

-- Table des réactions emoji
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      UUID NOT NULL,
    user_id         UUID NOT NULL,
    emoji           TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON public.message_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user    ON public.message_reactions (user_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions_all" ON public.message_reactions;
CREATE POLICY "reactions_all"
    ON public.message_reactions FOR ALL
    USING  (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

GRANT ALL ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;

-- Soft delete sur les messages (colonne deleted_at)
ALTER TABLE public.chat_messages
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- S'assurer que chat_participants.role existe et peut prendre 'admin'
ALTER TABLE public.chat_participants
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- Pinned messages dans chat_conversations
ALTER TABLE public.chat_conversations
    ADD COLUMN IF NOT EXISTS pinned_message_id UUID;
