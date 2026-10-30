import React, { useState, useEffect, useTransition } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  fetchSupabaseCourses,
  createSupabaseCourse,
  updateSupabaseCourse,
  deleteSupabaseCourse,
  fetchSupabaseLessons,
  createSupabaseLesson,
  updateSupabaseLesson,
  deleteSupabaseLesson,
  fetchSupabaseSentences,
  createSupabaseSentence,
  updateSupabaseSentence,
  deleteSupabaseSentence,
  fetchSupabaseLearningProgress,
  detectTableColumns,
  seedA1CurriculumToSupabase,
  DbCourse,
  DbLesson,
  DbSentence,
  DbLearningProgress,
  CourseLevelCEFR,
  CourseCategoryType,
  AccessTier,
  ContentStatus,
  CourseInput,
  LessonInput,
  SentenceInput,
} from '../../services/courseService';
import { runSupabaseHealthCheck, SupabaseDiagnosticReport } from '../../lib/supabase';
import {
  Shield,
  Plus,
  BookOpen,
  Users,
  CheckCircle2,
  X,
  RefreshCw,
  AlertTriangle,
  Info,
  Database,
  Layers,
  Sparkles,
  Edit3,
  Trash2,
  Check,
  Copy,
  ExternalLink,
  FileCode,
  Sliders,
  Award,
  Video,
  Volume2,
  Type,
  Eye,
  Activity,
  ArrowRight,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user, isSupabaseAuthenticated, login, refreshUserStats } = useAuth();
  const { lang } = useLanguage();

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<'courses' | 'lessons' | 'sentences' | 'progress' | 'database'>('courses');

  // Live Supabase Data States (STRICT: NO MOCK DATA)
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [sentences, setSentences] = useState<DbSentence[]>([]);
  const [progressList, setProgressList] = useState<DbLearningProgress[]>([]);
  const [progressCount, setProgressCount] = useState<number>(0);

  // Loading & Error States
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Detailed Query Errors for Full Transparency
  const [coursesError, setCoursesError] = useState<{ code?: string | null; message: string; hint?: string | null } | null>(null);
  const [lessonsError, setLessonsError] = useState<{ code?: string | null; message: string; hint?: string | null } | null>(null);
  const [sentencesError, setSentencesError] = useState<{ code?: string | null; message: string; hint?: string | null } | null>(null);
  const [progressError, setProgressError] = useState<{ code?: string | null; message: string; hint?: string | null } | null>(null);

  // Direct Teacher Auth within Dashboard
  const [teacherAuthPassword, setTeacherAuthPassword] = useState('');
  const [teacherAuthLoading, setTeacherAuthLoading] = useState(false);
  const [teacherAuthFeedback, setTeacherAuthFeedback] = useState<string | null>(null);

  // Selections
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');

  // Course Form & Modal States
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState<CourseInput>({
    title: '',
    description: '',
    level: 'B1',
    category: 'Communication',
    tier: 'Free',
    status: 'Published',
    thumbnail_url: '',
  });

  // Lesson Form & Modal States
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonInput>({
    course_id: '',
    title: '',
    description: '',
    content: '',
    objectives: '',
    video_url: '',
    audio_url: '',
    order_index: 1,
    status: 'Published',
  });

  // Sentence Form & Modal States
  const [isSentenceModalOpen, setIsSentenceModalOpen] = useState(false);
  const [editingSentenceId, setEditingSentenceId] = useState<string | null>(null);
  const [sentenceForm, setSentenceForm] = useState<SentenceInput>({
    lesson_id: '',
    english: '',
    vietnamese: '',
    ipa: '',
    vocabulary_notes: '',
    grammar_explanation: '',
    context_of_use: '',
    audio_url: '',
    order_index: 1,
  });

  // Schema Detection & Diagnostic Audit State
  const [columnStatus, setColumnStatus] = useState<any>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<SupabaseDiagnosticReport | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Feedback helper
  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 7000);
  };

  // Browser Speech Synthesis for English audio
  const playSentenceAudio = (text: string, audioUrl?: string) => {
    if (audioUrl && audioUrl.trim()) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => speakBrowserTts(text));
    } else {
      speakBrowserTts(text);
    }
  };

  const speakBrowserTts = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Direct Teacher Auth Handler
  const handleDirectTeacherAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherAuthPassword) {
      setTeacherAuthFeedback('Vui lòng nhập mật khẩu tài khoản giáo viên.');
      return;
    }
    setTeacherAuthLoading(true);
    setTeacherAuthFeedback(null);
    try {
      const res = await login('englishwithmikey@gmail.com', teacherAuthPassword);
      if (res.success) {
        setTeacherAuthFeedback('Đăng nhập Supabase Auth thành công! Đang đồng bộ dữ liệu...');
        showFeedback('success', 'Đã xác thực JWT giáo viên thành công! Dữ liệu khóa học đang được tải.');
        setTeacherAuthPassword('');
        await Promise.all([loadCourses(), refreshUserStats(), runAuditAndColumns()]);
      } else {
        setTeacherAuthFeedback(res.error || 'Đăng nhập không thành công.');
        showFeedback('error', res.error || 'Đăng nhập không thành công.');
      }
    } catch (err: any) {
      setTeacherAuthFeedback(err?.message || 'Lỗi đăng nhập.');
    } finally {
      setTeacherAuthLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loaders
  // ---------------------------------------------------------------------------

  const loadCourses = async () => {
    setLoadingCourses(true);
    setCoursesError(null);
    const res = await fetchSupabaseCourses();
    setLoadingCourses(false);

    if (res.error) {
      setCoursesError({
        code: res.errorCode,
        message: res.error,
        hint: res.errorHint,
      });
      showFeedback('error', `Lỗi tải danh sách khóa học: ${res.error}`);
    } else {
      setCourses(res.data);
      if (res.data.length > 0) {
        if (!selectedCourseId || !res.data.some((c) => c.id === selectedCourseId)) {
          setSelectedCourseId(res.data[0].id);
        }
      } else {
        setSelectedCourseId('');
      }
    }
  };

  const loadLessons = async (cId?: string) => {
    const targetCourseId = cId || selectedCourseId;
    if (!targetCourseId) {
      setLessons([]);
      setLessonsError(null);
      return;
    }
    setLoadingLessons(true);
    setLessonsError(null);
    const res = await fetchSupabaseLessons(targetCourseId);
    setLoadingLessons(false);

    if (res.error) {
      setLessonsError({
        code: res.errorCode,
        message: res.error,
        hint: res.errorHint,
      });
      showFeedback('error', `Lỗi tải bài học: ${res.error}`);
    } else {
      setLessons(res.data);
      if (res.data.length > 0) {
        if (!selectedLessonId || !res.data.some((l) => l.id === selectedLessonId)) {
          setSelectedLessonId(res.data[0].id);
        }
      } else {
        setSelectedLessonId('');
      }
    }
  };

  const loadSentences = async (lId?: string) => {
    const targetLessonId = lId || selectedLessonId;
    if (!targetLessonId) {
      setSentences([]);
      setSentencesError(null);
      return;
    }
    setLoadingSentences(true);
    setSentencesError(null);
    const res = await fetchSupabaseSentences(targetLessonId);
    setLoadingSentences(false);

    if (res.error) {
      setSentencesError({
        code: res.errorCode,
        message: res.error,
        hint: res.errorHint,
      });
      showFeedback('error', `Lỗi tải mẫu câu: ${res.error}`);
    } else {
      setSentences(res.data);
    }
  };

  const loadProgress = async () => {
    setLoadingProgress(true);
    setProgressError(null);
    const res = await fetchSupabaseLearningProgress();
    setLoadingProgress(false);

    if (res.error) {
      setProgressError({
        code: res.errorCode,
        message: res.error,
        hint: res.errorHint,
      });
      showFeedback('error', `Lỗi tải tiến độ học viên: ${res.error}`);
    } else {
      setProgressList(res.data);
      setProgressCount(res.count);
    }
  };

  const runAuditAndColumns = async () => {
    setIsRunningAudit(true);
    try {
      const [colData, diag] = await Promise.all([
        detectTableColumns(),
        runSupabaseHealthCheck(),
      ]);
      setColumnStatus(colData);
      setDiagnosticReport(diag);
    } catch (e: any) {
      showFeedback('error', `Lỗi kiểm định schema: ${e?.message}`);
    } finally {
      setIsRunningAudit(false);
    }
  };

  useEffect(() => {
    loadCourses();
    runAuditAndColumns();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadLessons(selectedCourseId);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedLessonId) {
      loadSentences(selectedLessonId);
    }
  }, [selectedLessonId]);

  useEffect(() => {
    if (activeTab === 'progress') {
      loadProgress();
    }
  }, [activeTab]);

  // ---------------------------------------------------------------------------
  // Handlers: Course CRUD
  // ---------------------------------------------------------------------------

  const handleOpenCreateCourse = () => {
    setEditingCourseId(null);
    setCourseForm({
      title: '',
      description: '',
      level: 'B1',
      category: 'Communication',
      tier: 'Free',
      status: 'Published',
      thumbnail_url: '',
    });
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course: DbCourse) => {
    setEditingCourseId(course.id);
    setCourseForm({
      title: course.title,
      description: course.description,
      level: (course.level as CourseLevelCEFR) || 'B1',
      category: course.category || 'Communication',
      tier: course.tier || 'Free',
      status: course.status || 'Published',
      thumbnail_url: course.thumbnail_url || '',
    });
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title.trim()) {
      showFeedback('error', 'Vui lòng nhập tên khóa học.');
      return;
    }

    if (editingCourseId) {
      const { data, error } = await updateSupabaseCourse(editingCourseId, courseForm);
      if (error) {
        showFeedback('error', `Cập nhật khóa học thất bại: ${error}`);
      } else {
        showFeedback('success', `Cập nhật khóa học "${courseForm.title}" thành công!`);
        setIsCourseModalOpen(false);
        loadCourses();
      }
    } else {
      const { data, error } = await createSupabaseCourse(courseForm);
      if (error) {
        showFeedback('error', `Tạo khóa học thất bại: ${error}`);
      } else {
        showFeedback('success', `Tạo khóa học mới "${courseForm.title}" thành công trực tiếp trên Supabase!`);
        setIsCourseModalOpen(false);
        if (data?.id) setSelectedCourseId(data.id);
        loadCourses();
      }
    }
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khóa học "${title}" và dữ liệu liên quan khỏi Supabase?`)) {
      return;
    }
    const { success, error } = await deleteSupabaseCourse(id);
    if (!success) {
      showFeedback('error', `Không thể xóa khóa học: ${error}`);
    } else {
      showFeedback('success', `Đã xóa khóa học "${title}" thành công.`);
      if (selectedCourseId === id) {
        setSelectedCourseId('');
      }
      loadCourses();
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Lesson CRUD
  // ---------------------------------------------------------------------------

  const handleOpenCreateLesson = () => {
    if (!selectedCourseId) {
      showFeedback('error', 'Vui lòng chọn hoặc tạo một khóa học trước khi thêm bài học.');
      return;
    }
    setEditingLessonId(null);
    setLessonForm({
      course_id: selectedCourseId,
      title: '',
      description: '',
      content: '',
      objectives: '',
      video_url: '',
      audio_url: '',
      order_index: lessons.length + 1,
      status: 'Published',
    });
    setIsLessonModalOpen(true);
  };

  const handleOpenEditLesson = (lesson: DbLesson) => {
    setEditingLessonId(lesson.id);
    setLessonForm({
      course_id: lesson.course_id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content || '',
      objectives: lesson.objectives || '',
      video_url: lesson.video_url || '',
      audio_url: lesson.audio_url || '',
      order_index: lesson.order_index ?? 1,
      status: lesson.status || 'Published',
    });
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) {
      showFeedback('error', 'Vui lòng nhập tiêu đề bài học.');
      return;
    }
    if (!lessonForm.course_id) {
      showFeedback('error', 'Vui lòng chọn khóa học liên kết.');
      return;
    }

    if (editingLessonId) {
      const { data, error } = await updateSupabaseLesson(editingLessonId, lessonForm);
      if (error) {
        showFeedback('error', `Cập nhật bài học thất bại: ${error}`);
      } else {
        showFeedback('success', `Đã cập nhật bài học "${lessonForm.title}" thành công!`);
        setIsLessonModalOpen(false);
        loadLessons(selectedCourseId);
      }
    } else {
      const { data, error } = await createSupabaseLesson(lessonForm);
      if (error) {
        showFeedback('error', `Tạo bài học thất bại: ${error}`);
      } else {
        showFeedback('success', `Đã tạo bài học mới "${lessonForm.title}" trên Supabase!`);
        setIsLessonModalOpen(false);
        if (data?.id) setSelectedLessonId(data.id);
        loadLessons(selectedCourseId);
      }
    }
  };

  const handleDeleteLesson = async (id: string, title: string) => {
    if (!window.confirm(`Xác nhận xóa bài học "${title}"?`)) return;
    const { success, error } = await deleteSupabaseLesson(id);
    if (!success) {
      showFeedback('error', `Không thể xóa bài học: ${error}`);
    } else {
      showFeedback('success', `Đã xóa bài học thành công.`);
      if (selectedLessonId === id) setSelectedLessonId('');
      loadLessons(selectedCourseId);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Sentence CRUD
  // ---------------------------------------------------------------------------

  const handleOpenCreateSentence = () => {
    if (!selectedLessonId) {
      showFeedback('error', 'Vui lòng chọn bài học trước khi thêm mẫu câu.');
      return;
    }
    setEditingSentenceId(null);
    setSentenceForm({
      lesson_id: selectedLessonId,
      english: '',
      vietnamese: '',
      ipa: '',
      vocabulary_notes: '',
      grammar_explanation: '',
      context_of_use: '',
      audio_url: '',
      order_index: sentences.length + 1,
    });
    setIsSentenceModalOpen(true);
  };

  const handleOpenEditSentence = (s: DbSentence) => {
    setEditingSentenceId(s.id);
    setSentenceForm({
      lesson_id: s.lesson_id,
      english: s.english,
      vietnamese: s.vietnamese,
      ipa: s.ipa || '',
      vocabulary_notes: s.vocabulary_notes || '',
      grammar_explanation: s.grammar_explanation || '',
      context_of_use: s.context_of_use || '',
      audio_url: s.audio_url || '',
      order_index: s.order_index ?? 1,
    });
    setIsSentenceModalOpen(true);
  };

  const handleSaveSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentenceForm.english.trim() || !sentenceForm.vietnamese.trim()) {
      showFeedback('error', 'Vui lòng nhập cả câu tiếng Anh và bản dịch tiếng Việt.');
      return;
    }
    if (!sentenceForm.lesson_id) {
      showFeedback('error', 'Vui lòng chọn bài học liên kết.');
      return;
    }

    if (editingSentenceId) {
      const { data, error } = await updateSupabaseSentence(editingSentenceId, sentenceForm);
      if (error) {
        showFeedback('error', `Cập nhật mẫu câu thất bại: ${error}`);
      } else {
        showFeedback('success', `Đã cập nhật mẫu câu thành công!`);
        setIsSentenceModalOpen(false);
        loadSentences(selectedLessonId);
      }
    } else {
      const { data, error } = await createSupabaseSentence(sentenceForm);
      if (error) {
        showFeedback('error', `Thêm mẫu câu thất bại: ${error}`);
      } else {
        showFeedback('success', `Thêm mẫu câu mới vào Supabase thành công!`);
        setIsSentenceModalOpen(false);
        loadSentences(selectedLessonId);
      }
    }
  };

  const handleDeleteSentence = async (id: string) => {
    if (!window.confirm('Xác nhận xóa mẫu câu này?')) return;
    const { success, error } = await deleteSupabaseSentence(id);
    if (!success) {
      showFeedback('error', `Không thể xóa mẫu câu: ${error}`);
    } else {
      showFeedback('success', `Đã xóa mẫu câu.`);
      loadSentences(selectedLessonId);
    }
  };

  // SQL Migration Script for Copy
  const SQL_MIGRATION_TEXT = `-- ==============================================================================
