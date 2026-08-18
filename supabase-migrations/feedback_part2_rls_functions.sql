-- ================================================================
-- IZITEACH — PARTIE 2 : RLS + FONCTION SKY POINTS
-- Exécutez CE BLOC EN SECOND (après la Partie 1)
-- ================================================================
-- NOTE: Toutes les politiques utilisent ::text pour éviter
-- l'erreur "operator does not exist: uuid = text" (#42883)
-- ================================================================


-- ── RLS bug_reports ─────────────────────────────────────────────
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create bug reports"    ON bug_reports;
DROP POLICY IF EXISTS "Users can view own bug reports"  ON bug_reports;
DROP POLICY IF EXISTS "Superadmin can manage bug reports" ON bug_reports;

CREATE POLICY "Users can create bug reports"
    ON bug_reports FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own bug reports"
    ON bug_reports FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Superadmin can manage bug reports"
    ON bug_reports FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id::text = auth.uid()::text
              AND profiles.role IN ('superadmin', 'admin')
        )
    );


-- ── RLS feature_suggestions ──────────────────────────────────────
ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit suggestions"       ON feature_suggestions;
DROP POLICY IF EXISTS "Users can view own suggestions"     ON feature_suggestions;
DROP POLICY IF EXISTS "Superadmin can manage suggestions"  ON feature_suggestions;

CREATE POLICY "Users can submit suggestions"
    ON feature_suggestions FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own suggestions"
    ON feature_suggestions FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Superadmin can manage suggestions"
    ON feature_suggestions FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id::text = auth.uid()::text
              AND profiles.role IN ('superadmin', 'admin')
        )
    );


-- ── RLS school_reviews ───────────────────────────────────────────
ALTER TABLE school_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can post school reviews"            ON school_reviews;
DROP POLICY IF EXISTS "Anyone can read published school reviews" ON school_reviews;
DROP POLICY IF EXISTS "Superadmin can manage school reviews"     ON school_reviews;

CREATE POLICY "Users can post school reviews"
    ON school_reviews FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Anyone can read published school reviews"
    ON school_reviews FOR SELECT TO anon, authenticated
    USING (is_published = true);

CREATE POLICY "Superadmin can manage school reviews"
    ON school_reviews FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id::text = auth.uid()::text
              AND profiles.role IN ('superadmin', 'admin')
        )
    );


-- ── RLS platform_reviews ─────────────────────────────────────────
ALTER TABLE platform_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can post platform reviews"            ON platform_reviews;
DROP POLICY IF EXISTS "Anyone can read published platform reviews" ON platform_reviews;
DROP POLICY IF EXISTS "Superadmin can manage platform reviews"     ON platform_reviews;

CREATE POLICY "Users can post platform reviews"
    ON platform_reviews FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Anyone can read published platform reviews"
    ON platform_reviews FOR SELECT TO anon, authenticated
    USING (is_published = true);

CREATE POLICY "Superadmin can manage platform reviews"
    ON platform_reviews FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id::text = auth.uid()::text
              AND profiles.role IN ('superadmin', 'admin')
        )
    );


-- ── RLS sky_points_log ───────────────────────────────────────────
ALTER TABLE sky_points_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own sky logs" ON sky_points_log;

CREATE POLICY "Users can read own sky logs"
    ON sky_points_log FOR SELECT TO authenticated
    USING (auth.uid()::text = user_id::text);


-- ── Fonction RPC award_review_sky_points ─────────────────────────
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
    v_points    INT;
    v_new_total INT;
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
    WHERE id::text = p_user_id::text
    RETURNING sky_points INTO v_new_total;

    IF NOT FOUND THEN
        RETURN json_build_object('points_awarded', 0, 'new_total', 0);
    END IF;

    INSERT INTO sky_points_log (
        user_id, user_role, organization_id,
        points_delta, reason, reference_type
    )
    VALUES (
        p_user_id::text, p_role, p_org_id,
        v_points, p_reason, 'review'
    );

    RETURN json_build_object('points_awarded', v_points, 'new_total', v_new_total);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('points_awarded', 0, 'new_total', 0, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION award_review_sky_points TO authenticated;

-- Rafraîchir le schema cache PostgREST (IMPORTANT !)
NOTIFY pgrst, 'reload schema';


-- ── Triggers auto updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN VALUES
        ('bug_reports'),
        ('feature_suggestions'),
        ('school_reviews'),
        ('platform_reviews')
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_upd_%I ON %I;
             CREATE TRIGGER trg_upd_%I BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
            t, t, t, t
        );
    END LOOP;
END; $$;


-- ── Vérification finale ──────────────────────────────────────────
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE
    (table_name = 'bug_reports'      AND column_name = 'browser_info') OR
    (table_name = 'platform_reviews' AND column_name = 'is_featured')
ORDER BY table_name;
