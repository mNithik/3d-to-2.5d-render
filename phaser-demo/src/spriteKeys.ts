export const ATLAS_KEY = 'bodega';
export const ATLAS_PATH = 'assets/bodega-atlas.png';
export const ATLAS_JSON = 'assets/bodega-atlas.json';

/** Foot anchor — bottom of baked sprite sits on tile ground vertex. */
export const SPRITE_ORIGIN = { x: 0.5, y: 0.85 } as const;

/** Floor tiles — diamond center on cell center (matches pack_atlas fit_floor). */
export const FLOOR_ORIGIN = { x: 0.5, y: 0.85 } as const;

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

/**
 * Floor diamonds are packed at ~0.92 frame width and centered on the (0.5,0.85)
 * anchor; drawing them slightly oversized overlaps neighbours so the ground
 * tessellates with no gaps.
 */
export const FLOOR_TILE_SCALE = 0.8;

/**
 * Footprint width vs one cell — 1.0 = full cell width after scaleToCellWidth().
 * Lower for oversized MegaKit bakes when real sprites land in Leg 8.
 */
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

export const TREE_SCALE = 1.25;
export const PROP_SCALE = 0.8;
export const PICKUP_SCALE = 1.2;
