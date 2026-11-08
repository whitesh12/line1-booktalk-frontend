import { useParams, useSearchParams } from 'react-router-dom';
import { WORDS } from '../../data/content';
import { bookFor } from '../../lib/nav';

export const LOCAL_CSS = `
#sentence::placeholder{color:#7A8496}
.think-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:#1C7A6C;animation:thinkHop 1.3s ease-in-out infinite}
.think-spark{animation:thinkTw 1.7s ease-in-out infinite}
@keyframes thinkHop{0%,55%,100%{transform:translateY(0);opacity:.45}20%{transform:translateY(-8px);opacity:1}40%{transform:translateY(1px)}}
@keyframes thinkTw{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.8)}}
@media (prefers-reduced-motion:reduce){.think-dot,.think-spark{animation:none!important;opacity:1!important}}
`;
export const sparkPath = 'M12 2C12.8 8.5 15.5 11.2 22 12C15.5 12.8 12.8 15.5 12 22C11.2 15.5 8.5 12.8 2 12C8.5 11.2 11.2 8.5 12 2Z';
export const cardPad = { padding: '16px 18px' } as const;

export const DEMO_SENTENCE: Record<string, string> = {
  polish: '저는 가슴이 두근두근을 해요.',
  meaning: '아이가 넘어져서 두근두근 울었어요.',
  natural: '저는 선물을 열 때 마음이 두근두근해요.',
};

export function usePracticeWord() {
  const { wordId = 'dugeun' } = useParams();
  const [q] = useSearchParams();
  const w = WORDS[wordId] ?? WORDS.dugeun;
  return { w, qs: `?book=${bookFor(w.id, q.get('book')).id}`, demo: q.get('demo') };
}

export const DRAFT_KEY = 'booktalk.draft';
export const setDraft = (wordId: string, text: string | null) => {
  try { if (text === null) sessionStorage.removeItem(DRAFT_KEY); else sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ wordId, text })); } catch {}
};
export const readDraft = (wordId: string): string => {
  try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null'); return d?.wordId === wordId ? d.text : ''; } catch { return ''; }
};
