import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header, Highlight, Icon } from '../components/ui';
import { WORDS } from '../data/content';
import { checkSentence, type SentenceFeedback } from '../api/client';
import type { Profile } from '../store/profile';

function useWord() {
  const { wordId = 'dugeun' } = useParams();
  const [q] = useSearchParams();
  const book = q.get('book');
  return { w: WORDS[wordId] ?? WORDS.dugeun, qs: book ? `?book=${book}` : '' };
}

/* E-1 문장 작성 */
export function PracticeWrite() {
  const { w, qs } = useWord();
  const nav = useNavigate();
  const [text, setText] = useState('');
  const josa = /[가-힣]$/.test(w.text) && (w.text.charCodeAt(w.text.length - 1) - 0xac00) % 28 ? '을' : '를';
  return (
    <div className="screen">
      <Header title="문장 연습" to={`/word/${w.id}${qs}`} />
      <div className="content" style={{ gap: 16 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 22, padding: 20 }}>
          <span className="chip chip-primary" style={{ alignSelf: 'flex-start', fontSize: 16 }}>{w.text}</span>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.45 }}>‘{w.text}’{josa} 넣어<br />한 문장 써 보세요</p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-sub)' }}>틀려도 괜찮아요. 같이 다듬어 봐요.</p>
        </div>
        <div className="field">
          <label htmlFor="sentence">내 문장</label>
          <textarea id="sentence" className="textarea" maxLength={100} placeholder="여기에 직접 문장을 입력해 보세요" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <button type="button" className="btn btn-soft" onClick={() => alert('음성 입력은 백엔드 연결 후 POST /speech/transcriptions로 이어집니다.')}>{Icon.mic(18)}마이크로 입력</button>
      </div>
      <div className="bottom-bar">
        <button className="btn btn-primary" disabled={!text.trim()} onClick={() => nav(`/practice/${w.id}/review${qs}`, { state: { sentence: text } })}>완료</button>
      </div>
    </div>
  );
}

