"""Technical line drawings for the catalog (system, principle, structure,
outline views, installation patterns, street before/after).
One drawing language throughout: navy hairlines, light tint fills, blue for
anything electrical, amber for oil smoke."""
import random

NAVY = "#15324a"
INK = "#1e2b35"
GRAY = "#6b7781"
LINE = "#9aa6b1"
TINT = "#eef1f3"
BLUE = "#1a6aa8"
ORANGE = "#d9770b"
AMBER = "#c98b3a"
F = 'font-family="Noto Sans JP, sans-serif"'
N = 'font-family="Barlow Condensed, Noto Sans JP, sans-serif"'


def svg(w, h, body, label):
    return (f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="{label}">{"".join(body)}</svg>')


def txt(x, y, s, size=14, fill=INK, weight=500, anchor="start", font=F, extra=""):
    return (f'<text x="{x:.1f}" y="{y:.1f}" {font} font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}" {extra}>{s}</text>')


def callout(x, y, n, r=10.5):
    return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="#fff" stroke="{NAVY}" stroke-width="1.4"/>'
            + txt(x, y + r * .45, n, size=r * 1.25, fill=NAVY, weight=700, anchor="middle", font=N))


def arrow(x1, y1, x2, y2, color=NAVY, w=2):
    import math
    a = math.atan2(y2 - y1, x2 - x1)
    l = 9
    p1 = (x2 - l * math.cos(a - .45), y2 - l * math.sin(a - .45))
    p2 = (x2 - l * math.cos(a + .45), y2 - l * math.sin(a + .45))
    return (f'<path d="M{x1:.1f} {y1:.1f}L{x2:.1f} {y2:.1f}" stroke="{color}" stroke-width="{w}" fill="none"/>'
            f'<path d="M{p1[0]:.1f} {p1[1]:.1f}L{x2:.1f} {y2:.1f}L{p2[0]:.1f} {p2[1]:.1f}z" fill="{color}"/>')


def dim_h(x1, x2, y, label, ext_from=None):
    """Horizontal dimension line with ticks (architectural style)."""
    o = [f'<path d="M{x1} {y}H{x2}" stroke="{NAVY}" stroke-width=".9"/>',
         f'<path d="M{x1 - 4} {y + 4}l8 -8M{x2 - 4} {y + 4}l8 -8" stroke="{NAVY}" stroke-width="1.2"/>']
    if ext_from is not None:
        o.append(f'<path d="M{x1} {ext_from}V{y + 5}M{x2} {ext_from}V{y + 5}" stroke="{LINE}" stroke-width=".7"/>')
    o.append(txt((x1 + x2) / 2, y - 5, label, size=13, fill=NAVY, weight=600, anchor="middle", font=N))
    return "".join(o)


def dim_v(y1, y2, x, label, ext_from=None):
    o = [f'<path d="M{x} {y1}V{y2}" stroke="{NAVY}" stroke-width=".9"/>',
         f'<path d="M{x - 4} {y1 + 4}l8 -8M{x - 4} {y2 + 4}l8 -8" stroke="{NAVY}" stroke-width="1.2"/>']
    if ext_from is not None:
        o.append(f'<path d="M{ext_from} {y1}H{x - 5}M{ext_from} {y2}H{x - 5}" stroke="{LINE}" stroke-width=".7"/>')
    cy = (y1 + y2) / 2
    o.append(txt(x - 6, cy, label, size=13, fill=NAVY, weight=600, anchor="middle", font=N,
                 extra=f'transform="rotate(-90 {x - 6} {cy})"'))
    return "".join(o)


def mesh(x, y, w, h, step=6, color=LINE):
    o = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff" stroke="{NAVY}" stroke-width="1.2"/>']
    p = []
    for i in range(1, int(w / step) + 1):
        p.append(f"M{x + i * step} {y}V{y + h}")
    for j in range(1, int(h / step) + 1):
        p.append(f"M{x} {y + j * step}H{x + w}")
    o.append(f'<path d="{"".join(p)}" stroke="{color}" stroke-width=".6"/>')
    return "".join(o)


