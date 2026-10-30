import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (role: UserRole) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
}) => {
  const { login, register, resetPassword, isLiveSupabase } = useAuth();
  const { t, lang } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res.success) {
          setSuccessMsg(
            lang === 'vi'
              ? `Đăng nhập thành công với vai trò: ${res.role === 'teacher' ? 'Giáo viên' : 'Học viên'}!`
              : `Logged in successfully as ${res.role === 'teacher' ? 'Teacher' : 'Student'}!`
          );
          setTimeout(() => {
            if (onLoginSuccess && res.role) {
              onLoginSuccess(res.role);
            } else {
              onClose();
            }
          }, 600);
        } else {
          setErrorMsg(res.error || (lang === 'vi' ? 'Đăng nhập không thành công.' : 'Login failed.'));
        }
      } else if (mode === 'register') {
        if (!fullName.trim()) {
          setErrorMsg(lang === 'vi' ? 'Vui lòng nhập họ và tên.' : 'Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        const res = await register(email, password, fullName);
        if (res.success && res.requiresEmailConfirmation) {
          setSuccessMsg(lang === 'vi'
            ? 'Vui lòng kiểm tra email và xác nhận tài khoản trước khi đăng nhập.'
            : 'Please check your email and confirm your account before signing in.');
        } else if (res.success) {
          setSuccessMsg(
            lang === 'vi'
              ? 'Tài khoản đã tạo thành công qua Supabase Auth! Đang chuyển hướng...'
              : 'Account created successfully via Supabase Auth!'
          );
          setTimeout(() => {
            if (onLoginSuccess && res.role) {
              onLoginSuccess(res.role);
            } else {
              onClose();
            }
          }, 800);
        } else {
          setErrorMsg(res.error || (lang === 'vi' ? 'Đăng ký không thành công.' : 'Registration failed.'));
        }
      } else if (mode === 'forgot') {
        const res = await resetPassword(email);
        if (res.success) setSuccessMsg(res.message);
        else setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFillTeacher = () => {
    setEmail('englishwithmikey@gmail.com');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xl mx-auto mb-3 shadow-md">
            M
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {mode === 'login' && t.loginTitle}
            {mode === 'register' && t.registerTitle}
            {mode === 'forgot' && (lang === 'vi' ? 'Đặt Lại Mật Khẩu' : 'Reset Your Password')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isLiveSupabase
              ? (lang === 'vi' ? 'Xác thực Supabase Authentication & RLS profiles' : 'Secured via Supabase Auth & RLS profiles')
              : (lang === 'vi' ? 'Đăng nhập bằng tài khoản đã đăng ký' : 'Sign in with your registered account')}
          </p>
        </div>

        {/* Tab switch */}
        {mode !== 'forgot' && (
          <div className="flex bg-slate-800 p-1 rounded-lg mb-5 text-xs font-semibold">
            <button
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 rounded-md transition-colors ${
                mode === 'login' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.signIn}
            </button>
            <button
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 rounded-md transition-colors ${
                mode === 'register' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.signUp}
            </button>
          </div>
        )}

        {/* Feedback messages */}
        {errorMsg && (
          <div role="alert" className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">{errorMsg}</span>
              {errorMsg.toLowerCase().includes('invalid login credentials') && (
                <span className="text-[11px] text-red-300 block">
                  {lang === 'vi'
                    ? 'Gợi ý: Kiểm tra lại địa chỉ email và mật khẩu tài khoản giáo viên/học viên đã đăng ký trên Supabase.'
                    : 'Check your email and password registered on Supabase.'}
                </span>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div role="status" className="mb-4 p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'register' && (
            <div>
              <label className="block text-slate-300 font-medium mb-1">{t.fullNameLabel}</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={lang === 'vi' ? 'Nguyễn Văn A' : 'Nguyen Van A'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium">{t.emailLabel}</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleQuickFillTeacher}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>{lang === 'vi' ? 'Điền email giáo viên' : 'Fill teacher email'}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="englishwithmikey@gmail.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">{t.passwordLabel}</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-emerald-400 hover:underline text-[11px]"
                  >
                    {t.forgotPassword}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-10 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Role enforcement notice for registration */}
          {mode === 'register' && (
            <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700 text-[11px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {lang === 'vi'
                  ? 'Mặc định đăng ký với vai trò Học viên (Student). Quyền Giáo viên (Teacher) được quản lý tập trung và học viên không thể tự cấp quyền giáo viên.'
                  : 'New registrations default strictly to Student role. Teacher privileges are granted exclusively by system administrators.'}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 text-xs mt-2"
          >
            {isSubmitting
              ? (lang === 'vi' ? 'Đang xác thực Supabase...' : 'Authenticating with Supabase...')
              : mode === 'login'
              ? t.signIn
              : mode === 'register'
              ? t.signUp
              : (lang === 'vi' ? 'Gửi Liên Kết Đặt Lại' : 'Send Reset Link')}
          </button>
        </form>

        {/* Back to login if in forgot mode */}
        {mode === 'forgot' && (
          <div className="text-center mt-4">
            <button
              onClick={() => setMode('login')}
              className="text-xs text-slate-400 hover:text-white underline underline-offset-2"
            >
              {lang === 'vi' ? 'Quay lại đăng nhập' : 'Back to Sign In'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
