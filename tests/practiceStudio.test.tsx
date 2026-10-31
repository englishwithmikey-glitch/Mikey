import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import PracticeStudio from '../src/components/lesson/PracticeStudio';
import { normalizeAnswer, type PracticeStep } from '../src/lib/practice';

const mock = vi.hoisted(() => ({ load: vi.fn(), complete: vi.fn() }));
vi.mock('../src/lib/practice', async importOriginal => ({
  ...await importOriginal<typeof import('../src/lib/practice')>(), loadPracticePack: mock.load,
}));
let root: Root;
let container: HTMLDivElement;
let recognition: any;
let utterances: any[];
const sentences = [
  { id: 's1', lesson_id: '3', english: 'My name is Anna.', vietnamese: 'Tôi tên là Anna.', audio_url: 'https://example.com/old-recording.mp3' },
  { id: 's2', lesson_id: '3', english: 'Nice to meet you.', vietnamese: 'Rất vui được gặp bạn.' },
];
function Studio() {
  const [step, onStep] = useState<PracticeStep>('learn');
  const [index, onIndex] = useState(0);
  return <PracticeStudio courseTitle="Basic Communication A1" lessonTitle="Lesson 1: Introducing Yourself" scope="user-1:lesson-1"
    sentences={sentences} index={index} onIndex={onIndex} step={step} onStep={onStep} saving={false} onComplete={mock.complete} />;
}
async function click(text: string) {
  const button = [...container.querySelectorAll('button')].find(item => item.textContent === text);
  expect(button, text).toBeDefined();
  await act(async () => button!.click());
}
async function type(text: string) {
  const textarea = container.querySelector('textarea')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  recognition = undefined; utterances = [];
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
  vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), getVoices: () => [], speak: (value: any) => utterances.push(value) });
  vi.stubGlobal('SpeechRecognition', undefined);
  vi.stubGlobal('webkitSpeechRecognition', undefined);
  mock.load.mockResolvedValue({
    title: 'Lesson 1: Introducing Yourself', title_vi: 'Giới thiệu', accent: 'en-GB',
    sentences: [{ ...sentences[0], position: 1, ipa: '/maɪ neɪm/', ipa_source: 'espeak-ng-en-gb-auto', pronunciation_focus: 'Nối âm name is.', speaking_task: 'Nói tên bạn.', sample_response: 'My name is Minh.', review_prompt: 'Hãy tự giới thiệu.' }],
    conversations: [{ id: 1, title: 'Meeting a classmate', challenge: 'Đổi tên và đổi vai.', turns: [
      ['Anna', 'What is your name?', 'Bạn tên gì?'], ['Minh', 'My name is Minh.', 'Tôi tên là Minh.'],
    ] }],
    free_prompts: [{ english: 'Where do you live?', vietnamese: 'Bạn sống ở đâu?' }],
  });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(<Studio />));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('shows five learning steps and identifies automatic IPA', () => {
  expect(container.querySelectorAll('nav button')).toHaveLength(5);
  expect(container.textContent).toContain('IPA tham khảo Anh–Anh tạo tự động');
});

it('hides listening answers until requested and plays slow American speech', async () => {
  await click('2. Nghe');
  expect(container.textContent).not.toContain(sentences[0].english);
  await click('Nghe chậm');
  expect(utterances[0]).toMatchObject({ text: 'My name is Anna.', rate: 0.5, lang: 'en-US' });
  await click('Hiện câu & nghĩa');
  expect(container.textContent).toContain(sentences[0].english);
  await click('Câu tiếp →');
  expect(container.textContent).not.toContain(sentences[1].english);
});

