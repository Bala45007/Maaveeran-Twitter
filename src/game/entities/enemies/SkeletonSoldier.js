import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy.js';
import { AudioManager } from '../../managers/AudioManager.js';

const PATROL_SPEED = 50;
const CHASE_SPEED = 90;
const AGGRO_RANGE = 200;
const ATTACK_RANGE = 44;

export class SkeletonSoldier extends BaseEnemy {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, { texture: 'sk_body', maxHealth: 30, damage: 8, ...opts });
    this.sword = scene.add.image(x, y, 'sk_sword').setDepth(92);
    this.parts.push(this.sword);
    this.patrolDir = 1;
    this.patrolRange = opts.patrolRange ?? 120;
    this.isAttacking = false;
    this.attackTimer = 0;
  }

  update(dt, player, combatSystem) {
    if (this.isDead) return;
    this.updateTimers(dt);
    if (this.attackTimer > 0) { this.attackTimer -= dt; if (this.attackTimer <= 0) this.isAttacking = false; }

    const dist = this.distanceToPlayer(player);

    if (dist < AGGRO_RANGE && !player.isDead) {
      this.state = dist < ATTACK_RANGE ? 'attack' : 'chase';
      this.facePlayer(player);
    } else {
      this.state = 'patrol';
    }

    if (this.state === 'patrol') {
      if (Math.abs(this.x - this.spawnX) > this.patrolRange) this.patrolDir *= -1;
      this.sprite.setVelocityX(PATROL_SPEED * this.patrolDir);
      this.facing = this.patrolDir;
      this.sprite.setFlipX(this.facing > 0);
    } else if (this.state === 'chase') {
      this.sprite.setVelocityX(CHASE_SPEED * this.facing);
    } else if (this.state === 'attack') {
      this.sprite.setVelocityX(0);
      if (this.attackCooldown <= 0 && !this.isAttacking) {
        this.isAttacking = true;
        this.attackTimer = 340;
        this.attackCooldown = 1500;
        AudioManager.swordSwing();
        this.scene.time.delayedCall(160, () => {
          if (this.isDead) return;
          combatSystem.resolveAttack({
            attacker: this.sprite, targets: [player], damage: this.damage,
            facing: this.facing, reach: 40, height: 36, knockback: 200
          });
        });
      }
    }

    const t = this.scene.time.now / 1000;
    const walking = this.state === 'patrol' || this.state === 'chase';
    const swing = walking ? Math.sin(t * 8) * 0.7 : 0;
    this.syncLimbs({ legAY: 12 - Math.abs(swing) * 2, legARot: swing, legBY: 12, legBRot: -swing });

    let swordRot = 0.3;
    if (this.isAttacking) {
      const progress = 1 - Phaser.Math.Clamp(this.attackTimer / 260, 0, 1);
      swordRot = Phaser.Math.Linear(-1.2, 1.4, progress);
    }
    this.sword.setPosition(this.x + 10 * this.facing, this.y - 2).setRotation(swordRot * this.facing).setFlipX(this.facing > 0);
    this.sword.setAlpha(this.sprite.alpha);
  }

  destroy() {
    super.destroy();
  }
}
