-- ============================================================
-- CAMPUSFLOW — TABLE ORGANIZATIONS (Multi-tenant)
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- ── TABLE: organizations ──
CREATE TABLE IF NOT EXISTS public.organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    type            TEXT NOT NULL CHECK (type IN (
        'college','lycee','universite','centre_formation','institut','autre'
    )),
    motto           TEXT,
    logo_url        TEXT,
    
    -- Localisation
    country         TEXT NOT NULL DEFAULT 'Cameroun',
    city            TEXT NOT NULL,
    quarter         TEXT,
    street          TEXT,
    
    -- Contact
    phone           TEXT NOT NULL,
    whatsapp        TEXT,
    email           TEXT NOT NULL,
    other_phone     TEXT,
    other_phone_label TEXT,
    
    -- Propriétaire
    owner_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_role      TEXT,
    owner_first_name TEXT,
    owner_last_name  TEXT,
    
    -- Config
    setup_completed BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEX ──
CREATE INDEX IF NOT EXISTS idx_org_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_owner ON public.organizations(owner_id);

-- ── TABLE: classrooms (salles de classe) ──
CREATE TABLE IF NOT EXISTS public.classrooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,               -- "6ème A", "Niveau 1", "L1 Droit"
    cycle           TEXT,                         -- "1er_cycle", "2nd_cycle", null
    filiere_id      UUID REFERENCES public.filieres(id) ON DELETE SET NULL,
    level           INTEGER DEFAULT 1,            -- niveau numérique (1, 2, 3...)
    capacity        INTEGER DEFAULT 50,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classroom_org ON public.classrooms(organization_id);

-- ── TABLE: subjects (matières) ──
CREATE TABLE IF NOT EXISTS public.subjects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,               -- "Mathématiques", "Français"
    code            TEXT,                         -- "MATH", "FRA"
    coefficient     NUMERIC(3,1) DEFAULT 1.0,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hours_per_week  NUMERIC(3,1) DEFAULT 2.0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_org ON public.subjects(organization_id);
CREATE INDEX IF NOT EXISTS idx_subject_classroom ON public.subjects(classroom_id);

-- ── TABLE: teacher_profiles (profils professeurs) ──
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
    access_code     TEXT UNIQUE,                  -- code d'accès généré
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_org ON public.teacher_profiles(organization_id);

-- ── TABLE: student_profiles (profils étudiants) ──
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    date_of_birth   DATE,
    photo_url       TEXT,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
    matricule       TEXT UNIQUE,                  -- MASS-2026-001
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

-- ── TABLE: timetable_slots (emploi du temps) ──
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

-- ── TABLE: evaluations (devoirs + examens) ──
CREATE TABLE IF NOT EXISTS public.evaluations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subject_id      UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,                 -- "Devoir N°1", "Examen Séquentiel 1"
    type            TEXT DEFAULT 'devoir' CHECK (type IN ('devoir','examen','tp','oral','projet')),
    max_score       NUMERIC(5,2) DEFAULT 20.0,
    weight          NUMERIC(3,1) DEFAULT 1.0,      -- pondération
    date            DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE: grades (notes) ──
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

-- ── TABLE: attendance (présences) ──
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

-- ── TABLE: disciplines (sanctions) ──
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

-- ── TABLE: school_payments (paiements scolarité) ──
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
    academic_year   TEXT,                         -- "2025-2026"
    term            TEXT,                          -- "Trimestre 1"
    paid_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_student ON public.school_payments(student_id);

-- ── ADD organization_id TO profiles ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- ── RLS POLICIES ──
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payments ENABLE ROW LEVEL SECURITY;

-- Organizations: public read, owner write
CREATE POLICY "org_public_read" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "org_owner_write" ON public.organizations FOR ALL USING (
    auth.uid() = owner_id
);

-- Classrooms: org members read, admin write
CREATE POLICY "classroom_org_read" ON public.classrooms FOR SELECT USING (true);
CREATE POLICY "classroom_admin_write" ON public.classrooms FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = classrooms.organization_id AND owner_id = auth.uid())
);

