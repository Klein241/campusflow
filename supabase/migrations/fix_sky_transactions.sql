-- Migration: Harmoniser la table sky_transactions
-- Ajoute les colonnes manquantes (student_id, transaction_type, organization_id)
-- en préservant les colonnes existantes (user_id, amount, type, description)

ALTER TABLE public.sky_transactions
    ADD COLUMN IF NOT EXISTS student_id       UUID,
    ADD COLUMN IF NOT EXISTS transaction_type TEXT,
    ADD COLUMN IF NOT EXISTS organization_id  UUID;

-- Backfill transaction_type from type if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sky_transactions' AND column_name='type') THEN
        UPDATE public.sky_transactions SET transaction_type = type WHERE transaction_type IS NULL;
    END IF;
END $$;

-- Ensure RLS is on
ALTER TABLE public.sky_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sky_transactions_open" ON public.sky_transactions;
CREATE POLICY "sky_transactions_open" ON public.sky_transactions FOR ALL USING (true) WITH CHECK (true);

-- sky_points_history table (pour le détail du badge Sky Points)
CREATE TABLE IF NOT EXISTS public.sky_points_history (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID NOT NULL,
    student_id      UUID,
    amount          INTEGER NOT NULL DEFAULT 0,
    transaction_type TEXT,
    type            TEXT,
    description     TEXT,
    organization_id UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sky_points_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sky_points_history_open" ON public.sky_points_history;
CREATE POLICY "sky_points_history_open" ON public.sky_points_history FOR ALL USING (true) WITH CHECK (true);
