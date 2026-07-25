-- ══════════════════════════════════════════════════════════════
-- SCRIPT DE CRÉATION AUTOMATIQUE DES BUCKETS SUPABASE STORAGE
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- ══════════════════════════════════════════════════════════════

-- 1. Créer le bucket principal 'organization-assets'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'organization-assets',
    'organization-assets',
    true,
    52428800, -- Limite de 50 Mo par fichier
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800;

-- 2. Créer le bucket secondaire 'campus_assets' (Compatibilité)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'campus_assets',
    'campus_assets',
    true,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800;

-- 3. Configurer les politiques d'accès RLS sur les fichiers (Select, Insert, Update, Delete)
DROP POLICY IF EXISTS "Public Read Storage Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Storage Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Storage Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Storage Assets" ON storage.objects;

CREATE POLICY "Public Read Storage Assets"
ON storage.objects FOR SELECT
USING (bucket_id IN ('organization-assets', 'campus_assets'));

CREATE POLICY "Public Insert Storage Assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('organization-assets', 'campus_assets'));

CREATE POLICY "Public Update Storage Assets"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('organization-assets', 'campus_assets'));

CREATE POLICY "Public Delete Storage Assets"
ON storage.objects FOR DELETE
USING (bucket_id IN ('organization-assets', 'campus_assets'));
