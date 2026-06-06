import { Container, Graphics } from 'pixi.js';
import { gridToScreen } from './iso';
import type { PlayerState } from './gameState';

function hexColor(css: string): number {
  return Number.parseInt(css.slice(1), 16);
}

export function drawToken(
  gfx: Graphics,
  ring: Graphics,
  p: PlayerState,
  isDriven: boolean,
): void {
  gfx.clear();
  ring.clear();

  if (isDriven) {
    ring.ellipse(0, 2, 12, 6).stroke({ width: 2, color: hexColor(p.color), alpha: 1 });
  }

  gfx.ellipse(0, 2, 9, 4.5).fill({ color: 0x000000, alpha: 0.3 });

  gfx.rect(-6, -18, 12, 18).fill(hexColor(p.shade));
  gfx.rect(-6, -18, 12, 9).fill(hexColor(p.color));
  gfx.circle(0, -22, 5).fill(0xffd9b3);

  if (p.fx || p.fy) {
    const n = gridToScreen(p.fx, p.fy);
    const m = Math.hypot(n.x, n.y) || 1;
    gfx.moveTo(0, -22);
    gfx.lineTo((n.x / m) * 9, -22 + (n.y / m) * 9);
    gfx.stroke({ width: 2, color: 0xffffff, alpha: 1 });
  }
}

export interface PlayerVisual {
  container: Container;
  gfx: Graphics;
  drivenRing: Graphics;
}

export function createPlayerVisual(): PlayerVisual {
  const container = new Container();
  const drivenRing = new Graphics();
  const gfx = new Graphics();
  container.addChild(drivenRing, gfx);
  return { container, gfx, drivenRing };
}
