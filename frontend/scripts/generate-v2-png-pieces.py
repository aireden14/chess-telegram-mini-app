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
EMOJI_FONT_PATH = Path("/System/Library/Fonts/Apple Color Emoji.ttc")

PIECES = {
    "K": "♚",
    "Q": "♛",
    "R": "♜",
    "B": "♝",
    "N": "♞",
    "P": "♟",
}

EMOJI_PIECES = {
    "K": "👑",
    "Q": "👸",
    "R": "🏰",
    "B": "🐘",
    "N": "🐴",
    "P": {"w": "♟️", "b": "♟️"},
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
    "classic-black": {
        "w": {
            "glow": (0, 0, 0, 86),
            "outer": (7, 10, 18, 255),
            "mid": (112, 120, 138, 255),
            "top": (255, 255, 255),
            "bottom": (214, 218, 228),
            "highlight": 34,
        },
        "b": {
            "glow": (255, 255, 255, 112),
            "outer": (255, 255, 255, 255),
            "mid": (146, 154, 174, 255),
            "top": (55, 59, 70),
            "bottom": (0, 0, 0),
            "highlight": 24,
        },
    },
}


def get_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_PATHS:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise RuntimeError("No chess-capable font found")


def get_emoji_font() -> ImageFont.FreeTypeFont:
    if not EMOJI_FONT_PATH.exists():
        raise RuntimeError("Apple Color Emoji font not found")
    return ImageFont.truetype(str(EMOJI_FONT_PATH), 160)


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


def render_emoji_piece(symbol: str, color: str) -> Image.Image:
    font = get_emoji_font()
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    is_pawn = symbol.startswith("♟")

    if is_pawn and color == "b":
        badge_top = (155, 241, 255)
        badge_bottom = (83, 140, 255)
    else:
        badge_top = (255, 238, 120) if color == "w" else (204, 130, 255)
        badge_bottom = (244, 145, 24) if color == "w" else (50, 20, 122)
    outer = (104, 44, 0, 255) if color == "w" else (238, 250, 255, 255)
    inner = (255, 250, 204, 255) if color == "w" else (91, 232, 255, 255)

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse((74, 86, 438, 450), fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    img.alpha_composite(shadow, (0, 14))

    outer_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    outer_draw = ImageDraw.Draw(outer_layer)
    outer_draw.ellipse((54, 54, 458, 458), fill=outer)
    img.alpha_composite(outer_layer)

    ring_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ring_draw = ImageDraw.Draw(ring_layer)
    ring_draw.ellipse((78, 78, 434, 434), fill=inner)
    img.alpha_composite(ring_layer)

    badge = vertical_gradient(badge_top, badge_bottom)
    badge_mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(badge_mask).ellipse((96, 96, 416, 416), fill=255)
    img.alpha_composite(Image.composite(badge, Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)), badge_mask))

    shine = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    shine_draw = ImageDraw.Draw(shine)
    shine_draw.ellipse((132, 106, 306, 214), fill=(255, 255, 255, 64))
    img.alpha_composite(shine.filter(ImageFilter.GaussianBlur(4)))

    if is_pawn:
        pawn_halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        pawn_halo_draw = ImageDraw.Draw(pawn_halo)
        pawn_halo_draw.ellipse((132, 132, 380, 388), fill=(255, 255, 255, 112))
        img.alpha_composite(pawn_halo.filter(ImageFilter.GaussianBlur(6)))

    emoji_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(emoji_layer)
    bbox = draw.textbbox((0, 0), symbol, font=font, embedded_color=True)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    x = (SIZE - width) / 2 - bbox[0]
    y = (SIZE - height) / 2 - bbox[1] - 10
    draw.text((x, y), symbol, font=font, embedded_color=True)
    emoji_layer = emoji_layer.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    img.alpha_composite(emoji_layer)

    return img


def main() -> None:
    for set_name, palettes in PIECE_SETS.items():
        out_dir = OUT_ROOT / set_name
        out_dir.mkdir(parents=True, exist_ok=True)
        for color in ("w", "b"):
            for name, symbol in PIECES.items():
                render_piece(symbol, color, palettes[color]).save(out_dir / f"{color}{name}.png")

    emoji_dir = OUT_ROOT / "emoji-png"
    emoji_dir.mkdir(parents=True, exist_ok=True)
    for color in ("w", "b"):
        for name, symbol in EMOJI_PIECES.items():
            emoji = symbol[color] if isinstance(symbol, dict) else symbol
            render_emoji_piece(emoji, color).save(emoji_dir / f"{color}{name}.png")


if __name__ == "__main__":
    main()
