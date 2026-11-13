import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoLink, useGo } from '../../lib/nav';
import { Header, TabBar } from '../../components/ui';
import { ApiError, USE_MOCK, analyzePhoto, isTransientAiError, setChildLanguage, withChild } from '../../api/client';
import { peekPendingPhoto, saveScan, setPendingPhoto } from '../../data/scanned';
import { PHOTO_TOO_LARGE } from '../../lib/photo';
import type { Profile } from '../../store/profile';

export function ScanAnalyzingPage({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const go = useGo();
  const nav = useNavigate();
  const hold = useSearchParams()[0].get('demo') === 'hold';
  const [photo] = useState(peekPendingPhoto);
  const live = !USE_MOCK && !!photo;
  const [error, setError] = useState<{ title?: string; message: string; retry: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0); // '다시 시도'를 누르면 같은 사진으로 다시 분석

  // 서버 모드인데 사진 없이 들어온 경우(뒤로가기·새로고침): 예시 책을 결과처럼 보여 주지 않고 촬영 화면으로 돌려보낸다
  useEffect(() => {
    if (hold || USE_MOCK || photo) return;
    nav('/scan', { replace: true });
  }, [hold, photo, nav]);

  // 서버를 쓰지 않는 모드(예시 데이터): 예시 책으로 넘어간다
  useEffect(() => {
    if (hold || !USE_MOCK) return;
    const t = setTimeout(() => go('/books/rabbit'), 2200);
    return () => clearTimeout(t);
  }, [go, hold]);

  // 실제 연동: 업로드 → 분석 → 결과
  useEffect(() => {
    if (!live || !photo) return;
    const ctrl = new AbortController();
    const run = (childId: string) => setChildLanguage(childId, profile.lang) // 번역이 지금 설정한 설명 언어로 나오게
      .then(() => analyzePhoto(photo, childId, ctrl.signal))
      // AI 서버가 깨어나는 중이면 첫 분석이 금방 실패할 수 있어, 잠깐 기다렸다가 한 번 더 해 본다.
      .catch(async (e) => {
        if (!isTransientAiError(e) || ctrl.signal.aborted) throw e;
        await new Promise((r) => setTimeout(r, 3000));
        return analyzePhoto(photo, childId, ctrl.signal);
      });
    withChild(profile, (childId) => { if (!ctrl.signal.aborted) onSave({ ...profile, childId }); }, run)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        if (r.expressions.length === 0) { setError({ message: '이 페이지에서는 배울 표현을 찾지 못했어요. 다른 페이지를 찍어 볼까요?', retry: false }); return; }
        setPendingPhoto(null);
        const bookId = saveScan(r); // 찍을 때마다 새 책으로 저장
        go(`/books/${bookId}`);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        // 사진 용량·형식 문제는 '분석 실패'가 아니라 사진 안내로 보여 준다
        const photoProblem = e instanceof ApiError && (e.code === 'FILE_TOO_LARGE' || e.code === 'UNSUPPORTED_MEDIA_TYPE');
        setError({
          title: photoProblem ? '사진을 다시 확인해 주세요' : undefined,
          message: e instanceof ApiError && e.code === 'FILE_TOO_LARGE' ? PHOTO_TOO_LARGE
            : e instanceof ApiError ? e.message : '표현을 찾는 중에 문제가 생겼어요. 다시 시도해 주세요.',
          retry: !photoProblem && isTransientAiError(e),
        });
      });
    return () => ctrl.abort();
    // 사진 한 장(또는 '다시 시도' 한 번)당 한 번만 실행한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, live, attempt]);

  if (error) {
    return (
      <div className="screen">
        <Header title="표현 찾기" back={false} center />
        <div className="content center" style={{ gap: 18, padding: '0 24px 80px', textAlign: 'center' }} role="alert">
          <b style={{ fontSize: 19 }}>{error.title ?? '표현을 찾지 못했어요'}</b>
          <span style={{ fontSize: 15, color: 'var(--text-sub)', lineHeight: 1.55 }}>{error.message}</span>
          {error.retry && (
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { setError(null); setAttempt((n) => n + 1); }}>같은 사진으로 다시 시도</button>
          )}
          <button className={`btn ${error.retry ? 'btn-outline' : 'btn-primary'}`} style={error.retry ? undefined : { marginTop: 8 }}
            onClick={() => { setPendingPhoto(null); go('/scan'); }}>다시 찍기</button>
        </div>
        <TabBar />
      </div>
    );
  }

  return (
    <div className="screen">
      <Header title="표현 찾기" back={false} center />
      <GoLink to="/books/rabbit" aria-label="표현 찾기 완료, 단어 카드 보기" className="content center"
        onClick={(e) => { if (!USE_MOCK) e.preventDefault(); }}
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
