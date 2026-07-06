#!/usr/bin/env python3
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


SIZE = 256
SCALE = 4
W = SIZE * SCALE
SIDES = ["N", "E", "S", "W"]
MID = {"N": (128, 0), "E": (256, 128), "S": (128, 256), "W": (0, 128)}

RAW = [
    ("mon", "ffff", {"monastery": True}),
    ("monR", "ffrf", {"monastery": True, "roads": [["S"]]}),
    ("cityAll", "cccc", {"cities": [["N", "E", "S", "W"]], "pennant": True}),
    ("city1", "cfff", {"cities": [["N"]]}),
    ("city2oP", "cfcf", {"cities": [["N", "S"]], "pennant": True}),
    ("city2o", "cfcf", {"cities": [["N", "S"]]}),
    ("city2s", "cfcf", {"cities": [["N"], ["S"]]}),
    ("city2a", "ccff", {"cities": [["N", "E"]]}),
    ("city2aP", "ccff", {"cities": [["N", "E"]], "pennant": True}),
    ("city3", "ccfc", {"cities": [["N", "E", "W"]]}),
    ("city3P", "ccfc", {"cities": [["N", "E", "W"]], "pennant": True}),
    ("city3R", "ccrc", {"cities": [["N", "E", "W"]], "roads": [["S"]]}),
    ("city3RP", "ccrc", {"cities": [["N", "E", "W"]], "roads": [["S"]], "pennant": True}),
    ("cityRd", "rcrf", {"cities": [["E"]], "roads": [["N", "S"]]}),
    ("cityCv1", "crrf", {"cities": [["N"]], "roads": [["E", "S"]]}),
    ("cityCv2", "cfrr", {"cities": [["N"]], "roads": [["S", "W"]]}),
    ("cityT", "crrr", {"cities": [["N"]], "roads": [["E"], ["S"], ["W"]]}),
    ("city2aR", "ccrr", {"cities": [["N", "E"]], "roads": [["S", "W"]]}),
    ("city2aRP", "ccrr", {"cities": [["N", "E"]], "roads": [["S", "W"]], "pennant": True}),
    ("roadS", "rfrf", {"roads": [["N", "S"]]}),
    ("roadC", "ffrr", {"roads": [["S", "W"]]}),
    ("roadT", "frrr", {"roads": [["E"], ["S"], ["W"]]}),
    ("roadX", "rrrr", {"roads": [["N"], ["E"], ["S"], ["W"]]}),
]


def s(v: float) -> int:
    return int(round(v * SCALE))


def pt(p: tuple[float, float]) -> tuple[int, int]:
    return (s(p[0]), s(p[1]))


def box(b: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
    return (s(b[0]), s(b[1]), s(b[2]), s(b[3]))


def seeded(name: str) -> random.Random:
    return random.Random(sum((i + 1) * ord(c) for i, c in enumerate(name)) + 1729)


def draw_line_round(draw: ImageDraw.ImageDraw, points, fill, width: float) -> None:
    points = [pt(p) for p in points]
    draw.line(points, fill=fill, width=s(width), joint="curve")
    r = s(width) // 2
    for x, y in points:
        draw.ellipse((x - r, y - r, x + r, y + r), fill=fill)


def base_grass(name: str) -> Image.Image:
    rng = seeded(name)
    img = Image.new("RGB", (W, W), "#4f8f3a")
    d = ImageDraw.Draw(img)

    for _ in range(1500):
        x, y = rng.randrange(W), rng.randrange(W)
        c = rng.choice(["#3f7930", "#57953a", "#67a846", "#82b85a", "#2f6128", "#8ec466"])
        r = rng.randrange(s(1), s(5))
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)

    for _ in range(260):
        x, y = rng.randrange(W), rng.randrange(W)
        length = rng.randrange(s(4), s(13))
        angle = rng.random() * math.tau
        c = rng.choice(["#2f6b2b", "#4f8c33", "#9bd16d", "#263f25"])
        d.line((x, y, x + math.cos(angle) * length, y + math.sin(angle) * length), fill=c, width=max(1, s(0.8)))

    for _ in range(24):
        x, y = rng.randrange(s(16), s(240)), rng.randrange(s(16), s(240))
        c = rng.choice(["#d7bb55", "#a85743", "#cdd8ff", "#f2e8a8", "#8b6bd6"])
        r = rng.randrange(s(1), s(2))
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)

    for _ in range(10):
        x, y = rng.randrange(s(18), s(238)), rng.randrange(s(18), s(238))
        r = rng.randrange(s(3), s(7))
        d.ellipse((x - r, y - r, x + r, y + r), fill=rng.choice(["#7b8062", "#6c7155", "#8b8f6c"]))

    glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for _ in range(5):
        x, y = rng.randrange(s(20), s(236)), rng.randrange(s(20), s(236))
        r = rng.randrange(s(12), s(26))
        gd.ellipse((x - r, y - r, x + r, y + r), fill=(109, 198, 123, rng.randrange(12, 26)))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

    vignette = Image.new("L", (W, W), 0)
    vd = ImageDraw.Draw(vignette)
    vd.rectangle((0, 0, W, W), fill=0)
    edge = s(10)
    for i in range(edge):
        a = int(90 * (1 - i / edge))
        vd.rectangle((i, i, W - i - 1, W - i - 1), outline=a, width=1)
    dark = Image.new("RGB", (W, W), "#111c19")
    img = Image.composite(dark, img, vignette)
    return img


