import type { Profile } from '../store/profile';
import type { Word } from '../data/content';
import { serverVocabId, type ScanExpression } from '../data/scanned';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const USE_MOCK = BASE === '';

const TOKEN_KEY = 'booktalk.token';
const REFRESH_KEY = 'booktalk.refresh';
const DEVICE_KEY = 'booktalk.device';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k: string) => { try { localStorage.removeItem(k); } catch {} },
};

/** 백엔드 공통 실패 응답의 error 를 그대로 담는다 (code, message, retryable). */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public retryable = false) {
    super(message);
  }
}

function saveTokens(t: { accessToken: string; refreshToken: string }) {
  store.set(TOKEN_KEY, t.accessToken);
  store.set(REFRESH_KEY, t.refreshToken);
}
function clearTokens() {
  store.del(TOKEN_KEY);
  store.del(REFRESH_KEY);
}

// 동시에 여러 요청이 401을 받아도 갱신은 한 번만 한다. (refresh token은 한 번 쓰면 폐기됨)
let refreshing: Promise<boolean> | null = null;
function refreshTokens(): Promise<boolean> {
  const refreshToken = store.get(REFRESH_KEY);
  if (!refreshToken) return Promise.resolve(false);
  refreshing ??= request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
    method: 'POST', body: JSON.stringify({ refreshToken }),
  }, true)
    .then((t) => { saveTokens(t); return true; })
    .catch(() => { clearTokens(); return false; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function request<T>(path: string, init: RequestInit = {}, noRetry = false): Promise<T> {
  const headers = new Headers(init.headers);
  // FormData는 브라우저가 boundary를 넣어야 하므로 Content-Type을 직접 넣지 않는다.
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = store.get(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', true);
  }
  // 401: 토큰 갱신 후 1회만 재시도
  if (res.status === 401 && !noRetry && (await refreshTokens())) return request<T>(path, init, true);

  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    const e = body?.error;
    throw new ApiError(res.status, e?.code ?? 'UNKNOWN', e?.message ?? `요청에 실패했어요 (${res.status})`, !!e?.retryable);
  }
  return body?.data as T;
}

const RELATION = { 엄마: 'MOTHER', 아빠: 'FATHER', 보호자: 'GUARDIAN' } as const;
// 백엔드 Language enum 은 소문자 코드(vi, zh-CN, en)로 받는다.
const LANGUAGE = { vi: 'vi', zh: 'zh-CN', en: 'en' } as const;

export async function registerProfile(p: Profile): Promise<string | undefined> {
  if (USE_MOCK) return undefined;
  let deviceId = store.get(DEVICE_KEY);
  if (!deviceId) { deviceId = crypto.randomUUID(); store.set(DEVICE_KEY, deviceId); }
  const auth = await request<{ accessToken: string; refreshToken: string }>('/auth/guest', {
    method: 'POST', body: JSON.stringify({ deviceId, locale: 'ko' }),
  }, true);
  saveTokens(auth);
  const child = await request<{ id: string }>('/children', {
    method: 'POST',
    body: JSON.stringify({
      nickname: p.childName, age: p.childAge,
      relationship: RELATION[p.relation], explanationLanguage: LANGUAGE[p.lang],
    }),
  });
  return child.id;
}

export type FeedbackKind = 'natural' | 'polish' | 'meaning' | 'missing';
export interface SentenceFeedback {
  kind: FeedbackKind;
  original: string;
  suggested?: string;
  wrongPart?: string;
  goodPoint?: string;
  explain?: string;
  tips: string[];
}

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

/**
 * 문장 첨삭. 서버는 사진 분석으로 만들어진 표현(vocabularyId)만 알기 때문에,
 * 촬영해서 분석한 단어일 때만 API를 부르고 내장 예시 단어는 모의 응답을 쓴다.
 */
export async function checkSentence(word: Word, sentence: string, childId?: string): Promise<SentenceFeedback> {
  const vocabularyId = serverVocabId(word.id);
  if (USE_MOCK || !childId || !vocabularyId) {
    await wait(1400);
    return mockSentenceFeedback(word, sentence);
  }
  try {
    const r = await request<{ assessment: string; meaningDelivered: boolean; targetWordUsed: boolean;
      originalSentence: string; suggestedSentence: string; feedback: string; highlights: { text: string }[] }>(
      `/children/${childId}/sentence-practices`,
      // 문장 연습의 inputMethod 는 KEYBOARD | SPEECH (명세서의 TEXT 는 대화 메시지용)
      { method: 'POST', body: JSON.stringify({ vocabularyId, sentence, inputMethod: 'KEYBOARD' }) },
    );
    const kind: FeedbackKind = !r.targetWordUsed ? 'missing' : !r.meaningDelivered ? 'meaning'
      : r.suggestedSentence && r.suggestedSentence !== r.originalSentence ? 'polish' : 'natural';
    return { kind, original: r.originalSentence, suggested: r.suggestedSentence, wrongPart: r.highlights?.[0]?.text, tips: [r.feedback] };
  } catch (e) {
    console.warn('[sentence-practices] 서버 첨삭 실패, 예시 응답으로 대신합니다', e);
    return mockSentenceFeedback(word, sentence);
  }
}

/**
 * 저장된 childId 로 fn 을 실행한다. 토큰이 없거나, 서버가 재시작되어 계정·아이가 사라졌으면(401/404)
 * 게스트 로그인과 아이 등록을 다시 하고 한 번만 재시도한다. 새 childId 는 onChild 로 알려 준다.
 */
export async function withChild<T>(p: Profile, onChild: (id: string) => void, fn: (childId: string) => Promise<T>): Promise<T> {
  const fresh = async () => {
    const id = (await registerProfile(p))!;
    onChild(id);
    return id;
  };
  const id = store.get(TOKEN_KEY) && p.childId ? p.childId : await fresh();
  try {
    return await fn(id);
  } catch (e) {
    if (!(e instanceof ApiError) || (e.status !== 401 && e.status !== 404)) throw e;
    return fn(await fresh());
  }
}

export interface PageAnalysis {
  pageId: string;
  pageLabel: string | null;
  expressions: ScanExpression[];
}

/** 사진 업로드 → 분석 시작 → 상태 폴링 → 결과 조회 (명세서 8.2, 9장) */
export async function analyzePhoto(file: File, childId: string, signal: AbortSignal,
  onProgress?: (percent: number) => void): Promise<PageAnalysis> {
  const form = new FormData();
  form.append('file', file);
  form.append('childId', childId);
  form.append('bookTitle', '내가 찍은 그림책');
  const page = await request<{ pageId: string; bookId: string; pageLabel: string | null }>(
    '/books/uploads', { method: 'POST', body: form, signal });

  const job = await request<{ jobId: string; status: string; pollAfterMs: number }>(
    `/books/pages/${page.pageId}/analysis-jobs`,
    { method: 'POST', body: JSON.stringify({ childId, force: false, features: ['OCR', 'EXPRESSIONS'] }), signal });

  let status = job.status;
  let delay = job.pollAfterMs || 1000;
  const deadline = Date.now() + 90_000; // 무한 폴링 방지
  while (status === 'QUEUED' || status === 'RUNNING') {
    if (Date.now() > deadline) throw new ApiError(408, 'ANALYSIS_TIMEOUT', '분석이 오래 걸리고 있어요. 다시 시도해 주세요.', true);
    await abortableWait(delay, signal);
    const j = await request<{ status: string; progress: number; pollAfterMs?: number; errorCode?: string; errorMessage?: string }>(
      `/analysis-jobs/${job.jobId}`, { signal });
    status = j.status;
    delay = j.pollAfterMs || 1000;
    onProgress?.(j.progress);
    if (status === 'FAILED' || status === 'CANCELLED') {
      throw new ApiError(422, j.errorCode ?? 'ANALYSIS_FAILED', j.errorMessage ?? '글자를 읽지 못했어요. 다시 찍어 주세요.');
    }
  }
  const result = await request<{ pageId: string; expressions: ScanExpression[] }>(
    `/books/pages/${page.pageId}/analysis`, { signal });
  return { pageId: result.pageId, pageLabel: page.pageLabel, expressions: result.expressions ?? [] };
}

function abortableWait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('aborted', 'AbortError')); }, { once: true });
  });
}

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
