-- 1등 기록은 Edge Function(finish-no-round)만 저장. anon UPDATE 제거.
drop policy if exists "no_rounds_update_anon" on public.no_rounds;
