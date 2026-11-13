import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Header, TabBar } from '../../components/ui';
import { ApiError, USE_MOCK, checkSentence, withChild } from '../../api/client';
import { loadDemoVocab, trackLearning } from '../../api/ai';
import { serverVocabId } from '../../data/scanned';
import type { Profile } from '../../store/profile';
import { DEMO_SENTENCE, LOCAL_CSS, setDraft, sparkPath, usePracticeWord } from './shared';

export function PracticeReviewingPage({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const { w, qs, demo } = usePracticeWord();
  const nav = useNavigate();
  const hold = demo === 'waiting';
  const sentence = (useLocation().state as { sentence?: string } | null)?.sentence ?? (hold ? DEMO_SENTENCE.polish : undefined);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // '다시 시도'를 누르면 같은 문장으로 다시 확인

  useEffect(() => {
    if (!sentence || hold) return;
    let alive = true;
    // 서버를 쓰는 모드: 서버(AI) 판정만 쓴다. 단어의 서버 id 를 아직 모르면 시연용 책 단어를 다시 불러와 본다.
    const run = USE_MOCK
      ? checkSentence(w, sentence)
      : withChild(profile, (childId) => { if (alive) onSave({ ...profile, childId }); }, async (childId) => {
        let vocabularyId = serverVocabId(w.id);
        if (!vocabularyId) { await loadDemoVocab(); vocabularyId = serverVocabId(w.id); }
        return checkSentence(w, sentence, childId, vocabularyId);
      });
    run
      .then((fb) => {
        if (!alive) return;
        trackLearning(w.id, 'practiced'); // 문장 연습을 한 번 마쳤다
        nav(`/words/${w.id}/practice/feedback${qs}`, { replace: true, state: { fb } });
      })
      .catch((e) => {
        if (!alive) return;
        console.warn('[sentence-practices] 문장 첨삭 실패', e);
        setError(e instanceof ApiError ? e.message : '문장을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence, hold, w, qs, nav, attempt]);

  if (!sentence) return <Navigate to={`/words/${w.id}/practice${qs}`} replace />;

  // 실패하면 '통과'로 처리하지 않고 다시 시도하게 한다.
  if (error) {
    return (
      <div className="screen">
        <Header title="문장 연습" back={false} center />
        <div className="content center" style={{ gap: 18, padding: '0 24px 80px', textAlign: 'center' }} role="alert">
          <b style={{ fontSize: 19 }}>문장을 확인하지 못했어요</b>
          <span style={{ fontSize: 15, color: 'var(--text-sub)', lineHeight: 1.55 }}>{error}</span>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { setError(null); setAttempt((n) => n + 1); }}>다시 시도</button>
          <button className="btn btn-outline" onClick={() => { setDraft(w.id, sentence); nav(`/words/${w.id}/practice${qs}`, { replace: true }); }}>문장 고쳐 쓰기</button>
        </div>
        <TabBar />
      </div>
    );
  }
  return (
    <div className="screen">
      <style>{LOCAL_CSS}</style>
      <Header title="문장 연습" back={false} center />
      <div className="content center" style={{ gap: 22, paddingBottom: 80 }} aria-live="polite">
        <div style={{ width: 148, height: 148, borderRadius: 44, background: 'var(--mint-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg className="think-spark" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ position: 'absolute', top: 18, right: 20 }}><path d={sparkPath} fill="#5EC2B2" /></svg>
          <svg className="think-spark" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style={{ position: 'absolute', top: 40, right: 12, animationDelay: '0.6s' }}><path d={sparkPath} fill="#F6B73C" /></svg>
          <div style={{ position: 'relative', width: 92, height: 64, borderRadius: 22, background: '#fff', boxShadow: '0 6px 16px rgba(28, 122, 108, 0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
            <span className="think-dot" /><span className="think-dot" style={{ animationDelay: '0.15s' }} /><span className="think-dot" style={{ animationDelay: '0.3s' }} />
            <span style={{ position: 'absolute', bottom: -9, left: 18, width: 18, height: 18, background: '#fff', transform: 'rotate(45deg)', borderRadius: 3 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <b style={{ fontSize: 20 }}>문장을 살펴보고 있어요</b>
          <span style={{ fontSize: 15, color: 'var(--text-sub)' }}>잘한 점과 다듬을 점을 찾는 중이에요</span>
        </div>
      </div>
      <TabBar />
    </div>
  );
}
