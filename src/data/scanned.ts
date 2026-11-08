import { BOOKS, WORDS, type Word, type WordType } from './content';

/** GET /books/pages/{pageId}/analysis 의 expressions 항목 */
export interface ScanExpression {
  id: string;
  text: string;
  type: string;
  definition: string;
  translation?: { language: string; text: string } | null;
  sourceSentence?: string | null;
}

interface SavedScan { pageId: string; pageLabel: string | null; expressions: ScanExpression[] }

export const SCAN_BOOK_ID = 'scan';
const KEY = 'booktalk.scan';
const TYPE: Record<string, WordType> = { MIMETIC: '의태어', ONOMATOPOEIA: '의성어', IDIOM: '관용 표현' };

/** 화면 단어 id → 서버 표현 id(vocabularyId) */
let vocabIds: Record<string, string> = {};
export const serverVocabId = (wordId: string): string | undefined => vocabIds[wordId];

/**
 * 촬영·분석 결과를 화면 데이터에 합친다.
 * 내장 단어와 글자가 같으면 내장 카드(그림·뜻풀이)를 그대로 쓰고 서버 id만 연결하고,
 * 처음 보는 표현은 서버가 준 뜻풀이로 간단한 카드를 만든다.
 */
function apply(scan: SavedScan) {
  vocabIds = {};
  const scenes: Record<string, string> = {};
  const wordIds = scan.expressions.map((e) => {
    const local = Object.values(WORDS).find((w) => w.text === e.text && !w.id.startsWith('exp_'));
    const word: Word = local ?? {
      id: e.id, text: e.text, type: TYPE[e.type] ?? '의태어', motion: null,
      meaning: e.definition, vi: e.translation?.text ?? '',
      nuance: e.definition, nuanceVi: '', usage: [],
      examples: e.sourceSentence ? [e.sourceSentence] : [], similar: [],
      tip: `그림책을 다시 보며 ‘${e.text}’이 나온 장면을 아이와 함께 찾아 보세요.`,
      image: '/images/logo.svg',
    };
    WORDS[word.id] = word;
    vocabIds[word.id] = e.id;
    if (e.sourceSentence) scenes[word.id] = e.sourceSentence;
    return word.id;
  });
  const book = {
    id: SCAN_BOOK_ID, title: '내가 찍은 그림책', page: scan.pageLabel ?? '',
    cover: '/images/logo.svg', coverBg: '#E8F6F3', coverAlt: '내가 찍은 그림책',
    wordIds, scenes,
  };
  const i = BOOKS.findIndex((b) => b.id === SCAN_BOOK_ID);
  // 맨 뒤에 붙여서, 책 정보 없이 단어로 들어올 때는 기존 예시 책이 먼저 잡히게 한다.
  if (i >= 0) BOOKS[i] = book; else BOOKS.push(book);
}

// 촬영 화면에서 고른 사진을 분석 화면으로 넘긴다. (File 은 라우터 state 로 넘기지 않는다)
let pendingPhoto: File | null = null;
export const setPendingPhoto = (f: File | null) => { pendingPhoto = f; };
export const peekPendingPhoto = () => pendingPhoto;

export function saveScan(scan: SavedScan) {
  try { localStorage.setItem(KEY, JSON.stringify(scan)); } catch {}
  apply(scan);
}

// 새로고침해도 마지막으로 찍은 페이지가 남아 있도록 불러온다.
try {
  const raw = localStorage.getItem(KEY);
  if (raw) apply(JSON.parse(raw));
} catch {}
