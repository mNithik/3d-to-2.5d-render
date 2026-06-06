import { GRID_W } from './map';

/**
 * Isometric painter depth � sort by diagonal row (gx + gy), then gx tie-break.
 * Higher depth draws on top.
 */
export function tileDepth(gx: number, gy: number, offset = 0): number {
  return (gx + gy) * GRID_W + gx + offset;
}
