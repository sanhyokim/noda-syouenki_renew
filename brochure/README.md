# 資料請求パンフレット（野田の消煙機 JL-8A）

A4・中綴じ12ページの製品カタログの元データです。LP の資料請求でお送りするPDFと、印刷入稿用PDFをここから作ります。数値は取扱説明書（消煙機 JL-8A 取扱説明書）を優先しています。

## 版（2026-10-18〜）

広告ではレンタルを告知しない方針になったため、1つの元データから2つの版を作ります。

| 版 | 用途 | 10ページ |
|---|---|---|
| `buy`（販売のみ） | LPの資料請求、代理店での販売 | 価格表（本体・標準工事費・毎月の定期メンテナンス）とご購入後のサポート |
| `rent`（レンタルあり） | 当社の直販 | 購入とレンタルの比較 |

`src/brochure.html` の `<!--if:buy-->…<!--/if:buy-->` と `<!--if:rent-->…<!--/if:rent-->` で囲んだ部分が、その版にだけ入ります。今は10ページ、目次と柱の章名、11ページの導入の流れ（03）、裏表紙のチェックシート（ご希望のプラン）です。

## 作り方

```sh
python3 -m pip install segno pillow pypdf   # 初回のみ
python3 brochure/build.py             # brochure/dist/ に両方の版を出力
sh brochure/preview.sh 100 buy        # 見開きの確認画像 → dist/preview-buy/（rent も同様）
sh brochure/publish.sh                # 両方の版を /mnt/project-files/brochure/ にコピー
```

- `brochure-<版>-bleed0.pdf`：Web用（A4、画像は軽め）
- `brochure-<版>-bleed3.pdf`：印刷用（A4＋塗り足し3mm＝216×303mm、画像はフル解像度）
- `brochure-<版>-spreads.pdf`：見開き版（表紙・裏表紙は単ページ、中面は2ページずつ。`spreads.py` が Web用PDFを並べ替えて作る。pypdf が必要）

フォント（Noto Sans JP・Barlow Condensed の静的ウェイト）は初回に npm から `brochure/fonts/` へ取得します。可変フォントのままだとPDFに Type 3 で埋め込まれ、印刷に向かないためです。Chromium は Playwright のもの（`PLAYWRIGHT_PATH` で playwright の場所を指定可）を使います。

## ファイル

| ファイル | 内容 |
|---|---|
| `src/brochure.html` | 12ページ分のHTML/CSS（mm単位で組版） |
| `src/drawings.py` | 技術図面のSVG（システム構成図、原理図、構造の模式図、外形図、設置図、設置スペース図、導入前後の図） |
| `src/parts.py` | QRコード、会社ロゴ |
| `build.py` | HTMLを組み立て、画像をJPEGに変換して `render.mjs` でPDF化 |

写真はリポジトリの `assets/img/` と `v2/assets/img/` のものを使っています（旧型機の写真。新型の写真が届いたら差し替え）。
