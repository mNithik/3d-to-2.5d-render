import { buildingAt, GRID_H, GRID_W, propSlots } from './map';
import type { RenderPickup, RenderState, RenderTile, RenderToken } from './renderState';
import { BOARD_HEIGHT, BOARD_WIDTH, EMPTY_RENDER_STATE } from './renderState';

function tileTypeAt(gx: number, gy: number): RenderTile['type'] {
  if (buildingAt(gx, gy) === 'tile_bodega') return 'bodega';
  return 'street';
}

export function buildStaticTiles(width = BOARD_WIDTH, height = BOARD_HEIGHT): RenderTile[] {
  const tiles: RenderTile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({
        x,
        y,
        type: tileTypeAt(x, y),
        ownerColor: null,
        contested: false,
        shielded: false,
        spilled: false,
      });
    }
  }
  return tiles;
}

function buildPickups(): RenderPickup[] {
  return propSlots()
    .filter((s) => s.frame === 'pickup_spawn')
    .map(({ gx, gy }) => ({ x: gx, y: gy, type: 'cash' as const }));
}

export function buildDemoRenderState(tokens: readonly RenderToken[]): RenderState {
  return {
    width: GRID_W,
    height: GRID_H,
    tiles: buildStaticTiles(),
    tokens,
    pickups: buildPickups(),
  };
}

export function withFallbackTiles(state: RenderState): RenderState {
  if (state.tiles.length > 0) return state;
  return { ...state, tiles: buildStaticTiles(state.width, state.height) };
}

export function ensureRenderable(state: RenderState | undefined): RenderState {
  if (!state) return { ...EMPTY_RENDER_STATE, tiles: buildStaticTiles() };
  return withFallbackTiles(state);
}
