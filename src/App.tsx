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
        <Route path="/scan/analyzing" element={<ScanAnalyzingPage profile={profile} onSave={setProfile} />} />
        <Route path="/words/:wordId" element={<WordDetailPage />} />
        <Route path="/words/:wordId/practice" element={<PracticeWritePage />} />
        <Route path="/words/:wordId/practice/reviewing" element={<PracticeReviewingPage profile={profile} />} />
        <Route path="/words/:wordId/practice/feedback" element={<PracticeFeedbackPage />} />
        <Route path="/words/:wordId/talk" element={<TalkIntroPage profile={profile} />} />
        <Route path="/words/:wordId/talk/chat" element={<TalkChatPage profile={profile} />} />
        <Route path="/words/:wordId/talk/complete" element={<TalkCompletePage profile={profile} />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}
