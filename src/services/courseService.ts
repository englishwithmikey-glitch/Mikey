import { getSupabaseClient } from '../lib/supabase';

export type CourseLevelCEFR = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type CourseCategoryType =
  | 'Pronunciation'
  | 'Communication'
  | 'Grammar'
  | 'IELTS'
  | 'TOEIC';
export type ContentStatus = 'Draft' | 'Published';
export type AccessTier = 'Free' | 'Premium';

export interface DbCourse {
  id: string;
  title: string;
  description: string;
  level: string;
  category?: CourseCategoryType;
  tier?: AccessTier;
  status?: ContentStatus;
  thumbnail_url?: string;
  teacher_id?: string;
  created_at?: string;
  updated_at?: string;
  // Computed / parsed extra info
  lessons_count?: number;
}

export interface DbLesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  lesson_order?: number;
  order_index?: number;
  content?: string;
  objectives?: string;
  video_url?: string;
  audio_url?: string;
  status?: ContentStatus;
  created_at?: string;
  updated_at?: string;
  // Computed
  sentences_count?: number;
}

export interface DbSentence {
  id: string;
  lesson_id: string;
  english: string;
  vietnamese: string;
  sentence_order?: number;
  order_index?: number;
  ipa?: string;
  vocabulary_notes?: string;
  grammar_explanation?: string;
  context_of_use?: string;
  audio_url?: string;
  created_at?: string;
}

export interface DbLearningProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id?: string;
  is_completed: boolean;
  score?: number;
  completed_at?: string;
  updated_at?: string;
  // Joined or resolved
  user_email?: string;
  user_full_name?: string;
  lesson_title?: string;
  course_title?: string;
}

export interface CourseInput {
  title: string;
  description: string;
  level: CourseLevelCEFR;
  category: CourseCategoryType;
  tier: AccessTier;
  status: ContentStatus;
  thumbnail_url?: string;
}

export interface LessonInput {
  course_id: string;
  title: string;
  description: string;
  content?: string;
  objectives?: string;
  video_url?: string;
  audio_url?: string;
  order_index?: number;
  status?: ContentStatus;
}

export interface SentenceInput {
  lesson_id: string;
  english: string;
  vietnamese: string;
  ipa?: string;
  vocabulary_notes?: string;
  grammar_explanation?: string;
  context_of_use?: string;
  audio_url?: string;
  order_index?: number;
}

// ---------------------------------------------------------------------------
// Adaptor Helpers: Encode / Decode extended metadata for backward compatibility
// When the database only has base columns (title, description, level), extended
// fields are safely encoded in description as a clean JSON footer so data is never lost.
// When migration SQL is applied, native columns take precedence!
// ---------------------------------------------------------------------------

const META_PREFIX = '/*--EWM_META:';
const META_SUFFIX = ':EWM_META--*/';

