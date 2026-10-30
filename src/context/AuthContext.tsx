import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, MembershipTier, LearningProgress, Course, Lesson } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { initialCourses } from '../data/coursesData';
import { fetchLiveUserStats } from '../services/courseService';
import { completeSupabaseLesson, fetchUserLearningProgress } from '../services/progressService';

export type SupabaseQueryHealth = 'untested' | 'success' | 'permission_denied' | 'error' | 'disconnected';

interface AuthContextType {
  user: UserProfile | null;
  courses: Course[];
  learningProgress: LearningProgress[];
  progressError: string | null;
  isLoading: boolean;
  isLiveSupabase: boolean;
  isSupabaseAuthenticated: boolean;
  dbQueryStatus: SupabaseQueryHealth;
  dbErrorCode: string | null;
  checkDatabaseHealth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<{ success: boolean; role?: UserRole; error?: string; requiresEmailConfirmation?: boolean }>;
  register: (email: string, pass: string, fullName: string) => Promise<{ success: boolean; role?: UserRole; error?: string; requiresEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  upgradeToPremium: () => void;
  switchDemoUser: (persona: 'student-free' | 'student-premium' | 'teacher') => void;
  markLessonComplete: (courseId: string, lessonId: string, score: number, xpReward: number, sentenceCount?: number) => Promise<void>;
  isLessonCompleted: (courseId: string, lessonId: string) => boolean;
  addCourse: (course: Course) => void;
  updateCourse: (course: Course) => void;
  addLessonToCourse: (courseId: string, lesson: Lesson) => void;
  refreshUserStats: () => Promise<void>;
}

const DEMO_PERSONAS: Record<'student-free' | 'student-premium' | 'teacher', UserProfile> = {
  'student-free': {
    id: 'guest-student-free',
    email: 'student.free@englishwithmikey.com',
    full_name: 'Học viên Trải nghiệm',
    role: 'student',
    membership_tier: 'free',
    streak_days: 0,
    xp_points: 0,
    target_goal: 'Conversational Fluency',
    current_level: 'Beginner',
  },
  'student-premium': {
    id: 'guest-student-premium',
    email: 'student.premium@englishwithmikey.com',
    full_name: 'Học viên VIP',
    role: 'student',
    membership_tier: 'premium',
    streak_days: 0,
    xp_points: 0,
    target_goal: 'IELTS Band 7.0',
    current_level: 'Intermediate',
  },
  'teacher': {
    id: 'guest-teacher-preview',
    email: 'englishwithmikey@gmail.com',
    full_name: 'Teacher Mikey',
    role: 'teacher',
    membership_tier: 'free',
    streak_days: 0,
    xp_points: 0,
    target_goal: 'Curriculum Management',
    current_level: 'Advanced',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ewm_active_user');
      if (saved) {
        try {
          const cached = JSON.parse(saved);
          return Object.values(DEMO_PERSONAS).find((persona) => persona.id === cached?.id) || null;
        } catch {
          // ignore
        }
      }
    }
    return null;
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ewm_custom_courses');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return initialCourses;
  });

  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ewm_learning_progress');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dbQueryStatus, setDbQueryStatus] = useState<SupabaseQueryHealth>('untested');
  const [dbErrorCode, setDbErrorCode] = useState<string | null>(null);
  const [isLiveSupabase, setIsLiveSupabase] = useState<boolean>(false);
  const [isSupabaseAuthenticated, setIsSupabaseAuthenticated] = useState<boolean>(false);

  const [progressError, setProgressError] = useState<string | null>(null);
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;
  const progressRef = useRef(learningProgress);
  progressRef.current = learningProgress;
  const pendingCompletions = useRef(new Map<string, Promise<void>>());

  // Authenticated progress is authoritative on Supabase, including after reload
  // and on another device. Local-only records are retained for demo accounts.
  useEffect(() => {
    let active = true;
    setProgressError(null);
    if (!user || !isSupabaseAuthenticated || user.id.startsWith('guest-')) return;
    const userId = user.id;
    progressRef.current = progressRef.current.filter(row => row.user_id !== userId);
    setLearningProgress(progressRef.current);
    fetchUserLearningProgress(userId).then(rows => {
      if (!active || currentUserId.current !== userId) return;
      // A save that completed while this read was pending must not be lost.
      const completed = progressRef.current.filter(row => row.user_id === userId && row.completed);
      const merged = new Map(rows.map(row => [row.lesson_id, row]));
      completed.forEach(row => merged.set(row.lesson_id, row));
      const next = [...progressRef.current.filter(row => row.user_id !== userId), ...merged.values()];
      progressRef.current = next;
      setLearningProgress(next);
    }).catch(error => {
      if (active && currentUserId.current === userId) setProgressError(error.message || 'Không tải được tiến độ học tập.');
    });
    return () => { active = false; };
  }, [user?.id, isSupabaseAuthenticated]);

  // Probe real Supabase table query health (Requirement 10: Do not report Supabase Live unless queries succeed)
  const checkDatabaseHealth = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setDbQueryStatus('disconnected');
      setDbErrorCode('NO_CLIENT');
      setIsLiveSupabase(false);
      return;
    }

    try {
      const { data, error } = await supabase.from('courses').select('id').limit(1);
      if (error) {
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          setDbQueryStatus('permission_denied');
          setDbErrorCode('42501');
        } else {
          setDbQueryStatus('error');
          setDbErrorCode(error.code || 'QUERY_ERROR');
        }
        setIsLiveSupabase(false);
      } else {
        setDbQueryStatus('success');
        setDbErrorCode(null);
        setIsLiveSupabase(true);
      }
    } catch (err: any) {
      setDbQueryStatus('error');
      setDbErrorCode('FETCH_FAILED');
      setIsLiveSupabase(false);
    }
  };

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let active = true;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Supabase holds its auth lock during this callback. Defer queries until
    // the callback returns, and discard profile results from older sessions.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentRevision = ++revision;
      clearTimeout(timer);
      setIsSupabaseAuthenticated(Boolean(session?.user));
      if (!session?.user) {
        setUser((previous) => previous?.id.startsWith('guest-') && event !== 'SIGNED_OUT' ? previous : null);
      } else {
        setUser((previous) => previous?.id === session.user.id ? previous : null);
      }

      timer = setTimeout(async () => {
        if (!active || currentRevision !== revision) return;
        void checkDatabaseHealth();
        if (!session?.user) return;
        const authUser = session.user;
        try {
          const stats = await fetchLiveUserStats(authUser.id);
          if (!active || currentRevision !== revision) return;
          const profile = stats.profile?.id === authUser.id ? stats.profile : null;
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            full_name: profile?.full_name || authUser.email?.split('@')[0] || 'Learner',
            role: profile?.role === 'teacher' ? 'teacher' : 'student',
            membership_tier: stats.membershipTier,
            avatar_url: profile?.avatar_url,
            streak_days: stats.streakDays,
            xp_points: stats.xpPoints,
            target_goal: profile?.target_goal || 'Conversational Fluency',
            current_level: profile?.current_level || 'Beginner',
          });
        } catch (err) {
          console.warn('Supabase session check error:', err);
        }
      }, 0);
    });

    return () => {
      active = false;
      revision++;
      clearTimeout(timer);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Sync user and progress to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('ewm_active_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ewm_active_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ewm_learning_progress', JSON.stringify(learningProgress));
  }, [learningProgress]);

  useEffect(() => {
    localStorage.setItem('ewm_custom_courses', JSON.stringify(courses));
  }, [courses]);

  // Requirement 2, 3, 4: Login via Supabase Auth, verify auth.uid() in profiles, determine role
  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; role?: UserRole; error?: string; requiresEmailConfirmation?: boolean }> => {
    setIsLoading(true);
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data?.user) {
          const authUser = data.user;
          setIsSupabaseAuthenticated(true);

          // Requirements 3, 4, 9, 10: Query profile and calculate real learning stats from Supabase
          const stats = await fetchLiveUserStats(authUser.id);

          // Requirement 4: Ensure auth.uid() matches profile.id
          if (stats.profile && stats.profile.id !== authUser.id) {
            setIsLoading(false);
            return {
              success: false,
              error: 'Bảo mật: ID tài khoản đăng nhập (auth.uid) không khớp với ID trong bảng profiles.',
            };
          }

          let userRole: UserRole = 'student';
          let fullName = authUser.email?.split('@')[0] || 'Learner';

          if (stats.profile) {
            userRole = stats.profile.role === 'teacher' ? 'teacher' : 'student';
            fullName = stats.profile.full_name || fullName;
          }

          const loggedInUser: UserProfile = {
            id: authUser.id,
            email: authUser.email || email,
            full_name: fullName,
            role: userRole,
            membership_tier: stats.membershipTier,
            streak_days: stats.streakDays,
            xp_points: stats.xpPoints,
            target_goal: stats.profile?.target_goal || 'Conversational Fluency',
            current_level: stats.profile?.current_level || 'Beginner',
          };

          setUser(loggedInUser);
          await checkDatabaseHealth();
          setIsLoading(false);
          // Return role to caller for immediate routing (Requirements 5 & 6)
          return { success: true, role: userRole };
        }

        setIsLoading(false);
        return { success: false, error: 'Không nhận được tài khoản đăng nhập từ Supabase.' };
      } catch (e: any) {
        setIsLoading(false);
        return { success: false, error: e?.message || 'Login failed' };
      }
    }

    setIsLoading(false);
    return { success: false, error: 'Chưa thể khởi tạo kết nối Supabase client.' };
  };

  const register = async (
    email: string,
    pass: string,
    fullName: string
  ): Promise<{ success: boolean; role?: UserRole; error?: string; requiresEmailConfirmation?: boolean }> => {
    setIsLoading(true);
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass,
          options: {
            data: {
              full_name: fullName,
              role: 'student', // Requirement 7: Students cannot assign teacher role
            },
          },
        });

        setIsLoading(false);
        if (error) {
          return { success: false, error: error.message };
        }

        if (data?.user && !data.session) {
          return { success: true, requiresEmailConfirmation: true };
        }

        if (data?.user && data.session) {
          setIsSupabaseAuthenticated(true);
          await checkDatabaseHealth();
          const newStudent: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: fullName,
            role: 'student',
            membership_tier: 'free',
            streak_days: 0,
            xp_points: 0,
            target_goal: 'Conversational Fluency',
            current_level: 'Beginner',
          };
          setUser(newStudent);
          return { success: true, role: 'student' };
        }
        return { success: false, error: 'Không nhận được tài khoản đăng ký từ Supabase.' };
      } catch (e: any) {
        setIsLoading(false);
        return { success: false, error: e?.message || 'Registration failed' };
      }
    }

    setIsLoading(false);
    return { success: false, error: 'Chưa thể khởi tạo kết nối Supabase client.' };
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    setIsSupabaseAuthenticated(false);
    setUser(null);
    await checkDatabaseHealth();
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) {
          return { success: false, message: error.message };
        }
        return {
          success: true,
          message: 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn qua Supabase Auth.',
        };
      } catch (e: any) {
        return { success: false, message: e.message || 'Gửi liên kết thất bại.' };
      }
    }
    return {
      success: false,
      message: 'Chưa thể kết nối Supabase để gửi email đặt lại mật khẩu.', 
    };
  };

  // Requirement 7: Prevent student from changing their role to teacher
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    const safeUpdates = { ...updates };
    // Hard security check: student role can never be elevated to teacher
    if (user.role === 'student') {
      delete safeUpdates.role;
    }

    setUser((prev) => (prev ? { ...prev, ...safeUpdates } : null));

    // Sync safe fields to Supabase profiles table if authenticated
    const supabase = getSupabaseClient();
    if (supabase && user.id && isSupabaseAuthenticated) {
      try {
        const payload: Record<string, any> = {};
        if (safeUpdates.full_name) payload.full_name = safeUpdates.full_name;
        if (safeUpdates.target_goal) payload.target_goal = safeUpdates.target_goal;
        if (safeUpdates.current_level) payload.current_level = safeUpdates.current_level;

        // Teachers may keep teacher role; students can never write role='teacher'
        if (user.role === 'teacher' && safeUpdates.role === 'teacher') {
          payload.role = 'teacher';
        }

        await supabase.from('profiles').update(payload).eq('id', user.id);
      } catch (err) {
        console.warn('Failed to sync profile updates to Supabase:', err);
      }
    }
  };

  const upgradeToPremium = () => {
    if (!user) return;
    setUser((prev) => (prev ? { ...prev, membership_tier: 'premium' } : null));
  };

  const switchDemoUser = (persona: 'student-free' | 'student-premium' | 'teacher') => {
    setIsSupabaseAuthenticated(false);
    setUser(DEMO_PERSONAS[persona]);
  };

  const markLessonComplete = (
    courseId: string, lessonId: string, score: number, xpReward: number, sentenceCount = 0,
  ): Promise<void> => {
    if (!user) return Promise.reject(new Error('Vui lòng đăng nhập để lưu tiến độ.'));
    const userId = user.id;
    const key = `${userId}:${lessonId}`;
    const pending = pendingCompletions.current.get(key);
    if (pending) return pending;
    const work = (async () => {
      setProgressError(null);
      const previous = progressRef.current.find(row => row.user_id === userId && row.lesson_id === lessonId);
      const isDemo = userId.startsWith('guest-');
      let entry: LearningProgress;
      if (isDemo) {
        entry = previous?.completed ? previous : {
          user_id: userId, course_id: courseId, lesson_id: lessonId, completed: true,
          score, xp_earned: xpReward, last_studied_at: new Date().toISOString(),
        };
      } else {
        if (!isSupabaseAuthenticated) throw new Error('Vui lòng đăng nhập lại để lưu tiến độ.');
        entry = await completeSupabaseLesson(userId, courseId, lessonId, score, sentenceCount);
      }
      if (currentUserId.current !== userId) return;
      const next = [...progressRef.current.filter(row => !(row.user_id === userId && row.lesson_id === lessonId)), entry];
      progressRef.current = next;
      setLearningProgress(next);
      if (isDemo) {
        setUser(previousUser => previousUser?.id === userId ? {
          ...previousUser, xp_points: previousUser.xp_points + (previous?.completed ? 0 : entry.xp_earned),
        } : previousUser);
      } else {
        const stats = await fetchLiveUserStats(userId);
        if (currentUserId.current !== userId) return;
        setUser(previousUser => previousUser?.id === userId ? {
          ...previousUser, xp_points: stats.xpPoints, streak_days: stats.streakDays,
        } : previousUser);
      }
    })().catch(error => {
      if (currentUserId.current === userId) setProgressError(error.message || 'Không lưu được tiến độ.');
      throw error;
    });
    pendingCompletions.current.set(key, work);
    void work.finally(() => pendingCompletions.current.delete(key)).catch(() => {});
    return work;
  };

  const isLessonCompleted = (courseId: string, lessonId: string): boolean => {
    if (!user) return false;
    return learningProgress.some(
      (p) => p.user_id === user.id && p.course_id === courseId && p.lesson_id === lessonId && p.completed
    );
  };

  const addCourse = (course: Course) => {
    setCourses((prev) => [course, ...prev]);
  };

  const updateCourse = (course: Course) => {
    setCourses((prev) => prev.map((c) => (c.id === course.id ? course : c)));
  };

  const addLessonToCourse = (courseId: string, lesson: Lesson) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          return {
            ...c,
            lesson_count: c.lesson_count + 1,
            lessons: [...c.lessons, lesson],
          };
        }
        return c;
      })
    );
  };

  const refreshUserStats = async () => {
    if (!user) return;
    try {
      const stats = await fetchLiveUserStats(user.id);
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          full_name: stats.profile?.full_name || prev.full_name,
          role: (stats.profile?.role as UserRole) || prev.role,
          membership_tier: stats.membershipTier,
          streak_days: stats.streakDays,
          xp_points: stats.xpPoints,
          target_goal: stats.profile?.target_goal || prev.target_goal,
          current_level: stats.profile?.current_level || prev.current_level,
        };
      });
    } catch (err) {
      console.warn('Failed to refresh user stats:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        courses,
        learningProgress,
        progressError,
        isLoading,
        isLiveSupabase,
        isSupabaseAuthenticated,
        dbQueryStatus,
        dbErrorCode,
        checkDatabaseHealth,
        login,
        register,
        logout,
        resetPassword,
        updateProfile,
        upgradeToPremium,
        switchDemoUser,
        markLessonComplete,
        isLessonCompleted,
        addCourse,
        updateCourse,
        addLessonToCourse,
        refreshUserStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
