# scripts

## IDE 경고 vs 커밋 전 검사

- **커밋 전 검사**: Ruff 기준 (문법·린트·import). Ruff 통과 시 커밋 가능.
- **IDE Problems**: Pylint를 쓰면 Ruff와 규칙이 달라 경고가 남을 수 있음.  
  `.pylintrc`에서 C0413(import 위치), W1309(f-string) 비활성화해 두었으므로 해당 경고는 사라짐.  
  IDE에서 Ruff 확장을 쓰면 커밋 검사와 동일한 규칙 적용.

## pre-commit (커밋 전 에러·린트 검사)

커밋 전에 **스킵 없이** 다음을 **항상 전부** 검사합니다.

1. **문법** – `py_compile` (game-automation, e2e)
2. **린트** – `ruff check` (미설치 시 실패)
3. **import** – config, wordpress_client, e2e.checks (의존성 없으면 실패)

훅은 `.venv/bin/python`이 있으면 venv로 실행해 ruff·requests 등이 있는 환경에서 검사합니다.

### 환경 갖추기 (한 번에)

venv + requirements + playwright chromium + pre-commit 훅 + 검사 1회까지 한 번에:

```bash
.venv/bin/python scripts/ensure_env.py
```

(venv가 없으면 먼저 `python -m venv .venv` 후 실행)

### 수동 설치

```bash
.venv/bin/pip install -r requirements.txt
.venv/bin/playwright install chromium
.venv/bin/python -m pre_commit install
```

### 수동 실행 (검사만)

```bash
.venv/bin/python scripts/check_before_commit.py
# 또는
.venv/bin/pre-commit run --all-files
```
