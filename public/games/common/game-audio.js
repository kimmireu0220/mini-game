/**
 * 게임 공통 오디오: BGM, 승리 효과음(win.mp3), BGM 토글 버튼 연동
 * 각 게임은 state에 bgmMuted, bgmRoundIndex, roundBgmAudio(또는 timerBgmAudio) 보관
 */
(function (global) {
  "use strict";

  var BGM_SOURCES = [
    "../common/sounds/bgm/game-bgm-1.mp3",
    "../common/sounds/bgm/game-bgm-2.mp3",
    "../common/sounds/bgm/game-bgm-3.mp3",
    "../common/sounds/bgm/game-bgm-4.mp3",
    "../common/sounds/bgm/game-bgm-5.mp3",
    "../common/sounds/bgm/game-bgm-6.mp3"
  ];
  var BGM_VOLUME = 0.3;
  var WIN_SOUND_PATH = "../common/sounds/win.mp3";

  function hashStringToIndex(str, max) {
    if (max <= 0) return 0;
    var h = 0;
    for (var i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
    return Math.abs(h) % max;
  }

  /**
   * 라운드 BGM 재생
   * @param {Object} state - bgmMuted, bgmRoundIndex, currentRound(optional), 그리고 audioKey에 해당하는 오디오 참조
   * @param {Object} opts - { audioKey: 'roundBgmAudio'|'timerBgmAudio', afterPlay: function(playPromise) }
   */
  function startRoundBgm(state, opts) {
    opts = opts || {};
    var audioKey = opts.audioKey || "roundBgmAudio";
    var audio = state[audioKey];
    if (audio) {
      audio.pause();
      audio = null;
      state[audioKey] = null;
    }
    if (!BGM_SOURCES.length) return;
    try {
      var bgmIdx = (state.currentRound && state.currentRound.id != null)
        ? hashStringToIndex(String(state.currentRound.id), BGM_SOURCES.length)
        : (state.bgmRoundIndex % BGM_SOURCES.length);
      state.bgmRoundIndex = (state.bgmRoundIndex || 0) + 1;
      var src = BGM_SOURCES[bgmIdx];
      if (src) {
        audio = new global.Audio(src);
        audio.loop = true;
        audio.volume = BGM_VOLUME;
        state[audioKey] = audio;
        if (!state.bgmMuted) {
          var p = audio.play();
          if (p && typeof p.catch === "function") p.catch(function () {});
          if (opts.afterPlay && p) opts.afterPlay(p);
        }
      }
    } catch (e) {}
  }

  /**
   * 라운드 BGM 정지
   * @param {Object} state
   * @param {Object} opts - { audioKey: 'roundBgmAudio'|'timerBgmAudio' }
   */
  function stopRoundBgm(state, opts) {
    opts = opts || {};
    var audioKey = opts.audioKey || "roundBgmAudio";
    var audio = state[audioKey];
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
      state[audioKey] = null;
    }
  }

  function playWinSound() {
    try {
      var a = new global.Audio(WIN_SOUND_PATH);
      a.play();
    } catch (e) {}
  }

  /**
   * BGM 토글 버튼 + 부모창 postMessage 연동
   * @param {Object} state - bgmMuted, audioKey에 해당하는 오디오
   * @param {Object} opts - { audioKey: 'roundBgmAudio'|'timerBgmAudio', imagesBase: '../../images' }
   */
  function setupBgmButton(state, opts) {
    opts = opts || {};
    var audioKey = opts.audioKey || "roundBgmAudio";
    var imagesBase = opts.imagesBase !== undefined ? opts.imagesBase : "../../images";

    function updateBgmButton() {
      var btn = document.getElementById("btn-bgm-toggle");
      if (!btn) return;
      var img = btn.querySelector("img");
      if (state.bgmMuted) {
        btn.classList.add("muted");
        if (img) img.src = imagesBase + "/bgm-off.png";
      } else {
        btn.classList.remove("muted");
        if (img) img.src = imagesBase + "/bgm-on.png";
      }
    }

    var btnBgm = document.getElementById("btn-bgm-toggle");
    if (btnBgm) {
      btnBgm.onclick = function () {
        state.bgmMuted = !state.bgmMuted;
        updateBgmButton();
        var audio = state[audioKey];
        if (audio) {
          if (state.bgmMuted) audio.pause();
          else {
            var p = audio.play();
            if (p && typeof p.catch === "function") p.catch(function () {});
          }
        }
        try {
          if (global.window.parent && global.window.parent !== global.window) {
            global.window.parent.postMessage({ type: "setBgmMuted", value: state.bgmMuted }, "*");
          }
        } catch (err) {}
      };
    }

    global.window.addEventListener("message", function (e) {
      if (e.data && e.data.type === "setBgmMuted") {
        state.bgmMuted = e.data.value;
        updateBgmButton();
        var audio = state[audioKey];
        if (audio) {
          if (state.bgmMuted) audio.pause();
          else {
            var p = audio.play();
            if (p && typeof p.catch === "function") p.catch(function () {});
          }
        }
      }
    });
    updateBgmButton();
  }

  var w = global.window || global;
  w.GameAudio = w.GameAudio || {};
  w.GameAudio.BGM_SOURCES = BGM_SOURCES;
  w.GameAudio.BGM_VOLUME = BGM_VOLUME;
  w.GameAudio.WIN_SOUND_PATH = WIN_SOUND_PATH;
  w.GameAudio.hashStringToIndex = hashStringToIndex;
  w.GameAudio.startRoundBgm = startRoundBgm;
  w.GameAudio.stopRoundBgm = stopRoundBgm;
  w.GameAudio.playWinSound = playWinSound;
  w.GameAudio.setupBgmButton = setupBgmButton;
})(typeof window !== "undefined" ? window : this);
