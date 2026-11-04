# 확인된 제한 — 2026-11-04

- 단위·회귀 테스트 95개(실행기 4, API 34, 모바일 57), 타입 검사, 린트, iOS·Android·웹 JS/자산 번들 생성을 통과했습니다.
- 새 폴더에서 서버와 웹 화면 실행 및 `groq-only`, `knowledgeConnected: false` 상태를 확인했습니다.
- 실제 Groq 모델 목록에는 설정 모델이 있었지만, 이번 실제 답변 POST는 `403 Access denied. Please check your network settings.`로 거절됐습니다. 모의 응답 테스트와 실제 공급자 호출 성공은 다릅니다. 팀원 본인의 키·네트워크에서 기본 대화를 확인해야 합니다. 키를 공유하거나 코드에 넣지 마세요.
- 기존 lockfile의 npm audit 결과는 34개(높음 7, 보통 25, 낮음 2)입니다. Expo Router의 일부 해결책은 SDK 58 주요 버전 변경을 요구하므로 이번 앱 분리에서 강제 업그레이드하지 않았습니다. Expo CLI/Router 및 node-forge, query-string/decode-uri-component, Vite, Zod 등의 의존성 정리가 후속 과제입니다. 이 서버와 개발 도구를 공개 인터넷에 노출하지 마세요.
- Windows·Android 실제 기기 실행과 앱스토어용 IPA/APK 빌드는 이번 검증에 포함하지 않았습니다. iOS 시뮬레이터는 작업 Mac의 Xcode 이용약관 미동의로 실행하지 못했습니다.
- 학교 자료 검색, 서버 DB, 로그인, 기기 간 동기화는 포함하지 않습니다. 학사 질문 차단은 규칙 기반이므로 모든 표현을 완벽하게 인식하는 보장은 없습니다.
