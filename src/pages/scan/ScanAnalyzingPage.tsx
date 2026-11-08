import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoLink, useGo } from '../../lib/nav';
import { Header, TabBar } from '../../components/ui';

export function ScanAnalyzingPage() {
  const go = useGo();
  const hold = useSearchParams()[0].get('demo') === 'hold';
  useEffect(() => {
    if (hold) return;
    const t = setTimeout(() => go('/books/rabbit'), 2200);
    return () => clearTimeout(t);
  }, [go, hold]);
  return (
    <div className="screen">
      <Header title="표현 찾기" back={false} center />
      <GoLink to="/books/rabbit" aria-label="표현 찾기 완료, 단어 카드 보기" className="content center" style={{ gap: 22, padding: '0 0 80px', textDecoration: 'none', color: 'var(--text)' }}>
        <div style={{ width: 148, height: 148, borderRadius: 44, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center' }}>
          <span className="mw mw-hop loop" aria-hidden="true" style={{ fontSize: 40, fontWeight: 800, color: 'var(--primary)', letterSpacing: 4 }}>
            {['가', '나', '다'].map((ch, i) => <span key={i} style={{ animationDelay: `${i * 0.15}s` }}>{ch}</span>)}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <b style={{ fontSize: 20 }}>글을 읽고 있어요</b>
          <span style={{ fontSize: 15, color: 'var(--text-sub)' }}>배울 표현을 고르는 중이에요</span>
        </div>
      </GoLink>
      <TabBar />
    </div>
  );
}
