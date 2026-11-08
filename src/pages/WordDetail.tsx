import { Fragment } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { GoLink } from '../lib/nav';
import { AnimWord, Header, Highlight, Icon, speak } from '../components/ui';
import { BOOKS, WORDS, bookById, sceneFor, type Word } from '../data/content';

/* 최종 디자인(D-1)에만 있는 상세 문구. content.ts에 필드가 생기면 그쪽으로 옮긴다. */
interface GuideStep { title: string; items: { label?: string; text: string; boxed?: boolean }[] }
const DETAIL: Record<string, { vi?: string; feel?: string; feelVi?: string; similarVi?: string[]; guide?: GuideStep[] }> = {
  dugeun: {
    vi: 'Tim đập thình thịch vì hồi hộp hoặc vui',
    feel: '보통 세기로 설레요', feelVi: 'hồi hộp vừa phải',
    similarVi: ['nhẹ, đáng yêu', 'mạnh'],
    guide: [
      { title: '말풍선처럼 넓혀서 말해요', items: [
        { label: '아이가 “토끼!”라고 하면', text: '“응, 토끼가 두근두근해 하네!”', boxed: true },
        { label: '조금 더 자라면 이렇게 넓혀요', text: '“토끼가 당근을 보고 가슴이 콩닥콩닥, 두근두근 뛰네!”', boxed: true },
      ] },
      { title: '몸으로 느껴봐요', items: [
        { text: '아이 손을 가슴에 대고 심장 뛰는 걸 함께 느끼며 “이게 바로 두근두근이야!”' },
        { label: '또는', text: '제자리에서 콩콩 뛰어 심장을 빨리 뛰게 한 뒤 “지금 마음이 두근두근하지?”' },
      ] },
      { title: '상황이 생길 때마다 말해줘요', items: [
        { label: '선물 열기 전', text: '“선물 열기 전엔 마음이 두근두근하지!”' },
        { label: '소풍 가기 전날 밤', text: '“내일 소풍 생각하니 두근두근하다~”' },
      ] },
    ],
  },
};

/** 디자인 기준 베트남어 뜻 (E-3-1에서도 같이 씀) */
export const wordVi = (w: Word) => DETAIL[w.id]?.vi ?? w.vi;

const guideFor = (w: Word): GuideStep[] => DETAIL[w.id]?.guide ?? [
  { title: '몸으로 느껴봐요', items: [{ text: w.tip }] },
  { title: '상황이 생길 때마다 말해줘요', items: w.examples.map((e) => ({ text: `“${e}”` })) },
];

/* 문장 속 목표 단어를 굵게 */
function Bold({ text, word }: { text: string; word: string }) {
  const stem = word.split(' ')[0];
  const parts = text.split(stem);
  return <>{parts.map((p, i) => <Fragment key={i}>{p}{i < parts.length - 1 && <b>{stem}</b>}</Fragment>)}</>;
}

const exprFont = { fontWeight: 800, letterSpacing: '-0.02em', fontSize: 19 } as const;
const grid = { display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr) 96px', gap: 8 } as const;

