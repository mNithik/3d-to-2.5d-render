import Phaser from 'phaser';
import type { ViewMode } from './gameState';

type PanButton = 0 | 1 | 2 | null;

/**
 * Unity-style camera pan � DOM listeners on the game canvas so middle/right
 * mouse and Space+LMB work reliably (Phaser pointer alone misses some buttons).
 */
export class CameraPanController {
  private panX = 0;
  private panY = 0;
  private zoomMul = 1;
  private baseZoom = 1;
  private dragging = false;
  private dragButton: PanButton = null;
  private dragStart = { px: 0, py: 0, panX: 0, panY: 0 };
  private spaceDown = false;
  private bound = false;

  constructor(
    private scene: Phaser.Scene,
    private getView: () => ViewMode,
  ) {}

  bind(): void {
    if (this.bound) return;
    this.bound = true;

    const canvas = this.scene.game.canvas;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        this.spaceDown = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        this.spaceDown = false;
        if (this.dragging && this.dragButton === 0) {
          this.endDrag();
        }
      }
    };

    const onMove = (e: MouseEvent) => {
      if (!this.dragging) return;
      const cam = this.scene.cameras.main;
      const z = cam.zoom || 1;
      this.panX = this.dragStart.panX - (e.clientX - this.dragStart.px) / z;
      this.panY = this.dragStart.panY - (e.clientY - this.dragStart.py) / z;
    };

    const onUp = (e: MouseEvent) => {
      if (!this.dragging) return;
      if (e.button === this.dragButton) {
        this.endDrag();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
    };

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
      if (!this.canPan()) return;
      if (!this.isPanGesture(e)) return;
      e.preventDefault();
      this.dragging = true;
      this.dragButton = e.button as PanButton;
      this.dragStart = {
        px: e.clientX,
        py: e.clientY,
        panX: this.panX,
        panY: this.panY,
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.canPan()) return;
        e.preventDefault();
        this.zoomMul = Phaser.Math.Clamp(this.zoomMul - e.deltaY * 0.001, 0.4, 2.5);
      },
      { passive: false },
    );

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.scene.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    });
  }

  private isPanGesture(e: MouseEvent): boolean {
    if (e.button === 1 || e.button === 2) return true;
    if (e.button === 0 && this.spaceDown) return true;
    return false;
  }

  private endDrag(): void {
    this.dragging = false;
    this.dragButton = null;
  }

  setView(_view: ViewMode): void {
    this.panX = 0;
    this.panY = 0;
    this.zoomMul = 1;
    this.endDrag();
  }

  setBaseZoom(z: number): void {
    this.baseZoom = z;
  }

  canPan(): boolean {
    const v = this.getView();
    return v === 'spectator' || v === 'p1' || v === 'p2' || v === 'p3';
  }

  isDragging(): boolean {
    return this.dragging;
  }

  applyTarget(x: number, y: number): { x: number; y: number; zoom: number } {
    return {
      x: x + this.panX,
      y: y + this.panY,
      zoom: this.baseZoom * this.zoomMul,
    };
  }
}
