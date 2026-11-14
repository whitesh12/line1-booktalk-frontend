/**
 * 백엔드(→ AI 서버)가 제공하는 기능: 단어 설명, 아이와 대화, 읽어 주기 음성.
 * 모두 '사진으로 찍어서 분석한 단어'(vocabularyId 가 있는 단어)에서만 쓸 수 있다.
 */
import { ApiError, USE_MOCK, absoluteUrl, hasToken, request, uuid } from './client';
import { BOOKS, WORDS } from '../data/content';
import { isScanBook, serverVocabId, setDemoVocab } from '../data/scanned';
import { loadProfile } from '../store/profile';
import { recordLearning, type Stage } from '../store/learning';
import { audioExt } from '../lib/recorder';

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
        if (isScanBook(local.id)) continue; // 내가 찍은 책은 이름을 바꿔도 시연용 책과 섞이지 않게
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

const VOCAB_KEY = (id: string, lang: string) => `booktalk.vocab.${lang}.${id}`;
/** 앱 언어 → 서버 언어 코드 */
export const SERVER_LANG = { vi: 'vi', zh: 'zh-CN', en: 'en' } as const;
type AppLang = keyof typeof SERVER_LANG;
const vocabLoading = new Map<string, Promise<VocabDetail>>();

/** 저장해 둔 단어 설명 (없으면 undefined). 화면을 바로 그리기 위해 쓴다. */
export function cachedVocabulary(id: string, lang: AppLang): VocabDetail | undefined {
  try { const raw = localStorage.getItem(VOCAB_KEY(id, lang)); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; }
}

