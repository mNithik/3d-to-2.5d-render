const held: Record<string, boolean> = {};

/** One grid step queued per keydown (not while held). */
let pendingStep: { dx: number; dy: number } | null = null;

function dirForKey(k: string): { dx: number; dy: number } | null {
  if (k === 'w' || k === 'arrowup') return { dx: 0, dy: -1 };
  if (k === 's' || k === 'arrowdown') return { dx: 0, dy: 1 };
  if (k === 'a' || k === 'arrowleft') return { dx: -1, dy: 0 };
  if (k === 'd' || k === 'arrowright') return { dx: 1, dy: 0 };
  return null;
}

export function bindInput(): void {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      e.preventDefault();
    }
    held[k] = true;

    // One tile per key press — ignore keyboard repeat while held.
    if (e.repeat) return;
    const dir = dirForKey(k);
    if (dir) pendingStep = dir;
  });
  window.addEventListener('keyup', (e) => {
    held[e.key.toLowerCase()] = false;
  });
}

/** Returns queued step only when the player can act; otherwise keeps it for later. */
export function takeStepIfQueued(canStep: boolean): { dx: number; dy: number } {
  if (!pendingStep) return { dx: 0, dy: 0 };
  if (!canStep) return { dx: 0, dy: 0 };
  const dir = pendingStep;
  pendingStep = null;
  return dir;
}

export function wasPressed(key: string): boolean {
  return !!held[key];
}
