# screenshot-capture

Playwright로 스크린샷만 촬영. WordPress/배포 코드 없음.

- **capture_timing_game_screenshots.py** – timing-game 단계별 7장 → `content/games/timing-game/screenshots/`  
  로컬 서버 필요: `python3 -m http.server 8765`  
  `python screenshot-capture/capture_timing_game_screenshots.py` (프로젝트 루트에서)
- **check_blog_post.py** – 발행된 2048 포스트 페이지 한 장 스크린샷 (QA용). `blog-deploy`의 config 사용.
