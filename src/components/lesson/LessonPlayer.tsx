import React, { useState, useEffect, useRef } from 'react';
import { DbCourse, DbLesson, DbSentence, fetchSupabaseSentences } from '../../services/courseService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ArrowLeft,
  Volume2,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Sliders,
  List,
  Layers,
  Award,
} from 'lucide-react';

import { Course, Lesson } from '../../types';
import type { PracticeStep } from '../../lib/practice';
import PracticeStudio from './PracticeStudio';
import { usePracticeSpeech } from './usePracticeSpeech';

interface LessonPlayerProps {
  course: DbCourse | Course;
  lesson: DbLesson | Lesson;
  onBack: () => void;
  onNextLesson?: () => void;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({
  course,
  lesson,
  onBack,
  onNextLesson,
}) => {
  const { user, markLessonComplete, isLessonCompleted } = useAuth();
  const { lang, t } = useLanguage();
  const isLocalLesson = 'sentences' in lesson;

  // State
  const [sentences, setSentences] = useState<DbSentence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Sentence Navigation State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [revealedCurrentCard, setRevealedCurrentCard] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'focus' | 'list'>('focus');
  const [practiceStep, setPracticeStep] = useState<PracticeStep>('learn');
  const playback = usePracticeSpeech(`${lesson.id}:${currentIndex}:${practiceStep}:${viewMode}`);
  const isPlayingAudio = playback.speaking;
  const [isCompletedState, setIsCompletedState] = useState<boolean>(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const activeLesson = useRef('');
  activeLesson.current = `${lesson.id}:${user?.id}`;
  useEffect(() => () => { activeLesson.current = ''; }, []);

  // Requirement 4: Fetch sentences from Supabase where lesson_id matches
  // Requirement 5: Sort sentences by sentence_order ascending
  const loadSentences = async () => {
    setLoading(true);
    setErrorMsg(null);
    setIsCompletedState(false);
    setPracticeStep('learn');
    setSaveError(null);
    setIsSavingProgress(false);
    savingRef.current = false;
    const { data, error } = isLocalLesson
      ? { data: lesson.sentences.map((sentence, index): DbSentence => ({
          id: sentence.id, lesson_id: lesson.id, english: sentence.en,
          vietnamese: sentence.vi, sentence_order: index + 1, context_of_use: sentence.context,
        })), error: null }
      : await fetchSupabaseSentences(lesson.id);
    setLoading(false);

    if (error) {
      setErrorMsg(error);
      setSentences([]);
    } else {
      setSentences(data);
      setCurrentIndex(0);
      setRevealedCurrentCard(false);
    }
  };

  useEffect(() => {
    if (lesson.id) {
      loadSentences();
    }
  }, [lesson.id]);

  const playAudio = (text: string, audioUrl?: string) => playback.speak(text, 1, audioUrl);

  // Requirement 8: Next sentence button
  const handleNext = async () => {
    if (!sentences.length || savingRef.current || isCompletedState) return;
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setRevealedCurrentCard(false);
      return;
    }
    await finishLesson();
  };

  const finishLesson = async () => {
    if (!sentences.length || savingRef.current || isCompletedState) return;
    const key = activeLesson.current;
    savingRef.current = true;
    setIsSavingProgress(true);
    setSaveError(null);
    try {
      if (!isLocalLesson) await markLessonComplete(course.id, lesson.id, 100, 50, sentences.length);
      if (activeLesson.current === key) setIsCompletedState(true);
    } catch (error: any) {
      if (activeLesson.current === key) setSaveError(error?.message || 'Không lưu được tiến độ. Vui lòng thử lại.');
    } finally {
      if (activeLesson.current === key) {
        savingRef.current = false;
        setIsSavingProgress(false);
      }
    }
  };

  // Requirement 9: Previous sentence button
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setRevealedCurrentCard(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target?.tagName) || target?.isContentEditable) return;
      if (viewMode !== 'focus' || practiceStep !== 'learn' || sentences.length === 0) return;
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ' && sentences[currentIndex]) {
        e.preventDefault();
        playAudio(sentences[currentIndex].english, sentences[currentIndex].audio_url);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, sentences, viewMode, practiceStep, isCompletedState, markLessonComplete]);

  const currentSentence = sentences[currentIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Sticky Navigation Bar */}
      <div className="sticky top-16 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Quay lại khóa học' : 'Back to Course'}</span>
        </button>

        <div className="text-center truncate max-w-md hidden sm:block">
          <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
            {course.title}
          </p>
          <h2 className="text-sm font-bold text-white truncate">{lesson.title}</h2>
        </div>

        {/* View mode toggle & translation toggle */}
        <div className="flex items-center gap-2">
          {/* Requirement 10: Toggle hide / show Vietnamese translations */}
          <button
            onClick={() => setShowTranslations((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              showTranslations
                ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={showTranslations ? 'Ẩn bản dịch tiếng Việt' : 'Hiện bản dịch tiếng Việt'}
          >
            {showTranslations ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden md:inline">
              {showTranslations ? 'Dịch nghĩa: Bật' : 'Dịch nghĩa: Tắt'}
            </span>
          </button>

          {/* Mode switch: Focus card vs Full list */}
          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('focus')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                viewMode === 'focus' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Luyện từng câu
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Danh sách ({sentences.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Lesson Header Banner */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              {course.level || 'A1'} · {isLocalLesson ? 'Bài học mẫu' : 'Supabase Curriculum'}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Tổng số: {sentences.length} mẫu câu
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-white">{lesson.title}</h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lesson.description || 'Luyện tập các mẫu câu tiếng Anh song ngữ với phát âm chuẩn.'}
          </p>

          {Boolean(('objectives' in lesson && lesson.objectives) || ('objectives_vi' in lesson && (lesson as any).objectives_vi?.length)) && (
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {'objectives' in lesson
                  ? lesson.objectives
                  : (lesson as any).objectives_vi?.join(' · ')}
              </span>
            </div>
          )}
        </div>

        {/* STATE 1: LOADING */}
        {loading && (
          <div className="p-16 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
            <p className="text-sm font-semibold text-white">
              Đang tải danh sách mẫu câu từ cơ sở dữ liệu Supabase...
            </p>
            <p className="text-xs text-slate-400 font-mono">
              Querying table: public.sentences where lesson_id = {lesson.id}
            </p>
          </div>
        )}

        {/* STATE 2: ERROR */}
        {!loading && errorMsg && (
          <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800 text-xs text-red-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-red-200">Lỗi khi tải mẫu câu từ Supabase</h3>
                <p className="font-mono text-red-300">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={loadSentences}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-600/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        )}

        {/* STATE 3: EMPTY */}
        {!loading && !errorMsg && sentences.length === 0 && (
          <div className="p-12 text-center bg-slate-900 border border-dashed border-slate-700 rounded-2xl space-y-3">
            <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">Chưa Có Mẫu Câu Nào Trong Bài Học Này</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Bảng <code>sentences</code> trong Supabase hiện chưa có mẫu câu nào liên kết với <code>lesson_id = {lesson.id}</code>.
            </p>
          </div>
        )}

        {playback.message && <p role="status" className="text-amber-200">{playback.message}</p>}
        {!loading && !errorMsg && sentences.length > 0 && viewMode === 'focus' && (
          <PracticeStudio
            key={`${lesson.id}:${user?.id}`}
            scope={`${lesson.id}:${user?.id}`}
            courseTitle={course.title}
            lessonTitle={lesson.title}
            sentences={sentences}
            index={currentIndex}
            onIndex={setCurrentIndex}
            step={practiceStep}
            onStep={setPracticeStep}
            onComplete={finishLesson}
            saving={isSavingProgress || isCompletedState}
          />
        )}
        {/* STATE 4: ACTIVE SENTENCE LEARNING (FOCUS MODE) */}
        {!loading && !errorMsg && sentences.length > 0 && viewMode === 'focus' && practiceStep === 'learn' && currentSentence && (
          <div className="space-y-6">
            {/* Progress indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-400 font-mono">
                  Câu {currentIndex + 1} / {sentences.length}
                </span>
                <span className="text-slate-400 font-mono">
                  {Math.round(((currentIndex + 1) / sentences.length) * 100)}% hoàn thành
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / sentences.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Main Interactive Sentence Card (Requirement 6, 7, 10) */}
            <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative space-y-6 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono font-bold text-sm flex items-center justify-center">
                    #{currentSentence.sentence_order ?? currentIndex + 1}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    Mẫu câu tiếng Anh thực hành
                  </span>
                </div>

                {/* Audio button with speech synthesis (Requirement 6, 7) */}
                <button
                  onClick={() => playAudio(currentSentence.english, currentSentence.audio_url)}
                  className={`p-3 rounded-2xl transition-all shadow-md flex items-center gap-2 ${
                    isPlayingAudio
                      ? 'bg-emerald-500 text-slate-950 scale-105 ring-2 ring-emerald-400 animate-pulse'
                      : 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white'
                  }`}
                  title="Nghe phát âm chuẩn tiếng Anh (Speech Synthesis)"
                >
                  <Volume2 className="w-6 h-6" />
                  <span className="text-xs font-bold hidden sm:inline">Phát Âm</span>
                </button>
              </div>

              {/* Large English Text */}
              <div className="space-y-2 pt-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-relaxed tracking-tight">
                  {currentSentence.english}
                </h3>

                {currentSentence.ipa && (
                  <p className="text-sm font-mono text-amber-300/90 tracking-wide">
                    {currentSentence.ipa}
                  </p>
                )}
              </div>

              {/* Vietnamese Translation with Show/Hide feature (Requirement 10) */}
              <div className="pt-4 border-t border-slate-800/80">
                {showTranslations || revealedCurrentCard ? (
                  <div className="space-y-1 animate-fadeIn">
                    <p className="text-base sm:text-lg font-semibold text-emerald-300">
                      → {currentSentence.vietnamese}
                    </p>
                    {!showTranslations && (
                      <button
                        onClick={() => setRevealedCurrentCard(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-300 underline"
                      >
                        (Ẩn lại dịch nghĩa)
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setRevealedCurrentCard(true)}
                    className="p-3 w-full rounded-xl bg-slate-950/70 border border-dashed border-slate-700 text-xs text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Bấm vào đây để xem bản dịch tiếng Việt (Kiểm tra phản xạ)</span>
                  </button>
                )}
              </div>

              {/* Linguistic Notes if present */}
              {(currentSentence.vocabulary_notes || currentSentence.grammar_explanation || currentSentence.context_of_use) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-slate-800/80 text-xs">
                  {currentSentence.vocabulary_notes && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <p className="font-bold text-emerald-400 text-[11px] uppercase">Từ Vựng Cần Nhớ:</p>
                      <p className="text-slate-300">{currentSentence.vocabulary_notes}</p>
                    </div>
                  )}
                  {currentSentence.grammar_explanation && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <p className="font-bold text-blue-400 text-[11px] uppercase">Cấu Trúc Ngữ Pháp:</p>
                      <p className="text-slate-300">{currentSentence.grammar_explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Controls: Previous / Next Buttons (Requirement 8 & 9) */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-5 py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Câu Trước (Previous)</span>
              </button>

              <div className="text-xs font-mono text-slate-400 hidden sm:block">
                Phím tắt: [←] Câu trước | [→] Câu sau | [Space] Nghe âm
              </div>

              <button
                onClick={handleNext}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20"
              >
                <span>{currentIndex === sentences.length - 1 ? 'Hoàn Thành Bài Học' : 'Câu Tiếp Theo (Next)'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Sentence Quick-Jump Bar (1 to 20 buttons) */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Chuyển nhanh đến câu số:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sentences.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentIndex(i);
                      setRevealedCurrentCard(false);
                    }}
                    className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                      currentIndex === i
                        ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STATE 5: FULL LIST MODE (All 20 Sentences) */}
        {!loading && !errorMsg && sentences.length > 0 && viewMode === 'list' && (
          <div className="space-y-3">
            {sentences.map((s, idx) => (
              <div
                key={s.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  currentIndex === idx
                    ? 'bg-slate-900 border-emerald-500 shadow-md'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <span className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                    #{s.sentence_order ?? idx + 1}
                  </span>

                  <div className="space-y-1">
                    <p className="text-base font-bold text-white">{s.english}</p>
                    {s.ipa && (
                      <span className="text-xs font-mono text-amber-300 mr-2">{s.ipa}</span>
                    )}
                    {showTranslations ? (
                      <p className="text-xs text-slate-300 font-medium">→ {s.vietnamese}</p>
                    ) : (
                      <p className="text-xs text-slate-500 italic">(Bản dịch đang được ẩn)</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => playAudio(s.english, s.audio_url)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
                    title="Nghe câu"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setCurrentIndex(idx);
                      setViewMode('focus');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
                  >
                    Luyện tập câu này
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isSavingProgress && <p role="status" className="text-center text-emerald-300">{lang === 'vi' ? 'Đang lưu tiến độ…' : 'Saving progress…'}</p>}
        {saveError && (
          <div role="alert" className="p-4 rounded-xl border border-red-800 text-red-200 space-y-3">
            <p>{saveError}</p>
            <button onClick={handleNext} disabled={isSavingProgress} className="underline">
              {lang === 'vi' ? 'Thử lưu lại' : 'Retry saving'}
            </button>
          </div>
        )}

        {/* Celebration Banner when completed all sentences */}
        {isCompletedState && (
          <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-600 text-center space-y-3 animate-fadeIn">
            <Award className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">
              Chúc mừng! Bạn đã hoàn thành toàn bộ {sentences.length} mẫu câu của bài học!
            </h3>
            <p className="text-xs text-emerald-200 max-w-md mx-auto">
              {isLocalLesson ? 'Bạn đã hoàn thành bài học mẫu. Bài này không đồng bộ tiến độ hoặc cộng XP vào tài khoản.' : user?.id.startsWith('guest-') ? 'Tiến độ trải nghiệm đã được lưu trên trình duyệt này.' : 'Tiến độ của bạn đã được lưu vào tài khoản.'}
            </p>
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsCompletedState(false);
              }}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
            >
              Luyện tập lại bài học này
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
