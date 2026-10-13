import Phaser from 'phaser';
import { bus } from '@/core/bus';
import { formatClock, linesAt, npcPoseAt, viewerFrame, type HotspotStatus, type ViewerFrame } from '@/core/observation';
import type { Id, Interactable, NpcDef, ObservationTimeline } from '@/core/types';
import { content } from '@/data';
import type { Flags } from '@/core/world';
import { MAPS, type SceneId } from '@/data/world/maps';
import { selectTutorial, selectViewerFrame, useGameStore } from '@/store/gameStore';
import { OBJ_KEYS } from '../art';
import { setAmbience } from '../audio';
import { FX_KEYS } from '../fx/textures';
import { resetTransition, transitionIn } from '../fx/transition';
import { resolveObjectSprite, type ResolvedSprite } from '../keys';
import { autotile, type AutotileResult } from '../logic/autotile';
import {
  chooseBaseZoom,
  clampCenter,
  decayVelocity,
  initialCam,
  nextZoomLevel,
  screenToWorld,
  smoothK,
  snapZoom,
  wheelFactor,
  worldToScreen,
  zoomAt,
  zoomLevels,
  zoomRange,
  type Cam,
  type ZoomRange,
} from '../logic/camera';
import { rgbToHex, type RGB } from '../logic/clock';
import { Gesture } from '../logic/gesture';
import { buildSolidGrid } from '../logic/grid';
import { pickHotspot, type HitTarget } from '../logic/hit';
import { inDegraded, mostlyVisible } from '../logic/capture';
import { HearingTracker, inHearRange, requiredZoom, type HearNpcIn, type HearSpec } from '../logic/hearing';
import type { DomLayer } from '../viewer/domLayer';
import { walkRoute } from '../logic/route';
import { viewerTint } from '../logic/tint';
import { TILE, type MapData } from '../logic/types';
import type { AnchorRect, ViewerCamera, ViewerHost, ViewerHotspotInfo, ViewerSnapshot } from '../viewer/types';
import { NpcActor, tileToFeet } from './NpcActor';

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
};

interface LightActor {
  img: Phaser.GameObjects.Image;
  def: LightDef;
  src: Phaser.GameObjects.Sprite | null;
}

interface ObjActor {
  def: Interactable;
  res: ResolvedSprite;
  sprite: Phaser.GameObjects.Sprite;
  lights: LightActor[];
  shimmer: boolean;
}

interface Hs {
  id: Id;
  targetId: Id;
  kind: 'object' | 'npc';
  status: HotspotStatus;
  actor?: NpcActor;
  obj?: ObjActor;
  marker: Phaser.GameObjects.Image;
}

const SLACK = TILE * 2;
const ENTER_MS = 1400;

/** 관측 #001 디오라마. 플레이어·이동·충돌 없음 — 카메라(팬/줌)와 시각(스토어)만 있다. */
export class ObservationScene extends Phaser.Scene {
  ready = false;
  private host!: ViewerHost;
  private tl!: ObservationTimeline;
  private map!: MapData;
  private auto!: AutotileResult;
  private solid: boolean[][] = [];
  private world = { w: 0, h: 0 };

  private actors = new Map<Id, NpcActor>();
  private objects: ObjActor[] = [];
  private hs: Hs[] = [];
  private windowLights: { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; boost: number }[] = [];
  private tintRect!: Phaser.GameObjects.Rectangle;
  private tintCur: RGB = [1, 1, 1];
  private tintDark = 0;
  private pulseGfx!: Phaser.GameObjects.Graphics;
  private routeGfx!: Phaser.GameObjects.Graphics;
  private routeLabels: Phaser.GameObjects.Text[] = [];
  private routeNpc: Id | null = null;
  private routeDots: { x: number; y: number }[][] = [];
  private routeStops: { x: number; y: number; time: number }[] = [];
  private routeZoomDrawn = -1;
  private explicitRoute: Id | null | undefined = undefined;

  // 오버레이(화면 고정)
  private overlayObjs: Phaser.GameObjects.GameObject[] = [];
  private scan!: Phaser.GameObjects.TileSprite;
  private noise: Phaser.GameObjects.TileSprite[] = [];
  private finder!: Phaser.GameObjects.NineSlice;
  private overlaySize = '';
  private tearCams: Phaser.Cameras.Scene2D.Camera[] = [];
  private tearUntil = 0;
  private tearStep = 0;

  // 카메라
  private cam: Cam = { x: 0, y: 0, zoom: 2 };
  private range: ZoomRange = { base: 2, min: 1, max: 6 };
  private zoomTarget = 2;
  private zoomAnchor = { x: 0, y: 0 };
  private wheelIdleAt = 0;
  private vel = { x: 0, y: 0 };
  private focusGoal: { x: number; y: number } | null = null;
  private gesture!: Gesture;
  private jitter = { x: 0, y: 0 };
  private jitterAt = 0;

  // 시각/상태
  private minute = 0;
  private localMinute: number | null = null;
  private frameGlitch = 0;
  private pulseGlitch = { level: 0, until: 0, from: 0 };
  private firstId: Id | null = null;
  private coachFirst = false;
  private detailedHints = false;
  private reduceFlicker = false;
  private hoverId: Id | null = null;
  private tapped = new Set<Id>();
  private lastAnchor = '';
  private applied = false;
  private cleanups: (() => void)[] = [];

  // 엿듣기·훼손
  private dom: DomLayer | null = null;
  private tracker = new HearingTracker();
  private npcDefs = new Map<Id, NpcDef>();
  private flags: Flags = {};
  private inRangeIds: string[] = [];
  private degradedNow = false;
  private degLevel = 0;

  constructor() {
    super('Observation');
  }

  // ───────────────────────── 생성 ─────────────────────────

