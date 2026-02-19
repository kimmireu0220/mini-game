# 업다운 게임 - Supabase 설정

1. Supabase 프로젝트에서 SQL Editor로 순서대로 실행:
   - `001_tables.sql` — updown_rooms, updown_room_players, updown_rounds, updown_round_player_ranges + Realtime
   - `002_rls.sql` — RLS 활성화 및 정책
2. Edge Function 배포:
   - `start-updown-round`: 호스트가 시작 시 정답(1~50) 생성, 전원 범위 초기화
   - `submit-updown-guess`: 숫자 제출 → 업/다운/정답 처리
3. 프로젝트 설정 > API에서 Project URL, anon key 복사 후 게임 `config.example.js`(또는 config.js)에 설정.

시간 맞추기와 같은 프로젝트를 쓰면 updown_* 테이블만 추가하면 됩니다.
