-- ═══════════════════════════════════════════════════════════════════════
-- Fix Chat DM : remplacer les politiques admin_only par des politiques
-- ouvertes (le projet utilise auth custom, pas Supabase Auth)
-- + Ajouter placement_zone sur advertisements
-- À exécuter dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. FIX chat_messages ─────────────────────────────────────────────
DROP POLICY IF EXISTS "chat_messages_admin_only" ON public.chat_messages;

CREATE POLICY "chat_messages_open"
    ON public.chat_messages FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- ── 2. FIX chat_conversations ─────────────────────────────────────────
DROP POLICY IF EXISTS "chat_conversations_admin_only" ON public.chat_conversations;

CREATE POLICY "chat_conversations_open"
    ON public.chat_conversations FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- ── 3. FIX chat_participants ──────────────────────────────────────────
DROP POLICY IF EXISTS "chat_participants_admin_only" ON public.chat_participants;

CREATE POLICY "chat_participants_open"
    ON public.chat_participants FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- ── 4. Ajouter placement_zone sur advertisements ──────────────────────
ALTER TABLE public.advertisements
    ADD COLUMN IF NOT EXISTS placement_zone TEXT DEFAULT 'feed'
        CHECK (placement_zone IN ('feed','banner','story','popup','sidebar','rewarded'));

-- ── 5. Vérification finale ────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('chat_messages', 'chat_conversations', 'chat_participants')
ORDER BY tablename, policyname;
