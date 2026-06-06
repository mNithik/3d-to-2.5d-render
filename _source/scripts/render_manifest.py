#!/usr/bin/env python3
"""Render manifest FBX entries to 128x256 transparent PNGs with Blender."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


REQUIRED_FRAME_KEYS = {
    "tile_street",
    "tile_bodega",
    "tile_alley",
    "pickup_cash",
    "pickup_coffee",
    "pickup_shield",
    "fx_spill",
    "fx_shield",
    "fx_speed",
}

FRAME_COLORS = {
    "tile_street": (0.16, 0.18, 0.20, 1.0),
    "tile_bodega": (0.34, 0.88, 0.66, 1.0),
    "tile_alley": (0.74, 0.52, 0.34, 1.0),
    "pickup_cash": (1.0, 0.82, 0.18, 1.0),
    "pickup_coffee": (0.76, 0.44, 0.22, 1.0),
    "pickup_shield": (0.24, 0.72, 1.0, 1.0),
    "fx_spill": (0.44, 0.70, 1.0, 1.0),
    "fx_shield": (0.42, 0.92, 0.98, 1.0),
    "fx_speed": (1.0, 0.88, 0.24, 1.0),
}

REPO_ROOT = Path(__file__).resolve().parents[2]


def repo_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else REPO_ROOT / path


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_fbx(path: Path) -> None:
    bpy.ops.import_scene.fbx(filepath=str(path))


def scene_bounds() -> tuple[Vector, Vector]:
    points = []
    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "CURVE"}:
            points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        raise RuntimeError("Imported asset has no renderable bounds")
    min_corner = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    max_corner = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return min_corner, max_corner


def center_objects(min_corner: Vector, max_corner: Vector) -> Vector:
    center = (min_corner + max_corner) / 2
    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "CURVE"}:
            obj.location -= center
    return max_corner - min_corner


def apply_frame_material(frame_key: str) -> None:
    material = bpy.data.materials.new(name=f"{frame_key}_preview")
    material.diffuse_color = FRAME_COLORS.get(frame_key, (0.8, 0.8, 0.8, 1.0))
    material.use_nodes = True
    node = material.node_tree.nodes.get("Principled BSDF")
    if node is not None:
        node.inputs["Base Color"].default_value = material.diffuse_color
        node.inputs["Roughness"].default_value = 0.65
        if "Emission Color" in node.inputs:
            node.inputs["Emission Color"].default_value = material.diffuse_color
        if "Emission Strength" in node.inputs:
            node.inputs["Emission Strength"].default_value = 0.1 if frame_key == "tile_street" else 0.45

    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj.data.materials.clear()
            obj.data.materials.append(material)


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_camera(size: Vector) -> None:
    bpy.ops.object.light_add(type="AREA", location=(3.0, -4.0, 6.0))
    bpy.context.object.data.energy = 1800
    bpy.context.object.data.size = 5

    bpy.ops.object.light_add(type="POINT", location=(-4.0, 3.0, 4.5))
    bpy.context.object.data.energy = 300

    bpy.ops.object.camera_add(location=(5.5, -6.5, 5.0))
    camera = bpy.context.object
    look_at(camera, Vector((0, 0, 0)))
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(size.x + size.y, size.z * 2.2, 2.0) * 1.15
    bpy.context.scene.camera = camera


def configure_render(output: Path) -> None:
    scene = bpy.context.scene
    available_engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    if "BLENDER_EEVEE_NEXT" in available_engines:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    elif "BLENDER_EEVEE" in available_engines:
        scene.render.engine = "BLENDER_EEVEE"
    else:
        scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 128
    scene.render.resolution_y = 256
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = str(output)


def render_frame(frame_key: str, asset: Path, output: Path) -> None:
    clear_scene()
    import_fbx(asset)
    apply_frame_material(frame_key)
    min_corner, max_corner = scene_bounds()
    size = center_objects(min_corner, max_corner)
    setup_camera(size)
    configure_render(output)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--output", required=True)
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)

    manifest_path = repo_path(args.manifest)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    source_root = repo_path(args.source_root)
    output_root = repo_path(args.output)
    output_root.mkdir(parents=True, exist_ok=True)

    for frame in manifest["frames"]:
        frame_key = frame["frameKey"]
        if frame_key not in REQUIRED_FRAME_KEYS:
            continue
        asset_path = frame.get("assetPath")
        if not asset_path:
            raise RuntimeError(f"Missing assetPath for {frame_key}")
        render_frame(frame_key, source_root / asset_path, output_root / f"{frame_key}.png")


if __name__ == "__main__":
    main()
