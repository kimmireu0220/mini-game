# 게임 HTML 업로드

1. 게임 HTML 파일을 이 폴더에 넣습니다 (예: `2048.html`).
2. `manifest.json`에 `file`, `title`, `slug`를 추가합니다.
3. 프로젝트 루트에서 실행: `python game-automation/upload_games.py`

manifest 예시:

```json
[
  { "file": "2048.html", "title": "2048 게임", "slug": "2048-game" }
]
```
