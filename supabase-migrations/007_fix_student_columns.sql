-- ============================================================
-- CAMPUSFLOW 007 — Fix FK constraints, RLS policies, column mismatches
-- Run in Supabase SQL Editor
-- ============================================================

-- ═══ 1. FIX: subjects.teacher_id FK references auth.users but we assign teacher_profiles.id ═══
-- Drop the old FK constraint
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_teacher_id_fkey;
-- Re-add FK pointing to teacher_profiles instead of auth.users
ALTER TABLE public.subjects 
  ADD CONSTRAINT subjects_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES public.teacher_profiles(id) ON DELETE SET NULL;

-- ═══ 2. FIX: timetable_slots.teacher_id same issue ═══
ALTER TABLE public.timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_teacher_id_fkey;

-- ═══ 3. FIX: RLS policies — classrooms INSERT needs WITH CHECK ═══
DROP POLICY IF EXISTS "classroom_admin_write" ON public.classrooms;
CREATE POLICY "classroom_admin_write" ON public.classrooms FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = classrooms.organization_id AND owner_id = auth.uid())
  );
CREATE POLICY "classroom_admin_update" ON public.classrooms FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = classrooms.organization_id AND owner_id = auth.uid())
  );
CREATE POLICY "classroom_admin_delete" ON public.classrooms FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = classrooms.organization_id AND owner_id = auth.uid())
  );

-- ═══ 4. FIX: RLS policies — subjects INSERT needs WITH CHECK ═══
DROP POLICY IF EXISTS "subject_admin_write" ON public.subjects;
CREATE POLICY "subject_admin_insert" ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = subjects.organization_id AND owner_id = auth.uid())
  );
CREATE POLICY "subject_admin_update" ON public.subjects FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = subjects.organization_id AND owner_id = auth.uid())
  );

-- ═══ 5. FIX: RLS policies — teacher_profiles INSERT needs WITH CHECK ═══
DROP POLICY IF EXISTS "teacher_admin_write" ON public.teacher_profiles;
CREATE POLICY "teacher_admin_insert" ON public.teacher_profiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = teacher_profiles.organization_id AND owner_id = auth.uid())
  );
CREATE POLICY "teacher_admin_update" ON public.teacher_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = teacher_profiles.organization_id AND owner_id = auth.uid())
  );
CREATE POLICY "teacher_admin_delete" ON public.teacher_profiles FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = teacher_profiles.organization_id AND owner_id = auth.uid())
  );

-- ═══ 6. FIX: RLS policies — student_profiles INSERT needs WITH CHECK ═══
DROP POLICY IF EXISTS "student_admin_write" ON public.student_profiles;
CREATE POLICY "student_admin_insert" ON public.student_profiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = student_profiles.organization_id AND owner_id = auth.uid())
  );
CREATE POLICY "student_admin_update" ON public.student_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = student_profiles.organization_id AND owner_id = auth.uid())
  );
CREATE POLICY "student_admin_delete" ON public.student_profiles FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = student_profiles.organization_id AND owner_id = auth.uid())
  );

-- ═══ 7. FIX: other tables — same pattern for INSERT ═══
-- Timetable
DROP POLICY IF EXISTS "timetable_write" ON public.timetable_slots;
CREATE POLICY "timetable_insert" ON public.timetable_slots FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations WHERE id = timetable_slots.organization_id AND owner_id = auth.uid()));
CREATE POLICY "timetable_update" ON public.timetable_slots FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations WHERE id = timetable_slots.organization_id AND owner_id = auth.uid()));
CREATE POLICY "timetable_delete" ON public.timetable_slots FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations WHERE id = timetable_slots.organization_id AND owner_id = auth.uid()));

-- Evaluations
DROP POLICY IF EXISTS "eval_write" ON public.evaluations;
CREATE POLICY "eval_insert" ON public.evaluations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations WHERE id = evaluations.organization_id AND owner_id = auth.uid()));
CREATE POLICY "eval_update" ON public.evaluations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations WHERE id = evaluations.organization_id AND owner_id = auth.uid()));

-- Grades
DROP POLICY IF EXISTS "grade_write" ON public.grades;
CREATE POLICY "grade_insert" ON public.grades FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.evaluations e JOIN public.organizations o ON e.organization_id = o.id WHERE e.id = grades.evaluation_id AND o.owner_id = auth.uid()));
CREATE POLICY "grade_update" ON public.grades FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.evaluations e JOIN public.organizations o ON e.organization_id = o.id WHERE e.id = grades.evaluation_id AND o.owner_id = auth.uid()));

-- Payments
DROP POLICY IF EXISTS "payment_write" ON public.school_payments;
CREATE POLICY "payment_insert" ON public.school_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations WHERE id = school_payments.organization_id AND owner_id = auth.uid()));

-- Attendance
DROP POLICY IF EXISTS "attendance_write" ON public.attendance;
CREATE POLICY "attendance_insert" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations WHERE id = attendance.organization_id AND owner_id = auth.uid()));

-- Disciplines
DROP POLICY IF EXISTS "discipline_write" ON public.disciplines;
CREATE POLICY "discipline_insert" ON public.disciplines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations WHERE id = disciplines.organization_id AND owner_id = auth.uid()));

-- ═══ 8. FIX: student_profiles missing columns ═══
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS sex TEXT DEFAULT 'M';
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS residence TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS access_code VARCHAR(12) UNIQUE;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS pin_code VARCHAR(4);
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS pin_set BOOLEAN DEFAULT FALSE;

-- ═══ 9. FIX: teacher_profiles missing columns ═══
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS residence TEXT;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS access_code VARCHAR(12) UNIQUE;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS pin_code VARCHAR(4);
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS pin_set BOOLEAN DEFAULT FALSE;

-- ═══ 10. FIX: library + marketplace RLS ═══
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_read" ON public.library_items;
CREATE POLICY "library_read" ON public.library_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "library_write" ON public.library_items;
CREATE POLICY "library_write" ON public.library_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations WHERE id = library_items.organization_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "marketplace_read" ON public.marketplace_products;
CREATE POLICY "marketplace_read" ON public.marketplace_products FOR SELECT USING (true);

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_read" ON public.marketplace_orders;
CREATE POLICY "orders_read" ON public.marketplace_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "orders_write" ON public.marketplace_orders;
CREATE POLICY "orders_write" ON public.marketplace_orders FOR INSERT TO authenticated WITH CHECK (true);

-- ═══ 11. Access code lookup indexes ═══
CREATE INDEX IF NOT EXISTS idx_teacher_access_code ON public.teacher_profiles(access_code) WHERE access_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_student_access_code ON public.student_profiles(access_code) WHERE access_code IS NOT NULL;

-- ═══ 12. Allow anon SELECT on teacher/student profiles for access code login ═══
DROP POLICY IF EXISTS "teacher_code_login" ON public.teacher_profiles;
CREATE POLICY "teacher_code_login" ON public.teacher_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "teacher_org_read" ON public.teacher_profiles;

DROP POLICY IF EXISTS "student_code_login" ON public.student_profiles;
CREATE POLICY "student_code_login" ON public.student_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "student_org_read" ON public.student_profiles;
