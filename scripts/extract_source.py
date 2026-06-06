#!/usr/bin/env python3
"""Extract Cartoon City GLB assets from source.zip for iso baking."""

from __future__ import annotations

import argparse
import io
import json
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# Game role -> GLB inside Separate_assets_glb.zip
ROLE_MAP: dict[str, str] = {
    "tile_street": "road_001.glb",
    "tile_sidewalk": "Set_B_Tiles_01.glb",
    "tile_bodega": "Eco_Building_Grid.glb",
    "tile_alley": "Set_B_Tiles_06.glb",
    "tile_building_medium": "Eco_Building_Terrace.glb",
    "tile_building_large": "Regular_Building_TwistedTower_Large.glb",
    "tree": "Bush_06.glb",
    "prop_bollard": "Trash_Can_06.glb",
    "prop_manhole": "Trash_Can_08.glb",
    "pickup_spawn": "Fountain_03.glb",
}

NESTED_ZIP = "Separate_assets_glb.zip"
GLB_PREFIX = "Separate_assets_glb/"


def extract_from_source(zip_path: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    shared = out_dir / "_shared"
    shared.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path) as outer:
        if NESTED_ZIP not in outer.namelist():
            raise SystemExit(f"Expected {NESTED_ZIP} inside {zip_path}")

        inner_names = set(
            zipfile.ZipFile(io.BytesIO(outer.read(NESTED_ZIP))).namelist()
        )

        # Shared texture PNGs (some GLBs reference external sheets).
        with zipfile.ZipFile(io.BytesIO(outer.read(NESTED_ZIP))) as inner:
            for name in inner.namelist():
                if not name.startswith(GLB_PREFIX) or name.endswith("/"):
                    continue
                rel = name[len(GLB_PREFIX) :]
                if rel.endswith(".png"):
                    dest = shared / rel
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    if not dest.exists():
                        dest.write_bytes(inner.read(name))

            for role, glb_name in ROLE_MAP.items():
                src = f"{GLB_PREFIX}{glb_name}"
                if src not in inner_names:
                    raise FileNotFoundError(f"Missing {glb_name} in {NESTED_ZIP}")

                role_dir = out_dir / role
                role_dir.mkdir(parents=True, exist_ok=True)
                dest = role_dir / glb_name
                dest.write_bytes(inner.read(src))

                # Copy sibling PNGs referenced by filename (if any).
                for tex in shared.rglob("*.png"):
                    link = role_dir / tex.name
                    if not link.exists():
                        link.write_bytes(tex.read_bytes())

                print(f"extracted {role} <- {glb_name}")

    manifest = out_dir / "manifest.json"
    manifest.write_text(
        json.dumps({"source": "source.zip", "roles": ROLE_MAP}, indent=2),
        encoding="utf-8",
    )
    print(f"wrote {manifest}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract Cartoon City GLBs from source.zip")
    parser.add_argument(
        "--zip",
        type=Path,
        default=REPO / "source.zip",
        help="Path to source.zip",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=REPO / "assets-source" / "source",
        help="Output directory for per-role GLB folders",
    )
    args = parser.parse_args()

    if not args.zip.exists():
        raise SystemExit(f"Zip not found: {args.zip}")

    extract_from_source(args.zip.resolve(), args.out.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
