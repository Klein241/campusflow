-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: TABLE org_reviews (Avis sur les écoles)
-- Utilisée par le composant ReviewSection dans les dashboards
-- student, teacher et admin
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Créer la table org_reviews (utilisée par ReviewSection.tsx)
CREATE TABLE IF NOT EXISTS org_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    user_id text NOT NULL,
    author_name text NOT NULL,
    author_role text NOT NULL DEFAULT ''student'', -- ''student'' | ''teacher'' | ''admin''
    author_avatar text,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title text,
    comment text NOT NULL,
    content text, -- alias de comment pour compatibilité
    is_verified boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Contrainte unicité : un utilisateur = un avis par école
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_reviews_user_org
    ON org_reviews(user_id, organization_id);

-- 3. Index de performance
CREATE INDEX IF NOT EXISTS idx_org_reviews_org_id ON org_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_reviews_rating ON org_reviews(rating);

-- 4. RLS
ALTER TABLE org_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_org_reviews" ON org_reviews;
CREATE POLICY "public_read_org_reviews" ON org_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_insert_org_reviews" ON org_reviews;
CREATE POLICY "users_insert_org_reviews" ON org_reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "users_update_own_org_reviews" ON org_reviews;
CREATE POLICY "users_update_own_org_reviews" ON org_reviews FOR UPDATE USING (true);

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION update_org_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS org_reviews_updated_at ON org_reviews;
CREATE TRIGGER org_reviews_updated_at
    BEFORE UPDATE ON org_reviews
    FOR EACH ROW EXECUTE FUNCTION update_org_reviews_updated_at();

-- 6. Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = ''supabase_realtime'' AND tablename = ''org_reviews''
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE org_reviews;
    END IF;
END $$;

NOTIFY pgrst, ''reload schema'';
