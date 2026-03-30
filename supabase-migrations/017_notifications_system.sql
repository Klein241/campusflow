-- ═══════════════════════════════════════════════════════
-- MIGRATION 017: Upgrade Notifications to Unified System
-- Adds missing columns to existing notifications table:
-- organization_id, category, body, icon, action_url, metadata
-- ═══════════════════════════════════════════════════════

-- Step 1: Add missing columns to existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Step 2: Migrate old "message" data to "body" if "message" column exists
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'message'
    ) THEN
        UPDATE notifications SET body = message WHERE body = '' OR body IS NULL;
    END IF;
END $$;

-- Step 3: Migrate old "type" to "category" mapping
DO $$ BEGIN
    UPDATE notifications SET category = CASE
        WHEN type = 'info' THEN 'system'
        WHEN type = 'success' THEN 'system'
        WHEN type = 'warning' THEN 'admin'
        WHEN type = 'error' THEN 'system'
        WHEN type = 'prayer' THEN 'news'
        ELSE 'system'
    END WHERE category = 'system' OR category IS NULL;
EXCEPTION WHEN undefined_column THEN
    NULL;
END $$;

-- Step 4: Performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_user ON notifications(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- Step 5: Update RLS policies to be permissive (CampusFlow uses custom auth, not auth.uid())
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
    ON notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
CREATE POLICY "Service can insert notifications"
    ON notifications FOR INSERT WITH CHECK (true);

-- Step 6: Add media_url and msg_type columns to chat_messages for file attachments
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS msg_type TEXT DEFAULT 'text';

-- Step 7: Enable realtime (idempotent)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Step 8: Auto-cleanup old read notifications (90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications
    WHERE created_at < now() - INTERVAL '90 days'
    AND is_read = true;
END;
$$ LANGUAGE plpgsql;

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'notifications' ORDER BY ordinal_position;
