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

  var showScreen = window.GameShell && window.GameShell.showScreen;

  function init() {
    var sb = getSupabase();
    if (!sb) {
      var row = document.querySelector("#screen-nickname .button-row");
      if (row) row.innerHTML = "<p>Supabase URL과 anon key를 .env에 설정하세요. (SUPABASE_URL, SUPABASE_ANON_KEY)</p>";
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
    if (window.GameAudio && window.GameAudio.setupBgmButton) {
      window.GameAudio.setupBgmButton(state, { audioKey: "roundBgmAudio" });
    }
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

  function refreshLobbyWins() {
    if (!state.roomId) return;
    var sb = getSupabase();
    if (!sb) return;
    if (window.GameWinCounts && window.GameWinCounts.fetchRoomWinCounts) {
      window.GameWinCounts
        .fetchRoomWinCounts(sb, {
          roundsTable: "no_rounds",
          roomId: state.roomId,
          finishedBy: "winner"
        })
        .then(function (counts) {
          state.winCounts = counts || {};
          refreshLobbyPlayers();
        })
        .catch(function () { refreshLobbyPlayers(); });
      return;
    }
    refreshLobbyPlayers();
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
    refreshLobbyWins();
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
    var completeMsg = document.getElementById("number-order-complete-msg");
    if (grid) {
      grid.querySelectorAll("button").forEach(function (btn) {
        btn.disabled = true;
      });
    }
    if (completeMsg) { completeMsg.classList.add("hidden"); completeMsg.textContent = ""; }

    var startAtMs = state.currentRound && state.currentRound.start_at ? new Date(state.currentRound.start_at).getTime() : null;
    if (window.GameCountdown && slot) {
      state.countdownActive = true;
      window.GameCountdown.run({
        container: slot,
        countFrom: 4,
        startAt: startAtMs,
        getServerTime: startAtMs && window.GameGetServerTime && window.GameGetServerTime.getServerTimeMs ? function () { return window.GameGetServerTime.getServerTimeMs(getConfig); } : undefined,
        onComplete: function () {
          state.countdownActive = false;
          state.nextExpected = 1;
          if (grid) {
            grid.querySelectorAll("button").forEach(function (btn) {
              btn.disabled = false;
            });
          }
          if (window.GameAudio && window.GameAudio.startRoundBgm) window.GameAudio.startRoundBgm(state);
          (window.GameGetServerTime && window.GameGetServerTime.getServerTimeMs ? window.GameGetServerTime.getServerTimeMs(getConfig) : Promise.reject(new Error("GameGetServerTime not loaded")))
            .then(function (r) {
              state.goTimeServerMs = r.serverNowMs;
              state.serverOffsetMs = r.serverNowMs - r.clientNowMs;
              startGridTimeout();
              startResultPolling();
            })
            .catch(function () {
              var startAt = state.currentRound && state.currentRound.start_at ? new Date(state.currentRound.start_at).getTime() : null;
              state.goTimeServerMs = startAt != null ? startAt + 4000 : Date.now();
              state.serverOffsetMs = 0;
              startGridTimeout();
              startResultPolling();
            });
        }
      });
    } else {
      state.countdownActive = false;
      if (grid) grid.querySelectorAll("button").forEach(function (btn) { btn.disabled = false; });
      var startAt = state.currentRound && state.currentRound.start_at ? new Date(state.currentRound.start_at).getTime() : null;
      state.goTimeServerMs = startAt != null ? startAt + 4000 : Date.now();
      state.serverOffsetMs = 0;
      startResultPolling();
    }
  }

  function startGridTimeout() {
    setTimeout(function () {
      if (state.currentRound && state.nextExpected <= 16) {
        var grid = document.getElementById("number-order-grid");
        if (grid) grid.querySelectorAll("button").forEach(function (btn) { btn.disabled = true; });
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

    if (n === 16) {
      state.nextExpected = 17;
      updateGridPressedState();
      grid.querySelectorAll("button").forEach(function (btn) { btn.disabled = true; });
      var estimatedMs = state.goTimeServerMs != null ? (Date.now() + (state.serverOffsetMs || 0)) - state.goTimeServerMs : 0;
      state.durationMs = Math.max(0, estimatedMs);
      var completeMsg = document.getElementById("number-order-complete-msg");
      if (completeMsg) {
        completeMsg.textContent = "완료! 다른 플레이어 대기 중..";
        completeMsg.classList.remove("hidden");
      }
      var sb = getSupabase();
      (window.GameGetServerTime && window.GameGetServerTime.getServerTimeMs ? window.GameGetServerTime.getServerTimeMs(getConfig) : Promise.reject(new Error("GameGetServerTime not loaded")))
        .then(function (r) {
          state.durationMs = Math.max(0, r.serverNowMs - (state.goTimeServerMs || r.serverNowMs));
          if (sb) {
            sb.from("no_round_results")
              .upsert({ round_id: state.currentRound.id, client_id: state.clientId, duration_ms: state.durationMs }, { onConflict: "round_id,client_id" })
              .then(function () {});
          }
        })
        .catch(function () {
          if (sb) {
            sb.from("no_round_results")
              .upsert({ round_id: state.currentRound.id, client_id: state.clientId, duration_ms: state.durationMs }, { onConflict: "round_id,client_id" })
              .then(function () {});
          }
        });
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
    if (state.resultShownForRoundId === roundId) return;
    state.resultShownForRoundId = roundId;
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
            var winnerClientId = (list.length > 0 && list[0].duration_ms != null) ? list[0].client_id : null;
            var cfg = getConfig();
            if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
              fetch(cfg.SUPABASE_URL + "/functions/v1/finish-no-round", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY },
                body: JSON.stringify({ round_id: roundId })
              }).catch(function () {});
            }
            var newWinCounts = {};
            if (state.winCounts) {
              Object.keys(state.winCounts).forEach(function (cid) { newWinCounts[cid] = state.winCounts[cid]; });
            }
            if (winnerClientId) newWinCounts[winnerClientId] = (newWinCounts[winnerClientId] || 0) + 1;
            state.winCounts = newWinCounts;
            if (window.GameAudio && window.GameAudio.stopRoundBgm) window.GameAudio.stopRoundBgm(state);
            if (list.length > 0 && list[0].client_id === state.clientId && window.GameAudio && window.GameAudio.playWinSound) {
              window.GameAudio.playWinSound();
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
      var durationText = item.duration_ms != null && window.GameFormatTime && window.GameFormatTime.formatDurationSeconds ? window.GameFormatTime.formatDurationSeconds(item.duration_ms / 1000) : (item.duration_ms != null ? (item.duration_ms / 1000).toFixed(2) : "—");
      var zone = window.GamePlayerZone.createPlayerZone({
        clientId: item.client_id,
        nickname: item.nickname,
        pNum: i + 1,
        isMe: item.client_id === state.clientId,
        showWins: true,
        winCount: (state.winCounts && state.winCounts[item.client_id]) || 0,
        winsFormat: "paren",
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
    state.durationMs = null;
    state.goTimeServerMs = null;
    state.serverOffsetMs = null;
    state.roundResultOrder = [];
    state.resultShownForRoundId = null;
    state.countdownActive = false;
    if (state.resultPollIntervalId != null) {
      clearInterval(state.resultPollIntervalId);
      state.resultPollIntervalId = null;
    }
    if (window.GameAudio && window.GameAudio.stopRoundBgm) window.GameAudio.stopRoundBgm(state);
    cleanupSubscriptions();
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
    state.durationMs = null;
    state.goTimeServerMs = null;
    state.serverOffsetMs = null;
    state.roundResultOrder = [];
    state.resultShownForRoundId = null;
    cleanupSubscriptions();
    if (window.GameAudio && window.GameAudio.stopRoundBgm) window.GameAudio.stopRoundBgm(state);
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
