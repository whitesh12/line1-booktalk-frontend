import { Fragment, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { GoLink } from '../../lib/nav';
import { AnimWord, Header, Highlight, Icon, speak, TabBar } from '../../components/ui';
import { BOOKS, WORDS, bookById, sceneFor, type Word } from '../../data/content';
import { DETAIL, guideFor, wordVi, type GuideStep } from '../../data/wordDetail';
import { serverVocabId } from '../../data/scanned';
import { USE_MOCK, hasToken } from '../../api/client';
import { cachedVocabulary, fetchVocabulary, trackLearning, type VocabDetail } from '../../api/ai';

function Bold({ text, word }: { text: string; word: string }) {
  const stem = word.split(' ')[0];
  const parts = text.split(stem);
  return <>{parts.map((p, i) => <Fragment key={i}>{p}{i < parts.length - 1 && <b>{stem}</b>}</Fragment>)}</>;
}

const exprFont = { fontWeight: 800, letterSpacing: '-0.02em', fontSize: 19 } as const;
const grid = { display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr) 96px', gap: 8 } as const;
/** 사진으로 찾은 단어면 서버(AI)가 만든 단어 설명을 불러온다. */
function useAiVocabulary(wordId: string) {
  const vocabId = serverVocabId(wordId);
  const usable = !!vocabId && !USE_MOCK && hasToken();
  const [ai, setAi] = useState<VocabDetail | undefined>(() => (usable ? cachedVocabulary(vocabId!) : undefined));
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!usable) { setAi(undefined); return; }
    let alive = true;
    setAi(cachedVocabulary(vocabId!));
    setLoading(true);
    fetchVocabulary(vocabId!)
      .then((v) => { if (alive) setAi(v); })
      .catch((e) => console.warn('[vocabulary] AI 단어 설명을 불러오지 못했어요', e))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [vocabId, usable]);
  return { ai, loading: loading && !ai };
}

export function WordDetailPage() {
  const { wordId = 'dugeun' } = useParams();
  const [q] = useSearchParams();
  const base = WORDS[wordId] ?? WORDS.dugeun;
  const { ai, loading: aiLoading } = useAiVocabulary(base.id);
  // AI 설명이 있으면 글 내용은 AI 것으로 바꾸고, 그림·움직임은 그대로 쓴다.
  const w: Word = ai ? {
    ...base,
    meaning: ai.definition || base.meaning,
    vi: ai.translation?.text ?? base.vi,
    nuance: ai.childExplanation || base.nuance,
    nuanceVi: '',
    usage: ai.usageSituations?.length ? ai.usageSituations.map((text) => ({ label: '•', text })) : base.usage,
    similar: [],
    examples: ai.practiceExample ? [ai.practiceExample] : base.examples,
  } : base;
  const aiSimilar = ai?.similarExpressions ?? [];
  const book = bookById(q.get('book') ?? undefined) ?? BOOKS.find((b) => b.wordIds.includes(w.id));
  const scene = sceneFor(w, book);
  // 단어를 열어 본 것도 학습 기록으로 남긴다 (홈의 '최근 학습한 단어')
  useEffect(() => { trackLearning(base.id, 'viewed', book?.id); }, [base.id, book?.id]);
  const extra: (typeof DETAIL)[string] = ai ? {} : DETAIL[w.id] ?? {};
  const guide: GuideStep[] = ai ? [
    ...(ai.parentTips?.length ? [{ title: '아이에게 이렇게 설명해요', items: ai.parentTips.map((text) => ({ text })) }] : []),
    ...(ai.practiceExample ? [{ title: '상황이 생길 때 말해 줘요', items: [{ text: `“${ai.practiceExample}”`, boxed: true }] }] : []),
  ] : guideFor(w);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={sectionTitle}>뜻</h2>
            {ai && <span className="pill" style={{ background: 'var(--mint-soft)', color: 'var(--primary-dark)' }}>{Icon.check(12, '#155E53')}AI 설명</span>}
            {aiLoading && <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>AI 설명을 불러오는 중…</span>}
          </div>
          <p style={{ margin: 0, fontSize: 19, fontWeight: 700, lineHeight: 1.5 }}>{w.meaning}</p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-sub)' }}>{ai ? w.vi : wordVi(w)}</p>
        </section>

        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={sectionTitle}>이럴 때 써요</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55 }}>{w.nuance}</p>
            {w.nuanceVi && <p style={{ margin: 0, fontSize: 14, color: 'var(--text-sub)' }}>{w.nuanceVi}</p>}
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

        {aiSimilar.length > 0 && (
          <>
            <h2 style={{ margin: '10px 0 0', fontSize: 17, fontWeight: 700 }}>비슷한 표현</h2>
            {aiSimilar.map((s) => (
              <div key={s.text} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={exprFont}>{s.text}</span>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-body)' }}>{s.nuance}</p>
              </div>
            ))}
          </>
        )}

        <h2 style={{ margin: '10px 0 0', fontSize: 17, fontWeight: 700 }}>아이에게는 이렇게</h2>
        {guide.map((g, n) => (
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
      <div className="bottom-bar" style={{ background: '#fff', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 72 }}>
        <GoLink to={`/words/${w.id}/practice${book ? `?book=${book.id}` : ''}`} className="btn btn-primary">{Icon.pencil()}문장 연습</GoLink>
      </div>
      <TabBar />
    </div>
  );
}