/* D-1 단어 카드 상세 */
export function WordDetail() {
  const { wordId = 'dugeun' } = useParams();
  const [q] = useSearchParams();
  const w = WORDS[wordId] ?? WORDS.dugeun;
  // 책 정보 없이 들어와도(홈 등) 뒤로 가기는 C-4(단어 카드 목록)로
  const book = bookById(q.get('book') ?? undefined) ?? BOOKS.find((b) => b.wordIds.includes(w.id));
  const scene = sceneFor(w, book);
  const extra = DETAIL[w.id] ?? {};
  const sectionTitle = { margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--primary)' } as const;
  const rows = [
    { text: w.text, feel: extra.feel ?? w.nuance.split('.')[0], vi: extra.feelVi, when: w.usage[0]?.label ?? '' },
    ...w.similar.map((s, i) => ({ ...s, vi: extra.similarVi?.[i] })),
  ];

  return (
    <div className="screen">
      <Header title={w.text} to={book ? `/books/${book.id}` : '/books'} />
      <div className="content" style={{ paddingTop: 4 }}>
        <div style={{ height: 236, borderRadius: 26, background: 'var(--mint-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>
          <span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: w.text.length > 5 ? 36 : 66, color: 'var(--primary-dark)', lineHeight: 1.2 }}>
            <AnimWord text={w.text} motion={w.motion} mode="loop" />
          </span>
          <button type="button" onClick={() => speak(w.text)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 999, border: 0, background: '#fff', color: 'var(--primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {Icon.speaker(20)}발음 듣기
          </button>
        </div>

        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 style={sectionTitle}>뜻</h2>
          <p style={{ margin: 0, fontSize: 19, fontWeight: 700, lineHeight: 1.5 }}>{w.meaning}</p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-sub)' }}>{wordVi(w)}</p>
        </section>

        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={sectionTitle}>이럴 때 써요</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55 }}>{w.nuance}</p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-sub)' }}>{w.nuanceVi}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #EEF0F4', paddingTop: 12 }}>
            {w.usage.map((u) => (
              <div key={u.label} style={{ display: 'flex', gap: 10, fontSize: 15, lineHeight: 1.5 }}>
                <b style={{ flex: 'none', color: 'var(--primary)' }}>{u.label}</b><span style={{ color: 'var(--text-body)' }}>{u.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={sectionTitle}>{book ? '그림책 속 문장' : '예문'}</h2>
            <button type="button" aria-label="문장 읽어주기" onClick={() => speak(scene)} style={{ width: 44, height: 44, borderRadius: '50%', border: 0, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{Icon.play()}</button>
          </div>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.7 }}><Highlight sentence={scene} word={w.text} /></p>
        </section>

        {w.similar.length > 0 && (
          <>
            <h2 style={{ margin: '10px 0 0', fontSize: 17, fontWeight: 700 }}>비슷한 표현</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ ...grid, padding: '12px 16px', background: 'var(--bg)', fontSize: 12, fontWeight: 700, color: 'var(--text-sub)' }}><span>표현</span><span>느낌</span><span>이럴 때</span></div>
              {rows.map((s, i) => (
                <div key={s.text} style={{ ...grid, padding: '14px 16px', alignItems: 'center', background: i === 0 ? 'var(--mint-soft)' : undefined, borderTop: i ? '1px solid #EEF0F4' : undefined }}>
                  <span style={{ ...exprFont, color: i === 0 ? 'var(--primary-dark)' : undefined }}>{s.text}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', fontSize: 14, lineHeight: 1.4 }}>
                    {s.feel}
                    {s.vi && <span style={{ fontSize: 12, color: i === 0 ? 'var(--text-body)' : 'var(--text-sub)' }}>{s.vi}</span>}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-body)' }}>{s.when}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 style={{ margin: '10px 0 0', fontSize: 17, fontWeight: 700 }}>아이에게는 이렇게</h2>
        {guideFor(w).map((g, n) => (
          <section key={g.title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--mint)', color: '#0F3D36', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{n + 1}</span>
              <b style={{ fontSize: 16 }}>{g.title}</b>
            </div>
            {g.items.map((it) => (
              <Fragment key={it.text}>
                {it.label && <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{it.label}</span>}
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, ...(it.boxed ? { background: 'var(--bg)', borderRadius: 12, padding: '10px 12px' } : {}) }}><Bold text={it.text} word={w.text} /></p>
              </Fragment>
            ))}
          </section>
        ))}
      </div>
      <div className="bottom-bar" style={{ background: '#fff', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0 }}>
        <GoLink to={`/practice/${w.id}${book ? `?book=${book.id}` : ''}`} className="btn btn-primary">{Icon.pencil()}문장 연습</GoLink>
      </div>
    </div>
  );
}
