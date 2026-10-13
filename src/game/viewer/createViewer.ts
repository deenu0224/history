import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { ObservationScene } from '../scenes/ObservationScene';
import type { TestApi, ViewerCamera, ViewerHandle, ViewerHost, ViewerSnapshot } from './types';
import { DomLayer } from './domLayer';
import { playSfx } from '../audio';

const MAX_DPR = 3;

function measure(parent: HTMLElement) {
  const cssW = Math.max(1, parent.clientWidth);
  const cssH = Math.max(1, parent.clientHeight);
  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_DPR);
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  return { w, h, zoom: cssW / w };
}

function testHooksEnabled(): boolean {
  try {
    if (import.meta.env.DEV) return true;
    return new URLSearchParams(window.location.search).get('test') === '1';
  } catch {
    return false;
  }
}

const EMPTY_SNAPSHOT: ViewerSnapshot = {
  minute: -1,
  centerTile: { x: 0, y: 0 },
  zoom: 1,
  visibleHotspotIds: [],
  heardLineIds: [],
  thumbDataUrl: '',
};

export interface ViewerController extends ViewerHandle {
  setDegraded(spans: { from: number; to: number }[] | undefined): void;
  destroy(): void;
}

/**
 * Phaser 게임을 컨테이너에 만든다. 캔버스 = CSS 크기 × dpr(최대 3), 화면 표시는 zoom(1/dpr)으로 CSS 크기에 맞춘다
 * → 모바일에서도 도트가 정수 기기 픽셀로 또렷하다. 컨테이너 크기가 바뀌면(ResizeObserver) 캔버스를 다시 맞춘다.
 */
export function createViewer(parent: HTMLElement, host: ViewerHost): ViewerController {
  const init = measure(parent);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0b0d12',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.NONE, width: init.w, height: init.h, zoom: init.zoom },
    input: { mouse: false, touch: false, keyboard: false, gamepad: false },
    disableContextMenu: true,
    banner: false,
    render: { preserveDrawingBuffer: true },
    scene: [BootScene, ObservationScene],
  });
  const dom = new DomLayer(parent);
  game.registry.set('host', host);
  game.registry.set('dom', dom);

  const fit = () => {
    const m = measure(parent);
    if (m.w === game.scale.width && m.h === game.scale.height && Math.abs(m.zoom - game.scale.zoom) < 1e-6) return;
    game.scale.setZoom(m.zoom);
    game.scale.resize(m.w, m.h);
  };
  const ro = new ResizeObserver(fit);
  ro.observe(parent);
  window.addEventListener('orientationchange', fit);

  const scene = (): ObservationScene | null => {
    const s = game.scene.getScene('Observation') as ObservationScene | null;
    return s && s.ready ? s : null;
  };
  const pending: ((s: ObservationScene) => void)[] = [];
  const prevReady = host.onReady;
  host.onReady = () => {
    prevReady?.();
    const s = scene();
    if (s) for (const fn of pending.splice(0)) fn(s);
  };
  const run = (fn: (s: ObservationScene) => void) => {
    const s = scene();
    if (s) fn(s);
    else pending.push(fn);
  };

  const ctl: ViewerController = {
    focusHotspot: (id) => run((s) => s.focusHotspot(id)),
    focusTile: (x, y) => run((s) => s.focusTile(x, y)),
    setMinute: (m) => run((s) => s.setMinute(m)),
    getCamera: (): ViewerCamera | null => scene()?.getCameraInfo() ?? null,
    zoomTo: (z) => run((s) => s.zoomTo(z)),
    zoomStep: (d) => run((s) => s.zoomStep(d)),
    setRouteNpc: (id) => run((s) => s.setExplicitRoute(id)),
    playShift: (k) => run((s) => s.playShift(k)),
    focusTarget: (id) => run((s) => s.focusTarget(id)),
    fitToScene: () => run((s) => s.fitToScene()),
    focusSpeaker: () => run((s) => s.focusSpeaker()),
    snapshot: (): ViewerSnapshot => scene()?.snapshot() ?? EMPTY_SNAPSHOT,
    flashShutter: () => {
      dom.doFlash();
      playSfx('shutter');
    },
    setDegraded: (spans) => {
      host.degraded = spans;
    },
    destroy: () => {
      dom.destroy();
      ro.disconnect();
      window.removeEventListener('orientationchange', fit);
      if (window.__VIEWER__ === api) delete window.__VIEWER__;
      game.destroy(true);
    },
  };

  const api: TestApi = {
    listHotspots: () => scene()?.listHotspots() ?? [],
    tap: (id) => scene()?.tapHotspot(id) ?? false,
    getMinute: () => scene()?.getMinute() ?? -1,
    getCamera: () => scene()?.getCameraInfo() ?? null,
    snapshot: () => scene()?.snapshot() ?? EMPTY_SNAPSHOT,
    listHeard: () => scene()?.listHeard() ?? [],
    setZoom: (z) => scene()?.setRelativeZoom(z),
    centerOn: (id) => scene()?.centerOn(id) ?? false,
  };
  if (testHooksEnabled()) window.__VIEWER__ = api;
  return ctl;
}
