import { useParams } from 'react-router-dom';
import { GoLink } from '../../lib/nav';
import { AnimWord, Header, Icon, TabBar, TypeTag, speak } from '../../components/ui';
import { BOOKS, WORDS, bookById } from '../../data/content';

/* 책 한 권(한 페이지)의 단어 카드 목록. 카드 → 단어 상세 */
export function WordListPage() {
  const { bookId } = useParams();
  const book = bookById(bookId) ?? BOOKS[0];
  const words = book.wordIds.map((id) => WORDS[id]);
  return (
    <div className="screen">
      <Header title={`이 페이지의 표현 (${words.length})`} to="/books" />
      <div className="content" style={{ paddingTop: 4, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="pill" style={{ background: '#fff', border: '1px solid var(--border)', padding: '6px 12px', fontSize: 13, color: 'var(--text-body)' }}>{Icon.book(16)}{book.title}{book.page && ` · ${book.page}`}</span>
          <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>카드를 눌러 배워요</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {words.map((w) => (
            <div key={w.id} style={{ position: 'relative' }}>
              <GoLink to={`/words/${w.id}?book=${book.id}`} className="card" style={{ padding: '10px 10px 14px', display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', color: 'inherit', height: '100%' }}>
                <div style={{ position: 'relative', height: 80, borderRadius: 14, overflow: 'hidden', background: 'var(--bg)' }}>
                  <img src={w.image} alt={`${w.text} 그림`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <TypeTag type={w.type} style={{ position: 'absolute', top: 6, left: 6, boxShadow: '0 1px 4px rgba(0,0,0,.12)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '0 4px' }}>
                  {/* 디자인은 단어 줄 오른쪽에 듣기 버튼(28px, 간격 6px)이 있음 → 같은 자리를 비우고 버튼은 링크 밖에 절대 위치 */}
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: 28, paddingRight: 34 }}>
                    <span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: w.text.length > 5 ? 15 : 19, lineHeight: 1.3 }}>
                      <AnimWord text={w.text} motion={w.motion} />
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>{w.meaning}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{w.vi}</span>
                </div>
              </GoLink>
              <button aria-label={`${w.text} 듣기`} onClick={() => speak(w.text)}
                style={{ position: 'absolute', top: 99, right: 15, width: 28, height: 28, padding: 0, borderRadius: '50%', border: 0, background: 'var(--mint-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 010 7" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
      <TabBar />
    </div>
  );
}
