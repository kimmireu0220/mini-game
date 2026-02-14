#!/usr/bin/env python3
"""
커밋 전 검사·e2e를 위해 필요한 환경을 확인하고, 없으면 설치합니다.
실행: python scripts/ensure_env.py  (프로젝트 루트에서)
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIREMENTS = ROOT / "requirements.txt"
VENV_PYTHON = ROOT / ".venv" / "bin" / "python"
VENV_PIP = ROOT / ".venv" / "bin" / "pip"


def run(cmd, check=True, capture=True):
    """명령 실행. check=True면 실패 시 예외."""
    return subprocess.run(
        cmd,
        cwd=ROOT,
        capture_output=capture,
        text=True,
        check=check,
    )


def main():
    """venv·requirements·playwright·pre-commit·검사 1회까지 수행."""
    print("🔍 환경 확인...")

    # 1) venv
    if not VENV_PYTHON.exists():
        msg = "   ❌ .venv 없음 → python -m venv .venv && .venv/bin/pip install -r requirements.txt"
        print(msg)
        sys.exit(1)
    python = str(VENV_PYTHON)
    pip = str(VENV_PIP)

    # 2) requirements 설치
    if REQUIREMENTS.exists():
        print("   📦 requirements.txt 설치 확인...")
        run([pip, "install", "-q", "-r", str(REQUIREMENTS)])
        print("   ✅ requirements 설치됨")

    # 3) playwright 브라우저 (e2e용)
    print("   📦 Playwright Chromium 확인...")
    r = subprocess.run(
        [python, "-m", "playwright", "install", "chromium"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    out = (r.stderr or "") + (r.stdout or "")
    if r.returncode and "is already installed" not in out:
        print("   ⚠️  playwright install chromium 실패 (e2e는 수동 실행)")
    else:
        print("   ✅ Chromium 준비됨")

    # 4) pre-commit 훅 (venv의 pre-commit 사용)
    print("   📦 pre-commit 훅 확인...")
    r = subprocess.run(
        [python, "-m", "pre_commit", "install"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode:
        run([pip, "install", "-q", "pre-commit"])
        subprocess.run([python, "-m", "pre_commit", "install"], cwd=ROOT, check=True)
    print("   ✅ pre-commit 훅 등록됨")

    # 5) 검사 1회 실행
    print("   🧪 커밋 전 검사 1회 실행...")
    r = subprocess.run(
        [python, "scripts/check_before_commit.py"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode:
        print(r.stdout or r.stderr)
        print("   ❌ 검사 실패 (위 메시지 확인)")
        sys.exit(1)
    print("   ✅ 검사 통과")

    print("\n✅ 환경 갖춰짐. 커밋 시 문법·린트·import 검사가 자동 실행됩니다.")


if __name__ == "__main__":
    main()
