// Hamal — bütün sesler WebAudio ile kodla üretilir.
export class HamalAudio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.volume = 0.8;
  }
  init() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.amb = ctx.createGain();
    this.amb.gain.value = 0.5;
    this.amb.connect(this.master);
    this.white = this.noise(3, 'white');
    this.brown = this.noise(5, 'brown');
    this.ready = true;
    this.startAmbience();
  }
  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }
  suspend() {
    this.ctx && this.ctx.suspend();
  }
  resume() {
    this.ctx && this.ctx.resume();
  }
  noise(sec, kind) {
    const ctx = this.ctx, n = ctx.sampleRate * sec;
    const b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    return b;
  }
  src(buf, loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = loop;
    return s;
  }
  env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  startAmbience() {
    const ctx = this.ctx;
    // şehir uğultusu + deniz
    const s = this.src(this.brown, true);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    s.connect(f).connect(g).connect(this.amb);
    s.start();
    this.seaGain = g;
    // rüzgâr kanalı (çeyiz işinde güçlenir)
    const w = this.src(this.white, true);
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 500;
    wf.Q.value = 0.7;
    const wg = ctx.createGain();
    wg.gain.value = 0;
    w.connect(wf).connect(wg).connect(this.amb);
    w.start();
    this.windGain = wg;
    this.windF = wf;
    // halat gıcırtısı (gerginliğe bağlı)
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 90;
    const of = ctx.createBiquadFilter();
    of.type = 'bandpass';
    of.frequency.value = 700;
    of.Q.value = 8;
    const og = ctx.createGain();
    og.gain.value = 0;
    o.connect(of).connect(og).connect(this.sfx);
    o.start();
    this.creakO = o;
    this.creakG = og;
    this.nextGull = 2;
    this.nextHorn = 25;
    this.t = 0;
  }
  // her kare: martı, vapur düdüğü, rüzgâr ve halat
  update(dt, { nearSea, wind, strain }) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.t += dt;
    this.seaGain.gain.setTargetAtTime(0.08 + nearSea * 0.16, t, 0.5);
    this.windGain.gain.setTargetAtTime(Math.min(0.5, wind * 0.6), t, 0.2);
    this.windF.frequency.setTargetAtTime(400 + wind * 600, t, 0.2);
    const cr = Math.max(0, strain - 0.04) * 3;
    this.creakG.gain.setTargetAtTime(Math.min(0.06, cr * 0.25) * (0.6 + Math.random() * 0.4), t, 0.05);
    this.creakO.frequency.setTargetAtTime(70 + strain * 300 + Math.random() * 20, t, 0.05);
    this.nextGull -= dt;
    if (this.nextGull < 0) {
      this.nextGull = (nearSea > 0.3 ? 3 : 9) + Math.random() * 6;
      this.gull(0.05 + nearSea * 0.1);
    }
    this.nextHorn -= dt;
    if (this.nextHorn < 0) {
      this.nextHorn = 50 + Math.random() * 40;
      this.shipHorn(0.12 + nearSea * 0.15);
    }
  }
  gull(vol) {
    const ctx = this.ctx, t = ctx.currentTime;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      const t0 = t + k * 0.22;
      o.frequency.setValueAtTime(1500, t0);
      o.frequency.exponentialRampToValueAtTime(900, t0 + 0.18);
      const g = ctx.createGain();
      this.env(g, t0, 0.02, vol, 0.2);
      o.connect(g).connect(this.amb);
      o.start(t0);
      o.stop(t0 + 0.22);
    }
  }
  shipHorn(vol) {
    const ctx = this.ctx, t = ctx.currentTime;
    for (const f of [110, 165, 220]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol / 3, t + 0.3);
      g.gain.setValueAtTime(vol / 3, t + 2.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      o.connect(lp).connect(g).connect(this.amb);
      o.start(t);
      o.stop(t + 3.3);
    }
  }
  step(stairs, heavy) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = this.src(this.white);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = stairs ? 520 : 900 + Math.random() * 300;
    f.Q.value = 1;
    const g = ctx.createGain();
    this.env(g, t, 0.005, (stairs ? 0.16 : 0.09) * (heavy ? 1.3 : 1), 0.12);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t, Math.random());
    s.stop(t + 0.15);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(heavy ? 70 : 100, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    const og = ctx.createGain();
    this.env(og, t, 0.004, heavy ? 0.18 : 0.08, 0.12);
    o.connect(og).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.14);
  }
  grunt() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, t);
    o.frequency.linearRampToValueAtTime(110, t + 0.25);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 600;
    f.Q.value = 2;
    const g = ctx.createGain();
    this.env(g, t, 0.03, 0.12, 0.3);
    o.connect(f).connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.32);
  }
  thud(vol = 0.4, wood = true) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(wood ? 160 : 90, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.2);
    const g = ctx.createGain();
    this.env(g, t, 0.004, vol, 0.28);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.3);
    const s = this.src(this.white);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    const sg = ctx.createGain();
    this.env(sg, t, 0.003, vol * 0.6, 0.18);
    s.connect(f).connect(sg).connect(this.sfx);
    s.start(t, Math.random());
    s.stop(t + 0.2);
  }
  crash(kind) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    this.thud(0.5, kind !== 'piano');
    // cam/porselen şıngırtısı
    for (let i = 0; i < 14; i++) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const t0 = t + Math.random() * 0.4;
      o.frequency.value = 2500 + Math.random() * 4000;
      const g = ctx.createGain();
      this.env(g, t0, 0.002, 0.05, 0.08 + Math.random() * 0.15);
      o.connect(g).connect(this.sfx);
      o.start(t0);
      o.stop(t0 + 0.3);
    }
    if (kind === 'piano') {
      for (const f of [65, 98, 131, 165, 196]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.04);
        const g = ctx.createGain();
        this.env(g, t, 0.01, 0.07, 2.5);
        o.connect(g).connect(this.sfx);
        o.start(t);
        o.stop(t + 2.6);
      }
    }
  }
  snap() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = this.src(this.white);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    const g = ctx.createGain();
    this.env(g, t, 0.002, 0.3, 0.09);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t);
    s.stop(t + 0.1);
  }
  coins() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const o = ctx.createOscillator();
      o.type = 'square';
      const t0 = t + i * 0.07;
      o.frequency.value = 1800 + i * 140;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 3000;
      const g = ctx.createGain();
      this.env(g, t0, 0.002, 0.06, 0.15);
      o.connect(f).connect(g).connect(this.sfx);
      o.start(t0);
      o.stop(t0 + 0.2);
    }
  }
  horn() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const f of [392, 494]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
      g.gain.setValueAtTime(0.08, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(lp).connect(g).connect(this.sfx);
      o.start(t);
      o.stop(t + 0.62);
    }
  }
  chirp() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const o = ctx.createOscillator();
      const t0 = t + i * 0.09;
      o.frequency.setValueAtTime(3200 + Math.random() * 800, t0);
      o.frequency.exponentialRampToValueAtTime(4200, t0 + 0.06);
      const g = ctx.createGain();
      this.env(g, t0, 0.005, 0.035, 0.07);
      o.connect(g).connect(this.sfx);
      o.start(t0);
      o.stop(t0 + 0.08);
    }
  }
  meow() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(500, t);
    o.frequency.linearRampToValueAtTime(800, t + 0.15);
    o.frequency.linearRampToValueAtTime(450, t + 0.5);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200;
    f.Q.value = 3;
    const g = ctx.createGain();
    this.env(g, t, 0.04, 0.06, 0.55);
    o.connect(f).connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.6);
  }
  engine(on, x = 0) {
    if (!this.ready) return;
    const ctx = this.ctx;
    if (!this.engO) {
      this.engO = ctx.createOscillator();
      this.engO.type = 'sawtooth';
      this.engO.frequency.value = 48;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 300;
      this.engG = ctx.createGain();
      this.engG.gain.value = 0;
      this.engO.connect(f).connect(this.engG).connect(this.sfx);
      this.engO.start();
    }
    this.engG.gain.setTargetAtTime(on, ctx.currentTime, 0.2);
    this.engO.frequency.setTargetAtTime(45 + x * 20, ctx.currentTime, 0.2);
  }
}
