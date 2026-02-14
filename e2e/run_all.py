"""
Playwright E2E 확인 진입점.
프로젝트 루트에서 실행: .venv/bin/python e2e/run_all.py
"""

import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_GAME_AUTOMATION = os.path.join(_ROOT, "game-automation")
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
if _GAME_AUTOMATION not in sys.path:
    sys.path.insert(0, _GAME_AUTOMATION)

# 등록된 체크 모듈의 main() 실행
CHECKS = [
    ("2048 게임", "e2e.checks.check_2048"),
]


def main():
    """등록된 E2E 체크를 순서대로 실행. 하나라도 실패하면 exit 1."""
    os.chdir(_ROOT)
    failed = []
    for name, module_path in CHECKS:
        print(f"\n▶ {name}")
        try:
            mod = __import__(module_path, fromlist=["main"])
            mod.main()
        except Exception as e:  # pylint: disable=broad-exception-caught
            print(f"❌ 실패: {e}")
            failed.append(name)
    if failed:
        print(f"\n⚠️ 실패한 체크: {', '.join(failed)}")
        sys.exit(1)
    print("\n✅ 전체 체크 완료")


if __name__ == "__main__":
    main()
