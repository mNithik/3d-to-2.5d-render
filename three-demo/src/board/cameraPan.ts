/**
 * Unity-style camera pan � mirrors phaser-demo/src/cameraPan.ts.
 * Space+LMB, MMB, or RMB drag; scroll wheel zoom.
 */
import { useEffect, useRef, type MutableRefObject } from 'react';
import { useThree } from '@react-three/fiber';
import type { ViewMode } from '../hooks/useLocalSimulation';

export interface PanState {
  panX: number;
  panY: number;
  zoomMul: number;
  baseZoom: number;
}

function canPan(view: ViewMode): boolean {
  return view === 'spectator' || view === 'p1' || view === 'p2' || view === 'p3';
}

export function useCameraPanState(view: ViewMode) {
  const state = useRef<PanState>({ panX: 0, panY: 0, zoomMul: 1, baseZoom: 1 });

  useEffect(() => {
    state.current.panX = 0;
    state.current.panY = 0;
    state.current.zoomMul = 1;
  }, [view]);

  return state;
}

interface BinderProps {
  view: ViewMode;
  state: MutableRefObject<PanState>;
}

export function CameraPanBinder({ view, state }: BinderProps) {
  const { gl } = useThree();
  const spaceDown = useRef(false);
  const dragging = useRef(false);
  const dragButton = useRef<number | null>(null);
  const dragStart = useRef({ px: 0, py: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    const isPanGesture = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 2) return true;
      if (e.button === 0 && spaceDown.current) return true;
      return false;
    };

    const endDrag = () => {
      dragging.current = false;
      dragButton.current = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = true;
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false;
        if (dragging.current && dragButton.current === 0) endDrag();
      }
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const z = state.current.baseZoom * state.current.zoomMul;
      state.current.panX =
        dragStart.current.panX - (e.clientX - dragStart.current.px) / z;
      state.current.panY =
        dragStart.current.panY - (e.clientY - dragStart.current.py) / z;
    };

    const onUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      if (e.button === dragButton.current) {
        endDrag();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
    };

    const onDown = (e: MouseEvent) => {
      if (!canPan(view)) return;
      if (!isPanGesture(e)) return;
      e.preventDefault();
      dragging.current = true;
      dragButton.current = e.button;
      dragStart.current = {
        px: e.clientX,
        py: e.clientY,
        panX: state.current.panX,
        panY: state.current.panY,
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };

    const onWheel = (e: WheelEvent) => {
      if (!canPan(view)) return;
      e.preventDefault();
      state.current.zoomMul = Math.max(
        0.4,
        Math.min(2.5, state.current.zoomMul - e.deltaY * 0.001),
      );
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [view, gl, state]);

  return null;
}

export function applyPanTarget(
  state: PanState,
  x: number,
  y: number,
): { x: number; y: number; zoom: number } {
  return {
    x: x + state.panX,
    y: y + state.panY,
    zoom: state.baseZoom * state.zoomMul,
  };
}
