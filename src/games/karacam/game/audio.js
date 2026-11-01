// Karaçam Dosyaları: kodla üretilen sesler (saat tıkırtısı, rüzgâr, bulma, hata, damga).
export class CinAudio {
  constructor() {
    this.ctx = null;
    this.vol = 0.85;
  }
  init() {
    if (this.ctx) {
      this.ctx.resume && this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.vol;
    this.master.connect(c.destination);
    // beyaz gürültü tamponu
    const len = c.sampleRate * 2;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setVolume(v) {
    this.vol = v;
    if (this.master) this.master.gain.value = v;
  }
  // gece rüzgârı: alçak geçiren süzgeçli gürültü, yavaşça dalgalanır
  wind(on) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (on && !this.windSrc) {
      const s = c.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 380;
      const g = c.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(0.06, c.currentTime, 1.5);
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.07;
      const lg = c.createGain();
      lg.gain.value = 160;
      lfo.connect(lg).connect(f.frequency);
      lfo.start();
      s.connect(f).connect(g).connect(this.master);
      s.start();
      this.windSrc = { s, g, lfo };
    } else if (!on && this.windSrc) {
      const w = this.windSrc;
      w.g.gain.setTargetAtTime(0, c.currentTime, 0.6);
      setTimeout(() => {
        try {
          w.s.stop();
          w.lfo.stop();
        } catch (e) {}
      }, 2500);
      this.windSrc = null;
    }
  }
  // ayaklı saatin tıkırtısı (tik-tak)
  ticking(on) {
    if (!this.ctx) return;
    clearInterval(this.tickT);
    this.tickT = null;
    if (!on) return;
    let k = 0;
    this.tickT = setInterval(() => this.tick(k++ % 2 ? 2100 : 2600), 1000);
  }
  tick(freq = 2400, gain = 0.05) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 8;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random());
    s.stop(t + 0.06);
  }
  tone(type, f0, f1, dur, gain, delay = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  found() {
    this.tone('sine', 660, 0, 0.18, 0.08);
    this.tone('sine', 990, 0, 0.3, 0.06, 0.08);
  }
  evidence() {
    this.tone('triangle', 330, 0, 0.5, 0.08);
    this.tone('sine', 495, 0, 0.6, 0.06, 0.1);
    this.tone('sine', 742, 0, 0.8, 0.05, 0.2);
  }
  miss() {
    this.tone('square', 140, 90, 0.18, 0.05);
  }
  page() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 2500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + 0.3);
  }
  stamp() {
    this.tone('sine', 110, 40, 0.25, 0.25);
    this.page();
  }
  // saatlerin durduğu an: son tık, sonra derin bir uğultu
  stopClocks() {
    this.ticking(false);
    this.tick(1800, 0.09);
    this.tone('sine', 55, 48, 3.5, 0.12, 0.4);
    this.tone('sine', 82, 70, 3.0, 0.05, 0.6);
  }
}
