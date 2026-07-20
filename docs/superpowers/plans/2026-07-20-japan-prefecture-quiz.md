# 都道府県クイズアプリ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 小学4年生が都道府県の名前と場所を覚えるための、単一HTMLで動くゲーム風クイズアプリを作る。

**Architecture:** 開発中は責務ごとにファイルを分割（データ / 純粋ロジック / 地図描画 / 絵文字レイン / 画面制御）し、純粋ロジックは Node でユニットテストする。最後にビルドスクリプトで全ファイルを1枚の `japan-quiz.html` にインライン化して自己完結の成果物にする。地図は本物の都道府県SVGパス（GeoJSON由来、`build/prefectures.json` に生成済み）を使う。

**Tech Stack:** Vanilla JavaScript（UMD風・ビルドなしで動く）、SVG、`requestAnimationFrame`、localStorage。データ生成に Python3、テスト実行に Node.js。外部ライブラリ・外部フォント・外部画像・ネットワークに一切依存しない。

## Global Constraints

- 最終成果物は **単一の `japan-quiz.html`**。ダブルクリックで開けば動く（`file://` で動作、サーバー不要）。
- 外部リソース禁止（CDN・Webフォント・画像URL・fetch 全て不可）。絵文字はシステム標準絵文字を使う。
- 対象は **小学4年生**。UIは大きめの文字・丸いボタン・明るい配色の **ゲーム風**。日本語UI。
- 都道府県データは **JISコード 1〜47**（1=北海道 … 47=沖縄）を正とする。
- 地図SVGの座標系は `build/prefectures.json` の `viewBox`（現状 `[0,0,1000,1011.4]`）に従う。
- 純粋ロジック（`src/logic.js`）は乱数を引数 `rand()` で受け取り、テスト可能にする（`Math.random` を内部で直接呼ばない）。
- 記録の全問正解判定・タイム更新は「全問正解のトライのみベスト更新」。

---

## ファイル構成

開発時（分割）:
- `build/convert_geojson.py` — GeoJSON→`build/prefectures.json`（**作成済み**、再実行可能）
- `build/prefectures.json` — 地図データ（**生成済み**: viewBox・47県の `d`/`c`/`bbox`）
- `build/make_data.py` — `prefectures.json` に絵文字・Jリーグ表を結合して `src/data.js` を出力
- `src/data.js` — `MAP_VIEWBOX` / `PREFECTURES`（47件）/ `JLEAGUE`（チーム→県）
- `src/logic.js` — 純粋関数（出題キュー・選択肢生成・判定・絵文字数・記録更新）
- `src/map.js` — SVG地図の描画・ハイライト・回答済みマーク・クリック
- `src/rain.js` — 絵文字レイン（物理アニメーション）
- `src/app.js` — 画面遷移・ゲーム進行・タイマー・localStorage記録・全体配線
- `src/styles.css` — ゲーム風CSS
- `index.html` — 開発用エントリ（各 `src/*.js`, `styles.css` を `<script src>`/`<link>` で読み込む）
- `build/test.js` — Node 用テスト（`data.js` と `logic.js` を検証）
- `build/inline.py` — 全ファイルを1枚に結合して `japan-quiz.html` を出力
- `japan-quiz.html` — **最終成果物（単一ファイル）**

各 `src/*.js` は末尾に UMD ガードを付け、ブラウザでは `window` に、Node では `module.exports` に公開する（テスト容易化のため）。

---

## 参照データ（実装で使う確定値）

### 絵文字テーブル（県ID → 絵文字配列）
`make_data.py` に以下をそのまま埋め込む。

```
1  北海道  🐄 🦀 ⛄ 🐻 🍜
2  青森県  🍎 🏮 ❄️ 🐟
3  岩手県  🍜 🏔️ 🦌 🍶
4  宮城県  🐂 🌾 🎋 🐟
5  秋田県  🐕 🍢 👹 🌾
6  山形県  🍒 🍐 ♨️
7  福島県  🍑 🏯 🐴
8  茨城県  🫘 🍈 🌰
9  栃木県  🍓 🐒 ⛩️ ♨️
10 群馬県  ♨️ 🐴 🌾
11 埼玉県  🌾 🍠 🚃
12 千葉県  🥜 🎢 🐟
13 東京都  🗼 🏙️ 🚄 🎡
14 神奈川県 ⛵ 🍜 🏮 🗿
15 新潟県  🌾 🍶 ❄️
16 富山県  🦑 💊 🏔️ 🦐
17 石川県  🦀 🏯 🎎
18 福井県  🦕 🦀 👓
19 山梨県  🍇 🗻 🍑
20 長野県  🍎 🏔️ 🐒
21 岐阜県  🏘️ 🎐 🐟
22 静岡県  🗻 🍵 🐟
23 愛知県  🚗 🏯 🍤
24 三重県  🦐 🦪 ⛩️ 🥷
25 滋賀県  🌊 🏯 🐟
26 京都府  ⛩️ 🏯 👘 🍵
27 大阪府  🐙 🏯 🎡 🍢
28 兵庫県  🐄 🌉 ⚓
29 奈良県  🦌 🏯 🍵
30 和歌山県 🍊 🐼 🌊
31 鳥取県  🏜️ 🦀 🍐
32 島根県  ⛩️ 🌊 🐟
33 岡山県  🍑 🐒 🍇
34 広島県  🦪 ⛩️ 🕊️
35 山口県  🐡 🌊 ⛩️
36 徳島県  💃 🌀 🍊
37 香川県  🍜 🐙 🌉
38 愛媛県  🍊 ♨️ 🏯
39 高知県  🐟 🐕 🌊
40 福岡県  🍜 🍓 🏮
41 佐賀県  🍵 🎈 🦑
42 長崎県  ⛪ 🚢 🍜
43 熊本県  🐻 🏯 🍉
44 大分県  ♨️ 🌋 🐟
45 宮崎県  🌴 🥭 🐔
46 鹿児島県 🌋 🍠 🐖
47 沖縄県  🌺 🌊 🐠 🏝️
```

### 読み仮名（`kana`、タイプ判定の補助・表示用）
```
1 ほっかいどう 2 あおもり 3 いわて 4 みやぎ 5 あきた 6 やまがた 7 ふくしま
8 いばらき 9 とちぎ 10 ぐんま 11 さいたま 12 ちば 13 とうきょう 14 かながわ
15 にいがた 16 とやま 17 いしかわ 18 ふくい 19 やまなし 20 ながの 21 ぎふ
22 しずおか 23 あいち 24 みえ 25 しが 26 きょうと 27 おおさか 28 ひょうご
29 なら 30 わかやま 31 とっとり 32 しまね 33 おかやま 34 ひろしま 35 やまぐち
36 とくしま 37 かがわ 38 えひめ 39 こうち 40 ふくおか 41 さが 42 ながさき
43 くまもと 44 おおいた 45 みやざき 46 かごしま 47 おきなわ
```

### タイプ回答の許容表記（`accept`）生成ルール
`make_data.py` で各県について次を許容表記に含める（重複排除）:
- 正式名 `kanji`（例 `東京都`）
- サフィックス（`都`/`道`/`府`/`県`）を除いた短縮形（例 `東京`, `北海`… ただし北海道は `北海道` と `北海道` のみ＝短縮しない特例）
- 特例: 北海道は短縮形を作らない（`北海道` のみ）。それ以外はサフィックス除去形も許容。

