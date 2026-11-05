// Kodla üretilen ses efektleri (ek dosya yok).
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.nbuf = null;
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const n = this.ctx.sampleRate;
      this.nbuf = this.ctx.createBuffer(1, n, n);
      const d = this.nbuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }
  tone(f0, f1, dur, type = 'square', vol = 0.14, delay = 0) {
    const c = this.ctx;
    if (!c || this.muted) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  noise(dur, vol, f0, f1, type = 'bandpass', delay = 0) {
    const c = this.ctx;
    if (!c || this.muted || !this.nbuf) return;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.nbuf;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f0, t);
    fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    fl.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl);
    fl.connect(g);
    g.connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }
  play(n) {
    if (!this.ctx) return;
    switch (n) {
      case 'swing':
        this.noise(0.14, 0.16, 600, 2600);
        break;
      case 'hit':
        this.tone(190, 60, 0.12, 'square', 0.2);
        this.noise(0.1, 0.22, 1800, 500, 'lowpass');
        break;
      case 'hitBig':
        this.tone(130, 40, 0.28, 'sawtooth', 0.26);
        this.noise(0.25, 0.3, 2400, 200, 'lowpass');
        break;
      case 'block':
        this.tone(900, 700, 0.08, 'triangle', 0.16);
        this.tone(1400, 1100, 0.06, 'square', 0.08);
        this.noise(0.06, 0.12, 4000, 2000, 'highpass');
        break;
      case 'guard':
        this.tone(300, 80, 0.4, 'sawtooth', 0.22);
        this.noise(0.3, 0.25, 3000, 300, 'bandpass');
        break;
      case 'ko':
        this.tone(220, 40, 0.7, 'sawtooth', 0.28);
        this.noise(0.5, 0.35, 1200, 80, 'lowpass');
        break;
      case 'charge':
        this.tone(120, 880, 0.75, 'sawtooth', 0.12);
        this.tone(180, 1320, 0.75, 'triangle', 0.1);
        break;
      case 'fin':
        this.tone(90, 30, 0.6, 'sawtooth', 0.3);
        this.noise(0.5, 0.3, 4000, 120, 'bandpass');
        break;
      case 'arrow':
        this.noise(0.12, 0.12, 1500, 4000, 'highpass');
        this.tone(500, 900, 0.08, 'triangle', 0.08);
        break;
      case 'wave':
        this.tone(110, 70, 0.3, 'sawtooth', 0.2);
        this.noise(0.3, 0.2, 400, 100, 'lowpass');
        break;
      case 'heal':
        this.tone(520, 780, 0.12, 'sine', 0.12);
        this.tone(780, 1040, 0.12, 'sine', 0.12, 0.1);
        break;
      case 'jump':
        this.tone(260, 520, 0.1, 'sine', 0.1);
        break;
      case 'land':
        this.noise(0.06, 0.1, 500, 150, 'lowpass');
        break;
      case 'tick':
        this.tone(660, 660, 0.06, 'square', 0.1);
        break;
      case 'go':
        this.tone(440, 880, 0.18, 'square', 0.14);
        this.tone(880, 1320, 0.22, 'square', 0.12, 0.12);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.18, 'square', 0.12, i * 0.12));
        break;
      case 'ui':
        this.tone(700, 900, 0.06, 'triangle', 0.1);
        break;
      default:
        break;
    }
  }
}