# ---------------------------------------------------------------- street
def street_svg(after):
    rnd = random.Random(3)
    o = [f'<rect width="480" height="300" fill="{TINT}"/>',
         f'<path d="M0 272H480" stroke="{NAVY}" stroke-width="1.6"/>']
    # neighbour apartment
    o.append(f'<rect x="300" y="58" width="150" height="214" fill="#fff" stroke="{NAVY}" stroke-width="1.4"/>')
    for r in range(4):
        for c in range(3):
            o.append(f'<rect x="{316 + c * 44}" y="{76 + r * 46}" width="30" height="26" fill="{TINT}" stroke="{NAVY}" stroke-width="1"/>')
    # restaurant
    o.append(f'<rect x="30" y="118" width="172" height="154" fill="#fff" stroke="{NAVY}" stroke-width="1.4"/>')
    o.append(f'<path d="M24 196H208l-8 14H32z" fill="{NAVY}"/>')
    o.append(f'<rect x="46" y="216" width="56" height="56" fill="{TINT}" stroke="{NAVY}" stroke-width="1"/>'
             f'<rect x="126" y="216" width="40" height="56" fill="{TINT}" stroke="{NAVY}" stroke-width="1"/>')
    o.append(f'<rect x="46" y="138" width="44" height="34" fill="{TINT}" stroke="{NAVY}" stroke-width="1"/>')
    # exhaust duct through the side wall of the ground-floor kitchen
    oy = 230
    o.append(f'<path d="M180 {oy}H214" stroke="{NAVY}" stroke-width="9" stroke-linecap="butt"/>'
             f'<path d="M180 {oy}H214" stroke="#fff" stroke-width="5.4"/>')
    if not after:
        o.append(f'<rect x="212" y="{oy - 10}" width="8" height="20" fill="{NAVY}"/>')
        # grease stain on the wall below the outlet
        o.append(f'<path d="M203 {oy + 10}c-3 10 3 18-2 28h-4c3-10-2-18 1-28z" fill="#5a4a3a" opacity=".35"/>')
        # oil smoke as particles (same language as the principle drawing), rising from the
        # outlet and spreading toward the apartment windows
        for i in range(190):
            t = rnd.random() ** 1.1
            spread = 4 + t * 30
            x = 224 + t * 166 + rnd.gauss(0, spread * .8)
            y = oy - 150 * t ** .75 + rnd.gauss(0, spread * .6)
            r = 2 + t * 3.6 * rnd.random()
            o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{AMBER}" opacity="{(.8 - t * .42):.2f}"/>')
        o.append(txt(18, 30, "BEFORE", 18, GRAY, 600, font=N, extra='letter-spacing="3"'))
    else:
        # JL-8A outdoors on a low stand right against the shop wall; an exhaust duct rises
        # from its outlet and releases the cleaned air higher up
        ux, uy, uw, uh = 206, 214, 48, 32
        o.append(f'<path d="M{ux + 6} {uy + uh}V272M{ux + uw - 6} {uy + uh}V272M{ux + 6} 262H{ux + uw - 6}" stroke="{NAVY}" stroke-width="2"/>')
        rise = f"M{ux + uw} {oy}H{ux + uw + 10}V150H{ux + uw + 20}"
        o.append(f'<path d="{rise}" fill="none" stroke="{NAVY}" stroke-width="9" stroke-linejoin="miter"/>'
                 f'<path d="{rise}" fill="none" stroke="#fff" stroke-width="5.4" stroke-linejoin="miter"/>')
        o.append(f'<rect x="{ux + uw + 20}" y="140" width="6" height="20" fill="{NAVY}"/>')
        o.append(f'<rect x="{ux}" y="{uy}" width="{uw}" height="{uh}" fill="#fff" stroke="{BLUE}" stroke-width="2"/>'
                 + txt(ux + uw / 2, uy + 20, "JL-8A", 11, BLUE, 700, "middle", N))
        for i, dy in enumerate((-7, 0, 7)):
            o.append(f'<path d="M{ux + uw + 31} {150 + dy}h{14 - i * 3}" stroke="{BLUE}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>')
        o.append(txt(18, 30, "AFTER", 18, BLUE, 600, font=N, extra='letter-spacing="3"'))
    return svg(480, 300, o, "導入前" if not after else "導入後")