  create(): void {
    this.host = this.registry.get('host') as ViewerHost;
    this.dom = (this.registry.get('dom') as DomLayer | undefined) ?? null;
    const tl = content.timelines.find((t) => t.id === this.host.timelineId);
    if (!tl) {
      this.add.text(8, 8, `timeline not found: ${this.host.timelineId}`, { color: '#dccfae', fontSize: '12px' });
      return;
    }
    this.tl = tl;
    this.map = MAPS[tl.sceneId as SceneId] as MapData;
    this.auto = autotile(this.map);
    this.solid = buildSolidGrid(this.map);
    this.world = { w: this.map.w * TILE, h: this.map.h * TILE };
    this.cameras.main.setBackgroundColor('#0b0d12');
    this.cameras.main.setRoundPixels(true);

    this.bakeTiles();
    this.createStatics();
    this.createObjects();
    this.createWindows();
    this.createNpcs();
    for (const n of content.npcs) this.npcDefs.set(n.id, n);
    this.tracker.reset();
    this.createHotspots();
    this.createAtmosphere();
    this.createOverlays();
    this.createMarkers();
    this.setupCamera();
    this.setupInput();
    this.setupSubscriptions();

    this.applyStore(true);
    setAmbience('past');
    this.ready = true;
    this.host.onReady?.();
    bus.emit('viewer:ready', { timelineId: tl.id });

    const onPost = () => this.postRender();
    this.game.events.on(Phaser.Core.Events.POST_RENDER, onPost);
    this.cleanups.push(() => this.game.events.off(Phaser.Core.Events.POST_RENDER, onPost));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());