-- Subjects: same pattern
CREATE POLICY "subject_read" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "subject_admin_write" ON public.subjects FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = subjects.organization_id AND owner_id = auth.uid())
);

-- Students: org-scoped 
CREATE POLICY "student_org_read" ON public.student_profiles FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.organizations WHERE id = student_profiles.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "student_admin_write" ON public.student_profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = student_profiles.organization_id AND owner_id = auth.uid())
);

-- Teachers: org-scoped
CREATE POLICY "teacher_org_read" ON public.teacher_profiles FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.organizations WHERE id = teacher_profiles.organization_id AND owner_id = auth.uid())
);
CREATE POLICY "teacher_admin_write" ON public.teacher_profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = teacher_profiles.organization_id AND owner_id = auth.uid())
);

-- Grades: students see own, teachers/admin see all in org
CREATE POLICY "grade_read" ON public.grades FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = grades.student_id AND (
        sp.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.organizations WHERE id = sp.organization_id AND owner_id = auth.uid())
    ))
);
CREATE POLICY "grade_write" ON public.grades FOR ALL USING (
    EXISTS (SELECT 1 FROM public.evaluations e 
        JOIN public.organizations o ON e.organization_id = o.id
        WHERE e.id = grades.evaluation_id AND o.owner_id = auth.uid()
    )
);

-- Payments: student sees own, admin sees all
CREATE POLICY "payment_read" ON public.school_payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = school_payments.student_id AND (
        sp.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.organizations WHERE id = sp.organization_id AND owner_id = auth.uid())
    ))
);

-- Timetable, Evaluations, Attendance, Disciplines: org-scoped read
CREATE POLICY "timetable_read" ON public.timetable_slots FOR SELECT USING (true);
CREATE POLICY "timetable_write" ON public.timetable_slots FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = timetable_slots.organization_id AND owner_id = auth.uid())
);

CREATE POLICY "eval_read" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "eval_write" ON public.evaluations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = evaluations.organization_id AND owner_id = auth.uid())
);

CREATE POLICY "attendance_read" ON public.attendance FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = attendance.student_id AND (
        sp.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.organizations WHERE id = sp.organization_id AND owner_id = auth.uid())
    ))
);
CREATE POLICY "attendance_write" ON public.attendance FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = attendance.organization_id AND owner_id = auth.uid())
);

CREATE POLICY "discipline_read" ON public.disciplines FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = disciplines.student_id AND (
        sp.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.organizations WHERE id = sp.organization_id AND owner_id = auth.uid())
    ))
);
CREATE POLICY "discipline_write" ON public.disciplines FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = disciplines.organization_id AND owner_id = auth.uid())
);

-- ── FUNCTION: Générer matricule auto ──
CREATE OR REPLACE FUNCTION generate_matricule()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    year_str TEXT;
    seq_num INTEGER;
    new_matricule TEXT;
BEGIN
    -- Get filiere code or classroom name prefix
    prefix := UPPER(LEFT(COALESCE(
        (SELECT REPLACE(UPPER(LEFT(c.name, 4)), ' ', '') FROM public.classrooms c WHERE c.id = NEW.classroom_id),
        'STU'
    ), 4));
    
    year_str := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Count existing students in same classroom this year
    SELECT COUNT(*) + 1 INTO seq_num
    FROM public.student_profiles
    WHERE organization_id = NEW.organization_id
      AND classroom_id = NEW.classroom_id
      AND EXTRACT(YEAR FROM enrollment_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    new_matricule := prefix || '-' || year_str || '-' || LPAD(seq_num::TEXT, 3, '0');
    
    NEW.matricule := new_matricule;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_matricule
    BEFORE INSERT ON public.student_profiles
    FOR EACH ROW
    WHEN (NEW.matricule IS NULL)
    EXECUTE FUNCTION generate_matricule();

-- ── STORAGE BUCKET ──
INSERT INTO storage.buckets (id, name, public) 
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;
