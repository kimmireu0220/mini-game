# 시간 맞추기 게임

정해진 목표 초(5~10초)가 되었을 때 버튼을 누르는 멀티플레이어 게임. 시작 신호 후 정확히 그 시점에 누른 사람이 이긴다.

## 규칙 요약

- **방**: 6자리 코드로 생성/입장. 호스트 나가면 방 삭제.
- **라운드**: 호스트가 "시작" → 4초 카운트다운 → 목표 초에 버튼 한 번 누르기. 가장 가까운 사람이 승자.
- **UI**: 닉네임 필수, 대기실/라운드에 승수(N승) 표시, 1~3등 메달·오차(초) 표시.

## 설정

1. Supabase 프로젝트 생성 후 [supabase/](supabase/) SQL **순서대로** 실행: `001_tables.sql`, `002_rls.sql`, `003_timing_round_winner.sql`, `004_remove_anon_update_rounds.sql`.
2. Edge Function 배포: `start-round`, `get-server-time`(common), **`finish-timing-round`**(라운드 결과 확정 시 1등 저장).
3. 프로젝트 루트 `.env`에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 설정.
4. `npm run dev` → http://localhost:5173/ 에서 게임 선택. 방 코드 입장 시 `?code=123456` 형태.
