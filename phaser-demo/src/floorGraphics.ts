import Phaser from 'phaser';
import type { FloorType } from './cityLayout';
import { FLOOR_COLORS } from './cityLayout';
import { TILE_H, TILE_W } from './iso';

/** Procedural iso diamond floor — one cell footprint (64×32). */
export function drawFloorDiamond(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  type: FloorType,
): void {
  const { fill, edge } = FLOOR_COLORS[type];
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(x, y - hh);
  g.lineTo(x + hw, y);
  g.lineTo(x, y + hh);
  g.lineTo(x - hw, y);
  g.closePath();
  g.fillPath();
  g.lineStyle(1, edge, 1);
  g.strokePath();
}
