#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "public" / "pieces"
SIZE = 512
FONT_PATHS = [
    Path("/System/Library/Fonts/Apple Symbols.ttf"),
    Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    Path("/System/Library/Fonts/Symbol.ttf"),
]

PIECES = {
    "K": "♚",
    "Q": "♛",
    "R": "♜",
    "B": "♝",
    "N": "♞",
    "P": "♟",
}

PIECE_SETS = {
    "v2-png": {
        "w": {
            "glow": (49, 87, 246, 96),
            "outer": (8, 24, 91, 255),
            "mid": (168, 201, 255, 255),
            "top": (255, 255, 255),
            "bottom": (199, 218, 255),
            "highlight": 46,
        },
        "b": {
            "glow": (255, 255, 255, 116),
            "outer": (245, 250, 255, 255),
            "mid": (90, 159, 255, 255),
            "top": (78, 111, 255),
            "bottom": (6, 18, 86),
            "highlight": 36,
        },
    },
    "emoji-png": {
        "w": {
            "glow": (255, 187, 51, 108),
            "outer": (96, 42, 0, 255),
            "mid": (255, 246, 178, 255),
            "top": (255, 236, 91),
            "bottom": (245, 128, 31),
            "highlight": 72,
        },
        "b": {
            "glow": (147, 197, 253, 120),
            "outer": (250, 252, 255, 255),
            "mid": (103, 232, 249, 255),
            "top": (190, 92, 255),
            "bottom": (48, 16, 110),
            "highlight": 52,
        },
    },
}


def get_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_PATHS:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise RuntimeError("No chess-capable font found")


def text_mask(symbol: str, font: ImageFont.FreeTypeFont, stroke_width: int = 0) -> Image.Image:
    mask = Image.new("L", (SIZE, SIZE), 0)
    draw = ImageDraw.Draw(mask)
    bbox = draw.textbbox((0, 0), symbol, font=font, stroke_width=stroke_width)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    x = (SIZE - width) / 2 - bbox[0]
    y = (SIZE - height) / 2 - bbox[1] + SIZE * 0.015
    draw.text((x, y), symbol, font=font, fill=255, stroke_width=stroke_width, stroke_fill=255)
    return mask


def vertical_gradient(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    for y in range(SIZE):
        t = y / max(1, SIZE - 1)
        color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(SIZE):
            px[x, y] = (*color, 255)
    return img


def paste_colored(base: Image.Image, mask: Image.Image, color: tuple[int, int, int, int]) -> None:
    layer = Image.new("RGBA", (SIZE, SIZE), color)
    base.alpha_composite(Image.composite(layer, Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)), mask))


def render_piece(symbol: str, color: str, palette: dict[str, tuple[int, ...] | int]) -> Image.Image:
    font = get_font(350 if symbol != "♟" else 365)
    fill_mask = text_mask(symbol, font, 0)
    outer_mask = text_mask(symbol, font, 22)
    mid_mask = text_mask(symbol, font, 11)

    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    shadow_mask = outer_mask.filter(ImageFilter.GaussianBlur(18))
    paste_colored(shadow, shadow_mask, (4, 12, 56, 92))
    img.alpha_composite(shadow, (0, 18))

    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_mask = outer_mask.filter(ImageFilter.GaussianBlur(10))
    paste_colored(glow, glow_mask, palette["glow"])  # type: ignore[arg-type]
    paste_colored(img, outer_mask, palette["outer"])  # type: ignore[arg-type]
    paste_colored(img, mid_mask, palette["mid"])  # type: ignore[arg-type]
    gradient = vertical_gradient(palette["top"], palette["bottom"])  # type: ignore[arg-type]
    img.alpha_composite(glow)

    img.alpha_composite(Image.composite(gradient, Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)), fill_mask))

    highlight = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    highlight_mask = fill_mask.crop((0, 0, SIZE, int(SIZE * 0.45))).filter(ImageFilter.GaussianBlur(1))
    top = Image.new("L", (SIZE, SIZE), 0)
    top.paste(highlight_mask, (0, 0))
    paste_colored(highlight, top, (255, 255, 255, int(palette["highlight"])))
    img.alpha_composite(highlight)

    return img


def main() -> None:
    for set_name, palettes in PIECE_SETS.items():
        out_dir = OUT_ROOT / set_name
        out_dir.mkdir(parents=True, exist_ok=True)
        for color in ("w", "b"):
            for name, symbol in PIECES.items():
                render_piece(symbol, color, palettes[color]).save(out_dir / f"{color}{name}.png")


if __name__ == "__main__":
    main()
