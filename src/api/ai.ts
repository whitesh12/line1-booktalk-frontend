/**
 * 백엔드(→ AI 서버)가 제공하는 기능: 단어 설명, 아이와 대화, 읽어 주기 음성.
 * 모두 '사진으로 찍어서 분석한 단어'(vocabularyId 가 있는 단어)에서만 쓸 수 있다.
 */
import { ApiError, USE_MOCK, absoluteUrl, hasToken, request, uuid } from './client';
import { BOOKS, WORDS } from '../data/content';
import { serverVocabId, setDemoVocab } from '../data/scanned';
import { loadProfile } from '../store/profile';
import { recordLearning, type Stage } from '../store/learning';

/* ───────────── 학습 기록 (이 기기 + POST /children/{id}/learning-events) ───────────── */

const EVENT_TYPE: Partial<Record<Stage, string>> = { viewed: 'WORD_VIEWED', practiced: 'SENTENCE_COMPLETED', talked: 'DIALOGUE_COMPLETED' };

/** 학습 기록을 남긴다. 홈 화면용으로 이 기기에 저장하고, 서버 단어면 서버에도 학습 이벤트를 보낸다. */
export function trackLearning(wordId: string, stage: Stage, bookId = new URLSearchParams(location.search).get('book')) {
  recordLearning(wordId, stage, bookId);
  const type = EVENT_TYPE[stage];
  const childId = loadProfile().childId;
  const vocabularyId = serverVocabId(wordId, bookId);
  if (!type || !childId || !vocabularyId || USE_MOCK || !hasToken()) return;
  request(`/children/${childId}/learning-events`, {
    method: 'POST',
    body: JSON.stringify({ eventId: uuid(), type, vocabularyId, occurredAt: new Date().toISOString(), metadata: {} }),
  }).catch((e) => console.warn('[learning-events] 학습 기록 전송 실패', e));
}

/* ───────────── 시연용 동화책 단어 연결 (GET /books?source=DEMO) ───────────── */

let demoLoading: Promise<void> | null = null;
/**
 * 서버의 시연용 책(DEMO)과 화면의 예시 책을 '책 제목 + 단어 글자'로 맞춰 서버 표현 id 를 연결한다.
 * 연결되면 예시 책 단어도 AI 설명·대화·문장 첨삭을 쓸 수 있다.
 */
export function loadDemoVocab(): Promise<void> {
  if (USE_MOCK || !hasToken()) return Promise.resolve();
  demoLoading ??= request<{ title: string; expressions?: { id: string; text: string }[] }[]>('/books?source=DEMO&limit=50')
    .then((books) => {
      const map: Record<string, Record<string, string>> = {};
      for (const local of BOOKS) {
        const remote = books.find((b) => b.title.trim() === local.title.trim());
        if (!remote?.expressions) continue;
        for (const wordId of local.wordIds) {
          const text = WORDS[wordId]?.text;
          const exp = text ? remote.expressions.find((e) => e.text.trim() === text) : undefined;
          if (exp) (map[local.id] ??= {})[wordId] = exp.id;
        }
      }
      setDemoVocab(map);
    })
    .catch((e) => { console.warn('[books] 시연용 책 단어를 불러오지 못했어요', e); })
    .finally(() => { demoLoading = null; });
  return demoLoading;
}

/* ───────────── 단어 설명 (GET /vocabulary/{id}) ───────────── */

export interface VocabDetail {
  id: string;
  text: string;
  definition: string;
  translation?: { language: string; text: string } | null;
  usageSituations?: string[];
  sourceSentence?: { ko: string; translated?: string } | null;
  similarExpressions?: { text: string; nuance: string }[];
  parentTips?: string[];
  childExplanation?: string;
  practiceExample?: string;
}

const VOCAB_KEY = (id: string) => `booktalk.vocab.${id}`;
const vocabLoading = new Map<string, Promise<VocabDetail>>();

/** 저장해 둔 단어 설명 (없으면 undefined). 화면을 바로 그리기 위해 쓴다. */
export function cachedVocabulary(id: string): VocabDetail | undefined {
  try { const raw = localStorage.getItem(VOCAB_KEY(id)); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; }
}

export function fetchVocabulary(id: string): Promise<VocabDetail> {
  let p = vocabLoading.get(id);
  if (!p) {
    p = request<VocabDetail>(`/vocabulary/${id}`).then((v) => {
      try { localStorage.setItem(VOCAB_KEY(id), JSON.stringify(v)); } catch {}
      return v;
    });
    p.catch(() => vocabLoading.delete(id)); // 실패하면 다음에 다시 시도
    vocabLoading.set(id, p);
  }
  return p;
}

/* ───────────── 아이와 대화 (conversation-sessions) ───────────── */

