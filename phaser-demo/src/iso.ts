/** 2:1 isometric diamond grid — matches Bodega Blitz bake anchor. */
import { GRID_H, GRID_W } from './map';

export { GRID_H, GRID_W };

export const TILE_W = 64;
export const TILE_H = 32;

export function gridToScreen(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

/** Bottom vertex of the iso diamond — foot anchor for buildings, props, players. */
export function gridToGround(gx: number, gy: number): { x: number; y: number } {
  const c = gridToScreen(gx, gy);
  return { x: c.x, y: c.y + TILE_H / 2 };
}

/** Painter depth: higher draws on top. Use gx + gy, not row-major. */
export function isoDepth(gx: number, gy: number, offset = 0): number {
  return gx + gy + offset;
}

/** Cardinal grid steps — one axis per key (no iso angle). */
export const GRID_WANDER_DIRS: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

export function isoMapBounds(gridW = GRID_W, gridH = GRID_H) {
  const minX = (0 - (gridH - 1)) * (TILE_W / 2) - TILE_W / 2;
  const maxX = (gridW - 1) * (TILE_W / 2) + TILE_W / 2;
  const minY = -TILE_H / 2 - 80;
  const maxY = (gridW - 1 + gridH - 1) * (TILE_H / 2) + TILE_H / 2;
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}
