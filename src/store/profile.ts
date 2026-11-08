import { useEffect, useState } from 'react';

export type Relation = '엄마' | '아빠' | '보호자';
export type Lang = 'vi' | 'zh' | 'en';

export interface Profile {
  parentName: string;
  relation: Relation;
  childName: string;
  childAge: number;
  lang: Lang;
  speed: '0.8' | '1.0' | '1.2';
  childId?: string; // 백엔드 연결 시 POST /children 결과
  onboarded?: boolean;
}

const KEY = 'booktalk.profile';
// onboarded: A-2에서 직접 입력을 마쳤는지. 아니면 A-2 입력칸을 비워서 보여 준다(디자인).
// 그 전까지 다른 화면은 시연용 기본 프로필(유진·민준)을 쓴다.
export const DEFAULT_PROFILE: Profile = {
  parentName: '유진', relation: '엄마', childName: '민준', childAge: 4, lang: 'vi', speed: '1.0',
};

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* 저장 공간이 없어도 화면은 동작 */ }
}

export function useProfile(): [Profile, (p: Profile) => void] {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  useEffect(() => saveProfile(profile), [profile]);
  return [profile, setProfile];
}
