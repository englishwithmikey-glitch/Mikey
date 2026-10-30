import React, { useState, useEffect } from 'react';
import { DbCourse, DbLesson, fetchSupabaseLessons } from '../../services/courseService';
import { Course, Lesson } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  X,
  BookOpen,
  CheckCircle2,
  Play,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CourseDetailModalProps {
  course: DbCourse | Course | null;
  onClose: () => void;
  onSelectLesson: (course: any, lesson: any) => void;
  onOpenPricing: () => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  onClose,
  onSelectLesson,
  onOpenPricing,
}) => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Requirement 2: When student selects course, fetch lessons where course_id matches
  // Requirement 3: Sort lessons by lesson_order ascending
  const loadLessons = async (courseId: string) => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await fetchSupabaseLessons(courseId);
    setLoading(false);

    if (error) {
      setErrorMsg(error);
      setLessons([]);
    } else {
      setLessons(data);
    }
  };

  useEffect(() => {
    if (course?.id) {
      loadLessons(course.id);
    } else {
      setLessons([]);
      setErrorMsg(null);
    }
  }, [course?.id]);

  if (!course) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 sm:p-8 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Metadata Badges */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span className="px-2 py-0.5 rounded font-bold bg-emerald-950 border border-emerald-800 text-emerald-400 uppercase text-[11px]">
            {course.level || 'A1'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-slate-300">
            {course.category || 'Communication'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-[11px] font-mono text-slate-400">
            Tier: {course.tier || 'Free'}
          </span>
        </div>

        {/* Course Title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          {course.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
          {course.description || 'Khóa học cung cấp lộ trình tiếng Anh chuẩn quốc tế.'}
        </p>

        {/* Lessons Section */}
        <div className="mt-8 border-t border-slate-800 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Danh Sách Bài Học (Supabase Lessons)</span>
            </h3>

            <button
              onClick={() => course?.id && loadLessons(course.id)}
              disabled={loading}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-12 text-center space-y-2 bg-slate-950/50 rounded-xl border border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs text-slate-400 font-mono">
                Đang truy vấn bảng lessons từ Supabase...
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && errorMsg && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-300">
                <AlertTriangle className="w-4 h-4" />
                <span>Lỗi khi lấy danh sách bài học:</span>
              </div>
              <p className="font-mono text-[11px] text-red-300">{errorMsg}</p>
              <button
                onClick={() => course?.id && loadLessons(course.id)}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-600/50 rounded text-xs text-red-100"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !errorMsg && lessons.length === 0 && (
            <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-dashed border-slate-800 text-xs space-y-2">
              <p className="font-bold text-white">Chưa có bài học nào trong khóa học này.</p>
              <p className="text-slate-400">
                Bảng <code>lessons</code> chưa có bài học liên kết với <code>course_id = {course.id}</code>.
              </p>
            </div>
          )}

          {/* Lessons List */}
          {!loading && !errorMsg && lessons.length > 0 && (
            <div className="space-y-3">
              {lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 font-bold text-xs font-mono flex items-center justify-center shrink-0 border border-slate-700">
                      #{lesson.lesson_order ?? lesson.order_index ?? idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{lesson.title}</h4>
                        {lesson.status === 'Draft' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                            Draft
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-1">
                        {lesson.description || 'Xem chi tiết các mẫu câu và bài tập.'}
                      </p>

                      {lesson.objectives && (
                        <p className="text-[11px] text-emerald-400/90 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>{lesson.objectives}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectLesson(course, lesson)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 self-end sm:self-auto transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Học Bài Này</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
