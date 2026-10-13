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

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0b0d12',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    input: { keyboard: false, gamepad: false, mouse: { preventDefaultWheel: false }, touch: { capture: false } },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, WorldScene],
  });

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
    };
  }

  game.events.once(Phaser.Core.Events.DESTROY, () => {
    resetTransition(game.canvas);
    if (window.__GAME__) delete window.__GAME__;
  });
  return game;
}

