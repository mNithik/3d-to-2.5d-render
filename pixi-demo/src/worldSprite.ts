import { Sprite, Texture } from 'pixi.js';
import { gridToGround, gridToScreen, TILE_W } from './iso';
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

function applySpriteScale(sprite: Sprite, frame: AtlasFrame): void {
  const w = sprite.texture.width;
  sprite.scale.set(scaleToCellWidth(w, frame));
}

export function placeCellSprite(
  texture: Texture,
  gx: number,
  gy: number,
  frame: AtlasFrame,
  zIndex: number,
): Sprite {
  const { x, y } = gridToGround(gx, gy);
  const sprite = new Sprite(texture);
  sprite.anchor.set(SPRITE_ORIGIN.x, SPRITE_ORIGIN.y);
  sprite.position.set(x, y);
  applySpriteScale(sprite, frame);
  sprite.zIndex = zIndex;
  return sprite;
}

/** Floor diamonds ù center pinned to cell center (not foot). */
export function placeFloorSprite(
  texture: Texture,
  gx: number,
  gy: number,
  _frame: AtlasFrame,
  zIndex: number,
): Sprite {
  const { x, y } = gridToScreen(gx, gy);
  const sprite = new Sprite(texture);
  sprite.anchor.set(FLOOR_ORIGIN.x, FLOOR_ORIGIN.y);
  sprite.position.set(x, y);
  sprite.scale.set(FLOOR_TILE_SCALE);
  sprite.zIndex = zIndex;
  return sprite;
}

/** Trees and street props ù foot on tile ground vertex. */
export function placePropSprite(
  texture: Texture,
  gx: number,
  gy: number,
  frame: Extract<
    AtlasFrame,
    'tree' | 'prop_bollard' | 'prop_manhole' | 'pickup_spawn'
  >,
  zIndex: number,
): Sprite {
  const mul =
    frame === 'tree' ? TREE_SCALE : frame === 'pickup_spawn' ? PICKUP_SCALE : PROP_SCALE;
  const { x, y } = gridToGround(gx, gy);
  const sprite = new Sprite(texture);
  sprite.anchor.set(SPRITE_ORIGIN.x, SPRITE_ORIGIN.y);
  sprite.position.set(x, y);
  applySpriteScale(sprite, frame);
  sprite.scale.x *= mul;
  sprite.scale.y *= mul;
  sprite.zIndex = zIndex;
  return sprite;
}
