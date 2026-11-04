# 교수AI 모바일 앱

학생용 화면은 Expo SDK 57 / React Native / TypeScript로 구현되어 있습니다.

실행·팀원 설정·키 관리·지원 범위는 [학생 앱 안내](../../README.md)를 확인하세요. **API까지 함께 켜려면 `student-app` 폴더에서 `npm run dev`를 실행합니다.** 이 폴더에서 Expo만 실행하면 별도 API 서버가 필요합니다.

라우트는 `src/app/`, 화면은 `src/screens/`, 재사용 UI는 `src/components/`, 상태는 `src/state/`, 로컬 저장은 `src/storage/`에 있습니다. `src/catalog/catalog.json`은 공개 교수 명단 스냅샷입니다.
