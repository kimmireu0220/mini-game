/**
 * timing-game 상태 및 순수 헬퍼 (DOM 없음)
 */
(function (global) {
  "use strict";

  var STORAGE_CLIENT_ID = "timing_game_client_id";
  var STORAGE_NICKNAME = "mini_game_nickname";

  function getConfig() {
    return (global.TIMING_GAME_CONFIG || (global.window && global.window.TIMING_GAME_CONFIG)) || {};
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
    bgmRoundIndex: 0,
    audioUnlocked: false,
    roomId: null,
    roomCode: null,
    roomName: null,
    isHost: false,
    hostClientId: null,
    unsubscribeRoom: null,
    currentRound: null,
    winCounts: {},
    waitAllPressesIntervalId: null,
    pollRoundIntervalId: null,
    lobbyRoundPollStop: null,
    lobbyPlayersPollIntervalId: null,
    roundPressesPollIntervalId: null,
    liveTimerInterval: null,
    timerBgmAudio: null,
    bgmPlayPending: false,
    roundPlayers: null,
    lastRoundWinnerId: null,
    roundResultOrder: null,
    myPressCreatedAt: null
  };

  function cleanupSubscriptions() {
    if (state.pollRoundIntervalId != null) {
      clearInterval(state.pollRoundIntervalId);
      state.pollRoundIntervalId = null;
    }
    if (state.lobbyRoundPollStop) {
      state.lobbyRoundPollStop();
      state.lobbyRoundPollStop = null;
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
  }

  var w = global.window || global;
  w.TimingGame = w.TimingGame || {};
  w.TimingGame.state = state;
  w.TimingGame.getConfig = getConfig;
  w.TimingGame.getSupabase = getSupabase;
  w.TimingGame.getClientId = getClientId;
  w.TimingGame.getNickname = getNickname;
  w.TimingGame.setNickname = setNickname;
  w.TimingGame.generateRoomCode = generateRoomCode;
  w.TimingGame.cleanupSubscriptions = cleanupSubscriptions;
})(typeof window !== "undefined" ? window : this);
