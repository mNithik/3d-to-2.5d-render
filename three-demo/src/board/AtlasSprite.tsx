import { useMemo } from 'react';
import * as THREE from 'three';
import type { AtlasData, AtlasFrame } from '../atlas';
import {
  FLOOR_TILE_SCALE,
  SPRITE_ORIGIN,
  buildingWidthRatio,
} from '../atlas';
import {
  boardZFromOrder,
  gridToGround,
  gridToScreen,
  isoRenderOrder,
  screenToBoard,
  TILE_W,
} from '../iso';

interface Props {
  texture: THREE.Texture;
  atlas: AtlasData;
  frame: AtlasFrame;
  gx: number;
  gy: number;
  anchor: 'cell' | 'ground';
  scaleMode: 'floor' | 'cell';
  scaleMul?: number;
  depthOffset?: number;
  onPick?: (gx: number, gy: number) => void;
}

const materialCache = new WeakMap<THREE.Texture, THREE.MeshBasicMaterial>();
const geometryCache = new Map<string, THREE.PlaneGeometry>();

function atlasMaterial(texture: THREE.Texture): THREE.MeshBasicMaterial {
  let mat = materialCache.get(texture);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.04,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    materialCache.set(texture, mat);
  }
  return mat;
}

function atlasPlaneGeometry(
  atlas: AtlasData,
  frame: AtlasFrame,
  scaleMode: 'floor' | 'cell',
  scaleMul: number,
): THREE.PlaneGeometry {
  const key = `${frame}:${scaleMode}:${scaleMul}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;

  const { w, h } = atlas.frames[frame]!.frame;

  let pw: number;
  let ph: number;
  if (scaleMode === 'floor') {
    pw = w * FLOOR_TILE_SCALE;
    ph = h * FLOOR_TILE_SCALE;
  } else {
    pw = TILE_W * buildingWidthRatio(frame) * scaleMul;
    ph = pw * (h / w);
  }

  const geo = new THREE.PlaneGeometry(pw, ph);
  const { x, y } = atlas.frames[frame]!.frame;
  const aw = atlas.meta.size.w;
  const ah = atlas.meta.size.h;
  const u0 = x / aw;
  const u1 = (x + w) / aw;
  const v1 = 1 - y / ah;
  const v0 = 1 - (y + h) / ah;
  const uv = geo.attributes.uv!;
  uv.setXY(0, u0, v0);
  uv.setXY(1, u1, v0);
  uv.setXY(2, u0, v1);
  uv.setXY(3, u1, v1);
  geometryCache.set(key, geo);
  return geo;
}

export function AtlasSprite({
  texture,
  atlas,
  frame,
  gx,
  gy,
  anchor,
  scaleMode,
  scaleMul = 1,
  depthOffset = 0,
  onPick,
}: Props) {
  const screen =
    anchor === 'cell' ? gridToScreen(gx, gy) : gridToGround(gx, gy);

  const geometry = useMemo(
    () => atlasPlaneGeometry(atlas, frame, scaleMode, scaleMul),
    [atlas, frame, scaleMode, scaleMul],
  );
  const material = useMemo(() => atlasMaterial(texture), [texture]);

  const pivotY = useMemo(() => {
    const h = geometry.parameters.height as number;
    return (SPRITE_ORIGIN.y - 0.5) * h;
  }, [geometry]);

  const renderOrder = isoRenderOrder(
    gx,
    gy,
    scaleMode === 'floor' ? 'floor' : 'object',
    depthOffset,
  );
  const [bx, by, bz] = screenToBoard(
    screen.x,
    screen.y,
    boardZFromOrder(renderOrder),
  );

  return (
    <group position={[bx, by, bz]}>
      <mesh
        position={[0, pivotY, 0]}
        geometry={geometry}
        material={material}
        renderOrder={renderOrder}
        onClick={(e) => {
          e.stopPropagation();
          onPick?.(gx, gy);
        }}
      />
    </group>
  );
}
