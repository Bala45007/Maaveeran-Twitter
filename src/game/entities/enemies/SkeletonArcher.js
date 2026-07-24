import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy.js';
import { AudioManager } from '../../managers/AudioManager.js';

const PREFERRED_DIST_MIN = 180;
const PREFERRED_DIST_MAX = 320;
const RETREAT_SPEED = 60;
const ARROW_SPEED = 200;      // slowed down from 380 so arrows are easy to see and dodge
const SHOT_COOLDOWN = 2400;   // slowed down from 1500ms between shots

export class SkeletonArcher extends BaseEnemy {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, { texture: 'sk_body', maxHealth: 20, damage: 6, ...opts });
    this.sprite.setTint(0xd8ecff);
    this.bow = scene.add.image(x, y, 'sk_bow').setDepth(92);
    this.parts.push(this.bow);
    this.arrows = opts.arrowGroup;
  }

  update(dt, player, combatSystem) {
    if (this.isDead) return;
    this.updateTimers(dt);
    if (player.isDead) { this.sprite.setVelocityX(0); this.state = 'idle'; this.syncPose(); return; }

    const dist = this.distanceToPlayer(player);
    this.facePlayer(player);

    if (dist < PREFERRED_DIST_MIN) {
      this.sprite.setVelocityX(-this.facing * RETREAT_SPEED);
      this.state = 'retreat';
    } else if (dist > PREFERRED_DIST_MAX) {
      this.sprite.setVelocityX(this.facing * RETREAT_SPEED * 0.6);
      this.state = 'approach';
    } else {
      this.sprite.setVelocityX(0);
      this.state = 'shoot';
      if (this.attackCooldown <= 0) {
        this.attackCooldown = SHOT_COOLDOWN;
        AudioManager.arrow();
        this.fireArrow(player);
      }
    }

    this.syncPose();
  }

  fireArrow(player) {
    if (!this.arrows) return;
    const arrow = this.arrows.get(this.x + this.facing * 14, this.y - 4, 'arrow');
    if (!arrow) return;
    arrow.setActive(true).setVisible(true);
    arrow.body.allowGravity = false;
    arrow.setFlipX(this.facing < 0);
    arrow.setVelocityX(this.facing * ARROW_SPEED);
    arrow.damage = this.damage;
    arrow.setDepth(93);
    this.scene.time.delayedCall(2500, () => { if (arrow.active) { arrow.setActive(false).setVisible(false); arrow.body.stop(); } });
  }

  syncPose() {
    const t = this.scene.time.now / 1000;
    const walking = this.state === 'retreat' || this.state === 'approach';
    const swing = walking ? Math.sin(t * 7) * 0.6 : 0;
    this.syncLimbs({ legAY: 12 - Math.abs(swing) * 2, legARot: swing, legBY: 12, legBRot: -swing });
    this.bow.setPosition(this.x + 8 * this.facing, this.y - 2).setFlipX(this.facing < 0);
    this.bow.setAlpha(this.sprite.alpha);
  }
}
