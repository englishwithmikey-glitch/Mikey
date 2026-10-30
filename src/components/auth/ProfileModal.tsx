import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { X, User, Target, Award, Flame, Zap, Shield, Sparkles } from 'lucide-react';
import { CourseLevel } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPricing: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenPricing,
}) => {
  const { user, updateProfile } = useAuth();
  const { t, lang } = useLanguage();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [targetGoal, setTargetGoal] = useState(user?.target_goal || 'Conversational Fluency');
  const [currentLevel, setCurrentLevel] = useState<CourseLevel>(user?.current_level || 'Beginner');
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setTargetGoal(user.target_goal || 'Conversational Fluency');
      setCurrentLevel(user.current_level || 'Beginner');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      full_name: fullName,
      target_goal: targetGoal,
      current_level: currentLevel,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const levels: CourseLevel[] = ['Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl font-black">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{user.full_name}</h2>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  user.membership_tier === 'premium'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {user.membership_tier}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Stats card */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">{t.streakCount}</p>
              <p className="text-sm font-bold text-white font-mono tabular-nums">{user.streak_days} days</p>
            </div>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">{t.totalXp}</p>
              <p className="text-sm font-bold text-white font-mono tabular-nums">{user.xp_points} XP</p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">{t.fullNameLabel}</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              {lang === 'vi' ? 'Mục Tiêu Học Tập' : 'Learning Goal / Target'}
            </label>
            <input
              type="text"
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              placeholder="e.g. IELTS 7.0, TOEIC 800+, Daily Fluency"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              {lang === 'vi' ? 'Trình Độ Hiện Tại' : 'Current English Level'}
            </label>
            <select
              value={currentLevel}
              onChange={(e) => setCurrentLevel(e.target.value as CourseLevel)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
            >
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Membership tier info */}
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-xs font-semibold text-white">
                  {user.membership_tier === 'premium' ? 'Premium Active' : 'Free Explorer Tier'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {user.membership_tier === 'premium'
                    ? (lang === 'vi' ? 'Toàn bộ bài học mở khóa' : 'All courses unlocked')
                    : (lang === 'vi' ? 'Nâng cấp để học IELTS & TOEIC' : 'Upgrade for IELTS & TOEIC')}
                </p>
              </div>
            </div>
            {user.membership_tier === 'free' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPricing();
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px]"
              >
                {t.upgradeNow}
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              {lang === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-sm"
            >
              {savedSuccess ? (lang === 'vi' ? 'Đã lưu!' : 'Saved!') : (lang === 'vi' ? 'Lưu Thay Đổi' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
