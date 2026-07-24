import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { SkeletonSoldier } from '../entities/enemies/SkeletonSoldier.js';
import { SkeletonArcher } from '../entities/enemies/SkeletonArcher.js';
import { SkeletonCaptain } from '../entities/enemies/SkeletonCaptain.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { AudioManager } from '../managers/AudioManager.js';
import { SaveManager } from '../managers/SaveManager.js';
import { EventBus } from '../EventBus.js';

const LEVEL_WIDTH = 5200;
const LEVEL_HEIGHT = 720;
const GROUND_Y = 600;

export class Level1Scene extends Phaser.Scene {
  constructor() { super('Level1Scene'); }

  init(data) { this.continueGame = !!data?.continueGame; }

  create() {
    // Unconditionally reset any stuck HUD overlay (level-complete, etc.)
    // from a previous scene the moment this one starts, regardless of how
    // we got here (Continue button, Select Level, direct scene.start).
    EventBus.emit('hud:level-start');
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.cameras.main.setBackgroundColor('#8fd3ff');

    this.buildParallaxBackground();
    this.groundGroup = this.physics.add.staticGroup();
    this.platformGroup = this.physics.add.staticGroup();
    this.spikeGroup = this.physics.add.staticGroup();
    this.buildTerrain();
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
    this.lastGroundX = startX;
    this.lastGroundY = startY;
    this.physics.add.overlap(this.player.sprite, this.spikeGroup, () => this.player.takeDamage(1, this.player.facing * -1, 260));

    this.cameraSystem = new CameraSystem(this, this.player.sprite);
    this.cameraSystem.setBounds(LEVEL_WIDTH, LEVEL_HEIGHT);

    this.buildCollectibles();
    this.buildCheckpoints();
    this.buildEnemies();
    this.buildGoal();

    this.arrowGroup = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 20, runChildUpdate: false });
    this.archers.forEach((a) => { a.arrows = this.arrowGroup; });
    this.physics.add.overlap(this.player.sprite, this.arrowGroup, (playerSprite, arrow) => {
      if (!arrow.active) return;
      arrow.setActive(false).setVisible(false);
      arrow.body.stop();
      this.player.takeDamage(1, arrow.body.velocity.x > 0 ? 1 : -1, 160);
    });

    this.isPaused = false;
    this.levelComplete = false;
    this.gameOver = false;

    AudioManager.startMusic('forest');

    EventBus.on('input:pause-toggle', this.togglePause, this);
    EventBus.on('input:touch', this.handleTouchInput, this);
    EventBus.on('input:game-over-choice', this.handleGameOverChoice, this);
    EventBus.on('input:back-to-menu', this.goToMenu, this);
    EventBus.on('input:next-level', this.goToNextLevel, this);
    this.events.once('shutdown', () => {
      EventBus.off('input:pause-toggle', this.togglePause, this);
      EventBus.off('input:touch', this.handleTouchInput, this);
      EventBus.off('input:game-over-choice', this.handleGameOverChoice, this);
      EventBus.off('input:back-to-menu', this.goToMenu, this);
      EventBus.off('input:next-level', this.goToNextLevel, this);
      if (this._onSpeechGateSuccess) EventBus.off('input:speech-gate-success', this._onSpeechGateSuccess);
      EventBus.emit('hud:speech-gate-hide');
      AudioManager.stopMusic();
    });

    this.cameraSystem.panIntro(startX, startY, startX + 260, startY, 1200);

    this.emitHud();
  }

  // ---------------------------------------------------------------- world ---
  buildParallaxBackground() {
    // Plain solid-color rectangle, wildly oversized - the simplest, most
    // failure-proof way to guarantee full sky coverage. No texture, no
    // tiling, no dependence on screen/viewport size at all. The decorative
    // mountain/forest silhouette layers were removed: their pre-baked
    // textures had large intentionally-transparent gaps (between the
    // triangle peaks) that were rendering as solid black instead of
    // see-through on some renderers, which is what caused the black bands.
    this.add.rectangle(LEVEL_WIDTH / 2, GROUND_Y, LEVEL_WIDTH + 8000, 8000, 0x8fd3ff).setScrollFactor(0.02).setDepth(-10);

    for (let i = 0; i < 24; i++) {
      const cloud = this.add.image(Phaser.Math.Between(0, LEVEL_WIDTH), Phaser.Math.Between(60, 220), 'cloud').setScrollFactor(0.1).setAlpha(0.85);
      this.tweens.add({ targets: cloud, x: cloud.x + 300, duration: Phaser.Math.Between(20000, 40000), yoyo: true, repeat: -1 });
    }
  }

  buildTerrain() {
    // Ground segments with gaps to jump across
    const segments = [
      [0, 900], [1000, 1500], [1650, 2400], [2600, 3200], [3400, 4200], [4400, LEVEL_WIDTH]
    ];
    segments.forEach(([sx, ex]) => {
      for (let x = sx; x < ex; x += 64) {
        this.groundGroup.create(x + 32, GROUND_Y + 32, 'ground').setOrigin(0.5).refreshBody();
      }
    });

    // Floating platforms for vertical variety
    const platforms = [
      [950, GROUND_Y - 90], [1180, GROUND_Y - 160],
      [1560, GROUND_Y - 110], [1780, GROUND_Y - 190], [2000, GROUND_Y - 110],
      [2500, GROUND_Y - 130], [2900, GROUND_Y - 200],
      [3300, GROUND_Y - 120], [3600, GROUND_Y - 60], [3950, GROUND_Y - 180],
      [4300, GROUND_Y - 110]
    ];
    platforms.forEach(([x, y]) => this.platformGroup.create(x, y, 'platform').refreshBody());

    // Spike hazards near a couple of gaps / floor stretches
    [1720, 2750, 4050].forEach((x) => {
      const spike = this.spikeGroup.create(x, GROUND_Y + 6, 'spike').refreshBody();
      spike.body.setSize(20, 12).setOffset(2, 8);
    });
  }

  buildDecorations() {
    const treeXs = [200, 480, 1050, 1300, 1900, 2200, 2650, 3050, 3500, 3850, 4250, 4700];
    treeXs.forEach((x) => {
      // Anchor at bottom-center so the trunk base sits exactly on the ground
      // line, and lock scrollFactor to 1 so trees never drift out of sync
      // with the ground as the camera moves (previously caused trees to
      // appear sunk into / floating above the ground).
      this.add.image(x, GROUND_Y, 'tree').setOrigin(0.5, 1).setDepth(10).setAlpha(0.95);
    });
    [1550, 3350].forEach((x) => {
      this.add.image(x, GROUND_Y, 'waterfall').setOrigin(0.5, 1).setDepth(9).setAlpha(0.8);
    });
  }

  // --------------------------------------------------------- collectibles ---
  buildCollectibles() {
    this.coinGroup = this.physics.add.group({ allowGravity: false });
    this.gemGroup = this.physics.add.group({ allowGravity: false });
    this.heartGroup = this.physics.add.group({ allowGravity: false });

    const coinLine = (startX, y, count, spacing = 34) => {
      for (let i = 0; i < count; i++) {
        this.coinGroup.create(startX + i * spacing, y, 'coin');
      }
    };
    coinLine(980, GROUND_Y - 130, 5);
    coinLine(1590, GROUND_Y - 150, 4);
    coinLine(2520, GROUND_Y - 170, 5);
    coinLine(3330, GROUND_Y - 160, 4);
    coinLine(3970, GROUND_Y - 220, 5);

    [700, 2050, 3650, 4550].forEach((x) => this.gemGroup.create(x, GROUND_Y - 60, 'gem'));
    [900, 1850, 2600, 3300, 4150, 4750].forEach((x) => this.heartGroup.create(x, GROUND_Y - 60, 'heart'));

    [this.coinGroup, this.gemGroup, this.heartGroup].forEach((g) => {
      g.children.iterate((c) => {
        if (!c) return;
        this.tweens.add({ targets: c, y: c.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    });

    this.physics.add.overlap(this.player.sprite, this.coinGroup, (_p, coin) => {
      coin.destroy();
      this.player.coins += 1;
      AudioManager.coin();
      this.particleSystem.collectSparkle(coin.x, coin.y);
      this.emitHud();
    });
    this.physics.add.overlap(this.player.sprite, this.gemGroup, (_p, gem) => {
      gem.destroy();
      this.player.gems += 1;
      AudioManager.gem();
      this.particleSystem.collectSparkle(gem.x, gem.y);
      this.emitHud();
    });
    this.physics.add.overlap(this.player.sprite, this.heartGroup, (_p, heart) => {
      heart.destroy();
      this.player.heal(1);
      AudioManager.heart();
      this.particleSystem.collectSparkle(heart.x, heart.y);
      this.emitHud();
    });
  }

  buildCheckpoints() {
    this.checkpointXs = [1600, 3300];
    this.checkpoints = this.checkpointXs.map((x) => {
      const flag = this.add.image(x, GROUND_Y - 30, 'checkpoint').setDepth(20);
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
      SaveManager.saveCheckpoint('level1', zone.flagRef.x, zone.flagRef.y - 40, {
        hearts: this.player.hearts, coins: this.player.coins, gems: this.player.gems
      });
      EventBus.emit('hud:toast', 'Checkpoint reached');
    });
  }

  buildEnemies() {
    this.soldiers = [];
    this.archers = [];

    const soldierXs = [700, 1250, 2100, 2850, 3750];
    soldierXs.forEach((x) => {
      this.soldiers.push(new SkeletonSoldier(this, x, GROUND_Y - 30, { particleSystem: this.particleSystem, onDeath: () => this.emitHud() }));
    });

    const archerXs = [1450, 2700, 4000];
    archerXs.forEach((x) => {
      this.archers.push(new SkeletonArcher(this, x, GROUND_Y - 30, { particleSystem: this.particleSystem, onDeath: () => this.emitHud() }));
    });

    [...this.soldiers, ...this.archers].forEach((e) => {
      this.physics.add.collider(e.sprite, this.groundGroup);
      this.physics.add.collider(e.sprite, this.platformGroup);
    });

    // Mini-boss behind the goal gate area
    this.captain = new SkeletonCaptain(this, 4900, GROUND_Y - 30, {
      particleSystem: this.particleSystem,
      arenaMinX: 4700, arenaMaxX: 5150,
      onEngage: () => this.startBossFight(),
      onDeath: () => this.finishBossFight()
    });
    this.physics.add.collider(this.captain.sprite, this.groundGroup);
    this.physics.add.collider(this.captain.sprite, this.platformGroup);
  }

  buildGoal() {
    this.goalGate = this.add.image(5150, GROUND_Y - 40, 'goal_gate').setDepth(15);
    this.gateOpen = false;
    this.magicSequenceStarted = false;
    // Position thresholds instead of narrow physics trigger zones: a zone
    // only 20px wide can be skipped over in a single physics step during a
    // dash or a boss knockback, which silently breaks the whole ending
    // sequence. A simple "has the player's x passed this point" check runs
    // every frame and can never be skipped over.
    this.magicTriggerX = 5060;
    this.goalTriggerX = 5150;
  }

  startMagicGateSequence() {
    if (this.magicSequenceStarted || this.gateOpen) return;
    this.magicSequenceStarted = true;
    AudioManager.checkpoint();
    // Hand off to the SpeechGate React overlay: it shows the "speak the
    // magic word" UI, listens via the Web Speech API with a fuzzy match,
    // and always offers a button/Enter-key fallback so the game is never
    // blocked. We only open the gate once it reports success.
    EventBus.emit('hud:speech-gate-show', { phrase: 'Abra Ka Dabra' });
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
    this.cameraSystem.lockToBoss({ centerX: 4900, centerY: GROUND_Y - 100 });
    EventBus.emit('hud:boss-start', { name: this.captain.bossName, maxHealth: this.captain.maxHealth });
  }

  finishBossFight() {
    AudioManager.victory();
    EventBus.emit('hud:boss-end');
    this.cameraSystem.unlockFromBoss();
    AudioManager.startMusic('forest');
  }

  // ------------------------------------------------------------- update -----
  update(_time, delta) {
    if (this.isPaused || this.levelComplete || this.gameOver) return;
    const dt = delta;

    this.player.update(dt, this.input_, this.particleSystem);
    this.input_.consumeTouchTaps();

    if (this.player.isAttacking) {
      // Generous reach + short cooldown make it easy to land hits on skeletons
      this.combatSystem.resolveAttack({
        attacker: this.player.sprite,
        targets: [...this.soldiers, ...this.archers, this.captain],
        damage: 10 + this.player.attackIndex * 2,
        facing: this.player.facing,
        reach: 62,
        height: 48,
        knockback: 240
      });
    }

    this.soldiers.forEach((s) => s.update(dt, this.player, this.combatSystem));
    this.archers.forEach((a) => a.update(dt, this.player, this.combatSystem));
    if (this.captain && !this.captain.isDead) this.captain.update(dt, this.player, this.combatSystem);

    // Enemy contact damage (bumping into player) — melee sword damage is handled
    // via delayedCall inside each enemy's own attack routine.
    this.checkEnemyContact(this.soldiers);
    this.checkEnemyContact(this.archers);
    if (this.captain && !this.captain.isDead) this.checkEnemyContact([this.captain]);

    this.cameraSystem.update(this.player.sprite.body.velocity.x, this.player._sprinting);

    if (this.bossActive && this.captain && !this.captain.isDead) {
      EventBus.emit('hud:boss-health', this.captain.getHealthPct());
    }

    if (this.player.isGrounded && !this.player.isDead) {
      this.lastGroundX = this.player.x;
      this.lastGroundY = this.player.y;
    }

    // If the player drops into a gap and ends up below the ground line
    // (previously they'd just keep falling and take repeated damage), snap
    // them back up onto solid ground near where they last stood instead.
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
      // Out of hearts — stop gameplay and ask the player what to do next.
      this.gameOver = true;
      this.time.delayedCall(500, () => {
        EventBus.emit('hud:game-over');
      });
      return;
    }
    // (Not currently reachable since every hit takes exactly one heart, but
    // kept for safety / future difficulty tuning.)
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
      AudioManager.startMusic(this.bossActive ? 'boss' : 'forest');
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
      currentLevel: 'level2', checkpoint: null
    });
    SaveManager.unlockLevel('level2');
    EventBus.emit('hud:level-complete', { coins: this.player.coins, gems: this.player.gems, isFinal: false });
  }

  goToNextLevel() {
    this.scene.start('Level2Scene', { continueGame: true });
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
