#!/usr/bin/env python3
"""
pre-commit 훅 설치 및 설정 스크립트
커밋 전에 에러·린트 검사가 자동 실행되도록 합니다.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_command(cmd, description):
    """명령 실행, 성공 여부 반환."""
    print(f"🔄 [실행] {description}...")
    try:
        subprocess.run(
            cmd,
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        print(f"✅ [완료] {description}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ [실패] {description}")
        if e.stderr:
            print(e.stderr.strip())
        return False


def check_pre_commit_installed():
    """pre-commit 설치 여부."""
    try:
        subprocess.run(
            ["pre-commit", "--version"],
            check=True,
            capture_output=True,
        )
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def install_pre_commit():
    """pre-commit 설치."""
    print("📦 [설치] pre-commit 설치 중...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "pre-commit>=3.6.0"],
            check=True,
            capture_output=True,
            text=True,
            cwd=ROOT,
        )
        print("✅ [완료] pre-commit 설치 완료")
        return True
    except subprocess.CalledProcessError:
        print("❌ [실패] pre-commit 설치 실패")
        return False


def main():
    """pre-commit 설치·훅 등록·검사 스크립트 테스트."""
    print("🚀 [시작] pre-commit 설정...")

    if not check_pre_commit_installed():
        if not install_pre_commit():
            sys.exit(1)
    else:
        print("✅ [확인] pre-commit 이미 설치됨")

    if not run_command(["pre-commit", "install"], "pre-commit 훅 설치"):
        sys.exit(1)

    print("🧪 [테스트] 커밋 전 검사 스크립트 실행...")
    if not run_command(
        [sys.executable, "scripts/check_before_commit.py"], "check_before_commit"
    ):
        sys.exit(1)

    print("🎉 [완료] pre-commit 설정이 완료되었습니다.")
    print("💡 커밋할 때마다 에러·린트 검사가 자동 실행됩니다.")
    print("💡 수동 테스트: pre-commit run --all-files")


if __name__ == "__main__":
    main()
