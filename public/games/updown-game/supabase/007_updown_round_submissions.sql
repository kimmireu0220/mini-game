-- 라운드별 제출 이력 (라운드 종료 조건은 전원 정답 시에만)
create table if not exists public.updown_round_submissions (
  round_id uuid not null references public.updown_rounds(id) on delete cascade,
  client_id text not null,
  submitted_at timestamptz not null default now(),
  primary key (round_id, client_id)
);

create index if not exists idx_updown_round_submissions_round_id on public.updown_round_submissions(round_id);

comment on table public.updown_round_submissions is '라운드별 제출 이력. 라운드 종료는 전원 정답(updown_round_correct) 시에만.';

-- anon: 같은 방/라운드만 (RLS는 필요 시 추가)
alter table public.updown_round_submissions enable row level security;

create policy "allow select for round" on public.updown_round_submissions
  for select using (true);

create policy "allow insert for round" on public.updown_round_submissions
  for insert with check (true);
