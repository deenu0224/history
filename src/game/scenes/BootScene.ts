import Phaser from 'phaser';
import { registerPhaserAnims, registerPhaserTextures } from '../art';
import { registerFxTextures } from '../fx/textures';
import { useGameStore } from '@/store/gameStore';

/** 텍스처/애니메이션 등록 후 store.currentScene(없으면 lab)으로 시작. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    registerPhaserTextures(this);
    registerPhaserAnims(this);
    registerFxTextures(this);
    const sceneId = useGameStore.getState().currentScene ?? 'lab';
    this.scene.start('World', { sceneId });
  }
}
