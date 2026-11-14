import { useEffect, useRef, useState } from 'react';
import { useBlocker, useSearchParams } from 'react-router-dom';
import { Header, Icon, KidMessage, TabBar, callName, josa } from '../../components/ui';
import { formatElapsed, useVoiceInput } from '../../lib/useVoiceInput';
import { LevelBars } from '../../components/ui';
import type { Word } from '../../data/content';
import { isIntentionalNav, useGo } from '../../lib/nav';
import { ApiError, MAX_TURNS, USE_MOCK, childScript, openingLine, sendToChild, talkFeedbackTips, withChild } from '../../api/client';
import { finishTalk, loadDemoVocab, sendTalk, startTalk, trackLearning, type TalkSession, type TalkTurn } from '../../api/ai';
import { recordLearning } from '../../store/learning';
import { serverVocabId } from '../../data/scanned';
import type { Profile } from '../../store/profile';
import { useTalk } from './shared';

type Msg =
  | { from: 'kid'; text: string }
  | { from: 'me'; text: string }
  | { from: 'praise'; text: string } // AI 가 잘했다고 한 말 (내 말풍선 아래 작게)
  | { from: 'feedback'; tips: string[]; title?: string; retry?: boolean }; // retry: AI 가 답을 받아들이지 않음 (칭찬 아이콘 대신 안내)
type Seed = { msgs: Msg[]; turn: number; waiting: boolean };

function demoSeed(demo: string | null, w: Word, name: string): Seed {
  const kid = (text: string): Msg => ({ from: 'kid', text });
  const me = (text: string): Msg => ({ from: 'me', text });
  const first = [kid(openingLine(w)), me(`맞아, 토끼 마음이 ${w.text}했을 것 같아!`), kid(childScript(0, w))];
  const wrong = me(`좋아하는 거 보면 마음이 ${w.text}을 해.`);
  switch (demo) {
    case 'chat': return { msgs: first, turn: 1, waiting: false };
    case 'waiting': return { msgs: [...first, wrong], turn: 1, waiting: true };
    case 'feedback': return { msgs: [...first, wrong, { from: 'feedback', tips: talkFeedbackTips(w) }], turn: 1, waiting: false };
    case 'done': return {
      msgs: [...first,
        me('좋아하는 걸 보면 마음이 자꾸 뛰는 거야. 토끼도 당근을 보고 그랬을 거야.'), kid(childScript(1, w)),
        me(`맞아! 그때 ${callName(name)} 마음도 ${w.text}했겠다.`), kid(childScript(2, w)),
        me(`토끼가 당근 보고 ${w.text}한 것처럼, ${callName(name)}도 소풍 생각하면 ${w.text}하지?`)],
      turn: MAX_TURNS, waiting: false,
    };
    default: return { msgs: [kid(openingLine(w))], turn: 0, waiting: false };
  }
}

