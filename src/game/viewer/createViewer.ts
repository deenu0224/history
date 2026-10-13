import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { ObservationScene } from '../scenes/ObservationScene';
import type { TestApi, ViewerCamera, ViewerHandle, ViewerHost } from './types';

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

export interface ViewerController extends ViewerHandle {
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
    scene: [BootScene, ObservationScene],
  });
  game.registry.set('host', host);

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
    destroy: () => {
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
  };
  if (testHooksEnabled()) window.__VIEWER__ = api;
  return ctl;
}
