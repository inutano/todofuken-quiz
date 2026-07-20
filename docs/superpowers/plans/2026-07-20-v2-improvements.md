# 都道府県クイズ v2 改善 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存の都道府県クイズに3つの改善（回答済み選択肢バグ修正・絵文字が底に積もって残る・ゆめかわパステルデザイン）を加え、単一HTMLを再ビルドする。

**Architecture:** 既存の分割構成（`src/logic.js`/`app.js`/`rain.js`/`styles.css` を `index.html` で読み込み、`build/inline.py` で単一 `japan-quiz.html` を生成）を踏襲。ロジック変更はNodeテスト、見た目・演出はヘッドレスブラウザで目視検証。

**Tech Stack:** Vanilla JS、SVG、CSS、Node.js（テスト）、Python3（inline.py）。外部依存なし。

## Global Constraints

- 単一 `japan-quiz.html` が最終成果物。外部リソース禁止（CDN/webfont/画像URL/fetch なし）。
- **CSS変数名・DOM構造・クラス名・セレクタは変更しない**（値のみ変更）。`map.js` が `--pref` 等の変数を参照するため変数名維持は必須。
- 公開インターフェース不変: `MAP.*` / `RAIN.burst(emojis,count)` / `window.LOGIC.*`。
- `makeChoices`/`makeMapHints` の変更は**デフォルト引数追加のみ**で後方互換（3引数呼び出しが動く）。
- コミットメッセージ末尾に必ず: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- 対象ブランチ: `feat/v2-improvements`。

---

## ファイル構成（変更のみ）

- `src/logic.js` — `pickN`/`makeChoices`/`makeMapHints` に `exclude` 追加（Task 1）
- `src/app.js` — 3つの呼び出しで回答済み集合を渡す（Task 1）
- `build/test.js` — `exclude`・フォールバックのテスト追加（Task 1）
- `src/rain.js` — 積もって残る挙動（Task 2）
- `src/styles.css` — ゆめかわパステル（Task 3）
- `japan-quiz.html` — `build/inline.py` で再生成（Task 4）

---

### Task 1: 【バグ修正】回答済みを選択肢から除外

**Files:**
- Modify: `src/logic.js`（`pickN` 26-29行、`makeChoices` 30行、`makeMapHints` 31行）
- Modify: `src/app.js`（`nameChoiceButtons` 162行、`renderNormalName2Place` 202行、`renderSoloName2Place` 247行）
- Modify: `build/test.js`（テスト追加）

**Interfaces:**
- Consumes: `shuffled(arr, rand)`（既存）
- Produces:
  - `makeChoices(answerId, allIds, rand, exclude = []) -> number[]`（正解含む3件・重複なし・`exclude`除外・不足時フォールバックで常に3件）
  - `makeMapHints(answerId, allIds, rand, exclude = []) -> number[]`（同上）

- [ ] **Step 1: 失敗するテストを `build/test.js` の末尾 `console.log` の前に追加**

```js
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node build/test.js`
Expected: FAIL（`makeChoices excludes answered ids` などで、除外したはずのidが含まれてしまうため）

- [ ] **Step 3: `src/logic.js` の `pickN`/`makeChoices`/`makeMapHints` を差し替え**

26-31行を次に置換:
```js
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
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node build/test.js`
Expected: `23 passed, 0 failed`（既存19 + 追加4）

- [ ] **Step 5: `src/app.js` の3箇所で回答済み集合を渡す**

各呼び出しを次のように変更（回答済みは `answeredMarks` のキー配列）:

162行 `nameChoiceButtons` 内:
```js
    const ids = window.LOGIC.makeChoices(answerId, allIds, seedRand(), Object.keys(answeredMarks).map(Number));
```
202行 `renderNormalName2Place` 内:
```js
      const hints = window.LOGIC.makeMapHints(q.prefId, allIds, seedRand(), Object.keys(answeredMarks).map(Number));
```
247行 `renderSoloName2Place` 内:
```js
    const ids = window.LOGIC.makeChoices(q.prefId, allIds, seedRand(), Object.keys(answeredMarks).map(Number));
```

- [ ] **Step 6: 構文チェックと回帰テスト**

Run: `node --check src/app.js && node --check src/logic.js && node build/test.js`
Expected: どちらも exit 0、テストは `23 passed, 0 failed`。

- [ ] **Step 7: コミット**

```bash
git add src/logic.js src/app.js build/test.js
git commit -m "fix: 回答済みの都道府県を選択肢・地図ヒントから除外

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 名産絵文字が底に積もってしばらく残る

**Files:**
- Modify: `src/rain.js`（`MAX` 5行、`burst` のパーティクル初期化 28-32行、`step` 38-60行）

**Interfaces:**
- Consumes/Produces: `RAIN.burst(emojis, count)` 不変（外部インターフェース維持）。

- [ ] **Step 1: `MAX` を増やし、パーティクルに静止状態と長い寿命を持たせる**

5行 `const MAX = 120;` を次に変更:
```js
  const MAX = 160;
