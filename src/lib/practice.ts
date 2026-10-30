export type PracticeStep = 'learn' | 'listen' | 'type' | 'speak' | 'review';
export interface PracticeSentence {
  english: string;
  vietnamese: string;
  position: number;
  ipa?: string;
  ipa_source?: string;
  pronunciation_focus: string;
  speaking_task: string;
  sample_response: string;
  review_prompt: string;
}
export interface Conversation {
  id: number;
  title: string;
  turns: string[][];
  challenge: string;
}
export interface PracticePack {
  title: string;
  title_vi: string;
  accent: string;
  sentences: PracticeSentence[];
  conversations: Conversation[];
  free_prompts: { english: string; vietnamese: string }[];
}

export function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-GB')
    .replace(/[’‘]/g, "'").replace(/[.,!?;:“”"()]/g, '').replace(/\s+/g, ' ').trim();
}

export async function loadPracticePack(courseTitle: string, lessonTitle: string): Promise<PracticePack | null> {
  if (!/Basic Communication A1/i.test(courseTitle)) return null;
  const library = await import('../data/practicePacks.json');
  return library.lessons.find(pack => pack.title === lessonTitle) as PracticePack | undefined || null;
}
