import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../../components/ui';
import { checkSentence } from '../../api/client';
import type { Profile } from '../../store/profile';
import { DEMO_SENTENCE, LOCAL_CSS, sparkPath, usePracticeWord } from './shared';

/* AI 검토 중 (로딩). 끝나면 피드백으로 replace → 뒤로가기로 다시 나오지 않음 */
export function PracticeReviewingPage({ profile }: { profile: Profile }) {
  const { w, qs, demo } = usePracticeWord();
  const nav = useNavigate();
  const hold = demo === 'waiting'; // 시연용: ?demo=waiting 이면 검토 중 화면에 머문다
  const sentence = (useLocation().state as { sentence?: string } | null)?.sentence ?? (hold ? DEMO_SENTENCE.polish : undefined);
  useEffect(() => {
    if (!sentence || hold) return;
    let alive = true;
    checkSentence(w, sentence, profile.childId).then((fb) => {
      if (alive) nav(`/words/${w.id}/practice/feedback${qs}`, { replace: true, state: { fb } });
    });
    return () => { alive = false; };
  }, [sentence, hold, w, qs, nav, profile.childId]);
  if (!sentence) return <Navigate to={`/words/${w.id}/practice${qs}`} replace />;
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
    </div>
  );
}
