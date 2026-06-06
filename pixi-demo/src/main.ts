import type { ViewMode } from './gameState';
import { bindInput } from './input';
import { CityApp } from './CityApp';

bindInput();

const $ = (id: string) => document.getElementById(id);

let currentView: ViewMode = 'p1';
let cityApp: CityApp;

function setView(v: ViewMode): void {
  currentView = v;
  cityApp.setView(v);
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

const parent = $('game-container');
if (!parent) throw new Error('#game-container not found');

cityApp = new CityApp();
await cityApp.init(parent, ({ view, driving }) => updateHud(view, driving));

$('tabs')?.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.tab') as HTMLElement | null;
  if (btn?.dataset.v) setView(btn.dataset.v as ViewMode);
});

$('lead')?.addEventListener('input', (e) => {
  const val = +(e.target as HTMLInputElement).value;
  $('leadVal')!.textContent = String(val);
  cityApp.setOpts({ leadPx: val });
});

$('smooth')?.addEventListener('input', (e) => {
  const val = +(e.target as HTMLInputElement).value / 100;
  $('smoothVal')!.textContent = val.toFixed(2).slice(1);
  cityApp.setOpts({ smooth: val });
});

$('wander')?.addEventListener('change', (e) => {
  cityApp.setOpts({ wander: (e.target as HTMLInputElement).checked });
});

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === '1') {
    cityApp.setDriving(0);
    if (currentView !== 'split' && currentView !== 'spectator') setView('p1');
  }
  if (k === '2') {
    cityApp.setDriving(1);
    if (currentView !== 'split' && currentView !== 'spectator') setView('p2');
  }
  if (k === '3') {
    cityApp.setDriving(2);
    if (currentView !== 'split' && currentView !== 'spectator') setView('p3');
  }
});

setView('p1');
