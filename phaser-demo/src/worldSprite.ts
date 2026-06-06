import Phaser from 'phaser';
import { gridToGround, gridToScreen, TILE_H, TILE_W } from './iso';
import {
  buildingWidthRatio,
  FLOOR_TILE_SCALE,
  FLOOR_ORIGIN,
  PICKUP_SCALE,
  PROP_SCALE,
  SPRITE_ORIGIN,
  TREE_SCALE,
  type AtlasFrame,
} from './spriteKeys';

/** Scale atlas frame width to exactly one grid cell (64px). */
export function scaleToCellWidth(frameWidth: number, frame: AtlasFrame): number {
  return (TILE_W * buildingWidthRatio(frame)) / frameWidth;
}

export function placeCellSprite(
  scene: Phaser.Scene,
  gx: number,
  gy: number,
  atlasKey: string,
  frame: AtlasFrame,
  depth: number,
): Phaser.GameObjects.Sprite {
  const { x, y } = gridToGround(gx, gy);
  const sprite = scene.add.sprite(x, y, atlasKey, frame);
  sprite.setOrigin(SPRITE_ORIGIN.x, SPRITE_ORIGIN.y);
  sprite.setScale(scaleToCellWidth(sprite.frame.width, frame));
  sprite.setDepth(depth);
  return sprite;
}

/** Floor diamonds — center pinned to cell center (not foot). */
export function placeFloorSprite(
  scene: Phaser.Scene,
  gx: number,
  gy: number,
  atlasKey: string,
  frame: AtlasFrame,
  depth: number,
): Phaser.GameObjects.Sprite {
  const { x, y } = gridToScreen(gx, gy);
  const sprite = scene.add.sprite(x, y, atlasKey, frame);
  sprite.setOrigin(FLOOR_ORIGIN.x, FLOOR_ORIGIN.y);
  sprite.setScale(FLOOR_TILE_SCALE);
  sprite.setDepth(depth);
  return sprite;
}

/** Trees and street props — foot on tile ground vertex. */
export function placePropSprite(
  scene: Phaser.Scene,
  gx: number,
  gy: number,
  atlasKey: string,
  frame: Extract<
    AtlasFrame,
    'tree' | 'prop_bollard' | 'prop_manhole' | 'pickup_spawn'
  >,
  depth: number,
): Phaser.GameObjects.Sprite {
  const mul =
    frame === 'tree' ? TREE_SCALE : frame === 'pickup_spawn' ? PICKUP_SCALE : PROP_SCALE;
  const { x, y } = gridToGround(gx, gy);
  const sprite = scene.add.sprite(x, y, atlasKey, frame);
  sprite.setOrigin(SPRITE_ORIGIN.x, SPRITE_ORIGIN.y);
  sprite.setScale(scaleToCellWidth(sprite.frame.width, frame) * mul);
  sprite.setDepth(depth);
  return sprite;
}

export { TILE_H, TILE_W };
