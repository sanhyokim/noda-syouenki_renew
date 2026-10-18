"""QR codes for the back cover, drawn as one SVG path so they stay sharp in print."""
import segno


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


def logo_svg():
    """株式会社野田's N mark, traced from Boss's 500px PNG (2026-10-18).
    Drawn in currentColor so it can sit white on navy or navy on paper."""
    return ('<svg class="logo" viewBox="117 109 265 279" xmlns="http://www.w3.org/2000/svg" '
            'role="img" aria-label="株式会社野田"><path fill="currentColor" '
            'd="M117 109H211V388H117ZM288 109H382V388H288ZM221 111L277 213V388L221 285Z"/></svg>')
