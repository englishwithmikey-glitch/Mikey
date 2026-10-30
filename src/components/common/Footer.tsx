import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface FooterProps {
  setActiveTab: (tab: string) => void;
  onOpenPricing: () => void;
  onOpenSupabaseConfig: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  setActiveTab,
  onOpenPricing,
  onOpenSupabaseConfig,
}) => {
  const { t, lang } = useLanguage();

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-extrabold text-sm">
                M
              </span>
              <span className="text-base font-bold text-white tracking-tight">EnglishwithMikey</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'vi'
                ? 'Nền tảng đào tạo tiếng Anh trực tuyến chuẩn quốc tế dành riêng cho người học Việt Nam.'
                : 'Premier online English learning platform tailored specifically for Vietnamese learners.'}
            </p>
          </div>

          {/* Core Curriculum */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              {t.navCourses}
            </p>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t.catGeneral}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t.catCommunication}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t.catIelts}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t.catToeic}
                </button>
              </li>
            </ul>
          </div>

          {/* Interactive Learning */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              {lang === 'vi' ? 'Học Tập & Luyện Đề' : 'Study & Practice'}
            </p>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button
                  onClick={() => setActiveTab('practice')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t.navPractice}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('aitutor')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t.navAiTutor} ({t.comingSoon})
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenPricing}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {t.navPricing}
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenSupabaseConfig}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {lang === 'vi' ? 'Kết Nối Supabase' : 'Supabase Integration'}
                </button>
              </li>
            </ul>
          </div>

          {/* Target Audience & Standards */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              {lang === 'vi' ? 'Cam Kết Chất Lượng' : 'Quality Standards'}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'vi'
                ? 'Giáo trình chuẩn hóa theo khung tham chiếu CEFR & Cambridge English, hỗ trợ phát âm và phản xạ tự nhiên.'
                : 'Curriculum structured according to CEFR & Cambridge benchmarks for lasting communicative fluency.'}
            </p>
            <p className="text-[11px] text-emerald-400 font-semibold pt-1">
              {lang === 'vi' ? 'Hỗ trợ: englishwithmikey@gmail.com' : 'Support: englishwithmikey@gmail.com'}
            </p>
          </div>
        </div>

        {/* Quiet copyright */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} EnglishwithMikey. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>{lang === 'vi' ? 'Bảo mật thông tin' : 'Privacy Policy'}</span>
            <span>·</span>
            <span>{lang === 'vi' ? 'Điều khoản học viên' : 'Terms of Service'}</span>
            <span>·</span>
            <button
              onClick={onOpenSupabaseConfig}
              className="text-slate-400 hover:text-emerald-400"
            >
              Supabase Status
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
