import { useEffect, useRef, useState } from 'react';
import { useBlocker, useSearchParams } from 'react-router-dom';
import { Header, Icon, KidMessage } from '../../components/ui';
import type { Word } from '../../data/content';
import { isIntentionalNav, useGo } from '../../lib/nav';
import { MAX_TURNS, childScript, openingLine, sendToChild, talkFeedbackTips } from '../../api/client';
import type { Profile } from '../../store/profile';
import { useTalk } from './shared';

type Msg = { from: 'kid'; text: string } | { from: 'me'; text: string } | { from: 'feedback'; tips: string[] };
type Seed = { msgs: Msg[]; turn: number; waiting: boolean };

function demoSeed(demo: string | null, w: Word, name: string): Seed {
  const kid = (text: string): Msg => ({ from: 'kid', text });
  const me = (text: string): Msg => ({ from: 'me', text });
  const first = [kid(openingLine()), me(`맞아, 토끼 마음이 ${w.text}했을 것 같아!`), kid(childScript(0))];
  const wrong = me(`좋아하는 거 보면 마음이 ${w.text}을 해.`);
  switch (demo) {
    case 'chat': return { msgs: first, turn: 1, waiting: false };
    case 'waiting': return { msgs: [...first, wrong], turn: 1, waiting: true };
    case 'feedback': return { msgs: [...first, wrong, { from: 'feedback', tips: talkFeedbackTips(w) }], turn: 1, waiting: false };
    case 'done': return {
      msgs: [...first,
        me('좋아하는 걸 보면 마음이 자꾸 뛰는 거야. 토끼도 당근을 보고 그랬을 거야.'), kid(childScript(1)),
        me(`맞아! 그때 ${name}이 마음도 ${w.text}했겠다.`), kid(childScript(2)),
        me(`토끼가 당근 보고 ${w.text}한 것처럼, ${name}이도 소풍 생각하면 ${w.text}하지?`)],
      turn: MAX_TURNS, waiting: false,
    };
    default: return { msgs: [kid(openingLine())], turn: 0, waiting: false };
  }
}

