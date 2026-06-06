import {
  Application,
  Assets,
  Container,
  Graphics,
  RenderTexture,
  Sprite,
  Spritesheet,
  Text,
  Texture,
} from 'pixi.js';
import { CameraPanController } from './cameraPan';
import { tileDepth } from './depth';
import {
  createPlayers,
  viewToDriving,
  type GameOptions,
  type PlayerState,
  type ViewMode,
} from './gameState';
import { gridToGround, isoMapBounds } from './iso';
import {
  buildingSlots,
  floorCells,
  floorFrameAt,
  GRID_H,
  GRID_W,
  propSlots,
  treeCells,
} from './map';
import { createPlayerVisual, drawToken } from './playerGraphics';
import { updatePlayers } from './players';
import { ATLAS_JSON, type AtlasFrame } from './spriteKeys';
import {
  placeCellSprite,
  placeFloorSprite,
  placePropSprite,
} from './worldSprite';

interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PlayerVisual {
  container: Container;
  gfx: Graphics;
  drivenRing: Graphics;
}

export interface HudPayload {
  view: ViewMode;
  driving: number;
}

export class CityApp {
  private app!: Application;
  private world = new Container();
  private splitLayer = new Container();
  private uiLayer = new Container();
  private textures = new Map<AtlasFrame, Texture>();

  private players: PlayerState[] = createPlayers();
  private playerVisuals: PlayerVisual[] = [];
  private opts: GameOptions = { leadPx: 64, smooth: 0.09, wander: true };
  view: ViewMode = 'p1';
  private driving = 0;

  private splitRTs: RenderTexture[] = [];
  private splitSprites: Sprite[] = [];
  private splitLabels: Text[] = [];
  private splitBorders: Graphics[] = [];
  private singleLabel!: Text;

  private mapBounds = isoMapBounds(GRID_W, GRID_H);
  private cameraPan!: CameraPanController;

  private onHudUpdate?: (payload: HudPayload) => void;

  async init(parent: HTMLElement, onHudUpdate?: (payload: HudPayload) => void): Promise<void> {
    this.onHudUpdate = onHudUpdate;

    this.app = new Application();
    await this.app.init({
      background: '#101218',
      resizeTo: parent,
      antialias: false,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    parent.appendChild(this.app.canvas);
    this.app.canvas.style.imageRendering = 'pixelated';

    await Assets.load({ alias: 'atlas', src: ATLAS_JSON });
    const sheet = Assets.get<Spritesheet>('atlas');
    for (const [name, tex] of Object.entries(sheet.textures)) {
      this.textures.set(name as AtlasFrame, tex);
    }

    this.world.sortableChildren = true;
    this.buildWorld();
    this.buildSplitChrome();
    this.buildSingleLabel();

    this.app.stage.addChild(this.world, this.splitLayer, this.uiLayer);
    this.splitLayer.visible = false;

    this.cameraPan = new CameraPanController(this.app.canvas, () => this.view);
    this.cameraPan.bind();

    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS));
    window.addEventListener('resize', () => this.layoutCameras());

    this.setView('p1');
  }

  setOpts(opts: Partial<GameOptions>): void {
    Object.assign(this.opts, opts);
  }

  setDriving(d: number): void {
    this.driving = Math.max(0, Math.min(2, d));
    this.emitHud();
  }

  setView(view: ViewMode): void {
    this.view = view;
    if (view === 'p1') this.driving = 0;
    if (view === 'p2') this.driving = 1;
    if (view === 'p3') this.driving = 2;
    if (view !== 'split' && view !== 'spectator') {
      this.driving = viewToDriving(view);
    }
    this.cameraPan.setView(view);
    this.layoutCameras();
    this.emitHud();
  }

  private texture(frame: AtlasFrame) {
    const tex = this.textures.get(frame);
    if (!tex) throw new Error(`Missing atlas frame: ${frame}`);
    return tex;
  }

  private buildWorld(): void {
    const floor = [...floorCells()].sort(
      (a, b) => tileDepth(a.gx, a.gy, -0.5) - tileDepth(b.gx, b.gy, -0.5),
    );
    for (const { gx, gy } of floor) {
      const frame = floorFrameAt(gx, gy);
      this.world.addChild(
        placeFloorSprite(
          this.texture(frame),
          gx,
          gy,
          frame,
          tileDepth(gx, gy, -0.5),
        ),
      );
    }

    for (const { gx, gy, frame } of propSlots()) {
      this.world.addChild(
        placePropSprite(
          this.texture(frame),
          gx,
          gy,
          frame,
          tileDepth(gx, gy, frame === 'prop_manhole' ? -0.4 : 0.12),
        ),
      );
    }

    const buildings = [...buildingSlots()].sort(
      (a, b) => tileDepth(a.gx, a.gy, 0.05) - tileDepth(b.gx, b.gy, 0.05),
    );
    for (const { gx, gy, frame } of buildings) {
      this.world.addChild(
        placeCellSprite(
          this.texture(frame),
          gx,
          gy,
          frame,
          tileDepth(gx, gy, 0.05),
        ),
      );
    }

    for (const { gx, gy } of treeCells()) {
      this.world.addChild(
        placePropSprite(
          this.texture('tree'),
          gx,
          gy,
          'tree',
          tileDepth(gx, gy, 0.15),
        ),
      );
    }

    this.playerVisuals = this.players.map((p) => {
      const vis = createPlayerVisual();
      const { x, y } = gridToGround(p.gx, p.gy);
      vis.container.position.set(x, y);
      vis.container.zIndex = tileDepth(p.gx, p.gy, 0.1);
      this.world.addChild(vis.container);
      return vis;
    });
  }

