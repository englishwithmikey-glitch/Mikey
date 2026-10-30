export type UserRole = 'student' | 'teacher';
export type MembershipTier = 'free' | 'premium';
export type Language = 'en' | 'vi';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  membership_tier: MembershipTier;
  avatar_url?: string;
  created_at?: string;
  streak_days: number;
  xp_points: number;
  target_goal?: string; // e.g., 'IELTS 7.0', 'Conversational Fluency'
  current_level?: 'Beginner' | 'Elementary' | 'Intermediate' | 'Upper-Intermediate' | 'Advanced';
}

export type CourseCategory = 'general' | 'communication' | 'ielts' | 'toeic';
export type CourseLevel = 'Beginner' | 'Elementary' | 'Intermediate' | 'Upper-Intermediate' | 'Advanced';

export interface VocabularyItem {
  id: string;
  word: string;
  phonetic: string;
  part_of_speech: string;
  meaning_vi: string;
  meaning_en: string;
  example_en: string;
  example_vi: string;
  collocation?: string;
  audio_text?: string;
}

export interface GrammarPoint {
  id: string;
  title: string;
  title_vi: string;
  explanation_en: string;
  explanation_vi: string;
  formula?: string;
  examples: Array<{
    en: string;
    vi: string;
  }>;
}

export interface SentenceItem {
  id: string;
  en: string;
  vi: string;
  context?: string;
  audio_cue?: string;
}

export type ExerciseType =
  | 'multiple_choice'
  | 'fill_in_the_blank'
  | 'vocab_matching'
  | 'sentence_completion'
  | 'grammar_practice';

export interface ExerciseItem {
  id: string;
  type: ExerciseType;
  prompt_en: string;
  prompt_vi: string;
  options?: string[]; // for multiple_choice
  correct_answer: string; // for MC, fill in blank, or sentence completion
  explanation_en: string;
  explanation_vi: string;
  matching_pairs?: Array<{
    id: string;
    left: string; // English
    right: string; // Vietnamese
  }>;
  scrambled_words?: string[]; // for sentence completion
}

export interface Lesson {
  id: string;
  course_id: string;
  order_index: number;
  title: string;
  title_vi: string;
  description: string;
  description_vi: string;
  tier: MembershipTier;
  duration_mins: number;
  xp_reward: number;
  objectives_en: string[];
  objectives_vi: string[];
  vocabulary: VocabularyItem[];
  grammar_points: GrammarPoint[];
  sentences: SentenceItem[];
  exercises: ExerciseItem[];
}

export interface Course {
  id: string;
  title: string;
  title_vi: string;
  description: string;
  description_vi: string;
  category: CourseCategory;
  level: CourseLevel;
  tier: MembershipTier;
  duration_hours: number;
  lesson_count: number;
  enrolled_count: number;
  rating: number;
  banner_gradient: string;
  accent_color: string;
  objectives_en: string[];
  objectives_vi: string[];
  lessons: Lesson[];
}

export interface LearningProgress {
  user_id: string;
  course_id: string;
  lesson_id: string;
  completed: boolean;
  score: number;
  xp_earned: number;
  last_studied_at: string;
}
