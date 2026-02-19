# 미니게임 모음집

React + TypeScript + Vite 기반. 로컬에서 게임 목록을 보고 선택하면 해당 게임으로 이동합니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 **http://localhost:5173/** → 게임 선택 → 해당 게임 페이지(iframe)로 이동.

## Supabase (시간 맞추기 게임)

`.env`에 다음을 넣으세요 (`.env.example` 참고).

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 게임 추가

1. `public/games/<slug>/` 에 게임 파일을 넣습니다.
2. `public/manifest.json` 에 `{ "file": "<slug>/index.html", "title": "제목", "slug": "<slug>" }` 를 추가합니다.

## 빌드

```bash
npm run build
```

`dist/` 에 정적 파일이 생성됩니다.

## 배포 (GitHub Pages)

`main` 브랜치에 푸시하면 GitHub Actions가 빌드 후 GitHub Pages에 배포합니다.

- **처음 한 번**: 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 설정하세요.
- **시간 맞추기 게임**이 배포된 사이트에서 동작하려면: **Settings → Secrets and variables → Actions** 에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 를 추가하세요. 추가 후 푸시하면 빌드 시 주입됩니다.
- 배포 후 주소: `https://<username>.github.io/mini-game/`
