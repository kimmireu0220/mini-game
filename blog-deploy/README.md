# blog-deploy

WordPress 블로그 배포용 스크립트. 게임 페이지·소개 포스트·정적 페이지 업로드.

- **upload_games.py** – `content/games/` HTML 인라인 후 WordPress 게임 페이지로 업로드  
  `python blog-deploy/upload_games.py` (프로젝트 루트에서)
- **publish_game_posts.py** – 게임별 screenshots + post-config → WordPress 포스트 발행
- **sync_pages.py** – `content/pages/` → WordPress 정적 페이지 동기화
- **wordpress_client.py** – WordPress REST API (페이지/미디어/포스트)
- **config.py** – .env, WP URL/계정
- **paths.py** – GAMES_DIR, CONTENT_PAGES_DIR
- **html_processor.py** – SEO/AdSense 후처리 (현재 미사용)