it('checks typed words, accepts case and punctuation differences, and resets per sentence', async () => {
  await click('3. Nghe & gõ');
  expect(container.querySelector('button[disabled]')?.textContent).toBe('Kiểm tra câu đã gõ');
  await type('MY NAME IS ANNA!'); await click('Kiểm tra câu đã gõ');
  expect(container.textContent).toContain('Đúng câu mẫu!');
  await click('Câu tiếp →'); expect(container.querySelector('textarea')?.value).toBe('');
  await type('Nice to see you'); await click('Kiểm tra câu đã gõ');
  expect(container.textContent).toContain('Chưa khớp câu mẫu');
  await click('5. Ôn tập');
  expect(container.textContent).toContain('1 câu đúng / 2 câu đã kiểm tra');
});

it('supports speaking without recognition and never claims a pronunciation score', async () => {
  await click('4. Nói'); await click('Bật micro & nói');
  expect(container.textContent).toContain('Trình duyệt này chưa hỗ trợ nhận dạng');
  expect(container.textContent).toContain('không phải điểm phát âm');
});

it('requests the mic only on click and discards results after navigating', async () => {
  vi.stubGlobal('SpeechRecognition', class {
    start = vi.fn(); abort = vi.fn();
    constructor() { recognition = this; }
  });
  await click('4. Nói'); expect(recognition).toBeUndefined();
  await click('Bật micro & nói');
  expect(recognition.start).toHaveBeenCalledOnce();
  expect(recognition.lang).toBe('en-US');
  await act(async () => recognition.onresult({ results: [[{ transcript: 'My name is Minh' }]] }));
  expect(container.textContent).toContain('Bản chép lời tự động: My name is Minh');
  const old = recognition;
  await click('Câu tiếp →'); expect(old.abort).toHaveBeenCalled();
  await act(async () => old.onresult({ results: [[{ transcript: 'stale result' }]] }));
  expect(container.textContent).not.toContain('stale result');
});

