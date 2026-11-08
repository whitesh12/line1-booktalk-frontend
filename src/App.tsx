import { Navigate, Route, Routes } from 'react-router-dom';
import { useProfile } from './store/profile';
import { Onboarding, Privacy, Splash } from './pages/Start';
import { Home, MyInfo } from './pages/Home';
import { BookList, Camera, Extracting, WordList } from './pages/Books';
import { WordDetail } from './pages/WordDetail';
import { PracticeFeedback, PracticeReview, PracticeWrite } from './pages/Practice';
import { TalkChat, TalkDone, TalkPrep } from './pages/Talk';

// 화면 ID ↔ 경로 (최종 디자인 캔버스 기준)
// A-1 /  · A-2 /onboarding · A-3 /privacy · B-1 /home · H-1 /me
// C-1 /books · C-2 /camera · C-3 /extracting · C-4 /books/:bookId
// D-1 /word/:wordId · E-1 /practice/:wordId · E-2 …/review · E-3·E-3-1·E-4 …/feedback
// F-1 /talk/:wordId · F-2·F-3·F-4·F-5 /talk/:wordId/chat · F-6 /talk/:wordId/done
export default function App() {
  const [profile, setProfile] = useProfile();
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding profile={profile} onSave={setProfile} />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/home" element={<Home profile={profile} />} />
        <Route path="/me" element={<MyInfo profile={profile} onSave={setProfile} />} />
        <Route path="/books" element={<BookList />} />
        <Route path="/books/:bookId" element={<WordList />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/extracting" element={<Extracting />} />
        <Route path="/word/:wordId" element={<WordDetail />} />
        <Route path="/practice/:wordId" element={<PracticeWrite />} />
        <Route path="/practice/:wordId/review" element={<PracticeReview profile={profile} />} />
        <Route path="/practice/:wordId/feedback" element={<PracticeFeedback />} />
        <Route path="/talk/:wordId" element={<TalkPrep profile={profile} />} />
        <Route path="/talk/:wordId/chat" element={<TalkChat profile={profile} />} />
        <Route path="/talk/:wordId/done" element={<TalkDone profile={profile} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
