# 아이랑 북이랑 · 웹 프론트엔드

서비스 '아이랑 북이랑'의 최종 디자인 캔버스를 그대로 옮긴 React 앱입니다.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ 생성
```

## 화면 · 파일 · 경로
코드에서는 디자인 번호 대신 화면이 하는 일로 이름을 붙였어요. 디자인 번호는 이 표에만 남겨 둡니다.
`/`로 들어오면 항상 `/onboarding`(기본 정보 입력)부터 시작해요. 저장된 프로필이 있으면 칸이 미리 채워져 있어요. (디자인의 A-1 시작 화면은 쓰지 않아요.)

| 디자인 | 화면 | 파일 (`src/pages/`) | 경로 | 뒤로 가면 |
|---|---|---|---|---|
| A-2 | 기본 정보 입력 | `onboarding/OnboardingPage.tsx` | `/onboarding` | (뒤로 없음) |
| A-3 | 개인정보 안내 (시작하기 전에) | `onboarding/PrivacyNoticePage.tsx` | `/onboarding/privacy` | 기본 정보 |
| B-1 | 홈 (탭) | `home/HomePage.tsx` | `/home` | (탭) |
| H-1 | 내 정보 및 설정 (탭) | `settings/SettingsPage.tsx` | `/settings` | (탭) |
| C-1 | 동화책 고르기 (탭) | `books/BookListPage.tsx` | `/books` | (탭) |
| C-4, C-4-2~4 | 단어 카드 목록 (책별) | `books/WordListPage.tsx` | `/books/:bookId` | 동화책 고르기 |
| C-2 | 촬영 | `scan/ScanPage.tsx` | `/scan` | 들어온 화면 (없으면 동화책 고르기) |
| C-3 | 표현 찾는 중 | `scan/ScanAnalyzingPage.tsx` | `/scan/analyzing` | (뒤로 없음) |
| D-1 | 단어 상세 | `word/WordDetailPage.tsx` | `/words/:wordId?book=` | 그 책의 단어 목록 |
| E-1 | 문장 작성 | `practice/PracticeWritePage.tsx` | `/words/:wordId/practice?book=` | 단어 상세 |
| E-2 | AI 검토 중 | `practice/PracticeReviewingPage.tsx` | `/words/:wordId/practice/reviewing?book=` | (뒤로 없음) |
| E-3 · E-3-1 · E-4 | AI 피드백 (다듬기 · 뜻 다시 보기 · 자연스러워요) | `practice/PracticeFeedbackPage.tsx` | `/words/:wordId/practice/feedback?book=` | 문장 작성 |
| F-1 | 대화 준비 | `talk/TalkIntroPage.tsx` | `/words/:wordId/talk?book=` | 단어 상세 |
| F-2 · F-3 · F-4 · F-5 | 대화 (대화 중 · 완료 · 응답 대기 · 대화 중 피드백) | `talk/TalkChatPage.tsx` | `/words/:wordId/talk/chat?book=` | '대화를 그만할까요?' 확인 후 대화 준비 |
| F-6 | 대화 마무리 | `talk/TalkCompletePage.tsx` | `/words/:wordId/talk/complete?book=` | (뒤로 없음) |

- 없는 주소는 `/home`으로 갑니다.
- `?book=`은 어느 책에서 왔는지예요. 단어 상세 → 문장 연습 → 대화 → 마무리까지 계속 넘기고, 마무리의 '목록으로'가 그 책의 단어 목록으로 갑니다.
- `practice/shared.tsx`, `talk/shared.ts`는 같은 기능의 화면들이 함께 쓰는 코드예요.

### 버튼과 뒤로가기 (`src/lib/nav.tsx`)
- 화면 속 뒤로 버튼과 브라우저·휴대폰 뒤로가기가 항상 같은 곳(위 표의 '뒤로 가면')으로 갑니다.
- 화면을 옮길 때는 `useGo()` / `<GoLink>`를 써요. 브라우저 기록을 '탭 화면 → … → 상위 화면 → 현재 화면' 순서로 맞춰 줍니다.
  - 가려는 화면이 기록에 있으면 그 자리까지 기록을 되감아요. 그래서 로딩 화면이나 촬영 화면은 뒤로가기로 다시 나오지 않아요.
  - 기록에 없으면 빠진 상위 화면을 채워 넣어요.
- 새 화면을 추가하면 `parentOf()`에 상위 화면을 한 줄 추가하면 됩니다.
- 홈에서 '이어서 학습하기'나 '최근 학습한 단어'로 들어간 화면은 뒤로 가면 홈으로 돌아와요.
- 하단 탭(홈 · 내 동화책 · 내 정보)은 기본 정보 입력 · 개인정보 안내를 뺀 모든 화면에 있어요. 대화 중에 탭을 누르면 '대화를 그만할까요?'를 먼저 물어봐요.

### 시연용 주소 (상태로만 보이는 화면)
| 화면 | 주소 |
|---|---|
| 표현 찾는 중 (머무름) | `/scan/analyzing?demo=hold` |
| AI 검토 중 (머무름) | `/words/dugeun/practice/reviewing?demo=waiting` |
| 피드백 · 다듬기 / 뜻 다시 보기 / 자연스러워요 | `/words/dugeun/practice/feedback?demo=polish` / `meaning` / `natural` |
| 대화 중 / 응답 대기 / 대화 중 피드백 / 대화 완료 | `/words/dugeun/talk/chat?demo=chat` / `waiting` / `feedback` / `done` |

## 그 밖의 구성
- `src/components/ui.tsx` 헤더, 하단 탭, 아이콘, `AnimWord`(단어 움직임), 태그
- `src/styles/global.css` 디자인 토큰과 공통 스타일, `src/styles/motion.css` 단어 움직임 14종, `src/styles/fonts.css` Pretendard
- `src/data/content.ts` 책 4권·표현 16개 시연 데이터 (이미지는 `public/images/`), `src/data/wordDetail.ts` 단어 상세 전용 문구
- `src/api/client.ts` 백엔드 연결 계층
- `src/store/profile.ts` 보호자·아이 프로필 (localStorage)

## 백엔드 연결
`.env.example`을 `.env`로 복사하고 `VITE_API_BASE_URL=/v1`로 바꾸면, `npm run dev`가 `/v1` 요청을 `localhost:8080`(docker-compose의 backend)으로 넘깁니다.
- 연결됨: 기본 정보 입력 → `POST /auth/guest`, `GET /children` → 있으면 `PATCH /children/{id}`, 없으면 `POST /children` (계정당 아이 5명 제한이 있어 재입력 시 새로 만들지 않음. 토큰 만료 시 `POST /auth/refresh` 후 1회 재시도)
- 연결됨: 촬영 → `POST /books/uploads` → `POST /books/pages/{pageId}/analysis-jobs` → `GET /analysis-jobs/{jobId}` 폴링 → `GET /books/pages/{pageId}/analysis`
  - 결과는 `/books/scan`(내가 찍은 그림책)에 표시되고 새로고침해도 남아 있어요. 내장 단어와 글자가 같으면 내장 카드를 그대로 써요.
  - 백엔드가 재시작되어(H2 메모리 DB) 계정이 사라졌으면 게스트 로그인·아이 등록을 다시 하고 재시도해요.
- 연결됨: 문장 첨삭 → `POST /children/{childId}/sentence-practices` (촬영·분석한 단어만. 내장 예시 단어는 서버에 없어서 모의 응답)
- 연결됨(사진으로 찾은 단어): 단어 상세 AI 설명 → `GET /vocabulary/{id}` (화면에 'AI 설명' 표시, 브라우저에 저장해 두고 다시 씀)
- 연결됨(사진으로 찾은 단어): 아이와 대화 → `POST /children/{childId}/conversation-sessions`, `POST /conversation-sessions/{id}/messages`, `POST .../complete`
  - 진행 중인 대화가 있으면 서버가 새 대화를 막아서(409), 시작한 대화를 기억해 두었다가 화면을 떠날 때·다음 시작 전에 끝내요.
  - AI 연결이 안 되면 연습용 대화(예시 대사)로 진행하고 안내 문구를 보여 줘요.
- 연결됨: 읽어 주기 → `POST /speech/synthesis` 후 음성 파일 재생 (빠르기는 재생 속도로 적용). 3.5초 안에 안 오면 브라우저 음성으로 대신하고, 다음엔 서버 음성으로 나와요.
- 아직 예시 데이터: 홈, 동화책 4권과 그 단어들(서버에 없는 단어라 대화·첨삭은 연습용), AI 근거 답변

명세서와 실제 백엔드 코드가 다른 부분은 코드 기준으로 맞췄어요: 관계는 `MOTHER|FATHER|GUARDIAN`, 언어는 `vi|zh-CN|en`, 문장 연습 `inputMethod`는 `KEYBOARD|SPEECH`.

비워 두면 모든 화면이 모의 응답으로 동작해서 백엔드 없이 시연할 수 있어요.

### 배포할 때 체크리스트
- 배포 빌드(`npm run build`)는 `.env.production`의 `VITE_API_BASE_URL=https://booktalk-be.onrender.com/v1`을 써요 (끝에 `/v1` 필수). 빌드할 때 들어가므로 바꾸면 다시 빌드해야 해요.
- 개발(`npm run dev`)은 `.env`가 없으면 예시 데이터로 동작해요. 실제 서버로 개발하려면 `.env`에 같은 주소를 넣고 5173 포트로 띄우세요 (백엔드 CORS가 localhost:5173 을 허용).
- 프론트가 https 면 백엔드도 https 여야 해요 (http 면 브라우저가 막아요).
- 백엔드 `application.yml`의 `app.cors.allowed-origins`에 프론트 배포 주소를 넣어야 해요 (끝에 `/` 없이, 예: `https://xxx.netlify.app`).
- `public/_redirects`(Netlify) 덕분에 `/books/scan` 같은 주소에서 새로고침해도 화면이 떠요.
- 앱을 열면 `/health`로 서버를 미리 깨워요. 요청 제한 시간은 120초(Render 무료 서버가 깨어나는 데 100초 넘게 걸리기도 함). AI가 깨어나는 중이라 분석이 실패하면 한 번 자동으로 다시 시도하고, 그래도 안 되면 '같은 사진으로 다시 시도' 버튼이 나와요, 기본 정보 입력은 서버가 느리면 8초 뒤 넘어가고 첫 촬영 때 등록을 마저 해요.
