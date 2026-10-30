import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ExerciseItem, ExerciseType } from '../../types';
import {
  Dumbbell,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Award,
  ChevronRight,
  Zap,
} from 'lucide-react';

export const PracticeCenter: React.FC = () => {
  const { courses, user, markLessonComplete } = useAuth();
  const { t, lang } = useLanguage();

  // Aggregate all exercises across courses
  const allExercises = (courses || []).flatMap((c) =>
    (c.lessons || []).flatMap((l) =>
      (l.exercises || []).map((ex) => ({
        ...ex,
        courseTitle: lang === 'vi' ? (c.title_vi || c.title) : c.title,
        lessonTitle: lang === 'vi' ? (l.title_vi || l.title) : l.title,
        courseId: c.id,
        lessonId: l.id,
      }))
    )
  );

  const [filterType, setFilterType] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [reorderedWords, setReorderedWords] = useState<string[]>([]);

  const filteredExercises =
    filterType === 'all'
      ? allExercises
      : allExercises.filter((e) => e.type === filterType);

  const currentExercise = filteredExercises[currentIndex];

  const handleSelectOption = (opt: string) => {
    if (isSubmitted) return;
    setSelectedOption(opt);
  };

  const handleCheckAnswer = () => {
    if (!currentExercise || isSubmitted) return;
    setIsSubmitted(true);
    setAttemptedCount((a) => a + 1);

    if (currentExercise.type === 'multiple_choice' || currentExercise.type === 'fill_in_the_blank') {
      if (selectedOption === currentExercise.correct_answer) {
        setCorrectCount((c) => c + 1);
      }
    } else if (currentExercise.type === 'sentence_completion') {
      const sentence = reorderedWords.join(' ');
      if (sentence.trim().toLowerCase() === currentExercise.correct_answer.trim().toLowerCase()) {
        setCorrectCount((c) => c + 1);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredExercises.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
      setMatchedPairs([]);
      setSelectedLeft(null);
      setReorderedWords([]);
    } else {
      // Loop back or reset
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsSubmitted(false);
      setMatchedPairs([]);
      setSelectedLeft(null);
      setReorderedWords([]);
    }
  };

  const handleMatchSelect = (type: 'left' | 'right', id: string) => {
    if (type === 'left') {
      setSelectedLeft(id);
    } else if (type === 'right' && selectedLeft) {
      if (selectedLeft === id) {
        setMatchedPairs((prev) => [...prev, id]);
        setSelectedLeft(null);
        if (matchedPairs.length + 1 === currentExercise?.matching_pairs?.length) {
          setCorrectCount((c) => c + 1);
          setAttemptedCount((a) => a + 1);
          setIsSubmitted(true);
        }
      } else {
        setSelectedLeft(null);
      }
    }
  };

  const handleWordClick = (word: string) => {
    if (isSubmitted) return;
    setReorderedWords((prev) => [...prev, word]);
  };

  const handleWordRemove = (idx: number) => {
    if (isSubmitted) return;
    setReorderedWords((prev) => prev.filter((_, i) => i !== idx));
  };

  const filterTabs = [
    { id: 'all', label: lang === 'vi' ? 'Tất cả bài tập' : 'All Practice' },
    { id: 'multiple_choice', label: lang === 'vi' ? 'Trắc nghiệm' : 'Multiple Choice' },
    { id: 'vocab_matching', label: lang === 'vi' ? 'Ghép thẻ từ vựng' : 'Vocab Matching' },
    { id: 'sentence_completion', label: lang === 'vi' ? 'Sắp xếp câu' : 'Sentence Building' },
    { id: 'fill_in_the_blank', label: lang === 'vi' ? 'Điền vào chỗ trống' : 'Fill-in-the-blank' },
  ];

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-white">
      {/* Header */}
      <div className="max-w-2xl mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
          <Dumbbell className="w-4 h-4" />
          <span>{lang === 'vi' ? 'PHÒNG LUYỆN TẬP TƯƠNG TÁC' : 'INTERACTIVE PRACTICE LAB'}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">
          {lang === 'vi' ? 'Rèn Luyện Phản Xạ & Ghi Nhớ Sâu' : 'Active Retrieval & Reflex Drills'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2">
          {lang === 'vi'
            ? 'Củng cố ngữ pháp, từ vựng và tư duy phản xạ thông qua các dạng bài tập đa dạng.'
            : 'Strengthen grammar, lexical precision, and sentence syntax with immediate explanations.'}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-xl mb-8 overflow-x-auto">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilterType(tab.id);
              setCurrentIndex(0);
              setSelectedOption(null);
              setIsSubmitted(false);
              setMatchedPairs([]);
              setSelectedLeft(null);
              setReorderedWords([]);
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
              filterType === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">{lang === 'vi' ? 'Đã làm' : 'Attempted'}</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">{attemptedCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">{lang === 'vi' ? 'Chính xác' : 'Correct'}</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">{correctCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">{lang === 'vi' ? 'Độ chính xác' : 'Accuracy'}</p>
          <p className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
            {attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Main Interactive Exercise Box */}
      {currentExercise ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-emerald-400">{currentExercise.courseTitle}</span>
            <span className="font-mono tabular-nums">
              {currentIndex + 1} / {filteredExercises.length}
            </span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {lang === 'vi' ? currentExercise.prompt_vi : currentExercise.prompt_en}
            </h2>
            {lang === 'vi' && (
              <p className="text-xs text-slate-400 mt-1 italic">{currentExercise.prompt_en}</p>
            )}
          </div>

          {/* Options for MC & Fill in Blank */}
          {(currentExercise.type === 'multiple_choice' ||
            currentExercise.type === 'fill_in_the_blank') &&
            currentExercise.options && (
              <div className="space-y-2.5">
                {currentExercise.options.map((opt) => {
                  const isSelected = selectedOption === opt;
                  const isCorrect = opt === currentExercise.correct_answer;
                  let style = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800';

                  if (isSubmitted) {
                    if (isCorrect) {
                      style = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold';
                    } else if (isSelected && !isCorrect) {
                      style = 'bg-red-950/80 border-red-500 text-red-200';
                    } else {
                      style = 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-60';
                    }
                  } else if (isSelected) {
                    style = 'bg-emerald-600 border-emerald-500 text-white font-semibold';
                  }

                  return (
                    <button
                      key={opt}
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between ${style}`}
                    >
                      <span>{opt}</span>
                      {isSubmitted && isCorrect && (
                        <span className="text-xs font-bold text-emerald-400">✓ Correct</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

          {/* Vocab Matching */}
          {currentExercise.type === 'vocab_matching' && currentExercise.matching_pairs && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  {currentExercise.matching_pairs.map((p) => {
                    const isMatched = matchedPairs.includes(p.id);
                    const isSelected = selectedLeft === p.id;
                    return (
                      <button
                        key={`left-${p.id}`}
                        disabled={isMatched}
                        onClick={() => handleMatchSelect('left', p.id)}
                        className={`w-full p-3 rounded-xl border text-xs text-left transition-all font-semibold ${
                          isMatched
                            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400 opacity-60'
                            : isSelected
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                        }`}
                      >
                        {p.left}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {currentExercise.matching_pairs.map((p) => {
                    const isMatched = matchedPairs.includes(p.id);
                    return (
                      <button
                        key={`right-${p.id}`}
                        disabled={isMatched}
                        onClick={() => handleMatchSelect('right', p.id)}
                        className={`w-full p-3 rounded-xl border text-xs text-left transition-all ${
                          isMatched
                            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400 opacity-60'
                            : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {p.right}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sentence Completion */}
          {currentExercise.type === 'sentence_completion' && currentExercise.scrambled_words && (
            <div className="space-y-4">
              <div className="min-h-16 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap gap-2 items-center">
                {reorderedWords.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">
                    {lang === 'vi' ? 'Nhấp vào các từ bên dưới để ghép câu...' : 'Click words below to assemble sentence...'}
                  </span>
                ) : (
                  reorderedWords.map((w, idx) => (
                    <button
                      key={idx}
                      disabled={isSubmitted}
                      onClick={() => handleWordRemove(idx)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                    >
                      {w}
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {currentExercise.scrambled_words.map((w, idx) => {
                  const countUsed = reorderedWords.filter((rw) => rw === w).length;
                  const totalAvailable = currentExercise.scrambled_words?.filter((sw) => sw === w).length || 1;
                  const isExhausted = countUsed >= totalAvailable;

                  return (
                    <button
                      key={idx}
                      disabled={isExhausted || isSubmitted}
                      onClick={() => handleWordClick(w)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        isExhausted
                          ? 'bg-slate-800/40 border-slate-800 text-slate-600'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explanation */}
          {isSubmitted && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <p className="font-bold text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'vi' ? 'Giải thích:' : 'Explanation:'}</span>
              </p>
              <p className="text-slate-300 leading-relaxed">
                {lang === 'vi' ? currentExercise.explanation_vi : currentExercise.explanation_en}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            {!isSubmitted ? (
              <button
                onClick={handleCheckAnswer}
                disabled={
                  (currentExercise.type === 'multiple_choice' ||
                    currentExercise.type === 'fill_in_the_blank') &&
                  !selectedOption
                }
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {t.checkAnswer}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>{t.nextQuestion}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-xs">
          No exercises available in this category.
        </div>
      )}
    </div>
  );
};
