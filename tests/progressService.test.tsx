import { beforeEach, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { completeSupabaseLesson, fetchUserLearningProgress } from '../src/services/progressService';

const state = vi.hoisted(() => ({ client: null as any }));
vi.mock('../src/lib/supabase', () => ({ getSupabaseClient: () => state.client }));

const userId = '11111111-1111-4111-8111-111111111111';
let row: any;
let denied: boolean;
let requests: Array<{ url: URL; method: string; body: any }>;
beforeEach(() => {
  row = null;
  denied = false;
  requests = [];
  state.client = createClient('https://example.supabase.co', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `test-${crypto.randomUUID()}` },
    global: {
      fetch: async (input: any, init: any) => {
        const url = new URL(String(input));
        const method = init?.method || 'GET';
        const body = init?.body ? JSON.parse(init.body) : null;
        requests.push({ url, method, body });
        if (denied) return new Response(JSON.stringify({ message: 'permission denied', code: '42501' }), { status: 403 });
        let result: any[] = [];
        if (url.pathname.endsWith('/lessons')) result = [{ id: 7, course_id: 3 }];
        else if (method === 'POST') {
          expect(url.searchParams.get('on_conflict')).toBe('user_id,lesson_id');
          expect(new Headers(init.headers).get('Prefer')).toContain('resolution=ignore-duplicates');
          if (!row) { row = { ...body }; result = [row]; }
        } else if (method === 'PATCH') {
          expect(url.searchParams.get('user_id')).toBe(`eq.${userId}`);
          expect(url.searchParams.get('lesson_id')).toBe('eq.7');
          expect(url.searchParams.get('is_completed')).toBe('eq.false');
          if (row && !row.is_completed) { row = { ...row, ...body }; result = [row]; }
        } else if (row) result = [row];
        const singular = new Headers(init?.headers).get('Accept')?.includes('application/vnd.pgrst.object+json');
        return new Response(JSON.stringify(singular ? result[0] : result), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    },
  });
  vi.spyOn(state.client.auth, 'getSession').mockResolvedValue({ data: { session: { user: { id: userId } } }, error: null } as any);
});

it('saves required sentence counts and derives XP from persisted score', async () => {
  const saved = await completeSupabaseLesson(userId, '3', '7', 100, 20);
  expect(row).toMatchObject({ user_id: userId, lesson_id: '7', course_id: '3', completed_sentences: 20, current_sentence: 20, is_completed: true });
  expect(saved).toMatchObject({ completed: true, score: 100, xp_earned: 100 });
  expect(row).not.toHaveProperty('id');
});

it('preserves existing completion timestamps and score on replay', async () => {
  row = { user_id: userId, lesson_id: 7, course_id: 3, is_completed: true, score: 80, completed_at: '2026-10-01T10:00:00Z' };
  const first = await completeSupabaseLesson(userId, '3', '7', 100, 20);
  const second = await completeSupabaseLesson(userId, '3', '7', 100, 20);
  expect(first).toEqual(second);
  expect(second.xp_earned).toBe(80);
  expect(row.completed_at).toBe('2026-10-01T10:00:00Z');
});

it('completes an existing unfinished progress record', async () => {
  row = { user_id: userId, lesson_id: 7, course_id: 3, is_completed: false, current_sentence: 4 };
  const saved = await completeSupabaseLesson(userId, '3', '7', 100, 20);
  expect(saved.completed).toBe(true);
  expect(row.completed_sentences).toBe(20);
});

it('concurrent completion requests use a single persisted completion', async () => {
  const results = await Promise.all([
    completeSupabaseLesson(userId, '3', '7', 100, 20),
    completeSupabaseLesson(userId, '3', '7', 100, 20),
  ]);
  expect(results[0]).toEqual(results[1]);
});

it('surfaces database permission errors without reporting completion', async () => {
  denied = true;
  await expect(completeSupabaseLesson(userId, '3', '7', 100, 20)).rejects.toMatchObject({ code: '42501' });
  expect(row).toBeNull();
});

it('rejects account mismatches and invalid lesson input before making database requests', async () => {
  await expect(completeSupabaseLesson('other-user', '3', '7', 100, 20)).rejects.toThrow('đăng nhập lại');
  await expect(completeSupabaseLesson(userId, 'demo', '7', 100, 20)).rejects.toThrow('không hợp lệ');
  expect(requests).toHaveLength(0);
});

it('loads progress only for the active account and resolves legacy missing course IDs', async () => {
  row = { user_id: userId, lesson_id: 7, course_id: null, is_completed: true, score: null, updated_at: '2026-10-01' };
  const rows = await fetchUserLearningProgress(userId);
  expect(requests[0].url.searchParams.get('user_id')).toBe(`eq.${userId}`);
  expect(rows[0]).toMatchObject({ course_id: '3', lesson_id: '7', completed: true, xp_earned: 100 });
});
