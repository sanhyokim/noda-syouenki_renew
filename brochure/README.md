# 資料請求パンフレット（野田の消煙機 JL-8A）

A4・中綴じ8ページのパンフレットの元データです。LP の資料請求でお送りするPDFと、印刷入稿用PDFをここから作ります。数値は取扱説明書（消煙機 JL-8A 取扱説明書）を優先しています。

## 作り方

```sh
python3 -m pip install segno pillow   # 初回のみ
python3 brochure/build.py             # brochure/dist/ に出力
brochure/preview.sh                   # 見開きの確認画像（poppler-utils が必要）
```

- `brochure-bleed0.pdf`：Web用（A4、画像は軽め）
- `brochure-bleed3.pdf`：印刷用（A4＋塗り足し3mm＝216×303mm、画像はフル解像度）

フォント（Noto Sans JP・Barlow Condensed の静的ウェイト）は初回に npm から `brochure/fonts/` へ取得します。可変フォントのままだとPDFに Type 3 で埋め込まれ、印刷に向かないためです。Chromium は Playwright のもの（`PLAYWRIGHT_PATH` で playwright の場所を指定可）を使います。

## ファイル

| ファイル | 内容 |
|---|---|
| `src/brochure.html` | 8ページ分のHTML/CSS（mm単位で組版） |
| `src/parts.py` | 仕組みの図、寸法図、QRコード、LPの街並みの挿絵の取り込み |
| `build.py` | HTMLを組み立て、画像をJPEGに変換して `render.mjs` でPDF化 |

写真・イラストはリポジトリの `assets/img/` と `v2/assets/img/` のものを使っています。
