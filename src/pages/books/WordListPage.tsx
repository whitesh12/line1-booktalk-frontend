import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GoLink } from '../../lib/nav';
import { AnimWord, Header, Icon, TabBar, TypeTag, speak, useSpeechLoading } from '../../components/ui';
import { BOOKS, WORDS, bookById } from '../../data/content';
import { isScanBook, renameScanBook, scanLanguage } from '../../data/scanned';
import { currentLang, langOf, shortMeaningTr } from '../../data/translations';

const LANG_NAME = { vi: '베트남어', zh: '중국어', en: '영어' } as const;

/** 카드의 듣기 버튼. 서버 음성을 불러오는 동안 깜빡인다 */
function CardSpeak({ text }: { text: string }) {
  const loading = useSpeechLoading(text);
  return (
    <button aria-label={loading ? `${text} 음성 불러오는 중` : `${text} 듣기`} aria-busy={loading} className={loading ? 'tts-loading' : undefined} onClick={() => speak(text)}
      style={{ position: 'absolute', top: 99, right: 15, width: 28, height: 28, padding: 0, borderRadius: '50%', border: 0, background: 'var(--mint-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 010 7" /></svg>
    </button>
  );
}

export function WordListPage() {
  const { bookId } = useParams();
  const book = bookById(bookId) ?? BOOKS[0];
  const words = book.wordIds.map((id) => WORDS[id]);
  const lang = currentLang();
  const mine = isScanBook(book.id); // 내가 찍은 책이면 이름을 바꿀 수 있다
  const [title, setTitle] = useState(book.title);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTitle(book.title); setEditing(false); }, [book.id, book.title]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);
  const save = () => {
    if (renameScanBook(book.id, draft)) setTitle(draft.trim().slice(0, 30));
    setEditing(false);
  };
  // 찍은 페이지가 예전 설명 언어로 분석된 경우 (번역은 분석할 때의 언어로 만들어진다)
  const scanned = scanLanguage(book.id);
  const staleLang = mine && !!scanned && langOf(scanned) !== lang;
  return (
    <div className="screen">
      <Header title={`이 페이지의 표현 (${words.length})`} to="/books" />
      <div className="content" style={{ paddingTop: 4, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          {editing ? (
            <form className="pill" onSubmit={(e) => { e.preventDefault(); save(); }}
              style={{ flex: 1, minWidth: 0, background: '#fff', border: '1.5px solid var(--primary)', padding: '3px 4px 3px 12px', fontSize: 13, color: 'var(--text-body)' }}>
              {Icon.book(16)}
              <input ref={inputRef} aria-label="책 이름" value={draft} onChange={(e) => setDraft(e.target.value)}
                onBlur={save} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setEditing(false); } }}
                style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', font: 'inherit', fontWeight: 700, color: 'var(--text)', padding: '4px 0' }} />
              <button type="submit" aria-label="이름 저장" onMouseDown={(e) => e.preventDefault()}
                style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', border: 0, background: 'var(--primary)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{Icon.check(14)}</button>
            </form>
          ) : (
            <span className="pill" style={{ minWidth: 0, background: '#fff', border: '1px solid var(--border)', padding: mine ? '3px 4px 3px 12px' : '6px 12px', fontSize: 13, color: 'var(--text-body)' }}>
              {Icon.book(16)}
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}{book.page && ` · ${book.page}`}</span>
              {mine && (
                <button type="button" aria-label="책 이름 바꾸기" title="책 이름 바꾸기" onClick={() => { setDraft(title); setEditing(true); }}
                  style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', border: 0, background: 'var(--mint-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{Icon.pencil(14)}</button>
              )}
            </span>
          )}
          {!editing && <span style={{ flex: 'none', fontSize: 13, color: 'var(--text-sub)' }}>카드를 눌러 배워요</span>}
        </div>
        {staleLang && (
          <p role="status" style={{ margin: 0, padding: '10px 14px', borderRadius: 14, background: '#FFF6E5', color: '#8A5A00', fontSize: 13, lineHeight: 1.5 }}>
            설명 언어를 바꿨어요. 이 페이지를 다시 찍으면 {LANG_NAME[lang]}로 번역된 설명을 볼 수 있어요.
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {words.map((w) => (
            <div key={w.id} style={{ position: 'relative' }}>
              <GoLink to={`/words/${w.id}?book=${book.id}`} className="card" style={{ padding: '10px 10px 14px', display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', color: 'inherit', height: '100%' }}>
                <div style={{ position: 'relative', height: 80, borderRadius: 14, overflow: 'hidden', background: 'var(--bg)' }}>
                  <img src={w.image} alt={`${w.text} 그림`} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <TypeTag type={w.type} style={{ position: 'absolute', top: 6, left: 6, boxShadow: '0 1px 4px rgba(0,0,0,.12)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: 28, paddingRight: 34 }}>
                    <span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: w.text.length > 5 ? 15 : 19, lineHeight: 1.3 }}>
                      <AnimWord text={w.text} motion={w.motion} mode="loop" />
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45 }}>{w.meaning}</span>
                  {shortMeaningTr(w, lang) && <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{shortMeaningTr(w, lang)}</span>}
                </div>
              </GoLink>
              <CardSpeak text={w.text} />
            </div>
          ))}
        </div>
      </div>
      <TabBar />
    </div>
  );
}
