import { getSupabaseClient } from '../lib/supabase';
import type { LearningProgress } from '../types';

const columns = 'user_id,lesson_id,course_id,is_completed,score,completed_at,updated_at';

function toProgress(row: any): LearningProgress {
  const score = Number(row.score ?? 100);
  return {
    user_id: String(row.user_id),
    lesson_id: String(row.lesson_id),
    course_id: row.course_id == null ? '' : String(row.course_id),
    completed: Boolean(row.is_completed),
    score,
    // Match the existing live stats calculation; XP is derived, never incremented in the DB.
    xp_earned: row.is_completed ? Math.max(10, Math.round(score)) : 0,
    last_studied_at: row.completed_at || row.updated_at,
  };
}

async function authenticatedClient(userId: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Chưa có kết nối Supabase.');
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session || data.session.user.id !== userId) {
    throw new Error('Vui lòng đăng nhập lại để lưu tiến độ.');
  }
  return client;
}

export async function fetchUserLearningProgress(userId: string): Promise<LearningProgress[]> {
  const client = await authenticatedClient(userId);
  const { data, error } = await client.from('learning_progress').select(columns).eq('user_id', userId);
  if (error) throw error;
  const rows = (data || []).map(toProgress);
  // Older progress records may predate course_id. Resolve their lessons without
  // guessing a course or migrating data in the browser.
  const missing = rows.filter(row => !row.course_id).map(row => row.lesson_id);
  if (missing.length) {
    const { data: lessons, error: lessonError } = await client.from('lessons').select('id,course_id').in('id', missing);
    if (lessonError) throw lessonError;
    const courses = new Map((lessons || []).map(row => [String(row.id), String(row.course_id)]));
    rows.forEach(row => { if (!row.course_id) row.course_id = courses.get(row.lesson_id) || ''; });
  }
  return rows;
}

export async function completeSupabaseLesson(
  userId: string, courseId: string, lessonId: string, score: number, sentenceCount: number,
): Promise<LearningProgress> {
  if (!/^\d+$/.test(courseId) || !/^\d+$/.test(lessonId) || !Number.isFinite(score) ||
      !Number.isInteger(sentenceCount) || sentenceCount < 1) {
    throw new Error('Thông tin hoàn thành bài học không hợp lệ.');
  }
  const client = await authenticatedClient(userId);
  const now = new Date().toISOString();
  const payload = {
    user_id: userId, course_id: courseId, lesson_id: lessonId,
    is_completed: true, score: Math.min(100, Math.max(0, score)),
    current_sentence: sentenceCount, completed_sentences: sentenceCount,
    completed_at: now, updated_at: now,
  };
  // A unique (user_id, lesson_id) index makes repeated/concurrent inserts safe.
  // Preserve completed rows so replay does not reset their completion date or XP.
  const inserted = await client.from('learning_progress')
    .upsert(payload, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true })
    .select(columns).maybeSingle();
  if (inserted.error) throw inserted.error;
  if (inserted.data) return toProgress(inserted.data);

  const updated = await client.from('learning_progress').update(payload)
    .eq('user_id', userId).eq('lesson_id', lessonId).eq('is_completed', false)
    .select(columns).maybeSingle();
  if (updated.error) throw updated.error;
  if (updated.data) return toProgress(updated.data);

  const existing = await client.from('learning_progress').select(columns)
    .eq('user_id', userId).eq('lesson_id', lessonId).single();
  if (existing.error) throw existing.error;
  if (!existing.data?.is_completed) throw new Error('Chưa xác nhận được tiến độ đã lưu. Vui lòng thử lại.');
  return { ...toProgress(existing.data), course_id: String(existing.data.course_id ?? courseId) };
}
