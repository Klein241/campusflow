-- ============================================================
-- CAMPUSFLOW — SCHEMA SQL COMPLET & IDEMPOTENT
-- ============================================================
-- Ce script peut être exécuté PLUSIEURS FOIS sans erreur.
-- Toutes les opérations utilisent IF NOT EXISTS / DO $$ blocks.
-- Date : 2026-03-24
-- ============================================================

-- ── EXTENSIONS ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES
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
    filiere_id      UUID,
    numero_matricule TEXT,
    role            TEXT DEFAULT 'student'
                    CHECK (role IN ('student','teacher','secretary','director','superadmin')),
    annee_entree    INTEGER,
    is_disabled     BOOLEAN DEFAULT false,
    disabled_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    organization_id UUID
);

-- Auto-create profile on auth signup
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
-- 2. ORGANIZATIONS (Multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    type            TEXT NOT NULL,
    motto           TEXT,
    logo_url        TEXT,
    country         TEXT NOT NULL DEFAULT 'Cameroun',
    city            TEXT NOT NULL,
    quarter         TEXT,
    street          TEXT,
    phone           TEXT NOT NULL,
    whatsapp        TEXT,
    email           TEXT NOT NULL,
    other_phone     TEXT,
    other_phone_label TEXT,
    owner_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_role      TEXT,
    owner_first_name TEXT,
    owner_last_name  TEXT,
    setup_completed BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_owner ON public.organizations(owner_id);

-- FK profiles → organizations (safe)
DO $$ BEGIN
    ALTER TABLE public.profiles
        ADD CONSTRAINT fk_profiles_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. FILIÈRES
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
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- FK profiles → filieres (safe)
DO $$ BEGIN
    ALTER TABLE public.profiles
        ADD CONSTRAINT fk_profiles_filiere
        FOREIGN KEY (filiere_id) REFERENCES public.filieres(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 13 filières par défaut (ignore si déjà existantes)
INSERT INTO public.filieres (code, nom, duree_mois, frais_scolarite, couleur, icone) VALUES
    ('INFO',     'Informatique de Gestion',        24, 450000, '#4F46E5', 'monitor'),
    ('COMPTA',   'Comptabilité & Finance',         24, 400000, '#0891B2', 'calculator'),
    ('GEST',     'Gestion des Entreprises',        24, 380000, '#059669', 'briefcase'),
    ('MARKET',   'Marketing & Communication',      24, 380000, '#D97706', 'megaphone'),
    ('SECR',     'Secrétariat & Bureautique',      18, 320000, '#DC2626', 'file-text'),
    ('DROIT',    'Droit & Admin Publique',          24, 350000, '#7C3AED', 'scale'),
    ('SANTE',    'Sciences de la Santé',           36, 550000, '#EC4899', 'heart-pulse'),
    ('LOGIST',   'Logistique & Transport',         24, 380000, '#F59E0B', 'truck'),
    ('TOURISME', 'Tourisme & Hôtellerie',          24, 380000, '#10B981', 'palm-tree'),
    ('BTP',      'BTP & Génie Civil',              36, 500000, '#6B7280', 'house'),
    ('AGRO',     'Agro-industrie & Agronomie',     36, 420000, '#22C55E', 'sprout'),
    ('ELEC',     'Électronique & Électrotechnique', 36, 480000, '#EAB308', 'zap'),
    ('COMM',     'Communication Digitale',         18, 320000, '#8B5CF6', 'share-2')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. CLASSROOMS (salles de classe / niveaux)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.classrooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    cycle           TEXT,
    filiere_id      UUID REFERENCES public.filieres(id) ON DELETE SET NULL,
    level           INTEGER DEFAULT 1,
    capacity        INTEGER DEFAULT 50,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classroom_org ON public.classrooms(organization_id);

-- ============================================================
-- 5. SUBJECTS (matières)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subjects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    code            TEXT,
    coefficient     NUMERIC(3,1) DEFAULT 1.0,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hours_per_week  NUMERIC(3,1) DEFAULT 2.0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_org ON public.subjects(organization_id);
CREATE INDEX IF NOT EXISTS idx_subject_classroom ON public.subjects(classroom_id);

-- ============================================================
-- 6. TEACHER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    speciality      TEXT,
    phone           TEXT,
    email           TEXT,
    diplomas        TEXT,
    photo_url       TEXT,
    access_code     TEXT UNIQUE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_org ON public.teacher_profiles(organization_id);

-- ============================================================
-- 7. STUDENT PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    date_of_birth   DATE,
    photo_url       TEXT,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
    matricule       TEXT UNIQUE,
    phone           TEXT,
    email           TEXT,
    parent_phone    TEXT,
    parent_name     TEXT,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_org ON public.student_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_classroom ON public.student_profiles(classroom_id);

-- ============================================================
-- 8. PROMOTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promotions (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filiere_id      UUID NOT NULL REFERENCES public.filieres(id) ON DELETE CASCADE,
    nom             TEXT NOT NULL,
    annee_debut     INTEGER NOT NULL,
    annee_fin       INTEGER NOT NULL,
    effectif_max    INTEGER DEFAULT 40,
    is_active       BOOLEAN DEFAULT true,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    tenant_id       UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. ENROLLMENTS (inscriptions)
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
-- 10. MATIÈRES (legacy, filiere-based)
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
-- 11. NOTES (legacy)
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
-- 12. TIMETABLE (emploi du temps)
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
-- 13. TIMETABLE SLOTS (organization-scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    subject_id      UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    room            TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. EVALUATIONS (organization-scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evaluations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subject_id      UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    type            TEXT DEFAULT 'devoir' CHECK (type IN ('devoir','examen','tp','oral','projet')),
    max_score       NUMERIC(5,2) DEFAULT 20.0,
    weight          NUMERIC(3,1) DEFAULT 1.0,
    date            DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. GRADES (notes par évaluation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id   UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    score           NUMERIC(5,2),
    comment         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID REFERENCES auth.users(id),
    UNIQUE(evaluation_id, student_id)
);

-- ============================================================
-- 16. ATTENDANCE (présences org-scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    classroom_id    UUID REFERENCES public.classrooms(id),
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    status          TEXT DEFAULT 'present' CHECK (status IN ('present','absent','late','excused')),
    note            TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. DISCIPLINES (sanctions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.disciplines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN (
        'avertissement','blame','exclusion_temporaire','exclusion_definitive','retenue','convocation_parent'
    )),
    reason          TEXT NOT NULL,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_days   INTEGER,
    resolved        BOOLEAN DEFAULT FALSE,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. SCHOOL PAYMENTS (paiements org-scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.school_payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2) NOT NULL,
    currency        TEXT DEFAULT 'XAF',
    payment_method  TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','momo','orange_money','bank','other')),
    reference       TEXT,
    description     TEXT,
    status          TEXT DEFAULT 'paid' CHECK (status IN ('paid','pending','failed','refunded')),
    academic_year   TEXT,
    term            TEXT,
    paid_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_student ON public.school_payments(student_id);

-- ============================================================
-- 19. PRESENCES (legacy)
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
-- 20. PAIEMENTS (legacy)
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
-- 21. FORUM
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
-- 22. SHOP / MARKETPLACE
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
-- 23. CHAT & COMMUNITY
-- ============================================================
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

CREATE TABLE IF NOT EXISTS public.app_settings (
    key             TEXT PRIMARY KEY,
    value           TEXT,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription    JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, subscription)
);

CREATE TABLE IF NOT EXISTS public.livestream_comments (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    livestream_id   TEXT NOT NULL DEFAULT 'global-live',
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    parent_id       UUID REFERENCES public.livestream_comments(id) ON DELETE CASCADE,
    is_pinned       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.livestream_reactions (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    livestream_id   TEXT NOT NULL DEFAULT 'global-live',
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji           TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.day_views (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_number      INTEGER NOT NULL,
    viewed_at       TIMESTAMPTZ DEFAULT now(),
    duration_seconds INTEGER DEFAULT 0
);

-- ============================================================
-- 24. INDEX PERFORMANCES
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
-- 25. RLS POLICIES (idempotent — drop if exists then create)
-- ============================================================

-- Helper: drop policy if exists
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop ALL existing policies on our tables to recreate cleanly
    FOR pol IN 
        SELECT policyname, tablename FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'profiles','filieres','promotions','enrollments','matieres','notes',
            'timetable','presences','paiements','forum_threads','forum_replies',
            'shop_products','shop_orders','tutoring_requests','experience_feedbacks',
            'student_progress','study_groups','study_group_members','study_group_messages',
            'study_group_join_requests','direct_messages','notifications','app_settings',
            'push_subscriptions','livestream_comments','livestream_reactions','day_resources',
            'day_views','organizations','classrooms','subjects','teacher_profiles',
            'student_profiles','timetable_slots','evaluations','grades','attendance',
            'disciplines','school_payments'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Enable RLS on all tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'profiles','filieres','promotions','enrollments','matieres','notes',
        'timetable','presences','paiements','forum_threads','forum_replies',
        'shop_products','shop_orders','tutoring_requests','experience_feedbacks',
        'student_progress','study_groups','study_group_members','study_group_messages',
        'study_group_join_requests','direct_messages','notifications','app_settings',
        'push_subscriptions','livestream_comments','livestream_reactions','day_resources',
        'day_views','organizations','classrooms','subjects','teacher_profiles',
        'student_profiles','timetable_slots','evaluations','grades','attendance',
        'disciplines','school_payments'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- ── Profiles ──
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- ── Organizations ──
CREATE POLICY "org_public_read" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "org_owner_write" ON public.organizations FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "org_anon_read" ON public.organizations FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "org_insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);

-- ── Classrooms ──
CREATE POLICY "classroom_read" ON public.classrooms FOR SELECT USING (true);
CREATE POLICY "classroom_admin_write" ON public.classrooms FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = classrooms.organization_id AND owner_id = auth.uid())
);

-- ── Subjects ──
CREATE POLICY "subject_read" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "subject_admin_write" ON public.subjects FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = subjects.organization_id AND owner_id = auth.uid())
);

-- ── Teacher profiles ──
CREATE POLICY "teacher_read" ON public.teacher_profiles FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.organizations WHERE id = teacher_profiles.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "teacher_write" ON public.teacher_profiles FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = teacher_profiles.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "teacher_insert_self" ON public.teacher_profiles FOR INSERT TO authenticated WITH CHECK (true);

-- ── Student profiles ──
CREATE POLICY "student_read" ON public.student_profiles FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.organizations WHERE id = student_profiles.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "student_write" ON public.student_profiles FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = student_profiles.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "student_insert_self" ON public.student_profiles FOR INSERT TO authenticated WITH CHECK (true);

-- ── Filieres ──
CREATE POLICY "filieres_select_all" ON public.filieres FOR SELECT TO authenticated USING (true);
CREATE POLICY "filieres_select_anon" ON public.filieres FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "filieres_admin_all" ON public.filieres FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('director','superadmin')));

-- ── Promotions, Enrollments, Matieres, Notes, Timetable ──
CREATE POLICY "promotions_select" ON public.promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "enrollments_select" ON public.enrollments FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secretary','director','superadmin')));
CREATE POLICY "enrollments_insert" ON public.enrollments FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secretary','director','superadmin')));
CREATE POLICY "matieres_select" ON public.matieres FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','secretary','director','superadmin')));
CREATE POLICY "notes_insert" ON public.notes FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','director','superadmin')));
CREATE POLICY "timetable_select" ON public.timetable FOR SELECT TO authenticated USING (true);

-- ── Presences & Paiements ──
CREATE POLICY "presences_select" ON public.presences FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','secretary','director','superadmin')));
CREATE POLICY "paiements_select" ON public.paiements FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secretary','director','superadmin')));

-- ── Forum ──
CREATE POLICY "forum_threads_select" ON public.forum_threads FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_threads_insert" ON public.forum_threads FOR INSERT TO authenticated WITH CHECK (auteur_id = auth.uid());
CREATE POLICY "forum_replies_select" ON public.forum_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_replies_insert" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK (auteur_id = auth.uid());

-- ── Shop ──
CREATE POLICY "shop_products_select" ON public.shop_products FOR SELECT TO authenticated USING (is_visible = true);
CREATE POLICY "shop_orders_select" ON public.shop_orders FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secretary','director','superadmin')));
CREATE POLICY "shop_orders_insert" ON public.shop_orders FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- ── Community ──
CREATE POLICY "tutoring_select" ON public.tutoring_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "tutoring_insert" ON public.tutoring_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tutoring_update" ON public.tutoring_requests FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "feedback_select" ON public.experience_feedbacks FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedback_insert" ON public.experience_feedbacks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_select" ON public.student_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "progress_insert" ON public.student_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_update" ON public.student_progress FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ── Study Groups ──
CREATE POLICY "groups_select" ON public.study_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups_insert" ON public.study_groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "group_members_select" ON public.study_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "group_members_insert" ON public.study_group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "group_msgs_select" ON public.study_group_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "group_msgs_insert" ON public.study_group_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "join_req_select" ON public.study_group_join_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "join_req_insert" ON public.study_group_join_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ── DMs & Notifications ──
CREATE POLICY "dm_select" ON public.direct_messages FOR SELECT TO authenticated
    USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "dm_insert" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "dm_update" ON public.direct_messages FOR UPDATE TO authenticated USING (receiver_id = auth.uid());
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ── Settings, Push, Live, Resources ──
CREATE POLICY "settings_select" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "push_select" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "live_comments_select" ON public.livestream_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_comments_insert" ON public.livestream_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "live_reactions_select" ON public.livestream_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_reactions_insert" ON public.livestream_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "day_res_select" ON public.day_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "day_views_select" ON public.day_views FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "day_views_insert" ON public.day_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ── Organization-scoped tables ──
CREATE POLICY "timetable_slots_read" ON public.timetable_slots FOR SELECT USING (true);
CREATE POLICY "timetable_slots_write" ON public.timetable_slots FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = timetable_slots.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "eval_read" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "eval_write" ON public.evaluations FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = evaluations.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "grade_read" ON public.grades FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = grades.student_id AND (
        sp.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.organizations WHERE id = sp.organization_id AND owner_id = auth.uid())
    ))
);
CREATE POLICY "grade_write" ON public.grades FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.evaluations e 
        JOIN public.organizations o ON e.organization_id = o.id
        WHERE e.id = grades.evaluation_id AND o.owner_id = auth.uid()
    )
);
CREATE POLICY "attendance_read" ON public.attendance FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = attendance.student_id AND (
        sp.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.organizations WHERE id = sp.organization_id AND owner_id = auth.uid())
    ))
);
CREATE POLICY "attendance_write" ON public.attendance FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = attendance.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "discipline_read" ON public.disciplines FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = disciplines.student_id AND (
        sp.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.organizations WHERE id = sp.organization_id AND owner_id = auth.uid())
    ))
);
CREATE POLICY "discipline_write" ON public.disciplines FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = disciplines.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "school_payment_read" ON public.school_payments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = school_payments.student_id AND (
        sp.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.organizations WHERE id = sp.organization_id AND owner_id = auth.uid())
    ))
);
CREATE POLICY "school_payment_write" ON public.school_payments FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = school_payments.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "school_payment_insert" ON public.school_payments FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = school_payments.organization_id AND owner_id = auth.uid())
);

