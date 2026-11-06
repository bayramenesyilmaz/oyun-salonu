// Kodla üretilen sesler (dosya yok, lisans sorunu yok). Ayarlardan kapatılabilir.
let ac = null, master = null, noise = null, enabled = true;
let heli = null, wind = null;

function init() {
  if (ac) {
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = enabled ? 0.9 : 0;
    master.connect(ac.destination);
    const len = ac.sampleRate * 1.5;
    noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ac = null;
  }
  return ac;
}
export function unlock() {
  init();
}
export function setSound(v) {
  enabled = v;
  if (master) master.gain.value = v ? 0.9 : 0;
}
export function soundOn() {
  return enabled;
}

function burst(dur, freq, q, vol, type = 'bandpass', delay = 0, slideTo = 0) {
  if (!init()) return;
  const t = ac.currentTime + delay;
  const s = ac.createBufferSource();
  s.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random());
  s.stop(t + dur + 0.05);
}
function tone(f1, f2, dur, type = 'sine', vol = 0.08, delay = 0) {
  if (!init()) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(25, f2), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}

// vol: 0..1 mesafeye göre
export function shot(kind, vol = 1) {
  const big = kind === 'awp' ? 1.8 : kind === 'ak' ? 1.2 : kind === 'pistol' ? 0.7 : 1;
  burst(0.16 * big, 1800, 0.7, 0.34 * vol, 'bandpass', 0, 300);
  tone(150 / big, 40, 0.14 * big, 'triangle', 0.3 * vol);
  if (kind === 'awp') burst(0.5, 600, 0.5, 0.16 * vol, 'lowpass', 0.03, 120);
}
export function reload() {
  tone(900, 600, 0.04, 'square', 0.05);
  tone(500, 400, 0.05, 'square', 0.05, 0.5);
  tone(1100, 900, 0.03, 'square', 0.05, 0.95);
}
export function hit(kill) {
  tone(kill ? 520 : 1000, kill ? 260 : 1400, 0.08, 'sine', 0.09);
}
export function hurt() {
  burst(0.18, 300, 0.4, 0.3, 'lowpass', 0, 120);
  tone(120, 60, 0.2, 'sawtooth', 0.1);
}
export function step(vol = 0.5) {
  burst(0.06, 220, 0.8, 0.07 * vol, 'lowpass');
}
export function boom() {
  burst(0.9, 500, 0.4, 0.9, 'lowpass', 0, 60);
  tone(90, 28, 0.7, 'sawtooth', 0.35);
}
export function pin() {
  tone(1400, 1000, 0.05, 'square', 0.05);
}
export function ding() {
  tone(880, 880, 0.12, 'sine', 0.1);
  tone(1320, 1320, 0.25, 'sine', 0.1, 0.1);
}
export function done() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.1, i * 0.14));
}
export function fail() {
  [330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.4, 'sawtooth', 0.08, i * 0.22));
}
export function radio() {
  burst(0.08, 2500, 1.5, 0.08, 'highpass');
  tone(1700, 1700, 0.06, 'sine', 0.04, 0.02);
}

// Helikopter rotoru: alçak titreşimli ses, mesafeye göre kısılır
export function heliSet(vol) {
  if (!init()) return;
  if (!heli) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 52;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 13;
    const lg = ac.createGain();
    lg.gain.value = 0.5;
    const g = ac.createGain();
    g.gain.value = 0;
    const base = ac.createGain();
    base.gain.value = 0.5;
    lfo.connect(lg).connect(base.gain);
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 260;
    o.connect(base).connect(f).connect(g).connect(master);
    o.start();
    lfo.start();
    heli = g;
  }
  heli.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)) * 0.35, ac.currentTime, 0.2);
}
export function windSet(on) {
  if (!init()) return;
  if (!wind) {
    const s = ac.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = ac.createGain();
    g.gain.value = 0;
    s.connect(f).connect(g).connect(master);
    s.start();
    wind = g;
  }
  wind.gain.setTargetAtTime(on ? 0.06 : 0, ac.currentTime, 0.5);
}
export function silence() {
  if (!ac) return;
  heli?.gain.setTargetAtTime(0, ac.currentTime, 0.1);
  wind?.gain.setTargetAtTime(0, ac.currentTime, 0.1);
}
