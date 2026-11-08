import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimWord, Header, Icon, PageTitle, TabBar, TypeTag, speak } from '../components/ui';
import { BOOKS, WORDS, bookById } from '../data/content';

/* C-1 동화책 고르기 */
export function BookList() {
  return (
    <div className="screen">
      <PageTitle title="동화책 고르기" sub="책을 고르면 배울 표현이 바로 나와요" />
      <div className="content" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignContent: 'start', gap: 14, paddingTop: 14 }}>
        {BOOKS.map((b) => (
          <Link key={b.id} to={`/books/${b.id}`} className="card" style={{ padding: '10px 10px 14px', display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ height: 176, borderRadius: 14, overflow: 'hidden', background: b.coverBg }}>
              <img src={b.cover} alt={b.coverAlt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 4px' }}>
              <b style={{ fontSize: 15 }}>{b.title}</b>
              <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>표현 {b.wordIds.length}개</span>
            </div>
          </Link>
        ))}
      </div>
      <div style={{ flex: 'none', padding: '12px 20px 14px', background: 'var(--bg)' }}>
        <Link to="/camera" className="btn btn-navy" style={{ gap: 10 }}>{Icon.camera()}책 추가하기</Link>
      </div>
      <TabBar />
    </div>
  );
}

/* C-2 촬영 (실제 카메라는 <input type="file" capture>로 연결) */
export function Camera() {
  const nav = useNavigate();
  const corner = (pos: React.CSSProperties, sides: string) => (
    <span style={{ position: 'absolute', width: 44, height: 44, ...pos, borderStyle: 'solid', borderColor: 'var(--mint)', borderWidth: 0, ...Object.fromEntries(sides.split(' ').map((s) => [`border${s}Width`, 4])) }} />
  );
  return (
    <div className="screen" style={{ background: '#12151F', color: '#fff' }}>
      <header className="header">
        <button className="icon-btn" style={{ color: '#fff' }} aria-label="뒤로" onClick={() => nav('/books')}>{Icon.back()}</button>
        <h1>촬영</h1>
      </header>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 0' }}>
        <label style={{ flex: 1, position: 'relative', borderRadius: 28, background: 'var(--navy)', display: 'grid', placeItems: 'center', cursor: 'pointer', minHeight: 420 }}>
          {corner({ top: 24, left: 24, borderTopLeftRadius: 14 }, 'Top Left')}
          {corner({ top: 24, right: 24, borderTopRightRadius: 14 }, 'Top Right')}
          {corner({ bottom: 24, left: 24, borderBottomLeftRadius: 14 }, 'Bottom Left')}
          {corner({ bottom: 24, right: 24, borderBottomRightRadius: 14 }, 'Bottom Right')}
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#9AA3B5' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1V19c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1V5.5z" /><path d="M12 6.5V20" /></svg>
            <span style={{ fontSize: 14 }}>카메라 화면</span></span>
          <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={() => nav('/extracting')} />
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#232838', borderRadius: 16, padding: '12px 14px', fontSize: 14, lineHeight: 1.5, color: '#E6EAF2' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F7C948" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" /></svg>
          <span>한 페이지를 틀 안에 맞추고, 밝은 곳에서 찍으면 글자가 잘 읽혀요</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '22px 20px 26px' }}>
        <button aria-label="촬영" onClick={() => nav('/extracting')} style={{ width: 78, height: 78, borderRadius: '50%', border: '4px solid #fff', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <span style={{ width: 62, height: 62, borderRadius: '50%', background: '#fff' }} />
        </button>
        <span style={{ fontSize: 13, color: '#B7BFCD' }}>사진은 저장되지 않고 글자를 읽은 뒤 바로 삭제돼요</span>
      </div>
    </div>
  );
}

/* C-3 표현 찾는 중 (백엔드: POST /books/pages/{pageId}/analysis-jobs → GET /analysis-jobs/{jobId} 폴링) */
export function Extracting() {
  const nav = useNavigate();
  // 시연용: ?demo=hold 이면 자동으로 넘어가지 않고 이 화면에 머문다 (누르면 C-4)
  const hold = useSearchParams()[0].get('demo') === 'hold';
  useEffect(() => {
    if (hold) return;
    const t = setTimeout(() => nav('/books/rabbit', { replace: true }), 2200);
    return () => clearTimeout(t);
  }, [nav, hold]);
  return (
    <div className="screen">
      <Header title="표현 찾기" back={false} center />
      <Link to="/books/rabbit" replace aria-label="표현 찾기 완료, 단어 카드 보기" className="content center" style={{ gap: 22, padding: '0 0 80px', textDecoration: 'none', color: 'var(--text)' }}>
        <div style={{ width: 148, height: 148, borderRadius: 44, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center' }}>
          {/* 디자인: 글자 간격 0.15s로 깡충 (AnimWord 기본 0.13s와 달라 직접 나눔) */}
          <span className="mw mw-hop loop" aria-hidden="true" style={{ fontSize: 40, fontWeight: 800, color: 'var(--primary)', letterSpacing: 4 }}>
            {['가', '나', '다'].map((ch, i) => <span key={i} style={{ animationDelay: `${i * 0.15}s` }}>{ch}</span>)}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <b style={{ fontSize: 20 }}>글을 읽고 있어요</b>
          <span style={{ fontSize: 15, color: 'var(--text-sub)' }}>배울 표현을 고르는 중이에요</span>
        </div>
      </Link>
    </div>
  );
}

/* C-4 이 페이지의 표현 */
export function WordList() {
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
              <Link to={`/word/${w.id}?book=${book.id}`} className="card" style={{ padding: '10px 10px 14px', display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', color: 'inherit', height: '100%' }}>
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
              </Link>
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
