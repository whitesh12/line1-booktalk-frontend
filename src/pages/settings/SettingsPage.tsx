import { Icon, PageTitle, TabBar, speak } from '../../components/ui';
import { syncChildLanguage } from '../../api/client';
import type { Profile } from '../../store/profile';

const SpeakerWaves = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C7A6C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 010 7" /><path d="M19 6a8.5 8.5 0 010 12" />
  </svg>
);

const LANGS: Option<Profile['lang']>[] = [
  { value: 'vi', label: 'Tiếng Việt', sub: '베트남어' },
  { value: 'zh', label: '中文', sub: '중국어' },
  { value: 'en', label: 'English', sub: '영어' },
];
const SPEEDS: Option<Profile['speed']>[] = [
  { value: '0.8', label: '느리게', sub: '0.8배' },
  { value: '1.0', label: '보통', sub: '1.0배' },
  { value: '1.2', label: '빠르게', sub: '1.2배' },
];

interface Option<T extends string> { value: T; label: string; sub: string }

/** 세 가지 중 하나를 고르는 버튼 묶음 (라디오 그룹) */
function Segmented<T extends string>({ labelledBy, options, value, onChange }: {
  labelledBy: string; options: Option<T>[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          <span className="seg-label">{o.label}</span>
          <span className="seg-sub">{o.sub}</span>
        </button>
      ))}
    </div>
  );
}

export function SettingsPage({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const row = (icon: JSX.Element, id: string, title: string, sub: string, control: JSX.Element) => (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center', flex: 'none', color: 'var(--primary)' }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span id={id} style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
          <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{sub}</span>
        </div>
      </div>
      {control}
    </div>
  );
  const setLang = (lang: Profile['lang']) => {
    if (lang === profile.lang) return;
    const next = { ...profile, lang };
    onSave(next);
    syncChildLanguage(next).catch((e) => console.warn('[children] 설명 언어 반영 실패', e));
  };
  const setSpeed = (speed: Profile['speed']) => {
    onSave({ ...profile, speed });
    speak('두근두근', Number(speed)); // 고른 빠르기로 바로 들려준다
  };
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
          <Segmented labelledBy="lang" options={LANGS} value={profile.lang} onChange={setLang} />)}
        {row(SpeakerWaves, 'speed', '음성 안내 속도', '따라 읽기 좋은 또박또박한 빠르기',
          <Segmented labelledBy="speed" options={SPEEDS} value={profile.speed} onChange={setSpeed} />)}
      </div>
      <TabBar />
    </div>
  );
}