-- EnglishwithMikey - Supabase Database Schema & Permission Migration
-- ==============================================================================
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

-- Extend columns on courses
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'Communication',
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'Free',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Published',
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS teacher_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Extend columns on lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lesson_order integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS objectives text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Published',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Extend columns on sentences
ALTER TABLE public.sentences
  ADD COLUMN IF NOT EXISTS sentence_order integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ipa text,
  ADD COLUMN IF NOT EXISTS vocabulary_notes text,
  ADD COLUMN IF NOT EXISTS grammar_explanation text,
  ADD COLUMN IF NOT EXISTS context_of_use text,
  ADD COLUMN IF NOT EXISTS audio_url text;

-- Extend columns on learning_progress
ALTER TABLE public.learning_progress
  ADD COLUMN IF NOT EXISTS course_id text,
  ADD COLUMN IF NOT EXISTS score numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT now();

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  );
$$;

DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;
CREATE POLICY "Public can view published courses" ON public.courses
  FOR SELECT USING (status = 'Published' OR public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Teachers can insert courses" ON public.courses;
CREATE POLICY "Teachers can insert courses" ON public.courses
  FOR INSERT TO authenticated WITH CHECK (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Teachers can update courses" ON public.courses;
CREATE POLICY "Teachers can update courses" ON public.courses
  FOR UPDATE TO authenticated USING (public.is_teacher_or_admin()) WITH CHECK (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Teachers can delete courses" ON public.courses;
CREATE POLICY "Teachers can delete courses" ON public.courses
  FOR DELETE TO authenticated USING (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Public can view published lessons" ON public.lessons;
CREATE POLICY "Public can view published lessons" ON public.lessons
  FOR SELECT USING (status = 'Published' OR public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Teachers can insert lessons" ON public.lessons;
CREATE POLICY "Teachers can insert lessons" ON public.lessons
  FOR INSERT TO authenticated WITH CHECK (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Teachers can update lessons" ON public.lessons;
CREATE POLICY "Teachers can update lessons" ON public.lessons
  FOR UPDATE TO authenticated USING (public.is_teacher_or_admin()) WITH CHECK (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Teachers can delete lessons" ON public.lessons;
CREATE POLICY "Teachers can delete lessons" ON public.lessons
  FOR DELETE TO authenticated USING (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Public can view sentences" ON public.sentences;
CREATE POLICY "Public can view sentences" ON public.sentences FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers can insert sentences" ON public.sentences;
CREATE POLICY "Teachers can insert sentences" ON public.sentences
  FOR INSERT TO authenticated WITH CHECK (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Teachers can update sentences" ON public.sentences;
CREATE POLICY "Teachers can update sentences" ON public.sentences
  FOR UPDATE TO authenticated USING (public.is_teacher_or_admin()) WITH CHECK (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Teachers can delete sentences" ON public.sentences;
CREATE POLICY "Teachers can delete sentences" ON public.sentences
  FOR DELETE TO authenticated USING (public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Students can view own progress" ON public.learning_progress;
CREATE POLICY "Students can view own progress" ON public.learning_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_teacher_or_admin());

DROP POLICY IF EXISTS "Students can insert own progress" ON public.learning_progress;
CREATE POLICY "Students can insert own progress" ON public.learning_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own progress" ON public.learning_progress;
CREATE POLICY "Students can update own progress" ON public.learning_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

  const copyMigrationSql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_TEXT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Enforce Teacher Role check
  if (user?.role !== 'teacher') {
    return (
      <div className="py-20 px-4 text-center max-w-md mx-auto text-white space-y-4">
        <div className="w-14 h-14 bg-red-950/80 border border-red-800 rounded-2xl flex items-center justify-center text-red-400 mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">
          {lang === 'vi' ? 'Khu Vực Quản Trị Dành Cho Giáo Viên' : 'Teacher Access Required'}
        </h2>
        <p className="text-xs text-slate-400">
          {lang === 'vi'
            ? 'Bạn đang đăng nhập với tài khoản học viên. Vui lòng đăng nhập với tài khoản giáo viên Supabase để quản lý nội dung khóa học và bài giảng.'
            : 'You are signed in as a student. Sign in with a Supabase teacher account to manage curriculum.'}
        </p>
      </div>
    );
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const selectedLesson = lessons.find((l) => l.id === selectedLessonId);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-white space-y-6">
      {/* Top Banner / Toast Notification */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border shadow-lg transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : feedbackMsg.type === 'error'
              ? 'bg-red-950/90 border-red-700 text-red-200'
              : 'bg-blue-950/90 border-blue-700 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {feedbackMsg.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
            {feedbackMsg.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
            <Shield className="w-4 h-4" />
            <span>Teacher Content Management System (Supabase Live)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {lang === 'vi' ? 'Hệ Thống Quản Lý Nội Dung Giáo Viên' : 'Teacher Content Management System'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {lang === 'vi'
              ? 'Quản lý khóa học, bài giảng, mẫu câu song ngữ và giám sát tiến độ học viên trực tiếp với Supabase.'
              : 'Manage courses, bilingual lessons, sentences, and track student progression directly connected to Supabase.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              loadCourses();
              if (selectedCourseId) loadLessons(selectedCourseId);
              if (selectedLessonId) loadSentences(selectedLessonId);
              if (activeTab === 'progress') loadProgress();
              runAuditAndColumns();
              showFeedback('info', 'Đã làm mới dữ liệu từ Supabase.');
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCourses || loadingLessons ? 'animate-spin' : ''}`} />
            <span>{lang === 'vi' ? 'Làm Mới' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleOpenCreateCourse}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Tạo Khóa Học Mới' : 'New Course'}</span>
          </button>
        </div>
      </div>

      {/* Live Supabase Connection & Schema Alert Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isSupabaseAuthenticated ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">
                Supabase Endpoint: <code className="text-emerald-400 font-mono text-[11px]">kczyigukukpyoyhlajci.supabase.co</code>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                isSupabaseAuthenticated
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {isSupabaseAuthenticated ? 'JWT Authenticated (Teacher Role)' : 'Anon Session (Cần Đăng Nhập)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tài khoản giáo viên: <span className="text-white font-mono">{user?.email || 'englishwithmikey@gmail.com (Chưa đăng nhập)'}</span>
              {isSupabaseAuthenticated && user?.id && (
                <span className="text-emerald-400 ml-2">· Phiên Auth hợp lệ (auth.uid: {user.id.substring(0, 8)}...)</span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('database')}
          className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Kiểm Tra Schema & Lấy File Migration SQL</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </button>
      </div>

      {/* Real Live Teacher Statistics Cards (Computed Dynamically: Strict No Mock 42 / 2450) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Chuỗi học tập (Streak)</p>
            <p className="text-base font-extrabold text-white font-mono tabular-nums">
              {user?.streak_days ?? 0} <span className="text-xs font-normal text-slate-400">ngày</span>
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Điểm kinh nghiệm (XP)</p>
            <p className="text-base font-extrabold text-emerald-400 font-mono tabular-nums">
              {user?.xp_points ?? 0} <span className="text-xs font-normal text-slate-400">XP</span>
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-950/80 border border-blue-800/80 flex items-center justify-center text-blue-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Hạng thành viên</p>
            <p className="text-base font-extrabold text-white uppercase font-mono">
              {user?.membership_tier || 'free'}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-950/80 border border-purple-800/80 flex items-center justify-center text-purple-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Khóa học Supabase</p>
            <p className="text-base font-extrabold text-white font-mono tabular-nums">
              {courses.length} <span className="text-xs font-normal text-slate-400">khóa</span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'courses' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>1. Quản Lý Khóa Học</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] font-mono">
            {courses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('lessons')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'lessons' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. Quản Lý Bài Học</span>
          {selectedCourse && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] font-mono">
              {lessons.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sentences')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'sentences' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>3. Quản Lý Mẫu Câu (IPA)</span>
          {selectedLesson && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] font-mono">
              {sentences.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'progress' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>4. Tiến Độ Học Viên</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] font-mono">
            {progressCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'database' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>5. Database & Migration SQL</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 1. COURSES TAB                                                      */}
      {/* =================================================================== */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <span>Danh Sách Khóa Học Trong Supabase</span>
              </h2>
              <p className="text-xs text-slate-400">
                Thực hiện CRUD trực tiếp vào bảng <code>public.courses</code>.
              </p>
            </div>

            <button
              onClick={handleOpenCreateCourse}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Khóa Học Mới</span>
            </button>
          </div>

          {/* Courses Error Banner (Displays Actual Supabase / PostgreSQL Error) */}
          {coursesError && (
            <div className="p-5 rounded-2xl bg-red-950/40 border border-red-800 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-red-900/60 text-red-300 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-red-900 text-red-200">
                      PostgreSQL Error {coursesError.code || 'FAIL'}
                    </span>
                    <span className="text-xs text-red-300 font-semibold">
                      {coursesError.code === '42501'
                        ? 'Lỗi Phân Quyền Truy Cập (42501 permission denied for table courses)'
                        : 'Lỗi Truy Vấn Bảng Khóa Học'}
                    </span>
                  </div>
                  <p className="text-xs text-red-200 font-mono bg-slate-950/70 p-2.5 rounded-lg border border-red-900/50">
                    {coursesError.message}
                  </p>
                  {coursesError.hint && (
                    <p className="text-xs text-slate-300">
                      <strong>Gợi ý từ Supabase:</strong> {coursesError.hint}
                    </p>
                  )}
                  <div className="text-xs text-slate-300 space-y-1 pt-1">
                    <p>
                      <strong>Chẩn đoán nguyên nhân:</strong>
                      {!isSupabaseAuthenticated ? (
                        <span>
                          {' '}Hiện tại phiên kết nối đang ở vai trò <code>anon</code> (chưa có token JWT từ Supabase Auth).
                          Bảng <code>courses</code> và Row Level Security bảo vệ yêu cầu tài khoản giáo viên đã xác thực.
                        </span>
                      ) : (
                        <span>
                          {' '}Tài khoản giáo viên đã đăng nhập nhưng chưa được cấp quyền SELECT trên bảng <code>courses</code> trong PostgreSQL.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {!isSupabaseAuthenticated && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Xác Thực Supabase Auth Giáo Viên Để Xem & Quản Lý Khóa Học</span>
                  </div>
                  <form onSubmit={handleDirectTeacherAuth} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="email"
                      value="englishwithmikey@gmail.com"
                      disabled
                      className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 sm:w-64"
                    />
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu Supabase của bạn..."
                      value={teacherAuthPassword}
                      onChange={(e) => setTeacherAuthPassword(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 flex-1"
                    />
                    <button
                      type="submit"
                      disabled={teacherAuthLoading}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    >
                      {teacherAuthLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                      <span>Đăng Nhập JWT</span>
                    </button>
                  </form>
                  {teacherAuthFeedback && (
                    <p className="text-xs text-amber-300">{teacherAuthFeedback}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={loadCourses}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử Lại Truy Vấn</span>
                </button>
                <button
                  onClick={() => setActiveTab('database')}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Xem Script SQL Migration / Phân Quyền</span>
                </button>
              </div>
            </div>
          )}

          {loadingCourses ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs font-mono">Đang truy vấn bảng courses từ Supabase...</p>
            </div>
          ) : !coursesError && courses.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-dashed border-slate-700 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Chưa Có Khóa Học Nào Trong Database Supabase</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Bảng <code>courses</code> hiện có 0 bản ghi. Hãy bấm nút dưới đây để tạo khóa học đầu tiên của bạn trực tiếp vào Supabase!
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  onClick={handleOpenCreateCourse}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-colors shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Khóa Học Đầu Tiên</span>
                </button>
                <button
                  onClick={async () => {
                    showFeedback('info', 'Đang khởi tạo khóa học Basic Communication A1 vào Supabase...');
                    const res = await seedA1CurriculumToSupabase();
                    if (res.success) {
                      showFeedback('success', res.message);
                      loadCourses();
                    } else {
                      showFeedback('error', res.message);
                    }
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Khởi Tạo Khóa Học "Basic Communication A1" Vào Supabase</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    selectedCourseId === course.id
                      ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between text-[11px] gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded font-bold bg-emerald-950 border border-emerald-800 text-emerald-400 uppercase">
                          {course.level}
                        </span>
                        <span className="px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-300">
                          {course.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            course.tier === 'Premium'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {course.tier}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-medium text-[10px] ${
                            course.status === 'Published'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {course.status}
                        </span>
                      </div>
                    </div>

                    {/* Thumbnail if present */}
                    {course.thumbnail_url && (
                      <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Title & Desc */}
                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-1">{course.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {course.description || 'Chưa có mô tả chi tiết cho khóa học này.'}
                      </p>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono">
                      ID: <span className="text-slate-400">{course.id}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setActiveTab('lessons');
                      }}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Xem Bài Học</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditCourse(course)}
                        title="Chỉnh sửa khóa học"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id, course.title)}
                        title="Xóa khóa học khỏi Supabase"
                        className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300 hover:text-red-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. LESSONS TAB                                                      */}
      {/* =================================================================== */}
      {activeTab === 'lessons' && (
        <div className="space-y-6">
          {/* Course Selector Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
                Chọn khóa học:
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
              >
                {courses.length === 0 && <option value="">(Chưa có khóa học nào)</option>}
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.level}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenCreateLesson}
              disabled={!selectedCourseId}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Bài Học Mới</span>
            </button>
          </div>

          {/* Lessons Error Banner */}
          {lessonsError && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-red-200 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Lỗi truy vấn bảng lessons [PostgreSQL {lessonsError.code || 'ERR'}]:</span>
              </div>
              <p className="font-mono text-red-300 bg-slate-950/60 p-2 rounded border border-red-900/40">
                {lessonsError.message}
              </p>
              {lessonsError.hint && (
                <p className="text-slate-300"><strong>Gợi ý:</strong> {lessonsError.hint}</p>
              )}
              <button
                onClick={() => loadLessons(selectedCourseId)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* Lessons List */}
          {loadingLessons ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs font-mono">Đang tải danh sách bài học từ Supabase...</p>
            </div>
          ) : !selectedCourseId ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
              Vui lòng tạo hoặc chọn một khóa học ở trên để quản lý bài học.
            </div>
          ) : !lessonsError && lessons.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-dashed border-slate-700 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Chưa Có Bài Học Nào Trong Khóa Học Này</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Bảng <code>lessons</code> chưa có bài học nào liên kết với Course ID <code>{selectedCourseId}</code>.
              </p>
              <button
                onClick={handleOpenCreateLesson}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-colors shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Bài Học Đầu Tiên</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    selectedLessonId === lesson.id
                      ? 'bg-slate-900 border-emerald-500 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <span className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                      {lesson.order_index ?? idx + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{lesson.title}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded font-medium ${
                            lesson.status === 'Published'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {lesson.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{lesson.description}</p>
                      {lesson.objectives && (
                        <p className="text-[11px] text-emerald-300/90 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Mục tiêu: {lesson.objectives}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <button
                      onClick={() => {
                        setSelectedLessonId(lesson.id);
                        setActiveTab('sentences');
                      }}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Type className="w-3.5 h-3.5" />
                      <span>Quản Lý Mẫu Câu</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditLesson(lesson)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Sửa bài học"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                      className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300"
                      title="Xóa bài học"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. SENTENCES TAB                                                    */}
      {/* =================================================================== */}
      {activeTab === 'sentences' && (
        <div className="space-y-6">
          {/* Lesson Selector Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-300 whitespace-nowrap">Khóa học:</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-300 whitespace-nowrap">Bài học:</label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs"
                >
                  {lessons.length === 0 && <option value="">(Chưa có bài học)</option>}
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleOpenCreateSentence}
              disabled={!selectedLessonId}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Mẫu Câu Mới</span>
            </button>
          </div>

          {/* Sentences Error Banner */}
          {sentencesError && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-red-200 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Lỗi truy vấn bảng sentences [PostgreSQL {sentencesError.code || 'ERR'}]:</span>
              </div>
              <p className="font-mono text-red-300 bg-slate-950/60 p-2 rounded border border-red-900/40">
                {sentencesError.message}
              </p>
              {sentencesError.hint && (
                <p className="text-slate-300"><strong>Gợi ý:</strong> {sentencesError.hint}</p>
              )}
              <button
                onClick={() => loadSentences(selectedLessonId)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* Sentences List */}
          {loadingSentences ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs font-mono">Đang tải mẫu câu từ Supabase...</p>
            </div>
          ) : !selectedLessonId ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
              Vui lòng chọn bài học ở thanh trên để xem và thêm các mẫu câu luyện tập.
            </div>
          ) : !sentencesError && sentences.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-dashed border-slate-700 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
                <Type className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Chưa Có Mẫu Câu Luyện Tập Trong Bài Học Này</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Bảng <code>sentences</code> hiện chưa có câu nào cho Lesson ID <code>{selectedLessonId}</code>.
              </p>
              <button
                onClick={handleOpenCreateSentence}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-colors shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Mẫu Câu Đầu Tiên</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sentences.map((s, idx) => (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded bg-slate-800 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center">
                          {s.sentence_order ?? idx + 1}
                        </span>
                        <p className="text-base font-bold text-white">{s.english}</p>
                        {s.ipa && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                            {s.ipa}
                          </span>
                        )}
                        <button
                          onClick={() => playSentenceAudio(s.english, s.audio_url)}
                          className="p-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-800/80 transition-colors ml-1"
                          title="Nghe phát âm tiếng Anh (Audio / Web Speech)"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 font-medium pl-8">{s.vietnamese}</p>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => playSentenceAudio(s.english, s.audio_url)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditSentence(s)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="Sửa mẫu câu"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSentence(s.id)}
                        className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300"
                        title="Xóa mẫu câu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Linguistic Meta Details */}
                  {(s.vocabulary_notes || s.grammar_explanation || s.context_of_use) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-[11px]">
                      {s.vocabulary_notes && (
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                          <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">
                            Từ Vựng Trọng Tâm:
                          </span>
                          <p className="text-slate-300">{s.vocabulary_notes}</p>
                        </div>
                      )}
                      {s.grammar_explanation && (
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                          <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">
                            Ngữ Pháp:
                          </span>
                          <p className="text-slate-300">{s.grammar_explanation}</p>
                        </div>
                      )}
                      {s.context_of_use && (
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                          <span className="font-bold text-purple-400 uppercase tracking-wider text-[10px]">
                            Ngữ Cảnh Ứng Dụng:
                          </span>
                          <p className="text-slate-300">{s.context_of_use}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. STUDENT PROGRESS TAB                                             */}
      {/* =================================================================== */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <span>Nhật Ký & Tiến Độ Học Viên Thực Tế Từ Supabase</span>
              </h2>
              <p className="text-xs text-slate-400">
                Truy vấn trực tiếp từ bảng <code>public.learning_progress</code>. Số bản ghi thực: {progressCount}.
              </p>
            </div>

            <button
              onClick={loadProgress}
              disabled={loadingProgress}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingProgress ? 'animate-spin' : ''}`} />
              <span>Tải Lại Tiến Độ</span>
            </button>
          </div>

          {/* Progress Error Banner */}
          {progressError && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-red-200 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Lỗi truy vấn bảng learning_progress [PostgreSQL {progressError.code || 'ERR'}]:</span>
              </div>
              <p className="font-mono text-red-300 bg-slate-950/60 p-2 rounded border border-red-900/40">
                {progressError.message}
              </p>
              {progressError.hint && (
                <p className="text-slate-300"><strong>Gợi ý:</strong> {progressError.hint}</p>
              )}
              <button
                onClick={loadProgress}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {loadingProgress ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs font-mono">Đang truy vấn dữ liệu learning_progress...</p>
            </div>
          ) : !progressError && progressList.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Chưa Có Dữ Liệu Tiến Độ Học Viên</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Bảng <code>learning_progress</code> trong Supabase hiện có <strong>0 bản ghi</strong>. Khi học viên hoàn thành các bài học và bài tập luyện tập, lịch sử sẽ tự động ghi nhận tại đây.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Student User ID</th>
                      <th className="py-3 px-4">Lesson ID</th>
                      <th className="py-3 px-4">Khóa Học (Course)</th>
                      <th className="py-3 px-4">Trạng Thái</th>
                      <th className="py-3 px-4">Điểm Đạt</th>
                      <th className="py-3 px-4">Cập Nhật</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {progressList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-[11px] text-white">
                          {p.user_id}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                          {p.lesson_id}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {p.course_id || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          {p.is_completed ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              Đã hoàn thành
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                              Đang học
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {p.score !== undefined ? `${p.score}%` : '100%'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : 'Vừa xong'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. DATABASE SCHEMA & MIGRATION SQL TAB                              */}
      {/* =================================================================== */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <span>Kiểm Định Cấu Trúc Database & Hướng Dẫn Migration</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Xem trạng thái các cột thực tế trong database Supabase và copy script SQL migration an toàn.
              </p>
            </div>

            <button
              onClick={runAuditAndColumns}
              disabled={isRunningAudit}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
              <span>Quét Lại Cột Supabase</span>
            </button>
          </div>

          {/* Real Column Status Matrix */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Hiện Trạng Cột Dữ Liệu Trong 4 Bảng Supabase</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {columnStatus &&
                Object.entries(columnStatus).map(([tbl, val]: any) => (
                  <div key={tbl} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white text-xs">{tbl}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          val.extended
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {val.extended ? 'Đã chạy Migration' : 'Cấu trúc cơ bản'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                      {val.cols.map((col: string) => (
                        <span key={col} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {col}
                        </span>
                      ))}
                    </div>
                    {!val.extended && (
                      <p className="text-[11px] text-slate-400">
                        ⚡ <em>CMS đang tự động lưu trữ các trường mở rộng vào description để không làm mất dữ liệu cho đến khi bạn chạy migration SQL.</em>
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Standalone SQL Script Viewer & Copy */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span>File Migration SQL Độc Lập: <code className="text-emerald-400 font-mono">supabase_schema_migration.sql</code></span>
                </h3>
                <p className="text-xs text-slate-400">
                  Script này sử dụng <code>ADD COLUMN IF NOT EXISTS</code> và chính sách RLS an toàn, đảm bảo không làm mất dữ liệu hiện có.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyMigrationSql}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'Đã Sao Chép SQL!' : 'Sao Chép Toàn Bộ SQL'}</span>
                </button>
                <a
                  href="https://supabase.com/dashboard/project/kczyigukukpyoyhlajci/sql"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Mở Supabase SQL Editor</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 max-h-96 overflow-y-auto leading-relaxed whitespace-pre select-all">
                {SQL_MIGRATION_TEXT}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-900 text-xs text-blue-200 space-y-1.5">
              <p className="font-bold text-blue-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-400" />
                <span>Các bước thực hiện trên Supabase:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-200/90 pl-1">
                <li>Bấm nút <strong>"Sao Chép Toàn Bộ SQL"</strong> ở trên.</li>
                <li>Mở trình duyệt vào Supabase Dashboard tại đường dẫn project của bạn.</li>
                <li>Chọn menu <strong>SQL Editor</strong> ở cột bên trái và bấm <strong>"New query"</strong>.</li>
                <li>Dán đoạn mã SQL vừa sao chép và bấm nút <strong>"RUN"</strong> (hoặc nhấn Ctrl+Enter).</li>
                <li>Quay lại Teacher Dashboard này và bấm <strong>"Quét Lại Cột Supabase"</strong> để xác nhận.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE / EDIT COURSE                                         */}
      {/* =================================================================== */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCourseModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>{editingCourseId ? 'Chỉnh Sửa Khóa Học' : 'Tạo Khóa Học Mới Trực Tiếp Trên Supabase'}</span>
            </h2>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tên khóa học (Course Title) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="Ví dụ: Master English Pronunciation with IPA"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Trình độ (CEFR Level)</label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as CourseLevelCEFR })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="A1">A1 - Beginner (Mất gốc / Cơ bản)</option>
                    <option value="A2">A2 - Elementary (Sơ cấp)</option>
                    <option value="B1">B1 - Intermediate (Trung cấp)</option>
                    <option value="B2">B2 - Upper-Intermediate (Trung cao cấp)</option>
                    <option value="C1">C1 - Advanced (Nâng cao)</option>
                    <option value="C2">C2 - Mastery (Thành thạo chuyên sâu)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Danh mục (Category)</label>
                  <select
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value as CourseCategoryType })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Pronunciation">Pronunciation (Phát âm chuẩn)</option>
                    <option value="Communication">Communication (Giao tiếp phản xạ)</option>
                    <option value="Grammar">Grammar (Ngữ pháp ứng dụng)</option>
                    <option value="IELTS">IELTS Preparation</option>
                    <option value="TOEIC">TOEIC Preparation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phân quyền gói (Tier)</label>
                  <select
                    value={courseForm.tier}
                    onChange={(e) => setCourseForm({ ...courseForm, tier: e.target.value as AccessTier })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Free">Free (Miễn phí cho mọi học viên)</option>
                    <option value="Premium">Premium (Dành riêng gói trả phí)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Trạng thái (Status)</label>
                  <select
                    value={courseForm.status}
                    onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value as ContentStatus })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Published">Published (Công khai cho học viên xem)</option>
                    <option value="Draft">Draft (Bản nháp - chỉ giáo viên xem)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Hình ảnh Thumbnail URL</label>
                <input
                  type="url"
                  value={courseForm.thumbnail_url}
                  onChange={(e) => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Mô tả khóa học</label>
                <textarea
                  rows={3}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Khóa học tập trung vào các kỹ năng cốt lõi giúp học viên tự tin..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  {editingCourseId ? 'Lưu Thay Đổi' : 'Lưu Vào Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE / EDIT LESSON                                         */}
      {/* =================================================================== */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsLessonModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>{editingLessonId ? 'Chỉnh Sửa Bài Học' : 'Thêm Bài Học Mới Vào Supabase'}</span>
            </h2>

            <form onSubmit={handleSaveLesson} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Khóa học liên kết</label>
                <select
                  value={lessonForm.course_id}
                  onChange={(e) => setLessonForm({ ...lessonForm, course_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.level}] {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tiêu đề bài học <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="Ví dụ: Lesson 1: Master Vowel & Diphthong Sounds"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thứ tự hiển thị (Order Index)</label>
                  <input
                    type="number"
                    value={lessonForm.order_index}
                    onChange={(e) => setLessonForm({ ...lessonForm, order_index: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Trạng thái (Status)</label>
                  <select
                    value={lessonForm.status}
                    onChange={(e) => setLessonForm({ ...lessonForm, status: e.target.value as ContentStatus })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="Published">Published (Công khai)</option>
                    <option value="Draft">Draft (Bản nháp)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Mục tiêu bài học (Objectives)</label>
                <input
                  type="text"
                  value={lessonForm.objectives}
                  onChange={(e) => setLessonForm({ ...lessonForm, objectives: e.target.value })}
                  placeholder="Ví dụ: Phân biệt được /i:/ và /ɪ/, ứng dụng đọc đúng 20 từ vựng cốt lõi."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Video bài giảng URL</label>
                  <input
                    type="url"
                    value={lessonForm.video_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Audio phát âm URL</label>
                  <input
                    type="url"
                    value={lessonForm.audio_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, audio_url: e.target.value })}
                    placeholder="https://.../pronunciation.mp3"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Mô tả bài học</label>
                <textarea
                  rows={2}
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  placeholder="Tóm tắt ngắn gọn nội dung bài học..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nội dung bài học song ngữ (Content)</label>
                <textarea
                  rows={4}
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  placeholder="Soạn nội dung bài học chi tiết, giải thích lý thuyết phát âm hoặc ngữ pháp song ngữ..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  {editingLessonId ? 'Cập Nhật Bài Học' : 'Lưu Bài Học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE / EDIT SENTENCE                                       */}
      {/* =================================================================== */}
      {isSentenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsSentenceModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Type className="w-5 h-5 text-emerald-400" />
              <span>{editingSentenceId ? 'Chỉnh Sửa Mẫu Câu' : 'Thêm Mẫu Câu Luyện Tập Song Ngữ'}</span>
            </h2>

            <form onSubmit={handleSaveSentence} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Mẫu câu tiếng Anh (English Sentence) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sentenceForm.english}
                  onChange={(e) => setSentenceForm({ ...sentenceForm, english: e.target.value })}
                  placeholder="Ví dụ: She articulates her thoughts with absolute confidence."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Dịch nghĩa tiếng Việt <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sentenceForm.vietnamese}
                  onChange={(e) => setSentenceForm({ ...sentenceForm, vietnamese: e.target.value })}
                  placeholder="Ví dụ: Cô ấy diễn đạt suy nghĩ của mình với sự tự tin tuyệt đối."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phiên âm quốc tế (IPA)</label>
                  <input
                    type="text"
                    value={sentenceForm.ipa}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, ipa: e.target.value })}
                    placeholder="/ʃiː ɑːˈtɪk.jə.leɪts.../"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-amber-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={sentenceForm.order_index}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, order_index: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Ghi chú từ vựng trọng tâm</label>
                <input
                  type="text"
                  value={sentenceForm.vocabulary_notes}
                  onChange={(e) => setSentenceForm({ ...sentenceForm, vocabulary_notes: e.target.value })}
                  placeholder="Ví dụ: articulate (v): diễn đạt rõ ràng; absolute confidence (collocation)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Giải thích cấu trúc ngữ pháp</label>
                <input
                  type="text"
                  value={sentenceForm.grammar_explanation}
                  onChange={(e) => setSentenceForm({ ...sentenceForm, grammar_explanation: e.target.value })}
                  placeholder="Ví dụ: Hiện tại đơn diễn tả đặc điểm, thói quen; giới từ 'with' + cụm danh từ."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Ngữ cảnh sử dụng thực tế</label>
                <input
                  type="text"
                  value={sentenceForm.context_of_use}
                  onChange={(e) => setSentenceForm({ ...sentenceForm, context_of_use: e.target.value })}
                  placeholder="Ví dụ: Phỏng vấn xin việc, thuyết trình kinh doanh, đánh giá năng lực."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSentenceModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  {editingSentenceId ? 'Cập Nhật Mẫu Câu' : 'Lưu Mẫu Câu Vào Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
