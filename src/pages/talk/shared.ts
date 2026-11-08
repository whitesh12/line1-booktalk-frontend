import { useParams, useSearchParams } from 'react-router-dom';
import { WORDS } from '../../data/content';
import { bookFor } from '../../lib/nav';

export function useTalk() {
  const { wordId = 'dugeun' } = useParams();
  const [q] = useSearchParams();
  const w = WORDS[wordId] ?? WORDS.dugeun;
  const book = bookFor(w.id, q.get('book'));
  return { w, book, qs: `?book=${book.id}` };
}
