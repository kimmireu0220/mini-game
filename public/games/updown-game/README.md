# 업다운

1~50 중 서버가 정한 숫자를 **먼저 맞추는** 실시간 레이스. 여러 명이 각자 기기에서 동시에 숫자를 제출하고, 업/다운/정답 피드백으로 범위를 줄여가며 정답을 찾는다.

## 규칙 요약

- **방**: 6자리 코드로 생성/입장.
- **라운드**: 호스트가 "시작" → 서버가 1~50 중 숫자 하나 정함. 전원 범위 1~50. 숫자 제출 시 업/다운/정답만 응답. **먼저 정답 제출한 사람이 1등.**
- **승수**: 게임 화면(플레이 중)에만 N승 표시. 대기실에서는 표시하지 않음.

## 설정

1. Supabase 프로젝트에서 SQL 순서대로 실행:
   - `supabase/001_tables.sql` — 테이블 + Realtime
   - `supabase/002_rls.sql` — RLS
2. **Edge Function 배포 (필수)**  
   "시작" 버튼이 동작하려면 반드시 배포해야 함.
   - Supabase 대시보드 → **Edge Functions** → **Deploy new function**
   - 함수 이름 `start-updown-round` → `supabase/functions/start-updown-round/index.ts` 내용 전체 복사 후 배포
   - 함수 이름 `submit-updown-guess` → `supabase/functions/submit-updown-guess/index.ts` 내용 전체 복사 후 배포
   - 또는 로컬에서 `supabase login` 후 `supabase functions deploy start-updown-round --project-ref <프로젝트ID>` 등으로 배포
3. 프로젝트 루트 `.env`의 SUPABASE_URL, SUPABASE_ANON_KEY를 게임에서 사용할 수 있도록 설정. (배포 시 `config.example.js` 치환.)

## 배포 시

- `config.example.js`를 `config.js`로 복사한 뒤 `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 넣거나, 빌드/배포 파이프라인에서 치환.
