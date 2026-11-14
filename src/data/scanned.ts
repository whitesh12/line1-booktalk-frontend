import { useEffect, useState } from 'react';
import { BOOKS, WORDS, type Book, type Word, type WordType } from './content';

/** GET /books/pages/{pageId}/analysis 의 expressions 항목 */
export interface ScanExpression {
  id: string;
  text: string;
  type: string;
  definition: string;
  translation?: { language: string; text: string } | null;
  sourceSentence?: string | null;
}

/** 사진으로 찍어서 만든 책 한 권 (찍을 때마다 한 권씩 쌓인다) */
interface ScanBook {
  id: string; // 'scan'(예전 1권짜리 기록) 또는 'scan-…'
  title: string;
  pageId: string;
  serverBookId?: string; // 서버의 책 id (이름 수정 PATCH 용)
  pageLabel: string | null;
  createdAt: number;
  expressions: ScanExpression[];
}

export const DEFAULT_SCAN_TITLE = '내가 찍은 그림책';
export const isScanBook = (id?: string | null) => !!id && (id === 'scan' || id.startsWith('scan-'));
const LIST_KEY = 'booktalk.scans';
const OLD_KEY = 'booktalk.scan'; // 예전에는 마지막 1권만 저장했다
const MAX_BOOKS = 30;
const TYPE: Record<string, WordType> = { MIMETIC: '의태어', ONOMATOPOEIA: '의성어', IDIOM: '관용 표현', EMOTION: '감정 표현', INTERJECTION: '감탄사' };

/* ───────── 단어 ↔ 서버 표현 id ───────── */

/** 찍은 책: 책 id → (화면 단어 id → 서버 표현 id) */
let scanIds: Record<string, Record<string, string>> = {};
/** 찍은 책: 책 id → (화면 단어 id → 서버가 준 번역(언어 포함)) */
let scanTrs: Record<string, Record<string, { language: string; text: string }>> = {};
/** 찍은 책: 책 id → 번역 언어 (분석할 때의 아이 설명 언어) */
let scanLangs: Record<string, string | null> = {};

/** 시연용 동화책 단어: 화면 책 id → (화면 단어 id → 서버 표현 id). 같은 단어도 책마다 id 가 다르다. */
const DEMO_KEY = 'booktalk.demoVocab';
let demoIds: Record<string, Record<string, string>> = (() => {
  try {
    const v = JSON.parse(localStorage.getItem(DEMO_KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
})();
export function setDemoVocab(map: Record<string, Record<string, string>>) {
  demoIds = map;
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(map)); } catch {}
  window.dispatchEvent(new Event(VOCAB_EVENT)); // 이미 열려 있는 단어 화면도 서버 단어를 쓰도록
}

/** 서버 단어 연결(시연용 책·찍은 책)이 바뀌면 다시 그린다 */
const VOCAB_EVENT = 'booktalk:vocab';
export function useVocabVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const on = () => setV((n) => n + 1);
    window.addEventListener(VOCAB_EVENT, on);
    return () => window.removeEventListener(VOCAB_EVENT, on);
  }, []);
  return v;
}

const urlBook = () => new URLSearchParams(location.search).get('book');

/**
 * 단어의 서버 표현 id. 단어 화면 주소의 ?book= 으로 어느 책의 단어인지 고른다.
 * (찍은 책이면 그 책의 분석 결과, 시연용 책이면 그 책의 단어, 책을 모르면 최근에 찍은 책 → 시연용 책 순서)
 */
export function serverVocabId(wordId: string, bookId = urlBook()): string | undefined {
  if (isScanBook(bookId)) return scanIds[bookId!]?.[wordId];
  if (bookId && demoIds[bookId]?.[wordId]) return demoIds[bookId][wordId];
  return scans.map((s) => scanIds[s.id]?.[wordId]).find(Boolean) ?? Object.values(demoIds).find((m) => m[wordId])?.[wordId];
}

/** 사진 분석에서 서버가 준 단어 번역 (언어 포함). 찍은 책 화면이면 그 책 것, 아니면 최근에 찍은 책 것 */
export function scanTranslation(wordId: string, bookId = urlBook()) {
  if (isScanBook(bookId)) return scanTrs[bookId!]?.[wordId];
  return scans.map((s) => scanTrs[s.id]?.[wordId]).find(Boolean);
}
export const scanLanguage = (bookId: string) => scanLangs[bookId] ?? null;

/* ───────── 찍은 책 목록 ───────── */

function load(): ScanBook[] {
  try {
    const list = localStorage.getItem(LIST_KEY);
    // 저장 데이터가 깨져 있거나 예전 형식이면 쓸 수 있는 책만 남긴다 (흰 화면으로 멈추지 않게)
    if (list) {
      const v = JSON.parse(list);
      return Array.isArray(v) ? v.filter((s) => s && typeof s.id === 'string' && Array.isArray(s.expressions)).map((s) => ({ ...s, title: s.title || DEFAULT_SCAN_TITLE })) : [];
    }
    // 예전 기록(1권)을 새 목록으로 옮긴다. id 'scan' 은 그대로 둬서 학습 기록 링크가 깨지지 않게 한다.
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const o = JSON.parse(old);
      if (!o || !Array.isArray(o.expressions)) return [];
      return [{ id: 'scan', title: DEFAULT_SCAN_TITLE, pageId: o.pageId, pageLabel: o.pageLabel ?? null, createdAt: Date.now(), expressions: o.expressions ?? [] }];
    }
  } catch {}
  return [];
}
let scans: ScanBook[] = load();
const persist = () => { try { localStorage.setItem(LIST_KEY, JSON.stringify(scans)); } catch {} };

