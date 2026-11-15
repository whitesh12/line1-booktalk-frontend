import { useState } from 'react';
import { GoLink } from '../../lib/nav';
import { Icon, LevelBars, ro, speak } from '../../components/ui';
import { formatElapsed, useVoiceInput } from '../../lib/useVoiceInput';

const clean = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, '');

function closest(heard: string, target: string) {
  if (heard.length <= target.length) return heard;
  let best = heard.slice(0, target.length);
  let min = Infinity;
  for (let i = 0; i + target.length <= heard.length; i++) {
    const part = heard.slice(i, i + target.length);
    const miss = [...part].filter((ch, j) => ch !== target[j]).length;
    if (miss < min) { min = miss; best = part; }
  }
  return best;
}

const box = { background: 'var(--bg)', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 } as const;
const label = { fontSize: 12, fontWeight: 700, color: 'var(--text-sub)' } as const;
const big = { fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', wordBreak: 'keep-all' } as const;
const row = { display: 'flex', gap: 8 } as const;
const btn = { flex: 1, height: 46, fontSize: 15 } as const;

export function SayItCard({ text, practiceTo }: { text: string; practiceTo: string }) {
  const [heard, setHeard] = useState<string | null>(null);
  const voice = useVoiceInput(setHeard);
  const target = clean(text);
  const key = target.length > 2 && target.endsWith('다') ? target.slice(0, -1) : target;
  const ok = heard !== null && clean(heard).includes(key);
  const busy = voice.state !== 'idle';
  const start = () => { setHeard(null); voice.toggle(); };

  let body;
  if (voice.state === 'recording') {
    body = (
      <button type="button" onClick={voice.toggle} aria-label="녹음 바로 끝내기"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0 4px', background: 'none', border: 0, cursor: 'pointer', color: 'var(--coral)' }}>
        <span className="mic-rec" style={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', border: '2px solid' }}>{Icon.mic(30)}</span>
        <span role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}>
          <span className="rec-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--coral)' }} />
          듣고 있어요 <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatElapsed(voice.elapsedMs)}</span><LevelBars level={voice.level} color="var(--coral)" />
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>‘{text}’ 하고 말해 주세요 · 말을 멈추면 자동으로 끝나요</span>
      </button>
    );
  } else if (voice.state === 'transcribing') {
    body = <p role="status" style={{ margin: 0, padding: '18px 0', textAlign: 'center', fontSize: 15, color: 'var(--text-sub)' }}>어떻게 들렸는지 확인하는 중…</p>;
  } else if (heard === null) {
    body = (
      <>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: 'var(--text-body)' }}>발음을 듣고 똑같이 말해 보세요. 앱이 어떻게 알아들었는지 알려 드려요.</p>
        <div style={row}>
          <button type="button" className="btn btn-outline" style={btn} onClick={() => speak(text)}>{Icon.speaker()}다시 듣기</button>
          <button type="button" className="btn btn-primary" style={{ ...btn, flex: 1.4 }} onClick={start}>{Icon.mic()}따라 말하기</button>
        </div>
      </>
    );
  } else if (ok) {
    body = (
      <>
        <div className="banner" style={{ gap: 10, borderRadius: 16, padding: '12px 14px' }}><span className="dot" style={{ width: 32, height: 32 }}>{Icon.check(18)}</span>앱이 ‘{text}’{ro(text)} 정확히 알아들었어요!</div>
        <div style={box}><span style={label}>앱이 알아들은 말</span><span style={{ ...big, color: 'var(--primary)' }}>{heard}</span></div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-body)' }}>잘했어요! 이제 이 표현으로 문장을 써 볼까요?</p>
        <div style={row}>
          <button type="button" className="btn btn-outline" style={btn} onClick={start}>{Icon.mic()}한 번 더</button>
          <GoLink to={practiceTo} className="btn btn-primary" style={{ ...btn, flex: 1.4 }}>문장 연습으로</GoLink>
        </div>
      </>
    );
  } else {
    const near = closest(clean(heard), target);
    body = (
      <>
        <div className="banner coral" style={{ gap: 10, borderRadius: 16, padding: '12px 14px' }}><span className="dot" style={{ width: 32, height: 32 }}>{Icon.search(18)}</span>조금 다르게 들렸어요. 한 번 더 해 볼까요?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={box}><span style={label}>목표 표현</span><span style={{ ...big, color: 'var(--primary)' }}>{text}</span></div>
          <div style={{ ...box, background: 'var(--coral-soft)' }}>
            <span style={{ ...label, color: '#8a3a22' }}>앱이 알아들은 말</span>
            <span style={{ ...big, color: '#8a3a22' }}>
              {near ? [...near].map((ch, i) => (ch === target[i] ? ch : <u key={i} style={{ textDecorationThickness: 3, textUnderlineOffset: 4 }}>{ch}</u>)) : '(알아듣지 못함)'}
            </span>
          </div>
        </div>
        {near !== clean(heard) && <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>전체: “{heard}”</span>}
        <div className="hint" style={{ borderRadius: 16, padding: '12px 14px', gap: 4 }}>
          <b style={{ fontSize: 14 }}>이렇게 해 보세요</b>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>발음을 한 번 더 듣고, 한 글자씩 천천히 또박또박 말해 보세요.</p>
        </div>
        <div style={row}>
          <button type="button" className="btn btn-outline" style={btn} onClick={() => speak(text)}>{Icon.speaker()}발음 듣기</button>
          <button type="button" className="btn btn-primary" style={{ ...btn, flex: 1.4 }} onClick={start}>{Icon.mic()}다시 말하기</button>
        </div>
      </>
    );
  }

  return (
    <section className="card" aria-busy={busy} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>따라 말해 보기</h2>
      {body}
    </section>
  );
}
