-- ═══════════════════════════════════════════════════════════════════════
-- CAMPUSFLOW — CONSOLIDATED MASTER MIGRATION (TOUTES LES NOUVELLES FONCTIONNALITÉS)
-- Copiez-collez l'intégralité de ce script dans Supabase SQL Editor et cliquez sur "Run".
-- ═══════════════════════════════════════════════════════════════════════

-- 1. COLONNES COMPLÉMENTAIRES POUR LES ORGANISATIONS (ÉCOLES)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hero_template text DEFAULT 'minimal';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS landing_layout text DEFAULT 'classic';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS unlocked_styles jsonb DEFAULT '["minimal", "classic"]'::jsonb;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sky_points integer DEFAULT 1000;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_daily_claim text DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS monitoring_unlocked boolean DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS security_pin text DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signature_url text DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stamp_url text DEFAULT NULL;

-- 2. TABLE DES PARAMÈTRES GLOBAUX & GRILLE TARIFAIRE SUPERADMIN
CREATE TABLE IF NOT EXISTS platform_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read platform_settings" ON platform_settings;
CREATE POLICY "Public read platform_settings" ON platform_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage platform_settings" ON platform_settings;
CREATE POLICY "Admins manage platform_settings" ON platform_settings
    FOR ALL USING (true) WITH CHECK (true);

-- Initialiser la grille tarifaire par défaut
INSERT INTO platform_settings (key, value, updated_at)
VALUES (
    'premium_styles_pricing',
    '{
        "minimal": 0,
        "full": 500,
        "split": 750,
        "classic": 0,
        "hub_onglets": 5000,
        "segmented_hub": 6000,
        "glass_showcase": 7000,
        "bento_grid": 75000,
        "bento_box": 85000
    }'::jsonb,
    now()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

-- Fonction RPC pour sauvegarder les paramètres globaux (bypass RLS)
CREATE OR REPLACE FUNCTION set_platform_setting(p_key text, p_value jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO platform_settings (key, value, updated_at)
    VALUES (p_key, p_value, now())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Ajouter platform_settings aux publications Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'platform_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE platform_settings;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore si non supporté
END;
$$;

-- 3. TABLE DES AVIS SUR LES ÉCOLES (ÉTUDIANTS & PROFESSEURS)
CREATE TABLE IF NOT EXISTS school_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    org_slug text,
    author_id text,
    author_name text NOT NULL,
    author_role text NOT NULL DEFAULT 'student',
    author_avatar text,
    classroom_name text,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE school_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut lire les avis d'école" ON school_reviews;
CREATE POLICY "Tout le monde peut lire les avis d'école" ON school_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utilisateurs peuvent publier un avis d'école" ON school_reviews;
CREATE POLICY "Utilisateurs peuvent publier un avis d'école" ON school_reviews
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Suppression avis d'école" ON school_reviews;
CREATE POLICY "Suppression avis d'école" ON school_reviews
    FOR DELETE USING (true);

-- 4. TABLE DES AVIS SUR CAMPUSFLOW (+10 SKY POINTS)
CREATE TABLE IF NOT EXISTS platform_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id text,
    author_name text NOT NULL,
    author_role text NOT NULL DEFAULT 'user',
    author_avatar text,
    school_name text,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text NOT NULL,
    sky_points_awarded boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE platform_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut lire les avis CampusFlow" ON platform_reviews;
CREATE POLICY "Tout le monde peut lire les avis CampusFlow" ON platform_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tout le monde peut publier un avis CampusFlow" ON platform_reviews;
CREATE POLICY "Tout le monde peut publier un avis CampusFlow" ON platform_reviews
    FOR INSERT WITH CHECK (true);

-- 5. FONCTION RPC POUR CRÉDITER 10 POINTS LORS D'UN AVIS
CREATE OR REPLACE FUNCTION submit_platform_review(
    p_author_id text,
    p_author_name text,
    p_author_role text,
    p_school_name text,
    p_rating integer,
    p_comment text,
    p_author_avatar text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_review_id uuid;
    v_awarded boolean := false;
BEGIN
    INSERT INTO platform_reviews (
        author_id, author_name, author_role, school_name, rating, comment, author_avatar, sky_points_awarded
    ) VALUES (
        p_author_id, p_author_name, p_author_role, p_school_name, p_rating, p_comment, p_author_avatar, true
    )
    RETURNING id INTO v_review_id;

    -- Créditer 10 points si author_id est un étudiant
    IF p_author_id IS NOT NULL AND p_author_id <> '' THEN
        UPDATE student_profiles
        SET sky_points = COALESCE(sky_points, 0) + 10
        WHERE id::text = p_author_id;

        IF FOUND THEN
            v_awarded := true;
            INSERT INTO sky_transactions (student_id, amount, reason, created_at)
            VALUES (p_author_id::uuid, 10, 'Avis 5 étoiles sur CampusFlow', now())
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'review_id', v_review_id,
        'sky_points_awarded', v_awarded
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. RECHARGER LE CACHE DU SCHÉMA SUPABASE
NOTIFY pgrst, 'reload schema';
