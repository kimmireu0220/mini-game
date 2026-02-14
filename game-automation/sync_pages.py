"""
content/pages/ 의 HTML 파일을 WordPress 정적 페이지로 동기화합니다.

실행 (프로젝트 루트에서):
  python game-automation/sync_pages.py
실행 (game-automation 폴더에서):
  python sync_pages.py
"""

import os
import sys

_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)

import paths
import wordpress_client

# 파일명 -> (WordPress 제목, slug)
PAGES = [
    ("about.html", "About", "about"),
    ("contact.html", "Contact", "contact"),
    ("privacy-policy.html", "Privacy Policy", "privacy-policy"),
]


def main():
    """content/pages/ 에 정의된 페이지들을 WordPress에 반영한다."""
    print("=" * 50)
    print("📄 정적 페이지 동기화")
    print("=" * 50)

    if not wordpress_client.check_connection():
        return

    for filename, title, slug in PAGES:
        path = os.path.join(paths.CONTENT_PAGES_DIR, filename)
        if not os.path.isfile(path):
            print(f"⚠️  파일 없음: {path}")
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        wordpress_client.publish_static_page(title, slug, content)

    print("\n" + "=" * 50)
    print("✅ 동기화 완료")
    print("=" * 50)


if __name__ == "__main__":
    main()