    const canvas = this.game.canvas;
    this.enterUntil = this.time.now + ENTER_MS;
    void transitionIn(canvas, this.reduceFlicker ? 'fade' : 'observe');
  }
  private enterUntil = 0;

  private cleanup(): void {
    for (const c of this.cleanups.splice(0)) c();
    resetTransition(this.game.canvas);
    setAmbience('modern');
  }

  private bakeTiles(): void {
    const { w, h } = this.map;
    const key = `map_${this.tl.sceneId}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, w * TILE, h * TILE);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    const blit = (tk: string, x: number, y: number) => {
      const src = this.textures.get(tk).getSourceImage() as CanvasImageSource;
      ctx.drawImage(src, 0, 0, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = this.auto.cells[y]![x]!;
        if (c.ground) blit(c.ground, x, y);
        if (c.wall) blit(c.wall, x, y);
      }
    }
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000);
  }

  private createStatics(): void {
    for (const p of this.auto.pines) {
      const baseY = (p.y + 2) * TILE;
      this.add.image((p.x + 1) * TILE, baseY, OBJ_KEYS.pine, 0).setOrigin(0.5, 1).setDepth(baseY - 6);
    }
    for (const p of this.auto.wells) {
      const baseY = (p.y + 1) * TILE;
      this.add.image(p.x * TILE + TILE / 2, baseY - 1, OBJ_KEYS.well, 0).setOrigin(0.5, 1).setDepth(baseY - 2);
    }
  }

  private createObjects(): void {
    const defs = content.worldObjects.filter((o) => o.sceneId === this.tl.sceneId && o.kind !== 'door');
    for (const def of defs) {
      if (def.spriteKey === 'door' && def.kind === 'observe') {
        // 귀환 지점: 문이 아니라 공기가 일렁이는 희미한 왜곡
        const sp = this.add
          .sprite(def.x * TILE + TILE / 2, def.y * TILE + TILE / 2, FX_KEYS.shimmer)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(def.y * TILE + 30)
          .setAlpha(0.12);
        sp.setDisplaySize(30, 44);
        const res = { kind: 'sprite', key: FX_KEYS.shimmer, frame: 0, flat: false, character: false, wallMounted: true, placeholder: false } as ResolvedSprite;
        this.objects.push({ def, res, sprite: sp, lights: [], shimmer: true });
        continue;
      }
      const res = resolveObjectSprite(def.spriteKey, { ambient: 'past' });
      let sprite: Phaser.GameObjects.Sprite;
      if (res.kind === 'tile') {
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
        lights.push({ img, def: ld, src: ld.flicker && res.anim ? sprite : null });
      }
      this.objects.push({ def, res, sprite, lights, shimmer: false });
    }
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
      const glow = this.add.image(p.x * TILE + TILE / 2, p.y * TILE + TILE + 6, FX_KEYS.poolWarm).setBlendMode(Phaser.BlendModes.ADD).setDepth(50001).setAlpha(0);
      glow.setScale(70 / glow.width);
      this.windowLights.push({ img, glow, boost });
    }
  }

  private createNpcs(): void {
    const byId = new Map<Id, NpcDef>(content.npcs.map((n) => [n.id, n]));
    for (const h of this.tl.hotspots) {
      if (h.kind !== 'npc') continue;
      const def = byId.get(h.targetId);
      if (!def) continue;
      this.actors.set(def.id, new NpcActor(this, def.id, def.spriteKey, () => this.solid));
    }
  }

  private createHotspots(): void {
    const objByTarget = new Map(this.objects.map((o) => [o.def.id, o]));
    for (const h of this.tl.hotspots) {
      const marker = this.add.image(0, 0, FX_KEYS.marker).setOrigin(0.5, 1).setDepth(60000).setVisible(false);
      this.hs.push({
        id: h.id,
        targetId: h.targetId,
        kind: h.kind,
        status: 'hidden',
        actor: h.kind === 'npc' ? this.actors.get(h.targetId) : undefined,
        obj: h.kind === 'object' ? objByTarget.get(h.targetId) : undefined,
        marker,
      });
    }
    this.pulseGfx = this.add.graphics().setDepth(60001);
    this.routeGfx = this.add.graphics().setDepth(55000);
  }

  private createAtmosphere(): void {
    const t = viewerTint(this.tl.initial);
    this.tintCur = t.color;
    this.tintRect = this.add
      .rectangle(this.world.w / 2, this.world.h / 2, 9000, 9000, rgbToHex(t.color))
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(50000);
  }

  private createOverlays(): void {
    const mk = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.overlayObjs.push(o);
      return o;
    };
    this.scan = mk(this.add.tileSprite(0, 0, 8, 8, 'ov_scanline', 0).setScrollFactor(0).setDepth(90000).setAlpha(0.55));
    for (let f = 0; f < 4; f++) {
      this.noise.push(mk(this.add.tileSprite(0, 0, 8, 8, 'ov_noise', f).setScrollFactor(0).setDepth(90001).setAlpha(0).setVisible(f === 0)));
    }
    this.finder = mk(this.add.nineslice(0, 0, 'ov_viewfinder', 0, 48, 48, 12, 12, 12, 12).setScrollFactor(0).setDepth(90002).setAlpha(0.85));
    for (let i = 0; i < 2; i++) {
      const c = this.cameras.add(0, 0, 8, 8);
      c.setRoundPixels(true).setVisible(false);
      this.tearCams.push(c);
    }
  }

  private createMarkers(): void {
    // 마커 이미지는 createHotspots 에서 만든다. 여기서는 제외 대상 등록만.
    for (const c of this.tearCams) c.ignore(this.overlayObjs);
  }

  // ───────────────────────── 카메라 ─────────────────────────

  private get dpr(): number {
    const rect = this.game.canvas.getBoundingClientRect();
    return rect.width > 0 ? this.scale.width / rect.width : 1;
  }
  private get view() {
    return { w: this.scale.width, h: this.scale.height };
  }

  private computeRange(): ZoomRange {
    const dpr = this.dpr;
    const base = chooseBaseZoom(this.scale.width / dpr, this.scale.height / dpr, dpr);
    return zoomRange(base, this.view, this.world);
  }

  private setupCamera(): void {
    this.range = this.computeRange();
    this.cam = initialCam(this.tl.camera, this.range.base, this.view, this.world);
    this.zoomTarget = this.cam.zoom;
    this.applyCamera();
    const onResize = () => this.onResize();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.cleanups.push(() => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
  }

  private onResize(): void {
    const v = this.view;
    this.cameras.main.setSize(v.w, v.h);
    const prev = this.range;
    this.range = this.computeRange();
    const z = snapZoom(this.cam.zoom / prev.base * this.range.base, this.range.min, this.range.max);
    this.cam = { ...this.cam, zoom: z };
    this.zoomTarget = z;
    this.clampCam();
    this.applyCamera();
    this.overlaySize = '';
  }

  private clampCam(): void {
    const c = clampCenter(this.cam.x, this.cam.y, this.cam.zoom, this.view, this.world, SLACK);
    this.cam.x = c.x;
    this.cam.y = c.y;
  }

  private applyCamera(): void {
    const z = this.cam.zoom;
    const q = (v: number) => Math.round(v * z) / z;
    const jx = this.jitter.x / z;
    const jy = this.jitter.y / z;
    const main = this.cameras.main;
    main.setZoom(z);
    main.centerOn(q(this.cam.x + jx), q(this.cam.y + jy));
  }

  private stepCamera(dt: number): void {
    const now = this.time.now;
    // 관성
    if (!this.gesture.active && (this.vel.x !== 0 || this.vel.y !== 0)) {
      this.cam.x += (this.vel.x * dt) / 1;
      this.cam.y += (this.vel.y * dt) / 1;
      this.vel = decayVelocity(this.vel, dt, 4.5);
    }
    // 휠이 멈추면 스냅
    if (this.wheelIdleAt && now > this.wheelIdleAt) {
      this.wheelIdleAt = 0;
      this.zoomTarget = snapZoom(this.cam.zoom, this.range.min, this.range.max);
    }
    // 배율 보간
    if (Math.abs(this.zoomTarget - this.cam.zoom) > 0.002) {
      const k = smoothK(dt, 14);
      const nz = this.cam.zoom * Math.pow(this.zoomTarget / this.cam.zoom, k);
      this.cam = zoomAt(this.cam, nz, this.view, this.zoomAnchor.x, this.zoomAnchor.y);
    } else if (this.cam.zoom !== this.zoomTarget && !this.gesture.active) {
      this.cam = zoomAt(this.cam, this.zoomTarget, this.view, this.zoomAnchor.x, this.zoomAnchor.y);
    }
    // 포커스 이동
    if (this.focusGoal) {
      const k = smoothK(dt, 9);
      this.cam.x += (this.focusGoal.x - this.cam.x) * k;
      this.cam.y += (this.focusGoal.y - this.cam.y) * k;
      if (Math.hypot(this.focusGoal.x - this.cam.x, this.focusGoal.y - this.cam.y) < 0.3) this.focusGoal = null;
    }
    this.clampCam();
    this.updateJitter(now);
    this.applyCamera();
  }

  /** 카메라 목표를 즉시 정리: 관성·포커스 취소 */
  private haltMotion(): void {
    this.vel = { x: 0, y: 0 };
    this.focusGoal = null;
  }

  // ───────────────────────── 입력 ─────────────────────────

  private setupInput(): void {
    const el = this.game.canvas;
    el.style.touchAction = 'none';
    el.style.cursor = 'grab';
    const css = (e: PointerEvent | WheelEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    this.gesture = new Gesture({
      begin: () => {
        this.haltMotion();
        this.wheelIdleAt = 0;
        this.zoomTarget = this.cam.zoom;
        el.style.cursor = 'grabbing';
      },
      pan: (dx, dy) => {
        const k = this.dpr / this.cam.zoom;
        this.cam.x -= dx * k;
        this.cam.y -= dy * k;
        this.clampCam();
      },
      pinch: (ratio, cx, cy, dcx, dcy) => {
        const d = this.dpr;
        const nz = Math.min(this.range.max, Math.max(this.range.min, this.cam.zoom * ratio));
        this.cam = zoomAt(this.cam, nz, this.view, cx * d, cy * d);
        this.cam.x -= (dcx * d) / nz;
        this.cam.y -= (dcy * d) / nz;
        this.zoomAnchor = { x: cx * d, y: cy * d };
        this.zoomTarget = nz;
        this.clampCam();
      },
      tap: (x, y) => this.onTap(x, y),
      doubleTap: (x, y) => this.onDoubleTap(x, y),
      fling: (vx, vy) => {
        const k = this.dpr / this.cam.zoom;
        this.vel = { x: -vx * k, y: -vy * k };
      },
      end: () => {
        el.style.cursor = this.hoverId ? 'pointer' : 'grab';
        this.zoomAnchor = this.zoomAnchor.x || this.zoomAnchor.y ? this.zoomAnchor : { x: this.view.w / 2, y: this.view.h / 2 };
        this.zoomTarget = snapZoom(this.cam.zoom, this.range.min, this.range.max);
      },
      hover: (x, y) => {
        const id = this.hitAt(x, y);
        if (id !== this.hoverId) {
          this.hoverId = id;
          el.style.cursor = id ? 'pointer' : 'grab';
        }
      },
    });

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const p = css(e);
      this.gesture.down(e.pointerId, p.x, p.y, e.timeStamp);
    };
    const move = (e: PointerEvent) => {
      const p = css(e);
      this.gesture.move(e.pointerId, p.x, p.y, e.timeStamp);
    };
    const up = (e: PointerEvent) => {
      const p = css(e);
      this.gesture.up(e.pointerId, p.x, p.y, e.timeStamp);
    };
    const cancel = () => this.gesture.cancel();
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = css(e);
      const d = this.dpr;
      const f = wheelFactor(e.deltaY, e.deltaMode);
      const nz = Math.min(this.range.max, Math.max(this.range.min, this.cam.zoom * f));
      this.haltMotion();
      this.cam = zoomAt(this.cam, nz, this.view, p.x * d, p.y * d);
      this.zoomAnchor = { x: p.x * d, y: p.y * d };
      this.zoomTarget = nz;
      this.wheelIdleAt = this.time.now + 160;
      this.clampCam();
    };
    const block = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', block);
    el.addEventListener('dblclick', block);
    this.cleanups.push(() => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('contextmenu', block);
      el.removeEventListener('dblclick', block);
    });
  }

  // ───────────────────────── 핫스팟 히트 ─────────────────────────

  /** 핫스팟의 월드 경계 중심·반 크기(월드 px) */
  private worldBox(h: Hs): { cx: number; cy: number; hw: number; hh: number } | null {
    if (h.actor) {
      if (!h.actor.shown) return null;
      return { cx: h.actor.x, cy: h.actor.y - 17, hw: 12, hh: 18 };
    }
    if (h.obj) {
      const b = h.obj.sprite.getBounds();
      return { cx: b.centerX, cy: b.centerY, hw: b.width / 2, hh: b.height / 2 };
    }
    return null;
  }

  private screenBox(h: Hs): HitTarget | null {
    if (h.status === 'hidden' || this.degradedNow) return null;
    const b = this.worldBox(h);
    if (!b) return null;
    const d = this.dpr;
    const s = worldToScreen(this.cam, this.view, b.cx, b.cy);
    const k = this.cam.zoom / d;
    return { id: h.id, cx: s.x / d, cy: s.y / d, halfW: b.hw * k, halfH: b.hh * k, priority: h.kind === 'npc' ? 1 : 0 };
  }

  private targets(): HitTarget[] {
    const out: HitTarget[] = [];
    for (const h of this.hs) {
      const t = this.screenBox(h);
      if (t) out.push(t);
    }
    return out;
  }

  private hitAt(x: number, y: number): Id | null {
    return pickHotspot(x, y, this.targets());
  }

  private onTap(x: number, y: number): void {
    if (this.degradedNow) return;
    const id = this.hitAt(x, y);
    if (id) {
      this.tapHotspot(id);
    } else {
      this.host.onEmptyTap?.({ x, y });
    }
  }

  private onDoubleTap(x: number, y: number): void {
    const d = this.dpr;
    this.haltMotion();
    this.zoomAnchor = { x: x * d, y: y * d };
    this.zoomTarget = nextZoomLevel(this.cam.zoom, this.range);
    // 더블탭한 점이 화면 가운데 쪽으로 오도록 약간 끌어당긴다
    const w = screenToWorld(this.cam, this.view, x * d, y * d);
    this.focusGoal = { x: w.x, y: w.y };
  }

  /** 탭 처리(실제 탭·테스트 훅 공통) */
  tapHotspot(id: Id): boolean {
    const h = this.hs.find((x) => x.id === id);
    if (!h || this.degradedNow) return false;
    const r = useGameStore.getState().tapHotspot(id);
    this.host.onTapHotspot?.(id);
    this.ripple(h);
    if (r) {
      bus.emit('feedback', { kind: 'tap' });
      bus.emit('viewer:tapped', { hotspotId: id });
    }
    return !!r;
  }

  private ripple(h: Hs): void {
    const b = this.worldBox(h);
    if (!b) return;
    const g = this.add.graphics().setDepth(60002);
    const u = this.dpr / this.cam.zoom;
    g.lineStyle(2 * u, 0xdccfae, 0.85).strokeEllipse(0, 0, 24 * u, 12 * u);
    g.setPosition(b.cx, b.cy + b.hh - 2);
    this.tweens.add({ targets: g, alpha: 0, scaleX: 2.2, scaleY: 2.2, duration: 420, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  }

  // ───────────────────────── 스토어 연동 ─────────────────────────

  private setupSubscriptions(): void {
    const unsub = useGameStore.subscribe((s, prev) => {
      if (
        s.obsMinute !== prev.obsMinute ||
        s.flags !== prev.flags ||
        s.tapped !== prev.tapped ||
        s.settings !== prev.settings ||
        s.tutorial !== prev.tutorial ||
        s.lastTap !== prev.lastTap ||
        s.ui !== prev.ui
      )
        this.applyStore(false);
    });
    const offFocus = bus.on('viewer:focus', ({ hotspotId, x, y }) => {
      if (hotspotId) this.focusHotspot(hotspotId);
      else if (x !== undefined && y !== undefined) this.focusTile(x, y);
    });
    const offGlitch = bus.on('glitch', (p) => {
      // 확장 필드(kind)가 오면 지움/되살림 전용 연출, 아니면 일반 어긋남(가로 찢김)
      const kind = (p as { kind?: string }).kind;
      if (kind === 'erase' || kind === 'restore') this.playShift(kind, p.ms);
      else this.glitchPulse(p.intensity, p.ms);
    });
    this.cleanups.push(unsub, offFocus, offGlitch);
  }

  private currentFrame(): ViewerFrame {
    const st = useGameStore.getState();
    if (this.localMinute !== null) return viewerFrame(this.tl, this.localMinute, content, st.flags);
    return selectViewerFrame(st, content, this.tl.id) ?? viewerFrame(this.tl, this.tl.initial, content, st.flags);
  }

  /** 스토어(또는 로컬 시각)의 프레임을 씬에 반영 */
  private applyStore(snap: boolean): void {
    const st = useGameStore.getState();
    const frame = this.currentFrame();
    const first = !this.applied;
    this.applied = true;
    this.minute = frame.minute;
    this.frameGlitch = frame.glitch;
    this.reduceFlicker = !!st.settings.reduceFlicker;
    this.detailedHints = st.settings.hintLevel === 'detailed';
    this.tapped = new Set(st.tapped);
    this.flags = st.flags;
    this.degradedNow = inDegraded(this.minute, this.host.degraded);

    const status = new Map(frame.hotspots.map((h) => [h.id, h.status]));
    for (const f of frame.npcs) this.actors.get(f.id)?.setPose(f.pose, snap || first);
    for (const h of this.hs) {
      h.status = status.get(h.id) ?? 'hidden';
      if (h.actor) h.actor.setShown(h.status === 'available');
      if (h.obj) {
        const vis = h.status !== 'hidden';
        h.obj.sprite.setVisible(vis);
        for (const l of h.obj.lights) l.img.setVisible(vis);
      }
    }

    // 코치마크가 가리키는 '첫 핫스팟' = 시작 카메라에 가장 가까운 available
    const cam = this.tl.camera;
    let best: Id | null = null;
    let bd = Infinity;
    for (const h of frame.hotspots) {
      if (h.status !== 'available') continue;
      const d = Math.hypot(h.x - cam.x, h.y - cam.y);
      if (d < bd) {
        bd = d;
        best = h.id;
      }
    }
    this.firstId = best;
    const tut = selectTutorial(st, content, 'viewer');
    this.coachFirst = !!tut && tut.coach && tut.step.target === 'viewer.hotspot.first';

    // 길 표시 대상
    const tapNpc = st.lastTap?.kind === 'npc' ? st.lastTap.targetId : null;
    this.setRoute(this.explicitRoute === undefined ? tapNpc : this.explicitRoute, false);
  }

  /** 핸들: 시각을 바꾼다. 관측 중이 아니면 뷰어 내부 미리보기. */
  setMinute(m: number): void {
    const r = useGameStore.getState().scrubObservation(m);
    if (Number.isNaN(r)) {
      this.localMinute = Math.max(this.tl.start, Math.min(this.tl.end, Math.round(m)));
    } else {
      this.localMinute = null;
    }
    this.applyStore(false);
  }

  getMinute(): number {
    return this.minute;
  }

  // ───────────────────────── 핸들 API ─────────────────────────

  private findHs(id: Id): Hs | undefined {
    return this.hs.find((h) => h.id === id || h.targetId === id);
  }

  focusHotspot(id: Id): void {
    this.focusTarget(id);
  }

  focusTile(x: number, y: number): void {
    this.focusPoint(x * TILE + TILE / 2, y * TILE + TILE / 2);
  }

  private focusPoint(wx: number, wy: number): void {
    this.vel = { x: 0, y: 0 };
    this.focusGoal = { x: wx, y: wy };
    if (this.cam.zoom < this.range.base) {
      this.zoomAnchor = { x: this.view.w / 2, y: this.view.h / 2 };
      this.zoomTarget = this.range.base;
    }
  }

  zoomTo(zoom: number): void {
    this.zoomAnchor = { x: this.view.w / 2, y: this.view.h / 2 };
    this.zoomTarget = snapZoom(zoom, this.range.min, this.range.max);
    this.wheelIdleAt = 0;
  }

  zoomStep(dir: 1 | -1): void {
    const lv = zoomLevels(this.range);
    const z = this.zoomTarget;
    const next = dir > 0 ? lv.find((l) => l > z + 0.01) : [...lv].reverse().find((l) => l < z - 0.01);
    if (next !== undefined) this.zoomTo(next);
  }

  getCameraInfo(): ViewerCamera {
    const d = this.dpr;
    return {
      x: this.cam.x,
      y: this.cam.y,
      zoom: this.cam.zoom,
      zoomCss: this.cam.zoom / d,
      minZoom: this.range.min,
      maxZoom: this.range.max,
      baseZoom: this.range.base,
      width: this.scale.width / d,
      height: this.scale.height / d,
      dpr: d,
    };
  }

  /** 페이지 좌표(client px)로 환산한 핫스팟 목록(테스트 훅) */
  listHotspots(): ViewerHotspotInfo[] {
    const rect = this.game.canvas.getBoundingClientRect();
    const out: ViewerHotspotInfo[] = [];
    for (const h of this.hs) {
      const t = this.screenBox(h);
      if (!t) continue;
      out.push({ id: h.id, x: rect.left + t.cx, y: rect.top + t.cy, available: h.status === 'available' });
    }
    return out;
  }

  setExplicitRoute(id: Id | null | undefined): void {
    this.explicitRoute = id;
    const st = useGameStore.getState();
    const tapNpc = st.lastTap?.kind === 'npc' ? st.lastTap.targetId : null;
    this.setRoute(id === undefined ? tapNpc : id, false);
  }

  // ───────────────────────── 길 표시 ─────────────────────────

  private setRoute(npcId: Id | null, force: boolean): void {
    if (!force && npcId === this.routeNpc) return;
    this.routeNpc = npcId;
    this.routeDots = [];
    this.routeStops = [];
    this.routeZoomDrawn = -1;
    for (const t of this.routeLabels.splice(0)) t.destroy();
    this.routeGfx.clear();
    if (!npcId) return;
    const def = content.npcs.find((n) => n.id === npcId);
    if (!def || !this.actors.has(npcId)) return;
    const sched = [...def.schedule].sort((a, b) => a.time - b.time);
    for (let i = 0; i < sched.length; i++) {
      const w = sched[i]!;
      if (i > 0) {
        const p = sched[i - 1]!;
        const poly = walkRoute(this.solid, { x: p.x, y: p.y }, { x: w.x, y: w.y }).map((q) => tileToFeet(q));
        this.routeDots.push(poly);
      }
      if (w.time >= this.tl.start && w.time <= this.tl.end) {
        const f = tileToFeet({ x: w.x, y: w.y });
        this.routeStops.push({ x: f.x, y: f.y, time: w.time });
      }
    }
    const res = Math.ceil(this.dpr);
    for (const s of this.routeStops) {
      const t = this.add
        .text(s.x, s.y - 6, formatClock(s.time), { fontFamily: 'monospace', fontSize: '11px', color: '#dccfae', stroke: '#25211e', strokeThickness: 3 })
        .setOrigin(0.5, 1)
        .setDepth(55001)
        .setResolution(res)
        .setAlpha(0.9);
      this.routeLabels.push(t);
    }
  }

  private drawRoute(): void {
    if (!this.routeNpc) return;
    const z = this.cam.zoom;
    const u = this.dpr / z;
    this.routeLabels.forEach((t) => t.setScale(u));
    if (Math.abs(z - this.routeZoomDrawn) < 0.01) return;
    this.routeZoomDrawn = z;
    const g = this.routeGfx;
    g.clear();
    const gap = 7 * u;
    const size = 1.6 * u;
    g.fillStyle(0xdccfae, 0.6);
    for (const poly of this.routeDots) {
      let carry = 0;
      for (let i = 1; i < poly.length; i++) {
        const a = poly[i - 1]!;
        const b = poly[i]!;
        const seg = Math.hypot(b.x - a.x, b.y - a.y);
        let d = carry;
        while (d < seg) {
          const t = seg === 0 ? 0 : d / seg;
          g.fillRect(a.x + (b.x - a.x) * t - size / 2, a.y + (b.y - a.y) * t - size / 2, size, size);
          d += gap;
        }
        carry = d - seg;
      }
    }
    g.lineStyle(1.5 * u, 0xdccfae, 0.8);
    for (const s of this.routeStops) g.strokeCircle(s.x, s.y, 3.5 * u);
  }

  // ───────────────────────── 효과 ─────────────────────────

  private glitchPulse(intensity: number, ms: number): void {
    const now = this.time.now;
    this.pulseGlitch = { level: Math.max(0, Math.min(1, intensity)), until: now + ms, from: now };
    if (!this.reduceFlicker) this.tearUntil = now + Math.min(260, Math.max(100, ms * 0.5));
  }

  /**
   * 지움(erase): 차갑고 소리 없는 감광+탈채색. 되살림(restore): 따뜻한 먹이 번져 채워짐. 네온·파티클 없음.
   * 뷰어는 읽기 전용이다(과거 상태를 바꾸지 않고 보이는 질감만 바꾼다).
   */
  playShift(kind: 'erase' | 'restore', ms = 1200): void {
    const dur = Math.max(500, Math.min(2400, ms));
    if (kind === 'erase') {
      const c = this.game.canvas;
      c.style.transition = `filter ${dur * 0.4}ms ease-in`;
      c.style.filter = 'brightness(0.5) saturate(0.15) hue-rotate(-12deg) contrast(1.05)';
      window.setTimeout(() => {
        c.style.transition = `filter ${dur * 0.6}ms ease-out`;
        c.style.filter = '';
      }, dur * 0.45);
      return;
    }
    const W = this.scale.width;
    const H = this.scale.height;
    const r = Math.hypot(W, H) / 2;
    const ink = this.add.circle(W / 2, H / 2, r, 0x9a6a32, 0.32).setScrollFactor(0).setDepth(90003).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.overlayObjs.push(ink);
    for (const c of this.tearCams) c.ignore(ink);
    ink.setScale(0.02 / this.cam.zoom);
    const u = 1 / this.cam.zoom;
    this.tweens.add({
      targets: ink,
      scale: u * 1.05,
      duration: dur * 0.55,
      ease: 'Sine.easeOut',
      onUpdate: () => ink.setPosition(this.scale.width / 2, this.scale.height / 2),
      onComplete: () =>
        this.tweens.add({
          targets: ink,
          alpha: 0,
          duration: dur * 0.45,
          onComplete: () => {
            this.overlayObjs = this.overlayObjs.filter((o) => o !== ink);
            ink.destroy();
          },
        }),
    });
  }

  private effectiveGlitch(now: number): number {
    const p = this.pulseGlitch;
    const pv = now < p.until ? p.level * (1 - (now - p.from) / Math.max(1, p.until - p.from)) : 0;
    return Math.max(this.frameGlitch, pv);
  }

  private updateJitter(now: number): void {
    const g = this.effectiveGlitch(now);
    const enter = now < this.enterUntil ? 1 - (this.enterUntil - now) / ENTER_MS : 1;
    const amt = this.reduceFlicker ? 0 : Math.max(g * 2.2, enter < 1 ? (1 - enter) * 2.5 : 0);
    if (amt <= 0.05) {
      this.jitter = { x: 0, y: 0 };
      return;
    }
    if (now - this.jitterAt > 70) {
      this.jitterAt = now;
      const on = Math.random() < 0.35;
      this.jitter = { x: on ? Math.round((Math.random() * 2 - 1) * amt) * this.dpr : 0, y: 0 };
    }
  }

  private updateAtmosphere(dt: number): void {
    const target = viewerTint(this.minute);
    const k = smoothK(dt, 8);
    this.tintCur = [
      this.tintCur[0] + (target.color[0] - this.tintCur[0]) * k,
      this.tintCur[1] + (target.color[1] - this.tintCur[1]) * k,
      this.tintCur[2] + (target.color[2] - this.tintCur[2]) * k,
    ];
    this.tintDark += (target.dark - this.tintDark) * k;
    this.tintRect.setFillStyle(rgbToHex(this.tintCur));
    const dark = this.tintDark;
    const poolScale = 0.22 + 0.78 * dark;
    for (const o of this.objects) {
      for (const l of o.lights) {
        let m = 1;
        if (l.def.flicker && l.src) m = l.def.flicker[Math.min(Number(l.src.frame.name) || 0, l.def.flicker.length - 1)]!;
        l.img.setAlpha(l.def.alpha * m * poolScale);
      }
      if (o.shimmer) {
        const t = this.time.now / 1000;
        const w = Math.sin(t * 2.1) * 0.5 + Math.sin(t * 3.7 + 1) * 0.5;
        o.sprite.setAlpha(0.1 + 0.07 * w);
        o.sprite.setDisplaySize(30 + w * 2, 44 + Math.sin(t * 1.3) * 3);
      }
    }
    const lit = Math.max(0, (dark - 0.15) / 0.85);
    for (const w of this.windowLights) {
      const a = Math.min(1, Math.max(lit, w.boost * (0.35 + 0.65 * dark)));
      w.img.setAlpha(a);
      w.glow.setAlpha(a * 0.28);
    }
  }

  private layoutOverlays(now: number): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const z = this.cam.zoom;
    const d = this.dpr;
    const u = Math.max(1, Math.round(d));
    const key = `${W}x${H}x${u}`;
    for (const o of this.overlayObjs) if (o.type !== 'Arc') (o as Phaser.GameObjects.Image).setPosition(W / 2, H / 2).setScale(1 / z);
    if (key !== this.overlaySize) {
      this.overlaySize = key;
      this.scan.setSize(W, H).setTileScale(u, u);
      for (const n of this.noise) n.setSize(W, H).setTileScale(u, u);
      const inset = 7 * d;
      this.finder.setSize((W - inset * 2) / u, (H - inset * 2) / u);
    }
    this.finder.setScale(u / z);
    const g = Math.max(this.effectiveGlitch(now), this.degLevel * 0.62);
    const frame = this.reduceFlicker ? 0 : Math.floor(now / 90) % 4;
    this.noise.forEach((n, i) => {
      n.setVisible(i === frame);
      n.setAlpha(Math.min(1, g * 1.6));
      if (i === frame && !this.reduceFlicker) n.setTilePosition(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64));
    });
    this.scan.setAlpha(0.55 + g * 0.2);
    if (g > 0.05 && !this.reduceFlicker) this.scan.setTilePosition(0, Math.floor(now / 40) % 4);
    this.updateTear(now);
  }

  /** 현실이 한 번 어긋나는 순간: 가로 띠 두 줄이 옆으로 밀린다 */
  private updateTear(now: number): void {
    const active = now < this.tearUntil && !this.reduceFlicker;
    if (!active) {
      for (const c of this.tearCams) if (c.visible) c.setVisible(false);
      return;
    }
    const W = this.scale.width;
    const H = this.scale.height;
    const z = this.cam.zoom;
    const d = this.dpr;
    if (now - this.tearStep > 55) {
      this.tearStep = now;
      this.tearCams.forEach((c, i) => {
        const h = Math.round((8 + Math.random() * 26) * d);
        const y = Math.round(Math.random() * (H - h));
        const dx = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 9) * d;
        c.setViewport(0, y, W, h).setSize(W, h);
        c.setZoom(z);
        // 같은 월드 점이 같은 화면 y 에 오도록(뷰포트 원점 보정)
        const cx = this.cam.x + dx / z;
        const cy = this.cam.y + (h / 2 + y - H / 2) / z - 0;
        c.centerOn(Math.round(cx * z) / z, Math.round(cy * z) / z);
        c.setVisible(i === 0 || Math.random() < 0.6);
      });
    }
  }

  // ───────────────────────── 마커 ─────────────────────────

  private updateMarkers(now: number): void {
    const d = this.dpr;
    const z = this.cam.zoom;
    // 마커 텍셀 하나 ≈ 1.5 CSS px(정수 기기 px). 확대해도 화면 크기는 일정하다.
    const ms = Math.max(2, Math.round(1.5 * d));
    const markerScale = ms / z;
    const cx = this.view.w / 2;
    const cy = this.view.h / 2;
    const reach = 0.55 * Math.min(this.view.w, this.view.h);
    const pg = this.pulseGfx;
    pg.clear();
    for (const h of this.hs) {
      const show = h.status === 'available' && !this.degradedNow;
      const b = show ? this.worldBox(h) : null;
      if (!b) {
        h.marker.setVisible(false);
        continue;
      }
      const s = worldToScreen(this.cam, this.view, b.cx, b.cy);
      const near = Math.max(0, 1 - Math.hypot(s.x - cx, s.y - cy) / reach);
      const hovered = this.hoverId === h.id;
      const a = hovered ? 0.95 : 0.55 * near * near * (3 - 2 * near);
      const untapped = !this.tapped.has(h.targetId) && !this.tapped.has(h.id);
      const bob = Math.round(Math.sin(now / 260 + b.cx) * 1.2);
      h.marker
        .setVisible(a > 0.02)
        .setAlpha(a)
        .setScale(markerScale)
        .setPosition(b.cx, b.cy - b.hh - (2 + bob) * markerScale);
      // 은은한 맥동: 코치마크 대상, 자세한 힌트(아직 안 눌러 본 것)
      const strong = this.coachFirst && h.id === this.firstId;
      const gentle = this.detailedHints && untapped;
      if (strong || gentle) {
        const ph = (now / (strong ? 1300 : 2400) + b.cx * 0.01) % 1;
        const u = d / z;
        const r = (16 + ph * 16) * u;
        pg.lineStyle(2 * u, 0xdccfae, (strong ? 0.75 : 0.4) * (1 - ph));
        pg.strokeEllipse(b.cx, b.cy + b.hh - 3 * u, r * 2, r);
      }
    }
  }

  private updateAnchor(): void {
    const cb = this.host.onAnchor;
    if (!cb) return;
    const h = this.firstId ? this.hs.find((x) => x.id === this.firstId) : null;
    const t = h && h.status === 'available' ? this.screenBox(h) : null;
    if (!t) {
      if (this.lastAnchor !== '') {
        this.lastAnchor = '';
        cb(null);
      }
      return;
    }
    const w = Math.max(t.halfW, 22) * 2;
    const hh = Math.max(t.halfH, 22) * 2;
    const r: AnchorRect = { x: Math.round(t.cx - w / 2), y: Math.round(t.cy - hh / 2), w: Math.round(w), h: Math.round(hh) };
    const key = `${r.x},${r.y},${r.w},${r.h}`;
    if (key === this.lastAnchor) return;
    this.lastAnchor = key;
    cb(r);
  }

  // ───────────────────────── 매 프레임 ─────────────────────────

  update(_t: number, delta: number): void {
    if (!this.ready) return;
    const dt = Math.min(delta / 1000, 0.05);
    const now = this.time.now;
    const deg = inDegraded(this.minute, this.host.degraded);
    if (deg !== this.degradedNow) {
      this.degradedNow = deg;
      this.host.onDegradedChange?.(deg);
    }
    this.degLevel += ((deg ? 1 : 0) - this.degLevel) * smoothK(dt, 7);
    if (Math.abs((deg ? 1 : 0) - this.degLevel) < 0.01) this.degLevel = deg ? 1 : 0;
    this.stepCamera(dt);
    for (const a of this.actors.values()) a.update(dt);
    this.updateAtmosphere(dt);
    this.layoutOverlays(now);
    this.updateMarkers(now);
    this.drawRoute();
    this.updateAnchor();
    this.hearTick(now);
  }

  // ───────────────────────── 엿듣기 ─────────────────────────

  private hearSpec(l: unknown): HearSpec | undefined {
    return (l as { hear?: HearSpec }).hear;
  }

  /** 매 프레임: 범위 계산 → 풍선 상태기계 → DOM 풍선/웅얼거림 + onHear */
  private hearTick(now: number): void {
    const input: HearNpcIn[] = [];
    const meta = new Map<Id, { x: number; y: number; weight: number }>();
    if (!this.degradedNow) {
      const d = this.dpr;
      const cx = this.view.w / 2;
      const cy = this.view.h / 2;
      const reach = 0.6 * Math.min(this.view.w, this.view.h);
      for (const h of this.hs) {
        if (!h.actor || h.status !== 'available' || !h.actor.shown) continue;
        const def = this.npcDefs.get(h.targetId);
        if (!def) continue;
        const lines = linesAt(def, this.minute, this.flags);
        if (!lines.length) continue;
        const b = this.worldBox(h);
        if (!b) continue;
        const center = { x: this.cam.x, y: this.cam.y };
        input.push({
          id: def.id,
          lines: lines.map((l) => ({
            id: l.id,
            text: l.text,
            inRange: inHearRange({ zoom: this.cam.zoom, baseZoom: this.range.base, npc: { x: b.cx, y: b.cy }, center }, this.hearSpec(l)),
          })),
        });
        const s = worldToScreen(this.cam, this.view, b.cx, b.cy - b.hh - 2);
        const near = Math.max(0, 1 - Math.hypot(s.x - cx, s.y - cy) / reach);
        meta.set(def.id, { x: s.x / d, y: s.y / d, weight: near });
      }
    }
    const step = this.tracker.step(now, input);
    this.inRangeIds = step.inRangeIds;
    for (const n of step.newlyHeard) this.host.onHear?.(n.lineId, n.npcId);
    if (!this.dom) return;
    const W = this.view.w / this.dpr;
    const H = this.view.h / this.dpr;
    this.dom.setBubbles(
      step.npcs
        .filter((n) => {
          const m = meta.get(n.id)!;
          return m.x > -20 && m.x < W + 20 && m.y > -20 && m.y < H + 40;
        })
        .map((n) => {
          const m = meta.get(n.id)!;
          return { npcId: n.id, x: m.x, y: m.y, text: n.current?.text ?? null, lineId: n.current?.id ?? null, mumble: n.mumble, weight: m.weight };
        }),
    );
  }

  listHeard(): string[] {
    return this.tracker.heardLineIds();
  }

  /** 렌더 직후: 훼손 모자이크를 그린다(WebGL 캔버스도 이때 읽힌다) */
  private postRender(): void {
    if (!this.dom || !this.ready) return;
    this.dom.renderCorrupt(this.game.canvas, this.degLevel, this.time.now, this.reduceFlicker);
  }

  // ───────────────────────── 캡처 ─────────────────────────

  snapshot(): ViewerSnapshot {
    const d = this.dpr;
    const W = this.view.w / d;
    const H = this.view.h / d;
    const visible: string[] = [];
    for (const h of this.hs) {
      if (h.status !== 'available') continue;
      const t = this.screenBox(h);
      if (t && mostlyVisible(t, W, H)) visible.push(h.id);
    }
    return {
      minute: this.minute,
      centerTile: { x: Math.floor(this.cam.x / TILE), y: Math.floor(this.cam.y / TILE) },
      zoom: Math.round((this.cam.zoom / this.range.base) * 100) / 100,
      visibleHotspotIds: visible,
      heardLineIds: [...this.inRangeIds],
      thumbDataUrl: this.dom ? this.dom.thumb(this.game.canvas) : '',
    };
  }

  /** 테스트 훅: 기준 배율의 z 배로 즉시 */
  setRelativeZoom(z: number): void {
    const nz = Math.min(this.range.max, Math.max(this.range.min, this.range.base * z));
    this.cam = { ...this.cam, zoom: nz };
    this.zoomTarget = nz;
    this.wheelIdleAt = 0;
    this.clampCam();
    this.applyCamera();
  }

  /** 대상의 월드 중심(숨은 인물은 그 시각 일정 위치) */
  private targetPoint(id: Id): { x: number; y: number; npc: boolean } | null {
    const h = this.findHs(id);
    const b = h && this.worldBox(h);
    if (b) return { x: b.cx, y: b.cy, npc: h!.kind === 'npc' };
    const def = this.npcDefs.get(h?.targetId ?? id) ?? this.npcDefs.get(id.replace(/^hs_/, ''));
    if (def) {
      const pose = npcPoseAt(def, this.minute);
      if (pose) {
        const f = tileToFeet({ x: pose.x, y: pose.y });
        return { x: f.x, y: f.y - 17, npc: true };
      }
    }
    const o = content.worldObjects.find((x) => x.id === id || `hs_${x.id}` === id);
    return o ? { x: o.x * TILE + TILE / 2, y: o.y * TILE + TILE / 2, npc: false } : null;
  }

  centerOn(id: Id): boolean {
    const p = this.targetPoint(id);
    if (!p) return false;
    this.haltMotion();
    this.cam = { ...this.cam, x: p.x, y: p.y };
    this.clampCam();
    this.applyCamera();
    return true;
  }

  /** 체크리스트 포커스: 인물이면 엿들을 수 있는 배율까지 확대해서 가운데로 */
  focusTarget(id: Id): void {
    const p = this.targetPoint(id);
    if (!p) return;
    this.focusPoint(p.x, p.y);
    if (!p.npc) return;
    const h = this.findHs(id);
    const def = this.npcDefs.get(h?.targetId ?? id);
    const specs = def ? linesAt(def, this.minute, this.flags).map((l) => this.hearSpec(l)) : [];
    const need = Math.max(requiredZoom(this.range.base, undefined), ...specs.map((sp) => requiredZoom(this.range.base, sp)));
    const lv = zoomLevels(this.range);
    const target = lv.find((l) => l + 0.01 >= need) ?? this.range.max;
    this.zoomAnchor = { x: this.view.w / 2, y: this.view.h / 2 };
    this.zoomTarget = Math.max(this.zoomTarget, target);
    this.wheelIdleAt = 0;
  }
}
