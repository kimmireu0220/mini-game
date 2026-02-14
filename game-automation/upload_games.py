"""
content/games/ 의 HTML 파일을 manifest.json 기준으로 WordPress 게임 페이지로 업로드합니다.

실행 (프로젝트 루트에서):
  python game-automation/upload_games.py
실행 (game-automation 폴더에서):
  python upload_games.py
"""

import json
import os
import sys

_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)

import paths
import wordpress_client

MANIFEST_PATH = os.path.join(paths.GAMES_DIR, "manifest.json")


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
            content = f.read()

        print(f"\n[{i}/{len(games)}] {title} (/{slug})")
        url = wordpress_client.publish_game_page(title, slug, content)
        if url:
            success += 1

    print("\n" + "=" * 50)
    print(f"✅ 완료: {success}/{len(games)}개")
    print("=" * 50)


if __name__ == "__main__":
    main()
