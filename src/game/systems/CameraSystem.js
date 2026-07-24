import Phaser from 'phaser';

export class CameraSystem {
  constructor(scene, target) {
    this.scene = scene;
    this.target = target;
    this.cam = scene.cameras.main;
    this.bossLocked = false;
    this.lookAheadX = 0;

    // The game was designed/tuned around a ~960px-wide viewport. On a narrow
    // phone screen, showing the world at zoom 1 only reveals a tiny sliver
    // of it - characters look huge and there's no room to react to hazards.
    // Scaling zoom down for narrower viewports keeps a similar amount of the
    // world visible on any screen size.
    this.referenceWidth = 960;
    this.minZoom = 0.5;
    this.maxZoom = 1;
    this.baseZoom = this.computeBaseZoom();

    this.cam.startFollow(target, true, 0.09, 0.09);
    this.cam.setDeadzone(120, 90);
    this.cam.setZoom(this.baseZoom);

    // Recompute on window resize / mobile orientation change.
    this._onResize = () => {
      this.baseZoom = this.computeBaseZoom();
      if (!this.bossLocked) this.cam.setZoom(this.baseZoom);
    };
    scene.scale.on('resize', this._onResize);
    scene.events.once('shutdown', () => scene.scale.off('resize', this._onResize));
  }

  computeBaseZoom() {
    const width = this.cam.width || this.scene.scale.width || this.referenceWidth;
    return Phaser.Math.Clamp(width / this.referenceWidth, this.minZoom, this.maxZoom);
  }

  setBounds(width, height) {
    this.cam.setBounds(0, 0, width, height);
  }

  update(playerVelocityX, isSprinting) {
    if (this.bossLocked) return;

    // Look-ahead: nudge the deadzone/follow offset in the direction of travel
    const desired = Phaser.Math.Clamp(playerVelocityX / 6, -110, 110);
    this.lookAheadX = Phaser.Math.Linear(this.lookAheadX, desired, 0.06);
    this.cam.setFollowOffset(-this.lookAheadX * 0.5, 0);

    // Zoom out slightly while sprinting for a sense of speed
    const targetZoom = isSprinting ? this.baseZoom - 0.08 : this.baseZoom;
    this.cam.zoom = Phaser.Math.Linear(this.cam.zoom, targetZoom, 0.05);
  }

  shake(duration = 200, intensity = 0.01) {
    this.cam.shake(duration, intensity);
  }

  lockToBoss(arenaBounds) {
    this.bossLocked = true;
    this.cam.stopFollow();
    this.cam.pan(arenaBounds.centerX, arenaBounds.centerY, 600, 'Sine.easeInOut');
    this.cam.zoomTo(Math.min(0.95, this.baseZoom + 0.1), 600);
  }

  unlockFromBoss() {
    this.bossLocked = false;
    this.cam.startFollow(this.target, true, 0.09, 0.09);
    this.cam.zoomTo(this.baseZoom, 500);
  }

  panIntro(fromX, fromY, toX, toY, duration = 1800, onComplete) {
    this.cam.stopFollow();
    this.cam.centerOn(fromX, fromY);
    this.scene.tweens.add({
      targets: this.cam,
      scrollX: toX - this.cam.width / 2,
      scrollY: toY - this.cam.height / 2,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.cam.startFollow(this.target, true, 0.09, 0.09);
        if (onComplete) onComplete();
      }
    });
  }
}