# ---------------------------------------------------------------- system
def system_svg():
    """Kitchen on the left; the duct leaves through the outer wall right after
    the hood, drops to the ground where the chamber boxes, JL-8A and fan
    stand, then rises again and turns sideways to blow out."""
    import math
    rnd = random.Random(5)
    o = []
    floor, ceil = 312, 30
    wx, ww = 214, 18                      # outer wall, right behind the hood
    dy = 96                               # duct height through the wall
    uy = floor - 54                       # centre line of the ground-standing units
    drop, c1 = 292, 340                   # where the duct comes down; first chamber
    ux = c1 + 40                          # JL-8A body
    c2 = ux + 200                         # second chamber
    fx, fr = c2 + 120, 44                 # fan
    rx, ox = fx + 120, 890                # riser; outlet
    o.append(f'<path d="M0 {floor}H1000" stroke="{NAVY}" stroke-width="1.4"/>')
    o.append(f'<rect x="{wx}" y="{ceil}" width="{ww}" height="{floor - ceil + 10}" fill="{TINT}" stroke="{NAVY}" stroke-width="1.4"/>')
    o.append(txt(wx + ww / 2, floor + 26, "外壁", 12, GRAY, 500, "middle"))
    o.append(txt(wx - 8, ceil + 14, "屋内", 13, GRAY, 700, "end", extra='letter-spacing=".2em"'))
    o.append(txt(wx + ww + 10, ceil + 14, "屋外", 13, GRAY, 700, "start", extra='letter-spacing=".2em"'))
    # grill + hood
    o.append(f'<rect x="40" y="252" width="140" height="60" fill="#fff" stroke="{NAVY}" stroke-width="1.4"/>')
    o.append(f'<path d="M52 252h116" stroke="{ORANGE}" stroke-width="4"/>')
    o.append(f'<path d="M30 196H190L166 162H54Z" fill="#fff" stroke="{NAVY}" stroke-width="1.4"/>')
    for i in range(36):
        x = 70 + rnd.random() * 80
        y = 204 + rnd.random() * 44
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{1.6 + rnd.random() * 2.4:.1f}" fill="{AMBER}" opacity=".7"/>')
    # duct: hood -> up -> through the wall -> down to the units on the ground
    d1 = f"M110 162V{dy}H{drop}V{uy}H{c1}"
    o.append(f'<path d="{d1}" fill="none" stroke="{NAVY}" stroke-width="22" stroke-linejoin="miter"/>'
             f'<path d="{d1}" fill="none" stroke="#fff" stroke-width="19" stroke-linejoin="miter"/>')
    segs = [((110, 160), (110, dy)), ((110, dy), (drop, dy)), ((drop, dy), (drop, uy)), ((drop, uy), (c1 - 6, uy))]
    lens = [abs(b[0] - a[0]) + abs(b[1] - a[1]) for a, b in segs]
    for i in range(30):
        t = rnd.random() * sum(lens)
        for (p0, p1), l in zip(segs, lens):
            if t <= l:
                f = t / l
                x, y = p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f
                break
            t -= l
        x += rnd.gauss(0, 3) if p0[0] == p1[0] else 0
        y += rnd.gauss(0, 3) if p0[1] == p1[1] else 0
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{1.6 + rnd.random() * 1.6:.1f}" fill="{AMBER}" opacity=".85"/>')
    # air-speed measuring point (duct just before the unit)
    mx = (drop + 11 + c1) / 2
    o.append(f'<path d="M{mx} {uy - 12}V{uy - 94}" stroke="{BLUE}" stroke-width="1.2" stroke-dasharray="3 3"/>'
             f'<circle cx="{mx}" cy="{uy - 100}" r="6" fill="#fff" stroke="{BLUE}" stroke-width="1.4"/>'
             + txt(mx + 10, uy - 96, "風速 4〜6m/s", 12, BLUE, 700, "start"))
    # chamber boxes + unit, standing on the ground
    o.append(f'<rect x="{c1}" y="{uy - 34}" width="40" height="68" fill="{TINT}" stroke="{NAVY}" stroke-width="1.4"/>')
    for fxo in (ux + 14, ux + 176):
        o.append(f'<rect x="{fxo}" y="{uy + 46}" width="10" height="{floor - uy - 46}" fill="{NAVY}"/>')
    o.append(f'<rect x="{ux}" y="{uy - 46}" width="200" height="92" fill="#fff" stroke="{BLUE}" stroke-width="2.6"/>')
    o.append(mesh(ux + 10, uy - 36, 12, 72, 6))
    for i in range(5):
        o.append(f'<path d="M{ux + 38 + i * 12} {uy - 36}V{uy + 36}" stroke="{BLUE}" stroke-width="1.1"/>')
    for i in range(7):
        o.append(f'<path d="M{ux + 110} {uy - 33 + i * 11}H{ux + 188}" stroke="{BLUE if i % 2 else LINE}" stroke-width="{1.6 if i % 2 else 1}"/>')
    o.append(txt(ux + 100, uy - 56, "JL-8A", 18, BLUE, 700, "middle", N))
    o.append(f'<rect x="{c2}" y="{uy - 34}" width="40" height="68" fill="{TINT}" stroke="{NAVY}" stroke-width="1.4"/>')
    # duct -> fan (on a base) -> riser -> sideways outlet
    o.append(f'<path d="M{c2 + 40} {uy}H{fx - fr}" stroke="{NAVY}" stroke-width="22"/><path d="M{c2 + 40} {uy}H{fx - fr}" stroke="#fff" stroke-width="19"/>')
    o.append(f'<path d="M{fx - 28} {floor}L{fx - 16} {uy + fr - 2}H{fx + 16}L{fx + 28} {floor}" fill="{TINT}" stroke="{NAVY}" stroke-width="1.4"/>')
    o.append(f'<circle cx="{fx}" cy="{uy}" r="{fr}" fill="#fff" stroke="{NAVY}" stroke-width="1.4"/>'
             f'<circle cx="{fx}" cy="{uy}" r="16" fill="none" stroke="{NAVY}" stroke-width="1.2"/>')
    for k in range(10):
        a = k * math.pi / 5
        x1, y1 = fx + 18 * math.cos(a), uy + 18 * math.sin(a)
        x2, y2 = fx + 38 * math.cos(a + .5), uy + 38 * math.sin(a + .5)
        o.append(f'<path d="M{x1:.1f} {y1:.1f}L{x2:.1f} {y2:.1f}" stroke="{NAVY}" stroke-width="1.1"/>')
    d2 = f"M{fx + fr} {uy}H{rx}V{dy}H{ox}"
    o.append(f'<path d="{d2}" fill="none" stroke="{NAVY}" stroke-width="22" stroke-linejoin="miter"/>'
             f'<path d="{d2}" fill="none" stroke="#fff" stroke-width="19" stroke-linejoin="miter"/>')
    o.append(f'<path d="M{ox} {dy - 11}V{dy + 11}" stroke="{NAVY}" stroke-width="1.4"/>')
    for i, d in enumerate((-12, 0, 12)):
        o.append(f'<path d="M{ox + 10} {dy + d}h{50 - i * 8}" stroke="{BLUE}" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>')
    # flow arrows
    o.append(arrow(140, dy, 186, dy, NAVY, 1.6))
    o.append(arrow(drop, dy + 40, drop, dy + 86, NAVY, 1.6))
    o.append(arrow(rx, uy - 40, rx, uy - 100, NAVY, 1.6))
    # callouts (numbers match the legend under the drawing)
    for n, (x, y) in enumerate([(22, 236), (c1 + 20, uy - 54), (ux + 100, uy - 86), (fx, uy - 64), (ox + 82, dy + 34)], 1):
        o.append(callout(x, y, n, 12))
    o.append(txt(30, floor + 26, "厨房", 12, GRAY, 500))
    return svg(1000, 350, o, "システム構成図")


