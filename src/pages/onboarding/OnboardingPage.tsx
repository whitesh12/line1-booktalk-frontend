import { useState } from 'react';
import { Header, Icon } from '../../components/ui';
import { registerProfile } from '../../api/client';
import { useGo } from '../../lib/nav';
import type { Lang, Profile, Relation } from '../../store/profile';

const LANGS: { id: Lang; name: string; ko: string }[] = [
  { id: 'vi', name: 'Tiếng Việt', ko: '베트남어' },
  { id: 'zh', name: '中文', ko: '중국어' },
  { id: 'en', name: 'English', ko: '영어' },
];

export function OnboardingPage({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const go = useGo();
  const [draft, setDraft] = useState(() => (profile.onboarded ? profile : { ...profile, parentName: '', childName: '' }));
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }));

  async function next() {
    const empty = !draft.parentName.trim() ? 'parentName' : !draft.childName.trim() ? 'childName' : null;
    if (empty) { document.getElementById(empty)?.focus(); return; }
    setSaving(true);
    // 글자 수 제한은 입력칸(maxLength)에 걸지 않고 저장할 때 맞춘다.
    // (아이폰 사파리 등은 maxLength 가 있으면 한글 조합이 끊겨 '민준'이 '미니준'으로 입력되는 문제가 있다)
    const clean = { ...draft, parentName: draft.parentName.trim(), childName: draft.childName.trim().slice(0, 20) };
    let childId = clean.childId;
    // 서버가 느리면(무료 서버 깨어나는 중 등) 8초까지만 기다리고 넘어간다.
    // 못 받은 childId 는 첫 촬영 때 다시 맞춘다 (이미 등록된 아이가 있으면 그 아이를 쓴다).
    const timeout = new Promise<undefined>((r) => setTimeout(() => r(undefined), 8000));
    try { childId = (await Promise.race([registerProfile(clean), timeout])) ?? childId; } catch {}
    onSave({ ...clean, childId, onboarded: true });
    go('/onboarding/privacy');
  }

  return (
    <div className="screen">
      <Header title="기본 정보 입력" back={false} />
      <div className="content" style={{ gap: 22, paddingBottom: 16 }}>
        <div className="field">
          <label htmlFor="parentName">이름</label>
          <input id="parentName" className="input" placeholder="보호자 이름 (예: 유진)" value={draft.parentName} onChange={(e) => set({ parentName: e.target.value })} />
        </div>
        <div className="field">
          <span className="label">아이와의 관계</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['엄마', '아빠', '보호자'] as Relation[]).map((r) => (
              <button key={r} type="button" className="toggle" aria-pressed={draft.relation === r} onClick={() => set({ relation: r })}>{r}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="childName">아이 이름</label>
          <input id="childName" className="input" placeholder="예: 민준" value={draft.childName} onChange={(e) => set({ childName: e.target.value })} />
        </div>
        <div className="field" style={{ gap: 10 }}>
          <span className="label">설명 언어</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--mint-soft)', borderRadius: 14, padding: '12px 14px', fontSize: 14, lineHeight: 1.5, color: 'var(--primary-dark)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5v.5" /></svg>
            <span>선택한 언어로 단어 뜻을 함께 보여드려요</span>
          </div>
          {LANGS.map((l) => (
            <button key={l.id} type="button" aria-pressed={draft.lang === l.id} onClick={() => set({ lang: l.id })}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 16px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                border: `1.5px solid ${draft.lang === l.id ? 'var(--primary)' : 'var(--border)'}`, background: '#fff' }}>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <b style={{ fontSize: 17, color: 'var(--text)' }}>{l.name}</b>
                <span style={{ fontSize: 13, color: draft.lang === l.id ? 'var(--primary)' : 'var(--text-sub)' }}>{l.ko}</span>
              </span>
              {draft.lang === l.id && <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'grid', placeItems: 'center' }}>{Icon.check(16)}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="bottom-bar">
        <button className="btn btn-primary" disabled={saving} onClick={next}>{saving ? '저장하는 중…' : '다음'}</button>
      </div>
    </div>
  );
}
