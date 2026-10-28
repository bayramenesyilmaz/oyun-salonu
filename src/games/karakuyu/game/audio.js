// Tüm sesler WebAudio ile kodla üretilir (dış ses dosyası yok).

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.volume = 0.8;
    this.nextHeart = 0;
    this.fear = 0;
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
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.amb = ctx.createGain();
    this.amb.gain.value = 0.9;
    this.amb.connect(this.master);

    // gürültü tamponları
    this.white = this.makeNoise('white', 4);
    this.brown = this.makeNoise('brown', 6);
    this.pink = this.makeNoise('pink', 5);
    this.distCurve = (() => {
      const n = 1024, c = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / n) * 2 - 1;
        c[i] = Math.tanh(x * 4);
      }
      return c;
    })();

    this.startAmbience();
    this.startCreatureVoice();
    this.startTension();
    this.ready = true;
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

  makeNoise(type, seconds) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w;
      else if (type === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      }
    }
    return buf;
  }

  noiseSrc(buf, loop = true) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = loop;
    if (loop) s.loopStart = Math.random();
    return s;
  }

  // ---------- Ortam ----------
  startAmbience() {
    const ctx = this.ctx;
    // rüzgâr
    const wind = this.noiseSrc(this.pink);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420;
    bp.Q.value = 0.7;
    const wg = ctx.createGain();
    wg.gain.value = 0.25;
    wind.connect(bp).connect(wg).connect(this.amb);
    wind.start();
    this.windFilter = bp;
    this.windGain = wg;
    // derin uğultu
    const rum = this.noiseSrc(this.brown);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 120;
    const rg = ctx.createGain();
    rg.gain.value = 0.35;
    rum.connect(lp).connect(rg).connect(this.amb);
    rum.start();

    this.ambTimer = setInterval(() => this.ambienceTick(), 250);
  }

  ambienceTick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    // rüzgâr dalgalanması
    this.windFilter.frequency.setTargetAtTime(300 + Math.random() * 500, t, 1.5);
    this.windGain.gain.setTargetAtTime(0.12 + Math.random() * 0.28, t, 2);
    // cırcır böcekleri (korku artınca susar)
    if (this.fear < 0.3 && Math.random() < 0.35) this.cricket();
    if (Math.random() < 0.012) this.owl();
    if (Math.random() < 0.005) this.dog();
    if (Math.random() < 0.02) this.creak(0.05 + Math.random() * 0.05);
  }

  cricket() {
    const ctx = this.ctx, t = ctx.currentTime + Math.random() * 0.2;
    const o = ctx.createOscillator();
    o.frequency.value = 4200 + Math.random() * 600;
    const g = ctx.createGain();
    g.gain.value = 0;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 2 - 1;
    o.connect(g).connect(pan).connect(this.amb);
    const vol = 0.012 + Math.random() * 0.01;
    for (let i = 0; i < 3; i++) {
      g.gain.setValueAtTime(vol, t + i * 0.07);
      g.gain.setValueAtTime(0, t + i * 0.07 + 0.035);
    }
    o.start(t);
    o.stop(t + 0.3);
  }

  owl() {
    const ctx = this.ctx, t = ctx.currentTime;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(this.amb);
    const hoots = [[0, 0.35], [0.5, 0.18], [0.75, 0.6]];
    for (const [off, len] of hoots) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(380, t + off);
      o.frequency.linearRampToValueAtTime(350, t + off + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + off);
      g.gain.linearRampToValueAtTime(0.035, t + off + 0.05);
      g.gain.linearRampToValueAtTime(0, t + off + len);
      o.connect(g).connect(pan);
      o.start(t + off);
      o.stop(t + off + len + 0.05);
    }
  }

  dog() {
    // çok uzaktan uluma
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, t);
    o.frequency.linearRampToValueAtTime(640, t + 0.8);
    o.frequency.linearRampToValueAtTime(520, t + 2.2);
    o.frequency.linearRampToValueAtTime(380, t + 2.8);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5;
    const vg = ctx.createGain();
    vg.gain.value = 8;
    vib.connect(vg).connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 700;
    f.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.018, t + 0.5);
    g.gain.linearRampToValueAtTime(0, t + 2.9);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 2 - 1;
    o.connect(f).connect(g).connect(pan).connect(this.amb);
    o.start(t);
    vib.start(t);
    o.stop(t + 3);
    vib.stop(t + 3);
  }

  creak(vol = 0.12, dest) {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70 + Math.random() * 40, t);
    o.frequency.linearRampToValueAtTime(110 + Math.random() * 60, t + 0.9);
    const trem = ctx.createOscillator();
    trem.frequency.value = 28 + Math.random() * 20;
    const tg = ctx.createGain();
    tg.gain.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.1);
    g.gain.linearRampToValueAtTime(0, t + 1.0);
    trem.connect(tg).connect(g.gain);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(600, t);
    f.frequency.linearRampToValueAtTime(1400, t + 1);
    f.Q.value = 6;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.4 - 0.7;
    o.connect(f).connect(g).connect(pan).connect(dest || this.amb);
    o.start(t);
    trem.start(t);
    o.stop(t + 1.1);
    trem.stop(t + 1.1);
  }

  // ---------- Gerilim pedi + kalp atışı ----------
  startTension() {
    const ctx = this.ctx;
    this.tensionGain = ctx.createGain();
    this.tensionGain.gain.value = 0;
    this.tensionFilter = ctx.createBiquadFilter();
    this.tensionFilter.type = 'lowpass';
    this.tensionFilter.frequency.value = 200;
    this.tensionFilter.connect(this.tensionGain).connect(this.master);
    for (const f of [55, 58.3, 82.4, 116.5]) {
      const o = ctx.createOscillator();
      o.type = f > 100 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = f > 100 ? 0.12 : 0.2;
      o.connect(g).connect(this.tensionFilter);
      o.start();
    }
  }

  setFear(f, chasing) {
    if (!this.ready) return;
    this.fear = f;
    const t = this.ctx.currentTime;
    this.tensionGain.gain.setTargetAtTime(0.02 + f * 0.22 + (chasing ? 0.08 : 0), t, 0.4);
    this.tensionFilter.frequency.setTargetAtTime(150 + f * 900 + (chasing ? 600 : 0), t, 0.4);
    // kalp atışı
    if (f > 0.15 && t > this.nextHeart) {
      const bpm = 60 + f * 90 + (chasing ? 25 : 0);
      this.nextHeart = t + 60 / bpm;
      this.thump(t, 0.25 + f * 0.55);
      this.thump(t + 0.16, (0.25 + f * 0.55) * 0.6);
    }
  }

  thump(t, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.25);
  }

  // ---------- Varlığın sesi (konumsal) ----------
  makePanner() {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'exponential';
    p.refDistance = 2;
    p.rolloffFactor = 1.3;
    p.maxDistance = 60;
    return p;
  }

  startCreatureVoice() {
    const ctx = this.ctx;
    this.cPanner = this.makePanner();
    this.cGain = ctx.createGain();
    this.cGain.gain.value = 0;
    this.cGain.connect(this.cPanner).connect(this.sfx);
    // ıslak nefes
    const br = this.noiseSrc(this.white);
    const bf = ctx.createBiquadFilter();
    bf.type = 'bandpass';
    bf.frequency.value = 1100;
    bf.Q.value = 1.2;
    const bg = ctx.createGain();
    bg.gain.value = 0.0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.35;
    const lg = ctx.createGain();
    lg.gain.value = 0.18;
    lfo.connect(lg).connect(bg.gain);
    br.connect(bf).connect(bg).connect(this.cGain);
    br.start();
    lfo.start();
    // boğuk inilti
    const dg = ctx.createGain();
    dg.gain.value = 0.08;
    const df = ctx.createBiquadFilter();
    df.type = 'lowpass';
    df.frequency.value = 380;
    df.Q.value = 4;
    for (const f of [92, 95.5, 138]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const v = ctx.createOscillator();
      v.frequency.value = 0.15 + Math.random() * 0.2;
      const vg = ctx.createGain();
      vg.gain.value = 6;
      v.connect(vg).connect(o.frequency);
      o.connect(df);
      o.start();
      v.start();
    }
    df.connect(dg).connect(this.cGain);
    this.moanFilter = df;
  }

  setPanner(p, x, y, z) {
    if (p.positionX) {
      const t = this.ctx.currentTime;
      p.positionX.setTargetAtTime(x, t, 0.03);
      p.positionY.setTargetAtTime(y, t, 0.03);
      p.positionZ.setTargetAtTime(z, t, 0.03);
    } else p.setPosition(x, y, z);
  }

  updateListener(cam, fwd) {
    if (!this.ready) return;
    const L = this.ctx.listener, t = this.ctx.currentTime;
    if (L.positionX) {
      L.positionX.setTargetAtTime(cam.x, t, 0.02);
      L.positionY.setTargetAtTime(cam.y, t, 0.02);
      L.positionZ.setTargetAtTime(cam.z, t, 0.02);
      L.forwardX.setTargetAtTime(fwd.x, t, 0.02);
      L.forwardY.setTargetAtTime(fwd.y, t, 0.02);
      L.forwardZ.setTargetAtTime(fwd.z, t, 0.02);
      L.upX.value = 0;
      L.upY.value = 1;
      L.upZ.value = 0;
    } else {
      L.setPosition(cam.x, cam.y, cam.z);
      L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }

  updateCreature(pos, active, chasing) {
    if (!this.ready) return;
    this.setPanner(this.cPanner, pos.x, pos.y + 1.6, pos.z);
    const t = this.ctx.currentTime;
    this.cGain.gain.setTargetAtTime(active ? (chasing ? 1.0 : 0.6) : 0, t, 0.3);
    this.moanFilter.frequency.setTargetAtTime(chasing ? 900 : 380, t, 0.3);
  }

  oneShotAt(pos, build) {
    if (!this.ready) return;
    const p = this.makePanner();
    this.setPanner(p, pos.x, pos.y ?? 1, pos.z);
    p.connect(this.sfx);
    build(p, this.ctx.currentTime);
  }

  // ---------- Efektler ----------
  step(kind) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = this.noiseSrc(this.white, false);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 700 + Math.random() * 500;
    f.Q.value = 0.9;
    const g = ctx.createGain();
    const vol = [0.05, 0.11, 0.2][kind] * (0.8 + Math.random() * 0.4);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t, Math.random() * 2);
    s.stop(t + 0.15);
    this.thumpSoft(t, vol * 0.8);
  }

  thumpSoft(t, vol) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.12);
  }

  creatureStep(pos, fast) {
    this.oneShotAt(pos, (out, t) => {
      const ctx = this.ctx;
      const s = this.noiseSrc(this.white, false);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(250, t + 0.12);
      f.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(fast ? 0.7 : 0.45, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      s.connect(f).connect(g).connect(out);
      s.start(t, Math.random() * 2);
      s.stop(t + 0.22);
      // damla
      if (Math.random() < 0.5) this.dripTo(out, t + 0.1 + Math.random() * 0.2, 0.25);
    });
  }

  dripTo(out, t, vol) {
    const o = this.ctx.createOscillator();
    const f0 = 1100 + Math.random() * 700;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.07);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.14);
  }

  wellDrip(pos) {
    this.oneShotAt({ x: pos.x, y: -0.5, z: pos.z }, (out, t) => this.dripTo(out, t, 0.35));
  }

  whisper(pos, vol = 0.6) {
    // adını fısıldar: biçimlendirici süzgeçlerden geçen gürültü
    this.oneShotAt(pos, (out, t) => {
      const ctx = this.ctx;
      const s = this.noiseSrc(this.white, false);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      const dur = 1.4 + Math.random() * 0.6;
      // "De-niz" benzeri iki hece
      g.gain.linearRampToValueAtTime(vol, t + 0.08);
      g.gain.linearRampToValueAtTime(vol * 0.3, t + 0.35);
      g.gain.linearRampToValueAtTime(vol, t + 0.5);
      g.gain.linearRampToValueAtTime(0, t + dur);
      const mix = ctx.createGain();
      mix.gain.value = 1;
      const formants = [[500, 700, 9], [1800, 2300, 12], [2700, 3000, 14]];
      for (const [a, b, q] of formants) {
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = q;
        f.frequency.setValueAtTime(a, t);
        f.frequency.linearRampToValueAtTime(b, t + 0.45);
        f.frequency.linearRampToValueAtTime(a * 0.9, t + dur);
        s.connect(f).connect(mix);
      }
      mix.connect(g).connect(out);
      s.start(t, Math.random() * 2);
      s.stop(t + dur + 0.1);
    });
  }

  scream(pos, vol = 0.9) {
    const go = (out, t) => {
      const ctx = this.ctx;
      const ws = ctx.createWaveShaper();
      ws.curve = this.distCurve;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.05);
      g.gain.setValueAtTime(vol, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1500;
      f.Q.value = 0.8;
      for (const base of [310, 337, 451, 622]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(base * 0.6, t);
        o.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.4);
        o.frequency.linearRampToValueAtTime(base * 1.3, t + 1.8);
        const v = ctx.createOscillator();
        v.frequency.value = 11 + Math.random() * 8;
        const vg = ctx.createGain();
        vg.gain.value = base * 0.05;
        v.connect(vg).connect(o.frequency);
        o.connect(ws);
        o.start(t);
        v.start(t);
        o.stop(t + 1.9);
        v.stop(t + 1.9);
      }
      const n = this.noiseSrc(this.white, false);
      const ng = ctx.createGain();
      ng.gain.value = 0.3;
      n.connect(ng).connect(ws);
      n.start(t);
      n.stop(t + 1.9);
      ws.connect(f).connect(g).connect(out);
    };
    if (pos) this.oneShotAt(pos, go);
    else if (this.ready) go(this.sfx, this.ctx.currentTime);
  }

  jumpscare() {
    if (!this.ready) return;
    this.scream(null, 1.4);
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(1.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 1.6);
  }

  paper() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const s = this.noiseSrc(this.white, false);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 2500 + Math.random() * 2000;
      const g = ctx.createGain();
      const st = t + i * 0.06 + Math.random() * 0.04;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.09, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.08);
      s.connect(f).connect(g).connect(this.sfx);
      s.start(st, Math.random() * 2);
      s.stop(st + 0.1);
    }
  }

  chime() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [f, d] of [[392, 0], [587.3, 0.12]]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(0.06, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.6);
      o.connect(g).connect(this.sfx);
      o.start(t + d);
      o.stop(t + d + 1.7);
    }
  }

  clunk() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    this.thumpSoft(t, 0.5);
    const s = this.noiseSrc(this.brown, false);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t);
    s.stop(t + 0.4);
  }

  locked() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const s = this.noiseSrc(this.white, false);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2200;
      f.Q.value = 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.06);
      s.connect(f).connect(g).connect(this.sfx);
      s.start(t + i * 0.12);
      s.stop(t + i * 0.12 + 0.08);
    }
  }

  door() {
    if (!this.ready) return;
    this.creak(0.25, this.sfx);
  }

  stinger() {
    // yanlış nakış / tehlike vurgusu
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const f of [146.8, 155.6, 207.7, 311.1]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2000, t);
      lp.frequency.exponentialRampToValueAtTime(200, t + 2.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      o.connect(lp).connect(g).connect(this.sfx);
      o.start(t);
      o.stop(t + 2.7);
    }
  }

  rumble(dur = 4, vol = 0.8) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = this.noiseSrc(this.brown, false);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 160;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.1);
    const o = ctx.createOscillator();
    o.frequency.value = 36;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(vol * 0.5, t + 0.8);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(og).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  silenceAll(fade = 2) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.amb.gain.setTargetAtTime(0, t, fade / 3);
    this.cGain.gain.setTargetAtTime(0, t, fade / 3);
    this.tensionGain.gain.setTargetAtTime(0, t, fade / 3);
    if (this.wed) this.stopWedding(fade);
  }

  restoreAmbience() {
    if (!this.ready) return;
    this.amb.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.5);
  }

  // ---------- Cin hikâyesi sesleri ----------
  // Dere: sürekli akan su (konumsal, köprünün iki yanı)
  startStream(z) {
    if (!this.ready || this.streamOn) return;
    this.streamOn = true;
    const ctx = this.ctx;
    for (const x of [-9, 9]) {
      const p = this.makePanner();
      p.refDistance = 3;
      p.rolloffFactor = 1.6;
      this.setPanner(p, x, 0, z);
      const s = this.noiseSrc(this.pink);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      // çağıltı: yavaş genlik dalgası
      const l = ctx.createOscillator();
      l.frequency.value = 0.7 + Math.random() * 0.5;
      const lg = ctx.createGain();
      lg.gain.value = 0.06;
      l.connect(lg).connect(g.gain);
      s.connect(f).connect(g).connect(p).connect(this.amb);
      s.start();
      l.start();
    }
  }

  // Cin düğünü: uzaktan, bozuk akortlu davul-zurna. Konumsal, sürekli.
  startWedding(pos) {
    if (!this.ready || this.wed) return;
    const ctx = this.ctx;
    const p = this.makePanner();
    p.refDistance = 6;
    p.rolloffFactor = 1.1;
    p.maxDistance = 120;
    this.setPanner(p, pos.x, 1.5, pos.z);
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(p).connect(this.sfx);
    this.wed = { out, beat: 0, next: ctx.currentTime + 0.2 };
    out.gain.setTargetAtTime(0.5, ctx.currentTime, 2);
    const bpm = 96;
    const step = 60 / bpm / 2;
    const mel = [69, 70, 73, 70, 69, 0, 68, 69, 70, 73, 74, 73, 70, 0, 69, 0];
    this.wedTimer = setInterval(() => {
      if (!this.wed || ctx.state !== 'running') return;
      const W = this.wed;
      while (W.next < ctx.currentTime + 0.25) {
        const t = W.next, b = W.beat;
        // davul: güm (vuruşta) ve tek (arada); hafifçe sallanan, insan dışı bir zaman
        if (b % 2 === 0) {
          const o = ctx.createOscillator();
          o.frequency.setValueAtTime(b % 8 === 0 ? 70 : 90, t);
          o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.7, t + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
          o.connect(g).connect(W.out);
          o.start(t);
          o.stop(t + 0.35);
        } else {
          const s = this.noiseSrc(this.white, false);
          const f = ctx.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.value = 2600;
          f.Q.value = 2;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.25, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
          s.connect(f).connect(g).connect(W.out);
          s.start(t);
          s.stop(t + 0.06);
        }
        const n = mel[b % mel.length];
        if (n) {
          // zurna: kare dalga, çeyrek ton bozuk
          const o = ctx.createOscillator();
          o.type = 'square';
          const fr = 440 * Math.pow(2, (n - 69 - 0.35) / 12);
          o.frequency.setValueAtTime(fr, t);
          o.frequency.linearRampToValueAtTime(fr * 0.985, t + step);
          const v = ctx.createOscillator();
          v.frequency.value = 5.5;
          const vg = ctx.createGain();
          vg.gain.value = fr * 0.015;
          v.connect(vg).connect(o.frequency);
          const f = ctx.createBiquadFilter();
          f.type = 'bandpass';
          f.frequency.value = 1500;
          f.Q.value = 1;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.05);
          o.connect(f).connect(g).connect(W.out);
          for (const x of [o, v]) {
            x.start(t);
            x.stop(t + step * 1.1);
          }
        }
        W.beat++;
        W.next += step * (1 + Math.sin(W.beat * 0.7) * 0.06);
      }
    }, 100);
  }

  stopWedding(fade = 1.5) {
    if (!this.wed) return;
    const W = this.wed;
    W.out.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
    setTimeout(() => {
      clearInterval(this.wedTimer);
      this.wed = null;
    }, fade * 1000 + 200);
  }

  // Demir parladı: metalik çınlama + geri çekilen tıslama
  ironRepel() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const f of [1318, 1975, 2793]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(g).connect(this.sfx);
      o.start(t);
      o.stop(t + 2.3);
    }
    const s = this.noiseSrc(this.white, false);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(5000, t);
    f.frequency.exponentialRampToValueAtTime(800, t + 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t);
    s.stop(t + 1.4);
  }

  // Horoz: sabahın habercisi, cinler çekilir
  rooster() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime + 0.3;
    const segs = [[0, 0.18, 620, 780], [0.22, 0.2, 700, 900], [0.46, 0.7, 900, 600]];
    for (const [d, len, f0, f1] of segs) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t + d);
      o.frequency.linearRampToValueAtTime(f1, t + d + len);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.03);
      g.gain.setValueAtTime(0.12, t + d + len * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
      o.connect(bp).connect(g).connect(this.master);
      o.start(t + d);
      o.stop(t + d + len + 0.05);
    }
  }

  // Kedi: kısık bir tıslama
  hiss(pos) {
    this.oneShotAt(pos, (out, t) => {
      const s = this.noiseSrc(this.white, false);
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 3000;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      s.connect(f).connect(g).connect(out);
      s.start(t);
      s.stop(t + 1);
    });
  }
}
