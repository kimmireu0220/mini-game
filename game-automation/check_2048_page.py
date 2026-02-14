"""
2048 페이지 Playwright 확인은 e2e에서 실행하세요.

  프로젝트 루트에서:
    .venv/bin/python e2e/run_all.py
    .venv/bin/python e2e/checks/check_2048.py
"""

import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

# e2e 체크 실행
from e2e.checks import check_2048

if __name__ == "__main__":
    check_2048.main()
