import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Award, BookOpen, HeartHandshake, CheckCircle } from 'lucide-react';

export const TeacherIntroSection: React.FC = () => {
  const { lang } = useLanguage();

  return (
    <section className="py-20 bg-slate-950 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Teacher Portrait & Visual Anchor */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-sm">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-3xl blur-xl opacity-20" />
              <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center space-y-4">
                <div className="w-28 h-28 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-4xl font-extrabold shadow-lg">
                  M
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">Teacher Mikey</h3>
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                    {lang === 'vi' ? 'Sáng Lập Viên & Giảng Viên Chính' : 'Founder & Lead Instructor'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>8.5 IELTS Academic Certified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>10+ Years Coaching Vietnamese Professionals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>TESOL & Cambridge CELTA Certified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Personal Message & Philosophy */}
          <div className="lg:col-span-7 space-y-6">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              {lang === 'vi' ? 'LỜI NHẮN TỪ THẦY MIKEY' : 'MESSAGE FROM TEACHER MIKEY'}
            </p>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {lang === 'vi'
                ? '"Bạn không thiếu năng khiếu, bạn chỉ thiếu một phương pháp đúng đắn."'
                : '"You do not lack talent. You have simply been taught with the wrong methods."'}
            </h2>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>
                {lang === 'vi'
                  ? 'Trong hơn 10 năm đồng hành cùng hàng nghìn học viên tại Việt Nam, tôi nhận thấy rào cản lớn nhất không phải là từ vựng khó hay ngữ pháp cao siêu, mà là nỗi sợ phát âm sai và thói quen dịch thô từng từ trong đầu.'
                  : 'Over a decade coaching ambitious Vietnamese learners in Ho Chi Minh City and Hanoi, I discovered the biggest obstacle is rarely vocabulary or grammar rules—it is the fear of being misunderstood and the mental habit of word-by-word translation.'}
              </p>
              <p>
                {lang === 'vi'
                  ? 'Tại EnglishwithMikey, chúng tôi đơn giản hóa lộ trình: tập trung rèn khẩu hình âm đuôi, phản xạ câu hoàn chỉnh và ứng dụng ngay vào công việc thực tế. Bạn sẽ thấy mình tiến bộ rõ rệt chỉ sau từng bài học.'
                  : 'At EnglishwithMikey, we streamline the journey: mastering ending phonemes, developing reflex phrasing, and immediately applying skills to corporate meetings and exam rubrics.'}
              </p>
            </div>

            <div className="pt-2 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                <HeartHandshake className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-medium text-slate-300">
                  {lang === 'vi' ? 'Cam kết đồng hành và phản hồi tận tâm' : 'Dedicated support & rigorous practice'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
