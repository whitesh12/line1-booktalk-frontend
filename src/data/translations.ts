/**
 * 설명 언어별 번역.
 * - 예시 단어(content.ts)에는 베트남어(vi, nuanceVi)만 있어서, 중국어·영어 번역을 여기에 둔다.
 * - 서버(AI)가 준 번역은 '그 번역의 언어'가 현재 설정과 같을 때만 쓴다. 다르면 이 파일의 번역을 쓰고, 없으면 보여 주지 않는다.
 *   (베트남어로 설정하지 않았는데 베트남어가 보이는 문제 방지)
 */
import type { Word } from './content';
import { DETAIL } from './wordDetail';
import { scanTranslation } from './scanned';
import { loadProfile, type Lang } from '../store/profile';

type Tr = { meaning: string; nuance: string };
const TR: Record<string, { zh: Tr; en: Tr }> = {
  dugeun: {
    zh: { meaning: '心怦怦直跳', nuance: '高兴或紧张时心里激动的感觉' },
    en: { meaning: 'Heart pounding, thump-thump', nuance: 'The fluttery feeling when you are excited or nervous' },
  },
  pongdang: {
    zh: { meaning: '扑通（小东西掉进水里的声音）', nuance: '小而轻的东西掉进水里的声音' },
    en: { meaning: 'Plop (a small thing falling into water)', nuance: 'The sound of something small and light dropping into water' },
  },
  eongeong: {
    zh: { meaning: '哇哇大哭', nuance: '忍不住放声大哭' },
    en: { meaning: 'Wah-wah (crying loudly)', nuance: 'Crying out loud without holding back' },
  },
  banjjak: {
    zh: { meaning: '一闪一闪', nuance: '小小的光不停地闪烁' },
    en: { meaning: 'Twinkle twinkle', nuance: 'A small light sparkling again and again' },
  },
  nuni: {
    zh: { meaning: '惊讶得瞪大眼睛', nuance: '看到惊奇的东西时睁大眼睛' },
    en: { meaning: 'Eyes going wide', nuance: 'Opening your eyes wide in surprise' },
  },
  kkang: {
    zh: { meaning: '蹦蹦跳跳', nuance: '像兔子一样轻快地跳' },
    en: { meaning: 'Hippity-hop', nuance: 'Hopping lightly like a bunny, full of fun' },
  },
  salgeum: {
    zh: { meaning: '悄悄地，蹑手蹑脚', nuance: '小心地走，不发出声音' },
    en: { meaning: 'Tiptoeing, sneaking quietly', nuance: 'Moving carefully so no one hears' },
  },
  degul: {
    zh: { meaning: '骨碌骨碌地滚', nuance: '圆的东西不停地滚动' },
    en: { meaning: 'Rolling round and round', nuance: 'A round thing rolling without stopping' },
  },
  cheombeong: {
    zh: { meaning: '扑通扑通（戏水声）', nuance: '在水里玩时溅起水花的声音' },
    en: { meaning: 'Splish-splash', nuance: 'The sound of splashing while playing in water' },
  },
  eonggeum: {
    zh: { meaning: '慢慢地爬', nuance: '像乌龟或婴儿一样慢慢爬' },
    en: { meaning: 'Crawling slowly', nuance: 'Creeping along slowly like a turtle or a baby' },
  },
  kkubeok: {
    zh: { meaning: '打瞌睡（头一点一点）', nuance: '困得头不停地往前点' },
    en: { meaning: 'Nodding off', nuance: 'Head drooping again and again when sleepy' },
  },
  gubul: {
    zh: { meaning: '弯弯曲曲', nuance: '路或河不直，弯了好几次' },
    en: { meaning: 'Winding, twisty', nuance: 'Bending this way and that, like a road or river' },
  },
  ggulkkeok: {
    zh: { meaning: '咕嘟（一口咽下）', nuance: '一下子大口吞下的声音' },
    en: { meaning: 'Gulp', nuance: 'Swallowing a big mouthful all at once' },
  },
  eongeongOnui: {
    zh: { meaning: '哇哇大哭', nuance: '忍不住放声大哭' },
    en: { meaning: 'Wah-wah (crying loudly)', nuance: 'Crying out loud without holding back' },
  },
  adeung: {
    zh: { meaning: '拼命挣扎，努力', nuance: '为了做到某事用尽全力' },
    en: { meaning: 'Struggling hard', nuance: 'Trying with all your might to get something done' },
  },
  yeongcha: {
    zh: { meaning: '嘿哟（一起用力时的号子）', nuance: '大家一起用力时喊的口号' },
    en: { meaning: 'Heave-ho!', nuance: 'What everyone shouts together when pulling or lifting' },
  },
};

/** 두근두근 상세 화면의 '느낌'·비슷한 표현 번역 (DETAIL.feelVi, similarVi 와 같은 순서) */
const DETAIL_TR: Record<string, { zh: { feel: string; similar: string[] }; en: { feel: string; similar: string[] } }> = {
  dugeun: {
    zh: { feel: '中等程度的心动', similar: ['轻轻的、可爱的', '强烈的'] },
    en: { feel: 'a medium flutter', similar: ['soft and cute', 'strong'] },
  },
};

/** 서버 언어 코드(vi, zh-CN, en …) → 앱 언어 */
export function langOf(code?: string | null): Lang | undefined {
  const c = (code ?? '').toLowerCase();
  if (c.startsWith('vi')) return 'vi';
  if (c.startsWith('zh')) return 'zh';
  if (c.startsWith('en')) return 'en';
  return undefined;
}

/** 지금 설정된 설명 언어 */
export const currentLang = (): Lang => loadProfile().lang;

export type ServerTranslation = { language: string; text: string } | null | undefined;

/** 단어 뜻 번역. 서버 번역은 언어가 같을 때만, 아니면 앱에 있는 번역, 그것도 없으면 undefined (다른 언어를 보여 주지 않음) */
export function meaningTr(w: Word, lang: Lang = currentLang(), server: ServerTranslation = scanTranslation(w.id), long = true): string | undefined {
  if (server?.text && langOf(server.language) === lang) return server.text;
  // 베트남어: 상세 화면은 긴 설명(DETAIL.vi), 단어 카드는 짧은 번역(w.vi)
  if (lang === 'vi') return (long ? DETAIL[w.id]?.vi : undefined) ?? (w.vi || undefined);
  return TR[w.id]?.[lang]?.meaning;
}

/** 단어 카드용 짧은 번역 */
export const shortMeaningTr = (w: Word, lang: Lang = currentLang()) => meaningTr(w, lang, scanTranslation(w.id), false);

/** '이럴 때 써요' 설명 번역 */
export function nuanceTr(w: Word, lang: Lang = currentLang()): string | undefined {
  if (lang === 'vi') return w.nuanceVi || undefined;
  return TR[w.id]?.[lang]?.nuance;
}

/** 상세 화면 비슷한 표현 표의 번역 (첫 줄 = 이 단어의 느낌, 나머지 = 비슷한 표현) */
export function detailRowTr(w: Word, lang: Lang = currentLang()): { feel?: string; similar: (string | undefined)[] } {
  if (lang === 'vi') return { feel: DETAIL[w.id]?.feelVi, similar: DETAIL[w.id]?.similarVi ?? [] };
  const d = DETAIL_TR[w.id]?.[lang];
  return { feel: d?.feel, similar: d?.similar ?? [] };
}
