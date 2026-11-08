// 최종 디자인에 들어간 시연용 콘텐츠.
// 백엔드 연결 후에는 GET /v1/books/pages/{pageId}/analysis, GET /v1/vocabulary/{id} 응답으로 바꾸면 된다.

export type WordType = '의태어' | '의성어' | '관용 표현' | '감탄사';
export type Motion =
  | 'beat' | 'drop' | 'sob' | 'twinkle' | 'hop' | 'tiptoe' | 'roll'
  | 'splash' | 'crawl' | 'nod' | 'wave' | 'gulp' | 'struggle' | 'heave' | null;

// sample: 자연스러워요 피드백 '이런 표현도 써 보세요'에 보여 줄 예문 · 쓰는 때 (없으면 feel · when)
export interface Similar { text: string; feel: string; when: string; sample?: string; }
export interface Word {
  id: string;
  text: string;
  type: WordType;
  motion: Motion;
  meaning: string;
  vi: string;
  nuance: string;
  nuanceVi: string;
  usage: { label: string; text: string }[];
  examples: string[];
  similar: Similar[];
  tip: string;
  image: string;
}

const img = (file: string) => `/images/words/${file}`; // 파일 이름에 확장자까지 (jpg / png)

export const WORDS: Record<string, Word> = {
  dugeun: {
    id: 'dugeun', text: '두근두근', type: '의태어', motion: 'beat',
    meaning: '가슴이 자꾸 세게 뛰는 모양', vi: 'Tim đập thình thịch',
    nuance: '기쁘거나 긴장될 때 마음이 설레는 느낌이에요.', nuanceVi: 'Cảm giác hồi hộp, háo hức',
    usage: [
      { label: '선물을 열기 전', text: '아이가 상자를 열려고 해요' },
      { label: '놀이공원 입구', text: '롤러코스터를 타기 전이에요' },
      { label: '그림책 속 토끼', text: '토끼가 당근을 발견했어요' },
    ],
    examples: ['선물 열기 전엔 마음이 두근두근하지!', '내일 소풍 생각하니 두근두근하다~'],
    similar: [
      { text: '콩닥콩닥', feel: '작고 귀엽게 뛰어요', when: '아이·작은 동물', sample: '마음이 콩닥콩닥해요 · 작게 설렐 때' },
      { text: '쿵쾅쿵쾅', feel: '크고 세게 뛰어요', when: '크게 놀랐을 때', sample: '가슴이 쿵쾅쿵쾅해요 · 크게 놀랐을 때' },
    ],
    tip: '아이 손을 가슴에 대고 심장 뛰는 걸 함께 느끼며 “이게 바로 두근두근이야!” 하고 말해 보세요.',
    image: img('dugeun.jpg'),
  },
  pongdang: {
    id: 'pongdang', text: '퐁당', type: '의성어', motion: 'drop',
    meaning: '작은 물건이 물에 빠질 때 나는 소리', vi: 'Tõm',
    nuance: '작고 가벼운 것이 물에 쏙 들어갈 때 써요. 귀엽고 짧은 소리 느낌이에요.', nuanceVi: 'Tiếng vật nhỏ rơi xuống nước',
    usage: [
      { label: '연못가에서', text: '돌멩이를 물에 던져요' },
      { label: '목욕 시간', text: '장난감을 욕조에 떨어뜨려요' },
    ],
    examples: ['돌멩이를 던지니까 퐁당 소리가 났어요.', '사탕이 컵에 퐁당 빠졌어!'],
    similar: [{ text: '풍덩', feel: '크고 무겁게 빠져요', when: '사람·큰 물건' }],
    tip: '컵에 작은 장난감을 떨어뜨리며 “퐁당!” 하고 함께 말해 보세요.',
    image: img('pongdang.jpg'),
  },
  eongeong: {
    id: 'eongeong', text: '엉엉', type: '의성어', motion: 'sob',
    meaning: '크게 소리 내어 우는 모양', vi: 'Hu hu (khóc)',
    nuance: '참지 못하고 소리 내어 크게 울 때 써요.', nuanceVi: 'Khóc to thành tiếng',
    usage: [{ label: '넘어졌을 때', text: '아이가 무릎이 아파서 울어요' }],
    examples: ['아기 곰이 엉엉 울었어요.', '넘어져서 엉엉 울었구나.'],
    similar: [{ text: '훌쩍훌쩍', feel: '작게 콧물을 들이마시며 울어요', when: '조용히 울 때' }],
    tip: '두 손을 눈에 대고 우는 흉내를 내며 “엉엉” 말해 보세요. 그다음 꼭 안아 주세요.',
    image: img('eongeong.jpg'),
  },
  banjjak: {
    id: 'banjjak', text: '반짝반짝', type: '의태어', motion: 'twinkle',
    meaning: '작은 빛이 계속 빛나는 모양', vi: 'Lấp lánh',
    nuance: '별, 보석처럼 예쁘게 빛나는 것에 써요. 기분 좋은 느낌이에요.', nuanceVi: 'Ánh sáng nhỏ nhấp nháy',
    usage: [{ label: '밤하늘', text: '별을 함께 올려다봐요' }],
    examples: ['밤하늘에 별이 반짝반짝 빛나요.', '새 신발이 반짝반짝하네!'],
    similar: [{ text: '번쩍번쩍', feel: '크고 강하게 빛나요', when: '번개·큰 불빛' }],
    tip: '손을 쥐었다 폈다 하면서 “반짝반짝” 별 흉내를 내 보세요.',
    image: img('banjjak.jpg'),
  },
  nuni: {
    id: 'nuni', text: '눈이 휘둥그레지다', type: '관용 표현', motion: null,
    meaning: '깜짝 놀라서 눈을 크게 뜨다', vi: 'Mắt tròn xoe',
    nuance: '놀라거나 신기한 것을 봤을 때 써요.', nuanceVi: 'Mở to mắt vì ngạc nhiên',
    usage: [{ label: '깜짝 선물', text: '생각지 못한 선물을 받았어요' }],
    examples: ['커다란 케이크를 보고 눈이 휘둥그레졌어요.'],
    similar: [{ text: '깜짝 놀라다', feel: '갑자기 놀라요', when: '모든 놀람' }],
    tip: '눈을 동그랗게 크게 뜨는 표정을 함께 지어 보세요.',
    image: img('nuni.jpg'),
  },
  kkang: {
    id: 'kkang', text: '깡충깡충', type: '의태어', motion: 'hop',
    meaning: '두 발을 모으고 가볍게 자꾸 뛰는 모양', vi: 'Nhảy tưng tưng',
    nuance: '토끼처럼 작고 가볍게 뛸 때 써요. 신나는 느낌이에요.', nuanceVi: 'Nhảy nhẹ nhàng, vui vẻ',
    usage: [{ label: '놀이터', text: '아이가 신나서 뛰어요' }],
    examples: ['토끼가 깡충깡충 뛰어가요.', '우리도 깡충깡충 뛰어 볼까?'],
    similar: [{ text: '껑충껑충', feel: '더 크고 멀리 뛰어요', when: '캥거루·큰 동물' }],
    tip: '두 발을 모으고 함께 뛰면서 “깡충깡충!” 말해 보세요.',
    image: img('kkang.jpg'),
  },
  salgeum: {
    id: 'salgeum', text: '살금살금', type: '의태어', motion: 'tiptoe',
    meaning: '남이 모르게 조용히 천천히 움직이는 모양', vi: 'Rón rén',
    nuance: '소리를 내지 않으려고 조심하는 느낌이에요.', nuanceVi: 'Đi nhẹ nhàng, không gây tiếng động',
    usage: [{ label: '숨바꼭질', text: '술래 몰래 움직여요' }],
    examples: ['아빠가 자니까 살금살금 걸어가자.', '고양이가 살금살금 다가와요.'],
    similar: [{ text: '슬금슬금', feel: '눈치를 보며 슬그머니', when: '몰래 피할 때' }],
    tip: '발끝으로 걷는 흉내를 내며 작은 목소리로 “살금살금” 말해 보세요.',
    image: img('salgeum.png'),
  },
  degul: {
    id: 'degul', text: '데굴데굴', type: '의태어', motion: 'roll',
    meaning: '둥근 물건이 계속 굴러가는 모양', vi: 'Lăn lông lốc',
    nuance: '공이나 사과처럼 둥근 것이 멈추지 않고 굴러갈 때 써요.', nuanceVi: 'Lăn tròn liên tục',
    usage: [{ label: '공놀이', text: '공이 언덕 아래로 굴러가요' }],
    examples: ['공이 데굴데굴 굴러가네!', '이불 위에서 데굴데굴 굴러요.'],
    similar: [{ text: '대굴대굴', feel: '작고 가볍게 굴러요', when: '작은 물건' }],
    tip: '공이나 귤을 굴리면서 “데굴데굴” 말해 보세요.',
    image: img('degul.png'),
  },
  cheombeong: {
    id: 'cheombeong', text: '첨벙첨벙', type: '의성어', motion: 'splash',
    meaning: '물속에서 움직일 때 자꾸 나는 큰 물소리', vi: 'Bì bõm',
    nuance: '물웅덩이나 수영장에서 신나게 놀 때 써요.', nuanceVi: 'Tiếng nước bắn khi nghịch nước',
    usage: [{ label: '비 온 뒤', text: '장화 신고 웅덩이에서 놀아요' }],
    examples: ['웅덩이에서 첨벙첨벙 놀자!', '오리가 첨벙첨벙 헤엄쳐요.'],
    similar: [{ text: '찰방찰방', feel: '얕은 물을 가볍게', when: '작은 물놀이' }],
    tip: '목욕할 때 손으로 물을 치면서 “첨벙첨벙” 말해 보세요.',
    image: img('cheombeong.png'),
  },
  eonggeum: {
    id: 'eonggeum', text: '엉금엉금', type: '의태어', motion: 'crawl',
    meaning: '몸을 낮추고 느리게 기어가는 모양', vi: 'Bò chậm chạp',
    nuance: '거북이나 아기처럼 천천히 기어갈 때 써요.', nuanceVi: 'Bò chậm rãi',
    usage: [{ label: '거실 바닥', text: '아기가 기어 와요' }],
    examples: ['거북이가 엉금엉금 기어가요.', '아기가 엉금엉금 기어 와요.'],
    similar: [{ text: '느릿느릿', feel: '그냥 느리게 움직여요', when: '기지 않을 때도' }],
    tip: '바닥에서 함께 기어가며 “엉금엉금” 말해 보세요.',
    image: img('eonggeum.png'),
  },
  kkubeok: {
    id: 'kkubeok', text: '꾸벅꾸벅', type: '의태어', motion: 'nod',
    meaning: '졸려서 고개가 자꾸 앞으로 숙여지는 모양', vi: 'Gà gật',
    nuance: '앉아서 조는 모습에 자주 써요.', nuanceVi: 'Ngủ gật',
    usage: [{ label: '잠들기 전', text: '밥 먹다가 졸아요' }],
    examples: ['강아지가 꾸벅꾸벅 졸아요.', '밥 먹다가 꾸벅꾸벅 졸고 있네.'],
    similar: [{ text: '끄덕끄덕', feel: '‘네’ 하고 고개를 움직여요', when: '대답할 때' }],
    tip: '눈을 반쯤 감고 고개를 천천히 숙이며 “꾸벅꾸벅” 흉내 내 보세요.',
    image: img('kkubeok.png'),
  },
  gubul: {
    id: 'gubul', text: '구불구불', type: '의태어', motion: 'wave',
    meaning: '이리저리 여러 번 굽은 모양', vi: 'Quanh co, ngoằn ngoèo',
    nuance: '길이나 강이 곧지 않고 휘어진 모습에 써요.', nuanceVi: 'Uốn lượn nhiều lần',
    usage: [{ label: '산길', text: '고개를 넘는 길이에요' }],
    examples: ['구불구불한 산길을 걸어요.'],
    similar: [{ text: '꼬불꼬불', feel: '더 작고 촘촘하게 굽어요', when: '라면·머리카락' }],
    tip: '손가락으로 공중에 구불구불한 길을 함께 그려 보세요.',
    image: img('gubul.png'),
  },
  ggulkkeok: {
    id: 'ggulkkeok', text: '꿀꺽', type: '의성어', motion: 'gulp',
    meaning: '음식이나 침을 한꺼번에 삼키는 소리', vi: 'Ực (nuốt)',
    nuance: '한 번에 크게 삼킬 때 써요. 긴장해서 침을 삼킬 때도 써요.', nuanceVi: 'Nuốt một ngụm lớn',
    usage: [{ label: '옛이야기', text: '호랑이가 떡을 삼켜요' }],
    examples: ['호랑이가 떡을 꿀꺽 삼켰어요.', '물을 꿀꺽꿀꺽 마셔요.'],
    similar: [{ text: '홀짝', feel: '조금씩 마셔요', when: '뜨거운 음료' }],
    tip: '물을 마시며 목을 짚고 “꿀꺽” 소리를 함께 느껴 보세요.',
    image: img('ggulkkeok.jpg'),
  },
  eongeongOnui: {
    id: 'eongeongOnui', text: '엉엉', type: '의성어', motion: 'sob',
    meaning: '크게 소리 내어 우는 모양', vi: 'Hu hu (khóc)',
    nuance: '참지 못하고 소리 내어 크게 울 때 써요.', nuanceVi: 'Khóc to thành tiếng',
    usage: [{ label: '옛이야기', text: '오누이가 무서워서 울어요' }],
    examples: ['오누이가 엉엉 울었어요.'],
    similar: [{ text: '훌쩍훌쩍', feel: '작게 울어요', when: '조용히 울 때' }],
    tip: '우는 흉내를 낸 뒤 “괜찮아” 하고 토닥이며 마음을 이야기해 보세요.',
    image: img('eongeong_onui.jpg'),
  },
  adeung: {
    id: 'adeung', text: '아등바등', type: '의태어', motion: 'struggle',
    meaning: '무엇을 하려고 몹시 애쓰는 모양', vi: 'Cố gắng vật lộn',
    nuance: '힘든 일을 해내려고 온 힘을 다할 때 써요.', nuanceVi: 'Cố hết sức',
    usage: [{ label: '정리 시간', text: '무거운 상자를 옮겨요' }],
    examples: ['오누이가 바위를 아등바등 밀었어요.'],
    similar: [{ text: '끙끙', feel: '힘들어서 소리를 내요', when: '무거운 것을 들 때' }],
    tip: '무거운 걸 미는 흉내를 내며 “아등바등” 말해 보세요.',
    image: img('adeung.png'),
  },
  yeongcha: {
    id: 'yeongcha', text: '영차', type: '감탄사', motion: 'heave',
    meaning: '여럿이 힘을 모을 때 내는 소리', vi: 'Hò dô ta',
    nuance: '함께 힘을 줄 때 박자를 맞추며 외쳐요.', nuanceVi: 'Tiếng hô khi cùng dùng sức',
    usage: [{ label: '줄다리기', text: '다 같이 줄을 당겨요' }],
    examples: ['영차 영차, 다 같이 당겨요!'],
    similar: [{ text: '으쌰으쌰', feel: '힘을 내자는 응원', when: '함께 힘낼 때' }],
    tip: '아이와 손을 잡고 당기며 “영차!” 하고 박자를 맞춰 보세요.',
    image: img('yeongcha.jpg'),
  },
};

