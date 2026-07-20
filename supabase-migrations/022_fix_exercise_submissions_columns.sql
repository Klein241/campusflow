-- ================================================
-- 022: Fix exercise_submissions - add missing columns
-- Run in Supabase SQL Editor
-- ================================================

-- Add completed_at column if missing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='exercise_submissions' AND column_name='completed_at'
    ) THEN
        ALTER TABLE exercise_submissions ADD COLUMN completed_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add answers column (JSONB) if missing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='exercise_submissions' AND column_name='answers'
    ) THEN
        ALTER TABLE exercise_submissions ADD COLUMN answers JSONB;
    END IF;
END $$;

-- Add graded column if missing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='exercise_submissions' AND column_name='graded'
    ) THEN
        ALTER TABLE exercise_submissions ADD COLUMN graded BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add teacher_comment column if missing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='exercise_submissions' AND column_name='teacher_comment'
    ) THEN
        ALTER TABLE exercise_submissions ADD COLUMN teacher_comment TEXT;
    END IF;
END $$;

-- Add score column if missing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='exercise_submissions' AND column_name='score'
    ) THEN
        ALTER TABLE exercise_submissions ADD COLUMN score NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Ensure exercises table has questions column (JSONB)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='exercises' AND column_name='questions'
    ) THEN
        ALTER TABLE exercises ADD COLUMN questions JSONB DEFAULT '[]';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='exercises' AND column_name='duration_minutes'
    ) THEN
        ALTER TABLE exercises ADD COLUMN duration_minutes INT DEFAULT 20;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='exercises' AND column_name='max_score'
    ) THEN
        ALTER TABLE exercises ADD COLUMN max_score NUMERIC DEFAULT 20;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='exercises' AND column_name='type'
    ) THEN
        ALTER TABLE exercises ADD COLUMN type TEXT DEFAULT 'qcm';
    END IF;
END $$;

-- Sky transactions table (for Sky Points rewards)
CREATE TABLE IF NOT EXISTS sky_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    transaction_type TEXT DEFAULT 'exercise_score',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sky_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_sky_transactions_select" ON sky_transactions;
DROP POLICY IF EXISTS "rls_sky_transactions_insert" ON sky_transactions;
CREATE POLICY "rls_sky_transactions_select" ON sky_transactions FOR SELECT USING (true);
CREATE POLICY "rls_sky_transactions_insert" ON sky_transactions FOR INSERT WITH CHECK (true);

-- Add sky_points to student_profiles if missing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='student_profiles' AND column_name='sky_points'
    ) THEN
        ALTER TABLE student_profiles ADD COLUMN sky_points NUMERIC DEFAULT 0;
    END IF;
END $$;

SELECT 'Migration 022 applied: exercise_submissions + exercises + sky_transactions all ready!' as status;
