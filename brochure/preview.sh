#!/bin/sh
# Page and spread previews from the trim-size PDF (needs poppler-utils + Pillow).
set -e
cd "$(dirname "$0")/dist"
rm -f pv-*.png
pdftoppm -r "${1:-90}" -png brochure-bleed0.pdf pv
python3 -I - <<'PY'
from PIL import Image
pg = lambda n: Image.open(f"pv-{n}.png")
# printer's spreads of a saddle-stitched 8-page booklet, as the reader sees them
for name, (l, r) in {"spread-1-cover": (8, 1), "spread-2": (2, 3), "spread-3": (4, 5), "spread-4": (6, 7)}.items():
    a, b = pg(l), pg(r)
    im = Image.new("RGB", (a.width + b.width, a.height), "white")
    im.paste(a, (0, 0)); im.paste(b, (a.width, 0))
    im.save(f"{name}.jpg", quality=86)
PY
