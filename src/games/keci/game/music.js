// KEÇİ KAÇTI! — tüm sesler ve müzik WebAudio ile kodla üretilir (dosya yok, lisans derdi yok).
// Müzik oyun saatine bağlı planlanır: halay ritim oyunu ile davul vuruşları birebir aynı zamandadır.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Gezinti müziği: neşeli, zıplayan bir bağlama/kaval havası (D Hicaz'a yakın, 2/4)
const ROAM_BPM = 116;
const ROAM_MEL = [
  62, 0, 66, 67, 69, 0, 69, 70, 69, 67, 66, 67, 69, 0, 0, 0,
  70, 69, 67, 66, 67, 0, 66, 63, 62, 0, 63, 66, 62, 0, 0, 0,
  69, 0, 74, 72, 70, 69, 70, 72, 69, 0, 67, 66, 67, 69, 0, 0,
  70, 69, 67, 66, 63, 66, 67, 66, 62, 0, 62, 0, 62, 0, 0, 0,
];
const ROAM_BASS = [38, 0, 45, 0, 38, 0, 45, 0, 43, 0, 45, 0, 38, 0, 45, 0];

// Halay: davul-zurna. Sabit tempo, ritim oyunu bu vuruşları kullanır.
export const HALAY_BPM = 104;
export const HALAY_BEATS = 64; // toplam vuruş (≈37 sn)
const HALAY_MEL = [
  69, 70, 73, 74, 76, 74, 73, 70, 69, 70, 73, 70, 69, 0, 69, 0,
  74, 76, 77, 76, 74, 73, 74, 76, 73, 70, 69, 70, 73, 0, 69, 0,
];

