import { Icon, PageTitle, TabBar } from '../../components/ui';
import type { Profile } from '../../store/profile';

/* 음성 안내 속도 아이콘 (소리 물결 2줄) */
const SpeakerWaves = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C7A6C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 010 7" /><path d="M19 6a8.5 8.5 0 010 12" />
  </svg>
);

/* 내 정보 및 설정 (탭): 설명 언어, 음성 안내 속도 */
export function SettingsPage({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const row = (icon: JSX.Element, id: string, title: string, sub: string, control: JSX.Element) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
      <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center', flex: 'none', color: 'var(--primary)' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <label htmlFor={id} style={{ fontSize: 16, fontWeight: 700 }}>{title}</label>
        <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{sub}</span>
      </div>
      {control}
    </div>
  );
  const sel: React.CSSProperties = { width: 120, height: 44, border: '1.5px solid var(--input-border)', borderRadius: 12, background: '#fff', padding: '0 10px', fontSize: 14, color: 'var(--text)' };
  return (
    <div className="screen">
      <PageTitle title="내 정보 및 설정" />
      <div className="content" style={{ paddingTop: 12 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, borderRadius: 22, padding: 18 }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--mint)', display: 'grid', placeItems: 'center', fontWeight: 800, letterSpacing: '-0.02em', fontSize: 28, color: '#0F3D36', flex: 'none' }}>{profile.parentName.slice(0, 1)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <b style={{ fontSize: 19 }}>{profile.childName} {profile.relation} {profile.parentName}</b>
            <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>매일 10분, 함께 읽는 즐거운 우리말</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 10 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>학습 및 소리 설정</h2>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-sub)' }}>맞춤형 지원</span>
        </div>
        {row(Icon.translate(), 'lang', '설명 언어 설정', '발음 안내와 뜻풀이 모국어',
          <select id="lang" style={sel} value={profile.lang} onChange={(e) => onSave({ ...profile, lang: e.target.value as Profile['lang'] })}>
            <option value="vi">Tiếng Việt</option><option value="zh">中文</option><option value="en">English</option>
          </select>)}
        {row(SpeakerWaves, 'speed', '음성 안내 속도', '따라 읽기 좋은 또박또박한 빠르기',
          <select id="speed" style={sel} value={profile.speed} onChange={(e) => onSave({ ...profile, speed: e.target.value as Profile['speed'] })}>
            <option value="0.8">느리게 (0.8x)</option><option value="1.0">보통 (1.0x)</option><option value="1.2">빠르게 (1.2x)</option>
          </select>)}
      </div>
      <TabBar />
    </div>
  );
}
