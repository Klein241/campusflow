-- ============================================================
-- CAMPUSFLOW — Fix student_profiles column names mismatch
-- Adds missing columns that the admin UI expects
-- ============================================================

-- Add sex column (M/F)
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS sex TEXT DEFAULT 'M';

-- Add birth_date alias (the schema has date_of_birth, but code uses birth_date)
-- Best fix: add birth_date column since the UI uses it
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Add guardian columns (schema has parent_name/parent_phone, UI uses guardian_name/guardian_phone)
-- Already added in 006 but double-check
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS guardian_phone TEXT;

-- Add missing columns for teacher_profiles
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS speciality TEXT;

-- Fix: library_items needs RLS policies (library page loads, but may fail on insert)
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_read" ON public.library_items;
CREATE POLICY "library_read" ON public.library_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "library_write" ON public.library_items;
CREATE POLICY "library_write" ON public.library_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = library_items.organization_id AND owner_id = auth.uid())
);

-- Fix: marketplace_products needs SELECT for everyone
DROP POLICY IF EXISTS "marketplace_read" ON public.marketplace_products;
CREATE POLICY "marketplace_read" ON public.marketplace_products FOR SELECT USING (true);

-- Fix: marketplace_orders needs policies
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_read" ON public.marketplace_orders;
CREATE POLICY "orders_read" ON public.marketplace_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "orders_write" ON public.marketplace_orders;
CREATE POLICY "orders_write" ON public.marketplace_orders FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "orders_update" ON public.marketplace_orders;
CREATE POLICY "orders_update" ON public.marketplace_orders FOR UPDATE TO authenticated USING (true);
