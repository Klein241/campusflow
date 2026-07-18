-- ================================================
-- 018: Fix voice messages, stories (likes/comments), exercises
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Fix voice message constraint: add 'voice' and 'audio' to allowed msg_type
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_msg_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_msg_type_check 
    CHECK (msg_type IN ('text', 'image', 'file', 'system', 'voice', 'audio'));

-- 2. Ensure stories table has likes, viewed_by, caption columns
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stories' AND column_name = 'likes') THEN
        ALTER TABLE stories ADD COLUMN likes UUID[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stories' AND column_name = 'viewed_by') THEN
        ALTER TABLE stories ADD COLUMN viewed_by UUID[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stories' AND column_name = 'caption') THEN
        ALTER TABLE stories ADD COLUMN caption TEXT DEFAULT '';
    END IF;
END $$;

-- 3. Ensure story_comments table exists
CREATE TABLE IF NOT EXISTS story_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES story_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS for stories (allow likes/viewed_by updates)
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read stories" ON stories;
DROP POLICY IF EXISTS "Users can insert stories" ON stories;
DROP POLICY IF EXISTS "Users can update stories" ON stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON stories;
CREATE POLICY "Anyone can read stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Users can insert stories" ON stories FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update stories" ON stories FOR UPDATE USING (true);
CREATE POLICY "Users can delete own stories" ON stories FOR DELETE USING (true);

-- 5. RLS for story_comments
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read story_comments" ON story_comments;
DROP POLICY IF EXISTS "Users can insert story_comments" ON story_comments;
DROP POLICY IF EXISTS "Users can delete own story_comments" ON story_comments;
CREATE POLICY "Anyone can read story_comments" ON story_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert story_comments" ON story_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own story_comments" ON story_comments FOR DELETE USING (true);

-- 6. Ensure exercises table exists with RLS
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    chapter_id UUID,
    lesson_id UUID,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'qcm',
    questions JSONB DEFAULT '[]',
    duration_minutes INT DEFAULT 10,
    max_score NUMERIC DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read exercises" ON exercises;
DROP POLICY IF EXISTS "Teachers can insert exercises" ON exercises;
DROP POLICY IF EXISTS "Teachers can update exercises" ON exercises;
CREATE POLICY "Anyone can read exercises" ON exercises FOR SELECT USING (true);
CREATE POLICY "Teachers can insert exercises" ON exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Teachers can update exercises" ON exercises FOR UPDATE USING (true);

-- 7. Ensure exercise_submissions table exists with RLS
CREATE TABLE IF NOT EXISTS exercise_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    answers JSONB DEFAULT '{}',
    score NUMERIC DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    graded BOOLEAN DEFAULT false
);
ALTER TABLE exercise_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read submissions" ON exercise_submissions;
DROP POLICY IF EXISTS "Students can insert submissions" ON exercise_submissions;
CREATE POLICY "Anyone can read submissions" ON exercise_submissions FOR SELECT USING (true);
CREATE POLICY "Students can insert submissions" ON exercise_submissions FOR INSERT WITH CHECK (true);

-- 8. Ensure sky_transactions table exists
CREATE TABLE IF NOT EXISTS sky_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    amount INT NOT NULL,
    transaction_type TEXT,
    description TEXT,
    reason TEXT,
    reference_id UUID,
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sky_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read sky_transactions" ON sky_transactions;
DROP POLICY IF EXISTS "Anyone can insert sky_transactions" ON sky_transactions;
CREATE POLICY "Anyone can read sky_transactions" ON sky_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sky_transactions" ON sky_transactions FOR INSERT WITH CHECK (true);

-- 9. Ensure sky_points column exists on student_profiles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'sky_points') THEN
        ALTER TABLE student_profiles ADD COLUMN sky_points INT DEFAULT 10;
    END IF;
END $$;

-- 10. Fix chat_messages insert RLS
DROP POLICY IF EXISTS "Anyone can insert chat_messages" ON chat_messages;
CREATE POLICY "Anyone can insert chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);

SELECT 'Migration 018 applied successfully!' as status;
