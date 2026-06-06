import { Canvas } from '@react-three/fiber';
import { Html, OrthographicCamera, useProgress } from '@react-three/drei';
import { Suspense } from 'react';
import type { RenderState } from '../renderState';
import type { SimPlayer, ViewMode } from '../hooks/useLocalSimulation';
import { CityScene } from './CityScene';
import { CameraRig } from './CameraRig';

interface Props {
  renderState: RenderState;
  view: ViewMode;
  driving: number;
  players: SimPlayer[];
}

function Loader() {
  const { progress, active } = useProgress();
  if (!active) return null;
  return (
    <Html center>
      <div style={{ color: '#f5c518', fontFamily: 'monospace', fontSize: 12 }}>
        Loading city atlas… {progress.toFixed(0)}%
      </div>
    </Html>
  );
}

export function IsoBoard({ renderState, view, driving, players }: Props) {
  const drivingId = view === 'spectator' ? undefined : players[driving]?.id;

  return (
    <Canvas
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%', background: '#101218' }}
      onCreated={({ gl }) => {
        gl.sortObjects = true;
      }}
    >
      <OrthographicCamera
        makeDefault
        position={[0, 0, 500]}
        zoom={1}
        near={0.1}
        far={2000}
      />
      <Suspense fallback={<Loader />}>
        <CameraRig view={view} driving={driving} players={players} />
        <CityScene renderState={renderState} drivingPlayerId={drivingId} />
      </Suspense>
    </Canvas>
  );
}
