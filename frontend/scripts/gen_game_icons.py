#!/usr/bin/env python3
import math
import os
from PIL import Image, ImageDraw

SS = 8
S = 256 * SS
BG = (19, 19, 23, 255)
OUTDIR = os.path.join(os.path.dirname(__file__), "..", "public", "game-icons", "256")


def hexc(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def canvas():
    img = Image.new("RGBA", (S, S), BG)
    return img, ImageDraw.Draw(img)


def px(x, y):
    return (x / 1000 * S, y / 1000 * S)


def plen(v):
    return v / 1000 * S


def poly(draw, pts, fill=None, outline=None, width=0):
    kwargs = {}
    if fill:
        kwargs["fill"] = fill
    if outline:
        kwargs["outline"] = outline
        kwargs["width"] = max(1, int(plen(width)))
    draw.polygon([px(x, y) for x, y in pts], **kwargs)


def rrect(draw, x0, y0, x1, y1, r, fill=None, outline=None, width=0):
    kwargs = {}
    if fill:
        kwargs["fill"] = fill
    if outline:
        kwargs["outline"] = outline
        kwargs["width"] = max(1, int(plen(width)))
    draw.rounded_rectangle([px(x0, y0), px(x1, y1)], radius=plen(r), **kwargs)


def circ(draw, cx, cy, r, fill=None, outline=None, width=0):
    x0, y0 = px(cx - r, cy - r)
    x1, y1 = px(cx + r, cy + r)
    kwargs = {}
    if fill:
        kwargs["fill"] = fill
    if outline:
        kwargs["outline"] = outline
        kwargs["width"] = max(1, int(plen(width)))
    draw.ellipse([x0, y0, x1, y1], **kwargs)


def tline(draw, x1, y1, x2, y2, w, fill):
    p1 = px(x1, y1)
    p2 = px(x2, y2)
    width = plen(w)
    draw.line([p1, p2], fill=fill, width=int(width))
    r = width / 2
    draw.ellipse([p1[0] - r, p1[1] - r, p1[0] + r, p1[1] + r], fill=fill)
    draw.ellipse([p2[0] - r, p2[1] - r, p2[0] + r, p2[1] + r], fill=fill)


def hexagon_pts(cx, cy, r, flat=False):
    pts = []
    for i in range(6):
        a = math.radians(60 * i - (0 if flat else 30))
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def star_pts(cx, cy, r_out, r_in, n, rot=-90):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(rot + i * (360 / (n * 2)))
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def save(img, name):
    out = img.resize((256, 256), Image.LANCZOS)
    out.save(os.path.join(OUTDIR, f"{name}.png"))
    print("wrote", name)


# ─── 1. Catan — settlement house on a hex tile ────────────────────────────
def icon_catan():
    img, d = canvas()
    teal, amber = hexc("#00c9b7"), hexc("#ffb23f")
    poly(d, hexagon_pts(500, 490, 335), fill=teal)
    poly(d, hexagon_pts(500, 490, 335), outline=amber, width=20)
    poly(d, [(500, 350), (400, 460), (600, 460)], fill=amber)
    rrect(d, 415, 460, 585, 620, 18, fill=amber)
    save(img, "catan")


# ─── 2. Catan Fable — hex + sparkle badge ─────────────────────────────────
def icon_catan_fable():
    img, d = canvas()
    violet, magenta = hexc("#8f5cff"), hexc("#ff6ae0")
    poly(d, hexagon_pts(480, 520, 330), fill=violet)
    poly(d, hexagon_pts(480, 520, 330), outline=magenta, width=18)
    poly(d, star_pts(660, 320, 150, 62, 4), fill=magenta)
    save(img, "catan-fable")


# ─── 3. Fable Factory — cog with spark core ───────────────────────────────
def icon_fable_factory():
    img, d = canvas()
    amber, cyan = hexc("#ffb000"), hexc("#00d6ff")
    cx, cy, r_out, r_in, teeth = 500, 500, 330, 250, 8
    pts = []
    for i in range(teeth * 2):
        a = math.radians(i * (360 / (teeth * 2)))
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    poly(d, pts, fill=amber)
    circ(d, cx, cy, 150, fill=BG)
    poly(d, star_pts(cx, cy, 100, 42, 4), fill=cyan)
    save(img, "fable-factory")


# ─── 4. Ticket to Sonnet — rail ticket stub ───────────────────────────────
def icon_ticket_to_sonnet():
    img, d = canvas()
    cyan, red = hexc("#3debff"), hexc("#e21b4d")
    rrect(d, 190, 330, 810, 670, 40, fill=cyan)
    circ(d, 500, 330, 46, fill=BG)
    circ(d, 500, 670, 46, fill=BG)
    for gy in (420, 500, 580):
        circ(d, 500, gy, 14, fill=BG)
    poly(d, [(280, 430), (280, 570), (430, 500)], fill=red)
    save(img, "ticket-to-sonnet")


# ─── 5. Carcassonne — castle turret ────────────────────────────────────────
def icon_carcassonne():
    img, d = canvas()
    green, gold = hexc("#00a86b"), hexc("#ffd15c")
    rrect(d, 360, 460, 640, 700, 16, fill=green)
    merlon_w, gap = 56, 32
    xs = [360, 360 + merlon_w + gap, 360 + 2 * (merlon_w + gap)]
    for x in xs:
        rrect(d, x, 360, x + merlon_w, 460, 10, fill=green)
    rrect(d, 452, 540, 548, 700, 14, fill=gold)
    poly(d, [(500, 250), (430, 360), (570, 360)], fill=gold)
    save(img, "carcassonne")


# ─── 6. Monopoly HP — top hat token ────────────────────────────────────────
def icon_monopoly_hp():
    img, d = canvas()
    purple, mint = hexc("#8a5bff"), hexc("#41ffc5")
    rrect(d, 300, 620, 700, 690, 24, fill=purple)
    rrect(d, 370, 340, 630, 640, 40, fill=purple)
    rrect(d, 370, 470, 630, 530, 0, fill=mint)
    save(img, "monopoly-hp")


# ─── 7. Bunker — shelter shield ────────────────────────────────────────────
def icon_bunker():
    img, d = canvas()
    orange, lime = hexc("#ff7a1a"), hexc("#c8ff3f")
    poly(d, [
        (500, 220), (700, 300), (700, 500), (660, 660), (500, 780),
        (340, 660), (300, 500), (300, 300),
    ], fill=orange)
    circ(d, 500, 470, 90, fill=lime)
    rrect(d, 460, 470, 540, 620, 0, fill=lime)
    save(img, "bunker")


# ─── 8. Chess — knight silhouette ──────────────────────────────────────────
def icon_chess():
    img, d = canvas()
    blue, cyan = hexc("#315cff"), hexc("#52e8ff")
    rrect(d, 350, 660, 650, 740, 16, fill=blue)
    poly(d, [
        (430, 660), (400, 520), (430, 420), (390, 340), (450, 280),
        (560, 280), (640, 360), (660, 460), (600, 480), (560, 430),
        (520, 460), (600, 560), (600, 660),
    ], fill=blue)
    circ(d, 470, 380, 22, fill=cyan)
    save(img, "chess")


# ─── 9. Checkers — stacked discs ───────────────────────────────────────────
def icon_checkers():
    img, d = canvas()
    red, gold = hexc("#ff3b5c"), hexc("#ffc24a")
    circ(d, 500, 640, 260, fill=red)
    circ(d, 500, 640, 150, outline=gold, width=26)
    circ(d, 500, 380, 220, fill=gold)
    circ(d, 500, 380, 130, outline=red, width=24)
    save(img, "checkers")


# ─── 10. Icebreakers — two chat bubbles ────────────────────────────────────
def icon_icebreakers():
    img, d = canvas()
    pink, cyan = hexc("#ff4fb8"), hexc("#7ff2ff")
    rrect(d, 260, 300, 660, 580, 60, fill=cyan)
    poly(d, [(330, 570), (330, 660), (430, 570)], fill=cyan)
    rrect(d, 420, 470, 760, 720, 60, fill=pink)
    poly(d, [(700, 710), (700, 790), (610, 710)], fill=pink)
    save(img, "icebreakers")


# ─── 11. Card of the Day — tarot card + star ───────────────────────────────
def icon_card_of_day():
    img, d = canvas()
    purple, cyan = hexc("#9a4dff"), hexc("#6ef8ff")
    rrect(d, 340, 240, 660, 760, 46, fill=purple)
    rrect(d, 388, 288, 612, 712, 26, outline=cyan, width=14)
    poly(d, star_pts(500, 500, 150, 62, 5), fill=cyan)
    save(img, "card-of-day")


# ─── 12. Sudoku — 3x3 grid with filled cells ───────────────────────────────
def icon_sudoku():
    img, d = canvas()
    green, blue = hexc("#35e8b3"), hexc("#236bff")
    rrect(d, 220, 220, 780, 780, 24, outline=green, width=34)
    for i in (1, 2):
        x = 220 + i * (780 - 220) / 3
        tline(d, x, 240, x, 760, 22, green)
        y = 220 + i * (780 - 220) / 3
        tline(d, 240, y, 760, y, 22, green)
    cellw = (780 - 220) / 3
    for (cx_i, cy_i) in [(0, 0), (1, 1), (2, 2)]:
        cx = 220 + cellw * (cx_i + 0.5)
        cy = 220 + cellw * (cy_i + 0.5)
        circ(d, cx, cy, cellw * 0.28, fill=blue)
    save(img, "sudoku")


# ─── 13. Force Deflector — energy blade with hilt ──────────────────────────
def icon_force_deflector():
    img, d = canvas()
    violet, blue, silver = hexc("#7b61ff"), hexc("#2ea8ff"), hexc("#d8dcff")
    # blade (thick glow + bright core), running low-left to high-right
    tline(d, 380, 660, 760, 260, 70, violet)
    tline(d, 380, 660, 760, 260, 30, blue)
    tline(d, 380, 660, 760, 260, 10, silver)
    # cross-guard
    gx, gy = 380, 660
    perp = math.radians(45 + 90)
    hx, hy = math.cos(perp), math.sin(perp)
    tline(d, gx - hx * 70, gy - hy * 70, gx + hx * 70, gy + hy * 70, 40, silver)
    # grip
    tline(d, 320, 720, 240, 800, 60, hexc("#2a2a34"))
    circ(d, 240, 800, 34, fill=hexc("#2a2a34"))
    save(img, "force-deflector")


# ─── 14. Neurogrid — connected nodes ───────────────────────────────────────
def icon_neurogrid():
    img, d = canvas()
    cyan, magenta = hexc("#00e5ff"), hexc("#ff39d6")
    nodes = [(500, 260), (280, 460), (720, 460), (360, 720), (640, 720)]
    edges = [(0, 1), (0, 2), (1, 3), (2, 4), (1, 2), (3, 4)]
    for a, b in edges:
        x1, y1 = nodes[a]
        x2, y2 = nodes[b]
        tline(d, x1, y1, x2, y2, 20, magenta)
    for i, (x, y) in enumerate(nodes):
        circ(d, x, y, 78 if i == 0 else 62, fill=cyan)
    save(img, "neurogrid")


# ─── 15. WebGrid — globe with grid lines ───────────────────────────────────
def icon_webgrid():
    img, d = canvas()
    green, yellow = hexc("#22ff88"), hexc("#efff4a")
    circ(d, 500, 500, 320, outline=green, width=28)
    tline(d, 500, 180, 500, 820, 20, green)
    tline(d, 180, 500, 820, 500, 20, green)
    d.ellipse([px(310, 180)[0], px(310, 180)[1], px(690, 820)[0], px(690, 820)[1]],
              outline=green, width=int(plen(20)))
    circ(d, 500, 500, 60, fill=yellow)
    save(img, "webgrid")


# ─── 16. Reader — open book ─────────────────────────────────────────────────
def icon_reader():
    img, d = canvas()
    blue, coral = hexc("#1c7cff"), hexc("#ff6a7a")
    poly(d, [(500, 320), (220, 260), (220, 700), (500, 760)], fill=blue)
    poly(d, [(500, 320), (780, 260), (780, 700), (500, 760)], fill=blue)
    tline(d, 500, 320, 500, 760, 14, hexc("#0e2a5c"))
    rrect(d, 452, 240, 548, 460, 10, fill=coral)
    poly(d, [(452, 460), (500, 410), (548, 460)], fill=coral)
    save(img, "reader")


# ─── 17. PDF Studio — document + pencil ────────────────────────────────────
def icon_pdf_studio():
    img, d = canvas()
    red, blue = hexc("#f43a3a"), hexc("#2ea8ff")
    rrect(d, 300, 220, 700, 780, 28, fill=hexc("#f5f5f7"))
    poly(d, [(580, 220), (700, 220), (700, 340), (580, 340)], fill=red)
    poly(d, [(580, 220), (700, 340), (580, 340)], fill=hexc("#c92e2e"))
    for gy in (460, 540, 620):
        tline(d, 380, gy, 620, gy, 20, hexc("#c9ccd6"))
    tline(d, 330, 760, 560, 530, 44, blue)
    poly(d, [(560, 530), (620, 470), (650, 500), (590, 560)], fill=hexc("#dfe6ff"))
    poly(d, [(300, 790), (330, 760), (360, 790)], fill=hexc("#1a1a1a"))
    save(img, "pdf-studio")


ICON_FNS = [
    icon_catan, icon_catan_fable, icon_fable_factory, icon_ticket_to_sonnet,
    icon_carcassonne, icon_monopoly_hp, icon_bunker, icon_chess, icon_checkers,
    icon_icebreakers, icon_card_of_day, icon_sudoku, icon_force_deflector,
    icon_neurogrid, icon_webgrid, icon_reader, icon_pdf_studio,
]

if __name__ == "__main__":
    os.makedirs(OUTDIR, exist_ok=True)
    for fn in ICON_FNS:
        fn()