-- ============================================================
-- 26. FUNCTIONS
-- ============================================================

-- Moyenne pondérée
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

-- Taux de présence
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

-- Auto-matricule
CREATE OR REPLACE FUNCTION generate_matricule()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    year_str TEXT;
    seq_num INTEGER;
BEGIN
    prefix := UPPER(LEFT(COALESCE(
        (SELECT REPLACE(UPPER(LEFT(c.name, 4)), ' ', '') FROM public.classrooms c WHERE c.id = NEW.classroom_id),
        'STU'
    ), 4));
    year_str := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    SELECT COUNT(*) + 1 INTO seq_num
    FROM public.student_profiles
    WHERE organization_id = NEW.organization_id
      AND classroom_id = NEW.classroom_id
      AND EXTRACT(YEAR FROM enrollment_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    NEW.matricule := prefix || '-' || year_str || '-' || LPAD(seq_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_matricule ON public.student_profiles;
CREATE TRIGGER trg_student_matricule
    BEFORE INSERT ON public.student_profiles
    FOR EACH ROW
    WHEN (NEW.matricule IS NULL)
    EXECUTE FUNCTION generate_matricule();

-- ============================================================
-- 27. UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['profiles','filieres','enrollments','matieres','notes','forum_threads','shop_products','shop_orders','organizations']
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
-- 28. REALTIME
-- ============================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_comments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tutoring_requests; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 29. STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ✅ FIN DU SCHEMA CAMPUSFLOW — Exécution réussie !
-- ============================================================
