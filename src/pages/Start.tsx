import { useState } from 'react';
import { Header, Icon } from '../components/ui';
import { registerProfile } from '../api/client';
import { GoLink, useGo } from '../lib/nav';
import type { Lang, Profile, Relation } from '../store/profile';

/* A-2 기본 정보 입력 */
const LANGS: { id: Lang; name: string; ko: string }[] = [
  { id: 'vi', name: 'Tiếng Việt', ko: '베트남어' },
  { id: 'zh', name: '中文', ko: '중국어' },
  { id: 'en', name: 'English', ko: '영어' },
];

export function Onboarding({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const go = useGo();
  const [draft, setDraft] = useState(() => (profile.onboarded ? profile : { ...profile, parentName: '', childName: '' }));
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }));

  async function next() {
    // 디자인처럼 버튼은 늘 활성 상태로 두고, 빈 칸이 있으면 그 칸으로 이동한다
    const empty = !draft.parentName.trim() ? 'parentName' : !draft.childName.trim() ? 'childName' : null;
    if (empty) { document.getElementById(empty)?.focus(); return; }
    setSaving(true);
    let childId = draft.childId;
    try { childId = (await registerProfile(draft)) ?? childId; } catch { /* 백엔드가 꺼져 있어도 계속 진행 */ }
    onSave({ ...draft, childId, onboarded: true });
    go('/privacy');
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

/* A-3 시작하기 전에 */
const PRIVACY = [
  { icon: Icon.camera, title: '사진은 글자 읽기에만 써요', text: '찍은 사진은 글자를 읽은 직후 바로 삭제돼요.' },
  { icon: Icon.bookmark, title: '표현과 설명만 저장해요', text: '서버에는 추출한 단어와 설명만 남아요. 책 내용 전체는 저장하지 않아요.' },
  { icon: Icon.lock, title: '다른 사용자와 공유하지 않아요', text: '내가 학습한 책 내용은 나만 볼 수 있어요.' },
];

export function Privacy() {
  return (
    <div className="screen">
      <Header title="시작하기 전에" to="/onboarding" />
      <div className="content" style={{ paddingBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: '8px 4px 12px' }}>
          <span style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center' }}>{Icon.shield()}</span>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.4, letterSpacing: '-0.02em' }}>사진과 책 내용은<br />이렇게 안전하게 다뤄요</p>
        </div>
        {PRIVACY.map((p) => (
          <div key={p.title} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center', flex: 'none', color: 'var(--primary)' }}>{p.icon(22)}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <b style={{ fontSize: 16 }}>{p.title}</b>
              <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-sub)' }}>{p.text}</span>
            </div>
          </div>
        ))}
      </div>
      {/* 홈으로 갈 때 A-2·A-3 기록을 바꿔치기 → 홈에서 뒤로가기로 설정 화면에 돌아가지 않음 */}
      <div className="bottom-bar"><GoLink to="/home" className="btn btn-primary">확인했어요</GoLink></div>
    </div>
  );
}
