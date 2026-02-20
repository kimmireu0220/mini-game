/**
 * 게임 공통: 승수(1등 기록) 조회·저장 재사용
 * - 라운드 테이블에 winner_client_id 저장하는 방식 통일 (업다운 기준)
 * - fetchRoomWinCounts: 방별 승수 조회 → { client_id: 승수 }
 * - setRoundWinner: 라운드 1등 기록 (DB 업데이트)
 */
(function (global) {
  var defaultRoomIdColumn = "room_id";
  var defaultWinnerColumn = "winner_client_id";

  /**
   * 해당 방의 종료된 라운드에서 winner_client_id별 승수 집계
   * @param {object} sb - Supabase client
   * @param {object} opts
   * @param {string} opts.roundsTable - 라운드 테이블명 (예: 'updown_rounds', 'timing_rounds')
   * @param {string} opts.roomId - 방 id
   * @param {string} [opts.roomIdColumn='room_id']
   * @param {string} [opts.winnerColumn='winner_client_id']
   * @param {string} opts.finishedBy - 'status' | 'winner'
   *   - 'status': status 컬럼으로 종료 여부 (업다운: status='finished')
   *   - 'winner': winner 컬럼이 not null인 행만 (타이밍/넘버오더)
   * @param {string} [opts.statusColumn='status'] - finishedBy === 'status' 일 때 사용
   * @param {string} [opts.statusValue='finished']
   * @returns {Promise<Object.<string, number>>} client_id -> 승수
   */
  function fetchRoomWinCounts(sb, opts) {
    if (!sb || !opts || !opts.roundsTable || !opts.roomId) {
      return Promise.resolve({});
    }
    var table = opts.roundsTable;
    var roomIdColumn = opts.roomIdColumn || defaultRoomIdColumn;
    var winnerColumn = opts.winnerColumn || defaultWinnerColumn;
    var finishedBy = opts.finishedBy || "winner";

    var q = sb.from(table).select(winnerColumn).eq(roomIdColumn, opts.roomId);
    if (finishedBy === "status") {
      var statusColumn = opts.statusColumn || "status";
      var statusValue = opts.statusValue || "finished";
      q = q.eq(statusColumn, statusValue);
    } else {
      q = q.not(winnerColumn, "is", null);
    }

    return q.then(function (res) {
      var counts = {};
      (res.data || []).forEach(function (r) {
        var id = r[winnerColumn];
        if (id) counts[id] = (counts[id] || 0) + 1;
      });
      return counts;
    });
  }

  /**
   * 라운드 1등을 DB에 기록 (해당 라운드 행만 업데이트)
   * @param {object} sb - Supabase client
   * @param {object} opts
   * @param {string} opts.roundsTable - 라운드 테이블명
   * @param {string} opts.roundId - 라운드 id
   * @param {string|null} opts.winnerClientId - 1등 client_id (무승부 시 null)
   * @param {string} [opts.winnerColumn='winner_client_id']
   * @returns {Promise<void>}
   */
  function setRoundWinner(sb, opts) {
    if (!sb || !opts || !opts.roundsTable || !opts.roundId) {
      return Promise.resolve();
    }
    var winnerColumn = opts.winnerColumn || defaultWinnerColumn;
    var payload = {};
    payload[winnerColumn] = opts.winnerClientId ?? null;

    return sb
      .from(opts.roundsTable)
      .update(payload)
      .eq("id", opts.roundId)
      .then(function () {});
  }

  var w = global.window || global;
  w.GameWinCounts = {
    fetchRoomWinCounts: fetchRoomWinCounts,
    setRoundWinner: setRoundWinner
  };
})(typeof window !== "undefined" ? window : this);
