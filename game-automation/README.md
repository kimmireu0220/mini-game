# game-automation → 폴더 분리 안내

이 폴더의 스크립트는 역할별로 아래 두 폴더로 분리되었습니다.

| 폴더 | 용도 |
|------|------|
| **blog-deploy/** | WordPress 배포 (게임 페이지·포스트·정적 페이지 업로드, config, wordpress_client 등) |
| **screenshot-capture/** | Playwright 스크린샷 (timing-game 캡처, 블로그 포스트 QA 등) |

- **게임 배포**: `python blog-deploy/upload_games.py`
- **스크린샷 촬영**: `python screenshot-capture/capture_timing_game_screenshots.py`
