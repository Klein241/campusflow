-- ══════════════════════════════════════════════════════════════════
-- Table: push_subscriptions — Stocke les souscriptions Web Push
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    organization_id   UUID NOT NULL,
    endpoint          TEXT NOT NULL,
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

-- Chaque utilisateur peut gérer sa propre subscription
CREATE POLICY "push_sub_own" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Les admins peuvent lire toutes les subscriptions de leur org
CREATE POLICY "push_sub_admin_read" ON push_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
              AND om.organization_id = push_subscriptions.organization_id
              AND om.role IN ('admin','owner','teacher')
        )
    );

-- ══════════════════════════════════════════════════════════════════
-- RPC: send_push_to_user — Déclenche une notification push
-- Utilisé par les admins/serveurs pour notifier un utilisateur
-- ══════════════════════════════════════════════════════════════════

-- Note: L'envoi réel se fait via le Cloudflare Worker ou une Edge Function
-- Cette fonction insère juste dans une file d'attente de notifications
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

CREATE INDEX IF NOT EXISTS idx_notif_queue_pending ON notification_queue (sent, created_at) WHERE sent = FALSE;

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_queue_insert" ON notification_queue
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "notif_queue_read_own" ON notification_queue
    FOR SELECT USING (auth.uid() = user_id);
