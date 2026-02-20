# 숫자 레이스 (number-order) 구현 계획

README.md의 **구현 로직(상세)** 를 기준으로, 작업 순서와 산출물을 정리한 계획이다.

---

## Phase 0: 사전 확인

| # | 작업 | 산출물 | 비고 |
|---|------|--------|------|
| 0.1 | timing-game의 `get-server-time` Edge Function 재사용 여부 확인 | — | number-order는 동일 Supabase 프로젝트 가정 시 그대로 호출 가능 |
| 0.2 | `config.example.js` 복사 | `config.example.js` | timing-game/updown-game 것 복사 후 주석만 유지 |

---

## Phase 1: Supabase 백엔드

| # | 작업 | 산출물 | 의존 |
|---|------|--------|------|
| 1.1 | **001_tables.sql** 작성 | `supabase/001_tables.sql` | — |
| | | no_rooms (id, code, name, host_client_id, created_at, closed_at) | |
| | | no_room_players (id, room_id, client_id, nickname, joined_at), unique(room_id, client_id) | |
| | | no_rounds (id, room_id, start_at) | |
| | | no_round_results (id, round_id, client_id, duration_ms), unique(round_id, client_id) | |
| | | 인덱스 + Realtime publication (no_rooms, no_room_players, no_rounds) | |
| 1.2 | **002_rls.sql** 작성 | `supabase/002_rls.sql` | 1.1 |
| | | RLS 활성화, anon select/insert 정책 (방 단위)·service_role 정책 | timing-game/updown-game 패턴 참고 |
| 1.3 | **Edge Function: start-number-order-round** | `supabase/functions/start-number-order-round/index.ts` | 1.1 |
| | | POST { room_id, client_id } → 방 존재·미종료·호스트 검증 → no_rounds insert (start_at = now()+4초) | start-updown-round 참고 |
| | | 응답: { id, start_at } | |

**완료 조건**: Supabase에 001, 002 실행 후 Edge Function 배포. MCP 또는 CLI로 배포.

---

## Phase 2: 클라이언트 상태·설정

| # | 작업 | 산출물 | 의존 |
|---|------|--------|------|
| 2.1 | **state.js** | `state.js` | — |
| | | clientId, nickname, roomId, roomCode, roomName, isHost, hostClientId | updown-game/state.js 패턴 |
| | | currentRound { id, room_id, start_at }, nextExpected, tap1Time, tap16Time, durationMs, roundResultOrder | README §1 |
| | | 화면 키: screen-nickname, screen-create, screen-create-done, screen-join, screen-lobby, screen-round | |
| 2.2 | **config.example.js** | `config.example.js` | 0.2 |
| | | SUPABASE_URL, SUPABASE_ANON_KEY (placeholder) | |

---

## Phase 3: HTML·공통 리소스

| # | 작업 | 산출물 | 의존 |
|---|------|--------|------|
| 3.1 | **index.html** | `index.html` | — |
| | | game-common.css, countdown.css, rank-display.css, player-zone, countdown.js, game-shell.js, rank-display.js, player-zone.js | timing-game/index.html 참고 |
| | | config.example.js, state.js, app.js, Supabase CDN | |
| | | `<div id="app">` (game-shell 마운트 대상) | |
| 3.2 | **style.css** (최소) | `style.css` | — |
| | | 4×4 그리드·버튼 기본 스타일, 타이머 영역, 터치 영역 최소 44px | |

---

## Phase 4: 화면·라우팅

| # | 작업 | 산출물 | 의존 |
|---|------|--------|------|
| 4.1 | **screen-nickname** | app.js 내 | 2.1, 3.1 |
| | | 방 만들기 / 방 들어가기 버튼 → screen-create / screen-join | |
| 4.2 | **screen-create** | app.js 내 | 2.1 |
| | | 방 제목 입력 → no_rooms + no_room_players insert → screen-create-done | |
| 4.3 | **screen-create-done** | app.js 내 | 2.1 |
| | | "대기실로" → screen-lobby | |
| 4.4 | **screen-join** | app.js 내 | 2.1 |
| | | 6자리 코드 입력 → no_rooms 조회 후 no_room_players insert → screen-lobby | |
| 4.5 | **screen-lobby** | app.js 내 | 2.1, 1.x |
| | | player-zone으로 참가자 목록, 호스트만 "시작", "나가기" → 나가기 시 no_room_players delete 등 후 screen-nickname | |
| | | "시작" 클릭 시 start-number-order-round 호출 | |

