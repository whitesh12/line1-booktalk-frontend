import { useEffect, useState } from 'react';
import { Header, Icon, TabBar, toast } from '../../components/ui';
import { useGo } from '../../lib/nav';
import { LOCAL_CSS, readDraft, setDraft, usePracticeWord } from './shared';

const MAX_SENTENCE = 100; // 서버 문장 연습 제한

export function PracticeWritePage() {
  const { w, qs } = usePracticeWord();
  const go = useGo();
  const [text, setText] = useState(() => readDraft(w.id));
  const tooLong = text.trim().length > MAX_SENTENCE;
  useEffect(() => setDraft(w.id, null), [w.id]);
  const josa = /[가-힣]$/.test(w.text) && (w.text.charCodeAt(w.text.length - 1) - 0xac00) % 28 ? '을' : '를';
  return (
    <div className="screen">
      <style>{LOCAL_CSS}</style>
      <Header title="문장 연습" to={`/words/${w.id}${qs}`} />
      <div className="content" style={{ gap: 16, paddingBottom: 16 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 22, padding: 20 }}>
          <span className="chip chip-primary" style={{ alignSelf: 'flex-start', fontSize: 16 }}>{w.text}</span>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.45 }}>‘{w.text}’{josa} 넣어<br />한 문장 써 보세요</p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-sub)' }}>틀려도 괜찮아요. 같이 다듬어 봐요.</p>
        </div>
        <div className="field">
          <label htmlFor="sentence">내 문장</label>
          {/* maxLength 를 쓰지 않는다: 아이폰 등에서 한글 조합이 끊기는 문제가 있어 길이는 '완료'를 누를 때 확인한다 */}
          <textarea id="sentence" className="textarea" style={{ height: 170 }} placeholder="여기에 직접 문장을 입력해 보세요" value={text} onChange={(e) => setText(e.target.value)} />
          {tooLong && <span role="alert" style={{ fontSize: 13, color: 'var(--coral)' }}>문장은 {MAX_SENTENCE}자까지 쓸 수 있어요. (지금 {text.trim().length}자)</span>}
        </div>
        <button type="button" className="btn btn-soft" onClick={() => toast('음성 입력은 준비 중이에요. 글로 입력해 주세요.')}>{Icon.mic(18)}마이크로 입력</button>
      </div>
      <div className="bottom-bar">
        <button className="btn btn-primary" onClick={() => (text.trim() && !tooLong ? go(`/words/${w.id}/practice/reviewing${qs}`, { state: { sentence: text } }) : document.getElementById('sentence')?.focus())}>완료</button>
      </div>
      <TabBar />
    </div>
  );
}
