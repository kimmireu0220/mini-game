-- 라운드별 플레이어 정답 맞춘 시각 (전원이 정답을 맞춰야 라운드 종료)
create table if not exists public.updown_round_correct (
  round_id uuid not null references public.updown_rounds(id) on delete cascade,
  client_id text not null,
  correct_at timestamptz not null default now(),
  primary key (round_id, client_id)
);

create index if not exists idx_updown_round_correct_round_id on public.updown_round_correct(round_id);

alter table public.updown_round_correct enable row level security;
create policy "updown_round_correct_select_anon" on public.updown_round_correct for select to anon using (true);
create policy "updown_round_correct_insert_service" on public.updown_round_correct for insert to service_role with check (true);
