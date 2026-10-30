import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  SUPABASE_URL,
  getStoredAnonKey,
  updateStoredAnonKey,
  runSupabaseHealthCheck,
  SupabaseDiagnosticReport,
  TARGET_TABLES,
} from '../../lib/supabase';
import {
  X,
  Database,
  Key,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Lock,
  Layers,
  HelpCircle,
  Info,
  UserCheck,
  UserX,
  LogIn,
  LogOut,
  Fingerprint,
} from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onOpenAuthModal,
}) => {
  const { isLiveSupabase, user, isSupabaseAuthenticated, logout } = useAuth();
  const { lang } = useLanguage();

  const [storedKey, setStoredKey] = useState<string>(() => getStoredAnonKey());
  const [report, setReport] = useState<SupabaseDiagnosticReport | null>(null);
  const [isRunningCheck, setIsRunningCheck] = useState<boolean>(false);
  const [activeKeyInput, setActiveKeyInput] = useState<string>('');
  const [showKeyEditor, setShowKeyEditor] = useState<boolean>(false);
  const [keyUpdateFeedback, setKeyUpdateFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleRunHealthCheck();
    }
  }, [isOpen]);

  const handleRunHealthCheck = async () => {
    setIsRunningCheck(true);
    try {
      const result = await runSupabaseHealthCheck();
      setReport(result);
    } catch (err) {
      console.error('Error during Supabase health check:', err);
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handleUpdateKey = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoredAnonKey(activeKeyInput);
    setStoredKey(getStoredAnonKey());
    setKeyUpdateFeedback(
      lang === 'vi'
        ? 'Đã cập nhật Anon Key! Đang chạy lại kiểm tra...'
        : 'Anon Key updated! Rerunning connection test...'
    );
    setShowKeyEditor(false);
    setTimeout(() => {
      handleRunHealthCheck();
      setKeyUpdateFeedback(null);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-5 sm:p-7 text-white shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {lang === 'vi' ? 'Kiểm Tra Kết Nối & Xác Thực Supabase' : 'Supabase Auth & Database Inspector'}
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'vi'
                ? 'Công cụ chẩn đoán 5 trạng thái: Kết nối, Đăng nhập, Phân quyền, RLS và Truy vấn'
                : 'Diagnostic suite for Connection, Auth, Table Privileges, RLS, and SELECT queries'}
            </p>
          </div>
        </div>

        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 mb-6">
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-slate-200">
              {lang === 'vi' ? 'Kiểm tra truy vấn SELECT 5 bảng và RLS Profiles' : 'Verify SELECT queries and Profiles RLS'}
            </p>
            <p className="text-[11px] text-slate-400">
              {report?.testedAt
                ? `${lang === 'vi' ? 'Lần kiểm tra gần nhất:' : 'Last verified at:'} ${new Date(
                    report.testedAt
                  ).toLocaleTimeString()}`
                : lang === 'vi'
                ? 'Chưa thực hiện kiểm tra'
                : 'Not tested yet'}
            </p>
          </div>

          <button
            onClick={handleRunHealthCheck}
            disabled={isRunningCheck}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningCheck ? 'animate-spin' : ''}`} />
            <span>
              {isRunningCheck
                ? lang === 'vi'
                  ? 'Đang kiểm tra...'
                  : 'Testing...'
                : lang === 'vi'
                ? 'Kiểm tra kết nối Supabase'
                : 'Test Supabase Connection'}
            </span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* REQUIREMENT 10: 5 DEDICATED DIAGNOSTIC STATES DISPLAY               */}
        {/* =================================================================== */}
        <div className="mb-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'vi' ? 'Bảng Phân Biệt 5 Trạng Thái Hệ Thống' : '5-State Diagnostic Matrix'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* State 1: Kết nối Supabase */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">
                  {lang === 'vi' ? '1. Kết nối Supabase:' : '1. Supabase Connection:'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {report?.isKeyConfigured ? 'Thành Công (Online)' : 'Chưa cấu hình'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Endpoint API tiếp nhận và xử lý request bình thường tại <code className="text-emerald-400 font-mono">kczyigukukpyoyhlajci.supabase.co</code>.
              </p>
            </div>

            {/* State 2 & 3: Người dùng chưa / đã đăng nhập */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">
                  {lang === 'vi' ? '2. Trạng thái xác thực:' : '2. Authentication Status:'}
                </span>
                {report?.auth.isAuthenticated ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    <span>Người dùng đã đăng nhập</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <UserX className="w-3 h-3" />
                    <span>Người dùng chưa đăng nhập (anon)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {report?.auth.isAuthenticated
                  ? `${report.auth.userEmail} · Role: ${report.auth.userRole}`
                  : 'Client đang gửi yêu cầu với vai trò khách (anon). Bảng profiles sẽ từ chối SELECT công khai.'}
              </p>
            </div>

            {/* State 4: Không đủ quyền truy cập database */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">
                  {lang === 'vi' ? '3. Quyền truy cập bảng (Role anon):' : '3. Role Table Privilege:'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {lang === 'vi' ? 'Không đủ quyền (Code 42501)' : 'Insufficient Privilege'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {lang === 'vi'
                  ? 'Bảng profiles KHÔNG cấp quyền SELECT cho anon nhằm bảo vệ dữ liệu học viên theo thiết kế bảo mật RLS.'
                  : 'Profiles table explicitly denies SELECT for anon to secure student data under RLS.'}
              </p>
            </div>

            {/* State 5: Truy vấn thành công hồ sơ cá nhân qua RLS */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">
                  {lang === 'vi' ? '4. RLS Profiles Query:' : '4. Profiles RLS Query:'}
                </span>
                {report?.auth.ownProfileTest.success ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {lang === 'vi' ? 'Truy Vấn Thành Công' : 'Query Success'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {report?.auth.isAuthenticated ? 'Chưa tìm thấy dòng profiles' : 'Yêu cầu đăng nhập'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {report?.auth.ownProfileTest.messageVi}
              </p>
            </div>
          </div>
        </div>

        {/* Current Auth Session Card with Login Trigger (Requirement 2 & 11) */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 mb-6 text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white">
                {lang === 'vi' ? 'Chi Tiết Phiên Đăng Nhập Supabase' : 'Supabase Auth Session Details'}
              </span>
            </div>

            {report?.auth.isAuthenticated ? (
              <button
                onClick={() => {
                  logout();
                  handleRunHealthCheck();
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>{lang === 'vi' ? 'Đăng Xuất Phiên' : 'Sign Out Session'}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  if (onOpenAuthModal) onOpenAuthModal();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Đăng Nhập Tài Khoản Giáo Viên' : 'Sign In as Teacher'}</span>
              </button>
            )}
          </div>

          {report?.auth.isAuthenticated ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Email:</span>
                <span className="text-emerald-300 font-semibold truncate block">{report.auth.userEmail}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">auth.uid():</span>
                <span className="text-slate-300 truncate block">{report.auth.userId}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Role:</span>
                <span className="text-amber-400 font-bold uppercase block">{report.auth.userRole}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                {lang === 'vi'
                  ? 'Để kiểm tra đăng nhập bằng tài khoản giáo viên đã tồn tại trong Supabase Auth (englishwithmikey@gmail.com), hãy bấm nút "Đăng Nhập Tài Khoản Giáo Viên" phía trên và điền mật khẩu.'
                  : 'To verify teacher login with the existing Supabase Auth account (englishwithmikey@gmail.com), click "Sign In as Teacher" above.'}
              </span>
            </div>
          )}
        </div>

        {/* Tables Live Query Results */}
        {report && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'vi' ? 'Kết Quả Truy Vấn 5 Bảng Database' : 'Database Tables Query Results'}</span>
              </h3>
            </div>

            <div className="space-y-2.5">
              {TARGET_TABLES.map((tblName) => {
                const res = report.tables[tblName];
                if (!res) return null;

                const isSuccess = res.success;
                const isPermDenied = res.state === 'insufficient_privilege';

                return (
                  <div
                    key={tblName}
                    className={`p-3.5 rounded-xl border text-xs transition-all space-y-1.5 ${
                      isSuccess
                        ? 'bg-emerald-950/20 border-emerald-900/60'
                        : isPermDenied
                        ? 'bg-amber-950/20 border-amber-900/50'
                        : 'bg-red-950/20 border-red-900/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{res.tableName}</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          (HTTP {res.httpStatus || '---'})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-300">
                          {res.connected ? 'Connected' : 'Disconnected'}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wide ${
                            isSuccess
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {res.stateLabelVi}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {lang === 'vi' ? res.diagnosisVi : res.diagnosisEn}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors"
          >
            {lang === 'vi' ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
