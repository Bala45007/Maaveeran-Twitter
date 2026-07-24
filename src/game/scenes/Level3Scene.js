import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { SkeletonSoldier } from '../entities/enemies/SkeletonSoldier.js';
import { SkeletonArcher } from '../entities/enemies/SkeletonArcher.js';
import { SkeletonWizard } from '../entities/enemies/SkeletonWizard.js';
import { SkeletonBomber } from '../entities/enemies/SkeletonBomber.js';
import { SkeletonEngineer } from '../entities/enemies/SkeletonEngineer.js';
import { SkeletonFlyingBat } from '../entities/enemies/SkeletonFlyingBat.js';
import { SkeletonKing } from '../entities/enemies/SkeletonKing.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { AudioManager } from '../managers/AudioManager.js';
import { SaveManager } from '../managers/SaveManager.js';
import { EventBus } from '../EventBus.js';

// Level 3: Dark Crystal Castle - hard difficulty. Reuses the same procedural
// textures as Levels 1-2, recolored with dark/lava tints, plus the full
// skeleton roster and a moving-platform mechanic, ending in the Skeleton King.
const LEVEL_WIDTH = 5800;
const LEVEL_HEIGHT = 720;
const GROUND_Y = 600;
const CASTLE_TINT = 0xffb37a;
const STONE_TINT = 0x4a3d3a;

export class Level3Scene extends Phaser.Scene {
  constructor() { super('Level3Scene'); }

  init(data) { this.continueGame = !!data?.continueGame; }

