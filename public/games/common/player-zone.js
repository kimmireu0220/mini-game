/**
 * 공용 플레이어 카드(zone) DOM 생성.
 * 타이머·업다운 모두 동일한 마크업/스타일(rank-display.css) 사용.
 */
(function (global) {
  /**
   * 플레이어 zone 요소 하나 생성 (필요 시 slot으로 감쌈).
   * @param {{
   *   clientId: string,
   *   nickname: string,
   *   pNum: number,
   *   isMe: boolean,
   *   winCount?: number,
   *   winsFormat?: 'paren'|'plain',
   *   showWins?: boolean,
   *   wrapInSlot?: boolean,
   *   extras?: Array<{ className: string, textContent?: string, style?: object, display?: string }>
   * }} opts
   * @returns {HTMLElement} zone 또는 slot(zone 포함)
   */
  function createPlayerZone(opts) {
    var clientId = opts.clientId;
    var nickname = opts.nickname != null ? opts.nickname : "";
    var pNum = opts.pNum != null ? opts.pNum : 1;
    var isMe = !!opts.isMe;
    var winCount = opts.winCount != null ? opts.winCount : 0;
    var winsFormat = opts.winsFormat || "plain";
    var showWins = opts.showWins !== false;
    var wrapInSlot = !!opts.wrapInSlot;
    var extras = opts.extras || [];

    var zone = document.createElement("div");
    zone.className = "round-player-zone" + (isMe ? " me" : "");
    zone.dataset.clientId = clientId;

    var pNumSpan = document.createElement("span");
    pNumSpan.className = "round-zone-p-num num-" + pNum;
    pNumSpan.textContent = "P" + pNum;
    zone.appendChild(pNumSpan);

    var nameEl = document.createElement("div");
    nameEl.className = "round-zone-name";
    var nameLine = document.createElement("div");
    nameLine.className = "round-zone-name-line";
    nameLine.appendChild(document.createTextNode(nickname));
    nameEl.appendChild(nameLine);
    if (showWins) {
      var winsSpan = document.createElement("span");
      winsSpan.className = "round-zone-wins";
      winsSpan.textContent = winsFormat === "paren" ? "( " + winCount + "승 )" : winCount + "승";
      nameEl.appendChild(winsSpan);
    }
    zone.appendChild(nameEl);

    extras.forEach(function (extra) {
      var el = document.createElement("div");
      el.className = extra.className;
      if (extra.textContent != null) el.textContent = extra.textContent;
      if (extra.style) {
        Object.keys(extra.style).forEach(function (k) {
          el.style[k] = extra.style[k];
        });
      }
      if (extra.display != null) el.style.display = extra.display;
      zone.appendChild(el);
    });

    if (wrapInSlot) {
      var slot = document.createElement("div");
      slot.className = "round-player-slot";
      slot.appendChild(zone);
      return slot;
    }
    return zone;
  }

  /**
   * 컨테이너에 플레이어 목록으로 zones 채우기 (게임 중 라이브용).
   * @param {HTMLElement} container - .round-player-zones
   * @param {Array<{ client_id: string, nickname?: string }>} list
   * @param {Object} winCounts - client_id -> number
   * @param {string} currentClientId - 내 client_id
   * @param {{ wrapInSlot?: boolean, winsFormat?: 'paren'|'plain', showWins?: boolean, extrasFor?: function(p, i): Array }} options
   */
  function fillPlayerZones(container, list, winCounts, currentClientId, options) {
    if (!container) return;
    var opts = options || {};
    var wrapInSlot = !!opts.wrapInSlot;
    var winsFormat = opts.winsFormat || "plain";
    var showWins = opts.showWins !== false;
    var extrasFor = opts.extrasFor || function () { return []; };

    container.innerHTML = "";
    container.className = "round-player-zones count-" + Math.min(list.length || 1, 8);
    (list || []).forEach(function (p, i) {
      var node = createPlayerZone({
        clientId: p.client_id,
        nickname: p.nickname || p.client_id || "",
        pNum: i + 1,
        isMe: p.client_id === currentClientId,
        winCount: (winCounts && winCounts[p.client_id]) || 0,
        winsFormat: winsFormat,
        showWins: showWins,
        wrapInSlot: wrapInSlot,
        extras: extrasFor(p, i)
      });
      container.appendChild(node);
    });
  }

  global.GamePlayerZone = {
    createPlayerZone: createPlayerZone,
    fillPlayerZones: fillPlayerZones
  };
})(typeof window !== "undefined" ? window : this);
