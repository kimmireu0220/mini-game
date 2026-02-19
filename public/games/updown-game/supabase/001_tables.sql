-- 업다운 게임: Supabase 테이블 (1~50 범위, 실시간 레이스)
-- Supabase 대시보드 SQL Editor에서 실행하세요.

-- updown_rooms: 방 (호스트 나가면 closed_at 설정 가능)
create table if not exists public.updown_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 6),
  name text not null,
  host_client_id text not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists idx_updown_rooms_code on public.updown_rooms(code);
create index if not exists idx_updown_rooms_closed_at on public.updown_rooms(closed_at) where closed_at is null;

-- updown_room_players: 방 참가자
create table if not exists public.updown_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.updown_rooms(id) on delete cascade,
  client_id text not null,
  nickname text not null,
  joined_at timestamptz not null default now(),
  unique(room_id, client_id)
);

create index if not exists idx_updown_room_players_room_id on public.updown_room_players(room_id);

-- updown_rounds: 라운드 (secret_number = 1~50, 서버만 알고 있음)
create table if not exists public.updown_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.updown_rooms(id) on delete cascade,
  secret_number int not null check (secret_number >= 1 and secret_number <= 50),
  status text not null default 'playing' check (status in ('playing', 'finished')),
  winner_client_id text,
  winner_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_updown_rounds_room_id on public.updown_rounds(room_id);
create index if not exists idx_updown_rounds_status on public.updown_rounds(room_id, status);

-- updown_round_player_ranges: 라운드별 플레이어 범위 (min, max)
create table if not exists public.updown_round_player_ranges (
  round_id uuid not null references public.updown_rounds(id) on delete cascade,
  client_id text not null,
  min int not null check (min >= 1 and min <= 50),
  max int not null check (max >= 1 and max <= 50),
  primary key (round_id, client_id),
  check (min <= max)
);

create index if not exists idx_updown_round_player_ranges_round_id on public.updown_round_player_ranges(round_id);

-- Realtime: 라운드 종료 시 전원에게 승자 전파
alter publication supabase_realtime add table public.updown_rounds;
