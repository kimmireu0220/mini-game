-- timing_rounds에 1등 기록 컬럼 추가 (승수 통일: 업다운 방식)
alter table public.timing_rounds add column if not exists winner_client_id text;

-- anon 업데이트 정책(아래 정책)은 004_remove_anon_update_rounds.sql에서 제거됨. 최종적으로 1등 기록은 Edge Function(finish-timing-round)만 저장.
create policy "timing_rounds_update_anon" on public.timing_rounds
  for update to anon using (true) with check (true);