### Jリーグ チーム→県ID（2025シーズン, 出典下記）
`make_data.py` に `JLEAGUE = [{team, prefId}, ...]` として埋め込む。
```
北海道コンサドーレ札幌:1  ヴァンラーレ八戸:2  ブラウブリッツ秋田:5  ベガルタ仙台:4
モンテディオ山形:6  いわきFC:7  福島ユナイテッドFC:7  鹿島アントラーズ:8
水戸ホーリーホック:8  栃木SC:9  栃木シティ:9  ザスパ群馬:10  浦和レッズ:11
RB大宮アルディージャ:11  柏レイソル:12  ジェフユナイテッド千葉:12  FC東京:13
東京ヴェルディ:13  FC町田ゼルビア:13  川崎フロンターレ:14  横浜F・マリノス:14
横浜FC:14  湘南ベルマーレ:14  SC相模原:14  アルビレックス新潟:15  カターレ富山:16
ツエーゲン金沢:17  ヴァンフォーレ甲府:19  松本山雅FC:20  AC長野パルセイロ:20
FC岐阜:21  清水エスパルス:22  ジュビロ磐田:22  藤枝MYFC:22  アスルクラロ沼津:22
名古屋グランパス:23  京都サンガF.C.:26  ガンバ大阪:27  セレッソ大阪:27  FC大阪:27
ヴィッセル神戸:28  奈良クラブ:29  ガイナーレ鳥取:31  ファジアーノ岡山:33
サンフレッチェ広島:34  レノファ山口FC:35  徳島ヴォルティス:36  カマタマーレ讃岐:37
愛媛FC:38  FC今治:38  高知ユナイテッドSC:39  アビスパ福岡:40  ギラヴァンツ北九州:40
サガン鳥栖:41  V・ファーレン長崎:42  ロアッソ熊本:43  大分トリニータ:44
テゲバジャーロ宮崎:45  鹿児島ユナイテッドFC:46  FC琉球:47
```
出典: [STADIO Jリーグクラブ一覧2025](https://stadio.jp/j-league-clubs/) / [Jリーグ公式](https://www.jleague.jp/club/)。Jクラブのない6県: 岩手・福井・三重・滋賀・和歌山・島根。

---

## 設定キーと画面遷移（共通仕様）

`settings` オブジェクト:
```js
{ mode: 'normal'|'solo'|'soccer', dir: 'place2name'|'name2place', level: 'easy'|'hard' }
// soccer は dir/level を無視（内部的に dir='name2place', level='easy' 相当のクリック方式）
```
`settingKey(settings)`:
- soccer → `"soccer"`
- それ以外 → `"{mode}|{dir}|{level}"`（例 `"normal|place2name|easy"`）

無効な組み合わせ: `mode==='solo' && dir==='name2place' && level==='hard'` は選択不可。

画面は3つの `<section>`（`#screen-menu` / `#screen-quiz` / `#screen-result`）を CSS の `hidden` クラスで出し分ける。

---

### Task 1: データファイル生成（`src/data.js`）

**Files:**
- Create: `build/make_data.py`
- Create: `src/data.js`（`make_data.py` の出力）
- Create: `build/test.js`（データ検証パートをこのタスクで作る）
- Uses: `build/prefectures.json`（生成済み）

**Interfaces:**
- Produces（`src/data.js` がグローバル/exports に公開）:
  - `MAP_VIEWBOX: [number,number,number,number]`
  - `PREFECTURES: Array<{id:number, kanji:string, kana:string, accept:string[], emojis:string[], teams:string[], d:string, c:[number,number], bbox:[number,number,number,number]}>`（id 昇順・47件）
  - `JLEAGUE: Array<{team:string, prefId:number}>`

- [ ] **Step 1: `build/make_data.py` を書く**

`build/prefectures.json` を読み、上記「参照データ」の絵文字・kana・Jリーグ表を結合し、`accept` を生成ルールで作って `src/data.js` を出力する。

```python
# build/make_data.py
import json, os

BASE = os.path.dirname(__file__)
pj = json.load(open(os.path.join(BASE, 'prefectures.json'), encoding='utf-8'))
VB = pj['viewBox']
P = pj['prefectures']  # {"1": {name,d,c,bbox}, ...}

EMOJI = {
 1:"🐄 🦀 ⛄ 🐻 🍜",2:"🍎 🏮 ❄️ 🐟",3:"🍜 🏔️ 🦌 🍶",4:"🐂 🌾 🎋 🐟",
 5:"🐕 🍢 👹 🌾",6:"🍒 🍐 ♨️",7:"🍑 🏯 🐴",8:"🫘 🍈 🌰",9:"🍓 🐒 ⛩️ ♨️",
 10:"♨️ 🐴 🌾",11:"🌾 🍠 🚃",12:"🥜 🎢 🐟",13:"🗼 🏙️ 🚄 🎡",14:"⛵ 🍜 🏮 🗿",
 15:"🌾 🍶 ❄️",16:"🦑 💊 🏔️ 🦐",17:"🦀 🏯 🎎",18:"🦕 🦀 👓",19:"🍇 🗻 🍑",
 20:"🍎 🏔️ 🐒",21:"🏘️ 🎐 🐟",22:"🗻 🍵 🐟",23:"🚗 🏯 🍤",24:"🦐 🦪 ⛩️ 🥷",
 25:"🌊 🏯 🐟",26:"⛩️ 🏯 👘 🍵",27:"🐙 🏯 🎡 🍢",28:"🐄 🌉 ⚓",29:"🦌 🏯 🍵",
 30:"🍊 🐼 🌊",31:"🏜️ 🦀 🍐",32:"⛩️ 🌊 🐟",33:"🍑 🐒 🍇",34:"🦪 ⛩️ 🕊️",
 35:"🐡 🌊 ⛩️",36:"💃 🌀 🍊",37:"🍜 🐙 🌉",38:"🍊 ♨️ 🏯",39:"🐟 🐕 🌊",
 40:"🍜 🍓 🏮",41:"🍵 🎈 🦑",42:"⛪ 🚢 🍜",43:"🐻 🏯 🍉",44:"♨️ 🌋 🐟",
 45:"🌴 🥭 🐔",46:"🌋 🍠 🐖",47:"🌺 🌊 🐠 🏝️",
}
KANA = {
 1:"ほっかいどう",2:"あおもり",3:"いわて",4:"みやぎ",5:"あきた",6:"やまがた",
 7:"ふくしま",8:"いばらき",9:"とちぎ",10:"ぐんま",11:"さいたま",12:"ちば",
 13:"とうきょう",14:"かながわ",15:"にいがた",16:"とやま",17:"いしかわ",18:"ふくい",
 19:"やまなし",20:"ながの",21:"ぎふ",22:"しずおか",23:"あいち",24:"みえ",25:"しが",
 26:"きょうと",27:"おおさか",28:"ひょうご",29:"なら",30:"わかやま",31:"とっとり",
 32:"しまね",33:"おかやま",34:"ひろしま",35:"やまぐち",36:"とくしま",37:"かがわ",
 38:"えひめ",39:"こうち",40:"ふくおか",41:"さが",42:"ながさき",43:"くまもと",
 44:"おおいた",45:"みやざき",46:"かごしま",47:"おきなわ",
}
JLEAGUE_RAW = [
 ("北海道コンサドーレ札幌",1),("ヴァンラーレ八戸",2),("ブラウブリッツ秋田",5),
 ("ベガルタ仙台",4),("モンテディオ山形",6),("いわきFC",7),("福島ユナイテッドFC",7),
 ("鹿島アントラーズ",8),("水戸ホーリーホック",8),("栃木SC",9),("栃木シティ",9),
 ("ザスパ群馬",10),("浦和レッズ",11),("RB大宮アルディージャ",11),("柏レイソル",12),
 ("ジェフユナイテッド千葉",12),("FC東京",13),("東京ヴェルディ",13),("FC町田ゼルビア",13),
 ("川崎フロンターレ",14),("横浜F・マリノス",14),("横浜FC",14),("湘南ベルマーレ",14),
 ("SC相模原",14),("アルビレックス新潟",15),("カターレ富山",16),("ツエーゲン金沢",17),
 ("ヴァンフォーレ甲府",19),("松本山雅FC",20),("AC長野パルセイロ",20),("FC岐阜",21),
 ("清水エスパルス",22),("ジュビロ磐田",22),("藤枝MYFC",22),("アスルクラロ沼津",22),
 ("名古屋グランパス",23),("京都サンガF.C.",26),("ガンバ大阪",27),("セレッソ大阪",27),
 ("FC大阪",27),("ヴィッセル神戸",28),("奈良クラブ",29),("ガイナーレ鳥取",31),
 ("ファジアーノ岡山",33),("サンフレッチェ広島",34),("レノファ山口FC",35),
 ("徳島ヴォルティス",36),("カマタマーレ讃岐",37),("愛媛FC",38),("FC今治",38),
 ("高知ユナイテッドSC",39),("アビスパ福岡",40),("ギラヴァンツ北九州",40),
 ("サガン鳥栖",41),("V・ファーレン長崎",42),("ロアッソ熊本",43),("大分トリニータ",44),
 ("テゲバジャーロ宮崎",45),("鹿児島ユナイテッドFC",46),("FC琉球",47),
]

SUFFIX = ("都","道","府","県")
def accept_forms(kanji):
    forms = {kanji}
    if kanji != "北海道":
        for s in SUFFIX:
            if kanji.endswith(s):
                forms.add(kanji[:-1])
    return sorted(forms, key=len, reverse=True)

teams_by_pref = {}
for team, pid in JLEAGUE_RAW:
    teams_by_pref.setdefault(pid, []).append(team)

prefs = []
for pid in range(1, 48):
    src = P[str(pid)]
    prefs.append({
        "id": pid, "kanji": src["name"], "kana": KANA[pid],
        "accept": accept_forms(src["name"]),
        "emojis": EMOJI[pid].split(),
        "teams": teams_by_pref.get(pid, []),
        "d": src["d"], "c": src["c"], "bbox": src["bbox"],
    })

jleague = [{"team": t, "prefId": p} for (t, p) in JLEAGUE_RAW]

out = "// AUTO-GENERATED by build/make_data.py — do not edit by hand\n"
out += "const MAP_VIEWBOX = " + json.dumps(VB) + ";\n"
out += "const PREFECTURES = " + json.dumps(prefs, ensure_ascii=False) + ";\n"
out += "const JLEAGUE = " + json.dumps(jleague, ensure_ascii=False) + ";\n"
out += ("if (typeof module !== 'undefined' && module.exports) "
        "{ module.exports = { MAP_VIEWBOX, PREFECTURES, JLEAGUE }; }\n")
open(os.path.join(BASE, '..', 'src', 'data.js'), 'w', encoding='utf-8').write(out)
print("wrote src/data.js:", len(prefs), "prefectures,", len(jleague), "teams")
```

- [ ] **Step 2: 生成を実行**

Run: `mkdir -p src && python3 build/make_data.py`
Expected: `wrote src/data.js: 47 prefectures, 60 teams`

- [ ] **Step 3: `build/test.js` にデータ検証テストを書く**

```js
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
```

- [ ] **Step 4: テスト実行**

Run: `node build/test.js`
Expected: `7 passed, 0 failed`（終了コード0）

- [ ] **Step 5: コミット**

```bash
git add build/make_data.py build/prefectures.json build/convert_geojson.py src/data.js build/test.js
git commit -m "feat: generate prefecture data module (map paths + emoji + J-League)"
```

---

### Task 2: 純粋ロジック（`src/logic.js`）

**Files:**
- Create: `src/logic.js`
- Modify: `build/test.js`（ロジックのテストを追記）

**Interfaces:**
- Consumes: `PREFECTURES`, `JLEAGUE`（`src/data.js` より）
- Produces（`src/logic.js` が公開）:
  - `mulberry32(seed:number) -> (()=>number)` 決定的PRNG（[0,1)）
  - `shuffled(arr:any[], rand:()=>number) -> any[]` 非破壊シャッフル
  - `settingKey(settings) -> string`
  - `isValidCombo(settings) -> boolean`
  - `makeChoices(answerId:number, allIds:number[], rand) -> number[]`（正解含む3件・重複なし・シャッフル済み）
  - `makeMapHints(answerId:number, allIds:number[], rand) -> number[]`（正解含む3件）
  - `normalizeAnswer(s:string) -> string`（trim＋全空白除去）
  - `judgeTyped(input:string, pref) -> boolean`
  - `emojiCountForTime(elapsedSec:number) -> number`（15〜90、速いほど多い）
  - `buildQueue(settings, prefs, jleague, rand) -> Array<{prefId:number, team?:string}>`
  - `updateRecord(records:object, key:string, timeMs:number, allCorrect:boolean) -> object`（新オブジェクトを返す）

- [ ] **Step 1: 失敗するテストを追記（`build/test.js` 末尾の `console.log` の前に挿入）**

```js
const L = require('../src/logic.js');

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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node build/test.js`
Expected: FAIL（`Cannot find module '../src/logic.js'` もしくは関数未定義）

- [ ] **Step 3: `src/logic.js` を実装**

```js
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
function pickN(answerId, allIds, n, rand) {
  const pool = shuffled(allIds.filter(id => id !== answerId), rand).slice(0, n - 1);
  return shuffled([answerId, ...pool], rand);
}
function makeChoices(answerId, allIds, rand) { return pickN(answerId, allIds, 3, rand); }
function makeMapHints(answerId, allIds, rand) { return pickN(answerId, allIds, 3, rand); }
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
  if (allCorrect && (!prev || timeMs < prev.bestTimeMs)) {
    next[key] = { bestTimeMs: timeMs, playedCount: (prev ? prev.playedCount : 0) + 1 };
  } else {
    next[key] = { bestTimeMs: prev ? prev.bestTimeMs : null, playedCount: (prev ? prev.playedCount : 0) + 1 };
  }
  return next;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mulberry32, shuffled, settingKey, isValidCombo, makeChoices,
    makeMapHints, normalizeAnswer, judgeTyped, emojiCountForTime, buildQueue, updateRecord };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node build/test.js`
Expected: `19 passed, 0 failed`

- [ ] **Step 5: コミット**

```bash
git add src/logic.js build/test.js
git commit -m "feat: pure quiz logic with unit tests"
```

---

### Task 3: HTML骨格・CSS・画面ルーティング（`index.html`, `src/styles.css`, `src/app.js` の土台）

**Files:**
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/app.js`（このタスクでは画面切替の土台のみ）

**Interfaces:**
- Produces: `showScreen(name:'menu'|'quiz'|'result')` を `src/app.js` に定義。3つの `<section id="screen-...">` を出し分ける。

- [ ] **Step 1: `index.html` を作る**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>都道府県クイズ</title>
<link rel="stylesheet" href="src/styles.css">
</head>
<body>
<div id="app">
  <section id="screen-menu" class="screen">
    <h1 class="title">🗾 都道府県クイズ</h1>
    <div id="menu-body"></div>
  </section>
  <section id="screen-quiz" class="screen hidden">
    <header id="quiz-hud">
      <span id="hud-timer">0.0</span>
      <span id="hud-progress">0 / 0</span>
      <span id="hud-score">✅0 ❌0</span>
    </header>
    <div id="quiz-stage"></div>
    <div id="quiz-answer"></div>
    <svg id="rain-layer" aria-hidden="true"></svg>
  </section>
  <section id="screen-result" class="screen hidden">
    <h2>けっか</h2>
    <div id="result-body"></div>
  </section>
</div>
<!-- 開発時は分割読み込み。最終は build/inline.py で1枚に結合 -->
<script src="src/data.js"></script>
<script src="src/logic.js"></script>
<script src="src/map.js"></script>
<script src="src/rain.js"></script>
<script src="src/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `src/styles.css` を作る（ゲーム風・大きめUI）**

```css
:root{
  --bg1:#1b2a6b; --bg2:#3d6ee0; --card:#ffffff; --ink:#20305a;
  --accent:#ffd23f; --good:#2ecc71; --bad:#ff5a7a; --sea:#bfe3f0;
  --pref:#8fd18b; --pref-answered:#ffe08a; --pref-hint:#ffb3c1; --pref-target:#ff7a59;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%;font-family:"Hiragino Maru Gothic ProN","Hiragino Sans",system-ui,sans-serif;color:var(--ink)}
body{background:linear-gradient(160deg,var(--bg1),var(--bg2));overflow:hidden}
#app{height:100vh;display:flex;align-items:stretch;justify-content:center}
.screen{width:100%;max-width:900px;margin:auto;padding:16px;display:flex;flex-direction:column;height:100vh}
.hidden{display:none!important}
.title{color:#fff;text-align:center;font-size:clamp(28px,6vw,52px);margin:12px 0;text-shadow:0 4px 0 rgba(0,0,0,.25)}
h2{color:#fff;text-align:center;font-size:32px}
button{font-family:inherit;cursor:pointer;border:none}
.btn{background:var(--accent);color:var(--ink);font-weight:800;font-size:20px;
  padding:14px 20px;border-radius:999px;box-shadow:0 5px 0 #c9a012;transition:transform .05s}
.btn:active{transform:translateY(3px);box-shadow:0 2px 0 #c9a012}
.btn.sel{outline:4px solid #fff}
.card{background:var(--card);border-radius:22px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
#menu-body{display:flex;flex-direction:column;gap:14px;overflow:auto}
.opt-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.opt-label{color:#fff;font-weight:800;text-align:center;margin-bottom:4px}
#quiz-hud{display:flex;justify-content:space-between;color:#fff;font-weight:800;font-size:20px;padding:6px 10px}
#quiz-stage{flex:1;display:flex;align-items:center;justify-content:center;min-height:0}
#quiz-stage svg{width:100%;height:100%}
#quiz-answer{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:12px 0}
.prompt{color:#fff;font-size:clamp(24px,5vw,40px);font-weight:900;text-align:center}
#rain-layer{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:50}
.type-input{font-size:28px;padding:10px 14px;border-radius:14px;border:3px solid var(--accent);text-align:center;width:min(320px,80vw)}
.correct-flash{animation:flash .4s}
@keyframes flash{0%{background:var(--good)}100%{background:transparent}}
.shake{animation:shake .35s}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
```

- [ ] **Step 3: `src/app.js` の土台（画面ルーティング）を書く**

```js
// src/app.js
(function () {
  'use strict';
  function showScreen(name) {
    for (const n of ['menu', 'quiz', 'result']) {
      document.getElementById('screen-' + n).classList.toggle('hidden', n !== name);
    }
  }
  window.APP = { showScreen };
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('menu-body').textContent = 'メニュー準備中…';
    showScreen('menu');
  });
})();
```

- [ ] **Step 4: 手動確認**

Run: `open index.html`（またはブラウザで `file://` を開く）
Expected（ブラウザで目視）:
- 青いグラデ背景に「🗾 都道府県クイズ」の見出しが中央に出る
- 「メニュー準備中…」が表示される
- Consoleにエラーが出ていない（`data.js`/`logic.js` 読み込み成功）

- [ ] **Step 5: コミット**

```bash
git add index.html src/styles.css src/app.js
git commit -m "feat: app shell, game-style CSS, screen routing"
```

---

### Task 4: 地図描画モジュール（`src/map.js`）

**Files:**
- Create: `src/map.js`

**Interfaces:**
- Consumes: `MAP_VIEWBOX`, `PREFECTURES`
- Produces: グローバル `MAP` オブジェクト:
  - `MAP.renderFull(container:HTMLElement, {onPick:(prefId)=>void}) -> void` 全国地図をSVGで描画
  - `MAP.setStates(states:{[prefId]:'target'|'hint'|'answered'|'normal'}) -> void` 各県の見た目を更新
  - `MAP.markAnswered(prefId:number, emoji:string) -> void` 回答済み色＋重心に絵文字
  - `MAP.setClickable(prefIds:number[]|null) -> void` クリック可能な県を限定（null=全県）
  - `MAP.flashPref(prefId:number, kind:'good'|'bad') -> void`
  - `MAP.reset() -> void`

- [ ] **Step 1: `src/map.js` を実装**

```js
// src/map.js — 全国SVG地図の描画と状態管理
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  let svg = null, onPickCb = null, clickable = null;
  const paths = {};   // prefId -> <path>
  const marks = {};   // prefId -> <text> (emoji)

  function renderFull(container, opts) {
    onPickCb = (opts && opts.onPick) || null;
    clickable = null;
    container.innerHTML = '';
    svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', MAP_VIEWBOX.join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    for (const p of PREFECTURES) {
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', p.d);
      path.setAttribute('fill', 'var(--pref)');
      path.setAttribute('stroke', '#20305a');
      path.setAttribute('stroke-width', '1');
      path.setAttribute('data-id', p.id);
      path.style.cursor = 'pointer';
      path.addEventListener('click', () => {
        if (clickable && !clickable.includes(p.id)) return;
        if (onPickCb) onPickCb(p.id);
      });
      svg.appendChild(path);
      paths[p.id] = path;
    }
    container.appendChild(svg);
  }

  const FILL = { target:'var(--pref-target)', hint:'var(--pref-hint)',
                 answered:'var(--pref-answered)', normal:'var(--pref)' };
  function setStates(states) {
    for (const p of PREFECTURES) {
      const st = (states && states[p.id]) || 'normal';
      if (paths[p.id]) paths[p.id].setAttribute('fill', FILL[st] || FILL.normal);
    }
  }
  function markAnswered(prefId, emoji) {
    if (paths[prefId]) paths[prefId].setAttribute('fill', FILL.answered);
    if (marks[prefId]) marks[prefId].remove();
    const p = PREFECTURES.find(x => x.id === prefId);
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', p.c[0]); t.setAttribute('y', p.c[1]);
    t.setAttribute('font-size', '18'); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central'); t.setAttribute('pointer-events', 'none');
    t.textContent = emoji;
    svg.appendChild(t); marks[prefId] = t;
  }
  function setClickable(ids) { clickable = ids; }
  function flashPref(prefId, kind) {
    const el = paths[prefId]; if (!el) return;
    const orig = el.getAttribute('fill');
    el.setAttribute('fill', kind === 'good' ? 'var(--good)' : 'var(--bad)');
    setTimeout(() => el.setAttribute('fill', orig), 350);
  }
  function reset() {
    for (const id in marks) marks[id].remove();
    for (const k in marks) delete marks[k];
    setStates({});
    clickable = null;
  }
  window.MAP = { renderFull, setStates, markAnswered, setClickable, flashPref, reset };
})();
```

- [ ] **Step 2: 手動確認用の一時コードを `src/app.js` の `DOMContentLoaded` 内に一時追加**

`menu-body` 設定行を次に一時置換:
```js
    MAP.renderFull(document.getElementById('menu-body'), { onPick: (id) => {
      const p = PREFECTURES.find(x=>x.id===id);
      MAP.markAnswered(id, p.emojis[0]);
      console.log('picked', id, p.kanji);
    }});
    MAP.setStates({ 13:'target', 27:'hint', 1:'answered' });
```

- [ ] **Step 3: 手動確認**

Run: `open index.html`
Expected（目視）:
- 日本地図が表示され、47都道府県の形が見える（Task 0 の `map-preview.png` と同じ形）
- 東京(13)がオレンジ、大阪(27)がピンク、北海道(1)が黄で塗られる
- 県をクリックすると Console に `picked <id> <名前>` が出て、その県に絵文字が付く

- [ ] **Step 4: 一時コードを削除**して `menu-body` を `'メニュー準備中…'` に戻す。

- [ ] **Step 5: コミット**

```bash
git add src/map.js src/app.js
git commit -m "feat: national SVG map rendering with states and answered marks"
```

---

### Task 5: 絵文字レイン（`src/rain.js`）

**Files:**
- Create: `src/rain.js`

**Interfaces:**
- Consumes: `emojiCountForTime`（`logic.js`）は呼び出し側が数を決めて渡す設計にするため、rain 自体は個数を受け取る
- Produces: グローバル `RAIN`:
  - `RAIN.burst(emojis:string[], count:number) -> void` 指定個数の絵文字を上から降らせ、下端・左右でバウンドさせる
  - 内部で `#rain-layer`（SVG, 画面全体）を使い、`requestAnimationFrame` で更新。同時最大 120 個で打ち切り。約2.5秒で消滅。

- [ ] **Step 1: `src/rain.js` を実装**

```js
// src/rain.js — 正解時の絵文字レイン（物理バウンド）
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const MAX = 120;
  let particles = [];
  let running = false;
  let layer = null;

  function ensureLayer() {
    layer = document.getElementById('rain-layer');
    layer.setAttribute('viewBox', `0 0 100 100`);
    layer.setAttribute('preserveAspectRatio', 'none');
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function burst(emojis, count) {
    if (!layer) ensureLayer();
    const n = Math.min(count, MAX - particles.length);
    for (let i = 0; i < n; i++) {
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('font-size', rnd(3.2, 5.5).toFixed(2)); // in viewBox units (~vh)
      t.setAttribute('text-anchor', 'middle');
      t.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      layer.appendChild(t);
      particles.push({
        el: t, x: rnd(5, 95), y: rnd(-15, -2),
        vx: rnd(-0.6, 0.6), vy: rnd(0, 0.4),
        life: rnd(2.0, 2.8), age: 0,
      });
    }
    if (!running) { running = true; requestAnimationFrame(step); }
  }

  let last = null;
  function step(ts) {
    if (last == null) last = ts;
    let dt = (ts - last) / 16.67; last = ts;
    if (dt > 3) dt = 3;
    const G = 0.09, REST = 0.72, FLOOR = 98, WALL_L = 1, WALL_R = 99;
    for (const p of particles) {
      p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt / 60;
      if (p.y > FLOOR) { p.y = FLOOR; p.vy = -Math.abs(p.vy) * REST; p.vx *= 0.85; }
      if (p.x < WALL_L) { p.x = WALL_L; p.vx = Math.abs(p.vx) * REST; }
      if (p.x > WALL_R) { p.x = WALL_R; p.vx = -Math.abs(p.vx) * REST; }
      const fade = Math.max(0, 1 - p.age / p.life);
      p.el.setAttribute('x', p.x.toFixed(2));
      p.el.setAttribute('y', p.y.toFixed(2));
      p.el.setAttribute('opacity', fade.toFixed(2));
    }
    const alive = [];
    for (const p of particles) {
      if (p.age < p.life) alive.push(p); else p.el.remove();
    }
    particles = alive;
    if (particles.length) { requestAnimationFrame(step); }
    else { running = false; last = null; }
  }
  window.RAIN = { burst };
})();
```

注: `#rain-layer` を viewBox `0 0 100 100` + `preserveAspectRatio:none` にすることで、x/y を画面幅・高さのパーセントとして扱える（フォントサイズ単位は縦基準の相対値）。

- [ ] **Step 2: 手動確認用の一時コードを `src/app.js` の `DOMContentLoaded` に追加**

```js
    window.addEventListener('click', () => RAIN.burst(['🍎','🦀','⛄','🐻'], 60));
```
（`showScreen('quiz')` も一時的に呼んで `#rain-layer` が可視な quiz 画面を表示）

- [ ] **Step 3: 手動確認**

Run: `open index.html`、画面をクリック
Expected（目視）: 絵文字が上から降ってきて、画面下端と左右の壁でバウンドし、数秒でフェードして消える。個数を 20 と 80 で変えると降る量が明確に変わる。

- [ ] **Step 4: 一時コードを削除**（`showScreen('quiz')` と click ハンドラを戻す）

- [ ] **Step 5: コミット**

```bash
git add src/rain.js
git commit -m "feat: bouncing emoji rain effect"
```

---

### Task 6: ゲーム進行エンジン＋メニュー（`src/app.js` 本体）

**Files:**
- Modify: `src/app.js`（全面実装）

**Interfaces:**
- Consumes: `PREFECTURES`, `JLEAGUE`, `MAP_VIEWBOX`, `src/logic.js` の全関数, `MAP`, `RAIN`
- Produces: `window.APP` に `showScreen` に加え内部状態機械。localStorage 記録は Task 8 で追加するため、この Task では記録は「メモリ上のみ・リザルト表示まで」。

このタスクは大きいので、状態と各モードの出題描画を段階的に作る。

- [ ] **Step 1: メニュー描画とゲーム状態の骨組みを書く**

`src/app.js` を全面的に次で置き換える（土台の `showScreen` は残す）。まずメニューと「スタートで空のクイズ画面に入る」まで。

```js
// src/app.js
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  function showScreen(name) {
    for (const n of ['menu','quiz','result'])
      $('screen-'+n).classList.toggle('hidden', n !== name);
  }

  const state = {
    settings: { mode:'normal', dir:'place2name', level:'easy' },
    queue: [], idx: 0, correct: 0, miss: 0,
    startMs: 0, qStartMs: 0, timerId: null,
    curPromptSolved: false,
  };
  let records = {}; // Task 8 で localStorage に接続

  // ---- メニュー ----
  const MODES = [['normal','通常（地図）'],['solo','形だけ'],['soccer','サッカー⚽']];
  const DIRS  = [['place2name','場所→名前'],['name2place','名前→場所']];
  const LEVELS= [['easy','イージー(3択)'],['hard','ハード(タイプ)']];

  function renderMenu() {
    const body = $('menu-body');
    body.innerHTML = '';
    body.appendChild(optRow('モード', MODES, 'mode'));
    const dirRow = optRow('こたえかた', DIRS, 'dir');
    const lvlRow = optRow('レベル', LEVELS, 'level');
    body.appendChild(dirRow); body.appendChild(lvlRow);

    const best = document.createElement('div');
    best.className = 'opt-label'; best.id = 'menu-best';
    body.appendChild(best);

    const start = document.createElement('button');
    start.className = 'btn'; start.style.alignSelf = 'center'; start.textContent = '▶ スタート';
    start.addEventListener('click', startGame);
    body.appendChild(start);

    function refresh() {
      // soccer はこたえかた・レベルを隠す
      const soccer = state.settings.mode === 'soccer';
      dirRow.style.display = soccer ? 'none' : '';
      lvlRow.style.display = soccer ? 'none' : '';
      // 無効組み合わせ: solo+name2place+hard → hard を無効化
      for (const b of lvlRow.querySelectorAll('button')) {
        const val = b.dataset.val;
        const test = { ...state.settings, level: val };
        const bad = !window.LOGIC.isValidCombo(test);
        b.disabled = bad; b.style.opacity = bad ? .4 : 1;
        if (bad && state.settings.level === val) { state.settings.level = 'easy'; markSel(lvlRow,'easy'); }
      }
      const rec = records[window.LOGIC.settingKey(state.settings)];
      best.textContent = rec && rec.bestTimeMs ? `ベスト: ${(rec.bestTimeMs/1000).toFixed(1)}秒` : 'ベスト: --';
    }
    function optRow(label, opts, key) {
      const wrap = document.createElement('div');
      const lab = document.createElement('div'); lab.className='opt-label'; lab.textContent=label;
      const row = document.createElement('div'); row.className='opt-row';
      for (const [val, text] of opts) {
        const b = document.createElement('button');
        b.className = 'btn' + (state.settings[key]===val ? ' sel':'');
        b.textContent = text; b.dataset.val = val;
        b.addEventListener('click', () => { state.settings[key]=val; markSel(row,val); refresh(); });
        row.appendChild(b);
      }
      wrap.appendChild(lab); wrap.appendChild(row); return wrap;
    }
    function markSel(row, val) {
      for (const b of row.querySelectorAll('button')) b.classList.toggle('sel', b.dataset.val===val);
    }
    refresh();
  }

  function startGame() { /* Step 2 で実装 */ }

  window.APP = { showScreen };
  window.LOGIC = window.LOGIC || {}; // logic.js をブラウザ公開する橋渡し（下記 Step で確定）
  document.addEventListener('DOMContentLoaded', () => { renderMenu(); showScreen('menu'); });
})();
```

注: `logic.js` はブラウザで `window.LOGIC` として使う。`src/logic.js` の UMD ガード直前に次を追加すること:
```js
if (typeof window !== 'undefined') { window.LOGIC = { mulberry32, shuffled, settingKey, isValidCombo, makeChoices, makeMapHints, normalizeAnswer, judgeTyped, emojiCountForTime, buildQueue, updateRecord }; }
```

- [ ] **Step 2: `startGame` とゲームループ・タイマー・HUD を実装**

`startGame` を次で置き換える:
```js
  function seedRand() { return window.LOGIC.mulberry32((performance.now()*1000|0) ^ (Date.now()&0xffffffff)); }

  function startGame() {
    const s = state.settings;
    state.queue = window.LOGIC.buildQueue(s, PREFECTURES, JLEAGUE, seedRand());
    state.idx = 0; state.correct = 0; state.miss = 0;
    state.startMs = performance.now();
    MAP.reset();
    // 通常/サッカーは全国地図を quiz-stage に描画
    if (s.mode === 'normal' || s.mode === 'soccer') {
      MAP.renderFull($('quiz-stage'), { onPick: onMapPick });
    }
    showScreen('quiz');
    startTimer();
    nextQuestion();
  }
  function startTimer() {
    stopTimer();
    state.timerId = setInterval(() => {
      const t = (performance.now() - state.startMs) / 1000;
      $('hud-timer').textContent = t.toFixed(1);
    }, 100);
  }
  function stopTimer(){ if (state.timerId){ clearInterval(state.timerId); state.timerId=null; } }
  function updateHud() {
    $('hud-progress').textContent = `${state.idx} / ${state.queue.length}`;
    $('hud-score').textContent = `✅${state.correct} ❌${state.miss}`;
  }
```

- [ ] **Step 3: `nextQuestion` と各モードの出題描画を実装**

```js
  const allIds = PREFECTURES.map(p => p.id);
  function prefById(id){ return PREFECTURES.find(p=>p.id===id); }

  function nextQuestion() {
    updateHud();
    if (state.idx >= state.queue.length) return finishGame();
    state.qStartMs = performance.now();
    state.curPromptSolved = false;
    const q = state.queue[state.idx];
    const s = state.settings;
    const stage = $('quiz-stage'), answer = $('quiz-answer');
    answer.innerHTML = '';

    if (s.mode === 'soccer') return renderSoccer(q);
    if (s.mode === 'normal') {
      if (s.dir === 'place2name') return renderNormalPlace2Name(q);
      return renderNormalName2Place(q);
    }
    // solo
    if (s.dir === 'place2name') return renderSoloPlace2Name(q);
    return renderSoloName2Place(q);
  }

  // 共通: 正解/不正解処理
  function onCorrect(prefId) {
    if (state.curPromptSolved) return;
    state.curPromptSolved = true;
    state.correct++;
    const p = prefById(prefId);
    const sec = (performance.now() - state.qStartMs) / 1000;
    RAIN.burst(p.emojis, window.LOGIC.emojiCountForTime(sec));
    if (state.settings.mode === 'normal' || state.settings.mode === 'soccer')
      MAP.markAnswered(prefId, p.emojis[0]);
    state.idx++;
    setTimeout(nextQuestion, 650);
  }
  function onWrong(prefId) {
    state.miss++;
    updateHud();
    if (prefId != null && (state.settings.mode==='normal'||state.settings.mode==='soccer'))
      MAP.flashPref(prefId, 'bad');
    $('quiz-stage').classList.add('shake');
    setTimeout(()=>$('quiz-stage').classList.remove('shake'), 350);
  }

  // 3択の名前ボタンを作る（place2name 系で共通）
  function nameChoiceButtons(answerId) {
    const ids = window.LOGIC.makeChoices(answerId, allIds, seedRand());
    const wrap = $('quiz-answer');
    for (const id of ids) {
      const b = document.createElement('button');
      b.className = 'btn'; b.textContent = prefById(id).kanji;
      b.addEventListener('click', () => {
        if (id === answerId) { b.classList.add('correct-flash'); onCorrect(answerId); }
        else { b.disabled = true; b.style.opacity=.4; onWrong(null); }
      });
      wrap.appendChild(b);
    }
  }
  // タイプ入力（hard place2name 系で共通）
  function typeInput(answerId) {
    const wrap = $('quiz-answer');
    const inp = document.createElement('input');
    inp.className='type-input'; inp.type='text'; inp.placeholder='漢字でこたえてね';
    inp.autofocus = true;
    const btn = document.createElement('button'); btn.className='btn'; btn.textContent='こたえる';
    function submit(){
      if (window.LOGIC.judgeTyped(inp.value, prefById(answerId))) { onCorrect(answerId); }
      else { onWrong(null); inp.value=''; }
    }
    inp.addEventListener('keydown', e => { if (e.key==='Enter') submit(); });
    btn.addEventListener('click', submit);
    wrap.appendChild(inp); wrap.appendChild(btn); setTimeout(()=>inp.focus(),0);
  }

  // ---- 通常 × 場所→名前 ----
  function renderNormalPlace2Name(q) {
    MAP.setStates({ [q.prefId]:'target' });
    reapplyAnswered();
    if (state.settings.level === 'easy') nameChoiceButtons(q.prefId);
    else typeInput(q.prefId);
  }
  // ---- 通常 × 名前→場所 ----
  function renderNormalName2Place(q) {
    const p = prefById(q.prefId);
    setPrompt(`「${p.kanji}」はどこ？`);
    if (state.settings.level === 'easy') {
      const hints = window.LOGIC.makeMapHints(q.prefId, allIds, seedRand());
      const st = {}; hints.forEach(id => st[id]='hint');
      MAP.setStates(st); reapplyAnswered();
      MAP.setClickable(hints);
    } else {
      MAP.setStates({}); reapplyAnswered(); MAP.setClickable(null);
    }
  }
  // ---- サッカー ----
  function renderSoccer(q) {
    setPrompt(`⚽ ${q.team}\nの本拠地は？`);
    MAP.setStates({}); reapplyAnswered(); MAP.setClickable(null);
  }
  // 地図クリックの受け口（name2place / soccer）
  function onMapPick(id) {
    const q = state.queue[state.idx];
    if (!q) return;
    if (id === q.prefId) { MAP.flashPref(id,'good'); onCorrect(q.prefId); }
    else onWrong(id);
  }

  // ---- 単独（形だけ） ----
  function renderShape(container, prefId) {
    const p = prefById(prefId);
    const [x,y,w,h] = p.bbox; const pad = Math.max(w,h)*0.08;
    const svgns='http://www.w3.org/2000/svg';
    container.innerHTML='';
    const svg=document.createElementNS(svgns,'svg');
    svg.setAttribute('viewBox', `${x-pad} ${y-pad} ${w+pad*2} ${h+pad*2}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    const path=document.createElementNS(svgns,'path');
    path.setAttribute('d', p.d); path.setAttribute('fill','var(--pref-target)');
    path.setAttribute('stroke','#20305a'); path.setAttribute('stroke-width','1.5');
    svg.appendChild(path); container.appendChild(svg);
    return svg;
  }
  function renderSoloPlace2Name(q) {
    renderShape($('quiz-stage'), q.prefId);
    if (state.settings.level === 'easy') nameChoiceButtons(q.prefId);
    else typeInput(q.prefId);
  }
  function renderSoloName2Place(q) {
    // 名前を提示し、3つの形から選ぶ（easy のみ・hard は無効化済み）
    const p = prefById(q.prefId);
    setPrompt(`「${p.kanji}」のかたちは？`);
    const ids = window.LOGIC.makeChoices(q.prefId, allIds, seedRand());
    const stage = $('quiz-stage'); stage.innerHTML='';
    const rowWrap = document.createElement('div');
    rowWrap.style.display='flex'; rowWrap.style.gap='12px'; rowWrap.style.width='100%'; rowWrap.style.height='60%';
    for (const id of ids) {
      const cell = document.createElement('div');
      cell.style.flex='1'; cell.style.cursor='pointer'; cell.className='card';
      renderShape(cell, id);
      cell.addEventListener('click', () => {
        if (id===q.prefId) onCorrect(q.prefId);
        else { cell.style.opacity=.4; onWrong(null); }
      });
      rowWrap.appendChild(cell);
    }
    stage.appendChild(rowWrap);
  }

  // プロンプト表示（name2place / soccer / solo-name2place 用）
  function setPrompt(text) {
    const stage = $('quiz-stage');
    let pr = document.getElementById('prompt-line');
    // 通常/サッカーは地図の上に重ねず、地図の外に出したいので answer 上部に置く
    let host = $('quiz-answer');
    pr = document.createElement('div'); pr.className='prompt'; pr.id='prompt-line';
    pr.style.whiteSpace='pre-line'; pr.textContent=text;
    host.parentNode.insertBefore(pr, host);
  }
  function clearPrompt(){ const p=document.getElementById('prompt-line'); if(p) p.remove(); }

  // 回答済みの県を地図に再描画（setStates で消えるため）
  const answeredMarks = {}; // prefId -> emoji
  function reapplyAnswered(){ for (const id in answeredMarks) MAP.markAnswered(+id, answeredMarks[id]); }
```

注意（実装者向け）:
- `onCorrect` 内で `answeredMarks[prefId]=p.emojis[0]` を記録してから `MAP.markAnswered` を呼ぶこと（`reapplyAnswered` が使うため）。`onCorrect` の該当行を `answeredMarks[prefId]=p.emojis[0]; MAP.markAnswered(prefId, p.emojis[0]);` に更新。
- `nextQuestion` の先頭で毎回 `clearPrompt()` を呼び、前問のプロンプトを消すこと。
- `setPrompt` は同じ要素の重複挿入を避けるため、呼ぶ前に `clearPrompt()` する実装にする。

上記2点を反映するため、`nextQuestion` 冒頭に `clearPrompt();` を追加し、`setPrompt` 冒頭に `clearPrompt();` を追加すること。

- [ ] **Step 4: `finishGame` を実装（記録はメモリのみ・Task 8 で localStorage 化）**

```js
  function finishGame() {
    stopTimer();
    const totalMs = performance.now() - state.startMs;
    const all = state.miss === 0;
    const key = window.LOGIC.settingKey(state.settings);
    records = window.LOGIC.updateRecord(records, key, totalMs, all);
    const body = $('result-body'); body.innerHTML='';
    const card = document.createElement('div'); card.className='card';
    const acc = state.queue.length ? Math.round(state.correct/(state.correct+state.miss)*100) : 0;
    card.innerHTML =
      `<p style="font-size:26px">タイム: <b>${(totalMs/1000).toFixed(1)}秒</b></p>`+
      `<p style="font-size:22px">正答率: <b>${acc}%</b>（❌${state.miss}）</p>`+
      `<p style="font-size:20px">${all?'🎉 ぜんもん正解！':'おしい！もう一度チャレンジ！'}</p>`;
    body.appendChild(card);
    const again=document.createElement('button'); again.className='btn'; again.textContent='もう一度';
    again.addEventListener('click', startGame);
    const menu=document.createElement('button'); menu.className='btn'; menu.textContent='メニューへ';
    menu.addEventListener('click', ()=>{ renderMenu(); showScreen('menu'); });
    body.appendChild(again); body.appendChild(menu);
    if (all) RAIN.burst(['🎉','⭐','🏆','✨'], 90);
    showScreen('result');
  }
```

- [ ] **Step 5: 各モードの手動確認**

Run: `open index.html` で以下を1つずつプレイ:
- 通常×場所→名前×イージー: 光った県の名前を3択で当てる → 正解で絵文字が降り、回答済みマーク
- 通常×場所→名前×ハード: 漢字入力で当たる（「東京」でも「東京都」でも正解）
- 通常×名前→場所×イージー: 3県が光り、正解クリックで進む
- 通常×名前→場所×ハード: ヒントなしで地図クリック
- 形だけ×場所→名前（両レベル）: 形を見て名前
- 形だけ×名前→場所×イージー: 名前を見て3つの形から選ぶ（ハードは選べない）
- サッカー: チーム名の本拠地をクリック
- 最後まで解くとリザルトが出て、全問正解ならお祝いの絵文字

Expected: 上記すべてが破綻なく進み、タイマー・進捗・スコアが更新される。

- [ ] **Step 6: コミット**

```bash
git add src/app.js src/logic.js
git commit -m "feat: quiz game engine covering all modes, levels, scopes"
```

---

### Task 7: 記録の永続化（localStorage）とメニュー表示（`src/app.js`）

**Files:**
- Modify: `src/app.js`

**Interfaces:**
- Consumes: `updateRecord`, `settingKey`
- Produces: `records` を `localStorage['jp-quiz-records-v1']` に読み書き。メニューの「ベスト」表示、リザルトでの「ベスト更新！」表示。

- [ ] **Step 1: 読み書きヘルパを追加**

`src/app.js` の先頭付近（state 定義の後）に:
```js
  const REC_KEY = 'jp-quiz-records-v1';
  function loadRecords(){ try { return JSON.parse(localStorage.getItem(REC_KEY)) || {}; } catch(e){ return {}; } }
  function saveRecords(){ try { localStorage.setItem(REC_KEY, JSON.stringify(records)); } catch(e){} }
```
そして `let records = {};` を `let records = loadRecords();` に変更。

- [ ] **Step 2: `finishGame` に保存とベスト更新表示を追加**

`records = window.LOGIC.updateRecord(...)` の直後に:
```js
    const before = (JSON.parse(localStorage.getItem(REC_KEY)||'{}')[key]||{}).bestTimeMs || null;
    saveRecords();
    const newBest = all && (before===null || totalMs < before);
```
そして card の `${all?...}` 行の後に `+ (newBest ? '<p style="font-size:22px;color:#e67e22">🏅 ベスト更新！</p>' : '')` を連結。

- [ ] **Step 3: 手動確認**

Run: `open index.html`
- 通常×場所→名前×イージーで全問正解 → リザルトに「🏅 ベスト更新！」
- メニューに戻ると同設定に「ベスト: N.N秒」が出る
- ブラウザをリロードしてもベストが残っている（localStorage 永続）
- わざと1問間違えて全問終える → ベスト更新されない（全問正解のみ更新）

Expected: 上記の通り。DevTools Application → Local Storage に `jp-quiz-records-v1` がある。

- [ ] **Step 4: コミット**

```bash
git add src/app.js
git commit -m "feat: persist best records to localStorage, show in menu and result"
```

---

### Task 8: 単一ファイルへのインライン化ビルド（`build/inline.py` → `japan-quiz.html`）

**Files:**
- Create: `build/inline.py`
- Create: `japan-quiz.html`（生成物）

**Interfaces:**
- 入力: `index.html` と参照する `src/styles.css`, `src/data.js`, `src/logic.js`, `src/map.js`, `src/rain.js`, `src/app.js`
- 出力: すべてを1枚にインライン化した `japan-quiz.html`（外部参照ゼロ）

- [ ] **Step 1: `build/inline.py` を書く**

```python
# build/inline.py — index.html の <link>/<script src> を実体に置換して単一HTML化
import os, re
BASE = os.path.join(os.path.dirname(__file__), '..')
html = open(os.path.join(BASE, 'index.html'), encoding='utf-8').read()

def read(rel): return open(os.path.join(BASE, rel), encoding='utf-8').read()

# <link rel="stylesheet" href="src/styles.css"> を <style> に
html = re.sub(r'<link rel="stylesheet" href="(src/[^"]+)">',
              lambda m: '<style>\n' + read(m.group(1)) + '\n</style>', html)
# <script src="src/xxx.js"></script> を <script> に（順序維持）
html = re.sub(r'<script src="(src/[^"]+)"></script>',
              lambda m: '<script>\n' + read(m.group(1)) + '\n</script>', html)

out = os.path.join(BASE, 'japan-quiz.html')
open(out, 'w', encoding='utf-8').write(html)
size = os.path.getsize(out)
assert 'src="src/' not in html and 'href="src/' not in html, '外部参照が残っている'
print(f'wrote japan-quiz.html ({size//1024} KB)')
```

- [ ] **Step 2: ビルド実行**

Run: `python3 build/inline.py`
Expected: `wrote japan-quiz.html (約150〜260 KB)`、外部参照なしのアサーション通過。

- [ ] **Step 3: 単一ファイルの動作を手動確認**

Run: `open japan-quiz.html`（`src/` を参照しないことを確認するため、可能なら別ディレクトリにコピーして開く）
Expected:
- ネットワーク遮断状態でも完全に動く（DevTools Network に外部リクエストが出ない）
- 全モードが Task 6 と同じく動作する
- localStorage 記録も動く

- [ ] **Step 4: README を追加してコミット**

`README.md` を作成:
```markdown
# 都道府県クイズ

小学4年生向けの、都道府県の名前と場所を覚えるクイズアプリ。

## 遊び方
`japan-quiz.html` をブラウザで開くだけ（サーバー不要・オフライン動作）。

## モード
- 通常（地図）/ 形だけ / サッカー⚽
- 場所→名前 / 名前→場所
- イージー(3択) / ハード(漢字タイプ)

タイムと正答率を計測し、全問正解の最速を目指す。正解すると関係する絵文字が降ってくる（速いほど大量）。

## 開発・ビルド
- 地図データ生成: `python3 build/convert_geojson.py`（要 `/tmp/japan.geojson`）→ `build/prefectures.json`
- データモジュール生成: `python3 build/make_data.py` → `src/data.js`
- テスト: `node build/test.js`
- 単一HTMLへビルド: `python3 build/inline.py` → `japan-quiz.html`

データ出典: 地図 [dataofjapan/land](https://github.com/dataofjapan/land)、Jリーグ [J.LEAGUE](https://www.jleague.jp/club/)。
```
```bash
git add build/inline.py japan-quiz.html README.md
git commit -m "feat: build single-file japan-quiz.html + README"
```

---

## Self-Review（計画者チェック済み）

- **Spec coverage**: 2モード(方向)・2レベル・3スコープ(通常/単独/サッカー)＝ Task 6 の各 render 関数で網羅。無効組み合わせ(solo+name2place+hard)は Task 2/6 で無効化。タイム・正答率＝ HUD/finishGame。記録保存＝ Task 7。絵文字レイン(速いほど多い)＝ Task 5 + `emojiCountForTime`。回答済みマーク＝ `markAnswered`/`reapplyAnswered`。本物の地図＝ Task 1 の `prefectures.json`。単一HTML＝ Task 8。
- **Placeholder scan**: 各 Step に実コードを記載。データ(絵文字/kana/Jリーグ)は確定値を本文に記載済み。
- **Type consistency**: `settingKey`/`buildQueue`/`makeChoices`/`makeMapHints`/`emojiCountForTime`/`updateRecord` の呼び出し名・引数はロジック定義と一致。`MAP.*` / `RAIN.burst` / `window.LOGIC.*` の名前は各 Task 間で一致。

## Notes / 既知の割り切り
- Jリーグの J1/J2/J3 区分やクラブの増減は年度で変わる。gameplay はチーム→県のみ使うため区分は保持しない。データ更新は `make_data.py` の `JLEAGUE_RAW` を編集して再ビルド。
- 地図は実地理座標のため沖縄が左下に離れて配置される。小4の学習用としては許容。将来的に沖縄インセット枠を追加する余地あり（スコープ外）。
