# 都道府県クイズ v2 改善 設計ドキュメント

作成日: 2026-07-20
対象: 既存の都道府県クイズアプリ（`inutano/todofuken-quiz`）への機能追加・改善

## 概要

ユーザーからの4点の改善要望を実装する。

1. **ゆめかわパステルデザイン**への刷新（見た目のみ）
2. **ゆるキャラモード**の追加（Wikimedia Commons のCC画像を使用）
3. **名産絵文字レインの改善**（底に積もってしばらく残ってから消える）
4. **【バグ修正】** 3択/地図ヒントに回答済みが混じり実質1〜2択になる問題の解消

既存アーキテクチャ（`src/data.js` / `logic.js` / `map.js` / `rain.js` / `app.js` / `styles.css`、`index.html`、`build/inline.py` で単一 `japan-quiz.html` を生成）を踏襲する。単一HTML・外部リソースなし・オフライン動作の原則を維持する。

---

## 1. ゆめかわパステルデザイン

`src/styles.css` の配色・装飾を全面刷新する（DOM構造・ロジックは変更しない）。

- **配色（CSS変数）**:
  - 背景: 淡いラベンダー→ミントのやわらかグラデ（例 `#f6e6ff` → `#e6f7ff`）
  - カード: ほぼ白＋うっすらピンクの縁、丸み大（border-radius 26px）、ふんわり影
  - アクセント/ボタン: パステルピンク `#ffd1e8`、文字は濃いめのパステル紫 `#7a5aa6` で可読性確保
  - 正解=ミント `#b8f0d0`、不正解=コーラル `#ffc2cf`
  - 地図の県: 通常=パステルミント、ターゲット=パステルコーラル、ヒント=パステルピンク、回答済み=パステルイエロー
- **装飾**: タイトル周りにハート♡・星✧の軽い装飾（絵文字またはCSS）、ボタンは丸ゴシック太字＋やわらかい影（押すと沈む既存演出は維持）。
- **フォント**: 既存の丸ゴシック系スタックを継続（`Hiragino Maru Gothic ProN` 等、外部フォント不使用）。
- 変更は色・角丸・影・装飾に限定。レイアウト構造（screen/hud/stage/answer）は不変。

## 2. ゆるキャラモード

### 2.1 出題構造（既存UIを再利用）
- スコープに `yurukyara` を追加。メニューの「モード」に「ゆるキャラ🎀」を追加。
- キャラ写真を `#quiz-stage` に表示し、次のいずれかを問う（既存の「こたえかた」「レベル」を流用）:
  - **名前を当てる**（`dir=place2name` 相当）: イージー=3択のキャラ名ボタン／ハード=キャラ名をタイプ
  - **場所を当てる**（`dir=name2place` 相当）: 地図で本拠地の県をクリック（イージーは正解含む3県ハイライト＝通常モードと同じヒント方式、ハードはヒントなし）
- サッカーモード同様、**対象はCC画像を用意できた県のみ**（部分カバレッジ）。1問＝1キャラ。各県は原則1キャラ。
- タイム・正答率・記録（localStorage）は既存同様。設定キーは `settingKey` を拡張（例 `yurukyara|place2name|easy`, `yurukyara|name2place|easy`）。

### 2.2 データと選定（ビルド時に生成）
- 新規 `build/fetch_yurukyara.py`（実装者が実行）:
  1. 各都道府県について、代表的なご当地ゆるキャラ名の候補（キュレーション済みリスト、`build/fetch_yurukyara.py` 内に定義）で Wikimedia Commons API を検索。
  2. **自由ライセンス（Public Domain / CC0 / CC-BY / CC-BY-SA）のみ**を採用。NC/ND/不明ライセンスは除外。人物コスプレ等ではなく当該キャラが主題の画像を優先。
  3. 画像をダウンロードし、**長辺256pxに縮小・JPEG化**して base64 データURIに変換。
  4. 各画像の **作者(Artist)・ライセンス名・出典ページURL** を extmetadata から取得。
  5. `src/yurukyara.js` を生成: `YURUKYARA = [{ prefId, name, kana, accept[], img(base64 dataURI), credit:{author, license, sourceUrl} }, ...]`。
  6. 目標カバレッジ 30〜47県。取得できなかった県はスキップ（ログ出力）。
- 追加サイズ見込み: 256px JPEG ≒ 15〜30KB/枚 × 最大47 ≒ 0.7〜1.4MB（base64で約1.3〜1.9MB）。単一HTMLに埋め込む。

### 2.3 クレジット画面（CCライセンス義務）
- メニューに「クレジット」ボタンを追加 → 一覧画面（新 `#screen-credits` セクション）。
- 各エントリ: キャラ名 / 作者 / ライセンス名 / 出典URL（リンク）。CC-BY・CC-BY-SA の帰属義務を満たす。
- 併せて地図データ（dataofjapan/land）とJリーグ出典もこの画面にまとめる。

