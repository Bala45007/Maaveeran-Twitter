import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy.js';
import { AudioManager } from '../../managers/AudioManager.js';

const DROP_COOLDOWN = 2800;

export class SkeletonFlyingBat extends BaseEnemy {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, { texture: 'bat_body', maxHealth: 16, damage: 8, ...opts });
    this.sprite.body.setAllowGravity(false);
    this.limbA.setVisible(false);
    this.limbB.setVisible(false);
    this.homeX = x;
    this.homeY = y;
    this.bombs = opts.bombGroup;
    this.patrolRange = opts.patrolRange ?? 160;
  }

  update(dt, player, combatSystem) {
    if (this.isDead) return;
    this.updateTimers(dt);
    const t = this.scene.time.now / 1000;

    // Gentle figure-eight patrol, drifting toward the player's x when close
    const dist = this.distanceToPlayer(player);
    const chasing = dist < 260 && !player.isDead;
    const targetX = chasing ? Phaser.Math.Clamp(player.x, this.homeX - this.patrolRange, this.homeX + this.patrolRange) : this.homeX + Math.sin(t * 0.5) * this.patrolRange;

    this.sprite.x = Phaser.Math.Linear(this.sprite.x, targetX, 0.02);
    this.sprite.y = this.homeY + Math.sin(t * 1.6) * 18;
    this.facing = player.x < this.x ? -1 : 1;
    this.sprite.setFlipX(this.facing > 0);

    if (chasing && this.attackCooldown <= 0 && Math.abs(player.x - this.x) < 60) {
      this.attackCooldown = DROP_COOLDOWN;
      this.dropBomb();
    }
  }

  dropBomb() {
    if (!this.bombs) return;
    const bomb = this.bombs.get(this.x, this.y + 12, 'bomb');
    if (!bomb) return;
    bomb.setActive(true).setVisible(true);
    bomb.body.allowGravity = true;
    bomb.setVelocity(0, 60);
    bomb.damage = this.damage;
    bomb.setDepth(93);
    AudioManager.arrow();
    bomb.fuseEvent = this.scene.time.delayedCall(1400, () => {
      if (!bomb.active) return;
      const x = bomb.x, y = bomb.y;
      bomb.setActive(false).setVisible(false);
      bomb.body.stop();
      AudioManager.explosion();
      this.scene.particleSystem?.deathBurst(x, y);
      const player = this.scene.player;
      if (player && !player.isDead && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 65) {
        player.takeDamage(1, player.x < x ? -1 : 1, 200);
      }
    });
  }
}
