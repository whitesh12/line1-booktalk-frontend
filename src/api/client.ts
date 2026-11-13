import type { Profile } from '../store/profile';
import type { Word } from '../data/content';
import type { ScanExpression } from '../data/scanned';
import { MAX_UPLOAD_BYTES } from '../lib/photo';

const BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').trim().replace(/\/+$/, '');
export const USE_MOCK = BASE === '';
// 백엔드는 context-path 가 /v1 이라 주소 끝에 /v1 이 꼭 있어야 한다.
if (!USE_MOCK && !BASE.endsWith('/v1')) console.warn(`[api] VITE_API_BASE_URL(${BASE}) 끝에 /v1 이 없어요. 예: https://서버주소/v1`);

/** 일반 요청 제한 시간. Render 무료 서버는 잠에서 깨는 데 100초 넘게 걸리기도 해서 넉넉히 둔다. */
const TIMEOUT_MS = 120_000;

/** 앱을 열자마자 서버를 깨워 둔다 (기본 정보 입력하는 동안 깨어나도록). 결과는 신경 쓰지 않는다. */
export function warmUpServer() {
  if (USE_MOCK) return;
  fetch(`${BASE}/health`).catch(() => {});
}

/** AI 서버가 깨어나는 중이라 생기는 일시적인 분석 실패 */
export const isTransientAiError = (e: unknown) =>
  e instanceof ApiError && ['AI_TIMEOUT', 'AI_PROVIDER_UNAVAILABLE', 'TIMEOUT', 'NETWORK_ERROR', 'ANALYSIS_TIMEOUT'].includes(e.code);

/** crypto.randomUUID 는 HTTPS(또는 localhost)에서만 있어서, 휴대폰으로 http://192.168… 접속할 때를 대비한다. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

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
  window.dispatchEvent(new Event('booktalk:auth')); // 로그인되면 시연용 단어 연결 등을 다시 시도
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
    // 서버가 갱신을 거부했을 때만 토큰을 지운다. 통신이 잠깐 끊긴 것(NETWORK_ERROR·TIMEOUT)으로 로그아웃시키지 않는다.
    .catch((e) => { if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 408) clearTokens(); return false; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

/** 로그인(게스트) 토큰이 있는지. 없으면 서버 기능 대신 예시 동작을 쓴다. */
export const hasToken = () => !!store.get(TOKEN_KEY);
/** 서버가 주는 /v1/... 상대 주소(음성 파일 등)를 전체 주소로 바꾼다. */
export const absoluteUrl = (path: string) => (/^https?:/.test(path) ? path : new URL(path, new URL(BASE, location.href)).href);

export async function request<T>(path: string, init: RequestInit = {}, noRetry = false): Promise<T> {
  const headers = new Headers(init.headers);
  // FormData는 브라우저가 boundary를 넣어야 하므로 Content-Type을 직접 넣지 않는다.
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = store.get(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // 호출한 쪽의 취소(화면 이탈)와 제한 시간을 함께 건다.
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, TIMEOUT_MS);
  const outer = init.signal;
  const onOuterAbort = () => ctrl.abort();
  if (outer?.aborted) ctrl.abort(); else outer?.addEventListener('abort', onOuterAbort, { once: true });

  let res: Response;
  let body: { data?: T; error?: { code?: string; message?: string; retryable?: boolean } } | null;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, signal: ctrl.signal });
    body = await res.json().catch(() => null);
  } catch (e) {
    if (outer?.aborted) throw e; // 화면을 벗어나 취소된 경우는 그대로 넘긴다
    throw timedOut
      ? new ApiError(408, 'TIMEOUT', '서버 응답이 늦어요. 잠시 후 다시 시도해 주세요.', true)
      : new ApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', true);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onOuterAbort);
  }

  // 401: 토큰 갱신 후 1회만 재시도
  if (res.status === 401 && !noRetry && (await refreshTokens())) return request<T>(path, init, true);

  if (!res.ok || body?.error) {
    const e = body?.error;
    throw new ApiError(res.status, e?.code ?? 'UNKNOWN', e?.message ?? `요청에 실패했어요 (${res.status})`, !!e?.retryable);
  }
  // 주소가 틀려서 백엔드 대신 웹 페이지(HTML)가 돌아온 경우 등
  if (!body || !('data' in body)) {
    throw new ApiError(res.status, 'BAD_RESPONSE', '서버 주소 설정을 확인해 주세요. (API 응답이 아니에요)');
  }
  return body.data as T;
}

