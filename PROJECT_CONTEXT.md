# PROJECT_CONTEXT

새 채팅/새 기기에서 작업을 바로 이어가기 위한 인수인계 문서입니다.
최종 업데이트: 2026-02-11

## 1) 프로젝트 기본 정보
- 경로: `C:\Dev\capstone-fe`
- 스택: React 19 + Vite + TypeScript + React Router + TailwindCSS + Radix UI
- 지도: Leaflet + leaflet-gpx
- 테스트: Jest + React Testing Library
- 브랜치 전략: `develop` 기준, 이슈별 `feature/<번호>-<작업>` 브랜치

## 2) 개발 원칙
- 기존 기능 유지 최우선
- 변경 최소화(큰 리팩터/파일 대이동 금지)
- UI 문구 및 테스트 스냅샷 한국어 유지
- Swagger에 없는 API 임의 생성 금지
- TDD(테스트 먼저 작성) 준수

## 3) 로컬 환경(.env.local)
- `VITE_USE_MOCK_API=true`
- `VITE_DEV_BYPASS_AUTH=true`

참고:
- 현재는 백엔드 미연동 개발을 병행해서 mock 데이터/로직이 일부 존재함
- 실백엔드 연동 시 `VITE_USE_MOCK_API=false`로 전환 필요

## 4) Swagger 계약(확정)
- 문서: `https://kimkihyun0206.github.io/aetheria-swagger/#/`
- Running Art
- `GET /api/v1/running-arts/me`
- `GET /api/v1/running-arts/{runningArtId}`
- `PATCH /api/v1/running-arts/{runningArtId}`
- `DELETE /api/v1/running-arts/{runningArtId}`
- Geocode
- `GET /api/v1/geocode`
- Auth
- `DELETE /api/v1/auth/me` (회원탈퇴)

PATCH 스키마 확정:
- `UpdateRunningArtRequest`
- 필수 필드: `title`, `content`

## 5) 기능 개발 이력(브랜치 단위)

### feature/15 (Create/지도 보강, develop 반영 완료)
- 주소 입력/지도 클릭 기반 좌표 선택 흐름 보강
- 마커 표시 정확도 개선
- mock GPX를 출발/도착 좌표 기반으로 생성
- 관련 테스트 추가

### feature/17 (MyPage API 연동, develop 반영 완료)
- RunningArt 목록/상세/삭제/공유 토글 기본 흐름 연동
- 타입/서비스/훅 계층 정리
- 날짜/거리 fallback 처리 보강
- `my-page`, `share` 테스트 보강

### feature/21 (회원탈퇴, develop 반영 완료)
- MyPage에서 회원탈퇴 버튼/확인 UI 추가
- `DELETE /api/v1/auth/me` 연동
- 성공 시 인증 정리 + 홈 이동, 실패 시 한국어 토스트

### feature/23 (로그아웃 UI, develop 반영 완료)
- Home/MyPage에서 로그아웃 버튼 노출
- 기본은 로그인 상태 노출, 개발 편의 조건 반영
- 코드리뷰 피드백 반영(런타임/URL 처리 안정화 포함)

### feature/25 (삭제 위치 이동, develop 반영 완료)
- MyPage 목록에서 삭제 버튼 제거
- 상세 페이지(`MyPageDetail`)에서 삭제 수행으로 UX 변경
- 삭제 성공 시 `/mypage` 이동, 실패 시 오류 토스트
- 로컬 시연을 위한 dev 조건 보완 적용
- main 반영 시 dev 전용 완화 조건 정리 필요(TODO)

### feature/27 (상세 설명 편집, 로컬 develop 반영 완료)
- 상세 페이지에 설명 보기/수정/저장 기능 추가
- 저장 시 `PATCH /api/v1/running-arts/{id}` 호출 (`title`, `content`)
- 성공: 뷰 모드 전환 + 성공 토스트
- 실패: 편집 모드 유지 + 오류 토스트(롤백 없음)
- 코드리뷰 피드백 반영:
- 편집 시작/취소 시 중복 `setDraftContent` 제거

## 6) 현재 동작 핵심 정리
- 상세 페이지 삭제 버튼:
- 현재 소유자 기준/개발 시연 조건을 함께 고려한 상태
- 요구사항 최종 확정 후(실운영 기준) dev 완화 조건 재정리 필요
- 상세 페이지 설명 수정:
- textarea 인라인 편집 -> 저장 -> PATCH
- 실패 시 입력값 유지 정책 적용

## 7) 테스트 상태
- 최근 주요 테스트 통과:
- `src/__tests__/my-page.test.tsx`
- `src/__tests__/home-page.test.tsx`
- 상세 설명 편집 시나리오 포함:
- 수정 클릭 -> textarea 노출
- 저장 클릭 -> PATCH payload 검증
- 성공 -> 뷰 반영/토스트
- 실패 -> 편집 유지/토스트

## 8) Git 상태(중요)
- 현재 로컬 브랜치: `develop`
- 로컬 상태: `develop...origin/develop [ahead 3]`
- 최신 로컬 머지 커밋: `970c63d` (`feature/27-detail-description` -> `develop`)
- 즉, 로컬 `develop`에 원격 미반영 커밋이 남아있을 수 있음(푸시 확인 필요)

## 9) 다음 작업 후보
- Gallery 페이지 기능 완성(조회/상세/권한/오류 처리)
- 프로필 수정 API 연동(`GET/PATCH /api/v1/users/me`)
- Create 페이지 실백엔드 연동 기준 요청/응답 매핑 최종 점검
- mock 의존 로직 정리(실연동 브랜치에서 단계적으로 제거)

## 10) 새 채팅에서 바로 시작하는 방법
1. `PROJECT_CONTEXT.md`를 먼저 읽고 현재 상태 확인
2. `git status -sb`, `git log --oneline -n 10`으로 브랜치/동기화 확인
3. 작업 전 이슈 생성 -> feature 브랜치 생성
4. Swagger 확인 후 테스트 먼저 작성(TDD)
5. 구현 후 테스트/커밋/PR 템플릿 순서로 진행
