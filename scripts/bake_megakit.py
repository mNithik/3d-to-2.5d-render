#!/usr/bin/env python3
"""
Bake Downtown City MegaKit glTF models to 2.5D isometric PNG sprites.

Camera matches Bodega Blitz: elevation 30°, azimuth 45°, orthographic.
Handles multi-material scenes (buildings) without merging meshes.

Run with Python 3.11 (pyrender breaks on 3.14):
  py -3.11 scripts/bake_megakit.py --all
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
import pyrender
import trimesh
from PIL import Image

ELEVATION_DEG = 30.0
AZIMUTH_DEG = 45.0

# Per-category scale after centering (MegaKit units are meters; tune per asset type)
SCALE_PROFILE: dict[str, float] = {
    "tile": 0.82,       # ground tiles — fill 64px iso cell footprint
    "building": 0.52,   # vertical structures
    "prop": 0.75,       # trees, bollards
    "default": 0.5,
}


def look_at(eye: np.ndarray, target: np.ndarray, up: np.ndarray) -> np.ndarray:
    forward = target - eye
    forward = forward / np.linalg.norm(forward)
    right = np.cross(forward, up)
    if np.linalg.norm(right) < 1e-8:
        up = np.array([1.0, 0.0, 0.0])
        right = np.cross(forward, up)
    right = right / np.linalg.norm(right)
    true_up = np.cross(right, forward)
    pose = np.eye(4)
    pose[:3, 0] = right
    pose[:3, 1] = true_up
    pose[:3, 2] = -forward
    pose[:3, 3] = eye
    return pose


def scale_key(role: str) -> str:
    # Order matters: buildings/alley share the "tile_" prefix, check them first.
    if role.startswith("tile_building") or role in {"tile_bodega"}:
        return "building"
    if role in {"tile_street", "tile_sidewalk", "tile_alley"}:
        return "tile"
    if role.startswith("prop_") or role == "tree":
        return "prop"
    return "default"


def material_for_mesh(mesh: trimesh.Trimesh) -> pyrender.MetallicRoughnessMaterial:
    # Force OPAQUE so kit glass/window materials (alpha=128) don't wash buildings out.
    if mesh.visual.kind == "texture" and hasattr(mesh.visual, "material"):
        mat = mesh.visual.material
        kwargs: dict = {
            "metallicFactor": 0.0,
            "roughnessFactor": 0.85,
            "alphaMode": "OPAQUE",
        }
        if hasattr(mat, "baseColorTexture") and mat.baseColorTexture is not None:
            kwargs["baseColorTexture"] = mat.baseColorTexture
        elif hasattr(mat, "baseColorFactor") and mat.baseColorFactor is not None:
            bcf = list(mat.baseColorFactor)
            if len(bcf) == 4:
                bcf[3] = 255 if bcf[3] > 1 else 1.0  # drop transparency
            kwargs["baseColorFactor"] = bcf
        else:
            kwargs["baseColorFactor"] = [0.85, 0.85, 0.88, 1.0]
        return pyrender.MetallicRoughnessMaterial(**kwargs)
    return pyrender.MetallicRoughnessMaterial(
        baseColorFactor=[0.85, 0.85, 0.88, 1.0],
        metallicFactor=0.0,
        roughnessFactor=0.85,
        alphaMode="OPAQUE",
    )


def load_scene(path: Path) -> trimesh.Scene:
    loaded = trimesh.load(path, force="scene")
    if isinstance(loaded, trimesh.Trimesh):
        scene = trimesh.Scene()
        scene.add_geometry(loaded)
        return scene
    return loaded


def normalize_scene(scene: trimesh.Scene, role: str) -> trimesh.Scene:
    scene = scene.copy()
    centroid = scene.centroid
    scene.apply_translation(-centroid)
    extents = scene.bounds[1] - scene.bounds[0]
    target = SCALE_PROFILE[scale_key(role)]
    scale = target / max(extents.max(), 1e-6)
    scene.apply_scale(scale)
    min_y = scene.bounds[0][1]
    scene.apply_translation([0.0, -min_y, 0.0])
    return scene


def trim_and_anchor(img: Image.Image, resolution: int) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    cropped = img.crop(bbox)
    max_w = int(resolution * 0.82)
    max_h = int(resolution * 0.9)
    scale = min(max_w / cropped.width, max_h / cropped.height, 1.0)
    new_size = (max(1, int(cropped.width * scale)), max(1, int(cropped.height * scale)))
    resized = cropped.resize(new_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (resolution, resolution), (0, 0, 0, 0))
    anchor_x = resolution // 2
    anchor_y = int(resolution * 0.85)
    paste_x = anchor_x - new_size[0] // 2
    paste_y = anchor_y - new_size[1]
    canvas.paste(resized, (paste_x, paste_y), resized)
    return canvas


def bake_gltf(path: Path, role: str, resolution: int) -> Image.Image:
    # No geometry normalization: transforming a multi-material scene corrupts
    # the kit's building textures. Frame straight from the raw model bounds.
    scene_tm = load_scene(path)
    scene_pr = pyrender.Scene(bg_color=[0, 0, 0, 0], ambient_light=[0.5, 0.5, 0.55])

    # Use each mesh's native glTF material/texture — overriding it breaks the
    # kit's multi-material buildings (they flatten to white/green artifacts).
    for geom in scene_tm.geometry.values():
        if not isinstance(geom, trimesh.Trimesh):
            continue
        scene_pr.add(pyrender.Mesh.from_trimesh(geom, smooth=False))

    elev = math.radians(ELEVATION_DEG)
    azim = math.radians(AZIMUTH_DEG)

    # Auto-frame: look at the model's center and size the ortho box to its
    # bounding sphere so tall buildings are never clipped.
    bmin, bmax = scene_tm.bounds
    center = (bmin + bmax) / 2.0
    radius = float(np.linalg.norm(bmax - bmin)) / 2.0
    mag = max(radius * 1.12, 1e-3)
    dist = radius * 4.0 + 5.0

    direction = np.array(
        [
            math.cos(elev) * math.sin(azim),
            math.sin(elev),
            math.cos(elev) * math.cos(azim),
        ]
    )
    eye = center + direction * dist
    camera_pose = look_at(eye, center, np.array([0.0, 1.0, 0.0]))
    camera = pyrender.OrthographicCamera(xmag=mag, ymag=mag, znear=0.01, zfar=dist * 4.0)
    scene_pr.add(camera, pose=camera_pose)

    light_eye = center + (direction + np.array([0.4, 0.5, -0.3])) * dist
    light_pose = look_at(light_eye, center, np.array([0.0, 1.0, 0.0]))
    scene_pr.add(pyrender.DirectionalLight(color=[1.0, 1.0, 1.0], intensity=3.0), pose=light_pose)
    scene_pr.add(pyrender.DirectionalLight(color=[0.7, 0.8, 1.0], intensity=1.2), pose=camera_pose)

    renderer = pyrender.OffscreenRenderer(resolution, resolution)
    try:
        color, _depth = renderer.render(scene_pr, flags=pyrender.RenderFlags.RGBA)
    finally:
        renderer.delete()

    return trim_and_anchor(Image.fromarray(color, mode="RGBA"), resolution)


def find_model(role_dir: Path) -> Path:
    models = sorted(role_dir.glob("*.gltf")) + sorted(role_dir.glob("*.glb"))
    if not models:
        raise FileNotFoundError(f"No .gltf/.glb in {role_dir}")
    return models[0]


def bake_role(role_dir: Path, role: str, out_dir: Path, resolution: int) -> Path:
    model = find_model(role_dir)
    out = out_dir / f"{role}.png"
    bake_gltf(model, role, resolution).save(out)
    return out


def bake_file(model: Path, role: str, out_dir: Path, resolution: int) -> Path:
    out = out_dir / f"{role}.png"
    bake_gltf(model, role, resolution).save(out)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Bake MegaKit glTF to 2.5D iso PNGs")
    parser.add_argument("--src", type=Path, default=Path("assets-source/source"))
    parser.add_argument("--out", type=Path, default=Path("output/sprites/raw"))
    parser.add_argument("--res", type=int, default=512)
    parser.add_argument("--role", help="Bake single role folder name (or output PNG stem with --model)")
    parser.add_argument("--model", type=Path, help="Single composed glTF file path")
    parser.add_argument("--all", action="store_true", help="Bake every role in manifest")
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    if args.model:
        role = args.role or args.model.parent.name
        try:
            out = bake_file(args.model, role, args.out, args.res)
            print(f"baked {out}")
        except Exception as exc:
            print(f"FAILED {args.model}: {exc}", file=sys.stderr)
            return 1
        return 0

    manifest_path = args.src / "manifest.json"
    if not manifest_path.exists():
        print(f"Run extract_megakit.py first (missing {manifest_path})", file=sys.stderr)
        return 1

    roles: dict[str, str] = json.loads(manifest_path.read_text(encoding="utf-8"))["roles"]
    targets = [args.role] if args.role else list(roles.keys()) if args.all else []
    if not targets:
        parser.error("Provide --role NAME, --model PATH, or --all")

    for role in targets:
        role_dir = args.src / role
        if not role_dir.is_dir():
            print(f"skip missing {role_dir}", file=sys.stderr)
            continue
        try:
            out = bake_role(role_dir, role, args.out, args.res)
            print(f"baked {out}")
        except Exception as exc:
            print(f"FAILED {role}: {exc}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
