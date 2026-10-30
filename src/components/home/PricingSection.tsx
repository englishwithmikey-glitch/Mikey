import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Check, Sparkles, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PricingSectionProps {
  onStartFree: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onStartFree }) => {
  const { t, lang } = useLanguage();
  const { user, upgradeToPremium } = useAuth();
  const [upgradedNotice, setUpgradedNotice] = useState(false);

  const handleUpgradeClick = () => {
    upgradeToPremium();
    setUpgradedNotice(true);
    setTimeout(() => {
      setUpgradedNotice(false);
    }, 4000);
  };

  return (
    <section id="pricing" className="py-20 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
            {lang === 'vi' ? 'BẢNG GIÁ HỌC PHÍ' : 'MEMBERSHIP TIERS'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {lang === 'vi' ? 'Lựa Chọn Gói Học Phù Hợp' : 'Transparent, Flexible Learning Plans'}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2">
            {lang === 'vi'
              ? 'Bắt đầu học miễn phí ngay hôm nay. Nâng cấp bất cứ khi nào bạn sẵn sàng bứt phá.'
              : 'Begin learning free of charge. Upgrade when you are ready to master IELTS, TOEIC, and executive communication.'}
          </p>
        </div>

        {/* Upgrade Success Notification */}
        {upgradedNotice && (
          <div className="max-w-md mx-auto mb-8 p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-start gap-3 shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">
                {lang === 'vi' ? 'Tài khoản đã nâng cấp thành Premium!' : 'Account upgraded to Premium!'}
              </p>
              <p className="text-[11px] mt-1 text-emerald-300">
                {lang === 'vi'
                  ? 'Toàn bộ bài học IELTS, TOEIC và Giao Tiếp Chuyên Sâu hiện đã được mở khóa.'
                  : 'All advanced courses, IELTS, and TOEIC modules are now unlocked.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* FREE PLAN */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{t.freeTierTitle}</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {lang === 'vi' ? 'Miễn Phí Mãi Mãi' : 'Always Free'}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-extrabold text-white font-mono tabular-nums">0đ</span>
                <span className="text-xs text-slate-400 ml-2">{lang === 'vi' ? '/ trọn đời' : '/ lifetime'}</span>
              </div>

              <p className="text-xs text-slate-400 mb-6">{t.freeTierDesc}</p>

              <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
                {t.freeFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={onStartFree}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors text-xs"
              >
                {user ? (user.membership_tier === 'free' ? t.currentPlan : t.freeTierTitle) : t.startFree}
              </button>
            </div>
          </div>

          {/* PREMIUM PLAN */}
          <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/80 p-8 flex flex-col justify-between shadow-xl shadow-emerald-950/40">
            {/* Top highlight kicker */}
            <div className="absolute -top-3.5 right-6 bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{lang === 'vi' ? 'Khuyên Dùng' : 'Recommended'}</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{t.premiumTierTitle}</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
                  199.000đ
                </span>
                <span className="text-xs text-slate-400 ml-2">{lang === 'vi' ? '/ tháng' : '/ month'}</span>
              </div>

              <p className="text-xs text-slate-400 mb-6">{t.premiumTierDesc}</p>

              <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
                {t.premiumFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-200 font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 space-y-3">
              {user?.membership_tier === 'premium' ? (
                <div className="w-full py-3 px-4 bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold rounded-xl text-center text-xs">
                  {lang === 'vi' ? '✓ Gói Đang Hoạt Động (Premium)' : '✓ Current Active Plan (Premium)'}
                </div>
              ) : (
                <button
                  onClick={handleUpgradeClick}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-md text-xs"
                >
                  {t.upgradeNow}
                </button>
              )}

              <p className="text-[10px] text-slate-500 text-center">
                {lang === 'vi'
                  ? '* Cổng thanh toán chính thức đang kết nối với Supabase backend. Trong giai đoạn trải nghiệm này, bạn có thể kích hoạt ngay lập tức.'
                  : '* Payment processing is integrated via backend webhooks in production. Simulator active.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
