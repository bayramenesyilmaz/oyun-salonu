// Parkur: tohumdan üretilen tepeli yol. Her iki istemci aynı tohumla aynı yolu çizer.
export const L = 20000; // bitiş çizgisi
export const START_X = 200;
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class Track {
  constructor(seed) {
    const r = rng(seed);
    this.seed = seed;
    this.p = [r() * 6.28, r() * 6.28, r() * 6.28];
    this.kick = [];
    for (let x = 1800; x < L - 1200; x += 1300 + r() * 700) this.kick.push(x);
    this.boxes = [];
    for (let x = 900; x < L - 500; x += 650 + r() * 250) this.boxes.push({ x: Math.round(x) });
  }
  H(x) {
    const ramp = Math.min(1, Math.max(0, (x - 700) / 1800)) * Math.min(1, Math.max(0, (L + 200 - x) / 700));
    let y = Math.sin(x * 0.003 + this.p[0]) * 70 + Math.sin(x * 0.0083 + this.p[1]) * 30 + Math.sin(x * 0.019 + this.p[2]) * 9;
    y *= ramp;
    for (const k of this.kick) {
      const d = (x - k) / 70;
      y -= 55 * Math.exp(-d * d);
    }
    return 340 - y;
  }
  slope(x) {
    return (this.H(x + 2) - this.H(x - 2)) / 4;
  }
}
