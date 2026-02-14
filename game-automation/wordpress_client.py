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


def _list_pages_by_slug(auth, base, slug, include_trash=False):
    """slug가 정확히 일치하거나 'slug-숫자' 형태인 페이지 목록 반환."""
    params = {"per_page": 100}
    if include_trash:
        params["status"] = "any"  # publish, draft, trash 등 전부
    out = []
    for status in (
        ["publish"] if not include_trash else ["publish", "draft", "trash", "private"]
    ):
        r = requests.get(
            base, params={**params, "status": status}, auth=auth, timeout=10
        )
        if r.status_code != 200:
            continue
        pages = r.json()
        if not isinstance(pages, list):
            continue
        prefix = slug + "-"
        for p in pages:
            s = p.get("slug") or ""
            if s == slug or s.startswith(prefix):
                out.append(p)
    return out


def _find_page_by_slug(auth, base, slug):
    """slug가 정확히 일치하거나 'slug-숫자' 형태인 페이지를 찾아 반환. 없으면 None."""
    pages = _list_pages_by_slug(auth, base, slug)
    if not pages:
        return None
    # 정확히 slug인 것 우선
    exact = [p for p in pages if (p.get("slug") or "") == slug]
    return exact[0] if exact else pages[0]


def _delete_page(page_id, auth, force=True):
    """페이지 완전 삭제. force=True면 휴지통 없이 삭제."""
    base = f"{config.WP_URL}/wp-json/wp/v2/pages"
    r = requests.delete(
        f"{base}/{page_id}",
        auth=auth,
        params={"force": "true"} if force else {},
        timeout=10,
    )
    return r.status_code in (200, 204)


def _upsert_page(title, slug, content):
    """제목·slug·본문으로 페이지 생성 또는 업데이트. 성공 시 URL 반환.
    - slug 또는 slug-숫자 페이지가 있으면 그걸 업데이트 (기존 URL 유지).
    - 정확히 slug인 페이지는 삭제하고, slug-숫자 하나만 쓴다 (timing-game 제거, timing-game-4만 사용).
    """
    auth = _auth()
    base = f"{config.WP_URL}/wp-json/wp/v2/pages"

    try:
        pages = _list_pages_by_slug(auth, base, slug, include_trash=False)
        numbered = [p for p in pages if (p.get("slug") or "").startswith(slug + "-")]
        exact_pages = [p for p in pages if (p.get("slug") or "") == slug]
        # slug-숫자(예: timing-game-4)가 있을 때만 정확히 slug(예: timing-game) 페이지 삭제 → timing-game 제거, timing-game-4만 사용
        if numbered and exact_pages:
            for p in exact_pages:
                if _delete_page(p["id"], auth):
                    print(f"   페이지 삭제 (주소 통일): /{p.get('slug')}/")
        if numbered:
            existing = numbered[0]
            page_id = existing["id"]
            keep_slug = existing.get("slug") or slug
            page_data = {
                "title": title,
                "content": content,
                "status": "publish",
                "slug": keep_slug,
                "meta": {"_wp_page_template": "default"},
            }
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
        elif exact_pages:
            existing = exact_pages[0]
            page_id = existing["id"]
            page_data = {
                "title": title,
                "content": content,
                "status": "publish",
                "slug": slug,
                "meta": {"_wp_page_template": "default"},
            }
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

        # 페이지 없음 → 새로 생성 (WordPress가 slug-숫자 부여)
        page_data = {
            "title": title,
            "content": content,
            "status": "publish",
            "slug": slug,
            "meta": {"_wp_page_template": "default"},
        }
        response = requests.post(base, auth=auth, json=page_data, timeout=30)
        if response.status_code == 201:
            page_url = response.json().get("link") or ""
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


def _media_list(auth, per_page=100):
    """미디어 목록 조회."""
    url = f"{config.WP_URL}/wp-json/wp/v2/media"
    r = requests.get(url, auth=auth, params={"per_page": per_page}, timeout=10)
    if r.status_code != 200:
        return []
    data = r.json()
    return data if isinstance(data, list) else []


def delete_media_by_url_endswith(suffix):
    """URL이 suffix로 끝나는 미디어를 찾아 삭제. 예: suffix='/timing-game.html' → 예전 단일 파일 제거."""
    auth = _auth()
    base = f"{config.WP_URL}/wp-json/wp/v2/media"
    for item in _media_list(auth):
        src = (item.get("source_url") or item.get("link") or "").rstrip("/")
        if src.endswith(suffix.rstrip("/")):
            mid = item.get("id")
            if mid is not None:
                r = requests.delete(
                    f"{base}/{mid}", auth=auth, params={"force": "true"}, timeout=10
                )
                if r.status_code in (200, 204):
                    print(f"   미디어 삭제: {suffix}")
                    return True
    return False


def upload_game_html(slug, html_bytes, filename=None):
    """게임 HTML을 미디어로 업로드하고 접근 URL을 반환한다.
    반환된 URL을 iframe src로 쓰면 모든 브라우저에서 스크립트가 정상 실행된다.
    """
    if filename is None:
        filename = f"{slug}.html"
    url = f"{config.WP_URL}/wp-json/wp/v2/media"
    auth = _auth()
    files = {"file": (filename, html_bytes, "text/html; charset=utf-8")}
    try:
        r = requests.post(url, auth=auth, files=files, timeout=30)
        if r.status_code in (200, 201):
            data = r.json()
            return data.get("source_url") or data.get("link")
        print(f"⚠️ 미디어 업로드 실패: {r.status_code} {r.text[:150]}")
        return None
    except (requests.RequestException, ValueError, KeyError) as e:  # pylint: disable=broad-exception-caught
        print(f"⚠️ 미디어 업로드 오류: {e}")
        return None
