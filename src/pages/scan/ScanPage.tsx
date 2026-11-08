import { useNavigate } from 'react-router-dom';
import { historyIdx, useGo } from '../../lib/nav';
import { Icon } from '../../components/ui';

export function ScanPage() {
  const nav = useNavigate();
  const go = useGo();
  const corner = (pos: React.CSSProperties, sides: string) => (
    <span style={{ position: 'absolute', width: 44, height: 44, ...pos, borderStyle: 'solid', borderColor: 'var(--mint)', borderWidth: 0, ...Object.fromEntries(sides.split(' ').map((s) => [`border${s}Width`, 4])) }} />
  );
  return (
    <div className="screen" style={{ background: '#12151F', color: '#fff' }}>
      <header className="header">
        <button className="icon-btn" style={{ color: '#fff' }} aria-label="뒤로" onClick={() => (historyIdx() > 0 ? nav(-1) : go('/books'))}>{Icon.back()}</button>
        <h1>촬영</h1>
      </header>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 0' }}>
        <label style={{ flex: 1, position: 'relative', borderRadius: 28, background: 'var(--navy)', display: 'grid', placeItems: 'center', cursor: 'pointer', minHeight: 420 }}>
          {corner({ top: 24, left: 24, borderTopLeftRadius: 14 }, 'Top Left')}
          {corner({ top: 24, right: 24, borderTopRightRadius: 14 }, 'Top Right')}
          {corner({ bottom: 24, left: 24, borderBottomLeftRadius: 14 }, 'Bottom Left')}
          {corner({ bottom: 24, right: 24, borderBottomRightRadius: 14 }, 'Bottom Right')}
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#9AA3B5' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1V19c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1V5.5z" /><path d="M12 6.5V20" /></svg>
            <span style={{ fontSize: 14 }}>카메라 화면</span></span>
          <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={() => nav('/scan/analyzing')} />
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#232838', borderRadius: 16, padding: '12px 14px', fontSize: 14, lineHeight: 1.5, color: '#E6EAF2' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F7C948" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" /></svg>
          <span>한 페이지를 틀 안에 맞추고, 밝은 곳에서 찍으면 글자가 잘 읽혀요</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '22px 20px 26px' }}>
        <button aria-label="촬영" onClick={() => nav('/scan/analyzing')} style={{ width: 78, height: 78, borderRadius: '50%', border: '4px solid #fff', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <span style={{ width: 62, height: 62, borderRadius: '50%', background: '#fff' }} />
        </button>
        <span style={{ fontSize: 13, color: '#B7BFCD' }}>사진은 저장되지 않고 글자를 읽은 뒤 바로 삭제돼요</span>
      </div>
    </div>
  );
}
