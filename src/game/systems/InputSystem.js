import Phaser from 'phaser';

export class InputSystem {
  constructor(scene) {
    this.scene = scene;
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      A: 'A', D: 'D', W: 'W', S: 'S',
      SHIFT: 'SHIFT', CTRL: 'CTRL',
      SPACE: 'SPACE', ESC: 'ESC',
      J: 'J', K: 'K', L: 'L'
    });

    // Touch/mobile virtual input flags (set externally by HUD touch controls)
    this.touch = { left: false, right: false, jump: false, attack: false, shield: false, dash: false };

    // Easy-mode attack binding: ANY letter key attacks with the sword, not
    // just J, so brand-new players can hit an enemy without memorizing keys.
    this._letterJustDown = false;
    scene.input.keyboard.on('keydown', (event) => {
      const code = event.keyCode;
      const isLetter = code >= Phaser.Input.Keyboard.KeyCodes.A && code <= Phaser.Input.Keyboard.KeyCodes.Z;
      if (isLetter) this._letterJustDown = true;
    });

    // Clicking/tapping anywhere on the game also attacks — the most obvious
    // possible input for a new player.
    scene.input.on('pointerdown', () => { this._letterJustDown = true; });
  }

  get left() { return this.cursors.left.isDown || this.keys.A.isDown || this.touch.left; }
  get right() { return this.cursors.right.isDown || this.keys.D.isDown || this.touch.right; }
  get up() { return this.cursors.up.isDown || this.keys.W.isDown; }
  get down() { return this.cursors.down.isDown || this.keys.S.isDown; }

  get jumpDown() { return Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.touch.jump; }
  get sprintHeld() { return this.keys.SHIFT.isDown; }
  get dashDown() { return Phaser.Input.Keyboard.JustDown(this.keys.CTRL) || this.touch.dash; }
  get attackDown() { return this._letterJustDown || this.touch.attack; }
  get shieldHeld() { return this.keys.K.isDown || this.touch.shield; }
  get rollDown() { return Phaser.Input.Keyboard.JustDown(this.keys.L); }
  get pauseDown() { return Phaser.Input.Keyboard.JustDown(this.cursors.esc || this.keys.ESC); }

  consumeTouchTaps() {
    this.touch.jump = false;
    this.touch.attack = false;
    this.touch.dash = false;
    this._letterJustDown = false;
  }
}
