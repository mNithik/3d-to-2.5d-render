import { gridToGround } from './iso';
import { GRID_H, GRID_W } from './map';

export type ViewMode = 'p1' | 'p2' | 'p3' | 'split' | 'spectator';

export { GRID_H, GRID_W };

export interface PlayerState {
  readonly id: number;
  gx: number;
  gy: number;
  px: number;
  py: number;
  readonly color: string;
  readonly shade: string;
  fx: number;
  fy: number;
  lead: { x: number; y: number };
  focus: { x: number; y: number };
  stepCool: number;
  wCool: number;
}

export interface GameOptions {
  leadPx: number;
  smooth: number;
  wander: boolean;
}

export const STEP_MS = 150;
export const WANDER_MS = 900;

export function createPlayers(): PlayerState[] {
  return [
    { id: 1, gx: 6, gy: 6, color: '#2dd4bf', shade: '#159e8c' },
    { id: 2, gx: 16, gy: 11, color: '#f472b6', shade: '#be3d8b' },
    { id: 3, gx: 21, gy: 21, color: '#fbbf24', shade: '#c98a0a' },
  ].map((p) => {
    const s = gridToGround(p.gx, p.gy);
    return {
      ...p,
      px: p.gx,
      py: p.gy,
      fx: 1,
      fy: 0,
      lead: { x: 0, y: 0 },
      focus: { x: s.x, y: s.y },
      stepCool: 0,
      wCool: Math.random() * 1200,
    };
  });
}

export function viewToDriving(view: ViewMode): number {
  if (view === 'p1') return 0;
  if (view === 'p2') return 1;
  if (view === 'p3') return 2;
  return 0;
}

export function drivingToView(driving: number): ViewMode {
  if (driving === 1) return 'p2';
  if (driving === 2) return 'p3';
  return 'p1';
}
