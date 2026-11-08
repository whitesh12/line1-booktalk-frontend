import { Navigate, useLocation } from 'react-router-dom';
import { Header, Highlight, Icon, TabBar } from '../../components/ui';
import { GoLink } from '../../lib/nav';
import { mockSentenceFeedback, type SentenceFeedback } from '../../api/client';
import { wordVi } from '../../data/wordDetail';
import { DEMO_SENTENCE, cardPad, setDraft, usePracticeWord } from './shared';

export function PracticeFeedbackPage() {
  const { w, qs, demo } = usePracticeWord();
  const fb = (useLocation().state as { fb?: SentenceFeedback } | null)?.fb
    ?? (demo && DEMO_SENTENCE[demo] ? mockSentenceFeedback(w, DEMO_SENTENCE[demo]) : undefined);
  if (!fb) return <Navigate to={`/words/${w.id}/practice${qs}`} replace />;

  const mySentence = (cls?: string) => {
    if (!fb.wrongPart || !fb.original.includes(fb.wrongPart)) return fb.original;
    const [a, ...rest] = fb.original.split(fb.wrongPart);
    return <>{a}<span className={cls}>{fb.wrongPart}</span>{rest.join(fb.wrongPart)}</>;
  };

  if (fb.kind === 'natural') {
    return (
      <div className="screen">
        <Header title="AI 피드백" to={`/words/${w.id}/practice${qs}`} />
        <div className="content" style={{ justifyContent: 'center', gap: 16, paddingBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--mint)', display: 'grid', placeItems: 'center' }}>{Icon.check(38)}</span>
            <b style={{ fontSize: 22 }}>아주 자연스러웠어요!</b>
          </div>
          <div className="card selected" style={cardPad}><p className="card-label teal">내 문장</p><p style={{ margin: 0, fontSize: 18, lineHeight: 1.7 }}><Highlight sentence={fb.original} word={w.text} /></p></div>
          {w.similar.length > 0 && (
            <div className="card" style={{ ...cardPad, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <b style={{ fontSize: 16 }}>이런 표현도 써 보세요</b>
              {w.similar.map((s) => (
                <div key={s.text} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: 19, flex: 'none' }}>{s.text}</span><span style={{ fontSize: 14, color: 'var(--text-body)' }}>{s.sample ?? `${s.feel} · ${s.when}`}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="bottom-bar">
          <GoLink to={`/words/${w.id}/practice${qs}`} onClick={() => setDraft(w.id, null)} className="btn btn-outline" style={{ fontSize: 16 }}>한번 더 연습</GoLink>
          <GoLink to={`/words/${w.id}/talk${qs}`} className="btn btn-primary" style={{ fontSize: 16 }}>대화 연습</GoLink>
        </div>
        <TabBar />
      </div>
    );
  }

  const meaning = fb.kind === 'meaning';
  return (
    <div className="screen">
      <Header title="AI 피드백" to={`/words/${w.id}/practice${qs}`} />
      <div className="content" style={{ gap: meaning ? 12 : 14, paddingBottom: 16 }}>
        <div className={`banner${meaning ? ' coral' : ''}`}>
          <span className="dot">{meaning ? Icon.search() : Icon.check()}</span>
          <span>{meaning ? <>조금 헷갈렸어요.<br />‘{w.text}’의 뜻을 같이 살펴볼까요?</>
            : fb.kind === 'missing' ? <>좋은 문장이에요!<br />목표 표현을 넣어 볼까요?</>
            : <>의미는 잘 전달됐어요!<br />표현 하나만 다듬어 볼까요?</>}</span>
        </div>
        <div className="card" style={cardPad}>
          <p className="card-label">내 문장</p>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.7 }}>{mySentence('wavy')}</p>
          {fb.goodPoint && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid #EEF0F4' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C7A6C" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--primary-dark)' }}>{fb.goodPoint}</span>
            </div>
          )}
        </div>
        {meaning && (
          <div className="card selected" style={{ ...cardPad, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p className="card-label teal" style={{ margin: 0 }}>‘{w.text}’은 이런 뜻이에요</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.55 }}>{w.meaning}</p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>{fb.explain ?? w.nuance}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-sub)' }}>{wordVi(w)}</p>
          </div>
        )}
        {fb.suggested && fb.kind === 'polish' && (
          <div className="card selected" style={cardPad}><p className="card-label teal">이렇게 말해 보세요</p><p style={{ margin: 0, fontSize: 18, lineHeight: 1.7 }}><Highlight sentence={fb.suggested} word={w.text} /></p></div>
        )}
        <div className="hint" style={{ gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{Icon.bulb()}<b style={{ fontSize: 16 }}>{meaning ? '힌트' : '이 부분만 살짝'}</b></div>
          {fb.tips.map((t) => <p key={t}>{t}</p>)}
        </div>
      </div>
      <div className="bottom-bar">
        {meaning && <GoLink to={`/words/${w.id}${qs}`} className="btn btn-outline" style={{ fontSize: 16 }}>뜻 다시 보기</GoLink>}
        <GoLink to={`/words/${w.id}/practice${qs}`} onClick={() => setDraft(w.id, fb.original)} className="btn btn-primary" style={meaning ? { fontSize: 16 } : undefined}>{Icon.pencil(meaning ? 18 : 20)}다시 써 보기</GoLink>
      </div>
      <TabBar />
    </div>
  );
}
