import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header, Icon, KidMessage } from '../components/ui';
import { BOOKS, WORDS, bookById, type Word } from '../data/content';
import { MAX_TURNS, childScript, openingLine, sendToChild, talkFeedbackTips } from '../api/client';
import type { Profile } from '../store/profile';

function useTalk() {
  const { wordId = 'dugeun' } = useParams();
  const [q] = useSearchParams();
  const book = bookById(q.get('book') ?? undefined) ?? BOOKS[0];
  return { w: WORDS[wordId] ?? WORDS.dugeun, book, qs: `?book=${book.id}` };
}

/* F-1 대화 연습 준비 */
export function TalkPrep({ profile }: { profile: Profile }) {
  const { w, book, qs } = useTalk();
  return (
    <div className="screen">
      <Header title="아이와 대화 연습" />
      <div className="content" style={{ gap: 16, paddingBottom: 16 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, borderRadius: 24, padding: 20 }}>
          <span className="avatar" style={{ width: 84, height: 84, fontSize: 34 }} aria-hidden="true">{profile.childName.slice(0, 1)}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--mint-soft)', color: 'var(--primary-dark)' }}>대화 파트너</span>
            <b style={{ fontSize: 19 }}>{profile.childName}이와 이야기해요</b>
            <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>{profile.childAge}세 · {book.title}</span>
          </div>
        </div>
        <h2 style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 700 }}>오늘의 목표</h2>
        <div style={{ background: '#fff', border: '2px dashed var(--mint)', borderRadius: 22, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="chip chip-primary" style={{ alignSelf: 'flex-start', fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', padding: '5px 14px' }}>{w.text}</span>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>을(를) 넣어 아이에게 질문해 보기</p>
        </div>
      </div>
      <div className="bottom-bar"><Link to={`/talk/${w.id}/chat${qs}`} className="btn btn-primary">{Icon.chat()}대화 시작하기</Link></div>
    </div>
  );
}

/* F-2 대화 중 · F-4 응답 대기 · F-5 대화 중 피드백 · F-3 대화 완료 */
type Msg = { from: 'kid'; text: string } | { from: 'me'; text: string } | { from: 'feedback'; tips: string[] };
type Seed = { msgs: Msg[]; turn: number; waiting: boolean };

/* 시연용 시작 상태 (디자인 F-2 / F-4 / F-5 / F-3의 대화 내용). ?demo=chat|waiting|feedback|done */
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

export function TalkChat({ profile }: { profile: Profile }) {
  const { w, qs } = useTalk();
  const nav = useNavigate();
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
  // 도움말: 처음 두 번, 아이가 말하고 내 차례일 때 (디자인 F-2)
  const showHint = !waiting && !retry && turn < 2 && msgs[msgs.length - 1]?.from === 'kid';
  // 피드백 바로 앞 내 말은 고칠 부분(단어+조사)까지 강조 (디자인 F-5)
  const fixIdx = msgs.findIndex((m) => m.from === 'feedback') - 1;
  return (
    <div className="screen" style={{ height: '100dvh' }}>
      <Header title={`‘${w.text}’ 대화 연습`} white to={`/talk/${w.id}${qs}`} />
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
          <button onClick={() => nav(`/talk/${w.id}/done${qs}`)} aria-label="대화를 모두 마쳤어요. 누르면 마무리 화면" style={{ marginTop: 8, width: '100%', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 0, color: 'var(--text)', cursor: 'pointer' }}>
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

/* F-6 대화 마무리 */
export function TalkDone({ profile }: { profile: Profile }) {
  const { book } = useTalk();
  return (
    <div className="screen">
      <Header title="대화 마무리" back={false} center />
      <div className="content center" style={{ gap: 22, padding: '0 24px 60px' }}>
        <div style={{ width: 300, height: 230, borderRadius: 32, background: 'var(--mint-soft)', overflow: 'hidden' }}>
          <img src="/images/celebrate.svg" alt="부모와 아이가 함께 그림책을 읽으며 이야기를 나누고 손을 맞잡은 그림" width={300} height={230} style={{ display: 'block' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <b style={{ fontSize: 26 }}>잘했어요!</b>
          <span style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-body)' }}>오늘 배운 표현으로<br />{profile.childName}이와 끝까지 이야기했어요</span>
        </div>
      </div>
      <div className="bottom-bar"><Link to={`/books/${book.id}`} className="btn btn-primary">목록으로</Link></div>
    </div>
  );
}
