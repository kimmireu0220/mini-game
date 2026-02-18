(function () {
  "use strict";

  var STORAGE_CLIENT_ID = "timing_game_client_id";
  var STORAGE_NICKNAME = "timing_game_nickname";
  var COUNTDOWN_SEC = 3;
  var BEEP_FREQ_COUNTDOWN = 880;
  var BEEP_FREQ_GO = 1320;
  var BEEP_DURATION_MS = 120;
  var BEEP_DURATION_GO_MS = 180;
  var BGM_VOLUME = 0.3;
  var PRESS_POLL_MS = 500;
  var BGM_SOURCES = (typeof __BGM_SOURCES_ARRAY__ !== "undefined" ? __BGM_SOURCES_ARRAY__ : ["sounds/bgm/timer-bgm.mp3", "sounds/bgm/timer-bgm2.mp3", "sounds/bgm/timer-bgm3.mp3", "sounds/bgm/timer-bgm4.mp3", "sounds/bgm/timer-bgm5.mp3", "sounds/bgm/timer-bgm6.mp3"]);
  var countdownAudioContext = null;

  function playCountdownBeep(frequency, durationMs) {
    try {
      if (!countdownAudioContext) {
        countdownAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      var ctx = countdownAudioContext;
      if (ctx.state === "suspended") ctx.resume();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency || BEEP_FREQ_COUNTDOWN;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (durationMs || BEEP_DURATION_MS) / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + (durationMs || BEEP_DURATION_MS) / 1000);
    } catch (e) {}
  }

  function getConfig() {
    return window.TIMING_GAME_CONFIG || {};
  }

  function getSupabase() {
    var cfg = getConfig();
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    if (!window.supabase) return null;
    return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  function getClientId() {
    var id = localStorage.getItem(STORAGE_CLIENT_ID);
    if (!id) {
      id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      localStorage.setItem(STORAGE_CLIENT_ID, id);
    }
    return id;
  }

  function getNickname() {
    return localStorage.getItem(STORAGE_NICKNAME) || "";
  }

  function setNickname(name) {
    localStorage.setItem(STORAGE_NICKNAME, (name || "").trim());
  }

  function showScreen(id) {
    document.querySelectorAll(".game-page-wrapper .screen").forEach(function (el) {
      el.classList.add("hidden");
    });
    var el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function generateRoomCode() {
    var code = "";
    for (var i = 0; i < 6; i++) code += Math.floor(Math.random() * 10);
    return code;
  }

  var state = {
    clientId: getClientId(),
    nickname: getNickname(),
    bgmMuted: false,
    bgmRoundIndex: 0,
    roomId: null,
    roomCode: null,
    roomName: null,
    isHost: false,
    unsubscribeRoom: null,
    unsubscribeRounds: null,
    unsubscribeRoomDeleted: null,
    currentRound: null,
    winCounts: {},
    waitAllPressesIntervalId: null
  };

  function initScreens() {
    var sb = getSupabase();
    if (!sb) {
      document.querySelector("#screen-nickname .button-row").innerHTML =
        "<p>Supabase URL과 anon key를 config.example.js에 설정하세요.</p>";
      return;
    }

    if (getNickname()) {
      document.getElementById("input-nickname").value = getNickname();
    }

    document.getElementById("btn-create-room").onclick = function () {
      var nick = document.getElementById("input-nickname").value.trim();
      if (!nick) {
        alert("닉네임을 입력한 뒤 진행하세요.");
        return;
      }
      state.nickname = nick;
      setNickname(nick);
      showScreen("screen-create");
    };
    document.getElementById("btn-join-room").onclick = function () {
      var nick = document.getElementById("input-nickname").value.trim();
      if (!nick) {
        alert("닉네임을 입력한 뒤 진행하세요.");
        return;
      }
      state.nickname = nick;
      setNickname(nick);
      var params = new URLSearchParams(window.location.search);
      var code = params.get("code") || "";
      document.getElementById("input-join-code").value = code;
      showScreen("screen-join");
    };
    document.getElementById("btn-back-from-create").onclick = function () {
      showScreen("screen-nickname");
    };
    document.getElementById("btn-create-submit").onclick = createRoom;
    document.getElementById("btn-enter-lobby").onclick = function () {
      showScreen("screen-lobby");
      enterLobby();
    };
    document.getElementById("btn-join-submit").onclick = joinRoom;
    document.getElementById("btn-back-from-join").onclick = function () {
      showScreen("screen-nickname");
    };
    document.getElementById("btn-start-round").onclick = startRound;
    document.getElementById("btn-leave-room").onclick = leaveRoom;
    document.getElementById("input-nickname").onchange = function () {
      setNickname(this.value.trim());
    };
    var btnRefresh = document.getElementById("btn-refresh");
    if (btnRefresh) {
      btnRefresh.onclick = function () {
        location.reload();
      };
    }
    var btnBgm = document.getElementById("btn-bgm-toggle");
    var btnBgmIcon = document.getElementById("btn-bgm-icon");
    if (btnBgm && btnBgmIcon) {
      function updateBgmButton() {
        btnBgmIcon.src = state.bgmMuted ? "images/bgm-off.png" : "images/bgm-on.png";
        btnBgm.classList.toggle("muted", state.bgmMuted);
      }
      updateBgmButton();
      btnBgm.onclick = function () {
        state.bgmMuted = !state.bgmMuted;
        updateBgmButton();
        if (state.timerBgmAudio) {
          if (state.bgmMuted) state.timerBgmAudio.pause();
          else state.timerBgmAudio.play();
        }
      };
    }
  }

  function createRoom() {
    var nick = document.getElementById("input-nickname").value.trim();
    if (!nick) {
      alert("닉네임을 입력하세요.");
      return;
    }
    state.nickname = nick;
    setNickname(nick);
    var name = document.getElementById("input-room-name").value.trim() || "대기실";
    var sb = getSupabase();
    if (!sb) return;

    var code = generateRoomCode();
    sb.from("rooms")
      .insert({
        code: code,
        name: name,
        host_client_id: state.clientId
      })
      .select("id")
      .single()
      .then(function (res) {
        if (res.error) {
          if (res.error.code === "23505") return createRoom();
          alert(res.error.message);
          return;
        }
        var roomId = res.data.id;
        return sb
          .from("room_players")
          .insert({
            room_id: roomId,
            client_id: state.clientId,
            nickname: state.nickname
          })
          .then(function (insertRes) {
            if (insertRes.error) {
              alert(insertRes.error.message);
              return;
            }
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
    var nick = document.getElementById("input-nickname").value.trim();
    if (!nick) {
      alert("닉네임을 입력하세요.");
      return;
    }
    state.nickname = nick;
    setNickname(nick);
    var code = document.getElementById("input-join-code").value.trim().replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      alert("6자리 방 코드를 입력하세요.");
      return;
    }
    var sb = getSupabase();
    if (!sb) return;

    sb.from("rooms")
      .select("id, name, host_client_id, closed_at")
      .eq("code", code)
      .single()
      .then(function (res) {
        if (res.error || !res.data) {
          alert("방을 찾을 수 없습니다.");
          return;
        }
        var room = res.data;
        if (room.closed_at) {
          alert("이미 종료된 방입니다.");
          return;
        }
        return sb
          .from("room_players")
          .insert({
            room_id: room.id,
            client_id: state.clientId,
            nickname: state.nickname
          })
          .then(function (insertRes) {
            if (insertRes.error) {
              if (insertRes.error.code === "23505") {
                state.roomId = room.id;
                state.roomCode = code;
                state.roomName = room.name;
                state.isHost = room.host_client_id === state.clientId;
                state.hostClientId = room.host_client_id;
                showScreen("screen-lobby");
                enterLobby();
                return;
              }
              alert(insertRes.error.message);
              return;
            }
            state.roomId = room.id;
            state.roomCode = code;
            state.roomName = room.name;
            state.isHost = room.host_client_id === state.clientId;
            state.hostClientId = room.host_client_id;
            showScreen("screen-lobby");
            enterLobby();
          });
      });
  }

  function cleanupSubscriptions() {
    if (state.pollRoundIntervalId != null) {
      clearInterval(state.pollRoundIntervalId);
      state.pollRoundIntervalId = null;
    }
    if (state.lobbyRoundPollIntervalId != null) {
      clearInterval(state.lobbyRoundPollIntervalId);
      state.lobbyRoundPollIntervalId = null;
    }
    if (state.lobbyPlayersPollIntervalId != null) {
      clearInterval(state.lobbyPlayersPollIntervalId);
      state.lobbyPlayersPollIntervalId = null;
    }
    if (state.waitAllPressesIntervalId != null) {
      clearInterval(state.waitAllPressesIntervalId);
      state.waitAllPressesIntervalId = null;
    }
    if (state.roundPressesPollIntervalId != null) {
      clearInterval(state.roundPressesPollIntervalId);
      state.roundPressesPollIntervalId = null;
    }
    if (state.liveTimerInterval != null) {
      clearInterval(state.liveTimerInterval);
      state.liveTimerInterval = null;
    }
    if (state.timerBgmAudio) {
      state.timerBgmAudio.pause();
      state.timerBgmAudio = null;
    }
    if (state.unsubscribeRoom) {
      state.unsubscribeRoom();
      state.unsubscribeRoom = null;
    }
    if (state.unsubscribeRounds) {
      state.unsubscribeRounds();
      state.unsubscribeRounds = null;
    }
    if (state.unsubscribeRoomDeleted) {
      state.unsubscribeRoomDeleted();
      state.unsubscribeRoomDeleted = null;
    }
  }

  function enterLobby() {
    var sb = getSupabase();
    if (!sb || !state.roomId) return;

    cleanupSubscriptions();
    var titleEl = document.getElementById("lobby-room-name");
    titleEl.textContent = "[ " + (state.roomName || "대기실") + " ]";
    sb.from("rooms").select("name").eq("id", state.roomId).single().then(function (res) {
      if (res.data && res.data.name) {
        state.roomName = res.data.name;
        titleEl.textContent = "[ " + state.roomName + " ]";
      }
    });
    refreshLobbyPlayers();
    refreshLobbyWins();
    document.querySelectorAll(".host-only").forEach(function (el) {
      el.classList.toggle("hidden", !state.isHost);
    });
    var noticeEl = document.getElementById("lobby-notice");
    if (noticeEl) {
      if (!state.isHost) {
        noticeEl.textContent = "방장이 '시작'을 누르면 시작합니다.";
        noticeEl.classList.remove("hidden");
      } else {
        noticeEl.textContent = "";
        noticeEl.classList.add("hidden");
      }
    }

    var channel = sb.channel("room:" + state.roomId);
    var btnStart = document.getElementById("btn-start-round");
    btnStart.disabled = true;

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: "room_id=eq." + state.roomId }, refreshLobbyPlayers)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rounds", filter: "room_id=eq." + state.roomId }, function (payload) {
        if (payload.new && payload.new.id) onRoundStarted(payload.new);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "rooms", filter: "id=eq." + state.roomId }, function () {
        state.currentRound = null;
        state.roomId = null;
        state.isHost = false;
        cleanupSubscriptions();
        showScreen("screen-nickname");
      })
      .subscribe(function (status, err) {
        if (status === "SUBSCRIBED") {
          if (state.startButtonDelayFromPlayAgain) {
            btnStart.disabled = true;
            setTimeout(function () {
              state.startButtonDelayFromPlayAgain = false;
              btnStart.disabled = !state.isHost;
            }, 1000);
          } else {
            btnStart.disabled = !state.isHost;
          }
        } else if (status === "CHANNEL_ERROR") {
          btnStart.disabled = false;
        }
      });
    state.unsubscribeRoom = function () {
      sb.removeChannel(channel);
    };

    state.lobbyPlayersPollIntervalId = setInterval(function () {
      if (!state.roomId) return;
      refreshLobbyPlayers();
    }, 2000);

    var lobbyPollMs = 1500;
    state.lobbyRoundPollIntervalId = setInterval(function () {
      if (!state.roomId) return;
      sb.from("rounds")
        .select("id, start_at, target_seconds, created_at")
        .eq("room_id", state.roomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(function (res) {
          if (!res.data || res.data.length === 0) return;
          var round = res.data[0];
          if (state.currentRound && state.currentRound.id === round.id) return;
          if (state.pollRoundIntervalId != null) return;
          var created = round.created_at ? new Date(round.created_at).getTime() : 0;
          if (created && Date.now() - created > 20000) return;
          clearInterval(state.lobbyRoundPollIntervalId);
          state.lobbyRoundPollIntervalId = null;
          onRoundStarted(round);
        });
    }, lobbyPollMs);
  }

  function refreshLobbyPlayers() {
    var sb = getSupabase();
    if (!sb || !state.roomId) return;

    sb.from("room_players")
      .select("nickname, client_id")
      .eq("room_id", state.roomId)
      .order("joined_at")
      .then(function (res) {
        var ul = document.getElementById("lobby-players");
        ul.innerHTML = "";
        if (res.data) {
          var hostClientId = state.hostClientId || (state.isHost ? state.clientId : null);
          res.data.forEach(function (p, i) {
            var li = document.createElement("li");
            var num = i + 1;
            var numSpan = document.createElement("span");
            numSpan.className = "lobby-player-num num-" + num;
            numSpan.textContent = "P" + num;
            li.appendChild(numSpan);
            li.appendChild(document.createTextNode(" " + p.nickname));
            if (p.client_id === hostClientId) {
              var hostSpan = document.createElement("span");
              hostSpan.className = "lobby-player-host";
              var hostImg = document.createElement("img");
              hostImg.src = "images/host-icon.png";
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

  function refreshLobbyWins() {
    if (!state.roomId) return;
    var sb = getSupabase();
    if (!sb) return;
    sb.from("rounds")
      .select("id, start_at, target_seconds")
      .eq("room_id", state.roomId)
      .order("created_at")
      .then(function (roundRes) {
        if (!roundRes.data || roundRes.data.length === 0) {
          return;
        }
        var roundIds = roundRes.data.map(function (r) {
          return r.id;
        });
        sb.from("round_presses")
          .select("round_id, client_id, created_at")
          .in("round_id", roundIds)
          .then(function (pressRes) {
            var counts = {};
            roundRes.data.forEach(function (r) {
              var startAt = new Date(r.start_at).getTime();
              var targetMs = r.target_seconds * 1000;
              var presses = (pressRes.data || []).filter(function (p) {
                return p.round_id === r.id;
              });
              if (presses.length === 0) return;
              var best = null;
              presses.forEach(function (p) {
                var created = new Date(p.created_at).getTime();
                var offset = Math.abs(created - startAt - targetMs);
                if (best === null || offset < best.offset) best = { client_id: p.client_id, offset: offset };
              });
              if (best) counts[best.client_id] = (counts[best.client_id] || 0) + 1;
            });
            state.winCounts = counts;
          });
      });
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

  var ROUND_POLL_INTERVAL_MS = 400;
  var ROUND_POLL_TIMEOUT_MS = 12000;

  function startRoundPollingFallback() {
    var sb = getSupabase();
    if (!sb || !state.roomId) return;
    if (state.pollRoundIntervalId != null) return;

    var deadline = Date.now() + ROUND_POLL_TIMEOUT_MS;
    state.pollRoundIntervalId = setInterval(function () {
      if (Date.now() > deadline) {
        clearInterval(state.pollRoundIntervalId);
        state.pollRoundIntervalId = null;
        return;
      }
      sb.from("rounds")
        .select("id, start_at, target_seconds")
        .eq("room_id", state.roomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(function (res) {
          if (!res.data || res.data.length === 0) return;
          var round = res.data[0];
          if (state.currentRound && state.currentRound.id === round.id) return;
          clearInterval(state.pollRoundIntervalId);
          state.pollRoundIntervalId = null;
          onRoundStarted(round);
        });
    }, ROUND_POLL_INTERVAL_MS);
  }

  function startRound() {
    var sb = getSupabase();
    var cfg = getConfig();
    if (!sb || !state.roomId || !state.isHost) return;

    fetch(cfg.SUPABASE_URL + "/functions/v1/start-round", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY },
      body: JSON.stringify({ room_id: state.roomId, client_id: state.clientId })
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.error) {
          alert(data.error);
          return;
        }
        startRoundPollingFallback();
      })
      .catch(function (e) {
        alert("시작 실패: " + e.message);
      });
  }

  function renderRoundPlayerZones(players, winCounts) {
    var container = document.getElementById("round-player-zones");
    if (!container) return;
    var list = players || [];
    container.innerHTML = "";
    container.className = "round-player-zones count-" + Math.min(list.length || 1, 8);
    list.forEach(function (p, i) {
      var slot = document.createElement("div");
      slot.className = "round-player-slot";
      var zone = document.createElement("div");
      zone.className = "round-player-zone" + (p.client_id === state.clientId ? " me" : "");
      zone.dataset.clientId = p.client_id;
      var nameEl = document.createElement("div");
      nameEl.className = "round-zone-name";
      var num = i + 1;
      var pNumSpan = document.createElement("span");
      pNumSpan.className = "round-zone-p-num num-" + num;
      pNumSpan.textContent = "P" + num;
      nameEl.appendChild(pNumSpan);
      nameEl.appendChild(document.createTextNode(" " + p.nickname));
      zone.appendChild(nameEl);
      if (list.length > 1) {
        var winsEl = document.createElement("div");
        winsEl.className = "round-zone-wins";
        winsEl.textContent = "Win: " + (winCounts[p.client_id] || 0);
        zone.appendChild(winsEl);
      }
      var timeEl = document.createElement("div");
      timeEl.className = "round-zone-time";
      timeEl.style.display = "none";
      var errorEl = document.createElement("div");
      errorEl.className = "round-zone-error";
      errorEl.style.display = "none";
      zone.appendChild(timeEl);
      zone.appendChild(errorEl);
      slot.appendChild(zone);
      container.appendChild(slot);
    });
  }

  function updateRoundZoneResult(clientId, pressTimeSec, offsetSec) {
    var zone = document.querySelector(".round-player-zone[data-client-id=\"" + clientId + "\"]");
    if (!zone) return;
    var timeEl = zone.querySelector(".round-zone-time");
    var errorEl = zone.querySelector(".round-zone-error");
    if (timeEl && errorEl) {
      var fixed = (pressTimeSec || 0).toFixed(2);
      var parts = fixed.split(".");
      timeEl.textContent = (parts[0] || "0").padStart(2, "0") + ":" + (parts[1] || "00");
      var sign = (offsetSec || 0) >= 0 ? "+" : "";
      errorEl.textContent = "오차: " + sign + (offsetSec || 0).toFixed(2);
      timeEl.style.display = "";
      errorEl.style.display = "";
    }
  }

  function refreshRoundPressesDisplay() {
    var sb = getSupabase();
    if (!sb || !state.currentRound || !state.roomId) return;
    var roundId = state.currentRound.id;
    var startAt = new Date(state.currentRound.start_at).getTime();
    var targetSec = state.currentRound.target_seconds || 0;
    sb.from("round_presses")
      .select("client_id, created_at")
      .eq("round_id", roundId)
      .then(function (pressRes) {
        (pressRes.data || []).forEach(function (row) {
          var created = new Date(row.created_at).getTime();
          var elapsed = (created - startAt) / 1000;
          var offsetSec = elapsed - targetSec;
          updateRoundZoneResult(row.client_id, elapsed, offsetSec);
        });
      });
  }

  function onRoundStarted(round) {
    if (state.currentRound && state.currentRound.id === round.id) return;
    if (state.pollRoundIntervalId != null) {
      clearInterval(state.pollRoundIntervalId);
      state.pollRoundIntervalId = null;
    }
    if (state.lobbyRoundPollIntervalId != null) {
      clearInterval(state.lobbyRoundPollIntervalId);
      state.lobbyRoundPollIntervalId = null;
    }
    state.currentRound = round;
    document.getElementById("round-target-msg").textContent = round.target_seconds + "초에 맞춰 누르세요.";
    document.getElementById("round-countdown").textContent = "";
    document.getElementById("btn-press").disabled = true;
    var gameplayWrap = document.getElementById("round-gameplay-wrap");
    var actionsWrap = document.getElementById("round-end-actions");
    var btnPress = document.getElementById("btn-press");
    if (gameplayWrap) gameplayWrap.classList.remove("hidden");
    if (actionsWrap) actionsWrap.classList.add("hidden");
    if (btnPress) btnPress.classList.remove("hidden");
    var liveTimerEl = document.getElementById("round-live-timer");
    if (liveTimerEl) liveTimerEl.textContent = "00:00";
    showScreen("screen-round");

    var sb = getSupabase();
    if (sb && state.roomId) {
      sb.from("room_players")
        .select("client_id, nickname")
        .eq("room_id", state.roomId)
        .order("joined_at")
        .then(function (res) {
          state.roundPlayers = res.data || [];
          renderRoundPlayerZones(state.roundPlayers, state.winCounts || {});
        });
    }

    var startAt = new Date(round.start_at).getTime();
    var countdownEl = document.getElementById("round-countdown");
    var countdownOverlayEl = document.getElementById("round-countdown-overlay");
    countdownEl.textContent = "";
    if (countdownOverlayEl) countdownOverlayEl.classList.add("hidden");

    function startRoundTimerPhase() {
      var startReal = Date.now();
      var liveTimerEl = document.getElementById("round-live-timer");
      function hideLiveTimer() {
        if (state.liveTimerInterval != null) {
          clearInterval(state.liveTimerInterval);
          state.liveTimerInterval = null;
        }
        if (state.timerBgmAudio) {
          state.timerBgmAudio.pause();
          state.timerBgmAudio = null;
        }
      }
      state.liveTimerInterval = setInterval(function () {
        var elapsed = (Date.now() - startReal) / 1000;
        if (elapsed >= 3) {
          if (state.liveTimerInterval != null) {
            clearInterval(state.liveTimerInterval);
            state.liveTimerInterval = null;
          }
          if (liveTimerEl) liveTimerEl.textContent = "??:??";
          return;
        }
        var s = elapsed.toFixed(2);
        var parts = s.split(".");
        if (liveTimerEl) liveTimerEl.textContent = parts[0].padStart(2, "0") + ":" + (parts[1] || "00").slice(0, 2);
      }, 50);
      document.getElementById("btn-press").disabled = false;
      try {
        var bgmIdx = state.bgmRoundIndex % BGM_SOURCES.length;
        state.bgmRoundIndex += 1;
        state.timerBgmAudio = new Audio(BGM_SOURCES[bgmIdx]);
        state.timerBgmAudio.loop = true;
        state.timerBgmAudio.volume = BGM_VOLUME;
        if (!state.bgmMuted) state.timerBgmAudio.play();
      } catch (e) {}
      if (state.roundPressesPollIntervalId != null) {
        clearInterval(state.roundPressesPollIntervalId);
        state.roundPressesPollIntervalId = null;
      }
      refreshRoundPressesDisplay();
      state.roundPressesPollIntervalId = setInterval(refreshRoundPressesDisplay, PRESS_POLL_MS);
      document.getElementById("btn-press").onclick = function () {
        hideLiveTimer();
        document.getElementById("btn-press").disabled = true;
        document.getElementById("btn-press").onclick = null;
        var sb = getSupabase();
        if (sb && state.currentRound) {
          sb.from("round_presses").insert({
            round_id: state.currentRound.id,
            client_id: state.clientId
          }).then(function () {
            refreshRoundPressesDisplay();
          });
        }
        if (state.waitAllPressesIntervalId != null) {
          clearInterval(state.waitAllPressesIntervalId);
          state.waitAllPressesIntervalId = null;
        }
        var roundId = state.currentRound.id;
        state.waitAllPressesIntervalId = setInterval(function () {
          if (!sb || !state.currentRound || state.currentRound.id !== roundId) return;
          sb.from("round_presses").select("client_id").eq("round_id", roundId).then(function (pressRes) {
            sb.from("room_players").select("client_id").eq("room_id", state.roomId).then(function (playerRes) {
              var pressCount = (pressRes.data || []).length;
              var playerCount = (playerRes.data || []).length;
              if (playerCount > 0 && pressCount >= playerCount) {
                if (state.waitAllPressesIntervalId != null) {
                  clearInterval(state.waitAllPressesIntervalId);
                  state.waitAllPressesIntervalId = null;
                }
                showResult();
              }
            });
          });
        }, PRESS_POLL_MS);
      };
    }

    getServerTimeMs()
      .then(function (t) {
        var serverOffset = t.serverNowMs - t.clientNowMs;
        var delay = Math.max(0, startAt - t.serverNowMs);
        var countdownSteps = [
          { ms: 3000, num: 4 },
          { ms: 2000, num: 3 },
          { ms: 1000, num: 2 },
          { ms: 0, num: 1 }
        ];
        var countdownIntervalId = null;
        var lastCountdownNum = null;
        countdownIntervalId = setInterval(function () {
          var remaining = startAt - (Date.now() + serverOffset);
          var i;
          for (i = 0; i < countdownSteps.length; i++) {
            if (remaining > countdownSteps[i].ms) {
              if (lastCountdownNum !== countdownSteps[i].num) {
                lastCountdownNum = countdownSteps[i].num;
                playCountdownBeep(BEEP_FREQ_COUNTDOWN, BEEP_DURATION_MS);
              }
              countdownEl.textContent = String(countdownSteps[i].num);
              if (countdownOverlayEl) countdownOverlayEl.classList.remove("hidden");
              return;
            }
          }
          if (lastCountdownNum !== 0) {
            lastCountdownNum = 0;
            playCountdownBeep(BEEP_FREQ_GO, BEEP_DURATION_GO_MS);
          }
          if (countdownIntervalId != null) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
          }
          countdownEl.textContent = "";
          if (countdownOverlayEl) countdownOverlayEl.classList.add("hidden");
        }, 50);

        setTimeout(function () {
          if (countdownIntervalId != null) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
          }
          countdownEl.textContent = "";
          if (countdownOverlayEl) countdownOverlayEl.classList.add("hidden");
          startRoundTimerPhase();
        }, delay);
      })
      .catch(function () {
        var delay = Math.max(0, startAt - Date.now());
        setTimeout(startRoundTimerPhase, delay);
      });
  }

  function showResult() {
    if (state.roundPressesPollIntervalId != null) {
      clearInterval(state.roundPressesPollIntervalId);
      state.roundPressesPollIntervalId = null;
    }
    var sb = getSupabase();
    if (!sb || !state.currentRound) {
      showScreen("screen-lobby");
      enterLobby();
      return;
    }

    var roundId = state.currentRound.id;
    var startAt = new Date(state.currentRound.start_at).getTime();
    var targetMs = state.currentRound.target_seconds * 1000;

    function pollResult() {
      sb.from("round_presses")
        .select("client_id, created_at")
        .eq("round_id", roundId)
        .then(function (pressRes) {
          sb.from("room_players")
            .select("client_id, nickname")
            .eq("room_id", state.roomId)
            .then(function (playerRes) {
              var players = {};
              if (playerRes.data) playerRes.data.forEach(function (p) {
                players[p.client_id] = p.nickname;
              });
              var list = [];
              if (pressRes.data) {
                pressRes.data.forEach(function (p) {
                  var created = new Date(p.created_at).getTime();
                  var offsetMs = created - startAt - targetMs;
                  list.push({ client_id: p.client_id, nickname: players[p.client_id] || p.client_id, offsetMs: offsetMs });
                });
              }
              var pressedIds = {};
              list.forEach(function (x) {
                pressedIds[x.client_id] = true;
              });
              Object.keys(players).forEach(function (cid) {
                if (!pressedIds[cid]) list.push({ client_id: cid, nickname: players[cid], offsetMs: null });
              });
              list.sort(function (a, b) {
                if (a.offsetMs == null) return 1;
                if (b.offsetMs == null) return -1;
                return Math.abs(a.offsetMs) - Math.abs(b.offsetMs);
              });
              var newWinCounts = {};
              if (state.winCounts) {
                Object.keys(state.winCounts).forEach(function (cid) {
                  newWinCounts[cid] = state.winCounts[cid];
                });
              }
              var winner = list[0];
              if (winner && winner.offsetMs != null) {
                newWinCounts[winner.client_id] = (newWinCounts[winner.client_id] || 0) + 1;
              }
              state.winCounts = newWinCounts;
              state.lastRoundWinnerId = (winner && winner.offsetMs != null) ? winner.client_id : null;
              state.roundResultOrder = list;
              var roundPlayers = (playerRes.data || []).map(function (p) {
                return { client_id: p.client_id, nickname: players[p.client_id] || p.client_id };
              });
              state.roundPlayers = roundPlayers;
              showRoundEnd();
            });
        });
    }

    setTimeout(pollResult, 2000);
  }

  function showRoundEnd() {
    if (state.timerBgmAudio) {
      state.timerBgmAudio.pause();
      state.timerBgmAudio = null;
    }
    var gameplayWrap = document.getElementById("round-gameplay-wrap");
    var actionsWrap = document.getElementById("round-end-actions");
    var againBtn = document.getElementById("btn-round-play-again");
    var leaveBtn = document.getElementById("btn-round-leave");
    if (gameplayWrap) gameplayWrap.classList.add("hidden");
    if (actionsWrap) actionsWrap.classList.remove("hidden");
    var btnPress = document.getElementById("btn-press");
    if (btnPress) btnPress.classList.add("hidden");
    if (againBtn) {
      againBtn.onclick = function () {
        state.startButtonDelayFromPlayAgain = true;
        if (actionsWrap) actionsWrap.classList.add("hidden");
        if (document.getElementById("round-gameplay-wrap")) {
          document.getElementById("round-gameplay-wrap").classList.remove("hidden");
        }
        if (document.getElementById("btn-press")) {
          document.getElementById("btn-press").classList.remove("hidden");
        }
        showScreen("screen-lobby");
        enterLobby();
      };
    }
    if (leaveBtn) {
      leaveBtn.onclick = function () {
        leaveRoom();
      };
    }
    function rankLabel(n) {
      var s = n % 10, t = n % 100;
      if (s === 1 && t !== 11) return n + "st";
      if (s === 2 && t !== 12) return n + "nd";
      if (s === 3 && t !== 13) return n + "rd";
      return n + "th";
    }
    var winCounts = state.winCounts || {};
    var winnerId = state.lastRoundWinnerId || null;
    var resultOrder = state.roundResultOrder || [];
    if (winnerId && state.clientId === winnerId) {
      try {
        var winAudio = new Audio("sounds/win.mp3");
        winAudio.play();
      } catch (e) {}
    }
    document.querySelectorAll(".round-player-zone[data-client-id]").forEach(function (zone) {
      var cid = zone.dataset.clientId;
      var winsEl = zone.querySelector(".round-zone-wins");
      if (winsEl && cid) winsEl.textContent = "Win: " + (winCounts[cid] || 0);
      var rankIdx = resultOrder.findIndex(function (x) { return x.client_id === cid; });
      var rankEl = zone.querySelector(".round-zone-rank");
      if (rankIdx >= 0) {
        if (!rankEl) {
          rankEl = document.createElement("div");
          rankEl.className = "round-zone-rank";
          zone.insertBefore(rankEl, zone.firstChild);
        }
        rankEl.textContent = rankLabel(rankIdx + 1);
        rankEl.style.display = "";
      } else if (rankEl) {
        rankEl.style.display = "none";
      }
      var slot = zone.parentElement;
      if (!slot || !slot.classList.contains("round-player-slot")) return;
      var badge = slot.querySelector(".round-zone-win-badge");
      if (badge) badge.remove();
      var playerCount = state.roundPlayers ? state.roundPlayers.length : 0;
      if (playerCount > 1 && winnerId && cid === winnerId) {
        var winBadge = document.createElement("img");
        winBadge.className = "round-zone-win-badge";
        winBadge.src = "images/win-badge.png";
        winBadge.alt = "Win!";
        slot.insertBefore(winBadge, zone);
      }
    });
  }

  function leaveRoom() {
    var sb = getSupabase();
    if (!sb || !state.roomId) return;

    if (state.isHost) {
      sb.from("rooms").delete().eq("id", state.roomId).eq("host_client_id", state.clientId).then(function () {});
    }
    sb.from("room_players").delete().eq("room_id", state.roomId).eq("client_id", state.clientId).then(function () {});
    state.roomId = null;
    state.isHost = false;
    cleanupSubscriptions();
    showScreen("screen-nickname");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScreens);
  } else {
    initScreens();
  }
})();
