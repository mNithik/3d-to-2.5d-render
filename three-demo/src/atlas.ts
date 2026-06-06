/** Baked iso atlas — same sprites as phaser-demo (bodega-atlas.png). */

import { TILE_W } from './iso';

export const ATLAS_PATH = '/assets/bodega-atlas.png';
export const ATLAS_JSON = '/assets/bodega-atlas.json';

export const SPRITE_ORIGIN = { x: 0.5, y: 0.85 } as const;
export const FLOOR_ORIGIN = { x: 0.5, y: 0.85 } as const;
export const FLOOR_TILE_SCALE = 0.8;

export type AtlasFrame =
  | 'tile_street'
  | 'tile_sidewalk'
  | 'tile_bodega'
  | 'tile_alley'
  | 'tile_building_medium'
  | 'tile_building_large'
  | 'tree'
  | 'prop_bollard'
  | 'prop_manhole'
  | 'pickup_spawn';

export type BuildingFrame = Extract<
  AtlasFrame,
  'tile_bodega' | 'tile_building_medium' | 'tile_building_large'
>;

const BUILDING_WIDTH_RATIO: Record<BuildingFrame, number> = {
  tile_bodega: 1.35,
  tile_building_medium: 1.55,
  tile_building_large: 1.7,
};

export function buildingWidthRatio(frame: AtlasFrame): number {
  if (frame in BUILDING_WIDTH_RATIO) {
    return BUILDING_WIDTH_RATIO[frame as BuildingFrame];
  }
  return 1;
}

/** Scale atlas frame width to exactly one grid cell (64px) — mirrors phaser worldSprite. */
export function scaleToCellWidth(frameWidth: number, frame: AtlasFrame): number {
  return (TILE_W * buildingWidthRatio(frame)) / frameWidth;
}

export const TREE_SCALE = 1.25;
export const PROP_SCALE = 0.8;
export const PICKUP_SCALE = 1.2;

export interface AtlasFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasData {
  frames: Record<
    string,
    {
      frame: AtlasFrameRect;
      pivot: { x: number; y: number };
    }
  >;
  meta: { size: { w: number; h: number } };
}

export function propScaleMul(
  frame: Extract<AtlasFrame, 'tree' | 'prop_manhole' | 'pickup_spawn' | 'prop_bollard'>,
): number {
  if (frame === 'tree') return TREE_SCALE;
  if (frame === 'pickup_spawn') return PICKUP_SCALE;
  return PROP_SCALE;
}
