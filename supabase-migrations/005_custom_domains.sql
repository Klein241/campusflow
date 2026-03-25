-- ============================================================
-- CAMPUSFLOW — Custom domain support for organizations
-- ============================================================

-- Add custom_domain column to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS domain_ssl_status TEXT DEFAULT 'pending';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#4f46e5';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Index for fast domain lookup
CREATE INDEX IF NOT EXISTS idx_org_custom_domain ON public.organizations(custom_domain) WHERE custom_domain IS NOT NULL;
