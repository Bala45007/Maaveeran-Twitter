import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy.js';
import { AudioManager } from '../../managers/AudioManager.js';

const CHASE_SPEED = 70;

export class SkeletonGiant extends BaseEnemy {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, { texture: 'cap_body', maxHealth: 220, damage: 16, ...opts });
    this.sprite.setScale(1.7).setTint(0xb9c7d6);
    this.limbA.setTexture('cap_limb').setScale(1.5);
    this.limbB.setTexture('cap_limb').setScale(1.5);
    this.sword = null; // giant fights bare-handed with ground slams instead of a weapon
    this.engaged = false;
    this.onEngage = opts.onEngage;
    this.isTelegraphing = false;
    this.telegraphTimer = 0;
    this.isSmashing = false;
    this.smashTimer = 0;
  }

  engage() {
    if (this.engaged) return;
    this.engaged = true;
    if (this.onEngage) this.onEngage(this);
  }

  update(dt, player, combatSystem) {
    if (this.isDead) return;
    this.updateTimers(dt);

    if (!this.engaged) {
      if (this.distanceToPlayer(player) < 260) this.engage();
      this.sprite.setVelocityX(0);
      this.syncPose();
      return;
    }

    this.facePlayer(player);
    const dist = this.distanceToPlayer(player);

    if (this.isTelegraphing) {
      this.telegraphTimer -= dt;
      this.sprite.setVelocityX(0);
      if (this.telegraphTimer <= 0) {
        this.isTelegraphing = false;
        this.isSmashing = true;
        this.smashTimer = 200;
        this.sprite.clearTint().setTint(0xb9c7d6);
        AudioManager.explosion();
        this.scene.cameraSystem?.shake(220, 0.012);
        this.scene.particleSystem?.deathBurst(this.x, this.y + 30);
        this.attackCooldown = 1600;
        this.scene.time.delayedCall(80, () => {
          if (this.isDead) return;
          const p = this.scene.player;
          if (p && !p.isDead && Math.abs(p.x - this.x) < 130 && p.isGrounded) {
            p.takeDamage(1, p.x < this.x ? -1 : 1, 300);
          }
        });
      }
      this.syncPose();
      return;
    }

    if (dist > 90) {
      this.sprite.setVelocityX(CHASE_SPEED * this.facing);
    } else {
      this.sprite.setVelocityX(0);
      if (this.attackCooldown <= 0) {
        this.isTelegraphing = true;
        this.telegraphTimer = 650;
        this.sprite.setTintFill(0xffb0b0);
      }
    }
    this.syncPose();
  }

  syncPose() {
    const t = this.scene.time.now / 1000;
    const walking = Math.abs(this.sprite.body.velocity.x) > 20;
    const swing = walking ? Math.sin(t * 4) * 0.5 : Math.sin(t * 1.2) * 0.04;
    this.syncLimbs({ legAY: 14 - Math.abs(swing) * 3, legARot: swing, legBY: 14, legBRot: -swing });
  }

  getHealthPct() { return Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1); }
}
