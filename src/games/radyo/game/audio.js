// Dedemin Radyosu — tamamen Web Audio ile üretilen sesler (dosya yok).
export class RadyoAudio {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.tuneStatic = 0; // 0..1 cızırtı
    this.tuneWhistle = 0; // 0..1 ıslık
    this.whistleF = 900;
    this.radioOn = false;
    this.hissOn = false;
  }

  init() {
    if (this.ctx) return this.ctx.state === 'suspended' && this.ctx.resume();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(c.destination);
    this.sfx = c.createGain();
    this.sfx.connect(this.master);

    const noiseBuf = this.noise(3);
    const loop = (buf) => {
      const s = c.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start();
      return s;
    };
    // rüzgâr (çatı) — alçak geçiren gürültü, yavaş dalgalanan
    {
      const s = loop(noiseBuf);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 380;
      const g = (this.windG = c.createGain());
      g.gain.value = 0.05;
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.09;
      const lg = c.createGain();
      lg.gain.value = 0.03;
      lfo.connect(lg).connect(g.gain);
      lfo.start();
      s.connect(f).connect(g).connect(this.master);
    }
    // radyo cızırtısı
    {
      const s = loop(noiseBuf);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2400;
      f.Q.value = 0.6;
      this.staticG = c.createGain();
      this.staticG.gain.value = 0;
      s.connect(f).connect(this.staticG).connect(this.master);
      // konuşma altı fısıltı (radioHiss)
      const s2 = loop(noiseBuf);
      const f2 = c.createBiquadFilter();
      f2.type = 'highpass';
      f2.frequency.value = 3000;
      this.hissG = c.createGain();
      this.hissG.gain.value = 0;
      s2.connect(f2).connect(this.hissG).connect(this.master);
    }
    // ıslık (heterodin)
    {
      const o = (this.whOsc = c.createOscillator());
      o.type = 'sine';
      o.frequency.value = 900;
      this.whG = c.createGain();
      this.whG.gain.value = 0;
      o.connect(this.whG).connect(this.master);
      o.start();
    }
    // lamba uğultusu (50 Hz)
    {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 50;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 160;
      this.humG = c.createGain();
      this.humG.gain.value = 0;
      o.connect(f).connect(this.humG).connect(this.master);
      o.start();
    }
    this.nextCreak = 3;
  }

  noise(sec) {
    const c = this.ctx;
    const b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
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

  // VoiceSystem arabirimi
  radioHiss(on) {
    this.hissOn = on;
  }
  squelch(end) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, 0.12, end ? 0.05 : 0.035, end ? 1800 : 2600, 0.8);
  }

  setRadio(on) {
    this.radioOn = on;
  }
  setTuning(staticAmt, whistleAmt, whistleF) {
    this.tuneStatic = staticAmt;
    this.tuneWhistle = whistleAmt;
    this.whistleF = whistleF;
  }

  env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  tone(type, f, t, dur, vol, f2 = null) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    this.env(g, t, 0.01, vol, dur);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  burst(t, dur, vol, freq, q = 1, type = 'bandpass') {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this._nb || (this._nb = this.noise(1));
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    this.env(g, t, 0.005, vol, dur);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  click() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, 0.03, 0.08, 3000, 2);
    this.tone('square', 1400, t, 0.02, 0.02);
  }
  knob() {
    if (!this.ctx) return;
    this.burst(this.ctx.currentTime, 0.015, 0.03, 5000, 3);
  }
  paper() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) this.burst(t + i * 0.05, 0.06, 0.05, 4000 + Math.random() * 2000, 0.7, 'highpass');
  }
  creakWood(vol = 0.05) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    const base = 90 + Math.random() * 60;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.3, t + 0.5);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 600;
    f.Q.value = 6;
    const g = this.ctx.createGain();
    this.env(g, t, 0.15, vol, 0.5);
    o.connect(f).connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.8);
  }
  lid() {
    if (!this.ctx) return;
    this.creakWood(0.09);
    this.burst(this.ctx.currentTime + 0.55, 0.15, 0.12, 200, 1, 'lowpass');
  }
  connect() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone('sine', 660, t, 0.25, 0.05);
    this.tone('sine', 990, t + 0.12, 0.35, 0.04);
  }
  whoosh() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise(2);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(3000, t + 1.0);
    f.frequency.exponentialRampToValueAtTime(300, t + 1.8);
    const g = c.createGain();
    this.env(g, t, 0.6, 0.18, 1.2);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t);
    // parlayan çan sesleri
    [523, 659, 784, 1046].forEach((fq, i) => this.tone('sine', fq, t + 0.6 + i * 0.12, 1.2, 0.03));
  }
  sad() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [440, 415, 349, 330].forEach((f, i) => this.tone('triangle', f, t + i * 0.35, 0.6, 0.04));
  }
  // eski radyodan uzak bir melodi (bağlantı kurulunca kısaca)
  tune() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [392, 440, 466, 440, 392, 349, 392, 0, 349, 392, 440, 392, 349, 330, 349];
    notes.forEach((f, i) => {
      if (!f) return;
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value = 1200;
      flt.Q.value = 0.8;
      const g = this.ctx.createGain();
      this.env(g, t + i * 0.22, 0.01, 0.035, 0.35);
      o.connect(flt).connect(g).connect(this.sfx);
      o.start(t + i * 0.22);
      o.stop(t + i * 0.22 + 0.45);
    });
  }

  update(dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const on = this.radioOn;
    this.staticG.gain.setTargetAtTime(on ? 0.02 + this.tuneStatic * 0.14 : 0, t, 0.06);
    this.whG.gain.setTargetAtTime(on ? this.tuneWhistle * 0.02 : 0, t, 0.06);
    this.whOsc.frequency.setTargetAtTime(this.whistleF, t, 0.03);
    this.hissG.gain.setTargetAtTime(this.hissOn ? 0.012 : 0, t, 0.1);
    this.humG.gain.setTargetAtTime(on ? 0.025 : 0, t, 0.2);
    this.nextCreak -= dt;
    if (this.nextCreak < 0) {
      this.nextCreak = 7 + Math.random() * 12;
      this.creakWood(0.025 + Math.random() * 0.03);
    }
  }
}
