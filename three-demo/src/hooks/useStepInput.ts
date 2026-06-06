import { useCallback, useEffect } from 'react';

/** One grid step queued per keydown (not while held) � mirrors phaser-demo input.ts. */
let pendingStep: { dx: number; dy: number } | null = null;

function dirForKey(k: string): { dx: number; dy: number } | null {
  if (k === 'w' || k === 'arrowup') return { dx: 0, dy: -1 };
  if (k === 's' || k === 'arrowdown') return { dx: 0, dy: 1 };
  if (k === 'a' || k === 'arrowleft') return { dx: -1, dy: 0 };
  if (k === 'd' || k === 'arrowright') return { dx: 1, dy: 0 };
  return null;
}

export function useStepInput() {
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      const dir = dirForKey(k);
      if (dir) pendingStep = dir;
    };

    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);

  const takeStepIfQueued = useCallback((canStep: boolean): { dx: number; dy: number } => {
    if (!pendingStep || !canStep) return { dx: 0, dy: 0 };
    const dir = pendingStep;
    pendingStep = null;
    return dir;
  }, []);

  return { takeStepIfQueued };
}
