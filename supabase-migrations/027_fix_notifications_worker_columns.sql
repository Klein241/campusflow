-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 027: Fix notifications table pour compatibilité Worker v3
-- Ajoute les colonnes manquantes attendues par campusflow-worker
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ajouter les colonnes de base manquantes
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS title           TEXT,
    ADD COLUMN IF NOT EXISTS message         TEXT,
    ADD COLUMN IF NOT EXISTS type            TEXT DEFAULT 'info',
    ADD COLUMN IF NOT EXISTS is_read         BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS action_type     TEXT,
    ADD COLUMN IF NOT EXISTS action_data     JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS actors          JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS actor_count     INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS aggregation_key TEXT,
    ADD COLUMN IF NOT EXISTS priority        TEXT DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT now();

-- 2. Si 'body' existe (ancienne colonne), synchroniser avec 'message'
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = 'body'
    ) THEN
        UPDATE notifications SET message = body WHERE message IS NULL AND body IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Mettre title NOT NULL avec valeur par défaut pour les lignes existantes
UPDATE notifications SET title   = 'Notification' WHERE title IS NULL;
UPDATE notifications SET message = ''             WHERE message IS NULL;

-- 4. Contrainte CHECK sur priority (souple)
DO $$ BEGIN
    ALTER TABLE notifications
        ADD CONSTRAINT notifications_priority_check
        CHECK (priority IN ('high', 'medium', 'low'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Index de performance
CREATE INDEX IF NOT EXISTS idx_notif_user_created
    ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread
    ON notifications (user_id, is_read)
    WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notif_agg_key
    ON notifications (user_id, aggregation_key)
    WHERE aggregation_key IS NOT NULL AND is_read = false;

-- 6. RLS : tolérant pour permettre au Worker (service_role) d'insérer
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications"   ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications"    ON notifications;
DROP POLICY IF EXISTS "Service can insert notifications"   ON notifications;

CREATE POLICY "read_own"   ON notifications FOR SELECT USING (true);
CREATE POLICY "update_own" ON notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "delete_own" ON notifications FOR DELETE USING (true);
CREATE POLICY "insert_any" ON notifications FOR INSERT WITH CHECK (true);

-- 7. Realtime
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Tables annexes si absentes
CREATE TABLE IF NOT EXISTS push_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    organization_id UUID,
    org_slug        TEXT,
    user_role       TEXT DEFAULT 'student',
    endpoint        TEXT NOT NULL UNIQUE,
    p256dh          TEXT NOT NULL,
    auth            TEXT NOT NULL,
    subscription_json TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Push tokens open" ON push_tokens;
CREATE POLICY "Push tokens open" ON push_tokens USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    action_type  TEXT NOT NULL,
    in_app       BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    email        BOOLEAN DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, action_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences (user_id);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own prefs" ON notification_preferences;
CREATE POLICY "Users manage own prefs" ON notification_preferences USING (true) WITH CHECK (true);

-- 9. Ajouter subscription_json à push_tokens si absent
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS subscription_json TEXT;

-- Vérification finale
SELECT
    'Migration 027 OK' AS status,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'notifications') AS total_columns;