  create() {
    // Unconditionally reset any stuck HUD overlay (level-complete, etc.)
    // from a previous scene the moment this one starts, regardless of how
    // we got here (Continue button, Select Level, direct scene.start).
    EventBus.emit('hud:level-start');
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.cameras.main.setBackgroundColor('#08080a');

    this.buildParallaxBackground();
    this.groundGroup = this.physics.add.staticGroup();
    this.platformGroup = this.physics.add.staticGroup();
    this.spikeGroup = this.physics.add.staticGroup();
    this.lavaGroup = this.physics.add.staticGroup();
    this.buildTerrain();
    this.buildMovingPlatforms();
    this.buildDecorations();

    this.particleSystem = new ParticleSystem(this);
    this.combatSystem = new CombatSystem(this, this.particleSystem);
    this.input_ = new InputSystem(this);

    const save = SaveManager.load();
    const startX = this.continueGame && save.checkpoint ? save.checkpoint.x : 120;
    const startY = this.continueGame && save.checkpoint ? save.checkpoint.y : GROUND_Y - 60;

    this.player = new Player(this, startX, startY, {
      onDeath: () => this.handlePlayerDeath(),
      onDamage: () => { this.cameraSystem?.shake(120, 0.006); }
    });
    if (this.continueGame) {
      this.player.hearts = save.hearts ?? this.player.maxHearts;
      this.player.coins = save.coins ?? 0;
      this.player.gems = save.gems ?? 0;
    }

    this.physics.add.collider(this.player.sprite, this.groundGroup);
    this.physics.add.collider(this.player.sprite, this.platformGroup);
    this.physics.add.collider(this.player.sprite, this.movingPlatformGroup);
    this.lastGroundX = startX;
    this.lastGroundY = startY;
    this.physics.add.overlap(this.player.sprite, this.spikeGroup, () => this.player.takeDamage(1, this.player.facing * -1, 260));
    this.physics.add.overlap(this.player.sprite, this.lavaGroup, () => this.player.takeDamage(1, this.player.facing * -1, 280));

    this.cameraSystem = new CameraSystem(this, this.player.sprite);
    this.cameraSystem.setBounds(LEVEL_WIDTH, LEVEL_HEIGHT);

    this.buildCollectibles();
    this.buildCheckpoints();
    this.buildEnemies();
    this.buildGoal();

    this.arrowGroup = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 24, runChildUpdate: false });
    this.archers.forEach((a) => { a.arrows = this.arrowGroup; });
    this.physics.add.overlap(this.player.sprite, this.arrowGroup, (playerSprite, arrow) => {
      if (!arrow.active) return;
      arrow.setActive(false).setVisible(false);
      arrow.body.stop();
      this.player.takeDamage(1, arrow.body.velocity.x > 0 ? 1 : -1, 160);
    });

    this.projectileGroup = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 16, runChildUpdate: false });
    this.wizards.forEach((w) => { w.projectiles = this.projectileGroup; });
    this.physics.add.overlap(this.player.sprite, this.projectileGroup, (playerSprite, proj) => {
      if (!proj.active) return;
      proj.setActive(false).setVisible(false);
      proj.body.stop();
      this.player.takeDamage(1, proj.body.velocity.x > 0 ? 1 : -1, 180);
    });

    this.bombGroup = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 14, runChildUpdate: false });
    [...this.bombers, ...this.bats].forEach((b) => { b.bombs = this.bombGroup; });
    this.physics.add.collider(this.bombGroup, this.groundGroup);
    this.physics.add.collider(this.bombGroup, this.platformGroup);

    this.isPaused = false;
    this.levelComplete = false;
    this.gameOver = false;

    AudioManager.startMusic('boss');

    EventBus.on('input:pause-toggle', this.togglePause, this);
    EventBus.on('input:touch', this.handleTouchInput, this);
    EventBus.on('input:game-over-choice', this.handleGameOverChoice, this);
    EventBus.on('input:back-to-menu', this.goToMenu, this);
    this.events.once('shutdown', () => {
      EventBus.off('input:pause-toggle', this.togglePause, this);
      EventBus.off('input:touch', this.handleTouchInput, this);
      EventBus.off('input:game-over-choice', this.handleGameOverChoice, this);
      EventBus.off('input:back-to-menu', this.goToMenu, this);
      if (this._onSpeechGateSuccess) EventBus.off('input:speech-gate-success', this._onSpeechGateSuccess);
      EventBus.emit('hud:speech-gate-hide');
      AudioManager.stopMusic();
    });

    this.cameraSystem.panIntro(startX, startY, startX + 260, startY, 1200);
    EventBus.emit('hud:toast', 'Dark Crystal Castle - the final trial');

    this.emitHud();
  }

  // ---------------------------------------------------------------- world ---
  buildParallaxBackground() {
    this.add.rectangle(LEVEL_WIDTH / 2, GROUND_Y, LEVEL_WIDTH + 8000, 8000, 0x08080a).setScrollFactor(0.02).setDepth(-10);

    for (let i = 0; i < 14; i++) {
      this.add.image(Phaser.Math.Between(0, LEVEL_WIDTH), Phaser.Math.Between(GROUND_Y - 320, GROUND_Y - 100), 'crystal_deco')
        .setScrollFactor(0.4).setAlpha(0.5).setDepth(8).setTint(0xff8a5a);
    }
  }

  buildTerrain() {
    const segments = [
      [0, 700], [900, 1300], [1500, 1950], [2150, 2500], [2700, 3050],
      [3250, 3650], [3850, 4250], [4450, 4900], [5100, LEVEL_WIDTH]
    ];
    segments.forEach(([sx, ex]) => {
      for (let x = sx; x < ex; x += 64) {
        this.groundGroup.create(x + 32, GROUND_Y + 32, 'ground').setOrigin(0.5).setTint(STONE_TINT).refreshBody();
      }
    });

    const platforms = [
      [770, GROUND_Y - 110], [790, GROUND_Y - 200],
      [1380, GROUND_Y - 130],
      [2020, GROUND_Y - 100], [2050, GROUND_Y - 190],
      [3130, GROUND_Y - 140],
      [3730, GROUND_Y - 110], [3760, GROUND_Y - 210],
      [4320, GROUND_Y - 130], [4600, GROUND_Y - 200]
    ];
    platforms.forEach(([x, y]) => this.platformGroup.create(x, y, 'platform').setTint(0x5c4a44).refreshBody());

    // Lava pools sit in a few of the widest gaps instead of ground
    [900 - 90, 2150 - 90, 4450 - 90].forEach((x) => {
      const lava = this.lavaGroup.create(x, GROUND_Y + 20, 'lava_pool').refreshBody();
      lava.body.setSize(60, 16).setOffset(2, 6);
    });

    [780, 1700, 2850, 3450, 4000, 5000].forEach((x) => {
      const spike = this.spikeGroup.create(x, GROUND_Y + 6, 'spike').setTint(0xff9a6a).refreshBody();
      spike.body.setSize(20, 12).setOffset(2, 8);
    });
  }

  buildMovingPlatforms() {
    // Simple horizontally-patrolling platforms - immovable dynamic bodies whose
    // delta-x is applied to the player each frame while they're standing on
    // one, since Arcade Physics doesn't do this automatically.
    this.movingPlatformGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.movingPlatforms = [];

    const configs = [
      { x: 2550, y: GROUND_Y - 120, range: 160, duration: 2600 },
      { x: 4980, y: GROUND_Y - 150, range: 140, duration: 2200 }
    ];
    configs.forEach((cfg) => {
      const plat = this.movingPlatformGroup.create(cfg.x, cfg.y, 'platform').setTint(0x7a5a4a);
      plat.body.setAllowGravity(false);
      plat.body.setImmovable(true);
      const track = { sprite: plat, prevX: cfg.x };
      this.movingPlatforms.push(track);
      this.tweens.add({
        targets: plat, x: cfg.x + cfg.range, duration: cfg.duration,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    });
  }

  buildDecorations() {
    [1200, 3300, 4700].forEach((x) => {
      this.add.image(x, GROUND_Y, 'waterfall').setOrigin(0.5, 1).setDepth(9).setTint(0xff6a3a).setAlpha(0.6);
    });
  }

  // --------------------------------------------------------- collectibles ---
  buildCollectibles() {
    this.coinGroup = this.physics.add.group({ allowGravity: false });
    this.gemGroup = this.physics.add.group({ allowGravity: false });
    this.heartGroup = this.physics.add.group({ allowGravity: false });

    const coinLine = (startX, y, count, spacing = 34) => {
      for (let i = 0; i < count; i++) this.coinGroup.create(startX + i * spacing, y, 'coin');
    };
    coinLine(800, GROUND_Y - 220, 5);
    coinLine(2080, GROUND_Y - 220, 4);
    coinLine(3160, GROUND_Y - 170, 5);
    coinLine(4340, GROUND_Y - 160, 4);

    [600, 1900, 3000, 4100, 5200].forEach((x) => this.gemGroup.create(x, GROUND_Y - 60, 'gem'));
    // Sparse hearts - this is the hard level, hearts are precious.
    [1400, 2900, 4300, 5300].forEach((x) => this.heartGroup.create(x, GROUND_Y - 60, 'heart'));

    [this.coinGroup, this.gemGroup, this.heartGroup].forEach((g) => {
      g.children.iterate((c) => {
        if (!c) return;
        this.tweens.add({ targets: c, y: c.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    });

    this.physics.add.overlap(this.player.sprite, this.coinGroup, (_p, coin) => {
      coin.destroy(); this.player.coins += 1; AudioManager.coin();
      this.particleSystem.collectSparkle(coin.x, coin.y); this.emitHud();
    });
    this.physics.add.overlap(this.player.sprite, this.gemGroup, (_p, gem) => {
      gem.destroy(); this.player.gems += 1; AudioManager.gem();
      this.particleSystem.collectSparkle(gem.x, gem.y); this.emitHud();
    });
    this.physics.add.overlap(this.player.sprite, this.heartGroup, (_p, heart) => {
      heart.destroy(); this.player.heal(1); AudioManager.heart();
      this.particleSystem.collectSparkle(heart.x, heart.y); this.emitHud();
    });
  }

  buildCheckpoints() {
    this.checkpointXs = [1450, 3150, 4550];
    this.checkpoints = this.checkpointXs.map((x) => {
      const flag = this.add.image(x, GROUND_Y - 30, 'checkpoint').setDepth(20).setTint(0xffb37a);
      flag.activated = false;
      return flag;
    });
    this.checkpointZone = this.physics.add.staticGroup();
    this.checkpoints.forEach((flag) => {
      const zone = this.checkpointZone.create(flag.x, flag.y, null).setVisible(false);
      zone.body.setSize(20, 60);
      zone.refreshBody();
      zone.flagRef = flag;
    });
    this.physics.add.overlap(this.player.sprite, this.checkpointZone, (_p, zone) => {
      if (zone.flagRef.activated) return;
      zone.flagRef.activated = true;
      zone.flagRef.setTint(0x9be89b);
      AudioManager.checkpoint();
      SaveManager.saveCheckpoint('level3', zone.flagRef.x, zone.flagRef.y - 40, {
        hearts: this.player.hearts, coins: this.player.coins, gems: this.player.gems
      });
      EventBus.emit('hud:toast', 'Checkpoint reached');
    });
  }

  buildEnemies() {
    this.soldiers = [];
    this.archers = [];
    this.wizards = [];
    this.bombers = [];
    this.bats = [];
    this.engineers = [];

    const soldierXs = [600, 1600, 2750, 3550, 4800];
    soldierXs.forEach((x) => {
      this.soldiers.push(new SkeletonSoldier(this, x, GROUND_Y - 30, { particleSystem: this.particleSystem, onDeath: () => this.emitHud() }));
    });

    const archerXs = [950, 2300, 3400, 4650];
    archerXs.forEach((x) => {
      this.archers.push(new SkeletonArcher(this, x, GROUND_Y - 30, { particleSystem: this.particleSystem, onDeath: () => this.emitHud() }));
    });

    const wizardXs = [1750, 3900];
    wizardXs.forEach((x) => {
      this.wizards.push(new SkeletonWizard(this, x, GROUND_Y - 30, { particleSystem: this.particleSystem, onDeath: () => this.emitHud() }));
    });

    const bomberXs = [1300, 2900, 4200];
    bomberXs.forEach((x) => {
      this.bombers.push(new SkeletonBomber(this, x, GROUND_Y - 30, { particleSystem: this.particleSystem, onDeath: () => this.emitHud() }));
    });

    const batXs = [2400, 3800, 4900];
    batXs.forEach((x) => {
      this.bats.push(new SkeletonFlyingBat(this, x, GROUND_Y - 220, { particleSystem: this.particleSystem, onDeath: () => this.emitHud() }));
    });

    // Engineer guards a hidden trap - the trap is a disabled spike that it
    // pops active when the player gets close.
    const engineerX = 3250;
    const trap = this.spikeGroup.create(engineerX + 70, GROUND_Y + 6, 'spike').setTint(0xff5a3a).refreshBody();
    trap.body.setSize(20, 12).setOffset(2, 8);
    trap.setVisible(false);
    trap.body.enable = false;
    this.engineers.push(new SkeletonEngineer(this, engineerX, GROUND_Y - 30, {
      particleSystem: this.particleSystem, trapX: engineerX + 70, trapY: GROUND_Y - 30,
      trapSprite: trap, onDeath: () => this.emitHud()
    }));

    [...this.soldiers, ...this.archers, ...this.wizards, ...this.bombers, ...this.engineers].forEach((e) => {
      this.physics.add.collider(e.sprite, this.groundGroup);
      this.physics.add.collider(e.sprite, this.platformGroup);
    });

    // Final boss: Skeleton King - 3-phase fight with a one-time skeleton summon
    this.captain = new SkeletonKing(this, 5650, GROUND_Y - 30, {
      particleSystem: this.particleSystem,
      arenaMinX: 5450, arenaMaxX: 5780,
      onEngage: () => this.startBossFight(),
      onDeath: () => this.finishBossFight(),
      onSummon: () => this.summonReinforcements()
    });
    this.physics.add.collider(this.captain.sprite, this.groundGroup);
    this.physics.add.collider(this.captain.sprite, this.platformGroup);
  }

  summonReinforcements() {
    EventBus.emit('hud:toast', 'The King summons reinforcements!');
    [this.captain.x - 80, this.captain.x + 80].forEach((x) => {
      const s = new SkeletonSoldier(this, x, GROUND_Y - 30, { particleSystem: this.particleSystem, onDeath: () => this.emitHud() });
      this.physics.add.collider(s.sprite, this.groundGroup);
      this.physics.add.collider(s.sprite, this.platformGroup);
      this.soldiers.push(s);
    });
  }

  buildGoal() {
    this.goalGate = this.add.image(5750, GROUND_Y - 40, 'goal_gate').setDepth(15).setTint(0xff9a6a);
    this.gateOpen = false;
    this.magicSequenceStarted = false;
    this.magicTriggerX = 5660;
    this.goalTriggerX = 5750;
  }

  startMagicGateSequence() {
    if (this.magicSequenceStarted || this.gateOpen) return;
    this.magicSequenceStarted = true;
    AudioManager.checkpoint();
    EventBus.emit('hud:speech-gate-show', { phrase: 'Veerame Jayam' });
    this._onSpeechGateSuccess = () => {
      EventBus.off('input:speech-gate-success', this._onSpeechGateSuccess);
      this.time.delayedCall(3000, () => this.openMagicGate());
    };
    EventBus.on('input:speech-gate-success', this._onSpeechGateSuccess);
  }

  openMagicGate() {
    if (this.gateOpen) return;
    this.gateOpen = true;
    EventBus.emit('hud:speech-gate-hide');
    AudioManager.victory();
    this.particleSystem.collectSparkle(this.goalGate.x, this.goalGate.y);
    this.particleSystem.collectSparkle(this.goalGate.x, this.goalGate.y - 30);
    this.tweens.add({ targets: this.goalGate, scaleX: 1.08, scaleY: 1.08, duration: 250, yoyo: true });
    EventBus.emit('hud:toast', 'The gate opens!');
  }

  // -------------------------------------------------------------- boss ------
  startBossFight() {
    if (this.bossActive) return;
    this.bossActive = true;
    AudioManager.startMusic('boss');
    this.cameraSystem.lockToBoss({ centerX: this.captain.x, centerY: GROUND_Y - 100 });
    EventBus.emit('hud:boss-start', { name: this.captain.bossName, maxHealth: this.captain.maxHealth });
  }

  finishBossFight() {
    AudioManager.victory();
    EventBus.emit('hud:boss-end');
    this.cameraSystem.unlockFromBoss();
    AudioManager.startMusic('boss');
  }

  // ------------------------------------------------------------- update -----
  update(_time, delta) {
    if (this.isPaused || this.levelComplete || this.gameOver) return;
    const dt = delta;

    this.player.update(dt, this.input_, this.particleSystem);
    this.input_.consumeTouchTaps();

    if (this.player.isAttacking) {
      this.combatSystem.resolveAttack({
        attacker: this.player.sprite,
        targets: [...this.soldiers, ...this.archers, ...this.wizards, ...this.bombers, ...this.bats, ...this.engineers, this.captain],
        damage: 10 + this.player.attackIndex * 2,
        facing: this.player.facing,
        reach: 62,
        height: 48,
        knockback: 240
      });
    }

    this.soldiers.forEach((s) => s.update(dt, this.player, this.combatSystem));
    this.archers.forEach((a) => a.update(dt, this.player, this.combatSystem));
    this.wizards.forEach((w) => w.update(dt, this.player, this.combatSystem));
    this.bombers.forEach((b) => b.update(dt, this.player, this.combatSystem));
    this.bats.forEach((b) => b.update(dt, this.player, this.combatSystem));
    this.engineers.forEach((e) => e.update(dt, this.player));
    if (this.captain && !this.captain.isDead) this.captain.update(dt, this.player, this.combatSystem);

    this.checkEnemyContact(this.soldiers);
    this.checkEnemyContact(this.archers);
    this.checkEnemyContact(this.wizards);
    this.checkEnemyContact(this.bombers);
    this.checkEnemyContact(this.bats);
    if (this.captain && !this.captain.isDead) this.checkEnemyContact([this.captain]);

    // Carry the player along with whichever moving platform they're standing on
    this.movingPlatforms.forEach((track) => {
      const dx = track.sprite.x - track.prevX;
      if (Math.abs(dx) > 0.001 && this.player.isGrounded) {
        const onTop = Math.abs(this.player.x - track.sprite.x) < 60 &&
          Math.abs((this.player.y + 15) - (track.sprite.y - 12)) < 10;
        if (onTop) this.player.sprite.x += dx;
      }
      track.prevX = track.sprite.x;
    });

    this.cameraSystem.update(this.player.sprite.body.velocity.x, this.player._sprinting);

    if (this.bossActive && this.captain && !this.captain.isDead) {
      EventBus.emit('hud:boss-health', this.captain.getHealthPct());
    }

    if (this.player.isGrounded && !this.player.isDead) {
      this.lastGroundX = this.player.x;
      this.lastGroundY = this.player.y;
    }
    if (!this.player.isGrounded && this.player.y > GROUND_Y + 50 && !this.player.isDead && !this.player.invulnerable) {
      this.recoverFromPit();
    }

    if (!this.magicSequenceStarted && !this.gateOpen && this.player.x >= this.magicTriggerX) {
      this.startMagicGateSequence();
    }
    if (this.gateOpen && !this.levelComplete && this.player.x >= this.goalTriggerX) {
      this.completeLevel();
    }

    if (this.input_.pauseDown) this.togglePause();

    if (this.player.y > LEVEL_HEIGHT + 100 && !this.player.isDead) {
      this.player.takeDamage(1);
    }

    this.emitHud();
  }

  checkEnemyContact(list) {
    list.forEach((e) => {
      if (e.isDead || this.player.isDead || this.player.invulnerable) return;
      const bounds = e.getBounds();
      const pBounds = this.player.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, pBounds) && !e.isAttacking) {
        const fromFacing = this.player.x < e.x ? 1 : -1;
        this.player.takeDamage(1, fromFacing, 160);
      }
    });
  }

  handlePlayerDeath() {
    AudioManager.stopMusic();
    if (this.player.hearts <= 0) {
      this.gameOver = true;
      this.time.delayedCall(500, () => { EventBus.emit('hud:game-over'); });
      return;
    }
    this.respawnAtCheckpoint();
  }

  recoverFromPit() {
    const safeX = this.lastGroundX ?? this.player.x;
    const safeY = (this.lastGroundY ?? GROUND_Y - 60) - 40;
    this.player.sprite.setPosition(safeX, safeY);
    this.player.takeDamage(1, 0, 0);
    this.player.sprite.setVelocity(0, -150);
    this.particleSystem.landDust(safeX, safeY + 40);
    EventBus.emit('hud:toast', 'Caught you! Watch the gaps');
  }

  respawnAtCheckpoint() {
    this.time.delayedCall(800, () => {
      const save = SaveManager.load();
      const cp = save.checkpoint || { x: 120, y: GROUND_Y - 60 };
      this.player.respawn(cp.x, cp.y);
      this.player.coins = save.coins ?? this.player.coins;
      this.player.gems = save.gems ?? this.player.gems;
      this.cameraSystem.cam.centerOn(cp.x, cp.y);
      AudioManager.startMusic('boss');
      this.emitHud();
    });
  }

  goToMenu() {
    this.scene.start('MenuScene');
  }

  handleGameOverChoice(choice) {
    if (choice === 'newGame') {
      SaveManager.clear();
      this.scene.start('Level1Scene', { continueGame: false });
    } else {
      this.scene.start('MenuScene');
    }
  }

  completeLevel() {
    if (this.levelComplete) return;
    this.levelComplete = true;
    AudioManager.stopMusic();
    AudioManager.victory();
    SaveManager.save({
      coins: this.player.coins, gems: this.player.gems, hearts: this.player.hearts,
      currentLevel: 'complete', checkpoint: null
    });
    EventBus.emit('hud:level-complete', { coins: this.player.coins, gems: this.player.gems, isFinal: true });
  }

  togglePause() {
    if (this.gameOver) return;
    this.isPaused = !this.isPaused;
    this.physics.world.isPaused = this.isPaused;
    EventBus.emit('hud:pause', this.isPaused);
  }

  handleTouchInput(action) {
    if (!this.input_) return;
    if (action.type === 'down') this.input_.touch[action.key] = true;
    if (action.type === 'up') this.input_.touch[action.key] = false;
    if (action.type === 'tap') this.input_.touch[action.key] = true;
  }

  emitHud() {
    EventBus.emit('hud:update', {
      hearts: this.player.hearts,
      maxHearts: this.player.maxHearts,
      energy: this.player.energy,
      maxEnergy: this.player.maxEnergy,
      coins: this.player.coins,
      gems: this.player.gems,
      levelProgress: Phaser.Math.Clamp(this.player.x / LEVEL_WIDTH, 0, 1)
    });
  }
}
