export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.dustEmitter = scene.add.particles(0, 0, 'particle_dust', {
      lifespan: 400,
      speed: { min: 20, max: 60 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.7, end: 0 },
      gravityY: 200,
      emitting: false
    });
    this.sparkEmitter = scene.add.particles(0, 0, 'particle_spark', {
      lifespan: 350,
      speed: { min: 60, max: 160 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 300,
      emitting: false
    });
    this.dustEmitter.setDepth(50);
    this.sparkEmitter.setDepth(60);
  }

  footstepDust(x, y) {
    this.dustEmitter.emitParticleAt(x, y, 2);
  }

  landDust(x, y) {
    this.dustEmitter.emitParticleAt(x, y, 8);
  }

  hitSpark(x, y) {
    this.sparkEmitter.emitParticleAt(x, y, 10);
  }

  deathBurst(x, y) {
    this.sparkEmitter.emitParticleAt(x, y, 18);
    this.dustEmitter.emitParticleAt(x, y, 10);
  }

  collectSparkle(x, y) {
    this.sparkEmitter.emitParticleAt(x, y, 6);
  }
}
