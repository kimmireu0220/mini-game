#!/usr/bin/env python3
"""
커밋 전 검사: 린트·문법·import 오류 확인
pre-commit 훅에서 호출되며, 실패 시 커밋이 중단됩니다.
"""

import py_compile
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIRS_TO_CHECK = ["blog-deploy"]


def run_py_compile():
    """Python 문법 검사 (py_compile)."""
    print("🔍 [1/3] Python 문법 검사...")
    failed = []
    for dir_name in DIRS_TO_CHECK:
        dir_path = ROOT / dir_name
        if not dir_path.is_dir():
            continue
        for path in dir_path.rglob("*.py"):
            try:
                py_compile.compile(str(path), doraise=True)
            except py_compile.PyCompileError as e:
                failed.append((path, str(e)))
    if failed:
        for path, err in failed:
            print(f"   ❌ {path.relative_to(ROOT)}: {err}")
        return False
    print("   ✅ 문법 검사 통과")
    return True


def run_ruff():
    """ruff check (린트). 미설치 시 실패."""
    print("🔍 [2/3] Ruff 린트 검사...")
    try:
        result = subprocess.run(
            [sys.executable, "-m", "ruff", "check", *DIRS_TO_CHECK],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
        print(f"   ❌ Ruff 실행 실패: {e}")
        print("   → pip install ruff 또는 pip install -r requirements.txt")
        return False
    if result.returncode:
        stderr = result.stderr or ""
        stdout = result.stdout or ""
        if "No module named 'ruff'" in stderr or "No module named 'ruff'" in stdout:
            print("   ❌ Ruff 미설치")
            print("   → pip install ruff 또는 pip install -r requirements.txt")
            return False
        print(stdout or stderr)
        print("   ❌ Ruff 린트 오류 있음 (위 메시지 확인)")
        return False
    print("   ✅ Ruff 린트 통과")
    return True


def run_import_check():
    """주요 모듈 import 가능 여부. 의존성 없으면 실패."""
    print("🔍 [3/3] import 검사...")
    sys.path.insert(0, str(ROOT))
    sys.path.insert(0, str(ROOT / "blog-deploy"))
    try:
        import config  # noqa: F401  # pylint: disable=unused-import
        import paths  # noqa: F401  # pylint: disable=unused-import
        import wordpress_client  # noqa: F401  # pylint: disable=unused-import

    except (ModuleNotFoundError, ImportError, AttributeError) as e:
        print(f"   ❌ import 실패: {e}")
        print("   → venv 활성화 후 실행하거나 pip install -r requirements.txt")
        return False
    except (TypeError, ValueError) as e:
        print(f"   ❌ import 실패: {e}")
        return False
    print("   ✅ import 통과")
    return True


def main():
    """커밋 전 검사 실행: 문법, Ruff, import."""
    if not run_py_compile():
        sys.exit(1)
    if not run_ruff():
        sys.exit(1)
    if not run_import_check():
        sys.exit(1)
    print("✅ 커밋 전 검사 모두 통과")
    sys.exit(0)


if __name__ == "__main__":
    main()