function packMetadata(text: string, meta: Record<string, any>): string {
  const json = JSON.stringify(meta);
  const clean = (text || '').replace(/\/\*--EWM_META:[\s\S]*?:EWM_META--\*\//g, '').trim();
  return `${clean}\n\n${META_PREFIX}${json}${META_SUFFIX}`.trim();
}

function unpackMetadata(text: string): { cleanText: string; meta: Record<string, any> } {
  if (!text) return { cleanText: '', meta: {} };
  const regex = /\/\*--EWM_META:([\s\S]*?):EWM_META--\*\//;
  const match = text.match(regex);
  if (match && match[1]) {
    try {
      const meta = JSON.parse(match[1]);
      const cleanText = text.replace(regex, '').trim();
      return { cleanText, meta };
    } catch {
      return { cleanText: text, meta: {} };
    }
  }
  return { cleanText: text, meta: {} };
}

// Global cached flag whether extended columns exist in the active database
let hasCheckedColumns = false;
let coursesHasExtendedCols = false;
let lessonsHasExtendedCols = false;
let sentencesHasExtendedCols = false;
let progressHasExtendedCols = false;

export async function detectTableColumns() {
  const client = getSupabaseClient();
  if (!client) {
    return {
      courses: { extended: false, cols: ['id', 'title', 'description', 'level', 'created_at'] },
      lessons: { extended: false, cols: ['id', 'course_id', 'title', 'description', 'created_at'] },
      sentences: { extended: false, cols: ['id', 'lesson_id', 'english', 'vietnamese', 'created_at'] },
      learning_progress: { extended: false, cols: ['id', 'user_id', 'lesson_id', 'is_completed', 'updated_at'] },
    };
  }

  try {
    // Check courses
    const { error: cErr } = await client.from('courses').select('category, tier, status').limit(0);
    coursesHasExtendedCols = !cErr;

    // Check lessons
    const { error: lErr } = await client.from('lessons').select('content, objectives, video_url').limit(0);
    lessonsHasExtendedCols = !lErr;

    // Check sentences
    const { error: sErr } = await client.from('sentences').select('ipa, vocabulary_notes').limit(0);
    sentencesHasExtendedCols = !sErr;

    // Check progress
    const { error: pErr } = await client.from('learning_progress').select('score, course_id').limit(0);
    progressHasExtendedCols = !pErr;

    hasCheckedColumns = true;
  } catch {
    // Keep fallback
  }

  return {
    courses: {
      extended: coursesHasExtendedCols,
      cols: coursesHasExtendedCols
        ? ['id', 'title', 'description', 'level', 'category', 'tier', 'status', 'thumbnail_url', 'created_at']
        : ['id', 'title', 'description', 'level', 'created_at'],
    },
    lessons: {
      extended: lessonsHasExtendedCols,
      cols: lessonsHasExtendedCols
        ? ['id', 'course_id', 'title', 'description', 'content', 'objectives', 'video_url', 'audio_url', 'order_index', 'status', 'created_at']
        : ['id', 'course_id', 'title', 'description', 'created_at'],
    },
    sentences: {
      extended: sentencesHasExtendedCols,
      cols: sentencesHasExtendedCols
        ? ['id', 'lesson_id', 'english', 'vietnamese', 'ipa', 'vocabulary_notes', 'grammar_explanation', 'context_of_use', 'created_at']
        : ['id', 'lesson_id', 'english', 'vietnamese', 'created_at'],
    },
    learning_progress: {
      extended: progressHasExtendedCols,
      cols: progressHasExtendedCols
        ? ['id', 'user_id', 'lesson_id', 'course_id', 'is_completed', 'score', 'completed_at', 'updated_at']
        : ['id', 'user_id', 'lesson_id', 'is_completed', 'updated_at'],
    },
  };
}

// ---------------------------------------------------------------------------
// 1. COURSES CRUD
export interface QueryResult<T> {
  data: T;
  error: string | null;
  errorCode?: string | null;
  errorHint?: string | null;
  httpStatus?: number | null;
}

// ---------------------------------------------------------------------------
// 1. COURSES CRUD
// ---------------------------------------------------------------------------

export async function fetchSupabaseCourses(): Promise<QueryResult<DbCourse[]>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Supabase client chưa được cấu hình hoặc thiếu API Key.', errorCode: 'NO_CLIENT' };
  }

  try {
    // Attempt query ordered by id ascending (guaranteed primary key, e.g. ID = 1)
    let { data, error, status } = await client
      .from('courses')
      .select('*')
      .order('id', { ascending: true });

    // Fallback if ordering by id fails with undefined column (42703)
    if (error && error.code === '42703') {
      const fallback = await client.from('courses').select('*');
      data = fallback.data;
      error = fallback.error;
      status = fallback.status;
    }

    if (error) {
      return {
        data: [],
        error: `[PostgreSQL ${error.code || 'ERR'}]: ${error.message}`,
        errorCode: error.code || null,
        errorHint: error.hint || null,
        httpStatus: status || null,
      };
    }

    if (!data) return { data: [], error: null };

    // Parse records and map metadata
    const parsed: DbCourse[] = data.map((row) => {
      const { cleanText, meta } = unpackMetadata(row.description || '');
      return {
        id: String(row.id),
        title: row.title || '',
        description: cleanText,
        level: (row.level || meta.level || 'B1') as CourseLevelCEFR,
        category: (row.category || meta.category || 'Communication') as CourseCategoryType,
        tier: (row.tier || meta.tier || 'Free') as AccessTier,
        status: (row.status || meta.status || 'Published') as ContentStatus,
        thumbnail_url: row.thumbnail_url || meta.thumbnail_url || '',
        teacher_id: row.teacher_id || meta.teacher_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return { data: parsed, error: null };
  } catch (err: any) {
    return {
      data: [],
      error: err?.message || 'Lỗi mạng khi tải danh sách khóa học.',
      errorCode: 'NETWORK_ERR',
    };
  }
}

export async function createSupabaseCourse(
  input: CourseInput
): Promise<{ data: DbCourse | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Chưa có phiên kết nối Supabase hợp lệ.' };
  }

  try {
    if (!hasCheckedColumns) {
      await detectTableColumns();
    }

    let payload: Record<string, any>;
    if (coursesHasExtendedCols) {
      payload = {
        title: input.title,
        description: input.description,
        level: input.level,
        category: input.category,
        tier: input.tier,
        status: input.status,
        thumbnail_url: input.thumbnail_url || null,
      };
    } else {
      // Pack into description for base schema
      const packedDesc = packMetadata(input.description, {
        category: input.category,
        tier: input.tier,
        status: input.status,
        thumbnail_url: input.thumbnail_url,
      });
      payload = {
        title: input.title,
        description: packedDesc,
        level: input.level,
      };
    }

    // Try insert
    const { data, error } = await client.from('courses').insert([payload]).select().single();

    if (error) {
      // If error is column missing, fallback to packed payload
      if (error.code === '42703' && coursesHasExtendedCols) {
        coursesHasExtendedCols = false;
        const fallbackDesc = packMetadata(input.description, {
          category: input.category,
          tier: input.tier,
          status: input.status,
          thumbnail_url: input.thumbnail_url,
        });
        const { data: retryData, error: retryErr } = await client
          .from('courses')
          .insert([{ title: input.title, description: fallbackDesc, level: input.level }])
          .select()
          .single();

        if (retryErr) {
          return { data: null, error: `[PostgreSQL ${retryErr.code}]: ${retryErr.message}` };
        }
        return {
          data: {
            id: retryData.id,
            title: retryData.title,
            description: input.description,
            level: input.level,
            category: input.category,
            tier: input.tier,
            status: input.status,
            thumbnail_url: input.thumbnail_url,
            created_at: retryData.created_at,
          },
          error: null,
        };
      }
      return { data: null, error: `[PostgreSQL ${error.code || 'ERR'}]: ${error.message}` };
    }

    return {
      data: {
        id: data.id,
        title: data.title,
        description: input.description,
        level: input.level,
        category: input.category,
        tier: input.tier,
        status: input.status,
        thumbnail_url: input.thumbnail_url,
        created_at: data.created_at,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Ngoại lệ khi tạo khóa học trên Supabase.' };
  }
}

export async function updateSupabaseCourse(
  id: string,
  input: Partial<CourseInput>
): Promise<{ data: DbCourse | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Chưa có kết nối Supabase.' };
  }

  try {
    let payload: Record<string, any> = {};

    if (coursesHasExtendedCols) {
      if (input.title !== undefined) payload.title = input.title;
      if (input.description !== undefined) payload.description = input.description;
      if (input.level !== undefined) payload.level = input.level;
      if (input.category !== undefined) payload.category = input.category;
      if (input.tier !== undefined) payload.tier = input.tier;
      if (input.status !== undefined) payload.status = input.status;
      if (input.thumbnail_url !== undefined) payload.thumbnail_url = input.thumbnail_url;
    } else {
      if (input.title !== undefined) payload.title = input.title;
      if (input.level !== undefined) payload.level = input.level;
      if (input.description !== undefined || input.category || input.tier || input.status || input.thumbnail_url) {
        payload.description = packMetadata(input.description || '', {
          category: input.category,
          tier: input.tier,
          status: input.status,
          thumbnail_url: input.thumbnail_url,
        });
      }
    }

    const { data, error } = await client.from('courses').update(payload).eq('id', id).select().single();

    if (error) {
      return { data: null, error: `[PostgreSQL ${error.code}]: ${error.message}` };
    }

    return {
      data: {
        id: data.id,
        title: data.title,
        description: input.description || data.description,
        level: (input.level || data.level) as CourseLevelCEFR,
        category: input.category || data.category || 'Communication',
        tier: input.tier || data.tier || 'Free',
        status: input.status || data.status || 'Published',
        thumbnail_url: input.thumbnail_url || data.thumbnail_url,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Lỗi khi cập nhật khóa học.' };
  }
}

export async function deleteSupabaseCourse(id: string): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Chưa có kết nối Supabase.' };
  }

  try {
    const { error } = await client.from('courses').delete().eq('id', id);
    if (error) {
      return { success: false, error: `[PostgreSQL ${error.code}]: ${error.message}` };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi khi xóa khóa học.' };
  }
}

// ---------------------------------------------------------------------------
// 2. LESSONS CRUD
// ---------------------------------------------------------------------------

export async function fetchSupabaseLessons(
  courseId?: string
): Promise<QueryResult<DbLesson[]>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Chưa có kết nối Supabase.', errorCode: 'NO_CLIENT' };
  }

  try {
    let query = client.from('lessons').select('*');
    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    // Try ordering by lesson_order ascending (schema column)
    let { data, error, status } = await query.order('lesson_order', { ascending: true });

    // Fallback if lesson_order column does not exist (42703)
    if (error && (error.code === '42703' || error.message?.includes('lesson_order'))) {
      let retryQuery = client.from('lessons').select('*');
      if (courseId) retryQuery = retryQuery.eq('course_id', courseId);
      const retryRes = await retryQuery.order('id', { ascending: true });
      if (retryRes.error && retryRes.error.code === '42703') {
        let plainQuery = client.from('lessons').select('*');
        if (courseId) plainQuery = plainQuery.eq('course_id', courseId);
        const plainRes = await plainQuery;
        data = plainRes.data;
        error = plainRes.error;
        status = plainRes.status;
      } else {
        data = retryRes.data;
        error = retryRes.error;
        status = retryRes.status;
      }
    }

    if (error) {
      return {
        data: [],
        error: `[PostgreSQL ${error.code || 'ERR'}]: ${error.message}`,
        errorCode: error.code || null,
        errorHint: error.hint || null,
        httpStatus: status || null,
      };
    }

    const parsed: DbLesson[] = (data || []).map((row) => {
      const { cleanText, meta } = unpackMetadata(row.description || '');
      const order = row.lesson_order ?? row.order_index ?? meta.lesson_order ?? meta.order_index ?? 1;
      return {
        id: String(row.id),
        course_id: String(row.course_id),
        title: row.title || '',
        description: cleanText,
        lesson_order: order,
        order_index: order,
        content: row.content || meta.content || '',
        objectives: row.objectives || meta.objectives || '',
        video_url: row.video_url || meta.video_url || '',
        audio_url: row.audio_url || meta.audio_url || '',
        status: (row.status || meta.status || 'Published') as ContentStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    // Requirement 3: Sort lessons by lesson_order ascending
    parsed.sort((a, b) => (a.lesson_order ?? a.order_index ?? 0) - (b.lesson_order ?? b.order_index ?? 0));

    return { data: parsed, error: null };
  } catch (err: any) {
    return {
      data: [],
      error: err?.message || 'Lỗi khi lấy danh sách bài học.',
      errorCode: 'NETWORK_ERR',
    };
  }
}

export async function createSupabaseLesson(
  input: LessonInput
): Promise<{ data: DbLesson | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Chưa có kết nối Supabase.' };
  }

  try {
    if (!hasCheckedColumns) await detectTableColumns();

    let payload: Record<string, any>;
    if (lessonsHasExtendedCols) {
      payload = {
        course_id: input.course_id,
        title: input.title,
        description: input.description,
        content: input.content || null,
        objectives: input.objectives || null,
        video_url: input.video_url || null,
        audio_url: input.audio_url || null,
        order_index: input.order_index ?? 1,
        status: input.status || 'Published',
      };
    } else {
      const packedDesc = packMetadata(input.description, {
        content: input.content,
        objectives: input.objectives,
        video_url: input.video_url,
        audio_url: input.audio_url,
        order_index: input.order_index ?? 1,
        status: input.status || 'Published',
      });
      payload = {
        course_id: input.course_id,
        title: input.title,
        description: packedDesc,
      };
    }

    const { data, error } = await client.from('lessons').insert([payload]).select().single();

    if (error) {
      if (error.code === '42703' && lessonsHasExtendedCols) {
        lessonsHasExtendedCols = false;
        const fallbackDesc = packMetadata(input.description, {
          content: input.content,
          objectives: input.objectives,
          video_url: input.video_url,
          audio_url: input.audio_url,
          order_index: input.order_index,
          status: input.status,
        });
        const { data: retryData, error: retryErr } = await client
          .from('lessons')
          .insert([{ course_id: input.course_id, title: input.title, description: fallbackDesc }])
          .select()
          .single();

        if (retryErr) {
          return { data: null, error: `[PostgreSQL ${retryErr.code}]: ${retryErr.message}` };
        }
        return {
          data: {
            id: retryData.id,
            course_id: input.course_id,
            title: retryData.title,
            description: input.description,
            content: input.content,
            objectives: input.objectives,
            video_url: input.video_url,
            audio_url: input.audio_url,
            order_index: input.order_index,
            status: input.status,
            created_at: retryData.created_at,
          },
          error: null,
        };
      }
      return { data: null, error: `[PostgreSQL ${error.code}]: ${error.message}` };
    }

    return {
      data: {
        id: data.id,
        course_id: data.course_id,
        title: data.title,
        description: input.description,
        content: input.content,
        objectives: input.objectives,
        video_url: input.video_url,
        audio_url: input.audio_url,
        order_index: input.order_index ?? 1,
        status: input.status || 'Published',
        created_at: data.created_at,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Lỗi khi tạo bài học.' };
  }
}

export async function updateSupabaseLesson(
  id: string,
  input: Partial<LessonInput>
): Promise<{ data: DbLesson | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Chưa có kết nối Supabase.' };
  }

  try {
    let payload: Record<string, any> = {};
    if (lessonsHasExtendedCols) {
      if (input.title !== undefined) payload.title = input.title;
      if (input.description !== undefined) payload.description = input.description;
      if (input.content !== undefined) payload.content = input.content;
      if (input.objectives !== undefined) payload.objectives = input.objectives;
      if (input.video_url !== undefined) payload.video_url = input.video_url;
      if (input.audio_url !== undefined) payload.audio_url = input.audio_url;
      if (input.order_index !== undefined) payload.order_index = input.order_index;
      if (input.status !== undefined) payload.status = input.status;
    } else {
      if (input.title !== undefined) payload.title = input.title;
      if (input.description !== undefined || input.content || input.objectives || input.video_url || input.status) {
        payload.description = packMetadata(input.description || '', {
          content: input.content,
          objectives: input.objectives,
          video_url: input.video_url,
          audio_url: input.audio_url,
          order_index: input.order_index,
          status: input.status,
        });
      }
    }

    const { data, error } = await client.from('lessons').update(payload).eq('id', id).select().single();
    if (error) {
      return { data: null, error: `[PostgreSQL ${error.code}]: ${error.message}` };
    }

    return {
      data: {
        id: data.id,
        course_id: data.course_id,
        title: data.title,
        description: input.description || data.description,
        content: input.content || data.content,
        objectives: input.objectives || data.objectives,
        video_url: input.video_url || data.video_url,
        audio_url: input.audio_url || data.audio_url,
        order_index: input.order_index ?? data.order_index,
        status: input.status || data.status,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Lỗi khi cập nhật bài học.' };
  }
}

export async function deleteSupabaseLesson(id: string): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Chưa có kết nối Supabase.' };
  }

  try {
    const { error } = await client.from('lessons').delete().eq('id', id);
    if (error) {
      return { success: false, error: `[PostgreSQL ${error.code}]: ${error.message}` };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi khi xóa bài học.' };
  }
}

// ---------------------------------------------------------------------------
// 3. SENTENCES CRUD
// ---------------------------------------------------------------------------

export async function fetchSupabaseSentences(
  lessonId?: string
): Promise<QueryResult<DbSentence[]>> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: 'Chưa có kết nối Supabase.', errorCode: 'NO_CLIENT' };
  }

  try {
    let query = client.from('sentences').select('*');
    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    // Try ordering by sentence_order ascending (schema column)
    let { data, error, status } = await query.order('sentence_order', { ascending: true });

    // Fallback if sentence_order column does not exist (42703)
    if (error && (error.code === '42703' || error.message?.includes('sentence_order'))) {
      let retryQuery = client.from('sentences').select('*');
      if (lessonId) retryQuery = retryQuery.eq('lesson_id', lessonId);
      const retryRes = await retryQuery.order('id', { ascending: true });
      if (retryRes.error && retryRes.error.code === '42703') {
        let plainQuery = client.from('sentences').select('*');
        if (lessonId) plainQuery = plainQuery.eq('lesson_id', lessonId);
        const plainRes = await plainQuery;
        data = plainRes.data;
        error = plainRes.error;
        status = plainRes.status;
      } else {
        data = retryRes.data;
        error = retryRes.error;
        status = retryRes.status;
      }
    }

    if (error) {
      return {
        data: [],
        error: `[PostgreSQL ${error.code || 'ERR'}]: ${error.message}`,
        errorCode: error.code || null,
        errorHint: error.hint || null,
        httpStatus: status || null,
      };
    }

    const parsed: DbSentence[] = (data || []).map((row) => {
      const { cleanText, meta } = unpackMetadata(row.vietnamese || '');
      const order = row.sentence_order ?? row.order_index ?? meta.sentence_order ?? meta.order_index ?? 1;
      return {
        id: String(row.id),
        lesson_id: String(row.lesson_id),
        english: row.english || '',
        vietnamese: cleanText,
        sentence_order: order,
        order_index: order,
        ipa: row.ipa || meta.ipa || '',
        vocabulary_notes: row.vocabulary_notes || meta.vocabulary_notes || '',
        grammar_explanation: row.grammar_explanation || meta.grammar_explanation || '',
        context_of_use: row.context_of_use || meta.context_of_use || '',
        audio_url: row.audio_url || meta.audio_url || '',
        created_at: row.created_at,
      };
    });

    // Requirement 5: Sort sentences by sentence_order ascending
    parsed.sort((a, b) => (a.sentence_order ?? a.order_index ?? 0) - (b.sentence_order ?? b.order_index ?? 0));

    return { data: parsed, error: null };
  } catch (err: any) {
    return {
      data: [],
      error: err?.message || 'Lỗi khi lấy danh sách mẫu câu.',
      errorCode: 'NETWORK_ERR',
    };
  }
}

export async function createSupabaseSentence(
  input: SentenceInput
): Promise<{ data: DbSentence | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Chưa có kết nối Supabase.' };
  }

  try {
    if (!hasCheckedColumns) await detectTableColumns();

    let payload: Record<string, any>;
    if (sentencesHasExtendedCols) {
      payload = {
        lesson_id: input.lesson_id,
        english: input.english,
        vietnamese: input.vietnamese,
        ipa: input.ipa || null,
        vocabulary_notes: input.vocabulary_notes || null,
        grammar_explanation: input.grammar_explanation || null,
        context_of_use: input.context_of_use || null,
        audio_url: input.audio_url || null,
        order_index: input.order_index ?? 1,
      };
    } else {
      const packedVi = packMetadata(input.vietnamese, {
        ipa: input.ipa,
        vocabulary_notes: input.vocabulary_notes,
        grammar_explanation: input.grammar_explanation,
        context_of_use: input.context_of_use,
        audio_url: input.audio_url,
        order_index: input.order_index ?? 1,
      });
      payload = {
        lesson_id: input.lesson_id,
        english: input.english,
        vietnamese: packedVi,
      };
    }

    const { data, error } = await client.from('sentences').insert([payload]).select().single();

    if (error) {
      if (error.code === '42703' && sentencesHasExtendedCols) {
        sentencesHasExtendedCols = false;
        const fallbackVi = packMetadata(input.vietnamese, {
          ipa: input.ipa,
          vocabulary_notes: input.vocabulary_notes,
          grammar_explanation: input.grammar_explanation,
          context_of_use: input.context_of_use,
        });
        const { data: retryData, error: retryErr } = await client
          .from('sentences')
          .insert([{ lesson_id: input.lesson_id, english: input.english, vietnamese: fallbackVi }])
          .select()
          .single();

        if (retryErr) {
          return { data: null, error: `[PostgreSQL ${retryErr.code}]: ${retryErr.message}` };
        }
        return {
          data: {
            id: retryData.id,
            lesson_id: input.lesson_id,
            english: input.english,
            vietnamese: input.vietnamese,
            ipa: input.ipa,
            vocabulary_notes: input.vocabulary_notes,
            grammar_explanation: input.grammar_explanation,
            context_of_use: input.context_of_use,
            created_at: retryData.created_at,
          },
          error: null,
        };
      }
      return { data: null, error: `[PostgreSQL ${error.code}]: ${error.message}` };
    }

    return {
      data: {
        id: data.id,
        lesson_id: data.lesson_id,
        english: data.english,
        vietnamese: input.vietnamese,
        ipa: input.ipa,
        vocabulary_notes: input.vocabulary_notes,
        grammar_explanation: input.grammar_explanation,
        context_of_use: input.context_of_use,
        created_at: data.created_at,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Lỗi khi thêm mẫu câu.' };
  }
}

export async function updateSupabaseSentence(
  id: string,
  input: Partial<SentenceInput>
): Promise<{ data: DbSentence | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Chưa có kết nối Supabase.' };
  }

  try {
    let payload: Record<string, any> = {};
    if (sentencesHasExtendedCols) {
      if (input.english !== undefined) payload.english = input.english;
      if (input.vietnamese !== undefined) payload.vietnamese = input.vietnamese;
      if (input.ipa !== undefined) payload.ipa = input.ipa;
      if (input.vocabulary_notes !== undefined) payload.vocabulary_notes = input.vocabulary_notes;
      if (input.grammar_explanation !== undefined) payload.grammar_explanation = input.grammar_explanation;
      if (input.context_of_use !== undefined) payload.context_of_use = input.context_of_use;
    } else {
      if (input.english !== undefined) payload.english = input.english;
      if (input.vietnamese !== undefined || input.ipa || input.vocabulary_notes || input.grammar_explanation) {
        payload.vietnamese = packMetadata(input.vietnamese || '', {
          ipa: input.ipa,
          vocabulary_notes: input.vocabulary_notes,
          grammar_explanation: input.grammar_explanation,
          context_of_use: input.context_of_use,
        });
      }
    }

    const { data, error } = await client.from('sentences').update(payload).eq('id', id).select().single();
    if (error) {
      return { data: null, error: `[PostgreSQL ${error.code}]: ${error.message}` };
    }

    return {
      data: {
        id: data.id,
        lesson_id: data.lesson_id,
        english: data.english,
        vietnamese: input.vietnamese || data.vietnamese,
        ipa: input.ipa || data.ipa,
        vocabulary_notes: input.vocabulary_notes || data.vocabulary_notes,
        grammar_explanation: input.grammar_explanation || data.grammar_explanation,
        context_of_use: input.context_of_use || data.context_of_use,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Lỗi khi cập nhật mẫu câu.' };
  }
}

export async function deleteSupabaseSentence(id: string): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Chưa có kết nối Supabase.' };
  }

  try {
    const { error } = await client.from('sentences').delete().eq('id', id);
    if (error) {
      return { success: false, error: `[PostgreSQL ${error.code}]: ${error.message}` };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi khi xóa mẫu câu.' };
  }
}

// ---------------------------------------------------------------------------
// 4. LEARNING PROGRESS READ
// ---------------------------------------------------------------------------

export async function fetchSupabaseLearningProgress(): Promise<
  QueryResult<DbLearningProgress[]> & { count: number }
> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], count: 0, error: 'Chưa có kết nối Supabase.', errorCode: 'NO_CLIENT' };
  }

  try {
    let { data, error, count, status } = await client
      .from('learning_progress')
      .select('*', { count: 'exact' });

    if (error) {
      return {
        data: [],
        count: 0,
        error: `[PostgreSQL ${error.code || 'ERR'}]: ${error.message}`,
        errorCode: error.code || null,
        errorHint: error.hint || null,
        httpStatus: status || null,
      };
    }

    const parsed: DbLearningProgress[] = (data || []).map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      lesson_id: String(row.lesson_id),
      course_id: row.course_id ? String(row.course_id) : undefined,
      is_completed: Boolean(row.is_completed),
      score: row.score !== undefined && row.score !== null ? Number(row.score) : 100,
      completed_at: row.completed_at,
      updated_at: row.updated_at,
    }));

    return { data: parsed, count: count ?? parsed.length, error: null };
  } catch (err: any) {
    return {
      data: [],
      count: 0,
      error: err?.message || 'Lỗi khi lấy tiến độ học viên.',
      errorCode: 'NETWORK_ERR',
    };
  }
}

