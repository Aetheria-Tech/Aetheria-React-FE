# 프로젝트 진행사항 & 요청사항

이 문서는 노트북/새 세션에서 Codex가 맥락을 바로 이해하도록 하기 위한 요약입니다.
앞으로 작업할 때는 변경된 내용/결정사항을 이 파일에 추가해 주세요.

## 1) 프로젝트 정보
- 경로: `C:\Dev\capstone-fe`
- 스택: React 19 + Vite + TypeScript (SPA)
- 라우팅: React Router
- 스타일: TailwindCSS + Radix UI
- 지도: Leaflet + leaflet-gpx
- 테스트: Jest + React Testing Library
- UI 문구/테스트 스냅샷: 한국어 유지
- 정책: 기존 기능 유지 최우선, Swagger에 없는 API 임의 생성 금지

## 2) 브랜치/작업 흐름
- 기본 브랜치: `develop`
- 이슈별 브랜치 생성 → 작업 → PR → `develop` 머지
- 최근 작업 브랜치: `feature/15` (Create 페이지 개선) → develop 머지 완료
- 현재 진행 예정 브랜치: `feature/17` (MyPage 기능 완성)

## 3) 최근 완료 작업(요약)
### Create 페이지 & 지도 마커 개선(merge 완료)
- 주소 입력 변경 시 좌표 초기화/재조회로 마커 정확도 개선
- 지도 클릭으로 위치 선택(onMapClick) 지원
- “지도에 표시” 클릭 시 주소→좌표 해석
- 로컬 지오코딩/GPX 개발용 보강:
  - `src/mocks/geocode-map.ts` (로컬 데이터 + localStorage 저장)
  - `addressToCoords`: 백엔드 `/api/v1/geocode` 우선 → 실패 시 Kakao → mock
  - `art-service`의 mock GPX가 start/end 좌표 기반 동적 생성
- 좌표 유틸: `src/lib/coords.ts` (LatLng 정규화)
- Leaflet 타입 오류 해결: `@types/leaflet` 추가
- 테스트 보강: `src/__tests__/create-page.test.tsx`
- 백엔드 지오코딩 실패 시 `console.warn` 로그 추가

## 4) 환경 변수(로컬 개발)
`.env.local`
- `VITE_DEV_BYPASS_AUTH=true`
- `VITE_USE_MOCK_API=true`

## 5) Swagger 기반 API 계약(요약)
- Geocode: `GET /api/v1/geocode` (address → lat/lng)
- Running Art:
  - `GET /api/v1/running-arts/me`
  - `GET /api/v1/running-arts/{runningArtId}`
  - `PATCH /api/v1/running-arts/{runningArtId}`
  - `DELETE /api/v1/running-arts/{runningArtId}`
- Auth/Token: 기존 컨텍스트/인터셉터 유지
- Swagger에 없는 API는 프론트에서 임의 생성 금지

## 6) 현재 요청사항/작업 계획
### 6.1 MyPage 기능 완성 (feature/17)
- UI는 이미 있음 → 기능만 완성
- 구현 범위:
  - 목록 조회/상세 조회/삭제/공유 토글
  - 로딩/빈 상태/에러 토스트 처리
  - 테스트(TDD): 조회/삭제/토글/상세 시나리오

### 6.2 Gallery 페이지
- 공개 목록/상세 구현 필요
- API 스펙 확정 여부 확인 후 진행

### 6.3 백엔드 연동
- `VITE_API_BASE_URL`로 연동
- CORS/토큰 정책 합의 필요

## 7) 개발 시 주의사항
- 기존 UI/기능 최대한 유지
- 한국어 UI 문구 유지
- 작업 후 테스트 실행(관련 테스트 우선)
- 큰 리팩터는 별도 이슈/브랜치로 분리

## 8) Codex에 맥락 제공 방법
- 새 세션에서는 이 파일 내용을 먼저 알려주고 작업 시작
- 작업 완료 후 변경 사항을 이 파일에 반드시 업데이트

## 9) 최근 업데이트 (feature/17 진행 중)
- RunningArt 타입 정의 추가: `src/types/running-art.ts`
- void 응답 처리 헬퍼 추가: `src/types/api.ts` (unwrapVoidResponse)
- 러닝아트 API 서비스 함수 추가: `getMyRunningArts`, `getRunningArtDetail`, `deleteRunningArt`, `patchRunningArt`
- `useMyArts`/`useArtDetail` 러닝아트 연동 및 UI 어댑터 적용
- MyPage/MyPageDetail/Share/Gallery 날짜·거리 표시 fallback 처리
- 테스트 보강: `src/__tests__/my-page.test.tsx`, `src/__tests__/share.test.tsx`
