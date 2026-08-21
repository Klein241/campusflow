-- ============================================================
-- MIGRATION 058 — Cursus Drip Content (Périodes & Déverrouillage)
-- & Support Multi-Filières / Multi-Classes pour Étudiants
-- ============================================================

-- 1. Colonnes de déverrouillage périodique sur "chapters"
ALTER TABLE public.chapters
    ADD COLUMN IF NOT EXISTS unlock_date TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS lock_date TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS period_name TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_drip_locked BOOLEAN DEFAULT FALSE;

-- 2. Colonnes de déverrouillage périodique sur "lessons"
ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS unlock_date TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS lock_date TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS period_name TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_drip_locked BOOLEAN DEFAULT FALSE;

-- 3. Support multi-classes / multi-filières pour les étudiants
ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS additional_classroom_ids UUID[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS filiere_ids UUID[] DEFAULT '{}';

-- 4. Table optionnelle des périodes de formation configurables (Semaines, Mois, Trimestres)
CREATE TABLE IF NOT EXISTS public.cursus_periods (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,               -- "Semaine 1 : Fondamentaux", "Mois 1"
    start_date      DATE,
    end_date        DATE,
    position        INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cursus_periods_org ON public.cursus_periods(organization_id);
CREATE INDEX IF NOT EXISTS idx_cursus_periods_cls ON public.cursus_periods(classroom_id);

-- 5. Permissions et RLS pour cursus_periods
GRANT ALL ON public.cursus_periods TO anon, authenticated, service_role;
ALTER TABLE public.cursus_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cursus_periods_read" ON public.cursus_periods;
DROP POLICY IF EXISTS "cursus_periods_write" ON public.cursus_periods;

CREATE POLICY "cursus_periods_read" ON public.cursus_periods
    FOR SELECT USING (true);

CREATE POLICY "cursus_periods_write" ON public.cursus_periods
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Index pour optimiser les requêtes de déverrouillage
CREATE INDEX IF NOT EXISTS idx_chapters_unlock_date ON public.chapters(unlock_date);
CREATE INDEX IF NOT EXISTS idx_lessons_unlock_date ON public.lessons(unlock_date);
CREATE INDEX IF NOT EXISTS idx_chapters_period_name ON public.chapters(period_name);
CREATE INDEX IF NOT EXISTS idx_lessons_period_name ON public.lessons(period_name);

SELECT 'Migration 058 OK — Cursus Drip Content & Multi-Classes appliqués avec succès' AS status;
