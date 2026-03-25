-- ============================================================
-- CAMPUSFLOW — Fix migrations: idempotent + new auth columns
-- Run this INSTEAD of 002_organizations.sql if policies exist
-- ============================================================

-- Fix: add access_code columns for admin-created auth flow
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS access_code VARCHAR(12) UNIQUE;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS pin_code VARCHAR(4);
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS pin_set BOOLEAN DEFAULT FALSE;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS marital_status TEXT; -- celibataire, marie, divorce, veuf
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS residence TEXT;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS access_code VARCHAR(12) UNIQUE;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS pin_code VARCHAR(4);
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS pin_set BOOLEAN DEFAULT FALSE;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS residence TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Index for fast access_code lookup (login)
CREATE INDEX IF NOT EXISTS idx_teacher_access_code ON public.teacher_profiles(access_code) WHERE access_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_student_access_code ON public.student_profiles(access_code) WHERE access_code IS NOT NULL;

-- Drop the old add_missing_columns migration reference to library_books
-- (library_books was renamed to library_documents in 003_library_shop_chat.sql)
-- No action needed; just don't run add_missing_columns.sql

-- Fix 002: Drop and recreate policy if exists
DO $$ BEGIN
    DROP POLICY IF EXISTS "org_public_read" ON public.organizations;
    CREATE POLICY "org_public_read" ON public.organizations FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Marketplace: allow students to sell products
ALTER TABLE public.marketplace_products ADD COLUMN IF NOT EXISTS seller_type TEXT DEFAULT 'admin'; -- admin, teacher, student
ALTER TABLE public.marketplace_products ADD COLUMN IF NOT EXISTS seller_id UUID;
ALTER TABLE public.marketplace_products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'physical'; -- physical, digital
ALTER TABLE public.marketplace_products ADD COLUMN IF NOT EXISTS digital_file_url TEXT;

-- Drop overly restrictive insert policy, allow students to insert too
DROP POLICY IF EXISTS "marketplace_insert" ON public.marketplace_products;
CREATE POLICY "marketplace_insert" ON public.marketplace_products FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "marketplace_update" ON public.marketplace_products;
CREATE POLICY "marketplace_update" ON public.marketplace_products FOR UPDATE TO authenticated USING (true);
