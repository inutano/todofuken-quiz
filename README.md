# 都道府県クイズ

小学4年生向けの、都道府県の名前と場所を覚えるクイズアプリ。

## 遊び方
`japan-quiz.html` をブラウザで開くだけ（サーバー不要・オフライン動作）。

## モード
- 通常（地図）/ 形だけ / サッカー⚽
- 場所→名前 / 名前→場所
- イージー(3択) / ハード(漢字タイプ)

タイムと正答率を計測し、全問正解の最速を目指す。正解すると関係する絵文字が降ってくる（速いほど大量）。

## エリア選択
メニューの「エリア」で全国／北海道／東北／関東／中部甲信越／関西／中国／四国／九州を選べます。エリアを選ぶとその地方の県だけが出題され、地図がその地方に拡大されて選びやすくなります。

## フォント
ピクセルフォント **PixelMplus12**（© 2002-2013 M+ FONTS PROJECT、M+ FONT LICENSE）を、アプリで使う文字にサブセット化して埋め込んでいます。

## 開発・ビルド
- 地図データ生成: `python3 build/convert_geojson.py`（要 `/tmp/japan.geojson`）→ `build/prefectures.json`
- データモジュール生成: `python3 build/make_data.py` → `src/data.js`
- テスト: `node build/test.js`
- 単一HTMLへビルド: `python3 build/inline.py` → `japan-quiz.html`

データ出典: 地図 [dataofjapan/land](https://github.com/dataofjapan/land)、Jリーグ [J.LEAGUE](https://www.jleague.jp/club/)。
