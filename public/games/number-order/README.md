# 숫자 레이스 (number-order)

각자 자기 폰에서 **1부터 16까지 숫자를 순서대로 빠르게 터치**하고, **걸린 시간이 짧은 사람**이 이기는 멀티플레이어 게임.

---

## 규칙 요약

- **방**: 6자리 코드로 생성/입장. (timing-game / updown-game과 동일한 방 패턴)
- **라운드**: 호스트가 "시작" → 4초 후 **Go!**(화면에는 3·2·1 카운트다운만 표시) → **Go!** 시점부터 각자 **1 → 2 → … → 16** 순서대로 터치.
- **순서**: 다음에 눌러야 할 숫자만 유효. 잘못된 숫자 터치 시 무시(반응 없음).
- **종료**: 16을 터치한 시점에 **소요 시간(ms)** 을 서버에 제출. 제한 시간(예: 30초) 내 완료 못 하면 실패(기록 없음 또는 null 처리).
- **순위**: 라운드 종료 후 **소요 시간 오름차순**으로 1등·2등·3등 표시.

---

## 구현 로직 (상세)

아래 순서와 조건대로 구현한다. 이 로직이 **단일 소스 오브 트루스**이다.

### 1. 클라이언트 상태 (state)

| 필드 | 타입 | 의미 |
|------|------|------|
| `clientId` | string | 디바이스별 고유 ID (localStorage 등, game-shell/기존 게임과 동일) |
| `nickname` | string | 홈에서 설정한 닉네임 |
| `roomId` | uuid \| null | 현재 방 ID |
| `roomCode` | string | 6자리 방 코드 |
| `roomName` | string | 방 제목 |
| `isHost` | boolean | 호스트 여부 |
| `hostClientId` | string | 호스트의 client_id |
| `currentRound` | { id, room_id, start_at } \| null | 현재 라운드 (no_rounds 행) |
| `nextExpected` | number | 그리드에서 다음에 눌러야 할 숫자 (1~17, 17=완료) |
| `durationMs` | number \| null | 제출한 소요 시간 (Go! 시점 ~ 16터치, 서버 시각 기준) |
| `goTimeServerMs` | number \| null | Go! 시점의 서버 시각(ms). duration 계산 기준 |
| `serverOffsetMs` | number | 클라이언트 시계와 서버 시계 차이 |
| `roundResultOrder` | Array<{ client_id, nickname, duration_ms }> | 결과 화면용 정렬된 목록 |

### 2. 화면 전환 규칙

- **screen-nickname**: 최초 진입. 방 만들기 / 방 들어가기 선택.
- **screen-create**: 방 제목 입력 후 "방 만들기" → API 성공 시 **screen-create-done**.
- **screen-create-done**: "대기실로" → **screen-lobby**.
- **screen-join**: 방 코드 입력 후 "입장" → 성공 시 **screen-lobby**.
- **screen-lobby**: 참가자 목록 표시. 호스트만 "시작" 버튼 표시. "시작" 클릭 시 **라운드 시작 로직(3)** 실행. "나가기" 시 방 퇴장 후 **screen-nickname**.
- **screen-round**: 카운트다운(3·2·1) → Go! → 1~16 그리드 플레이. **결과 표시 조건(6)** 충족 시 결과 영역 표시. "다시 하기"는 **방장만** 표시되며, 방장이 누르면 로비 없이 **바로 새 라운드**(3·2·1 → Go!) 시작. "나가기" → **screen-nickname**.

### 3. 라운드 시작 로직 (호스트만)

1. 호스트가 "시작" 버튼 클릭.
2. **Edge Function** `start-number-order-round` 호출.  
   - Body: `{ room_id, client_id }`.  
   - 검증: 해당 방 존재·미종료, `host_client_id === client_id`.
3. Edge Function 내부 동작:
   - `no_rounds`에 **한 행** insert.  
     - `room_id`: 인자 그대로.  
     - `start_at`: **서버 시각 기준 now() + 4초** (ISO 문자열).  
   - Realtime으로 `no_rounds` 변경이 모든 구독 클라이언트에 전파됨.
