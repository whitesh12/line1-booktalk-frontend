/**
 * 사용자가 실제로 학습한 기록 (이 기기 기준).
 * 단어를 볼 때 → 문장 연습을 마칠 때 → 대화를 시작/마칠 때마다 남기고, 홈의 '이어서 학습하기'·'최근 학습한 단어'에 쓴다.
 */
import { useEffect, useState } from 'react';

/** 학습 단계. 뒤로 갈수록 더 많이 한 것 */
export type Stage = 'viewed' | 'practiced' | 'talking' | 'talked';
const ORDER: Stage[] = ['viewed', 'practiced', 'talking', 'talked'];

export interface LearnRecord {
  wordId: string;
  bookId?: string;
  stage: Stage; // 이 단어에서 가장 많이 진행한 단계
  at: number; // 마지막으로 학습한 시각 (ms)
}

const KEY = 'booktalk.learning';
const EVENT = 'booktalk:learning';

export function loadLearning(): LearnRecord[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    // 깨진 데이터가 있어도 홈이 멈추지 않게 올바른 기록만 남긴다
    return Array.isArray(v) ? v.filter((r) => r && typeof r.wordId === 'string' && typeof r.at === 'number') : [];
  } catch { return []; }
}

/** 학습 기록 남기기. 단계는 앞으로만 간다 (대화까지 마친 단어를 다시 봐도 '완료' 유지). */
export function recordLearning(wordId: string, stage: Stage, bookId?: string | null) {
  const list = loadLearning();
  const prev = list.find((r) => r.wordId === wordId);
  const next: LearnRecord = {
    wordId,
    bookId: bookId ?? prev?.bookId,
    stage: prev && ORDER.indexOf(prev.stage) > ORDER.indexOf(stage) ? prev.stage : stage,
    at: Date.now(),
  };
  const updated = [next, ...list.filter((r) => r.wordId !== wordId)].slice(0, 50);
  try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** 최근 학습 순서로 정렬된 기록 (화면이 바뀌면 다시 읽는다) */
export function useLearning(): LearnRecord[] {
  const [list, setList] = useState(loadLearning);
  useEffect(() => {
    const on = () => setList(loadLearning());
    window.addEventListener(EVENT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', on); };
  }, []);
  return list;
}

/** "방금 전", "3시간 전", "어제", "3일 전" */
export function timeAgo(at: number, now = Date.now()): string {
  const min = Math.floor((now - at) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days = Math.ceil((today.getTime() - at) / 86400000);
  if (days <= 0) return `${Math.floor(min / 60)}시간 전`;
  if (days === 1) return '어제';
  return `${days}일 전`;
}
