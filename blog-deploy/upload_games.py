"""
content/games/ 의 HTML 파일을 manifest.json 기준으로 WordPress 게임 페이지로 업로드합니다.
HTML 내 상대 경로 CSS/JS는 인라인한 뒤, 게임 HTML을 미디어로 업로드하고
페이지 본문에는 iframe src=미디어URL 만 넣습니다 (모든 브라우저에서 스크립트 실행).

실행 (프로젝트 루트에서):
  python blog-deploy/upload_games.py
"""

import base64
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

load_dotenv()  # SUPABASE_URL, SUPABASE_ANON_KEY 등 .env 로드

MANIFEST_PATH = os.path.join(paths.GAMES_DIR, "manifest.json")


def _inline_binary(content, base_dir, rel_path, mime_type):
    """content 내에 '"rel_path"'가 있으면 해당 파일을 base64 데이터 URL로 치환한다."""
    path = os.path.join(base_dir, rel_path)
    if not os.path.isfile(path):
        return content
    key = '"' + rel_path + '"'
    if key not in content:
        return content
    with open(path, "rb") as f:
        data_url = (
            "data:"
            + mime_type
            + ";base64,"
            + base64.b64encode(f.read()).decode("ascii")
        )
    return content.replace(key, '"' + data_url + '"')


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
            content = f.read()

        # JS 문자열 안에 넣을 수 있도록 이스케이프 (따옴표, 백슬래시, 줄바꿈)
        def _js_escape(s):
            s = s or ""
            s = s.replace("\\", "\\\\").replace('"', '\\"')
            s = s.replace("\r", "\\r").replace("\n", "\\n")
            return s

        url = _js_escape(os.environ.get("SUPABASE_URL", ""))
        key = _js_escape(os.environ.get("SUPABASE_ANON_KEY", ""))
        content = content.replace("__SUPABASE_URL__", url)
        content = content.replace("__SUPABASE_ANON_KEY__", key)
        inline_assets_list = [
            ("images/host-icon.png", "image/png"),
            ("sounds/win.mp3", "audio/mpeg"),
            ("images/bgm-on.png", "image/png"),
            ("images/bgm-off.png", "image/png"),
        ]
        for rel_path, mime_type in inline_assets_list:
            content = _inline_binary(content, base_dir, rel_path, mime_type)
        # 타이머 BGM: sounds/bgm/ 폴더 스캔 후 인라인 + BGM_SOURCES 배열 주입
        bgm_dir = os.path.join(base_dir, "sounds", "bgm")
        bgm_files = (
            sorted([f for f in os.listdir(bgm_dir) if f.endswith(".mp3")])
            if os.path.isdir(bgm_dir)
            else []
        )
        if bgm_files and "__BGM_SOURCES_ARRAY__" in content:
            array_str = (
                "[" + ",".join('"sounds/bgm/' + f + '"' for f in bgm_files) + "]"
            )
            content = content.replace("__BGM_SOURCES_ARRAY__", array_str)
        for name in bgm_files:
            content = _inline_binary(
                content, base_dir, "sounds/bgm/" + name, "audio/mpeg"
            )
        return "<script>\n" + content + "\n</script>"

    def replace_img_src(html_text, rel_path, base_dir_inner):
        """HTML 내 img src를 base64 데이터 URL로 치환."""
        path = os.path.join(base_dir_inner, rel_path)
        if not os.path.isfile(path):
            return html_text
        with open(path, "rb") as f:
            data_url = "data:image/png;base64," + base64.b64encode(f.read()).decode(
                "ascii"
            )
        return html_text.replace('src="' + rel_path + '"', 'src="' + data_url + '"')

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
    for img_name in ("bgm-on.png", "bgm-off.png", "reload.png"):
        html_content = replace_img_src(html_content, "images/" + img_name, base_dir)
    return html_content


def _wrap_in_iframe_srcdoc(full_html, title):
    """전체 HTML을 srcdoc으로 넣은 iframe (WP가 이스케이프하면 깨질 수 있음)."""
    escaped = html.escape(full_html, quote=True)
    title_attr = title.replace('"', "&quot;")
    return (
        '<div class="game-iframe-wrap" style="min-height:60vh;">'
        f'<iframe srcdoc="{escaped}" style="width:100%;height:60vh;min-height:480px;border:0;" '
        f'title="{title_attr}"></iframe></div>'
    )


def _wrap_in_iframe_src(game_url, title):
    """미디어 URL을 iframe src로 사용. 모든 브라우저에서 스크립트 정상 실행."""
    title_attr = title.replace('"', "&quot;")
    return (
        '<div class="game-iframe-wrap" style="min-height:60vh;">'
        f'<iframe src="{game_url}" style="width:100%;height:60vh;min-height:480px;border:0;" '
        f'title="{title_attr}"></iframe></div>'
    )


def build_to_dir(output_dir):
    """manifest 기준으로 인라인된 게임 HTML을 output_dir에 쓴다. GitHub Pages 등 정적 호스팅용."""
    if not os.path.isfile(MANIFEST_PATH):
        print(f"⚠️  manifest 없음: {MANIFEST_PATH}")
        return 0
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        games = json.load(f)
    if not isinstance(games, list):
        print("⚠️  manifest는 배열이어야 합니다.")
        return 0
    os.makedirs(output_dir, exist_ok=True)
    num_written = 0
    for item in games:
        file_name = item.get("file")
        title = item.get("title")
        slug = item.get("slug")
        if not file_name or not slug:
            continue
        path = os.path.join(paths.GAMES_DIR, file_name)
        if not os.path.isfile(path):
            print(f"⚠️  파일 없음: {path}")
            continue
        with open(path, "r", encoding="utf-8") as f:
            full_html = f.read()
        full_html = _inline_assets(full_html, path)
        out_path = os.path.join(output_dir, slug + ".html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(full_html)
        print(f"  {slug}.html ← {title}")
        num_written += 1
    return num_written


def main():
    """manifest.json에 등록된 게임 HTML을 WordPress에 업로드한다."""
    import wordpress_client  # 지연 import: --github-pages만 쓸 때 requests 불필요

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

        # 예전에 올라간 slug.html 단일 파일이 있으면 삭제 (예: timing-game.html → 404)
        if slug == "timing-game":
            wordpress_client.delete_media_by_url_endswith("timing-game.html")

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
    if len(sys.argv) > 1 and sys.argv[1] == "--github-pages":
        out_dir = os.path.join(paths.ROOT, "docs", "games")
        print("=" * 50)
        print("📦 GitHub Pages용 게임 빌드")
        print("=" * 50)
        print(f"출력: {out_dir}")
        num_built = build_to_dir(out_dir)
        print("\n" + "=" * 50)
        print(f"✅ {num_built}개 빌드 완료")
        print("Repo → Settings → Pages → Source: Deploy from branch → main → /docs")
        print(
            "게임 URL 예: https://<username>.github.io/game-test/games/timing-game.html"
        )
        print("=" * 50)
        sys.exit(0 if num_built else 1)
    main()
