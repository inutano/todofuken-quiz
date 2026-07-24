# 都道府県クイズ v3（レトロ8ビット＋エリア選択）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** レトロゲーム風（ポップ8ビット・本物のピクセルフォント埋込）に刷新し、8地方＋全国のエリア選択で地図を拡大して遊べるようにする。

**Architecture:** 地方データと純粋ヘルパを新規 `src/regions.js` に置き、`logic.js` はエリア県配列を引数で受け取る（純粋性維持）。地図は `map.js` の `renderFull` に viewBox を渡してズーム。フォントは `build/make_font.py` が生成する `src/font.css`（base64 woff2・コミット済み）を読み込む。最後に `build/inline.py` で単一 `japan-quiz.html` を再生成。

**Tech Stack:** Vanilla JS、SVG、CSS、Node.js（テスト）、Python3＋fonttools/brotli（フォント生成）。外部依存なし（成果物）。

## Global Constraints

- 単一 `japan-quiz.html` が最終成果物。外部リソース禁止（CDN/webfont/画像URL/fetch なし）。フォントは base64 埋込。
- **CSS変数名・DOM構造・クラス名・セレクタは変更しない**（値のみ変更）。`map.js` が `--pref`/`--pref-answered`/`--pref-hint`/`--pref-target` を参照。
- 公開インターフェース: `MAP.*`（`renderFull` は viewBox 省略可の追加のみ）、`RAIN.burst`、`window.LOGIC.*`、新規 `window.REGIONS`/`window.regionIds`/`window.regionOf`/`window.regionViewBox`。
- `settingKey`/`buildQueue` の変更は**後方互換**（region 省略＝全国、`buildQueue` の `regionIds` 既定 null＝全県）。既存テストが通ること。
- 地方区分（JIS）: 北海道[1] / 東北[2-7] / 関東[8-14] / 中部甲信越[15-23] / 関西[24-30] / 中国[31-35] / 四国[36-39] / 九州[40-47]。エリアキー: all,hokkaido,tohoku,kanto,chubu,kansai,chugoku,shikoku,kyushu。
- フォント: PixelMplus12（M+ FONT LICENSE）。`src/font.css` は生成済み・コミット済み。
- コミットメッセージ末尾に必ず: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- 対象ブランチ: `feat/v3-retro-regions`。

---

## ファイル構成

- 新規: `src/regions.js`（地方データ＋純粋ヘルパ）。
- 既存生成済み（プレップでコミット済み）: `build/make_font.py`, `src/font.css`。
- 変更: `src/logic.js`（settingKey/buildQueue）、`src/map.js`（renderFull viewBox）、`src/app.js`（メニュー・ズーム・ヒント）、`src/styles.css`（レトロ）、`index.html`（font.css/regions.js 読込）、`build/test.js`（テスト）、`README.md`、再生成 `src/font.css`＋`japan-quiz.html`。

---

### Task 1: 地方データと純粋ヘルパ（`src/regions.js`）

**Files:**
- Create: `src/regions.js`
- Modify: `build/test.js`（テスト追加）

**Interfaces:**
- Consumes: `PREFECTURES`（各要素 `{id, c:[x,y], ...}`）、`MAP_VIEWBOX`（`src/data.js`、テストで使用）
- Produces（`window.*` と `module.exports` 両対応）:
  - `REGIONS: { [key]: { name:string, ids:number[] } }`（`all` 含む、`all.ids`=1..47）
  - `REGION_ORDER: string[]`（メニュー順）
  - `regionIds(key) -> number[]`
  - `regionOf(prefId) -> string|null`
  - `regionViewBox(key, prefs, fullViewBox) -> [x,y,w,h]`（`all`は`fullViewBox`のコピー）

- [ ] **Step 1: 失敗するテストを `build/test.js` の最終 `console.log` の前に追加**

先頭付近の require 群に追記: `const R = require('../src/regions.js');`（`PREFECTURES`,`MAP_VIEWBOX` は既存の `require('../src/data.js')` 由来のものを使う）。

```js
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node build/test.js`
Expected: FAIL（`Cannot find module '../src/regions.js'`）

- [ ] **Step 3: `src/regions.js` を実装**

```js
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
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node build/test.js`
Expected: `27 passed, 0 failed`（既存23 + 追加4）

- [ ] **Step 5: コミット**

