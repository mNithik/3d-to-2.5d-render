import Phaser from 'phaser';
import { blockedCells } from '../collision';
import { tileDepth } from '../depth';
import {
  buildingSlots,
  floorCells,
  floorFrameAt,
  GRID_H,
  GRID_W,
  propSlots,
  treeCells,
} from '../map';
import {
  createPlayers,
  viewToDriving,
  type GameOptions,
  type PlayerState,
  type ViewMode,
} from '../gameState';
import { gridToGround, gridToScreen, isoMapBounds, TILE_H, TILE_W } from '../iso';
import { updatePlayers } from '../players';
import { ATLAS_JSON, ATLAS_KEY, ATLAS_PATH } from '../spriteKeys';
import { CameraPanController } from '../cameraPan';
import { placeCellSprite, placeFloorSprite, placePropSprite } from '../worldSprite';

const SCENE_KEY = 'CityScene';
const PHYS_TEX = '__phys';

interface PlayerVisual {
  container: Phaser.GameObjects.Container;
  gfx: Phaser.GameObjects.Graphics;
  drivenRing: Phaser.GameObjects.Graphics;
  body: Phaser.Physics.Arcade.Body;
}

export class CityScene extends Phaser.Scene {
  private worldLayer!: Phaser.GameObjects.Layer;
  private playerVisuals: PlayerVisual[] = [];
  private players: PlayerState[] = createPlayers();
  private opts: GameOptions = { leadPx: 64, smooth: 0.09, wander: true };
  view: ViewMode = 'p1';
  private driving = 0;

  private splitCams: Phaser.Cameras.Scene2D.Camera[] = [];
  private splitLabels: Phaser.GameObjects.Text[] = [];
  private splitBorders: Phaser.GameObjects.Graphics[] = [];
  private singleLabel!: Phaser.GameObjects.Text;
  private mapBounds = isoMapBounds(GRID_W, GRID_H);
  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup;
  private cameraPan = new CameraPanController(this, () => this.view);

  constructor() {
    super({ key: SCENE_KEY });
  }

  preload(): void {
    this.load.atlas(ATLAS_KEY, ATLAS_PATH, ATLAS_JSON);
  }

  create(): void {
    this.ensurePhysTexture();
    this.worldLayer = this.add.layer();
    this.buildFloorTiles();
    this.buildProps();
    this.buildBuildings();
    this.buildTrees();
    this.buildCollisionBodies();
    this.buildPlayers();
    this.registerColliders();
    this.splitCams = [
      this.cameras.main,
      this.cameras.add(0, 0, 1, 1),
      this.cameras.add(0, 0, 1, 1),
    ];
    this.splitLabels = this.players.map((p, i) => {
      const label = this.add
        .text(0, 0, '', {
          fontFamily: 'Silkscreen, monospace',
          fontSize: '11px',
          color: p.color,
        })
        .setScrollFactor(0)
        .setDepth(10000 + i);
      return label;
    });
    this.splitBorders = this.players.map(() => {
      const g = this.add.graphics().setScrollFactor(0).setDepth(9999);
      return g;
    });
    this.singleLabel = this.add
      .text(10, 18, '', {
        fontFamily: 'Silkscreen, monospace',
        fontSize: '11px',
        color: '#2dd4bf',
      })
      .setScrollFactor(0)
      .setDepth(10000);

    this.cameras.main.setBackgroundColor('#101218');
    this.game.events.on('set-view', (v: ViewMode) => this.setView(v));
    this.game.events.on('set-driving', (d: number) => {
      this.driving = Math.max(0, Math.min(2, d));
      this.updateHud();
    });
    this.game.events.on('set-opts', (o: Partial<GameOptions>) => {
      Object.assign(this.opts, o);
    });

    this.setView('p1');
    this.cameraPan.bind();
    this.scale.on('resize', () => this.layoutCameras());
    this.layoutCameras();
  }

  private ensurePhysTexture(): void {
    if (this.textures.exists(PHYS_TEX)) return;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture(PHYS_TEX, 1, 1);
    g.destroy();
  }

