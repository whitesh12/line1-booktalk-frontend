import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header, Icon, KidMessage } from '../components/ui';
import { BOOKS, WORDS, bookById } from '../data/content';
import { MAX_TURNS, openingLine, sendToChild } from '../api/client';
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
      <div className="content" style={{ gap: 16 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, borderRadius: 24, padding: 20 }}>
          <span className="avatar" style={{ width: 84, height: 84, fontSize: 34 }} aria-hidden="true">{profile.childName.slice(0, 1)}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--mint-soft)', color: 'var(--primary-dark)' }}>대화 파트너</span>
            <b style={{ fontSize: 19 }}>{profile.childName}이와 이야기해요</b>
            <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>{profile.childAge}세 · {book.title}</span>
          </div>
        </div>
        <h2 style={{ margin: '6px 0 0', fontSize: 17 }}>오늘의 목표</h2>
        <div style={{ background: '#fff', border: '2px dashed var(--mint)', borderRadius: 22, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="chip chip-primary" style={{ alignSelf: 'flex-start', fontSize: 17, fontWeight: 800, padding: '5px 14px' }}>{w.text}</span>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>을(를) 넣어 아이에게 질문해 보기</p>
        </div>
      </div>
      <div className="bottom-bar"><Link to={`/talk/${w.id}/chat${qs}`} className="btn btn-primary">{Icon.chat()}대화 시작하기</Link></div>
    </div>
  );
}

/* F-2 대화 중 · F-4 응답 대기 · F-5 대화 중 피드백 · F-3 대화 완료 */
type Msg = { from: 'kid'; text: string } | { from: 'me'; text: string } | { from: 'feedback'; tips: string[] };

export function TalkChat({ profile }: { profile: Profile }) {
  const { w, qs } = useTalk();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'kid', text: openingLine() }]);
  const [text, setText] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [turn, setTurn] = useState(0);
  const done = turn >= MAX_TURNS;
  const end = useRef<HTMLDivElement>(null);
  const stem = w.text.split(' ')[0];

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, waiting]);

  async function send() {
    const t = text.trim();
    if (!t || waiting) return;
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

  const showHint = msgs.length === 1;
  return (
    <div className="screen" style={{ height: '100dvh' }}>
      <Header title={`‘${w.text}’ 대화 연습`} white />
      <div className="chat" aria-live="polite">
        {msgs.map((m, i) =>
          m.from === 'kid' ? (
            <KidMessage key={i} name={profile.childName}><p className="bubble-kid">{m.text}</p></KidMessage>
          ) : m.from === 'me' ? (
            <p key={i} className="bubble-me">{m.text.split(stem).map((p, j, arr) => <span key={j}>{p}{j < arr.length - 1 && <b>{stem}</b>}</span>)}</p>
          ) : (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              <div className="banner" style={{ fontSize: 14 }}><span className="dot" style={{ width: 30, height: 30 }}>{Icon.check(16)}</span>의미는 잘 전달됐어요! 표현 하나만 다듬어 볼까요?</div>
              <div className="hint"><b style={{ fontSize: 15 }}>이 부분만 살짝</b>{m.tips.map((t) => <p key={t} style={{ fontSize: 14 }}>{t}</p>)}</div>
            </div>
          ),
        )}
        {waiting && <KidMessage name={profile.childName}><span className="typing" aria-label="답을 기다리는 중"><i /><i /><i /></span></KidMessage>}
        {showHint && (
          <div className="hint" style={{ marginTop: 6, flexDirection: 'row', gap: 10 }}>
            <span style={{ flex: 'none' }}>{Icon.bulb()}</span>
            <div><b style={{ fontSize: 15 }}>도움말</b><p style={{ fontSize: 14 }}>책 장면과 연결해 쉬운 말로 뜻을 설명해 보세요.</p></div>
          </div>
        )}
        {done && (
          <button onClick={() => nav(`/talk/${w.id}/done${qs}`)} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 0, cursor: 'pointer' }}>
            <b style={{ fontSize: 15 }}>대화를 모두 마쳤어요</b>
            <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--mint)', display: 'grid', placeItems: 'center' }}>{Icon.check(26)}</span>
          </button>
        )}
        <div ref={end} />
      </div>
      {!done && (
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input aria-label="답변 입력" placeholder={waiting ? '답을 기다리는 중...' : msgs.some((m) => m.from === 'feedback') ? '다시 답해 보세요' : '여기에 답해 보세요'}
            value={text} disabled={waiting} onChange={(e) => setText(e.target.value)} />
          <button type="button" className="round mic" aria-label="음성 입력">{Icon.mic()}</button>
          <button type="submit" className="round send" aria-label="보내기" disabled={waiting || !text.trim()}>{Icon.arrow()}</button>
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
      <div className="content center" style={{ gap: 22, paddingBottom: 60 }}>
        <div style={{ width: 300, height: 230, borderRadius: 32, background: 'var(--mint-soft)', overflow: 'hidden' }}>
          <img src="/images/celebrate.svg" alt="부모와 아이가 함께 그림책을 읽으며 손을 맞잡은 그림" width={300} height={230} />
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