```

`burst` 内の `particles.push({...})`（28-32行）を次に置換:
```js
      particles.push({
        el: t, x: rnd(5, 95), y: rnd(-15, -2),
        vx: rnd(-0.6, 0.6), vy: rnd(0, 0.4),
        life: rnd(3.6, 4.6), age: 0, resting: false,
      });
```

- [ ] **Step 2: `step` を、床で静止させ・寿命末尾でフェードする挙動に置換**

38-60行の `function step(ts) { ... }` を次に置換:
```js
  function step(ts) {
    if (last == null) last = ts;
    let dt = (ts - last) / 16.67; last = ts;
    if (dt > 3) dt = 3;
    const G = 0.09, REST = 0.7, FLOOR = 98, WALL_L = 1, WALL_R = 99, FADE = 0.8;
    for (const p of particles) {
      p.age += dt / 60;
      if (!p.resting) {
        p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > FLOOR) { p.y = FLOOR; p.vy = -Math.abs(p.vy) * REST; p.vx *= 0.8; }
        if (p.x < WALL_L) { p.x = WALL_L; p.vx = Math.abs(p.vx) * REST; }
        if (p.x > WALL_R) { p.x = WALL_R; p.vx = -Math.abs(p.vx) * REST; }
        // 床付近で十分減速したら着地させてその場に留める
        if (p.y >= FLOOR - 0.4 && Math.abs(p.vy) < 0.35 && Math.abs(p.vx) < 0.25) {
          p.resting = true; p.y = FLOOR; p.vx = 0; p.vy = 0;
        }
      }
      const remain = p.life - p.age;
      const op = remain < FADE ? Math.max(0, remain / FADE) : 1;
      p.el.setAttribute('x', p.x.toFixed(2));
      p.el.setAttribute('y', p.y.toFixed(2));
      p.el.setAttribute('opacity', op.toFixed(2));
    }
    const alive = [];
    for (const p of particles) {
      if (p.age < p.life) alive.push(p); else p.el.remove();
    }
    particles = alive;
    if (particles.length) { requestAnimationFrame(step); }
    else { running = false; last = null; }
  }
```

- [ ] **Step 3: 構文チェック**

Run: `node --check src/rain.js`
Expected: exit 0。

- [ ] **Step 4: 目視確認（コントローラが実施）**

`index.html` を開き（またはヘッドレスで）正解演出を発火。
Expected: 絵文字が降ってバウンドした後、**画面下部に積もってしばらく（約3〜4秒）ほぼ不透明のまま残り**、最後の約0.8秒でフェードして消える。速い正解ほど多く積もる。

- [ ] **Step 5: コミット**

```bash
git add src/rain.js
git commit -m "feat: 絵文字が底に積もってしばらく残ってから消える

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: ゆめかわパステルデザイン

**Files:**
- Modify: `src/styles.css`（全面差し替え＝値のみ。変数名・セレクタ・DOM前提は不変）

**Interfaces:** なし（CSSのみ）。CSS変数名（`--bg1`,`--bg2`,`--card`,`--ink`,`--accent`,`--good`,`--bad`,`--sea`,`--pref`,`--pref-answered`,`--pref-hint`,`--pref-target`）は維持。

- [ ] **Step 1: `src/styles.css` を次の内容で全面置換**

（明るいパステル背景に合わせ、従来 `#fff` だった文字色を可読な濃いパステル紫に変更。変数名・クラス名・セレクタは元のまま。）

