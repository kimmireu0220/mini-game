"""
로컬 WordPress 게임 자동 생성 스크립트
"""

import requests
from requests.auth import HTTPBasicAuth
import json
import time
from datetime import datetime

# ===================================
# 설정 (여기만 수정하세요!)
# ===================================
WP_URL = "http://game-test.local"
WP_USER = "admin"
WP_PASSWORD = "6TnB e1YJ 9aXf znun Txkt N95p"  # Application Password
OLLAMA_MODEL = "qwen2.5-coder:14b"
ADSENSE_CLIENT = ""  # 나중에 입력 (예: ca-pub-1234567890)

# ===================================
# 게임 아이디어 데이터베이스
# ===================================
GAME_IDEAS = [
    {
        "name": "2048 게임",
        "viral_score": 9.0,
        "difficulty": "중",
        "description": "숫자를 합쳐 2048을 만드는 중독성 강한 퍼즐 게임",
        "keywords": ["2048", "숫자게임", "퍼즐게임", "두뇌게임"],
        "slug": "2048-game"
    },
    {
        "name": "한글 워들",
        "viral_score": 8.5,
        "difficulty": "중",
        "description": "5글자 한글 단어를 6번 안에 맞추는 게임",
        "keywords": ["워들", "단어게임", "한글게임", "퀴즈"],
        "slug": "korean-wordle"
    },
    {
        "name": "타자 연습",
        "viral_score": 7.0,
        "difficulty": "쉬움",
        "description": "한글 타자 속도를 측정하고 연습하는 게임",
        "keywords": ["타자연습", "한글타자", "타이핑게임"],
        "slug": "typing-practice"
    },
    {
        "name": "뱀 게임",
        "viral_score": 8.0,
        "difficulty": "쉬움",
        "description": "클래식 스네이크 게임, 먹이를 먹고 자라나세요",
        "keywords": ["뱀게임", "스네이크", "아케이드", "클래식게임"],
        "slug": "snake-game"
    },
    {
        "name": "메모리 카드 게임",
        "viral_score": 7.5,
        "difficulty": "쉬움",
        "description": "같은 그림 찾기 기억력 테스트 게임",
        "keywords": ["메모리게임", "카드게임", "기억력", "두뇌게임"],
        "slug": "memory-card-game"
    }
]

# ===================================
# 핵심 함수들
# ===================================

def check_ollama_connection():
    """Ollama 연결 확인"""
    print("\n[1단계] Ollama 연결 확인...")
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            print(f"✅ Ollama 연결 성공! (모델: {OLLAMA_MODEL})")
            return True
    except Exception as e:
        print(f"❌ Ollama 연결 실패: {e}")
        print("해결 방법: 터미널에서 'ollama serve' 실행")
        return False
    return False

def check_wordpress_connection():
    """WordPress 연결 확인"""
    print("\n[2단계] WordPress 연결 확인...")
    try:
        response = requests.get(
            f"{WP_URL}/wp-json/wp/v2/pages",
            auth=HTTPBasicAuth(WP_USER, WP_PASSWORD),
            timeout=10
        )
        if response.status_code == 200:
            print(f"✅ WordPress 연결 성공! (사이트: {WP_URL})")
            return True
        else:
            print(f"❌ WordPress 연결 실패: {response.status_code}")
            print(f"응답: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ WordPress 연결 실패: {e}")
        return False

