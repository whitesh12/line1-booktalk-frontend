import { Link } from 'react-router-dom';
import { AnimWord, Icon, PageTitle, TabBar } from '../components/ui';
import { WORDS } from '../data/content';
import type { Profile } from '../store/profile';

const Sparkle = ({ size, color, style }: { size: number; color: string; style: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ position: 'absolute', ...style }}>
    <path d="M12 2C12.8 8.5 15.5 11.2 22 12C15.5 12.8 12.8 15.5 12 22C11.2 15.5 8.5 12.8 2 12C8.5 11.2 11.2 8.5 12 2Z" fill={color} />
  </svg>
);

/* B-1 홈 */
export function Home({ profile }: { profile: Profile }) {
  const recent = ['dugeun', 'pongdang', 'eongeong', 'banjjak'].map((id) => WORDS[id]);
  return (
    <div className="screen">
      <PageTitle title={`${profile.parentName} 님, 반가워요!`} sub="오늘 읽을 그림책으로 시작해 볼까요?" />
      <div className="content">
        <Link to="/books" className="card" style={{ padding: 0, overflow: 'hidden', textDecoration: 'none', color: 'inherit', borderRadius: 22 }}>
          <div style={{ height: 140, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'linear-gradient(160deg, #E9F8F4 0%, #F3FAF8 55%, #FFF7EA 100%)' }}>
            <Sparkle size={18} color="#F6B73C" style={{ top: 22, left: 70 }} />
            <Sparkle size={22} color="#5EC2B2" style={{ top: 18, right: 74 }} />
            <Sparkle size={12} color="#F6B73C" style={{ top: 46, right: 60 }} />
            <Sparkle size={14} color="#F6B73C" style={{ bottom: 30, right: 82 }} />
            <div style={{ position: 'relative', width: 112, height: 78, borderRadius: 20, background: '#fff', boxShadow: '0 6px 18px rgba(28,122,108,.14)', display: 'grid', placeItems: 'center', transform: 'rotate(-4deg)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>{Icon.camera(28)}</div>
              <span style={{ position: 'absolute', top: -12, right: -26, background: 'var(--coral)', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '4px 11px', transform: 'rotate(4deg)' }}>AI 탐색</span>
            </div>
            <span style={{ width: 84, height: 8, borderRadius: 999, background: '#DCE7E4' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <b style={{ fontSize: 17 }}>동화책 사진 찍고 표현 찾기</b>
              <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>오늘 읽은 페이지에서 배울 표현을 찾아봐요</span>
            </div>
            <span style={{ color: 'var(--text-sub)' }}>{Icon.chevron()}</span>
          </div>
        </Link>

        <h2 style={{ margin: '8px 0 0', fontSize: 16 }}>이어서 학습하기</h2>
        <Link to="/practice/dugeun?book=rabbit" className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>두근두근</span>
              <span className="pill" style={{ background: 'var(--mint-soft)', color: 'var(--primary-dark)' }}>대화 연습 중</span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>마지막 학습 · 어제</span>
          </div>
          <span style={{ color: 'var(--text-sub)' }}>{Icon.chevron()}</span>
        </Link>

        <h2 style={{ margin: '8px 0 0', fontSize: 16 }}>최근 학습한 단어</h2>
        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
          {recent.map((w) => (
            <Link key={w.id} to={`/word/${w.id}?book=rabbit`} style={{ background: 'var(--bg)', borderRadius: 999, padding: '6px 14px', fontWeight: 800, fontSize: 19, color: 'var(--text)', textDecoration: 'none' }}>
              <AnimWord text={w.text} motion={w.motion} />
            </Link>
          ))}
        </div>
      </div>
      <TabBar />
    </div>
  );
}

/* H-1 내 정보 */
export function MyInfo({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
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
  const sel = { width: 120, height: 44, border: '1.5px solid var(--input-border)', borderRadius: 12, background: '#fff', padding: '0 10px', fontSize: 14 };
  return (
    <div className="screen">
      <PageTitle title="내 정보 및 설정" />
      <div className="content">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, borderRadius: 22 }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--mint)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 28, color: '#0F3D36', flex: 'none' }}>{profile.parentName.slice(0, 1)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <b style={{ fontSize: 19 }}>{profile.childName} {profile.relation} {profile.parentName}</b>
            <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>매일 10분, 함께 읽는 즐거운 우리말</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 10 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>학습 및 소리 설정</h2>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-sub)' }}>맞춤형 지원</span>
        </div>
        {row(Icon.translate(), 'lang', '설명 언어 설정', '발음 안내와 뜻풀이 모국어',
          <select id="lang" style={sel} value={profile.lang} onChange={(e) => onSave({ ...profile, lang: e.target.value as Profile['lang'] })}>
            <option value="vi">Tiếng Việt</option><option value="zh">中文</option><option value="en">English</option>
          </select>)}
        {row(Icon.speaker(22), 'speed', '음성 안내 속도', '따라 읽기 좋은 또박또박한 빠르기',
          <select id="speed" style={sel} value={profile.speed} onChange={(e) => onSave({ ...profile, speed: e.target.value as Profile['speed'] })}>
            <option value="0.8">느리게 (0.8x)</option><option value="1.0">보통 (1.0x)</option><option value="1.2">빠르게 (1.2x)</option>
          </select>)}
      </div>
      <TabBar />
    </div>
  );
}
