import { useCallback, useEffect, useRef } from 'react';

export function useKeyboard() {
  const held = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
      }
      held.current[k] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      held.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const readDir = useCallback(() => {
    let dx = 0;
    let dy = 0;
    const h = held.current;
    if (h['a'] || h['arrowleft']) dx--;
    if (h['d'] || h['arrowright']) dx++;
    if (h['w'] || h['arrowup']) dy--;
    if (h['s'] || h['arrowdown']) dy++;
    return { dx, dy };
  }, []);

  return { readDir };
}