def generate_game_code(game_idea):
    """Ollama로 게임 코드 생성"""
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
    
    print(f"\n[1/4] 게임 코드 생성 중... (3-5분 소요)")
    print(f"     모델: {OLLAMA_MODEL}")
    
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=600
        )
        
        if response.status_code == 200:
            html_code = response.json()['response']
            
            # 코드 블록 제거
            if '```html' in html_code:
                html_code = html_code.split('```html')[1].split('```')[0]
            elif '```' in html_code:
                html_code = html_code.split('```')[1].split('```')[0]
            
            print(f"✅ 게임 코드 생성 완료 ({len(html_code)} bytes)")
            return html_code.strip()
        else:
            print(f"❌ 생성 실패: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return None

def optimize_seo(game_idea, html_code):
    """SEO 최적화 (메타 태그, Schema.org 추가)"""
    print(f"[2/4] SEO 최적화 중...")
    
    seo_meta = f"""
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{game_idea['description']} - 무료 온라인 게임">
    <meta name="keywords" content="{', '.join(game_idea['keywords'])}, 무료게임, HTML5게임">
    <meta property="og:title" content="{game_idea['name']} - 무료 온라인 게임">
    <meta property="og:description" content="{game_idea['description']}">
    <meta property="og:type" content="game">
    <title>{game_idea['name']} - 무료 온라인 게임</title>
    
    <!-- Schema.org 마크업 -->
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": "{game_idea['name']}",
      "description": "{game_idea['description']}",
      "gamePlatform": "웹 브라우저",
      "genre": "퍼즐",
      "offers": {{
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "KRW"
      }}
    }}
    </script>
"""
    
    # <head> 태그 안에 삽입
    if '<head>' in html_code:
        html_code = html_code.replace('<head>', f'<head>\n{seo_meta}')
    elif '<HEAD>' in html_code:
        html_code = html_code.replace('<HEAD>', f'<HEAD>\n{seo_meta}')
    
    print(f"✅ SEO 메타 태그 추가 완료")
    return html_code

def insert_adsense_code(html_code):
    """애드센스 광고 코드 삽입"""
    print(f"[3/4] 애드센스 광고 공간 준비 중...")
    
    if not ADSENSE_CLIENT:
        print(f"⚠️  애드센스 코드 미입력 (나중에 추가 가능)")
        return html_code
    
    # 광고 코드 템플릿
    ad_code = f"""
    <!-- Google AdSense -->
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="{ADSENSE_CLIENT}"
         data-ad-slot="AUTO"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>
         (adsbygoogle = window.adsbygoogle || []).push({{}});
    </script>
"""
    
    # ad-space 클래스를 실제 광고로 교체
    html_code = html_code.replace(
        '<div class="ad-space"></div>',
        ad_code
    )
    
    print(f"✅ 애드센스 코드 삽입 완료")
    return html_code

def publish_to_wordpress(game_idea, html_code):
    """WordPress에 페이지로 게시"""
    print(f"[4/4] WordPress에 게시 중...")
    
    page_data = {
        "title": f"{game_idea['name']} - 무료 온라인 게임",
        "content": html_code,
        "status": "publish",
        "slug": game_idea['slug'],
        "meta": {
            "_wp_page_template": "default"
        }
    }
    
    try:
        response = requests.post(
            f"{WP_URL}/wp-json/wp/v2/pages",
            auth=HTTPBasicAuth(WP_USER, WP_PASSWORD),
            json=page_data,
            timeout=30
        )
        
        if response.status_code == 201:
            page_url = response.json()['link']
            print(f"✅ 게시 완료!")
            print(f"   URL: {page_url}")
            return page_url
        else:
            print(f"❌ 게시 실패: {response.status_code}")
            print(f"   응답: {response.text[:200]}")
            return None
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return None

def main():
    """메인 실행 함수"""
    print("=" * 50)
    print("🎮 게임 자동 생성 시작")
    print("=" * 50)
    
    # 연결 확인
    if not check_ollama_connection():
        return
    
    if not check_wordpress_connection():
        return
    
    print(f"\n[3단계] 게임 생성 시작...")
    print(f"총 {len(GAME_IDEAS)}개 게임 생성 예정\n")
    
    success_count = 0
    
    for i, game_idea in enumerate(GAME_IDEAS, 1):
        print("=" * 50)
        print(f"🎮 게임 {i}/{len(GAME_IDEAS)}: {game_idea['name']}")
        print("=" * 50)
        
        # 1. 게임 코드 생성
        html_code = generate_game_code(game_idea)
        if not html_code:
            print(f"⚠️  {game_idea['name']} 생성 실패, 다음으로...")
            continue
        
        # 2. SEO 최적화
        html_code = optimize_seo(game_idea, html_code)
        
        # 3. 애드센스 코드 삽입
        html_code = insert_adsense_code(html_code)
        
        # 4. WordPress 게시
        page_url = publish_to_wordpress(game_idea, html_code)
        if page_url:
            success_count += 1
        
        print(f"\n⏳ 다음 게임까지 5초 대기...")
        time.sleep(5)
    
    print("\n" + "=" * 50)
    print(f"🎉 생성 완료!")
    print(f"   성공: {success_count}/{len(GAME_IDEAS)}개")
    print(f"   확인: {WP_URL}/wp-admin/edit.php?post_type=page")
    print("=" * 50)

if __name__ == "__main__":
    main()
