import Phaser from 'phaser';
import { bus } from '@/core/bus';
import type { Interactable } from '@/core/types';
import { canInteract, npcWaypointAt } from '@/core/world';
import { useGameStore } from '@/store/gameStore';
import { OBJ_KEYS, charFrame } from '../art';
import { playSfx, setAmbience } from '../audio';
import { FX_KEYS } from '../fx/textures';
import { transitionIn, transitionOut, type TransitionKind } from '../fx/transition';
import { playerSpriteKey, resolveObjectSprite, type ResolvedSprite } from '../keys';
import { autotile, type AutotileResult } from '../logic/autotile';
import { ambientTint, darkness, GameClock, MODERN_TINTS, rgbToHex, type RGB } from '../logic/clock';
import { moveBox } from '../logic/collision';
import { buildSolidGrid, isSolid } from '../logic/grid';
import { facingFromVector, pickInteractable } from '../logic/interact';
import { findPath, findPathToAdjacent, nearestWalkable } from '../logic/pathfinding';
import { TILE, type Facing, type MapData, type Pt } from '../logic/types';
import { chooseZoom } from '../logic/zoom';
import { getMap } from '../maps/fallback';
import { getSceneNpcs, getSceneObjects } from '../worldContent';
import { NpcActor, feetToTile, tileToFeet } from './NpcActor';

export interface WorldInit {
  sceneId: string;
  spawn?: Pt;
  fromSceneId?: string;
  transition?: TransitionKind;
}

/** 게임 시계는 씬 재시작을 넘어 유지된다. */
export const worldClock = new GameClock(540, 2);

/** 개발/테스트용 배율 고정 (null 이면 뷰포트로 계산) */
export const devOptions: { zoom: number | null } = { zoom: null };

const PLAYER_SPEED = 92;
const INTERACT_RANGE = 48;
const HALF_W = 7;
const BOX_H = 8;

interface LightDef {
  tex: string;
  radius: number;
  alpha: number;
  dx?: number;
  dy: number;
  flicker?: number[];
}
const LIGHTS: Record<string, LightDef[]> = {
  [OBJ_KEYS.lamp]: [{ tex: FX_KEYS.poolWarm, radius: 92, alpha: 0.85, dy: -16, flicker: [1, 0.9, 0.78] }],
  [OBJ_KEYS.brazier]: [{ tex: FX_KEYS.poolWarm, radius: 80, alpha: 0.7, dy: -10, flicker: [1, 0.82] }],
  [OBJ_KEYS.floorLamp]: [{ tex: FX_KEYS.poolWarm, radius: 96, alpha: 0.8, dy: -26 }],
  [OBJ_KEYS.labDesk]: [
    { tex: FX_KEYS.poolWarm, radius: 78, alpha: 0.7, dx: 14, dy: -14 },
    { tex: FX_KEYS.poolMonitor, radius: 44, alpha: 0.55, dx: -4, dy: -22, flicker: [1, 0.85] },
  ],
  [OBJ_KEYS.terminal]: [{ tex: FX_KEYS.poolMonitor, radius: 46, alpha: 0.6, dy: -20, flicker: [1, 0.85] }],
  [OBJ_KEYS.caseEmpty]: [{ tex: FX_KEYS.poolCool, radius: 40, alpha: 0.2, dy: -16 }],
  [OBJ_KEYS.caseFilled]: [{ tex: FX_KEYS.poolCool, radius: 40, alpha: 0.26, dy: -16 }],
};

interface LightActor {
  img: Phaser.GameObjects.Image;
  def: LightDef;
  src: Phaser.GameObjects.Sprite | null;
  base: number;
}

interface ObjActor {
  def: Interactable;
  res: ResolvedSprite;
  sprite: Phaser.GameObjects.Sprite;
  lights: LightActor[];
  visible: boolean;
  stateful: boolean;
}

interface Interactive {
  id: string;
  kind: Interactable['kind'];
  def?: Interactable;
  center: () => Pt;
  feet: () => Pt;
  tile: () => Pt;
  top: () => number;
  bounds: () => Phaser.Geom.Rectangle;
  passable: boolean;
}

type Dir4 = 'up' | 'down' | 'left' | 'right';

