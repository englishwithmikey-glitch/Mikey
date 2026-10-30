import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Course, Lesson } from '../../types';
import {
  Flame,
  Zap,
  BookOpen,
  Award,
  ArrowRight,
  Clock,
  CheckCircle2,
  Play,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface StudentDashboardProps {
  onSelectCourse: (course: Course) => void;
  onSelectLesson: (course: Course, lesson: Lesson) => void;
  onOpenPricing: () => void;
  onExploreCourses: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onSelectCourse,
  onSelectLesson,
  onOpenPricing,
  onExploreCourses,
}) => {
  const { user, courses, learningProgress, isLessonCompleted, progressError } = useAuth();
  const { t, lang } = useLanguage();

  if (!user) {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mx-auto">
          <BookOpen className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">
          {lang === 'vi' ? 'Chào Mừng Đến Với EnglishwithMikey' : 'Welcome to EnglishwithMikey'}
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {lang === 'vi'
            ? 'Vui lòng đăng nhập tài khoản học viên để lưu tiến độ học tập, chuỗi ngày streak và điểm kinh nghiệm XP trực tiếp trên Supabase.'
            : 'Please sign in to track your learning progress, daily streak, and XP on Supabase.'}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={onExploreCourses}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
          >
            {lang === 'vi' ? 'Khám Phá Khóa Học' : 'Explore Courses'}
          </button>
        </div>
      </div>
    );
  }

  const totalCompleted = learningProgress.filter((p) => p.user_id === user.id && p.completed).length;

  // Find next uncompleted lesson to recommend
  let nextLessonToStudy: { course: Course; lesson: Lesson } | null = null;
  for (const c of (courses || [])) {
    if (c.tier === 'premium' && user.membership_tier !== 'premium') continue;
    for (const l of (c.lessons || [])) {
      if (!isLessonCompleted(c.id, l.id)) {
        nextLessonToStudy = { course: c, lesson: l };
        break;
      }
    }
    if (nextLessonToStudy) break;
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-white space-y-8">
      {progressError && <p role="alert" className="p-4 rounded-xl border border-red-800 text-red-200">{progressError}</p>}
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>{t.welcomeBack},</span>
            <span className="text-emerald-400 font-bold">{user.full_name}</span>
            <span>·</span>
            <span className="uppercase text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded">
              {user.membership_tier}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {lang === 'vi' ? 'Tiếp Tục Chinh Phục Mục Tiêu Hôm Nay' : 'Keep Your Daily English Momentum'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {lang === 'vi'
              ? `Mục tiêu hiện tại: ${user.target_goal || 'Luyện phát âm & Giao tiếp tự tin'}`
              : `Current Target: ${user.target_goal || 'Fluency Mastery'}`}
          </p>
        </div>

        {/* Quick KPI stats in banner */}
        <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800 shrink-0">
          <div className="flex items-center gap-2 px-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-[10px] text-slate-400">{t.streakCount}</p>
              <p className="text-sm font-bold text-white font-mono tabular-nums">{user.streak_days} days</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="flex items-center gap-2 px-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-[10px] text-slate-400">{t.totalXp}</p>
              <p className="text-sm font-bold text-emerald-400 font-mono tabular-nums">{user.xp_points} XP</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="flex items-center gap-2 px-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <div>
              <p className="text-[10px] text-slate-400">{t.completedCount}</p>
              <p className="text-sm font-bold text-white font-mono tabular-nums">{totalCompleted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Next Lesson Card */}
      {nextLessonToStudy && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>{t.recommendedLessons}</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {lang === 'vi' ? nextLessonToStudy.lesson.title_vi : nextLessonToStudy.lesson.title}
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {lang === 'vi'
                ? nextLessonToStudy.lesson.description_vi
                : nextLessonToStudy.lesson.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
              <span>{lang === 'vi' ? nextLessonToStudy.course.title_vi : nextLessonToStudy.course.title}</span>
              <span>·</span>
              <span className="font-mono tabular-nums">{nextLessonToStudy.lesson.duration_mins} mins</span>
              <span>·</span>
              <span className="text-emerald-400 font-mono tabular-nums">+{nextLessonToStudy.lesson.xp_reward} XP</span>
            </div>
          </div>

          <button
            onClick={() => onSelectLesson(nextLessonToStudy!.course, nextLessonToStudy!.lesson)}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.startLesson}</span>
          </button>
        </div>
      )}

      {/* Enrolled Courses & Progress Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>{t.myCourses}</span>
          </h2>
          <button
            onClick={onExploreCourses}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>{t.exploreCourses}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {(courses || []).map((course) => {
            const lessonsList = course.lessons || [];
            const completedLessonsInCourse = lessonsList.filter((l) =>
              isLessonCompleted(course.id, l.id)
            ).length;
            const totalLessons = course.lesson_count || lessonsList.length || 1;
            const progress = Math.round((completedLessonsInCourse / totalLessons) * 100);

            return (
              <div
                key={course.id}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="text-emerald-400 font-semibold">{course.category.toUpperCase()}</span>
                    <span className="font-mono tabular-nums">{completedLessonsInCourse}/{course.lesson_count} {lang === 'vi' ? 'bài' : 'lessons'}</span>
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {lang === 'vi' ? course.title_vi : course.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {lang === 'vi' ? course.description_vi : course.description}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-4 pt-2">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                      <span>Progress</span>
                      <span className="text-emerald-400 font-semibold">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    {course.duration_hours}h total
                  </span>
                  <button
                    onClick={() => onSelectCourse(course)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-emerald-600 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>{t.continueLesson}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Learning Activity Log */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>{t.recentActivity}</span>
        </h2>

        {learningProgress.length > 0 ? (
          <div className="rounded-2xl border border-slate-800 divide-y divide-slate-800 bg-slate-900/60 overflow-hidden">
            {learningProgress.map((p, idx) => {
              const matchedCourse = (courses || []).find((c) => c.id === p.course_id);
              const matchedLesson = (matchedCourse?.lessons || []).find((l) => l.id === p.lesson_id);

              return (
                <div key={idx} className="p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                      ✓
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {matchedLesson
                          ? (lang === 'vi' ? matchedLesson.title_vi : matchedLesson.title)
                          : 'Lesson Review'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {matchedCourse ? (lang === 'vi' ? matchedCourse.title_vi : matchedCourse.title) : 'Course'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400">
                    <span className="text-emerald-400 font-mono font-bold">+{p.xp_earned} XP</span>
                    <span className="hidden sm:inline text-slate-500 font-mono text-[11px]">
                      {new Date(p.last_studied_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-xs text-slate-400">
            {lang === 'vi' ? 'Chưa có hoạt động học tập nào. Hãy bắt đầu bài học đầu tiên!' : 'No recent activities yet. Start your first lesson today!'}
          </div>
        )}
      </div>
    </div>
  );
};