export function TalkChatPage({ profile }: { profile: Profile }) {
  const { w, qs } = useTalk();
  const go = useGo();
  const demo = useSearchParams()[0].get('demo');
  const [seed] = useState(() => demoSeed(demo, w, profile.childName));
  const [msgs, setMsgs] = useState<Msg[]>(seed.msgs);
  const [text, setText] = useState('');
  const [waiting, setWaiting] = useState(seed.waiting);
  const [turn, setTurn] = useState(seed.turn);
  const done = turn >= MAX_TURNS;
  const end = useRef<HTMLDivElement>(null);
  const stem = w.text.split(' ')[0];

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, waiting]);

  async function send() {
    const t = text.trim();
    if (waiting) return;
    if (!t) { document.getElementById('talk-input')?.focus(); return; }
    setText('');
    setMsgs((m) => [...m.filter((x) => x.from !== 'feedback'), { from: 'me', text: t }]);
    setWaiting(true);
    const reply = await sendToChild(w, t, turn);
    setWaiting(false);
    if (reply.feedback) {
      setMsgs((m) => [...m, { from: 'feedback', tips: reply.feedback!.tips }]);
      return;
    }
    setTurn((n) => n + 1);
    if (turn + 1 < MAX_TURNS) setMsgs((m) => [...m, { from: 'kid', text: reply.text }]);
  }

  const retry = msgs.some((m) => m.from === 'feedback');
  const showHint = !waiting && !retry && turn < 2 && msgs[msgs.length - 1]?.from === 'kid';
  const fixIdx = msgs.findIndex((m) => m.from === 'feedback') - 1;

  const prep = `/words/${w.id}/talk${qs}`;
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !done && !isIntentionalNav() && currentLocation.pathname !== nextLocation.pathname);
  const [ask, setAsk] = useState(false);
  const asking = ask || blocker.state === 'blocked';
  const stay = () => { setAsk(false); if (blocker.state === 'blocked') blocker.reset(); };
  const leave = () => { setAsk(false); if (blocker.state === 'blocked') blocker.proceed(); else go(prep); };

  return (
    <div className="screen" style={{ height: '100dvh' }}>
      <Header title={`‘${w.text}’ 대화 연습`} white onBack={() => (done ? go(prep) : setAsk(true))} />
      {asking && (
        <div role="dialog" aria-modal="true" aria-labelledby="quit-title" style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(29, 36, 51, .45)', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
            <b id="quit-title" style={{ fontSize: 18 }}>대화를 그만할까요?</b>
            <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-sub)' }}>지금까지 나눈 대화는 저장되지 않아요.</span>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="button" className="btn btn-outline" style={{ height: 48, fontSize: 16 }} onClick={stay} autoFocus>계속하기</button>
              <button type="button" className="btn btn-primary" style={{ height: 48, fontSize: 16 }} onClick={leave}>그만하기</button>
            </div>
          </div>
        </div>
      )}
      <div className={`chat${done ? ' done' : ''}`} aria-live="polite">
        {msgs.map((m, i) =>
          m.from === 'kid' ? (
            <KidMessage key={i} name={profile.childName}><p className="bubble-kid">{m.text}</p></KidMessage>
          ) : m.from === 'me' ? (
            <p key={i} className="bubble-me">{m.text.split(new RegExp(`(${stem}${i === fixIdx ? '(?:을|를)?' : ''})`)).map((p, j) => (j % 2 ? <b key={j}>{p}</b> : <span key={j}>{p}</span>))}</p>
          ) : (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
              <div className="banner" style={{ gap: 10, borderRadius: 16, padding: '12px 14px', fontSize: 14 }}><span className="dot" style={{ width: 30, height: 30 }}>{Icon.check(16)}</span>의미는 잘 전달됐어요! 표현 하나만 다듬어 볼까요?</div>
              <div className="hint" style={{ borderRadius: 18, padding: '14px 16px' }}><b style={{ fontSize: 15 }}>이 부분만 살짝</b>{m.tips.map((t) => <p key={t} style={{ fontSize: 14, lineHeight: 1.55 }}>{t}</p>)}</div>
            </div>
          ),
        )}
        {waiting && <KidMessage name={profile.childName}><span className="typing" style={{ alignSelf: 'flex-start' }} aria-label="답을 기다리는 중"><i /><i /><i /></span></KidMessage>}
        {showHint && (
          <div className="hint" style={{ marginTop: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 18, padding: '14px 16px' }}>
            <span style={{ flex: 'none', display: 'flex', marginTop: 2 }}>{Icon.bulb()}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><b style={{ fontSize: 15 }}>도움말</b><p style={{ fontSize: 14, lineHeight: 1.5 }}>책 장면과 연결해 쉬운 말로 뜻을 설명해 보세요.</p></div>
          </div>
        )}
        {done && (
          <button onClick={() => go(`/words/${w.id}/talk/complete${qs}`)} aria-label="대화를 모두 마쳤어요. 누르면 마무리 화면" style={{ marginTop: 8, width: '100%', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 0, color: 'var(--text)', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} /><b style={{ fontSize: 15 }}>대화를 모두 마쳤어요</b><span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </span>
            <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--mint)', display: 'grid', placeItems: 'center' }}>{Icon.check(26)}</span>
          </button>
        )}
        <div ref={end} />
      </div>
      {!done && (
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input id="talk-input" aria-label={retry ? '답변 다시 입력' : '답변 입력'} placeholder={waiting ? '답을 기다리는 중...' : retry ? '다시 답해 보세요' : '여기에 답해 보세요'}
            value={text} disabled={waiting} onChange={(e) => setText(e.target.value)} />
          {!waiting && !retry && <button type="button" className="round mic" aria-label="음성 입력">{Icon.mic()}</button>}
          <button type="submit" className="round send" aria-label="보내기" disabled={waiting}>{Icon.arrow()}</button>
        </form>
      )}
    </div>
  );
}
