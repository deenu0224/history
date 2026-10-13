import Phaser from 'phaser';
import { registerPhaserAnims, registerPhaserTextures } from '../art';
import { registerFxTextures } from '../fx/textures';

/** 텍스처·애니메이션을 등록하고 관측 씬을 시작한다. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    registerPhaserTextures(this);
    registerPhaserAnims(this);
    registerFxTextures(this);
    this.scene.start('Observation');
  }
}
