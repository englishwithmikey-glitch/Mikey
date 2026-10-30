import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchSupabaseCourses, seedA1CurriculumToSupabase, DbCourse } from '../../services/courseService';
import {
  Search,
  BookOpen,
  ArrowRight,
  Lock,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface CourseCatalogProps {
  onSelectCourse: (course: DbCourse) => void;
  onOpenPricing: () => void;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  onSelectCourse,
  onOpenPricing,
}) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const loadCourses = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await fetchSupabaseCourses();
    setLoading(false);

    if (error) {
      setErrorMsg(error);
      setCourses([]);
    } else {
      setCourses(data);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleSeedCurriculum = async () => {
    setIsSeeding(true);
    setSeedSuccessMsg(null);
    setErrorMsg(null);
    const res = await seedA1CurriculumToSupabase();
    setIsSeeding(false);

    if (res.success) {
      setSeedSuccessMsg(res.message);
      await loadCourses();
    } else {
      setErrorMsg(res.message);
    }
  };

  const filtered = courses.filter((c) => {
    const titleMatch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const levelMatch = (c.level || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSearch = !searchQuery || titleMatch || descMatch || levelMatch;
    const matchesCategory =
      selectedCategory === 'all' ||
      (c.category && c.category.toLowerCase() === selectedCategory.toLowerCase());
    const matchesLevel =
      selectedLevel === 'all' ||
      (c.level && c.level.toUpperCase() === selectedLevel.toUpperCase());

    return matchesSearch && matchesCategory && matchesLevel;
  });

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-white space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'HỌC TRỰC TUYẾN SUPABASE' : 'SUPABASE LEARNING SUITE'}</span>
          </p>
          <h1 className="text-3xl font-extrabold text-white">
            {lang === 'vi' ? 'Khám Phá Các Khóa Học Tiếng Anh' : 'Browse All Structured Courses'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {lang === 'vi'
              ? 'Toàn bộ nội dung học tập được tải trực tiếp từ cơ sở dữ liệu Supabase theo thời gian thực.'
              : 'All curriculum and lessons loaded directly in real-time from Supabase.'}
          </p>
        </div>

        <button
          onClick={loadCourses}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 self-start transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{lang === 'vi' ? 'Làm Mới' : 'Refresh'}</span>
        </button>
      </div>

      {/* Seed Success Banner */}
      {seedSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{seedSuccessMsg}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'vi'
                ? 'Tìm kiếm theo tên khóa học, trình độ (ví dụ: A1, Basic Communication, B1)...'
                : 'Search courses by title, CEFR level (e.g. A1, Basic Communication)...'
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-medium">Trình độ (Level)</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Tất cả trình độ (All Levels)</option>
              <option value="A1">A1 - Beginner (Mất gốc / Cơ bản)</option>
              <option value="A2">A2 - Elementary (Sơ cấp)</option>
              <option value="B1">B1 - Intermediate (Trung cấp)</option>
              <option value="B2">B2 - Upper-Intermediate</option>
              <option value="C1">C1 - Advanced (Nâng cao)</option>
              <option value="C2">C2 - Mastery (Thành thạo)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-medium">Danh mục (Category)</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Tất cả danh mục (All Categories)</option>
              <option value="Communication">Communication (Giao tiếp)</option>
              <option value="Pronunciation">Pronunciation (Phát âm)</option>
              <option value="Grammar">Grammar (Ngữ pháp)</option>
              <option value="IELTS">IELTS</option>
              <option value="TOEIC">TOEIC</option>
            </select>
          </div>
        </div>
      </div>

      {/* STATE 1: LOADING STATE */}
      {loading && (
        <div className="p-16 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
          <p className="text-sm font-semibold text-white">
            {lang === 'vi' ? 'Đang tải danh sách khóa học từ Supabase...' : 'Loading courses from Supabase...'}
          </p>
          <p className="text-xs text-slate-400 font-mono">Querying: public.courses table</p>
        </div>
      )}

      {/* STATE 2: ERROR STATE */}
      {!loading && errorMsg && (
        <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800/80 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-200">
                {lang === 'vi' ? 'Lỗi kết nối hoặc truy vấn Supabase' : 'Supabase Query Error'}
              </h3>
              <p className="text-xs text-red-300 font-mono">{errorMsg}</p>
              {errorMsg.includes('42501') && (
                <div className="text-[11px] text-red-200/90 pt-2 space-y-1">
                  <p>
                    <strong>Nguyên nhân PostgreSQL 42501:</strong> Bảng <code>courses</code> hiện chưa được cấp quyền <code>GRANT SELECT</code> cho role của bạn hoặc bạn chưa đăng nhập tài khoản.
                  </p>
                  <p>
                    Vui lòng đăng nhập với tài khoản giáo viên/học viên đã xác thực hoặc chạy script <code>supabase_schema_migration.sql</code> trong Supabase SQL Editor.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={loadCourses}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-600/50 text-red-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Thử lại' : 'Retry'}</span>
            </button>

            {user?.role === 'teacher' && (
              <button
                onClick={handleSeedCurriculum}
                disabled={isSeeding}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSeeding ? 'Đang khởi tạo...' : 'Khởi tạo khóa học Basic Communication A1 vào Supabase'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STATE 3: EMPTY STATE */}
      {!loading && !errorMsg && courses.length === 0 && (
        <div className="p-12 text-center bg-slate-900 border border-dashed border-slate-700 rounded-2xl space-y-4">
          <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {lang === 'vi' ? 'Hiện Chưa Có Khóa Học Nào Trong Database Supabase' : 'No Courses Found in Supabase'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Bảng <code>public.courses</code> trong Supabase hiện chưa có dữ liệu. Hãy khởi tạo khóa học mẫu <strong>Basic Communication A1</strong> để bắt đầu học ngay!
            </p>
          </div>

          <button
            onClick={handleSeedCurriculum}
            disabled={isSeeding}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-colors shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSeeding ? 'Đang tải lên Supabase...' : 'Khởi Tạo Khóa Học "Basic Communication A1" Vào Supabase'}</span>
          </button>
        </div>
      )}

      {/* STATE 4: COURSES GRID */}
      {!loading && !errorMsg && courses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filtered.map((course) => {
            const isPremium = course.tier === 'Premium';
            const isLocked = isPremium && user?.membership_tier === 'free';

            return (
              <div
                key={course.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-bold bg-emerald-950 border border-emerald-800 text-emerald-400 uppercase text-[11px]">
                        {course.level || 'A1'}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-slate-300">
                        {course.category || 'Communication'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isPremium
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {course.tier || 'Free'}
                    </span>
                  </div>

                  {course.thumbnail_url && (
                    <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                      {course.description || 'Khóa học cung cấp hệ thống mẫu câu và lộ trình bài bản.'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Supabase ID: <span className="text-slate-300">{course.id.substring(0, 8)}...</span>
                  </span>

                  {isLocked ? (
                    <button
                      onClick={onOpenPricing}
                      className="px-4 py-2 text-xs font-semibold text-amber-300 bg-amber-950/70 border border-amber-800/70 rounded-lg flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{t.lockedLesson}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectCourse(course)}
                      className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Xem Bài Học</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !errorMsg && courses.length > 0 && filtered.length === 0 && (
        <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-xs text-slate-400">
          Không tìm thấy khóa học nào phù hợp với bộ lọc tìm kiếm.
        </div>
      )}
    </div>
  );
};
