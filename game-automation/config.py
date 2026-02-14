"""
설정: .env 로드, WordPress credentials(.env), Ollama/AdSense 상수, 게임 아이디어 데이터
"""

import os

# 프로젝트 루트 (game-automation의 상위)
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
                    k, v = k.strip(), v.strip().strip('"\'')
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

OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:14b")
ADSENSE_CLIENT = os.environ.get("ADSENSE_CLIENT", "").strip()
_slots = os.environ.get("ADSENSE_SLOTS", "").strip()
ADSENSE_SLOTS = [s.strip() for s in _slots.split(",") if s.strip()] if _slots else []

# ===================================
# 게임 아이디어 데이터
# ===================================
GAME_IDEAS = [
    {
        "name": "2048 게임",
        "viral_score": 9.0,
        "difficulty": "중",
        "description": "숫자를 합쳐 2048을 만드는 중독성 강한 퍼즐 게임",
        "keywords": ["2048", "숫자게임", "퍼즐게임", "두뇌게임"],
        "slug": "2048-game",
        "genre": "퍼즐",
    },
    {
        "name": "한글 워들",
        "viral_score": 8.5,
        "difficulty": "중",
        "description": "5글자 한글 단어를 6번 안에 맞추는 게임",
        "keywords": ["워들", "단어게임", "한글게임", "퀴즈"],
        "slug": "korean-wordle",
        "genre": "단어게임",
    },
    {
        "name": "타자 연습",
        "viral_score": 7.0,
        "difficulty": "쉬움",
        "description": "한글 타자 속도를 측정하고 연습하는 게임",
        "keywords": ["타자연습", "한글타자", "타이핑게임"],
        "slug": "typing-practice",
        "genre": "교육",
    },
    {
        "name": "뱀 게임",
        "viral_score": 8.0,
        "difficulty": "쉬움",
        "description": "클래식 스네이크 게임, 먹이를 먹고 자라나세요",
        "keywords": ["뱀게임", "스네이크", "아케이드", "클래식게임"],
        "slug": "snake-game",
        "genre": "아케이드",
    },
    {
        "name": "메모리 카드 게임",
        "viral_score": 7.5,
        "difficulty": "쉬움",
        "description": "같은 그림 찾기 기억력 테스트 게임",
        "keywords": ["메모리게임", "카드게임", "기억력", "두뇌게임"],
        "slug": "memory-card-game",
        "genre": "퍼즐",
    },
]
