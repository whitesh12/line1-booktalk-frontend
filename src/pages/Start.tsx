import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimWord, Header, Icon } from '../components/ui';
import { registerProfile } from '../api/client';
import type { Lang, Profile, Relation } from '../store/profile';

/* A-1 시작 */
export function Splash() {
  return (
    <div className="screen" style={{ padding: '64px 24px 32px' }}>
      <div className="content center" style={{ gap: 18 }}>
        <img src="/images/logo.svg" alt="아이랑 북토크 로고" width={150} height={150} />
        <h1 style={{ margin: '6px 0 0', fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          아이랑 <span style={{ color: 'var(--primary)' }}>북토크</span>
        </h1>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: 'var(--text-body)' }}>
          그림책 속 한국어 표현,<br />
          <strong style={{ color: 'var(--primary)' }}>쉽게 이해하고</strong> 아이와 함께 말해 봐요
        </p>
        <div style={{ marginTop: 22, display: 'flex', gap: 10, fontWeight: 800, fontSize: 21 }}>
          {([['두근두근', 'beat'], ['반짝반짝', 'twinkle'], ['퐁당', 'drop']] as const).map(([t, m]) => (
            <span key={t} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 999, padding: '8px 16px' }}>
              <AnimWord text={t} motion={m} mode="loop" />
            </span>
          ))}
        </div>
      </div>
      <Link to="/onboarding" className="btn btn-primary">시작하기 {Icon.arrow()}</Link>
    </div>
  );
}

/* A-2 기본 정보 입력 */
const LANGS: { id: Lang; name: string; ko: string }[] = [
  { id: 'vi', name: 'Tiếng Việt', ko: '베트남어' },
  { id: 'zh', name: '中文', ko: '중국어' },
  { id: 'en', name: 'English', ko: '영어' },
];

export function Onboarding({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const nav = useNavigate();
  const [draft, setDraft] = useState(profile);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }));
  const ready = draft.parentName.trim() && draft.childName.trim();

  async function next() {
    setSaving(true);
    let childId = draft.childId;
    try { childId = (await registerProfile(draft)) ?? childId; } catch { /* 백엔드가 꺼져 있어도 계속 진행 */ }
    onSave({ ...draft, childId });
    nav('/privacy');
  }

  return (
    <div className="screen">
      <Header title="기본 정보 입력" to="/" />
      <div className="content" style={{ gap: 22 }}>
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
          <div className="banner" style={{ fontSize: 14, fontWeight: 500, padding: '12px 14px' }}>선택한 언어로 단어 뜻을 함께 보여드려요</div>
          {LANGS.map((l) => (
            <button key={l.id} type="button" aria-pressed={draft.lang === l.id} onClick={() => set({ lang: l.id })}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 16px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                border: `1.5px solid ${draft.lang === l.id ? 'var(--primary)' : 'var(--border)'}`, background: '#fff' }}>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <b style={{ fontSize: 17 }}>{l.name}</b>
                <span style={{ fontSize: 13, color: draft.lang === l.id ? 'var(--primary)' : 'var(--text-sub)' }}>{l.ko}</span>
              </span>
              {draft.lang === l.id && <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'grid', placeItems: 'center' }}>{Icon.check(16)}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="bottom-bar">
        <button className="btn btn-primary" disabled={!ready || saving} onClick={next}>{saving ? '저장하는 중…' : '다음'}</button>
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
      <div className="content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 4px 12px' }}>
          <span style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center' }}>{Icon.shield()}</span>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.4 }}>사진과 책 내용은<br />이렇게 안전하게 다뤄요</p>
        </div>
        {PRIVACY.map((p) => (
          <div key={p.title} className="card" style={{ display: 'flex', gap: 14 }}>
            <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center', flex: 'none', color: 'var(--primary)' }}>{p.icon(22)}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <b style={{ fontSize: 16 }}>{p.title}</b>
              <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-sub)' }}>{p.text}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="bottom-bar"><Link to="/home" className="btn btn-primary">확인했어요</Link></div>
    </div>
  );
}
