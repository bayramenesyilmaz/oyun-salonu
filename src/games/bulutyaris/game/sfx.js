// Basit WebAudio sesleri (dosya yok): motor, nitro, iniş, geri sayım.
let ctx = null, eng = null, engG = null, nit = null, nitG = null, on = true;
export const setSound = (v) => { on = v; if (engG) engG.gain.value = 0; if (nitG) nitG.gain.value = 0; };
export function unlock() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      eng = ctx.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 60;
      engG = ctx.createGain(); engG.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      eng.connect(lp); lp.connect(engG); engG.connect(ctx.destination); eng.start();
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      nit = ctx.createBufferSource(); nit.buffer = buf; nit.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900;
      nitG = ctx.createGain(); nitG.gain.value = 0;
      nit.connect(bp); bp.connect(nitG); nitG.connect(ctx.destination); nit.start();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* ses yok */ }
}
export function engine(speed, nitro, run) {
  if (!ctx || !eng) return;
  const t = ctx.currentTime;
  eng.frequency.setTargetAtTime(48 + speed * 2.6, t, 0.08);
  engG.gain.setTargetAtTime(on && run ? 0.05 : 0, t, 0.1);
  nitG.gain.setTargetAtTime(on && run && nitro ? 0.07 : 0, t, 0.08);
}
function tone(f, d, type = 'sine', v = 0.15, f2) {
  if (!ctx || !on) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.02);
}
export const beep = (go) => tone(go ? 880 : 520, go ? 0.5 : 0.18, 'square', 0.12);
export const land = (big) => tone(big ? 90 : 130, 0.25, 'triangle', big ? 0.35 : 0.2, 40);
export const pad = () => tone(500, 0.3, 'sawtooth', 0.1, 1100);
export const fall = () => tone(500, 0.8, 'sine', 0.15, 80);
export const bump = () => tone(110, 0.1, 'square', 0.1, 70);
export const done = () => { tone(520, 0.2, 'triangle'); setTimeout(() => tone(660, 0.2, 'triangle'), 160); setTimeout(() => tone(880, 0.4, 'triangle'), 320); };
