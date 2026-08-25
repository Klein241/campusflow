-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 068: SÉCURISATION RLS STRICTE & TRIGGERS AUTONOMES DAME SKY (MCP)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SÉCURISATION RLS : DAME_SKY_CONFIG
-- ─────────────────────────────────────────────────────────────────────────────
-- Interdire toute modification anonyme non authentifiée
REVOKE ALL ON public.dame_sky_config FROM anon;
GRANT SELECT ON public.dame_sky_config TO anon, authenticated, service_role;
GRANT ALL ON public.dame_sky_config TO service_role;

ALTER TABLE public.dame_sky_config ENABLE ROW LEVEL SECURITY;

-- Lecture publique (pour savoir si la bulle est activée sur le campus)
DROP POLICY IF EXISTS "Allow public read dame_sky_config" ON public.dame_sky_config;
CREATE POLICY "Allow public read dame_sky_config" 
ON public.dame_sky_config FOR SELECT 
USING (true);

-- Seul le Superadmin authentifié (vérifié dans public.profiles) ou service_role peut modifier
DROP POLICY IF EXISTS "Allow superadmin update dame_sky_config" ON public.dame_sky_config;
CREATE POLICY "Allow superadmin update dame_sky_config" 
ON public.dame_sky_config FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'superadmin'
    )
) 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'superadmin'
    )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SÉCURISATION RLS : LIBRARY_ITEMS & TIMETABLE_SLOTS
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON public.library_items FROM anon;
GRANT SELECT ON public.library_items TO anon, authenticated;
GRANT ALL ON public.library_items TO authenticated, service_role;

REVOKE ALL ON public.timetable_slots FROM anon;
GRANT SELECT ON public.timetable_slots TO anon, authenticated;
GRANT ALL ON public.timetable_slots TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FONCTION TRIGGER : DÉCLENCHEUR D'ÉVÉNEMENTS VERS LE WORKER AUTONOME
-- ─────────────────────────────────────────────────────────────────────────────
-- Vérifie si l'extension pg_net est disponible pour les requêtes HTTP asynchrones
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.dispatch_autonomous_ai_event()
RETURNS trigger AS $$
DECLARE
    payload jsonb;
    worker_url text := 'https://campusflow-worker.kleintaptue1.workers.dev/api/agent/webhook';
BEGIN
    payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'type', TG_OP,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW),
        'timestamp', now()
    );

    -- Envoyer la requête HTTP au worker via pg_net (asynchrone, non bloquant)
    BEGIN
        PERFORM net.http_post(
            url := worker_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ne jamais bloquer la transaction BDD si le worker est temporairement injoignable
        RAISE WARNING 'Échec envoi webhook IA autonome: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ATTACHER LES DÉCLENCHEURS SUR LES TABLES CLÉS
-- ─────────────────────────────────────────────────────────────────────────────

-- A. Sur les nouveaux devoirs / examens soumis (Correction & Notation IA Autonome)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'submissions') THEN
        DROP TRIGGER IF EXISTS trg_ai_on_submission ON public.submissions;
        CREATE TRIGGER trg_ai_on_submission
        AFTER INSERT ON public.submissions
        FOR EACH ROW EXECUTE FUNCTION public.dispatch_autonomous_ai_event();
    END IF;
END $$;

-- B. Sur les signalements de bugs (Diagnostic & Triage IA Autonome)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bug_reports') THEN
        DROP TRIGGER IF EXISTS trg_ai_on_bug_report ON public.bug_reports;
        CREATE TRIGGER trg_ai_on_bug_report
        AFTER INSERT ON public.bug_reports
        FOR EACH ROW EXECUTE FUNCTION public.dispatch_autonomous_ai_event();
    END IF;
END $$;

-- C. Sur les demandes de support / points (Réponse & Crédit IA Autonome)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sky_point_requests') THEN
        DROP TRIGGER IF EXISTS trg_ai_on_point_request ON public.sky_point_requests;
        CREATE TRIGGER trg_ai_on_point_request
        AFTER INSERT ON public.sky_point_requests
        FOR EACH ROW EXECUTE FUNCTION public.dispatch_autonomous_ai_event();
    END IF;
END $$;

-- D. Sur l'ajout de nouveaux chapitres (Compilation de Livre Automatique)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chapters') THEN
        DROP TRIGGER IF EXISTS trg_ai_on_new_chapter ON public.chapters;
        CREATE TRIGGER trg_ai_on_new_chapter
        AFTER INSERT ON public.chapters
        FOR EACH ROW EXECUTE FUNCTION public.dispatch_autonomous_ai_event();
    END IF;
END $$;
