/**
 * All sound in this game is synthesized at runtime with the Web Audio API.
 * This keeps the project 100% free (no licensed SFX/music packs) while still
 * giving every action audible feedback. Howler is used only as a lightweight
 * wrapper for master volume control.
 */

class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicNodes = [];
    this.muted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.25;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.masterGain);

    this.initialized = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMasterVolume(v) {
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setMuted(m) {
    this.muted = m;
    if (this.masterGain) this.masterGain.gain.value = m ? 0 : 0.7;
  }

  // --- Simple synthesized SFX -------------------------------------------------
  _tone({ freq = 440, duration = 0.15, type = 'sine', gain = 0.5, slideTo = null, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + duration);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  _noise({ duration = 0.2, gain = 0.3, delay = 0, filterFreq = 2000 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    noise.start(t0);
    noise.stop(t0 + duration);
  }

  jump() { this._tone({ freq: 300, slideTo: 620, duration: 0.18, type: 'square', gain: 0.3 }); }
  doubleJump() { this._tone({ freq: 420, slideTo: 800, duration: 0.16, type: 'square', gain: 0.28 }); }
  land() { this._noise({ duration: 0.08, gain: 0.2, filterFreq: 600 }); }
  dash() { this._tone({ freq: 700, slideTo: 200, duration: 0.15, type: 'sawtooth', gain: 0.25 }); }
  swordSwing() { this._noise({ duration: 0.12, gain: 0.22, filterFreq: 3500 }); }
  swordHit() {
    this._tone({ freq: 180, duration: 0.12, type: 'square', gain: 0.35 });
    this._noise({ duration: 0.1, gain: 0.25, filterFreq: 1800 });
  }
  shieldBlock() { this._tone({ freq: 500, duration: 0.1, type: 'triangle', gain: 0.3 }); }
  coin() { this._tone({ freq: 880, slideTo: 1760, duration: 0.12, type: 'sine', gain: 0.3 }); }
  gem() {
    this._tone({ freq: 1046, duration: 0.1, type: 'sine', gain: 0.28 });
    this._tone({ freq: 1568, duration: 0.14, type: 'sine', gain: 0.22, delay: 0.06 });
  }
  heart() { this._tone({ freq: 660, slideTo: 990, duration: 0.2, type: 'sine', gain: 0.3 }); }
  hurt() { this._tone({ freq: 220, slideTo: 90, duration: 0.25, type: 'sawtooth', gain: 0.35 }); }
  enemyDeath() { this._noise({ duration: 0.3, gain: 0.3, filterFreq: 900 }); }
  explosion() {
    this._noise({ duration: 0.4, gain: 0.4, filterFreq: 500 });
    this._tone({ freq: 100, slideTo: 40, duration: 0.35, type: 'sawtooth', gain: 0.3 });
  }
  arrow() { this._tone({ freq: 900, slideTo: 400, duration: 0.1, type: 'sine', gain: 0.15 }); }
  victory() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone({ freq: f, duration: 0.25, type: 'sine', gain: 0.3, delay: i * 0.15 }));
  }
  uiClick() { this._tone({ freq: 500, duration: 0.06, type: 'square', gain: 0.2 }); }
  checkpoint() { this._tone({ freq: 700, slideTo: 1200, duration: 0.3, type: 'triangle', gain: 0.25 }); }

  // --- Ambient background music (looping generative arpeggio) ----------------
  startMusic(mood = 'forest') {
    this.stopMusic();
    if (!this.ctx) return;
    const scales = {
      forest: [261.6, 329.6, 392.0, 440.0, 523.2],
      boss: [196.0, 233.1, 261.6, 293.7, 349.2]
    };
    const scale = scales[mood] || scales.forest;
    const tempo = mood === 'boss' ? 0.22 : 0.4;
    let step = 0;

    const playStep = () => {
      if (!this.ctx) return;
      const freq = scale[step % scale.length] * (step % 8 < 4 ? 1 : 0.5);
      this._musicNote(freq, tempo * 0.9, mood === 'boss' ? 'sawtooth' : 'triangle');
      step++;
    };

    playStep();
    this._musicInterval = setInterval(playStep, tempo * 1000);
  }

  _musicNote(freq, duration, type) {
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  stopMusic() {
    if (this._musicInterval) {
      clearInterval(this._musicInterval);
      this._musicInterval = null;
    }
  }
}

export const AudioManager = new AudioManagerClass();
