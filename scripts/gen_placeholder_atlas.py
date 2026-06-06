#!/usr/bin/env python3
"""Generate placeholder iso tile + building PNGs and a Phaser atlas.

Replaced by Blender ortho bakes in Leg 8. Geometry is sized so that after the
client's 0.5 draw scale a full-cell diamond is exactly TILE_W x TILE_H (64x32).
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "phaser-demo" / "public" / "assets"

FRAME_W = 128
FRAME_H = 256
COLS = 4
ORIGIN_Y = round(FRAME_H * 0.85)  # foot anchor, matches SPRITE_ORIGIN.y

# Full-cell iso diamond inside the frame (becomes 64x32 after 0.5 client scale).
HW = FRAME_W // 2  # 64
HH = HW // 2       # 32
CX = FRAME_W // 2

RGBA = tuple[int, int, int, int]

# Floor tile fills: fill, edge
FLOOR_STYLES: dict[str, tuple[RGBA, RGBA]] = {
    "tile_street": ((42, 47, 58, 255), (54, 60, 73, 255)),
    "tile_sidewalk": ((70, 75, 86, 255), (92, 98, 110, 255)),
    "tile_alley": ((23, 26, 32, 255), (35, 39, 47, 255)),
    "prop_bollard": ((42, 47, 58, 255), (54, 60, 73, 255)),
    "prop_manhole": ((42, 47, 58, 255), (54, 60, 73, 255)),
    "pickup_spawn": ((42, 47, 58, 255), (54, 60, 73, 255)),
}

# Building boxes: height(px in frame), roof, right face, left face, window
BUILDING_STYLES: dict[str, dict] = {
    "tile_bodega": {
        "height": 78,
        "roof": (245, 197, 24, 255),
        "right": (210, 59, 59, 255),
        "left": (158, 42, 42, 255),
        "window": (255, 233, 150, 255),
    },
    "tile_building_medium": {
        "height": 150,
        "roof": (150, 96, 80, 255),
        "right": (181, 86, 63, 255),
        "left": (138, 63, 46, 255),
        "window": (120, 200, 220, 255),
    },
    "tile_building_large": {
        "height": 188,
        "roof": (108, 124, 150, 255),
        "right": (132, 150, 178, 255),
        "left": (96, 112, 138, 255),
        "window": (180, 220, 245, 255),
    },
}

FRAME_ORDER = [
    "tile_street",
    "tile_sidewalk",
    "tile_bodega",
    "tile_alley",
    "tile_building_medium",
    "tile_building_large",
    "tree",
    "prop_bollard",
    "prop_manhole",
    "pickup_spawn",
]


def diamond(cx: int, cy: int, hw: int, hh: int) -> list[tuple[int, int]]:
    return [(cx, cy - hh), (cx + hw, cy), (cx, cy + hh), (cx - hw, cy)]


def lerp(a: tuple[int, int], b: tuple[int, int], t: float) -> tuple[float, float]:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def draw_face_windows(
    draw: ImageDraw.ImageDraw,
    top_a: tuple[int, int],
    top_b: tuple[int, int],
    bot_a: tuple[int, int],
    bot_b: tuple[int, int],
    color: RGBA,
    cols: int,
    rows: int,
) -> None:
    """Tile small window quads across a parallelogram face."""
    for r in range(rows):
        tv0 = (r + 0.18) / rows
        tv1 = (r + 0.72) / rows
        for c in range(cols):
            tu0 = (c + 0.22) / cols
            tu1 = (c + 0.78) / cols
            # bilinear across the face
            def pt(tu: float, tv: float) -> tuple[float, float]:
                top = lerp(top_a, top_b, tu)
                bot = lerp(bot_a, bot_b, tu)
                return lerp(top, bot, tv)

            quad = [pt(tu0, tv0), pt(tu1, tv0), pt(tu1, tv1), pt(tu0, tv1)]
            draw.polygon(quad, fill=color)


def render_building(key: str) -> Image.Image:
    s = BUILDING_STYLES[key]
    h = s["height"]
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cy = ORIGIN_Y

    base_top = (CX, cy - HH)
    base_right = (CX + HW, cy)
    base_bot = (CX, cy + HH)
    base_left = (CX - HW, cy)

    top_top = (CX, cy - HH - h)
    top_right = (CX + HW, cy - h)
    top_bot = (CX, cy + HH - h)
    top_left = (CX - HW, cy - h)

    # right face (faces camera-right, brighter)
    draw.polygon([base_right, base_bot, top_bot, top_right], fill=s["right"])
    draw_face_windows(
        draw, top_right, top_bot, base_right, base_bot, s["window"], cols=3, rows=max(2, h // 38)
    )
    # left face (darker)
    draw.polygon([base_left, base_bot, top_bot, top_left], fill=s["left"])
    draw_face_windows(
        draw, top_left, top_bot, base_left, base_bot, s["window"], cols=3, rows=max(2, h // 38)
    )
    # roof
    draw.polygon([top_top, top_right, top_bot, top_left], fill=s["roof"])

    if key == "tile_bodega":
        # awning lip along the front-right edge
        draw.polygon(
            [base_right, base_bot, (CX, cy + HH - 16), (CX + HW, cy - 16)],
            fill=(245, 197, 24, 255),
        )
    return img


def render_floor(key: str) -> Image.Image:
    fill, edge = FLOOR_STYLES[key]
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cy = ORIGIN_Y
    draw.polygon(diamond(CX, cy, HW, HH), fill=fill, outline=edge)

    if key == "prop_manhole":
        draw.ellipse((CX - 16, cy - 8, CX + 16, cy + 8), fill=(90, 95, 105, 255))
    elif key == "prop_bollard":
        draw.rectangle((CX - 4, cy - 26, CX + 4, cy), fill=(180, 180, 190, 255))
    elif key == "pickup_spawn":
        draw.ellipse((CX - 12, cy - 26, CX + 12, cy - 2), fill=(255, 220, 80, 255))
    return img


def render_tree() -> Image.Image:
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cy = ORIGIN_Y
    draw.ellipse((CX - 22, cy - 8, CX + 22, cy + 8), fill=(0, 0, 0, 60))
    draw.rectangle((CX - 4, cy - 52, CX + 4, cy - 6), fill=(107, 74, 42, 255))
    draw.ellipse((CX - 30, cy - 104, CX + 30, cy - 40), fill=(44, 107, 65, 255))
    draw.ellipse((CX - 20, cy - 116, CX + 16, cy - 70), fill=(63, 143, 91, 255))
    return img


def render_frame(key: str) -> Image.Image:
    if key in BUILDING_STYLES:
        return render_building(key)
    if key == "tree":
        return render_tree()
    return render_floor(key)


def pack() -> None:
    frames_data: dict[str, dict] = {}
    rows = (len(FRAME_ORDER) + COLS - 1) // COLS
    atlas = Image.new("RGBA", (COLS * FRAME_W, rows * FRAME_H), (0, 0, 0, 0))

    for idx, key in enumerate(FRAME_ORDER):
        col = idx % COLS
        row = idx // COLS
        x = col * FRAME_W
        y = row * FRAME_H
        frame_img = render_frame(key)
        atlas.paste(frame_img, (x, y), frame_img)
        frames_data[key] = {
            "frame": {"x": x, "y": y, "w": FRAME_W, "h": FRAME_H},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_W, "h": FRAME_H},
            "sourceSize": {"w": FRAME_W, "h": FRAME_H},
            "pivot": {"x": 0.5, "y": 0.85},
        }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    png_path = OUT_DIR / "bodega-atlas.png"
    json_path = OUT_DIR / "bodega-atlas.json"
    atlas.save(png_path, optimize=True)
    meta = {
        "app": "bodega-blitz-placeholder",
        "version": "1.0",
        "image": "bodega-atlas.png",
        "format": "RGBA8888",
        "size": {"w": atlas.width, "h": atlas.height},
        "scale": "1",
    }
    json_path.write_text(
        json.dumps({"frames": frames_data, "meta": meta}, indent=2),
        encoding="utf-8",
    )
    print(f"wrote {png_path} ({len(FRAME_ORDER)} frames)")


if __name__ == "__main__":
    pack()
