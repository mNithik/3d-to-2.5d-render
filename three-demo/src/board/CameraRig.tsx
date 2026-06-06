import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { SimPlayer, ViewMode } from '../hooks/useLocalSimulation';
import { isoMapBounds } from '../iso';

function zoomForFullMap(viewportW: number, viewportH: number): number {
  const b = isoMapBounds();
  return Math.min(viewportW / b.width, viewportH / b.height) * 0.9;
}

interface Props {
  view: ViewMode;
  driving: number;
  players: SimPlayer[];
}

export function CameraRig({ view, driving, players }: Props) {
  const { camera, size } = useThree();
  const bounds = useMemo(() => isoMapBounds(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const cam = camera as THREE.OrthographicCamera;
    const smooth = Math.min(1, dt * 5);
    const fullMapZoom = zoomForFullMap(size.width, size.height);

    if (view === 'spectator') {
      target.set(bounds.centerX, -bounds.centerY, 0);
      cam.zoom = THREE.MathUtils.lerp(cam.zoom, fullMapZoom, smooth);
    } else if (view === 'split') {
      target.set(bounds.centerX, -bounds.centerY, 0);
      cam.zoom = THREE.MathUtils.lerp(cam.zoom, fullMapZoom * 1.15, smooth);
    } else {
      const drv = players[driving];
      if (drv) {
        target.set(drv.focus.x, -drv.focus.y, 0);
      }
      cam.zoom = THREE.MathUtils.lerp(cam.zoom, 1, smooth);
    }

    cam.position.set(target.x, target.y, 500);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  });

  return null;
}