# ---------------------------------------------------------------- principle
def principle_svg():
    rnd = random.Random(11)
    o = []
    top, bot = 70, 320
    o.append(f'<rect x="40" y="{top}" width="920" height="{bot - top}" fill="#fff"/>')
    o.append(f'<path d="M40 {top}H960M40 {bot}H960" stroke="{NAVY}" stroke-width="3"/>')
    # inlet smoke
    for i in range(120):
        x = 46 + rnd.random() * 90
        y = top + 12 + rnd.random() * (bot - top - 24)
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{2 + rnd.random() * 3.5:.1f}" fill="{AMBER}" opacity="{.45 + rnd.random() * .5:.2f}"/>')
    # prefilter
    o.append(mesh(150, top + 4, 18, bot - top - 8, 6))
    lanes = [top + 30 + i * 32 for i in range(7)]
    # evened-out flow
    for ly in lanes:
        for x in range(186, 246, 16):
            o.append(f'<circle cx="{x}" cy="{ly}" r="2.6" fill="{AMBER}"/>')
    # ionizer
    o.append(f'<rect x="250" y="{top + 2}" width="150" height="{bot - top - 4}" fill="{BLUE}" opacity=".06"/>')
    for wx in (270, 310, 350, 390):
        o.append(f'<path d="M{wx} {top + 2}V{bot - 2}" stroke="{BLUE}" stroke-width="1.6"/>')
    for ly in lanes:
        for x in range(262, 440, 22):
            charged = x > 300
            o.append(f'<circle cx="{x}" cy="{ly}" r="3.4" fill="{BLUE if charged else AMBER}"/>')
            if charged and x > 380:
                o.append(txt(x + 3, ly - 5, "+", 10, BLUE, 700))
    # collector plates
    plates = [top + 16 + i * 36.3 for i in range(7)]
    for i, py in enumerate(plates):
        neg = i % 2 == 0
        o.append(f'<path d="M470 {py:.1f}H930" stroke="{BLUE if neg else LINE}" stroke-width="{3.4 if neg else 2}"/>')
        o.append(txt(944, py + 5, "−" if neg else "+", 16, BLUE if neg else GRAY, 700, "middle"))
    # trajectories: each charged lane bends onto the nearest negative plate
    negs = [p for i, p in enumerate(plates) if i % 2 == 0]
    for k, ly in enumerate(lanes):
        target = min(negs, key=lambda p: abs(p - ly))
        ty = target + (4 if target > ly else -4)
        end = 560 + (k % 3) * 70
        o.append(f'<path d="M444 {ly}C{end - 60} {ly} {end - 40} {ty:.1f} {end} {ty:.1f}" fill="none" '
                 f'stroke="{BLUE}" stroke-width="1.2" stroke-dasharray="2 4"/>')
        o.append(f'<circle cx="{end}" cy="{ty:.1f}" r="3.2" fill="{BLUE}"/>')
    # collected oil on the negative plates
    for p in negs:
        for _ in range(14):
            x = 520 + abs(rnd.gauss(0, 120))
            if x > 900:
                continue
            s = 1 if p < (top + bot) / 2 else -1
            s = rnd.choice((-1, 1))
            o.append(f'<circle cx="{x:.1f}" cy="{p + s * 3.8:.1f}" r="{1.5 + rnd.random() * .8:.1f}" fill="{AMBER}"/>')
    # stage labels
    for n, (cx, s1, s2) in enumerate([(159, "整える", "プレフィルターネット"), (325, "帯電させる", "高電圧部 12kV"),
                                       (700, "集める", "低電圧部 6kV")], 1):
        o.append(callout(cx - 52 if n == 1 else cx - 70, 30, n, 12))
        o.append(txt(cx - (36 if n == 1 else 54), 36, s1, 17, NAVY, 700))
        o.append(txt(cx, bot + 30, s2, 14, BLUE if n > 1 else GRAY, 700, "middle"))
    o.append(txt(46, bot + 30, "油煙", 14, AMBER, 700))
    o.append(txt(990, bot + 30, "清浄な空気", 14, GRAY, 700, "end"))
    return svg(1000, 360, o, "集塵の原理")


