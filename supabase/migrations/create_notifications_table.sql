-- ═══════════════════════════════════════════════════════════════════
-- TABLE: notifications — Toutes les notifications utilisateur
-- Utilisée par notification-bell.tsx, notification-center.tsx
-- et le système de fallback de notifications.ts
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    organization_id UUID,
    -- Contenu
    title           TEXT NOT NULL DEFAULT 'Notification',
    message         TEXT NOT NULL DEFAULT '',
    body            TEXT,                    -- alias de message pour compatibilité
    -- Classification
    type            TEXT DEFAULT 'info',     -- 'message','support','group','info','system'
    action_type     TEXT,                    -- ex: 'story_liked', 'dm_new_message', ...
    category        TEXT,                    -- ex: 'grade','bulletin','admin','news'
    -- Navigation (deep-link)
    action_data     JSONB DEFAULT '{}',      -- {tab, viewState, conversationId, ...}
    action_url      TEXT,
    -- État
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications (user_id, is_read, created_at DESC)
    WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_org
    ON public.notifications (organization_id, created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur voit et gère ses propres notifications
DROP POLICY IF EXISTS "notifications_self"         ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_any"   ON public.notifications;

CREATE POLICY "notifications_self"
    ON public.notifications
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Le service role (Cloudflare Worker, Supabase Edge Functions) peut tout faire
CREATE POLICY "notifications_service_role"
    ON public.notifications
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- N'importe quel utilisateur authentifié peut insérer (pour le fallback Supabase)
CREATE POLICY "notifications_insert_any"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ═══════════════════════════════════════════════════════════════════
-- TABLE: admin_notifications — Annonces de l'admin de l'org
-- Utilisée par notification-bell.tsx (table admin_notifications)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL DEFAULT '',
    icon            TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_notifs_read_all"   ON public.admin_notifications;
DROP POLICY IF EXISTS "admin_notifs_insert"     ON public.admin_notifications;

-- Tous les authentifiés peuvent lire (les annonces sont pour tout le monde)
CREATE POLICY "admin_notifs_read_all"
    ON public.admin_notifications
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Seuls les admins peuvent insérer
CREATE POLICY "admin_notifs_insert"
    ON public.admin_notifications
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;
