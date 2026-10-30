import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { LessonPlayer } from '../src/components/lesson/LessonPlayer';
import { LanguageProvider } from '../src/context/LanguageContext';

const mock = vi.hoisted(() => ({ save: vi.fn(), sentences: vi.fn() }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({
  user: { id: 'student' }, markLessonComplete: mock.save, isLessonCompleted: () => false,
}) }));
vi.mock('../src/services/courseService', () => ({ fetchSupabaseSentences: mock.sentences }));

let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  mock.sentences.mockResolvedValue({ data: [{ id: '1', english: 'Hello', vietnamese: 'Xin chào' }], error: null });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<LanguageProvider><LessonPlayer
    course={{ id: '3', level: 'A1' } as any}
    lesson={{ id: '7', title: 'Introductions' } as any}
    onBack={vi.fn()}
  /></LanguageProvider>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
function button(text: string) {
  const element = [...container.querySelectorAll('button')].find(item => item.textContent?.includes(text));
  expect(element).toBeDefined();
  return element!;
}

it('shows completion only after persistence succeeds and guards repeated clicks', async () => {
  let finish: () => void;
  mock.save.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  await act(async () => { button('Hoàn Thành Bài Học').click(); button('Hoàn Thành Bài Học').click(); });
  expect(mock.save).toHaveBeenCalledTimes(1);
  expect(mock.save).toHaveBeenCalledWith('3', '7', 100, 50, 1);
  expect(container.querySelector('[role="status"]')).not.toBeNull();
  expect(container.textContent).not.toContain('Chúc mừng!');
  await act(async () => { finish!(); });
  expect(container.textContent).toContain('Chúc mừng!');
  expect(container.textContent).toContain('đã được lưu vào tài khoản');
});

it('shows save errors and supports retry without claiming success', async () => {
  mock.save.mockRejectedValueOnce(new Error('permission denied')).mockResolvedValue(undefined);
  await act(async () => button('Hoàn Thành Bài Học').click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('permission denied');
  expect(container.textContent).not.toContain('Chúc mừng!');
  await act(async () => button('Thử lưu lại').click());
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.textContent).toContain('Chúc mừng!');
});

it('plays embedded sample lessons without sending string IDs to Supabase', async () => {
  mock.sentences.mockClear();
  await act(async () => root.render(<LanguageProvider><LessonPlayer
    course={{ id: 'course-gen', level: 'Beginner' } as any}
    lesson={{ id: 'lesson-gen-1', title: 'Sample', sentences: [{ id: 's1', en: 'Sample sentence', vi: 'Câu mẫu' }] } as any}
    onBack={vi.fn()}
  /></LanguageProvider>));
  expect(container.textContent).toContain('Sample sentence');
  expect(mock.sentences).not.toHaveBeenCalled();
  await act(async () => button('Hoàn Thành Bài Học').click());
  expect(mock.save).not.toHaveBeenCalled();
  expect(container.textContent).toContain('không đồng bộ tiến độ hoặc cộng XP');
});

it('does not navigate or complete the lesson while typing an answer', async () => {
  const typingTab = [...container.querySelectorAll('button')].find(button => button.textContent === '3. Nghe & gõ')!;
  await act(async () => typingTab.click());
  const textarea = container.querySelector('textarea')!;
  const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  await act(async () => {
    textarea.dispatchEvent(space);
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  });
  expect(space.defaultPrevented).toBe(false);
  expect(mock.save).not.toHaveBeenCalled();
});
