(function () {
  "use strict";

  var NumberOrderGame = window.NumberOrderGame;
  var state = NumberOrderGame.state;
  var getConfig = NumberOrderGame.getConfig;
  var getSupabase = NumberOrderGame.getSupabase;
  var getNickname = NumberOrderGame.getNickname;
  var setNickname = NumberOrderGame.setNickname;
  var generateRoomCode = NumberOrderGame.generateRoomCode;
  var cleanupSubscriptions = NumberOrderGame.cleanupSubscriptions;

  var ROUND_RESULT_TIMEOUT_MS = 35000;
  var GRID_TIMEOUT_MS = 30000;

  var BGM_SOURCES = ["../common/sounds/bgm/game-bgm-1.mp3", "../common/sounds/bgm/game-bgm-2.mp3", "../common/sounds/bgm/game-bgm-3.mp3", "../common/sounds/bgm/game-bgm-4.mp3", "../common/sounds/bgm/game-bgm-5.mp3", "../common/sounds/bgm/game-bgm-6.mp3"];
  var BGM_VOLUME = 0.3;

  function hashStringToIndex(str, max) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
    return Math.abs(h) % max;
  }

  function startRoundBgm() {
    if (state.roundBgmAudio) {
      state.roundBgmAudio.pause();
      state.roundBgmAudio = null;
    }
    if (!BGM_SOURCES.length) return;
    try {
      var bgmIdx = (state.currentRound && state.currentRound.id != null)
        ? hashStringToIndex(String(state.currentRound.id), BGM_SOURCES.length)
        : (state.bgmRoundIndex % BGM_SOURCES.length);
      state.bgmRoundIndex += 1;
      var src = BGM_SOURCES[bgmIdx];
      if (src) {
        state.roundBgmAudio = new Audio(src);
        state.roundBgmAudio.loop = true;
        state.roundBgmAudio.volume = BGM_VOLUME;
        if (!state.bgmMuted) state.roundBgmAudio.play().catch(function () {});
      }
    } catch (e) {}
  }

  function stopRoundBgm() {
    if (state.roundBgmAudio) {
      state.roundBgmAudio.pause();
      state.roundBgmAudio = null;
    }
  }

  function getServerTimeMs() {
    var cfg = getConfig();
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return Promise.reject(new Error("config missing"));
    var clientNow = Date.now();
    return fetch(cfg.SUPABASE_URL + "/functions/v1/get-server-time", {
      method: "GET",
      headers: { Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) return Promise.reject(new Error(data.error));
        var serverNowMs = new Date(data.now).getTime();
        return { serverNowMs: serverNowMs, clientNowMs: clientNow };
      });
  }

  function showScreen(id) {
    document.querySelectorAll(".game-page-wrapper .screen").forEach(function (el) {
      el.classList.add("hidden");
    });
    var el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function init() {
    var sb = getSupabase();
    if (!sb) {
      var row = document.querySelector("#screen-nickname .button-row");
      if (row) row.innerHTML = "<p>Supabase URL과 anon key를 config.example.js에 설정하세요.</p>";
      return;
    }
    state.nickname = getNickname();
    var displayText = document.getElementById("nickname-display-text");
    if (displayText) displayText.textContent = state.nickname || "";

    document.getElementById("btn-create-room").onclick = function () {
      if (!state.nickname) { alert("닉네임을 먼저 홈 화면에서 설정해 주세요."); return; }
      setNickname(state.nickname);
      showScreen("screen-create");
    };
    document.getElementById("btn-join-room").onclick = function () {
      if (!state.nickname) { alert("닉네임을 먼저 홈 화면에서 설정해 주세요."); return; }
      setNickname(state.nickname);
      var params = new URLSearchParams(window.location.search);
      document.getElementById("input-join-code").value = params.get("code") || "";
      showScreen("screen-join");
    };
    document.getElementById("btn-back-from-create").onclick = function () { showScreen("screen-nickname"); };
    document.getElementById("btn-create-submit").onclick = createRoom;
    document.getElementById("btn-enter-lobby").onclick = function () {
      showScreen("screen-lobby");
      enterLobby();
    };
    document.getElementById("btn-join-submit").onclick = joinRoom;
    document.getElementById("btn-back-from-join").onclick = function () { showScreen("screen-nickname"); };
    document.getElementById("btn-start-round").onclick = startRound;
    document.getElementById("btn-leave-room").onclick = leaveRoom;
    document.getElementById("btn-round-play-again").onclick = playAgain;
    document.getElementById("btn-round-leave").onclick = leaveRoom;
    var btnBgm = document.getElementById("btn-bgm-toggle");
    if (btnBgm) {
      btnBgm.onclick = function () {
        state.bgmMuted = !state.bgmMuted;
        updateBgmButton();
        if (state.roundBgmAudio) {
          if (state.bgmMuted) state.roundBgmAudio.pause();
          else state.roundBgmAudio.play().catch(function () {});
        }
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: "setBgmMuted", value: state.bgmMuted }, "*");
          }
        } catch (err) {}
      };
    }
    function updateBgmButton() {
      var btn = document.getElementById("btn-bgm-toggle");
      if (!btn) return;
      var img = btn.querySelector("img");
      if (state.bgmMuted) {
        btn.classList.add("muted");
        if (img) img.src = "../../images/bgm-off.png";
      } else {
        btn.classList.remove("muted");
        if (img) img.src = "../../images/bgm-on.png";
      }
    }
    window.addEventListener("message", function (e) {
      if (e.data && e.data.type === "setBgmMuted") {
        state.bgmMuted = e.data.value;
        updateBgmButton();
        if (state.roundBgmAudio) {
          if (state.bgmMuted) state.roundBgmAudio.pause();
          else state.roundBgmAudio.play().catch(function () {});
        }
      }
    });
    updateBgmButton();
  }

  function createRoom() {
    if (!state.nickname) { alert("닉네임을 먼저 홈 화면에서 설정해 주세요."); return; }
    setNickname(state.nickname);
    var name = document.getElementById("input-room-name").value.trim() || "대기실";
    var sb = getSupabase();
    if (!sb) return;
    var code = generateRoomCode();
    sb.from("no_rooms")
      .insert({ code: code, name: name, host_client_id: state.clientId })
      .select("id")
      .single()
      .then(function (res) {
        if (res.error) {
          if (res.error.code === "23505") return createRoom();
          alert(res.error.message);
          return;
        }
        var roomId = res.data.id;
        return sb.from("no_room_players")
          .insert({ room_id: roomId, client_id: state.clientId, nickname: state.nickname })
          .then(function (insertRes) {
            if (insertRes.error) { alert(insertRes.error.message); return; }
            state.roomId = roomId;
            state.roomCode = code;
            state.roomName = name;
            state.isHost = true;
            state.hostClientId = state.clientId;
            document.getElementById("display-room-code").textContent = code;
            showScreen("screen-create-done");
          });
      });
  }

  function joinRoom() {
    if (!state.nickname) { alert("닉네임을 먼저 홈 화면에서 설정해 주세요."); return; }
    setNickname(state.nickname);
    var code = document.getElementById("input-join-code").value.trim().replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) { alert("6자리 방 코드를 입력하세요."); return; }
    var sb = getSupabase();
    if (!sb) return;
    sb.from("no_rooms")
      .select("id, name, host_client_id")
      .eq("code", code)
      .is("closed_at", null)
      .single()
      .then(function (res) {
        if (res.error || !res.data) {
          alert("방을 찾을 수 없거나 이미 종료되었습니다.");
          return;
        }
        var room = res.data;
        return sb.from("no_room_players")
          .upsert({ room_id: room.id, client_id: state.clientId, nickname: state.nickname }, { onConflict: "room_id,client_id" })
          .then(function (insertRes) {
            if (insertRes.error) { alert(insertRes.error.message); return; }
            state.roomId = room.id;
            state.roomCode = code;
            state.roomName = room.name || "대기실";
            state.isHost = room.host_client_id === state.clientId;
            state.hostClientId = room.host_client_id;
            showScreen("screen-lobby");
            enterLobby();
          });
      });
  }

  function refreshLobbyPlayers() {
    var sb = getSupabase();
    if (!sb || !state.roomId) return;
    sb.from("no_room_players")
      .select("nickname, client_id")
      .eq("room_id", state.roomId)
      .order("joined_at")
      .then(function (res) {
        var ul = document.getElementById("lobby-players");
        ul.innerHTML = "";
        if (res.data) {
          res.data.forEach(function (p, i) {
            var li = document.createElement("li");
            var num = i + 1;
            var numSpan = document.createElement("span");
            numSpan.className = "lobby-player-num num-" + num;
            numSpan.textContent = "P" + num;
            li.appendChild(numSpan);
            li.appendChild(document.createTextNode(" " + p.nickname));
            if (p.client_id === state.hostClientId) {
              var hostSpan = document.createElement("span");
              hostSpan.className = "lobby-player-host";
              var hostImg = document.createElement("img");
              hostImg.src = "../../images/host-icon.png";
              hostImg.alt = "방장";
              hostImg.className = "lobby-player-host-icon";
              hostSpan.appendChild(hostImg);
              li.appendChild(hostSpan);
            }
            if (p.client_id === state.clientId) li.classList.add("me");
            ul.appendChild(li);
          });
        }
      });
  }

  function enterLobby() {
    var titleEl = document.getElementById("lobby-room-name");
    if (titleEl) titleEl.textContent = "[ " + (state.roomName || "대기실") + " ]";
    refreshLobbyPlayers();
    document.querySelectorAll(".host-only").forEach(function (el) {
      el.classList.toggle("hidden", !state.isHost);
    });
    var noticeEl = document.getElementById("lobby-notice");
    if (noticeEl) {
      noticeEl.textContent = state.isHost ? "" : "방장이 '시작'을 누르면 시작합니다.";
      noticeEl.classList.toggle("hidden", state.isHost);
    }
    setupLobbyChannel();
    var btnStart = document.getElementById("btn-start-round");
    if (btnStart) btnStart.disabled = !state.isHost;
  }

  function setupLobbyChannel() {
    var sb = getSupabase();
    if (!sb || !state.roomId) return;
    var channel = sb.channel("no-room:" + state.roomId);
    var btnStart = document.getElementById("btn-start-round");
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "no_room_players", filter: "room_id=eq." + state.roomId }, refreshLobbyPlayers)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "no_rounds", filter: "room_id=eq." + state.roomId }, function (payload) {
        if (payload.new && payload.new.id) onRoundStarted(payload.new);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "no_rooms", filter: "id=eq." + state.roomId }, function (payload) {
        if (payload.new && payload.new.closed_at) {
          state.roomId = null;
          cleanupSubscriptions();
          showScreen("screen-nickname");
        }
      })
      .subscribe(function (status) {
        if (status === "SUBSCRIBED" && btnStart) btnStart.disabled = !state.isHost;
      });
    state.unsubscribeRoom = function () { sb.removeChannel(channel); };
  }

  function startRound() {
    var sb = getSupabase();
    var cfg = getConfig();
    if (!sb || !state.roomId || !state.isHost) return;
    var btnStart = document.getElementById("btn-start-round");
    if (btnStart) btnStart.disabled = true;
    fetch(cfg.SUPABASE_URL + "/functions/v1/start-number-order-round", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY },
      body: JSON.stringify({ room_id: state.roomId, client_id: state.clientId })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          if (btnStart) btnStart.disabled = false;
          alert(data.error || "시작 실패");
        }
      })
      .catch(function (e) {
        if (btnStart) btnStart.disabled = false;
        alert("시작 실패: " + e.message);
      });
  }

  function onRoundStarted(round) {
    if (state.currentRound && state.currentRound.id === round.id) return;
    state.currentRound = { id: round.id, room_id: round.room_id, start_at: round.start_at };
    state.nextExpected = 1;
    state.tap1Time = null;
    state.tap16Time = null;
    state.durationMs = null;
    state.roundResultOrder = [];
    showScreen("screen-round");
    showRoundContent();
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function ensureRoundDOM() {
    var slot = document.getElementById("round-gameplay-slot");
    if (!slot) return null;
    if (slot.children.length > 0) return slot;
    var wrap = document.createElement("div");
    wrap.id = "number-order-gameplay-wrap";
    var elapsedEl = document.createElement("p");
    elapsedEl.className = "number-order-elapsed";
    elapsedEl.id = "number-order-elapsed";
    elapsedEl.textContent = "00:00";
    wrap.appendChild(elapsedEl);
    var completeMsg = document.createElement("p");
    completeMsg.className = "number-order-complete-msg hidden";
    completeMsg.id = "number-order-complete-msg";
    wrap.appendChild(completeMsg);
    var grid = document.createElement("div");
    grid.className = "number-order-grid";
    grid.id = "number-order-grid";
    var order = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    order.forEach(function (n) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.value = String(n);
      btn.textContent = n;
      btn.onclick = function () {
        var val = parseInt(this.dataset.value, 10);
        handleGridTap(val);
      };
      grid.appendChild(btn);
    });
    wrap.appendChild(grid);
    slot.appendChild(wrap);
    return slot;
  }

  function showRoundContent() {
    var slot = ensureRoundDOM();
    if (!slot) return;
    var grid = document.getElementById("number-order-grid");
    var elapsedEl = document.getElementById("number-order-elapsed");
    var completeMsg = document.getElementById("number-order-complete-msg");
    if (grid) {
      grid.querySelectorAll("button").forEach(function (btn) {
        btn.disabled = true;
      });
    }
    if (elapsedEl) elapsedEl.textContent = "00:00";
    if (completeMsg) { completeMsg.classList.add("hidden"); completeMsg.textContent = ""; }

    var startAtMs = state.currentRound && state.currentRound.start_at ? new Date(state.currentRound.start_at).getTime() : null;
    if (window.GameCountdown && slot) {
      state.countdownActive = true;
      window.GameCountdown.run({
        container: slot,
        countFrom: 4,
        startAt: startAtMs,
        getServerTime: startAtMs ? getServerTimeMs : undefined,
        onComplete: function () {
          state.countdownActive = false;
          state.nextExpected = 1;
          state.tap1Time = null;
          state.tap16Time = null;
          if (grid) {
            grid.querySelectorAll("button").forEach(function (btn) {
              btn.disabled = false;
            });
          }
          startRoundBgm();
          startElapsedTimer();
          startGridTimeout();
          startResultPolling();
        }
      });
    } else {
      state.countdownActive = false;
      if (grid) grid.querySelectorAll("button").forEach(function (btn) { btn.disabled = false; });
      startElapsedTimer();
      startResultPolling();
    }
  }

  var elapsedStartReal = null;

  function startElapsedTimer() {
    if (state.elapsedTimerIntervalId != null) clearInterval(state.elapsedTimerIntervalId);
    elapsedStartReal = Date.now();
    var elapsedEl = document.getElementById("number-order-elapsed");
    if (!elapsedEl) return;
    state.elapsedTimerIntervalId = setInterval(function () {
      if (!elapsedStartReal) return;
      var ms = Date.now() - elapsedStartReal;
      var totalSec = Math.floor(ms / 1000);
      var mm = Math.floor(totalSec / 60);
      var ss = totalSec % 60;
      elapsedEl.textContent = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss;
    }, 100);
  }

  function stopElapsedTimer() {
    if (state.elapsedTimerIntervalId != null) {
      clearInterval(state.elapsedTimerIntervalId);
      state.elapsedTimerIntervalId = null;
    }
  }

  function startGridTimeout() {
    setTimeout(function () {
      if (state.currentRound && state.nextExpected <= 16) {
        var grid = document.getElementById("number-order-grid");
        if (grid) grid.querySelectorAll("button").forEach(function (btn) { btn.disabled = true; });
        stopElapsedTimer();
      }
    }, GRID_TIMEOUT_MS);
  }

  function updateGridPressedState() {
    var grid = document.getElementById("number-order-grid");
    if (!grid) return;
    var next = state.nextExpected;
    grid.querySelectorAll("button").forEach(function (btn) {
      var val = parseInt(btn.dataset.value, 10);
      if (val < next) {
        btn.classList.add("number-order-pressed");
      } else {
        btn.classList.remove("number-order-pressed");
      }
    });
  }

  function handleGridTap(n) {
    if (state.countdownActive || !state.currentRound) return;
    if (n !== state.nextExpected) return;
    var grid = document.getElementById("number-order-grid");
    if (!grid) return;

    var pressedBtn = grid.querySelector('button[data-value="' + n + '"]');
    if (pressedBtn) pressedBtn.classList.add("number-order-pressed");

    if (n === 1) {
      state.tap1Time = Date.now();
    }
    if (n === 16) {
      state.tap16Time = Date.now();
      state.durationMs = state.tap1Time != null ? state.tap16Time - state.tap1Time : 0;
      var sb = getSupabase();
      if (sb) {
        sb.from("no_round_results")
          .upsert({ round_id: state.currentRound.id, client_id: state.clientId, duration_ms: state.durationMs }, { onConflict: "round_id,client_id" })
          .then(function () {});
      }
      state.nextExpected = 17;
      updateGridPressedState();
      grid.querySelectorAll("button").forEach(function (btn) { btn.disabled = true; });
      stopElapsedTimer();
      var completeMsg = document.getElementById("number-order-complete-msg");
      if (completeMsg) {
        completeMsg.textContent = "완료! " + (state.durationMs / 1000).toFixed(2) + "초";
        completeMsg.classList.remove("hidden");
      }
      return;
    }
    state.nextExpected = n + 1;
    updateGridPressedState();
  }

  function startResultPolling() {
    if (state.resultPollIntervalId != null) clearInterval(state.resultPollIntervalId);
    var deadline = Date.now() + ROUND_RESULT_TIMEOUT_MS;
    state.resultPollIntervalId = setInterval(function () {
      if (Date.now() > deadline) {
        clearInterval(state.resultPollIntervalId);
        state.resultPollIntervalId = null;
        showResult();
        return;
      }
      checkResultReady();
    }, 1000);
  }

  function checkResultReady() {
    var sb = getSupabase();
    if (!sb || !state.currentRound) return;
    var roundId = state.currentRound.id;
    sb.from("no_round_results").select("client_id", { count: "exact", head: true }).eq("round_id", roundId)
      .then(function (resCount) {
        var count = resCount.count;
        if (count == null) return;
        return sb.from("no_room_players").select("client_id", { count: "exact", head: true }).eq("room_id", state.roomId)
          .then(function (resPlayers) {
            var playerCount = resPlayers.count;
            if (playerCount != null && count >= playerCount) {
              if (state.resultPollIntervalId != null) {
                clearInterval(state.resultPollIntervalId);
                state.resultPollIntervalId = null;
              }
              showResult();
            }
          });
      });
  }

  function showResult() {
    var sb = getSupabase();
    if (!sb || !state.currentRound) return;
    var roundId = state.currentRound.id;
    sb.from("no_round_results").select("client_id, duration_ms").eq("round_id", roundId)
      .then(function (resResults) {
        var results = resResults.data || [];
        return sb.from("no_room_players").select("client_id, nickname").eq("room_id", state.roomId)
          .then(function (resPlayers) {
            var players = resPlayers.data || [];
            var byClient = {};
            players.forEach(function (p) { byClient[p.client_id] = p.nickname; });
            var list = [];
            players.forEach(function (p) {
              var r = results.find(function (x) { return x.client_id === p.client_id; });
              list.push({
                client_id: p.client_id,
                nickname: byClient[p.client_id] || "",
                duration_ms: r ? r.duration_ms : null
              });
            });
            list.sort(function (a, b) {
              if (a.duration_ms == null && b.duration_ms == null) return 0;
              if (a.duration_ms == null) return 1;
              if (b.duration_ms == null) return -1;
              return a.duration_ms - b.duration_ms;
            });
            state.roundResultOrder = list;
            stopRoundBgm();
            if (list.length > 0 && list[0].client_id === state.clientId) {
              try {
                var winAudio = new Audio("../common/sounds/win.mp3");
                winAudio.play();
              } catch (e) {}
            }
            renderResultSection();
            var resultSection = document.getElementById("round-result-section");
            var slot = document.getElementById("round-gameplay-slot");
            if (resultSection) resultSection.classList.remove("hidden");
            if (slot) slot.classList.add("hidden");
          });
      });
  }

  function renderResultSection() {
    var container = document.getElementById("round-result-zones");
    if (!container || !window.GamePlayerZone || !window.GameRankDisplay) return;
    container.innerHTML = "";
    var list = state.roundResultOrder || [];
    list.forEach(function (item, i) {
      var durationText = item.duration_ms != null ? (item.duration_ms / 1000).toFixed(2) : "—";
      var zone = window.GamePlayerZone.createPlayerZone({
        clientId: item.client_id,
        nickname: item.nickname,
        pNum: i + 1,
        isMe: item.client_id === state.clientId,
        showWins: false,
        extras: [{ className: "round-zone-time", textContent: durationText }]
      });
      container.appendChild(zone);
    });
    container.className = "round-player-zones count-" + Math.min(list.length, 8);
    window.GameRankDisplay.applyRanks(container, list, {});
  }

  function playAgain() {
    state.currentRound = null;
    state.nextExpected = 1;
    state.tap1Time = null;
    state.tap16Time = null;
    state.durationMs = null;
    state.roundResultOrder = [];
    if (state.resultPollIntervalId != null) {
      clearInterval(state.resultPollIntervalId);
      state.resultPollIntervalId = null;
    }
    stopRoundBgm();
    stopElapsedTimer();
    var resultSection = document.getElementById("round-result-section");
    var slot = document.getElementById("round-gameplay-slot");
    if (resultSection) resultSection.classList.add("hidden");
    if (slot) {
      slot.classList.remove("hidden");
      slot.innerHTML = "";
    }
    showScreen("screen-lobby");
    enterLobby();
  }

  function leaveRoom() {
    var sb = getSupabase();
    var roomId = state.roomId;
    var wasHost = state.isHost;
    state.roomId = null;
    state.roomCode = null;
    state.roomName = null;
    state.isHost = false;
    state.hostClientId = null;
    state.currentRound = null;
    state.nextExpected = 1;
    state.tap1Time = null;
    state.tap16Time = null;
    state.durationMs = null;
    state.roundResultOrder = [];
    cleanupSubscriptions();
    stopRoundBgm();
    stopElapsedTimer();
    showScreen("screen-nickname");
    if (sb && roomId) {
      sb.from("no_room_players").delete().eq("room_id", roomId).eq("client_id", state.clientId).then(function () {
        if (wasHost) {
          sb.from("no_rooms").update({ closed_at: new Date().toISOString() }).eq("id", roomId).then(function () {});
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
