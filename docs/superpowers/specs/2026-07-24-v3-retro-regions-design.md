# 都道府県クイズ v3 改善 設計ドキュメント

作成日: 2026-07-24
対象: 既存の都道府県クイズアプリ（`inutano/todofuken-quiz`）

## 概要

2点の改善を行う。

1. **レトロゲーム風（ポップ8ビット）デザイン**への刷新 — 本物のピクセルフォント（PixelMplus12）を埋め込み、ポップ8ビット配色にする。
2. **エリア選択＋拡大** — 8地方＋全国を選べるようにし、選んだエリアの県だけ出題して地図をそのエリアに拡大表示（クリックしやすく）。

既存アーキテクチャ（`src/*.js` を `index.html` で読み込み、`build/inline.py` で単一 `japan-quiz.html` を生成）を踏襲。単一HTML・外部リソースなし・オフライン動作を維持する。

---

## 1. レトロゲーム風（ポップ8ビット）

### 1.1 ピクセルフォント埋込
- **PixelMplus12**（Regular / Bold、M+ FONT LICENSE ＝自由に埋込・再配布可）を使用。JIS X 0208 漢字対応。
- アプリで実際に使う文字だけに**サブセット化**して woff2 に変換し、**base64 データURI**として `src/font.css` の `@font-face` に埋め込む。
  - 検証済み: 使用文字441字で Regular+Bold 合計 **約40KB**（base64）。漢字も本物のドット文字でレンダリングされることを確認済み。
- `font-family:'PX'` を全体に適用。絵文字はこのフォントに含めず、システム絵文字にフォールバック（`font-family:'PX', ...emoji`）。
- 生成は `build/make_font.py`（実装者/ビルド時に実行）:
  1. PixelMplus12 Regular/Bold を取得（`https://github.com/itouhiro/PixelMplus/raw/master/PixelMplus12-{Regular,Bold}.ttf`）。ダウンロード済みを `build/_fontcache/` にキャッシュ（gitignore）。
  2. **使用文字集合を `src/*.js` と `index.html` から抽出**（表示テキストは全てここに含まれるため自動で網羅）＋安全のため地方名等の固定文字列を加える。絵文字コードポイントは除外。
  3. `fonttools`(`pyftsubset`) で各ウェイトを woff2 にサブセット。
  4. base64 化して `src/font.css` を生成（2つの `@font-face` ブロック）。
- `src/font.css`（生成物・base64含む）は**コミットする**（inline時やオフラインで再ダウンロード不要）。`fonttools`/`brotli` は venv 等で用意（`build/make_font.py` 実行時のみ必要）。

### 1.2 ポップ8ビット配色・見た目
- `src/styles.css` を全面刷新（**CSS変数名・セレクタ・DOM前提は不変**、値のみ）:
  - 背景: 濃紺〜黒（例 `#12122b`）。必要なら微妙なグリッド/星のCSS装飾。
  - アクセント: シアン `#39e6ff`、マゼンタ `#ff4fd8`、黄 `#ffe14f`、白 `#ffffff`、緑 `#7cff6b`。
  - `--ink`（文字）は明るい白〜シアン系（暗背景で可読）。従来 `#fff` 前提の文字色はそのまま白系でよいが、`var(--ink)` に統一。
  - ボタン: **角丸なし**（`border-radius:0`）、太いピクセル枠（`box-shadow` を使った段差、ぼかしなし `0 4px 0 <色>`）、押すと沈む演出は維持。
  - `image-rendering:pixelated` を地図SVG・全体に適用しドット感を出す。
  - カード: 角丸なし・太枠・ハード影。任意でスキャンライン（`repeating-linear-gradient` の薄い横縞オーバーレイ）。
- 地図の県色をレトロパレットに（変数名維持）: 通常=ダークティール、ターゲット=マゼンタ、ヒント=黄、回答済み=緑。
- 絵文字レイン（`rain.js`）は変更しない（絵文字はシステム描画）。

### 1.3 クレジット
- `README.md` に PixelMplus / M+ FONT LICENSE の帰属を追記。

## 2. エリア選択＋拡大

### 2.1 地方区分（JISコード）
```
北海道   : [1]
東北     : [2,3,4,5,6,7]
関東     : [8,9,10,11,12,13,14]
中部甲信越: [15,16,17,18,19,20,21,22,23]
関西     : [24,25,26,27,28,29,30]
中国     : [31,32,33,34,35]
四国     : [36,37,38,39]
九州     : [40,41,42,43,44,45,46,47]   (沖縄含む)
```
- エリアキー: `all`(全国), `hokkaido`, `tohoku`, `kanto`, `chubu`, `kansai`, `chugoku`, `shikoku`, `kyushu`。表示名は上記日本語。

### 2.2 拡大ビューボックス
- エリアのズーム範囲は**構成県の重心の最小/最大に余白 `PAD=55`（viewBox単位）を足し、国土キャンバス(0,0,1000,1011.4)にクランプ**して求める（=`regionViewBox`）。
  - 検証済み結果（各エリアきれいに収まる。関東は東京の遠隔離島でbboxが縦長になる問題を重心ベースで回避、九州は沖縄を含むため縦長だが全国より十分拡大）。

