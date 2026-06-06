import { buildingAt, GRID_H, GRID_W, isTreeCell, propSlots } from './map';
import type { PlayerState } from './gameState';

const FOUNTAIN_CELLS = new Set(
  propSlots()
    .filter((s) => s.frame === 'pickup_spawn')
    .map((s) => `${s.gx},${s.gy}`),
);

/** Static obstacles — buildings, bushes, fountains. Roads/sidewalks stay walkable. */
export function isCellBlocked(gx: number, gy: number): boolean {
  if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return true;
  if (buildingAt(gx, gy) !== null) return true;
  if (isTreeCell(gx, gy)) return true;
  return FOUNTAIN_CELLS.has(`${gx},${gy}`);
}

export function isWalkable(gx: number, gy: number): boolean {
  return !isCellBlocked(gx, gy);
}

export function isOccupiedByPlayer(
  gx: number,
  gy: number,
  players: PlayerState[],
  selfIndex: number,
): boolean {
  return players.some((p, i) => {
    if (i === selfIndex) return false;
    return (
      (p.gx === gx && p.gy === gy) ||
      (Math.round(p.px) === gx && Math.round(p.py) === gy)
    );
  });
}

export function blockedCells(): ReadonlyArray<{ gx: number; gy: number }> {
  const cells: { gx: number; gy: number }[] = [];
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      if (isCellBlocked(gx, gy)) cells.push({ gx, gy });
    }
  }
  return cells;
}
