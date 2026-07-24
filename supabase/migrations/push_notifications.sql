-- ══════════════════════════════════════════════════════════════════
-- Table: push_subscriptions — Stocke les souscriptions Web Push
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    organization_id   UUID NOT NULL,
    endpoint          TEXT NOT NULL DEFAULT '',
    auth              TEXT NOT NULL DEFAULT '',
    p256dh            TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, organization_id)
);

-- Index for fast lookup by org
CREATE INDEX IF NOT EXISTS idx_push_subs_org ON push_subscriptions (organization_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur gère sa propre subscription
CREATE POLICY "push_sub_own"
    ON push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Les profs/admins de la même org peuvent lire les subscriptions (pour envoyer des notifs)
CREATE POLICY "push_sub_teacher_read"
    ON push_subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM teacher_profiles tp
            WHERE tp.id = auth.uid()
              AND tp.organization_id = push_subscriptions.organization_id
        )
    );

GRANT ALL ON push_subscriptions TO authenticated;
GRANT SELECT ON push_subscriptions TO service_role;

-- ══════════════════════════════════════════════════════════════════
-- Table: notification_queue — File d'envoi de notifications push
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notification_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    organization_id UUID,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL DEFAULT '',
    data            JSONB DEFAULT '{}',
    sent            BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_queue_pending
    ON notification_queue (sent, created_at)
    WHERE sent = FALSE;

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- N'importe quel utilisateur authentifié peut insérer
CREATE POLICY "notif_queue_insert"
    ON notification_queue
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Chaque utilisateur lit ses propres notifications
CREATE POLICY "notif_queue_read_own"
    ON notification_queue
    FOR SELECT
    USING (auth.uid() = user_id);

GRANT ALL ON notification_queue TO authenticated;
GRANT ALL ON notification_queue TO service_role;
