import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoLink, useGo } from '../../lib/nav';
import { Header, Icon, TabBar } from '../../components/ui';
import { ApiError, USE_MOCK, analyzePhoto, isTransientAiError, setChildLanguage, withChild } from '../../api/client';
import { isLearnable, peekPendingPhoto, saveScan, setPendingPhoto } from '../../data/scanned';
import { PHOTO_TOO_LARGE } from '../../lib/photo';
import type { Profile } from '../../store/profile';

export function ScanAnalyzingPage({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const go = useGo();
  const nav = useNavigate();
  const hold = useSearchParams()[0].get('demo') === 'hold';
  const [photo] = useState(peekPendingPhoto);
  const live = !USE_MOCK && !!photo;
  const [error, setError] = useState<{ title?: string; message: string; retry: boolean; photo?: boolean } | null>(null);
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
        // 분석은 됐는데 배울 표현이 없음 → '실패'가 아니라 다른 페이지를 안내하는 화면으로
        // 감정 표현은 단어 목록에 넣지 않는다. 남는 표현이 없으면 '배울 표현이 없어요' 화면으로
        const learnable = r.expressions.filter(isLearnable);
        if (learnable.length === 0) { setPendingPhoto(null); nav('/scan/empty?reason=no-expressions', { replace: true }); return; }
        setPendingPhoto(null);
        const bookId = saveScan({ ...r, expressions: learnable }); // 찍을 때마다 새 책으로 저장
        go(`/books/${bookId}`);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        // 사진에서 글자를 못 읽음 → 실패가 아니라 다시 찍는 방법을 안내하는 화면으로
        if (e instanceof ApiError && e.code === 'IMAGE_QUALITY_LOW') { setPendingPhoto(null); nav('/scan/empty?reason=no-text', { replace: true }); return; }
        // 사진 용량·형식 문제는 '분석 실패'가 아니라 사진 안내로 보여 준다
        const photoProblem = e instanceof ApiError && (e.code === 'FILE_TOO_LARGE' || e.code === 'UNSUPPORTED_MEDIA_TYPE');
        setError({
          title: photoProblem ? '사진을 다시 확인해 주세요' : undefined,
          message: e instanceof ApiError && e.code === 'FILE_TOO_LARGE' ? PHOTO_TOO_LARGE
            : e instanceof ApiError ? e.message : '사진을 분석하는 중에 문제가 생겼어요. 다시 시도해 주세요.',
          retry: !photoProblem && (isTransientAiError(e) || (e instanceof ApiError && (e.retryable || e.status >= 500))),
          photo: photoProblem,
        });
      });
    return () => ctrl.abort();
    // 사진 한 장(또는 '다시 시도' 한 번)당 한 번만 실행한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, live, attempt]);

  if (error) {
    // 분석 실패 화면 ('표현 없음'·'글자 없음' 안내 화면과 같은 모양, 실패라는 걸 알 수 있게 주황색 아이콘)
    const tips = error.photo
      ? ['4MB 이하의 JPG·PNG 사진으로 찍거나 골라 주세요', '화면 촬영 버튼으로 찍으면 크기가 알맞게 맞춰져요']
      : error.retry
        ? ['사진은 그대로 있어요. 아래 ‘같은 사진으로 다시 시도’를 눌러 주세요', '여러 번 안 되면 잠시 기다렸다가 다시 찍어 주세요']
        : ['다른 페이지를 찍거나, 잠시 뒤에 다시 시도해 주세요'];
    const retake = () => { setPendingPhoto(null); go('/scan'); };
    return (
      <div className="screen">
        <Header title="표현 찾기" to="/books" />
        <div className="content" style={{ gap: 18, paddingTop: 20, paddingBottom: 16 }} role="alert">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <span style={{ width: 88, height: 88, borderRadius: 28, background: 'var(--coral-soft)', display: 'grid', placeItems: 'center', color: 'var(--coral)' }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5" /><path d="M12 16.5h.01" /></svg>
            </span>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.4, letterSpacing: '-0.02em' }}>{error.title ?? '사진을 분석하지 못했어요'}</h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--text-body)', wordBreak: 'keep-all' }}>{error.message}</p>
          </div>
          <div className="hint" style={{ gap: 8, borderRadius: 18, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{Icon.bulb()}<b style={{ fontSize: 15 }}>이렇게 해 보세요</b></div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tips.map((t) => <li key={t} style={{ fontSize: 14, lineHeight: 1.55, wordBreak: 'keep-all' }}>{t}</li>)}
            </ul>
          </div>
        </div>
        <div className="bottom-bar sticky" style={{ flexDirection: 'column' }}>
          {error.retry ? (
            <>
              <button className="btn btn-primary" onClick={() => { setError(null); setAttempt((n) => n + 1); }}>같은 사진으로 다시 시도</button>
              <button className="btn btn-outline" style={{ fontSize: 16 }} onClick={retake}>{Icon.camera(20)}다시 찍기</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={retake}>{Icon.camera(20)}다시 찍기</button>
              <GoLink to="/books" className="btn btn-outline" style={{ fontSize: 16 }}>예시 동화책으로 배우기</GoLink>
            </>
          )}
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
