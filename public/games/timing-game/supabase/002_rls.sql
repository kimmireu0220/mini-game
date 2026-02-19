-- RLS 정책: 시간 맞추기 게임 (anon 클라이언트용 단순 정책)
-- 001_tables.sql 실행 후 실행하세요.

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.rounds enable row level security;
alter table public.round_presses enable row level security;

-- rooms: anon으로 생성/읽기/수정/삭제 (호스트 나가기 시 클라이언트에서 삭제 또는 closed_at 설정)
create policy "rooms_all_anon" on public.rooms for all to anon using (true) with check (true);

-- room_players: anon으로 읽기/삽입/삭제
create policy "room_players_all_anon" on public.room_players for all to anon using (true) with check (true);

-- rounds: anon은 읽기만. 삽입은 Edge Function(service_role)에서만.
create policy "rounds_select_anon" on public.rounds for select to anon using (true);
create policy "rounds_insert_service" on public.rounds for insert to service_role with check (true);

-- round_presses: anon으로 읽기/삽입
create policy "round_presses_all_anon" on public.round_presses for all to anon using (true) with check (true);