/* E-2 AI 검토 중 */
export function PracticeReview({ profile }: { profile: Profile }) {
  const { w, qs } = useWord();
  const nav = useNavigate();
  const sentence = (useLocation().state as { sentence?: string } | null)?.sentence;
  useEffect(() => {
    if (!sentence) return;
    let alive = true;
    checkSentence(w, sentence, profile.childId).then((fb) => {
      if (alive) nav(`/practice/${w.id}/feedback${qs}`, { replace: true, state: { fb } });
    });
    return () => { alive = false; };
  }, [sentence, w, qs, nav, profile.childId]);
  if (!sentence) return <Navigate to={`/practice/${w.id}${qs}`} replace />;
  return (
    <div className="screen">
      <Header title="문장 연습" back={false} center />
      <div className="content center" style={{ gap: 22, paddingBottom: 80 }} aria-live="polite">
        <div style={{ width: 148, height: 148, borderRadius: 44, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center' }}>
          <div className="typing" style={{ background: '#fff', borderRadius: 22, height: 64, padding: '0 22px', boxShadow: '0 6px 16px rgba(28,122,108,.14)' }}>
            <i style={{ background: 'var(--primary)', width: 12, height: 12 }} /><i style={{ background: 'var(--primary)', width: 12, height: 12 }} /><i style={{ background: 'var(--primary)', width: 12, height: 12 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <b style={{ fontSize: 20 }}>문장을 살펴보고 있어요</b>
          <span style={{ fontSize: 15, color: 'var(--text-sub)' }}>잘한 점과 다듬을 점을 찾는 중이에요</span>
        </div>
      </div>
    </div>
  );
}

/* E-3 / E-3-1 / E-4 AI 피드백 */
export function PracticeFeedback() {
  const { w, qs } = useWord();
  const fb = (useLocation().state as { fb?: SentenceFeedback } | null)?.fb;
  if (!fb) return <Navigate to={`/practice/${w.id}${qs}`} replace />;

  const mySentence = (cls?: string) => {
    if (!fb.wrongPart || !fb.original.includes(fb.wrongPart)) return fb.original;
    const [a, ...rest] = fb.original.split(fb.wrongPart);
    return <>{a}<span className={cls}>{fb.wrongPart}</span>{rest.join(fb.wrongPart)}</>;
  };

  if (fb.kind === 'natural') {
    return (
      <div className="screen">
        <Header title="AI 피드백" to={`/practice/${w.id}${qs}`} />
        <div className="content" style={{ justifyContent: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--mint)', display: 'grid', placeItems: 'center' }}>{Icon.check(38)}</span>
            <b style={{ fontSize: 22 }}>아주 자연스러웠어요!</b>
          </div>
          <div className="card selected"><p className="card-label teal">내 문장</p><p style={{ margin: 0, fontSize: 18, lineHeight: 1.7 }}><Highlight sentence={fb.original} word={w.text} /></p></div>
          {w.similar.length > 0 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <b style={{ fontSize: 16 }}>이런 표현도 써 보세요</b>
              {w.similar.map((s) => (
                <div key={s.text} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ fontWeight: 800, fontSize: 17, flex: 'none' }}>{s.text}</span><span style={{ fontSize: 14, color: 'var(--text-body)' }}>{s.feel} · {s.when}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="bottom-bar">
          <Link to={`/practice/${w.id}${qs}`} className="btn btn-outline">한번 더 연습</Link>
          <Link to={`/talk/${w.id}${qs}`} className="btn btn-primary">대화 연습</Link>
        </div>
      </div>
    );
  }

  const meaning = fb.kind === 'meaning';
  return (
    <div className="screen">
      <Header title="AI 피드백" to={`/practice/${w.id}${qs}`} />
      <div className="content" style={{ gap: 12 }}>
        <div className={`banner${meaning ? ' coral' : ''}`}>
          <span className="dot">{meaning ? Icon.search() : Icon.check()}</span>
          <span>{meaning ? <>조금 헷갈렸어요.<br />‘{w.text}’의 뜻을 같이 살펴볼까요?</>
            : fb.kind === 'missing' ? <>좋은 문장이에요!<br />목표 표현을 넣어 볼까요?</>
            : <>의미는 잘 전달됐어요!<br />표현 하나만 다듬어 볼까요?</>}</span>
        </div>
        <div className="card">
          <p className="card-label">내 문장</p>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.7 }}>{mySentence('wavy')}</p>
          {fb.goodPoint && <p style={{ margin: '10px 0 0', paddingTop: 10, borderTop: '1px solid #EEF0F4', fontSize: 14, color: 'var(--primary-dark)', display: 'flex', gap: 8 }}>{Icon.check(18, '#1C7A6C')}{fb.goodPoint}</p>}
        </div>
        {meaning && (
          <div className="card selected">
            <p className="card-label teal">‘{w.text}’은 이런 뜻이에요</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{w.meaning}</p>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-body)' }}>{w.nuance}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-sub)' }}>{w.vi}</p>
          </div>
        )}
        {fb.suggested && fb.kind === 'polish' && (
          <div className="card selected"><p className="card-label teal">이렇게 말해 보세요</p><p style={{ margin: 0, fontSize: 18, lineHeight: 1.7 }}><Highlight sentence={fb.suggested} word={w.text} /></p></div>
        )}
        <div className="hint">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{Icon.bulb()}<b style={{ fontSize: 16 }}>{meaning ? '힌트' : '이 부분만 살짝'}</b></div>
          {fb.tips.map((t) => <p key={t}>{t}</p>)}
        </div>
      </div>
      <div className="bottom-bar">
        {meaning && <Link to={`/word/${w.id}${qs}`} className="btn btn-outline">뜻 다시 보기</Link>}
        <Link to={`/practice/${w.id}${qs}`} className="btn btn-primary">{Icon.pencil(18)}다시 써 보기</Link>
      </div>
    </div>
  );
}
