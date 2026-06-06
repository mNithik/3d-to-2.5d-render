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

interface PaneProps extends Props {
  focusIndex?: number;
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

function BoardCanvas({ renderState, view, driving, players, focusIndex }: PaneProps) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', background: '#101218' }}
      orthographic
    >
      <OrthographicCamera
        makeDefault
        position={[0, 0, 1000]}
        zoom={1}
        near={0.1}
        far={2000}
      />
      <Suspense fallback={<Loader />}>
        <CameraRig
          view={view}
          driving={driving}
          players={players}
          focusIndex={focusIndex}
        />
        <CityScene
          players={players}
          driving={driving}
          view={view}
        />
      </Suspense>
    </Canvas>
  );
}

function SplitBoard({ renderState, view, driving, players }: Props) {
  const cols = typeof window !== 'undefined' && window.innerWidth >= 760;

  return (
    <div className={`board-split ${cols ? 'cols' : 'rows'}`}>
      {players.map((p, i) => (
        <div key={p.id} className="board-pane">
          <BoardCanvas
            renderState={renderState}
            view={view}
            driving={driving}
            players={players}
            focusIndex={i}
          />
          <div className="pane-label" style={{ color: p.color }}>
            P{p.id}
            {i === driving ? '  (you)' : ''}
          </div>
          <div
            className={`pane-border ${i === driving ? 'driven' : ''}`}
            style={{ borderColor: p.color }}
          />
        </div>
      ))}
    </div>
  );
}

function SingleBoard({ renderState, view, driving, players }: Props) {
  const drv = players[driving];

  return (
    <div className="board-single">
      <BoardCanvas
        renderState={renderState}
        view={view}
        driving={driving}
        players={players}
      />
      {view !== 'spectator' && view !== 'split' && drv && (
        <div className="pane-label single" style={{ color: drv.color }}>
          PLAYER {drv.id}  (you)
        </div>
      )}
    </div>
  );
}

export function IsoBoard({ renderState, view, driving, players }: Props) {
  if (view === 'split') {
    return (
      <SplitBoard
        renderState={renderState}
        view={view}
        driving={driving}
        players={players}
      />
    );
  }

  return (
    <SingleBoard
      renderState={renderState}
      view={view}
      driving={driving}
      players={players}
    />
  );
}
