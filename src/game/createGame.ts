import Phaser from 'phaser';
import { resetTransition } from './fx/transition';
import { BootScene } from './scenes/BootScene';
import { WorldScene, worldClock } from './scenes/WorldScene';

export interface GameTestApi {
  getPlayerTile(): { x: number; y: number };
  getSceneId(): string;
  teleport(x: number, y: number): void;
  interactWith(id: string): boolean;
  walkTo(x: number, y: number): boolean;
  listInteractives(): { id: string; kind: string; x: number; y: number }[];
  getTime(): number;
  objectTexture(id: string): string | null;
  cameraInfo(): unknown;
}

declare global {
  interface Window {
    __GAME__?: GameTestApi;
  }
}

function testHooksEnabled(): boolean {
  try {
    if (import.meta.env.DEV) return true;
    return new URLSearchParams(window.location.search).get('test') === '1';
  } catch {
    return false;
  }
}

const MAX_DPR = 3;

function measure(parent: HTMLElement) {
  const cssW = Math.max(1, parent.clientWidth);
  const cssH = Math.max(1, parent.clientHeight);
  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_DPR);
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  return { w, h, zoom: cssW / w };
}

export function createGame(parent: HTMLElement): Phaser.Game {
  const init = measure(parent);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0b0d12',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    // 기기 해상도로 그린다: 캔버스 = CSS 크기 × dpr, 화면 표시는 zoom(1/dpr)으로 CSS 크기에 맞춘다.
    scale: { mode: Phaser.Scale.NONE, width: init.w, height: init.h, zoom: init.zoom },
    input: { keyboard: false, gamepad: false, mouse: { preventDefaultWheel: false }, touch: { capture: false } },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, WorldScene],
  });

  const fit = () => {
    const m = measure(parent);
    if (m.w === game.scale.width && m.h === game.scale.height && Math.abs(m.zoom - game.scale.zoom) < 1e-6) return;
    game.scale.setZoom(m.zoom);
    game.scale.resize(m.w, m.h);
  };
  const ro = new ResizeObserver(fit);
  ro.observe(parent);
  window.addEventListener('orientationchange', fit);

  if (testHooksEnabled()) {
    const world = () => game.scene.getScene("World") as unknown as WorldScene | null;
    // Phaser.Scene 은 부팅 전에 getScene 이 인스턴스를 돌려주므로 isActive 로 확인한다.
    const live = () => {
      const w = world();
      return w && game.scene.isActive('World') ? w : null;
    };
    window.__GAME__ = {
      getPlayerTile: () => live()?.getPlayerTile() ?? { x: -1, y: -1 },
      getSceneId: () => live()?.sceneId ?? '',
      teleport: (x, y) => live()?.teleport(x, y),
      interactWith: (id) => live()?.interactWith(id) ?? false,
      walkTo: (x, y) => live()?.walkTo(x, y) ?? false,
      listInteractives: () => live()?.listInteractives() ?? [],
      cameraInfo: () => live()?.cameraInfo(),
      getTime: () => worldClock.whole,
      objectTexture: (id) => live()?.objectTexture(id) ?? null,
    };
  }

  game.events.once(Phaser.Core.Events.DESTROY, () => {
    ro.disconnect();
    window.removeEventListener('orientationchange', fit);
    resetTransition(game.canvas);
    if (window.__GAME__) delete window.__GAME__;
  });
  return game;
}

