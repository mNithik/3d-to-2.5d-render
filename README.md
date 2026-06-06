# 3D to 2.5D Render Pipeline

Offline asset pipeline for Bodega Blitz. This repository owns MegaKit staging,
render notes, and future Blender batch helpers; the game repository lives as a
separate git clone at `spacetimedb-hack/` and is ignored by this repo.

## Layout

- `_source/manifest.json` - committed frame key to MegaKit source mapping.
- `_source/README.md` - local download, license, and render settings.
- `_source/megakit.zip` - local-only Downtown City MegaKit zip.
- `_source/extracted/` - local-only extracted FBX/glTF files.
- `_source/renders/` - local-only 128 x 256 transparent PNG exports.
- `spacetimedb-hack/` - nested game clone with its own git history.

## Handoff

Render outputs are named `{frame_key}.png` and copied from:

```powershell
_source\renders\
```

to the nested game clone:

```powershell
spacetimedb-hack\public\assets\_source\renders\
```

The game repo then runs `python public/assets/_source/pack_atlas.py` to rebuild
`public/assets/game.png` and `public/assets/game.json`.