export class WorldScene extends Phaser.Scene {
  private initData!: WorldInit;
  sceneId = 'lab';
  private map!: MapData;
  private auto!: AutotileResult;
  private solidBase: boolean[][] = [];
  solid: boolean[][] = [];

  private player!: Phaser.GameObjects.Sprite;
  private px = 0;
  private py = 0;
  facing: Facing = 'down';
  private path: Pt[] = [];
  private pending: Interactive | null = null;
  private pendingRetries = 0;
  private blockedFor = 0;
  private stepClock = 0;

  private objects: ObjActor[] = [];
  private npcs: NpcActor[] = [];
  private lightActors: LightActor[] = [];
  private windowLights: { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; lampBoost: number }[] = [];
  private tintRect!: Phaser.GameObjects.Rectangle;
  private marker!: Phaser.GameObjects.Image;
  private hinted: Interactive | null = null;

  private held: Dir4[] = [];
  private busPaused = false;
  private lastFrozen = false;
  transitioning = false;
  private lastMinuteEmitted = -1;
  private lastNpcMinute = -1;
  private cleanups: (() => void)[] = [];

  constructor() {
    super('World');
  }

  init(data: WorldInit): void {
    this.initData = data;
    this.sceneId = data.sceneId;
    this.held = [];
    this.path = [];
    this.pending = null;
    this.objects = [];
    this.npcs = [];
    this.lightActors = [];
    this.windowLights = [];
    this.hinted = null;
    this.transitioning = false;
    this.cleanups = [];
    this.lastNpcMinute = -1;
  }

  // ───────────────────────── 생성 ─────────────────────────

  create(): void {
    this.map = getMap(this.sceneId);
    this.auto = autotile(this.map);
    this.solidBase = buildSolidGrid(this.map);
    this.solid = this.solidBase.map((r) => r.slice());
    this.cameras.main.setBackgroundColor('#0b0d12');

    this.bakeTiles();
    this.createStaticSprites();
    this.createObjects();
    this.rebuildSolid();
    this.createWindows();
    this.createNpcs();
    this.createPlayer();
    this.createAtmosphere();
    this.createMarker();
    this.setupCamera();
    this.setupInput();
    this.setupSubscriptions();

    const store = useGameStore.getState();
    if (store.currentScene !== this.sceneId) store.setScene(this.sceneId);
    setAmbience(this.map.ambient);
    bus.emit('scene:enter', { sceneId: this.sceneId });
    bus.emit('world:time', { minute: worldClock.whole });
    this.lastMinuteEmitted = worldClock.whole;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());

