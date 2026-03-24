-- ============================================================
-- SCHEMA SQL COMPLET — SAAS CENTRE DE FORMATION
-- Projet Supabase : nuisijvopyudmbcqpaua
-- Date : 2026-03-24
-- ============================================================
-- Ce schéma crée TOUTES les tables nécessaires pour :
--   - Gestion des filières et promotions
--   - Inscriptions étudiants (enrollments)
--   - Notes et évaluations
--   - Emploi du temps
--   - Présences
--   - Paiements scolarité
--   - Forum étudiant
--   - Boutique / Marketplace
--   - Chat et messages directs
--   - Notifications
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES (complète la table auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT,
    avatar_url      TEXT,
    phone           TEXT,
    email           TEXT,
    city            TEXT,
    country         TEXT,
    whatsapp        TEXT,
    bio             TEXT,
    filiere_id      UUID,                            -- FK ajoutée après création de filieres
    numero_matricule TEXT,
    role            TEXT DEFAULT 'student'
                    CHECK (role IN ('student','teacher','secretary','director','superadmin')),
    annee_entree    INTEGER,
    statut_etudiant TEXT DEFAULT 'actif'
                    CHECK (statut_etudiant IN ('actif','suspendu','diplome','abandonne')),
    date_naissance  DATE,
    genre           TEXT CHECK (genre IN ('M','F','autre')),
    is_active       BOOLEAN DEFAULT true,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, phone, email, country, city)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            'https://api.dicebear.com/7.x/initials/svg?seed=' || COALESCE(NEW.raw_user_meta_data->>'full_name', 'U')
        ),
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'whatsapp', ''),
        NEW.email,
        NEW.raw_user_meta_data->>'country',
        NEW.raw_user_meta_data->>'city'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        email = COALESCE(EXCLUDED.email, profiles.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. FILIÈRES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.filieres (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,
    nom             TEXT NOT NULL,
    description     TEXT,
    duree_mois      INTEGER DEFAULT 24,
    frais_scolarite NUMERIC(10,2) DEFAULT 0,
    couleur         TEXT DEFAULT '#4F46E5',
    icone           TEXT DEFAULT 'book',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- FK profiles → filieres
ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_filiere
    FOREIGN KEY (filiere_id) REFERENCES public.filieres(id) ON DELETE SET NULL;

-- Insérer les 13 filières par défaut
INSERT INTO public.filieres (code, nom, duree_mois, frais_scolarite, couleur, icone) VALUES
    ('INFO',     'Informatique de Gestion',        24, 450000, '#4F46E5', 'monitor'),
    ('COMPTA',   'Comptabilité & Finance',         24, 400000, '#0891B2', 'calculator'),
    ('GEST',     'Gestion des Entreprises',        24, 380000, '#059669', 'briefcase'),
    ('MARKET',   'Marketing & Communication',      24, 380000, '#D97706', 'megaphone'),
    ('SECR',     'Secrétariat & Bureautique',      18, 320000, '#DC2626', 'file-text'),
    ('LOG',      'Logistique & Transport',         24, 400000, '#7C3AED', 'truck'),
    ('BANQ',     'Banque & Assurance',             24, 450000, '#DB2777', 'landmark'),
    ('ELEC',     'Électronique & Électricité',     24, 420000, '#0D9488', 'zap'),
    ('AGRI',     'Agriculture & Agronomie',        24, 350000, '#65A30D', 'leaf'),
    ('SANTE',    'Santé Communautaire',            30, 480000, '#EA580C', 'heart-pulse'),
    ('DROIT',    'Droit & Sciences Juridiques',    24, 400000, '#6366F1', 'scale'),
    ('TOURISME', 'Tourisme & Hôtellerie',          18, 360000, '#E11D48', 'globe'),
    ('MEDIA',    'Journalisme & Médias',           24, 380000, '#0284C7', 'tv')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. PROMOTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promotions (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filiere_id      UUID NOT NULL REFERENCES public.filieres(id) ON DELETE CASCADE,
    nom             TEXT NOT NULL,
    annee_debut     INTEGER NOT NULL,
    annee_fin       INTEGER NOT NULL,
    effectif_max    INTEGER DEFAULT 40,
    is_active       BOOLEAN DEFAULT true,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. INSCRIPTIONS (enrollments)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enrollments (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    filiere_id      UUID NOT NULL REFERENCES public.filieres(id) ON DELETE CASCADE,
    promotion_id    UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
    date_inscription TIMESTAMPTZ DEFAULT now(),
    statut          TEXT DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente','confirmee','annulee','terminee')),
    montant_paye    NUMERIC(10,2) DEFAULT 0,
    notes_admin     TEXT,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. MATIÈRES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.matieres (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filiere_id      UUID NOT NULL REFERENCES public.filieres(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    nom             TEXT NOT NULL,
    description     TEXT,
    credits         INTEGER DEFAULT 3,
    semestre        INTEGER DEFAULT 1,
    type_matiere    TEXT DEFAULT 'cours'
                    CHECK (type_matiere IN ('cours','td','tp','stage','projet')),
    teacher_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active       BOOLEAN DEFAULT true,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notes (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    matiere_id      UUID NOT NULL REFERENCES public.matieres(id) ON DELETE CASCADE,
    promotion_id    UUID REFERENCES public.promotions(id),
    type_evaluation TEXT DEFAULT 'devoir'
                    CHECK (type_evaluation IN ('devoir','examen','rattrapage','tp','projet')),
    note            NUMERIC(5,2) CHECK (note >= 0 AND note <= 20),
    coefficient     NUMERIC(4,2) DEFAULT 1.0,
    periode         TEXT,
    commentaire     TEXT,
    saisi_par       UUID REFERENCES public.profiles(id),
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. EMPLOI DU TEMPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.timetable (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filiere_id      UUID NOT NULL REFERENCES public.filieres(id) ON DELETE CASCADE,
    promotion_id    UUID REFERENCES public.promotions(id),
    matiere_id      UUID NOT NULL REFERENCES public.matieres(id) ON DELETE CASCADE,
    teacher_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    jour_semaine    INTEGER CHECK (jour_semaine BETWEEN 1 AND 7),
    heure_debut     TIME NOT NULL,
    heure_fin       TIME NOT NULL,
    salle           TEXT,
    est_recurrent   BOOLEAN DEFAULT true,
    date_specifique DATE,
    type_seance     TEXT DEFAULT 'cours'
                    CHECK (type_seance IN ('cours','td','tp','examen','rattrapage')),
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. PRÉSENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.presences (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    timetable_id    UUID REFERENCES public.timetable(id) ON DELETE SET NULL,
    matiere_id      UUID REFERENCES public.matieres(id) ON DELETE SET NULL,
    date_seance     DATE NOT NULL,
    statut          TEXT DEFAULT 'present'
                    CHECK (statut IN ('present','absent','retard','justifie')),
    justification   TEXT,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. PAIEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.paiements (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    enrollment_id   UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
    montant         NUMERIC(10,2) NOT NULL,
    devise          TEXT DEFAULT 'XAF',
    type_paiement   TEXT DEFAULT 'scolarite'
                    CHECK (type_paiement IN ('scolarite','inscription','materiel','autre')),
    mode_paiement   TEXT DEFAULT 'especes'
                    CHECK (mode_paiement IN ('especes','mobile_money','virement','cheque','carte')),
    reference       TEXT,
    statut          TEXT DEFAULT 'confirme'
                    CHECK (statut IN ('en_attente','confirme','annule','rembourse')),
    periode         TEXT,
    recu_par        UUID REFERENCES public.profiles(id),
    notes           TEXT,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. FORUM
-- ============================================================
CREATE TABLE IF NOT EXISTS public.forum_threads (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filiere_id      UUID REFERENCES public.filieres(id) ON DELETE SET NULL,
    matiere_id      UUID REFERENCES public.matieres(id) ON DELETE SET NULL,
    auteur_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    titre           TEXT NOT NULL,
    contenu         TEXT NOT NULL,
    type_thread     TEXT DEFAULT 'question'
                    CHECK (type_thread IN ('question','annonce','discussion','aide')),
    is_epingle      BOOLEAN DEFAULT false,
    is_resolu       BOOLEAN DEFAULT false,
    vues            INTEGER DEFAULT 0,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_replies (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    thread_id       UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
    auteur_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contenu         TEXT NOT NULL,
    is_solution     BOOLEAN DEFAULT false,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. BOUTIQUE / MARKETPLACE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shop_products (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nom             TEXT NOT NULL,
    description     TEXT,
    prix            NUMERIC(10,2) NOT NULL DEFAULT 0,
    devise          TEXT DEFAULT 'XAF',
    image_url       TEXT,
    categorie       TEXT DEFAULT 'fourniture'
                    CHECK (categorie IN ('fourniture','cours_payant','materiel','uniforme','autre')),
    filiere_id      UUID REFERENCES public.filieres(id) ON DELETE SET NULL,
    stock           INTEGER DEFAULT 0,
    is_visible      BOOLEAN DEFAULT true,
    created_by      UUID REFERENCES public.profiles(id),
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_orders (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
    quantite        INTEGER DEFAULT 1,
    montant_total   NUMERIC(10,2) NOT NULL,
    statut          TEXT DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente','confirmee','livree','annulee')),
    mode_paiement   TEXT DEFAULT 'especes',
    notes           TEXT,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. TABLES EXISTANTES APP (chat, notifications, etc.)
-- ============================================================

-- Demandes de tutorat / anciennement prayer_requests
CREATE TABLE IF NOT EXISTS public.tutoring_requests (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    category        TEXT DEFAULT 'other',
    is_anonymous    BOOLEAN DEFAULT false,
    photos          TEXT[],
    is_answered     BOOLEAN DEFAULT false,
    answered_at     TIMESTAMPTZ,
    prayer_count    INTEGER DEFAULT 0,
    prayed_by       UUID[] DEFAULT '{}',
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Feedbacks d'expérience / témoignages
CREATE TABLE IF NOT EXISTS public.experience_feedbacks (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    photos          TEXT[],
    is_approved     BOOLEAN DEFAULT false,
    likes           INTEGER DEFAULT 0,
    liked_by        UUID[] DEFAULT '{}',
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Progression étudiant (anciennement student_progress)
CREATE TABLE IF NOT EXISTS public.student_progress (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_number      INTEGER NOT NULL,
    completed       BOOLEAN DEFAULT false,
    completed_at    TIMESTAMPTZ,
    prayer_completed BOOLEAN DEFAULT false,
    courses_reading_completed BOOLEAN DEFAULT false,
    fasting_completed BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, day_number)
);

-- Groupes d'étude (anciennement prayer groups)
CREATE TABLE IF NOT EXISTS public.study_groups (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    created_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_open         BOOLEAN DEFAULT true,
    is_answered     BOOLEAN DEFAULT false,
    max_members     INTEGER DEFAULT 50,
    member_count    INTEGER DEFAULT 0,
    requires_approval BOOLEAN DEFAULT false,
    is_closed       BOOLEAN DEFAULT false,
    closed_reason   TEXT,
    closed_at       TIMESTAMPTZ,
    pending_requests INTEGER DEFAULT 0,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_group_members (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id        UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role            TEXT DEFAULT 'member' CHECK (role IN ('admin','moderator','member')),
    joined_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.study_group_join_requests (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id        UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at      TIMESTAMPTZ DEFAULT now(),
    reviewed_at     TIMESTAMPTZ,
    reviewed_by     UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.study_group_messages (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id        UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_prayer       BOOLEAN DEFAULT false,
    msg_type        TEXT DEFAULT 'text',
    media_url       TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Messages directs
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT false,
    msg_type        TEXT DEFAULT 'text',
    media_url       TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT,
    data            JSONB DEFAULT '{}',
    is_read         BOOLEAN DEFAULT false,
    actor_id        UUID REFERENCES public.profiles(id),
    actor_avatar    TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- App settings (admin-controllable key-value store)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key             TEXT PRIMARY KEY,
    value           TEXT,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription    JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, subscription)
);

-- Livestream comments
CREATE TABLE IF NOT EXISTS public.livestream_comments (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    livestream_id   TEXT NOT NULL DEFAULT 'global-live',
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    parent_id       UUID REFERENCES public.livestream_comments(id) ON DELETE CASCADE,
    is_pinned       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Livestream reactions
CREATE TABLE IF NOT EXISTS public.livestream_reactions (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    livestream_id   TEXT NOT NULL DEFAULT 'global-live',
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji           TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Day resources (admin uploads per day)
CREATE TABLE IF NOT EXISTS public.day_resources (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    day_number      INTEGER NOT NULL,
    resource_type   TEXT NOT NULL CHECK (resource_type IN ('image','video','pdf','text','audio')),
    title           TEXT NOT NULL,
    description     TEXT,
    url             TEXT,
    content         TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Day views tracking
CREATE TABLE IF NOT EXISTS public.day_views (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_number      INTEGER NOT NULL,
    viewed_at       TIMESTAMPTZ DEFAULT now(),
    duration_seconds INTEGER DEFAULT 0
);

-- ============================================================
-- 13. INDEX PERFORMANCES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_filiere       ON public.profiles(filiere_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role          ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant        ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student    ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_filiere    ON public.enrollments(filiere_id);
CREATE INDEX IF NOT EXISTS idx_notes_student          ON public.notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_matiere          ON public.notes(matiere_id);
CREATE INDEX IF NOT EXISTS idx_presences_student      ON public.presences(student_id);
CREATE INDEX IF NOT EXISTS idx_presences_date         ON public.presences(date_seance);
CREATE INDEX IF NOT EXISTS idx_paiements_student      ON public.paiements(student_id);
CREATE INDEX IF NOT EXISTS idx_timetable_filiere      ON public.timetable(filiere_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_filiere  ON public.forum_threads(filiere_id);
CREATE INDEX IF NOT EXISTS idx_matieres_filiere       ON public.matieres(filiere_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_filiere  ON public.shop_products(filiere_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_requests_user ON public.tutoring_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_experience_fb_user     ON public.experience_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_study_group_msgs_group ON public.study_group_messages(group_id);

-- ============================================================
-- 14. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Filieres
ALTER TABLE public.filieres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "filieres_select_all" ON public.filieres FOR SELECT TO authenticated USING (true);
CREATE POLICY "filieres_select_anon" ON public.filieres FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "filieres_admin_all" ON public.filieres FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('director','superadmin')));

-- Promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions_select" ON public.promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "promotions_select_anon" ON public.promotions FOR SELECT TO anon USING (is_active = true);

-- Enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments_select" ON public.enrollments FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secretary','director','superadmin')));
CREATE POLICY "enrollments_insert" ON public.enrollments FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secretary','director','superadmin')));

-- Matieres
ALTER TABLE public.matieres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matieres_select" ON public.matieres FOR SELECT TO authenticated USING (true);

-- Notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','secretary','director','superadmin')));
CREATE POLICY "notes_insert" ON public.notes FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','director','superadmin')));

-- Timetable
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timetable_select" ON public.timetable FOR SELECT TO authenticated USING (true);

-- Presences
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presences_select" ON public.presences FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','secretary','director','superadmin')));

-- Paiements
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paiements_select" ON public.paiements FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secretary','director','superadmin')));

-- Forum
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_threads_select" ON public.forum_threads FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_threads_insert" ON public.forum_threads FOR INSERT TO authenticated WITH CHECK (auteur_id = auth.uid());
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_replies_select" ON public.forum_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_replies_insert" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK (auteur_id = auth.uid());

-- Shop
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_products_select" ON public.shop_products FOR SELECT TO authenticated USING (is_visible = true);
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_orders_select" ON public.shop_orders FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secretary','director','superadmin')));
CREATE POLICY "shop_orders_insert" ON public.shop_orders FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- Tutoring requests
ALTER TABLE public.tutoring_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutoring_select" ON public.tutoring_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "tutoring_select_anon" ON public.tutoring_requests FOR SELECT TO anon USING (true);
CREATE POLICY "tutoring_insert" ON public.tutoring_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tutoring_update" ON public.tutoring_requests FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Experience feedbacks
ALTER TABLE public.experience_feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_select" ON public.experience_feedbacks FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedback_select_anon" ON public.experience_feedbacks FOR SELECT TO anon USING (is_approved = true);
CREATE POLICY "feedback_insert" ON public.experience_feedbacks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Student progress
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_select" ON public.student_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "progress_insert" ON public.student_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_update" ON public.student_progress FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Study groups
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_select" ON public.study_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups_insert" ON public.study_groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_members_select" ON public.study_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "group_members_insert" ON public.study_group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_msgs_select" ON public.study_group_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "group_msgs_insert" ON public.study_group_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
ALTER TABLE public.study_group_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "join_req_select" ON public.study_group_join_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "join_req_insert" ON public.study_group_join_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Direct messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm_select" ON public.direct_messages FOR SELECT TO authenticated
    USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "dm_insert" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "dm_update" ON public.direct_messages FOR UPDATE TO authenticated USING (receiver_id = auth.uid());

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- App settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_select_anon" ON public.app_settings FOR SELECT TO anon USING (true);

-- Push subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_select" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Livestream
ALTER TABLE public.livestream_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_comments_select" ON public.livestream_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_comments_insert" ON public.livestream_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "live_comments_delete" ON public.livestream_comments FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('director','superadmin')));
ALTER TABLE public.livestream_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_reactions_select" ON public.livestream_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_reactions_insert" ON public.livestream_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Day resources & views
ALTER TABLE public.day_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "day_res_select" ON public.day_resources FOR SELECT TO authenticated USING (true);
ALTER TABLE public.day_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "day_views_select" ON public.day_views FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "day_views_insert" ON public.day_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 15. FONCTIONS UTILITAIRES
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_moyenne_etudiant(
    p_student_id UUID,
    p_filiere_id UUID,
    p_periode    TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_moyenne NUMERIC;
BEGIN
    SELECT SUM(n.note * n.coefficient) / NULLIF(SUM(n.coefficient), 0)
    INTO v_moyenne
    FROM public.notes n
    JOIN public.matieres m ON m.id = n.matiere_id
    WHERE n.student_id = p_student_id
      AND m.filiere_id = p_filiere_id
      AND (p_periode IS NULL OR n.periode = p_periode)
      AND n.note IS NOT NULL;
    RETURN ROUND(COALESCE(v_moyenne, 0), 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_taux_presence(
    p_student_id UUID,
    p_filiere_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_total    INTEGER;
    v_presents INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE p.statut IN ('present', 'retard'))
    INTO v_total, v_presents
    FROM public.presences p
    LEFT JOIN public.timetable t ON t.id = p.timetable_id
    WHERE p.student_id = p_student_id
      AND (p_filiere_id IS NULL OR t.filiere_id = p_filiere_id);
    IF v_total = 0 THEN RETURN 0; END IF;
    RETURN ROUND((v_presents::NUMERIC / v_total) * 100, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 16. TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['profiles','filieres','enrollments','matieres','notes','forum_threads','shop_products','shop_orders']
    LOOP
        BEGIN
            EXECUTE format(
                'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
                t, t
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END LOOP;
END $$;

-- ============================================================
-- 17. REALTIME — activer pour les tables clés
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tutoring_requests;

-- ============================================================
-- FIN DU SCHEMA ✅
-- ============================================================
