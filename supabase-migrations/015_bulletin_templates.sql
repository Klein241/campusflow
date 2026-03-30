-- ============================================================
-- CAMPUSFLOW — Migration 015: Bulletin Templates & Receipt System
-- Adds columns for bulletin/receipt template preferences,
-- current term tracking, and teacher remarks on grades.
-- ============================================================

-- Bulletin template choice (1-5)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS bulletin_template INTEGER DEFAULT 1;

-- Receipt template choice (1-5)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS receipt_template INTEGER DEFAULT 1;

-- Current active term/semester
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS current_term TEXT DEFAULT 'Trimestre 1';

-- Teacher remarks per grade
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS teacher_remark TEXT;

-- Weight per evaluation (for weighted average calculations)
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS weight NUMERIC(3,1) DEFAULT 1;

-- Constraint checks
ALTER TABLE public.organizations ADD CONSTRAINT chk_bulletin_template CHECK (bulletin_template >= 1 AND bulletin_template <= 5);
ALTER TABLE public.organizations ADD CONSTRAINT chk_receipt_template CHECK (receipt_template >= 1 AND receipt_template <= 5);

-- Comment the columns
COMMENT ON COLUMN public.organizations.bulletin_template IS 'PDF bulletin template (1=Classique Camerounais, 2=Universitaire LMD, 3=Formation Pro, 4=Bilingue FR/EN, 5=Moderne Minimaliste)';
COMMENT ON COLUMN public.organizations.receipt_template IS 'PDF receipt template (1-5 matching bulletin styles)';
COMMENT ON COLUMN public.organizations.current_term IS 'Active academic term (e.g. Trimestre 1, Semestre 2)';
COMMENT ON COLUMN public.grades.teacher_remark IS 'Teacher observation/remark per grade entry';
COMMENT ON COLUMN public.evaluations.weight IS 'Weight of this evaluation in the subject average calculation';
