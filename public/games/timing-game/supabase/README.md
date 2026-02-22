# 시간 맞추기 게임 - Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성.
2. SQL Editor에서 **순서대로** 실행:
   - `001_tables.sql` — 테이블 생성 및 Realtime 발행
   - `002_rls.sql` — RLS 활성화 및 정책
   - `003_timing_round_winner.sql` — timing_rounds에 winner_client_id 컬럼 추가 (이후 004에서 anon UPDATE 제거)
   - `004_remove_anon_update_rounds.sql` — 1등 기록은 Edge Function만 저장하도록 anon UPDATE 정책 제거
3. Edge Function 배포:
   - `start-round`: 라운드 시작 시 서버 시각 기준 start_at·target_seconds 삽입.
   - `get-server-time`: **common**에 있음. 카운트다운/시작 시각 동기화용. 한 번만 배포하면 됨.
   - `finish-timing-round`: 라운드 결과 확정 시 presses 기준 1등 계산 후 timing_rounds.winner_client_id 저장.
4. 프로젝트 설정 > API에서 Project URL, anon public key 복사 후 게임 `config.example.js`에 설정.

