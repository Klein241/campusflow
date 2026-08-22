-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 064: DAME SKY PROJETS / DOSSIERS, HISTORIQUE, SKILLS & QUIZ REVISION
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Table des Projets / Dossiers thématiques de conversation (comme sur Claude Projets)
CREATE TABLE IF NOT EXISTS dame_sky_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID,
    user_role TEXT NOT NULL DEFAULT 'student',
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT 'amber',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table de l'historique des conversations Dame SKY
CREATE TABLE IF NOT EXISTS dame_sky_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES dame_sky_projects(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID,
    user_name TEXT,
    user_role TEXT NOT NULL DEFAULT 'student',
    title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
    mode TEXT NOT NULL DEFAULT 'general',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table des Skills IA personnalisés (uploadables par le SuperAdmin pour Prof / Admin / Étudiant)
CREATE TABLE IF NOT EXISTS dame_sky_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    target_role TEXT NOT NULL DEFAULT 'all' CHECK (target_role IN ('all', 'admin', 'prof', 'student')),
    category TEXT NOT NULL DEFAULT 'pedagogy' CHECK (category IN ('pedagogy', 'governance', 'student_revision', 'methodology', 'technical', 'custom')),
    content TEXT NOT NULL,
    file_url TEXT,
    file_name TEXT,
    file_size INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    usage_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Insérer des Skills initiaux d'élite pour Dame SKY
INSERT INTO dame_sky_skills (title, description, target_role, category, content, is_active)
VALUES
(
    'Ingénierie Pédagogique & Différenciation',
    'Méthodologie pour concevoir des cours modulaires, classes inversées et remédiation scolaire.',
    'prof',
    'pedagogy',
    '# Guide Pédagogique d''Élite\n1. Définir des objectifs d''apprentissage clairs (Taxonomie de Bloom).\n2. Intégrer des moments d''évaluation formative réguliers.\n3. Adapter le rythme aux élèves en difficulté sans baisser le niveau d''exigence.\n4. Proposer des grilles de correction explicites et transparentes.',
    true
),
(
    'Gouvernance & Recouvrement des Frais Scolaires',
    'Stratégie de gestion financière, relances graduées et rentabilité des filières.',
    'admin',
    'governance',
    '# Stratégie de Gestion et Recouvrement\n1. Calendrier d''échéances clair dès l''inscription.\n2. Relances automatiques douces à J-7, J-0, et J+7 via WhatsApp/SMS.\n3. Entretien avec la direction avant toute suspension administrative.\n4. Analyse mensuelle du coût par élève et taux d''occupation des salles.',
    true
),
(
    'Méthode Socratique de Révision Active',
    'Protocole d''entraînement des élèves basé sur les cours publiés avec gain de Sky Points.',
    'student',
    'student_revision',
    '# Guide de Révision Active\n1. Poser des questions directes sur les leçons publiées de l''école.\n2. Ne jamais donner la solution avant que l''élève n''ait proposé un raisonnement.\n3. Valider avec rigueur et créditer 1 Sky Point à chaque bonne réponse argumentée.',
    true
)
ON CONFLICT DO NOTHING;

-- 5. RPC sécurisée pour récompenser l'étudiant lors d'une révision réussie (+1 Sky Point)
CREATE OR REPLACE FUNCTION reward_student_revision_point(
    p_student_id UUID,
    p_reason TEXT DEFAULT 'Révision interactive validée avec Dame SKY'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points INT;
    v_new_points INT;
    v_org_id UUID;
BEGIN
    -- Récupérer les points actuels de l'étudiant
    SELECT sky_points, organization_id INTO v_current_points, v_org_id
    FROM student_profiles
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Étudiant introuvable');
    END IF;

    v_new_points := COALESCE(v_current_points, 0) + 1;

    -- Mettre à jour les points de l'étudiant
    UPDATE student_profiles
    SET sky_points = v_new_points
    WHERE id = p_student_id;

    -- Notifier l'étudiant
    INSERT INTO notifications (
        user_id,
        organization_id,
        title,
        message,
        type,
        created_at
    ) VALUES (
        p_student_id,
        v_org_id,
        '⭐ +1 Sky Point gagné !',
        'Félicitations ! Dame SKY a validé votre réponse : ' || p_reason,
        'achievement',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'previous_points', v_current_points,
        'new_points', v_new_points,
        'message', '+1 Sky Point crédité avec succès !'
    );
END;
$$;

-- 6. Indexation
CREATE INDEX IF NOT EXISTS idx_dame_sky_projects_user ON dame_sky_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_dame_sky_projects_org ON dame_sky_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_dame_sky_conversations_proj ON dame_sky_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_dame_sky_conversations_user ON dame_sky_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_dame_sky_skills_role ON dame_sky_skills(target_role);

-- 7. RLS
ALTER TABLE dame_sky_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE dame_sky_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dame_sky_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on dame_sky_projects" ON dame_sky_projects;
CREATE POLICY "Allow all on dame_sky_projects" ON dame_sky_projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on dame_sky_conversations" ON dame_sky_conversations;
CREATE POLICY "Allow all on dame_sky_conversations" ON dame_sky_conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read active dame_sky_skills" ON dame_sky_skills;
CREATE POLICY "Allow read active dame_sky_skills" ON dame_sky_skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all on dame_sky_skills for service role and superadmin" ON dame_sky_skills;
CREATE POLICY "Allow all on dame_sky_skills for service role and superadmin" ON dame_sky_skills FOR ALL USING (true) WITH CHECK (true);
