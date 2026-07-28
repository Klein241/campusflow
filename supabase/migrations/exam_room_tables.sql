-- ════════════════════════════════════════════════════════════
-- SALLE D'ÉVALUATION — CampusFlow
-- Exécuter dans Supabase SQL Editor
-- ════════════════════════════════════════════════════════════

-- 1. exam_papers — Épreuves conçues par le prof/admin
CREATE TABLE IF NOT EXISTS exam_papers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  coefficient DECIMAL(4,2) DEFAULT 1.0,
  duration_minutes INTEGER DEFAULT 60,
  instructions TEXT,
  questions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. exam_sessions — Sessions actives d'épreuves
CREATE TABLE IF NOT EXISTS exam_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_paper_id UUID REFERENCES exam_papers(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  launched_by UUID NOT NULL,
  supervisor_id UUID,
  participant_ids TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. exam_participants — Étudiants présents en salle
CREATE TABLE IF NOT EXISTS exam_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','active','submitted','failed','left_with_permission')),
  answers JSONB DEFAULT '{}'::jsonb,
  manual_grades JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  score DECIMAL(6,2),
  UNIQUE(session_id, student_id)
);

-- 4. exam_permission_requests — Demandes de sortie temporaire
CREATE TABLE IF NOT EXISTS exam_permission_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  student_name TEXT,
  reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID,
  granted_at TIMESTAMPTZ,
  extra_time_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','granted','denied'))
);

-- 5. Row Level Security (open pour les membres de l'org)
ALTER TABLE exam_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_permission_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_papers_access" ON exam_papers;
DROP POLICY IF EXISTS "exam_sessions_access" ON exam_sessions;
DROP POLICY IF EXISTS "exam_participants_access" ON exam_participants;
DROP POLICY IF EXISTS "exam_permission_requests_access" ON exam_permission_requests;

CREATE POLICY "exam_papers_access" ON exam_papers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "exam_sessions_access" ON exam_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "exam_participants_access" ON exam_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "exam_permission_requests_access" ON exam_permission_requests FOR ALL USING (true) WITH CHECK (true);

-- 6. Activer le Realtime sur les tables de session
ALTER PUBLICATION supabase_realtime ADD TABLE exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE exam_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE exam_permission_requests;

-- 7. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_exam_papers_org ON exam_papers(org_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_org ON exam_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_paper ON exam_sessions(exam_paper_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_session ON exam_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_student ON exam_participants(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_permission_session ON exam_permission_requests(session_id);
