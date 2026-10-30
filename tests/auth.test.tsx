import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AuthModal } from '../src/components/auth/AuthModal';
import { LanguageProvider } from '../src/context/LanguageContext';

const mock = vi.hoisted(() => ({
  listener: null as any,
  stats: vi.fn(),
  client: null as any,
  signIn: vi.fn(),
  signUp: vi.fn(),
  reset: vi.fn(),
  query: vi.fn(),
  progress: vi.fn(),
  complete: vi.fn(),
}));
vi.mock('../src/lib/supabase', () => ({
  getSupabaseClient: () => mock.client,
  isSupabaseConfigured: () => Boolean(mock.client),
}));
vi.mock('../src/services/courseService', () => ({ fetchLiveUserStats: mock.stats }));
vi.mock('../src/services/progressService', () => ({ fetchUserLearningProgress: mock.progress, completeSupabaseLesson: mock.complete }));

let root: Root;
let container: HTMLDivElement;
let auth: ReturnType<typeof useAuth>;
function Probe() { auth = useAuth(); return null; }
async function mount(modal = false, initialMode: 'login' | 'register' = 'login') {
  await act(async () => root.render(
    <LanguageProvider><AuthProvider><Probe />
      {modal && <AuthModal isOpen onClose={vi.fn()} initialMode={initialMode} />}
    </AuthProvider></LanguageProvider>,
  ));
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  mock.stats.mockResolvedValue({ profile: null, membershipTier: 'free', xpPoints: 0, streakDays: 0 });
  mock.progress.mockResolvedValue([]);
  mock.query.mockResolvedValue({ data: [], error: null });
  mock.client = {
    from: () => ({ select: () => ({ limit: mock.query }) }),
    auth: {
      onAuthStateChange: (callback: any) => {
        mock.listener = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithPassword: mock.signIn,
      signUp: mock.signUp,
      resetPasswordForEmail: mock.reset,
    },
  };
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

it('waits for email confirmation instead of creating an authenticated user', async () => {
  mock.signUp.mockResolvedValue({ data: { user: { id: 'new-user' }, session: null }, error: null });
  await mount();
  let result: any;
  await act(async () => { result = await auth.register('student@example.com', 'password', 'Student'); });
  expect(result).toEqual({ success: true, requiresEmailConfirmation: true });
  expect(auth.user).toBeNull();
  expect(auth.isSupabaseAuthenticated).toBe(false);
});

it('accepts registration when Supabase returns a session', async () => {
  mock.signUp.mockResolvedValue({ data: { user: { id: 'new-user' }, session: { access_token: 'test' } }, error: null });
  await mount();
  await act(async () => { await auth.register('student@example.com', 'password', 'Student'); });
  expect(auth.user?.id).toBe('new-user');
  expect(auth.isSupabaseAuthenticated).toBe(true);
});

it('does not grant teacher access based on an email address', async () => {
  mock.signIn.mockResolvedValue({ data: { user: { id: 'student', email: 'teacher@example.com' } }, error: null });
  await mount();
  await act(async () => { await auth.login('teacher@example.com', 'password'); });
  expect(auth.user?.role).toBe('student');
});

it('preserves a teacher role verified in the matching profile', async () => {
  mock.signIn.mockResolvedValue({ data: { user: { id: 'teacher', email: 'mikey@example.com' } }, error: null });
  mock.stats.mockResolvedValue({ profile: { id: 'teacher', role: 'teacher' }, membershipTier: 'free', xpPoints: 0, streakDays: 0 });
  await mount();
  await act(async () => { await auth.login('mikey@example.com', 'password'); });
  expect(auth.user?.role).toBe('teacher');
});

it('defers database queries until the auth callback releases its lock', async () => {
  vi.useFakeTimers();
  await mount();
  let result: any;
  await act(async () => {
    result = mock.listener('SIGNED_IN', { user: { id: 'student' } });
  });
  expect(result).toBeUndefined();
  expect(mock.query).not.toHaveBeenCalled();
  expect(mock.stats).not.toHaveBeenCalled();
  await act(async () => { await vi.runAllTimersAsync(); });
  expect(mock.stats).toHaveBeenCalledWith('student');
  expect(auth.user?.id).toBe('student');
});

it('discards an old profile query if the session signs out', async () => {
  vi.useFakeTimers();
  let resolveStats: (value: any) => void;
  mock.stats.mockReturnValue(new Promise(resolve => { resolveStats = resolve; }));
  await mount();
  await act(async () => { mock.listener('SIGNED_IN', { user: { id: 'student' } }); });
  await act(async () => { vi.advanceTimersByTime(0); });
  await act(async () => { mock.listener('SIGNED_OUT', null); });
  await act(async () => { resolveStats!({ profile: null, membershipTier: 'free', xpPoints: 0, streakDays: 0 }); });
  expect(auth.user).toBeNull();
  expect(auth.isSupabaseAuthenticated).toBe(false);
});

it('does not restore a real account from an unvalidated local cache', async () => {
  localStorage.setItem('ewm_active_user', JSON.stringify({ id: 'expired-user', role: 'teacher' }));
  await mount();
  expect(auth.user).toBeNull();
});

it('reports a reset failure when Supabase is unavailable', async () => {
  mock.client = null;
  await mount();
  expect((await auth.resetPassword('student@example.com')).success).toBe(false);
});

it('displays password reset errors as errors instead of success messages', async () => {
  mock.reset.mockResolvedValue({ error: { message: 'Email service unavailable' } });
  await mount(true);
  const forgot = [...container.querySelectorAll('button')].find(button => /forgot|quên/i.test(button.textContent || ''));
  expect(forgot).toBeDefined();
  await act(async () => forgot!.click());
  const input = container.querySelector('input[type="email"]') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'student@example.com');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(container.textContent).toContain('Email service unavailable');
  const message = [...container.querySelectorAll('span')].find(span => span.textContent === 'Email service unavailable');
  expect(message?.closest('[role="alert"]')).not.toBeNull();
  expect(container.querySelector('[role="status"]')).toBeNull();
});

const savedProgress = {
  user_id: 'student', course_id: '3', lesson_id: '7', completed: true,
  score: 100, xp_earned: 100, last_studied_at: '2026-10-30T00:00:00Z',
};

async function loginStudent() {
  mock.signIn.mockResolvedValue({ data: { user: { id: 'student', email: 'student@example.com' } }, error: null });
  await act(async () => { await auth.login('student@example.com', 'password'); });
}

it('hydrates lesson completion from Supabase after login', async () => {
  mock.progress.mockResolvedValue([savedProgress]);
  await mount();
  await loginStudent();
  expect(mock.progress).toHaveBeenCalledWith('student');
  expect(auth.isLessonCompleted('3', '7')).toBe(true);
});

it('deduplicates overlapping completion requests and uses persisted XP totals', async () => {
  let finish: (value: any) => void;
  mock.complete.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await mount();
  await loginStudent();
  mock.stats.mockResolvedValue({ profile: null, membershipTier: 'free', xpPoints: 100, streakDays: 1 });
  let first: Promise<void>;
  let second: Promise<void>;
  await act(async () => {
    first = auth.markLessonComplete('3', '7', 100, 50, 20);
    second = auth.markLessonComplete('3', '7', 100, 50, 20);
  });
  expect(mock.complete).toHaveBeenCalledTimes(1);
  expect(auth.isLessonCompleted('3', '7')).toBe(false);
  await act(async () => { finish!(savedProgress); await Promise.all([first!, second!]); });
  await act(async () => { await auth.markLessonComplete('3', '7', 100, 50, 20); });
  expect(auth.learningProgress.filter(row => row.user_id === 'student')).toHaveLength(1);
  expect(auth.user?.xp_points).toBe(100);
});

it('does not mark completion on failed writes and allows retry', async () => {
  mock.complete.mockRejectedValueOnce(new Error('permission denied')).mockResolvedValue(savedProgress);
  await mount();
  await loginStudent();
  await act(async () => {
    await expect(auth.markLessonComplete('3', '7', 100, 50, 20)).rejects.toThrow('permission denied');
  });
  expect(auth.progressError).toBe('permission denied');
  expect(auth.isLessonCompleted('3', '7')).toBe(false);
  await act(async () => { await auth.markLessonComplete('3', '7', 100, 50, 20); });
  expect(auth.isLessonCompleted('3', '7')).toBe(true);
  expect(auth.progressError).toBeNull();
});

it('does not apply a pending account write after switching to demo', async () => {
  let finish: (value: any) => void;
  mock.complete.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await mount();
  await loginStudent();
  let saving: Promise<void>;
  await act(async () => { saving = auth.markLessonComplete('3', '7', 100, 50, 20); });
  await act(async () => { auth.switchDemoUser('student-free'); });
  await act(async () => { finish!(savedProgress); await saving!; });
  expect(auth.user?.id).toBe('guest-student-free');
  expect(auth.user?.xp_points).toBe(0);
  expect(auth.learningProgress).not.toContainEqual(savedProgress);
});

it('awards local demo XP only once and never writes demo progress to Supabase', async () => {
  await mount();
  await act(async () => { auth.switchDemoUser('student-free'); });
  await act(async () => {
    await auth.markLessonComplete('demo-course', 'demo-lesson', 100, 50);
    await auth.markLessonComplete('demo-course', 'demo-lesson', 100, 50);
  });
  expect(auth.user?.xp_points).toBe(50);
  expect(mock.complete).not.toHaveBeenCalled();
});
