-- ══════════════════════════════════════════════════════════════
-- lesson_reader_notes : CREATE IF NOT EXISTS + FIX RLS
-- CampusFlow n'utilise pas Supabase Auth → auth.uid() = NULL
-- On ouvre le RLS pour permettre les opérations CRUD via user_id
-- ══════════════════════════════════════════════════════════════

-- 1) Créer la table si elle n'existe pas encore
CREATE TABLE IF NOT EXISTS lesson_reader_notes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id      UUID NOT NULL,
    user_id        UUID NOT NULL,
    content        TEXT NOT NULL,
    highlight_text TEXT,
    color          TEXT DEFAULT 'yellow',
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Index pour recherche rapide
CREATE INDEX IF NOT EXISTS lesson_reader_notes_lesson_user_idx
    ON lesson_reader_notes(lesson_id, user_id);

-- 3) Activer RLS
ALTER TABLE lesson_reader_notes ENABLE ROW LEVEL SECURITY;

-- 4) Supprimer les anciennes policies restrictives
DROP POLICY IF EXISTS "lesson_notes_own_rw"       ON lesson_reader_notes;
DROP POLICY IF EXISTS "lesson_notes_open_rw"      ON lesson_reader_notes;
DROP POLICY IF EXISTS "lesson_notes_read"         ON lesson_reader_notes;
DROP POLICY IF EXISTS "lesson_notes_insert"       ON lesson_reader_notes;
DROP POLICY IF EXISTS "lesson_notes_delete"       ON lesson_reader_notes;
DROP POLICY IF EXISTS "lesson_notes_read_open"    ON lesson_reader_notes;
DROP POLICY IF EXISTS "lesson_notes_insert_open"  ON lesson_reader_notes;
DROP POLICY IF EXISTS "lesson_notes_delete_open"  ON lesson_reader_notes;

-- 5) Policies ouvertes (filtrage côté app par user_id)
CREATE POLICY "lesson_notes_select_open" ON lesson_reader_notes
    FOR SELECT USING (true);

CREATE POLICY "lesson_notes_insert_open" ON lesson_reader_notes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "lesson_notes_update_open" ON lesson_reader_notes
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "lesson_notes_delete_open" ON lesson_reader_notes
    FOR DELETE USING (true);
