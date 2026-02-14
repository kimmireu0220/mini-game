"""
content/games/ 의 HTML 파일을 manifest.json 기준으로 WordPress 게임 페이지로 업로드합니다.
HTML 내 상대 경로 CSS/JS는 인라인한 뒤, 게임 HTML을 미디어로 업로드하고
페이지 본문에는 iframe src=미디어URL 만 넣습니다 (모든 브라우저에서 스크립트 실행).

실행 (프로젝트 루트에서):
  python game-automation/upload_games.py
"""

import html
import json
import os
import re
import sys

_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)

import paths
import wordpress_client

MANIFEST_PATH = os.path.join(paths.GAMES_DIR, "manifest.json")


def _inline_assets(html_content, html_path):
    """HTML 내 상대 경로 link/script를 같은 폴더 파일 내용으로 인라인한다."""
    base_dir = os.path.dirname(html_path)

    def replace_link(match):
        href = match.group(1).strip()
        if href.startswith("http") or href.startswith("//"):
            return match.group(0)
        file_path = os.path.join(base_dir, href)
        if not os.path.isfile(file_path):
            return match.group(0)
        with open(file_path, "r", encoding="utf-8") as f:
            return "<style>\n" + f.read() + "\n</style>"

    def replace_script(match):
        src = match.group(1).strip()
        if src.startswith("http") or src.startswith("//"):
            return match.group(0)
        file_path = os.path.join(base_dir, src)
        if not os.path.isfile(file_path):
            return match.group(0)
        with open(file_path, "r", encoding="utf-8") as f:
            return "<script>\n" + f.read() + "\n</script>"

    html_content = re.sub(
        r'<link\s+[^>]*rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)["\'][^>]*>',
        replace_link,
        html_content,
        flags=re.IGNORECASE,
    )
    html_content = re.sub(
        r'<script\s+src=["\']([^"\']+)["\'][^>]*>\s*</script>',
        replace_script,
        html_content,
        flags=re.IGNORECASE,
    )
    return html_content


def _wrap_in_iframe_srcdoc(full_html, title):
    """전체 HTML을 srcdoc으로 넣은 iframe (WP가 이스케이프하면 깨질 수 있음)."""
    escaped = html.escape(full_html, quote=True)
    title_attr = title.replace('"', "&quot;")
    return (
        '<div class="game-iframe-wrap" style="min-height:90vh;">'
        f'<iframe srcdoc="{escaped}" style="width:100%;height:90vh;min-height:480px;border:0;" '
        f'title="{title_attr}"></iframe></div>'
    )


def _wrap_in_iframe_src(game_url, title):
    """미디어 URL을 iframe src로 사용. 모든 브라우저에서 스크립트 정상 실행."""
    title_attr = title.replace('"', "&quot;")
    return (
        '<div class="game-iframe-wrap" style="min-height:90vh;">'
        f'<iframe src="{game_url}" style="width:100%;height:90vh;min-height:480px;border:0;" '
        f'title="{title_attr}"></iframe></div>'
    )


def main():
    """manifest.json에 등록된 게임 HTML을 WordPress에 업로드한다."""
    print("=" * 50)
    print("🎮 게임 업로드")
    print("=" * 50)

    if not wordpress_client.check_connection():
        return

    if not os.path.isfile(MANIFEST_PATH):
        print(f"⚠️  manifest 없음: {MANIFEST_PATH}")
        return

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        games = json.load(f)

    if not isinstance(games, list):
        print("⚠️  manifest는 배열이어야 합니다.")
        return

    success = 0
    for i, item in enumerate(games, 1):
        file_name = item.get("file")
        title = item.get("title")
        slug = item.get("slug")
        if not file_name or not title or not slug:
            print(f"⚠️  [{i}] file/title/slug 누락: {item}")
            continue

        path = os.path.join(paths.GAMES_DIR, file_name)
        if not os.path.isfile(path):
            print(f"⚠️  [{i}] 파일 없음: {path}")
            continue

        with open(path, "r", encoding="utf-8") as f:
            full_html = f.read()
        full_html = _inline_assets(full_html, path)

        # 1) 게임 HTML을 미디어로 업로드 → iframe src=URL (모든 브라우저에서 동작)
        # 2) 실패 시 srcdoc fallback
        full_bytes = full_html.encode("utf-8")
        game_url = wordpress_client.upload_game_html(slug, full_bytes)
        if game_url:
            content = _wrap_in_iframe_src(game_url, title)
            print("   미디어 URL → iframe src")
        else:
            content = _wrap_in_iframe_srcdoc(full_html, title)
            print("   srcdoc fallback")

        print(f"\n[{i}/{len(games)}] {title} (/{slug})")
        url = wordpress_client.publish_game_page(title, slug, content)
        if url:
            success += 1

    print("\n" + "=" * 50)
    print(f"✅ 완료: {success}/{len(games)}개")
    print("=" * 50)


if __name__ == "__main__":
    main()
