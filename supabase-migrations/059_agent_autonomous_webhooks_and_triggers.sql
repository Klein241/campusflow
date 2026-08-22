-- ============================================================
-- MIGRATION 059 — Système Autonome Agents IA (Option A & B)
-- Webhooks Temps Réel (<1s) & Surveillance Périodique (Cron)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Table de configuration des Webhooks pour Agents IA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agent_webhook_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    webhook_url     TEXT NOT NULL,
    secret_token    TEXT,
    events          TEXT[] NOT NULL DEFAULT '{"sky_point_requests", "bug_reports", "ai_pending_actions"}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_agent_webhook_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_config_admin_select" ON public.ai_agent_webhook_config;
CREATE POLICY "webhook_config_admin_select"
    ON public.ai_agent_webhook_config FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.ai_agent_webhook_config TO authenticated, service_role, anon;

-- ─────────────────────────────────────────────────────────────
-- 2. Trigger Function : Notification automatique vers le Worker
--    dès qu'une nouvelle action ou demande est créée
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_ai_agent_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payload JSONB;
    v_event_type TEXT;
BEGIN
    v_event_type := TG_TABLE_NAME;
    v_payload := json_build_object(
        'type', v_event_type,
        'table', v_event_type,
        'action', TG_OP,
        'record', row_to_json(NEW),
        'timestamp', NOW()
    );

    -- Si l'extension pg_net est disponible, on envoie le webhook directement
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        BEGIN
            PERFORM net.http_post(
                url := 'https://campusflow-worker.kleintaptue1.workers.dev/api/agent/webhook',
                headers := '{"Content-Type": "application/json"}'::jsonb,
                body := v_payload
            );
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ne jamais bloquer la transaction principale
        END;
    END IF;

    RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Attacher les triggers sur les tables d'événements clés
-- ─────────────────────────────────────────────────────────────

-- A. Nouvelles demandes de Sky Points (Support)
DROP TRIGGER IF EXISTS trg_ai_sky_point_requests ON public.sky_point_requests;
CREATE TRIGGER trg_ai_sky_point_requests
    AFTER INSERT ON public.sky_point_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_ai_agent_event();

-- B. Nouveaux rapports de bugs
DROP TRIGGER IF EXISTS trg_ai_bug_reports ON public.bug_reports;
CREATE TRIGGER trg_ai_bug_reports
    AFTER INSERT ON public.bug_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_ai_agent_event();

-- C. Nouvelles actions IA en attente
DROP TRIGGER IF EXISTS trg_ai_pending_actions ON public.ai_pending_actions;
CREATE TRIGGER trg_ai_pending_actions
    AFTER INSERT ON public.ai_pending_actions
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_ai_agent_event();

-- ─────────────────────────────────────────────────────────────
-- 4. Garantir les colonnes sky_points sur organizations
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS sky_points INT DEFAULT 0;

SELECT 'Migration 059 OK — Webhooks et déclencheurs autonomes configurés avec succès.' AS status;
