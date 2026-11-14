import { GoLink } from '../../lib/nav';
import { AnimWord, Icon, PageTitle, TabBar } from '../../components/ui';
import { WORDS } from '../../data/content';
import type { Profile } from '../../store/profile';
import { timeAgo, useLearning, type LearnRecord, type Stage } from '../../store/learning';
import { useEffect, useState } from 'react';
import { fetchRecentVocabulary } from '../../api/ai';
import { localWordForVocab } from '../../data/scanned';

const SERVER_STAGE: Record<string, Stage> = { VIEWED: 'viewed', SENTENCE_DONE: 'practiced', CONVERSATION_DONE: 'talked' };
const ORDER: Stage[] = ['viewed', 'practiced', 'talking', 'talked'];

/** 같은 단어는 더 많이 진행한 단계·더 최근 시각으로 합치고 최근 순으로 정렬 */
function mergeRecords(a: LearnRecord[], b: LearnRecord[]): LearnRecord[] {
  const byWord = new Map<string, LearnRecord>();
  for (const r of [...a, ...b]) {
    const prev = byWord.get(r.wordId);
    if (!prev) { byWord.set(r.wordId, r); continue; }
    const newer = r.at > prev.at ? r : prev;
    const stage = ORDER.indexOf(r.stage) > ORDER.indexOf(prev.stage) ? r.stage : prev.stage;
    byWord.set(r.wordId, { ...newer, stage });
  }
  return [...byWord.values()].sort((x, y) => y.at - x.at);
}

const Sparkle = ({ size, color, style }: { size: number; color: string; style: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ position: 'absolute', ...style }}>
    <path d="M12 2C12.8 8.5 15.5 11.2 22 12C15.5 12.8 12.8 15.5 12 22C11.2 15.5 8.5 12.8 2 12C8.5 11.2 11.2 8.5 12 2Z" fill={color} />
  </svg>
);

const Heart = ({ size, color, style }: { size: number; color: string; style: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ position: 'absolute', ...style }}>
    <path d="M12 20.5s-7.5-4.6-7.5-10.2C4.5 7.4 6.6 5.5 9 5.5c1.4 0 2.4.7 3 1.6.6-.9 1.6-1.6 3-1.6 2.4 0 4.5 1.9 4.5 4.8 0 5.6-7.5 10.2-7.5 10.2z" fill={color} />
  </svg>
);

/** 마지막으로 한 단계에 따라 '이어서' 할 곳 */
const NEXT: Record<Stage, { pill: string; path: (id: string) => string }> = {
  viewed: { pill: '문장 연습할 차례', path: (id) => `/words/${id}/practice` },
  practiced: { pill: '대화 연습할 차례', path: (id) => `/words/${id}/talk` },
  talking: { pill: '대화 연습 중', path: (id) => `/words/${id}/talk` },
  talked: { pill: '학습 완료', path: (id) => `/words/${id}` },
};

export function HomePage({ profile }: { profile: Profile }) {
  // 실제로 학습한 기록만 보여 준다 (지워진 단어·책은 건너뜀)
  const local = useLearning();
  const [server, setServer] = useState<LearnRecord[]>([]);
  useEffect(() => {
    let alive = true;
    fetchRecentVocabulary(10).then((list) => {
      if (!alive) return;
      const mapped: LearnRecord[] = [];
      for (const v of list) {
        const w = localWordForVocab(v.vocabularyId); // 이 기기에서 보여 줄 수 있는 단어만
        if (w) mapped.push({ wordId: w.wordId, bookId: w.bookId, stage: SERVER_STAGE[v.stage] ?? 'viewed', at: Date.parse(v.lastStudiedAt) || 0 });
      }
      setServer(mapped);
    }).catch((e) => console.warn('[recent-vocabulary] 서버 학습 기록을 불러오지 못했어요', e));
    return () => { alive = false; };
  }, [profile.childId]);
  const records = mergeRecords(local, server).filter((r) => WORDS[r.wordId]);
  const bookQs = (r: LearnRecord) => (r.bookId ? `?book=${r.bookId}` : '');
  const last = records[0];
  const recent = records.slice(0, 8);
  return (
    <div className="screen">
      <PageTitle title={`${profile.parentName} 님, 반가워요!`} sub="오늘 읽을 그림책으로 시작해 볼까요?" lineHeight={1.35} />
      <div className="content" style={{ paddingTop: 12, minHeight: 0 }}>
        <GoLink to="/scan" className="card" style={{ padding: 0, overflow: 'hidden', textDecoration: 'none', color: 'inherit', borderRadius: 22 }}>
          <div style={{ height: 140, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'linear-gradient(160deg, #E9F8F4 0%, #F3FAF8 55%, #FFF7EA 100%)' }}>
            <Sparkle size={18} color="#F6B73C" style={{ top: 22, left: 70 }} />
            <Sparkle size={22} color="#5EC2B2" style={{ top: 18, right: 74 }} />
            <Sparkle size={12} color="#F6B73C" style={{ top: 46, right: 60 }} />
            <Heart size={16} color="#F29AAB" style={{ bottom: 26, left: 78 }} />
            <Sparkle size={14} color="#F6B73C" style={{ bottom: 30, right: 82 }} />
            <div style={{ position: 'relative', width: 112, height: 78, borderRadius: 20, background: '#fff', boxShadow: '0 6px 18px rgba(28,122,108,.14)', display: 'grid', placeItems: 'center', transform: 'rotate(-4deg)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--mint-soft)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>{Icon.camera(28)}</div>
              <span style={{ position: 'absolute', top: -12, right: -26, background: 'var(--coral)', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '4px 11px', transform: 'rotate(4deg)', boxShadow: '0 3px 8px rgba(201,83,58,.25)' }}>AI 탐색</span>
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
        </GoLink>

        <h2 style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 700 }}>이어서 학습하기</h2>
        {last ? (
          <GoLink to={NEXT[last.stage].path(last.wordId) + bookQs(last)} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>{WORDS[last.wordId].text}</span>
                <span className="pill" style={{ background: 'var(--mint-soft)', color: 'var(--primary-dark)' }}>{NEXT[last.stage].pill}</span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>마지막 학습 · {timeAgo(last.at)}</span>
            </div>
            <span style={{ color: 'var(--text-sub)' }}>{Icon.chevron()}</span>
          </GoLink>
        ) : (
          <GoLink to="/books" className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <b style={{ fontSize: 16 }}>아직 학습한 단어가 없어요</b>
              <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>동화책을 골라 첫 단어를 배워 볼까요?</span>
            </div>
            <span style={{ color: 'var(--text-sub)' }}>{Icon.chevron()}</span>
          </GoLink>
        )}

        {recent.length > 0 && (
          <>
            <h2 style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 700 }}>최근 학습한 단어</h2>
            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
              {recent.map((r) => {
                const w = WORDS[r.wordId];
                return (
                  <GoLink key={r.wordId} to={`/words/${r.wordId}${bookQs(r)}`} style={{ background: 'var(--bg)', borderRadius: 999, padding: '6px 14px', fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', color: 'var(--text)', textDecoration: 'none' }}>
                    <AnimWord text={w.text} motion={w.motion} />
                  </GoLink>
                );
              })}
            </div>
          </>
        )}
      </div>
      <TabBar />
    </div>
  );
}
