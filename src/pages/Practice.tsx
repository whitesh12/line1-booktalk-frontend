import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header, Highlight, Icon } from '../components/ui';
import { WORDS } from '../data/content';
import { checkSentence, mockSentenceFeedback, type SentenceFeedback } from '../api/client';
import type { Profile } from '../store/profile';
import { wordVi } from './WordDetail';

/* 이 화면들에만 쓰는 스타일 (E-1 placeholder, E-2 생각 중 애니메이션) */
const LOCAL_CSS = `
#sentence::placeholder{color:#7A8496}
.think-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:#1C7A6C;animation:thinkHop 1.3s ease-in-out infinite}
.think-spark{animation:thinkTw 1.7s ease-in-out infinite}
@keyframes thinkHop{0%,55%,100%{transform:translateY(0);opacity:.45}20%{transform:translateY(-8px);opacity:1}40%{transform:translateY(1px)}}
@keyframes thinkTw{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.8)}}
@media (prefers-reduced-motion:reduce){.think-dot,.think-spark{animation:none!important;opacity:1!important}}
`;
const sparkPath = 'M12 2C12.8 8.5 15.5 11.2 22 12C15.5 12.8 12.8 15.5 12 22C11.2 15.5 8.5 12.8 2 12C8.5 11.2 11.2 8.5 12 2Z';
const cardPad = { padding: '16px 18px' } as const;

/* 시연용 예시 문장 (디자인 E-3 / E-3-1 / E-4와 같은 문장). ?demo=polish|meaning|natural */
const DEMO_SENTENCE: Record<string, string> = {
  polish: '저는 가슴이 두근두근을 해요.',
  meaning: '아이가 넘어져서 두근두근 울었어요.',
  natural: '저는 선물을 열 때 마음이 두근두근해요.',
};

function useWord() {
  const { wordId = 'dugeun' } = useParams();
  const [q] = useSearchParams();
  const book = q.get('book');
  // demo 값은 다음 화면 링크(qs)로 넘기지 않는다
  return { w: WORDS[wordId] ?? WORDS.dugeun, qs: book ? `?book=${book}` : '', demo: q.get('demo') };
}

/* E-1 문장 작성 */
export function PracticeWrite() {
  const { w, qs } = useWord();
  const nav = useNavigate();
  const [text, setText] = useState('');
  const josa = /[가-힣]$/.test(w.text) && (w.text.charCodeAt(w.text.length - 1) - 0xac00) % 28 ? '을' : '를';
  return (
    <div className="screen">
      <style>{LOCAL_CSS}</style>
      <Header title="문장 연습" to={`/word/${w.id}${qs}`} />
      <div className="content" style={{ gap: 16, paddingBottom: 16 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 22, padding: 20 }}>
          <span className="chip chip-primary" style={{ alignSelf: 'flex-start', fontSize: 16 }}>{w.text}</span>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.45 }}>‘{w.text}’{josa} 넣어<br />한 문장 써 보세요</p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-sub)' }}>틀려도 괜찮아요. 같이 다듬어 봐요.</p>
        </div>
        <div className="field">
          <label htmlFor="sentence">내 문장</label>
          <textarea id="sentence" className="textarea" style={{ height: 170 }}maxLength={100} placeholder="여기에 직접 문장을 입력해 보세요" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <button type="button" className="btn btn-soft" onClick={() => alert('음성 입력은 백엔드 연결 후 POST /speech/transcriptions로 이어집니다.')}>{Icon.mic(18)}마이크로 입력</button>
      </div>
      <div className="bottom-bar">
        {/* 디자인처럼 늘 활성 상태. 비어 있으면 입력칸으로 이동 */}
        <button className="btn btn-primary" onClick={() => (text.trim() ? nav(`/practice/${w.id}/review${qs}`, { state: { sentence: text } }) : document.getElementById('sentence')?.focus())}>완료</button>
      </div>
    </div>
  );
}

/* E-2 AI 검토 중 */
export function PracticeReview({ profile }: { profile: Profile }) {
  const { w, qs, demo } = useWord();
  const nav = useNavigate();
  const hold = demo === 'waiting'; // 시연용: ?demo=waiting 이면 검토 중 화면에 머문다
  const sentence = (useLocation().state as { sentence?: string } | null)?.sentence ?? (hold ? DEMO_SENTENCE.polish : undefined);
  useEffect(() => {
    if (!sentence || hold) return;
    let alive = true;
    checkSentence(w, sentence, profile.childId).then((fb) => {
      if (alive) nav(`/practice/${w.id}/feedback${qs}`, { replace: true, state: { fb } });
    });
    return () => { alive = false; };
  }, [sentence, hold, w, qs, nav, profile.childId]);
  if (!sentence) return <Navigate to={`/practice/${w.id}${qs}`} replace />;
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

/* E-3 / E-3-1 / E-4 AI 피드백 */
export function PracticeFeedback() {
  const { w, qs, demo } = useWord();
  const fb = (useLocation().state as { fb?: SentenceFeedback } | null)?.fb
    ?? (demo && DEMO_SENTENCE[demo] ? mockSentenceFeedback(w, DEMO_SENTENCE[demo]) : undefined);
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
          <Link to={`/practice/${w.id}${qs}`} className="btn btn-outline" style={{ fontSize: 16 }}>한번 더 연습</Link>
          <Link to={`/talk/${w.id}${qs}`} className="btn btn-primary" style={{ fontSize: 16 }}>대화 연습</Link>
        </div>
      </div>
    );
  }

  const meaning = fb.kind === 'meaning';
  return (
    <div className="screen">
      <Header title="AI 피드백" to={`/practice/${w.id}${qs}`} />
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
        {meaning && <Link to={`/word/${w.id}${qs}`} className="btn btn-outline" style={{ fontSize: 16 }}>뜻 다시 보기</Link>}
        <Link to={`/practice/${w.id}${qs}`} className="btn btn-primary" style={meaning ? { fontSize: 16 } : undefined}>{Icon.pencil(meaning ? 18 : 20)}다시 써 보기</Link>
      </div>
    </div>
  );
}