```css
:root{
  --bg1:#f7e8ff; --bg2:#e3f6ff; --card:#fffdff; --ink:#6a4a86;
  --accent:#ffd1e8; --good:#b8f0d0; --bad:#ffc2cf; --sea:#d9f2fb;
  --pref:#bfead0; --pref-answered:#fff0b0; --pref-hint:#ffc7e0; --pref-target:#ffb0a8;
  --btn-shadow:#e6a9c9; --edge:#f3c9e4;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%;font-family:"Hiragino Maru Gothic ProN","Hiragino Sans",system-ui,sans-serif;color:var(--ink)}
body{background:linear-gradient(160deg,var(--bg1),var(--bg2));overflow:hidden}
#app{height:100vh;display:flex;align-items:stretch;justify-content:center}
.screen{width:100%;max-width:900px;margin:auto;padding:16px;display:flex;flex-direction:column;height:100vh}
.hidden{display:none!important}
.title{color:var(--ink);text-align:center;font-size:clamp(28px,6vw,52px);margin:12px 0;text-shadow:0 3px 0 #ffe3f2,0 4px 6px rgba(200,150,200,.35)}
.title::before{content:"✧ "}
.title::after{content:" ♡"}
h2{color:var(--ink);text-align:center;font-size:32px;text-shadow:0 2px 0 #ffe3f2}
button{font-family:inherit;cursor:pointer;border:none}
.btn{background:var(--accent);color:var(--ink);font-weight:800;font-size:20px;
  padding:14px 20px;border-radius:999px;box-shadow:0 5px 0 var(--btn-shadow);transition:transform .05s}
.btn:active{transform:translateY(3px);box-shadow:0 2px 0 var(--btn-shadow)}
.btn.sel{outline:4px solid #fff;outline-offset:1px;box-shadow:0 5px 0 var(--btn-shadow),0 0 0 4px #ffb6dd}
.card{background:var(--card);border-radius:26px;padding:16px;border:3px solid var(--edge);box-shadow:0 10px 30px rgba(180,140,200,.25)}
#menu-body{display:flex;flex-direction:column;gap:14px;overflow:auto}
.opt-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.opt-label{color:var(--ink);font-weight:800;text-align:center;margin-bottom:4px}
#quiz-hud{display:flex;justify-content:space-between;color:var(--ink);font-weight:800;font-size:20px;padding:6px 10px}
#quiz-stage{flex:1;display:flex;align-items:center;justify-content:center;min-height:0}
#quiz-stage svg{width:100%;height:100%}
#quiz-answer{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:12px 0}
.prompt{color:var(--ink);font-size:clamp(24px,5vw,40px);font-weight:900;text-align:center;text-shadow:0 2px 0 #ffe3f2}
#rain-layer{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:50}
.type-input{font-size:28px;padding:10px 14px;border-radius:16px;border:3px solid var(--accent);text-align:center;width:min(320px,80vw);color:var(--ink)}
.correct-flash{animation:flash .4s}
@keyframes flash{0%{background:var(--good)}100%{background:transparent}}
.shake{animation:shake .35s}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
```

- [ ] **Step 2: 目視確認（コントローラが実施）**

`index.html` をヘッドレスで開いてメニュー・クイズ・地図をスクリーンショット。
Expected:
- 背景がラベンダー→水色のパステルグラデ、タイトルに ✧ ♡ 装飾、文字がすべて濃いパステル紫で**読める**（白背景で白文字になっていない）。
- ボタンはパステルピンクで丸く、押すと沈む。カードは白＋ピンク縁。
- 地図の県色がパステル（通常=ミント、ターゲット=コーラル、ヒント=ピンク、回答済み=イエロー）。

- [ ] **Step 3: コミット**

```bash
git add src/styles.css
git commit -m "feat: ゆめかわパステルデザインに刷新

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 単一ファイル再ビルドと最終確認

**Files:**
- Regenerate: `japan-quiz.html`（`build/inline.py`）

**Interfaces:** なし。

- [ ] **Step 1: 単一HTMLを再生成**

Run: `python3 build/inline.py`
Expected: `wrote japan-quiz.html (…KB)` と、外部参照なしのアサーション通過。

- [ ] **Step 2: 外部参照ゼロを確認**

Run: `grep -c 'src="src/\|href="src/' japan-quiz.html`
Expected: `0`

- [ ] **Step 3: 目視・オフライン動作確認（コントローラが実施）**

`japan-quiz.html` を隔離ディレクトリにコピーして開く。
Expected: パステルUIで表示され、全モードが動作、正解で絵文字が積もって残り、通常×名前→場所イージーで**常に3県が光る**（回答済みが混じらない）。ネットワーク遮断でも動く。

- [ ] **Step 4: コミット**

```bash
git add japan-quiz.html
git commit -m "build: v2改善を反映して単一HTMLを再生成

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review（計画者チェック済み）

- **Spec coverage**: (1)パステル=Task 3、(2)絵文字積もり=Task 2、(3)選択肢バグ=Task 1、単一HTML再生成=Task 4。すべて対応。
- **Placeholder scan**: 各Stepに実コード記載。差し替え対象の行番号を明示。
- **Type consistency**: `makeChoices`/`makeMapHints` の新シグネチャ（`exclude=[]`）は app.js 呼び出し・テストと一致。`Object.keys(answeredMarks).map(Number)` は `exclude:number[]` と整合。CSS変数名は `map.js` 参照名（`--pref`/`--pref-answered`/`--pref-hint`/`--pref-target`）と一致。`RAIN.burst` シグネチャ不変。
- **後方互換**: `exclude` はデフォルト引数のため既存3引数テストは維持（Task 1 Step 1 の backward-compat テストで担保）。