it('hides the learner script in roleplay, supports role changes and bounded completion', async () => {
  await click('4. Nói'); await click('Hội thoại & đổi vai'); await click('Ẩn lời thoại của bạn');
  expect(container.textContent).not.toContain('My name is Minh.');
  expect(container.textContent).toContain('What is your name?');
  const role = [...container.querySelectorAll('label')].find(label => label.textContent?.startsWith('Vai của bạn'))!.querySelector('select')!;
  await act(async () => { role.value = '0'; role.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(container.textContent).not.toContain('What is your name?');
  expect(container.textContent).toContain('My name is Minh.');
  await click('Tôi đã luyện xong lượt này →'); await click('Tôi đã luyện xong lượt này →');
  expect(container.textContent).toContain('Đã hết hội thoại');
  await click('Tôi đã luyện xong lượt này →');
  expect(container.textContent).toContain('Đã luyện 2 / 2 lượt');
  expect(mock.complete).not.toHaveBeenCalled();
});

it('supports free speaking prompts and explicit lesson completion from review', async () => {
  await click('4. Nói'); await click('Hội thoại & đổi vai'); await click('Nói tự do');
  expect(container.textContent).toContain('Where do you live?');
  await click('5. Ôn tập');
  expect(container.textContent).not.toContain(sentences[0].english);
  await click('Xem/ẩn đáp án'); expect(container.textContent).toContain(sentences[0].english);
  await click('Hoàn thành & lưu bài học'); expect(mock.complete).toHaveBeenCalledOnce();
});

it('keeps contractions distinct while normalizing smart apostrophes', () => {
  expect(normalizeAnswer('  I’m here! ')).toBe(normalizeAnswer("I'm here."));
  expect(normalizeAnswer('Im here')).not.toBe(normalizeAnswer("I'm here"));
});

it('keeps normal playback at 1 and applies the chosen very slow speed', async () => {
  await click('2. Nghe'); await click('Nghe câu');
  expect(utterances.at(-1).rate).toBe(1);
  const speed = container.querySelector('select[aria-label="Tốc độ nghe chậm"]') as HTMLSelectElement;
  await act(async () => { speed.value = '0.35'; speed.dispatchEvent(new Event('change', { bubbles: true })); });
  await click('Nghe chậm');
  expect(utterances.at(-1).rate).toBe(0.35);
  await click('4. Nói'); await click('Hội thoại & đổi vai'); await click('Nghe lượt chậm');
  expect(utterances.at(-1)).toMatchObject({ text: 'What is your name?', rate: 0.35 });
});

it('inserts a 600ms pause between words and cancels remaining words on stop', async () => {
  vi.useFakeTimers();
  await click('2. Nghe'); await click('Nghe tách từng từ');
  expect(utterances).toHaveLength(1);
  expect(utterances[0]).toMatchObject({ text: 'My', rate: 0.5 });
  await act(async () => { utterances[0].onend(); await vi.advanceTimersByTimeAsync(599); });
  expect(utterances).toHaveLength(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(utterances[1].text).toBe('name');
  await act(async () => { utterances[1].onend(); });
  await click('Dừng nghe');
  await act(async () => { await vi.runAllTimersAsync(); });
  expect(utterances).toHaveLength(2);
});

it('does not play old words after moving to a different sentence', async () => {
  vi.useFakeTimers();
  await click('2. Nghe'); await click('Nghe tách từng từ');
  const old = utterances[0];
  await act(async () => old.onend());
  await click('Câu tiếp →');
  await act(async () => { old.onend(); await vi.runAllTimersAsync(); });
  expect(utterances).toHaveLength(1);
});

it('uses standardized whole sentence audio even when a lesson has an old recording', async () => {
  const players: any[] = [];
  vi.stubGlobal('Audio', class {
    playbackRate = 1; preservesPitch = false;
    play = vi.fn().mockResolvedValue(undefined); pause = vi.fn();
    constructor(public src: string) { players.push(this); }
  });
  URL.createObjectURL = vi.fn().mockReturnValue('blob:sentence');
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['audio']) }));
  await click('2. Nghe'); await click('Nghe chậm');
  expect(players).toHaveLength(1);
  expect(players[0]).toMatchObject({ src: 'blob:sentence', playbackRate: 0.5, preservesPitch: true });
  expect(utterances).toHaveLength(0);
  expect(JSON.parse((fetch as any).mock.calls[0][1].body)).toEqual({ text: 'My name is Anna.' });
  await click('Câu tiếp →'); await click('Nghe chậm');
  expect(players[1].playbackRate).toBe(0.5);
  expect(JSON.parse((fetch as any).mock.calls[1][1].body)).toEqual({ text: 'Nice to meet you.' });
  await click('Dừng nghe'); expect(players[0].pause).toHaveBeenCalled();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:sentence');
});

it('discards generated audio when the learner has already stopped', async () => {
  let resolve: any;
  const create = vi.fn(); URL.createObjectURL = create;
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(done => { resolve = done; })));
  await click('2. Nghe'); await click('Nghe chậm'); await click('Dừng nghe');
  await act(async () => resolve({ ok: true, blob: async () => new Blob(['audio']) }));
  expect(create).not.toHaveBeenCalled(); expect(utterances).toHaveLength(0);
});

it('remembers the selected slow speed when opening another lesson', async () => {
  await click('2. Nghe');
  const speed = container.querySelector('select[aria-label="Tốc độ nghe chậm"]') as HTMLSelectElement;
  await act(async () => { speed.value = '0.35'; speed.dispatchEvent(new Event('change', { bubbles: true })); });
  await act(async () => root.render(<Studio key="another-lesson" />));
  await click('2. Nghe');
  expect((container.querySelector('select[aria-label="Tốc độ nghe chậm"]') as HTMLSelectElement).value).toBe('0.35');
});

it('selects an American browser voice ahead of an available British voice', async () => {
  const british = { lang: 'en-GB', name: 'Daniel' };
  const american = { lang: 'en-US', name: 'Samantha' };
  (speechSynthesis.getVoices as any) = () => [british, american];
  await click('2. Nghe'); await click('Nghe chậm');
  expect(utterances.at(-1).voice).toBe(american);
  await click('Nghe tách từng từ');
  expect(utterances.at(-1).voice).toBe(american);
});