    if (this.initData.transition) {
      this.transitioning = true;
      const kind = this.initData.transition;
      void transitionIn(this.game.canvas, kind).then(() => {
        if (this.scene.isActive(this.scene.key)) this.transitioning = false;
      });
    }
  }

  private cleanup(): void {
    for (const c of this.cleanups.splice(0)) c();
  }

  private bakeTiles(): void {
    const { w, h } = this.map;
    const key = `map_${this.sceneId}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, w * TILE, h * TILE);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    const blit = (tk: string, x: number, y: number) => {
      const t = this.textures.get(tk);
      const src = t.getSourceImage() as CanvasImageSource;
      ctx.drawImage(src, 0, 0, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = this.auto.cells[y][x];
        if (c.ground) blit(c.ground, x, y);
        if (c.wall) blit(c.wall, x, y);
      }
    }
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000);
  }

  private createStaticSprites(): void {
    for (const p of this.auto.pines) {
      const baseY = (p.y + 2) * TILE;
      this.add.image((p.x + 1) * TILE, baseY, OBJ_KEYS.pine, 0).setOrigin(0.5, 1).setDepth(baseY - 6);
    }
    for (const p of this.auto.wells) {
      const baseY = (p.y + 1) * TILE;
      this.add.image(p.x * TILE + TILE / 2, baseY - 1, OBJ_KEYS.well, 0).setOrigin(0.5, 1).setDepth(baseY - 2);
    }
  }

  private objectFilled(def: Interactable): boolean {
    const st = useGameStore.getState();
    const col = def.grants?.collect;
    if (col && col.length > 0) return col.some((c) => (st.collection[c.entryId] ?? 0) >= 1);
    return st.examined.includes(def.id);
  }

  private createObjects(): void {
    for (const def of getSceneObjects(this.sceneId)) {
      const res = resolveObjectSprite(def.spriteKey, { ambient: this.map.ambient, filled: this.objectFilled(def) });
      const stateful = def.spriteKey === 'obj_display_case' || res.key === OBJ_KEYS.caseEmpty || res.key === OBJ_KEYS.caseFilled;
      let sprite: Phaser.GameObjects.Sprite;
      if (res.character) {
        const f = tileToFeet({ x: def.x, y: def.y });
        sprite = this.add.sprite(f.x, f.y, res.key, charFrame('down')).setOrigin(12 / 24, 34 / 36).setDepth(f.y);
      } else if (res.kind === 'tile') {
        sprite = this.add.sprite(def.x * TILE, def.y * TILE, res.key, 0).setOrigin(0, 0).setDepth(def.y * TILE - 400);
      } else if (res.wallMounted) {
        sprite = this.add.sprite(def.x * TILE + TILE / 2, def.y * TILE + TILE / 2, res.key, 0).setOrigin(0.5, 0.5).setDepth(def.y * TILE + 20);
      } else {
        const baseY = (def.y + 1) * TILE - 2;
        sprite = this.add.sprite(def.x * TILE + TILE / 2, baseY, res.key, 0).setOrigin(0.5, 1).setDepth(baseY);
      }
      if (res.anim && this.anims.exists(res.anim)) sprite.play({ key: res.anim, delay: Math.random() * 500 });
      const lights: LightActor[] = [];
      for (const ld of LIGHTS[res.key] ?? []) {
        const img = this.add.image(sprite.x + (ld.dx ?? 0), sprite.y + ld.dy, ld.tex).setBlendMode(Phaser.BlendModes.ADD).setDepth(50001);
        img.setScale((ld.radius * 2) / img.width);
        const la: LightActor = { img, def: ld, src: ld.flicker && res.anim ? sprite : null, base: ld.alpha };
        lights.push(la);
        this.lightActors.push(la);
      }
      this.objects.push({ def, res, sprite, lights, visible: true, stateful });
    }
    this.syncObjects();
  }

  /** requires 플래그와 수집 진행에 맞춰 표시/상태를 갱신한다. */
  private syncObjects(): void {
    const st = useGameStore.getState();
    let changed = false;
    for (const o of this.objects) {
      const vis = canInteract(o.def, st.flags);
      if (vis !== o.visible) {
        o.visible = vis;
        o.sprite.setVisible(vis);
        changed = true;
      }
      for (const l of o.lights) l.img.setVisible(vis);
      if (o.stateful) {
        const key = this.objectFilled(o.def) ? OBJ_KEYS.caseFilled : OBJ_KEYS.caseEmpty;
        if (o.sprite.texture.key !== key) {
          o.sprite.setTexture(key, 0);
          for (const l of o.lights) l.base = key === OBJ_KEYS.caseFilled ? 0.26 : 0.2;
        }
      }
    }
    if (changed) {
      this.rebuildSolid();
      this.unstick();
    }
  }

  private rebuildSolid(): void {
    this.solid = this.solidBase.map((r) => r.slice());
    for (const o of this.objects) {
      if (!o.visible || o.def.kind === 'door' || o.def.kind === 'npc') continue;
      if (this.solid[o.def.y]?.[o.def.x] !== undefined) this.solid[o.def.y][o.def.x] = true;
    }
  }

  private unstick(): void {
    if (!this.player) return;
    const t = feetToTile({ x: this.px, y: this.py });
    if (!isSolid(this.solid, t.x, t.y)) return;
    const n = nearestWalkable(this.solid, t);
    if (!n) return;
    const f = tileToFeet(n);
    this.px = f.x;
    this.py = f.y;
    this.path = [];
  }

  private createWindows(): void {
    const lamps = this.objects.filter((o) => LIGHTS[o.res.key]?.some((l) => l.tex === FX_KEYS.poolWarm));
    for (const p of this.auto.windows) {
      let boost = 0;
      for (const l of lamps) {
        const d = Math.hypot(l.def.x - p.x, l.def.y - p.y);
        if (d < 5) boost = Math.max(boost, 0.85 - d * 0.1);
      }
      const img = this.add.image(p.x * TILE, p.y * TILE, 'tile_window_hanji_lit').setOrigin(0, 0).setDepth(-900).setAlpha(0);
      const glow = this.add
        .image(p.x * TILE + TILE / 2, p.y * TILE + TILE + 6, FX_KEYS.poolWarm)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(50001)
        .setAlpha(0);
      glow.setScale(70 / glow.width);
      this.windowLights.push({ img, glow, lampBoost: boost });
    }
  }

  private createNpcs(): void {
    const minute = worldClock.whole;
    for (const def of getSceneNpcs(this.sceneId)) {
      const a = new NpcActor(this, def, this.sceneId, () => this.solid);
      a.setWaypoint(npcWaypointAt(def, minute), true);
      this.npcs.push(a);
    }
  }

  private createPlayer(): void {
    const key = playerSpriteKey(this.map.ambient);
    let spawn: Pt = this.initData.spawn ?? this.spawnNearDoor() ?? this.map.spawn;
    spawn = nearestWalkable(this.solid, spawn) ?? spawn;
    const f = tileToFeet(spawn);
    this.px = f.x;
    this.py = f.y;
    this.player = this.add.sprite(f.x, f.y, key, charFrame('down')).setOrigin(12 / 24, 34 / 36);
    this.facing = 'down';
    this.player.play(`${key}_idle_down`);
  }

  /** 이전 씬으로 가는 문 옆에 생성(문 → 그 문 앞 칸). */
  private spawnNearDoor(): Pt | null {
    const from = this.initData.fromSceneId;
    if (!from) return null;
    const door = this.objects.find((o) => o.def.kind === 'door' && o.def.targetSceneId === from);
    if (!door) return null;
    const dp = { x: door.def.x, y: door.def.y };
    const cands = [
      { x: dp.x, y: dp.y + 1 },
      { x: dp.x, y: dp.y - 1 },
      { x: dp.x - 1, y: dp.y },
      { x: dp.x + 1, y: dp.y },
    ];
    return cands.find((c) => !isSolid(this.solid, c.x, c.y)) ?? null;
  }

  private tintFor(): { color: RGB; dark: number } {
    const c = this.map.ambient === 'past' ? ambientTint(worldClock.minute) : (MODERN_TINTS[this.sceneId] ?? MODERN_TINTS.default);
    return { color: c, dark: this.map.ambient === 'past' ? darkness(c) : 0.85 };
  }

  private createAtmosphere(): void {
    const { color } = this.tintFor();
    const cx = (this.map.w * TILE) / 2;
    const cy = (this.map.h * TILE) / 2;
    this.tintRect = this.add.rectangle(cx, cy, 9000, 9000, rgbToHex(color)).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(50000);
  }

  private createMarker(): void {
    this.marker = this.add.image(0, 0, FX_KEYS.marker).setOrigin(0.5, 1).setDepth(60000).setVisible(false);
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    this.applyZoom();
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.centerOn(this.px, this.py - 16);
    const onResize = () => this.applyZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.cleanups.push(() => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
  }

  private applyZoom(): void {
    const cam = this.cameras.main;
    const zoom = devOptions.zoom ?? chooseZoom(this.scale.width, this.scale.height);
    cam.setSize(this.scale.width, this.scale.height);
    cam.setZoom(zoom);
    // 맵이 화면보다 작으면 가운데 정렬되도록 경계를 화면 크기까지 넓힌다.
    const mw = this.map.w * TILE;
    const mh = this.map.h * TILE;
    const vw = this.scale.width / zoom;
    const vh = this.scale.height / zoom;
    const bw = Math.max(mw, vw);
    const bh = Math.max(mh, vh);
    cam.setBounds(Math.min(0, (mw - bw) / 2), Math.min(0, (mh - bh) / 2), bw, bh);
  }

  // ───────────────────────── 입력 ─────────────────────────

  private setupInput(): void {
    const dirOf = (e: KeyboardEvent): Dir4 | null => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          return 'up';
        case 'ArrowDown':
        case 's':
        case 'S':
          return 'down';
        case 'ArrowLeft':
        case 'a':
        case 'A':
          return 'left';
        case 'ArrowRight':
        case 'd':
        case 'D':
          return 'right';
        default:
          return null;
      }
    };
    const editable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el || !el.tagName) return false;
      return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    };
    const onDown = (e: KeyboardEvent) => {
      if (editable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const d = dirOf(e);
      if (d) {
        if (!this.held.includes(d)) this.held.push(d);
        if (e.key.startsWith('Arrow') && !this.isFrozen()) e.preventDefault();
        return;
      }
      if (e.repeat) return;
      const isAct = e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter';
      if (!isAct) return;
      const el = e.target as HTMLElement | null;
      if ((e.key === ' ' || e.key === 'Enter') && el && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute?.('role') === 'button')) return;
      if (this.isFrozen()) return;
      const t = this.nearestInteractive();
      if (t) {
        if (e.key === ' ') e.preventDefault();
        this.activate(t);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const d = dirOf(e);
      if (d) this.held = this.held.filter((h) => h !== d);
    };
    const onBlur = () => (this.held = []);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    this.cleanups.push(() => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    });

    const onPointer = (p: Phaser.Input.Pointer) => this.onTap(p);
    this.input.on('pointerdown', onPointer);
    this.cleanups.push(() => this.input.off('pointerdown', onPointer));
  }

  private setupSubscriptions(): void {
    const offGoto = bus.on('scene:goto', ({ sceneId, spawn }) => void this.gotoScene(sceneId, spawn));
    const offPause = bus.on('world:pause', ({ paused }) => {
      this.busPaused = paused;
    });
    const unsub = useGameStore.subscribe((s, prev) => {
      if (s.flags !== prev.flags || s.collection !== prev.collection || s.examined !== prev.examined) this.syncObjects();
      if (s.currentScene !== prev.currentScene && s.currentScene && s.currentScene !== this.sceneId && !this.transitioning) {
        void this.gotoScene(s.currentScene);
      }
    });
    this.cleanups.push(offGoto, offPause, unsub);
  }

  isFrozen(): boolean {
    if (this.transitioning || this.busPaused) return true;
    const ui = useGameStore.getState().ui;
    return ui.paused || ui.modal !== null;
  }

  // ───────────────────────── 상호작용 대상 ─────────────────────────

  private interactives(): Interactive[] {
    const out: Interactive[] = [];
    for (const o of this.objects) {
      if (!o.visible) continue;
      const def = o.def;
      const feet = tileToFeet({ x: def.x, y: def.y });
      out.push({
        id: def.id,
        kind: def.kind,
        def,
        center: () => ({ x: feet.x, y: feet.y }),
        feet: () => feet,
        tile: () => ({ x: def.x, y: def.y }),
        top: () => (o.res.kind === 'tile' ? def.y * TILE : o.sprite.y - o.sprite.displayHeight * o.sprite.originY),
        bounds: () => o.sprite.getBounds(),
        passable: def.kind === 'door' || def.kind === 'npc',
      });
    }
    for (const n of this.npcs) {
      if (!n.present) continue;
      out.push({
        id: n.def.id,
        kind: 'npc',
        center: () => ({ x: n.x, y: n.y }),
        feet: () => ({ x: n.x, y: n.y }),
        tile: () => n.tile,
        top: () => n.y - 38,
        bounds: () => n.sprite.getBounds(),
        passable: true,
      });
    }
    return out;
  }

  private nearestInteractive(): Interactive | null {
    const list = this.interactives().map((it) => ({ id: it.id, it, ...it.feet() }));
    const hit = pickInteractable({ x: this.px, y: this.py }, this.facing, list, INTERACT_RANGE);
    return hit ? hit.it : null;
  }

  /** 대상 활성화: 문은 월드가 전환, 나머지는 UI 로. */
  activate(t: Interactive): void {
    const f = t.feet();
    this.facing = facingFromVector(f.x - this.px, f.y - this.py, this.facing);
    if (t.kind === 'door' && t.def?.targetSceneId) {
      void this.gotoScene(t.def.targetSceneId);
      return;
    }
    bus.emit('interact', { targetId: t.id });
  }

  private onTap(p: Phaser.Input.Pointer): void {
    if (this.isFrozen()) return;
    const wx = p.worldX;
    const wy = p.worldY;
    let hit: Interactive | null = null;
    let bestD = Infinity;
    for (const it of this.interactives()) {
      const b = it.bounds();
      if (wx < b.x - 6 || wx > b.right + 6 || wy < b.y - 6 || wy > b.bottom + 6) continue;
      const c = it.center();
      const d = Math.hypot(wx - c.x, wy - c.y);
      if (d < bestD) {
        bestD = d;
        hit = it;
      }
    }
    if (hit) {
      this.approach(hit);
      return;
    }
    const tile = { x: Math.floor(wx / TILE), y: Math.floor(wy / TILE) };
    this.walkToTile(tile);
  }

  private walkToTile(tile: Pt): void {
    const goal = nearestWalkable(this.solid, tile);
    if (!goal) return;
    const path = findPath(this.solid, feetToTile({ x: this.px, y: this.py }), goal);
    if (!path) return;
    this.pending = null;
    this.path = path;
    this.tapRipple(goal);
  }

  private tapRipple(tile: Pt): void {
    const g = this.add.graphics().setDepth(60000);
    const c = tileToFeet(tile);
    g.lineStyle(1, 0xdccfae, 0.7).strokeEllipse(c.x, c.y - 2, 14, 7);
    this.tweens.add({ targets: g, alpha: 0, duration: 380, onComplete: () => g.destroy() });
  }

  private approach(t: Interactive): void {
    const f = t.feet();
    if (Math.hypot(f.x - this.px, f.y - this.py) <= INTERACT_RANGE) {
      this.path = [];
      this.activate(t);
      return;
    }
    const from = feetToTile({ x: this.px, y: this.py });
    const target = t.tile();
    const path = t.passable && !isSolid(this.solid, target.x, target.y) ? findPath(this.solid, from, target) : findPathToAdjacent(this.solid, from, target);
    if (!path) return;
    this.path = path;
    this.pending = t;
    this.pendingRetries = 0;
  }

  // ───────────────────────── 전환 ─────────────────────────

  async gotoScene(sceneId: string, spawn?: Pt): Promise<void> {
    if (this.transitioning) return;
    if (sceneId === this.sceneId && !spawn) return;
    this.transitioning = true;
    this.path = [];
    this.pending = null;
    const target = getMap(sceneId);
    const kind: TransitionKind = this.map.ambient === 'modern' && target.ambient === 'past' ? 'observe' : this.map.ambient === 'past' && target.ambient === 'modern' ? 'return' : 'fade';
    playSfx(kind === 'observe' ? 'observe' : kind === 'return' ? 'return' : 'select');
    await transitionOut(this.game.canvas, kind);
    if (!this.sys.isActive()) return;
    const data: WorldInit = { sceneId, spawn, fromSceneId: this.sceneId, transition: kind };
    this.scene.restart(data);
  }

  // ───────────────────────── 매 프레임 ─────────────────────────

  update(_t: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    const frozen = this.isFrozen();
    if (frozen !== this.lastFrozen) {
      this.lastFrozen = frozen;
      for (const n of this.npcs) n.setFrozen(frozen);
    }
    if (!frozen) {
      worldClock.tick(dt);
      const m = worldClock.whole;
      if (m !== this.lastMinuteEmitted) {
        this.lastMinuteEmitted = m;
        bus.emit('world:time', { minute: m });
      }
      if (m !== this.lastNpcMinute) {
        this.lastNpcMinute = m;
        for (const n of this.npcs) n.setWaypoint(npcWaypointAt(n.def, m), false);
      }
    }
    for (const n of this.npcs) n.update(dt, frozen);
    this.updatePlayer(dt, frozen);
    this.updateAtmosphere();
    this.updateHint(frozen);
  }

  private updatePlayer(dt: number, frozen: boolean): void {
    let vx = 0;
    let vy = 0;
    let moving = false;
    if (!frozen) {
      const dir = this.held[this.held.length - 1];
      if (dir) {
        this.path = [];
        this.pending = null;
        vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
        vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      } else if (this.path.length) {
        const t = tileToFeet(this.path[0]);
        const dx = t.x - this.px;
        const dy = t.y - this.py;
        const d = Math.hypot(dx, dy);
        const step = PLAYER_SPEED * dt;
        if (d <= step) {
          this.px = t.x;
          this.py = t.y;
          this.path.shift();
          if (this.path.length === 0) this.arrive();
        } else {
          vx = dx / d;
          vy = dy / d;
        }
      }
      if (vx !== 0 || vy !== 0) {
        const r = moveBox(this.solid, { x: this.px, y: this.py, halfW: HALF_W, h: BOX_H }, vx * PLAYER_SPEED * dt, vy * PLAYER_SPEED * dt);
        const moved = Math.hypot(r.x - this.px, r.y - this.py);
        this.px = r.x;
        this.py = r.y;
        moving = moved > 0.01;
        if (moving) {
          this.facing = facingFromVector(vx, vy, this.facing);
          this.blockedFor = 0;
        } else {
          this.blockedFor += dt;
          if (this.path.length && this.blockedFor > 0.4) {
            this.path = [];
            this.pending = null;
          }
        }
      }
    }
    if (moving) {
      this.stepClock += dt;
      if (this.stepClock > 0.3) {
        this.stepClock = 0;
        playSfx('step');
      }
    } else {
      this.stepClock = 0.2;
    }
    const key = playerSpriteKey(this.map.ambient);
    const anim = `${key}_${moving ? 'walk' : 'idle'}_${this.facing}`;
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim);
    this.player.setPosition(Math.round(this.px), Math.round(this.py)).setDepth(this.py);
    this.player.anims[frozen ? 'pause' : 'resume']();
  }

  private arrive(): void {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    const f = p.feet();
    if (Math.hypot(f.x - this.px, f.y - this.py) <= INTERACT_RANGE) {
      this.activate(p);
    } else if (this.pendingRetries < 2) {
      this.pendingRetries++;
      this.approach(p);
      this.pending = p;
    }
  }

  private updateAtmosphere(): void {
    const { color, dark } = this.tintFor();
    this.tintRect.setFillStyle(rgbToHex(color));
    const poolScale = this.map.ambient === 'past' ? 0.22 + 0.78 * dark : 0.95;
    for (const l of this.lightActors) {
      let m = 1;
      if (l.def.flicker && l.src) {
        const fi = Number(l.src.frame.name) || 0;
        m = l.def.flicker[Math.min(fi, l.def.flicker.length - 1)];
      }
      l.img.setAlpha(l.base * m * poolScale);
    }
    const lit = this.map.ambient === 'past' ? Math.max(0, (dark - 0.15) / 0.85) : 0;
    for (const w of this.windowLights) {
      const a = Math.min(1, Math.max(lit, w.lampBoost * (0.35 + 0.65 * dark)));
      w.img.setAlpha(a);
      w.glow.setAlpha(a * 0.28);
    }
  }

  private updateHint(frozen: boolean): void {
    const show = !frozen && useGameStore.getState().settings.showInteractHints !== false;
    const t = show ? this.nearestInteractive() : null;
    this.hinted = t;
    if (!t) {
      this.marker.setVisible(false);
      return;
    }
    const f = t.feet();
    const bob = Math.round(Math.sin(this.time.now / 260) * 1.5);
    this.marker.setVisible(true).setPosition(Math.round(t.kind === 'door' ? f.x : (t.bounds().centerX)), Math.round(t.top() - 4 + bob));
  }

  // ───────────────────────── 테스트 훅 ─────────────────────────

  getPlayerTile(): Pt {
    return feetToTile({ x: this.px, y: this.py });
  }

  teleport(x: number, y: number): void {
    const n = nearestWalkable(this.solid, { x, y }) ?? { x, y };
    const f = tileToFeet(n);
    this.px = f.x;
    this.py = f.y;
    this.path = [];
    this.pending = null;
    this.cameras.main.centerOn(f.x, f.y - 16);
  }

  walkTo(x: number, y: number): boolean {
    const before = this.path.length;
    this.walkToTile({ x, y });
    return this.path.length > 0 || before > 0;
  }

  interactWith(id: string): boolean {
    const t = this.interactives().find((i) => i.id === id);
    if (!t) return false;
    this.activate(t);
    return true;
  }

  listInteractives(): { id: string; kind: string; x: number; y: number }[] {
    return this.interactives().map((i) => ({ id: i.id, kind: i.kind, ...i.tile() }));
  }

  /** 현재 힌트가 가리키는 대상 id (테스트용) */
  hintedId(): string | null {
    return this.hinted?.id ?? null;
  }

  cameraInfo(): { zoom: number; scrollX: number; scrollY: number; w: number; h: number; mapW: number; mapH: number } {
    const c = this.cameras.main;
    return { zoom: c.zoom, scrollX: c.scrollX, scrollY: c.scrollY, w: c.width, h: c.height, mapW: this.map.w, mapH: this.map.h };
  }

  get ambient(): string {
    return this.map.ambient;
  }
}
