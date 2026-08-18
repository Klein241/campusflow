-- ================================================================
-- IZITEACH — MIGRATION SQL COMPLÈTE & BULLETPROOF
-- Feedback System : Bug Reports, Idées, Avis École & IziTeach
-- Sky Points — Récompenses automatiques
-- ================================================================
-- ⚠️ Exécuter dans Supabase → SQL Editor → New Query
-- ⚠️ TOUTES les instructions sont IDEMPOTENTES (IF NOT EXISTS)
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. TABLE : bug_reports
--    Signalement de bugs avec capture d'écran obligatoire
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bug_reports (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID REFERENCES organizations(id) ON DELETE SET NULL,
    org_name         TEXT,
    org_id           UUID,
    org_slug         TEXT,
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name        TEXT NOT NULL,
    user_role        TEXT NOT NULL DEFAULT 'student',
    user_email       TEXT,
    title            TEXT,
    description      TEXT NOT NULL,
    screenshot_url   TEXT,
    page_url         TEXT,
    browser_info     TEXT,
    status           TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority         TEXT DEFAULT 'medium'
                         CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    admin_notes      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assurer toutes les colonnes au cas où la table existait déjà partiellement
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS browser_info   TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS org_id         UUID;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS org_slug       TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS title          TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_email     TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS page_url       TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS admin_notes    TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS priority       TEXT DEFAULT 'medium';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS org_name       TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_name      TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_role      TEXT DEFAULT 'student';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS description    TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'open';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_bug_reports_user     ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status   ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_org      ON bug_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created  ON bug_reports(created_at DESC);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can view own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Superadmin can manage bug reports" ON bug_reports;

CREATE POLICY "Users can create bug reports"
    ON bug_reports FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bug reports"
    ON bug_reports FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Superadmin can manage bug reports"
    ON bug_reports FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('superadmin', 'admin')
        )
    );


-- ────────────────────────────────────────────────────────────────
-- 2. TABLE : feature_suggestions — Boîte à idées
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_suggestions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID REFERENCES organizations(id) ON DELETE SET NULL,
    org_name         TEXT,
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name        TEXT NOT NULL,
    user_role        TEXT NOT NULL DEFAULT 'student',
    user_email       TEXT,
    title            TEXT NOT NULL,
    description      TEXT NOT NULL,
    category         TEXT NOT NULL DEFAULT 'other'
                         CHECK (category IN (
                             'pedagogy', 'design', 'mobile_money',
                             'chat', 'admin', 'other'
                         )),
    status           TEXT NOT NULL DEFAULT 'submitted'
                         CHECK (status IN (
                             'submitted', 'under_review', 'planned',
                             'in_progress', 'done', 'rejected'
                         )),
    votes            INT DEFAULT 0,
    admin_response   TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS org_name         TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS user_name        TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS user_role        TEXT DEFAULT 'student';
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS user_email       TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS title            TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS description      TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS category         TEXT DEFAULT 'other';
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'submitted';
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS votes            INT DEFAULT 0;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS admin_response   TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_feat_sugg_user     ON feature_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_feat_sugg_status   ON feature_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_feat_sugg_category ON feature_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_feat_sugg_created  ON feature_suggestions(created_at DESC);

ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can submit suggestions" ON feature_suggestions;
DROP POLICY IF EXISTS "Users can view own suggestions" ON feature_suggestions;
DROP POLICY IF EXISTS "Superadmin can manage suggestions" ON feature_suggestions;

CREATE POLICY "Users can submit suggestions"
    ON feature_suggestions FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own suggestions"
    ON feature_suggestions FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Superadmin can manage suggestions"
    ON feature_suggestions FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('superadmin', 'admin')
        )
    );


-- ────────────────────────────────────────────────────────────────
-- 3. TABLE : school_reviews — Avis sur les écoles
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS school_reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    school_name         TEXT NOT NULL,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name         TEXT NOT NULL,
    author_role         TEXT NOT NULL DEFAULT 'Etudiant',
    rating              INT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    comment             TEXT NOT NULL,
    sky_points_awarded  INT DEFAULT 0,
    is_published        BOOLEAN DEFAULT true,
    is_featured         BOOLEAN DEFAULT false,
    admin_reply         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS school_name         TEXT;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS author_name         TEXT;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS author_role         TEXT DEFAULT 'Etudiant';
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS rating              INT DEFAULT 5;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS comment             TEXT;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS sky_points_awarded  INT DEFAULT 0;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS is_published        BOOLEAN DEFAULT true;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS is_featured         BOOLEAN DEFAULT false;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS admin_reply         TEXT;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_school_reviews_org      ON school_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_school_reviews_user     ON school_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_school_reviews_pub      ON school_reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_school_reviews_rating   ON school_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_school_reviews_created  ON school_reviews(created_at DESC);

ALTER TABLE school_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can post school reviews" ON school_reviews;
DROP POLICY IF EXISTS "Anyone can read published school reviews" ON school_reviews;
DROP POLICY IF EXISTS "Superadmin can manage school reviews" ON school_reviews;

