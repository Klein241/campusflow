-- ═══════════════════════════════════════════════════════════════════════
-- 045_school_badges_and_verification.sql
-- Certification badges, online academy distinction, and verification documents
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Add certification badge & verification columns to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS certification_badge TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS badge_title TEXT,
ADD COLUMN IF NOT EXISTS badge_issued_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_online_academy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_docs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS show_on_landing BOOLEAN DEFAULT true;

-- 2. Add index for landing page performance
CREATE INDEX IF NOT EXISTS idx_orgs_certification_badge ON public.organizations(certification_badge);
CREATE INDEX IF NOT EXISTS idx_orgs_show_on_landing ON public.organizations(show_on_landing);

-- 3. Comments
COMMENT ON COLUMN public.organizations.certification_badge IS 'none | verified_physical (Établissement Agréé avec bâtiment) | verified_online (Académie en ligne certifiée avec diplôme/doctorat/certificat)';
COMMENT ON COLUMN public.organizations.badge_title IS 'Custom badge label assigned by superadmin (e.g., Agréé Ministère, Docteur Formateur, Académie Certifiée)';
COMMENT ON COLUMN public.organizations.is_online_academy IS 'True if organization is a 100% digital academy without a physical building';
COMMENT ON COLUMN public.organizations.verification_docs IS 'List of uploaded verification files (agrément, récépissé, diplôme, doctorat...)';
