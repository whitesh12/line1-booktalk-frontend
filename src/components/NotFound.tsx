import { useParams } from 'react-router-dom';
import { GoLink } from '../lib/nav';
import { BOOKS, WORDS, bookById } from '../data/content';
import { Header, Icon, TabBar } from './ui';

/** 지운 책이나 예전 링크처럼 없는 책·단어로 들어왔을 때: 다른 책·단어를 대신 보여 주지 않고 안내한다 */
export function NotFound({ kind }: { kind: 'book' | 'word' }) {
  const t = kind === 'book'
    ? { title: '그림책을 찾을 수 없어요', body: '지워졌거나 이 기기에 저장되지 않은 그림책이에요.' }
    : { title: '단어를 찾을 수 없어요', body: '지워졌거나 이 기기에 저장되지 않은 단어예요.' };
  return (
    <div className="screen">
      <Header title={kind === 'book' ? '내 동화책' : '단어'} to="/books" />
      <div className="content center" role="alert" style={{ gap: 14, textAlign: 'center', paddingBottom: 80 }}>
        <span style={{ width: 88, height: 88, borderRadius: 28, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>{Icon.book(34)}</span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.4 }}>{t.title}</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--text-body)', wordBreak: 'keep-all' }}>{t.body}<br />내 동화책에서 다시 골라 주세요.</p>
        <GoLink to="/books" className="btn btn-primary" style={{ marginTop: 8 }}>내 동화책으로</GoLink>
      </div>
      <TabBar />
    </div>
  );
}

/** 주소의 책·단어가 있을 때만 화면을 보여 준다 */
export function RequireBook({ children }: { children: React.ReactNode }) {
  const { bookId } = useParams();
  return bookById(bookId) || !BOOKS.length ? <>{children}</> : <NotFound kind="book" />;
}
export function RequireWord({ children }: { children: React.ReactNode }) {
  const { wordId } = useParams();
  return wordId && WORDS[wordId] ? <>{children}</> : <NotFound kind="word" />;
}
