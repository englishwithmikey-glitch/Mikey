-- ==============================================================================
-- EnglishwithMikey - Supabase Database Schema & Permission Migration
-- ==============================================================================
-- Description: Safely upgrades the 4 LMS curriculum tables:
--   1. courses
--   2. lessons
--   3. sentences
--   4. learning_progress
--   5. profiles
--
-- Features supported:
--   - CEFR Levels (A1, A2, B1, B2, C1, C2)
--   - Categories: Pronunciation, Communication, Grammar, IELTS, TOEIC
--   - Access Tier: Free, Premium
--   - Status: Draft, Published
--   - Bilingual descriptions, Lesson Objectives, Media URLs
--   - Sentence IPA phonetic, Vocabulary notes, Grammar notes, Context of use
--   - Strict RLS: Teachers manage content, Students read published & track progress
--
-- How to apply:
--   1. Open Supabase Dashboard: https://supabase.com/dashboard/project/kczyigukukpyoyhlajci
--   2. Navigate to "SQL Editor" on the left menu.
--   3. Paste this entire script and click "RUN".
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1: Ensure Table Grants to authenticated and anon roles
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public read access for curriculum (controlled by RLS policies)
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT SELECT ON public.sentences TO anon, authenticated;

-- Progress tracking for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress TO authenticated;

-- Management access for authenticated teachers
GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sentences TO authenticated;

-- ------------------------------------------------------------------------------
-- STEP 2: Extend columns on `courses`
-- ------------------------------------------------------------------------------
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'Communication',
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'Free',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Published',
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS teacher_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ------------------------------------------------------------------------------
-- STEP 3: Extend columns on `lessons`
-- ------------------------------------------------------------------------------
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lesson_order integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS objectives text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Published',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ------------------------------------------------------------------------------
-- STEP 4: Extend columns on `sentences`
-- ------------------------------------------------------------------------------
ALTER TABLE public.sentences
  ADD COLUMN IF NOT EXISTS sentence_order integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ipa text,
  ADD COLUMN IF NOT EXISTS vocabulary_notes text,
  ADD COLUMN IF NOT EXISTS grammar_explanation text,
  ADD COLUMN IF NOT EXISTS context_of_use text,
  ADD COLUMN IF NOT EXISTS audio_url text;

-- ------------------------------------------------------------------------------
-- STEP 5: Extend columns on `learning_progress`
-- ------------------------------------------------------------------------------
ALTER TABLE public.learning_progress
  ADD COLUMN IF NOT EXISTS course_id text,
  ADD COLUMN IF NOT EXISTS score numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT now();

-- ------------------------------------------------------------------------------
-- STEP 6: Configure Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the current user is a teacher or admin
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
  );
$$;

-- ------------------------------------------------------------------------------
-- RLS Policies: courses
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can view all courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can update courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can delete courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can manage courses" ON public.courses;

-- Everyone can view published courses, teachers can view all
CREATE POLICY "Public can view published courses" ON public.courses
  FOR SELECT USING (
    status = 'Published' OR public.is_teacher_or_admin()
  );

CREATE POLICY "Teachers can insert courses" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "Teachers can update courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "Teachers can delete courses" ON public.courses
  FOR DELETE TO authenticated
  USING (public.is_teacher_or_admin());

-- ------------------------------------------------------------------------------
-- RLS Policies: lessons
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can insert lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can update lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can delete lessons" ON public.lessons;

CREATE POLICY "Public can view published lessons" ON public.lessons
  FOR SELECT USING (
    status = 'Published' OR public.is_teacher_or_admin()
  );

CREATE POLICY "Teachers can insert lessons" ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "Teachers can update lessons" ON public.lessons
  FOR UPDATE TO authenticated
  USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "Teachers can delete lessons" ON public.lessons
  FOR DELETE TO authenticated
  USING (public.is_teacher_or_admin());

-- ------------------------------------------------------------------------------
-- RLS Policies: sentences
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view sentences" ON public.sentences;
DROP POLICY IF EXISTS "Teachers can insert sentences" ON public.sentences;
DROP POLICY IF EXISTS "Teachers can update sentences" ON public.sentences;
DROP POLICY IF EXISTS "Teachers can delete sentences" ON public.sentences;

CREATE POLICY "Public can view sentences" ON public.sentences
  FOR SELECT USING (true);

CREATE POLICY "Teachers can insert sentences" ON public.sentences
  FOR INSERT TO authenticated
  WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "Teachers can update sentences" ON public.sentences
  FOR UPDATE TO authenticated
  USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

CREATE POLICY "Teachers can delete sentences" ON public.sentences
  FOR DELETE TO authenticated
  USING (public.is_teacher_or_admin());

-- ------------------------------------------------------------------------------
-- RLS Policies: learning_progress
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view own progress" ON public.learning_progress;
DROP POLICY IF EXISTS "Students can insert own progress" ON public.learning_progress;
DROP POLICY IF EXISTS "Students can update own progress" ON public.learning_progress;
DROP POLICY IF EXISTS "Teachers can view all student progress" ON public.learning_progress;

CREATE POLICY "Students can view own progress" ON public.learning_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_teacher_or_admin());

CREATE POLICY "Students can insert own progress" ON public.learning_progress
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own progress" ON public.learning_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS Policies: profiles
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Teachers can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_teacher_or_admin());

-- Verification check query
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('courses', 'lessons', 'sentences', 'learning_progress')
ORDER BY table_name, ordinal_position;
