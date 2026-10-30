import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  User,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  LogOut,
  LogIn,
  Database,
} from 'lucide-react';

interface DemoSwitcherBannerProps {
  onOpenSupabaseConfig: () => void;
  onOpenAuth?: () => void;
}

export const DemoSwitcherBanner: React.FC<DemoSwitcherBannerProps> = ({
  onOpenSupabaseConfig,
  onOpenAuth,
}) => {
  const {
    user,
    switchDemoUser,
    isLiveSupabase,
    isSupabaseAuthenticated,
    dbQueryStatus,
    dbErrorCode,
    logout,
  } = useAuth();
  const { lang, toggleLanguage } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return (
      <button
        onClick={() => setIsDismissed(false)}
        className="fixed bottom-4 right-4 z-40 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg border border-slate-700 flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isLiveSupabase
              ? 'bg-emerald-400'
              : dbQueryStatus === 'permission_denied'
              ? 'bg-amber-400'
              : 'bg-red-400'
          }`}
        />
        <span>Supabase & Auth</span>
      </button>
    );
  }

  // Determine label and style for Supabase status pill
  let statusBadge = {
    colorClass: 'text-amber-400 border-amber-800/80 bg-amber-950/40',
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
    label: 'Supabase: Cần Đăng Nhập (42501)',
  };

  if (isLiveSupabase || dbQueryStatus === 'success') {
    statusBadge = {
      colorClass: 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      label: 'Supabase Live (200 OK)',
    };
  } else if (dbQueryStatus === 'permission_denied') {
    statusBadge = {
      colorClass: 'text-amber-400 border-amber-800/80 bg-amber-950/40',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
      label: 'Supabase: Cần Đăng Nhập (PostgreSQL 42501)',
    };
  } else if (dbQueryStatus === 'error') {
    statusBadge = {
      colorClass: 'text-red-400 border-red-800/80 bg-red-950/40',
      icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
      label: `Supabase: Lỗi [${dbErrorCode || 'ERR'}]`,
    };
  } else if (dbQueryStatus === 'disconnected') {
    statusBadge = {
      colorClass: 'text-slate-400 border-slate-800 bg-slate-950',
      icon: <Key className="w-3.5 h-3.5 text-slate-400" />,
      label: 'Supabase: Chưa Cấu Hình',
    };
  } else {
    statusBadge = {
      colorClass: 'text-slate-300 border-slate-800 bg-slate-950',
      icon: <Database className="w-3.5 h-3.5 text-slate-400" />,
      label: 'Supabase: Đang Kiểm Tra...',
    };
  }

  return (
    <div className="bg-slate-900 text-slate-200 text-xs border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3">
      {/* Left: Real Auth Status & Personas */}
      <div className="flex items-center gap-2 flex-wrap">
        {user && isSupabaseAuthenticated ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">
              {lang === 'vi' ? 'Đã đăng nhập:' : 'Signed in:'}
            </span>
            <span className="font-semibold text-white font-mono">{user.email}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 border border-emerald-800 text-emerald-300">
              {user.role === 'teacher' ? 'Giáo viên' : 'Học viên'}
            </span>
            <button
              onClick={() => logout()}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition-colors ml-1"
            >
              <LogOut className="w-3 h-3 text-red-400" />
              <span>{lang === 'vi' ? 'Đăng xuất' : 'Sign out'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-slate-400">
              {lang === 'vi' ? 'Trạng thái:' : 'Status:'}
            </span>
            <span className="font-semibold text-amber-300 font-mono">
              {lang === 'vi' ? 'Chưa đăng nhập (Role: anon)' : 'Unauthenticated (anon)'}
            </span>

            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1 transition-colors text-[11px]"
              >
                <Shield className="w-3 h-3" />
                <span>{lang === 'vi' ? 'Đăng Nhập Giáo Viên' : 'Teacher Sign In'}</span>
              </button>
            )}

            <button
              onClick={() => switchDemoUser('student-free')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 text-[11px] ${
                user?.role === 'student' && !isSupabaseAuthenticated
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <User className="w-3 h-3" />
              <span>{lang === 'vi' ? 'Khách (Học thử)' : 'Guest Student'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Supabase Real Status & Diagnostic Trigger & Language */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSupabaseConfig}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all hover:brightness-110 ${statusBadge.colorClass}`}
          title={lang === 'vi' ? 'Bấm để xem chẩn đoán Supabase & SQL migration' : 'Click for Supabase diagnostics'}
        >
          {statusBadge.icon}
          <span>{statusBadge.label}</span>
        </button>

        <span className="text-slate-600">·</span>

        <button
          onClick={toggleLanguage}
          className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors font-semibold uppercase tracking-wider text-[11px]"
        >
          {lang === 'vi' ? '🇻🇳 Tiếng Việt' : '🇺🇸 English'}
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-500 hover:text-slate-300 px-1"
          title="Hide banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