```bash
git add src/regions.js build/test.js
git commit -m "feat: 地方区分データと純粋ヘルパ（regions.js）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `logic.js` のエリア対応（`settingKey`・`buildQueue`）

**Files:**
- Modify: `src/logic.js`（`settingKey` 19-21行、`buildQueue`）
- Modify: `build/test.js`（テスト追加）

**Interfaces:**
- Produces:
  - `settingKey(s) -> string`（`s.region` が未指定/`'all'` の時は従来キー、それ以外は末尾に `|<region>`）
  - `buildQueue(settings, prefs, jleague, rand, regionIds = null) -> Array<{prefId, team?}>`（`regionIds` 指定時はその県/本拠県のみ）

- [ ] **Step 1: 失敗するテストを追加（最終 `console.log` の前）**

```js
test('settingKey without region is unchanged (backward compat)', () => {
  assert.strictEqual(L.settingKey({mode:'normal',dir:'place2name',level:'easy'}), 'normal|place2name|easy');
  assert.strictEqual(L.settingKey({mode:'normal',dir:'place2name',level:'easy',region:'all'}), 'normal|place2name|easy');
  assert.strictEqual(L.settingKey({mode:'soccer'}), 'soccer');
});
test('settingKey appends region when not all', () => {
  assert.strictEqual(L.settingKey({mode:'normal',dir:'place2name',level:'easy',region:'kanto'}), 'normal|place2name|easy|kanto');
  assert.strictEqual(L.settingKey({mode:'soccer',region:'kyushu'}), 'soccer|kyushu');
});
test('buildQueue filters by regionIds', () => {
  const q = L.buildQueue({mode:'normal',dir:'place2name',level:'easy',region:'shikoku'}, PREFECTURES, JLEAGUE, L.mulberry32(1), [36,37,38,39]);
  assert.strictEqual(q.length, 4);
  assert.ok(q.every(x => [36,37,38,39].includes(x.prefId)));
});
test('buildQueue null regionIds keeps all 47 (backward compat)', () => {
  const q = L.buildQueue({mode:'normal',dir:'place2name',level:'easy'}, PREFECTURES, JLEAGUE, L.mulberry32(1));
  assert.strictEqual(q.length, 47);
});
test('buildQueue soccer filters teams by region prefId', () => {
  const q = L.buildQueue({mode:'soccer',region:'shikoku'}, PREFECTURES, JLEAGUE, L.mulberry32(1), [36,37,38,39]);
  assert.ok(q.length > 0);
  assert.ok(q.every(x => [36,37,38,39].includes(x.prefId) && typeof x.team === 'string'));
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node build/test.js`
Expected: FAIL（`settingKey appends region` / `buildQueue filters` で不一致）

- [ ] **Step 3: `src/logic.js` の `settingKey` と `buildQueue` を差し替え**

`settingKey`（19-21行）を:
```js
function settingKey(s) {
  const region = (s.region && s.region !== 'all') ? '|' + s.region : '';
  return (s.mode === 'soccer' ? 'soccer' : `${s.mode}|${s.dir}|${s.level}`) + region;
}
```

`buildQueue` を:
```js
function buildQueue(settings, prefs, jleague, rand, regionIds = null) {
  const inRegion = regionIds ? (id => regionIds.includes(id)) : (() => true);
  if (settings.mode === 'soccer') {
    return shuffled(jleague.filter(j => inRegion(j.prefId)).map(j => ({ prefId: j.prefId, team: j.team })), rand);
  }
  return shuffled(prefs.filter(p => inRegion(p.id)).map(p => ({ prefId: p.id })), rand);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node build/test.js`
Expected: `32 passed, 0 failed`（27 + 追加5）

- [ ] **Step 5: コミット**

```bash
git add src/logic.js build/test.js
git commit -m "feat: settingKey/buildQueue をエリア対応（後方互換）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `map.js` の viewBox ズーム対応

**Files:**
- Modify: `src/map.js`（`renderFull` の viewBox 設定行）

**Interfaces:**
- Produces: `renderFull(container, {onPick, viewBox})` — `opts.viewBox`（`[x,y,w,h]`）が渡されればそれを使い、未指定なら従来の `MAP_VIEWBOX`。他は不変。

- [ ] **Step 1: `renderFull` の viewBox 行を差し替え**

`svg.setAttribute('viewBox', MAP_VIEWBOX.join(' '));` の行を次に変更:
```js
    const vb = (opts && opts.viewBox) ? opts.viewBox : MAP_VIEWBOX;
    svg.setAttribute('viewBox', vb.join(' '));
```

- [ ] **Step 2: 構文チェック**

Run: `node --check src/map.js`
Expected: exit 0。

- [ ] **Step 3: grep 確認**

Run: `grep -n "opts.viewBox" src/map.js`
Expected: 1行ヒット。

- [ ] **Step 4: コミット**

```bash
git add src/map.js
git commit -m "feat: 地図 renderFull に viewBox ズーム対応

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `app.js` — エリアセレクタとズーム・ヒントの配線

**Files:**
- Modify: `src/app.js`（state.settings、renderMenu、startGame、renderNormalName2Place、renderSoccer）

**Interfaces:**
- Consumes: `window.REGIONS`, `window.REGION_ORDER`, `window.regionViewBox`（regions.js）、`window.LOGIC.buildQueue(settings,prefs,jleague,rand,regionIds)`、`MAP.renderFull(container,{onPick,viewBox})`、`window.LOGIC.makeMapHints(answer, pool, rand, exclude)`
- Produces: なし（アプリ内部）。

- [ ] **Step 1: `state.settings` に region を追加**

11行 `settings: { mode:'normal', dir:'place2name', level:'easy' },` を:
```js
    settings: { mode:'normal', dir:'place2name', level:'easy', region:'all' },
```

- [ ] **Step 2: メニューに「エリア」行を追加**

`renderMenu` 内、`body.appendChild(dirRow); body.appendChild(lvlRow);`（34行付近）の直後に:
```js
    const REGION_OPTS = window.REGION_ORDER.map(k => [k, window.REGIONS[k].name]);
    const regionRow = optRow('エリア', REGION_OPTS, 'region');
    body.appendChild(regionRow);
```

- [ ] **Step 3: `startGame` でエリア絞り込みと地図ズームを反映**

`startGame` の該当2箇所を変更。
`state.queue = window.LOGIC.buildQueue(s, PREFECTURES, JLEAGUE, seedRand());` を:
```js
    const rids = (s.region && s.region !== 'all') ? window.REGIONS[s.region].ids : null;
    state.queue = window.LOGIC.buildQueue(s, PREFECTURES, JLEAGUE, seedRand(), rids);
```
`MAP.renderFull($('quiz-stage'), { onPick: onMapPick });` を:
```js
      MAP.renderFull($('quiz-stage'), { onPick: onMapPick, viewBox: window.regionViewBox(s.region, PREFECTURES, MAP_VIEWBOX) });
```

- [ ] **Step 4: 名前→場所ヒントとクリック範囲をエリアに合わせる**

`renderNormalName2Place`（198-209行付近）を次に置換:
```js
  function renderNormalName2Place(q) {
    const p = prefById(q.prefId);
    setPrompt(`「${p.kanji}」はどこ？`);
    const region = state.settings.region;
    const pool = (region && region !== 'all') ? window.REGIONS[region].ids : allIds;
    if (state.settings.level === 'easy') {
      const hints = window.LOGIC.makeMapHints(q.prefId, pool, seedRand(), Object.keys(answeredMarks).map(Number));
      const st = {}; hints.forEach(id => st[id]='hint');
      MAP.setStates(st); reapplyAnswered();
      MAP.setClickable(hints);
    } else {
      MAP.setStates({}); reapplyAnswered();
      MAP.setClickable((region && region !== 'all') ? window.REGIONS[region].ids : null);
    }
  }
```

- [ ] **Step 5: サッカーのクリック範囲もエリアに合わせる**

`renderSoccer`（211-214行付近）を次に置換:
```js
  function renderSoccer(q) {
    setPrompt(`⚽ ${q.team}\nの本拠地は？`);
    const region = state.settings.region;
    MAP.setStates({}); reapplyAnswered();
    MAP.setClickable((region && region !== 'all') ? window.REGIONS[region].ids : null);
  }
```

- [ ] **Step 6: 構文チェックとテスト（回帰）**

Run: `node --check src/app.js && node build/test.js`
Expected: exit 0、`32 passed, 0 failed`（logic は不変なのでテスト数維持）。

- [ ] **Step 7: コミット**

```bash
git add src/app.js
git commit -m "feat: エリアセレクタと地図ズーム・ヒントのエリア対応

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: レトロ8ビットCSSとフォント/スクリプト読込

**Files:**
- Modify: `src/styles.css`（全面差し替え＝値のみ、変数名・セレクタ不変）
- Modify: `index.html`（`src/font.css` を link、`src/regions.js` を script 追加）

**Interfaces:** なし（CSS/HTML）。CSS変数名は維持。

- [ ] **Step 1: `index.html` に font.css と regions.js を追加**

7行 `<link rel="stylesheet" href="src/styles.css">` の**前**に1行追加:
```html
<link rel="stylesheet" href="src/font.css">
```
31行 `<script src="src/data.js"></script>` の**直後**に1行追加:
```html
<script src="src/regions.js"></script>
```

- [ ] **Step 2: `src/styles.css` を次の内容で全面置換**

```css
:root{
  --bg1:#181236; --bg2:#2b1a55; --card:#1b1440; --ink:#eafcff;
  --accent:#ff4fd8; --good:#7cff6b; --bad:#ff5a7a; --sea:#0d0c26;
  --pref:#2bb7c4; --pref-answered:#7cff6b; --pref-hint:#ffe14f; --pref-target:#ff4fd8;
  --cyan:#39e6ff; --btn-sh:#7a1e6b;
}
*{box-sizing:border-box;image-rendering:pixelated}
html,body{margin:0;height:100%;font-family:'PX',"Hiragino Sans",system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif;color:var(--ink)}
body{background:
  repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 2px,transparent 2px 4px),
  linear-gradient(160deg,var(--bg1),var(--bg2));overflow:hidden}
#app{height:100vh;display:flex;align-items:stretch;justify-content:center}
.screen{width:100%;max-width:900px;margin:auto;padding:16px;display:flex;flex-direction:column;height:100vh}
.hidden{display:none!important}
.title{color:var(--cyan);text-align:center;font-size:clamp(22px,5vw,44px);font-weight:700;margin:12px 0;text-shadow:3px 3px 0 var(--accent)}
h2{color:var(--cyan);text-align:center;font-size:30px;text-shadow:2px 2px 0 var(--accent)}
button{font-family:inherit;cursor:pointer;border:none}
.btn{background:var(--accent);color:#1a0a2e;font-weight:700;font-size:18px;padding:12px 18px;border-radius:0;border:3px solid #1a0a2e;box-shadow:0 5px 0 var(--btn-sh);transition:transform .05s}
.btn:active{transform:translateY(3px);box-shadow:0 2px 0 var(--btn-sh)}
.btn.sel{background:var(--cyan);color:#0a1a2e;box-shadow:0 5px 0 #1a7a99}
.card{background:var(--card);border-radius:0;padding:16px;border:3px solid var(--cyan);box-shadow:6px 6px 0 var(--accent)}
#menu-body{display:flex;flex-direction:column;gap:12px;overflow:auto}
.opt-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.opt-label{color:var(--ink);font-weight:700;text-align:center;margin-bottom:2px}
#quiz-hud{display:flex;justify-content:space-between;color:var(--ink);font-weight:700;font-size:18px;padding:6px 10px}
#quiz-stage{flex:1;display:flex;align-items:center;justify-content:center;min-height:0}
#quiz-stage svg{width:100%;height:100%;image-rendering:pixelated}
#quiz-answer{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:12px 0}
.prompt{color:var(--cyan);font-size:clamp(20px,4.5vw,34px);font-weight:700;text-align:center;text-shadow:2px 2px 0 var(--accent);white-space:pre-line}
#rain-layer{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:50}
.type-input{font-family:inherit;font-size:24px;padding:8px 12px;border-radius:0;border:3px solid var(--cyan);text-align:center;width:min(320px,80vw);background:#0d0c26;color:var(--ink)}
.correct-flash{animation:flash .4s}
@keyframes flash{0%{background:var(--good)}100%{background:transparent}}
.shake{animation:shake .35s}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
```

- [ ] **Step 3: 目視確認（コントローラが実施）**

`index.html` をヘッドレスで開き、メニュー・通常クイズ・エリア選択（例 四国）を撮影。
Expected:
- 全テキストが**ピクセル（ドット）フォント**で表示され、濃紺背景に読める（シアン/マゼンタ/黄）。
- ボタンは角丸なし・段差影のレトロ調。選択中はシアン。
- 地図の県色がレトロ（ティール/マゼンタ/黄/緑）。
- エリアで「四国」を選ぶと地図が四国に拡大され、県が大きく表示される。

- [ ] **Step 4: コミット**

```bash
git add src/styles.css index.html
git commit -m "feat: レトロ8ビットCSS＋ピクセルフォント/regions.js 読込

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: フォント再生成・単一ファイル再ビルド・クレジット

**Files:**
- Regenerate: `src/font.css`（`build/make_font.py`）
- Regenerate: `japan-quiz.html`（`build/inline.py`）
- Modify: `README.md`

**Interfaces:** なし。

- [ ] **Step 1: フォントを最新ソースから再生成**

（新UIテキストを取りこぼさないよう最終ソースで再生成する。要 fonttools/brotli。無ければ `python3 -m venv /tmp/fontvenv && /tmp/fontvenv/bin/pip install fonttools brotli` で用意し `/tmp/fontvenv/bin/python` を使う。）

Run: `python3 build/make_font.py`（または venv の python）
Expected: `wrote src/font.css: <N> chars, ~41KB`。`src/font.css` に `@font-face` が2つ、`data:font/woff2;base64,` を含む。

- [ ] **Step 2: 単一HTMLを再生成**

Run: `python3 build/inline.py`
Expected: `wrote japan-quiz.html (…KB)`、外部参照なしのアサーション通過。

- [ ] **Step 3: 外部参照ゼロ確認**

Run: `grep -c 'src="src/\|href="src/' japan-quiz.html`
Expected: `0`

- [ ] **Step 4: `README.md` にフォント帰属とエリア機能を追記**

`## 遊び方` セクションのモード説明の後などに、次を追記:
```markdown
## エリア選択
メニューの「エリア」で全国／北海道／東北／関東／中部甲信越／関西／中国／四国／九州を選べます。エリアを選ぶとその地方の県だけが出題され、地図がその地方に拡大されて選びやすくなります。

## フォント
ピクセルフォント **PixelMplus12**（© 2002-2013 M+ FONTS PROJECT、M+ FONT LICENSE）を、アプリで使う文字にサブセット化して埋め込んでいます。
```

- [ ] **Step 5: 目視・オフライン動作確認（コントローラが実施）**

`japan-quiz.html` を隔離ディレクトリにコピーして開く。
Expected: レトロUI・ピクセルフォントで表示、全モード動作、エリア選択で地図拡大、通常×名前→場所イージーでエリア内3ヒント（北海道は1）、ネットワーク遮断でも動く。

- [ ] **Step 6: コミット**

```bash
git add src/font.css japan-quiz.html README.md
git commit -m "build: フォント再生成＋単一HTML再生成＋クレジット追記

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review（計画者チェック済み）

- **Spec coverage**: レトロ配色/ピクセル装飾=Task5、ピクセルフォント埋込=プレップ済み+Task6再生成、地図色=Task5（変数値）、エリアデータ/ズーム計算=Task1、settingKey/buildQueue エリア=Task2、地図ズーム=Task3、メニュー/絞り込み/ヒント/クリック範囲=Task4、クレジット=Task6、単一HTML再生成=Task6。全対応。
- **Placeholder scan**: 各Stepに実コード。差し替え箇所を行番号・アンカーで明示。
- **Type consistency**: `regionViewBox(key,prefs,fullViewBox)` の呼び出し（app.js: `window.regionViewBox(s.region, PREFECTURES, MAP_VIEWBOX)`）と定義一致。`buildQueue(...,regionIds)` の呼び出し（app: `rids`）と定義一致。`renderFull(container,{onPick,viewBox})` の呼び出しと map.js 定義一致。`makeMapHints(answer, pool, rand, exclude)` は既存4引数と一致（pool にエリア県 or allIds）。CSS変数名は map.js 参照名と一致。`window.REGIONS`/`window.REGION_ORDER`/`window.regionViewBox` は regions.js で公開・app.js で使用一致。
- **後方互換**: `settingKey` は region 無し→従来キー、`buildQueue` は regionIds 既定 null→全県（Task2 の後方互換テストで担保）。既存の makeChoices/名前3択は全国のまま（北海道エリアでも3択成立）。