# ---------------------------------------------------------------- structure
def structure_svg():
    o = []
    X0, X1, Y0, Y1 = 80, 900, 40, 500
    part = 152
    o.append(f'<rect x="{X0}" y="{Y0}" width="{X1 - X0}" height="{Y1 - Y0}" fill="#fff" stroke="{NAVY}" stroke-width="2.4"/>')
    o.append(f'<rect x="{X0}" y="{Y0}" width="{X1 - X0}" height="{part - Y0}" fill="{TINT}"/>')
    o.append(f'<path d="M{X0} {part}H{X1}" stroke="{NAVY}" stroke-width="1.6"/>')
    o.append(txt(X1 - 12, Y0 + 20, "電気回路部", 12, GRAY, 700, "end"))
    o.append(txt(X0 + 10, part + 20, "セルユニット部", 12, GRAY, 700))
    # electrical parts
    o.append(f'<rect x="120" y="60" width="120" height="70" fill="#fff" stroke="{NAVY}" stroke-width="1.2"/>'
             f'<rect x="130" y="68" width="100" height="24" fill="{NAVY}"/><rect x="130" y="98" width="100" height="24" fill="{NAVY}"/>'
             + txt(222, 86, "12.0 kV", 13, "#7fe0a0", 700, "end", N) + txt(222, 116, "6〜10 A", 13, "#7fe0a0", 700, "end", N))
    o.append(f'<rect x="400" y="62" width="70" height="68" fill="#fff" stroke="{NAVY}" stroke-width="1.2"/>'
             f'<rect x="424" y="72" width="22" height="34" rx="2" fill="none" stroke="{NAVY}" stroke-width="1.2"/>'
             f'<rect x="424" y="72" width="22" height="15" rx="2" fill="{NAVY}"/>')
    o.append(f'<rect x="540" y="60" width="210" height="72" fill="#e3ece6" stroke="{NAVY}" stroke-width="1.2"/>')
    for x, y, w, h in ((556, 72, 30, 22), (600, 76, 46, 30), (660, 70, 24, 16), (700, 92, 34, 26), (560, 104, 22, 18)):
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{NAVY}" opacity=".8"/>')
    o.append(f'<path d="M586 83H600M646 90H660M684 78H716V92M582 113H700" stroke="{NAVY}" stroke-width="1" fill="none"/>')
    # run lamp on the face
    o.append(f'<circle cx="850" cy="96" r="11" fill="#2ecc71" stroke="{NAVY}" stroke-width="1.4"/>')
    # two cells in series, each one-piece HV + LV, each fed by its own
    # terminal pair (11 HV, 12 LV) -> feed electrodes (8, 7) -> springs (10, 9)
    cy0, cy1 = 206, 420
    cells = ((230, 515), (535, 820))
    legs = []
    for cx0, cx1 in cells:
        d = cx0 + 100                     # HV | LV divider
        legs.append((d - 30, d + 30))
    (h1, l1), (h2, l2) = legs
    o.append(f'<path d="M556 132V140H{h1 + 12}M{h2} 132V{part - 16}M{l2} 132V{part - 16}" stroke="{BLUE}" stroke-width="2" fill="none"/>')
    for hv, lv in legs:
        for x in (hv, lv):
            o.append(f'<rect x="{x - 12}" y="{part - 16}" width="24" height="14" fill="{BLUE}"/>')
            o.append(f'<rect x="{x - 14}" y="{part + 6}" width="28" height="12" fill="#fff" stroke="{BLUE}" stroke-width="2"/>')
            z = " ".join(f"{x + (7 if i % 2 else -7)},{part + 22 + i * 4}" for i in range(7))
            o.append(f'<polyline points="{x},{part + 18} {z} {x},{cy0}" fill="none" stroke="{BLUE}" stroke-width="1.6"/>')
    # air path
    o.append(arrow(14, 314, 76, 314, NAVY, 2.4))
    o.append(arrow(904, 314, 966, 314, NAVY, 2.4))
    o.append(txt(14, 300, "吸込", 13, AMBER, 700))
    o.append(txt(966, 300, "排気", 13, GRAY, 700, "end"))
    o.append(mesh(130, 214, 22, 200, 7))
    for cx0, cx1 in cells:
        d = cx0 + 100
        o.append(f'<rect x="{cx0}" y="{cy0}" width="{cx1 - cx0}" height="{cy1 - cy0}" fill="#fff" stroke="{NAVY}" stroke-width="2"/>')
        o.append(f'<rect x="{cx0 + 2}" y="{cy0 + 2}" width="{d - cx0 - 4}" height="{cy1 - cy0 - 4}" fill="{BLUE}" opacity=".06"/>')
        for i in range(4):
            o.append(f'<path d="M{cx0 + 20 + i * 22} {cy0 + 10}V{cy1 - 10}" stroke="{BLUE}" stroke-width="1.6"/>')
        o.append(f'<path d="M{d} {cy0}V{cy1}" stroke="{NAVY}" stroke-width="1" stroke-dasharray="4 3"/>')
        for i in range(9):
            y = cy0 + 18 + i * 23
            neg = i % 2 == 0
            o.append(f'<path d="M{d + 12} {y}H{cx1 - 12}" stroke="{BLUE if neg else LINE}" stroke-width="{2.6 if neg else 1.4}"/>')
        o.append(txt((cx0 + d) / 2, cy1 + 22, "高電圧部", 12, BLUE, 700, "middle"))
        o.append(txt((d + cx1) / 2, cy1 + 22, "低電圧部", 12, BLUE, 700, "middle"))
    # oil pan + drain
    o.append(f'<path d="M180 452H840L824 486H196Z" fill="#fff" stroke="{NAVY}" stroke-width="1.4"/>'
             f'<path d="M204 476H816L812 484H208Z" fill="{AMBER}" opacity=".55"/>')
    o.append(f'<path d="M800 486V530H836" fill="none" stroke="{NAVY}" stroke-width="5"/>'
             f'<rect x="814" y="522" width="10" height="16" fill="{NAVY}"/>')
    # callouts (manual numbering)
    pts = [(1, 862, 530), (2, 878, 96), (3, 540, 58), (4, 400, 58), (5, 230, 206), (5, 535, 206), (6, 141, 206),
           (7, l2 + 28, 170), (8, h1 - 28, 170), (9, l2 + 28, 196), (10, h1 - 28, 196), (11, h1 - 28, 140),
           (12, l2 + 28, 144), (13, 120, 58)]
    for n, x, y in pts:
        o.append(callout(x, y, n, 11))
    return svg(1000, 560, o, "構造模式図")


