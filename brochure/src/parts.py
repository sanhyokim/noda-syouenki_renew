"""Generated SVG parts for the brochure: the 仕組み diagram, QR codes and the
problem street scene (taken from the LP so both stay identical)."""
import random
import re
from pathlib import Path

import segno

REPO = Path(__file__).resolve().parents[2]

AMBER = "#e0a64a"
AMBER_2 = "#b98436"
BLUE = "#7d9bff"
BLUE_GLOW = "#4f6ef7"


def _p(x, y, r, fill, op=1.0):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" opacity="{op:.2f}"/>'


def mechanism_svg():
    """Static version of the LP's scroll simulation: smoke enters on the left,
    is evened out by the pre-filter, charged at 12kV and collected at 6kV."""
    rnd = random.Random(8)
    W, H = 1000, 430
    top, bot = 92, 330          # inside of the cell housing
    out = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" '
           f'aria-label="電気集塵の仕組み図">']
    out.append('<defs>'
               '<linearGradient id="mx-bg" x1="0" y1="0" x2="0" y2="1">'
               '<stop offset="0" stop-color="#16212c"/><stop offset="1" stop-color="#0d151d"/></linearGradient>'
               f'<radialGradient id="mx-glow"><stop offset="0" stop-color="{BLUE_GLOW}" stop-opacity=".55"/>'
               f'<stop offset="1" stop-color="{BLUE_GLOW}" stop-opacity="0"/></radialGradient>'
               '<linearGradient id="mx-hv" x1="0" y1="0" x2="1" y2="0">'
               f'<stop offset="0" stop-color="{BLUE_GLOW}" stop-opacity="0"/>'
               f'<stop offset=".5" stop-color="{BLUE_GLOW}" stop-opacity=".22"/>'
               f'<stop offset="1" stop-color="{BLUE_GLOW}" stop-opacity="0"/></linearGradient>'
               '</defs>')
    out.append(f'<rect width="{W}" height="{H}" rx="18" fill="url(#mx-bg)"/>')

    # zone guides (very faint) and housing
    x_pf, x_hv0, x_hv1, x_lv0, x_lv1 = 200, 300, 430, 470, 880
    out.append(f'<rect x="{x_pf - 22}" y="{top}" width="{x_lv1 - x_pf + 44}" height="{bot - top}" '
               'fill="none" stroke="#5b6876" stroke-width="2"/>')

    # 1) inlet: dense, chaotic amber smoke
    for _ in range(260):
        x = rnd.uniform(18, x_pf - 30)
        spread = 40 + (x / x_pf) * 40
        y = rnd.gauss((top + bot) / 2, spread)
        if not (top - 40 < y < bot + 40):
            continue
        r = rnd.choice([1.6, 2.2, 2.8, 3.6, 4.6, 6])
        out.append(_p(x, y, r, rnd.choice([AMBER, AMBER_2, "#cf9a50"]), rnd.uniform(.35, .95)))

    # pre-filter net
    for col in (x_pf - 6, x_pf + 6):
        for y in range(top + 8, bot - 4, 9):
            out.append(f'<rect x="{col - 1.4}" y="{y}" width="2.8" height="4.5" fill="#9aa6b2" opacity=".75"/>')

    # 2) evened-out flow between filter and HV section: particles on lanes
    lanes = [top + 18 + i * 22 for i in range(11)]
    for ly in lanes:
        x = x_pf + 20
        while x < x_hv0 + 4:
            out.append(_p(x + rnd.uniform(-4, 4), ly + rnd.uniform(-3, 3),
                          rnd.choice([1.8, 2.4, 3]), AMBER, rnd.uniform(.55, .95)))
            x += rnd.uniform(12, 22)

    # 3) HV section: ionising wires with glow, particles turn blue (+)
    out.append(f'<rect x="{x_hv0}" y="{top + 1}" width="{x_hv1 - x_hv0}" height="{bot - top - 2}" fill="url(#mx-hv)"/>')
    for wx in (x_hv0 + 18, x_hv0 + 50, x_hv0 + 82, x_hv0 + 114):
        out.append(f'<rect x="{wx - 9}" y="{top + 2}" width="18" height="{bot - top - 4}" fill="url(#mx-glow)" opacity=".7"/>')
        out.append(f'<path d="M{wx} {top + 2}V{bot - 2}" stroke="#a9bcff" stroke-width="2.2"/>')
    for ly in lanes:
        x = x_hv0 + 4
        while x < x_hv1 + 30:
            t = (x - x_hv0) / (x_hv1 - x_hv0)
            col = AMBER if t < .25 else BLUE
            r = rnd.choice([2.2, 2.8, 3.4])
            px, py = x + rnd.uniform(-4, 4), ly + rnd.uniform(-4, 4)
            if col == BLUE:
                out.append(_p(px, py, r + 3.5, BLUE_GLOW, .25))
            out.append(_p(px, py, r, col, .95))
            x += rnd.uniform(11, 19)

    # 4) LV section: plates, charged particles drift onto the collector plates
    plates = [top + 12 + i * 26.5 for i in range(9)]
    for i, py in enumerate(plates):
        collector = i % 2 == 1
        if collector:
            out.append(f'<rect x="{x_lv0}" y="{py - 5}" width="{x_lv1 - x_lv0 - 30}" height="10" fill="url(#mx-glow)" opacity=".55"/>')
            out.append(f'<path d="M{x_lv0} {py}H{x_lv1 - 30}" stroke="{BLUE}" stroke-width="3.2"/>')
        else:
            out.append(f'<path d="M{x_lv0} {py}H{x_lv1 - 30}" stroke="#8b96a2" stroke-width="2.6"/>')
    collectors = [p for i, p in enumerate(plates) if i % 2 == 1]
    # deposits along collector plates (denser towards the inlet side)
    for cy in collectors:
        for _ in range(70):
            x = x_lv0 + abs(rnd.gauss(0, 150))
            if x > x_lv1 - 40:
                continue
            side = rnd.choice([-1, 1])
            out.append(_p(x, cy + side * rnd.uniform(2.2, 4.2), rnd.uniform(1.2, 2.4),
                          rnd.choice([AMBER, AMBER_2, BLUE]), rnd.uniform(.7, 1)))
    # particles still travelling and bending towards the plates
    for cy in collectors:
        for k in range(10):
            x = x_lv0 + 10 + k * rnd.uniform(14, 26)
            if x > x_lv0 + 260:
                break
            off = (1 - (x - x_lv0) / 260) * rnd.choice([-11, 11])
            out.append(_p(x, cy + off, 2.4, BLUE, .9))
    # a few escaping fines (honest: 91%, not 100%)
    for _ in range(7):
        x = rnd.uniform(x_lv1 - 10, W - 40)
        y = rnd.uniform(top + 20, bot - 20)
        out.append(_p(x, y, 1.5, AMBER, .55))

    # 5) outlet: clean streamlines
    for i, y in enumerate(range(top + 34, bot - 10, 34)):
        x0 = x_lv1 + 6 + (i % 2) * 18
        out.append(f'<path d="M{x0} {y}h{62 - (i % 3) * 10}" stroke="#d6e2ee" stroke-width="2" '
                   f'stroke-linecap="round" opacity=".55"/>')

    # labels
    lbl = 'font-family="Noto Sans JP, sans-serif" font-weight="700"'
    out.append(f'<text x="26" y="52" {lbl} font-size="22" fill="#fff">入口</text>'
               f'<text x="26" y="76" {lbl} font-size="15" fill="#c9b08a" font-weight="500">油煙</text>')
    out.append(f'<text x="{W - 26}" y="52" {lbl} font-size="22" fill="#fff" text-anchor="end">出口</text>'
               f'<text x="{W - 26}" y="76" {lbl} font-size="15" fill="#b9c6d3" font-weight="500" text-anchor="end">きれいな空気</text>')
    out.append(f'<text x="{x_pf}" y="{top - 14}" {lbl} font-size="17" fill="#e4eaf0" text-anchor="middle">プレフィルター</text>')
    out.append(f'<rect x="{(x_hv0 + x_hv1) / 2 - 66}" y="{top - 40}" width="132" height="32" rx="5" fill="#f5b21a"/>'
               f'<text x="{(x_hv0 + x_hv1) / 2}" y="{top - 17}" {lbl} font-size="18" fill="#1b1b1b" text-anchor="middle">高電圧部 12kV</text>')
    out.append(f'<text x="{(x_lv0 + x_lv1 - 30) / 2}" y="{top - 14}" {lbl} font-size="18" fill="#e4eaf0" text-anchor="middle">低電圧部 6kV</text>')
    # polarity marks on the plates
    for i, py in enumerate(plates):
        sign = "−" if i % 2 == 1 else "+"
        colr = BLUE if i % 2 == 1 else "#a7b1bc"
        out.append(f'<text x="{x_lv1 - 18}" y="{py + 6}" {lbl} font-size="16" fill="{colr}">{sign}</text>')

    # step markers under the zones, on a dashed guide line
    out.append(f'<path d="M{x_pf - 22} {bot + 52}H{x_lv1 + 10}" stroke="#3a4856" stroke-width="2" stroke-dasharray="3 6"/>')
    for n, cx in ((1, x_pf + 50), (2, (x_hv0 + x_hv1) / 2), (3, (x_lv0 + x_lv1 - 30) / 2)):
        out.append(f'<circle cx="{cx}" cy="{bot + 52}" r="20" fill="#f08c1c"/>'
                   f'<text x="{cx}" y="{bot + 60}" {lbl} font-size="22" fill="#fff" text-anchor="middle">{n}</text>')
    out.append('</svg>')
    return "".join(out)


