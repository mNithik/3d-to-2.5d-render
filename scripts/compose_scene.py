#!/usr/bin/env python3
"""
Compose MegaKit glTF pieces into one scene — no Blender required.

Uses trimesh to load, translate, and merge modules on the kit's 3 m grid,
then export a single glTF you can bake with bake_megakit.py.

Example (bodega storefront preset):
  py -3.11 scripts/compose_scene.py --preset bodega_corner --out assets-source/composed/bodega_corner
  py -3.11 scripts/bake_megakit.py --model assets-source/composed/bodega_corner/scene.gltf --out output/sprites/raw --role tile_bodega
"""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

import numpy as np
import trimesh

GLTF_PREFIX = "Exports/glTF (Godot)/"
TEXTURE_PREFIX = "Textures/"
GRID_SPACING = 3.0  # MegaKit modules snap on 3 m


# stem -> offset in grid units (x, y, z) before baking
PRESETS: dict[str, list[tuple[str, tuple[float, float, float]]]] = {
    "bodega_corner": [
        ("Brick_Plain_3", (0, 0, 0)),
        ("Brick_Plain_3", (1, 0, 0)),
        ("Door_1", (0.5, 0, 0)),
        ("Brick_TopTrim", (0, 0, 0)),
        ("Brick_TopTrim", (1, 0, 0)),
        ("Roof_2x2", (0.25, 0, -0.25)),
    ],
    "alley_wall": [
        ("Brick_Plain_1", (0, 0, 0)),
        ("Brick_Plain_1", (1, 0, 0)),
        ("Brick_Window_Trim", (0.5, 0.5, 0)),
    ],
}


def extract_piece(zip_path: Path, stem: str, cache: Path) -> Path:
    piece_dir = cache / stem
    piece_dir.mkdir(parents=True, exist_ok=True)
    gltf_path = piece_dir / f"{stem}.gltf"
    if gltf_path.exists():
        return gltf_path

    tex_dir = cache / "_textures"
    tex_dir.mkdir(exist_ok=True)

    with zipfile.ZipFile(zip_path) as zf:
        names = set(zf.namelist())
        for ext in (".gltf", ".bin"):
            src = f"{GLTF_PREFIX}{stem}{ext}"
            if src not in names:
                raise FileNotFoundError(f"{src} not in zip")
            (piece_dir / f"{stem}{ext}").write_bytes(zf.read(src))

        gltf = json.loads((piece_dir / f"{stem}.gltf").read_text(encoding="utf-8"))
        for image in gltf.get("images", []):
            uri = image.get("uri")
            if not uri or uri.startswith("data:"):
                continue
            tex_src = tex_dir / uri
            if not tex_src.exists():
                src_tex = f"{TEXTURE_PREFIX}{uri}"
                if src_tex in names:
                    tex_src.write_bytes(zf.read(src_tex))
            dest = piece_dir / uri
            if not dest.exists() and tex_src.exists():
                dest.write_bytes(tex_src.read_bytes())

    return gltf_path


def load_piece(gltf_path: Path) -> trimesh.Scene:
    loaded = trimesh.load(gltf_path, force="scene")
    if isinstance(loaded, trimesh.Trimesh):
        scene = trimesh.Scene()
        scene.add_geometry(loaded)
        return scene
    return loaded


def place_piece(
    scene: trimesh.Scene,
    piece: trimesh.Scene,
    grid_pos: tuple[float, float, float],
) -> None:
    gx, gy, gz = grid_pos
    transform = np.eye(4)
    transform[:3, 3] = [gx * GRID_SPACING, gy, gz * GRID_SPACING]
    scene.add_geometry(piece, transform=transform)


def compose(preset: str, zip_path: Path, out_dir: Path, cache: Path) -> Path:
    if preset not in PRESETS:
        raise SystemExit(f"Unknown preset {preset}. Choose: {', '.join(PRESETS)}")

    out_dir.mkdir(parents=True, exist_ok=True)
    combined = trimesh.Scene()

    for stem, grid_pos in PRESETS[preset]:
        gltf = extract_piece(zip_path, stem, cache)
        piece = load_piece(gltf)
        place_piece(combined, piece, grid_pos)
        print(f"  + {stem} @ {grid_pos}")

    out_gltf = out_dir / "scene.gltf"
    combined.export(str(out_gltf))
    print(f"exported {out_gltf}")
    return out_gltf


def main() -> int:
    parser = argparse.ArgumentParser(description="Compose MegaKit pieces without Blender")
    parser.add_argument("--preset", required=True, choices=sorted(PRESETS))
    parser.add_argument(
        "--zip",
        type=Path,
        default=Path("Downtown City MegaKit[Standard].zip"),
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("assets-source/composed"),
    )
    parser.add_argument("--cache", type=Path, default=Path("assets-source/_pieces"))
    args = parser.parse_args()

    out_dir = args.out / args.preset
    compose(args.preset, args.zip, out_dir, args.cache)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
