/** 2:1 isometric grid — matches phaser-demo (2D screen-space board). */
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

export function isoDepth(gx: number, gy: number, offset = 0): number {
  return gx + gy + offset;
}

/** Phaser screen px → Three.js XY board (Y flipped, Z for painter order). */
export function screenToBoard(sx: number, sy: number, z = 0): [number, number, number] {
  return [sx, -sy, z];
}

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

export function isoRenderOrder(
  gx: number,
  gy: number,
  layer: 'floor' | 'object' | 'player',
  offset = 0,
): number {
  const layerBase =
    layer === 'floor' ? 0 : layer === 'object' ? 20_000 : 40_000;
  return layerBase + Math.round(isoDepth(gx, gy, offset) * 100);
}

/** Negative Z so higher renderOrder draws closer to camera (down -Z). */
export function boardZFromOrder(renderOrder: number): number {
  return -renderOrder * 0.001;
}

export function mapCenter(): [number, number, number] {
  const b = isoMapBounds();
  return [b.centerX, -b.centerY, 500];
}

export function mapBoundsRadius(): number {
  const b = isoMapBounds();
  return Math.max(b.width, b.height) * 0.5;
}
