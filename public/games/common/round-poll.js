/**
 * 방의 "최신 라운드 1건" 폴링 — 새 라운드 감지 시 콜백 한 번 호출 후 정리.
 * 타이밍/업다운/숫자레이스 로비·결과 화면에서 공통 사용.
 */
(function (global) {
  "use strict";

  var DEFAULT_INTERVAL_MS = 1000;
  var DEFAULT_ROOM_ID_COLUMN = "room_id";

  /**
   * @param {object} sb - Supabase client
   * @param {object} opts
   * @param {string} opts.roomId
   * @param {string} opts.table - 'timing_rounds' | 'updown_rounds' | 'no_rounds'
   * @param {string} [opts.roomIdColumn='room_id']
   * @param {string} [opts.select='id, start_at, created_at']
   * @param {function(): string|null} opts.getCurrentRoundId
   * @param {function(object): void} opts.onNewRound - 새 라운드 시 한 번만 호출
   * @param {function(object): boolean} [opts.shouldAcceptRound] - true일 때만 onNewRound 호출
   * @param {number} [opts.intervalMs=1000]
   * @returns {function()} stop - 호출 시 clearInterval 후 정리
   */
  function startLatestRoundPoll(sb, opts) {
    var roomId = opts.roomId;
    var table = opts.table;
    var roomIdColumn = opts.roomIdColumn != null ? opts.roomIdColumn : DEFAULT_ROOM_ID_COLUMN;
    var select = opts.select != null ? opts.select : "id, start_at, created_at";
    var getCurrentRoundId = opts.getCurrentRoundId;
    var onNewRound = opts.onNewRound;
    var shouldAcceptRound = opts.shouldAcceptRound;
    var intervalMs = opts.intervalMs != null ? opts.intervalMs : DEFAULT_INTERVAL_MS;

    var intervalId = null;

    function stop() {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    intervalId = setInterval(function () {
      if (!roomId || !sb) return;
      sb.from(table)
        .select(select)
        .eq(roomIdColumn, roomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(function (res) {
          if (!res.data || res.data.length === 0) return;
          var round = res.data[0];
          var currentId = getCurrentRoundId ? getCurrentRoundId() : null;
          if (round.id === currentId) return;
          if (shouldAcceptRound && !shouldAcceptRound(round)) return;
          stop();
          onNewRound(round);
        });
    }, intervalMs);

    return stop;
  }

  var w = global.window || global;
  w.GameRoundPoll = w.GameRoundPoll || {};
  w.GameRoundPoll.startLatestRoundPoll = startLatestRoundPoll;
})(typeof window !== "undefined" ? window : this);