# ---------------------------------------------------------------- outline views
def ortho_svg():
    s = .3
    W, D, H = 750 * s, 840 * s, 680 * s
    fx, fy = 70, 330            # front view top-left
    tx, ty = fx, fy - 34 - D    # top view
    sx, sy = fx + W + 44, fy    # right side view
    o = []
    st = f'fill="#fff" stroke="{NAVY}" stroke-width="1.6"'
    # front: top lid strip, one cell-unit door (latch left, hinges right), as on the real unit
    o.append(f'<rect x="{fx}" y="{fy}" width="{W}" height="{H}" {st}/>')
    band = H * .09
    o.append(f'<path d="M{fx} {fy + band}H{fx + W}" stroke="{NAVY}" stroke-width="1"/>')
    dx, dy, dw, dh = fx + 9, fy + band + 7, W - 18, H - band - 15
    o.append(f'<rect x="{dx}" y="{dy}" width="{dw}" height="{dh}" fill="none" stroke="{NAVY}" stroke-width="1.2"/>')
    o.append(f'<rect x="{dx + 8}" y="{dy + dh * .38}" width="7" height="22" rx="1.5" fill="{NAVY}"/>')
    for hy in (.12, .8):
        o.append(f'<rect x="{dx + dw - 3}" y="{dy + dh * hy}" width="7" height="12" fill="{NAVY}"/>')
    o.append(txt(dx + dw / 2, dy + dh / 2 + 4, "セルユニット扉", 11, GRAY, 700, "middle"))
    # side
    o.append(f'<rect x="{sx}" y="{sy}" width="{D}" height="{H}" {st}/>')
    o.append(mesh(sx + 18, sy + 18, D - 36, H - 40, 7))
    # top
    o.append(f'<rect x="{tx}" y="{ty}" width="{W}" height="{D}" {st}/>')
    o.append(f'<path d="M{tx + W / 2} {ty - 8}V{ty + D + 8}M{tx - 8} {ty + D / 2}H{tx + W + 8}" stroke="{LINE}" stroke-width=".8" stroke-dasharray="14 4 3 4"/>')
    # inlet / outlet faces on the sides, doors on the front edge, air path
    o.append(mesh(tx + 3, ty + 18, 9, D - 36, 4.5) + mesh(tx + W - 12, ty + 18, 9, D - 36, 4.5))
    o.append(f'<path d="M{tx + 8} {ty + D - 4}H{tx + W - 8}" stroke="{NAVY}" stroke-width="3"/>')
    o.append(arrow(tx + 30, ty + D / 2 - 26, tx + W - 30, ty + D / 2 - 26, BLUE, 1.6))
    o.append(txt(tx + W / 2, ty + D / 2 - 34, "風の流れ（例）", 11, BLUE, 700, "middle"))
    o.append(txt(tx + W / 2, ty + D - 12, "正面（扉）", 11, GRAY, 700, "middle"))
    # dims
    o.append(dim_h(fx, fx + W, fy + H + 30, "750", ext_from=fy + H + 2))
    o.append(dim_v(fy, fy + H, fx - 26, "680", ext_from=fx - 2))
    o.append(dim_h(sx, sx + D, sy + H + 30, "840", ext_from=sy + H + 2))
    o.append(dim_v(ty, ty + D, tx - 26, "840", ext_from=tx - 2))
    # view names
    o.append(txt(fx + W / 2, fy + H + 58, "正面図", 13, GRAY, 700, "middle"))
    o.append(txt(sx + D / 2, sy + H + 58, "側面図（吸込・排気口側）", 13, GRAY, 700, "middle"))
    o.append(txt(tx + W + 20, ty + 16, "上面図", 13, GRAY, 700))
    o.append(txt(sx + D, ty + D - 4, "単位：mm", 12, GRAY, 500, "end"))
    return svg(sx + D + 20, fy + H + 70, o, "外形図")