/**
 * 찍은 책들을 화면 데이터(BOOKS, WORDS)에 합친다. 최근에 찍은 책이 위로 오게 예시 책 뒤에 붙인다.
 * 내장 단어와 글자가 같으면 내장 카드(그림·뜻풀이)를 그대로 쓰고 서버 id만 연결하고,
 * 처음 보는 표현은 서버가 준 뜻풀이로 간단한 카드를 만든다.
 */
function applyAll() {
  scanIds = {}; scanTrs = {}; scanLangs = {};
  for (let i = BOOKS.length - 1; i >= 0; i--) if (isScanBook(BOOKS[i].id)) BOOKS.splice(i, 1);
  for (const scan of scans) {
    const ids: Record<string, string> = {};
    const trs: Record<string, { language: string; text: string }> = {};
    const scenes: Record<string, string> = {};
    const wordIds = scan.expressions.map((e) => {
      const local = Object.values(WORDS).find((w) => w.text === e.text && !w.id.startsWith('exp_'));
      // 번역은 단어 카드에 넣지 않고 '언어와 함께' 따로 기억한다 → 설정 언어와 같을 때만 보여 준다.
      const word: Word = local ?? {
        id: e.id, text: e.text, type: TYPE[e.type] ?? '의태어', motion: 'wave', // 처음 보는 단어도 움직임이 보이게
        meaning: e.definition, vi: '',
        nuance: e.definition, nuanceVi: '', usage: [],
        examples: e.sourceSentence ? [e.sourceSentence] : [], similar: [],
        tip: `그림책을 다시 보며 ‘${e.text}’이 나온 장면을 아이와 함께 찾아 보세요.`,
        image: '/images/logo.svg',
      };
      WORDS[word.id] = word;
      ids[word.id] = e.id;
      if (e.translation?.text) trs[word.id] = e.translation;
      if (e.sourceSentence) scenes[word.id] = e.sourceSentence;
      return word.id;
    });
    scanIds[scan.id] = ids;
    scanTrs[scan.id] = trs;
    scanLangs[scan.id] = scan.expressions.find((e) => e.translation?.language)?.translation?.language ?? null;
    const book: Book = {
      id: scan.id, title: scan.title, page: scan.pageLabel ?? '',
      cover: '/images/logo.svg', coverBg: '#E8F6F3', coverAlt: scan.title,
      wordIds, scenes,
    };
    BOOKS.push(book);
  }
}

/** 새로 찍은 페이지를 한 권으로 저장하고 그 책 id 를 돌려준다. 이름은 '내가 찍은 그림책 2' 처럼 번호를 붙인다. */
export function saveScan(r: { pageId: string; bookId?: string; pageLabel: string | null; expressions: ScanExpression[] }): string {
  const used = new Set(scans.map((s) => s.title));
  let n = scans.length + 1;
  let title = n === 1 ? DEFAULT_SCAN_TITLE : `${DEFAULT_SCAN_TITLE} ${n}`;
  while (used.has(title)) title = `${DEFAULT_SCAN_TITLE} ${++n}`;
  const book: ScanBook = { id: `scan-${Date.now().toString(36)}`, title, pageId: r.pageId, serverBookId: r.bookId, pageLabel: r.pageLabel, createdAt: Date.now(), expressions: r.expressions };
  scans = [book, ...scans].slice(0, MAX_BOOKS);
  persist();
  applyAll();
  return book.id;
}

/** 서버의 책 id (이름 수정을 서버에도 저장할 때) */
export const scanServerBookId = (id: string) => scans.find((s) => s.id === id)?.serverBookId;

/** 서버 표현 id → 화면 단어·책 (서버의 '최근 학습한 단어'를 홈에 보여 줄 때) */
export function localWordForVocab(vocabularyId: string): { wordId: string; bookId: string } | undefined {
  for (const [bookId, m] of [...Object.entries(scanIds), ...Object.entries(demoIds)]) {
    for (const [wordId, id] of Object.entries(m)) if (id === vocabularyId) return { wordId, bookId };
  }
  return undefined;
}

/** 찍은 책 이름 바꾸기 (이 기기에 저장하고, 화면에서 서버에도 저장한다) */
export function renameScanBook(id: string, title: string): boolean {
  const t = title.trim().slice(0, 30);
  const s = scans.find((x) => x.id === id);
  if (!s || !t) return false;
  s.title = t;
  persist();
  applyAll();
  return true;
}

// 촬영 화면에서 고른 사진을 분석 화면으로 넘긴다. (File 은 라우터 state 로 넘기지 않는다)
let pendingPhoto: File | null = null;
export const setPendingPhoto = (f: File | null) => { pendingPhoto = f; };
export const peekPendingPhoto = () => pendingPhoto;

// 새로고침해도 찍은 책들이 남아 있도록 불러온다.
applyAll();
