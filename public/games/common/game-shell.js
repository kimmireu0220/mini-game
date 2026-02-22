/**
 * 공통 게임 셸: 공통 마크업을 #app에 주입.
 * 각 게임의 index.html은 <div id="app"></div>만 두고, 이 스크립트 로드 후 config/state/app.js가 동작한다.
 * BGM·새로고침 버튼은 iframe 안에 있을 때는 부모(GameLayout)에만 있으므로 여기선 넣지 않음.
 */
(function () {
  var isEmbedded = (function () {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();
  var buttonWrap = isEmbedded
    ? ""
    : '<div class="game-bgm-toggle-wrap">'
    + '<button type="button" id="btn-refresh" title="새로고침"><img src="../../images/reload.png" alt="새로고침" class="btn-refresh-icon"></button>'
    + '<button type="button" id="btn-bgm-toggle" title="배경음악"><img src="../../images/bgm-on.png" alt="BGM"></button>'
    + '</div>';
  var GAME_SHELL_HTML =
    '<div class="game-page-wrapper">'
    + buttonWrap
    + '  <div id="screen-nickname" class="screen">'
    + '    <label class="screen-form-label" for="nickname-display-text">닉네임</label>'
    + '    <div id="nickname-display-text" class="screen-field" role="textbox" aria-readonly="true"></div>'
    + '    <div class="button-row">'
    + '      <button type="button" id="btn-create-room">방 만들기</button>'
    + '      <button type="button" id="btn-join-room">방 들어가기</button>'
    + '    </div>'
    + '  </div>'
    + '  <div id="screen-create" class="screen hidden">'
    + '    <label class="screen-form-label" for="input-room-name">방 제목 (선택)</label>'
    + '    <input type="text" id="input-room-name" class="screen-field" maxlength="50" placeholder="비워두면 기본 제목 사용">'
    + '    <div class="button-row">'
    + '      <button type="button" id="btn-create-submit">방 만들기</button>'
    + '      <button type="button" id="btn-back-from-create">뒤로</button>'
    + '    </div>'
    + '  </div>'
    + '  <div id="screen-create-done" class="screen hidden">'
    + '    <p>방이 만들어졌어요. 코드를 공유하세요.</p>'
    + '    <p class="room-code" id="display-room-code"></p>'
    + '    <button type="button" id="btn-enter-lobby">대기실로</button>'
    + '  </div>'
    + '  <div id="screen-join" class="screen hidden">'
    + '    <label class="screen-form-label" for="input-join-code">방 코드</label>'
    + '    <input type="text" id="input-join-code" class="screen-field" maxlength="6" placeholder="6자리 코드" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code">'
    + '    <div class="button-row">'
    + '      <button type="button" id="btn-join-submit">입장</button>'
    + '      <button type="button" id="btn-back-from-join">뒤로</button>'
    + '    </div>'
    + '  </div>'
    + '  <div id="screen-lobby" class="screen hidden">'
    + '    <h2 id="lobby-room-name"></h2>'
    + '    <ul id="lobby-players"></ul>'
    + '    <p id="lobby-notice" class="lobby-notice hidden"></p>'
    + '    <div class="button-row">'
    + '      <button type="button" id="btn-start-round" class="host-only hidden">시작</button>'
    + '      <button type="button" id="btn-leave-room">나가기</button>'
    + '    </div>'
    + '  </div>'
    + '  <div id="screen-round" class="screen hidden">'
    + '    <div id="round-gameplay-slot"></div>'
    + '    <div id="round-result-section" class="round-result-section hidden">'
    + '      <h2 id="round-result-title" class="round-result-title">게임 결과</h2>'
    + '      <div id="round-result-zones" class="round-player-zones"></div>'
    + '      <div class="button-row">'
    + '        <button type="button" id="btn-round-play-again" class="host-only hidden">다시 하기</button>'
    + '        <button type="button" id="btn-round-leave">나가기</button>'
    + '      </div>'
    + '    </div>'
    + '  </div>'
    + '</div>';

  function showScreen(id) {
    document.querySelectorAll(".game-page-wrapper .screen").forEach(function (el) {
      el.classList.add("hidden");
    });
    var el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  var app = document.getElementById("app");
  if (app) app.innerHTML = GAME_SHELL_HTML;

  window.GameShell = window.GameShell || {};
  window.GameShell.showScreen = showScreen;
})();
