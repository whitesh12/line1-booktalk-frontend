import { GoLink } from '../../lib/nav';
import { Header, TabBar, callName } from '../../components/ui';
import type { Profile } from '../../store/profile';
import { useTalk } from './shared';

export function TalkCompletePage({ profile }: { profile: Profile }) {
  const { book } = useTalk();
  return (
    <div className="screen">
      <Header title="대화 마무리" back={false} center />
      <div className="content center" style={{ gap: 22, padding: '0 24px 60px' }}>
        <div style={{ width: 300, height: 230, borderRadius: 32, background: 'var(--mint-soft)', overflow: 'hidden' }}>
          <img src="/images/celebrate.svg" alt="부모와 아이가 함께 그림책을 읽으며 이야기를 나누고 손을 맞잡은 그림" width={300} height={230} style={{ display: 'block' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <b style={{ fontSize: 26 }}>잘했어요!</b>
          <span style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-body)' }}>오늘 배운 표현으로<br />{callName(profile.childName)}와 끝까지 이야기했어요</span>
        </div>
      </div>
      <div className="bottom-bar"><GoLink to={`/books/${book.id}`} className="btn btn-primary">목록으로</GoLink></div>
      <TabBar />
    </div>
  );
}
