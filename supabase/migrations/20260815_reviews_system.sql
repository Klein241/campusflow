-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: SYSTÈME D'AVIS ÉCOLES & AVIS CAMPUSFLOW (+10 SKY POINTS)
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Table des avis sur les écoles (par étudiants & professeurs)
CREATE TABLE IF NOT EXISTS school_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    org_slug text,
    author_id text,
    author_name text NOT NULL,
    author_role text NOT NULL DEFAULT 'student', -- 'student' | 'teacher'
    author_avatar text,
    classroom_name text,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- RLS pour school_reviews
ALTER TABLE school_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut lire les avis d'école" ON school_reviews;
CREATE POLICY "Tout le monde peut lire les avis d'école" ON school_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utilisateurs peuvent publier un avis d'école" ON school_reviews;
CREATE POLICY "Utilisateurs peuvent publier un avis d'école" ON school_reviews
    FOR INSERT WITH CHECK (true);

-- 2. Table des avis sur la plateforme CampusFlow (tous utilisateurs, gain de 10 Sky Points)
CREATE TABLE IF NOT EXISTS platform_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id text,
    author_name text NOT NULL,
    author_role text NOT NULL DEFAULT 'user', -- 'student' | 'teacher' | 'admin' | 'visiteur'
    author_avatar text,
    school_name text,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text NOT NULL,
    sky_points_awarded boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- RLS pour platform_reviews
ALTER TABLE platform_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut lire les avis CampusFlow" ON platform_reviews;
CREATE POLICY "Tout le monde peut lire les avis CampusFlow" ON platform_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tout le monde peut publier un avis CampusFlow" ON platform_reviews;
CREATE POLICY "Tout le monde peut publier un avis CampusFlow" ON platform_reviews
    FOR INSERT WITH CHECK (true);

-- 3. Fonction RPC pour attribuer 10 Sky Points lors de la publication d'un avis
CREATE OR REPLACE FUNCTION submit_platform_review(
    p_author_id text,
    p_author_name text,
    p_author_role text,
    p_school_name text,
    p_rating integer,
    p_comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_review_id uuid;
    v_student_id uuid;
    v_teacher_id uuid;
    v_org_id uuid;
BEGIN
    -- Insérer l'avis
    INSERT INTO platform_reviews (
        author_id,
        author_name,
        author_role,
        school_name,
        rating,
        comment,
        sky_points_awarded
    ) VALUES (
        p_author_id,
        p_author_name,
        p_author_role,
        p_school_name,
        p_rating,
        p_comment,
        true
    ) RETURNING id INTO v_review_id;

    -- Tenter d'attribuer 10 Sky Points selon le type de compte
    IF p_author_id IS NOT NULL AND p_author_id != '' THEN
        -- Essayer table students
        BEGIN
            UPDATE students 
            SET sky_points = COALESCE(sky_points, 0) + 10 
            WHERE id::text = p_author_id OR access_code = p_author_id;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        -- Essayer table teachers
        BEGIN
            UPDATE teachers 
            SET sky_points = COALESCE(sky_points, 0) + 10 
            WHERE id::text = p_author_id OR email = p_author_id;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        -- Essayer table organizations (admin)
        BEGIN
            UPDATE organizations 
            SET sky_points = COALESCE(sky_points, 0) + 10 
            WHERE id::text = p_author_id OR slug = p_author_id;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'review_id', v_review_id,
        'points_awarded', 10
    );
END;
$$;

-- 4. Notifier Supabase pour recharger le schéma
NOTIFY pgrst, 'reload schema';