# ---------------------------------------------------------------- installation patterns
def _unit(x, y, w=110, h=62):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff" stroke="{BLUE}" stroke-width="2.2"/>'
            f'<path d="M{x + w * .4} {y + 6}V{y + h - 6}" stroke="{NAVY}" stroke-width=".8"/>'
            f'<circle cx="{x + 9}" cy="{y + 9}" r="2.6" fill="#2ecc71"/>')


def _duct(d):
    return (f'<path d="{d}" fill="none" stroke="{NAVY}" stroke-width="14"/>'
            f'<path d="{d}" fill="none" stroke="#fff" stroke-width="11"/>')


def install_svg(kind):
    o = []
    if kind == "floor":
        o.append(f'<path d="M0 182H300" stroke="{NAVY}" stroke-width="1.6"/>')
        o.append(f'<rect x="96" y="172" width="8" height="10" fill="{NAVY}"/><rect x="196" y="172" width="8" height="10" fill="{NAVY}"/>')
        o.append(_duct("M60 20V141H90") + _duct("M210 141H240V20"))
        o.append(f'<rect x="74" y="118" width="22" height="46" fill="{TINT}" stroke="{NAVY}" stroke-width="1.2"/>'
                 f'<rect x="204" y="118" width="22" height="46" fill="{TINT}" stroke="{NAVY}" stroke-width="1.2"/>')
        o.append(_unit(96, 110))
    elif kind == "ceiling":
        o.append(f'<path d="M0 22H300" stroke="{NAVY}" stroke-width="1.6"/>')
        o.append(f'<path d="M110 22V80M190 22V80" stroke="{NAVY}" stroke-width="2"/>')
        o.append(_duct("M10 111H92") + _duct("M208 111H290"))
        o.append(f'<rect x="74" y="88" width="22" height="46" fill="{TINT}" stroke="{NAVY}" stroke-width="1.2"/>'
                 f'<rect x="204" y="88" width="22" height="46" fill="{TINT}" stroke="{NAVY}" stroke-width="1.2"/>')
        o.append(_unit(96, 80))
        o.append(f'<rect x="96" y="150" width="110" height="34" fill="none" stroke="{ORANGE}" stroke-width="1.2" stroke-dasharray="4 3"/>'
                 + txt(151, 172, "作業スペース", 11, ORANGE, 700, "middle"))
    else:
        o.append(f'<path d="M0 186H300" stroke="{NAVY}" stroke-width="1.6"/>')
        o.append(f'<rect x="14" y="10" width="18" height="176" fill="{TINT}" stroke="{NAVY}" stroke-width="1.2"/>')
        o.append(_duct("M32 100H90") + _duct("M210 100H250V14"))
        o.append(f'<path d="M96 132V186M206 132V186M96 186L206 140M206 186L96 140" stroke="{NAVY}" stroke-width="2"/>')
        o.append(f'<rect x="74" y="78" width="22" height="46" fill="{TINT}" stroke="{NAVY}" stroke-width="1.2"/>'
                 f'<rect x="204" y="78" width="22" height="46" fill="{TINT}" stroke="{NAVY}" stroke-width="1.2"/>')
        o.append(_unit(96, 70))
        o.append(f'<path d="M86 64L151 46L216 64" fill="none" stroke="{NAVY}" stroke-width="2.4"/>')
        o.append(txt(151, 38, "防雨カバー（別売）", 11, GRAY, 700, "middle"))
    return svg(300, 200, o, "設置例")


