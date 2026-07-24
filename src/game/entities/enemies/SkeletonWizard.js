import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy.js';
import { AudioManager } from '../../managers/AudioManager.js';

const PREFERRED_DIST_MIN = 160;
const PREFERRED_DIST_MAX = 340;
const CAST_COOLDOWN = 2200;
const TELEPORT_COOLDOWN = 6000;

export class SkeletonWizard extends BaseEnemy {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, { texture: 'sk_body', maxHealth: 26, damage: 8, ...opts });
    this.sprite.setTint(0xc9a6ff); // purple robe tint distinguishes the wizard
    this.staff = scene.add.image(x, y, 'wiz_staff').setDepth(92);
    this.parts.push(this.staff);
    this.projectiles = opts.projectileGroup;
    this.teleportCooldown = TELEPORT_COOLDOWN * 0.4;
    this.castToggle = 0;
  }

  update(dt, player, combatSystem) {
    if (this.isDead) return;
    this.updateTimers(dt);
    if (player.isDead) { this.sprite.setVelocityX(0); this.syncPose(); return; }
    if (this.teleportCooldown > 0) this.teleportCooldown -= dt;

    const dist = this.distanceToPlayer(player);
    this.facePlayer(player);

    if (dist < PREFERRED_DIST_MIN - 40 && this.teleportCooldown <= 0) {
      this.teleport(player);
      return;
    }

    if (dist < PREFERRED_DIST_MIN) {
      this.sprite.setVelocityX(-this.facing * 70);
    } else if (dist > PREFERRED_DIST_MAX) {
      this.sprite.setVelocityX(this.facing * 50);
    } else {
      this.sprite.setVelocityX(0);
      if (this.attackCooldown <= 0) {
        this.attackCooldown = CAST_COOLDOWN;
        this.cast(player);
      }
    }
    this.syncPose();
  }

  cast(player) {
    if (!this.projectiles) return;
    this.castToggle = (this.castToggle + 1) % 2;
    const key = this.castToggle === 0 ? 'fireball' : 'iceball';
    const proj = this.projectiles.get(this.x + this.facing * 16, this.y - 10, key);
    if (!proj) return;
    proj.setActive(true).setVisible(true).setTexture(key);
    proj.body.allowGravity = false;
    proj.kind = key;
    const angle = Phaser.Math.Angle.Between(this.x, this.y - 10, player.x, player.y - 10);
    proj.setVelocity(Math.cos(angle) * 260, Math.sin(angle) * 260);
    proj.setDepth(93);
    AudioManager.arrow();
    this.scene.time.delayedCall(3000, () => { if (proj.active) { proj.setActive(false).setVisible(false); proj.body.stop(); } });
  }

  teleport(player) {
    this.teleportCooldown = TELEPORT_COOLDOWN;
    this.scene.particleSystem?.deathBurst(this.x, this.y);
    const dir = player.x < this.x ? 1 : -1;
    this.sprite.setPosition(this.x + dir * 180, this.y - 10);
    this.scene.particleSystem?.deathBurst(this.x, this.y);
    AudioManager.dash();
  }

  syncPose() {
    const t = this.scene.time.now / 1000;
    const walking = Math.abs(this.sprite.body.velocity.x) > 20;
    const swing = walking ? Math.sin(t * 6) * 0.4 : Math.sin(t * 1.4) * 0.06;
    this.syncLimbs({ legAY: 12 - Math.abs(swing) * 2, legARot: swing, legBY: 12, legBRot: -swing });
    this.staff.setPosition(this.x + 9 * this.facing, this.y - 4).setFlipX(this.facing < 0);
    this.staff.setAlpha(this.sprite.alpha);
  }
}
