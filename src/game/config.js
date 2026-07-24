import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { Level1Scene } from './scenes/Level1Scene.js';
import { Level2Scene } from './scenes/Level2Scene.js';
import { Level3Scene } from './scenes/Level3Scene.js';

export function createGameConfig(parent) {
  return {
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 600,
    backgroundColor: '#8fd3ff',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: '100%',
      height: '100%'
    },
    render: {
      pixelArt: false,
      antialias: true
    },
    scene: [BootScene, MenuScene, Level1Scene, Level2Scene, Level3Scene]
  };
}
