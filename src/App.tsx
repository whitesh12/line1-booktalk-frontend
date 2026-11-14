import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useProfile } from './store/profile';
import { recordEntry } from './lib/nav';
import { loadDemoVocab } from './api/ai';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { PrivacyNoticePage } from './pages/onboarding/PrivacyNoticePage';
import { HomePage } from './pages/home/HomePage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { BookListPage } from './pages/books/BookListPage';
import { WordListPage } from './pages/books/WordListPage';
import { ScanPage } from './pages/scan/ScanPage';
import { ScanAnalyzingPage } from './pages/scan/ScanAnalyzingPage';
import { ScanEmptyPage } from './pages/scan/ScanEmptyPage';
import { WordDetailPage } from './pages/word/WordDetailPage';
import { PracticeWritePage } from './pages/practice/PracticeWritePage';
import { PracticeReviewingPage } from './pages/practice/PracticeReviewingPage';
import { PracticeFeedbackPage } from './pages/practice/PracticeFeedbackPage';
import { TalkIntroPage } from './pages/talk/TalkIntroPage';
import { TalkChatPage } from './pages/talk/TalkChatPage';
import { TalkCompletePage } from './pages/talk/TalkCompletePage';

export default function App() {
  const [profile, setProfile] = useProfile();
  const loc = useLocation();
  useEffect(() => recordEntry(loc.pathname + loc.search), [loc]);
  // 로그인(아이 등록)이 되면 시연용 동화책 단어를 서버 단어와 연결한다 → 예시 책에서도 AI 기능 사용
  useEffect(() => { loadDemoVocab(); }, [profile.childId]);
  // 로그인 토큰이 나중에 저장돼도(온보딩 8초 초과 등) 시연용 단어 연결을 다시 시도
  useEffect(() => {
    const on = () => { loadDemoVocab(); };
    window.addEventListener('booktalk:auth', on);
    return () => window.removeEventListener('booktalk:auth', on);
  }, []);
  // 기본 정보를 입력하기 전에는 온보딩으로 (링크로 바로 들어오면 예시 프로필로 서버에 아이가 등록되던 문제).
  // 디자인 확인용 화면 미리보기(?demo=)는 그대로 보여 준다.
  const needOnboarding = !profile.onboarded && loc.pathname !== '/' && !loc.pathname.startsWith('/onboarding')
    && !new URLSearchParams(loc.search).has('demo');
  if (needOnboarding) return <div className="app"><Navigate to="/onboarding" replace /></div>;
  return (
    <div className="app">
      <Routes>
        {/* 기본 정보를 이미 입력했으면 홈, 처음이면 기본 정보 입력 */}
        <Route path="/" element={<Navigate to={profile.onboarded ? '/home' : '/onboarding'} replace />} />
        <Route path="/onboarding" element={<OnboardingPage profile={profile} onSave={setProfile} />} />
        <Route path="/onboarding/privacy" element={<PrivacyNoticePage />} />
        <Route path="/home" element={<HomePage profile={profile} />} />
        <Route path="/settings" element={<SettingsPage profile={profile} onSave={setProfile} />} />
        <Route path="/books" element={<BookListPage />} />
        <Route path="/books/:bookId" element={<WordListPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/scan/empty" element={<ScanEmptyPage />} />
        <Route path="/scan/analyzing" element={<ScanAnalyzingPage profile={profile} onSave={setProfile} />} />
        <Route path="/words/:wordId" element={<WordDetailPage />} />
        <Route path="/words/:wordId/practice" element={<PracticeWritePage />} />
        <Route path="/words/:wordId/practice/reviewing" element={<PracticeReviewingPage profile={profile} onSave={setProfile} />} />
        <Route path="/words/:wordId/practice/feedback" element={<PracticeFeedbackPage />} />
        <Route path="/words/:wordId/talk" element={<TalkIntroPage profile={profile} />} />
        <Route path="/words/:wordId/talk/chat" element={<TalkChatPage profile={profile} onSave={setProfile} />} />
        <Route path="/words/:wordId/talk/complete" element={<TalkCompletePage profile={profile} />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}