  /** Invisible static bodies on blocked cells (buildings, bushes, fountains). */
  private buildCollisionBodies(): void {
    this.obstacleGroup = this.physics.add.staticGroup();
    for (const { gx, gy } of blockedCells()) {
      const { x, y } = gridToGround(gx, gy);
      const block = this.obstacleGroup.create(
        x,
        y,
        PHYS_TEX,
      ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      block.setVisible(false);
      block.setDisplaySize(TILE_W * 0.55, TILE_H * 0.95);
      block.refreshBody();
    }
  }

  private registerColliders(): void {
    const proxies = this.playerVisuals.map((v) => v.container);
    this.physics.add.collider(proxies, this.obstacleGroup);
    for (let i = 0; i < proxies.length; i++) {
      for (let j = i + 1; j < proxies.length; j++) {
        this.physics.add.collider(proxies[i], proxies[j]);
      }
    }
  }

  private buildFloorTiles(): void {
    const cells = [...floorCells()].sort(
      (a, b) => tileDepth(a.gx, a.gy, -0.5) - tileDepth(b.gx, b.gy, -0.5),
    );

    for (const { gx, gy } of cells) {
      const tile = placeFloorSprite(
        this,
        gx,
        gy,
        ATLAS_KEY,
        floorFrameAt(gx, gy),
        tileDepth(gx, gy, -0.5),
      );
      this.worldLayer.add(tile);
    }
  }

  /** One building part per assigned cell — foot anchored to tile center. */
  private buildBuildings(): void {
    const slots = [...buildingSlots()].sort(
      (a, b) => tileDepth(a.gx, a.gy, 0.05) - tileDepth(b.gx, b.gy, 0.05),
    );

    for (const { gx, gy, frame } of slots) {
      const building = placeCellSprite(
        this,
        gx,
        gy,
        ATLAS_KEY,
        frame,
        tileDepth(gx, gy, 0.05),
      );
      this.worldLayer.add(building);
    }
  }

  /** Bushes fill open lots between buildings. */
  private buildTrees(): void {
    for (const { gx, gy } of treeCells()) {
      const tree = placePropSprite(
        this,
        gx,
        gy,
        ATLAS_KEY,
        'tree',
        tileDepth(gx, gy, 0.15),
      );
      this.worldLayer.add(tree);
    }
  }

  /** Manholes on roads and fountains on plaza cells. */
  private buildProps(): void {
    for (const { gx, gy, frame } of propSlots()) {
      const prop = placePropSprite(
        this,
        gx,
        gy,
        ATLAS_KEY,
        frame,
        tileDepth(gx, gy, frame === 'prop_manhole' ? -0.4 : 0.12),
      );
      this.worldLayer.add(prop);
    }
  }

  private buildPlayers(): void {
    this.playerVisuals = this.players.map((p) => {
      const { x, y } = gridToGround(p.gx, p.gy);
      const container = this.add.container(x, y);
      const drivenRing = this.add.graphics();
      const gfx = this.add.graphics();
      container.add([drivenRing, gfx]);
      container.setDepth(tileDepth(p.gx, p.gy, 0.1));
      this.worldLayer.add(container);

      this.physics.add.existing(container);
      const body = container.body as Phaser.Physics.Arcade.Body;
      body.setCircle(10, -10, -8);
      body.setImmovable(false);
      body.setCollideWorldBounds(false);
      body.setAllowGravity(false);

      return { container, gfx, drivenRing, body };
    });
  }

  private drawToken(
    gfx: Phaser.GameObjects.Graphics,
    ring: Phaser.GameObjects.Graphics,
    p: PlayerState,
    isDriven: boolean,
  ): void {
    gfx.clear();
    ring.clear();

    if (isDriven) {
      ring.lineStyle(2, Number.parseInt(p.color.slice(1), 16), 1);
      ring.strokeEllipse(0, 2, 24, 12);
    }

    gfx.fillStyle(0x000000, 0.3);
    gfx.fillEllipse(0, 2, 18, 9);

    const shade = Number.parseInt(p.shade.slice(1), 16);
    const color = Number.parseInt(p.color.slice(1), 16);
    gfx.fillStyle(shade, 1);
    gfx.fillRect(-6, -18, 12, 18);
    gfx.fillStyle(color, 1);
    gfx.fillRect(-6, -18, 12, 9);
    gfx.fillStyle(0xffd9b3, 1);
    gfx.fillCircle(0, -22, 5);

    if (p.fx || p.fy) {
      const n = gridToScreen(p.fx, p.fy);
      const m = Math.hypot(n.x, n.y) || 1;
      gfx.lineStyle(2, 0xffffff, 1);
      gfx.beginPath();
      gfx.moveTo(0, -22);
      gfx.lineTo((n.x / m) * 9, -22 + (n.y / m) * 9);
      gfx.strokePath();
    }
  }

  update(_time: number, delta: number): void {
    updatePlayers(this.players, this.driving, this.view, this.opts, delta);

    this.players.forEach((p, i) => {
      const { x, y } = gridToGround(p.px, p.py);
      const vis = this.playerVisuals[i];
      vis.container.setPosition(x, y);
      vis.body.reset(x, y);
      vis.container.setDepth(
        tileDepth(Math.round(p.px), Math.round(p.py), 0.1),
      );
      const isDriven = this.view !== 'spectator' && i === this.driving;
      this.drawToken(vis.gfx, vis.drivenRing, p, isDriven);
    });

    this.layoutCameras();
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
    this.updateHud();
    this.game.events.emit('view-changed', {
      view: this.view,
      driving: this.driving,
    });
  }

  private updateHud(): void {
    this.game.events.emit('hud-update', {
      view: this.view,
      driving: this.driving,
    });
  }

  private layoutCameras(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const [cam0, cam1, cam2] = this.splitCams;

    const hideSplitChrome = () => {
      this.splitLabels.forEach((l) => l.setVisible(false));
      this.splitBorders.forEach((b) => b.setVisible(false));
      this.singleLabel.setVisible(false);
    };

    if (this.view === 'spectator') {
      cam0.setViewport(0, 0, w, h);
      cam0.setVisible(true);
      cam1.setVisible(false);
      cam2.setVisible(false);
      const fitZoom =
        Math.min(w / this.mapBounds.width, h / this.mapBounds.height) * 0.9;
      this.cameraPan.setBaseZoom(fitZoom);
      const t = this.cameraPan.applyTarget(
        this.mapBounds.centerX,
        this.mapBounds.centerY,
      );
      cam0.setZoom(t.zoom);
      cam0.centerOn(t.x, t.y);
      hideSplitChrome();
      return;
    }

    if (this.view === 'split') {
      const cols = w >= 760;
      const rects = cols
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

      this.splitCams.forEach((cam, i) => {
        const r = rects[i];
        cam.setViewport(r.x, r.y, r.w, r.h);
        cam.setVisible(true);
        cam.setZoom(0.85);
        cam.centerOn(this.players[i].focus.x, this.players[i].focus.y);
      });

      this.splitLabels.forEach((label, i) => {
        const r = rects[i];
        const p = this.players[i];
        const driven = i === this.driving;
        label.setVisible(true);
        label.setPosition(r.x + 10, r.y + 18);
        label.setColor(p.color);
        label.setText(`P${p.id}${driven ? '  (you)' : ''}`);
      });
      this.splitBorders.forEach((border, i) => {
        const r = rects[i];
        const p = this.players[i];
        const driven = i === this.driving;
        border.clear();
        border.setVisible(true);
        border.lineStyle(
          driven ? 3 : 1,
          Number.parseInt(p.color.slice(1), 16),
          1,
        );
        border.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      });
      return;
    }

    cam0.setViewport(0, 0, w, h);
    cam0.setVisible(true);
    cam1.setVisible(false);
    cam2.setVisible(false);
    this.cameraPan.setBaseZoom(1);
    const drv = this.players[this.driving];
    const t = this.cameraPan.applyTarget(drv.focus.x, drv.focus.y);
    cam0.setZoom(t.zoom);
    cam0.centerOn(t.x, t.y);
    this.singleLabel.setVisible(true);
    this.singleLabel.setPosition(10, 18);
    this.singleLabel.setColor(drv.color);
    this.singleLabel.setText(`PLAYER ${drv.id}  (you)`);
    this.splitLabels.forEach((l) => l.setVisible(false));
    this.splitBorders.forEach((b) => b.setVisible(false));
  }
}
