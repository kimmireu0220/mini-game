"""
WordPress REST API: 연결 확인, 페이지 게시/업데이트
"""

import requests
from requests.auth import HTTPBasicAuth

import config


def _auth():
    return HTTPBasicAuth(config.WP_USER, config.WP_PASSWORD)


def check_connection():
    """WordPress 연결 확인"""
    print("\n[2단계] WordPress 연결 확인...")
    try:
        response = requests.get(
            f"{config.WP_URL}/wp-json/wp/v2/pages",
            auth=_auth(),
            timeout=10,
        )
        if response.status_code == 200:
            print(f"✅ WordPress 연결 성공! (사이트: {config.WP_URL})")
            return True
        print(f"❌ WordPress 연결 실패: {response.status_code}")
        print(f"응답: {response.text[:200]}")
        return False
    except (requests.RequestException, ValueError) as e:
        print(f"❌ WordPress 연결 실패: {e}")
        return False


def publish_page(game_idea, html_code):
    """페이지 게시 (같은 slug 있으면 업데이트)"""
    print("[4/4] WordPress에 게시 중...")

    slug = game_idea["slug"]
    page_data = {
        "title": f"{game_idea['name']} - 무료 온라인 게임",
        "content": html_code,
        "status": "publish",
        "slug": slug,
        "meta": {"_wp_page_template": "default"},
    }
    auth = _auth()
    base = f"{config.WP_URL}/wp-json/wp/v2/pages"

    try:
        r = requests.get(base, params={"slug": slug}, auth=auth, timeout=10)
        if r.status_code == 200:
            pages = r.json()
            if isinstance(pages, list) and len(pages) > 0:
                page_id = pages[0]["id"]
                response = requests.post(
                    f"{base}/{page_id}",
                    auth=auth,
                    json=page_data,
                    timeout=30,
                )
                if response.status_code == 200:
                    page_url = response.json()["link"]
                    print("✅ 기존 페이지 업데이트 완료!")
                    print(f"   URL: {page_url}")
                    return page_url

        response = requests.post(base, auth=auth, json=page_data, timeout=30)
        if response.status_code == 201:
            page_url = response.json()["link"]
            print("✅ 게시 완료!")
            print(f"   URL: {page_url}")
            return page_url

        print(f"❌ 게시 실패: {response.status_code}")
        print(f"   응답: {response.text[:200]}")
        return None
    except (requests.RequestException, ValueError, KeyError) as e:  # pylint: disable=broad-exception-caught
        print(f"❌ 오류 발생: {e}")
        return None
