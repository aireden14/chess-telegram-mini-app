#!/usr/bin/env python3
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image


ROLES = ["knight", "robber", "mage"]
COLS = 5
ROWS = 3
OUT_SIZE = 256
KEY = (255, 0, 255)


def alpha_from_magenta(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            dist = math.sqrt((r - KEY[0]) ** 2 + (g - KEY[1]) ** 2 + (b - KEY[2]) ** 2)
            if dist < 42:
                px[x, y] = (r, g, b, 0)
            elif dist < 95:
                alpha = int(255 * ((dist - 42) / 53))
                px[x, y] = (r, g, b, min(a, alpha))
    return rgba


def trim_and_fit(im: Image.Image) -> Image.Image:
    alpha = im.getchannel("A")
    bbox = alpha.getbbox()
    canvas = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 0))
    if not bbox:
        return canvas
    crop = im.crop(bbox)
    cw, ch = crop.size
    scale = min(OUT_SIZE * 0.88 / cw, OUT_SIZE * 0.88 / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    crop = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (OUT_SIZE - nw) // 2
    y = int((OUT_SIZE - nh) * 0.52)
    canvas.alpha_composite(crop, (x, y))
    return canvas


def keep_largest_component(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    alpha = rgba.getchannel("A")
    w, h = rgba.size
    apx = alpha.load()
    seen = bytearray(w * h)
    best: list[tuple[int, int]] = []

    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if seen[idx] or apx[x, y] <= 10:
                continue
            stack = [(x, y)]
            seen[idx] = 1
            comp: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    nidx = ny * w + nx
                    if seen[nidx] or apx[nx, ny] <= 10:
                        continue
                    seen[nidx] = 1
                    stack.append((nx, ny))
            if len(comp) > len(best):
                best = comp

    keep = Image.new("L", (w, h), 0)
    kpx = keep.load()
    for x, y in best:
        kpx[x, y] = apx[x, y]
    rgba.putalpha(keep)
    return rgba


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "assets" / "meeples" / "meeple-sheet-ai3d-v1.png"
    out_dir = root / "assets" / "meeples"
    if not src.exists():
        raise SystemExit(f"Missing source sheet: {src}")

    sheet = Image.open(src).convert("RGB")
    w, h = sheet.size
    written = []
    for row, role in enumerate(ROLES):
        y0 = round(row * h / ROWS)
        y1 = round((row + 1) * h / ROWS)
        for col in range(COLS):
            x0 = round(col * w / COLS)
            x1 = round((col + 1) * w / COLS)
            cell = sheet.crop((x0, y0, x1, y1))
            sprite = trim_and_fit(keep_largest_component(alpha_from_magenta(cell)))
            out = out_dir / f"{role}-{col}.png"
            sprite.save(out, optimize=True)
            written.append(out)

    farmer_src = out_dir / "farmer-sheet-ai3d-v1.png"
    if farmer_src.exists():
        farmers = Image.open(farmer_src).convert("RGB")
        fw, fh = farmers.size
        for col in range(COLS):
            x0 = round(col * fw / COLS)
            x1 = round((col + 1) * fw / COLS)
            cell = farmers.crop((x0, 0, x1, fh))
            sprite = trim_and_fit(keep_largest_component(alpha_from_magenta(cell)))
            out = out_dir / f"farmer-{col}.png"
            sprite.save(out, optimize=True)
            written.append(out)

    print(f"Sliced {len(written)} AI-generated 3D meeple sprites from {src}")


if __name__ == "__main__":
    main()
