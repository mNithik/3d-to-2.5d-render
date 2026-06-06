import { useEffect, useRef, useState } from 'react';
import { isOccupiedByPlayer, isWalkable } from '../collision';
import { gridToGround, gridToScreen, GRID_H, GRID_W } from '../iso';
import { buildDemoRenderState } from '../projectRenderState';
import type { RenderState, RenderToken } from '../renderState';

export type ViewMode = 'p1' | 'p2' | 'p3' | 'split' | 'spectator';

export interface SimPlayer {
  id: number;
  gx: number;
  gy: number;
  px: number;
  py: number;
  color: string;
  shade: string;
  fx: number;
  fy: number;
  lead: { x: number; y: number };
  focus: { x: number; y: number };
  stepCool: number;
  wCool: number;
}

export interface SimOptions {
  leadPx: number;
  smooth: number;
  wander: boolean;
}

const STEP_MS = 150;
const WANDER_MS = 900;

/** Cardinal grid steps — one axis per keypress. */
export const GRID_WANDER_DIRS: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

function createPlayers(): SimPlayer[] {
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

function toTokens(players: SimPlayer[]): RenderToken[] {
  return players.map((p) => ({
    playerId: p.id,
    x: p.px,
    y: p.py,
    color: p.color,
    boosted: false,
    disabled: false,
  }));
}

function tryStep(
  p: SimPlayer,
  dx: number,
  dy: number,
  players: SimPlayer[],
  playerIndex: number,
): void {
  if (!(dx || dy)) return;
  if (Math.round(p.px) !== p.gx || Math.round(p.py) !== p.gy) return;
  if (p.stepCool > 0) return;
  const nx = Math.max(0, Math.min(GRID_W - 1, p.gx + dx));
  const ny = Math.max(0, Math.min(GRID_H - 1, p.gy + dy));
  if (!isWalkable(nx, ny)) return;
  if (isOccupiedByPlayer(nx, ny, players, playerIndex)) return;
  if (nx !== p.gx || ny !== p.gy) {
    p.gx = nx;
    p.gy = ny;
    p.stepCool = STEP_MS;
  }
  p.fx = dx;
  p.fy = dy;
}

export function useLocalSimulation(
  view: ViewMode,
  driving: number,
  opts: SimOptions,
  readDir: () => { dx: number; dy: number },
) {
  const playersRef = useRef<SimPlayer[]>(createPlayers());
  const [renderState, setRenderState] = useState<RenderState>(() =>
    buildDemoRenderState(toTokens(playersRef.current)),
  );
  const [players, setPlayers] = useState<SimPlayer[]>(playersRef.current);

  useEffect(() => {
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const list = playersRef.current;

      list.forEach((p, i) => {
        p.stepCool -= dt;
        if (view !== 'spectator' && i === driving) {
          const { dx, dy } = readDir();
          tryStep(p, dx, dy, list, i);
        } else if (opts.wander) {
          p.wCool -= dt;
          if (
            p.wCool <= 0 &&
            Math.round(p.px) === p.gx &&
            Math.round(p.py) === p.gy
          ) {
            const d = GRID_WANDER_DIRS[Math.floor(Math.random() * GRID_WANDER_DIRS.length)]!;
            tryStep(p, d.dx, d.dy, list, i);
            p.wCool = WANDER_MS + Math.random() * 600;
          }
        }

        p.px += (p.gx - p.px) * Math.min(1, dt / STEP_MS);
        p.py += (p.gy - p.py) * Math.min(1, dt / STEP_MS);

        const ps = gridToGround(p.px, p.py);
        let lx = 0;
        let ly = 0;
        if (p.fx || p.fy) {
          const d = gridToScreen(p.fx, p.fy);
          const m = Math.hypot(d.x, d.y) || 1;
          lx = (d.x / m) * opts.leadPx;
          ly = (d.y / m) * opts.leadPx;
        }
        p.lead.x += (lx - p.lead.x) * opts.smooth;
        p.lead.y += (ly - p.lead.y) * opts.smooth;
        p.focus.x += (ps.x + p.lead.x - p.focus.x) * opts.smooth;
        p.focus.y += (ps.y + p.lead.y - p.focus.y) * opts.smooth;
      });

      setRenderState(buildDemoRenderState(toTokens(list)));
      setPlayers([...list]);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view, driving, opts.leadPx, opts.smooth, opts.wander, readDir]);

  return { renderState, players };
}
