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


def _upsert_page(title, slug, content):
    """제목·slug·본문으로 페이지 생성 또는 업데이트. 성공 시 URL 반환."""
    page_data = {
        "title": title,
        "content": content,
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


def publish_static_page(title, slug, content):
    """정적 페이지(About, Contact 등) 게시 또는 업데이트."""
    print(f"페이지 동기화: {title} (/{slug})")
    return _upsert_page(title, slug, content)


def publish_game_page(title, slug, content):
    """게임 페이지 게시 또는 업데이트. 제목에 ' - 무료 온라인 게임'을 붙인다."""
    full_title = title + " - 무료 온라인 게임"
    return _upsert_page(full_title, slug, content)
