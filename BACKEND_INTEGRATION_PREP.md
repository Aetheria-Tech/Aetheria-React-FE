# 백엔드 연동 전 사전 준비 체크리스트

## 0) 현재 준비 상태 요약
- [x] 프론트 API 기본 URL 연결 완료 (`VITE_API_BASE_URL=http://localhost:8080`)
- [x] 프론트 mock/bypass 비활성화 완료 (`VITE_USE_MOCK_API=false`, `VITE_DEV_BYPASS_AUTH=false`)
- [x] 백엔드 CORS env 파일 반영 완료 (`sever/.env`)
- [x] 프론트 테스트 전체 통과 (`10 suites / 47 tests`)

## 1) 프론트 설정 (`C:\Dev\capstone-fe\.env.local`)
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_USE_MOCK_API=false
VITE_DEV_BYPASS_AUTH=false
# 선택: Google 로그인 진입 URL 강제 지정 시에만 사용
# VITE_GOOGLE_LOGIN_URL=
```

## 2) 백엔드 설정 (`C:\Dev\capstone-fe\sever\.env`)

### 2-1. 이미 준비된 항목
- [x] `FRONTEND_DOMAIN=http://localhost:5173`
- [x] `DEVELOP_SERVER_DOMAIN=http://localhost:8080`
- [x] `JWT_REFRESH_TOKEN_COOKIE=refresh_token`
- [x] `REDIS_HOST=localhost`
- [x] `REDIS_PORT=6379`
- [x] `KAKAO_REDIRECT_URI=http://localhost:8080/api/v1/auth/callback/kakao`

### 2-2. 백엔드 담당자가 채워야 하는 필수 값
- [ ] `DATABASE_URL`
- [ ] `DATABASE_USERNAME`
- [ ] `DATABASE_PASSWORD`
- [ ] `JWT_SECRET`
- [ ] `KAKAO_CLIENT_ID`
- [ ] `KAKAO_ADMIN_KEY`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `ADDRESS_VERIFICATION_URL`
- [ ] `ADDRESS_VERIFICATION_KEY`
- [ ] `ENCRYPTION_ALGORITHM`
- [ ] `ENCRYPTION_SECRET_KEY_V1`
- [ ] `ENCRYPTION_SECRET_KEY_V2`
- [ ] `ENCRYPTION_SECRET_KEY_V3`

## 3) 실행 순서 (연동 테스트 당일)
1. 백엔드 실행
   - `cd C:\Dev\capstone-fe\sever`
   - `gradlew.bat bootRun`
2. 프론트 실행
   - `cd C:\Dev\capstone-fe`
   - `npm run dev`

## 4) 첫 연동 체크 포인트
- [ ] 로그인 버튼 클릭 시 `http://localhost:8080/api/v1/auth/login/{provider}`로 이동
- [ ] 브라우저 Network에서 `localhost:5173 -> localhost:8080` 요청 확인
- [ ] CORS 오류 없음 (`Access-Control-Allow-Origin`)
- [ ] 백엔드 로그에 `/api/v1/auth/login/*`, `/api/v1/auth/reissue`, `/api/v1/auth/logout` 도달

## 5) 404가 나는 대표 원인 (사전 확인)
- `VITE_API_BASE_URL`이 비어 있으면 로그인 URL이 상대경로(`/api/v1/...`)로 만들어져서
  프론트 서버(`localhost:5173`)로 요청되어 404가 발생함
- 프론트/백엔드 서버 둘 중 하나라도 실행되지 않으면 OAuth 진입 실패

## 6) Swagger/백엔드 기준 확정 필요 항목
- [ ] Create 생성 API endpoint/DTO
- [ ] Gallery 공개 목록 API
- [ ] Share 공개/비공개 토글 API
- [ ] OAuth callback 이후 FE 복귀 URL/방식
