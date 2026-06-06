#!/usr/bin/env python3
"""Extract MegaKit glTF + textures into three-demo/public/models/city/. Optional GLB export."""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

GLTF_PREFIX = "Exports/glTF (Godot)/"
TEXTURE_PREFIX = "Textures/"

# Assets needed for the playable city board
CITY_PIECES: dict[str, str] = {
    "road": "Street_Asphalt_6x6",
    "road_lane": "Street_2Lane",
    "sidewalk": "Sidewalk_Straight_3m",
    "building_small": "Building_Small_1",
    "building_medium": "Building_Medium_2_001",
    "building_large": "Building_Large_2",
    "wall_brick": "Brick_Plain_1",
    "tree": "Prop_Planter_Single",
    "bollard": "Prop_Bollard",
    "manhole": "Prop_ManholeCover",
}


def extract_piece(zf: zipfile.ZipFile, stem: str, out_dir: Path, tex_cache: Path) -> Path:
    piece_dir = out_dir / stem
    piece_dir.mkdir(parents=True, exist_ok=True)
    names = set(zf.namelist())

    for ext in (".gltf", ".bin"):
        src = f"{GLTF_PREFIX}{stem}{ext}"
        if src not in names:
            raise FileNotFoundError(src)
        (piece_dir / f"{stem}{ext}").write_bytes(zf.read(src))

    gltf_path = piece_dir / f"{stem}.gltf"
    gltf = json.loads(gltf_path.read_text(encoding="utf-8"))
    for image in gltf.get("images", []):
        uri = image.get("uri")
        if not uri or uri.startswith("data:"):
            continue
        src_tex = tex_cache / uri
        if not src_tex.exists():
            zip_tex = f"{TEXTURE_PREFIX}{uri}"
            if zip_tex in names:
                src_tex.write_bytes(zf.read(zip_tex))
        dest = piece_dir / uri
        if src_tex.exists() and not dest.exists():
            dest.write_bytes(src_tex.read_bytes())

    return gltf_path


def to_glb(gltf_path: Path) -> Path:
    import trimesh

    loaded = trimesh.load(gltf_path, force="scene")
    glb_path = gltf_path.with_suffix(".glb")
    if isinstance(loaded, trimesh.Scene):
        loaded.export(str(glb_path))
    else:
        loaded.export(str(glb_path))
    return glb_path


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ZIP = REPO_ROOT / "Downtown City MegaKit[Standard].zip"
DEFAULT_OUT = REPO_ROOT / "three-demo" / "public" / "models" / "city"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--zip",
        type=Path,
        default=DEFAULT_ZIP,
        help=f"MegaKit zip (default: {DEFAULT_ZIP.name} in repo root)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="Output folder for glTF/GLB city pieces",
    )
    parser.add_argument("--glb", action="store_true", help="Also export .glb per piece")
    args = parser.parse_args()

    zip_path = args.zip.resolve()
    out_dir = args.out.resolve()

    if not zip_path.is_file():
        raise SystemExit(
            f"Zip not found: {zip_path}\n"
            f"Place 'Downtown City MegaKit[Standard].zip' in {REPO_ROOT}"
        )

    tex_cache = out_dir / "_textures"
    tex_cache.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict[str, str]] = {"pieces": {}}

    with zipfile.ZipFile(zip_path) as zf:
        for role, stem in CITY_PIECES.items():
            gltf = extract_piece(zf, stem, out_dir, tex_cache)
            entry = {"stem": stem, "gltf": f"/models/city/{stem}/{stem}.gltf"}
            if args.glb:
                glb = to_glb(gltf)
                entry["glb"] = f"/models/city/{stem}/{glb.name}"
                print(f"glb  {glb}")
            manifest["pieces"][role] = entry
            print(f"ok   {role} <- {stem}")

    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"wrote {out_dir / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
