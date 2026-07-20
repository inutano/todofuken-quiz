// src/logic.js — 純粋ロジック（乱数は引数で受け取る）
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function settingKey(s) {
  return s.mode === 'soccer' ? 'soccer' : `${s.mode}|${s.dir}|${s.level}`;
}
function isValidCombo(s) {
  if (s.mode === 'solo' && s.dir === 'name2place' && s.level === 'hard') return false;
  return true;
}
function pickN(answerId, allIds, n, rand, exclude) {
  const ex = new Set(exclude || []);
  ex.delete(answerId); // 正解は常に許可
  let pool = shuffled(allIds.filter(id => id !== answerId && !ex.has(id)), rand);
  let picks = pool.slice(0, n - 1);
  if (picks.length < n - 1) {
    // 未回答が不足する終盤: 除外集合も使って不足分を補い、常に n 件を保証
    const used = new Set([answerId, ...picks]);
    const filler = shuffled(allIds.filter(id => !used.has(id)), rand);
    picks = picks.concat(filler.slice(0, (n - 1) - picks.length));
  }
  return shuffled([answerId, ...picks], rand);
}
function makeChoices(answerId, allIds, rand, exclude = []) { return pickN(answerId, allIds, 3, rand, exclude); }
function makeMapHints(answerId, allIds, rand, exclude = []) { return pickN(answerId, allIds, 3, rand, exclude); }
function normalizeAnswer(s) { return String(s).replace(/[\s　]/g, '').trim(); }
function judgeTyped(input, pref) {
  const n = normalizeAnswer(input);
  if (!n) return false;
  return pref.accept.some(a => normalizeAnswer(a) === n);
}
function emojiCountForTime(sec) {
  const raw = Math.round(70 - sec * 7);
  return Math.max(15, Math.min(90, raw));
}
function buildQueue(settings, prefs, jleague, rand) {
  if (settings.mode === 'soccer') {
    return shuffled(jleague.map(j => ({ prefId: j.prefId, team: j.team })), rand);
  }
  return shuffled(prefs.map(p => ({ prefId: p.id })), rand);
}
function updateRecord(records, key, timeMs, allCorrect) {
  const next = { ...records };
  const prev = next[key];
  if (!allCorrect) {
    // Only update if there's a previous record
    if (prev) {
      next[key] = { bestTimeMs: prev.bestTimeMs, playedCount: prev.playedCount + 1 };
    }
    // If no previous record and allCorrect is false, don't create one
    return next;
  }
  // allCorrect is true: update or create
  if (!prev || timeMs < prev.bestTimeMs) {
    next[key] = { bestTimeMs: timeMs, playedCount: (prev ? prev.playedCount : 0) + 1 };
  } else {
    next[key] = { bestTimeMs: prev.bestTimeMs, playedCount: prev.playedCount + 1 };
  }
  return next;
}
if (typeof window !== 'undefined') { window.LOGIC = { mulberry32, shuffled, settingKey, isValidCombo, makeChoices, makeMapHints, normalizeAnswer, judgeTyped, emojiCountForTime, buildQueue, updateRecord }; }
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mulberry32, shuffled, settingKey, isValidCombo, makeChoices,
    makeMapHints, normalizeAnswer, judgeTyped, emojiCountForTime, buildQueue, updateRecord };
}
