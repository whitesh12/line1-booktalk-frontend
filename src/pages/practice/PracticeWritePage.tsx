import { useEffect, useState } from 'react';
import { Header, Icon } from '../../components/ui';
import { useGo } from '../../lib/nav';
import { LOCAL_CSS, readDraft, setDraft, usePracticeWord } from './shared';

/* 문장 작성. 완료 → AI 검토 중 */
export function PracticeWritePage() {
  const { w, qs } = usePracticeWord();
  const go = useGo();
  const [text, setText] = useState(() => readDraft(w.id));
  useEffect(() => setDraft(w.id, null), [w.id]); // 한 번 채우고 나면 지운다
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
          <textarea id="sentence" className="textarea" style={{ height: 170 }}maxLength={100} placeholder="여기에 직접 문장을 입력해 보세요" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <button type="button" className="btn btn-soft" onClick={() => alert('음성 입력은 백엔드 연결 후 POST /speech/transcriptions로 이어집니다.')}>{Icon.mic(18)}마이크로 입력</button>
      </div>
      <div className="bottom-bar">
        {/* 디자인처럼 늘 활성 상태. 비어 있으면 입력칸으로 이동 */}
        <button className="btn btn-primary" onClick={() => (text.trim() ? go(`/words/${w.id}/practice/reviewing${qs}`, { state: { sentence: text } }) : document.getElementById('sentence')?.focus())}>완료</button>
      </div>
    </div>
  );
}
