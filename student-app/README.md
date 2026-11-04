# KIT 교수AI 학생 앱

팀원이 각자 Groq API 키로 실행하고 수정하는 **학생용 앱 개발 폴더**입니다. iOS·Android·웹은 Expo / React Native 코드를 공유합니다. 현재 서버는 기본 Groq 대화 전용이며 학사일정 PostgreSQL, 공지사항 수집·검수 자료, RAG, 검색 서비스는 포함하지 않습니다.

## 처음 실행 — macOS / Windows

Node.js **22.13 이상**을 설치하세요. 권장 버전은 `.nvmrc`의 22.23.2입니다.

```sh
git clone https://github.com/limkskr/ax-project.git
cd ax-project/student-app
npm run dev
```

첫 실행에 앱 패키지를 lockfile 기준으로 설치하고, `apps/api/.env`가 없으면 빈 템플릿을 복사합니다. 최초 설치에는 인터넷이 필요합니다. API 서버는 Node 내장 기능만 사용하므로 별도 DB·서버 패키지 설치가 필요하지 않습니다.

1. [Groq 콘솔](https://console.groq.com/keys)에서 **본인 키**를 발급합니다.
2. 로컬 편집기로 `apps/api/.env`를 열어 `GROQ_API_KEY=` 뒤에 본인 키를 저장합니다. 채팅이나 커밋에 붙여 넣지 않습니다.
3. `GROQ_MODEL=qwen/qwen3.8-27b`는 현재 테스트한 설정입니다. 모델 제공 여부·사용 한도는 본인 Groq 계정에서 확인하세요. 다른 모델은 요청 옵션 호환성도 확인해야 합니다.
4. 개발 터미널을 켜둔 채 [http://localhost:8081](http://localhost:8081)을 엽니다. 키 수정은 다음 요청부터 반영됩니다. 연결 표시는 키 존재 여부이며 실제 모델 요청 성공을 보장하지 않습니다.

UI만 확인할 때에는 키가 없어도 됩니다. 질문 전송에는 키가 필요합니다. 앱은 최근 최대 8개 메시지·합계 3,000자와 교수/전공 정보를 서버로 보내고, 현재 최대 512 출력 토큰의 답변을 한 번에 받습니다. 이름·학번 프로필 필드는 요청에 포함하지 않지만 사용자가 질문 본문에 직접 입력한 내용은 전송됩니다.

### 휴대폰과 에뮬레이터

- **iPhone/Android 실제 기기:** 프로젝트 SDK 57과 호환되는 Expo Go와 같은 네트워크를 사용합니다. `npm run dev`에 표시된 Expo QR/주소로 접속합니다. 웹 주소만 휴대폰에서 여는 것은 네이티브 앱 실행이 아닙니다.
- **iOS 시뮬레이터:** macOS에 호환 Xcode와 시뮬레이터가 필요합니다. 라이선스 동의는 직접 완료하세요. 개발 서버를 켜둔 상태에서 `npm --prefix apps/mobile run ios`를 실행합니다.
- **Android:** Android Studio 에뮬레이터를 켜고 `npm --prefix apps/mobile run android`를 실행합니다.
- 방화벽이 막으면 **신뢰하는 사설 네트워크에서만** 개발용 3001(API)·8081(Expo) 포트를 허용하세요. 이 서버는 로그인·사용자별 인증이 없는 로컬 개발용이므로 인터넷에 공개하지 않습니다.
- 별도 개발 서버를 사용할 때에만 `apps/mobile/.env.example`을 `.env`로 복사해 `EXPO_PUBLIC_API_URL`을 설정합니다. 모바일 환경변수에는 API 키를 넣지 않습니다.
- 이번 배포 검증은 macOS의 웹과 iOS·Android 번들 생성 기준이며, Windows와 실제 Android 기기 동작은 팀원 환경에서 확인해야 합니다.

## 화면과 현재 범위

- 기본정보: 이름·학번·학년·학부/전공 입력 및 수정.
- 최초 교수 선택: 학부/전공 필터, 이름 검색, 명예교수 포함.
- 대화창: 교수별 창과 이력, 전송 상태, 실패 재시도.
- 교수 추가 팝업: 이미 추가한 교수는 `추가됨 / 기존 대화로 돌아가기`.
- 답변 렌더링: 제목, 강조, 목록, 코드, 표, 링크, MathJax 수식.
- 자료가 없는 학교 일정·요건 질문: 공식 자료 미연결 안내. 일반 학습 질문은 Groq로 전달합니다. 분류는 규칙 기반으로 모든 자연어 표현을 완벽히 구분하지는 않습니다.

화면의 학사 안내 문구는 프로젝트 목적을 나타내며, 현재 학교 근거 검색이 연결되어 있다는 뜻이 아닙니다. 교수 명단은 2026-10-04 공식 공개 페이지 조사 스냅샷(264명)이고, 가상 교수AI는 실제 교수 본인·개인 의견을 대변하지 않습니다. 각 교수의 모델을 따로 학습하지 않고 같은 모델에 교수 이름·전공 문맥을 전달합니다.

## 폴더 구조

```text
student-app/
  apps/mobile/       Expo 앱: src/app 경로, screens, components, catalog, state
  apps/api/          Groq 중계 API: 키는 이 폴더의 로컬 .env에만 보관
  scripts/           두 개발 서버를 함께 실행하는 도구와 테스트
  README.md
```

프로필·대화는 휴대폰에서는 SQLite, 웹에서는 localStorage에 저장합니다. 이 로컬 저장 기능은 유지하며 서버 PostgreSQL은 사용하지 않습니다. 계정 로그인·기기 간 동기화·교수용 관리자 화면은 없습니다. 키와 대화 이력은 GitHub를 통해 공유하지 않습니다.

## 검증과 수정

```sh
npm test
npm run check
npm --prefix apps/mobile run export
```

`npm test`는 로컬 모의 Groq 응답을 사용하므로 API 키와 유료 요청이 필요하지 않습니다. export는 JS/자산 번들 생성이며 APK/IPA 설치 파일을 만드는 명령이 아닙니다.

팀 작업은 별도 브랜치에서 수정하고 PR로 공유하는 것을 권장합니다.

```sh
git switch -c feature/my-change
# 수정 후 위 테스트 실행
git status --short
git diff --cached --name-only
```

## 키 보호

- 실제 `apps/api/.env`는 각자 만들며 Git에서 제외됩니다. 공유 파일은 **키가 비어 있는 `.env.example`**뿐입니다.
- `git check-ignore -v apps/api/.env`로 제외 여부를 확인하세요. 이미 추적한 파일은 `.gitignore`만으로 보호되지 않습니다.
- 키를 `.env.example`, 소스, README, `EXPO_PUBLIC_*`, 스크린샷, ZIP에 넣지 마세요. `git add -f`로 `.env`를 강제 추가하지 마세요.
- 실제 키를 커밋했다면 즉시 Groq에서 폐기·재발급하세요. 최신 파일에서만 지워도 과거 커밋에는 남을 수 있습니다.
- DB 비밀번호, 수집 문서, 원본 첨부파일, 파싱/임베딩 결과, 검수 사이트, 로컬 모델은 이 폴더에 포함하지 않습니다.

현재 검증 결과와 알려진 제한은 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)를 참고하세요.
