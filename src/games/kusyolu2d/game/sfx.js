// Kuşyolu 2D — kodla üretilen sesler (WebAudio; dış ses dosyası yok)
export class Sfx {
  constructor() {
    this.ctx = null;
    this.loops = {};
    this.vol = 0.8;
    this.muted = false;
  }
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.vol;
    this.master.connect(this.ctx.destination);
    const n = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    for (const k of Object.keys(this.pending || {})) this.loop(k, this.pending[k]);
    this.pending = null;
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.vol;
  }
  noise(dur, f0, f1, g0, type = 'lowpass', q = 1) {
    if (!this.ctx) return;
    const c = this.ctx,
      t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(g0, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.05);
  }
  tone(freq, dur, g0 = 0.2, type = 'sine', f1) {
    if (!this.ctx) return;
    const c = this.ctx,
      t = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(g0, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  boom() {
    this.noise(3.2, 900, 40, 0.9);
    this.tone(55, 2.4, 0.6, 'sine', 28);
  }
  whoosh() {
    this.noise(2.6, 300, 3000, 0.25, 'bandpass', 2);
  }
  ping() {
    this.tone(880, 0.35, 0.12, 'triangle', 1320);
  }
  thud() {
    this.noise(0.25, 400, 80, 0.3);
  }
  bark() {
    this.tone(320, 0.12, 0.18, 'sawtooth', 180);
    setTimeout(() => this.tone(300, 0.14, 0.16, 'sawtooth', 170), 220);
  }
  door() {
    this.noise(0.5, 1200, 300, 0.12, 'bandpass', 3);
  }
  // sürekli sesler
  loop(name, vol = 0.2) {
    if (!this.ctx) {
      (this.pending ||= {})[name] = vol;
      return;
    }
    if (this.loops[name]) {
      this.loops[name].g.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.4);
      return;
    }
    const c = this.ctx;
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(vol, c.currentTime, 0.6);
    g.connect(this.master);
    const nodes = [];
    if (name === 'wind' || name === 'city') {
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = name === 'wind' ? 420 : 260;
      s.connect(f).connect(g);
      s.start();
      nodes.push(s);
    } else if (name === 'crickets') {
      const o = c.createOscillator();
      o.frequency.value = 4400;
      const am = c.createOscillator();
      am.type = 'square';
      am.frequency.value = 18;
      const amg = c.createGain();
      amg.gain.value = 0.5;
      const og = c.createGain();
      og.gain.value = 0.5;
      am.connect(amg).connect(og.gain);
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.7;
      const lg = c.createGain();
      lg.gain.value = 0.5;
      lfo.connect(lg).connect(og.gain);
      o.connect(og).connect(g);
      o.start();
      am.start();
      lfo.start();
      nodes.push(o, am, lfo);
    } else if (name === 'hum') {
      for (const f of [62, 93, 124]) {
        const o = c.createOscillator();
        o.frequency.value = f;
        const og = c.createGain();
        og.gain.value = f === 62 ? 0.6 : 0.2;
        o.connect(og).connect(g);
        o.start();
        nodes.push(o);
      }
    } else if (name === 'siren') {
      const o = c.createOscillator();
      o.type = 'triangle';
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.45;
      const lg = c.createGain();
      lg.gain.value = 180;
      o.frequency.value = 760;
      lfo.connect(lg).connect(o.frequency);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      o.connect(f).connect(g);
      o.start();
      lfo.start();
      nodes.push(o, lfo);
    }
    this.loops[name] = { g, nodes };
  }
  stop(name) {
    const l = this.loops[name];
    if (!l || !this.ctx) return;
    l.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    setTimeout(() => l.nodes.forEach((n) => n.stop && n.stop()), 1500);
    delete this.loops[name];
  }
  stopLoops() {
    for (const k of Object.keys(this.loops)) this.stop(k);
    this.pending = null;
  }
  dispose() {
    this.stopLoops();
    if (this.ctx) setTimeout(() => this.ctx.close(), 1600);
  }
}
