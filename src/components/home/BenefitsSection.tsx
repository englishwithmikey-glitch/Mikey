import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Sparkles, Brain, Target, MessageSquare, Headphones, ShieldCheck } from 'lucide-react';

export const BenefitsSection: React.FC = () => {
  const { lang } = useLanguage();

  const benefits = [
    {
      icon: Headphones,
      title_en: 'Vietnamese Phonetic Calibration',
      title_vi: 'Chuẩn Hóa Âm Vị Cho Người Việt',
      desc_en: 'Direct remediation for dropping final consonants (/s/, /z/, /t/, /d/) and incorrect word stress.',
      desc_vi: 'Trị dứt điểm tật nuốt âm đuôi, nhấn sai trọng âm và nói chuyện thiếu ngữ điệu của người Việt.',
    },
    {
      icon: Brain,
      title_en: 'Anti-Literal Translation Mindset',
      title_vi: 'Xóa Bỏ Tư Duy Dịch Từng Từ (Word-by-word)',
      desc_en: 'Stop mentally translating from Vietnamese into English. Learn native collocations and natural phrase chunks.',
      desc_vi: 'Ngừng dịch thô trong đầu. Tiếp cận tiếng Anh qua các cụm từ (Collocations) người bản xứ thực sự sử dụng.',
    },
    {
      icon: Target,
      title_en: 'Targeted Exam Mastery (IELTS & TOEIC)',
      title_vi: 'Chiến Thuật Thi Cử Đã Được Kiểm Chứng',
      desc_en: 'Actionable templates for IELTS Speaking Part 3 and 15-second Part 5 TOEIC grammar recognition rules.',
      desc_vi: 'Bộ khung tư duy Speaking Part 3 ăn điểm và phương pháp giải nhanh Part 5 TOEIC dưới 15 giây/câu.',
    },
    {
      icon: MessageSquare,
      title_en: 'Practical Workplace Communication',
      title_vi: 'Giao Tiếp Văn Phòng & Đàm Phán Thực Tế',
      desc_en: 'Master tactful disagreement, diplomatic email correspondence, and confident international video calls.',
      desc_vi: 'Viết email công việc sắc bén, tranh luận văn minh và tự tin phát biểu trước sếp nước ngoài.',
    },
  ];

  return (
    <section className="py-20 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
            {lang === 'vi' ? 'VÌ SAO CHỌN ENGLISHWITHMIKEY' : 'THE LEARNING ADVANTAGE'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
            {lang === 'vi'
              ? 'Phương Pháp Học Được Tinh Chỉnh Cho Người Việt'
              : 'Engineered Specifically for How Vietnamese Minds Process English'}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3">
            {lang === 'vi'
              ? 'Không dạy lý thuyết suông. Mỗi bài học đều giải quyết trực diện một khó khăn điển hình khi học tiếng Anh tại Việt Nam.'
              : 'Zero academic filler. Every lesson directly dismantles a predictable friction point faced by Vietnamese learners.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 leading-snug">
                    {lang === 'vi' ? b.title_vi : b.title_en}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'vi' ? b.desc_vi : b.desc_en}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
