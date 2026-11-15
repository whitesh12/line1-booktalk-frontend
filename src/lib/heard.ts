const BASE = 0xac00;

function jamo(ch: string) {
  const c = ch.charCodeAt(0) - BASE;
  if (c < 0 || c > 11171) return [ch, '', ''];
  return [String(Math.floor(c / 588)), String(Math.floor((c % 588) / 28)), String(c % 28)];
}

function distance(a: string, b: string) {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const x = jamo(a[i]);
    const y = jamo(b[i]);
    d += x.filter((v, k) => v !== y[k]).length;
  }
  return d;
}

export function fixHeard(said: string, word: string): { text: string; from?: string } {
  if (/\s/.test(word) || said.includes(word)) return { text: said };
  const chars: { ch: string; at: number }[] = [];
  [...said].forEach((ch, at) => { if (!/\s/.test(ch)) chars.push({ ch, at }); });
  const n = word.length;
  const half = n % 2 === 0 && word.slice(0, n / 2) === word.slice(n / 2) ? n / 2 : 0;
  const limit = half || n < 4 ? 1 : 2;
  let best: { start: number; end: number; d: number } | null = null;
  for (let i = 0; i + n <= chars.length; i++) {
    const part = chars.slice(i, i + n).map((c) => c.ch).join('');
    const d = part === word ? 0 : half && part.slice(0, half) === part.slice(half) ? distance(part.slice(0, half), word.slice(0, half)) : distance(part, word);
    if (d <= limit && (!best || d < best.d)) best = { start: chars[i].at, end: chars[i + n - 1].at + 1, d };
  }
  if (!best) return { text: said };
  const list = [...said];
  return { text: list.slice(0, best.start).join('') + word + list.slice(best.end).join(''), from: list.slice(best.start, best.end).join('') };
}
