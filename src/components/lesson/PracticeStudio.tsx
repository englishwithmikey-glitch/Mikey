import React, { useEffect, useMemo, useState } from 'react';
import type { DbSentence } from '../../services/courseService';
import { loadPracticePack, normalizeAnswer, type PracticePack, type PracticeStep } from '../../lib/practice';
import { usePracticeSpeech } from './usePracticeSpeech';

const steps: [PracticeStep, string][] = [
  ['learn', '1. Học'], ['listen', '2. Nghe'], ['type', '3. Nghe & gõ'], ['speak', '4. Nói'], ['review', '5. Ôn tập'],
];
const button = 'rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm hover:border-emerald-400 disabled:opacity-40';
const primary = 'rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40';

interface Props {
  courseTitle: string;
  lessonTitle: string;
  scope: string;
  sentences: DbSentence[];
  index: number;
  onIndex: (index: number) => void;
  step: PracticeStep;
  onStep: (step: PracticeStep) => void;
  onComplete: () => Promise<void>;
  saving: boolean;
}

export default function PracticeStudio(props: Props) {
  const { sentences, index, step, onStep, onIndex } = props;
  const [pack, setPack] = useState<PracticePack | null>(null);
  const [packError, setPackError] = useState(false);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [speakingMode, setSpeakingMode] = useState<'sentence' | 'dialogue'>('sentence');
  const [slowRate, setSlowRate] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('ewm_slow_listening_rate'));
      return [0.35, 0.5, 0.65].includes(saved) ? saved : 0.5;
    } catch { return 0.5; }
  });
  useEffect(() => {
    try { localStorage.setItem('ewm_slow_listening_rate', String(slowRate)); } catch { /* Optional local preference. */ }
  }, [slowRate]);
  const sentence = sentences[index];
  const speech = usePracticeSpeech(`${props.scope}:${step}:${index}:${speakingMode}:${slowRate}`);
  const metadata = useMemo(() => pack?.sentences.find(item => normalizeAnswer(item.english) === normalizeAnswer(sentence?.english || '')), [pack, sentence]);

  useEffect(() => {
    let active = true;
    setPack(null); setPackError(false);
    loadPracticePack(props.courseTitle, props.lessonTitle).then(value => {
      if (active) setPack(value);
    }).catch(() => { if (active) setPackError(true); });
    return () => { active = false; };
  }, [props.courseTitle, props.lessonTitle]);
  useEffect(() => { setAnswer(''); setChecked(false); setRevealed(false); }, [index, step, props.scope]);

  function checkAnswer() {
    if (!sentence || !answer.trim()) return;
    const correct = normalizeAnswer(answer) === normalizeAnswer(sentence.english);
    setChecked(true); setResults(previous => ({ ...previous, [sentence.id]: correct }));
  }

  return (
    <section className="space-y-4" aria-label="Luyện tập 5 bước">
      <nav className="flex flex-wrap gap-2" aria-label="Các bước luyện tập">
        {steps.map(([id, label]) => <button key={id} onClick={() => onStep(id)} aria-pressed={step === id} className={step === id ? primary : button}>{label}</button>)}
      </nav>
      {['listen', 'type', 'speak'].includes(step) && <label className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
        Tốc độ nghe chậm
        <select aria-label="Tốc độ nghe chậm" value={slowRate} onChange={event => setSlowRate(Number(event.target.value))} className="rounded-xl border border-slate-600 bg-slate-800 p-2">
          <option value={0.35}>Rất chậm · 0,35</option>
          <option value={0.5}>Chậm · 0,5</option>
          <option value={0.65}>Hơi chậm · 0,65</option>
        </select>
      </label>}
      {['listen', 'type', 'speak'].includes(step) && <p className="text-xs text-slate-400">“Nghe chậm” giảm tốc độ cả câu. “Nghe tách từng từ” là chế độ riêng.</p>}
      {packError && <p role="alert" className="text-amber-300">Chưa tải được bộ hội thoại. Bạn vẫn có thể luyện các câu bên dưới; tải lại trang để thử lại.</p>}
      {step === 'learn' && metadata && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-2">
          <p className="text-amber-300">IPA: {sentence.ipa || metadata.ipa}</p>
          {metadata.ipa_source === 'espeak-ng-en-gb-auto' && <p className="text-xs text-slate-400">IPA tham khảo Anh–Anh tạo tự động; có thể khác giọng Mỹ đang nghe.</p>}
          <p className="text-sm text-emerald-200">{metadata.pronunciation_focus}</p>
        </div>
      )}
      {step !== 'learn' && sentence && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-5">
          <p className="text-emerald-300">Câu {index + 1} / {sentences.length} · Ưu tiên giọng Anh–Mỹ nếu thiết bị hỗ trợ</p>
          {step === 'listen' && <>
            <h2 className="text-xl font-bold">Nghe trước, mở câu sau</h2>
            <p className="text-slate-300">Nghe hai lần, chú ý từ được nhấn, sau đó nhắc lại.</p>
            <div className="flex flex-wrap gap-2">
              <button className={primary} onClick={() => speech.speak(sentence.english, 1, sentence.audio_url)}>Nghe câu</button>
              <button className={button} onClick={() => speech.speak(sentence.english, slowRate, sentence.audio_url)}>Nghe chậm</button>
              <button className={button} onClick={() => speech.speakWords(sentence.english, slowRate)}>Nghe tách từng từ</button>
              <button className={button} onClick={speech.stop}>Dừng nghe</button>
              <button className={button} onClick={() => setRevealed(value => !value)}>{revealed ? 'Ẩn câu' : 'Hiện câu & nghĩa'}</button>
            </div>
            {revealed && <div><p className="text-xl font-bold">{sentence.english}</p><p className="text-emerald-200">{sentence.vietnamese}</p></div>}
          </>}
          {step === 'type' && <>
            <h2 className="text-xl font-bold">Nghe và gõ lại câu</h2>
            <div className="flex flex-wrap gap-2">
              <button className={primary} onClick={() => speech.speak(sentence.english, 1, sentence.audio_url)}>Nghe câu</button>
              <button className={button} onClick={() => speech.speak(sentence.english, slowRate, sentence.audio_url)}>Nghe chậm</button>
              <button className={button} onClick={() => speech.speakWords(sentence.english, slowRate)}>Nghe tách từng từ</button>
              <button className={button} onClick={speech.stop}>Dừng nghe</button>
            </div>
            <label className="block" htmlFor="dictation-answer">Câu bạn nghe được</label>
            <textarea id="dictation-answer" value={answer} onChange={event => { setAnswer(event.target.value); setChecked(false); }} className="w-full rounded-xl border border-slate-600 bg-slate-950 p-3" autoComplete="off" spellCheck={false} />
            <button className={primary} disabled={!answer.trim()} onClick={checkAnswer}>Kiểm tra câu đã gõ</button>
            <p className="text-xs text-slate-400">Bỏ qua chữ hoa, dấu câu và khoảng trắng thừa; từ viết tắt được đối chiếu theo câu mẫu.</p>
            {checked && <div role="status" className="rounded-xl bg-slate-800 p-4">
              <p>{normalizeAnswer(answer) === normalizeAnswer(sentence.english) ? 'Đúng câu mẫu!' : 'Chưa khớp câu mẫu. Nghe lại và thử sửa nhé.'}</p>
              <p className="mt-2">Câu mẫu: {sentence.english}</p><p className="text-emerald-200">{sentence.vietnamese}</p>
            </div>}
          </>}
          {step === 'speak' && <>
            <div className="flex flex-wrap gap-2">
              <button className={speakingMode === 'sentence' ? primary : button} onClick={() => setSpeakingMode('sentence')}>Luyện từng câu</button>
              <button className={speakingMode === 'dialogue' ? primary : button} onClick={() => setSpeakingMode('dialogue')}>Hội thoại & đổi vai</button>
            </div>
            {speakingMode === 'sentence' ? <>
              <p className="text-xl font-bold">{sentence.english}</p>
              <p className="text-emerald-200">{metadata?.speaking_task || 'Nói câu này, rồi thay một thông tin khi phù hợp.'}</p>
              <div className="flex flex-wrap gap-2">
                <button className={button} onClick={() => speech.speak(sentence.english, 1, sentence.audio_url)}>Nghe mẫu</button>
                <button className={primary} disabled={speech.listening} onClick={speech.startRecognition}>Bật micro & nói</button>
                <button className={button} onClick={speech.stop}>Dừng</button>
              </div>
              <p className="text-xs text-slate-400">Chỉ bật micro khi bạn bấm nút. Trình duyệt có thể dùng dịch vụ nhận dạng trực tuyến. Bạn có thể tự nói mà không dùng micro.</p>
              {speech.transcript && <p role="status">Bản chép lời tự động: {speech.transcript}</p>}
              <button className={button} onClick={() => setRevealed(value => !value)}>Xem/ẩn câu trả lời gợi ý</button>
              {revealed && <p>{metadata?.sample_response || sentence.english}</p>}
            </> : <ConversationPractice key={props.scope} pack={pack} scope={props.scope} slowRate={slowRate} />}
            <p className="text-sm text-amber-200">Bản chép lời hỗ trợ tự đối chiếu, không phải điểm phát âm.</p>
          </>}
          {step === 'review' && <>
            <h2 className="text-xl font-bold">Nhìn nghĩa và tự nói tiếng Anh</h2>
            <p className="text-xl text-emerald-200">{sentence.vietnamese}</p>
            <p>{metadata?.review_prompt || 'Tự nói câu tiếng Anh, sau đó mở đáp án và đối chiếu.'}</p>
            <button className={button} onClick={() => setRevealed(value => !value)}>Xem/ẩn đáp án</button>
            {revealed && <p className="text-xl font-bold">{sentence.english}</p>}
            <p className="text-sm text-slate-300">Nghe & gõ trong phiên này: {Object.values(results).filter(Boolean).length} câu đúng / {Object.keys(results).length} câu đã kiểm tra.</p>
            <button className={primary} disabled={props.saving} onClick={() => { void props.onComplete(); }}>Hoàn thành & lưu bài học</button>
            <p className="text-xs text-slate-400">Nút hoàn thành lưu trạng thái bài học, không chứng nhận phát âm. Kết quả từng bước chỉ giữ trong phiên luyện này.</p>
          </>}
          {speech.listening && <p role="status" className="text-emerald-300">Đang nghe…</p>}
          {speech.message && <p role="status" className="text-amber-200">{speech.message}</p>}
          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-700 pt-4">
            <button className={button} disabled={index === 0} onClick={() => onIndex(index - 1)}>← Câu trước</button>
            <button className={button} disabled={index === sentences.length - 1} onClick={() => onIndex(index + 1)}>Câu tiếp →</button>
          </div>
        </div>
      )}
    </section>
  );
}

