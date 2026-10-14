#!/bin/sh
# Page and spread previews from the trim-size PDF (needs poppler-utils + Pillow).
set -e
cd "$(dirname "$0")/dist"
rm -f pv-*.png
pdftoppm -r "${1:-90}" -png brochure-bleed0.pdf pv
for f in pv-0*.png; do [ -e "$f" ] && mv "$f" "pv-${f#pv-0}"; done
python3 -I - <<'PY'
from PIL import Image
pg = lambda n: Image.open(f"pv-{n}.png")
# printer's spreads of a saddle-stitched 12-page booklet, as the reader sees them
for name, (l, r) in {"spread-1-cover": (12, 1), "spread-2": (2, 3), "spread-3": (4, 5), "spread-4": (6, 7),
                       "spread-5": (8, 9), "spread-6": (10, 11)}.items():
    a, b = pg(l), pg(r)
    im = Image.new("RGB", (a.width + b.width, a.height), "white")
    im.paste(a, (0, 0)); im.paste(b, (a.width, 0))
    im.save(f"{name}.jpg", quality=86)
PY
