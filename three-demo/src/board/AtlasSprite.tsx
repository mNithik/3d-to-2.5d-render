import { useMemo } from 'react';
import * as THREE from 'three';
import type { AtlasData, AtlasFrame } from '../atlas';
import {
  FLOOR_ORIGIN,
  FLOOR_TILE_SCALE,
  scaleToCellWidth,
  SPRITE_ORIGIN,
} from '../atlas';
import { gridToGround, gridToScreen, isoDepth, screenToBoard } from '../iso';

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

function spritePixelSize(
  atlas: AtlasData,
  frame: AtlasFrame,
  scaleMode: 'floor' | 'cell',
  scaleMul: number,
): { w: number; h: number } {
  const { w, h } = atlas.frames[frame]!.frame;
  if (scaleMode === 'floor') {
    return { w: w * FLOOR_TILE_SCALE, h: h * FLOOR_TILE_SCALE };
  }
  const scale = scaleToCellWidth(w, frame) * scaleMul;
  return { w: w * scale, h: h * scale };
}

function atlasPlaneGeometry(
  atlas: AtlasData,
  frame: AtlasFrame,
  pw: number,
  ph: number,
): THREE.PlaneGeometry {
  const { x, y, w, h } = atlas.frames[frame]!.frame;
  const geo = new THREE.PlaneGeometry(pw, ph);
  const aw = atlas.meta.size.w;
  const ah = atlas.meta.size.h;
  const u0 = x / aw;
  const u1 = (x + w) / aw;
  const v0 = 1 - (y + h) / ah;
  const v1 = 1 - y / ah;
  const uv = geo.attributes.uv!;
  uv.setXY(0, u0, v0);
  uv.setXY(1, u1, v0);
  uv.setXY(2, u0, v1);
  uv.setXY(3, u1, v1);
  return geo;
}

function pivotOffsetY(originY: number, height: number): number {
  return (originY - 0.5) * height;
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
  const depth = isoDepth(gx, gy, depthOffset);
  const [bx, by, bz] = screenToBoard(screen.x, screen.y, depth);

  const size = spritePixelSize(atlas, frame, scaleMode, scaleMul);
  const origin = scaleMode === 'floor' ? FLOOR_ORIGIN : SPRITE_ORIGIN;
  const pivotOffY = pivotOffsetY(origin.y, size.h);

  const geometry = useMemo(
    () => atlasPlaneGeometry(atlas, frame, size.w, size.h),
    [atlas, frame, size.w, size.h],
  );
  const material = useMemo(() => atlasMaterial(texture), [texture]);
  const order = Math.round(depth);

  return (
    <group position={[bx, by, bz]}>
      <mesh
        position={[0, pivotOffY, 0]}
        geometry={geometry}
        material={material}
        renderOrder={order}
        onClick={(e) => {
          e.stopPropagation();
          onPick?.(gx, gy);
        }}
      />
    </group>
  );
}
