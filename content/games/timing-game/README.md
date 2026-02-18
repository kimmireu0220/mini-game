# 시간 맞추기 게임

정해진 시간(5~10초)을 예측해서 버튼을 누르는 멀티플레이어 게임.

## 설정

1. Supabase 프로젝트를 만들고 [supabase/](supabase/) 안의 SQL을 순서대로 실행하세요.
2. Edge Function `start-round`, `get-server-time`을 배포하세요. (`supabase/functions/start-round/`, `supabase/functions/get-server-time/`)
3. **Supabase 키**: 프로젝트 루트 `.env`에 아래를 넣으세요. 업로드 시 `config.example.js`의 플레이스홀더가 이 값으로 치환됩니다.
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```
4. 프로젝트 루트에서 `python blog-deploy/upload_games.py`로 업로드하면 블로그에 게임 페이지가 생성됩니다.

## 로컬 테스트

`content/games/timing-game/index.html`을 브라우저에서 직접 열거나, 로컬 서버로 제공한 뒤 `?code=123456` 형태로 방 코드를 넘겨 입장할 수 있습니다.
