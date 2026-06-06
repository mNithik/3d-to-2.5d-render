/**
 * Bodega Blitz 28×28 city — five districts, sparse curated buildings.
 * Shared layout with phaser-demo/src/map.ts.
 */

export const GRID_W = 28;
export const GRID_H = 28;
export const SECTION_COUNT = 5;

/** Avenue spacing — roads at gx/gy ≡ 1 (mod 5): 1, 6, 11, 16, 21, 26. */
export const STREET_SPACING = 5;
export const STREET_OFFSET = 1;

export interface District {
  readonly id: number;
  readonly name: string;
  readonly minGx: number;
  readonly maxGx: number;
}

export const DISTRICTS: ReadonlyArray<District> = [
  { id: 0, name: 'West End', minGx: 0, maxGx: 5 },
  { id: 1, name: 'Midtown', minGx: 6, maxGx: 10 },
  { id: 2, name: 'Central', minGx: 11, maxGx: 16 },
  { id: 3, name: 'East Side', minGx: 17, maxGx: 21 },
  { id: 4, name: 'Harbor', minGx: 22, maxGx: 27 },
];

export type BuildingFrame =
  | 'tile_bodega'
  | 'tile_building_medium'
  | 'tile_building_large';

export type FloorFrame = 'tile_street' | 'tile_sidewalk';

export type PropFrame =
  | 'prop_bollard'
  | 'prop_manhole'
  | 'pickup_spawn';

export interface BuildingSlot {
  gx: number;
  gy: number;
  frame: BuildingFrame;
  section: number;
}

export interface PropSlot {
  gx: number;
  gy: number;
  frame: PropFrame;
}

const BUILDING_PLACEMENTS: ReadonlyArray<{
  gx: number;
  gy: number;
  frame: BuildingFrame;
}> = [
  { gx: 3, gy: 12, frame: 'tile_bodega' },
  { gx: 4, gy: 18, frame: 'tile_building_medium' },
  { gx: 8, gy: 8, frame: 'tile_bodega' },
  { gx: 9, gy: 23, frame: 'tile_building_large' },
  { gx: 13, gy: 13, frame: 'tile_bodega' },
  { gx: 14, gy: 8, frame: 'tile_building_medium' },
  { gx: 15, gy: 23, frame: 'tile_building_large' },
  { gx: 18, gy: 8, frame: 'tile_bodega' },
  { gx: 19, gy: 18, frame: 'tile_building_medium' },
  { gx: 23, gy: 13, frame: 'tile_bodega' },
  { gx: 24, gy: 8, frame: 'tile_building_large' },
];

const BUILDING_BY_CELL = new Map<string, BuildingFrame>(
  BUILDING_PLACEMENTS.map((b) => [`${b.gx},${b.gy}`, b.frame]),
);

const PICKUP_PLACEMENTS: ReadonlyArray<{ gx: number; gy: number }> = [
  { gx: 3, gy: 3 },
  { gx: 8, gy: 13 },
  { gx: 13, gy: 3 },
  { gx: 18, gy: 13 },
  { gx: 23, gy: 3 },
];

const PICKUP_CELLS = new Set(PICKUP_PLACEMENTS.map((p) => `${p.gx},${p.gy}`));

export function sectionAt(gx: number, _gy = 0): number {
  if (gx <= 5) return 0;
  if (gx <= 10) return 1;
  if (gx <= 16) return 2;
  if (gx <= 21) return 3;
  return 4;
}

export function districtAt(gx: number, gy: number): District {
  return DISTRICTS[sectionAt(gx, gy)]!;
}

export function isRoadCell(gx: number, gy: number): boolean {
  return (
    gy % STREET_SPACING === STREET_OFFSET ||
    gx % STREET_SPACING === STREET_OFFSET
  );
}

function isPickupCell(gx: number, gy: number): boolean {
  return PICKUP_CELLS.has(`${gx},${gy}`);
}

export function floorFrameAt(gx: number, gy: number): FloorFrame {
  if (isRoadCell(gx, gy)) return 'tile_street';
  return 'tile_sidewalk';
}

export function floorCells(): ReadonlyArray<{ gx: number; gy: number }> {
  const cells: { gx: number; gy: number }[] = [];
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) cells.push({ gx, gy });
  }
  return cells;
}

export function buildingAt(gx: number, gy: number): BuildingFrame | null {
  if (isRoadCell(gx, gy)) return null;
  return BUILDING_BY_CELL.get(`${gx},${gy}`) ?? null;
}

export function isTreeCell(gx: number, gy: number): boolean {
  if (isRoadCell(gx, gy)) return false;
  if (isPickupCell(gx, gy)) return false;
  if (buildingAt(gx, gy) !== null) return false;
  const s = sectionAt(gx, gy);
  return (gx * 3 + gy * 5 + s * 2) % 11 === 0;
}

export function buildingSlots(): BuildingSlot[] {
  return BUILDING_PLACEMENTS.map(({ gx, gy, frame }) => ({
    gx,
    gy,
    frame,
    section: sectionAt(gx, gy),
  }));
}

export function treeCells(): ReadonlyArray<{ gx: number; gy: number }> {
  const cells: { gx: number; gy: number }[] = [];
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      if (isTreeCell(gx, gy)) cells.push({ gx, gy });
    }
  }
  return cells;
}

export function propSlots(): PropSlot[] {
  const slots: PropSlot[] = PICKUP_PLACEMENTS.map(({ gx, gy }) => ({
    gx,
    gy,
    frame: 'pickup_spawn' as const,
  }));

  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      if (isRoadCell(gx, gy) && (gx * 7 + gy * 3) % 13 === 0) {
        slots.push({ gx, gy, frame: 'prop_manhole' });
      }
    }
  }
  return slots;
}