def road_points(side: str) -> list[tuple[float, float]]:
    mx, my = MID[side]
    if side == "N":
        return [(128, 128), (128, 70), (mx, my)]
    if side == "S":
        return [(128, 128), (128, 186), (mx, my)]
    if side == "E":
        return [(128, 128), (186, 128), (mx, my)]
    return [(128, 128), (70, 128), (mx, my)]


def draw_roads(img: Image.Image, spec: dict, name: str) -> None:
    roads = spec.get("roads", [])
    if not roads:
        return

    mask = Image.new("L", (W, W), 0)
    md = ImageDraw.Draw(mask)
    d = ImageDraw.Draw(img)

    for feature in roads:
        for side in feature:
            draw_line_round(md, road_points(side), 255, 31)

    shadow = Image.new("RGB", (W, W), "#372618")
    img.paste(shadow, mask=mask)

    fill_mask = Image.new("L", (W, W), 0)
    fd = ImageDraw.Draw(fill_mask)
    for feature in roads:
        for side in feature:
            draw_line_round(fd, road_points(side), 255, 21)
    road = Image.new("RGB", (W, W), "#cdbb8e")
    img.paste(road, mask=fill_mask)

    rng = seeded(name + "-road")
    d = ImageDraw.Draw(img)
    for _ in range(360):
        x, y = rng.randrange(W), rng.randrange(W)
        if fill_mask.getpixel((x, y)) < 10:
            continue
        r = rng.randrange(s(1), s(3))
        c = rng.choice(["#a99670", "#e6d6ac", "#947d59", "#d7c79d", "#6f5f46"])
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)

    for feature in roads:
        for side in feature:
            pts = road_points(side)
            for i in range(1, 5):
                t = i / 5
                x = pts[0][0] * (1 - t) + pts[-1][0] * t
                y = pts[0][1] * (1 - t) + pts[-1][1] * t
                if rng.random() < 0.55:
                    d.arc(box((x - 7, y - 4, x + 7, y + 4)), 0, 180, fill="#8d7756", width=s(0.8))

    for feature in roads:
        if len(feature) >= 3:
            d.ellipse(box((110, 110, 146, 146)), fill="#cdbb8e", outline="#4b3321", width=s(2))
            d.ellipse(box((122, 122, 134, 134)), fill="#8e7855")

    for feature in roads:
        if len(feature) == 1 and rng.random() < 0.85:
            side = feature[0]
            lx, ly = {"N": (105, 72), "S": (151, 184), "E": (184, 105), "W": (72, 151)}[side]
            draw_lamp(d, lx, ly)


def add_city_port(draw: ImageDraw.ImageDraw, side: str) -> None:
    ports = {
        "N": [(28, -8), (228, -8), (202, 73), (54, 73)],
        "S": [(28, 264), (228, 264), (202, 183), (54, 183)],
        "E": [(264, 28), (264, 228), (183, 202), (183, 54)],
        "W": [(-8, 28), (-8, 228), (73, 202), (73, 54)],
    }
    draw.polygon([pt(p) for p in ports[side]], fill=255)


def city_mask(sides: list[str]) -> Image.Image:
    mask = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(mask)
    ss = set(sides)

    if len(ss) == 4:
        d.rounded_rectangle(box((10, 10, 246, 246)), radius=s(18), fill=255)
        return mask

    for side in sides:
        add_city_port(d, side)

    if len(ss) >= 2:
        if ss == {"N", "S"}:
            d.rounded_rectangle(box((72, -8, 184, 264)), radius=s(18), fill=255)
        elif ss == {"E", "W"}:
            d.rounded_rectangle(box((-8, 72, 264, 184)), radius=s(18), fill=255)
        elif len(ss) == 3:
            d.ellipse(box((42, 42, 214, 214)), fill=255)
            if "N" in ss:
                d.rectangle(box((74, -8, 182, 132)), fill=255)
            if "S" in ss:
                d.rectangle(box((74, 124, 182, 264)), fill=255)
            if "E" in ss:
                d.rectangle(box((124, 74, 264, 182)), fill=255)
            if "W" in ss:
                d.rectangle(box((-8, 74, 132, 182)), fill=255)
        else:
            d.ellipse(box((56, 56, 200, 200)), fill=255)
            for side in sides:
                if side == "N":
                    d.rectangle(box((78, -8, 178, 128)), fill=255)
                elif side == "S":
                    d.rectangle(box((78, 128, 178, 264)), fill=255)
                elif side == "E":
                    d.rectangle(box((128, 78, 264, 178)), fill=255)
                elif side == "W":
                    d.rectangle(box((-8, 78, 128, 178)), fill=255)
    return mask


