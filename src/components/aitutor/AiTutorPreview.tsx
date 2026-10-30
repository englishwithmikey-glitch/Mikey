import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Bot,
  Mic,
  Sparkles,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bell,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

export const AiTutorPreview: React.FC = () => {
  const { t, lang } = useLanguage();
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeFeature, setActiveFeature] = useState<'speaking' | 'grammar' | 'writing' | 'vocab'>('speaking');

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (waitlistEmail.trim()) {
      setIsSubscribed(true);
    }
  };

  const features = [
    {
      id: 'speaking' as const,
      icon: Mic,
      title: t.speakingPractice,
      desc: t.speakingDesc,
      previewTitle: lang === 'vi' ? 'Mô Phỏng Phân Tích Phát Âm Theo Thời Gian Thực' : 'Real-time Phoneme Waveform Analysis',
      mockData: {
        score: '88/100',
        detail: lang === 'vi' ? 'Âm /s/ và /t/ rất tốt. Lưu ý nhấn trọng âm rơi vào âm tiết thứ 2 trong từ "important".' : 'Great /s/ ending sound. Focus stress on second syllable for "important".',
      },
    },
    {
      id: 'grammar' as const,
      icon: MessageSquare,
      title: t.grammarCorrection,
      desc: t.grammarDesc,
      previewTitle: lang === 'vi' ? 'Bác Sĩ Ngữ Pháp & So Sánh Tư Duy Trực Dịch' : 'Grammar Doctor & Direct Translation Fix',
      mockData: {
        score: 'Band 7.0',
        detail: lang === 'vi' ? 'Tránh lỗi "I very like it". Dạng diễn đạt tự nhiên chuẩn bản xứ là "I really like it" hoặc "I enjoy it immensely".' : 'Direct translation corrected: replace "I very like it" with "I really enjoy it".',
      },
    },
    {
      id: 'writing' as const,
      icon: FileText,
      title: t.writingFeedback,
      desc: t.writingDesc,
      previewTitle: lang === 'vi' ? 'Chấm Điểm Bài Viết IELTS Task 2 Theo 4 Tiêu Chí' : 'IELTS Task 2 Band Scoring Engine',
      mockData: {
        score: 'Est. 6.5',
        detail: lang === 'vi' ? 'Task Achievement: 7.0 · Cohesion: 6.5 · Lexical: 6.5 · Grammar Range: 6.0' : 'TR: 7.0 · CC: 6.5 · LR: 6.5 · GRA: 6.0',
      },
    },
    {
      id: 'vocab' as const,
      icon: Sparkles,
      title: lang === 'vi' ? 'Gợi Ý Từ Vựng Cá Nhân Hóa (Spaced Repetition)' : 'Smart Vocabulary Recommender',
      desc: lang === 'vi' ? 'Thuật toán lặp lại ngắt quãng tự động gợi ý từ vựng bạn hay quên.' : 'Algorithmic spaced repetition prioritizing words you frequently hesitate on.',
      previewTitle: lang === 'vi' ? 'Thuật Toán Ghi Nhớ Dài Hạn' : 'Cognitive Recall Scheduler',
      mockData: {
        score: '12 Words Due',
        detail: lang === 'vi' ? '3 từ thuộc chủ đề Workplace, 5 từ IELTS Academic Collocations.' : 'Scheduled review for 12 essential collocations.',
      },
    },
  ];

  const currentFeature = features.find((f) => f.id === activeFeature) || features[0];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-white">
      {/* Kicker & Title */}
      <div className="max-w-3xl mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-3 py-1 rounded-full mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>{t.comingSoon} · Q1 2027</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          {t.aiTutorTitle}
        </h1>
        <p className="text-sm sm:text-base text-slate-300 mt-2">
          {t.aiTutorSubtitle}
        </p>
      </div>

      {/* Feature Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
        {features.map((f) => {
          const Icon = f.icon;
          const isActive = activeFeature === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id)}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900 border-emerald-500 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-900/60">
                  {t.comingSoon}
                </span>
              </div>
              <h3 className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {f.title}
              </h3>
            </button>
          );
        })}
      </div>

      {/* Interactive Mock Sandbox for Selected Feature */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-12">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{currentFeature.previewTitle}</h2>
              <p className="text-xs text-slate-400">{currentFeature.desc}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg">
            {lang === 'vi' ? 'Bản Xem Trước Giao Diện' : 'Interface Sandbox Preview'}
          </span>
        </div>

        {/* Feature Mock Interactive Stage */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">Input Sample: "I want to improve my speaking accent."</span>
            <span className="text-emerald-400 font-bold font-mono">{currentFeature.mockData.score}</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed">
            <p className="text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Phản hồi từ Thầy Mikey AI:' : 'Mikey AI Diagnostic Feedback:'}</span>
            </p>
            <p>{currentFeature.mockData.detail}</p>
          </div>
        </div>

        {/* Early Access Waitlist Form */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>{t.joinWaitlist}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'vi'
                ? 'Học viên Premium sẽ được trải nghiệm sớm phiên bản Alpha hoàn toàn miễn phí.'
                : 'Premium members receive automatic first-priority invite to closed Alpha.'}
            </p>

            {isSubscribed ? (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t.waitlistSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="flex gap-2 max-w-md mx-auto">
                <input
                  type="email"
                  required
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors whitespace-nowrap shadow-sm"
                >
                  {lang === 'vi' ? 'Đăng Ký Chờ' : 'Notify Me'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
