import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoLink, useGo } from '../../lib/nav';
import { Header } from '../../components/ui';

/* 표현 찾는 중 (백엔드: POST /books/pages/{pageId}/analysis-jobs → GET /analysis-jobs/{jobId} 폴링).
   끝나면 단어 목록으로 — 촬영·로딩 화면은 기록에서 지운다 */
export function ScanAnalyzingPage() {
  const go = useGo();
  // 시연용: ?demo=hold 이면 자동으로 넘어가지 않고 이 화면에 머문다 (누르면 단어 목록)
  const hold = useSearchParams()[0].get('demo') === 'hold';
  // go()가 표현 찾는 중·촬영 기록을 되감고 단어 목록으로 간다 → 뒤로가기로 로딩·촬영 화면이 다시 나오지 않음
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
          {/* 디자인: 글자 간격 0.15s로 깡충 (AnimWord 기본 0.13s와 달라 직접 나눔) */}
          <span className="mw mw-hop loop" aria-hidden="true" style={{ fontSize: 40, fontWeight: 800, color: 'var(--primary)', letterSpacing: 4 }}>
            {['가', '나', '다'].map((ch, i) => <span key={i} style={{ animationDelay: `${i * 0.15}s` }}>{ch}</span>)}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <b style={{ fontSize: 20 }}>글을 읽고 있어요</b>
          <span style={{ fontSize: 15, color: 'var(--text-sub)' }}>배울 표현을 고르는 중이에요</span>
        </div>
      </GoLink>
    </div>
  );
}