def feature_center(sides: list[str]) -> tuple[float, float]:
    x = sum(MID[s][0] for s in sides) / len(sides)
    y = sum(MID[s][1] for s in sides) / len(sides)
    return ((x + 128) / 2, (y + 128) / 2)


def draw_shield(draw: ImageDraw.ImageDraw, center: tuple[float, float]) -> None:
    x, y = center
    pts = [(x - 13, y - 17), (x + 13, y - 17), (x + 11, y + 3), (x, y + 18), (x - 11, y + 3)]
    draw.polygon([pt(p) for p in pts], fill="#143e89", outline="#0c1328")
    draw.line([pt((x, y - 12)), pt((x, y + 9))], fill="#f5cf64", width=s(3))
    draw.line([pt((x - 7, y - 4)), pt((x + 7, y - 4))], fill="#f5cf64", width=s(3))


def draw_tower(draw: ImageDraw.ImageDraw, x: float, y: float, side: str) -> None:
    draw.ellipse(box((x - 11, y - 11, x + 11, y + 11)), fill="#827c72", outline="#251b18", width=s(1.5))
    draw.ellipse(box((x - 7, y - 7, x + 7, y + 7)), fill="#b9a47a")
    if side in {"N", "S"}:
        roof = [(x - 13, y - 2), (x, y - 23), (x + 13, y - 2)]
    elif side == "E":
        roof = [(x - 2, y - 13), (x + 23, y), (x - 2, y + 13)]
    else:
        roof = [(x + 2, y - 13), (x - 23, y), (x + 2, y + 13)]
    draw.polygon([pt(p) for p in roof], fill="#0e274f", outline="#07101f")
    draw.ellipse(box((x - 2.2, y - 2.2, x + 2.2, y + 2.2)), fill="#ffd56d")


def draw_lamp(draw: ImageDraw.ImageDraw, x: float, y: float) -> None:
    draw.ellipse(box((x - 9, y - 9, x + 9, y + 9)), fill="#f3c661")
    draw.ellipse(box((x - 5, y - 5, x + 5, y + 5)), fill="#fff1a8")
    draw.line([pt((x, y + 2)), pt((x, y + 16))], fill="#372618", width=s(1.4))


