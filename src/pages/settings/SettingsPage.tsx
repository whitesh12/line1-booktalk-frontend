import { useEffect, useRef, useState } from 'react';
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

/** 앱 디자인에 맞춘 드롭다운 (listbox). 바깥을 누르거나 Esc 를 누르면 닫힌다. */
function Dropdown<T extends string>({ labelledBy, options, value, onChange }: {
  labelledBy: string; options: Option<T>[]; value: T; onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    list.current?.focus();
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const show = () => { setActive(Math.max(0, options.indexOf(current))); setOpen(true); };
  const pick = (o: Option<T>) => { setOpen(false); btn.current?.focus(); onChange(o.value); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + options.length) % options.length); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[active]); }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); btn.current?.focus(); }
  };

  return (
    <div className="dropdown" ref={root}>
      <button ref={btn} type="button" className="dropdown-btn" aria-haspopup="listbox" aria-expanded={open}
        aria-labelledby={`${labelledBy} ${labelledBy}-value`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); show(); } }}>
        <span id={`${labelledBy}-value`}>{current.label}</span>
        <svg className="dropdown-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <ul ref={list} className="dropdown-list" role="listbox" tabIndex={-1} aria-labelledby={labelledBy}
          aria-activedescendant={`${labelledBy}-opt-${active}`} onKeyDown={onKey}>
          {options.map((o, i) => (
            <li key={o.value} id={`${labelledBy}-opt-${i}`} role="option" aria-selected={o.value === value}
              className={i === active ? 'active' : undefined}
              onPointerEnter={() => setActive(i)} onClick={() => pick(o)}>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span className="opt-label">{o.label}</span>
                <span className="opt-sub">{o.sub}</span>
              </span>
              {o.value === value && Icon.check(16, '#1C7A6C')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SettingsPage({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const row = (icon: JSX.Element, id: string, title: string, sub: string, control: JSX.Element) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
      <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center', flex: 'none', color: 'var(--primary)' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span id={id} style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 13, color: 'var(--text-sub)', wordBreak: 'keep-all' }}>{sub}</span>
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
          <Dropdown labelledBy="lang" options={LANGS} value={profile.lang} onChange={setLang} />)}
        {row(SpeakerWaves, 'speed', '음성 안내 속도', '따라 읽기 좋은 또박또박한 빠르기',
          <Dropdown labelledBy="speed" options={SPEEDS} value={profile.speed} onChange={setSpeed} />)}
      </div>
      <TabBar />
    </div>
  );
}
