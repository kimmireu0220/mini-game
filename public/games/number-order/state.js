/**
 * 숫자 레이스(number-order) 상태 및 헬퍼 (DOM 없음)
 */
(function (global) {
  "use strict";

  var STORAGE_CLIENT_ID = "number_order_game_client_id";
  var STORAGE_NICKNAME = "mini_game_nickname";

  function getConfig() {
    return (global.NUMBER_ORDER_GAME_CONFIG || (global.window && global.window.NUMBER_ORDER_GAME_CONFIG)) || {};
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
    roomId: null,
    roomCode: null,
    roomName: null,
    isHost: false,
    hostClientId: null,
    currentRound: null,
    nextExpected: 1,
    durationMs: null,
    roundResultOrder: [],
    winCounts: {},
    resultShownForRoundId: null,
    unsubscribeRoom: null,
    resultPollIntervalId: null,
    resultScreenRoundPollIntervalId: null,
    countdownActive: false,
    goTimeServerMs: null,
    serverOffsetMs: null,
    bgmMuted: false,
    bgmRoundIndex: 0,
    roundBgmAudio: null
  };

  function cleanupSubscriptions() {
    if (state.resultPollIntervalId != null) {
      clearInterval(state.resultPollIntervalId);
      state.resultPollIntervalId = null;
    }
    if (state.resultScreenRoundPollIntervalId != null) {
      clearInterval(state.resultScreenRoundPollIntervalId);
      state.resultScreenRoundPollIntervalId = null;
    }
    if (state.unsubscribeRoom) {
      state.unsubscribeRoom();
      state.unsubscribeRoom = null;
    }
  }

  var w = global.window || global;
  w.NumberOrderGame = w.NumberOrderGame || {};
  w.NumberOrderGame.state = state;
  w.NumberOrderGame.getConfig = getConfig;
  w.NumberOrderGame.getSupabase = getSupabase;
  w.NumberOrderGame.getClientId = getClientId;
  w.NumberOrderGame.getNickname = getNickname;
  w.NumberOrderGame.setNickname = setNickname;
  w.NumberOrderGame.generateRoomCode = generateRoomCode;
  w.NumberOrderGame.cleanupSubscriptions = cleanupSubscriptions;
})(typeof window !== "undefined" ? window : this);
