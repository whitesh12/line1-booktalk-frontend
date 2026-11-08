import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoLink, useGo } from '../../lib/nav';
import { Header, TabBar } from '../../components/ui';
import { ApiError, USE_MOCK, analyzePhoto, withChild } from '../../api/client';
import { SCAN_BOOK_ID, peekPendingPhoto, saveScan, setPendingPhoto } from '../../data/scanned';
import type { Profile } from '../../store/profile';

export function ScanAnalyzingPage({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const go = useGo();
  const hold = useSearchParams()[0].get('demo') === 'hold';
  const [photo] = useState(peekPendingPhoto);
  const live = !USE_MOCK && !!photo;
  const [error, setError] = useState<string | null>(null);

  // 모의 모드(또는 사진 없이 들어온 경우): 예시 책으로 넘어간다
  useEffect(() => {
    if (hold || live) return;
    const t = setTimeout(() => go('/books/rabbit'), 2200);
    return () => clearTimeout(t);
  }, [go, hold, live]);

  // 실제 연동: 업로드 → 분석 → 결과
  useEffect(() => {
    if (!live || !photo) return;
    const ctrl = new AbortController();
    withChild(profile, (childId) => { if (!ctrl.signal.aborted) onSave({ ...profile, childId }); },(childId) => analyzePhoto(photo, childId, ctrl.signal))
      .then((r) => {
        if (ctrl.signal.aborted) return;
        if (r.expressions.length === 0) { setError('이 페이지에서는 배울 표현을 찾지 못했어요. 다른 페이지를 찍어 볼까요?'); return; }
        setPendingPhoto(null);
        saveScan(r);
        go(`/books/${SCAN_BOOK_ID}`);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof ApiError ? e.message : '표현을 찾는 중에 문제가 생겼어요. 다시 시도해 주세요.');
      });
    return () => ctrl.abort();
    // 사진 한 장당 한 번만 실행한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, live]);

  if (error) {
    return (
      <div className="screen">
        <Header title="표현 찾기" back={false} center />
        <div className="content center" style={{ gap: 18, padding: '0 24px 80px', textAlign: 'center' }} role="alert">
          <b style={{ fontSize: 19 }}>표현을 찾지 못했어요</b>
          <span style={{ fontSize: 15, color: 'var(--text-sub)', lineHeight: 1.55 }}>{error}</span>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { setPendingPhoto(null); go('/scan'); }}>다시 찍기</button>
        </div>
        <TabBar />
      </div>
    );
  }

  return (
    <div className="screen">
      <Header title="표현 찾기" back={false} center />
      <GoLink to="/books/rabbit" aria-label="표현 찾기 완료, 단어 카드 보기" className="content center"
        onClick={(e) => { if (live) e.preventDefault(); }}
        style={{ gap: 22, padding: '0 0 80px', textDecoration: 'none', color: 'var(--text)' }}>
        <div style={{ width: 148, height: 148, borderRadius: 44, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center' }}>
          <span className="mw mw-hop loop" aria-hidden="true" style={{ fontSize: 40, fontWeight: 800, color: 'var(--primary)', letterSpacing: 4 }}>
            {['가', '나', '다'].map((ch, i) => <span key={i} style={{ animationDelay: `${i * 0.15}s` }}>{ch}</span>)}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} aria-live="polite">
          <b style={{ fontSize: 20 }}>글을 읽고 있어요</b>
          <span style={{ fontSize: 15, color: 'var(--text-sub)' }}>배울 표현을 고르는 중이에요</span>
        </div>
      </GoLink>
      <TabBar />
    </div>
  );
}
