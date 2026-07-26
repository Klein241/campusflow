-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 028: CORRECTION FINALE DU SYSTÈME DE NOTIFICATIONS
-- À exécuter dans le SQL Editor de Supabase (dashboard.supabase.com)
-- Toutes les commandes sont idempotentes (IF NOT EXISTS / ON CONFLICT)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ÉTAPE 1: Ajouter toutes les colonnes requises par le Worker v3 ──────────

-- Colonnes de base (certaines existent déjà, IF NOT EXISTS les ignore)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id  UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title            TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message          TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body             TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type             TEXT DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read          BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_type      TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_data      JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category         TEXT DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS icon             TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url       TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata         JSONB DEFAULT '{}';

-- Colonnes Worker v3 (agrégation, acteurs, priorité)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actors           JSONB DEFAULT '[]';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_count      INTEGER DEFAULT 1;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS aggregation_key  TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority         TEXT DEFAULT 'medium';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT now();

-- ── ÉTAPE 2: Synchroniser body ↔ message (compatibilité) ────────────────────
UPDATE notifications SET message = body    WHERE message IS NULL AND body IS NOT NULL AND body != '';
UPDATE notifications SET body    = message WHERE body IS NULL    AND message IS NOT NULL AND message != '';
UPDATE notifications SET title   = 'Notification' WHERE title IS NULL;
UPDATE notifications SET message = ''             WHERE message IS NULL;
UPDATE notifications SET body    = ''             WHERE body IS NULL;

-- ── ÉTAPE 3: Contrainte de priorité (souple) ────────────────────────────────
DO $$ BEGIN
    ALTER TABLE notifications
        ADD CONSTRAINT notifications_priority_check
        CHECK (priority IN ('high', 'medium', 'low'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ÉTAPE 4: Index de performance ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notif_user_created
    ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread
    ON notifications (user_id, is_read)
    WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notif_org_user
    ON notifications (organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_notif_agg_key
    ON notifications (user_id, aggregation_key)
    WHERE aggregation_key IS NOT NULL AND is_read = false;

-- ── ÉTAPE 5: RLS entièrement permissif (Worker utilise service_role) ─────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own"                            ON notifications;
DROP POLICY IF EXISTS "update_own"                          ON notifications;
DROP POLICY IF EXISTS "delete_own"                          ON notifications;
DROP POLICY IF EXISTS "insert_any"                          ON notifications;
DROP POLICY IF EXISTS "Users can read own notifications"    ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications"  ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications"  ON notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications"     ON notifications;
DROP POLICY IF EXISTS "Service can insert notifications"    ON notifications;

CREATE POLICY "notif_select" ON notifications FOR SELECT USING (true);
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "notif_delete" ON notifications FOR DELETE USING (true);

-- ── ÉTAPE 6: Realtime (INSERT, UPDATE, DELETE) ───────────────────────────────
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_object THEN NULL;
END $$;

-- ── ÉTAPE 7: Table push_tokens ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    organization_id  UUID,
    org_slug         TEXT,
    user_role        TEXT DEFAULT 'student',
    endpoint         TEXT NOT NULL UNIQUE,
    p256dh           TEXT NOT NULL,
    auth             TEXT NOT NULL,
    subscription_json TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Colonnes optionnelles
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS subscription_json TEXT;
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS org_slug TEXT;
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'student';

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_org  ON push_tokens (organization_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Push tokens open"   ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_select" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_insert" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_update" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete" ON push_tokens;

CREATE POLICY "push_tokens_select" ON push_tokens FOR SELECT USING (true);
CREATE POLICY "push_tokens_insert" ON push_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "push_tokens_update" ON push_tokens FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "push_tokens_delete" ON push_tokens FOR DELETE USING (true);

-- ── ÉTAPE 8: Table push_subscriptions (hook React) ──────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    organization_id  UUID,
    endpoint         TEXT NOT NULL,
    auth             TEXT NOT NULL DEFAULT '',
    p256dh           TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, organization_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_sub_open" ON push_subscriptions;
CREATE POLICY "push_sub_open" ON push_subscriptions USING (true) WITH CHECK (true);

-- ── ÉTAPE 9: Table notification_preferences ──────────────────────────────────
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
CREATE POLICY "notif_prefs_open" ON notification_preferences USING (true) WITH CHECK (true);

-- ── VÉRIFICATION FINALE ──────────────────────────────────────────────────────
SELECT
    '✅ Migration 028 appliquée avec succès' AS status,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'notifications') AS total_columns_notifications,
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('push_tokens', 'push_subscriptions', 'notification_preferences')) AS aux_tables_count;
