// Kuşyolu sesleri: tamamı Web Audio ile üretilir (dosya yok). Ortam, adımlar, göktaşı patlaması, alarmlar.
export class KusAudio {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.voiceLevel = 0; // dudak hareketi için seslendirme genliği
    this._srcs = new WeakMap();
  }
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(c.destination);
    this.sfx = c.createGain();
    this.sfx.connect(this.master);
    this.amb = c.createGain();
    this.amb.gain.value = 0.9;
    this.amb.connect(this.master);
    // yankı (patlama ve uzak sesler için)
    this.verb = c.createConvolver();
    this.verb.buffer = this.impulse(3.2, 2.6);
    const vg = c.createGain();
    vg.gain.value = 0.5;
    this.verb.connect(vg).connect(this.master);
    this.nb = this.noise(4);
    // şehir uğultusu: alçak geçiren gürültü + yavaş dalgalanma
    const hum = this.loop(this.nb);
    const hf = c.createBiquadFilter();
    hf.type = 'lowpass';
    hf.frequency.value = 220;
    this.humG = c.createGain();
    this.humG.gain.value = 0.06;
    hum.connect(hf).connect(this.humG).connect(this.amb);
    // hafif rüzgâr
    const wind = this.loop(this.nb, 1.3);
    const wf = c.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 600;
    wf.Q.value = 0.4;
    this.windG = c.createGain();
    this.windG.gain.value = 0.015;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = c.createGain();
    lg.gain.value = 0.012;
    lfo.connect(lg).connect(this.windG.gain);
    lfo.start();
    wind.connect(wf).connect(this.windG).connect(this.amb);
    this.nextCricket = 0.5;
    this.nextFar = 4;
    this.crickets = true;
    // seslendirme analizörü
    this.an = c.createAnalyser();
    this.an.fftSize = 512;
    this.anBuf = new Float32Array(this.an.fftSize);
  }
  noise(sec) {
    const c = this.ctx;
    const b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  impulse(sec, decay) {
    const c = this.ctx;
    const b = c.createBuffer(2, Math.floor(c.sampleRate * sec), c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay);
    }
    return b;
  }
  loop(buf, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(0, Math.random() * buf.duration);
    return s;
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
  // VoiceSystem arabirimi (telsiz yok)
  radioHiss() {}
  squelch() {}

  // seslendirme <audio> öğesini analizöre bağla (dudak hareketi)
  attachVoice(el) {
    if (!this.ctx || !el || this._srcs.has(el)) return;
    try {
      const s = this.ctx.createMediaElementSource(el);
      s.connect(this.an);
      s.connect(this.master);
      this._srcs.set(el, s);
    } catch (e) {
      this._srcs.set(el, null);
    }
  }
  readVoice() {
    if (!this.an) return 0;
    this.an.getFloatTimeDomainData(this.anBuf);
    let s = 0;
    for (let i = 0; i < this.anBuf.length; i++) s += this.anBuf[i] * this.anBuf[i];
    return Math.sqrt(s / this.anBuf.length);
  }

  env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  burst(t, dur, vol, freq, q = 1, type = 'bandpass', dest = this.sfx, a = 0.004) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.nb;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    this.env(g, t, a, vol, dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 3);
    s.stop(t + a + dur + 0.1);
    return g;
  }
  tone(type, f, t, dur, vol, f2 = null, dest = this.sfx) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    this.env(g, t, 0.01, vol, dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  step(surface = 'concrete', run = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = run ? 0.09 : 0.055;
    if (surface === 'dirt') {
      this.burst(t, 0.09, v, 500 + Math.random() * 300, 0.8, 'lowpass');
      this.burst(t + 0.02, 0.05, v * 0.5, 2400, 1.5);
    } else {
      this.burst(t, 0.05, v, 1200 + Math.random() * 500, 1.2);
      this.burst(t, 0.03, v * 0.6, 180, 1, 'lowpass');
    }
  }
  ui() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone('sine', 880, t, 0.08, 0.04);
  }
  cup() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone('sine', 2400, t, 0.25, 0.03);
    this.tone('sine', 3150, t + 0.01, 0.2, 0.02);
  }
  // göktaşının gökyüzündeki tıslaması (ışıkla eş zamanlı, çok hafif)
  hiss(dur = 5) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.burst(t, dur, 0.035, 3500, 0.3, 'highpass', this.sfx, dur * 0.6);
    return g;
  }
  // ses dalgası: önce derin gümbürtü, sonra çatırtı, yankı
  boom() {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(55, t);
    o.frequency.exponentialRampToValueAtTime(22, t + 2.5);
    const og = c.createGain();
    this.env(og, t, 0.02, 0.9, 2.8);
    o.connect(og).connect(this.sfx);
    o.start(t);
    o.stop(t + 3);
    this.burst(t, 3.5, 0.8, 120, 0.7, 'lowpass', this.sfx, 0.01);
    this.burst(t, 2.5, 0.5, 120, 0.7, 'lowpass', this.verb, 0.01);
    this.burst(t + 0.05, 0.6, 0.35, 900, 0.6, 'bandpass', this.sfx, 0.005);
    // çatırtılar
    for (let i = 0; i < 14; i++) this.burst(t + 0.1 + Math.random() * 1.4, 0.08, 0.12 + Math.random() * 0.1, 300 + Math.random() * 1200, 1.5, 'bandpass', this.verb);
    // cam titremesi
    for (let i = 0; i < 40; i++) this.burst(t + 0.15 + i * 0.03 + Math.random() * 0.02, 0.02, 0.025 * (1 - i / 40), 4000 + Math.random() * 3000, 6, 'bandpass', this.sfx);
  }
  // araba alarmları (farklı desenler, uzaktan)
  carAlarm(delay = 0, kind = 0, dur = 12, vol = 0.03) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = 'square';
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1600;
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + dur - 0.5);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) pan.pan.value = (Math.random() * 2 - 1) * 0.8;
    o.connect(f).connect(g);
    (pan ? g.connect(pan) : g).connect(this.verb);
    (pan || g).connect(this.sfx);
    const step = kind === 0 ? 0.18 : kind === 1 ? 0.5 : 0.08;
    for (let x = 0, i = 0; x < dur; x += step, i++) {
      const fr = kind === 0 ? (i % 2 ? 1300 : 900) : kind === 1 ? 700 + (i % 4) * 220 : 1000 + Math.sin(i * 0.5) * 500;
      o.frequency.setValueAtTime(fr, t + x);
    }
    o.start(t);
    o.stop(t + dur + 0.1);
  }
  dog(delay = 0, vol = 0.05) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      const tt = t + i * (0.35 + Math.random() * 0.2);
      this.tone('sawtooth', 420 + Math.random() * 80, tt, 0.12, vol * 0.6, 260, this.verb);
      this.burst(tt, 0.1, vol, 700, 2, 'bandpass', this.verb);
    }
  }
  siren(delay = 0, dur = 20, vol = 0.03) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0, t + dur);
    for (let x = 0; x < dur; x += 1.6) {
      o.frequency.setValueAtTime(650, t + x);
      o.frequency.linearRampToValueAtTime(1350, t + x + 0.8);
      o.frequency.linearRampToValueAtTime(650, t + x + 1.6);
    }
    o.connect(f).connect(g).connect(this.verb);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
  korPulse(strength = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone('sine', 62, t, 0.9, 0.18 * strength, 48);
    this.tone('sine', 124, t, 0.6, 0.05 * strength, 96);
  }
  whoosh() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, 1.2, 0.08, 400, 0.6, 'bandpass', this.sfx, 0.4);
  }
  runStairs(dur = 3) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let x = 0; x < dur; x += 0.16 + Math.random() * 0.05) {
      this.burst(t + x, 0.05, 0.07, 900 + Math.random() * 600, 1.2, 'bandpass', this.verb);
      if (Math.random() < 0.3) this.burst(t + x + 0.05, 0.04, 0.05, 1400, 1.2, 'bandpass', this.verb);
    }
  }
  knock() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      this.burst(t + i * 0.22, 0.12, 0.35, 180, 1.2, 'lowpass', this.verb);
      this.burst(t + i * 0.22, 0.06, 0.15, 900, 2, 'bandpass', this.sfx);
    }
  }
  whistle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(2700, t);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 38;
    const lg = this.ctx.createGain();
    lg.gain.value = 120;
    lfo.connect(lg).connect(o.frequency);
    const g = this.ctx.createGain();
    this.env(g, t, 0.02, 0.06, 0.9);
    o.connect(g).connect(this.sfx);
    g.connect(this.verb);
    o.start(t);
    lfo.start(t);
    o.stop(t + 1);
    lfo.stop(t + 1);
  }
  shutter() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let x = 0; x < 1.6; x += 0.05) this.burst(t + x, 0.05, 0.05 + Math.random() * 0.03, 700 + Math.random() * 500, 3, 'bandpass', this.verb);
    this.burst(t + 1.6, 0.3, 0.2, 200, 1, 'lowpass', this.verb);
  }
  weld(dur = 1.2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let x = 0; x < dur; x += 0.03) this.burst(t + x, 0.03, 0.03 + Math.random() * 0.04, 5000 + Math.random() * 3000, 1.5, 'bandpass');
    this.burst(t, dur, 0.04, 120, 1, 'lowpass', this.sfx, 0.05);
  }
  clunk() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, 0.18, 0.3, 260, 1.4, 'lowpass', this.verb);
    this.tone('square', 140, t, 0.12, 0.04, 90);
  }
  switchClick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, 0.02, 0.2, 3000, 3);
    this.tone('square', 1800, t + 0.01, 0.03, 0.03);
    this.tone('sine', 660, t + 0.08, 0.15, 0.03);
  }
  beep(ok = true) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (ok) {
      this.tone('sine', 880, t, 0.1, 0.04);
      this.tone('sine', 1320, t + 0.1, 0.15, 0.04);
    } else this.tone('square', 220, t, 0.3, 0.04);
  }
  // motor gürlemesi: süreklidir, seviye 0..1 ile ayarlanır
  engine(level) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (!this.engG) {
      const s = this.loop(this.nb, 0.6);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 160;
      this.engF = f;
      this.engG = c.createGain();
      this.engG.gain.value = 0;
      s.connect(f).connect(this.engG).connect(this.master);
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 38;
      this.engO = o;
      const og = c.createGain();
      og.gain.value = 0.25;
      const of = c.createBiquadFilter();
      of.type = 'lowpass';
      of.frequency.value = 120;
      o.connect(of).connect(og).connect(this.engG);
      o.start();
    }
    const t = c.currentTime;
    this.engG.gain.setTargetAtTime(level * 0.9, t, 0.3);
    this.engF.frequency.setTargetAtTime(140 + level * 900, t, 0.4);
    this.engO.frequency.setTargetAtTime(32 + level * 30, t, 0.4);
  }
  update(dt) {
    if (!this.ctx) return;
    this.voiceLevel = this.readVoice();
    const t = this.ctx.currentTime;
    if (this.crickets) {
      this.nextCricket -= dt;
      if (this.nextCricket < 0) {
        this.nextCricket = 0.6 + Math.random() * 2.2;
        const f = 4300 + Math.random() * 600;
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) this.tone('sine', f, t + i * 0.06, 0.035, 0.006 + Math.random() * 0.006);
      }
    }
    this.nextFar -= dt;
    if (this.nextFar < 0) {
      this.nextFar = 6 + Math.random() * 14;
      const r = Math.random();
      if (r < 0.35) this.dog(0, 0.02);
      else if (r < 0.6) {
        // uzaktan geçen araba
        this.burst(t, 3.5, 0.03, 300, 0.6, 'lowpass', this.amb, 1.6);
      } else if (r < 0.7) this.tone('sine', 520, t, 0.4, 0.008, 480, this.verb); // uzak korna
    }
  }
}