4. 호스트 측: Edge Function 성공 후 **폴링 또는 Realtime**으로 `no_rounds`에 새 행이 생긴 것을 감지. (timing-game과 동일하게 Realtime 구독 + 폴링 폴백 권장.)

### 4. 라운드 수신 후 클라이언트 동작 (전원 공통)

1. **no_rounds**에 새 행 INSERT 발생 감지 (현재 방의 최신 라운드 1건).
2. `state.currentRound = { id, room_id, start_at }` 저장.
3. **screen-round**로 전환. 그리드 영역은 비활성(숫자 비활성 또는 가림).
4. **카운트다운 실행**  
   - `GameCountdown.run({ countFrom: 4, displayFrom: 3, startAt: new Date(round.start_at).getTime(), getServerTime, onComplete })`  
   - 총 4초 후 Go! 이며, 화면에는 3·2·1만 표시(4는 안 보임). `getServerTime`으로 서버 시각 동기화.
5. **onComplete** 시점에:
   - `state.nextExpected = 1`, `state.durationMs = null`
   - getServerTime으로 `goTimeServerMs`, `serverOffsetMs` 저장
   - 1~16 그리드 **전부** 활성화. 순서대로만 유효 입력. (경과 시간 DOM 표시 없음)
   - 30초 후 그리드 자동 비활성화. 결과는 전원 제출 또는 35초 후 폴링으로 표시.

### 5. 그리드 입력 로직 (1~16 순서 터치)

- 그리드는 **4×4** 버튼(1~16). 각 버튼의 `data-value` 또는 이벤트에서 `N`(1~16) 사용.
- **클릭/터치 시**:
  1. `N !== state.nextExpected` 이면 **무시** (반응 없음).
  2. `N === state.nextExpected` 인 경우만 처리:
     - **N === 16** 이면:  
       - `duration_ms = 서버 시각(now) - goTimeServerMs` (getServerTime으로 보정 후 no_round_results에 제출)  
       - **no_round_results**에 upsert: `{ round_id, client_id, duration_ms }`  
       - 그리드 **전체 비활성화**. 화면에 "완료! 다른 플레이어 대기 중.." 표시.
     - **N < 16** 이면: `state.nextExpected = N + 1` 로 갱신. 누른 칸은 시각적으로 표시(number-order-pressed).
- **제한 시간**: Go! 시점부터 **30초** 경과 시 자동으로 그리드 비활성화. 이 경우 **제출하지 않음** (해당 플레이어는 결과에 "완료 못 함" 또는 제외).

### 6. 결과 표시 조건 및 결과 화면

- **결과를 보여줄 시점** (아래 둘 중 **먼저** 도달하는 시점):
  - **(A)** 현재 라운드에 대해 **no_round_results**의 행 수가 **현재 방 참가자 수**와 같음.  
    - 구현: 주기적 폴링(예: 1초)으로 `no_round_results` count + `no_room_players` count 비교.
  - **(B)** Go! 시점부터 **ROUND_RESULT_TIMEOUT_MS**(예: 35초) 경과.  
    - 남은 사람은 "완료 못 함"으로 처리.
- **결과 계산**:
  - `no_round_results`에서 해당 `round_id`로 `client_id`, `duration_ms` 조회.
  - `no_room_players`와 조인해 nickname 매핑.
  - **duration_ms 오름차순** 정렬. null/미제출은 맨 뒤.
  - `state.roundResultOrder = [ { client_id, nickname, duration_ms }, ... ]` 저장.
- **결과 UI**:  
  - `GameRankDisplay.applyRanks` 또는 동일 형식으로 1등·2등·3등·… 표시.  
  - duration_ms는 초 단위로 변환해 "12.34초" 등으로 표시. 미완료는 "—" 또는 "완료 못 함".
- 결과 화면 버튼:
  - **"다시 하기"**: **방장에게만** 표시. 방장이 누르면 로비로 가지 않고 **바로 새 라운드 API 호출** → 3·2·1 카운트다운 후 게임 시작.
  - **"나가기"**: 방 나가기 처리 후 **screen-nickname**.

### 7. Realtime 구독

- **no_rooms**: 현재 방의 closed_at 변경 감지 → 방 종료 시 대기실/나가기 처리.
- **no_room_players**: 참가자 입퇴장 시 대기실 목록 갱신.
- **no_rounds**: INSERT 감지 → **4. 라운드 수신 후 클라이언트 동작** 실행.  
  - 같은 방의 기존 라운드와 id가 같으면 무시(중복 처리 방지).

