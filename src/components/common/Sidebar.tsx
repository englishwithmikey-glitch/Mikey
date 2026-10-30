import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  BookOpen,
  Library,
  Dumbbell,
  Bot,
  Shield,
  CreditCard,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenProfile: () => void;
  onOpenPricing: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  onOpenProfile,
  onOpenPricing,
}) => {
  const { user, logout } = useAuth();
  const { t, lang } = useLanguage();

  if (!user) return null;

  const isTeacher = user.role === 'teacher';

  const menuItems = [
    {
      id: 'dashboard',
      label: t.navDashboard,
      icon: LayoutDashboard,
    },
    {
      id: 'courses',
      label: t.navCourses,
      icon: Library,
    },
    {
      id: 'practice',
      label: t.navPractice,
      icon: Dumbbell,
    },
    {
      id: 'aitutor',
      label: `${t.navAiTutor} (${t.comingSoon})`,
      icon: Bot,
      highlight: true,
    },
  ];

  if (isTeacher) {
    menuItems.push({
      id: 'teacher',
      label: t.navTeacher,
      icon: Shield,
    });
  }

  return (
    <aside
      className={`fixed top-16 bottom-0 left-0 z-20 bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 flex flex-col justify-between ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top area: User summary & nav items */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {/* User mini status */}
        {!isCollapsed ? (
          <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-800 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                {user.full_name}
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  user.membership_tier === 'premium'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {user.membership_tier}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1 text-amber-400">
                <Flame className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">{user.streak_days}d</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">{user.xp_points} XP</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-2">
            <div
              className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 text-xs font-bold"
              title={`${user.full_name} (${user.membership_tier})`}
            >
              {user.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Main navigation links */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
                title={item.label}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Membership Upgrade CTA if free */}
        {user.membership_tier === 'free' && (
          <div className="pt-2">
            {!isCollapsed ? (
              <div className="p-3 rounded-lg bg-gradient-to-br from-slate-800 to-emerald-950 border border-emerald-900/40 text-xs">
                <p className="font-semibold text-emerald-300">
                  {lang === 'vi' ? 'Nâng cấp Premium' : 'Unlock All Courses'}
                </p>
                <p className="text-slate-400 text-[11px] mt-1">
                  {lang === 'vi' ? 'Mở khóa IELTS & TOEIC 750+' : 'Access full IELTS & TOEIC tracks'}
                </p>
                <button
                  onClick={onOpenPricing}
                  className="mt-2.5 w-full py-1.5 px-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition-colors"
                >
                  {t.upgradeNow}
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenPricing}
                className="w-full py-2.5 flex justify-center text-amber-400 hover:text-amber-300"
                title={t.upgradeNow}
              >
                <CreditCard className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom utility footer */}
      <div className="p-2 border-t border-slate-800 space-y-1">
        <button
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={t.navProfile}
        >
          <User className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>{t.navProfile}</span>}
        </button>

        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors"
          title={t.signOut}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>{t.signOut}</span>}
        </button>

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center py-2 text-slate-500 hover:text-slate-300 transition-colors text-xs"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
