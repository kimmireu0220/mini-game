"""
로컬 WordPress 게임 자동 생성 스크립트 (진입점)

실행 (프로젝트 루트에서):
  python game-automation/game_generator.py
실행 (game-automation 폴더에서):
  python game_generator.py
"""

import os
import sys
import time

def _setup_path():
    """루트에서 실행해도 game-automation 내 모듈을 찾도록 sys.path에 추가한다."""
    _script_dir = os.path.dirname(os.path.abspath(__file__))
    if _script_dir not in sys.path:
        sys.path.insert(0, _script_dir)


_setup_path()

import config
import ollama_client
import wordpress_client
import html_processor


def main():
    """연결 확인 후 각 게임별로 코드 생성 → SEO → 애드센스 → WordPress 게시를 실행한다."""
    print("=" * 50)
    print("🎮 게임 자동 생성 시작")
    print("=" * 50)

    if not ollama_client.check_connection():
        return
    if not wordpress_client.check_connection():
        return

    ideas = config.GAME_IDEAS
    print("\n[3단계] 게임 생성 시작...")
    print(f"총 {len(ideas)}개 게임 생성 예정\n")

    success_count = 0
    for i, game_idea in enumerate(ideas, 1):
        print("=" * 50)
        print(f"🎮 게임 {i}/{len(ideas)}: {game_idea['name']}")
        print("=" * 50)

        html_code = ollama_client.generate_game_code(game_idea)
        if not html_code:
            print(f"⚠️  {game_idea['name']} 생성 실패, 다음으로...")
            continue

        html_code = html_processor.optimize_seo(game_idea, html_code)
        html_code = html_processor.insert_adsense(html_code)
        page_url = wordpress_client.publish_page(game_idea, html_code)
        if page_url:
            success_count += 1

        print("\n⏳ 다음 게임까지 5초 대기...")
        time.sleep(5)

    print("\n" + "=" * 50)
    print("🎉 생성 완료!")
    print(f"   성공: {success_count}/{len(ideas)}개")
    print(f"   확인: {config.WP_URL}/wp-admin/edit.php?post_type=page")
    print("=" * 50)


if __name__ == "__main__":
    main()
