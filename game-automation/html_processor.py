"""
HTML 후처리: SEO 메타/Schema, 애드센스 삽입
"""

import re

import config


def optimize_seo(game_idea, html_code):
    """SEO 메타 태그·Schema.org 마크업 삽입"""
    print("[2/4] SEO 최적화 중...")

    genre = game_idea.get("genre", "퍼즐")
    seo_meta = f"""
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{game_idea["description"]} - 무료 온라인 게임">
    <meta name="keywords" content="{", ".join(game_idea["keywords"])}, 무료게임, HTML5게임">
    <meta property="og:title" content="{game_idea["name"]} - 무료 온라인 게임">
    <meta property="og:description" content="{game_idea["description"]}">
    <meta property="og:type" content="game">
    <title>{game_idea["name"]} - 무료 온라인 게임</title>
    
    <!-- Schema.org 마크업 -->
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": "{game_idea["name"]}",
      "description": "{game_idea["description"]}",
      "gamePlatform": "웹 브라우저",
      "genre": "{genre}",
      "offers": {{
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "KRW"
      }}
    }}
    </script>
"""

    if "<head>" in html_code:
        html_code = html_code.replace("<head>", f"<head>\n{seo_meta}", 1)
    elif "<HEAD>" in html_code:
        html_code = html_code.replace("<HEAD>", f"<HEAD>\n{seo_meta}", 1)
    else:
        match = re.search(r"<html[^>]*>", html_code, re.IGNORECASE)
        if match:
            pos = match.end()
            html_code = (
                html_code[:pos]
                + "\n<head>\n"
                + seo_meta.strip()
                + "\n</head>"
                + html_code[pos:]
            )
        else:
            html_code = seo_meta.strip() + "\n" + html_code

    print("✅ SEO 메타 태그 추가 완료")
    return html_code


def insert_adsense(html_code):
    """애드센스 광고 코드 삽입 (3곳 슬롯 구분)"""
    print("[3/4] 애드센스 광고 공간 준비 중...")

    if not config.ADSENSE_CLIENT:
        print("⚠️  애드센스 코드 미입력 (나중에 추가 가능)")
        return html_code

    ad_placeholder = '<div class="ad-space"></div>'
    slots = (config.ADSENSE_SLOTS + ["AUTO", "AUTO", "AUTO"])[:3]
    for i, slot in enumerate(slots):
        ad_code = f"""
    <!-- Google AdSense #{i + 1} -->
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="{config.ADSENSE_CLIENT}"
         data-ad-slot="{slot}"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>
         (adsbygoogle = window.adsbygoogle || []).push({{}});
    </script>
"""
        html_code = html_code.replace(ad_placeholder, ad_code, 1)

    print("✅ 애드센스 코드 삽입 완료")
    return html_code
