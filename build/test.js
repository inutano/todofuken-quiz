// build/test.js
const assert = require('assert');
const { MAP_VIEWBOX, PREFECTURES, JLEAGUE } = require('../src/data.js');

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
