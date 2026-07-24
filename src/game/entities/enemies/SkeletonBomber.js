import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy.js';
import { AudioManager } from '../../managers/AudioManager.js';

const THROW_DIST_MIN = 120;
const THROW_DIST_MAX = 260;
const THROW_COOLDOWN = 2600;

export class SkeletonBomber extends BaseEnemy {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, { texture: 'sk_body', maxHealth: 24, damage: 10, ...opts });
    this.sprite.setTint(0xffb98a); // scorched orange tint distinguishes the bomber
    this.bombs = opts.bombGroup;
  }

  update(dt, player, combatSystem) {
    if (this.isDead) return;
    this.updateTimers(dt);
    if (player.isDead) { this.sprite.setVelocityX(0); this.syncPose(); return; }

    const dist = this.distanceToPlayer(player);
    this.facePlayer(player);

    if (dist < THROW_DIST_MIN) {
      this.sprite.setVelocityX(-this.facing * 55);
    } else if (dist > THROW_DIST_MAX) {
      this.sprite.setVelocityX(this.facing * 80);
    } else {
      this.sprite.setVelocityX(0);
      if (this.attackCooldown <= 0) {
        this.attackCooldown = THROW_COOLDOWN;
        this.throwBomb(player);
      }
    }
    this.syncPose();
  }

  throwBomb(player) {
    if (!this.bombs) return;
    const bomb = this.bombs.get(this.x + this.facing * 10, this.y - 14, 'bomb');
    if (!bomb) return;
    bomb.setActive(true).setVisible(true);
    bomb.body.allowGravity = true;
    bomb.setBounce(0.3);
    bomb.setCollideWorldBounds(true);
    bomb.damage = this.damage;
    bomb.setDepth(93);
    const dx = Phaser.Math.Clamp(player.x - this.x, -260, 260);
    bomb.setVelocity(dx * 0.9, -420);
    AudioManager.dash();
    bomb.fuseEvent = this.scene.time.delayedCall(1800, () => this.explodeBomb(bomb));
  }

  explodeBomb(bomb) {
    if (!bomb.active) return;
    const x = bomb.x, y = bomb.y;
    bomb.setActive(false).setVisible(false);
    bomb.body.stop();
    AudioManager.explosion();
    this.scene.particleSystem?.deathBurst(x, y);
    this.scene.cameraSystem?.shake(150, 0.008);
    const player = this.scene.player;
    if (player && !player.isDead && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 70) {
      player.takeDamage(1, player.x < x ? -1 : 1, 220);
    }
  }

  syncPose() {
    const t = this.scene.time.now / 1000;
    const walking = Math.abs(this.sprite.body.velocity.x) > 20;
    const swing = walking ? Math.sin(t * 6) * 0.5 : 0;
    this.syncLimbs({ legAY: 12 - Math.abs(swing) * 2, legARot: swing, legBY: 12, legBRot: -swing });
  }
}
