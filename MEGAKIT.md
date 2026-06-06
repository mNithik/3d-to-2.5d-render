# Downtown City MegaKit → 2.5D Isometric Pipeline

Convert the **Downtown City MegaKit[Standard].zip** glTF exports into Phaser-ready 2.5D sprites for **Bodega Blitz** (see `APP-STATE.md`).

## What “2.5D isometric” means here

| Concept | Value |
|---------|-------|
| Grid | 12×8 diamond cells |
| Cell footprint | 64×32 px (2:1 ratio) |
| Projection | Orthographic, elevation 30°, azimuth 45° |
| Sprite anchor | `(0.5, 0.85)` — foot at diamond center-bottom |
| Depth sort | `gridX + gridY` (not row-major) |

3D FBX/glTF pieces are **rendered once** from the iso camera into flat PNG sprites. Phaser draws those sprites on the diamond grid — no live 3D at runtime.

## Important: MegaKit is modular

The zip is **not** a set of finished buildings. It is LEGO-style pieces:

- `Street_Asphalt_6x6` — **6 m × 6 m** road slab (too large for one grid cell — do not tile as floor sprites)
- `Brick_Plain_*`, `Trim_*`, `Roof_*` — wall/facade modules
- `Building_Small_1` — stair entrance (not a whole store; wall textures can look like "blinds")
- `Building_Medium_2_001` / `Building_Large_2` — wall segments with doorways

### Phaser demo rendering strategy

| Layer | Source |
|-------|--------|
| Street / alley floor | Procedural 64×32 diamonds (same as `test.html`) |
| Bodega / alley decor | MegaKit building sprites at **~0.38×** scale on top of floor |
| Trees | `Prop_Planter_Single` sprite at corners |
| Players | Procedural token graphics |

Tiling the baked `tile_street` (asphalt 6×6) on every cell stacks huge gray quads and hides the map — that was the "blinds" bug.

For a NYC bodega board you have three paths (none require Blender):

1. **Sprite-per-role (fastest)** — pick one kit piece per tile type; use procedural floor diamonds in Phaser. Already working in `phaser-demo/`.
2. **Compose in Python (recommended)** — merge wall + door + trim modules with `compose_scene.py`, bake one sprite. See below.
3. **Compose in Godot or Unity (free editors)** — zip includes `glTF (Godot)` and `FBX (Unity)` exports; snap on 3 m grid, export glTF, run `bake_megakit.py --model`.

## No Blender? Use this workflow

### Option A — Python only (already installed)

```bash
# Compose a storefront from kit pieces (wall + door + trim + roof)
py -3.11 scripts/compose_scene.py --preset bodega_corner

# Bake the composed scene to iso PNG
py -3.11 scripts/bake_megakit.py --model assets-source/composed/bodega_corner/scene.gltf --role tile_bodega

# Repack atlas + copy to phaser-demo
py -3.11 scripts/pack_atlas.py
Copy-Item output\atlas\city-atlas.* phaser-demo\public\assets\
```

Edit `PRESETS` in `scripts/compose_scene.py` to try different module combos (`Brick_Plain_3`, `Door_1`, `Roof_2x2`, etc. — 153 stems in the zip).

### Option B — Godot 4 (free)

1. Install [Godot](https://godotengine.org/) (free, no account).
2. Import `Exports/glTF (Godot)/` from the zip.
3. Drag modules into a scene; pieces snap on **3 m** spacing.
4. Export scene as glTF → drop into `assets-source/composed/`.
5. `py -3.11 scripts/bake_megakit.py --model path/to/scene.gltf --role tile_bodega`

### Option C — Unity Personal (free)

1. Import `Exports/FBX (Unity)/` from the zip.
2. Assemble prefab on grid, export via glTF exporter (or use a free FBX→glTF converter).
3. Bake with the same Python script.

### Option D — Use pieces as Phaser overlays (no composition)

Keep procedural street diamonds; place baked sprites at low scale on bodega/tree cells only (`phaser-demo/src/scenes/CityScene.ts`). Good for prototyping; limited visual polish.

## Quick start

**Requires Python 3.11** (`py -3.11`). pyrender fails on Python 3.14 on Windows.

```bash
cd D:\Apocalypse\USA\asset-gen

# 1) Extract glTF + textures from zip into per-role folders
py -3.11 scripts/extract_megakit.py

# 2) Bake all roles to iso PNGs
py -3.11 scripts/bake_megakit.py --all

# 3) Pack Phaser atlas
py -3.11 scripts/pack_atlas.py
```

Outputs:

| Path | Contents |
|------|----------|
| `assets-source/megakit/<role>/` | glTF + bin + textures per sprite |
| `output/sprites/raw/*.png` | 512×512 baked sprites |
| `output/atlas/city-atlas.png` | Phaser atlas |
| `output/atlas/city-atlas.json` | Atlas frame JSON |

## Phaser demo (standalone)

A runnable 2.5D isometric map lives in `phaser-demo/`:

```bash
cd phaser-demo
npm install
npm run dev
```

Opens at http://localhost:5174 — 12×8 grid, MegaKit atlas, click tiles, depth-sorted props/tokens.

## Wiring into Bodega Blitz

Copy atlas into the game repo:

```
output/atlas/city-atlas.png  →  public/assets/city-atlas.png
output/atlas/city-atlas.json →  public/assets/city-atlas.json
```

Update `src/game/spriteKeys.ts` frame keys to match atlas (`tile_street`, `tile_bodega`, …). `BoardScene` already uses the same anchor and depth rules from `APP-STATE.md`.

## Demo map layout (12×8)

Example cell → sprite mapping for `boardLayout.ts`:

```typescript
// grid coords (gx, gy) → atlas frame
const DEMO_TILES = [
  { gx: 0, gy: 0, type: "tile_street" },
  { gx: 1, gy: 0, type: "tile_sidewalk" },
  { gx: 5, gy: 2, type: "tile_bodega" },
  { gx: 8, gy: 1, type: "tile_alley" },
  { gx: 10, gy: 0, type: "tile_building_large" },
  { gx: 3, gy: 6, type: "tree" },
];
```

Ground cells: repeat `tile_street` / `tile_sidewalk`. Building cells: taller sprites (`tile_building_*`) with higher depth offset so tokens walk in front/behind correctly.

## Customizing roles

Edit `ROLE_MAP` in `scripts/extract_megakit.py` to point at different glTF stems (153 available in `Exports/glTF (Godot)/`). Then re-run extract → bake → pack.

Tune scale per category in `SCALE_PROFILE` inside `scripts/bake_megakit.py` (`tile`, `building`, `prop`).

## Composing a full bodega in Blender (optional)

1. Import several MegaKit FBX pieces (wall + door + trim + roof).
2. Snap modules on a 3 m grid (kit native spacing).
3. Camera: orthographic, rotation X=60°, Y=0°, Z=45° (matches bake script).
4. Export glTF → drop in `assets-source/megakit/tile_bodega/`.
5. `py -3.11 scripts/bake_megakit.py --role tile_bodega`

## License

MegaKit Standard license is in the zip (`License_Standard.txt`). Verify commercial use before shipping.
