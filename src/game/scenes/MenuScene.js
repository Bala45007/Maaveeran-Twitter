import Phaser from 'phaser';
import { SaveManager } from '../managers/SaveManager.js';
import { AudioManager } from '../managers/AudioManager.js';
import { EventBus } from '../EventBus.js';

const LEVELS = [
  { key: 'level1', scene: 'Level1Scene', name: 'Level 1: Enchanted Forest', difficulty: 'Easy' },
  { key: 'level2', scene: 'Level2Scene', name: 'Level 2: Crystal Snow Mountain', difficulty: 'Moderate' },
  { key: 'level3', scene: 'Level3Scene', name: 'Level 3: Dark Crystal Castle', difficulty: 'Hard' }
];

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  preload() {
    this.load.image('menu_bg', 'menu-background.png');
  }

  create() {
    const { width, height } = this.scale;

    // Hero artwork as a full-bleed "cover" background (crops to fill,
    // preserving aspect ratio, like CSS background-size: cover).
    const bg = this.add.image(width / 2, height / 2, 'menu_bg');
    const coverScale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(coverScale);

    // Subtle darkening toward the bottom so the menu buttons stay readable
    // over the busy battle art without hiding the artwork itself.
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.75, 0.75);
    shade.fillRect(0, height * 0.55, width, height * 0.45);

    const hasSave = SaveManager.hasSave();
    const items = [];
    if (hasSave) items.push('Continue');
    items.push('Select Level', 'How to Play', 'Credits');

    const startY = height * 0.66;
    items.forEach((label, i) => {
      const btn = this.add.text(width / 2, startY + i * 46, label, {
        fontFamily: 'Trebuchet MS', fontSize: '24px', color: '#ffffff', backgroundColor: '#00000070', padding: { x: 20, y: 9 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setColor('#e8c15a'));
      btn.on('pointerout', () => btn.setColor('#ffffff'));
      btn.on('pointerdown', () => {
        AudioManager.resume();
        AudioManager.uiClick();
        this.handleMenuAction(label);
      });
    });

    this.add.text(width / 2, height - 24, 'Arrow/WASD move · Space jump (x2) · any letter/click attack · K shield · Ctrl dash · Shift sprint', {
      fontFamily: 'Trebuchet MS', fontSize: '13px', color: '#ffffffaa'
    }).setOrigin(0.5);

    EventBus.emit('hud:menu');
  }

  handleMenuAction(label) {
    if (label === 'Continue') {
      const save = SaveManager.load();
      const entry = LEVELS.find((l) => l.key === save.currentLevel) || LEVELS[0];
      this.scene.start(entry.scene, { continueGame: true });
    } else if (label === 'Select Level') {
      this.showLevelSelect();
    } else if (label === 'How to Play') {
      this.showHowTo();
    } else if (label === 'Credits') {
      this.showCredits();
    }
  }

  showLevelSelect() {
    const { width, height } = this.scale;
    const save = SaveManager.load();
    const unlocked = save.unlockedLevels || ['level1'];

    const bg = this.add.rectangle(width / 2, height / 2, Math.min(width * 0.86, 560), height * 0.62, 0x0b1020, 0.94).setStrokeStyle(2, 0xe8c15a);
    const elements = [bg];

    const title = this.add.text(width / 2, height * 0.5 - height * 0.24, 'SELECT LEVEL', {
      fontFamily: 'Trebuchet MS', fontSize: '22px', color: '#e8c15a', fontStyle: 'bold'
    }).setOrigin(0.5);
    elements.push(title);

    LEVELS.forEach((lvl, i) => {
      const isUnlocked = unlocked.includes(lvl.key);
      const y = height * 0.5 - height * 0.1 + i * 62;
      const label = isUnlocked ? `${lvl.name}  —  ${lvl.difficulty}` : `🔒  ${lvl.name}`;
      const btn = this.add.text(width / 2, y, label, {
        fontFamily: 'Trebuchet MS', fontSize: '17px',
        color: isUnlocked ? '#ffffff' : '#8a8a99',
        backgroundColor: isUnlocked ? '#1c4fa855' : '#00000033',
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5);
      elements.push(btn);

      if (isUnlocked) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setColor('#e8c15a'));
        btn.on('pointerout', () => btn.setColor('#ffffff'));
        btn.on('pointerdown', () => {
          AudioManager.uiClick();
          elements.forEach((el) => el.destroy());
          this.scene.start(lvl.scene, { continueGame: false });
        });
      }
    });

    const close = this.add.text(width / 2 - 55, height * 0.5 + height * 0.24, 'Close', {
      fontFamily: 'Trebuchet MS', fontSize: '18px', color: '#e8c15a', backgroundColor: '#00000055', padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    elements.push(close);
    close.on('pointerdown', () => elements.forEach((el) => el.destroy()));

    const reset = this.add.text(width / 2 + 75, height * 0.5 + height * 0.24, 'Reset Progress', {
      fontFamily: 'Trebuchet MS', fontSize: '13px', color: '#ff8a8a99', backgroundColor: '#00000055', padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    elements.push(reset);
    reset.on('pointerdown', () => {
      SaveManager.clear();
      AudioManager.uiClick();
      elements.forEach((el) => el.destroy());
      this.showLevelSelect();
    });
  }

  showHowTo() {
    this.showOverlay([
      'Defeat the Skeleton Army to save the kingdom!',
      '',
      'Move: Arrow Keys / A-D    Jump: Space (tap again mid-air to double jump)',
      'Sprint: hold Shift    Dash: Ctrl    Roll: L',
      'Attack: any letter key or click (get close first!)    Shield: hold K',
      'Collect coins & gems, find hearts to heal, reach the gate and speak the',
      'magic word to open it and win the level.'
    ]);
  }

  showCredits() {
    this.showOverlay([
      'Maaveeran: The Ultimate Warrior',
      '',
      'Built with React, Vite, and Phaser 3',
      'All art & sound generated procedurally - no external assets',
      'A portfolio project'
    ]);
  }

  showOverlay(lines) {
    const { width, height } = this.scale;
    const bg = this.add.rectangle(width / 2, height / 2, width * 0.8, height * 0.6, 0x0b1020, 0.92).setStrokeStyle(2, 0xe8c15a);
    const text = this.add.text(width / 2, height / 2 - 30, lines.join('\n'), {
      fontFamily: 'Trebuchet MS', fontSize: '16px', color: '#ffffff', align: 'center', wordWrap: { width: width * 0.7 }
    }).setOrigin(0.5);
    const close = this.add.text(width / 2, height * 0.5 + height * 0.22, 'Close', {
      fontFamily: 'Trebuchet MS', fontSize: '20px', color: '#e8c15a', backgroundColor: '#00000055', padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => { bg.destroy(); text.destroy(); close.destroy(); });
  }
}
