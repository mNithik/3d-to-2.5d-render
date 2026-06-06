# MegaKit Source Staging

Use this folder for local-only 3D sources and committed pipeline metadata.

## Source Pack

- Primary pack: Quaternius Downtown City MegaKit
- License: CC0 1.0
- Local zip path: `_source/megakit.zip`
- Extracted files: `_source/extracted/`

Do not use `source.zip` until its license is verified in writing.

## Render Settings

- Tool: Blender
- Camera: fixed isometric angle matching the Kenney east-facing atlas direction.
- Lighting: fixed shared scene lighting for all frames.
- Output: PNG, RGBA, transparent background.
- Size: 128 x 256 px per frame.
- Filename: `_source/renders/{frame_key}.png`

## Game Copy Target

Copy rendered PNGs into the nested game repo:

```powershell
.\_source\scripts\copy_renders.ps1
```

After copying, rebuild the game atlas from inside `spacetimedb-hack/`:

```powershell
python public/assets/_source/pack_atlas.py
```
