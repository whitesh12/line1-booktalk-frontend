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
}

const KEY = 'booktalk.profile';
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
