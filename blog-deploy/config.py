"""
설정: .env 로드, WordPress credentials(.env), AdSense 상수(선택)
"""

import os

# 프로젝트 루트 (blog-deploy의 상위)
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_dotenv():
    """프로젝트 루트의 .env를 읽어 os.environ에 설정 (이미 있는 키는 덮어쓰지 않음)"""
    for base in (_ROOT, os.getcwd()):
        path = os.path.join(base, ".env")
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, _, v = line.partition("=")
                    k, v = k.strip(), v.strip().strip("\"'")
                    if k and os.environ.get(k) is None:
                        os.environ[k] = v
            break


def load_credentials():
    """WP_URL, WP_USER, WP_PASSWORD (.env/환경 변수 → 기본값)"""
    creds = {}
    for key in ("WP_URL", "WP_USER", "WP_PASSWORD"):
        creds[key] = os.environ.get(key, "").strip()

    if not creds.get("WP_URL"):
        creds["WP_URL"] = "http://game-test.local"
    if not creds.get("WP_USER"):
        creds["WP_USER"] = "admin"
    if not creds.get("WP_PASSWORD"):
        creds["WP_PASSWORD"] = ""
    return creds


# .env 로드 후 상수 정의
load_dotenv()
_CREDS = load_credentials()

WP_URL = _CREDS["WP_URL"]
WP_USER = _CREDS["WP_USER"]
WP_PASSWORD = _CREDS["WP_PASSWORD"]

ADSENSE_CLIENT = os.environ.get("ADSENSE_CLIENT", "").strip()
_slots = os.environ.get("ADSENSE_SLOTS", "").strip()
ADSENSE_SLOTS = [s.strip() for s in _slots.split(",") if s.strip()] if _slots else []
