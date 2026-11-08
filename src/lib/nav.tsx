import { useCallback, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOOKS, bookById } from '../data/content';

const TABS = ['/home', '/books', '/settings'];
const FREE = ['/scan', '/scan/analyzing'];
const STACK_KEY = 'booktalk.navStack';

const pathOf = (url: string) => url.split('?')[0];
export const historyIdx = (): number => (window.history.state?.idx as number | undefined) ?? 0;
function readStack(): string[] {
  try { return JSON.parse(sessionStorage.getItem(STACK_KEY) ?? '[]'); } catch { return []; }
}
function writeAt(idx: number, url: string) {
  const s = readStack();
  s[idx] = url;
  try { sessionStorage.setItem(STACK_KEY, JSON.stringify(s)); } catch {}
}
export const recordEntry = (url: string) => writeAt(historyIdx(), url);

let intentional = false;
export const isIntentionalNav = () => intentional;

export const bookFor = (wordId: string, bookId?: string | null) =>
  bookById(bookId ?? undefined) ?? BOOKS.find((b) => b.wordIds.includes(wordId)) ?? BOOKS[0];

export function parentOf(url: string): string | null {
  const [path, search = ''] = url.split('?');
  const bk = new URLSearchParams(search).get('book');
  const b = (w: string) => `?book=${bookFor(w, bk).id}`;
  let m: RegExpMatchArray | null;
  if (path === '/onboarding/privacy') return '/onboarding';
  if (/^\/books\/[^/]+$/.test(path)) return '/books';
  if ((m = path.match(/^\/words\/([^/]+)$/))) return `/books/${bookFor(m[1], bk).id}`;
  if ((m = path.match(/^\/words\/([^/]+)\/(practice|talk)$/))) return `/words/${m[1]}${b(m[1])}`;
  if ((m = path.match(/^\/words\/([^/]+)\/(practice|talk)\/[^/]+$/))) return `/words/${m[1]}/${m[2]}${b(m[1])}`;
  return null;
}
function chainOf(url: string): string[] {
  const chain = [url];
  for (let p = parentOf(url); p; p = parentOf(p)) chain.unshift(p);
  return chain;
}

export function useGo() {
  const navigate = useNavigate();
  return useCallback((target: string, opts: { state?: unknown } = {}) => {
    intentional = true;
    if (FREE.includes(pathOf(target))) { navigate(target, { state: opts.state }); intentional = false; return; }

    const chain = chainOf(target);
    const stack = readStack();
    const cur = historyIdx();
    const at = (e?: string) => (e ? chain.findIndex((c) => pathOf(c) === pathOf(e)) : -1);

    let k = cur;
    let j = at(stack[k]);
    while (j < 0 && k > 0) { k -= 1; j = at(stack[k]); }

    let toPush: string[];
    let replaceFirst = false;
    if (j >= 0) toPush = chain.slice(j + 1);
    else if (TABS.includes(pathOf(stack[0] ?? ''))) toPush = chain;
    else { toPush = chain; replaceFirst = true; }

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
