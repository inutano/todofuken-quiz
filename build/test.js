// build/test.js
const assert = require('assert');
const { MAP_VIEWBOX, PREFECTURES, JLEAGUE } = require('../src/data.js');
const L = require('../src/logic.js');
const R = require('../src/regions.js');

let pass = 0, fail = 0;
function test(name, fn){ try{ fn(); pass++; } catch(e){ fail++; console.error('FAIL:', name, '-', e.message); } }

test('viewBox has 4 numbers', () => {
  assert.strictEqual(MAP_VIEWBOX.length, 4);
  MAP_VIEWBOX.forEach(n => assert.strictEqual(typeof n, 'number'));
});
test('47 prefectures, ids 1..47 in order', () => {
  assert.strictEqual(PREFECTURES.length, 47);
  PREFECTURES.forEach((p, i) => assert.strictEqual(p.id, i + 1));
});
test('every prefecture has required fields', () => {
  for (const p of PREFECTURES) {
    assert.ok(p.kanji && p.kanji.length >= 2, 'kanji ' + p.id);
    assert.ok(p.kana && p.kana.length >= 2, 'kana ' + p.id);
    assert.ok(Array.isArray(p.accept) && p.accept.includes(p.kanji), 'accept ' + p.id);
    assert.ok(Array.isArray(p.emojis) && p.emojis.length >= 3, 'emojis ' + p.id);
    assert.ok(Array.isArray(p.teams), 'teams ' + p.id);
    assert.ok(typeof p.d === 'string' && p.d.startsWith('M') && p.d.includes('Z'), 'd ' + p.id);
    assert.ok(Array.isArray(p.c) && p.c.length === 2, 'c ' + p.id);
    assert.ok(Array.isArray(p.bbox) && p.bbox.length === 4 && p.bbox[2] > 0 && p.bbox[3] > 0, 'bbox ' + p.id);
  }
});
test('accept has short form for 東京都', () => {
  const t = PREFECTURES.find(p => p.kanji === '東京都');
  assert.ok(t.accept.includes('東京'));
});
test('北海道 accept has no short form', () => {
  const h = PREFECTURES.find(p => p.kanji === '北海道');
  assert.deepStrictEqual(h.accept, ['北海道']);
});
test('JLEAGUE teams all map to valid prefId', () => {
  assert.ok(JLEAGUE.length >= 60);
  for (const j of JLEAGUE) {
    assert.ok(j.team && typeof j.team === 'string');
    assert.ok(j.prefId >= 1 && j.prefId <= 47, 'prefId ' + j.team);
  }
});
test('6 prefectures have no J-League team', () => {
  const withTeam = new Set(JLEAGUE.map(j => j.prefId));
  const without = PREFECTURES.filter(p => !withTeam.has(p.id)).length;
  assert.strictEqual(without, 6);
});

