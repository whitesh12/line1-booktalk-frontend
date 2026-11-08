// 백엔드(Spring) API 연결 계층.
// VITE_API_BASE_URL 이 비어 있으면 모든 함수가 모의 응답을 돌려줘서 화면만으로 시연할 수 있다.
// 명세: backend/docs/backend.history/03-API-명세.md (응답은 { data, meta } 형식)
import type { Profile } from '../store/profile';
import type { Word } from '../data/content';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const USE_MOCK = BASE === '';

const TOKEN_KEY = 'booktalk.token';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? `요청 실패 (${res.status})`);
  return body.data as T;
}

/* ── 인증과 아이 ── */
const RELATION = { 엄마: 'MOTHER', 아빠: 'FATHER', 보호자: 'GUARDIAN' } as const;
const LANGUAGE = { vi: 'VI', zh: 'ZH_CN', en: 'EN' } as const;

export async function registerProfile(p: Profile): Promise<string | undefined> {
  if (USE_MOCK) return undefined;
  const deviceId = localStorage.getItem('booktalk.device') ?? crypto.randomUUID();
  localStorage.setItem('booktalk.device', deviceId);
  const auth = await request<{ accessToken: string }>('/auth/guest', {
    method: 'POST', body: JSON.stringify({ deviceId, locale: p.lang }),
  });
  localStorage.setItem(TOKEN_KEY, auth.accessToken);
  const child = await request<{ id: string }>('/children', {
    method: 'POST',
    body: JSON.stringify({
      nickname: p.childName, age: p.childAge,
      relationship: RELATION[p.relation], explanationLanguage: LANGUAGE[p.lang],
    }),
  });
  return child.id;
}

/* ── 문장 연습 (E-1 → E-2 → E-3 / E-3-1 / E-4) ── */
export type FeedbackKind = 'natural' | 'polish' | 'meaning' | 'missing';
export interface SentenceFeedback {
  kind: FeedbackKind;
  original: string;
  suggested?: string;
  wrongPart?: string;
  goodPoint?: string;
  explain?: string; // 뜻 다시 보기(E-3-1)에서 이 문장에 맞춘 설명. 없으면 단어의 nuance
  tips: string[];
}

// 받침 여부로 을/를을 고르는 등, 모의 응답을 그럴듯하게 만들기 위한 아주 단순한 규칙이다.
export function mockSentenceFeedback(word: Word, sentence: string): SentenceFeedback {
  const s = sentence.trim();
  const stem = word.text.split(' ')[0];
  if (!s.includes(stem)) {
    return { kind: 'missing', original: s, tips: [`문장에 ‘${word.text}’이 아직 없어요.`, '어디에 넣으면 좋을지 한 번 더 써 볼까요?'] };
  }
  if (word.id === 'dugeun' && /울|눈물/.test(s)) {
    return {
      kind: 'meaning', original: s, wrongPart: word.text,
      goodPoint: '아이가 넘어져서 운 상황을 아주 잘 설명했어요.',
      explain: '우는 모습이 아니라, 설레거나 긴장해서 마음이 콩콩 뛸 때 써요.',
      tips: ['크게 소리 내어 우는 모양을 나타내는 말은 무엇일까요? 이 그림책에서 함께 배웠어요.',
        '아니면 ‘두근두근’이 어울리는 순간으로 다시 써 봐도 좋아요. 선물을 열기 전처럼요.'],
    };
  }
  const wrong = new RegExp(`${stem}(을|를|이|가)\\s*(해|하)`);
  const m = s.match(wrong);
  if (m) {
    return {
      kind: 'polish', original: s, wrongPart: m[0].replace(/\s*(해|하)$/, ''),
      suggested: s.replace(wrong, `${stem}$2`),
      tips: [`뜻은 정확해요! ‘${word.text}’을 상황에 맞게 잘 골랐어요.`, `‘${stem}해요’라고 이어서 말하면 더 자연스러워요.`],
    };
  }
  return { kind: 'natural', original: s, tips: [] };
}

export async function checkSentence(word: Word, sentence: string, childId?: string): Promise<SentenceFeedback> {
  if (USE_MOCK || !childId) {
    await wait(1400);
    return mockSentenceFeedback(word, sentence);
  }
  // 백엔드 표현 id는 페이지 분석 결과에서 받아와야 한다. 지금은 데모 데이터 id를 그대로 넘긴다.
  const r = await request<{ assessment: string; meaningDelivered: boolean; targetWordUsed: boolean;
    originalSentence: string; suggestedSentence: string; feedback: string; highlights: { text: string }[] }>(
    `/children/${childId}/sentence-practices`,
    { method: 'POST', body: JSON.stringify({ vocabularyId: word.id, sentence, inputMethod: 'TEXT' }) },
  );
  const kind: FeedbackKind = !r.targetWordUsed ? 'missing' : !r.meaningDelivered ? 'meaning'
    : r.suggestedSentence && r.suggestedSentence !== r.originalSentence ? 'polish' : 'natural';
  return { kind, original: r.originalSentence, suggested: r.suggestedSentence, wrongPart: r.highlights?.[0]?.text, tips: [r.feedback] };
}

/* ── 아이와 대화 (F-2 ~ F-5) ── */
export interface ChildReply { text: string; feedback?: { tips: string[] } }

const OPENERS = ['토끼가 당근을 보고 가슴이 콩닥콩닥할 것 같아!'];
export const openingLine = () => OPENERS[0];

const SCRIPT = ['근데 두근두근이 뭐야?', '나도 생일 선물 받을 때 그랬어!', '내일 소풍 가는 것도 두근두근해!'];

export const childScript = (turn: number) => SCRIPT[Math.min(turn, SCRIPT.length - 1)];
export const talkFeedbackTips = (word: Word) => {
  const stem = word.text.split(' ')[0];
  return ['뜻은 정확해요! 상황에 맞는 표현을 잘 골랐어요.', `‘${stem}해’라고 이어서 말하면 더 자연스러워요.`];
};

export async function sendToChild(word: Word, text: string, turn: number): Promise<ChildReply> {
  await wait(1300);
  const stem = word.text.split(' ')[0];
  const wrong = new RegExp(`${stem}(을|를)\\s*(해|하)`);
  if (wrong.test(text)) {
    return { text: '응? 다시 말해 줘!', feedback: { tips: talkFeedbackTips(word) } };
  }
  return { text: childScript(turn) };
}
export const MAX_TURNS = 4;
