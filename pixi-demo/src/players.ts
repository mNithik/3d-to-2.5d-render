import { gridToGround, gridToScreen, GRID_WANDER_DIRS } from './iso';
import { takeStepIfQueued } from './input';
import { isOccupiedByPlayer, isWalkable } from './collision';
import {
  GRID_H,
  GRID_W,
  STEP_MS,
  WANDER_MS,
  type GameOptions,
  type PlayerState,
  type ViewMode,
} from './gameState';

export function tryStep(
  p: PlayerState,
  dx: number,
  dy: number,
  players: PlayerState[],
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

export function updatePlayers(
  players: PlayerState[],
  driving: number,
  view: ViewMode,
  opts: GameOptions,
  dt: number,
): void {
  players.forEach((p, i) => {
    p.stepCool -= dt;

    if (view !== 'spectator' && i === driving) {
      const canStep =
        Math.round(p.px) === p.gx &&
        Math.round(p.py) === p.gy &&
        p.stepCool <= 0;
      const { dx, dy } = takeStepIfQueued(canStep);
      tryStep(p, dx, dy, players, i);
    } else if (opts.wander) {
      p.wCool -= dt;
      if (
        p.wCool <= 0 &&
        Math.round(p.px) === p.gx &&
        Math.round(p.py) === p.gy
      ) {
        const d = GRID_WANDER_DIRS[Math.floor(Math.random() * GRID_WANDER_DIRS.length)];
        tryStep(p, d.dx, d.dy, players, i);
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
}
