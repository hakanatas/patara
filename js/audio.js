/** Gentle synthesized sound effects (no audio files). */
export class SoundKit {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = false;
    this._noise = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.32 : 0;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this._noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this._noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.32 : 0, t, 0.05);
  }

  _tone({ type = 'sine', from = 440, to = from, dur = 0.2, gain = 0.4, delay = 0, curve = 'exp', attack = 0.005 }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(to, t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noiseBurst({ dur = 0.15, gain = 0.3, freq = 1800, q = 0.8, type = 'bandpass', delay = 0, sweepTo = null }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this._noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
  }

  play(name, opts = {}) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const v = opts.volume ?? 1;
    switch (name) {
      case 'click':
        this._tone({ from: 900, to: 700, dur: 0.04, gain: 0.08 * v });
        break;
      case 'touch': // key press: soft plink
        this._tone({ from: 660, to: 720, dur: 0.08, gain: 0.22 * v });
        this._tone({ from: 990, to: 1080, dur: 0.12, gain: 0.16 * v, delay: 0.06 });
        break;
      case 'pulse': // current travelling along the wire
        this._noiseBurst({ dur: 0.3, gain: 0.05 * v, freq: 800, sweepTo: 3200, q: 1.4 });
        break;
      case 'buzz': // open circuit
        this._tone({ type: 'square', from: 140, to: 120, dur: 0.22, gain: 0.07 * v, curve: 'lin' });
        break;
      case 'clip': // alligator clip snaps on
        this._noiseBurst({ dur: 0.05, gain: 0.14 * v, freq: 2600, q: 1 });
        this._tone({ from: 420, to: 260, dur: 0.06, gain: 0.1 * v, delay: 0.02 });
        break;
      case 'plug':
        this._noiseBurst({ dur: 0.08, gain: 0.12 * v, freq: 1200, q: 0.7, type: 'lowpass' });
        this._tone({ from: 220, to: 180, dur: 0.1, gain: 0.14 * v });
        break;
      case 'boot': // gentle chord arpeggio
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone({ type: 'triangle', from: f, dur: 0.35, gain: 0.12 * v, delay: i * 0.07, attack: 0.02 }));
        break;
      case 'star':
        [880, 1174.66, 1567.98].forEach((f, i) => this._tone({ type: 'triangle', from: f, dur: 0.22, gain: 0.12 * v, delay: i * 0.06 }));
        break;
      case 'note':
        this._tone({ type: 'triangle', from: opts.freq || 440, dur: 0.55, gain: 0.2 * v, attack: 0.01 });
        break;
      case 'hop':
        this._tone({ from: 500, to: 760, dur: 0.07, gain: 0.05 * v });
        break;
      default:
        break;
    }
  }
}
