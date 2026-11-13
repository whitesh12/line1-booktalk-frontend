import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { Motion, WordType } from '../data/content';
import { useBack, useGo } from '../lib/nav';
import { loadProfile } from '../store/profile';
import { canUseServerTts, prefetchSpeech, synthesize } from '../api/ai';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
export const Icon = {
  back: (p = 22) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} strokeWidth={2.2} aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>,
  chevron: (p = 20) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} strokeWidth={2.2} aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>,
  arrow: (p = 20) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} strokeWidth={2.2} aria-hidden="true"><path d="M5 12h13" /><path d="M13 6l6 6-6 6" /></svg>,
  home: (p = 24) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M4 11l8-6 8 6v9H4z" /><path d="M10 20v-5h4v5" /></svg>,
  book: (p = 24) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1V19c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1V5.5z" /><path d="M12 6.5V20" /></svg>,
  user: (p = 24) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></svg>,
  camera: (p = 22) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  speaker: (p = 18) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 010 7" /></svg>,
  play: (p = 18) => <svg width={p} height={p} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>,
  pencil: (p = 20) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" /></svg>,
  mic: (p = 20) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0013 0" /><path d="M12 17.5V21" /></svg>,
  check: (p = 18, c = '#fff') => <svg width={p} height={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  bulb: (p = 20) => <svg width={p} height={p} viewBox="0 0 24 24" fill="none" stroke="#8A6410" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" /></svg>,
  search: (p = 18) => <svg width={p} height={p} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></svg>,
  chat: (p = 20) => <svg width={p} height={p} viewBox="0 0 24 24" {...S} aria-hidden="true"><path d="M4 5h16v10H9l-5 4V5z" /></svg>,
  shield: (p = 28) => <svg width={p} height={p} viewBox="0 0 24 24" fill="none" stroke="#1C7A6C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z" /><path d="M8.8 12.2l2.3 2.3 4.3-4.6" /></svg>,
  bookmark: (p = 22) => <svg width={p} height={p} viewBox="0 0 24 24" fill="none" stroke="#1C7A6C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4h10v16l-5-3.5L7 20z" /></svg>,
  lock: (p = 22) => <svg width={p} height={p} viewBox="0 0 24 24" fill="none" stroke="#1C7A6C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V7.5a3.5 3.5 0 017 0v3" /></svg>,
  translate: (p = 22) => <svg width={p} height={p} viewBox="0 0 24 24" fill="none" stroke="#1C7A6C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h8" /><path d="M8 3v2" /><path d="M10 5c-.5 3.5-2.5 6-5.5 7.5" /><path d="M6 8.5c1 1.8 2.6 3.2 4.5 4" /><path d="M12.5 20l4-9 4 9" /><path d="M14 17h5" /></svg>,
};

export function Header({ title, back = true, white = false, center = false, to, onBack }: {
  title: string; back?: boolean; white?: boolean; center?: boolean; to?: string; onBack?: () => void;
}) {
  const goBack = useBack();
  return (
    <header className={`header${white ? ' white' : ''}${center ? ' center' : ''}`}>
      {back && (to || onBack) && (
        <button className="icon-btn" aria-label="뒤로" onClick={() => (onBack ? onBack() : goBack(to!))}>{Icon.back()}</button>
      )}
      <h1>{title}</h1>
    </header>
  );
}

export function PageTitle({ title, sub, lineHeight }: { title: string; sub?: string; lineHeight?: number }) {
  return <div className="page-title"><h1 style={lineHeight ? { lineHeight } : undefined}>{title}</h1>{sub && <p>{sub}</p>}</div>;
}

const TABS = [
  { to: '/home', label: '홈', icon: Icon.home, match: /^\/home/ },
  { to: '/books', label: '내 동화책', icon: Icon.book, match: /^\/(books|words|scan)/ },
  { to: '/settings', label: '내 정보', icon: Icon.user, match: /^\/settings/ },
];

export function TabBar({ onLeave }: { onLeave?: (leave: () => void) => void }) {
  const go = useGo();
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="메뉴">
      {TABS.map((t) => {
        const active = t.match.test(pathname);
        return (
          <a key={t.to} href={t.to} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (onLeave) onLeave(() => go(t.to));
              else go(t.to);
            }}>
            {t.icon()}{t.label}
          </a>
        );
      })}
    </nav>
  );
}

const NBSP = String.fromCharCode(0xa0);
const STAGGER: Partial<Record<NonNullable<Motion>, number>> = { twinkle: 0.37, tiptoe: 0.25, sob: 0.2, widen: 0.07 };
export function AnimWord({ text, motion, mode = 'hover' }: { text: string; motion: Motion; mode?: 'loop' | 'hover' | 'none' }) {
  if (!motion || mode === 'none') return <>{text}</>;
  const step = STAGGER[motion] ?? 0.13;
  return (
    <span className={`mw mw-${motion} ${mode}`} aria-label={text}>
      {[...text].map((ch, i) => (
        // 글자마다 inline-block 이라 일반 공백은 폭이 0이 된다 → 띄어쓰기는 줄바꿈 없는 공백으로
        <span key={i} aria-hidden="true" style={{ animationDelay: `${(i * step).toFixed(2)}s` }}>{ch === ' ' ? NBSP : ch}</span>
      ))}
    </span>
  );
}

const TAG_CLASS: Record<WordType, string> = { 의태어: 'tag-mimetic', 의성어: 'tag-sound', '관용 표현': 'tag-idiom', 감탄사: 'tag-interjection' };
export function TypeTag({ type, style }: { type: WordType; style?: React.CSSProperties }) {
  return <span className={`tag ${TAG_CLASS[type]}`} style={style}>{type}</span>;
}

export function Highlight({ sentence, word }: { sentence: string; word: string }) {
  const stem = word.split(' ')[0];
  const parts = sentence.split(stem);
  return <>{parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <span className="hl">{stem}</span>}</span>)}</>;
}

export function KidMessage({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="msg-kid">
      <span className="avatar" aria-hidden="true">{name.slice(0, 1)}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="who">{name}</span>
        {children}
      </div>
    </div>
  );
}

function browserSpeak(text: string, rate: number) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = rate * 0.9;
  window.speechSynthesis.speak(u);
}

// 휴대폰(특히 iPhone)은 '누른 순간'에 재생을 시작한 오디오만 나중에 소리를 낼 수 있어서,
// 하나의 오디오를 누르는 순간 무음으로 깨워 두고 서버 음성이 오면 그걸로 재생한다.
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
let player: HTMLAudioElement | null = null;
let speakSeq = 0;

/** 읽어 주기. 서버 음성(AI)을 쓰고, 느리거나 안 되면 브라우저 음성으로 대신한다. 속도는 내 정보 설정을 따른다. */
export function speak(text: string, rate = Number(loadProfile().speed) || 1) {
  if (!canUseServerTts()) { browserSpeak(text, rate); return; }
  const seq = ++speakSeq; // 연달아 누르면 마지막 것만 재생
  player ??= new Audio();
  const audio = player;
  window.speechSynthesis?.cancel();
  audio.pause();
  audio.src = SILENCE;
  audio.play().catch(() => {});
  synthesize(text)
    .then((url) => {
      if (seq !== speakSeq) return;
      audio.src = url;
      audio.playbackRate = rate; // 서버는 같은 파일을 주고 빠르기는 재생할 때 바꾼다
      return audio.play();
    })
    .catch(() => {
      if (seq !== speakSeq) return;
      browserSpeak(text, rate);
      prefetchSpeech(text); // 다음에는 서버 음성으로 바로 나오게
    });
}
