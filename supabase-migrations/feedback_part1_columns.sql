-- ================================================================
-- IZITEACH — PARTIE 1 : COLONNES SEULEMENT
-- Exécutez CE BLOC EN PREMIER dans Supabase SQL Editor
-- ================================================================

-- ── 1. bug_reports ──────────────────────────────────────────────
-- Supprimer les contraintes NOT NULL qui bloquent l'insertion
ALTER TABLE bug_reports ALTER COLUMN title DROP NOT NULL;
ALTER TABLE bug_reports ALTER COLUMN description DROP NOT NULL;
ALTER TABLE bug_reports ALTER COLUMN user_name DROP NOT NULL;
ALTER TABLE bug_reports ALTER COLUMN user_role DROP NOT NULL;
ALTER TABLE bug_reports ALTER COLUMN status DROP NOT NULL;
-- Ajouter les colonnes manquantes
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_id         TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_name       TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_role       TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_email      TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS org_name        TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS org_id          UUID;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS org_slug        TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS title           TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS page_url        TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS browser_info    TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS screenshot_url  TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS admin_notes     TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS priority        TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS status          TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ;

-- ── 2. feature_suggestions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_suggestions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT,
    organization_id UUID,
    org_name       TEXT,
    user_name      TEXT,
    user_role      TEXT DEFAULT 'student',
    user_email     TEXT,
    title          TEXT,
    description    TEXT,
    category       TEXT DEFAULT 'other',
    status         TEXT DEFAULT 'submitted',
    votes          INT DEFAULT 0,
    admin_response TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS user_id         TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS user_name       TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS user_role       TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS user_email      TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS org_name        TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS title           TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS category        TEXT DEFAULT 'other';
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'submitted';
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS votes           INT DEFAULT 0;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS admin_response  TEXT;
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feature_suggestions ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- ── 3. school_reviews ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_reviews (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID,
    school_name        TEXT,
    user_id            TEXT,
    author_name        TEXT,
    author_role        TEXT DEFAULT 'Etudiant',
    rating             INT DEFAULT 5,
    comment            TEXT,
    sky_points_awarded INT DEFAULT 0,
    is_published       BOOLEAN DEFAULT true,
    is_featured        BOOLEAN DEFAULT false,
    admin_reply        TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS user_id            TEXT;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS author_name         TEXT;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS author_role         TEXT DEFAULT 'Etudiant';
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS rating              INT DEFAULT 5;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS comment             TEXT;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS sky_points_awarded  INT DEFAULT 0;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS is_published        BOOLEAN DEFAULT true;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS is_featured         BOOLEAN DEFAULT false;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS admin_reply         TEXT;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS organization_id     UUID;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS school_name         TEXT;
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE school_reviews ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

-- ── 4. platform_reviews ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_reviews (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID,
    school_name        TEXT,
    user_id            TEXT,
    author_name        TEXT,
    author_role        TEXT DEFAULT 'Etudiant',
    rating             INT DEFAULT 5,
    comment            TEXT,
    sky_points_awarded INT DEFAULT 0,
    is_featured        BOOLEAN DEFAULT false,
    is_published       BOOLEAN DEFAULT true,
    admin_reply        TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS user_id            TEXT;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS is_featured         BOOLEAN DEFAULT false;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS sky_points_awarded  INT DEFAULT 0;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS is_published         BOOLEAN DEFAULT true;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS admin_reply          TEXT;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS organization_id      UUID;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS school_name          TEXT;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS author_name          TEXT;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS author_role           TEXT DEFAULT 'Etudiant';
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS rating               INT DEFAULT 5;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS comment              TEXT;
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS created_at           TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT NOW();

-- ── 5. sky_points dans profiles ─────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sky_points INT DEFAULT 0;

-- ── 6. sky_points_log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sky_points_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    user_role       TEXT,
    organization_id UUID,
    points_delta    INT NOT NULL,
    reason          TEXT NOT NULL,
    reference_type  TEXT,
    reference_id    UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Vérification
SELECT 'browser_info OK' AS check1
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bug_reports' AND column_name = 'browser_info'
);

SELECT 'is_featured OK' AS check2
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_reviews' AND column_name = 'is_featured'
);
