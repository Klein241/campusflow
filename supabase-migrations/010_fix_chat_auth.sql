-- ═══════════════════════════════════════════════════════
-- CAMPUSFLOW — Migration 010: Fix chat for access-code auth
-- Remove auth.users FK constraints on chat tables
-- Add open RLS policies for access-code users
-- ═══════════════════════════════════════════════════════

-- 1. DROP existing FK constraints that reference auth.users
ALTER TABLE IF EXISTS public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;
ALTER TABLE IF EXISTS public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE IF EXISTS public.chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_created_by_fkey;

-- 2. Re-add constraints WITHOUT references to auth.users (just UUID columns, no FK)
-- user_id, sender_id, created_by are now just UUID fields pointing to teacher_profiles.id or student_profiles.id
-- No FK enforcement since ids come from different tables

-- 3. Fix RLS — open policies for anon/authenticated since users use access_code auth
-- chat_conversations
DROP POLICY IF EXISTS "conv_read" ON public.chat_conversations;
CREATE POLICY "conv_read" ON public.chat_conversations FOR SELECT USING (true);

DROP POLICY IF EXISTS "conv_insert" ON public.chat_conversations;
CREATE POLICY "conv_insert" ON public.chat_conversations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "conv_delete" ON public.chat_conversations;
CREATE POLICY "conv_delete" ON public.chat_conversations FOR DELETE USING (true);

DROP POLICY IF EXISTS "conv_update" ON public.chat_conversations;
CREATE POLICY "conv_update" ON public.chat_conversations FOR UPDATE USING (true);

-- chat_participants
DROP POLICY IF EXISTS "part_read" ON public.chat_participants;
CREATE POLICY "part_read" ON public.chat_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "part_insert" ON public.chat_participants;
CREATE POLICY "part_insert" ON public.chat_participants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "part_delete" ON public.chat_participants;
CREATE POLICY "part_delete" ON public.chat_participants FOR DELETE USING (true);

DROP POLICY IF EXISTS "part_update" ON public.chat_participants;
CREATE POLICY "part_update" ON public.chat_participants FOR UPDATE USING (true);

-- chat_messages
DROP POLICY IF EXISTS "msg_read" ON public.chat_messages;
CREATE POLICY "msg_read" ON public.chat_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "msg_insert" ON public.chat_messages;
CREATE POLICY "msg_insert" ON public.chat_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "msg_update" ON public.chat_messages;
CREATE POLICY "msg_update" ON public.chat_messages FOR UPDATE USING (true);

DROP POLICY IF EXISTS "msg_delete" ON public.chat_messages;
CREATE POLICY "msg_delete" ON public.chat_messages FOR DELETE USING (true);

-- 4. Drop the unique constraint if it causes issues (user_id is now profile_id, not auth.users.id)
-- Re-create it without FK
ALTER TABLE IF EXISTS public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_conversation_id_user_id_key;
ALTER TABLE IF EXISTS public.chat_participants ADD CONSTRAINT chat_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);

-- 5. Ensure realtime is enabled
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
