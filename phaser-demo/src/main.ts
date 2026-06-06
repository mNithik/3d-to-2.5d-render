import Phaser from 'phaser';
import type { ViewMode } from './gameState';
import { bindInput } from './input';
import { CityScene } from './scenes/CityScene';

bindInput();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#101218',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [CityScene],
});

const $ = (id: string) => document.getElementById(id);

let currentView: ViewMode = 'p1';

function setView(v: ViewMode): void {
  currentView = v;
  game.events.emit('set-view', v);
  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.toggle('on', (t as HTMLElement).dataset.v === v);
  });
}

function updateHud(view: string, driving: number): void {
  const viewVal = $('viewVal');
  const driveVal = $('driveVal');
  if (viewVal) {
    viewVal.textContent =
      view === 'spectator' ? 'SPECTATOR' : view === 'split' ? 'SPLIT' : `P${driving + 1}`;
  }
  if (driveVal) {
    driveVal.textContent = view === 'spectator' ? '—' : `P${driving + 1}`;
  }
}

game.events.on('hud-update', (payload: { view: string; driving: number }) => {
  updateHud(payload.view, payload.driving);
});

$('tabs')?.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.tab') as HTMLElement | null;
  if (btn?.dataset.v) setView(btn.dataset.v as ViewMode);
});

$('lead')?.addEventListener('input', (e) => {
  const val = +(e.target as HTMLInputElement).value;
  $('leadVal')!.textContent = String(val);
  game.events.emit('set-opts', { leadPx: val });
});

$('smooth')?.addEventListener('input', (e) => {
  const val = +(e.target as HTMLInputElement).value / 100;
  $('smoothVal')!.textContent = val.toFixed(2).slice(1);
  game.events.emit('set-opts', { smooth: val });
});

$('wander')?.addEventListener('change', (e) => {
  game.events.emit('set-opts', {
    wander: (e.target as HTMLInputElement).checked,
  });
});

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === '1') {
    game.events.emit('set-driving', 0);
    if (currentView !== 'split' && currentView !== 'spectator') setView('p1');
  }
  if (k === '2') {
    game.events.emit('set-driving', 1);
    if (currentView !== 'split' && currentView !== 'spectator') setView('p2');
  }
  if (k === '3') {
    game.events.emit('set-driving', 2);
    if (currentView !== 'split' && currentView !== 'spectator') setView('p3');
  }
});

game.events.once('ready', () => setView('p1'));
