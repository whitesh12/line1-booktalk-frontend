// 대화 연습 화면들(준비 · 대화 · 마무리)이 함께 쓰는 것
import { useParams, useSearchParams } from 'react-router-dom';
import { WORDS } from '../../data/content';
import { bookFor } from '../../lib/nav';

export function useTalk() {
  const { wordId = 'dugeun' } = useParams();
  const [q] = useSearchParams();
  const w = WORDS[wordId] ?? WORDS.dugeun;
  const book = bookFor(w.id, q.get('book')); // 들어온 책을 마무리의 '목록으로'까지 넘긴다
  return { w, book, qs: `?book=${book.id}` };
}
