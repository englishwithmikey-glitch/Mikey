import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Course, CourseCategory } from '../../types';
import { BookOpen, Clock, Users, Star, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface CategorySectionProps {
  onSelectCourse: (course: Course) => void;
  onOpenPricing: () => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  onSelectCourse,
  onOpenPricing,
}) => {
  const { courses, user, isLessonCompleted } = useAuth();
  const { t, lang } = useLanguage();
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const categories = [
    { id: 'all', label: t.catAll },
    { id: 'general', label: t.catGeneral },
    { id: 'communication', label: t.catCommunication },
    { id: 'ielts', label: t.catIelts },
    { id: 'toeic', label: t.catToeic },
  ];

  const filteredCourses =
    selectedCat === 'all' ? courses : courses.filter((c) => c.category === selectedCat);

  return (
    <section className="py-20 bg-slate-950 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
            {lang === 'vi' ? 'CHƯƠNG TRÌNH ĐÀO TẠO' : 'CURRICULUM ARCHITECTURE'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {lang === 'vi' ? '4 Lộ Trình Học Chuẩn Quốc Tế' : 'Four Core Learning Categories'}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2">
            {lang === 'vi'
              ? 'Thiết kế bài bản từ phát âm căn bản đến kỹ năng đàm phán và chứng chỉ quốc tế.'
              : 'Designed sequentially from foundational pronunciation to professional diplomacy and certified exams.'}
          </p>
        </div>

        {/* Interactive Segmented Filter Tabs (Rule 1.A: Functional buttons) */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl mb-10 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                selectedCat === cat.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {filteredCourses.map((course) => {
            const isPremium = course.tier === 'premium';
            const isLocked = isPremium && user?.membership_tier === 'free';
            const lessonsList = course.lessons || [];
            const completedCount = lessonsList.filter((l) =>
              isLessonCompleted(course.id, l.id)
            ).length;
            const totalLessonCount = course.lesson_count || lessonsList.length || 1;
            const progressPercent = Math.round((completedCount / totalLessonCount) * 100);

            const objectivesList = (lang === 'vi' ? course.objectives_vi : course.objectives_en) || course.objectives_vi || course.objectives_en || [];

            return (
              <div
                key={course.id}
                className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all duration-200 hover:border-slate-700 hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  {/* Unboxed Metadata Header (Rule 1.A & Zero-Pill Discipline) */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-emerald-400">
                        {course.category.toUpperCase()}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{course.level}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{course.duration_hours}h</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isPremium ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {course.tier === 'free' ? t.freeBadge : t.premiumBadge}
                    </span>
                  </div>

                  {/* Course Title */}
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                    {lang === 'vi' ? course.title_vi : course.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {lang === 'vi' ? course.description_vi : course.description}
                  </p>

                  {/* Objectives summary preview */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-300">
                      {lang === 'vi' ? 'Điểm nổi bật của khóa học:' : 'Key Learning Outcomes:'}
                    </p>
                    {objectivesList
                      .slice(0, 2)
                      .map((obj, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{obj}</span>
                        </div>
                      ))}
                  </div>

                  {/* Progress bar if student has completed lessons */}
                  {user && completedCount > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>{lang === 'vi' ? 'Tiến độ hoàn thành' : 'Progress'}</span>
                        <span className="font-mono tabular-nums text-emerald-400">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Row */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono tabular-nums">{course.enrolled_count}</span>
                    <span>{lang === 'vi' ? 'học viên' : 'learners'}</span>
                  </div>

                  {isLocked ? (
                    <button
                      onClick={onOpenPricing}
                      className="px-4 py-2 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{t.lockedLesson}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectCourse(course)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-emerald-600 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <span>{user ? t.startLesson : t.viewCurriculum}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
