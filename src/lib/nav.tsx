// 화면 이동 규칙 (화면 속 뒤로 버튼 = 브라우저·휴대폰 뒤로가기가 되도록)
//
// 각 화면에는 정해진 '상위 화면'이 있다 (예: E-1 → D-1 → C-4 → C-1).
// go(대상)으로 이동하면 브라우저 기록을 항상 '탭 화면 → … → 상위 화면 → 대상' 사슬로 맞춘다.
//   - 대상(또는 그 상위)이 이미 기록에 있으면 그 자리까지 기록을 되감는다(history.go(-n)).
//   - 없으면 빠진 상위 화면을 기록에 채워 넣고 대상으로 간다.
// 그래서 어느 화면에서든 브라우저 뒤로가기는 표에 적힌 상위 화면으로 간다.
// 상위 화면이 정해지지 않은 C-2 촬영·C-3 표현 찾기는 일반 이동(기록 추가)만 한다.
import { useCallback, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOOKS, bookById } from '../data/content';

const TABS = ['/home', '/books', '/me'];
const FREE = ['/camera', '/extracting'];
const STACK_KEY = 'booktalk.navStack';

/* ── 기록 위치(idx)별 주소를 sessionStorage에 적어 둔다 ── */
const pathOf = (url: string) => url.split('?')[0];
export const historyIdx = (): number => (window.history.state?.idx as number | undefined) ?? 0;
function readStack(): string[] {
  try { return JSON.parse(sessionStorage.getItem(STACK_KEY) ?? '[]'); } catch { return []; }
}
function writeAt(idx: number, url: string) {
  const s = readStack();
  s[idx] = url;
  try { sessionStorage.setItem(STACK_KEY, JSON.stringify(s)); } catch { /* 저장 못 해도 이동은 동작 */ }
}
/** App에서 화면이 바뀔 때마다 호출 */
export const recordEntry = (url: string) => writeAt(historyIdx(), url);

/* ── 의도한 이동 중에는 F-2의 '대화를 그만할까요?' 확인을 건너뛴다 ── */
let intentional = false;
export const isIntentionalNav = () => intentional;

/* ── 상위 화면 ── */
export const bookFor = (wordId: string, bookId?: string | null) =>
  bookById(bookId ?? undefined) ?? BOOKS.find((b) => b.wordIds.includes(wordId)) ?? BOOKS[0];

export function parentOf(url: string): string | null {
  const [path, search = ''] = url.split('?');
  const bk = new URLSearchParams(search).get('book');
  const b = (w: string) => `?book=${bookFor(w, bk).id}`;
  let m: RegExpMatchArray | null;
  if (path === '/privacy') return '/onboarding';                                          // A-3 → A-2
  if (/^\/books\/[^/]+$/.test(path)) return '/books';                                     // C-4 → C-1
  if ((m = path.match(/^\/word\/([^/]+)$/))) return `/books/${bookFor(m[1], bk).id}`;     // D-1 → C-4
  if ((m = path.match(/^\/practice\/([^/]+)$/))) return `/word/${m[1]}${b(m[1])}`;        // E-1 → D-1
  if ((m = path.match(/^\/practice\/([^/]+)\/(review|feedback)$/))) return `/practice/${m[1]}${b(m[1])}`; // E-2·E-3·E-4 → E-1
  if ((m = path.match(/^\/talk\/([^/]+)$/))) return `/word/${m[1]}${b(m[1])}`;            // F-1 → D-1
  if ((m = path.match(/^\/talk\/([^/]+)\/(chat|done)$/))) return `/talk/${m[1]}${b(m[1])}`; // F-2~F-6 → F-1
  return null; // 탭 화면(B-1·C-1·H-1), A-2, C-2, C-3
}
function chainOf(url: string): string[] {
  const chain = [url];
  for (let p = parentOf(url); p; p = parentOf(p)) chain.unshift(p);
  return chain;
}

/** 표에 맞춰 이동한다. state는 대상 화면에 넘길 값. */
export function useGo() {
  const navigate = useNavigate();
  return useCallback((target: string, opts: { state?: unknown } = {}) => {
    intentional = true;
    if (FREE.includes(pathOf(target))) { navigate(target, { state: opts.state }); intentional = false; return; }

    const chain = chainOf(target);
    const stack = readStack();
    const cur = historyIdx();
    const at = (e?: string) => (e ? chain.findIndex((c) => pathOf(c) === pathOf(e)) : -1);

    // 기록을 위에서부터 되감으며 사슬에 속한 화면을 찾는다
    let k = cur;
    let j = at(stack[k]);
    while (j < 0 && k > 0) { k -= 1; j = at(stack[k]); }

    let toPush: string[];
    let replaceFirst = false;
    if (j >= 0) toPush = chain.slice(j + 1);                       // 사슬 위치에서 이어 붙이기
    else if (TABS.includes(pathOf(stack[0] ?? ''))) toPush = chain; // 맨 아래가 다른 탭이면 그 위에 사슬 전체
    else { toPush = chain; replaceFirst = true; }                  // 맨 아래가 사슬 밖이면 그 자리를 바꿔치기

    const finish = () => {
      let idx = k;
      toPush.forEach((url, i) => {
        const last = i === toPush.length - 1;
        const replace = replaceFirst && i === 0;
        if (last) { navigate(url, { replace, state: opts.state }); return; }
        if (!replace) idx += 1;
        const st = { usr: null, key: Math.random().toString(36).slice(2, 10), idx };
        if (replace) window.history.replaceState(st, '', url); else window.history.pushState(st, '', url);
        writeAt(idx, url);
      });
      if (toPush.length === 0 && opts.state !== undefined) navigate(target, { replace: true, state: opts.state });
      intentional = false;
    };

    if (k < cur) {
      const onPop = () => { window.removeEventListener('popstate', onPop); setTimeout(finish, 0); };
      window.addEventListener('popstate', onPop);
      window.history.go(k - cur);
    } else {
      finish();
    }
  }, [navigate]);
}

/** <a href>는 그대로 두고(새 탭 열기 등) 누르면 go()로 이동하는 링크 */
export function GoLink({ to, state, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; state?: unknown }) {
  const go = useGo();
  return (
    <a href={to} {...rest} onClick={(e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      go(to, { state });
    }} />
  );
}
