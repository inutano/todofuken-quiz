// src/regions.js — 地方区分データと純粋ヘルパ
(function () {
  'use strict';
  const DEFS = {
    all:      { name: '全国',       ids: Array.from({ length: 47 }, (_, i) => i + 1) },
    hokkaido: { name: '北海道',     ids: [1] },
    tohoku:   { name: '東北',       ids: [2, 3, 4, 5, 6, 7] },
    kanto:    { name: '関東',       ids: [8, 9, 10, 11, 12, 13, 14] },
    chubu:    { name: '中部甲信越', ids: [15, 16, 17, 18, 19, 20, 21, 22, 23] },
    kansai:   { name: '関西',       ids: [24, 25, 26, 27, 28, 29, 30] },
    chugoku:  { name: '中国',       ids: [31, 32, 33, 34, 35] },
    shikoku:  { name: '四国',       ids: [36, 37, 38, 39] },
    kyushu:   { name: '九州',       ids: [40, 41, 42, 43, 44, 45, 46, 47] },
  };
  const ORDER = ['all', 'hokkaido', 'tohoku', 'kanto', 'chubu', 'kansai', 'chugoku', 'shikoku', 'kyushu'];
  const PAD = 55;
  function regionIds(key) { return (DEFS[key] || DEFS.all).ids.slice(); }
  function regionOf(prefId) {
    for (const k of ORDER) { if (k !== 'all' && DEFS[k].ids.includes(prefId)) return k; }
    return null;
  }
  function regionViewBox(key, prefs, fullViewBox) {
    if (!key || key === 'all') return fullViewBox.slice();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const id of DEFS[key].ids) {
      const c = prefs.find(p => p.id === id).c;
      x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]);
      x1 = Math.max(x1, c[0]); y1 = Math.max(y1, c[1]);
    }
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
    x1 = Math.min(fullViewBox[2], x1 + PAD); y1 = Math.min(fullViewBox[3], y1 + PAD);
    return [x0, y0, x1 - x0, y1 - y0];
  }
  const API = { REGIONS: DEFS, REGION_ORDER: ORDER, regionIds, regionOf, regionViewBox };
  if (typeof window !== 'undefined') {
    window.REGIONS = DEFS; window.REGION_ORDER = ORDER;
    window.regionIds = regionIds; window.regionOf = regionOf; window.regionViewBox = regionViewBox;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
})();
