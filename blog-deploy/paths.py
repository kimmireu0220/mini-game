"""
프로젝트 경로 및 sys.path 설정. 다른 스크립트에서 import paths 로 사용.
"""

import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

ROOT = os.path.dirname(_SCRIPT_DIR)
CONTENT_PAGES_DIR = os.path.join(ROOT, "content", "pages")
GAMES_DIR = os.path.join(ROOT, "content", "games")