const RELATION = { 엄마: 'MOTHER', 아빠: 'FATHER', 보호자: 'GUARDIAN' } as const;
// 백엔드 Language enum 은 소문자 코드(vi, zh-CN, en)로 받는다.
const LANGUAGE = { vi: 'vi', zh: 'zh-CN', en: 'en' } as const;

/**
 * 게스트 로그인 후 아이 프로필을 서버에 맞춘다.
 * 같은 기기(deviceId)는 같은 계정으로 로그인되고 계정당 아이는 최대 5명이라,
 * 이미 등록된 아이가 있으면 새로 만들지 않고 그 아이 정보를 고쳐서 쓴다.
 */
export async function registerProfile(p: Profile): Promise<string | undefined> {
  if (USE_MOCK) return undefined;
  let deviceId = store.get(DEVICE_KEY);
  if (!deviceId) { deviceId = uuid(); store.set(DEVICE_KEY, deviceId); }
  const auth = await request<{ accessToken: string; refreshToken: string }>('/auth/guest', {
    method: 'POST', body: JSON.stringify({ deviceId, locale: 'ko' }),
  }, true);
  saveTokens(auth);

  const body = JSON.stringify({
    nickname: p.childName.trim().slice(0, 20), age: Math.min(7, Math.max(3, p.childAge)),
    relationship: RELATION[p.relation], explanationLanguage: LANGUAGE[p.lang],
  });
  const children = await request<{ id: string }[]>('/children');
  const existing = children.find((c) => c.id === p.childId) ?? children[0];
  if (existing) {
    await request(`/children/${existing.id}`, { method: 'PATCH', body });
    return existing.id;
  }
  const child = await request<{ id: string }>('/children', { method: 'POST', body });
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

/** 백엔드가 AI 호출에 실패했을 때 대신 쓰는 단순 규칙 판정의 promptVersion */
const RULE_FALLBACK = /^local-rule/;

/**
 * 문장 첨삭 (POST /children/{childId}/sentence-practices).
 * - 백엔드를 쓰지 않는 모드(VITE_API_BASE_URL 비움)에서만 예시 판정을 쓴다.
 * - 서버를 쓰는 모드에서는 서버(AI) 판정만 쓴다. 요청이 실패하면 오류를 던져서 화면에서 '다시 시도'를 보여 준다.
 *   (예전처럼 예시 판정으로 대신하면, 뜻이 틀린 문장도 '자연스러워요'로 통과되는 문제가 있었다)
 */
export async function checkSentence(word: Word, sentence: string, childId?: string, vocabularyId?: string): Promise<SentenceFeedback> {
  if (USE_MOCK) {
    await wait(1400);
    return mockSentenceFeedback(word, sentence);
  }
  if (!childId || !vocabularyId) {
    throw new ApiError(422, 'WORD_NOT_ON_SERVER', '이 단어는 지금 AI 첨삭을 할 수 없어요. 잠시 후 다시 시도해 주세요.', true);
  }
  const r = await request<{ assessment: string; meaningDelivered: boolean; targetWordUsed: boolean;
    originalSentence: string; suggestedSentence: string; feedback: string; highlights: { text: string }[]; promptVersion?: string }>(
    `/children/${childId}/sentence-practices`,
    // 문장 연습의 inputMethod 는 KEYBOARD | SPEECH (명세서의 TEXT 는 대화 메시지용)
    { method: 'POST', body: JSON.stringify({ vocabularyId, sentence, inputMethod: 'KEYBOARD' }) },
  );
  const kind: FeedbackKind = !r.targetWordUsed ? 'missing' : !r.meaningDelivered ? 'meaning'
    : r.suggestedSentence && r.suggestedSentence !== r.originalSentence ? 'polish' : 'natural';
  // AI 가 실패해서 백엔드가 단순 규칙으로 대신 판정했는데 '자연스러움'이 나온 경우는 믿을 수 없다 (뜻 혼동을 못 잡음).
  if (kind === 'natural' && RULE_FALLBACK.test(r.promptVersion ?? '')) {
    throw new ApiError(503, 'AI_UNAVAILABLE', 'AI가 문장을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.', true);
  }
  // 밑줄 칠 곳: 뜻 혼동이면 목표 표현, 다듬기면 "두근두근을" 처럼 고칠 부분
  // (서버 highlights 는 "두근두근을/를 해요" 같은 설명 문구라 문장 안에 그대로 없을 때가 많다)
  const stem = word.text.split(' ')[0];
  const found = r.originalSentence.match(new RegExp(`${stem}(을|를|이|가)`))?.[0];
  const hl = r.highlights?.[0]?.text;
  const wrongPart = kind === 'meaning' ? (r.originalSentence.includes(stem) ? stem : undefined)
    : found ?? (hl && r.originalSentence.includes(hl) ? hl : undefined);
  return { kind, original: r.originalSentence, suggested: r.suggestedSentence, wrongPart, tips: r.feedback ? [r.feedback] : [] };
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
    if (!(e instanceof ApiError)) throw e;
    // 401 은 토큰 갱신까지 실패한 경우. 404 는 '아이가 정말 없어졌을 때'만 재등록한다.
    const gone = e.status === 401 || (e.status === 404 && !(await childExists(id)));
    if (!gone) throw e;
    return fn(await fresh());
  }
}

