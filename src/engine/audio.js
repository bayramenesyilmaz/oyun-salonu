// Tüm sesler WebAudio ile kodla üretilir. Yavaş çekimde yeni sesler zaman ölçeğine
// göre yavaşlar (playbackRate / perde) ve ana çıkışa alçak geçiren süzgeç uygulanır.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.volume = 0.8;
    this.musicVolume = 0.5;
    this.scale = 1;
    this.combat = 0;
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
    this.slowFilter = ctx.createBiquadFilter();
    this.slowFilter.type = 'lowpass';
    this.slowFilter.frequency.value = 20000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 6;
    this.master.connect(this.slowFilter).connect(comp).connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.amb = ctx.createGain();
    this.amb.gain.value = 0.8;
    this.amb.connect(this.master);
    this.music = ctx.createGain();
    this.music.gain.value = this.musicVolume;
    this.music.connect(this.master);
    this.radioBus = ctx.createGain();
    this.radioBus.connect(this.master);

    this.white = this.noise('white', 3);
    this.brown = this.noise('brown', 5);
    this.pink = this.noise('pink', 4);

    // Vadi yankısı: üretilmiş dürtü yanıtı
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2, 2.2);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.55;
    this.reverb.connect(this.reverbGain).connect(this.sfx);

    this.startAmbience();
    this.startMusic();
    this.ready = true;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }
  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.music) this.music.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }
  suspend() {
    this.ctx && this.ctx.suspend();
  }
  resume() {
    this.ctx && this.ctx.resume();
  }

  // Yavaş çekim: ana çıkış süzgeci + yeni seslerin hızı
  setTimeScale(s) {
    this.scale = s;
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.slowFilter.frequency.setTargetAtTime(s > 0.98 ? 20000 : 700 + s * 4000, t, 0.08);
    this.ambSources?.forEach((src) => src.playbackRate.setTargetAtTime(0.6 + 0.4 * s, t, 0.1));
  }
  rate() {
    return 0.45 + 0.55 * this.scale;
  }

  noise(type, seconds) {
    const ctx = this.ctx, len = ctx.sampleRate * seconds;
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

  impulse(seconds, decay) {
    const ctx = this.ctx, len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // dağlardan geri dönen birkaç yankı + dağınık kuyruk
        let v = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * 0.5;
        for (const e of [0.11, 0.24, 0.41]) if (Math.abs(t - e) < 0.012) v += (Math.random() * 2 - 1) * 0.6 * (1 - t);
        d[i] = v;
      }
    }
    return buf;
  }

  src(buf, loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = loop;
    return s;
  }

  panner(pos, ref = 4, roll = 1.1) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = ref;
    p.rolloffFactor = roll;
    p.maxDistance = 400;
    if (p.positionX) {
      p.positionX.value = pos.x;
      p.positionY.value = pos.y;
      p.positionZ.value = pos.z;
    } else p.setPosition(pos.x, pos.y, pos.z);
    return p;
  }

  listener(cam, fwd) {
    if (!this.ready) return;
    const L = this.ctx.listener, t = this.ctx.currentTime;
    if (L.positionX) {
      L.positionX.setTargetAtTime(cam.x, t, 0.02);
      L.positionY.setTargetAtTime(cam.y, t, 0.02);
      L.positionZ.setTargetAtTime(cam.z, t, 0.02);
      L.forwardX.setTargetAtTime(fwd.x, t, 0.02);
      L.forwardY.setTargetAtTime(fwd.y, t, 0.02);
      L.forwardZ.setTargetAtTime(fwd.z, t, 0.02);
      L.upY.value = 1;
    } else {
      L.setPosition(cam.x, cam.y, cam.z);
      L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }

  // ---------- Ortam ----------
  startAmbience() {
    const ctx = this.ctx;
    this.ambSources = [];
    const wind = this.src(this.pink, true);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 380;
    bp.Q.value = 0.6;
    const wg = ctx.createGain();
    wg.gain.value = 0.18;
    wind.connect(bp).connect(wg).connect(this.amb);
    wind.start();
    this.ambSources.push(wind);
    this.windF = bp;
    this.windG = wg;
    const low = this.src(this.brown, true);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 110;
    const lg = ctx.createGain();
    lg.gain.value = 0.3;
    low.connect(lp).connect(lg).connect(this.amb);
    low.start();
    this.ambSources.push(low);
    this.ambTimer = setInterval(() => this.ambTick(), 300);
  }

  ambTick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    this.windF.frequency.setTargetAtTime(250 + Math.random() * 450, t, 1.5);
    this.windG.gain.setTargetAtTime(0.08 + Math.random() * 0.2, t, 2);
    if (this.combat < 0.3 && Math.random() < 0.3) this.cricket();
    if (Math.random() < 0.006) this.distantDog();
  }

  cricket() {
    const ctx = this.ctx, t = ctx.currentTime + Math.random() * 0.2;
    const o = ctx.createOscillator();
    o.frequency.value = (4300 + Math.random() * 500) * this.rate();
    const g = ctx.createGain();
    g.gain.value = 0;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 2 - 1;
    o.connect(g).connect(pan).connect(this.amb);
    const v = 0.008 + Math.random() * 0.008;
    for (let i = 0; i < 3; i++) {
      g.gain.setValueAtTime(v, t + i * 0.07);
      g.gain.setValueAtTime(0, t + i * 0.07 + 0.035);
    }
    o.start(t);
    o.stop(t + 0.3);
  }

  distantDog() {
    const ctx = this.ctx, t = ctx.currentTime;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 2 - 1;
    pan.connect(this.amb);
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const st = t + i * (0.35 + Math.random() * 0.2);
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, st);
      o.frequency.exponentialRampToValueAtTime(300, st + 0.12);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 800;
      f.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.012, st);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.18);
      o.connect(f).connect(g).connect(pan);
      o.start(st);
      o.stop(st + 0.2);
    }
  }

  // ---------- Müzik: sinematik, düşük yoğunluklu pad + çatışma katmanı ----------
  startMusic() {
    const ctx = this.ctx;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    this.padFilter = lp;
    this.padGain.connect(lp).connect(this.music);
    // Re minör (D-F-A) + sus2 renkleri
    for (const [f, type, v] of [[73.4, 'sawtooth', 0.05], [110, 'triangle', 0.07], [146.8, 'triangle', 0.05], [174.6, 'sine', 0.05], [220, 'sine', 0.03], [329.6, 'sine', 0.015]]) {
      for (const det of [-5, 5]) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.value = v;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + Math.random() * 0.08;
        const lg = ctx.createGain();
        lg.gain.value = v * 0.6;
        lfo.connect(lg).connect(g.gain);
        o.connect(g).connect(this.padGain);
        o.start();
        lfo.start();
      }
    }
    // Çatışma katmanı: nabız gibi atan düşük davul
    this.drumGain = ctx.createGain();
    this.drumGain.gain.value = 0;
    this.drumGain.connect(this.music);
    this.nextDrum = 0;
    this.musicTimer = setInterval(() => this.musicTick(), 50);
  }

  musicTick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    if (this.combat > 0.05 && t > this.nextDrum) {
      const beat = 60 / 96 / this.rate();
      this.nextDrum = t + beat;
      const o = this.ctx.createOscillator();
      o.frequency.setValueAtTime(90 * this.rate(), t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(this.drumGain);
      o.start(t);
      o.stop(t + 0.4);
    }
  }

  setMusicState(calm, combat) {
    if (!this.ready) return;
    this.combat = combat;
    const t = this.ctx.currentTime;
    this.padGain.gain.setTargetAtTime(0.35 * calm + 0.25 * combat, t, 1.2);
    this.padFilter.frequency.setTargetAtTime(500 + combat * 1800, t, 0.8);
    this.drumGain.gain.setTargetAtTime(combat * 0.6, t, 0.6);
  }

  // ---------- Silah sesleri ----------
  // pos verilmezse oyuncunun kendi silahı (yakın, kuru + yankı)
  gunshot(pos, enemy = false) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime, r = this.rate();
    const out = ctx.createGain();
    let dest = this.sfx;
    if (pos) {
      const p = this.panner(pos, 6, 1);
      out.connect(p).connect(this.sfx);
      const send = ctx.createGain();
      send.gain.value = 0.9;
      out.connect(send).connect(this.reverb);
    } else {
      out.connect(dest);
      const send = ctx.createGain();
      send.gain.value = 0.55;
      out.connect(send).connect(this.reverb);
    }
    out.gain.value = pos ? 1.4 : 0.9;
    // çatlama (yüksek frekanslı gürültü)
    const n = this.src(this.white);
    n.playbackRate.value = r;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = enemy ? 900 : 1400;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(1, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12 / r);
    n.connect(hp).connect(ng).connect(out);
    n.start(t, Math.random() * 2);
    n.stop(t + 0.2 / r);
    // gövde (düşük frekans patlama)
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime((enemy ? 140 : 170) * r, t);
    o.frequency.exponentialRampToValueAtTime(42 * r, t + 0.12 / r);
    const og = ctx.createGain();
    og.gain.setValueAtTime(1.1, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.2 / r);
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + 0.25 / r);
    // mekanik tık
    if (!pos) this.click(t + 0.01, 2600, 0.15);
  }

  click(t, freq = 2000, vol = 0.2, q = 6) {
    const ctx = this.ctx;
    const n = this.src(this.white);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq * this.rate();
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 / this.rate());
    n.connect(f).connect(g).connect(this.sfx);
    n.start(t, Math.random());
    n.stop(t + 0.08);
  }

  dryFire() {
    if (this.ready) this.click(this.ctx.currentTime, 1800, 0.25);
  }

  reload(duration) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, d = duration;
    this.click(t + d * 0.12, 1500, 0.3, 4); // şarjör çıkar
    this.click(t + d * 0.15, 900, 0.2, 3);
    this.click(t + d * 0.58, 1200, 0.35, 4); // şarjör tak
    this.click(t + d * 0.6, 700, 0.3, 3);
    this.click(t + d * 0.82, 2200, 0.3, 5); // kurma kolu
    this.click(t + d * 0.86, 1700, 0.3, 5);
  }

  impact(pos, kind = 'dirt') {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const p = this.panner(pos, 2, 1.4);
    p.connect(this.sfx);
    const n = this.src(this.white);
    n.playbackRate.value = this.rate();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = (kind === 'hard' ? 3200 : 900) * this.rate();
    f.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(kind === 'hard' ? 0.5 : 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1 / this.rate());
    n.connect(f).connect(g).connect(p);
    n.start(t, Math.random() * 2);
    n.stop(t + 0.15);
  }

  // Yakından geçen mermi vızıltısı
  whizz(pos) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const p = this.panner(pos, 1, 2);
    p.connect(this.sfx);
    const n = this.src(this.white);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(4000 * this.rate(), t);
    f.frequency.exponentialRampToValueAtTime(1200 * this.rate(), t + 0.15);
    f.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18 / this.rate());
    n.connect(f).connect(g).connect(p);
    n.start(t, Math.random());
    n.stop(t + 0.3);
  }

  step(kind = 'gravel', vol = 0.12, pos) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    let dest = this.sfx;
    if (pos) {
      const p = this.panner(pos, 2, 1.5);
      p.connect(this.sfx);
      dest = p;
    }
    const n = this.src(this.white);
    n.playbackRate.value = this.rate();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = (kind === 'hard' ? 1800 : 900 + Math.random() * 600) * this.rate();
    f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14 / this.rate());
    n.connect(f).connect(g).connect(dest);
    n.start(t, Math.random() * 2);
    n.stop(t + 0.2);
  }

  hurt() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.32);
    // kulak çınlaması
    const s = ctx.createOscillator();
    s.frequency.value = 3800;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.03, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    s.connect(sg).connect(this.sfx);
    s.start(t);
    s.stop(t + 1.3);
  }

  heartbeat(vol) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [d, v] of [[0, 1], [0.17, 0.6]]) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(65, t + d);
      o.frequency.exponentialRampToValueAtTime(38, t + d + 0.14);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(vol * v, t + d + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.2);
      o.connect(g).connect(this.master);
      o.start(t + d);
      o.stop(t + d + 0.22);
    }
  }

  // Yavaş çekime giriş / çıkış
  whoosh(into) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this.src(this.pink);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(into ? 2400 : 300, t);
    f.frequency.exponentialRampToValueAtTime(into ? 200 : 2000, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    n.connect(f).connect(g).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.7);
    if (into) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(60, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.4, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(og).connect(this.ctx.destination);
      o.start(t);
      o.stop(t + 1);
    }
  }

  ui(kind = 'tick') {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = kind === 'ok' ? 880 : kind === 'mark' ? 1320 : 660;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'ok' ? 0.5 : 0.12));
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + 0.6);
    if (kind === 'ok') {
      const o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = 1318;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t + 0.1);
      g2.gain.exponentialRampToValueAtTime(0.05, t + 0.12);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o2.connect(g2).connect(this.ctx.destination);
      o2.start(t + 0.1);
      o2.stop(t + 0.7);
    }
  }

  // Telsiz cızırtısı (konuşma başı/sonu)
  squelch(end = false) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this.src(this.white);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.setValueAtTime(0.12, t + (end ? 0.12 : 0.18));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (end ? 0.2 : 0.26));
    n.connect(f).connect(g).connect(this.radioBus);
    n.start(t, Math.random());
    n.stop(t + 0.3);
    const o = ctx.createOscillator();
    o.frequency.value = end ? 1200 : 1600;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.03, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(og).connect(this.radioBus);
    o.start(t);
    o.stop(t + 0.1);
  }

  // Konuşma sırasında hafif telsiz hışırtısı
  radioHiss(on) {
    if (!this.ready) return;
    if (!this.hiss) {
      const n = this.src(this.white, true);
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2500;
      f.Q.value = 0.5;
      this.hiss = this.ctx.createGain();
      this.hiss.gain.value = 0;
      n.connect(f).connect(this.hiss).connect(this.radioBus);
      n.start();
    }
    this.hiss.gain.setTargetAtTime(on ? 0.012 : 0, this.ctx.currentTime, 0.05);
  }

  zoom() {
    if (this.ready) this.click(this.ctx.currentTime, 600, 0.12, 2);
  }

  lampClick() {
    if (this.ready) {
      this.click(this.ctx.currentTime, 2400, 0.2, 8);
    }
  }
}
