"""
Playwright로 2048 게임 페이지를 열어 보드·스타일·스크립트가 정상인지 확인합니다.
실행: .venv/bin/python e2e/checks/check_2048.py (프로젝트 루트에서)
"""

import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_BLOG_DEPLOY = os.path.join(_ROOT, "blog-deploy")
if _BLOG_DEPLOY not in sys.path:
    sys.path.insert(0, _BLOG_DEPLOY)

import config
from playwright.sync_api import sync_playwright

URL = config.WP_URL.rstrip("/") + "/2048-game/"
SCREENSHOTS_DIR = os.path.join(_ROOT, "e2e", "screenshots")


def main():  # pylint: disable=too-many-locals,too-many-statements
    """2048 게임 페이지를 열어 보드·셀·방향키 반응을 검사하고 스크린샷 저장."""
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    screenshot_path = os.path.join(SCREENSHOTS_DIR, "2048-page.png")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto(URL, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(3000)
            if page.locator(".game-iframe-wrap iframe").count() > 0:
                try:
                    fl = page.frame_locator(".game-iframe-wrap iframe")
                    fl.locator("#board .cell").first.wait_for(
                        state="visible", timeout=8000
                    )
                except Exception:  # pylint: disable=broad-exception-caught
                    pass
        except Exception as e:  # pylint: disable=broad-exception-caught
            print(f"❌ 페이지 접속 실패: {e}")
            print(f"   URL: {URL}")
            print("   (game-test.local이 /etc/hosts 등에 등록돼 있는지 확인하세요)")
            browser.close()
            return

        has_iframe = page.locator(".game-iframe-wrap iframe").count() > 0
        if has_iframe:
            fl = page.frame_locator(".game-iframe-wrap iframe")
            board = fl.locator("#board")
            board_visible = board.count() > 0 and board.first.is_visible()
            cells = fl.locator("#board .cell")
            cell_count = cells.count()
            wrapper_visible = fl.locator(".game-page-wrapper").count() > 0
            # 실제 플레이 가능 여부: iframe 포커스 후 방향키 → 타일(2/4) 또는 점수 변화
            playable = False
            if cell_count == 16:
                try:
                    fl.locator("#board").first.click()
                    page.keyboard.press("ArrowRight")
                    page.wait_for_timeout(300)
                    non_empty = fl.locator("#board .cell:not(.empty)").count()
                    score_el = fl.locator("#score").first
                    score_text = score_el.text_content() or "0"
                    playable = non_empty >= 1 or (
                        score_text.isdigit() and int(score_text) > 0
                    )
                except Exception:  # pylint: disable=broad-exception-caught
                    pass
        else:
            wrapper_visible = page.locator(".game-page-wrapper").count() > 0
            board = page.locator("#board")
            board_visible = board.count() > 0 and board.first.is_visible()
            cells = page.locator("#board .cell")
            cell_count = cells.count()
            playable = False

        title_ok = (
            "2048" in page.title() or page.locator("h1:has-text('2048')").count() > 0
        )

        # 크기: iframe·보드 픽셀 크기 (90vh 등 적용 여부)
        iframe_w, iframe_h, board_w, board_h = 0, 0, 0, 0
        if has_iframe:
            try:
                iframe_el = page.locator(".game-iframe-wrap iframe").first
                if iframe_el.count() > 0:
                    box = iframe_el.bounding_box()
                    if box:
                        iframe_w, iframe_h = int(box["width"]), int(box["height"])
                board_el = fl.locator("#board").first
                if board_el.count() > 0:
                    box = board_el.bounding_box()
                    if box:
                        board_w, board_h = int(box["width"]), int(box["height"])
            except Exception:  # pylint: disable=broad-exception-caught
                pass

        page.screenshot(path=screenshot_path)
        browser.close()

        print("=" * 50)
        print("🔍 2048 페이지 확인 결과")
        print("=" * 50)
        print(f"URL: {URL}")
        print(f"제목에 2048 포함: {'✅' if title_ok else '❌'}")
        print(f"iframe 방식: {'✅' if has_iframe else '❌'}")
        print(f"iframe 내 .game-page-wrapper: {'✅' if wrapper_visible else '❌'}")
        print(f"iframe 내 #board 노출: {'✅' if board_visible else '❌'}")
        print(f"iframe 내 #board .cell 개수 (16개면 정상): {cell_count}")
        if has_iframe and cell_count == 16:
            print(f"방향키 반응 (실제 플레이 가능): {'✅' if playable else '❌'}")
        size_ok = True
        if iframe_w or iframe_h:
            print(f"크기: iframe {iframe_w}×{iframe_h}px, 보드 {board_w}×{board_h}px")
            size_ok = iframe_h >= 400 and board_w >= 200 and board_h >= 200
            print(f"크기 적절 (iframe 높이≥400, 보드≥200): {'✅' if size_ok else '⚠️'}")
        print(f"스크린샷: {os.path.abspath(screenshot_path)}")
        print("=" * 50)
        all_ok = (
            title_ok
            and has_iframe
            and wrapper_visible
            and board_visible
            and cell_count == 16
            and playable
            and size_ok
        )
        if all_ok:
            print("✅ iframe 내 보드·스타일·스크립트 정상 동작 (플레이 가능)")
        elif title_ok and has_iframe and cell_count == 16 and not playable:
            print("⚠️ 보드는 보이지만 방향키 반응 없음. iframe 포커스/이벤트 확인 필요.")
        elif not has_iframe:
            print(
                "⚠️ iframe이 없습니다. upload_games.py가 iframe 방식으로 업로드했는지 확인하세요."
            )
        else:
            print("⚠️ 일부 항목 미충족 (위 결과 확인)")


if __name__ == "__main__":
    main()
