import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SimPlayer, ViewMode } from '../hooks/useLocalSimulation';
import { fitMapZoom, isoMapBounds, screenYToBoard } from '../iso';
import {
  applyPanTarget,
  CameraPanBinder,
  useCameraPanState,
} from './cameraPan';

interface Props {
  view: ViewMode;
  driving: number;
  players: SimPlayer[];
  /** Split mode: which player this viewport follows. */
  focusIndex?: number;
}

/** Orthographic pan/zoom — same math as phaser-demo CityScene + cameraPan. */
export function CameraRig({ view, driving, players, focusIndex }: Props) {
  const { camera, size } = useThree();
  const bounds = useMemo(() => isoMapBounds(), []);
  const focus = useRef(new THREE.Vector2(bounds.centerX, bounds.centerY));
  const panState = useCameraPanState(view);

  useEffect(() => {
    panState.current.panX = 0;
    panState.current.panY = 0;
    panState.current.zoomMul = 1;
  }, [view, focusIndex, panState]);

  useFrame((_, dt) => {
    const cam = camera as THREE.OrthographicCamera;
    const smooth = Math.min(1, dt * 5);

    let targetX = bounds.centerX;
    let targetY = bounds.centerY;
    let baseZoom = fitMapZoom(size.width, size.height);

    if (view === 'split') {
      const idx = focusIndex ?? 0;
      const p = players[idx];
      if (p) {
        targetX = p.focus.x;
        targetY = p.focus.y;
      }
      baseZoom = 0.85;
    } else if (view !== 'spectator') {
      const drv = players[driving];
      if (drv) {
        targetX = drv.focus.x;
        targetY = drv.focus.y;
      }
      baseZoom = 1;
    }

    panState.current.baseZoom = baseZoom;

    focus.current.x += (targetX - focus.current.x) * smooth;
    focus.current.y += (targetY - focus.current.y) * smooth;

    const t = applyPanTarget(
      panState.current,
      focus.current.x,
      focus.current.y,
    );

    cam.zoom = THREE.MathUtils.lerp(cam.zoom, t.zoom, smooth);

    const bx = t.x;
    const by = screenYToBoard(t.y);
    cam.up.set(0, 1, 0);
    cam.position.set(bx, by, 1000);
    cam.lookAt(bx, by, 0);
    cam.updateProjectionMatrix();
  });

  return <CameraPanBinder view={view} state={panState} />;
}