export interface TalkMessage {
  id: string;
  role: 'CHILD_AI' | 'GUARDIAN';
  text: string;
  hint?: string | null;
  feedback?: string | null;
  accepted?: boolean | null;
}
export interface TalkMission { targetText: string; maxTurns: number; targetUsed: boolean; progress: number; completed: boolean }
export interface TalkSession { id: string; status: string; mission: TalkMission; openingMessage: TalkMessage; messages?: TalkMessage[] }
export interface TalkTurn { userMessage: TalkMessage; aiMessage: TalkMessage; mission: TalkMission; sessionStatus: string }

// 진행 중인 대화가 있으면 서버가 새 대화를 막는데(409), 진행 중인 대화를 찾는 API 가 없어서 직접 기억해 둔다.
const ACTIVE_KEY = 'booktalk.activeTalk';
const readActive = (): { childId: string; sessionId: string } | null => {
  try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) ?? 'null'); } catch { return null; }
};
const writeActive = (v: { childId: string; sessionId: string } | null) => {
  try { if (v) localStorage.setItem(ACTIVE_KEY, JSON.stringify(v)); else localStorage.removeItem(ACTIVE_KEY); } catch {}
};

/** 대화를 끝낸다. 실패해도 괜찮다 (이미 끝났거나 서버가 다시 시작된 경우 등). */
export async function finishTalk(sessionId: string): Promise<void> {
  if (readActive()?.sessionId === sessionId) writeActive(null);
  await request(`/conversation-sessions/${sessionId}/complete`, { method: 'POST' }).catch(() => {});
}

export async function startTalk(childId: string, vocabularyId: string): Promise<TalkSession> {
  const create = () => request<TalkSession>(`/children/${childId}/conversation-sessions`, {
    method: 'POST',
    body: JSON.stringify({ vocabularyId, scene: '그림책', difficulty: 'LEVEL_1', translationHintEnabled: true }),
  });
  // 지난번에 끝내지 못한 대화가 있으면 먼저 끝낸다.
  const prev = readActive();
  if (prev?.childId === childId) await finishTalk(prev.sessionId);
  let s: TalkSession;
  try {
    s = await create();
  } catch (e) {
    if (!(e instanceof ApiError) || e.code !== 'ACTIVE_CONVERSATION_EXISTS') throw e;
    // 거의 동시에 시작한 대화가 있으면 잠깐 뒤 기억해 둔 것을 끝내고 한 번 더 시도한다.
    await new Promise((r) => setTimeout(r, 1200));
    const again = readActive();
    // 기억해 둔 대화가 없으면 (다른 기기·브라우저에서 시작한 대화) 끝낼 방법이 없다.
    if (again?.childId !== childId) throw new ApiError(409, e.code, '다른 곳에서 진행 중인 대화가 있어요.');
    await finishTalk(again.sessionId);
    s = await create();
  }
  writeActive({ childId, sessionId: s.id });
  return s;
}

export function sendTalk(sessionId: string, text: string, clientMessageId = uuid()): Promise<TalkTurn> {
  return request<TalkTurn>(`/conversation-sessions/${sessionId}/messages`, {
    method: 'POST', body: JSON.stringify({ clientMessageId, text, inputMethod: 'TEXT', transcriptionId: null }),
  });
}

/* ───────────── 읽어 주기 음성 (POST /speech/synthesis) ───────────── */

const ttsCache = new Map<string, string>();
/** 서버 음성은 처음 만들 때 5초쯤 걸려서, 이 시간 안에 안 오면 브라우저 음성으로 대신한다. */
const TTS_WAIT_MS = 3500;

export const canUseServerTts = () => !USE_MOCK && hasToken();

/** 음성 파일 주소를 받는다. 같은 문장은 다시 만들지 않는다 (속도는 재생할 때 바꾼다). */
export async function synthesize(text: string): Promise<string> {
  const hit = ttsCache.get(text);
  if (hit) return hit;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TTS_WAIT_MS);
  try {
    const r = await request<{ audioUrl: string }>('/speech/synthesis', {
      method: 'POST', signal: ctrl.signal,
      body: JSON.stringify({ text, language: 'ko', voice: 'child-friendly-neutral', speed: 1.0 }),
    });
    const url = absoluteUrl(r.audioUrl);
    ttsCache.set(text, url);
    return url;
  } finally {
    clearTimeout(timer);
  }
}

/** 시간 초과로 포기한 문장도 서버에서는 계속 만들어지니, 다음 재생을 위해 미리 받아 둔다. */
export function prefetchSpeech(text: string) {
  if (!canUseServerTts() || ttsCache.has(text)) return;
  request<{ audioUrl: string }>('/speech/synthesis', {
    method: 'POST', body: JSON.stringify({ text, language: 'ko', voice: 'child-friendly-neutral', speed: 1.0 }),
  }).then((r) => ttsCache.set(text, absoluteUrl(r.audioUrl))).catch(() => {});
}