def qr_svg(data, dark="#15324a"):
    q = segno.make_qr(data, error="m")
    rows = [list(r) for r in q.matrix]
    n = len(rows)
    d = []
    for y, row in enumerate(rows):
        x = 0
        while x < n:
            if row[x]:
                x0 = x
                while x < n and row[x]:
                    x += 1
                d.append(f"M{x0} {y}h{x - x0}v1h{x0 - x}z")
            else:
                x += 1
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges">'
            f'<path fill="{dark}" d="{"".join(d)}"/></svg>')


def map_svg():
    """The numbered street scene from the LP, so the brochure matches the site."""
    html = (REPO / "index.html").read_text(encoding="utf-8")
    m = re.search(r'<svg class="illust illust--map".*?</svg>', html, re.S)
    svg = m.group(0)
    svg = re.sub(r'<title[^>]*>.*?</title>', '', svg, flags=re.S)
    return svg.replace('class="illust illust--map"', 'class="map"', 1)


def dim_svg():
    """Oblique line drawing of the JL-8A with its dimensions and the 0.7m
    maintenance space in front of the doors (drawn to scale)."""
    s = .16                      # px per mm
    w, h = 750 * s, 680 * s
    dd = 840 * s * .5            # receding depth, cabinet oblique at 30deg
    dx, dy = dd * .866, -dd * .5
    m = 700 * s * .5
    mx, my = -m * .866, m * .5
    ox, oy = 70, 178             # front-bottom-left corner
    P = lambda x, y: f"{x:.1f},{y:.1f}"
    fbl, fbr = (ox, oy), (ox + w, oy)
    ftl, ftr = (ox, oy - h), (ox + w, oy - h)
    bbr, btr, btl = (fbr[0] + dx, fbr[1] + dy), (ftr[0] + dx, ftr[1] + dy), (ftl[0] + dx, ftl[1] + dy)
    navy = "#15324a"
    t = 'font-family="Noto Sans JP, sans-serif"'
    o = ['<svg viewBox="0 0 270 236" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="本体の寸法図">',
         '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
         '<path d="M0 0V6" stroke="#f08c1c" stroke-width="1.6" opacity=".55"/></pattern></defs>']
    # maintenance space on the floor in front of the doors
    q = [fbl, fbr, (fbr[0] + mx, fbr[1] + my), (fbl[0] + mx, fbl[1] + my)]
    o.append(f'<polygon points="{" ".join(P(*p) for p in q)}" fill="url(#hatch)" stroke="#f08c1c" stroke-width="1.2" stroke-dasharray="4 3"/>')
    o.append(f'<text x="{q[3][0] + 2:.1f}" y="{q[3][1] + 16:.1f}" {t} font-size="10.5" font-weight="700" fill="#c46a00">扉の前に0.7m以上の作業スペース</text>')
    # faces
    o.append(f'<polygon points="{P(*ftl)} {P(*ftr)} {P(*btr)} {P(*btl)}" fill="#f3f5f7" stroke="{navy}" stroke-width="1.6" stroke-linejoin="round"/>')
    o.append(f'<polygon points="{P(*fbr)} {P(*bbr)} {P(*btr)} {P(*ftr)}" fill="#d3dae0" stroke="{navy}" stroke-width="1.6" stroke-linejoin="round"/>')
    o.append(f'<rect x="{ox}" y="{oy - h}" width="{w}" height="{h}" fill="#e7ebef" stroke="{navy}" stroke-width="1.6"/>')
    # side mesh (inlet / outlet)
    for i in range(1, 10):
        f = i / 10
        a = (fbr[0] + dx * .12, fbr[1] + dy * .12 - h * f)
        b = (fbr[0] + dx * .88, fbr[1] + dy * .88 - h * f)
        o.append(f'<path d="M{P(*a)}L{P(*b)}" stroke="#9aa6b1" stroke-width=".9"/>')
    # doors
    d1 = w * .36
    o.append(f'<rect x="{ox + 5}" y="{oy - h + 6}" width="{d1 - 8}" height="{h - 16}" fill="none" stroke="{navy}" stroke-width="1.1"/>')
    o.append(f'<rect x="{ox + d1 + 3}" y="{oy - h + 6}" width="{w - d1 - 8}" height="{h - 16}" fill="none" stroke="{navy}" stroke-width="1.1"/>')
    o.append(f'<rect x="{ox + d1 - 9}" y="{oy - h / 2 - 6}" width="2.6" height="12" rx="1" fill="{navy}"/>')
    o.append(f'<rect x="{ox + w - 11}" y="{oy - h / 2 - 6}" width="2.6" height="12" rx="1" fill="{navy}"/>')
    o.append(f'<circle cx="{ox + 14}" cy="{oy - h + 16}" r="2.6" fill="#2ecc71"/>')
    # dimension lines
    dim = f'stroke="{navy}" stroke-width=".9"'
    lbl = f'{t} font-size="10.5" font-weight="700" fill="{navy}"'
    # H (left of the front face)
    x = ox - 10
    o.append(f'<path d="M{x} {oy}V{oy - h}M{x - 3} {oy}h6M{x - 3} {oy - h}h6" {dim}/>')
    o.append(f'<text x="{x - 5}" y="{oy - h / 2}" {lbl} text-anchor="middle" transform="rotate(-90 {x - 5} {oy - h / 2})">H 680</text>')
    # W (along the back top edge, lifted)
    a, b = (btl[0], btl[1] - 9), (btr[0], btr[1] - 9)
    o.append(f'<path d="M{P(*a)}L{P(*b)}M{a[0]} {a[1] - 3}v6M{b[0]} {b[1] - 3}v6" {dim}/>')
    o.append(f'<text x="{(a[0] + b[0]) / 2}" y="{a[1] - 5}" {lbl} text-anchor="middle">W 750</text>')
    # D (along the bottom right edge, pushed out)
    a, b = (fbr[0] + 8, fbr[1] + 5), (bbr[0] + 8, bbr[1] + 5)
    o.append(f'<path d="M{P(*a)}L{P(*b)}" {dim}/>')
    o.append(f'<text x="{(a[0] + b[0]) / 2 + 6}" y="{(a[1] + b[1]) / 2 + 12}" {lbl}>D 840</text>')
    o.append(f'<text x="268" y="232" {t} font-size="8" fill="#66737d" text-anchor="end">単位：mm</text>')
    o.append('</svg>')
    return "".join(o)
