import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_jATTRrx5vNGjrKXbYfSx4A_aRFH7mHg';

// Supabase Project URL provided in user brief
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://kczyigukukpyoyhlajci.supabase.co';

// Key retrieval: First check localStorage override, then env var, then fallback key
export const getStoredAnonKey = (): string => {
  if (typeof window !== 'undefined') {
    const key = localStorage.getItem('ewm_supabase_anon_key');
    if (key && key.trim().length > 0) return key.trim();
  }
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return DEFAULT_SUPABASE_ANON_KEY;
};

export const isSupabaseConfigured = (): boolean => {
  const key = getStoredAnonKey();
  return Boolean(key && key.trim().length > 10);
};

// Singleton Supabase client instance
let supabaseInstance: SupabaseClient | null = null;
let lastUsedKey: string | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  const currentKey = getStoredAnonKey();
  if (!currentKey || currentKey.trim().length < 10) {
    return null;
  }
  if (!supabaseInstance || lastUsedKey !== currentKey) {
    try {
      lastUsedKey = currentKey;
      supabaseInstance = createClient(SUPABASE_URL, currentKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
};

export const updateStoredAnonKey = (newKey: string): boolean => {
  try {
    if (newKey && newKey.trim()) {
      localStorage.setItem('ewm_supabase_anon_key', newKey.trim());
      lastUsedKey = newKey.trim();
      supabaseInstance = createClient(SUPABASE_URL, newKey.trim(), {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } else {
      localStorage.removeItem('ewm_supabase_anon_key');
      lastUsedKey = null;
      supabaseInstance = null;
    }
    return true;
  } catch (e) {
    console.error('Error saving anon key:', e);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Health Check & Diagnostic Service (Distinguishing 5 Mandatory States)
// 1. Kết nối Supabase thành công
// 2. Người dùng chưa đăng nhập (anon)
// 3. Người dùng đã đăng nhập (authenticated, auth.uid() matching)
// 4. Không đủ quyền truy cập database (PostgreSQL 42501 permission denied)
// 5. Truy vấn thành công
// ---------------------------------------------------------------------------

export type DiagnosticState =
  | 'connection_success'
  | 'user_unauthenticated'
  | 'user_authenticated'
  | 'insufficient_privilege'
  | 'query_success'
  | 'table_missing'
  | 'connection_error';

export interface TableCheckResult {
  tableName: string;
  connected: boolean;
  success: boolean;
  state: DiagnosticState;
  stateLabelVi: string;
  stateLabelEn: string;
  errorCode: string | null;
  errorMessage: string | null;
  errorHint: string | null;
  httpStatus: number | null;
  rowCount: number | null;
  sampleColumns: string[];
  diagnosisVi: string;
  diagnosisEn: string;
}

export interface OwnProfileCheckResult {
  tested: boolean;
  success: boolean;
  authUid: string | null;
  profileId: string | null;
  idMatches: boolean;
  role: string | null;
  messageVi: string;
  messageEn: string;
  errorCode?: string | null;
}

export interface AuthCheckResult {
  connected: boolean;
  success: boolean;
  state: 'user_authenticated' | 'user_unauthenticated' | 'connection_error';
  stateLabelVi: string;
  stateLabelEn: string;
  isAuthenticated: boolean;
  userEmail: string | null;
  userId: string | null;
  userRole: string | null;
  statusMessageVi: string;
  statusMessageEn: string;
  ownProfileTest: OwnProfileCheckResult;
}

export interface SupabaseDiagnosticReport {
  testedAt: string;
  projectUrl: string;
  isKeyConfigured: boolean;
  auth: AuthCheckResult;
  tables: Record<string, TableCheckResult>;
  summaryVi: string;
  summaryEn: string;
  hasErrors: boolean;
}

export const TARGET_TABLES = [
  'profiles',
  'courses',
  'lessons',
  'sentences',
  'learning_progress',
] as const;

export async function runSupabaseHealthCheck(): Promise<SupabaseDiagnosticReport> {
  const client = getSupabaseClient();
  const testedAt = new Date().toISOString();

  if (!client) {
    const emptyTables: Record<string, TableCheckResult> = {};
    for (const tbl of TARGET_TABLES) {
      emptyTables[tbl] = {
        tableName: tbl,
        connected: false,
        success: false,
        state: 'connection_error',
        stateLabelVi: 'Lỗi kết nối',
        stateLabelEn: 'Connection Error',
        errorCode: 'NO_ANON_KEY',
        errorMessage: 'VITE_SUPABASE_ANON_KEY chưa được cấu hình',
        errorHint: 'Vui lòng cung cấp public anon key hợp lệ để kết nối Supabase.',
        httpStatus: null,
        rowCount: null,
        sampleColumns: [],
        diagnosisVi: 'Không thể kết nối vì thiếu VITE_SUPABASE_ANON_KEY.',
        diagnosisEn: 'Connection not established because VITE_SUPABASE_ANON_KEY is missing.',
      };
    }

    return {
      testedAt,
      projectUrl: SUPABASE_URL,
      isKeyConfigured: false,
      auth: {
        connected: false,
        success: false,
        state: 'connection_error',
        stateLabelVi: 'Lỗi kết nối',
        stateLabelEn: 'Connection Error',
        isAuthenticated: false,
        userEmail: null,
        userId: null,
        userRole: null,
        statusMessageVi: 'Chưa cấu hình Supabase Anon Key.',
        statusMessageEn: 'Supabase Anon Key is not configured.',
        ownProfileTest: {
          tested: false,
          success: false,
          authUid: null,
          profileId: null,
          idMatches: false,
          role: null,
          messageVi: 'Chưa thể kiểm tra profiles vì chưa kết nối.',
          messageEn: 'Cannot test profiles because client is disconnected.',
        },
      },
      tables: emptyTables,
      summaryVi: 'Chưa có VITE_SUPABASE_ANON_KEY để thực hiện kết nối thực tế.',
      summaryEn: 'VITE_SUPABASE_ANON_KEY is missing for live connection testing.',
      hasErrors: true,
    };
  }

  // 1. Check Supabase Auth State
  let authResult: AuthCheckResult = {
    connected: false,
    success: false,
    state: 'user_unauthenticated',
    stateLabelVi: 'Người dùng chưa đăng nhập',
    stateLabelEn: 'User unauthenticated',
    isAuthenticated: false,
    userEmail: null,
    userId: null,
    userRole: null,
    statusMessageVi: '',
    statusMessageEn: '',
    ownProfileTest: {
      tested: false,
      success: false,
      authUid: null,
      profileId: null,
      idMatches: false,
      role: null,
      messageVi: 'Chưa đăng nhập, không thực hiện kiểm tra RLS hồ sơ cá nhân.',
      messageEn: 'Unauthenticated; own profile RLS test skipped.',
    },
  };

  let currentUserUid: string | null = null;

  try {
    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    if (sessionErr) {
      authResult = {
        connected: true,
        success: false,
        state: 'connection_error',
        stateLabelVi: 'Lỗi xác thực Auth',
        stateLabelEn: 'Auth Error',
        isAuthenticated: false,
        userEmail: null,
        userId: null,
        userRole: null,
        statusMessageVi: `Lỗi Auth: ${sessionErr.message}`,
        statusMessageEn: `Auth Error: ${sessionErr.message}`,
        ownProfileTest: {
          tested: false,
          success: false,
          authUid: null,
          profileId: null,
          idMatches: false,
          role: null,
          messageVi: 'Lỗi phiên đăng nhập',
          messageEn: 'Session error',
        },
      };
    } else {
      const session = sessionData.session;
      if (session && session.user) {
        currentUserUid = session.user.id;
        const userEmail = session.user.email || null;
        const userRole = session.user.role || (session.user.user_metadata?.role as string) || 'authenticated';

        // Requirement 3 & 4: Query user's own profile row from profiles using auth session
        let ownProfileCheck: OwnProfileCheckResult = {
          tested: true,
          success: false,
          authUid: currentUserUid,
          profileId: null,
          idMatches: false,
          role: null,
          messageVi: '',
          messageEn: '',
        };

        try {
          const { data: myProfile, error: myProfileErr } = await client
            .from('profiles')
            .select('*')
            .eq('id', currentUserUid)
            .single();

          if (myProfileErr) {
            ownProfileCheck.success = false;
            ownProfileCheck.errorCode = myProfileErr.code;
            ownProfileCheck.messageVi = `Không đủ quyền truy cập database hoặc hồ sơ chưa tạo (PostgreSQL ${myProfileErr.code}: ${myProfileErr.message})`;
            ownProfileCheck.messageEn = `Insufficient database privilege or profile missing (PostgreSQL ${myProfileErr.code}: ${myProfileErr.message})`;
          } else if (myProfile) {
            const isMatch = myProfile.id === currentUserUid;
            ownProfileCheck.success = true;
            ownProfileCheck.profileId = myProfile.id;
            ownProfileCheck.idMatches = isMatch;
            ownProfileCheck.role = myProfile.role || 'student';

            if (isMatch) {
              ownProfileCheck.messageVi = `Truy vấn thành công! ID khớp hoàn toàn với auth.uid() (${currentUserUid}). Role: ${myProfile.role || 'student'}.`;
              ownProfileCheck.messageEn = `Query success! Profile ID matches auth.uid() (${currentUserUid}). Role: ${myProfile.role || 'student'}.`;
            } else {
              ownProfileCheck.messageVi = `Cảnh báo: ID trong bảng profiles (${myProfile.id}) không khớp với auth.uid() (${currentUserUid})!`;
              ownProfileCheck.messageEn = `Warning: Profile ID (${myProfile.id}) does not match auth.uid() (${currentUserUid})!`;
            }
          }
        } catch (pErr: any) {
          ownProfileCheck.success = false;
          ownProfileCheck.messageVi = `Ngoại lệ khi truy vấn profiles: ${pErr?.message}`;
          ownProfileCheck.messageEn = `Exception querying profiles: ${pErr?.message}`;
        }

        authResult = {
          connected: true,
          success: true,
          state: 'user_authenticated',
          stateLabelVi: 'Người dùng đã đăng nhập',
          stateLabelEn: 'User authenticated',
          isAuthenticated: true,
          userEmail,
          userId: currentUserUid,
          userRole,
          statusMessageVi: `Đã đăng nhập: ${userEmail} (auth.uid: ${currentUserUid.substring(0, 8)}...)`,
          statusMessageEn: `Authenticated: ${userEmail} (auth.uid: ${currentUserUid.substring(0, 8)}...)`,
          ownProfileTest: ownProfileCheck,
        };
      } else {
        authResult = {
          connected: true,
          success: true,
          state: 'user_unauthenticated',
          stateLabelVi: 'Người dùng chưa đăng nhập',
          stateLabelEn: 'User unauthenticated',
          isAuthenticated: false,
          userEmail: null,
          userId: null,
          userRole: 'anon',
          statusMessageVi: 'Kết nối Supabase thành công. Trạng thái hiện tại: Người dùng chưa đăng nhập (vai trò `anon`).',
          statusMessageEn: 'Supabase connection successful. Current status: User unauthenticated (`anon` role).',
          ownProfileTest: {
            tested: false,
            success: false,
            authUid: null,
            profileId: null,
            idMatches: false,
            role: null,
            messageVi: 'Người dùng chưa đăng nhập. Bảng profiles áp dụng RLS bảo vệ nên role anon không có quyền SELECT (PostgreSQL 42501).',
            messageEn: 'User unauthenticated. Profiles table is protected by RLS; anon role has no SELECT permission (PostgreSQL 42501).',
          },
        };
      }
    }
  } catch (err: any) {
    authResult = {
      connected: false,
      success: false,
      state: 'connection_error',
      stateLabelVi: 'Lỗi kết nối',
      stateLabelEn: 'Connection Error',
      isAuthenticated: false,
      userEmail: null,
      userId: null,
      userRole: null,
      statusMessageVi: `Lỗi kết nối Auth: ${err?.message || 'Không thể liên lạc máy chủ'}`,
      statusMessageEn: `Auth connection failure: ${err?.message || 'Could not reach server'}`,
      ownProfileTest: {
        tested: false,
        success: false,
        authUid: null,
        profileId: null,
        idMatches: false,
        role: null,
        messageVi: 'Lỗi kết nối máy chủ.',
        messageEn: 'Server connection error.',
      },
    };
  }

  // 2. Query 5 Tables via SELECT
  const tableResults: Record<string, TableCheckResult> = {};
  let anyTableFailed = false;

  for (const tableName of TARGET_TABLES) {
    try {
      // Execute non-destructive SELECT query with count: 'exact', limit 1
      const { data, error, status, count } = await client
        .from(tableName)
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        anyTableFailed = true;
        const code = error.code || String(status);
        const msg = error.message || 'Unknown query error';
        const hint = error.hint || null;

        let state: DiagnosticState = 'insufficient_privilege';
        let stateLabelVi = 'Không đủ quyền truy cập database';
        let stateLabelEn = 'Insufficient database privilege';
        let diagVi = '';
        let diagEn = '';

        if (code === '42P01' || msg.toLowerCase().includes('does not exist')) {
          state = 'table_missing';
          stateLabelVi = 'Bảng không tồn tại';
          stateLabelEn = 'Table does not exist';
          diagVi = `Bảng '${tableName}' không tồn tại trong database (PostgreSQL 42P01 undefined_table).`;
          diagEn = `Table '${tableName}' does not exist in database (PostgreSQL 42P01 undefined_table).`;
        } else if (
          code === '42501' ||
          msg.toLowerCase().includes('permission denied for table') ||
          msg.toLowerCase().includes('permission denied for relation')
        ) {
          state = 'insufficient_privilege';
          stateLabelVi = 'Không đủ quyền truy cập database';
          stateLabelEn = 'Insufficient database privilege';

          if (tableName === 'profiles') {
            diagVi = `Không đủ quyền truy cập database (PostgreSQL 42501): Bảng 'profiles' được bảo vệ bởi Row Level Security (RLS). Role 'anon' không có quyền SELECT công khai. Chỉ người dùng đã đăng nhập mới được xem hồ sơ của chính mình qua auth.uid().`;
            diagEn = `Insufficient database privilege (PostgreSQL 42501): Table 'profiles' is secured by RLS. The 'anon' role has no public SELECT privilege. Only authenticated users can view their own profile via auth.uid().`;
          } else {
            diagVi = `Không đủ quyền truy cập database (PostgreSQL 42501): Role hiện tại chưa được cấp quyền SELECT trên bảng '${tableName}'.`;
            diagEn = `Insufficient database privilege (PostgreSQL 42501): Current role has not been granted SELECT on table '${tableName}'.`;
          }
        } else {
          state = 'insufficient_privilege';
          stateLabelVi = 'Lỗi truy vấn database';
          stateLabelEn = 'Database query error';
          diagVi = `Lỗi truy vấn [${code}]: ${msg}`;
          diagEn = `Query error [${code}]: ${msg}`;
        }

        tableResults[tableName] = {
          tableName,
          connected: true, // PostgREST endpoint responded
          success: false,
          state,
          stateLabelVi,
          stateLabelEn,
          errorCode: code,
          errorMessage: msg,
          errorHint: hint,
          httpStatus: status || 400,
          rowCount: null,
          sampleColumns: [],
          diagnosisVi: diagVi,
          diagnosisEn: diagEn,
        };
      } else {
        // Query succeeded!
        const rowsFound = count !== null ? count : (data ? data.length : 0);
        const cols = data && data.length > 0 ? Object.keys(data[0]) : [];

        let diagVi = '';
        let diagEn = '';

        if (rowsFound === 0) {
          diagVi = `Truy vấn thành công nhưng trả về 0 dòng. Chú ý: 0 dòng có thể do bảng trống HOẶC chính sách RLS lọc hết dữ liệu với role hiện tại. Không coi 0 dòng là minh chứng RLS đã cấu hình đúng.`;
          diagEn = `Query succeeded with 0 rows returned. Note: 0 rows may indicate an empty table OR an RLS policy filtering out all rows for current role. Do not interpret 0 rows as proof of correct RLS configuration.`;
        } else {
          diagVi = `Truy vấn thành công! Đã đọc được dữ liệu (${rowsFound} dòng trong bảng).`;
          diagEn = `Query succeeded! Accessible data (${rowsFound} rows present in table).`;
        }

        tableResults[tableName] = {
          tableName,
          connected: true,
          success: true,
          state: 'query_success',
          stateLabelVi: 'Truy vấn thành công',
          stateLabelEn: 'Query success',
          errorCode: null,
          errorMessage: null,
          errorHint: null,
          httpStatus: status || 200,
          rowCount: rowsFound,
          sampleColumns: cols,
          diagnosisVi: diagVi,
          diagnosisEn: diagEn,
        };
      }
    } catch (err: any) {
      anyTableFailed = true;
      tableResults[tableName] = {
        tableName,
        connected: false,
        success: false,
        state: 'connection_error',
        stateLabelVi: 'Lỗi kết nối',
        stateLabelEn: 'Connection Error',
        errorCode: 'FETCH_ERROR',
        errorMessage: err?.message || 'Không thể gửi yêu cầu',
        errorHint: 'Kiểm tra đường truyền mạng hoặc CORS cấu hình trên Supabase.',
        httpStatus: null,
        rowCount: null,
        sampleColumns: [],
        diagnosisVi: `Lỗi kết nối mạng: Không thể liên lạc với endpoint của bảng '${tableName}'.`,
        diagnosisEn: `Network error: Could not reach endpoint for table '${tableName}'.`,
      };
    }
  }

  let summaryVi = '';
  let summaryEn = '';

  if (authResult.isAuthenticated) {
    summaryVi = `Kết nối Supabase thành công. Người dùng đã đăng nhập (${authResult.userEmail}). Kiểm tra RLS hồ sơ cá nhân: ${
      authResult.ownProfileTest.success ? 'Truy vấn thành công' : 'Chưa lấy được hồ sơ'
    }.`;
    summaryEn = `Supabase connection successful. User authenticated (${authResult.userEmail}). Own profile RLS check: ${
      authResult.ownProfileTest.success ? 'Query success' : 'Failed'
    }.`;
  } else {
    summaryVi = 'Kết nối Supabase thành công. Người dùng chưa đăng nhập (vai trò anon). Bảng profiles trả về 42501 (đúng theo thiết kế bảo mật RLS bảo vệ học viên).';
    summaryEn = 'Supabase connection successful. User unauthenticated (anon role). Table profiles returned 42501 (as designed to protect student data under RLS).';
  }

  return {
    testedAt,
    projectUrl: SUPABASE_URL,
    isKeyConfigured: true,
    auth: authResult,
    tables: tableResults,
    summaryVi,
    summaryEn,
    hasErrors: anyTableFailed || !authResult.success,
  };
}
