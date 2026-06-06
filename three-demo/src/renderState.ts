/**
 * FROZEN React <-> board renderer contract.
 * SpacetimeDB rows get projected into this shape � the 3D layer never sees DB types.
 */

export type RenderTileType = 'street' | 'bodega' | 'alley';
export type RenderPickupType = 'cash' | 'coffee' | 'shield';

export interface RenderTile {
  readonly x: number;
  readonly y: number;
  readonly type: RenderTileType;
  readonly ownerColor: string | null;
  readonly contested: boolean;
  readonly shielded: boolean;
  readonly spilled: boolean;
}

export interface RenderToken {
  readonly playerId: number;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly boosted: boolean;
  readonly disabled: boolean;
}

export interface RenderPickup {
  readonly x: number;
  readonly y: number;
  readonly type: RenderPickupType;
}

export interface RenderState {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly RenderTile[];
  readonly tokens: readonly RenderToken[];
  readonly pickups: readonly RenderPickup[];
}

export const BOARD_WIDTH = 28;
export const BOARD_HEIGHT = 28;

export const EMPTY_RENDER_STATE: RenderState = {
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  tiles: [],
  tokens: [],
  pickups: [],
};
