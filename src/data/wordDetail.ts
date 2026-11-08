// 단어 상세 화면에만 있는 문구 (디자인 기준). 나중에 content.ts / 백엔드 응답으로 옮긴다.
import type { Word } from './content';

/* 최종 디자인의 단어 상세에만 있는 문구. content.ts에 필드가 생기면 그쪽으로 옮긴다. */
export interface GuideStep { title: string; items: { label?: string; text: string; boxed?: boolean }[] }
export const DETAIL: Record<string, { vi?: string; feel?: string; feelVi?: string; similarVi?: string[]; guide?: GuideStep[] }> = {
  dugeun: {
    vi: 'Tim đập thình thịch vì hồi hộp hoặc vui',
    feel: '보통 세기로 설레요', feelVi: 'hồi hộp vừa phải',
    similarVi: ['nhẹ, đáng yêu', 'mạnh'],
    guide: [
      { title: '말풍선처럼 넓혀서 말해요', items: [
        { label: '아이가 “토끼!”라고 하면', text: '“응, 토끼가 두근두근해 하네!”', boxed: true },
        { label: '조금 더 자라면 이렇게 넓혀요', text: '“토끼가 당근을 보고 가슴이 콩닥콩닥, 두근두근 뛰네!”', boxed: true },
      ] },
      { title: '몸으로 느껴봐요', items: [
        { text: '아이 손을 가슴에 대고 심장 뛰는 걸 함께 느끼며 “이게 바로 두근두근이야!”' },
        { label: '또는', text: '제자리에서 콩콩 뛰어 심장을 빨리 뛰게 한 뒤 “지금 마음이 두근두근하지?”' },
      ] },
      { title: '상황이 생길 때마다 말해줘요', items: [
        { label: '선물 열기 전', text: '“선물 열기 전엔 마음이 두근두근하지!”' },
        { label: '소풍 가기 전날 밤', text: '“내일 소풍 생각하니 두근두근하다~”' },
      ] },
    ],
  },
};

/** 디자인 기준 베트남어 뜻 (뜻 다시 보기 피드백에서도 같이 씀) */
export const wordVi = (w: Word) => DETAIL[w.id]?.vi ?? w.vi;

export const guideFor = (w: Word): GuideStep[] => DETAIL[w.id]?.guide ?? [
  { title: '몸으로 느껴봐요', items: [{ text: w.tip }] },
  { title: '상황이 생길 때마다 말해줘요', items: w.examples.map((e) => ({ text: `“${e}”` })) },
];
