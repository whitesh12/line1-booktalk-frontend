import { Header, Icon } from '../../components/ui';
import { GoLink } from '../../lib/nav';

const PRIVACY = [
  { icon: Icon.camera, title: '사진은 글자 읽기에만 써요', text: '찍은 사진은 글자를 읽은 직후 바로 삭제돼요.' },
  { icon: Icon.bookmark, title: '표현과 설명만 저장해요', text: '서버에는 추출한 단어와 설명만 남아요. 책 내용 전체는 저장하지 않아요.' },
  { icon: Icon.lock, title: '다른 사용자와 공유하지 않아요', text: '내가 학습한 책 내용은 나만 볼 수 있어요.' },
];

export function PrivacyNoticePage() {
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
      <div className="bottom-bar"><GoLink to="/home" className="btn btn-primary">확인했어요</GoLink></div>
    </div>
  );
}