  private buildSplitChrome(): void {
    this.splitRTs = this.players.map(() =>
      RenderTexture.create({ width: 100, height: 100 }),
    );
    this.splitSprites = this.splitRTs.map((rt) => {
      const sprite = new Sprite(rt);
      this.splitLayer.addChild(sprite);
      return sprite;
    });

    this.splitLabels = this.players.map((p, i) => {
      const label = new Text({
        text: '',
        style: {
          fontFamily: 'Silkscreen, monospace',
          fontSize: 11,
          fill: p.color,
        },
      });
      label.zIndex = 10000 + i;
      this.splitLayer.addChild(label);
      return label;
    });

    this.splitBorders = this.players.map(() => {
      const g = new Graphics();
      g.zIndex = 9999;
      this.splitLayer.addChild(g);
      return g;
    });
    this.splitLayer.sortableChildren = true;
  }

  private buildSingleLabel(): void {
    this.singleLabel = new Text({
      text: '',
      style: {
        fontFamily: 'Silkscreen, monospace',
        fontSize: 11,
        fill: '#2dd4bf',
      },
    });
    this.uiLayer.addChild(this.singleLabel);
  }

  private emitHud(): void {
    this.onHudUpdate?.({ view: this.view, driving: this.driving });
  }

  private tick(dt: number): void {
    updatePlayers(this.players, this.driving, this.view, this.opts, dt);

    this.players.forEach((p, i) => {
      const { x, y } = gridToGround(p.px, p.py);
      const vis = this.playerVisuals[i];
      vis.container.position.set(x, y);
      vis.container.zIndex = tileDepth(Math.round(p.px), Math.round(p.py), 0.1);
      const isDriven = this.view !== 'spectator' && i === this.driving;
      drawToken(vis.gfx, vis.drivenRing, p, isDriven);
    });

    this.layoutCameras();
  }

  private applyWorldCamera(focusX: number, focusY: number, zoom: number): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.world.scale.set(zoom);
    this.world.position.set(w / 2 - focusX * zoom, h / 2 - focusY * zoom);
  }

  private splitRects(w: number, h: number): ViewRect[] {
    const cols = w >= 760;
    return cols
      ? this.players.map((_, i) => ({
          x: Math.floor((i * w) / 3),
          y: 0,
          w: Math.ceil(w / 3),
          h,
        }))
      : this.players.map((_, i) => ({
          x: 0,
          y: Math.floor((i * h) / 3),
          w,
          h: Math.ceil(h / 3),
        }));
  }

  private hideSplitChrome(): void {
    this.splitLabels.forEach((l) => {
      l.visible = false;
    });
    this.splitBorders.forEach((b) => {
      b.visible = false;
    });
    this.singleLabel.visible = false;
  }

  private layoutCameras(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    if (this.view === 'spectator') {
      this.world.visible = true;
      this.splitLayer.visible = false;
      const fitZoom = Math.min(w / this.mapBounds.width, h / this.mapBounds.height) * 0.9;
      this.cameraPan.setBaseZoom(fitZoom);
      const t = this.cameraPan.applyTarget(this.mapBounds.centerX, this.mapBounds.centerY);
      this.applyWorldCamera(t.x, t.y, t.zoom);
      this.hideSplitChrome();
      return;
    }

    if (this.view === 'split') {
      this.world.visible = false;
      this.splitLayer.visible = true;
      this.singleLabel.visible = false;

      const rects = this.splitRects(w, h);
      this.players.forEach((p, i) => {
        const r = rects[i]!;
        const rt = this.splitRTs[i]!;
        if (rt.width !== r.w || rt.height !== r.h) {
          rt.resize(r.w, r.h);
        }

        const zoom = 0.85;
        this.applyWorldCamera(p.focus.x, p.focus.y, zoom);
        this.app.renderer.render({ container: this.world, target: rt, clear: true });

        const sprite = this.splitSprites[i]!;
        sprite.texture = rt;
        sprite.position.set(r.x, r.y);
        sprite.width = r.w;
        sprite.height = r.h;

        const label = this.splitLabels[i]!;
        const driven = i === this.driving;
        label.visible = true;
        label.position.set(r.x + 10, r.y + 18);
        label.style.fill = p.color;
        label.text = `P${p.id}${driven ? '  (you)' : ''}`;

        const border = this.splitBorders[i]!;
        border.clear();
        border.visible = true;
        border.rect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        border.stroke({
          width: driven ? 3 : 1,
          color: Number.parseInt(p.color.slice(1), 16),
          alpha: 1,
        });
      });
      return;
    }

    this.world.visible = true;
    this.splitLayer.visible = false;
    this.cameraPan.setBaseZoom(1);
    const drv = this.players[this.driving]!;
    const t = this.cameraPan.applyTarget(drv.focus.x, drv.focus.y);
    this.applyWorldCamera(t.x, t.y, t.zoom);

    this.singleLabel.visible = true;
    this.singleLabel.position.set(10, 18);
    this.singleLabel.style.fill = drv.color;
    this.singleLabel.text = `PLAYER ${drv.id}  (you)`;
    this.splitLabels.forEach((l) => {
      l.visible = false;
    });
    this.splitBorders.forEach((b) => {
      b.visible = false;
    });
  }
}
