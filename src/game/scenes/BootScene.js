import Phaser from 'phaser';
import { generateAllTextures } from '../utils/textureGenerator.js';
import { AudioManager } from '../managers/AudioManager.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    generateAllTextures(this);
    AudioManager.init();
    this.scene.start('MenuScene');
  }
}
