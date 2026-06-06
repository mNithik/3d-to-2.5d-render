# Rendering options � Phaser vs Three.js vs baked PNG

## Short answer

| Approach | GLB/glTF at runtime? | Fits your TS stack? | Quality with MegaKit |
|----------|----------------------|---------------------|----------------------|
| **Baked PNG + Phaser** | No (pre-rendered) | ? Yes | ?? Poor if wrong pieces/scales |
| **Three.js / R3F** | ? Yes | ? Yes (TypeScript) | ? Best for modular kit |
| **Phaser + Three.js hybrid** | ?? Awkward | ?? Two WebGL contexts | ? Not recommended |

**Phaser cannot load or render GLB.** It is a 2D sprite engine. There is no official GLB pipeline.

## Recommended for MegaKit: Three.js (or React Three Fiber)

Load `Exports/glTF (Godot)/` pieces directly:

- Correct scale (3 m grid in world units)
- Real materials/textures (no bake distortion)
- Compose scenes in Python (`compose_scene.py`) or Godot, load one glTF per building

### Demo

```bash
cd three-demo
npm install
npm run dev
```

Opens http://localhost:5176 � orthographic iso camera, MegaKit glTF on 12�8 grid.

## Architecture options (TypeScript)

### A � Replace Phaser board with React Three Fiber (recommended)

```
React UI (Tailwind)
  ??? <Canvas> from @react-three/fiber
        ??? <IsoBoard tiles={renderState.tiles} />
        ??? <PlayerTokens tokens={renderState.tokens} />
        ??? useGLTF('/models/bodega_corner/scene.gltf')
SpacetimeDB ? same RenderState contract
```

Keep `renderState.ts` unchanged. Swap `PhaserGame.tsx` for `IsoBoard3D.tsx`.

### B � Three.js canvas + React shell (no R3F)

Same as `three-demo/src/main.ts` but mount canvas from a React `useEffect` in `Match.tsx`.

### C � Keep Phaser for tokens/UI only (hybrid � avoid)

- Three.js canvas: 3D buildings
- Phaser canvas on top: 2D tokens
- Two WebGL contexts, sync cameras manually � high complexity, little gain

### D � Fix baked PNGs (keep Phaser)

If you stay on Phaser:

1. Never tile `Street_Asphalt_6x6` as floor
2. Use procedural diamonds for streets (`floorGraphics.ts`)
3. Compose buildings with `compose_scene.py`, rebake, repack atlas
4. Scale overlays ~0.38� on bodega cells only

## GLB vs glTF

MegaKit zip ships **glTF + .bin** (Godot export). Three.js `GLTFLoader` loads both. To get `.glb` (single file):

```bash
npx gltf-transform copy input.gltf output.glb
```

Optional � not required for Three.js.

## Camera match (bake ? runtime)

| Parameter | Value |
|-----------|-------|
| Projection | Orthographic |
| Elevation | 30� |
| Azimuth | 45� |
| Grid | 3 m cells (MegaKit native) |

`three-demo/src/board/CameraRig.tsx` and `scripts/bake_megakit.py` use the same angles.

## three-demo (current � run this)

```bash
cd three-demo && npm install && npm run dev
```

React + `@react-three/fiber` + MegaKit glTF. SpacetimeDB integration path:

1. Copy `renderState.ts` + `projectRenderState.ts` into main repo
2. Replace `useLocalSimulation` with `useTable('tiles')` etc.
3. `eventBus.emitTileClick` ? `conn.reducers.move_player(...)`
