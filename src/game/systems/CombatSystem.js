import Phaser from 'phaser';
import { AudioManager } from '../managers/AudioManager.js';

/**
 * Lightweight, reusable combat resolution: given an attacker and a list of
 * potential targets, checks overlap against a directional hitbox rectangle
 * and applies damage + knockback + i-frames.
 */
export class CombatSystem {
  constructor(scene, particleSystem) {
    this.scene = scene;
    this.particles = particleSystem;
  }

  getHitboxRect(originX, originY, facing, reach = 46, height = 40) {
    const x = facing >= 0 ? originX : originX - reach;
    return new Phaser.Geom.Rectangle(x, originY - height / 2, reach, height);
  }

  resolveAttack({ attacker, targets, damage, facing, reach = 46, height = 40, knockback = 220, onHit }) {
    const box = this.getHitboxRect(attacker.x, attacker.y, facing, reach, height);
    let hitAny = false;

    targets.forEach((target) => {
      if (!target.active || target.isDead || target.invulnerable) return;
      const targetBounds = target.getBounds ? target.getBounds() : new Phaser.Geom.Rectangle(target.x - 12, target.y - 16, 24, 32);
      if (Phaser.Geom.Intersects.RectangleToRectangle(box, targetBounds)) {
        hitAny = true;
        this.applyDamage(target, damage, facing, knockback);
        this.particles?.hitSpark(target.x, target.y - 10);
        if (onHit) onHit(target);
      }
    });

    if (hitAny) AudioManager.swordHit();
    return hitAny;
  }

  applyDamage(target, amount, facing, knockback) {
    if (target.takeDamage) {
      target.takeDamage(amount, facing, knockback);
    }
  }
}
