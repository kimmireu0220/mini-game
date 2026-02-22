# 업다운 게임 - Supabase 설정

1. Supabase 프로젝트에서 SQL Editor로 **순서대로** 실행:
   - `001_tables.sql` — updown_rooms, updown_room_players, updown_rounds, updown_round_player_ranges + Realtime
   - `002_rls.sql` — RLS 활성화 및 정책
   - `003_add_winner_at.sql` — updown_rounds.winner_at 컬럼
   - `004_updown_round_correct.sql` — 정답 기록 테이블
   - `005_updown_start_at.sql` — updown_rounds.start_at (카운트다운 동기화)
   - `006_get_updown_round_result_rpc.sql` — 결과 조회 RPC
   - `007_updown_round_submissions.sql` — 제출 이력 테이블 (라운드 종료는 전원 정답 시에만)
   - `008_updown_range_1_to_50.sql` — 범위 1~50 제약 (이미 1~1 적용된 DB용)
2. Edge Function 배포:
   - `start-updown-round`: 호스트가 시작 시 정답(1~50) 생성, 전원 범위 초기화
   - `submit-updown-guess`: 숫자 제출 → 업/다운/정답 처리
3. 프로젝트 설정 > API에서 Project URL, anon key 복사 후 게임 `config.example.js`(또는 config.js)에 설정.

시간 맞추기와 같은 프로젝트를 쓰면 updown_* 테이블만 추가하면 됩니다.