test('mulberry32 deterministic', () => {
  const a = L.mulberry32(42), b = L.mulberry32(42);
  assert.strictEqual(a(), b());
});
test('shuffled keeps elements, non-destructive', () => {
  const src = [1,2,3,4,5]; const out = L.shuffled(src, L.mulberry32(1));
  assert.deepStrictEqual([...src], [1,2,3,4,5]);
  assert.deepStrictEqual([...out].sort((x,y)=>x-y), [1,2,3,4,5]);
});
test('settingKey', () => {
  assert.strictEqual(L.settingKey({mode:'soccer'}), 'soccer');
  assert.strictEqual(L.settingKey({mode:'normal',dir:'place2name',level:'easy'}), 'normal|place2name|easy');
});
test('isValidCombo blocks solo+name2place+hard', () => {
  assert.strictEqual(L.isValidCombo({mode:'solo',dir:'name2place',level:'hard'}), false);
  assert.strictEqual(L.isValidCombo({mode:'solo',dir:'name2place',level:'easy'}), true);
  assert.strictEqual(L.isValidCombo({mode:'normal',dir:'name2place',level:'hard'}), true);
});
test('makeChoices contains answer, 3 unique', () => {
  const ids = Array.from({length:47},(_,i)=>i+1);
  const c = L.makeChoices(13, ids, L.mulberry32(3));
  assert.strictEqual(c.length, 3);
  assert.ok(c.includes(13));
  assert.strictEqual(new Set(c).size, 3);
});
test('makeMapHints contains answer, 3 unique', () => {
  const ids = Array.from({length:47},(_,i)=>i+1);
  const h = L.makeMapHints(5, ids, L.mulberry32(9));
  assert.strictEqual(h.length, 3);
  assert.ok(h.includes(5));
  assert.strictEqual(new Set(h).size, 3);
});
test('normalizeAnswer strips spaces', () => {
  assert.strictEqual(L.normalizeAnswer('  東京 都 '), '東京都');
  assert.strictEqual(L.normalizeAnswer('東京　都'), '東京都');
});
test('judgeTyped accepts full and short forms', () => {
  const tokyo = { kanji:'東京都', accept:['東京都','東京'] };
  assert.strictEqual(L.judgeTyped('東京都', tokyo), true);
  assert.strictEqual(L.judgeTyped(' 東京 ', tokyo), true);
  assert.strictEqual(L.judgeTyped('大阪', tokyo), false);
});
test('emojiCountForTime: faster gives more, clamped', () => {
  assert.ok(L.emojiCountForTime(0.5) > L.emojiCountForTime(5));
  assert.ok(L.emojiCountForTime(0) <= 90);
  assert.ok(L.emojiCountForTime(999) >= 15);
  assert.strictEqual(Number.isInteger(L.emojiCountForTime(2)), true);
});
test('buildQueue normal: 47 shuffled prefIds', () => {
  const q = L.buildQueue({mode:'normal',dir:'place2name',level:'easy'}, PREFECTURES, JLEAGUE, L.mulberry32(7));
  assert.strictEqual(q.length, 47);
  assert.deepStrictEqual(q.map(x=>x.prefId).sort((a,b)=>a-b), Array.from({length:47},(_,i)=>i+1));
});
test('buildQueue soccer: one per team with team name', () => {
  const q = L.buildQueue({mode:'soccer'}, PREFECTURES, JLEAGUE, L.mulberry32(2));
  assert.strictEqual(q.length, JLEAGUE.length);
  assert.ok(q.every(x => typeof x.team === 'string' && x.prefId >= 1 && x.prefId <= 47));
});
test('updateRecord only on allCorrect, keeps faster', () => {
  let r = {};
  r = L.updateRecord(r, 'k', 5000, false); assert.strictEqual(r.k, undefined);
  r = L.updateRecord(r, 'k', 5000, true);  assert.strictEqual(r.k.bestTimeMs, 5000);
  r = L.updateRecord(r, 'k', 8000, true);  assert.strictEqual(r.k.bestTimeMs, 5000);
  r = L.updateRecord(r, 'k', 3000, true);  assert.strictEqual(r.k.bestTimeMs, 3000);
});
test('makeChoices excludes answered ids', () => {
  const ids = Array.from({length:47},(_,i)=>i+1);
  const c = L.makeChoices(13, ids, L.mulberry32(3), [5,6,7,8,9,10]);
  assert.strictEqual(c.length, 3);
  assert.ok(c.includes(13));
  assert.strictEqual(new Set(c).size, 3);
  for (const ex of [5,6,7,8,9,10]) assert.ok(!c.includes(ex), 'excluded '+ex);
});
test('makeChoices fallback still returns 3 when pool too small', () => {
  const ids = [1,2,3,4];
  const c = L.makeChoices(1, ids, L.mulberry32(2), [2,3,4]); // pool empty after exclude
  assert.strictEqual(c.length, 3);
  assert.ok(c.includes(1));
  assert.strictEqual(new Set(c).size, 3);
});
test('makeMapHints excludes answered ids', () => {
  const ids = Array.from({length:47},(_,i)=>i+1);
  const h = L.makeMapHints(20, ids, L.mulberry32(9), [1,2,3,4,5]);
  assert.strictEqual(h.length, 3);
  assert.ok(h.includes(20));
  assert.strictEqual(new Set(h).size, 3);
  for (const ex of [1,2,3,4,5]) assert.ok(!h.includes(ex));
});
test('makeChoices backward-compatible without exclude arg', () => {
  const ids = Array.from({length:47},(_,i)=>i+1);
  const c = L.makeChoices(30, ids, L.mulberry32(1));
  assert.strictEqual(c.length, 3);
  assert.ok(c.includes(30));
  assert.strictEqual(new Set(c).size, 3);
});

test('regionIds counts', () => {
  assert.strictEqual(R.regionIds('hokkaido').length, 1);
  assert.strictEqual(R.regionIds('tohoku').length, 6);
  assert.strictEqual(R.regionIds('kanto').length, 7);
  assert.strictEqual(R.regionIds('chubu').length, 9);
  assert.strictEqual(R.regionIds('kansai').length, 7);
  assert.strictEqual(R.regionIds('chugoku').length, 5);
  assert.strictEqual(R.regionIds('shikoku').length, 4);
  assert.strictEqual(R.regionIds('kyushu').length, 8);
  assert.strictEqual(R.regionIds('all').length, 47);
});
test('regionOf maps prefectures', () => {
  assert.strictEqual(R.regionOf(1), 'hokkaido');
  assert.strictEqual(R.regionOf(13), 'kanto');
  assert.strictEqual(R.regionOf(27), 'kansai');
  assert.strictEqual(R.regionOf(36), 'shikoku');
  assert.strictEqual(R.regionOf(47), 'kyushu');
});
test('regionViewBox all equals national', () => {
  assert.deepStrictEqual(R.regionViewBox('all', PREFECTURES, MAP_VIEWBOX), MAP_VIEWBOX);
});
test('regionViewBox region is positive and within canvas', () => {
  const vb = R.regionViewBox('shikoku', PREFECTURES, MAP_VIEWBOX);
  assert.strictEqual(vb.length, 4);
  assert.ok(vb[2] > 0 && vb[3] > 0);
  assert.ok(vb[0] >= 0 && vb[1] >= 0);
  assert.ok(vb[0] + vb[2] <= MAP_VIEWBOX[2] + 0.01);
  assert.ok(vb[1] + vb[3] <= MAP_VIEWBOX[3] + 0.01);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
