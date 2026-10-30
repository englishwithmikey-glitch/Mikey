import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Sparkles, CheckCircle2, Volume2, Award, Users, BookOpen } from 'lucide-react';

interface HeroSectionProps {
  onStartFree: () => void;
  onExploreCourses: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartFree,
  onExploreCourses,
}) => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-12 pb-20 border-b border-slate-800">
      {/* Subtle background ambient mesh */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-600/30 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-blue-600/20 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline and Call-to-actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-3.5 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                {lang === 'vi'
                  ? 'Phương pháp học tiếng Anh chuyên biệt cho người Việt'
                  : 'Tailored English Curriculum for Vietnamese Speakers'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] text-balance">
              {lang === 'vi' ? (
                <>
                  Tự Tin Chinh Phục{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                    Tiếng Anh Thực Chiến
                  </span>
                </>
              ) : (
                <>
                  Learn English with{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                    Real Confidence
                  </span>
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {t.subTagline}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onStartFree}
                className="w-full sm:w-auto px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm"
              >
                <span>{user ? t.continueLearning : t.startFree}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreCourses}
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-800/80 hover:bg-slate-700/80 text-white font-semibold rounded-xl border border-slate-700 transition-colors text-sm"
              >
                {t.exploreCourses}
              </button>
            </div>

            {/* Trust bullet features */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'vi' ? 'Không bắt buộc thẻ tín dụng' : 'No credit card required'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'vi' ? 'Bài học phát âm & bài tập miễn phí' : 'Free foundational pronunciation'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'vi' ? 'Lộ trình IELTS & TOEIC chuẩn' : 'IELTS & TOEIC ready'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Interactive Showcase Card (Anti-Slop Zero-Broken-Image) */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md bg-slate-800/90 rounded-2xl border border-slate-700/70 p-6 shadow-2xl backdrop-blur-sm">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                    M
                  </div>
                  <div>
                    <p className="font-semibold text-white">Teacher Mikey's Studio</p>
                    <p className="text-[11px] text-slate-400">Pronunciation Lab</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                  {lang === 'vi' ? 'Trọng Tâm' : 'Focus'}
                </span>
              </div>

              {/* Pronunciation Visualizer Box */}
              <div className="my-5 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {lang === 'vi' ? 'Khắc phục âm đuôi /s/ vs /z/' : 'Ending Sound Precision'}
                  </span>
                  <span className="text-emerald-400 font-mono text-xs font-semibold">100% Match</span>
                </div>

                <div className="flex items-baseline justify-between text-lg font-bold text-white tracking-wide">
                  <span>He work<span className="text-emerald-400 underline decoration-2">s</span> hard</span>
                  <span className="text-xs font-normal text-slate-400 font-mono">/wɜːks/</span>
                </div>

                {/* Simulated Audio Spectrum Wave */}
                <div className="h-8 flex items-center justify-between gap-1 px-1 bg-slate-950/60 rounded-lg">
                  {[40, 70, 90, 60, 85, 100, 75, 45, 80, 95, 65, 50, 70, 85, 40].map((h, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${h}%` }}
                      className="w-1.5 bg-gradient-to-t from-emerald-600 to-teal-400 rounded-full"
                    />
                  ))}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>{lang === 'vi' ? 'Ngữ điệu tự nhiên' : 'Natural cadence & tone'}</span>
                  <span className="text-slate-300 font-semibold">{lang === 'vi' ? 'Âm gió chuẩn' : 'Voiceless /s/'}</span>
                </div>
              </div>

              {/* Student Achievement Snippet */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                  9.0
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {lang === 'vi' ? 'Đánh Giá Từ Học Viên' : 'Learner Benchmark'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {lang === 'vi'
                      ? '"Sau 3 tuần học với thầy Mikey, mình không còn sợ nói sai âm đuôi trong cuộc họp nữa."'
                      : '"Clear frameworks that specifically address Vietnamese linguistic habits."'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-Metric Strip below hero split (Mandatory Layout Rule 13) */}
        <div className="mt-16 pt-10 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl font-extrabold text-white font-mono tabular-nums">14,200+</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{t.statLearners}</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">94.8%</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{t.statPassRate}</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-white font-mono tabular-nums">4</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{lang === 'vi' ? 'Lộ Trình Toàn Diện' : 'Core Disciplines'}</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-amber-400 font-mono tabular-nums">4.9 / 5.0</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{t.statRating}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
