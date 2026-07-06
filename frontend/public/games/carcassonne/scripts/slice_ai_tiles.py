#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from PIL import Image


NAMES = [
    "mon", "monR", "cityAll", "city1", "city2oP", "city2o",
    "city2s", "city2a", "city2aP", "city3", "city3P", "city3R",
    "city3RP", "cityRd", "cityCv1", "cityCv2", "cityT", "city2aR",
    "city2aRP", "roadS", "roadC", "roadT", "roadX", "field",
]
COLS = 6
ROWS = 4
OUT_SIZE = 256


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "assets" / "tiles" / "carcassonne-tile-atlas-ai3d-v1.png"
    out_dir = root / "assets" / "tiles"
    if not src.exists():
        raise SystemExit(f"Missing source atlas: {src}")

    atlas = Image.open(src).convert("RGBA")
    w, h = atlas.size
    written = []
    for i, name in enumerate(NAMES):
        col = i % COLS
        row = i // COLS
        x0 = round(col * w / COLS)
        x1 = round((col + 1) * w / COLS)
        y0 = round(row * h / ROWS)
        y1 = round((row + 1) * h / ROWS)
        tile = atlas.crop((x0, y0, x1, y1)).resize((OUT_SIZE, OUT_SIZE), Image.Resampling.LANCZOS)
        if name == "roadC":
            tile = tile.rotate(-90, expand=False)
        out = out_dir / f"{name}.png"
        tile.save(out, optimize=True)
        written.append(out)

    print(f"Sliced {len(written)} AI-generated 3D tiles from {src}")


if __name__ == "__main__":
    main()
