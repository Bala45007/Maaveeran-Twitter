import Phaser from 'phaser';
import { AudioManager } from '../managers/AudioManager.js';

const WALK_SPEED = 150;
const RUN_SPEED = 230;
const SPRINT_SPEED = 320;
const JUMP_VELOCITY = -600;       // higher jump, easier to clear gaps
const DOUBLE_JUMP_VELOCITY = -520;
const DASH_SPEED = 620;
const GRAVITY = 1200;             // floatier fall = more forgiving jump timing
const MAX_HEARTS = 5;             // more forgiving 5-heart life system
const MAX_ENERGY = 100;
const COYOTE_TIME = 140;          // ms grace period to still jump after leaving a ledge
const JUMP_BUFFER_TIME = 160;     // ms — pressing jump slightly before landing still registers

export class Player {
  constructor(scene, x, y, { onDeath, onDamage } = {}) {
    this.scene = scene;
    this.onDeath = onDeath;
    this.onDamage = onDamage;

    // Physics body — the torso sprite doubles as the collidable body.
    this.sprite = scene.physics.add.sprite(x, y, 'p_torso');
    this.sprite.setSize(20, 30).setOffset(3, 2);
    this.sprite.setBounce(0);
    this.sprite.setMaxVelocity(SPRINT_SPEED + 40, 1200);
    this.sprite.setDragX(900);
    this.sprite.body.setGravityY(GRAVITY);
    this.sprite.setDepth(100);
    this.sprite.owner = this;

    // Rig parts (visual only — hand-positioned every frame for a lightweight
    // procedural skeletal animation, avoiding the need for sprite-sheet art).
    this.head = scene.add.image(x, y, 'p_head').setDepth(101);
    this.crown = scene.add.image(x, y, 'p_crown').setDepth(106);
    this.armBack = scene.add.image(x, y, 'p_arm').setDepth(99);
    this.armFront = scene.add.image(x, y, 'p_arm').setDepth(102);
    this.legBack = scene.add.image(x, y, 'p_leg').setDepth(98);
    this.legFront = scene.add.image(x, y, 'p_leg').setDepth(103);
    this.sword = scene.add.image(x, y, 'p_sword').setDepth(104).setOrigin(0.5, 0.9);
    this.shield = scene.add.image(x, y, 'p_shield').setDepth(97).setVisible(false);

    this.parts = [this.head, this.crown, this.armBack, this.armFront, this.legBack, this.legFront, this.sword, this.shield, this.sprite];

    // State
    this.facing = 1;
    this.state = 'idle';
    this.hearts = MAX_HEARTS;
    this.maxHearts = MAX_HEARTS;
    this.energy = MAX_ENERGY;
    this.maxEnergy = MAX_ENERGY;
    this.coins = 0;
    this.gems = 0;

    this.canDoubleJump = false;
    this.usedDoubleJump = false;
    this.isGrounded = false;
    this.wasGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.isRolling = false;
    this.rollTimer = 0;
    this.attackIndex = 0;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.isAttacking = false;
    this.isShielding = false;
    this.invulnerable = false;
    this.invulnTimer = 0;
    this.isDead = false;
    this.hurtTimer = 0;
    this.animT = 0; // running animation clock

    this.walkStepTimer = 0;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  getBounds() { return this.sprite.getBounds(); }

  takeDamage(amount, fromFacing = 1, knockback = 220) {
    if (this.invulnerable || this.isDead) return;
    if (this.isShielding) {
      AudioManager.shieldBlock();
      this.sprite.setVelocityX(-fromFacing * knockback * 0.4);
      return;
    }
    // Every hit costs exactly one heart, regardless of the raw damage number,
    // so the 3-heart system stays simple and predictable for the player.
    this.hearts = Math.max(0, this.hearts - 1);
    this.invulnerable = true;
    this.invulnTimer = 1300;
    this.hurtTimer = 250;
    this.sprite.setVelocity(-fromFacing * knockback, -180);
    AudioManager.hurt();
    if (this.onDamage) this.onDamage(this.hearts, amount);
    if (this.hearts <= 0) this.die();
  }

  heal(amount) {
    // Hearts are whole units — a heart pickup restores exactly one heart.
    this.hearts = Math.min(this.maxHearts, this.hearts + 1);
  }

  addEnergy(amount) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.state = 'dead';
    this.sprite.setVelocity(0, -260);
    this.sprite.body.setAllowGravity(true);
    if (this.onDeath) this.onDeath();
  }

