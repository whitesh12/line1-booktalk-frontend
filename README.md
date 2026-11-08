# 아이랑 북토크 · 웹 프론트엔드

최종 디자인 캔버스(“아이랑 북토크 최종 디자인”)를 그대로 옮긴 React 앱입니다.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ 생성
```

## 구성
- `src/pages/` 화면. 화면 ID와 경로 대응은 `src/App.tsx` 맨 위 주석 참고
  - `Start.tsx` A-2 기본 정보 입력 · A-3 시작하기 전에 (첫 진입 `/`은 프로필 유무에 따라 A-2 또는 B-1)
  - `lib/nav.tsx` 버튼·뒤로가기 규칙 (화면 속 뒤로 버튼 = 브라우저 뒤로가기)
  - `Home.tsx` B-1 홈 · H-1 내 정보
  - `Books.tsx` C-1 동화책 고르기 · C-2 촬영 · C-3 표현 찾는 중 · C-4 단어 카드 목록(책 4권)
  - `WordDetail.tsx` D-1 단어 카드 상세
  - `Practice.tsx` E-1 문장 작성 · E-2 AI 검토 중 · E-3/E-3-1/E-4 AI 피드백
  - `Talk.tsx` F-1 대화 준비 · F-2~F-5 대화(응답 대기·중간 피드백·완료 포함) · F-6 마무리
- `src/components/ui.tsx` 헤더, 하단 탭, 아이콘, `AnimWord`(단어 움직임), 태그
- `src/styles/global.css` 디자인 토큰과 공통 스타일, `src/styles/motion.css` 단어 움직임 14종
- `src/data/content.ts` 책 4권·표현 16개 시연 데이터 (이미지는 `public/images/`)
- `src/api/client.ts` 백엔드 연결 계층

## 백엔드 연결
`.env.example`을 `.env`로 복사하고 `VITE_API_BASE_URL=/v1`로 바꾸면, `npm run dev`가 `/v1` 요청을 `localhost:8080`(docker-compose의 backend)으로 넘깁니다.
- 연결됨: 기본 정보 입력 → `POST /auth/guest`, `POST /children`
- 연결됨(백엔드 표현 id 필요): 문장 첨삭 → `POST /children/{childId}/sentence-practices`
- 아직 모의 응답: 페이지 분석(C-2·C-3), 대화(F-2), 음성(TTS는 브라우저 내장 음성 사용)
비워 두면 모든 화면이 모의 응답으로 동작해서 백엔드 없이 시연할 수 있어요.
