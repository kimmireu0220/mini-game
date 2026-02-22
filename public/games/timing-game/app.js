(function () {
  "use strict";

  var TimingGame = window.TimingGame;
  var state = TimingGame.state;
  var getConfig = TimingGame.getConfig;
  var getSupabase = TimingGame.getSupabase;
  var getNickname = TimingGame.getNickname;
  var setNickname = TimingGame.setNickname;
  var generateRoomCode = TimingGame.generateRoomCode;
  var cleanupSubscriptions = TimingGame.cleanupSubscriptions;

  var PRESS_POLL_MS = 500;
  var countdownAudioContext = null;

  function showScreen(id) {
    document.querySelectorAll(".game-page-wrapper .screen").forEach(function (el) {
      el.classList.add("hidden");
    });
    var el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function initScreens() {
    var sb = getSupabase();
    if (!sb) {
      document.querySelector("#screen-nickname .button-row").innerHTML =
        "<p>Supabase URL과 anon key를 .env에 설정하세요. (SUPABASE_URL, SUPABASE_ANON_KEY)</p>";
      return;
    }

    state.nickname = getNickname();
    var displayText = document.getElementById("nickname-display-text");
    if (displayText) displayText.textContent = state.nickname || "";

    document.getElementById("btn-create-room").onclick = function () {
      if (!state.nickname) {
        alert("닉네임을 먼저 홈 화면에서 설정해 주세요.");
        return;
      }
      setNickname(state.nickname);
      showScreen("screen-create");
    };
    document.getElementById("btn-join-room").onclick = function () {
      if (!state.nickname) {
        alert("닉네임을 먼저 홈 화면에서 설정해 주세요.");
        return;
      }
      setNickname(state.nickname);
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
    document.getElementById("btn-round-play-again").onclick = playAgain;
    document.getElementById("btn-round-leave").onclick = leaveRoom;
    var btnRefresh = document.getElementById("btn-refresh");
    if (btnRefresh) btnRefresh.onclick = function () { location.reload(); };
    if (window.GameAudio && window.GameAudio.setupBgmButton) {
      window.GameAudio.setupBgmButton(state, { audioKey: "timerBgmAudio" });
    }
    function unlockAudioOnce() {
      if (state.audioUnlocked) return;
      state.audioUnlocked = true;
      try {
        if (!countdownAudioContext) {
          countdownAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (countdownAudioContext.state === "suspended") {
          countdownAudioContext.resume();
        }
      } catch (e) {}
    }
    var wrapper = document.querySelector(".game-page-wrapper");
    if (wrapper) {
      wrapper.addEventListener("click", unlockAudioOnce, { once: true, capture: true });
      wrapper.addEventListener("touchstart", unlockAudioOnce, { once: true, capture: true });
    }
  }

  function createRoom() {
    if (!state.nickname) {
      alert("닉네임을 먼저 홈 화면에서 설정해 주세요.");
      return;
    }
    setNickname(state.nickname);
    var name = document.getElementById("input-room-name").value.trim() || "대기실";
    var sb = getSupabase();
    if (!sb) return;

    var code = generateRoomCode();
    sb.from("timing_rooms")
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
          .from("timing_room_players")
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
    if (!state.nickname) {
      alert("닉네임을 먼저 홈 화면에서 설정해 주세요.");
      return;
    }
    setNickname(state.nickname);
    var code = document.getElementById("input-join-code").value.trim().replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      alert("6자리 방 코드를 입력하세요.");
      return;
    }
    var sb = getSupabase();
    if (!sb) return;

    sb.from("timing_rooms")
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
          .from("timing_room_players")
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

  function enterLobby() {
    var sb = getSupabase();
    if (!sb || !state.roomId) return;

    cleanupSubscriptions();
    var titleEl = document.getElementById("lobby-room-name");
    titleEl.textContent = "[ " + (state.roomName || "대기실") + " ]";
    sb.from("timing_rooms").select("name").eq("id", state.roomId).single().then(function (res) {
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
    setupLobbyChannel(sb);
    /* 채널 SUBSCRIBED 전에도 호스트면 시작 버튼 활성화 (구독 지연 시에도 바로 사용 가능) */
    var btnStart = document.getElementById("btn-start-round");
    if (btnStart) btnStart.disabled = !state.isHost;
  }

  function setupLobbyChannel(sb) {
    var channel = sb.channel("room:" + state.roomId);
    var btnStart = document.getElementById("btn-start-round");
    if (btnStart) btnStart.disabled = !state.isHost;
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "timing_room_players", filter: "room_id=eq." + state.roomId }, refreshLobbyPlayers)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "timing_rounds", filter: "room_id=eq." + state.roomId }, function (payload) {
        if (payload.new && payload.new.id) onRoundStarted(payload.new);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "timing_rooms", filter: "id=eq." + state.roomId }, function () {
        state.currentRound = null;
        state.roomId = null;
        state.isHost = false;
        cleanupSubscriptions();
        showScreen("screen-nickname");
      })
      .subscribe(function (status, err) {
        if (status === "SUBSCRIBED") {
          btnStart.disabled = !state.isHost;
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
      sb.from("timing_rounds")
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

    sb.from("timing_room_players")
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

  function refreshLobbyWins() {
    if (!state.roomId) return;
    var sb = getSupabase();
    if (!sb) return;
    if (window.GameWinCounts && window.GameWinCounts.fetchRoomWinCounts) {
      window.GameWinCounts
        .fetchRoomWinCounts(sb, {
          roundsTable: "timing_rounds",
          roomId: state.roomId,
          finishedBy: "winner"
        })
        .then(function (counts) {
          state.winCounts = counts || {};
        })
        .catch(function () {});
      return;
    }
    sb.from("timing_rounds")
      .select("id, start_at, target_seconds")
      .eq("room_id", state.roomId)
      .order("created_at")
      .then(function (roundRes) {
        if (!roundRes.data || roundRes.data.length === 0) return;
        var roundIds = roundRes.data.map(function (r) { return r.id; });
        sb.from("timing_round_presses")
          .select("round_id, client_id, created_at")
          .in("round_id", roundIds)
          .then(function (pressRes) {
            var counts = {};
            roundRes.data.forEach(function (r) {
              var startAt = new Date(r.start_at).getTime();
              var targetMs = r.target_seconds * 1000;
              var presses = (pressRes.data || []).filter(function (p) { return p.round_id === r.id; });
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
      sb.from("timing_rounds")
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
    var btnStart = document.getElementById("btn-start-round");
    if (btnStart) btnStart.disabled = true;

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
          if (btnStart) btnStart.disabled = false;
          var isRoomNotFound =
            data.error.indexOf("Room not found") !== -1 || data.error.indexOf("Room lookup failed") !== -1;
          if (isRoomNotFound) {
            sb.from("timing_rooms").select("id").eq("id", state.roomId).single().then(function (res) {
              if (res.error || !res.data) {
                leaveRoom();
                alert("방이 종료되었습니다.");
              } else {
                var url = (cfg && cfg.SUPABASE_URL) ? cfg.SUPABASE_URL : "";
                alert(
                  "방을 찾을 수 없거나 이미 종료되었습니다.\n\n" +
                  "1) 앱에서 쓰는 SUPABASE_URL이 Edge Function이 배포된 프로젝트와 같은지 확인하세요.\n" +
                  (url ? "현재 URL: " + url + "\n\n" : "") +
                  "2) Supabase 대시보드에서 start-round 함수가 배포되어 있는지 확인하세요.\n" +
                  "3) timing_rooms 테이블이 있는 프로젝트와 동일한 프로젝트에 배포되어 있어야 합니다."
                );
              }
            });
          } else {
            alert(data.error);
          }
          return;
        }
        startRoundPollingFallback();
      })
      .catch(function (e) {
        if (btnStart) btnStart.disabled = false;
        alert("시작 실패: " + e.message);
      });
  }

  function ensureTimingRoundDOM() {
    var slot = document.getElementById("round-gameplay-slot");
    if (!slot || slot.children.length > 0) return;
    var gameplayWrap = document.createElement("div");
    gameplayWrap.id = "round-gameplay-wrap";
    var targetMsg = document.createElement("p");
    targetMsg.id = "round-target-msg";
    gameplayWrap.appendChild(targetMsg);
    var liveTimer = document.createElement("p");
    liveTimer.id = "round-live-timer";
    liveTimer.className = "round-live-timer";
    gameplayWrap.appendChild(liveTimer);
    var liveZones = document.createElement("div");
    liveZones.id = "round-live-zones";
    liveZones.className = "round-player-zones";
    var btnPress = document.createElement("button");
    btnPress.type = "button";
    btnPress.id = "btn-press";
    btnPress.disabled = true;
    btnPress.textContent = "누르기";
    slot.appendChild(gameplayWrap);
    slot.appendChild(liveZones);
    slot.appendChild(btnPress);
  }

  function renderRoundPlayerZones(players, winCounts) {
    var container = document.getElementById("round-live-zones");
    if (!container) return;
    var list = players || [];
    if (typeof GamePlayerZone !== "undefined" && GamePlayerZone.fillPlayerZones) {
      GamePlayerZone.fillPlayerZones(container, list, winCounts, state.clientId, {
        wrapInSlot: true,
        winsFormat: "paren",
        showWins: true,
        extrasFor: function () {
          return [
            { className: "round-zone-time", style: { display: "none" } },
            { className: "round-zone-error", style: { display: "none" } }
          ];
        }
      });
      return;
    }
    container.innerHTML = "";
    container.className = "round-player-zones count-" + Math.min(list.length || 1, 8);
    list.forEach(function (p, i) {
      var slot = document.createElement("div");
      slot.className = "round-player-slot";
      var zone = document.createElement("div");
      zone.className = "round-player-zone" + (p.client_id === state.clientId ? " me" : "");
      zone.dataset.clientId = p.client_id;
      var num = i + 1;
      var pNumSpan = document.createElement("span");
      pNumSpan.className = "round-zone-p-num num-" + num;
      pNumSpan.textContent = "P" + num;
      zone.appendChild(pNumSpan);
      var nameEl = document.createElement("div");
      nameEl.className = "round-zone-name";
      var nameLine = document.createElement("div");
      nameLine.className = "round-zone-name-line";
      nameLine.appendChild(document.createTextNode(p.nickname));
      nameEl.appendChild(nameLine);
      var winsSpan = document.createElement("span");
      winsSpan.className = "round-zone-wins";
      winsSpan.textContent = "( " + (winCounts[p.client_id] || 0) + "승 )";
      nameEl.appendChild(winsSpan);
      zone.appendChild(nameEl);
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
    var slot = document.getElementById("round-gameplay-slot");
    var zone = slot ? slot.querySelector(".round-player-zone[data-client-id=\"" + clientId + "\"]") : null;
    if (!zone) return;
    var timeEl = zone.querySelector(".round-zone-time");
    var errorEl = zone.querySelector(".round-zone-error");
    if (timeEl && errorEl) {
      timeEl.textContent = window.GameFormatTime && window.GameFormatTime.formatDurationSeconds ? window.GameFormatTime.formatDurationSeconds(pressTimeSec != null ? pressTimeSec : 0) : (pressTimeSec != null ? pressTimeSec : 0).toFixed(2);
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
    sb.from("timing_round_presses")
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

  function startRoundTimerPhase() {
    var liveTimerEl = document.getElementById("round-live-timer");
    var roundStartAt = state.currentRound ? new Date(state.currentRound.start_at).getTime() : 0;
    function hideLiveTimer() {
      if (state.liveTimerInterval != null) {
        clearInterval(state.liveTimerInterval);
        state.liveTimerInterval = null;
      }
      if (window.GameAudio && window.GameAudio.stopRoundBgm) {
        window.GameAudio.stopRoundBgm(state, { audioKey: "timerBgmAudio" });
      }
    }
    var serverOffsetMs = 0;
    state.liveTimerInterval = setInterval(function () {
      var estimatedServerMs = Date.now() + serverOffsetMs;
      var elapsed = Math.max(0, (estimatedServerMs - roundStartAt) / 1000);
      if (elapsed >= 3) {
        if (state.liveTimerInterval != null) {
          clearInterval(state.liveTimerInterval);
          state.liveTimerInterval = null;
        }
        if (liveTimerEl) liveTimerEl.textContent = "??:??";
        document.getElementById("btn-press").disabled = false;
        return;
      }
      if (liveTimerEl) liveTimerEl.textContent = window.GameFormatTime && window.GameFormatTime.formatDurationSeconds ? window.GameFormatTime.formatDurationSeconds(elapsed) : elapsed.toFixed(2);
    }, 50);
    (window.GameGetServerTime && window.GameGetServerTime.getServerTimeMs ? window.GameGetServerTime.getServerTimeMs(getConfig) : Promise.reject(new Error("GameGetServerTime not loaded")))
      .then(function (r) {
        serverOffsetMs = r.serverNowMs - r.clientNowMs;
      })
      .catch(function () {});
    if (window.GameAudio && window.GameAudio.startRoundBgm) {
      window.GameAudio.startRoundBgm(state, {
        audioKey: "timerBgmAudio",
        afterPlay: function (p) {
          if (p && typeof p.then === "function") {
            p.then(function () { state.bgmPlayPending = false; }).catch(function () { state.bgmPlayPending = true; });
          }
        }
      });
    }
    if (state.roundPressesPollIntervalId != null) {
      clearInterval(state.roundPressesPollIntervalId);
      state.roundPressesPollIntervalId = null;
    }
    refreshRoundPressesDisplay();
    state.roundPressesPollIntervalId = setInterval(refreshRoundPressesDisplay, PRESS_POLL_MS);
    document.getElementById("btn-press").onclick = function () {
      if (state.timerBgmAudio && !state.bgmMuted) {
        state.timerBgmAudio.play().catch(function () {});
        state.bgmPlayPending = false;
      }
      hideLiveTimer();
      document.getElementById("btn-press").disabled = true;
      document.getElementById("btn-press").onclick = null;
      var sb = getSupabase();
      if (sb && state.currentRound) {
        sb.from("timing_round_presses")
          .insert({
            round_id: state.currentRound.id,
            client_id: state.clientId
          })
          .select("created_at")
          .single()
          .then(function (res) {
            if (res.data && res.data.created_at) state.myPressCreatedAt = res.data.created_at;
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
        sb.from("timing_round_presses").select("client_id").eq("round_id", roundId).then(function (pressRes) {
          sb.from("timing_room_players").select("client_id").eq("room_id", state.roomId).then(function (playerRes) {
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

  function runCountdownToRoundStart(startAt, onComplete) {
    var slot = document.getElementById("round-gameplay-slot");
    if (!window.GameCountdown || !slot) return onComplete();
    window.GameCountdown.run({
      container: slot,
      countFrom: 4,
      startAt: startAt,
      getServerTime: window.GameGetServerTime && window.GameGetServerTime.getServerTimeMs ? function () { return window.GameGetServerTime.getServerTimeMs(getConfig); } : undefined,
      onComplete: onComplete
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
    state.myPressCreatedAt = null;
    ensureTimingRoundDOM();
    document.getElementById("round-target-msg").textContent = round.target_seconds + "초에 맞춰 누르세요.";
    document.getElementById("btn-press").disabled = true;
    var gameplayWrap = document.getElementById("round-gameplay-wrap");
    var btnPress = document.getElementById("btn-press");
    var resultSection = document.getElementById("round-result-section");
    if (gameplayWrap) gameplayWrap.classList.remove("hidden");
    if (btnPress) btnPress.classList.remove("hidden");
    if (resultSection) resultSection.classList.add("hidden");
    var slot = document.getElementById("round-gameplay-slot");
    if (slot) slot.classList.remove("hidden");
    var liveTimerEl = document.getElementById("round-live-timer");
    if (liveTimerEl) liveTimerEl.textContent = "00.00";
    showScreen("screen-round");

    var sb = getSupabase();
    if (sb && state.roomId) {
      sb.from("timing_room_players")
        .select("client_id, nickname")
        .eq("room_id", state.roomId)
        .order("joined_at")
        .then(function (res) {
          state.roundPlayers = res.data || [];
          renderRoundPlayerZones(state.roundPlayers, state.winCounts || {});
        });
    }

    var startAt = new Date(round.start_at).getTime();
    runCountdownToRoundStart(startAt, startRoundTimerPhase);
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
      sb.from("timing_round_presses")
        .select("client_id, created_at")
        .eq("round_id", roundId)
        .then(function (pressRes) {
          sb.from("timing_room_players")
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
              if (state.myPressCreatedAt && players[state.clientId] !== undefined) {
                var myCreated = new Date(state.myPressCreatedAt).getTime();
                var myOffset = myCreated - startAt - targetMs;
                var hasMe = list.some(function (x) { return x.client_id === state.clientId; });
                if (!hasMe) list.push({ client_id: state.clientId, nickname: players[state.clientId] || state.clientId, offsetMs: myOffset });
                else list.forEach(function (x) {
                  if (x.client_id === state.clientId) x.offsetMs = myOffset;
                });
              }
              state.myPressCreatedAt = null;
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
              var winnerClientId = (winner && winner.offsetMs != null) ? winner.client_id : null;
              if (winnerClientId) {
                newWinCounts[winnerClientId] = (newWinCounts[winnerClientId] || 0) + 1;
              }
              state.winCounts = newWinCounts;
              state.lastRoundWinnerId = winnerClientId;
              state.roundResultOrder = list;
              state.roundPlayers = (playerRes.data || []).map(function (p) {
                return { client_id: p.client_id, nickname: players[p.client_id] || p.client_id };
              });
              var cfg = getConfig();
              if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
                fetch(cfg.SUPABASE_URL + "/functions/v1/finish-timing-round", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY },
                  body: JSON.stringify({ round_id: roundId })
                }).catch(function () {});
              }
              showRoundEnd();
            });
        });
    }

    setTimeout(pollResult, 2000);
  }

  function applyRoundEndRanks() {
    var container = document.getElementById("round-result-zones");
    var resultOrder = state.roundResultOrder || [];
    if (typeof GameRankDisplay !== "undefined" && GameRankDisplay.applyRanks) {
      GameRankDisplay.applyRanks(container, resultOrder, {
        getWinCount: function (cid) { return (state.winCounts || {})[cid] || 0; },
        winsFormat: "paren"
      });
    }
  }

  function buildTimingResultZones() {
    var container = document.getElementById("round-result-zones");
    if (!container || !state.roundResultOrder || !state.roundResultOrder.length) return;
    var targetSec = (state.currentRound && state.currentRound.target_seconds) || 0;
    container.innerHTML = "";
    container.className = "round-player-zones count-" + Math.min(state.roundResultOrder.length, 8);
    if (typeof GamePlayerZone !== "undefined" && GamePlayerZone.createPlayerZone) {
      state.roundResultOrder.forEach(function (p, i) {
        var timeText = "—";
        var errorText = "—";
        if (p.offsetMs != null) {
          var pressTimeSec = targetSec + p.offsetMs / 1000;
          timeText = window.GameFormatTime && window.GameFormatTime.formatDurationSeconds ? window.GameFormatTime.formatDurationSeconds(pressTimeSec || 0) : (pressTimeSec || 0).toFixed(2);
          var sign = (p.offsetMs || 0) >= 0 ? "+" : "";
          errorText = "오차: " + sign + (p.offsetMs / 1000).toFixed(2);
        }
        var slot = GamePlayerZone.createPlayerZone({
          clientId: p.client_id,
          nickname: p.nickname || p.client_id,
          pNum: i + 1,
          isMe: p.client_id === state.clientId,
          winCount: (state.winCounts && state.winCounts[p.client_id]) || 0,
          winsFormat: "paren",
          showWins: true,
          wrapInSlot: true,
          extras: [
            { className: "round-zone-time", textContent: timeText },
            { className: "round-zone-error", textContent: errorText }
          ]
        });
        container.appendChild(slot);
      });
    } else {
      state.roundResultOrder.forEach(function (p, i) {
        var slot = document.createElement("div");
        slot.className = "round-player-slot";
        var zone = document.createElement("div");
        zone.className = "round-player-zone" + (p.client_id === state.clientId ? " me" : "");
        zone.dataset.clientId = p.client_id;
        var num = i + 1;
        var pNumSpan = document.createElement("span");
        pNumSpan.className = "round-zone-p-num num-" + num;
        pNumSpan.textContent = "P" + num;
        zone.appendChild(pNumSpan);
        var nameEl = document.createElement("div");
        nameEl.className = "round-zone-name";
        var nameLine = document.createElement("div");
        nameLine.className = "round-zone-name-line";
        nameLine.appendChild(document.createTextNode(p.nickname || p.client_id));
        nameEl.appendChild(nameLine);
        var winsSpan = document.createElement("span");
        winsSpan.className = "round-zone-wins";
        nameEl.appendChild(winsSpan);
        zone.appendChild(nameEl);
        var timeEl = document.createElement("div");
        timeEl.className = "round-zone-time";
        var errorEl = document.createElement("div");
        errorEl.className = "round-zone-error";
        if (p.offsetMs != null) {
          var pressTimeSec = targetSec + p.offsetMs / 1000;
          timeEl.textContent = window.GameFormatTime && window.GameFormatTime.formatDurationSeconds ? window.GameFormatTime.formatDurationSeconds(pressTimeSec || 0) : (pressTimeSec || 0).toFixed(2);
          var sign = (p.offsetMs || 0) >= 0 ? "+" : "";
          errorEl.textContent = "오차: " + sign + (p.offsetMs / 1000).toFixed(2);
        } else {
          timeEl.textContent = "—";
          errorEl.textContent = "—";
        }
        zone.appendChild(timeEl);
        zone.appendChild(errorEl);
        slot.appendChild(zone);
        container.appendChild(slot);
      });
    }
  }

  function playAgain() {
    state.currentRound = null;
    state.roundResultOrder = null;
    state.roundPlayers = null;
    state.lastRoundWinnerId = null;
    state.myPressCreatedAt = null;
    state.startButtonDelayFromPlayAgain = true;
    if (state.roundPressesPollIntervalId != null) {
      clearInterval(state.roundPressesPollIntervalId);
      state.roundPressesPollIntervalId = null;
    }
    if (state.waitAllPressesIntervalId != null) {
      clearInterval(state.waitAllPressesIntervalId);
      state.waitAllPressesIntervalId = null;
    }
    if (state.liveTimerInterval != null) {
      clearInterval(state.liveTimerInterval);
      state.liveTimerInterval = null;
    }
    if (state.timerBgmAudio) {
      state.timerBgmAudio.pause();
      state.timerBgmAudio = null;
    }
    if (window.GameAudio && window.GameAudio.stopRoundBgm) {
      window.GameAudio.stopRoundBgm(state, { audioKey: "timerBgmAudio" });
    }
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

  function showRoundEnd() {
    if (window.GameAudio && window.GameAudio.stopRoundBgm) {
      window.GameAudio.stopRoundBgm(state, { audioKey: "timerBgmAudio" });
    }
    var slot = document.getElementById("round-gameplay-slot");
    var resultSection = document.getElementById("round-result-section");
    if (slot) slot.classList.add("hidden");
    if (resultSection) resultSection.classList.remove("hidden");
    buildTimingResultZones();
    if (state.lastRoundWinnerId && state.clientId === state.lastRoundWinnerId && window.GameAudio && window.GameAudio.playWinSound) {
      window.GameAudio.playWinSound();
    }
    applyRoundEndRanks();
  }

  function leaveRoom() {
    var sb = getSupabase();
    if (!sb || !state.roomId) return;

    if (state.isHost) {
      sb.from("timing_rooms").delete().eq("id", state.roomId).eq("host_client_id", state.clientId).then(function () {});
    }
    sb.from("timing_room_players").delete().eq("room_id", state.roomId).eq("client_id", state.clientId).then(function () {});
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
