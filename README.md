# 命式シール（仮）試作版 v0.1.0

四柱推命アプリ『命式シール』の試作（プロトタイプ）。正本仕様は
`~/workspace/goals/goal-7/files/命式シール-仕様書.md`。

公開: https://tanabata-soft.github.io/bvf1ziky9x/ （gh-pages ブランチに dist を配置）

## できること（試作範囲）
- 入力（ニックネーム・生年月日・出生時刻／不明可、「保存する／今回だけ」）
- 命式計算（lunar-typescript の EightChar、節入り基準、23時台はライブラリ標準＝既定 sect）
- 読み表示（命式表・性格・五行バランス・今年と来年の運勢、運気6段階）
- 分身キャラ決定（形態5型、装備辞書、称号つき表示名）
- 英語プロンプト生成（部品の日本語併記、ネガティブプロンプト別枠）
- コレクション（localStorage、画像待ち→完成→贈った、シルエット仮表示）
- 画像登録→Canvasシール合成→書き出し（共有／ダウンロード）
- レア度は仮ルール（チェックリスト方式）

## 検証
- `npm test` : vitest 26件（計算層の単体テスト＋sxtwl突き合わせ12件）
- sxtwl フィクスチャ生成: `scripts/gen_fixture.py`（要 Python + sxtwl）
  ※ sxtwl は日単位のため、節入りの時刻が絡む2件は日柱のみ突き合わせ、
  年柱・月柱は節気時刻ベースの期待値をテスト側に明記している
- `npm run build` : tsc + vite build

## 開発
```
npm install
npm run dev     # 開発サーバー
npm run preview # dist のプレビュー
```
