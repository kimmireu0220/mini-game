# 게임 업로드

1. 게임을 **한 폴더**에 넣습니다 (예: `2048/index.html` + `2048/style.css`, `2048/game.js`, `2048/ui.js`).
2. `manifest.json`에 `file`(진입 HTML 경로), `title`, `slug`를 추가합니다.
3. 프로젝트 루트에서 실행: `python blog-deploy/upload_games.py`

업로드 시 HTML 안의 `<link rel="stylesheet" href="...">`, `<script src="...">`는 **같은 폴더의 파일**로 인라인되어 한 덩어리 HTML로 WordPress에 올라갑니다.

## manifest 예시

```json
[
  { "file": "2048/index.html", "title": "2048 게임", "slug": "2048-game" }
]
```

단일 HTML만 쓸 경우: `{ "file": "mygame.html", "title": "내 게임", "slug": "my-game" }`

## 게임 소개 포스트 (post-config.json)

블로그에 올리는 **게임 소개 포스트**의 제목·요약·플레이 방법은 각 게임 폴더 하위 `post-config.json`에서 관리합니다.  
예: `2048/post-config.json`, `timing-game/post-config.json`.  
`post_title`, `summary`, `steps`(문자열 배열)를 넣으면 `publish_game_posts.py` 실행 시 해당 내용으로 포스트가 발행됩니다.

포스트 본문에 들어가는 **스크린샷**은 같은 게임 폴더 하위 `screenshots/`에 둡니다.  
예: `2048/screenshots/01-start.png`, `02-play.png`.  
번호 순서대로 `post-config.json`의 `steps`와 매칭되며, `publish_game_posts.py`가 이 경로의 이미지를 미디어로 업로드해 포스트에 넣습니다.