CREATE POLICY "Users can post school reviews"
    ON school_reviews FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read published school reviews"
    ON school_reviews FOR SELECT TO anon, authenticated
    USING (is_published = true);

CREATE POLICY "Superadmin can manage school reviews"
    ON school_reviews FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('superadmin', 'admin')
        )
    );


-- ────────────────────────────────────────────────────────────────
-- 4. TABLE : platform_reviews — Avis sur IziTeach SaaS
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID REFERENCES organizations(id) ON DELETE SET NULL,
    school_name         TEXT,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name         TEXT NOT NULL,
    author_role         TEXT NOT NULL DEFAULT 'Etudiant',
    rating              INT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    comment             TEXT NOT NULL,
    sky_points_awarded  INT DEFAULT 0,
    is_featured         BOOLEAN DEFAULT false,
    is_published        BOOLEAN DEFAULT true,
    admin_reply         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS organization_id     UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS school_name         TEXT;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS author_name         TEXT;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS author_role         TEXT DEFAULT 'Etudiant';
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS rating              INT DEFAULT 5;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS comment             TEXT;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS is_featured         BOOLEAN DEFAULT false;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS sky_points_awarded  INT DEFAULT 0;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS is_published         BOOLEAN DEFAULT true;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS admin_reply          TEXT;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

-- Rafraîchir le schema cache Supabase (PostgREST)
NOTIFY pgrst, 'reload schema';

CREATE INDEX IF NOT EXISTS idx_platform_reviews_user     ON platform_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_reviews_rating   ON platform_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_platform_reviews_featured ON platform_reviews(is_featured);
CREATE INDEX IF NOT EXISTS idx_platform_reviews_pub      ON platform_reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_platform_reviews_created  ON platform_reviews(created_at DESC);

ALTER TABLE platform_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can post platform reviews" ON platform_reviews;
DROP POLICY IF EXISTS "Anyone can read published platform reviews" ON platform_reviews;
DROP POLICY IF EXISTS "Superadmin can manage platform reviews" ON platform_reviews;

CREATE POLICY "Users can post platform reviews"
    ON platform_reviews FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read published platform reviews"
    ON platform_reviews FOR SELECT TO anon, authenticated
    USING (is_published = true);

CREATE POLICY "Superadmin can manage platform reviews"
    ON platform_reviews FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('superadmin', 'admin')
        )
    );


-- ────────────────────────────────────────────────────────────────
-- 5. SKY POINTS dans profiles
-- ────────────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sky_points INT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_profiles_sky_points ON profiles(sky_points DESC);


-- ────────────────────────────────────────────────────────────────
-- 6. TABLE : sky_points_log — Historique des points
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sky_points_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_role       TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    points_delta    INT NOT NULL,
    reason          TEXT NOT NULL,
    reference_type  TEXT,
    reference_id    UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sky_log_user    ON sky_points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sky_log_created ON sky_points_log(created_at DESC);

ALTER TABLE sky_points_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own sky logs" ON sky_points_log;
CREATE POLICY "Users can read own sky logs"
    ON sky_points_log FOR SELECT TO authenticated
    USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────
-- 7. FONCTION RPC : award_review_sky_points
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION award_review_sky_points(
    p_user_id   UUID,
    p_role      TEXT,
    p_rating    INT,
    p_reason    TEXT,
    p_org_id    UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_points     INT;
    v_new_total  INT;
BEGIN
    v_points := CASE
        WHEN p_rating = 5 THEN 7
        WHEN p_rating = 4 THEN 4
        WHEN p_rating = 3 THEN 3
        WHEN p_rating = 2 THEN 2
        ELSE 1
    END;

    UPDATE profiles
    SET sky_points = COALESCE(sky_points, 0) + v_points,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING sky_points INTO v_new_total;

    IF NOT FOUND THEN
        RETURN json_build_object('points_awarded', 0, 'new_total', 0);
    END IF;

    INSERT INTO sky_points_log (user_id, user_role, organization_id, points_delta, reason, reference_type)
    VALUES (p_user_id, p_role, p_org_id, v_points, p_reason, 'review');

    RETURN json_build_object('points_awarded', v_points, 'new_total', v_new_total);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('points_awarded', 0, 'new_total', 0, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION award_review_sky_points TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 8. TRIGGERS updated_at
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN VALUES ('bug_reports'), ('feature_suggestions'), ('school_reviews'), ('platform_reviews')
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_upd_%I ON %I;
             CREATE TRIGGER trg_upd_%I BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
            t, t, t, t
        );
    END LOOP;
END; $$;


-- ────────────────────────────────────────────────────────────────
-- VÉRIFICATION FINALE
-- ────────────────────────────────────────────────────────────────

SELECT table_name, COUNT(*) AS nb_colonnes
FROM information_schema.columns
WHERE table_name IN ('bug_reports','feature_suggestions','school_reviews','platform_reviews','sky_points_log')
GROUP BY table_name ORDER BY table_name;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'platform_reviews' AND column_name = 'is_featured';

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'bug_reports' AND column_name = 'browser_info';
