/** Matches test.html board layout. */

export type FloorType = 'street' | 'bodega' | 'alley';

export const BODEGA_CELLS = new Set(['2,2', '8,1', '5,5']);
export const ALLEY_CELLS = new Set(['10,6', '11,6']);
export const TREE_CELLS: ReadonlyArray<readonly [number, number]> = [
  [0, 7],
  [11, 7],
  [0, 0],
  [11, 0],
];

export function floorTypeAt(gx: number, gy: number): FloorType {
  const key = `${gx},${gy}`;
  if (BODEGA_CELLS.has(key)) return 'bodega';
  if (ALLEY_CELLS.has(key)) return 'alley';
  return 'street';
}

export function isTreeCell(gx: number, gy: number): boolean {
  return TREE_CELLS.some(([x, y]) => x === gx && y === gy);
}

export const FLOOR_COLORS: Record<FloorType, { fill: number; edge: number }> = {
  street: { fill: 0x2a2f3a, edge: 0x363c49 },
  bodega: { fill: 0x2a2f3a, edge: 0x363c49 },
  alley: { fill: 0x171a20, edge: 0x23272f },
};