export class KeciAudio {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.musicVolume = 0.55;
    this.mode = 'none'; // roam | halay | none
    this.songT = 0;
    this.lastStep = -1;
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
    comp.ratio.value = 5;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.music = ctx.createGain();
    this.music.gain.value = this.musicVolume;
    this.music.connect(this.master);
    // küçük oda yankısı (köy meydanı)
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(1.4, 3);
    const vg = ctx.createGain();
    vg.gain.value = 0.25;
    this.verb.connect(vg).connect(this.master);
    this.white = this.noise(2);
    // kuş cıvıltıları için zamanlayıcı
    this.birdT = 2;
  }

  noise(sec) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  impulse(sec, decay) {
    const ctx = this.ctx;
    const b = ctx.createBuffer(2, ctx.sampleRate * sec, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay);
    }
    return b;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }
  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.music) this.music.gain.value = v;
  }
  suspend() {
    this.ctx && this.ctx.suspend();
  }
  resume() {
    this.ctx && this.ctx.resume();
  }
  // VoiceSystem uyumluluğu (telsiz yok)
  radioHiss() {}
  squelch() {}

  // ---------- yardımcılar ----------
  env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  tone(type, f, t, dur, vol, dest = this.sfx, f2 = null) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    this.env(g, t, 0.005, vol, dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }
  burst(t, dur, vol, freq, q = 1, type = 'bandpass', dest = this.sfx) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.white;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, 0.003, vol, dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }
  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // ---------- efektler ----------
  bleat(pitch = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = this.now;
    // "Meeeee": titreşimli testere dişi + formant süzgeçleri
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const base = 310 * pitch * (0.95 + Math.random() * 0.1);
    o.frequency.setValueAtTime(base * 1.15, t);
    o.frequency.linearRampToValueAtTime(base, t + 0.12);
    o.frequency.linearRampToValueAtTime(base * 0.92, t + 0.75);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 23;
    const lg = ctx.createGain();
    lg.gain.value = base * 0.07;
    lfo.connect(lg).connect(o.frequency);
    const am = ctx.createGain();
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 23;
    const lg2 = ctx.createGain();
    lg2.gain.value = 0.45;
    lfo2.connect(lg2).connect(am.gain);
    am.gain.value = 0.6;
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 700;
    f1.Q.value = 3;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 1900;
    f2.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.04);
    g.gain.setValueAtTime(0.5, t + 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    o.connect(am);
    am.connect(f1).connect(g);
    am.connect(f2).connect(g);
    g.connect(this.sfx);
    g.connect(this.verb);
    for (const n of [o, lfo, lfo2]) {
      n.start(t);
      n.stop(t + 0.9);
    }
  }
  bonk(strength = 1) {
    if (!this.ctx) return;
    const t = this.now;
    this.tone('sine', 180, t, 0.18, 0.6 * strength, this.sfx, 60);
    this.burst(t, 0.06, 0.4 * strength, 1200, 1.2);
    // çizgi film "boing"
    this.tone('triangle', 520, t + 0.02, 0.3, 0.12, this.sfx, 260);
  }
  whoosh() {
    if (!this.ctx) return;
    this.burst(this.now, 0.18, 0.15, 900, 0.8);
  }
  crash() {
    if (!this.ctx) return;
    const t = this.now;
    for (let i = 0; i < 6; i++) {
      this.burst(t + i * 0.025 + Math.random() * 0.02, 0.12, 0.35, 2500 + Math.random() * 3500, 3);
      this.tone('triangle', 1500 + Math.random() * 2500, t + i * 0.03, 0.12, 0.05);
    }
    this.tone('sine', 140, t, 0.15, 0.4, this.sfx, 70);
  }
  thud(vol = 0.4) {
    if (!this.ctx) return;
    const t = this.now;
    this.tone('sine', 110, t, 0.2, vol, this.sfx, 45);
    this.burst(t, 0.08, vol * 0.4, 300, 0.7, 'lowpass');
  }
  splat() {
    if (!this.ctx) return;
    const t = this.now;
    this.burst(t, 0.25, 0.5, 600, 0.6, 'lowpass');
    this.tone('sine', 300, t, 0.12, 0.3, this.sfx, 80);
  }
  splash(big = false) {
    if (!this.ctx) return;
    const t = this.now;
    this.burst(t, big ? 1.2 : 0.5, big ? 0.7 : 0.35, 1200, 0.4, 'lowpass');
    for (let i = 0; i < (big ? 10 : 4); i++) this.tone('sine', 600 + Math.random() * 900, t + 0.05 + Math.random() * (big ? 0.8 : 0.3), 0.08, 0.06, this.sfx, 1600);
  }
  cluck(panic = false) {
    if (!this.ctx) return;
    const t = this.now;
    const n = panic ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const f = (panic ? 900 : 650) + Math.random() * 200;
      this.tone('square', f, t + i * 0.09, 0.05, 0.05, this.sfx, f * 0.7);
      this.burst(t + i * 0.09, 0.04, 0.06, f * 2, 5);
    }
    if (panic) this.tone('sawtooth', 1100, t + n * 0.09, 0.25, 0.05, this.sfx, 700);
  }
  munch() {
    if (!this.ctx) return;
    const t = this.now;
    for (let i = 0; i < 5; i++) this.burst(t + i * 0.11, 0.06, 0.25, 1800 + Math.random() * 800, 2);
    this.tone('sine', 880, t + 0.6, 0.12, 0.1, this.sfx, 1320);
  }
  bell(vol = 0.06) {
    if (!this.ctx) return;
    const t = this.now;
    const f = 1900 + Math.random() * 120;
    this.tone('sine', f, t, 0.35, vol);
    this.tone('sine', f * 2.76, t, 0.2, vol * 0.4);
  }
  ding() {
    if (!this.ctx) return;
    const t = this.now;
    [72, 76, 79, 84].forEach((n, i) => this.tone('triangle', NOTE(n), t + i * 0.08, 0.35, 0.18));
  }
  fanfare() {
    if (!this.ctx) return;
    const t = this.now;
    [67, 72, 76, 79, 76, 79, 84].forEach((n, i) => {
      this.tone('square', NOTE(n), t + i * 0.11, 0.22, 0.06);
      this.tone('triangle', NOTE(n), t + i * 0.11, 0.3, 0.14);
    });
  }
  cheer() {
    if (!this.ctx) return;
    const t = this.now;
    this.burst(t, 1.6, 0.25, 1400, 0.5);
    for (let i = 0; i < 6; i++) this.tone('sawtooth', 500 + Math.random() * 500, t + Math.random() * 0.6, 0.4, 0.025, this.sfx, 900);
  }
  whistle() {
    if (!this.ctx) return;
    const t = this.now;
    this.tone('sine', 2200, t, 0.18, 0.15, this.sfx, 2600);
    this.tone('sine', 2600, t + 0.22, 0.35, 0.15, this.sfx, 1900);
  }
  jump() {
    if (!this.ctx) return;
    this.tone('triangle', 300, this.now, 0.14, 0.08, this.sfx, 600);
  }
  step(vol = 0.05) {
    if (!this.ctx) return;
    this.burst(this.now, 0.04, vol, 700, 1, 'lowpass');
  }
  engine() {
    if (!this.ctx) return;
    const t = this.now;
    for (let i = 0; i < 8; i++) this.tone('sawtooth', 55 + Math.random() * 6, t + i * 0.07, 0.07, 0.1);
  }
  hit(good) {
    if (!this.ctx) return;
    const t = this.now;
    if (good) this.tone('triangle', 1320, t, 0.1, 0.12, this.sfx, 1760);
    else this.tone('sawtooth', 140, t, 0.15, 0.08, this.sfx, 90);
  }
  ui() {
    if (!this.ctx) return;
    this.tone('triangle', 880, this.now, 0.06, 0.08);
  }
  bird() {
    if (!this.ctx) return;
    const t = this.now;
    const f = 2500 + Math.random() * 1500;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.tone('sine', f, t + i * 0.11, 0.07, 0.025, this.sfx, f * (1.2 + Math.random() * 0.3));
  }

  // ---------- müzik ----------
  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.songT = 0;
    this.lastStep = -1;
  }

  // Oyun döngüsünden çağrılır. dt: oyun zamanı. Notalar küçük bir ileri bakışla planlanır.
  update(dt, songTime = null) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (songTime != null) this.songT = songTime;
    else this.songT += dt;
    this.birdT -= dt;
    if (this.birdT < 0 && this.mode !== 'halay') {
      this.bird();
      this.birdT = 2 + Math.random() * 6;
    }
    if (this.mode === 'none') return;
    const bpm = this.mode === 'halay' ? HALAY_BPM : ROAM_BPM;
    const stepLen = 60 / bpm / 2; // sekizlik
    const ahead = 0.12;
    const upto = Math.floor((this.songT + ahead) / stepLen);
    for (let s = Math.max(this.lastStep + 1, upto - 4); s <= upto; s++) {
      const when = this.now + (s * stepLen - this.songT);
      if (when < this.now - 0.02) continue;
      if (this.mode === 'halay') this.halayStep(s, Math.max(this.now, when), stepLen);
      else this.roamStep(s, Math.max(this.now, when), stepLen);
    }
    this.lastStep = Math.max(this.lastStep, upto);
  }

  pluck(f, t, dur, vol) {
    // bağlama benzeri tını: iki hafif akortsuz üçgen + hızlı sönüm
    const ctx = this.ctx;
    for (const d of [1, 1.004]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f * d;
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(f * 8, t);
      flt.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
      const g = ctx.createGain();
      this.env(g, t, 0.004, vol, dur);
      o.connect(flt).connect(g).connect(this.music);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }
  roamStep(s, t, len) {
    const n = ROAM_MEL[s % ROAM_MEL.length];
    if (n) this.pluck(NOTE(n), t, len * 2.2, 0.12);
    const b = ROAM_BASS[s % ROAM_BASS.length];
    if (b) this.pluck(NOTE(b), t, len * 1.8, 0.14);
    // def (tef): her vuruşta hafif zil
    if (s % 2 === 0) this.burst(t, 0.05, 0.05, 6000, 2, 'highpass', this.music);
    if (s % 4 === 0) this.tone('sine', 90, t, 0.12, 0.12, this.music, 55);
  }
  halayStep(s, t, len) {
    const beat = s / 2;
    if (beat >= HALAY_BEATS + 2) return;
    // davul: her vuruşta "güm", aralarda tokmak "tek"
    if (s % 2 === 0) {
      const accent = (s / 2) % 4 === 0;
      this.tone('sine', accent ? 75 : 95, t, 0.25, accent ? 0.8 : 0.55, this.music, 40);
      this.burst(t, 0.08, 0.3, 200, 0.8, 'lowpass', this.music);
    } else {
      this.burst(t, 0.04, 0.18, 3000, 2, 'bandpass', this.music);
    }
    // zurna: kare + titreşim, güçlü ve tiz
    const n = HALAY_MEL[s % HALAY_MEL.length];
    if (n && beat >= 4) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = NOTE(n);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lg = ctx.createGain();
      lg.gain.value = NOTE(n) * 0.012;
      lfo.connect(lg).connect(o.frequency);
      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value = 1800;
      flt.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
      g.gain.setValueAtTime(0.09, t + len * 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len * 1.05);
      o.connect(flt).connect(g).connect(this.music);
      for (const x of [o, lfo]) {
        x.start(t);
        x.stop(t + len * 1.1);
      }
    }
  }
}
