#!/usr/bin/env python3
"""Copy Cartoon City GLBs (from extract_source.py) into three-demo/public/models/source/."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEFAULT_SRC = REPO / "assets-source" / "source"
DEFAULT_OUT = REPO / "three-demo" / "public" / "models" / "source"


def export_for_three(src: Path, out: Path) -> None:
    manifest_path = src / "manifest.json"
    if not manifest_path.is_file():
        raise SystemExit(
            f"Missing {manifest_path}\nRun: py -3.11 scripts/extract_source.py"
        )

    roles = json.loads(manifest_path.read_text(encoding="utf-8"))["roles"]
    out.mkdir(parents=True, exist_ok=True)

    for role, glb_name in roles.items():
        role_src = src / role
        if not role_src.is_dir():
            raise FileNotFoundError(f"Missing role folder: {role_src}")

        role_out = out / role
        if role_out.exists():
            shutil.rmtree(role_out)
        shutil.copytree(role_src, role_out)
        glb = role_out / glb_name
        if not glb.is_file():
            raise FileNotFoundError(f"Expected GLB at {glb}")
        print(f"ok   {role} -> {glb.relative_to(out)}")

    shutil.copy2(manifest_path, out / "manifest.json")
    print(f"wrote {out / 'manifest.json'}")


def copy_atlas(repo: Path) -> None:
    src_dir = repo / "phaser-demo" / "public" / "assets"
    dst_dir = repo / "three-demo" / "public" / "assets"
    dst_dir.mkdir(parents=True, exist_ok=True)
    for name in ("bodega-atlas.png", "bodega-atlas.json"):
        src = src_dir / name
        if src.is_file():
            shutil.copy2(src, dst_dir / name)
            print(f"ok   atlas -> {dst_dir / name}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Export source.zip GLBs for three-demo")
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    export_for_three(args.src.resolve(), args.out.resolve())
    copy_atlas(REPO)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
