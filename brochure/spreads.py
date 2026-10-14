"""Reader's-spread PDF from the A4 web PDF: cover and back cover stay single,
the inside pages sit side by side as they open in the booklet (vector, no re-render).

    python3 brochure/spreads.py      # dist/brochure-bleed0.pdf -> dist/brochure-spreads.pdf
"""
from pathlib import Path

from pypdf import PageObject, PdfReader, PdfWriter, Transformation

DIST = Path(__file__).resolve().parent / "dist"


def make_spreads(src=DIST / "brochure-bleed0.pdf", dest=DIST / "brochure-spreads.pdf"):
    pages = PdfReader(src).pages
    n = len(pages)
    groups = [[0]] + [[i, i + 1] for i in range(1, n - 1, 2)] + [[n - 1]]
    out = PdfWriter()
    for g in groups:
        w = float(pages[g[0]].mediabox.width)
        h = float(pages[g[0]].mediabox.height)
        sheet = PageObject.create_blank_page(width=w * len(g), height=h)
        for k, i in enumerate(g):
            sheet.merge_transformed_page(pages[i], Transformation().translate(tx=w * k))
        out.add_page(sheet)
    out.page_layout = "/SinglePage"
    out.add_metadata({"/Title": "野田の消煙機 JL-8A 製品カタログ（見開き）"})
    with open(dest, "wb") as f:
        out.write(f)
    return dest


if __name__ == "__main__":
    print(make_spreads())
