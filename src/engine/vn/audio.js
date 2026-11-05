// Küçük WebAudio: yazı sesi, ortam, müzik pedi, vurgu sesleri. Dosya yok, hepsi kodla.
const CH = {
  warm: [[0, 4, 7, 12], [-3, 0, 4, 9], [-5, -1, 2, 7], [-7, -3, 0, 5]],
  sad: [[0, 3, 7, 10], [-4, -1, 3, 8], [-2, 1, 5, 8], [-5, -2, 2, 7]],
  tense: [[0, 3, 6, 9], [1, 4, 7, 10], [0, 3, 6, 9], [-1, 2, 5, 8]],
  horror: [[0, 1, 6], [-1, 5, 6], [0, 1, 6], [-2, 4, 5]],
  hope: [[0, 4, 7, 11], [-3, 0, 4, 7], [-5, -1, 4, 7], [-7, 0, 5, 9]],
  funny: [[0, 4, 7, 9], [2, 5, 9, 12], [-1, 4, 7, 11], [0, 4, 7, 12]],
};
export class VNAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicKind = null;
    this.ambNodes = [];
  }
  init() {
    if (this.ctx) {
      this.ctx.state === 'suspended' && this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    this.mus = this.ctx.createGain();
    this.mus.gain.value = 0.0;
    this.mus.connect(this.master);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
  }
  blip(pitch = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 180 * pitch * (0.9 + Math.random() * 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.08);
  }
  tone(f, dur, type = 'sine', vol = 0.2, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  burst(dur, f0, f1, vol = 0.4, q = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const fl = this.ctx.createBiquadFilter();
    fl.type = 'bandpass';
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(this.sfx);
    s.start(t);
    s.stop(t + dur + 0.05);
  }
  sting(kind) {
    if (!this.ctx || this.muted) return;
    if (kind === 'boom') {
      this.tone(70, 1.2, 'sine', 0.7, -45);
      this.burst(0.8, 800, 60, 0.5);
    } else if (kind === 'screech') {
      this.tone(1500, 0.7, 'sawtooth', 0.18, 700);
      this.tone(1580, 0.7, 'sawtooth', 0.14, 900);
      this.burst(0.7, 3000, 900, 0.25, 4);
    } else if (kind === 'bell') {
      for (const [f, v] of [[880, 0.2], [1320, 0.12], [1760, 0.08]]) this.tone(f, 2.4, 'sine', v);
    } else if (kind === 'hit') {
      this.burst(0.25, 400, 60, 0.7);
      this.tone(90, 0.3, 'square', 0.25, -40);
    } else if (kind === 'knock') {
      for (let i = 0; i < 3; i++) setTimeout(() => this.burst(0.12, 300, 90, 0.6, 2), i * 220);
    } else if (kind === 'door') {
      this.burst(0.5, 600, 80, 0.5, 1.5);
      this.tone(60, 0.5, 'sine', 0.4, -20);
    } else if (kind === 'clue') {
      this.tone(660, 0.18, 'triangle', 0.18);
      setTimeout(() => this.tone(990, 0.4, 'triangle', 0.16), 110);
    } else if (kind === 'win') {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.6, 'triangle', 0.18), i * 130));
    } else if (kind === 'lose') {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.7, 'sawtooth', 0.12), i * 220));
    } else if (kind === 'laugh') {
      [420, 520, 440, 560].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'square', 0.07, 80), i * 110));
    } else if (kind === 'phone') {
      for (let i = 0; i < 4; i++) setTimeout(() => (this.tone(880, 0.12, 'sine', 0.15), this.tone(1100, 0.12, 'sine', 0.1)), i * 260);
    } else if (kind === 'gun') {
      this.burst(0.35, 2500, 120, 0.9);
      this.tone(60, 0.4, 'sine', 0.6, -30);
    } else if (kind === 'heart') {
      this.tone(55, 0.18, 'sine', 0.6);
      setTimeout(() => this.tone(50, 0.22, 'sine', 0.5), 190);
    }
  }
  ambient(kind) {
    if (!this.ctx) return;
    for (const n of this.ambNodes) {
      try {
        n.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
        setTimeout(() => n.s.stop(), 2500);
      } catch {}
    }
    this.ambNodes = [];
    if (!kind || kind === 'none') return;
    const mk = (type, freq, q, vol, lfo) => {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(vol, this.ctx.currentTime, 1.2);
      s.connect(f).connect(g).connect(this.sfx);
      s.start();
      if (lfo) {
        const o = this.ctx.createOscillator();
        o.frequency.value = lfo[0];
        const og = this.ctx.createGain();
        og.gain.value = lfo[1];
        o.connect(og).connect(f.frequency);
        o.start();
      }
      this.ambNodes.push({ s, g });
    };
    if (kind === 'rain') {
      mk('highpass', 1800, 0.5, 0.16);
      mk('lowpass', 500, 0.5, 0.1, [0.15, 120]);
    } else if (kind === 'wind') mk('bandpass', 380, 1.2, 0.2, [0.12, 200]);
    else if (kind === 'hum') {
      mk('lowpass', 140, 2, 0.25);
      mk('bandpass', 2400, 8, 0.012, [0.3, 30]);
    } else if (kind === 'crowd') mk('bandpass', 700, 0.6, 0.12, [0.4, 150]);
    else if (kind === 'night') {
      mk('bandpass', 4800, 10, 0.02, [6, 400]);
      mk('lowpass', 200, 1, 0.08);
    } else if (kind === 'train') {
      mk('lowpass', 260, 1, 0.25, [2.2, 110]);
      mk('highpass', 2000, 0.4, 0.035, [2.2, 800]);
    }
  }
  music(kind) {
    if (!this.ctx) return;
    if (this.musicKind === kind) return;
    this.musicKind = kind;
    clearInterval(this.musTimer);
    this.mus.gain.setTargetAtTime(kind ? 0.5 : 0, this.ctx.currentTime, 0.8);
    if (!kind || !CH[kind]) return;
    let step = 0;
    const root = { warm: 196, sad: 174.6, tense: 130.8, horror: 98, hope: 220, funny: 261.6 }[kind];
    const play = () => {
      if (this.muted || this.ctx.state !== 'running') return;
      const chord = CH[kind][step % 4];
      step++;
      const t = this.ctx.currentTime;
      const dur = kind === 'funny' ? 2.2 : 4.6;
      chord.forEach((n, i) => {
        const f = root * Math.pow(2, n / 12);
        for (const det of [-5, 5]) {
          const o = this.ctx.createOscillator();
          o.type = kind === 'horror' ? 'sawtooth' : 'triangle';
          o.frequency.value = f * (i === 0 ? 0.5 : 1);
          o.detune.value = det;
          const fl = this.ctx.createBiquadFilter();
          fl.type = 'lowpass';
          fl.frequency.value = kind === 'horror' ? 500 : 1100;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.03 / chord.length, t + dur * 0.35);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.05);
          o.connect(fl).connect(g).connect(this.mus);
          o.start(t);
          o.stop(t + dur * 1.1);
        }
      });
      if (kind === 'sad' || kind === 'hope' || kind === 'warm') {
        const n = chord[(step * 2) % chord.length];
        const f = root * 2 * Math.pow(2, n / 12);
        setTimeout(() => this.tone(f, 1.6, 'sine', 0.05), 1200);
      }
      if (kind === 'tense') this.tone(root * 0.5, 0.15, 'sine', 0.12);
    };
    play();
    this.musTimer = setInterval(play, kind === 'funny' ? 2200 : 4400);
  }
  dispose() {
    clearInterval(this.musTimer);
    try {
      this.ctx && this.ctx.close();
    } catch {}
  }
}
