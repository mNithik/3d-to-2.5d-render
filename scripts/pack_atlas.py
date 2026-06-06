#!/usr/bin/env python3
"""Pack baked MegaKit PNG sprites into a Phaser texture atlas."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

FRAME_MAP: dict[str, str] = {
    "tile_street": "tile_street",
    "tile_sidewalk": "tile_sidewalk",
    "tile_bodega": "tile_bodega",
    "tile_alley": "tile_alley",
    "tile_building_medium": "tile_building_medium",
    "tile_building_large": "tile_building_large",
    "tree": "tree",
    "prop_bollard": "prop_bollard",
    "prop_manhole": "prop_manhole",
    "pickup_spawn": "pickup_spawn",
}

FRAME_W = 128
FRAME_H = 256
COLS = 4


ANCHOR_Y = 0.85
FLOORS = {"tile_street", "tile_sidewalk", "tile_alley"}
# Floor diamond width as a fraction of the frame; the client oversizes it to
# overlap neighbours so the ground tiles seamlessly (no black gaps).
FLOOR_DIAMOND_W = 0.92


def fit_object(img: Image.Image, fw: int = FRAME_W, fh: int = FRAME_H) -> Image.Image:
    """Tall objects (buildings, trees, props): foot-anchored at 85%, keep aspect."""
    canvas = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    anchor_x = fw // 2
    anchor_y = int(fh * ANCHOR_Y)
    scale = min(fw * 0.82 / img.width, fh * 0.9 / img.height)
    new_size = (max(1, int(img.width * scale)), max(1, int(img.height * scale)))
    resized = img.resize(new_size, Image.Resampling.LANCZOS)
    paste_x = anchor_x - new_size[0] // 2
    paste_y = anchor_y - new_size[1]
    canvas.paste(resized, (paste_x, paste_y), resized)
    return canvas


def fit_floor(img: Image.Image, fw: int = FRAME_W, fh: int = FRAME_H) -> Image.Image:
    """Ground tiles: diamond CENTER pinned to the (0.5, 0.85) anchor so the
    client's center-of-cell placement tessellates the iso grid."""
    bbox = img.getbbox() or (0, 0, img.width, img.height)
    cw = bbox[2] - bbox[0]
    ch = bbox[3] - bbox[1]
    scale = (fw * FLOOR_DIAMOND_W) / cw
    new_size = (max(1, int(img.width * scale)), max(1, int(img.height * scale)))
    resized = img.resize(new_size, Image.Resampling.LANCZOS)
    # Content centre in the resized image:
    ccx = (bbox[0] + bbox[2]) / 2 * scale
    ccy = (bbox[1] + bbox[3]) / 2 * scale
    canvas = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    paste_x = int(fw / 2 - ccx)
    paste_y = int(fh * ANCHOR_Y - ccy)
    canvas.paste(resized, (paste_x, paste_y), resized)
    return canvas


def pack(raw_dir: Path, out_png: Path, out_json: Path) -> None:
    frames_data: dict[str, dict] = {}
    images: list[tuple[str, Image.Image]] = []

    for key, stem in FRAME_MAP.items():
        src = raw_dir / f"{stem}.png"
        if not src.exists():
            print(f"skip missing {src.name}")
            continue
        raw = Image.open(src).convert("RGBA")
        img = fit_floor(raw) if key in FLOORS else fit_object(raw)
        images.append((key, img))

    if not images:
        raise SystemExit(f"No sprites found in {raw_dir}")

    rows = (len(images) + COLS - 1) // COLS
    atlas = Image.new("RGBA", (COLS * FRAME_W, rows * FRAME_H), (0, 0, 0, 0))

    for idx, (key, img) in enumerate(images):
        col = idx % COLS
        row = idx // COLS
        x = col * FRAME_W
        y = row * FRAME_H
        atlas.paste(img, (x, y), img)
        frames_data[key] = {
            "frame": {"x": x, "y": y, "w": FRAME_W, "h": FRAME_H},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_W, "h": FRAME_H},
            "sourceSize": {"w": FRAME_W, "h": FRAME_H},
            "pivot": {"x": 0.5, "y": 0.85},
        }

    out_png.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(out_png, optimize=True)
    meta = {
        "app": "megakit-iso-pack",
        "version": "1.0",
        "image": out_png.name,
        "format": "RGBA8888",
        "size": {"w": atlas.width, "h": atlas.height},
        "scale": "1",
    }
    out_json.write_text(
        json.dumps({"frames": frames_data, "meta": meta}, indent=2),
        encoding="utf-8",
    )
    print(f"atlas {out_png} ({len(images)} frames)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", type=Path, default=Path("output/sprites/raw"))
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("phaser-demo/public/assets"),
    )
    args = parser.parse_args()
    pack(args.raw, args.out / "bodega-atlas.png", args.out / "bodega-atlas.json")
    pack(args.raw, args.out / "city-atlas.png", args.out / "city-atlas.json")


if __name__ == "__main__":
    main()
