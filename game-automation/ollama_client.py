"""
Ollama API: 연결 확인, 게임 HTML 코드 생성
"""

import requests

import config


def check_connection():
    """Ollama 연결 및 사용 모델 존재 여부 확인"""
    print("\n[1단계] Ollama 연결 확인...")
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code != 200:
            print(f"❌ Ollama 응답 오류: {response.status_code}")
            return False
        data = response.json()
        models = [m.get("name", "") for m in data.get("models", [])]
        if config.OLLAMA_MODEL not in models:
            print(f"❌ 모델 '{config.OLLAMA_MODEL}'이(가) 없습니다.")
            print(f"   사용 가능: {', '.join(models) or '(없음)'}")
            print(f"   해결: 터미널에서 'ollama pull {config.OLLAMA_MODEL}' 실행")
            return False
        print(f"✅ Ollama 연결 성공! (모델: {config.OLLAMA_MODEL})")
        return True
    except (requests.RequestException, ValueError) as e:
        print(f"❌ Ollama 연결 실패: {e}")
        print("해결 방법: 터미널에서 'ollama serve' 실행")
        return False


def generate_game_code(game_idea):
    """Ollama로 게임 HTML 코드 생성"""
    prompt = f"""
완벽한 HTML5 게임을 단일 파일로 생성해주세요.

게임 이름: {game_idea['name']}
설명: {game_idea['description']}

요구사항:
1. 완전한 HTML 파일 (HTML + CSS + JavaScript 모두 포함)
2. 모바일 터치 이벤트 지원
3. 반응형 디자인 (스마트폰에서도 완벽)
4. 점수 표시 및 게임 오버 처리
5. 재시작 버튼
6. 깔끔한 디자인 (색상: #4CAF50, #2196F3, #FF5722 활용)
7. 게임 시작 전 간단한 설명 표시
8. 애드센스 광고 공간 3곳 (<div class="ad-space"></div>)

중요: 코드만 출력하세요. 설명이나 주석 없이 순수 HTML 코드만!
"""

    print("\n[1/4] 게임 코드 생성 중... (3-5분 소요)")
    print(f"     모델: {config.OLLAMA_MODEL}")

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": config.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
            },
            timeout=600,
        )

        if response.status_code != 200:
            print(f"❌ 생성 실패: {response.status_code}")
            return None

        html_code = response.json()["response"]

        if "```html" in html_code:
            html_code = html_code.split("```html")[1].split("```")[0]
        elif "```" in html_code:
            html_code = html_code.split("```")[1].split("```")[0]

        print(f"✅ 게임 코드 생성 완료 ({len(html_code)} bytes)")
        return html_code.strip()
    except (requests.RequestException, ValueError, KeyError) as e:  # pylint: disable=broad-exception-caught
        print(f"❌ 오류 발생: {e}")
        return None