export interface Book {
  id: string;
  title: string;
  page: string; // 표지 옆 쪽수 표시 (단어 목록 디자인은 토끼의 당근 밭만 '· 4쪽'을 보여 줌, 빈 값이면 생략)
  cover: string;
  coverBg: string; // 표지 그림 뒤 바탕색 (동화책 고르기)
  coverAlt: string;
  wordIds: string[];
  scenes: Record<string, string>; // 단어 → 책 속 문장
}

export const BOOKS: Book[] = [
  {
    id: 'rabbit', title: '토끼의 당근 밭', page: '4쪽', cover: '/images/books/rabbit-carrot.svg', coverBg: '#5EC2B2',
    coverAlt: '토끼가 당근 밭에서 당근을 들고 있는 그림',
    wordIds: ['dugeun', 'pongdang', 'eongeong', 'banjjak', 'nuni'],
    scenes: { dugeun: '토끼는 당근을 보고 가슴이 두근두근했어요.' },
  },
  {
    id: 'bear', title: '곰곰이의 비 오는 날', page: '', cover: '/images/books/bear-rain.svg', coverBg: '#9CC9EC',
    coverAlt: '노란 우비를 입은 곰이 비 오는 날 웅덩이에 서 있는 그림',
    wordIds: ['cheombeong', 'pongdang', 'eonggeum', 'kkubeok'], scenes: {},
  },
  {
    id: 'toto', title: '토토의 밤 소풍', page: '', cover: '/images/books/toto-night.svg', coverBg: '#2B3A67',
    coverAlt: '달밤 언덕에서 토끼가 소풍을 즐기는 그림',
    wordIds: ['dugeun', 'kkang', 'salgeum', 'degul', 'banjjak'], scenes: {},
  },
  {
    id: 'sunmoon', title: '해와 달이 된 오누이', page: '', cover: '/images/books/sun-moon.svg', coverBg: '#F2B66B',
    coverAlt: '오누이가 동아줄을 타고 해와 달이 있는 하늘로 올라가는 그림',
    wordIds: ['gubul', 'ggulkkeok', 'salgeum', 'eongeongOnui', 'adeung', 'yeongcha'], scenes: {},
  },
];

export const bookById = (id?: string) => BOOKS.find((b) => b.id === id);
export const sceneFor = (word: Word, book?: Book) =>
  book?.scenes[word.id] ?? word.examples[0];
