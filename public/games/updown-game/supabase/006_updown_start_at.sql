-- 카운트다운 서버 동기화용: 라운드 시작 시각(입력 가능 시점)
alter table public.updown_rounds
  add column if not exists start_at timestamptz;

comment on column public.updown_rounds.start_at is '서버 기준 입력 가능 시점(카운트다운 종료 시각)';
