import Phaser from 'phaser';
import { SkeletonCaptain } from './SkeletonCaptain.js';
import { AudioManager } from '../../managers/AudioManager.js';

const CHASE_SPEED = 100;
const CHARGE_SPEED = 300;

/**
 * The Skeleton King is a bigger, 3-phase version of the Captain: it keeps the
 * Captain's sword-swing/charge moveset (inherited via shared visuals) and
 * adds a phase-3 ground "Fire Wave" attack plus a one-time skeleton summon
 * when it first drops below half health.
 */
export class SkeletonKing extends SkeletonCaptain {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, {
      maxHealth: 420,
      damage: 18,
      scale: 1.45,
      tint: 0xffd3d3,
      bossName: 'Skeleton King',
      ...opts
    });
    this.onSummon = opts.onSummon;
    this.hasSummoned = false;
    this.isFireWave = false;
    this.fireWaveTimer = 0;
  }

  update(dt, player, combatSystem) {
    if (this.isDead) return;
    this.updateTimers(dt);
    if (this.attackTimer > 0) { this.attackTimer -= dt; if (this.attackTimer <= 0) this.isAttacking = false; }

    if (!this.engaged) {
      if (this.distanceToPlayer(player) < 280) this.engage();
      this.sprite.setVelocityX(0);
      this.syncPose();
      return;
    }

    if (this.health < this.maxHealth * 0.66 && this.phase === 1) {
      this.phase = 2;
      AudioManager.checkpoint();
    }
    if (this.health < this.maxHealth * 0.33 && this.phase === 2) {
      this.phase = 3;
      AudioManager.checkpoint();
      if (!this.hasSummoned) {
        this.hasSummoned = true;
        if (this.onSummon) this.onSummon(this);
      }
    }

    this.facePlayer(player);
    const dist = this.distanceToPlayer(player);

    if (this.isFireWave) {
      this.fireWaveTimer -= dt;
      this.sprite.setVelocityX(0);
      if (this.fireWaveTimer <= 0) {
        this.isFireWave = false;
        this.attackCooldown = 1400;
      }
      this.syncPose();
      return;
    }

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
        const roll = Math.random();
        if (this.phase === 3 && roll < 0.34) {
          this.startFireWave(player, combatSystem);
        } else if (this.phase >= 2 && roll < 0.62) {
          this.isCharging = true;
          this.chargeTimer = 550;
          AudioManager.dash();
        } else {
          this.isAttacking = true;
          this.attackTimer = 320;
          this.attackCooldown = 1100;
          AudioManager.swordSwing();
          this.scene.time.delayedCall(190, () => {
            if (this.isDead) return;
            combatSystem.resolveAttack({
              attacker: this.sprite, targets: [player], damage: this.damage,
              facing: this.facing, reach: 64, height: 56, knockback: 280
            });
          });
        }
      }
      this.syncPose();
      return;
    }

    if (dist > 70) {
      this.sprite.setVelocityX(CHASE_SPEED * this.facing);
    } else {
      this.sprite.setVelocityX(0);
      if (this.attackCooldown <= 0) {
        this.isTelegraphing = true;
        this.telegraphTimer = this.phase >= 2 ? 400 : 520;
        this.sprite.setTintFill(0xffb0b0);
        this.scene.time.delayedCall(this.telegraphTimer, () => { if (!this.isDead) this.sprite.setTint(0xffd3d3); });
      }
    }

    this.syncPose();
  }

  startFireWave(player, combatSystem) {
    this.isFireWave = true;
    this.fireWaveTimer = 600;
    AudioManager.explosion();
    this.scene.cameraSystem?.shake(260, 0.014);
    this.scene.particleSystem?.deathBurst(this.x, this.y + 20);
    this.scene.time.delayedCall(250, () => {
      if (this.isDead) return;
      combatSystem.resolveAttack({
        attacker: this.sprite, targets: [player], damage: this.damage * 0.8,
        facing: this.facing, reach: 130, height: 40, knockback: 320
      });
    });
  }
}
