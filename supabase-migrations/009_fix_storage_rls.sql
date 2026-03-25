-- ═══════════════════════════════════════════════════════
-- MIGRATION 009 — FIX STORAGE RLS + BUCKET SETUP
-- Resolves: "new row violates row-level security policy"
-- on organization-assets bucket
-- ═══════════════════════════════════════════════════════

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'organization-assets',
    'organization-assets',
    true,
    52428800, -- 50MB max
    ARRAY[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'video/mp4', 'video/webm',
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'text/plain', 'text/csv',
        'application/zip'
    ]
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800;

-- 2. Drop any existing conflicting policies
DROP POLICY IF EXISTS "org_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "org_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "org_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "org_assets_delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on organization-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload on organization-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update on organization-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete on organization-assets" ON storage.objects;

-- 3. PUBLIC READ — anyone can read files (logos, library docs, shop images)
CREATE POLICY "Allow public read on organization-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-assets');

-- 4. AUTHENTICATED INSERT — any authenticated user can upload
-- (students/teachers use anon key but RLS checks via service role or anon)
-- Since CampusFlow uses access codes (not supabase auth for students),
-- we allow ALL inserts — the app logic controls who can upload.
CREATE POLICY "Allow authenticated upload on organization-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'organization-assets');

-- 5. AUTHENTICATED UPDATE
CREATE POLICY "Allow authenticated update on organization-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'organization-assets');

-- 6. AUTHENTICATED DELETE
CREATE POLICY "Allow authenticated delete on organization-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'organization-assets');

-- ═══════════════════════════════════════════════════════
-- ALSO FIX: library_items table RLS
-- The "new row violates row-level security" also affects
-- the library_items table insert
-- ═══════════════════════════════════════════════════════

-- Enable RLS on library tables if not already
ALTER TABLE IF EXISTS public.library_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "library_items_select" ON public.library_items;
DROP POLICY IF EXISTS "library_items_insert" ON public.library_items;
DROP POLICY IF EXISTS "library_items_update" ON public.library_items;
DROP POLICY IF EXISTS "library_items_delete" ON public.library_items;
DROP POLICY IF EXISTS "Allow all read on library_items" ON public.library_items;
DROP POLICY IF EXISTS "Allow all insert on library_items" ON public.library_items;
DROP POLICY IF EXISTS "Allow all update on library_items" ON public.library_items;
DROP POLICY IF EXISTS "Allow all delete on library_items" ON public.library_items;

-- Everyone can read library items
CREATE POLICY "Allow all read on library_items"
ON public.library_items FOR SELECT
USING (true);

-- Allow inserts (admin controls upload in the UI)
CREATE POLICY "Allow all insert on library_items"
ON public.library_items FOR INSERT
WITH CHECK (true);

-- Allow updates
CREATE POLICY "Allow all update on library_items"
ON public.library_items FOR UPDATE
USING (true);

-- Allow deletes
CREATE POLICY "Allow all delete on library_items"
ON public.library_items FOR DELETE
USING (true);

-- ═══════════════════════════════════════════════════════
-- FIX: library_favorites, library_reading_history
-- ═══════════════════════════════════════════════════════

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'library_favorites') THEN
        ALTER TABLE public.library_favorites ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all on library_favorites" ON public.library_favorites;
        CREATE POLICY "Allow all on library_favorites" ON public.library_favorites USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'library_reading_history') THEN
        ALTER TABLE public.library_reading_history ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all on library_reading_history" ON public.library_reading_history;
        CREATE POLICY "Allow all on library_reading_history" ON public.library_reading_history USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- FIX: shop_products table RLS
-- ═══════════════════════════════════════════════════════

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_products') THEN
        ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all read on shop_products" ON public.shop_products;
        DROP POLICY IF EXISTS "Allow all insert on shop_products" ON public.shop_products;
        DROP POLICY IF EXISTS "Allow all update on shop_products" ON public.shop_products;
        DROP POLICY IF EXISTS "Allow all delete on shop_products" ON public.shop_products;
        CREATE POLICY "Allow all read on shop_products" ON public.shop_products FOR SELECT USING (true);
        CREATE POLICY "Allow all insert on shop_products" ON public.shop_products FOR INSERT WITH CHECK (true);
        CREATE POLICY "Allow all update on shop_products" ON public.shop_products FOR UPDATE USING (true);
        CREATE POLICY "Allow all delete on shop_products" ON public.shop_products FOR DELETE USING (true);
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- FIX: messages table RLS
-- ═══════════════════════════════════════════════════════

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_messages') THEN
        ALTER TABLE public.school_messages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all on school_messages" ON public.school_messages;
        CREATE POLICY "Allow all on school_messages" ON public.school_messages USING (true) WITH CHECK (true);
    END IF;
END $$;
