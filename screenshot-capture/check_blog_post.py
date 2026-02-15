"""Playwright로 블로그 2048 소개 포스트 페이지를 열고 스크린샷 저장."""
import os
import sys

_script_dir = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_script_dir)
_blog_deploy = os.path.join(_root, "blog-deploy")
if _blog_deploy not in sys.path:
    sys.path.insert(0, _blog_deploy)

import config
from playwright.sync_api import sync_playwright

# 발행된 2048 포스트 URL (스크린샷 포함 버전)
POST_URL = (
    config.WP_URL.rstrip("/")
    + "/2048-%ea%b2%8c%ec%9e%84-%ec%88%ab%ec%9e%90%eb%a5%bc-%ed%95%a9%ec%b3%90-2048%ec%9d%84-%eb%a7%8c%eb%93%9c%ec%84%b8%ec%9a%94-2/"
)
OUT_PATH = os.path.join(_script_dir, "screenshots", "blog-2048-post.png")


def main():
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        try:
            page.goto(POST_URL, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(2000)
            page.screenshot(path=OUT_PATH, full_page=True)
            print(f"스크린샷 저장: {OUT_PATH}")
        except Exception as e:
            print(f"실패: {e}")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
