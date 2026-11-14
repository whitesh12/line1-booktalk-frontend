import { useSearchParams } from 'react-router-dom';
import { GoLink } from '../../lib/nav';
import { Header, Icon, TabBar } from '../../components/ui';

/**
 * 사진은 잘 처리됐지만 배울 표현을 찾지 못한 경우의 안내 화면.
 * (분석 '실패'와 구분한다: 서버 오류는 분석 화면에서 '다시 시도'를 보여 준다)
 * - no-expressions: 글자는 읽었는데 아이와 배울 표현(흉내말 등)이 없음 (분석 완료, 표현 0개)
 * - no-text: 사진에서 글자를 읽지 못함 (IMAGE_QUALITY_LOW)
 */
const CASES = {
  'no-expressions': {
    icon: Icon.search(34),
    title: '이 페이지에는\n배울 표현이 없어요',
    body: '글자는 잘 읽었어요! 다만 아이와 함께 배울 만한 흉내말이나 재미있는 표현은 찾지 못했어요.',
    tipTitle: '이런 페이지를 찍어 보세요',
    tips: [
      '‘두근두근’, ‘깡충깡충’처럼 소리나 모양을 흉내 내는 말이 있는 페이지',
      '인물이 움직이거나 말하는 장면이 있는 페이지',
      '문장이 여러 줄 있는 페이지 (제목만 있는 페이지는 피해 주세요)',
    ],
    primary: '다른 페이지 찍기',
  },
  'no-text': {
    icon: Icon.camera(34),
    title: '사진에서\n글자를 찾지 못했어요',
    body: '글자가 잘 보이지 않았어요. 아래처럼 다시 찍으면 더 잘 읽을 수 있어요.',
    tipTitle: '이렇게 찍어 보세요',
    tips: [
      '글자가 있는 페이지 한 장을 틀 안에 가득 차게',
      '밝은 곳에서, 그림자나 빛 반사가 없게',
      '흔들리지 않게 잠깐 멈춘 뒤 찍기',
    ],
    primary: '다시 찍기',
  },
} as const;

export function ScanEmptyPage() {
  const reason = useSearchParams()[0].get('reason') === 'no-text' ? 'no-text' : 'no-expressions';
  const c = CASES[reason];
  return (
    <div className="screen">
      <Header title="표현 찾기" to="/books" />
      <div className="content" style={{ gap: 18, paddingTop: 20, paddingBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <span style={{ width: 88, height: 88, borderRadius: 28, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>{c.icon}</span>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.4, letterSpacing: '-0.02em', whiteSpace: 'pre-line' }}>{c.title}</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--text-body)', wordBreak: 'keep-all' }}>{c.body}</p>
        </div>
        <div className="hint" style={{ gap: 8, borderRadius: 18, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{Icon.bulb()}<b style={{ fontSize: 15 }}>{c.tipTitle}</b></div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {c.tips.map((t) => <li key={t} style={{ fontSize: 14, lineHeight: 1.55, wordBreak: 'keep-all' }}>{t}</li>)}
          </ul>
        </div>
      </div>
      <div className="bottom-bar sticky" style={{ flexDirection: 'column' }}>
        <GoLink to="/scan" className="btn btn-primary">{Icon.camera(20)}{c.primary}</GoLink>
        <GoLink to="/books" className="btn btn-outline" style={{ fontSize: 16 }}>예시 동화책으로 배우기</GoLink>
      </div>
      <TabBar />
    </div>
  );
}
