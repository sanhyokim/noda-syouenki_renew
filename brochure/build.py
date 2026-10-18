"""Build the brochure HTML (web + print-with-bleed) and render PDFs/previews.

    python3 brochure/build.py            # writes brochure/dist/

Two editions come from one template (Boss, 2026-10-18): "rent" keeps the
rental plan for the company's direct sales; "buy" is purchase-only, for the
LP and for dealers. Blocks wrapped in <!--if:rent-->…<!--/if:rent--> or
<!--if:buy-->…<!--/if:buy--> appear only in that edition.
"""
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "src"))
sys.path.insert(0, str(HERE))
import drawings  # noqa: E402
import parts  # noqa: E402

DIST = HERE / "dist"
EDITIONS = ("buy", "rent")
LP_URL = "https://shoenki.duct-noda.com/"
VIDEO_URL = "https://youtu.be/lS9ckeMccJQ"
LINE_URL = "https://line.me/R/ti/p/@254bbzux"


FONTS = HERE / "fonts"   # not in git; fetched from npm on first build
FONT_PKGS = {
    # static (non-variable) instances, so PDFs embed real outlines, not Type 3
    "@fontsource/noto-sans-jp@5.3.1": ("noto-sans-jp", ["400", "500", "700", "900"]),
    "@fontsource/barlow-condensed@5.3.0": ("barlow-condensed", ["latin-500", "latin-600", "latin-700"]),
}


def ensure_fonts():
    css = []
    for pkg, (name, weights) in FONT_PKGS.items():
        dest = FONTS / name
        if not dest.exists():
            with tempfile.TemporaryDirectory() as tmp:
                subprocess.run(["npm", "pack", pkg, "--silent"], cwd=tmp, check=True, stdout=subprocess.DEVNULL)
                tgz = next(Path(tmp).glob("*.tgz"))
                with tarfile.open(tgz) as t:
                    t.extractall(tmp, filter="data")
                src = Path(tmp) / "package"
                (dest / "files").mkdir(parents=True)
                for w in weights:
                    shutil.copy(src / f"{w}.css", dest / f"{w}.css")
                    tag = w.split("-")[-1]
                    for f in (src / "files").glob(f"*-{tag}-normal.woff2"):
                        shutil.copy(f, dest / "files" / f.name)
        css += [f'<link rel="stylesheet" href="../fonts/{name}/{w}.css">' for w in weights]
    return "\n".join(css)


def images(html, kind):
    """Re-encode the photos: JPEG passes straight into the PDF, while WebP would
    be stored losslessly and bloat it. Print keeps full resolution, web is lighter."""
    out_dir = DIST / f"img-{kind}"
    out_dir.mkdir(exist_ok=True)
    from PIL import Image

    def conv(m):
        src = HERE.parent / m.group(1)
        im = Image.open(src)
        if kind == "web":
            im.thumbnail((1100, 1100))
        if im.mode in ("RGBA", "LA", "P"):
            dest = out_dir / (src.stem + ".png")
            im.save(dest, optimize=True)
        else:
            dest = out_dir / (src.stem + ".jpg")
            im.convert("RGB").save(dest, quality=92 if kind == "print" else 80, optimize=True)
        return f"{out_dir.name}/{dest.name}"

    return re.sub(r"\{\{IMG\}\}/([^\"']+)", conv, html)


def edition(html, ed):
    """Keep this edition's blocks (markers dropped) and remove the other's."""
    for other in EDITIONS:
        pat = re.compile(rf"<!--if:{other}-->(.*?)<!--/if:{other}-->", re.S)
        html = pat.sub((lambda m: m.group(1)) if other == ed else "", html)
    assert "<!--if:" not in html
    return html


def build(bleed, ed):
    tpl = edition((HERE / "src" / "brochure.html").read_text(encoding="utf-8"), ed)
    rep = {
        "{{B}}": str(bleed),
        "{{PW}}": str(210 + 2 * bleed),
        "{{PH}}": str(297 + 2 * bleed),
        "{{FONTS}}": ensure_fonts(),
        "{{STREET_B}}": drawings.street_svg(False),
        "{{STREET_A}}": drawings.street_svg(True),
        "{{SYSTEM}}": drawings.system_svg(),
        "{{PRINCIPLE}}": drawings.principle_svg(),
        "{{STRUCTURE}}": drawings.structure_svg(),
        "{{ORTHO}}": drawings.ortho_svg(),
        "{{INST_FLOOR}}": drawings.install_svg("floor"),
        "{{INST_CEIL}}": drawings.install_svg("ceiling"),
        "{{INST_OUT}}": drawings.install_svg("outdoor"),
        "{{FOOTPRINT}}": drawings.footprint_svg(),
        "{{LOGO}}": parts.logo_svg(),
        "{{QR_LP}}": parts.qr_svg(LP_URL),
        "{{QR_YT}}": parts.qr_svg(VIDEO_URL),
        "{{QR_LINE}}": parts.qr_svg(LINE_URL),
    }
    for k, v in rep.items():
        tpl = tpl.replace(k, v)
    tpl = images(tpl, "print" if bleed else "web")
    out = DIST / f"brochure-{ed}-bleed{bleed}.html"
    out.write_text(tpl, encoding="utf-8")
    return out


if __name__ == "__main__":
    DIST.mkdir(exist_ok=True)
    for ed in EDITIONS:
        for b in (0, 3):
            print(build(b, ed))
    subprocess.run(["node", str(HERE / "render.mjs"), str(DIST)], check=True)
    from spreads import make_spreads   # needs pypdf
    for ed in EDITIONS:
        print(make_spreads(DIST / f"brochure-{ed}-bleed0.pdf", DIST / f"brochure-{ed}-spreads.pdf"))