export function TalkChatPage({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const { w, qs } = useTalk();
  const go = useGo();
  const demo = useSearchParams()[0].get('demo');
  // 서버 모드에서는 AI 와 실제로 대화한다. (화면 미리보기 ?demo= 와 서버 미사용 모드만 연습용 대화)
  const wantLive = !demo && !USE_MOCK;
  const [mode, setMode] = useState<'connecting' | 'live' | 'mock'>(wantLive ? 'connecting' : 'mock');
  const session = useRef<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [liveDone, setLiveDone] = useState(false);

  const [seed] = useState(() => (wantLive ? { msgs: [] as Msg[], turn: 0, waiting: true } : demoSeed(demo, w, profile.childName)));
  const [msgs, setMsgs] = useState<Msg[]>(seed.msgs);
  const [text, setText] = useState('');
  const [waiting, setWaiting] = useState(seed.waiting);
  const [turn, setTurn] = useState(seed.turn);
  const done = mode === 'live' ? liveDone : turn >= MAX_TURNS;
  const end = useRef<HTMLDivElement>(null);
  const stem = w.text.split(' ')[0];
  // 마이크로 입력: 말한 내용을 입력칸에 넣는다 (보내기는 직접 누른다)
  const voice = useVoiceInput((said) => setText((prev) => (prev.trim() ? `${prev.trim()} ${said}` : said)), w.text);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, waiting]);

  // 학습 기록: 대화를 시작하면 '대화 연습 중', 끝까지 하면 '완료' (화면 미리보기 ?demo= 는 기록하지 않음)
  // 연습용 대화(AI 아님)는 이 기기 기록만 남기고 서버에 '대화 완료'를 보내지 않는다.
  useEffect(() => {
    if (demo || mode === 'connecting') return;
    if (mode === 'live') trackLearning(w.id, done ? 'talked' : 'talking');
    else recordLearning(w.id, done ? 'talked' : 'talking', new URLSearchParams(location.search).get('book'));
  }, [demo, w.id, done, mode]);

  /** 서버 단어 id 를 찾고(시연용 책은 연결이 늦었으면 다시 불러와 보고), 로그인·아이 등록을 확인한 뒤 AI 대화를 연다 */
  async function openLive(): Promise<TalkSession> {
    let vocabularyId = serverVocabId(w.id);
    if (!vocabularyId) { await loadDemoVocab(); vocabularyId = serverVocabId(w.id); }
    if (!vocabularyId) throw new ApiError(422, 'WORD_NOT_ON_SERVER', '이 단어는 지금 AI 대화를 할 수 없어요.');
    return withChild(profile, (childId) => onSave({ ...profile, childId }), (childId) => startTalk(childId, vocabularyId!));
  }

  // AI 대화 시작. 안 되면 연습용 대화로 진행한다.
  useEffect(() => {
    if (!wantLive) return;
    let alive = true;
    openLive()
      .then((s) => {
        if (!alive) { finishTalk(s.id); return; }
        session.current = s.id;
        setMsgs([{ from: 'kid', text: s.openingMessage.text }]);
        setAiHint(s.openingMessage.hint ?? null);
        setMode('live');
        setWaiting(false);
      })
      .catch((e) => {
        if (!alive) return;
        console.warn('[conversation] AI 대화를 시작하지 못했어요', e);
        setNotice(e instanceof ApiError && e.code === 'ACTIVE_CONVERSATION_EXISTS'
          ? `${e.message} 지금은 연습용 대화로 진행해요.`
          : '지금은 AI 와 연결하지 못해서 연습용 대화로 진행해요.');
        setMsgs(demoSeed(null, w, profile.childName).msgs); // 이 단어로 만든 연습용 대본
        setMode('mock');
        setWaiting(false);
      });
    return () => {
      alive = false;
      // 화면을 떠나면 서버 대화도 끝낸다 (끝내지 않으면 다음 대화를 시작할 수 없음)
      if (session.current) { finishTalk(session.current); session.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendLive(t: string, before: Msg[]) {
    let r: TalkTurn;
    try {
      r = await sendTalk(session.current!, t);
    } catch (e) {
      console.warn('[conversation] 메시지 전송 실패', e);
      setMsgs(before); // 보내기 전 화면(이전 피드백 포함)으로 되돌린다
      setText(t);
      // 서버에서 대화가 사라졌으면(재시작·만료 등) 새 대화를 열어 이어 간다
      const gone = e instanceof ApiError && [400, 404, 409, 410].includes(e.status);
      if (gone) {
        try {
          const s = await openLive();
          session.current = s.id;
          setMsgs((m) => [...m, { from: 'kid', text: s.openingMessage.text }]);
          setAiHint(s.openingMessage.hint ?? null);
          setNotice('대화 연결이 끊겨서 새로 이어 갈게요. 다시 보내 주세요.');
        } catch {
          setNotice('AI 대화 연결이 끊겼어요. 잠시 후 다시 시도해 주세요.');
        }
      } else {
        setNotice(e instanceof ApiError && e.status === 503 ? 'AI가 잠시 응답하지 않아요. 다시 보내 주세요.' : '메시지를 보내지 못했어요. 다시 보내 주세요.');
      }
      setWaiting(false);
      return;
    }
    setWaiting(false);
    setAiHint(null);
    if (r.userMessage.accepted === false) {
      const tips = [r.aiMessage.feedback, r.aiMessage.hint].filter((x): x is string => !!x);
      setMsgs((m) => [...m, { from: 'feedback', title: `‘${w.text}’${josa(w.text, '을', '를')} 넣어서 다시 답해 볼까요?`, retry: true, tips: tips.length ? tips : talkFeedbackTips(w) }]);
      return;
    }
    const praise: Msg[] = r.aiMessage.feedback ? [{ from: 'praise', text: r.aiMessage.feedback }] : [];
    if (r.mission.completed || r.sessionStatus === 'COMPLETED' || r.mission.progress >= 100) {
      setMsgs((m) => [...m, ...praise]);
      setLiveDone(true);
      finishTalk(session.current!);
      session.current = null;
      return;
    }
    setTurn((n) => n + 1);
    setMsgs((m) => [...m, ...praise, { from: 'kid', text: r.aiMessage.text }]);
  }

  async function send() {
    const t = text.trim();
    if (waiting) return;
    if (!t) { document.getElementById('talk-input')?.focus(); return; }
    setText('');
    setNotice(null);
    const before = msgs;
    setMsgs((m) => [...m.filter((x) => x.from !== 'feedback'), { from: 'me', text: t }]);
    setWaiting(true);
    if (mode === 'live') { await sendLive(t, before); return; }
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
  const showHint = !waiting && !retry && !done && msgs[msgs.length - 1]?.from === 'kid' && (mode === 'live' ? !!aiHint : turn < 2);
  const fixIdx = msgs.findIndex((m) => m.from === 'feedback') - 1;

  const prep = `/words/${w.id}/talk${qs}`;
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !done && !isIntentionalNav() && currentLocation.pathname !== nextLocation.pathname);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const asking = pending !== null || blocker.state === 'blocked';
  const confirmLeave = (leave: () => void) => (done ? leave() : setPending(() => leave));
  const stay = () => { setPending(null); if (blocker.state === 'blocked') blocker.reset(); };
  const leave = () => {
    const next = pending;
    setPending(null);
    if (blocker.state === 'blocked') blocker.proceed();
    else next?.();
  };

  return (
    <div className="screen" style={{ height: '100dvh' }}>
      <Header title={`‘${w.text}’ 대화 연습`} white onBack={() => confirmLeave(() => go(prep))} />
      {asking && (
        <div role="dialog" aria-modal="true" aria-labelledby="quit-title" style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(29, 36, 51, .45)', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20, padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
            <b id="quit-title" style={{ fontSize: 18 }}>대화를 그만할까요?</b>
            <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-sub)' }}>그만두면 이 대화는 여기서 끝나요. 다음에 처음부터 다시 할 수 있어요.</span>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="button" className="btn btn-outline" style={{ height: 48, fontSize: 16 }} onClick={stay} autoFocus>계속하기</button>
              <button type="button" className="btn btn-primary" style={{ height: 48, fontSize: 16 }} onClick={leave}>그만하기</button>
            </div>
          </div>
        </div>
      )}
      <div className={`chat${done ? ' done' : ''}`} aria-live="polite">
        {mode === 'live' && (
          <span className="pill" style={{ alignSelf: 'center', background: 'var(--mint-soft)', color: 'var(--primary-dark)' }}>{Icon.check(12, '#155E53')}AI 아이와 대화 중</span>
        )}
        {notice && (
          <p role="status" style={{ margin: 0, padding: '10px 14px', borderRadius: 14, background: '#FFF6E5', color: '#8A5A00', fontSize: 13, lineHeight: 1.5 }}>{notice}</p>
        )}
        {msgs.map((m, i) =>
          m.from === 'kid' ? (
            <KidMessage key={i} name={profile.childName}><p className="bubble-kid">{m.text}</p></KidMessage>
          ) : m.from === 'me' ? (
            <p key={i} className="bubble-me">{m.text.split(new RegExp(`(${stem}${i === fixIdx ? '(?:을|를)?' : ''})`)).map((p, j) => (j % 2 ? <b key={j}>{p}</b> : <span key={j}>{p}</span>))}</p>
          ) : m.from === 'praise' ? (
            <p key={i} style={{ margin: '-4px 0 0', alignSelf: 'flex-end', maxWidth: '85%', fontSize: 13, lineHeight: 1.5, color: 'var(--primary)', textAlign: 'right' }}>{Icon.check(12, '#1C7A6C')} {m.text}</p>
          ) : (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
              <div className="banner" style={{ gap: 10, borderRadius: 16, padding: '12px 14px', fontSize: 14 }}><span className="dot" style={{ width: 30, height: 30, ...(m.retry ? { background: 'var(--coral)' } : {}) }}>{m.retry ? Icon.bulb(16) : Icon.check(16)}</span>{m.title ?? '의미는 잘 전달됐어요! 표현 하나만 다듬어 볼까요?'}</div>
              <div className="hint" style={{ borderRadius: 18, padding: '14px 16px' }}><b style={{ fontSize: 15 }}>이 부분만 살짝</b>{m.tips.map((t) => <p key={t} style={{ fontSize: 14, lineHeight: 1.55 }}>{t}</p>)}</div>
            </div>
          ),
        )}
        {waiting && <KidMessage name={profile.childName}><span className="typing" style={{ alignSelf: 'flex-start' }} aria-label="답을 기다리는 중"><i /><i /><i /></span></KidMessage>}
        {showHint && (
          <div className="hint" style={{ marginTop: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 18, padding: '14px 16px' }}>
            <span style={{ flex: 'none', display: 'flex', marginTop: 2 }}>{Icon.bulb()}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><b style={{ fontSize: 15 }}>도움말</b><p style={{ fontSize: 14, lineHeight: 1.5 }}>{mode === 'live' && aiHint ? aiHint : '책 장면과 연결해 쉬운 말로 뜻을 설명해 보세요.'}</p></div>
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
      {!done && voice.state !== 'idle' && (
        <div role="status" className="voice-strip">
          {voice.state === 'recording' ? (
            <><span className="rec-dot" />듣고 있어요 <b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatElapsed(voice.elapsedMs)}</b><LevelBars level={voice.level} color="var(--coral)" /><span style={{ marginLeft: 'auto', color: 'var(--text-sub)' }}>말을 멈추면 자동으로 끝나요</span></>
          ) : <>글로 바꾸는 중…</>}
        </div>
      )}
      {!done && (
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input id="talk-input" aria-label={retry ? '답변 다시 입력' : '답변 입력'} placeholder={waiting ? '답을 기다리는 중...' : retry ? '다시 답해 보세요' : '여기에 답해 보세요'}
            value={text} disabled={waiting} onChange={(e) => setText(e.target.value)} />
          {!waiting && !retry && (
            <button type="button" className={`round mic${voice.state === 'recording' ? ' mic-rec' : ''}`} onClick={voice.toggle}
              disabled={voice.state === 'transcribing'} aria-pressed={voice.state === 'recording'}
              aria-label={voice.state === 'recording' ? '녹음 바로 끝내기' : voice.state === 'transcribing' ? '글로 바꾸는 중' : '말로 입력'}>
              {voice.state === 'transcribing' ? <span className="typing" style={{ transform: 'scale(.6)' }}><i /><i /><i /></span> : Icon.mic()}
            </button>
          )}
          <button type="submit" className="round send" aria-label="보내기" disabled={waiting}>{Icon.arrow()}</button>
        </form>
      )}
      <TabBar onLeave={confirmLeave} />
    </div>
  );
}
