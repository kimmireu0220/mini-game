"""
게임 소개 포스트를 WordPress에 발행합니다.
각 게임 폴더 하위 screenshots/*.png(예: content/games/2048/screenshots/01-start.png)를 미디어로 업로드한 뒤
포스트 본문(요약 + 플레이 방법 + CTA)에 넣어 포스트를 생성합니다.

실행 (프로젝트 루트에서):
  python blog-deploy/publish_game_posts.py
"""

import glob
import html
import json
import os
import re
import sys

_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)

from config import load_dotenv
import paths

load_dotenv()

import config
import wordpress_client

MANIFEST_PATH = os.path.join(paths.GAMES_DIR, "manifest.json")


def _game_dir_from_file(file_path):
    """manifest의 file(예: '2048/index.html')에서 게임 디렉터리명 반환."""
    return file_path.split("/")[0] if file_path else ""


def _collect_screenshots(game_dir):
    """게임 폴더 하위 screenshots/*.png를 번호 순으로 정렬해 반환."""
    dir_path = os.path.join(paths.GAMES_DIR, game_dir, "screenshots")
    if not os.path.isdir(dir_path):
        return []
    files = glob.glob(os.path.join(dir_path, "*.png"))
    # 파일명 앞 숫자로 정렬 (예: 01-start.png, 02-play.png)
    def sort_key(path):
        base = os.path.basename(path)
        match = re.match(r"^(\d+)", base)
        return (match.group(1) if match else "99", path)

    files.sort(key=sort_key)
    return files


def _load_post_config_for_game(game_dir):
    """게임 폴더 하위 post-config.json 로드. { post_title, summary, steps }."""
    path = os.path.join(paths.GAMES_DIR, game_dir, "post-config.json")
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def _build_post_content(summary, image_urls_with_captions, game_url):
    """요약, (이미지 URL, 캡션) 목록, 게임 페이지 URL로 포스트 본문 HTML 생성."""
    parts = [f"<p>{html.escape(summary)}</p>"]
    if image_urls_with_captions:
        parts.append("<h3>플레이 방법</h3>")
        for i, (url, caption) in enumerate(image_urls_with_captions, 1):
            safe_cap = html.escape(caption)
            parts.append(
                f'<figure><img src="{html.escape(url)}" alt="{safe_cap}">'
                f"<figcaption>{i}. {safe_cap}</figcaption></figure>"
            )
    if game_url:
        parts.append(
            f'<p><a href="{html.escape(game_url)}" class="game-cta">'
            "지금 플레이하기</a></p>"
        )
    return "\n".join(parts)


def _publish_one(slug, title_from_manifest, post_config, category_id=None, game_dir=None):
    """한 게임에 대한 소개 포스트를 발행한다. 성공 시 True."""
    post_title = post_config.get("post_title") or (title_from_manifest + " 소개")
    summary = post_config.get("summary") or ""
    steps = post_config.get("steps") or []

    screenshot_paths = _collect_screenshots(game_dir) if game_dir else []
    image_urls_with_captions = []
    first_media_id = None

    for path in screenshot_paths:
        with open(path, "rb") as f:
            data = f.read()
        filename = os.path.basename(path)
        url, mid = wordpress_client.upload_media(data, filename, "image/png")
        if url:
            idx = len(image_urls_with_captions)
            caption = steps[idx] if idx < len(steps) else filename
            image_urls_with_captions.append((url, caption))
            if first_media_id is None:
                first_media_id = mid

    game_url = wordpress_client.get_page_link_by_slug(slug)
    if not game_url:
        game_url = config.WP_URL.rstrip("/") + "/" + slug + "/"

    content = _build_post_content(summary, image_urls_with_captions, game_url)
    kwargs = {"status": "publish", "featured_media": first_media_id}
    if category_id is not None:
        kwargs["categories"] = [category_id]
    post_url = wordpress_client.create_post(post_title, content, **kwargs)
    if post_url:
        print(f"   포스트 발행: {post_url}")
        return True
    return False


def main():
    """manifest의 게임별로 소개 포스트를 발행한다."""
    print("=" * 50)
    print("게임 소개 포스트 발행")
    print("=" * 50)

    if not wordpress_client.check_connection():
        return

    if not os.path.isfile(MANIFEST_PATH):
        print(f"manifest 없음: {MANIFEST_PATH}")
        return

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        games = json.load(f)
    if not isinstance(games, list):
        print("manifest는 배열이어야 합니다.")
        return

    category_id = wordpress_client.get_or_create_category("게임", "game")
    if category_id is not None:
        print(f"카테고리 '게임' 사용 (ID: {category_id})")
    else:
        print("⚠️ 카테고리 '게임' 조회/생성 실패 → Uncategorized로 발행됩니다.")

    success = 0
    for item in games:
        slug = item.get("slug")
        title_from_manifest = item.get("title") or ""
        game_dir = _game_dir_from_file(item.get("file") or "")
        if not slug:
            continue
        post_config = _load_post_config_for_game(game_dir) if game_dir else {}
        print(
            f"\n[{slug}] {post_config.get('post_title', title_from_manifest + ' 소개')}"
        )
        if _publish_one(slug, title_from_manifest, post_config, category_id, game_dir):
            success += 1

    print("\n" + "=" * 50)
    print(f"완료: {success}/{len(games)}개 포스트")
    print("=" * 50)


if __name__ == "__main__":
    main()
