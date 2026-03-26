export class SoundManager {
  constructor() {
    this._ctx = null;
    this.enabled = true;
  }

  _getCtx() {
    if (!this._ctx) {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this.enabled = false;
      }
    }
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  _beep(freq, duration, type = 'square', volume = 0.3, delay = 0) {
    if (!this.enabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.01);
  }

  _sweep(freqStart, freqEnd, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.01);
  }

  eatDot() {
    this._beep(440, 0.06, 'square', 0.15);
  }

  eatPellet() {
    this._sweep(300, 600, 0.2, 'sine', 0.3);
  }

  eatGhost() {
    this._beep(800, 0.05, 'square', 0.4);
    this._beep(1000, 0.05, 'square', 0.4, 0.06);
    this._beep(1200, 0.08, 'square', 0.4, 0.12);
  }

  death() {
    this._sweep(500, 100, 0.6, 'sawtooth', 0.4);
  }

  levelWin() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this._beep(f, 0.15, 'sine', 0.3, i * 0.15));
  }

  gameOver() {
    const notes = [300, 250, 200, 150];
    notes.forEach((f, i) => this._beep(f, 0.2, 'sawtooth', 0.3, i * 0.2));
  }

  resume() {
    const ctx = this._getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
}