---

## Phase 5: 라운드 시작·수신·카운트다운

| # | 작업 | 산출물 | 의존 |
|---|------|--------|------|
| 5.1 | **라운드 시작 (호스트)** | app.js | 4.5, 1.3 |
| | | "시작" → POST start-number-order-round(room_id, client_id) | |
| 5.2 | **no_rounds Realtime 구독** | app.js | 2.1, 1.1 |
| | | room_id 필터로 INSERT 감지 → currentRound 설정, screen-round 전환 | |
| 5.3 | **screen-round 진입 + 카운트다운** | app.js | 3.1, 공통 countdown.js |
| | | GameCountdown.run({ countFrom: 4, startAt, getServerTime, onComplete }) | |
| | | onComplete 시 nextExpected=1, tap1Time/tap16Time/durationMs null, 그리드 전부 표시·경과 타이머 시작 | |

---

## Phase 6: 그리드 플레이·제출

| # | 작업 | 산출물 | 의존 |
|---|------|--------|------|
| 6.1 | **4×4 그리드 렌더** | app.js | 5.3 |
| | | 1~16 버튼, data-value 또는 이벤트로 N 전달, 터치 영역 44px 이상 | |
| 6.2 | **클릭/터치 로직** | app.js | README §5 |
| | | N !== nextExpected → 무시 | |
| | | N === 1 → tap1Time = Date.now() | |
| | | N === 16 → tap16Time 저장, duration_ms 계산, no_round_results insert, 그리드 비활성·타이머 정지 | |
| | | 1 < N < 16 → nextExpected = N + 1 | |
| 6.3 | **30초 제한** | app.js | 6.2 |
| | | Go! 시점부터 30초 경과 시 그리드 비활성, 제출 안 함 | |

---

## Phase 7: 결과 표시·Realtime

| # | 작업 | 산출물 | 의존 |
|---|------|--------|------|
| 7.1 | **결과 수집 조건** | app.js | README §6 |
| | | (A) no_round_results count === no_room_players count 또는 (B) ROUND_RESULT_TIMEOUT_MS(35초) | |
| | | 폴링(예: 1초) 또는 Realtime no_round_results 구독 | |
| 7.2 | **결과 계산·정렬** | app.js | 7.1 |
| | | round_id로 no_round_results + no_room_players 조인, duration_ms 오름차순, roundResultOrder 저장 | |
| 7.3 | **결과 UI** | app.js | 7.2 |
| | | GameRankDisplay.applyRanks 또는 동일 형식, "12.34초" / "—" (미완료) | |
| 7.4 | **다시 하기 / 나가기** | app.js | 4.x |
| | | "다시 하기" → currentRound 정리, screen-lobby | |
| | | "나가기" → 방 퇴장 처리, screen-nickname | |
| 7.5 | **Realtime 정리** | app.js | 4.x, 5.2 |
| | | no_rooms (closed_at), no_room_players (입퇴장) 구독 | |

---

## Phase 8: 마무리

| # | 작업 | 산출물 | 비고 |
|---|------|--------|------|
| 8.1 | **아이콘** (선택) | `images/number-order-icon.png` | 없으면 surprise-box 유지 (GameCard 이미 number-order 처리됨) |
| 8.2 | **supabase/README.md** | `supabase/README.md` | SQL 실행 순서, Edge Function 배포 방법 |
| 8.3 | **E2E 점검** | — | 방 생성→입장→시작→1~16 터치→결과 확인, 나가기/다시 하기 |

---

## 의존성 요약

```
Phase 0 ─┬─ Phase 1 (SQL, RLS, Edge Function)
         └─ Phase 2 (state, config) ─┬─ Phase 3 (HTML, CSS)
                                     └─ Phase 4 (화면·라우팅) ─┬─ Phase 5 (라운드·카운트다운)
                                                              ├─ Phase 6 (그리드·제출)
                                                              └─ Phase 7 (결과·Realtime) ─ Phase 8
```

**권장 진행**: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.  
Phase 1 완료 후 Supabase에 적용·배포하고, 2~7을 app.js/state.js 중심으로 구현한 뒤 8에서 스타일·문서·테스트로 마무리.