  respawn(x, y) {
    this.isDead = false;
    this.hearts = this.maxHearts;
    this.invulnerable = true;
    this.invulnTimer = 1200;
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
    this.state = 'idle';
  }

  update(dt, input, particleSystem) {
    if (this.isDead) {
      this.syncRigPosition();
      return;
    }

    const body = this.sprite.body;
    this.wasGrounded = this.isGrounded;
    this.isGrounded = body.blocked.down || body.touching.down;

    if (this.isGrounded && !this.wasGrounded) {
      particleSystem?.landDust(this.x, this.y + 16);
      AudioManager.land();
    }
    if (this.isGrounded) {
      this.canDoubleJump = true;
      this.usedDoubleJump = false;
      this.coyoteTimer = COYOTE_TIME;
    } else {
      this.coyoteTimer -= dt;
    }

    // Timers
    if (this.invulnTimer > 0) { this.invulnTimer -= dt; if (this.invulnTimer <= 0) this.invulnerable = false; }
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.rollTimer > 0) { this.rollTimer -= dt; if (this.rollTimer <= 0) this.isRolling = false; }
    if (this.attackTimer > 0) { this.attackTimer -= dt; if (this.attackTimer <= 0) { this.isAttacking = false; } }
    else if (this.attackIndex > 0 && this.attackCooldown <= 0) { this.attackIndex = 0; }

    const hurtLock = this.hurtTimer > 0;
    const canAct = !hurtLock && !this.isRolling;

    this.isShielding = canAct && input.shieldHeld && this.isGrounded && !this.isAttacking;

