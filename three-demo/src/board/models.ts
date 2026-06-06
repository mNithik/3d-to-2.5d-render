/** Cartoon City GLBs — exported by scripts/export_source_for_three.py */

import type { BuildingFrame, PropFrame } from '../map';

const BASE = '/models/source';

export const MODELS = {
  tile_bodega: `${BASE}/tile_bodega/Eco_Building_Grid.glb`,
  tile_building_medium: `${BASE}/tile_building_medium/Eco_Building_Terrace.glb`,
  tile_building_large: `${BASE}/tile_building_large/Regular_Building_TwistedTower_Large.glb`,
  tree: `${BASE}/tree/Bush_06.glb`,
  prop_bollard: `${BASE}/prop_bollard/Trash_Can_06.glb`,
  prop_manhole: `${BASE}/prop_manhole/Trash_Can_08.glb`,
  pickup_spawn: `${BASE}/pickup_spawn/Fountain_03.glb`,
} as const;

/** Match phaser-demo spriteKeys building width ratios. */
const BUILDING_SCALE: Record<BuildingFrame, number> = {
  tile_bodega: 1.35,
  tile_building_medium: 1.55,
  tile_building_large: 1.7,
};

const PROP_SCALE: Record<PropFrame, number> = {
  prop_bollard: 0.8,
  prop_manhole: 0.8,
  pickup_spawn: 1.2,
};

export function modelForBuilding(frame: BuildingFrame): string {
  return MODELS[frame];
}

export function scaleForBuilding(frame: BuildingFrame): number {
  return BUILDING_SCALE[frame];
}

export function modelForProp(frame: PropFrame): string {
  return MODELS[frame];
}

export function scaleForProp(frame: PropFrame): number {
  return PROP_SCALE[frame];
}

export const TREE_SCALE = 1.25;

export const ALL_MODEL_URLS = [...new Set(Object.values(MODELS))];