// ---------------------------------------------------------------------------
// 4b. LIVE USER STATS CALCULATION (STRICT: NO HARDCODED STREAK / XP)
// ---------------------------------------------------------------------------

export async function fetchLiveUserStats(userId: string): Promise<{
  profile: any | null;
  streakDays: number;
  xpPoints: number;
  membershipTier: 'free' | 'premium';
  completedLessonsCount: number;
}> {
  const client = getSupabaseClient();
  if (!client || !userId) {
    return {
      profile: null,
      streakDays: 0,
      xpPoints: 0,
      membershipTier: 'free',
      completedLessonsCount: 0,
    };
  }

  try {
    // 1. Fetch profile from public.profiles
    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 2. Fetch learning_progress for this user
    const { data: progressRows } = await client
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId);

    let xpPoints = 0;
    let completedCount = 0;
    const activeDates = new Set<string>();

    if (progressRows && progressRows.length > 0) {
      for (const row of progressRows) {
        if (row.is_completed) {
          completedCount += 1;
          const score = row.score !== undefined && row.score !== null ? Number(row.score) : 100;
          xpPoints += Math.max(10, Math.round(score));
        }
        const dateStr = row.completed_at || row.updated_at;
        if (dateStr) {
          try {
            const d = new Date(dateStr).toISOString().split('T')[0];
            activeDates.add(d);
          } catch {
            // ignore date format error
          }
        }
      }
    }

    // Calculate real consecutive streak from activity records
    let streakDays = 0;
    if (activeDates.size > 0) {
      const today = new Date();
      let checkDate = new Date(today);
      const todayStr = checkDate.toISOString().split('T')[0];
      if (!activeDates.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      while (true) {
        const dStr = checkDate.toISOString().split('T')[0];
        if (activeDates.has(dStr)) {
          streakDays += 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // If profile had explicit streak or xp stored and progress has 0, use profile's value or 0
    if (xpPoints === 0 && profile?.xp_points) {
      xpPoints = Number(profile.xp_points) || 0;
    }
    if (streakDays === 0 && profile?.streak_days) {
      streakDays = Number(profile.streak_days) || 0;
    }

    const tier: 'free' | 'premium' = profile?.membership_tier === 'premium' ? 'premium' : 'free';

    return {
      profile,
      streakDays,
      xpPoints,
      membershipTier: tier,
      completedLessonsCount: completedCount,
    };
  } catch (err) {
    console.warn('Error computing live user stats from Supabase:', err);
    return {
      profile: null,
      streakDays: 0,
      xpPoints: 0,
      membershipTier: 'free',
      completedLessonsCount: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// 5. SEED CURRICULUM: Basic Communication A1 -> Lesson 1 -> 20 Sentences
// ---------------------------------------------------------------------------

export const A1_INTRO_SENTENCES = [
  { en: 'Hello, my name is Mikey.', vi: 'Xin chào, tên tôi là Mikey.', ipa: '/həˈloʊ maɪ neɪm ɪz ˈmaɪki/' },
  { en: 'Nice to meet you.', vi: 'Rất vui được gặp bạn.', ipa: '/naɪs tuː miːt juː/' },
  { en: 'I am from Vietnam.', vi: 'Tôi đến từ Việt Nam.', ipa: '/aɪ æm frəm ˌvjɛtˈnɑːm/' },
  { en: 'Where are you from?', vi: 'Bạn đến từ đâu?', ipa: '/wɛər ɑːr juː frəm/' },
  { en: 'I live in Hanoi.', vi: 'Tôi sống ở Hà Nội.', ipa: '/aɪ lɪv ɪn hɑːˈnɔɪ/' },
  { en: 'How are you doing today?', vi: 'Hôm nay bạn thế nào?', ipa: '/haʊ ɑːr juː ˈduːɪŋ təˈdeɪ/' },
  { en: 'I am doing well, thank you.', vi: 'Tôi khỏe, cảm ơn bạn.', ipa: '/aɪ æm ˈduːɪŋ wɛl θæŋk juː/' },
  { en: 'What is your job?', vi: 'Công việc của bạn là gì?', ipa: '/wʌt ɪz jʊər dʒɒb/' },
  { en: 'I am an English teacher.', vi: 'Tôi là một giáo viên tiếng Anh.', ipa: '/aɪ æm ən ˈɪŋɡlɪʃ ˈtiːtʃər/' },
  { en: 'I am a student at university.', vi: 'Tôi là sinh viên đại học.', ipa: '/aɪ æm ə ˈstjuːdənt æt ˌjuːnɪˈvɜːrsəti/' },
  { en: 'How old are you?', vi: 'Bạn bao nhiêu tuổi?', ipa: '/haʊ oʊld ɑːr juː/' },
  { en: 'I am twenty-five years old.', vi: 'Tôi hai mươi lăm tuổi.', ipa: '/aɪ æm ˈtwɛnti faɪv jɪərz oʊld/' },
  { en: 'What are your hobbies?', vi: 'Sở thích của bạn là gì?', ipa: '/wʌt ɑːr jʊər ˈhɒbiz/' },
  { en: 'I like listening to music and reading books.', vi: 'Tôi thích nghe nhạc và đọc sách.', ipa: '/aɪ laɪk ˈlɪsənɪŋ tuː ˈmjuːzɪk ænd ˈriːdɪŋ bʊks/' },
  { en: 'Can you speak English?', vi: 'Bạn có nói được tiếng Anh không?', ipa: '/kæn juː spiːk ˈɪŋɡlɪʃ/' },
  { en: 'Yes, I can speak a little English.', vi: 'Vâng, tôi có thể nói một chút tiếng Anh.', ipa: '/jɛs aɪ kæn spiːk ə ˈlɪtəl ˈɪŋɡlɪʃ/' },
  { en: 'I am learning English to improve my communication.', vi: 'Tôi đang học tiếng Anh để nâng cao khả năng giao tiếp.', ipa: '/aɪ æm ˈlɜːrnɪŋ ˈɪŋɡlɪʃ tuː ɪmˈpruːv maɪ kəˌmjuːnɪˈkeɪʃən/' },
  { en: 'It is a pleasure to meet you.', vi: 'Thật vinh hạnh được gặp bạn.', ipa: '/ɪt ɪz ə ˈplɛʒər tuː miːt juː/' },
  { en: 'Have a great day ahead!', vi: 'Chúc bạn một ngày tuyệt vời phía trước!', ipa: '/hæv ə ɡreɪt deɪ əˈhɛd/' },
  { en: 'Goodbye and see you again soon!', vi: 'Tạm biệt và hẹn sớm gặp lại bạn!', ipa: '/ɡʊdˈbaɪ ænd siː juː əˈɡɛn suːn/' },
];

export async function seedA1CurriculumToSupabase(): Promise<{ success: boolean; message: string; courseId?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Chưa có kết nối Supabase client.' };
  }

  try {
    // 1. Create or find Course: Basic Communication A1
    const { data: existingCourses } = await client.from('courses').select('id, title').ilike('title', '%Basic Communication A1%').limit(1);
    let courseId = existingCourses && existingCourses.length > 0 ? existingCourses[0].id : null;

    if (!courseId) {
      const courseRes = await createSupabaseCourse({
        title: 'Basic Communication A1',
        description: 'Khóa học tiếng Anh giao tiếp A1 cơ bản cho người mới bắt đầu. Nắm vững phát âm, cấu trúc chào hỏi và tự tin giới thiệu bản thân.',
        level: 'A1',
        category: 'Communication',
        tier: 'Free',
        status: 'Published',
        thumbnail_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
      });
      if (courseRes.error || !courseRes.data) {
        return { success: false, message: `Không thể tạo khóa học: ${courseRes.error}` };
      }
      courseId = courseRes.data.id;
    }

    // 2. Create or find Lesson 1: Introducing Yourself
    const { data: existingLessons } = await client.from('lessons').select('id, title').eq('course_id', courseId).ilike('title', '%Introducing Yourself%').limit(1);
    let lessonId = existingLessons && existingLessons.length > 0 ? existingLessons[0].id : null;

    if (!lessonId) {
      const lessonRes = await createSupabaseLesson({
        course_id: courseId,
        title: 'Lesson 1: Introducing Yourself',
        description: '20 mẫu câu cốt lõi giúp bạn tự tin giới thiệu họ tên, quê quán, nghề nghiệp, độ tuổi và sở thích bằng tiếng Anh chuẩn xác.',
        content: 'Bài học tập trung vào 20 mẫu câu tiếng Anh giao tiếp căn bản nhất khi làm quen. Hãy lắng nghe phát âm và luyện nói theo từng câu.',
        objectives: 'Nắm vững 20 câu giao tiếp giới thiệu bản thân, tự tin phản xạ khi gặp người nước ngoài.',
        order_index: 1,
        status: 'Published',
      });
      if (lessonRes.error || !lessonRes.data) {
        return { success: false, message: `Không thể tạo bài học: ${lessonRes.error}` };
      }
      lessonId = lessonRes.data.id;
    }

    // 3. Check existing sentences
    const { data: existingSentences } = await client.from('sentences').select('id').eq('lesson_id', lessonId);
    if (!existingSentences || existingSentences.length < 20) {
      for (let i = 0; i < A1_INTRO_SENTENCES.length; i++) {
        const item = A1_INTRO_SENTENCES[i];
        await createSupabaseSentence({
          lesson_id: lessonId,
          english: item.en,
          vietnamese: item.vi,
          ipa: item.ipa,
          order_index: i + 1,
          context_of_use: 'Giao tiếp hàng ngày khi làm quen và giới thiệu bản thân',
        });
      }
    }

    return {
      success: true,
      message: 'Khởi tạo thành công khóa học "Basic Communication A1" với "Lesson 1: Introducing Yourself" và 20 mẫu câu song ngữ trực tiếp trên Supabase!',
      courseId,
    };
  } catch (err: any) {
    return { success: false, message: `Lỗi: ${err?.message || 'Không xác định'}` };
  }
}

