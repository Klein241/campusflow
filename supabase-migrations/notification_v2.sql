-- ═══════════════════════════════════════════════════════════════════════════
-- NOTIFICATION_V2 — Tables nécessaires pour le Cloudflare Worker avancé
-- À exécuter AVANT le déploiement du notification-worker
-- Étend le système de notifications avec :
--   • aggregation (actors JSON, aggregation_key)
--   • priorités (high/medium/low)
--   • push_tokens (Web Push VAPID)
--   • notification_preferences par user+action_type
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Colonnes d'agrégation sur la table notifications
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS action_type    TEXT,
    ADD COLUMN IF NOT EXISTS actor_id       UUID,
    ADD COLUMN IF NOT EXISTS actor_name     TEXT,
    ADD COLUMN IF NOT EXISTS actor_avatar   TEXT,
    ADD COLUMN IF NOT EXISTS actors         JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS actor_count    INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS aggregation_key TEXT,
    ADD COLUMN IF NOT EXISTS priority       TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    ADD COLUMN IF NOT EXISTS target_id      TEXT,
    ADD COLUMN IF NOT EXISTS target_name    TEXT,
    ADD COLUMN IF NOT EXISTS expires_at     TIMESTAMPTZ;

-- Index pour fast lookup par aggregation_key (deduplication)
CREATE INDEX IF NOT EXISTS idx_notifications_agg_key
    ON notifications (user_id, aggregation_key)
    WHERE aggregation_key IS NOT NULL AND is_read = false;

-- Index pour expiration
CREATE INDEX IF NOT EXISTS idx_notifications_expires
    ON notifications (expires_at)
    WHERE expires_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Table push_tokens (Web Push VAPID subscriptions)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    organization_id UUID,
    org_slug        TEXT,
    user_role       TEXT DEFAULT 'student',
    endpoint        TEXT NOT NULL UNIQUE,
    p256dh          TEXT NOT NULL,
    auth            TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_org  ON push_tokens (organization_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Push tokens open" ON push_tokens;
CREATE POLICY "Push tokens open" ON push_tokens
    USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Table notification_preferences (opt-in/opt-out par action type)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    action_type TEXT NOT NULL,
    in_app      BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    email       BOOLEAN DEFAULT false,
    quiet_hours_start INT DEFAULT NULL,  -- heure locale 0-23
    quiet_hours_end   INT DEFAULT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, action_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences (user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own prefs" ON notification_preferences;
CREATE POLICY "Users manage own prefs" ON notification_preferences
    USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Table prayer_comments (commentaires sur les demandes de prière/tutorat)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prayer_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_id   UUID NOT NULL,
    author_id   UUID NOT NULL,
    content     TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prayer_comments_prayer ON prayer_comments (prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_comments_author ON prayer_comments (author_id);

ALTER TABLE prayer_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Prayer comments open" ON prayer_comments;
CREATE POLICY "Prayer comments open" ON prayer_comments
    USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Fonction RPC : get_unread_notification_count
--    Utilisée par le Worker pour initialiser le compteur KV
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INT LANGUAGE sql SECURITY DEFINER AS $$
    SELECT COUNT(*)::INT
    FROM notifications
    WHERE user_id = p_user_id
      AND is_read = false
      AND (expires_at IS NULL OR expires_at > NOW());
$$;

GRANT EXECUTE ON FUNCTION get_unread_notification_count TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Fonction RPC : mark_all_notifications_read
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
    UPDATE notifications
    SET is_read = true, updated_at = NOW()
    WHERE user_id = p_user_id AND is_read = false;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Activer Realtime sur les nouvelles tables
-- ─────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE push_tokens;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Compatibilité : push_subscriptions → renommer vers push_tokens si besoin
--    (migration 026 a créé push_subscriptions; on merge les deux)
-- ─────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'push_subscriptions')
    AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'push_tokens') THEN
        -- Migrer les données de push_subscriptions vers push_tokens
        INSERT INTO push_tokens (user_id, organization_id, org_slug, user_role, endpoint, p256dh, auth, created_at)
        SELECT user_id, organization_id, org_slug, user_role, endpoint, p256dh, auth, created_at
        FROM push_subscriptions
        ON CONFLICT (endpoint) DO NOTHING;
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Vérification finale
-- ─────────────────────────────────────────────────────────────────────────

SELECT
    'notification_v2 applied' AS status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'notifications') AS notifications_columns,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('push_tokens','notification_preferences','prayer_comments','lesson_reader_notes')) AS new_tables;