def footprint_svg():
    """Plan view: unit, chamber boxes on the air path, and the 0.7m work space
    in front of the cell-unit door."""
    s = .2
    W, D, WS = 750 * s, 840 * s, 700 * s
    x, y = 150, 44
    o = []
    # duct + chamber boxes (air flows left -> right along W)
    cy = y + D / 2
    for side in (-1, 1):
        bx = x - 40 if side < 0 else x + W
        o.append(f'<path d="M{bx} {y + 26}h40v{D - 52}h-40z" fill="{TINT}" stroke="{NAVY}" stroke-width="1.2"/>')
        # duct widens (or narrows) to the full face of the chamber box
        face = bx if side < 0 else bx + 40
        neck = face + 60 * side
        end = 20 if side < 0 else 440
        o.append(f'<path d="M{neck} {cy - 20}L{face} {y + 26}V{y + D - 26}L{neck} {cy + 20}Z" fill="#fff" stroke="{NAVY}" stroke-width="1.4" stroke-linejoin="round"/>')
        o.append(f'<path d="M{end} {cy - 20}H{neck}M{end} {cy + 20}H{neck}" stroke="{NAVY}" stroke-width="1.4"/>')
    o.append(arrow(30, cy, x - 52, cy, BLUE, 2))
    o.append(arrow(x + W + 52, cy, 432, cy, BLUE, 2))
    o.append(txt(30, cy - 28, "吸込", 12, BLUE, 700))
    o.append(txt(432, cy - 28, "排気", 12, BLUE, 700, "end"))
    # unit
    o.append(f'<rect x="{x}" y="{y}" width="{W}" height="{D}" fill="#fff" stroke="{NAVY}" stroke-width="1.8"/>')
    o.append(f'<path d="M{x + W / 2} {y - 6}V{y + D + 6}M{x - 6} {cy}H{x + W + 6}" stroke="{LINE}" stroke-width=".7" stroke-dasharray="10 3 2 3"/>')
    o.append(txt(x + W / 2, y + D / 2 - 10, "JL-8A", 15, NAVY, 700, "middle", N))
    o.append(txt(x + W / 2, y + D - 10, "扉（正面）", 11, GRAY, 700, "middle"))
    o.append(f'<path d="M{x + 6} {y + D}h{W - 12}" stroke="{NAVY}" stroke-width="4"/>')
    # work space
    wy = y + D
    o.append(f'<defs><pattern id="ws" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
             f'<path d="M0 0V7" stroke="{ORANGE}" stroke-width="1" opacity=".45"/></pattern></defs>')
    o.append(f'<rect x="{x}" y="{wy}" width="{W}" height="{WS}" fill="url(#ws)" stroke="{ORANGE}" stroke-width="1.2" stroke-dasharray="5 3"/>')
    o.append(f'<rect x="{x + W / 2 - 58}" y="{wy + WS / 2 - 15}" width="116" height="30" fill="#fff"/>')
    o.append(txt(x + W / 2, wy + WS / 2 - 1, "作業スペース", 12, ORANGE, 700, "middle"))
    o.append(txt(x + W / 2, wy + WS / 2 + 13, "扉を全開にできる広さ", 10, ORANGE, 500, "middle"))
    # dims
    o.append(dim_h(x, x + W, y - 18, "750", ext_from=y - 2))
    o.append(dim_v(y, y + D, x + W + 70, "840", ext_from=x + W + 2))
    o.append(dim_v(wy, wy + WS, x + W + 70, "700以上", ext_from=x + W + 2))
    # chamber box label
    o.append(f'<path d="M{x - 20} {y + D - 30}L{x - 44} {y + D + 34}H{x - 120}" fill="none" stroke="{GRAY}" stroke-width=".8"/>')
    o.append(txt(x - 120, y + D + 28, "チャンバーボックス", 11, GRAY, 700))
    o.append(txt(440, wy + WS + 22, "上から見た図　単位：mm", 11, GRAY, 500, "end"))
    return svg(450, wy + WS + 30, o, "設置スペースの目安")

