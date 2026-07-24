import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy.js';
import { AudioManager } from '../../managers/AudioManager.js';

const CHASE_SPEED = 110;
const CHARGE_SPEED = 280;

export class SkeletonCaptain extends BaseEnemy {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, { texture: 'cap_body', maxHealth: 140, damage: 14, ...opts });
    this.sprite.setScale(opts.scale ?? 1.15);
    this.bossName = opts.bossName ?? 'Skeleton Captain';
    if (opts.tint) this.sprite.setTint(opts.tint);
    this.sword = scene.add.image(x, y, 'cap_sword').setDepth(92);
    this.parts.push(this.sword);
    this.devilCrown = scene.add.image(x, y, 'cap_devilcrown').setDepth(93);
    this.parts.push(this.devilCrown);
    this.limbA.setTexture('cap_limb');
    this.limbB.setTexture('cap_limb');
    this.phase = 1;
    this.isAttacking = false;
    this.attackTimer = 0;
    this.chargeTimer = 0;
    this.isCharging = false;
    this.telegraphTimer = 0;
    this.isTelegraphing = false;
    this.onEngage = opts.onEngage;
    this.engaged = false;
    this.arenaMinX = opts.arenaMinX ?? (x - 260);
    this.arenaMaxX = opts.arenaMaxX ?? (x + 260);
  }

  engage() {
    if (this.engaged) return;
    this.engaged = true;
    if (this.onEngage) this.onEngage(this);
  }

  update(dt, player, combatSystem) {
    if (this.isDead) return;
    this.updateTimers(dt);
    if (this.attackTimer > 0) { this.attackTimer -= dt; if (this.attackTimer <= 0) this.isAttacking = false; }

    if (!this.engaged) {
      if (this.distanceToPlayer(player) < 240) this.engage();
      this.sprite.setVelocityX(0);
      this.syncPose();
      return;
    }

    if (this.health < this.maxHealth * 0.5 && this.phase === 1) {
      this.phase = 2;
      AudioManager.checkpoint();
    }

    this.facePlayer(player);
    const dist = this.distanceToPlayer(player);

    if (this.isCharging) {
      this.chargeTimer -= dt;
      this.sprite.setVelocityX(this.facing * CHARGE_SPEED);
      if (this.chargeTimer <= 0 || this.x < this.arenaMinX || this.x > this.arenaMaxX) {
        this.isCharging = false;
        this.sprite.setVelocityX(0);
        this.attackCooldown = 900;
      }
      this.syncPose();
      return;
    }

    if (this.isTelegraphing) {
      this.telegraphTimer -= dt;
      this.sprite.setVelocityX(0);
      if (this.telegraphTimer <= 0) {
        this.isTelegraphing = false;
        if (Math.random() < 0.5 && this.phase === 2) {
          this.isCharging = true;
          this.chargeTimer = 500;
          AudioManager.dash();
        } else {
          this.isAttacking = true;
          this.attackTimer = 300;
          this.attackCooldown = 1200;
          AudioManager.swordSwing();
          this.scene.time.delayedCall(180, () => {
            if (this.isDead) return;
            combatSystem.resolveAttack({
              attacker: this.sprite, targets: [player], damage: this.damage,
              facing: this.facing, reach: 56, height: 50, knockback: 260
            });
          });
        }
      }
      this.syncPose();
      return;
    }

    if (dist > 60) {
      this.sprite.setVelocityX(CHASE_SPEED * this.facing);
    } else {
      this.sprite.setVelocityX(0);
      if (this.attackCooldown <= 0) {
        this.isTelegraphing = true;
        this.telegraphTimer = this.phase === 2 ? 420 : 550;
        this.sprite.setTintFill(0xffb0b0);
        this.scene.time.delayedCall(this.telegraphTimer, () => { if (!this.isDead) this.sprite.clearTint(); });
      }
    }

    this.syncPose();
  }

  syncPose() {
    const t = this.scene.time.now / 1000;
    const walking = Math.abs(this.sprite.body.velocity.x) > 20;
    const swing = walking ? Math.sin(t * 9) * 0.6 : Math.sin(t * 2) * 0.05;
    this.syncLimbs({ legAY: 14 - Math.abs(swing) * 3, legARot: swing, legBY: 14, legBRot: -swing });
    let swordRot = 0.4;
    if (this.isTelegraphing) swordRot = -1.4;
    else if (this.isAttacking) {
      const progress = 1 - Phaser.Math.Clamp(this.attackTimer / 300, 0, 1);
      swordRot = Phaser.Math.Linear(-1.4, 1.6, progress);
    }
    this.sword.setPosition(this.x + 14 * this.facing, this.y - 4).setRotation(swordRot * this.facing).setFlipX(this.facing > 0);
    this.sword.setAlpha(this.sprite.alpha);
    this.devilCrown.setPosition(this.x, this.y - 32).setFlipX(this.facing > 0);
    this.devilCrown.setAlpha(this.sprite.alpha);
  }

  getHealthPct() { return Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1); }
}
