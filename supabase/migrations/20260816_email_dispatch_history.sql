-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: TABLE email_dispatch_logs (Historique des envois emails)
-- Permet aux professeurs et administrateurs de suivre leurs envois
-- de notifications par email (Gmail, Yahoo, Outlook, Mailto, Resend)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_dispatch_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    sender_id text,
    sender_name text NOT NULL,
    sender_role text NOT NULL DEFAULT 'teacher', -- 'teacher' | 'admin'
    subject text NOT NULL,
    category text DEFAULT 'general', -- 'course' | 'exam' | 'announcement' | 'reminder' | 'grade' | 'general'
    recipient_count integer NOT NULL DEFAULT 0,
    batches_count integer NOT NULL DEFAULT 1,
    batch_size integer NOT NULL DEFAULT 100,
    dispatch_method text NOT NULL DEFAULT 'direct_client', -- 'gmail' | 'yahoo' | 'outlook' | 'mailto' | 'resend_auto'
    image_url text,
    preview_body text,
    classroom_name text,
    created_at timestamptz DEFAULT now()
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_email_dispatch_org ON email_dispatch_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_dispatch_sender ON email_dispatch_logs(sender_id);
CREATE INDEX IF NOT EXISTS idx_email_dispatch_created ON email_dispatch_logs(created_at DESC);

-- RLS
ALTER TABLE email_dispatch_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_email_dispatch_logs" ON email_dispatch_logs;
CREATE POLICY "public_read_email_dispatch_logs" ON email_dispatch_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_insert_email_dispatch_logs" ON email_dispatch_logs;
CREATE POLICY "users_insert_email_dispatch_logs" ON email_dispatch_logs
    FOR INSERT WITH CHECK (true);

-- Publication Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'email_dispatch_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE email_dispatch_logs;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
