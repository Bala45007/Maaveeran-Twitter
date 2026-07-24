import Phaser from 'phaser';
import { AudioManager } from '../../managers/AudioManager.js';

export class BaseEnemy {
  constructor(scene, x, y, { texture = 'sk_body', maxHealth = 30, damage = 10, particleSystem, onDeath } = {}) {
    this.scene = scene;
    this.particles = particleSystem;
    this.onDeath = onDeath;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.damage = damage;
    this.facing = -1;
    this.isDead = false;
    this.invulnerable = false;
    this.invulnTimer = 0;
    this.hurtTimer = 0;
    this.state = 'patrol';
    this.spawnX = x;
    this.attackCooldown = 0;

    this.sprite = scene.physics.add.sprite(x, y, texture);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(0);
    this.sprite.setDragX(600);
    this.sprite.owner = this;
    this.sprite.setDepth(90);

    this.limbA = scene.add.image(x, y, 'sk_limb').setDepth(89);
    this.limbB = scene.add.image(x, y, 'sk_limb').setDepth(91);
    this.parts = [this.limbA, this.limbB, this.sprite];
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get active() { return !this.isDead; }
  getBounds() { return this.sprite.getBounds(); }

  takeDamage(amount, fromFacing = 1, knockback = 180) {
    if (this.isDead || this.invulnerable) return;
    this.health -= amount;
    this.invulnerable = true;
    this.invulnTimer = 300;
    this.hurtTimer = 200;
    this.sprite.setVelocity(fromFacing * knockback, -160);
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.state = 'dead';
    AudioManager.enemyDeath();
    this.particles?.deathBurst(this.x, this.y);
    this.sprite.setVelocity((Math.random() - 0.5) * 100, -220);
    this.sprite.setTint(0x888888);
    this.scene.tweens.add({
      targets: [this.sprite, this.limbA, this.limbB],
      alpha: 0,
      angle: this.facing * 220,
      duration: 500,
      delay: 150,
      onComplete: () => {
        this.destroy();
        if (this.onDeath) this.onDeath(this);
      }
    });
  }

  distanceToPlayer(player) {
    return Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
  }

  facePlayer(player) {
    this.facing = player.x < this.x ? -1 : 1;
    this.sprite.setFlipX(this.facing > 0);
  }

  updateTimers(dt) {
    if (this.invulnTimer > 0) { this.invulnTimer -= dt; if (this.invulnTimer <= 0) this.invulnerable = false; }
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
  }

  syncLimbs(offsets) {
    const f = this.facing;
    const flash = this.invulnerable && Math.floor(this.hurtTimer / 60) % 2 === 0;
    this.limbA.setPosition(this.x - 6 * f, this.y + (offsets?.legAY ?? 10)).setRotation((offsets?.legARot ?? 0) * f);
    this.limbB.setPosition(this.x + 6 * f, this.y + (offsets?.legBY ?? 10)).setRotation((offsets?.legBRot ?? 0) * f);
    [this.sprite, this.limbA, this.limbB].forEach((p) => p.setAlpha && p.setAlpha(flash ? 0.35 : 1));
  }

  destroy() {
    this.parts.forEach((p) => p.destroy());
  }

  update() {
    // override in subclass
  }
}