### 2.3 出題・描画への反映
- `settings.region`（既定 `'all'`）を追加。メニューに「エリア」セレクタを追加（全モード共通で表示）。
- **出題対象**: `buildQueue` はエリア指定時、対象県（通常/単独）またはチームの本拠県（サッカー）を**そのエリアの県に絞る**。
- **地図拡大**: 通常/サッカーで全国地図を描くとき、`MAP.renderFull(container, {onPick, viewBox})` に **エリアのビューボックス** を渡してズーム表示（`all` の時は従来の全国 `MAP_VIEWBOX`）。全県のパスは描画し、viewBoxでクロップ（近隣県が見切れて写るのは可）。
- **地図ヒント（名前→場所イージーの光る3県）**: エリア指定時は **エリア内の県から選ぶ**（画面内に収まるように）。`makeMapHints` に渡す候補集合をエリア県にする。エリアの県数が3未満（北海道=1）の場合は、その県数ぶん（正解含む）を返す。
- **名前3択（場所→名前）と形3択（単独×名前→場所）** は位置に無関係なため**従来通り全国から**選ぶ（`makeChoices` は全国 `allIds` のまま。北海道エリアでも3択が成立）。
- クリック可能範囲（`setClickable`）: エリア指定の名前→場所では、イージー=ヒント3県、ハード=エリア内全県。

### 2.4 記録
- `settingKey` はエリア指定時のみキー末尾に `|<region>` を付ける（例 `normal|name2place|easy|kanto`）。**`all` の時は従来キーのまま**（既存ベスト記録を保持）。エリアごとのベストが残る。

## アーキテクチャ / ファイル変更

- 新規:
  - `build/make_font.py` — フォント取得・サブセット・`src/font.css` 生成。
  - `src/font.css` — 生成物（`@font-face` base64、コミットする）。
  - `src/regions.js` — 地方データと純粋ヘルパ（下記インターフェース）。`window.REGIONS_*` と `module.exports` の両対応（既存 `logic.js` と同様の UMD ガード）。
- 変更:
  - `index.html` — `<link rel="stylesheet" href="src/font.css">` を styles.css より前に追加、`<script src="src/regions.js">` を data.js の後に追加、`#screen-menu` は不変。
  - `src/styles.css` — レトロ配色・ピクセル装飾（変数名・セレクタ不変）。
  - `src/logic.js` — `settingKey(settings)` はエリア対応（`settings.region` を参照）。`buildQueue` はエリア県配列を受け取る引数を追加して絞り込む: `buildQueue(settings, prefs, jleague, rand, regionIds = null)`（`null`/未指定=全県）。純粋性維持のため logic.js は regions.js に依存させず、エリア県配列は呼び出し側(app.js)が `REGIONS.regionIds()` で計算して渡す。`makeMapHints` はシグネチャ不変で、app が候補集合(allIds引数)にエリア県を渡す。小プール（<3、例 北海道=1）でもその件数（正解含む・重複なし）を返すことを確認する（既存 `pickN` のフォールバックで担保）。
  - `src/app.js` — メニューに「エリア」セレクタ、`state.settings.region`、地図ズーム（`viewBox` 引き渡し）、名前→場所ヒントのエリア県プール、`setClickable` 調整。
  - `src/map.js` — `renderFull(container, {onPick, viewBox})` の `viewBox` 省略可対応（未指定は `MAP_VIEWBOX`）。
  - `build/inline.py` — `src/font.css` も `<style>` にインライン化（既存の `<link>` 置換ロジックで自動対応。base64はそのまま）。
  - `build/test.js` — テスト追加。
  - `README.md` — フォント帰属・エリア機能を追記。
- `src/regions.js` が公開する純粋ヘルパ（テスト対象）:
  - `REGIONS: {key: {name, ids:number[]}}`（`all` 含む。`all.ids` は 1..47 全部）
  - `regionIds(regionKey) -> number[]`
  - `regionViewBox(regionKey, prefectures) -> [x,y,w,h]`（重心+PAD、クランプ。`all` は `MAP_VIEWBOX` 相当 [0,0,1000,1011.4] を返す）
  - `regionOf(prefId) -> regionKey`

## テスト方針（`build/test.js` に追加）

- `regionIds`: 各エリアの県数が正しい（北海道1, 東北6, 関東7, 中部9, 関西7, 中国5, 四国4, 九州8、合計47）、`all`=47。
- `regionOf`: 代表県が正しいエリアに属する（例 13→kanto, 27→kansai, 47→kyushu, 1→hokkaido）。
- `regionViewBox`: `all` は全国[0,0,1000,1011.4]。各エリアは幅・高さが正（>0）かつ国土キャンバス内。
- `buildQueue` エリア絞り込み（`regionIds` 引数）: `regionIds=[36,37,38,39]`(四国) の通常モードは4件、その prefId が全て四国。`regionIds=null` は47件（既存挙動）。サッカーは `jleague` を `regionIds` の本拠県に絞る。
- `makeMapHints` エリアプール: 四国の県集合(4件)で正解含む3件・重複なし・エリア外を含まない。北海道(1件)は正解1件のみ返す。
- `settingKey`: `region='all'` は従来キー（`normal|place2name|easy`）。`region='kanto'` は `normal|place2name|easy|kanto`。soccer×kanto は `soccer|kanto`。
- 既存テストが後方互換で通ること（`settingKey`/`buildQueue`/`makeChoices`/`makeMapHints` の既存呼び出し）。
- レトロ見た目・ピクセルフォント表示・エリア拡大は、ヘッドレスブラウザのスクリーンショットで目視確認（コントローラ実施）。`src/font.css` に `@font-face` と `data:font/woff2;base64,` が存在することを確認。

## スコープ外（YAGNI）

- テーマ切替（レトロ固定）。
- エリアのカスタム定義・県単位ズーム。
- 10px版フォント（12px版のみ）。

## 既知の割り切り / リスク

- 九州エリアは沖縄を含むため縦長のズームになる（全国よりは十分拡大）。
- ピクセルフォントは M+ FONT LICENSE の帰属を README で満たす。
- フォント生成は `fonttools`/`brotli` とネットワークを要するが、成果物 `src/font.css` はコミットするため通常ビルド（inline）はオフラインで完結。