    // Dash
    if (canAct && input.dashDown && this.dashCooldown <= 0 && this.energy >= 15 && !this.isDashing) {
      this.isDashing = true;
      this.dashTimer = 160;
      this.dashCooldown = 700;
      this.energy -= 15;
      this.sprite.setVelocityX(this.facing * DASH_SPEED);
      this.sprite.body.setAllowGravity(false);
      AudioManager.dash();
      particleSystem?.footstepDust(this.x, this.y + 14);
    }
    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.sprite.body.setAllowGravity(true);
      }
    }

    // Roll (ground dodge)
    if (canAct && input.rollDown && this.isGrounded && this.dashCooldown <= 0 && !this.isRolling) {
      this.isRolling = true;
      this.rollTimer = 260;
      this.dashCooldown = 500;
      this.sprite.setVelocityX(this.facing * DASH_SPEED * 0.7);
    }

    // Horizontal movement
    if (!this.isDashing && !this.isRolling && !this.isShielding) {
      const sprinting = input.sprintHeld && this.isGrounded && this.energy > 0;
      const speed = sprinting ? SPRINT_SPEED : RUN_SPEED;
      if (canAct && input.left) {
        this.sprite.setVelocityX(-speed);
        this.facing = -1;
      } else if (canAct && input.right) {
        this.sprite.setVelocityX(speed);
        this.facing = 1;
      } else if (canAct) {
        this.sprite.setVelocityX(this.sprite.body.velocity.x * 0.82);
      }
      if (sprinting && (input.left || input.right)) {
        this.energy = Math.max(0, this.energy - dt * 0.02);
      } else {
        this.energy = Math.min(this.maxEnergy, this.energy + dt * 0.01);
      }
      this._sprinting = sprinting && (input.left || input.right);
    } else {
      this._sprinting = false;
    }

    // Jump / double jump — generous coyote time + jump buffering make this forgiving
    if (input.jumpDown) this.jumpBufferTimer = JUMP_BUFFER_TIME;
    else this.jumpBufferTimer -= dt;

    if (canAct && this.jumpBufferTimer > 0) {
      if (this.isGrounded || this.coyoteTimer > 0) {
        this.sprite.setVelocityY(JUMP_VELOCITY);
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.canDoubleJump = true;
        this.usedDoubleJump = false;
        AudioManager.jump();
      } else if (this.canDoubleJump && !this.usedDoubleJump) {
        this.sprite.setVelocityY(DOUBLE_JUMP_VELOCITY);
        this.usedDoubleJump = true;
        this.jumpBufferTimer = 0;
        AudioManager.doubleJump();
      }
    }

    // Wall slide detection (simplified: touching a side while airborne and falling)
    this.isWallSliding = !this.isGrounded && (body.blocked.left || body.blocked.right) && body.velocity.y > 60;
    if (this.isWallSliding) {
      this.sprite.setVelocityY(Math.min(body.velocity.y, 140));
      this.canDoubleJump = true;
      this.usedDoubleJump = false;
    }

    // Attack (3-hit combo) — generous cooldown/reach so it's easy to land hits
    if (canAct && input.attackDown && this.attackCooldown <= 0) {
      this.attackIndex = (this.attackIndex % 3) + 1;
      this.isAttacking = true;
      this.attackTimer = 240;
      this.attackCooldown = 240;
      AudioManager.swordSwing();
      this._justAttacked = true;
    } else {
      this._justAttacked = false;
    }

    // Footstep dust while running on ground
    if (this.isGrounded && Math.abs(body.velocity.x) > 40 && !this.isAttacking) {
      this.walkStepTimer -= dt;
      if (this.walkStepTimer <= 0) {
        particleSystem?.footstepDust(this.x - this.facing * 6, this.y + 16);
        this.walkStepTimer = Math.abs(body.velocity.x) > RUN_SPEED ? 140 : 220;
      }
    }

    this.determineState(body);
    this.animT += dt;
    this.animateRig(dt, body);
    this.syncRigPosition();
  }

  determineState(body) {
    if (this.isDashing) this.state = 'dash';
    else if (this.isRolling) this.state = 'roll';
    else if (this.isAttacking) this.state = 'attack';
    else if (this.isShielding) this.state = 'shield';
    else if (this.isWallSliding) this.state = 'wallSlide';
    else if (!this.isGrounded) this.state = body.velocity.y < 0 ? 'jump' : 'fall';
    else if (Math.abs(body.velocity.x) > RUN_SPEED - 10) this.state = 'sprint';
    else if (Math.abs(body.velocity.x) > 20) this.state = 'run';
    else this.state = 'idle';
  }

  animateRig(dt, body) {
    const t = this.animT / 1000;
    const speedFactor = Phaser.Math.Clamp(Math.abs(body.velocity.x) / RUN_SPEED, 0, 1.6);
    const bob = this.isGrounded ? Math.sin(t * 10 * Math.max(speedFactor, 0.15)) : 0;

    // Base offsets relative to sprite center, mirrored by facing
    let headOff = { x: 2, y: -20 };
    let armBackOff = { x: -6, y: -6, rot: 0 };
    let armFrontOff = { x: 6, y: -6, rot: 0 };
    let legBackOff = { x: -4, y: 12, rot: 0 };
    let legFrontOff = { x: 4, y: 12, rot: 0 };
    let swordOff = { x: 12, y: -2, rot: -0.3, visible: true };
    let bodyLean = 0;
    let bodyScaleY = 1;

    switch (this.state) {
      case 'run':
      case 'sprint': {
        const speed = this.state === 'sprint' ? 14 : 10;
        const swing = Math.sin(t * speed);
        legBackOff.rot = swing * 0.9;
        legFrontOff.rot = -swing * 0.9;
        legBackOff.y = 12 - Math.abs(swing) * 3;
        legFrontOff.y = 12 - Math.abs(Math.sin(t * speed + Math.PI)) * 3;
        armBackOff.rot = -swing * 0.7;
        armFrontOff.rot = swing * 0.7;
        bodyLean = this.facing * (this.state === 'sprint' ? 0.18 : 0.1);
        headOff.y -= Math.abs(swing) * 1.5;
        swordOff.rot = -0.6;
        break;
      }
      case 'jump':
        legBackOff.rot = -0.4; legFrontOff.rot = 0.5;
        armBackOff.rot = -0.6; armFrontOff.rot = 0.9;
        bodyScaleY = 1.05;
        break;
      case 'fall':
        legBackOff.rot = 0.3; legFrontOff.rot = -0.2;
        armBackOff.rot = 0.4; armFrontOff.rot = -0.3;
        bodyScaleY = 0.96;
        break;
      case 'wallSlide':
        legBackOff.rot = 1.2; legFrontOff.rot = 1.0;
        armBackOff.rot = -1.0;
        break;
      case 'dash':
        bodyLean = this.facing * 0.5;
        legBackOff.rot = 0.6; legFrontOff.rot = -0.6;
        break;
      case 'roll':
        this.sprite.rotation = Phaser.Math.Wrap(this.sprite.rotation + this.facing * dt * 0.02, -Math.PI, Math.PI);
        break;
      case 'attack': {
        const progress = 1 - Phaser.Math.Clamp(this.attackTimer / 240, 0, 1);
        const swingAngle = Phaser.Math.Linear(-1.6, 1.3, progress) * (this.attackIndex % 2 === 0 ? -1 : 1);
        swordOff.rot = swingAngle;
        armFrontOff.rot = swingAngle * 0.7;
        bodyLean = this.facing * 0.15;
        break;
      }
      case 'shield':
        armFrontOff.rot = -0.2;
        swordOff.visible = false;
        break;
      case 'idle':
      default: {
        const breathe = Math.sin(t * 2.2) * 0.02;
        bodyScaleY = 1 + breathe;
        headOff.y -= breathe * 6;
        armBackOff.rot = Math.sin(t * 1.5) * 0.05;
        armFrontOff.rot = -Math.sin(t * 1.5) * 0.05;
        break;
      }
    }

    if (this.state !== 'roll') this.sprite.rotation = 0;
    if (this.hurtTimer > 0) bodyLean += Phaser.Math.Between(-2, 2) * 0.02;

    this._rigPose = { headOff, armBackOff, armFrontOff, legBackOff, legFrontOff, swordOff, bodyLean, bodyScaleY };
  }

  syncRigPosition() {
    const f = this.facing;
    const x = this.sprite.x;
    const y = this.sprite.y;
    const pose = this._rigPose || {
      headOff: { x: 2, y: -20 }, armBackOff: { x: -6, y: -6, rot: 0 }, armFrontOff: { x: 6, y: -6, rot: 0 },
      legBackOff: { x: -4, y: 12, rot: 0 }, legFrontOff: { x: 4, y: 12, rot: 0 },
      swordOff: { x: 12, y: -2, rot: -0.3, visible: true }, bodyLean: 0, bodyScaleY: 1
    };

    this.sprite.setFlipX(f < 0);
    this.sprite.setScale(1, pose.bodyScaleY);
    this.sprite.setAngle(pose.bodyLean * 20);

    const flip = (off) => ({ x: off.x * f, y: off.y });

    const h = flip(pose.headOff);
    this.head.setPosition(x + h.x, y + h.y).setFlipX(f < 0);
    this.crown.setPosition(x + h.x, y + h.y - 17).setFlipX(f < 0);

    const ab = flip(pose.armBackOff);
    this.armBack.setPosition(x + ab.x, y + ab.y).setRotation((ab.rot || 0) * f).setFlipX(f < 0);

    const af = flip(pose.armFrontOff);
    this.armFront.setPosition(x + af.x, y + af.y).setRotation((af.rot || 0) * f).setFlipX(f < 0);

    const lb = flip(pose.legBackOff);
    this.legBack.setPosition(x + lb.x, y + lb.y).setRotation((lb.rot || 0) * f);

    const lf = flip(pose.legFrontOff);
    this.legFront.setPosition(x + lf.x, y + lf.y).setRotation((lf.rot || 0) * f);

    const sw = flip(pose.swordOff);
    this.sword.setPosition(x + sw.x, y + sw.y).setRotation((sw.rot || 0) * f).setFlipX(f < 0).setVisible(pose.swordOff.visible !== false);

    this.shield.setPosition(x - f * 10, y - 2).setVisible(this.isShielding);

    // Damage flash
    const flash = this.invulnerable && Math.floor(this.animT / 90) % 2 === 0;
    this.parts.forEach((p) => { if (p.setAlpha) p.setAlpha(flash ? 0.4 : 1); });
  }

  getAttackHitboxFacing() { return this.facing; }

  destroy() {
    this.parts.forEach((p) => p.destroy());
  }
}