/** 단어 설명을 설정한 설명 언어의 번역으로 받는다 (시연용 단어는 vi·zh-CN·en 모두, 사진 단어는 없으면 번역이 null) */
export function fetchVocabulary(id: string, lang: AppLang): Promise<VocabDetail> {
  const key = `${lang}:${id}`;
  let p = vocabLoading.get(key);
  if (!p) {
    p = request<VocabDetail>(`/vocabulary/${id}?language=${SERVER_LANG[lang]}`).then((v) => {
      try { localStorage.setItem(VOCAB_KEY(id, lang), JSON.stringify(v)); } catch {}
      return v;
    });
    p.catch(() => vocabLoading.delete(key)); // 실패하면 다음에 다시 시도
    vocabLoading.set(key, p);
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
  // 새 대화를 시작하면 서버가 이전 대화를 자동으로 끝낸다.
  // 그래도 막히면(409) 진행 중인 대화를 목록에서 찾아 끝내고 한 번 더 시도한다. (다른 기기에서 시작한 대화 포함)
  let s: TalkSession;
  try {
    s = await create();
  } catch (e) {
    if (!(e instanceof ApiError) || e.code !== 'ACTIVE_CONVERSATION_EXISTS') throw e;
    const active = await request<{ id: string }[]>(`/children/${childId}/conversation-sessions?status=ACTIVE`).catch(() => []);
    const prev = readActive();
    const ids = new Set([...active.map((a) => a.id), ...(prev?.childId === childId ? [prev.sessionId] : [])]);
    for (const id of ids) await finishTalk(id);
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

/*
 * 서버 음성은 처음 만들 때 짧은 단어는 1초 안쪽, 긴 문장은 6초 넘게 걸리기도 한다.
 * 예전에는 3.5초가 지나면 브라우저 음성으로 바꿔서 '문장은 다른 목소리'로 들렸다.
 * → 화면에 들어오면 미리 만들어 두고, 버튼을 누르면 서버 음성이 올 때까지 기다린다(브라우저 음성은 실패했을 때만).
 */
const TTS_KEY = 'booktalk.tts';
type TtsEntry = { url: string; exp: number };
const ttsCache: Map<string, TtsEntry> = (() => {
  try { return new Map(Object.entries(JSON.parse(localStorage.getItem(TTS_KEY) ?? '{}') as Record<string, TtsEntry>)); } catch { return new Map(); }
})();
const ttsInflight = new Map<string, Promise<string>>();

/** 이 문장의 서버 음성을 이미 받아 두었는지 */
export const hasCachedSpeech = (text: string) => !!cachedUrl(text);

function cachedUrl(text: string): string | undefined {
  const e = ttsCache.get(text);
  if (!e) return undefined;
  if (e.exp - Date.now() < 5 * 60_000) { ttsCache.delete(text); return undefined; } // 서버 음성 파일 만료 5분 전이면 새로 만든다
  return e.url;
}
function remember(text: string, url: string, expiresAt?: string) {
  ttsCache.set(text, { url, exp: expiresAt ? Date.parse(expiresAt) : Date.now() + 3600_000 });
  // 오래된 것부터 지워서 200개까지만 저장
  while (ttsCache.size > 200) ttsCache.delete(ttsCache.keys().next().value!);
  try { localStorage.setItem(TTS_KEY, JSON.stringify(Object.fromEntries(ttsCache))); } catch {}
}

export const canUseServerTts = () => !USE_MOCK && hasToken();

// 서버(AI) 음성은 하루 사용량이 정해져 있다. 다 쓰면(429 AI_QUOTA_EXCEEDED) 그날은 새 음성을 요청하지 않는다.
// (서버에 이미 만들어 둔 음성은 계속 받을 수 있어서, 요청은 하되 실패하면 바로 브라우저 음성으로 넘어간다)
const QUOTA_KEY = 'booktalk.ttsQuotaOut';
const today = () => new Date().toDateString();
export const ttsQuotaOut = () => { try { return localStorage.getItem(QUOTA_KEY) === today(); } catch { return false; } };

/** 음성 파일 주소를 받는다. 같은 문장은 다시 만들지 않고, 만드는 중이면 그 요청을 같이 기다린다 (속도는 재생할 때 바꾼다). */
export function synthesize(text: string): Promise<string> {
  const hit = cachedUrl(text);
  if (hit) return Promise.resolve(hit);
  let p = ttsInflight.get(text);
  if (!p) {
    p = request<{ audioUrl: string; expiresAt?: string }>('/speech/synthesis', {
      method: 'POST', body: JSON.stringify({ text, language: 'ko', voice: 'child-friendly-neutral', speed: 1.0 }),
    }).then((r) => {
      const url = absoluteUrl(r.audioUrl);
      remember(text, url, r.expiresAt);
      return url;
    }).catch((e) => {
      if (e instanceof ApiError && e.code === 'AI_QUOTA_EXCEEDED') { try { localStorage.setItem(QUOTA_KEY, today()); } catch {} }
      throw e;
    }).finally(() => ttsInflight.delete(text));
    ttsInflight.set(text, p);
  }
  return p;
}

/* ───────────── 책 이름 수정 (PATCH /books/{bookId}) ───────────── */

/** 찍은 책 이름을 서버에도 저장한다 (실패해도 이 기기에는 저장돼 있다) */
export async function renameServerBook(serverBookId: string, title: string): Promise<void> {
  if (USE_MOCK || !hasToken()) return;
  await request(`/books/${serverBookId}`, { method: 'PATCH', body: JSON.stringify({ title }) });
}

/* ───────────── 최근 학습한 단어 (GET /children/{childId}/recent-vocabulary) ───────────── */

export interface RecentVocab {
  vocabularyId: string;
  text: string;
  bookId?: string | null;
  bookTitle?: string | null;
  stage: 'VIEWED' | 'SENTENCE_DONE' | 'CONVERSATION_DONE' | string;
  lastStudiedAt: string;
}

export async function fetchRecentVocabulary(limit = 10): Promise<RecentVocab[]> {
  const childId = loadProfile().childId;
  if (USE_MOCK || !hasToken() || !childId) return [];
  return request<RecentVocab[]>(`/children/${childId}/recent-vocabulary?limit=${limit}`);
}

/* ───────────── 음성 인식 (POST /speech/transcriptions) ───────────── */

/** 녹음한 말을 글자로 바꾼다. multipart: audio(녹음 파일), language, childId */
export async function transcribe(audio: Blob): Promise<string> {
  const childId = loadProfile().childId;
  if (USE_MOCK || !hasToken() || !childId) throw new ApiError(401, 'NOT_READY', '말로 입력하려면 서버 연결이 필요해요. 잠시 후 다시 시도해 주세요.');
  const form = new FormData();
  form.append('audio', audio, `voice.${audioExt(audio.type)}`);
  form.append('language', 'ko');
  form.append('childId', childId);
  let r = await request<{ id: string; status: string; text?: string | null }>('/speech/transcriptions', { method: 'POST', body: form });
  // 바로 끝나지 않으면 잠깐씩 다시 확인한다 (최대 약 15초)
  for (let i = 0; i < 15 && r.status !== 'COMPLETED' && r.status !== 'FAILED'; i++) {
    await new Promise((res) => setTimeout(res, 1000));
    r = await request(`/speech/transcriptions/${r.id}`);
  }
  if (r.status !== 'COMPLETED') throw new ApiError(502, 'TRANSCRIPTION_FAILED', '말을 알아듣지 못했어요. 다시 말해 주세요.');
  return (r.text ?? '').trim();
}
