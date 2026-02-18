"""
Playwright로 timing-game 단계별 스크린샷 촬영.
저장: content/games/timing-game/screenshots/01-nickname.png ~ 09-round-result.png (9장).

실행 (프로젝트 루트에서):
  python screenshot-capture/capture_timing_game_screenshots.py

로컬 서버 필요: python3 -m http.server 8765
Supabase 미연동 시 01~04만 촬영 가능, 05~09는 대기실/라운드 UI 재현으로 촬영.
"""

import os
import sys

_script_dir = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_script_dir)
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)

OUT_DIR = os.path.join(_root, "content", "games", "timing-game", "screenshots")
BASE_URL = "http://localhost:8765/content/games/timing-game/"


def main():
    """timing-game 단계별 스크린샷을 촬영해 content/games/timing-game/screenshots/에 저장한다."""
    from playwright.sync_api import sync_playwright, Error as PlaywrightError

    os.makedirs(OUT_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        try:
            page.goto(BASE_URL, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1500)

            # 1) 닉네임 화면 – 닉네임 입력 후 촬영
            page.locator("#input-nickname").fill("나")
            page.wait_for_timeout(300)
            page.screenshot(path=os.path.join(OUT_DIR, "01-nickname.png"))
            print("저장: 01-nickname.png")

            # 2) 방 만들기 화면 – 방 제목 입력 후 촬영
            page.evaluate(
                """() => {
              document.querySelectorAll('.game-page-wrapper .screen').forEach(el => el.classList.add('hidden'));
              var create = document.getElementById('screen-create');
              if (create) create.classList.remove('hidden');
            }"""
            )
            page.wait_for_timeout(300)
            page.locator("#input-room-name").fill("10초 맞추기")
            page.wait_for_timeout(300)
            page.screenshot(path=os.path.join(OUT_DIR, "02-create.png"))
            print("저장: 02-create.png")

            # 3) 방 만들기 완료 – 6자리 코드 표시
            page.evaluate(
                """() => {
              document.querySelectorAll('.game-page-wrapper .screen').forEach(el => el.classList.add('hidden'));
              var done = document.getElementById('screen-create-done');
              if (done) done.classList.remove('hidden');
              var codeEl = document.getElementById('display-room-code');
              if (codeEl) codeEl.textContent = '123456';
            }"""
            )
            page.wait_for_timeout(400)
            page.screenshot(path=os.path.join(OUT_DIR, "03-create-done.png"))
            print("저장: 03-create-done.png")

            # 4) 방 들어가기 – 친구가 입장코드 123456 입력
            page.evaluate(
                """() => {
              document.querySelectorAll('.game-page-wrapper .screen').forEach(el => el.classList.add('hidden'));
              var join = document.getElementById('screen-join');
              if (join) join.classList.remove('hidden');
              var input = document.getElementById('input-join-code');
              if (input) input.value = '123456';
            }"""
            )
            page.wait_for_timeout(400)
            page.screenshot(path=os.path.join(OUT_DIR, "04-join.png"))
            print("저장: 04-join.png")

            # 5) 대기실 화면 – 참가자 2명(방장+친구) 실제 플레이처럼
            page.evaluate(
                """() => {
              document.querySelectorAll('.game-page-wrapper .screen').forEach(el => el.classList.add('hidden'));
              var lobby = document.getElementById('screen-lobby');
              if (lobby) lobby.classList.remove('hidden');
              var h2 = document.getElementById('lobby-room-name');
              if (h2) h2.textContent = '10초 맞추기';
              var ul = document.getElementById('lobby-players');
              if (ul) {
                ul.innerHTML = '';
                ['나', '친구'].forEach(function(name, i) {
                  var li = document.createElement('li');
                  if (i === 0) li.classList.add('me');
                  var num = i + 1;
                  var numSpan = document.createElement('span');
                  numSpan.className = 'lobby-player-num num-' + num;
                  numSpan.textContent = 'P' + num;
                  li.appendChild(numSpan);
                  li.appendChild(document.createTextNode(' ' + name));
                  if (i === 0) {
                    var hostSpan = document.createElement('span');
                    hostSpan.className = 'lobby-player-host';
                    var hostImg = document.createElement('img');
                    hostImg.src = 'images/host-icon.png';
                    hostImg.alt = '방장';
                    hostImg.className = 'lobby-player-host-icon';
                    hostSpan.appendChild(hostImg);
                    li.appendChild(hostSpan);
                  }
                  ul.appendChild(li);
                });
              }
              var btn = document.querySelector('#screen-lobby .host-only');
              if (btn) btn.classList.remove('hidden');
            }"""
            )
            page.wait_for_timeout(400)
            page.screenshot(path=os.path.join(OUT_DIR, "05-lobby.png"))
            print("저장: 05-lobby.png")

            # 6) 카운트다운 모달 – 3, 2, 1, 배경(라운드 UI)이 흐리게 보이도록
            page.evaluate(
                """() => {
              document.querySelectorAll('.game-page-wrapper .screen').forEach(el => el.classList.add('hidden'));
              var round = document.getElementById('screen-round');
              if (round) round.classList.remove('hidden');
              var msg = document.getElementById('round-target-msg');
              if (msg) { msg.textContent = '10초에 맞춰 누르세요.'; msg.style.display = ''; }
              var timer = document.getElementById('round-live-timer');
              if (timer) { timer.textContent = '00:00'; timer.classList.remove('hidden'); timer.style.display = ''; }
              var container = document.getElementById('round-player-zones');
              if (container) {
                container.className = 'round-player-zones count-2';
                container.innerHTML = '';
                [{name: '나', me: true}, {name: '친구', me: false}].forEach(function(p, i) {
                  var slot = document.createElement('div');
                  slot.className = 'round-player-slot';
                  var zone = document.createElement('div');
                  zone.className = 'round-player-zone' + (p.me ? ' me' : '');
                  var nameEl = document.createElement('div');
                  nameEl.className = 'round-zone-name';
                  var num = i + 1;
                  var pNum = document.createElement('span');
                  pNum.className = 'round-zone-p-num num-' + num;
                  pNum.textContent = 'P' + num;
                  nameEl.appendChild(pNum);
                  nameEl.appendChild(document.createTextNode(' ' + p.name));
                  zone.appendChild(nameEl);
                  var winsEl = document.createElement('div');
                  winsEl.className = 'round-zone-wins';
                  winsEl.textContent = 'Win: ' + (i === 0 ? 1 : 0);
                  zone.appendChild(winsEl);
                  var timeEl = document.createElement('div');
                  timeEl.className = 'round-zone-time';
                  timeEl.style.display = 'none';
                  zone.appendChild(timeEl);
                  var errEl = document.createElement('div');
                  errEl.className = 'round-zone-error';
                  errEl.style.display = 'none';
                  zone.appendChild(errEl);
                  slot.appendChild(zone);
                  container.appendChild(slot);
                });
              }
              var btn = document.getElementById('btn-press');
              if (btn) { btn.disabled = false; btn.textContent = '누르기'; btn.classList.remove('hidden'); btn.style.display = ''; }
              var endActions = document.getElementById('round-end-actions');
              if (endActions) endActions.classList.add('hidden');
              var overlay = document.getElementById('round-countdown-overlay');
              var countdownEl = document.getElementById('round-countdown');
              if (overlay) overlay.classList.remove('hidden');
              if (countdownEl) countdownEl.textContent = '2';
            }"""
            )
            page.wait_for_timeout(400)
            page.screenshot(path=os.path.join(OUT_DIR, "06-countdown.png"))
            print("저장: 06-countdown.png")

            # 7·8) 라운드 화면 – 목표 초, 타이머(00:02 → ??:??), 2인 플레이 구역, 누르기 버튼
            page.evaluate(
                """() => {
              document.querySelectorAll('.game-page-wrapper .screen').forEach(el => el.classList.add('hidden'));
              var round = document.getElementById('screen-round');
              if (round) round.classList.remove('hidden');
              var overlay = document.getElementById('round-countdown-overlay');
              if (overlay) overlay.classList.add('hidden');
              var msg = document.getElementById('round-target-msg');
              if (msg) { msg.textContent = '10초에 맞춰 누르세요.'; msg.style.display = ''; }
              var timer = document.getElementById('round-live-timer');
              if (timer) { timer.classList.remove('hidden'); timer.style.display = ''; }
              var container = document.getElementById('round-player-zones');
              if (container) {
                container.className = 'round-player-zones count-2';
                container.innerHTML = '';
                [{name: '나', me: true}, {name: '친구', me: false}].forEach(function(p, i) {
                  var slot = document.createElement('div');
                  slot.className = 'round-player-slot';
                  var zone = document.createElement('div');
                  zone.className = 'round-player-zone' + (p.me ? ' me' : '');
                  var nameEl = document.createElement('div');
                  nameEl.className = 'round-zone-name';
                  var num = i + 1;
                  var pNum = document.createElement('span');
                  pNum.className = 'round-zone-p-num num-' + num;
                  pNum.textContent = 'P' + num;
                  nameEl.appendChild(pNum);
                  nameEl.appendChild(document.createTextNode(' ' + p.name));
                  zone.appendChild(nameEl);
                  var winsEl = document.createElement('div');
                  winsEl.className = 'round-zone-wins';
                  winsEl.textContent = 'Win: 0';
                  zone.appendChild(winsEl);
                  var timeEl = document.createElement('div');
                  timeEl.className = 'round-zone-time';
                  timeEl.style.display = 'none';
                  zone.appendChild(timeEl);
                  var errEl = document.createElement('div');
                  errEl.className = 'round-zone-error';
                  errEl.style.display = 'none';
                  zone.appendChild(errEl);
                  slot.appendChild(zone);
                  container.appendChild(slot);
                });
              }
              var btn = document.getElementById('btn-press');
              if (btn) { btn.disabled = false; btn.textContent = '누르기'; btn.classList.remove('hidden'); btn.style.display = ''; }
              var endActions = document.getElementById('round-end-actions');
              if (endActions) endActions.classList.add('hidden');
            }"""
            )
            page.wait_for_timeout(400)
            # 5) 3초 전까지 보이는 실시간 타이머(예: 00:02)
            page.evaluate(
                """() => {
              var timer = document.getElementById('round-live-timer');
              if (timer) { timer.textContent = '00:02'; timer.style.display = ''; }
            }"""
            )
            page.wait_for_timeout(300)
            page.screenshot(path=os.path.join(OUT_DIR, "07-round-timer.png"))
            print("저장: 07-round-timer.png")

            # 8) 3초 이후 ??:??로 바뀜
            page.evaluate(
                """() => {
              var timer = document.getElementById('round-live-timer');
              if (timer) { timer.textContent = '??:??'; timer.style.display = ''; }
            }"""
            )
            page.wait_for_timeout(300)
            page.screenshot(path=os.path.join(OUT_DIR, "08-round.png"))
            print("저장: 08-round.png")

            # 9) 라운드 결과 화면 – 실제 앱과 동일: slot.insertBefore(winBadge, zone), CSS로 위쪽 중앙
            page.evaluate(
                """() => {
              var timer = document.getElementById('round-live-timer');
              if (timer) { timer.textContent = '??:??'; timer.style.display = ''; }
              var container = document.getElementById('round-player-zones');
              if (container && container.querySelectorAll('.round-player-zone').length >= 2) {
                var zones = container.querySelectorAll('.round-player-zone');
                var times = ['10:02', '10:05'];
                var errors = ['오차: +0.02', '오차: +0.05'];
                zones.forEach(function(zone, i) {
                  var te = zone.querySelector('.round-zone-time');
                  var ee = zone.querySelector('.round-zone-error');
                  var winsEl = zone.querySelector('.round-zone-wins');
                  if (te) { te.textContent = times[i] || ''; te.style.display = ''; }
                  if (ee) { ee.textContent = errors[i] || ''; ee.style.display = ''; }
                  if (winsEl) winsEl.textContent = 'Win: ' + (i === 0 ? 1 : 0);
                });
              }
              var btn = document.getElementById('btn-press');
              if (btn) btn.style.display = 'none';
              var endActions = document.getElementById('round-end-actions');
              if (endActions) endActions.classList.remove('hidden');
              var msg = document.getElementById('round-target-msg');
              if (msg) msg.style.display = 'none';
              var timer = document.getElementById('round-live-timer');
              if (timer) timer.style.display = 'none';
            }"""
            )
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(OUT_DIR, "09-round-result.png"))
            print("저장: 09-round-result.png")
        except (TimeoutError, OSError, PlaywrightError) as e:
            print(f"오류: {e}")
        finally:
            browser.close()

    print(f"스크린샷 경로: {OUT_DIR}")


if __name__ == "__main__":
    main()
