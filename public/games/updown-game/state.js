/**
 * 업다운 게임 상태 및 헬퍼 (DOM 없음)
 */
(function (global) {
  "use strict";

  var STORAGE_CLIENT_ID = "updown_game_client_id";
  var STORAGE_NICKNAME = "mini_game_nickname";

  function getConfig() {
    return (global.UPDOWN_GAME_CONFIG || (global.window && global.window.UPDOWN_GAME_CONFIG)) || {};
  }

  function getSupabase() {
    var cfg = getConfig();
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    var w = global.window || global;
    if (!w.supabase) return null;
    return w.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  function getClientId() {
    var id = global.localStorage.getItem(STORAGE_CLIENT_ID);
    if (!id) {
      id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      global.localStorage.setItem(STORAGE_CLIENT_ID, id);
    }
    return id;
  }

  function getNickname() {
    return global.localStorage.getItem(STORAGE_NICKNAME) || "";
  }

  function setNickname(name) {
    global.localStorage.setItem(STORAGE_NICKNAME, (name || "").trim());
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
    roundBgmAudio: null,
    bgmRoundIndex: 0,
    roomId: null,
    roomCode: null,
    roomName: null,
    isHost: false,
    hostClientId: null,
    unsubscribeRoom: null,
    lobbyPlayersPollIntervalId: null,
    lobbyRoundPollIntervalId: null,
    currentRound: null,
    winCounts: {},
    winnerClientId: null,
    winnerNickname: null,
    roundDurationSeconds: null,
    roundCreatedAt: null,
    roundStartAt: null,
    roundCorrectList: null,
    roundPlayers: null
  };

  function cleanupSubscriptions() {
    if (state.lobbyPlayersPollIntervalId != null) {
      clearInterval(state.lobbyPlayersPollIntervalId);
      state.lobbyPlayersPollIntervalId = null;
    }
    if (state.lobbyRoundPollIntervalId != null) {
      clearInterval(state.lobbyRoundPollIntervalId);
      state.lobbyRoundPollIntervalId = null;
    }
    if (state.unsubscribeRoom) {
      state.unsubscribeRoom();
      state.unsubscribeRoom = null;
    }
  }

  var w = global.window || global;
  w.UpdownGame = w.UpdownGame || {};
  w.UpdownGame.state = state;
  w.UpdownGame.getConfig = getConfig;
  w.UpdownGame.getSupabase = getSupabase;
  w.UpdownGame.getClientId = getClientId;
  w.UpdownGame.getNickname = getNickname;
  w.UpdownGame.setNickname = setNickname;
  w.UpdownGame.generateRoomCode = generateRoomCode;
  w.UpdownGame.cleanupSubscriptions = cleanupSubscriptions;
})(typeof window !== "undefined" ? window : this);
