# GitHub Pages

이 폴더는 GitHub Pages로 게임을 외부에 공개할 때 사용합니다.

## 빌드 방법

프로젝트 루트에서:

```bash
python blog-deploy/upload_games.py --github-pages
```

- `docs/games/` 아래에 인라인된 게임 HTML이 생성됩니다.
- **시간 맞추기** 게임은 Supabase가 필요하므로, 빌드 전에 `.env`에 `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 설정해 두세요.

## GitHub Pages 설정

1. GitHub 저장소 → **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` / **Folder**: `/docs`
4. Save 후 몇 분 뒤 적용됩니다.

## 게임 URL

- `https://<username>.github.io/game-test/games/2048-game.html`
- `https://<username>.github.io/game-test/games/timing-game.html`
