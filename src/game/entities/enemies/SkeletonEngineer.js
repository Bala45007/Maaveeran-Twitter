import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy.js';
import { AudioManager } from '../../managers/AudioManager.js';

const ACTIVATE_RANGE = 260;
const ACTIVATE_COOLDOWN = 3200;
const WARNING_TIME = 700;

/**
 * The Engineer doesn't fight directly - it crouches near a trap and, when the
 * player gets close, flashes a warning marker then pops a nearby spike trap
 * up out of the ground for a short window. Extends the trap set introduced
 * in Level 1 without needing new physics types.
 */
export class SkeletonEngineer extends BaseEnemy {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, { texture: 'sk_body', maxHealth: 18, damage: 0, ...opts });
    this.sprite.setTint(0xffe08a);
    this.sprite.body.setImmovable(true);
    this.trapX = opts.trapX ?? x + 60;
    this.trapY = opts.trapY ?? y;
    this.marker = scene.add.image(this.trapX, this.trapY - 30, 'trap_marker').setDepth(15).setAlpha(0);
    this.parts.push(this.marker);
    this.trapSprite = opts.trapSprite; // physics-enabled spike sprite to toggle
    this.isWarning = false;
    this.warnTimer = 0;
    this.trapActiveTimer = 0;
  }

  update(dt, player) {
    if (this.isDead) return;
    this.updateTimers(dt);
    this.facePlayer(player);
    this.syncLimbs({ legAY: 12, legARot: 0, legBY: 12, legBRot: 0 });

    if (this.trapActiveTimer > 0) {
      this.trapActiveTimer -= dt;
      if (this.trapActiveTimer <= 0 && this.trapSprite) {
        this.trapSprite.setVisible(false);
        if (this.trapSprite.body) this.trapSprite.body.enable = false;
      }
    }

    if (this.isWarning) {
      this.warnTimer -= dt;
      this.marker.setAlpha(0.4 + Math.sin(this.scene.time.now / 60) * 0.4);
      if (this.warnTimer <= 0) {
        this.isWarning = false;
        this.marker.setAlpha(0);
        this.activateTrap();
      }
      return;
    }

    if (this.attackCooldown <= 0 && this.distanceToPlayer(player) < ACTIVATE_RANGE && !player.isDead) {
      this.attackCooldown = ACTIVATE_COOLDOWN;
      this.isWarning = true;
      this.warnTimer = WARNING_TIME;
    }
  }

  activateTrap() {
    if (!this.trapSprite) return;
    this.trapSprite.setVisible(true);
    if (this.trapSprite.body) this.trapSprite.body.enable = true;
    this.trapActiveTimer = 1800;
    AudioManager.checkpoint();
  }

}