async function childExists(id: string): Promise<boolean> {
  try {
    const list = await request<{ id: string }[]>('/children');
    return list.some((c) => c.id === id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return false;
    throw e;
  }
}

/** 설정에서 설명 언어를 바꾸면 서버의 아이 정보에도 반영한다. (분석 결과 번역 언어가 이걸 따른다) */
/** 아이의 설명 언어를 서버에 맞춘다. 사진 분석 번역이 이 언어로 만들어지므로 분석 직전에 부른다. */
export async function setChildLanguage(childId: string, lang: Profile['lang']): Promise<void> {
  if (USE_MOCK) return;
  await request(`/children/${childId}`, { method: 'PATCH', body: JSON.stringify({ explanationLanguage: LANGUAGE[lang] }) });
}

export async function syncChildLanguage(p: Profile): Promise<void> {
  if (USE_MOCK || !p.childId || !store.get(TOKEN_KEY)) return;
  await request(`/children/${p.childId}`, {
    method: 'PATCH', body: JSON.stringify({ explanationLanguage: LANGUAGE[p.lang] }),
  });
}

export interface PageAnalysis {
  pageId: string;
  pageLabel: string | null;
  expressions: ScanExpression[];
}

/** 사진 업로드 → 분석 시작 → 상태 폴링 → 결과 조회 (명세서 8.2, 9장) */
export async function analyzePhoto(file: File, childId: string, signal: AbortSignal,
  onProgress?: (percent: number) => void): Promise<PageAnalysis> {
  // 업로드 전에 한 번 더 확인 (서버 제한보다 작은 4MB 기준)
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, 'FILE_TOO_LARGE', '사진 용량이 너무 커요.');
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
    // 끝난 상태는 COMPLETED 말고도 FAILED, REJECTED, CANCELLED 가 있다.
    if (status !== 'QUEUED' && status !== 'RUNNING' && status !== 'COMPLETED') {
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

/** 받침이 있으면 a, 없으면 b (예: 두근두근'이' / 퐁당'이' / 영차'가') */
const josa = (word: string, a: string, b: string) => {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b;
};

// 연습용 대화(AI 를 쓸 수 없을 때) 대본. 두근두근은 디자인 시안 대본, 나머지 단어는 그 단어로 만든다.
const DUGEUN_OPENER = '토끼가 당근을 보고 가슴이 콩닥콩닥할 것 같아!';
const DUGEUN_SCRIPT = ['근데 두근두근이 뭐야?', '나도 생일 선물 받을 때 그랬어!', '내일 소풍 가는 것도 두근두근해!'];

export const openingLine = (w: Word) => (w.id === 'dugeun' ? DUGEUN_OPENER : `엄마, 그림책에 ‘${w.text}’${josa(w.text, '이', '가')} 나왔어!`);

export const childScript = (turn: number, w: Word) => {
  const lines = w.id === 'dugeun' ? DUGEUN_SCRIPT
    : [`근데 ${w.text}${josa(w.text, '은', '는')} 무슨 뜻이야?`, `아하! 나도 ${w.text} 해 보고 싶어!`, `또 ${w.text} 이야기해 줘!`];
  return lines[Math.min(turn, lines.length - 1)];
};
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
  return { text: childScript(turn, word) };
}
export const MAX_TURNS = 4;