def draw_rooftop(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, rng: random.Random) -> None:
    shadow = s(2)
    draw.rounded_rectangle((x - w // 2 + shadow, y - h // 2 + shadow, x + w // 2 + shadow, y + h // 2 + shadow), radius=s(1.5), fill="#2b201b")
    wall = rng.choice(["#b69b75", "#c5aa82", "#9d8161", "#d1b783"])
    roof = rng.choice(["#192c4f", "#233b69", "#6d2d25", "#8b372b", "#2b2037"])
    draw.rounded_rectangle((x - w // 2, y - h // 2, x + w // 2, y + h // 2), radius=s(1.4), fill=wall, outline="#574535")
    draw.polygon([(x - w // 2 - s(2), y - h // 2), (x, y - h // 2 - s(8)), (x + w // 2 + s(2), y - h // 2)], fill=roof, outline="#171018")
    if rng.random() < 0.72:
        draw.rectangle((x - s(2), y - s(1), x + s(2), y + s(3)), fill="#ffd977")


def draw_city(img: Image.Image, sides: list[str], pennant: bool, name: str, index: int) -> None:
    mask = city_mask(sides)
    rng = seeded(f"{name}-city-{index}")

    city = Image.new("RGB", (W, W), "#695746")
    cd = ImageDraw.Draw(city)
    for _ in range(1700):
        x, y = rng.randrange(W), rng.randrange(W)
        if mask.getpixel((x, y)) < 10:
            continue
        c = rng.choice(["#5a4a3e", "#76624f", "#887059", "#40362f", "#9b805f"])
        cd.point((x, y), fill=c)
    img.paste(city, mask=mask)

    d = ImageDraw.Draw(img)
    for _ in range(115):
        x, y = rng.randrange(s(26), s(230)), rng.randrange(s(26), s(230))
        if mask.getpixel((x, y)) < 255:
            continue
        w, h = rng.randrange(s(8), s(17)), rng.randrange(s(7), s(15))
        draw_rooftop(d, x, y, w, h, rng)

    edge_wide = ImageChops.difference(mask.filter(ImageFilter.MaxFilter(s(7) | 1)), mask.filter(ImageFilter.MinFilter(s(7) | 1)))
    edge_thin = ImageChops.difference(mask.filter(ImageFilter.MaxFilter(s(3) | 1)), mask.filter(ImageFilter.MinFilter(s(3) | 1)))
    img.paste(Image.new("RGB", (W, W), "#201613"), mask=edge_wide)
    img.paste(Image.new("RGB", (W, W), "#b7a178"), mask=edge_thin)

    for _ in range(45):
        x, y = rng.randrange(s(20), s(236)), rng.randrange(s(20), s(236))
        if edge_thin.getpixel((x, y)) < 10:
            continue
        d.rectangle((x - s(1), y - s(0.5), x + s(1), y + s(0.5)), fill="#6d5b44")

    tower_pos = {
        "N": [(58, 33), (198, 33)],
        "S": [(58, 223), (198, 223)],
        "E": [(223, 58), (223, 198)],
        "W": [(33, 58), (33, 198)],
    }
    for side in sides:
        for x, y in tower_pos[side]:
            draw_tower(d, x, y, side)

    for _ in range(8):
        x, y = rng.randrange(s(36), s(220)), rng.randrange(s(36), s(220))
        if mask.getpixel((x, y)) > 0:
            draw_lamp(d, x / SCALE, y / SCALE)

    if pennant:
        draw_shield(d, feature_center(sides))


def draw_monastery(img: Image.Image, has_road: bool) -> None:
    d = ImageDraw.Draw(img)
    if has_road:
        d.ellipse(box((101, 101, 155, 155)), fill="#afa07a", outline="#3a2a1d", width=s(2))
    d.ellipse(box((82, 82, 174, 180)), fill="#1c241f")
    d.rounded_rectangle(box((89, 111, 167, 173)), radius=s(5), fill="#bfb190", outline="#2a201b", width=s(2))
    d.polygon([pt((83, 113)), pt((128, 74)), pt((173, 113))], fill="#172d57", outline="#090f20")
    d.rectangle(box((111, 70, 145, 125)), fill="#a89678", outline="#2a201b", width=s(2))
    d.polygon([pt((105, 70)), pt((128, 40)), pt((151, 70))], fill="#203c72", outline="#090f20")
    d.rectangle(box((120, 142, 136, 173)), fill="#4a321d")
    d.arc(box((117, 133, 139, 156)), 180, 360, fill="#4a321d", width=s(3))
    for wx in (103, 153):
        d.rectangle(box((wx - 4, 136, wx + 4, 150)), fill="#ffd56d", outline="#5b421f")
    d.line([pt((128, 45)), pt((128, 27))], fill="#f5cf64", width=s(2))
    d.line([pt((119, 36)), pt((137, 36))], fill="#f5cf64", width=s(2))
    draw_lamp(d, 96, 181)
    draw_lamp(d, 160, 181)


def generate_tile(name: str, spec: dict) -> Image.Image:
    img = base_grass(name)
    draw_roads(img, spec, name)
    for i, sides in enumerate(spec.get("cities", [])):
        draw_city(img, sides, bool(spec.get("pennant") and i == 0), name, i)
    if spec.get("monastery"):
        draw_monastery(img, bool(spec.get("roads")))

    d = ImageDraw.Draw(img)
    d.rounded_rectangle(box((2, 2, 254, 254)), radius=s(10), outline="#26331d", width=s(3))
    return img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def make_atlas(paths: list[Path], out: Path) -> None:
    atlas = Image.new("RGB", (6 * SIZE, 4 * SIZE), "#111")
    for i, path in enumerate(paths):
        x, y = (i % 6) * SIZE, (i // 6) * SIZE
        atlas.paste(Image.open(path).convert("RGB"), (x, y))
    atlas.save(out, optimize=True)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out_dir = root / "assets" / "tiles"
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []

    for name, _edges, spec in RAW:
        img = generate_tile(name, spec)
        path = out_dir / f"{name}.png"
        img.save(path, optimize=True)
        paths.append(path)

    field = base_grass("field").resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    fd = ImageDraw.Draw(field)
    fd.rounded_rectangle((2, 2, 254, 254), radius=10, outline="#26331d", width=3)
    field_path = out_dir / "field.png"
    field.save(field_path, optimize=True)
    paths.append(field_path)

    make_atlas(paths, out_dir / "carcassonne-tile-atlas-symmetric-v2.png")
    print(f"Wrote {len(paths)} symmetric tiles to {out_dir}")


if __name__ == "__main__":
    main()
