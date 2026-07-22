-- ============================================================
-- Fix Migration — Push Tokens + Notification Preferences
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Créer la table push_tokens (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS push_tokens (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    organization_id  UUID,
    org_slug         TEXT,
    user_role        TEXT DEFAULT 'student',
    endpoint         TEXT NOT NULL UNIQUE,
    p256dh           TEXT NOT NULL,
    auth             TEXT NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Créer la table notification_preferences (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    org_id          UUID,
    push_enabled    BOOLEAN DEFAULT true,
    new_lesson      BOOLEAN DEFAULT true,
    new_chapter     BOOLEAN DEFAULT true,
    new_subject     BOOLEAN DEFAULT true,
    new_post        BOOLEAN DEFAULT true,
    new_message     BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

-- 3. Index utiles
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_org      ON push_tokens (organization_id);
CREATE INDEX IF NOT EXISTS idx_notif_pref_user      ON notification_preferences (user_id);

-- 4. RLS push_tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_own" ON push_tokens;
CREATE POLICY "push_tokens_own" ON push_tokens
    FOR ALL USING (auth.uid() = user_id);

-- 5. RLS notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_pref_own" ON notification_preferences;
CREATE POLICY "notif_pref_own" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- 6. Ajouter push_tokens à la publication Realtime (maintenant que la table existe)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE push_tokens;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Ajouter notification_preferences à la publication Realtime
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Migrer push_subscriptions → push_tokens (si les deux tables existent)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'push_subscriptions')
    AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'push_tokens') THEN
        INSERT INTO push_tokens (user_id, organization_id, org_slug, user_role, endpoint, p256dh, auth, created_at)
        SELECT user_id, organization_id, org_slug, user_role, endpoint, p256dh, auth, created_at
        FROM push_subscriptions
        ON CONFLICT (endpoint) DO NOTHING;
    END IF;
END $$;

-- Confirmation
SELECT 'push_tokens OK' as status WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'push_tokens')
UNION ALL
SELECT 'notification_preferences OK' WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'notification_preferences');