### 2.4 名前判定
- キャラ名は正式表記を `name`、タイプ許容表記を `accept[]`（ひらがな・カタカナ・別表記・「さん」等の有無）に持たせ、`judgeTyped` を流用。

## 3. 名産絵文字レインの改善

`src/rain.js` を改修し、「降る→バウンド→**底に積もって静止ししばらく残る→フェード**」の挙動にする。

- 物理を2段階に: (a) 落下・バウンド期、(b) 静止期。床付近で速度が小さくなったら着地（`resting=true`）してその場に留める。
- **寿命を延長**し、静止してから約2〜3秒はほぼ不透明のまま保持。消える直前の約0.8秒でフェードアウト。
- 「速いほど多い」個数計算（`emojiCountForTime`）は不変。同時最大数の上限は維持（積み上がり過多を防止、必要なら上限微調整）。
- 実装は既存の `requestAnimationFrame` ループ内でパーティクルに `resting`/`restT` を持たせる形で行う。

## 4. 【バグ修正】回答済みを選択肢から除外

原因: `makeMapHints`（通常×名前→場所×イージー）と `makeChoices` のダミー候補が全県からランダムのため、回答済み県が混じる。地図ヒントでは `reapplyAnswered()` が回答済みを黄色（answered）で上書きするため、ヒント（ピンク）に見えるのが実質1〜2県になり「選択肢が減る」ように見える。

修正:
- `makeChoices(answerId, allIds, rand, exclude=[])` と `makeMapHints(answerId, allIds, rand, exclude=[])` に **除外集合 `exclude`（回答済みprefId）** を追加。ダミーは `allIds − {answer} − exclude` から選ぶ。
- **フォールバック**: 除外後のプール件数が不足（必要数に満たない）場合は、`exclude` の要素も使って不足分を補い、**常に3件（正解含む）** を返す（終盤で未回答が少ないケース）。
- `app.js` の呼び出し側で、現在の回答済み集合（`answeredMarks` のキー）を `exclude` として渡す。
- 対象は3択の場所→名前（`nameChoiceButtons`）、単独×名前→場所の3形選択（`renderSoloName2Place`）、通常×名前→場所イージーの地図ヒント（`makeMapHints`）、ゆるキャラの3択・地図ヒント。

## アーキテクチャ / ファイル変更

- 変更: `src/styles.css`（全面リスタイル）、`src/logic.js`（`makeChoices`/`makeMapHints` に `exclude`、`settingKey`/`isValidCombo` にゆるキャラ対応）、`src/app.js`（ゆるキャラモード描画・メニュー拡張・クレジット画面・`exclude` 引き渡し）、`src/rain.js`（積もる挙動）、`index.html`（`#screen-credits` セクション追加、`src/yurukyara.js` 読み込み）、`build/test.js`（テスト追加）、`build/inline.py`（`yurukyara.js` も内包・画像dataURIはそのまま）、`README.md`（ゆるキャラ・クレジット追記）。
- 新規: `build/fetch_yurukyara.py`（データ生成）、`src/yurukyara.js`（生成物）。
- 既存モジュール境界は維持。`app.js` が肥大化する場合はゆるキャラ描画・クレジット描画を関数単位で分離（ファイル分割は必須ではないが責務は明確化）。

## テスト方針

- `makeChoices`/`makeMapHints` with `exclude`: 正解を必ず含む／除外県が結果に出ない／プール不足時は3件を保証（フォールバック）／重複なし。
- ゆるキャラデータ整合性（`src/yurukyara.js` 生成後）: 各エントリに `prefId(1..47)`・`name`・`accept(nameを含む)`・`img`（`data:image/` で始まる）・`credit.author`・`credit.license`・`credit.sourceUrl` が存在。prefId 重複なし。件数 ≥ 目標下限（例30）。
- `judgeTyped` はキャラ名の表記ゆれを許容（既存関数の流用確認）。
- `settingKey`/`isValidCombo`: ゆるキャラの各組み合わせキーが正しく生成される。
- 絵文字レインの積もる挙動・パステルデザイン・クレジット画面表示は、ヘッドレスブラウザのスクリーンショットで目視確認（コントローラ実施）。

## スコープ外（YAGNI）

- ゆるキャラの複数キャラ/県、キャラ図鑑機能。
- 画像の遅延読み込み・オンライン取得（base64埋め込みで完結）。
- デザインテーマ切替（パステル固定）。

## 既知の割り切り / リスク

- Wikimedia Commons のCC画像はカバレッジが県により異なる。取得できない県はゆるキャラモードの対象外（サッカー同様）。
- CC-BY-SA 画像の帰属はクレジット画面で満たす。ライセンス不明・NC/ND画像は使用しない。
- base64埋め込みで `japan-quiz.html` は約2MB規模になる想定（単一HTML・オフライン維持を優先）。
