(function () {
  "use strict";

  var UpdownGame = window.UpdownGame;
  var state = UpdownGame.state;
  var getConfig = UpdownGame.getConfig;
  var getSupabase = UpdownGame.getSupabase;
  var getNickname = UpdownGame.getNickname;
  var setNickname = UpdownGame.setNickname;
  var generateRoomCode = UpdownGame.generateRoomCode;
  var cleanupSubscriptions = UpdownGame.cleanupSubscriptions;

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

  function showScreen(id) {
    document.querySelectorAll(".game-page-wrapper .screen").forEach(function (el) {
      el.classList.add("hidden");
    });
    var el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function ensureUpdownRoundDOM() {
    var slot = document.getElementById("round-gameplay-slot");
    if (!slot || slot.children.length > 0) return;
    var gameplay = document.createElement("div");
    gameplay.id = "round-gameplay";
    gameplay.className = "round-gameplay";
    var rangeMsg = document.createElement("p");
    rangeMsg.id = "round-range-msg";
    rangeMsg.className = "round-range-msg";
    rangeMsg.innerHTML = "<span style=\"color:#f87171\">↑ <span id=\"round-range-min\">1</span></span> &nbsp; <span style=\"color:#60a5fa\">↓ <span id=\"round-range-max\">50</span></span>";
    gameplay.appendChild(rangeMsg);
    var liveZones = document.createElement("div");
    liveZones.id = "round-live-zones";
    liveZones.className = "round-player-zones";
    gameplay.appendChild(liveZones);
    var inputRow = document.createElement("div");
    inputRow.className = "round-input-row";
    var inputGuess = document.createElement("input");
    inputGuess.type = "number";
    inputGuess.id = "input-guess";
    inputGuess.min = "1";
    inputGuess.max = "1";
    inputGuess.placeholder = "숫자";
    inputGuess.setAttribute("inputmode", "numeric");
    var btnSubmit = document.createElement("button");
    btnSubmit.type = "button";
    btnSubmit.id = "btn-submit-guess";
    btnSubmit.textContent = "제출";
    btnSubmit.onclick = submitGuess;
    inputRow.appendChild(inputGuess);
    inputRow.appendChild(btnSubmit);
    gameplay.appendChild(inputRow);
    var feedback = document.createElement("p");
    feedback.id = "round-feedback";
    feedback.className = "round-feedback hidden";
    gameplay.appendChild(feedback);
    slot.appendChild(gameplay);
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
    /* btn-submit-guess는 라운드 진입 시 ensureUpdownRoundDOM()에서 생성·바인딩 */
    document.getElementById("btn-round-play-again").onclick = function () {
      var resultSection = document.getElementById("round-result-section");
      var slot = document.getElementById("round-gameplay-slot");
      if (resultSection) resultSection.classList.add("hidden");
      if (slot) slot.classList.remove("hidden");
      showScreen("screen-lobby");
      enterLobby();
    };
    document.getElementById("btn-round-leave").onclick = leaveRoom;
    var btnRefresh = document.getElementById("btn-refresh");
    if (btnRefresh) btnRefresh.onclick = function () { location.reload(); };
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
    if (!state.nickname) {
      alert("닉네임을 먼저 홈 화면에서 설정해 주세요.");
      return;
    }
    setNickname(state.nickname);
    var name = document.getElementById("input-room-name").value.trim() || "대기실";
    var sb = getSupabase();
    if (!sb) return;
    var code = generateRoomCode();
    sb.from("updown_rooms")
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
        return sb.from("updown_room_players")
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
    if (!state.nickname) {
      alert("닉네임을 먼저 홈 화면에서 설정해 주세요.");
      return;
    }
    setNickname(state.nickname);
    var code = document.getElementById("input-join-code").value.trim().replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) { alert("6자리 방 코드를 입력하세요."); return; }
    var sb = getSupabase();
    if (!sb) return;
    sb.from("updown_rooms")
      .select("id, name, host_client_id, closed_at")
      .eq("code", code)
      .single()
      .then(function (res) {
        if (res.error || !res.data) { alert("방을 찾을 수 없습니다."); return; }
        var room = res.data;
        if (room.closed_at) { alert("이미 종료된 방입니다."); return; }
        return sb.from("updown_room_players")
          .insert({ room_id: room.id, client_id: state.clientId, nickname: state.nickname })
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

  function refreshLobbyWins(callback) {
    if (!state.roomId) {
      if (callback) callback();
      return;
    }
    var sb = getSupabase();
    if (!sb) {
      if (callback) callback();
      return;
    }
    sb.from("updown_rounds")
      .select("winner_client_id")
      .eq("room_id", state.roomId)
      .eq("status", "finished")
      .then(function (res) {
        var counts = {};
        (res.data || []).forEach(function (r) {
          if (r.winner_client_id) {
            counts[r.winner_client_id] = (counts[r.winner_client_id] || 0) + 1;
          }
        });
        state.winCounts = counts;
        refreshLobbyPlayers();
        if (callback) callback();
      })
      .catch(function () {
        if (callback) callback();
      });
  }

  function refreshLobbyPlayers() {
    var sb = getSupabase();
    if (!sb || !state.roomId) return;
    sb.from("updown_room_players")
      .select("nickname, client_id")
      .eq("room_id", state.roomId)
      .order("joined_at")
      .then(function (res) {
        var ul = document.getElementById("lobby-players");
        ul.innerHTML = "";
        var hostClientId = state.hostClientId || (state.isHost ? state.clientId : null);
        (res.data || []).forEach(function (p, i) {
          var li = document.createElement("li");
          var numSpan = document.createElement("span");
          numSpan.className = "lobby-player-num";
          numSpan.textContent = "P" + (i + 1);
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
      });
  }

  function enterLobby() {
    var sb = getSupabase();
    if (!sb || !state.roomId) return;
    cleanupSubscriptions();
    var titleEl = document.getElementById("lobby-room-name");
    titleEl.textContent = "[ " + (state.roomName || "대기실") + " ]";
    sb.from("updown_rooms").select("name").eq("id", state.roomId).single().then(function (res) {
      if (res.data && res.data.name) {
        state.roomName = res.data.name;
        titleEl.textContent = "[ " + state.roomName + " ]";
      }
    });
    refreshLobbyWins();
    document.querySelectorAll(".host-only").forEach(function (el) {
      el.classList.toggle("hidden", !state.isHost);
    });
    var noticeEl = document.getElementById("lobby-notice");
    if (noticeEl) {
      noticeEl.textContent = state.isHost ? "" : "방장이 '시작'을 누르면 시작합니다.";
      noticeEl.classList.toggle("hidden", state.isHost);
    }
    var channel = sb.channel("updown-room:" + state.roomId);
    var btnStart = document.getElementById("btn-start-round");
    if (btnStart) btnStart.disabled = false;
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "updown_room_players", filter: "room_id=eq." + state.roomId }, refreshLobbyWins)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "updown_rounds", filter: "room_id=eq." + state.roomId }, function (payload) {
        if (payload.new && payload.new.id) onRoundStarted(payload.new);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "updown_rooms", filter: "id=eq." + state.roomId }, function () {
        state.roomId = null;
        state.isHost = false;
        cleanupSubscriptions();
        showScreen("screen-nickname");
      })
      .subscribe(function (status) {
        if (status === "SUBSCRIBED" && btnStart) btnStart.disabled = !state.isHost;
      });
    state.unsubscribeRoom = function () { sb.removeChannel(channel); };
    state.lobbyPlayersPollIntervalId = setInterval(function () {
      if (!state.roomId) return;
      refreshLobbyWins();
    }, 3000);
    var pollMs = 1500;
    state.lobbyRoundPollIntervalId = setInterval(function () {
      if (!state.roomId) return;
      sb.from("updown_rounds")
        .select("id, status, winner_client_id")
        .eq("room_id", state.roomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(function (res) {
          if (!res.data || res.data.length === 0) return;
          var round = res.data[0];
          if (state.currentRound && state.currentRound.id === round.id) return;
          clearInterval(state.lobbyRoundPollIntervalId);
          state.lobbyRoundPollIntervalId = null;
          onRoundStarted({ id: round.id });
        });
    }, pollMs);
  }

  function startRound() {
    var sb = getSupabase();
    var cfg = getConfig();
    if (!sb || !state.roomId || !state.isHost) return;
    var btnStart = document.getElementById("btn-start-round");
    if (btnStart) btnStart.disabled = true;
    fetch(cfg.SUPABASE_URL + "/functions/v1/start-updown-round", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY },
      body: JSON.stringify({ room_id: state.roomId, client_id: state.clientId })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          if (btnStart) btnStart.disabled = false;
          alert(data.error);
          return;
        }
        if (data.round_id) {
          if (state.lobbyRoundPollIntervalId) {
            clearInterval(state.lobbyRoundPollIntervalId);
            state.lobbyRoundPollIntervalId = null;
          }
          state.currentRound = { id: data.round_id, min: 1, max: 50 };
          state.winnerClientId = null;
          state.roundDurationSeconds = null;
          state.roundCreatedAt = null;
          state.roundCorrectList = null;
          loadRoundPlayersAndShowGame();
        }
      })
      .catch(function (e) {
        if (btnStart) btnStart.disabled = false;
        var msg = e.message || "";
        if (msg.indexOf("fetch") !== -1 || msg.indexOf("Failed") !== -1) {
          alert("시작 실패: 서버에 연결할 수 없습니다. Supabase에 'start-updown-round' Edge Function이 배포되어 있는지 확인하세요. (README 참고)");
        } else {
          alert("시작 실패: " + msg);
        }
      });
  }

  function loadRoundPlayersAndShowGame() {
    var sb = getSupabase();
    if (!sb || !state.roomId || !state.currentRound) return;
    sb.from("updown_room_players")
      .select("client_id, nickname")
      .eq("room_id", state.roomId)
      .order("joined_at")
      .then(function (res) {
        state.roundPlayers = res.data || [];
        showRoundScreen();
      });
  }

  function onRoundStarted(roundPayload) {
    var roundId = roundPayload.id;
    if (state.currentRound && state.currentRound.id === roundId) return;
    if (state.lobbyRoundPollIntervalId) {
      clearInterval(state.lobbyRoundPollIntervalId);
      state.lobbyRoundPollIntervalId = null;
    }
    state.currentRound = { id: roundId, min: 1, max: 50 };
    state.winnerClientId = null;
    state.roundDurationSeconds = null;
    state.roundCreatedAt = null;
    state.roundCorrectList = null;
    ensureUpdownRoundDOM();
    showScreen("screen-round");
    var slot = document.getElementById("round-gameplay-slot");
    var resultSection = document.getElementById("round-result-section");
    if (slot) slot.classList.remove("hidden");
    if (resultSection) resultSection.classList.add("hidden");
    refreshLobbyWins();
    loadRoundPlayersAndShowGame();
    var sb = getSupabase();
    if (sb) {
      var sub = sb.channel("updown-round:" + roundId)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "updown_rounds", filter: "id=eq." + roundId }, function (payload) {
          if (payload.new && payload.new.status === "finished") {
            state.roundCreatedAt = payload.new.created_at || null;
            state.roundCorrectList = null;
            var correctPromise = sb.from("updown_round_correct")
              .select("client_id, correct_at")
              .eq("round_id", roundId)
              .order("correct_at", { ascending: true })
              .then(function (res) { return (res.data || []).slice(); });
            var roundPromise = sb.from("updown_rounds")
              .select("created_at")
              .eq("id", roundId)
              .maybeSingle()
              .then(function (res) {
                if (res.error) return null;
                return res.data && res.data.created_at ? res.data.created_at : null;
              });
            Promise.allSettled([correctPromise, roundPromise]).then(function (results) {
              state.roundCorrectList = results[0].status === "fulfilled" ? results[0].value : [];
              if (results[1].status === "fulfilled" && results[1].value != null) state.roundCreatedAt = results[1].value;
              refreshLobbyWins(function () {
                showRoundResult();
              });
            });
          }
        })
        .subscribe();
      state.unsubscribeRound = function () { if (sub) sb.removeChannel(sub); };
    }
  }

  function showRoundScreen() {
    ensureUpdownRoundDOM();
    showScreen("screen-round");
    var slot = document.getElementById("round-gameplay-slot");
    var resultSection = document.getElementById("round-result-section");
    if (slot) slot.classList.remove("hidden");
    if (resultSection) resultSection.classList.add("hidden");
    startRoundBgm();
    var min = state.currentRound ? state.currentRound.min : 1;
    var max = state.currentRound ? state.currentRound.max : 50;
    document.getElementById("round-range-min").textContent = min;
    document.getElementById("round-range-max").textContent = max;
    document.getElementById("input-guess").min = min;
    document.getElementById("input-guess").max = max;
    document.getElementById("input-guess").value = "";
    document.getElementById("round-feedback").classList.add("hidden");
    renderRoundPlayerZones(state.roundPlayers || [], state.winCounts || {});
    var sb = getSupabase();
    if (sb && state.currentRound) {
      var roundId = state.currentRound.id;
      var channel = sb.channel("updown-round:" + roundId);
      channel
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "updown_rounds", filter: "id=eq." + roundId }, function (payload) {
          if (payload.new && payload.new.status === "finished") {
            state.roundCreatedAt = payload.new.created_at || null;
            state.roundCorrectList = null;
            var correctPromise = sb.from("updown_round_correct")
              .select("client_id, correct_at")
              .eq("round_id", roundId)
              .order("correct_at", { ascending: true })
              .then(function (res) { return (res.data || []).slice(); });
            var roundPromise = sb.from("updown_rounds")
              .select("created_at")
              .eq("id", roundId)
              .maybeSingle()
              .then(function (res) {
                if (res.error) return null;
                return res.data && res.data.created_at ? res.data.created_at : null;
              });
            Promise.allSettled([correctPromise, roundPromise]).then(function (results) {
              state.roundCorrectList = results[0].status === "fulfilled" ? results[0].value : [];
              if (results[1].status === "fulfilled" && results[1].value != null) state.roundCreatedAt = results[1].value;
              refreshLobbyWins(function () {
                showRoundResult();
              });
            });
          }
        })
        .subscribe();
      state.unsubscribeRound = function () { sb.removeChannel(channel); };
    }
  }

  function renderRoundPlayerZones(players, winCounts) {
    var container = document.getElementById("round-live-zones");
    if (!container) return;
    var list = players || [];
    if (typeof GamePlayerZone !== "undefined" && GamePlayerZone.fillPlayerZones) {
      GamePlayerZone.fillPlayerZones(container, list, winCounts, state.clientId, {
        wrapInSlot: false,
        winsFormat: "plain",
        showWins: true
      });
      return;
    }
    container.innerHTML = "";
    container.className = "round-player-zones count-" + Math.min(list.length || 1, 8);
    list.forEach(function (p, i) {
      var zone = document.createElement("div");
      zone.className = "round-player-zone" + (p.client_id === state.clientId ? " me" : "");
      zone.dataset.clientId = p.client_id;
      var pNum = document.createElement("div");
      pNum.className = "round-zone-p-num";
      pNum.textContent = "P" + (i + 1);
      zone.appendChild(pNum);
      var nameEl = document.createElement("div");
      nameEl.className = "round-zone-name";
      nameEl.textContent = p.nickname;
      zone.appendChild(nameEl);
      var winsEl = document.createElement("div");
      winsEl.className = "round-zone-wins";
      winsEl.textContent = (winCounts[p.client_id] || 0) + "승";
      zone.appendChild(winsEl);
      container.appendChild(zone);
    });
  }

  function showRoundResult() {
    stopRoundBgm();
    var slot = document.getElementById("round-gameplay-slot");
    var resultSection = document.getElementById("round-result-section");
    if (slot) slot.classList.add("hidden");
    if (resultSection) resultSection.classList.remove("hidden");
    var players = state.roundPlayers || [];
    var correctList = state.roundCorrectList || [];
    var resultOrder = correctList.map(function (c) {
      var p = players.find(function (x) { return x.client_id === c.client_id; });
      return { client_id: c.client_id, nickname: (p && p.nickname) || c.client_id, correct_at: c.correct_at };
    });
    if (resultOrder.length === 0) {
      resultOrder = players.slice();
    }
    var resultZones = document.getElementById("round-result-zones");
    if (resultZones && resultOrder.length) {
      if (typeof GamePlayerZone !== "undefined" && GamePlayerZone.fillPlayerZones) {
        GamePlayerZone.fillPlayerZones(resultZones, resultOrder, state.winCounts || {}, state.clientId, {
          wrapInSlot: true,
          winsFormat: "paren",
          showWins: true,
          extrasFor: function (p) {
            var sec = "—";
            if (p.correct_at && state.roundCreatedAt) {
              sec = ((new Date(p.correct_at).getTime() - new Date(state.roundCreatedAt).getTime()) / 1000).toFixed(1) + "초";
            }
            return [{ className: "round-zone-duration", textContent: sec }];
          }
        });
      } else {
        resultZones.innerHTML = "";
        resultZones.className = "round-player-zones count-" + Math.min(resultOrder.length, 8);
        resultOrder.forEach(function (p, i) {
          var slotEl = document.createElement("div");
          slotEl.className = "round-player-slot";
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
          nameEl.appendChild(winsSpan);
          zone.appendChild(nameEl);
          var durationEl = document.createElement("div");
          durationEl.className = "round-zone-duration";
          var sec = "—";
          if (p.correct_at && state.roundCreatedAt) {
            sec = ((new Date(p.correct_at).getTime() - new Date(state.roundCreatedAt).getTime()) / 1000).toFixed(1) + "초";
          }
          durationEl.textContent = sec;
          zone.appendChild(durationEl);
          slotEl.appendChild(zone);
          resultZones.appendChild(slotEl);
        });
      }
      if (typeof GameRankDisplay !== "undefined" && GameRankDisplay.applyRanks) {
        GameRankDisplay.applyRanks(resultZones, resultOrder, {
          getWinCount: function (cid) { return (state.winCounts || {})[cid] || 0; },
          winsFormat: "paren"
        });
      }
    }
    document.querySelectorAll(".host-only").forEach(function (el) {
      el.classList.toggle("hidden", !state.isHost);
    });
    if (resultOrder.length > 0 && resultOrder[0].client_id === state.clientId) {
      try {
        var winAudio = new Audio("../common/sounds/win.mp3");
        winAudio.play();
      } catch (e) {}
    }
    if (state.unsubscribeRound) state.unsubscribeRound();
  }

  function submitGuess() {
    var cfg = getConfig();
    var input = document.getElementById("input-guess");
    var btn = document.getElementById("btn-submit-guess");
    var feedback = document.getElementById("round-feedback");
    var guess = parseInt(input.value, 10);
    var min = state.currentRound ? state.currentRound.min : 1;
    var max = state.currentRound ? state.currentRound.max : 50;
    if (isNaN(guess) || guess < min || guess > max) {
      feedback.textContent = min + " ~ " + max + " 사이 숫자를 입력하세요.";
      feedback.classList.remove("hidden", "up", "down", "correct");
      return;
    }
    btn.disabled = true;
    feedback.classList.add("hidden");
    fetch(cfg.SUPABASE_URL + "/functions/v1/submit-updown-guess", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY },
      body: JSON.stringify({ round_id: state.currentRound.id, client_id: state.clientId, guess: guess })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        if (data.error) {
          feedback.textContent = data.error;
          feedback.classList.remove("up", "down", "correct");
          feedback.classList.remove("hidden");
          return;
        }
        if (data.result === "correct") {
          state.currentRound.min = guess;
          state.currentRound.max = guess;
          feedback.textContent = "정답!";
          feedback.className = "round-feedback correct";
          feedback.classList.remove("hidden");
          state.winnerClientId = state.clientId;
          // DB에 반영된 승수 갱신 후 결과 화면 표시
          refreshLobbyWins(function () {
            showRoundResult();
          });
          return;
        }
        if (data.result === "up") {
          state.currentRound.min = data.min;
          state.currentRound.max = data.max;
          document.getElementById("round-range-min").textContent = data.min;
          document.getElementById("round-range-max").textContent = data.max;
          input.min = data.min;
          input.max = data.max;
          input.value = "";
          feedback.textContent = "업! (더 커요)";
          feedback.className = "round-feedback up";
          feedback.classList.remove("hidden");
        } else if (data.result === "down") {
          state.currentRound.min = data.min;
          state.currentRound.max = data.max;
          document.getElementById("round-range-min").textContent = data.min;
          document.getElementById("round-range-max").textContent = data.max;
          input.min = data.min;
          input.max = data.max;
          input.value = "";
          feedback.textContent = "다운! (더 작아요)";
          feedback.className = "round-feedback down";
          feedback.classList.remove("hidden");
        }
      })
      .catch(function (e) {
        btn.disabled = false;
        feedback.textContent = "오류: " + e.message;
        feedback.classList.remove("up", "down", "correct");
        feedback.classList.remove("hidden");
      });
  }

  function leaveRoom() {
    var sb = getSupabase();
    if (sb && state.roomId) {
      sb.from("updown_room_players")
        .delete()
        .eq("room_id", state.roomId)
        .eq("client_id", state.clientId)
        .then(function () {
          state.roomId = null;
          state.currentRound = null;
          state.isHost = false;
          cleanupSubscriptions();
          if (state.unsubscribeRound) state.unsubscribeRound();
          showScreen("screen-nickname");
        });
    } else {
      state.roomId = null;
      state.currentRound = null;
      state.isHost = false;
      cleanupSubscriptions();
      showScreen("screen-nickname");
    }
  }

  init();
})();
