# 로컬 Groq 대화 서버

Node.js 내장 HTTP/fetch만 사용하는 개발 서버입니다. PostgreSQL, 공지 데이터, 수집기, 검색/RAG 코드는 포함하지 않습니다.

- `GET /api/health`: 키 설정 여부, 모델 ID, `mode: groq-only`, `knowledgeConnected: false`. 키 값은 반환하지 않습니다.
- `POST /api/chat`: 교수 ID·학년/전공·최근 메시지를 검증하고 Groq에 요청합니다. 학교 근거가 필요한 질문은 미연결 안내를 반환합니다.
- 실제 키는 로컬 `.env`의 `GROQ_API_KEY`에 저장하고, 공유 `.env.example`은 빈 상태로 유지합니다.
- `npm test`는 모의 공급자와 로컬 HTTP 서버로 검증하며 외부 API 키를 사용하지 않습니다.

전체 실행 방법은 [학생 앱 안내](../../README.md)에 있습니다. 사용자 인증이 없으므로 인터넷에 공개 배포하는 서버로 사용하지 마세요.
