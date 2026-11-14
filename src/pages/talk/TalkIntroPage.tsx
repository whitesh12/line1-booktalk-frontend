import { GoLink } from '../../lib/nav';
import { Header, Icon, TabBar, callName, josa } from '../../components/ui';
import type { Profile } from '../../store/profile';
import { useTalk } from './shared';

export function TalkIntroPage({ profile }: { profile: Profile }) {
  const { w, book, qs } = useTalk();
  return (
    <div className="screen">
      <Header title="아이와 대화 연습" to={`/words/${w.id}${qs}`} />
      <div className="content" style={{ gap: 16, paddingBottom: 16 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, borderRadius: 24, padding: 20 }}>
          <span className="avatar" style={{ width: 84, height: 84, fontSize: 34 }} aria-hidden="true">{profile.childName.slice(0, 1)}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--mint-soft)', color: 'var(--primary-dark)' }}>대화 파트너</span>
            <b style={{ fontSize: 19 }}>{callName(profile.childName)}와 이야기해요</b>
            <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>{profile.childAge}세 · {book.title}</span>
          </div>
        </div>
        <h2 style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 700 }}>오늘의 목표</h2>
        <div style={{ background: '#fff', border: '2px dashed var(--mint)', borderRadius: 22, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="chip chip-primary" style={{ alignSelf: 'flex-start', fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', padding: '5px 14px' }}>{w.text}</span>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>{josa(w.text, '을', '를')} 넣어 아이에게 질문해 보기</p>
        </div>
      </div>
      <div className="bottom-bar"><GoLink to={`/words/${w.id}/talk/chat${qs}`} className="btn btn-primary">{Icon.chat()}대화 시작하기</GoLink></div>
      <TabBar />
    </div>
  );
}
