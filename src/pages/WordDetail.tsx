import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AnimWord, Header, Highlight, Icon, speak } from '../components/ui';
import { WORDS, bookById, sceneFor } from '../data/content';

/* D-1 단어 카드 상세 */
export function WordDetail() {
  const { wordId = 'dugeun' } = useParams();
  const [q] = useSearchParams();
  const book = bookById(q.get('book') ?? undefined);
  const w = WORDS[wordId] ?? WORDS.dugeun;
  const scene = sceneFor(w, book);
  const sectionTitle = { margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--primary)' } as const;

  return (
    <div className="screen">
      <Header title={w.text} to={book ? `/books/${book.id}` : '/books'} />
      <div className="content" style={{ paddingTop: 4 }}>
        <div style={{ height: 236, borderRadius: 26, background: 'var(--mint-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>
          <span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: w.text.length > 5 ? 36 : 64, color: 'var(--primary-dark)', lineHeight: 1.2 }}>
            <AnimWord text={w.text} motion={w.motion} mode="loop" />
          </span>
          <button onClick={() => speak(w.text)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 999, border: 0, background: '#fff', color: 'var(--primary)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {Icon.speaker(20)}발음 듣기
          </button>
        </div>

        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 style={sectionTitle}>뜻</h2>
          <p style={{ margin: 0, fontSize: 19, fontWeight: 700, lineHeight: 1.5 }}>{w.meaning}</p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-sub)' }}>{w.vi}</p>
        </section>

        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={sectionTitle}>이럴 때 써요</h2>
          <div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55 }}>{w.nuance}</p>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-sub)' }}>{w.nuanceVi}</p>
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
            <button aria-label="문장 읽어주기" onClick={() => speak(scene)} style={{ width: 44, height: 44, borderRadius: '50%', border: 0, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{Icon.play()}</button>
          </div>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.7 }}><Highlight sentence={scene} word={w.text} /></p>
        </section>

        {w.similar.length > 0 && (
          <>
            <h2 style={{ margin: '10px 0 0', fontSize: 17 }}>비슷한 표현</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr 96px', gap: 8, padding: '12px 16px', background: 'var(--bg)', fontSize: 12, fontWeight: 700, color: 'var(--text-sub)' }}><span>표현</span><span>느낌</span><span>이럴 때</span></div>
              {[{ text: w.text, feel: w.nuance.split('.')[0], when: w.usage[0]?.label ?? '' }, ...w.similar].map((s, i) => (
                <div key={s.text} style={{ display: 'grid', gridTemplateColumns: '96px 1fr 96px', gap: 8, padding: '14px 16px', alignItems: 'center', background: i === 0 ? 'var(--mint-soft)' : undefined, borderTop: i ? '1px solid #EEF0F4' : undefined }}>
                  <span style={{ fontWeight: 800, fontSize: 17, color: i === 0 ? 'var(--primary-dark)' : undefined }}>{s.text}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.4 }}>{s.feel}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-body)' }}>{s.when}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 style={{ margin: '10px 0 0', fontSize: 17 }}>아이에게는 이렇게</h2>
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{w.tip}</p>
          {w.examples.map((e) => (
            <p key={e} style={{ margin: 0, fontSize: 15, lineHeight: 1.6, background: 'var(--bg)', borderRadius: 12, padding: '10px 12px' }}>“<Highlight sentence={e} word={w.text} />”</p>
          ))}
        </section>
      </div>
      <div className="bottom-bar" style={{ background: '#fff', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0 }}>
        <Link to={`/practice/${w.id}${book ? `?book=${book.id}` : ''}`} className="btn btn-primary">{Icon.pencil()}문장 연습</Link>
      </div>
    </div>
  );
}