function ConversationPractice({ pack, scope, slowRate }: { pack: PracticePack | null; scope: string; slowRate: number }) {
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [mode, setMode] = useState<'guided' | 'roleplay' | 'free'>('guided');
  const [roleIndex, setRoleIndex] = useState(1);
  const [turn, setTurn] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const dialogue = pack?.conversations[dialogueIndex];
  const roles = [...new Set(dialogue?.turns.map(item => item[0]) || [])];
  const role = roles[roleIndex] || roles[0];
  const speech = usePracticeSpeech(`${scope}:${dialogueIndex}:${mode}:${role}:${turn}:${promptIndex}:${slowRate}`);
  if (!dialogue || !pack) return <p className="text-slate-300">Bài này chưa có bộ hội thoại. Bạn vẫn có thể luyện nói từng câu.</p>;
  const current = dialogue.turns[turn];
  const prompt = pack.free_prompts[promptIndex];
  function reset() { setTurn(0); setReveal(false); setNotes(''); }
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <label>Hội thoại<select className="mt-2 w-full rounded-xl bg-slate-800 p-3" value={dialogueIndex} onChange={event => { setDialogueIndex(Number(event.target.value)); setRoleIndex(1); reset(); }}>{pack.conversations.map((item, i) => <option value={i} key={item.id}>{item.title}</option>)}</select></label>
      <label>Vai của bạn<select className="mt-2 w-full rounded-xl bg-slate-800 p-3" value={roleIndex} onChange={event => { setRoleIndex(Number(event.target.value)); reset(); }}>{roles.map((item, i) => <option value={i} key={item}>{item}</option>)}</select></label>
    </div>
    <div className="flex flex-wrap gap-2">{([['guided', 'Có hướng dẫn'], ['roleplay', 'Ẩn lời thoại của bạn'], ['free', 'Nói tự do']] as const).map(([id, label]) => <button key={id} className={mode === id ? primary : button} onClick={() => { setMode(id); reset(); }}>{label}</button>)}</div>
    <p className="text-emerald-200">{dialogue.challenge}</p>
    {mode === 'free' && prompt ? <>
      <p className="text-xl font-bold">{prompt.english}</p><p>{prompt.vietnamese}</p>
      <p className="text-sm text-slate-300">Thử nói 45–60 giây bằng thông tin của bạn. Không cần đọc theo câu trả lời cố định.</p>
      <div className="flex flex-wrap gap-2">
        <button className={button} onClick={() => speech.speak(prompt.english)}>Nghe câu hỏi</button>
        <button className={primary} disabled={speech.listening} onClick={speech.startRecognition}>Nói câu trả lời của bạn</button>
        <button className={button} onClick={() => { setPromptIndex((promptIndex + 1) % pack.free_prompts.length); setNotes(''); }}>Câu hỏi tiếp</button>
      </div>
      <label className="block">Ghi chú câu trả lời (chỉ trong phiên này)<textarea value={notes} onChange={event => setNotes(event.target.value)} className="mt-2 w-full rounded-xl bg-slate-950 p-3" /></label>
    </> : <>
      <p role="status">Đã luyện {Math.min(turn, dialogue.turns.length)} / {dialogue.turns.length} lượt{current ? ` · Lượt của ${current[0] === role ? 'bạn' : current[0]}` : ' · Đã hết hội thoại'}</p>
      {dialogue.turns.map((item, i) => <div key={i} className={`rounded-xl border p-3 ${i === turn ? 'border-emerald-400' : 'border-slate-700'}`}>
        <strong>{item[0]}{item[0] === role ? ' · Bạn' : ''}</strong>
        {mode === 'roleplay' && item[0] === role && !reveal ? <p className="italic text-slate-400">Lời thoại đang ẩn. Hãy tự trả lời.</p> : <><p>{item[1]}</p><p className="text-sm text-emerald-200">{item[2]}</p></>}
      </div>)}
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={!current} onClick={() => speech.speak(current[1])}>Nghe lượt hiện tại</button>
        <button className={button} disabled={!current} onClick={() => speech.speak(current[1], slowRate)}>Nghe lượt chậm</button>
        <button className={button} disabled={!current} onClick={() => speech.speakWords(current[1], slowRate)}>Nghe lượt tách từ</button>
        <button className={primary} disabled={!current || current[0] !== role || speech.listening} onClick={speech.startRecognition}>Nói lượt của bạn</button>
        <button className={button} onClick={() => setReveal(value => !value)}>Hiện/ẩn lời thoại</button>
        <button className={primary} disabled={!current} onClick={() => setTurn(value => value + 1)}>Tôi đã luyện xong lượt này →</button>
        <button className={button} onClick={reset}>Bắt đầu lại</button>
      </div>
    </>}
    <button className={button} onClick={speech.stop}>Dừng âm thanh / micro</button>
    {speech.listening && <p role="status">Đang nghe…</p>}
    {speech.transcript && <p role="status">Bản chép lời tự động: {speech.transcript}</p>}
    {speech.message && <p role="status">{speech.message}</p>}
  </div>;
}