### 8. 방 생성 / 입장 / 나가기

- **방 생성**:  
  - 6자리 숫자 코드 랜덤 생성(중복 시 재시도).  
  - `no_rooms` insert (code, name, host_client_id).  
  - `no_room_players` insert (room_id, client_id, nickname).  
  - state에 roomId, roomCode, roomName, isHost=true, hostClientId 저장.
- **입장**:  
  - code로 `no_rooms` 조회 → 존재·미종료 시 `no_room_players` insert (이미 있으면 재입장으로 대기실만 표시).  
  - state에 roomId, roomCode, roomName, isHost=(host_client_id === clientId), hostClientId 저장.
- **나가기**:  
  - `no_room_players`에서 해당 (room_id, client_id) 삭제.  
  - 호스트가 나가면 방 종료(no_rooms.closed_at 갱신 또는 방 삭제 정책에 따름).  
  - state 초기화 후 screen-nickname.

---

## 데이터 설계 (Supabase)

### 테이블 (접두어 no_)

- **no_rooms**  
  - `id` (uuid, PK), `code` (text, unique, 6자리), `name` (text), `host_client_id` (text), `created_at`, `closed_at` (timestamptz, nullable).
- **no_room_players**  
  - `id` (uuid, PK), `room_id` (FK no_rooms), `client_id` (text), `nickname` (text), `joined_at`.  
  - unique(room_id, client_id).
- **no_rounds**  
  - `id` (uuid, PK), `room_id` (FK no_rooms), `start_at` (timestamptz).  
  - start_at = Go! 시점(서버 now()+4초).
- **no_round_results**  
  - `id` (uuid, PK), `round_id` (FK no_rounds), `client_id` (text), `duration_ms` (int).  
  - unique(round_id, client_id). 16 터치 시 한 번만 insert.

Realtime: `no_rooms`, `no_room_players`, `no_rounds` publication에 추가.  
RLS: timing-game과 동일하게 방 단위로 select/insert 제한.

### Edge Function: start-number-order-round

- **입력**: POST body `{ room_id, client_id }`.
- **처리**:  
  - no_rooms에서 room_id 조회, closed_at null, host_client_id === client_id 확인.  
  - no_rounds insert: room_id, start_at = now() + 4초 (ISO).
- **출력**: 생성된 round `{ id, start_at }` 또는 에러 메시지.

---

## UI 요구사항

- 숫자 그리드: 1~16을 4×4 카드(버튼)로 배치. 터치 영역 넉넉히(최소 44px). **다음에 누를 카드는 강조하지 않음** — 전부 동일하게 표시하고, 순서대로만 유효 입력.
- 타이머: Go! 이후 경과 시간 표시. 16 터치 시 정지.
- 공통: `.screen-form-label`, `.screen-field`, `.button-row`, `../common/game-common.css` 및 game-shell 마크업 준수.
- 대기실/결과: `../common/player-zone.js`, `../common/rank-display.js` 재사용 권장.

---

## 파일 구조

```
public/games/number-order/
├── README.md
├── index.html
├── style.css
├── state.js
├── app.js
├── config.example.js
└── supabase/
    ├── 001_tables.sql
    ├── 002_rls.sql
    └── functions/
        └── start-number-order-round/
            └── index.ts
```

공통: `../common/game-common.css`, `../common/countdown.js`, `../common/game-shell.js`, `../common/player-zone.js`, `../common/rank-display.js`.  
서버 시각 동기화용 getServerTime은 timing-game의 get-server-time Edge Function 재사용 또는 동일 방식.

---

## 설정

1. Supabase에서 001_tables.sql, 002_rls.sql 순서 실행.
2. Edge Function `start-number-order-round` 배포.
3. config.example.js → config.js에 SUPABASE_URL, SUPABASE_ANON_KEY 설정.

---

이 문서의 **구현 로직(상세)** 에 따라 state, 화면 전환, 라운드 시작·수신·그리드 입력·결과 표시·Realtime·방 생성/입장/나가기를 구현하면 된다.
