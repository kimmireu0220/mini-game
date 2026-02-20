-- timing_rounds에 1등 기록 컬럼 추가 (승수 통일: 업다운 방식)
alter table public.timing_rounds add column if not exists winner_client_id text;

-- anon이 라운드 1등 기록만 업데이트 가능 (클라이언트에서 결과 확정 시 호출)
create policy "timing_rounds_update_anon" on public.timing_rounds
  for update to anon using (true) with check (true);
