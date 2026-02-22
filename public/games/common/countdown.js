/**
 * 공통 N~1 카운트다운 (타이밍 게임, 업다운 게임 등)
 * 사용: GameCountdown.run({ countFrom?: number, displayFrom?: number, startAt?, getServerTime?(), onComplete })
 * - countFrom: 총 카운트다운 초. 기본 4 (startAt 없을 때 durationMs)
 * - displayFrom: 화면에 보여줄 숫자만. 예: 4초 카운트인데 displayFrom 3이면 4는 안 보이고 3,2,1만 표시 (remaining>3000이어도 3 표시)
 * - startAt 있으면 서버 시각 기준 동기화
 */
(function () {
  "use strict";

  var BEEP_FREQ_COUNTDOWN = 880;
  var BEEP_FREQ_GO = 1320;
  var BEEP_DURATION_MS = 120;
  var BEEP_DURATION_GO_MS = 180;
  /** countFrom(숫자)로 N~1 카운트다운 단계 생성. 예: countFrom 4 → 4,3,2,1 (각 1초) */
  function buildStepsFromCount(countFrom) {
    var n = Math.max(1, Math.floor(countFrom));
    var steps = [];
    for (var i = n; i >= 1; i--) steps.push({ ms: (i - 1) * 1000, num: i });
    return steps;
  }
  /** displayFrom만 보이게, 총 duration은 countFrom초. 예: countFrom 4, displayFrom 3 → remaining>2000이면 3, >1000이면 2, >0이면 1 (4는 안 뜸) */
  function buildStepsDisplayOnly(countFrom, displayFrom) {
    var n = Math.max(1, Math.floor(displayFrom));
    var steps = [];
    for (var i = 0; i < n; i++) {
      steps.push({ ms: (n - 1 - i) * 1000, num: n - i });
    }
    return steps;
  }

  var audioContext = null;

  function playBeep(freq, durationMs) {
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      var ctx = audioContext;
      if (ctx.state === "suspended") ctx.resume();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq || BEEP_FREQ_COUNTDOWN;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (durationMs || BEEP_DURATION_MS) / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + (durationMs || BEEP_DURATION_MS) / 1000);
    } catch (e) {}
  }

  /**
   * 오버레이 DOM을 container에 추가하고 반환.
   * id: round-countdown-overlay, 숫자 요소 클래스: round-countdown-num
   */
  function ensureOverlay(container) {
    var overlay = document.getElementById("round-countdown-overlay");
    if (overlay) return { overlay: overlay, textEl: overlay.querySelector(".round-countdown-num") };
    if (!container) container = document.body;
    overlay = document.createElement("div");
    overlay.id = "round-countdown-overlay";
    overlay.className = "round-countdown-overlay hidden";
    var textEl = document.createElement("p");
    textEl.className = "round-countdown-num";
    overlay.appendChild(textEl);
    container.appendChild(overlay);
    return { overlay: overlay, textEl: textEl };
  }

  /**
   * options: {
   *   container?: Element,
   *   countFrom?: number,   // 총 카운트다운 초. 기본 4
   *   displayFrom?: number, // 화면에만 보여줄 숫자. 예: 3이면 4초인데 3,2,1만 표시 (4 안 뜸)
   *   startAt?: number,     // 서버 시각(ms). 있으면 getServerTime으로 동기화
   *   durationMs?: number, // startAt 없을 때 길이(ms). countFrom 있으면 countFrom*1000
   *   getServerTime?: function(): Promise<{serverNowMs, clientNowMs}>,
   *   onComplete: function()
   * }
   */
  function run(options) {
    var container = options.container || document.body;
    var onComplete = options.onComplete;
    if (typeof onComplete !== "function") return;

    var countFrom = options.countFrom != null ? options.countFrom : 4;
    var displayFrom = options.displayFrom != null ? options.displayFrom : countFrom;
    var steps = (displayFrom < countFrom)
      ? buildStepsDisplayOnly(countFrom, displayFrom)
      : buildStepsFromCount(countFrom);
    var durationMs = options.durationMs != null ? options.durationMs : countFrom * 1000;

    var startAt = options.startAt;
    var getServerTime = options.getServerTime;
    var serverOffsetMs = 0;

    var pair = ensureOverlay(container);
    var overlay = pair.overlay;
    var textEl = pair.textEl;
    textEl.textContent = "";
    overlay.classList.remove("hidden");

    function finish() {
      overlay.classList.add("hidden");
      textEl.textContent = "";
      onComplete();
    }

    function runWithStartAt() {
      var countdownIntervalId = null;
      var lastNum = null;
      countdownIntervalId = setInterval(function () {
        var remaining = startAt - (Date.now() + serverOffsetMs);
        var i;
        for (i = 0; i < steps.length; i++) {
          if (remaining > steps[i].ms) {
            if (lastNum !== steps[i].num) {
              lastNum = steps[i].num;
              playBeep(BEEP_FREQ_COUNTDOWN, BEEP_DURATION_MS);
            }
            textEl.textContent = String(steps[i].num);
            return;
          }
        }
        if (lastNum !== 0) {
          lastNum = 0;
          playBeep(BEEP_FREQ_GO, BEEP_DURATION_GO_MS);
        }
        if (countdownIntervalId != null) {
          clearInterval(countdownIntervalId);
          countdownIntervalId = null;
        }
        overlay.classList.add("hidden");
        textEl.textContent = "";
      }, 50);
      setTimeout(function () {
        if (countdownIntervalId != null) clearInterval(countdownIntervalId);
        finish();
      }, Math.max(0, startAt - (Date.now() + serverOffsetMs)));
    }

    if (startAt != null && typeof getServerTime === "function") {
      getServerTime()
        .then(function (t) {
          serverOffsetMs = (t.serverNowMs - t.clientNowMs) || 0;
          var delay = Math.max(0, startAt - t.serverNowMs);
          if (delay <= 0) return finish();
          runWithStartAt();
        })
        .catch(function () {
          var delay = Math.max(0, startAt - Date.now());
          if (delay <= 0) return finish();
          runWithStartAt();
        });
      return;
    }

    if (startAt != null) {
      serverOffsetMs = 0;
      if (startAt <= Date.now()) return finish();
      runWithStartAt();
      return;
    }

    startAt = Date.now() + durationMs;
    serverOffsetMs = 0;
    runWithStartAt();
  }

  window.GameCountdown = {
    ensureOverlay: ensureOverlay,
    run: run
  };
})();
