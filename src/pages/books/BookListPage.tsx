import { GoLink } from '../../lib/nav';
import { PageTitle, TabBar, Icon } from '../../components/ui';
import { BOOKS } from '../../data/content';

/* 동화책 고르기 (탭): 책 카드 → 단어 목록, 책 추가하기 → 촬영 */
export function BookListPage() {
  return (
    <div className="screen">
      <PageTitle title="동화책 고르기" sub="책을 고르면 배울 표현이 바로 나와요" />
      <div className="content" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignContent: 'start', gap: 14, paddingTop: 14 }}>
        {BOOKS.map((b) => (
          <GoLink key={b.id} to={`/books/${b.id}`} className="card" style={{ padding: '10px 10px 14px', display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ height: 176, borderRadius: 14, overflow: 'hidden', background: b.coverBg }}>
              <img src={b.cover} alt={b.coverAlt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 4px' }}>
              <b style={{ fontSize: 15 }}>{b.title}</b>
              <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>표현 {b.wordIds.length}개</span>
            </div>
          </GoLink>
        ))}
      </div>
      <div style={{ flex: 'none', padding: '12px 20px 14px', background: 'var(--bg)' }}>
        <GoLink to="/scan" className="btn btn-navy" style={{ gap: 10 }}>{Icon.camera()}책 추가하기</GoLink>
      </div>
      <TabBar />
    </div>
  );
}
