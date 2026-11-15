import type { Motion } from './content';

const RULES: [RegExp, NonNullable<Motion>][] = [
  [/짖|으르렁|호랑이|사자|우렁차/, 'beat'],
  [/(^|\s)(우는|운다)|울[다고며어었]|울음|눈물|흐느|훌쩍/, 'sob'],
  [/덜덜|오들오들|벌벌|부들부들|떠는|떨[다고며어]|추워|추위|무서워/, 'shiver'],
  [/놀라|휘둥그|눈이 커|둘러보|두리번|살피/, 'widen'],
  [/가슴|심장|두근|콩닥|떨리|설레|긴장|기대/, 'beat'],
  [/반짝|빛[이나을]|빛나|번쩍|윤이/, 'twinkle'],
  [/쿵|쾅|펑|꽝|터지|무너|부딪/, 'boom'],
  [/보글|부글|몽글|거품|끓/, 'bubble'],
  [/첨벙|물장구|헤엄|튀기|튀어|깨지|부서/, 'splash'],
  [/동동|발을 구르|발을 굴러/, 'hop'],
  [/빠지|떨어지|물방울|퐁|비가|빗|쏟아|넘어지|주저앉|미끄러/, 'drop'],
  [/빙글|뱅글|뱅뱅|맴돌|돌[다며고]|회전|돌아가/, 'spin'],
  [/굴러|구르는 모양|데굴/, 'roll'],
  [/졸[다리고음]|조는|꾸벅|잠이|잠들|자는|쿨쿨|새근/, 'nod'],
  [/기어|기는 모양|엎드려/, 'crawl'],
  [/느릿|느리게|어슬렁|엉거주춤|게으르|굼뜨/, 'slow'],
  [/몰래|살며시|살금|발소리|걷[다는고]|걸어|걸음|아장/, 'tiptoe'],
  [/깔깔|하하|히히|호호|킥킥|웃[다는고으음]|웃는|방긋|생글|싱글|싱긋/, 'laugh'],
  [/쌩|휙|후다닥|부리나케|재빨리|쏜살|달리[다는고며]|달려/, 'dash'],
  [/훨훨|둥실|펄럭|나풀|날[다개고아며]|날아|떠다니|떠오르/, 'fly'],
  [/뛰[다는어며고]|뛰어|껑충|깡충|폴짝|팔짝|신나/, 'hop'],
  [/먹[다는고으]|마시|삼키|꿀꺽/, 'gulp'],
  [/애쓰|애를 쓰|버둥|허우적|매달|서두르|허둥|다급/, 'struggle'],
  [/힘을 모|힘을 주|들어 올|당기|끌어/, 'heave'],
  [/굽[어은이다]|구불|꼬불|흔들|출렁|물결|하늘하늘|살랑/, 'wave'],
];

const SPREAD: NonNullable<Motion>[] = ['wave', 'hop', 'beat', 'twinkle', 'tiptoe', 'roll', 'nod', 'drop', 'bubble', 'fly'];

export function motionFor(text: string, definition = ''): NonNullable<Motion> {
  const hit = RULES.find(([re]) => re.test(text)) ?? RULES.find(([re]) => re.test(definition));
  if (hit) return hit[1];
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SPREAD[h % SPREAD.length];
}
