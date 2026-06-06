#!/usr/bin/env python3
"""Extract glTF + textures from Downtown City MegaKit zip for iso baking."""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

# Game role -> MegaKit glTF stem (modular kit pieces for NYC board)
ROLE_MAP: dict[str, str] = {
    "tile_street": "Street_Asphalt_6x6",
    "tile_sidewalk": "Sidewalk_Straight_3m",
    "tile_bodega": "Building_Small_1",
    "tile_alley": "Brick_Plain_1",
    "tile_building_medium": "Building_Medium_2_001",
    "tile_building_large": "Building_Large_2",
    "tree": "Prop_Planter_Single",
    "prop_bollard": "Prop_Bollard",
    "prop_manhole": "Prop_ManholeCover",
    "pickup_spawn": "Entrance_Concrete_2x1",
}

GLTF_PREFIX = "Exports/glTF (Godot)/"
TEXTURE_PREFIX = "Textures/"


def extract_role(zf: zipfile.ZipFile, role: str, stem: str, out_dir: Path, tex_cache: Path) -> None:
    role_dir = out_dir / role
    role_dir.mkdir(parents=True, exist_ok=True)
    names = set(zf.namelist())

    for ext in (".gltf", ".bin"):
        src = f"{GLTF_PREFIX}{stem}{ext}"
        if src not in names:
            raise FileNotFoundError(f"Missing {src} in zip")
        (role_dir / f"{stem}{ext}").write_bytes(zf.read(src))

    gltf_path = role_dir / f"{stem}.gltf"
    gltf = json.loads(gltf_path.read_text(encoding="utf-8"))
    for image in gltf.get("images", []):
        uri = image.get("uri")
        if not uri or uri.startswith("data:"):
            continue
        src_tex = tex_cache / uri
        if not src_tex.exists():
            raise FileNotFoundError(f"Texture {uri} missing for {role}")
        dest = role_dir / uri
        if not dest.exists():
            dest.write_bytes(src_tex.read_bytes())


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract MegaKit glTF assets by game role")
    parser.add_argument(
        "--zip",
        type=Path,
        default=Path("Downtown City MegaKit[Standard].zip"),
        help="Path to MegaKit zip",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("assets-source/megakit"),
        help="Output directory for per-role glTF folders",
    )
    args = parser.parse_args()

    if not args.zip.exists():
        raise SystemExit(f"Zip not found: {args.zip}")

    tex_cache = args.out / "_textures"
    tex_cache.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(args.zip) as zf:
        for name in zf.namelist():
            if name.startswith(TEXTURE_PREFIX) and name.endswith(".png"):
                dest = tex_cache / Path(name).name
                if not dest.exists():
                    dest.write_bytes(zf.read(name))

        for role, stem in ROLE_MAP.items():
            extract_role(zf, role, stem, args.out, tex_cache)
            print(f"extracted {role} <- {stem}")

    manifest = args.out / "manifest.json"
    manifest.write_text(json.dumps({"roles": ROLE_MAP}, indent=2), encoding="utf-8")
    print(f"wrote {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
