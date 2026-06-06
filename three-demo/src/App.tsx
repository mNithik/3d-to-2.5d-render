import { useCallback, useEffect, useState } from 'react';
import { IsoBoard } from './board/IsoBoard';
import { eventBus } from './EventBus';
import { useKeyboard } from './hooks/useKeyboard';
import { useLocalSimulation, type ViewMode } from './hooks/useLocalSimulation';
import './App.css';

const TABS: { id: ViewMode; label: string }[] = [
  { id: 'p1', label: 'PLAYER 1' },
  { id: 'p2', label: 'PLAYER 2' },
  { id: 'p3', label: 'PLAYER 3' },
  { id: 'split', label: 'SPLIT (ALL CAMS)' },
  { id: 'spectator', label: 'SPECTATOR' },
];

export function App() {
  const [view, setView] = useState<ViewMode>('spectator');
  const [driving, setDriving] = useState(0);
  const [leadPx, setLeadPx] = useState(64);
  const [smooth, setSmooth] = useState(0.09);
  const [wander, setWander] = useState(true);
  const [lastClick, setLastClick] = useState('�');

  const { readDir } = useKeyboard();
  const { renderState, players } = useLocalSimulation(view, driving, {
    leadPx,
    smooth,
    wander,
  }, readDir);

  useEffect(() => {
    eventBus.emitRenderState(renderState);
  }, [renderState]);

  useEffect(() => {
    return eventBus.onTileClick(({ x, y }) => {
      setLastClick(`(${x}, ${y})`);
      // Future: conn.reducers.move_player({ target_x: x, target_y: y })
    });
  }, []);

  const pickView = useCallback((v: ViewMode) => {
    setView(v);
    if (v === 'p1') setDriving(0);
    if (v === 'p2') setDriving(1);
    if (v === 'p3') setDriving(2);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === '1') {
        setDriving(0);
        if (view !== 'split' && view !== 'spectator') pickView('p1');
      }
      if (k === '2') {
        setDriving(1);
        if (view !== 'split' && view !== 'spectator') pickView('p2');
      }
      if (k === '3') {
        setDriving(2);
        if (view !== 'split' && view !== 'spectator') pickView('p3');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, pickView]);

  const viewLabel =
    view === 'spectator' ? 'SPECTATOR' : view === 'split' ? 'SPLIT' : `P${driving + 1}`;

  return (
    <div className="app">
      <header>
        <h1>BODEGA BLITZ</h1>
        <span className="sub">
          Three.js + baked iso atlas · 28×28 · matches Phaser demo
        </span>
      </header>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${view === t.id ? 'on' : ''}`}
            onClick={() => pickView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="stage">
        <IsoBoard
          renderState={renderState}
          view={view}
          driving={driving}
          players={players}
        />

        <div className="panel">
          <div className="row">
            <span>view</span>
            <span className="val">{viewLabel}</span>
          </div>
          <div className="row">
            <span>driving</span>
            <span className="val">{view === 'spectator' ? '�' : `P${driving + 1}`}</span>
          </div>
          <div className="row">
            <span>last click</span>
            <span className="val">{lastClick}</span>
          </div>
          <div className="row">
            <label>lead distance</label>
            <input
              type="range"
              min={0}
              max={160}
              value={leadPx}
              onChange={(e) => setLeadPx(+e.target.value)}
            />
            <span className="val">{leadPx}</span>
          </div>
          <div className="row">
            <label>follow smooth</label>
            <input
              type="range"
              min={2}
              max={20}
              value={Math.round(smooth * 100)}
              onChange={(e) => setSmooth(+e.target.value / 100)}
            />
            <span className="val">{smooth.toFixed(2).slice(1)}</span>
          </div>
          <div className="row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={wander}
                onChange={(e) => setWander(e.target.checked)}
              />
              others auto-walk
            </label>
          </div>
          <div className="keys">
            move <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows<br />
            drive player <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>
          </div>
        </div>

        <div className="note">
          Same baked atlas as Phaser — 28×28, 5 districts, iso sprites.<br />
          <b>RenderState</b> is the SpacetimeDB firewall (see <code>renderState.ts</code>).
        </div>
      </div>
    </div>
  );
}
