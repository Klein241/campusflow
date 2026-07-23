-- =======================================================
-- WHATSAPP QUEUE & NOTIFICATIONS MIGRATION
-- =======================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message_type TEXT DEFAULT 'general', -- 'grade', 'payment', 'discipline', 'general'
    message TEXT NOT NULL,
    status TEXT DEFAULT 'en_attente', -- 'en_attente', 'envoye', 'echec'
    attempts INTEGER DEFAULT 0,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ
);

-- Index for fast polling by status
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON public.whatsapp_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_org ON public.whatsapp_queue(organization_id);

-- Enable RLS
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users & service role to manage queue
CREATE POLICY "Allow public read/insert on whatsapp_queue"
    ON public.whatsapp_queue FOR ALL
    USING (true) WITH CHECK (true);

-- Helper RPC function to queue a message easily from frontend or backend
CREATE OR REPLACE FUNCTION public.queue_whatsapp_message(
    p_org_id UUID,
    p_phone TEXT,
    p_name TEXT,
    p_type TEXT,
    p_message TEXT
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_clean_phone TEXT;
BEGIN
    -- Format phone number (remove spaces, hyphens, plus)
    v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    
    INSERT INTO public.whatsapp_queue (
        organization_id,
        recipient_phone,
        recipient_name,
        message_type,
        message,
        status
    )
    VALUES (
        p_org_id,
        v_clean_phone,
        p_name,
        COALESCE(p_type, 'general'),
        p_message,
        'en_attente'
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
