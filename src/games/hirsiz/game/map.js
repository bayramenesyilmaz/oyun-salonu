// Müze haritası: 3 kat, merdivenler, saklanma yerleri, kameralar, lazerler, hazine konumları.
export const W = 800;
export const H = 450;
export const FY = [400, 290, 180]; // kat zemin çizgileri (ayak hizası)
export const LAD = [
  { x: 300, f: 0 },
  { x: 690, f: 0 },
  { x: 110, f: 1 },
  { x: 520, f: 1 },
]; // f katı ile f+1 katını bağlar
export const HIDE = [
  { x: 220, f: 0 },
  { x: 620, f: 0 },
  { x: 250, f: 1 },
  { x: 640, f: 1 },
  { x: 230, f: 2 },
  { x: 400, f: 2 },
];
export const TRE = [
  { x: 700, f: 2 },
  { x: 330, f: 2 },
  { x: 70, f: 2 },
];
export const CAMS = [
  { x: 420, f: 0, ph: 0 },
  { x: 210, f: 1, ph: 1.3 },
  { x: 560, f: 1, ph: 2.6 },
  { x: 330, f: 2, ph: 0.7 },
  { x: 680, f: 2, ph: 2 },
];
export const LAS = [
  { f: 0, x1: 480, x2: 580, ph: 0 },
  { f: 1, x1: 360, x2: 450, ph: 1 },
  { f: 2, x1: 560, x2: 650, ph: 0.5 },
];
export const EXIT_X = 56;
export const ROUND_TIME = 80;

export const camAngle = (c, t) => Math.PI / 2 + Math.sin(t * 0.85 + c.ph) * 0.85;
export const camPos = (c) => ({ x: c.x, y: FY[c.f] - 98 });
export const laserOn = (l, t) => (t + l.ph * 3) % 4 < 2.6;
export function inCam(c, t, px, py) {
  const o = camPos(c);
  const dx = px - o.x;
  const dy = py - o.y;
  if (Math.hypot(dx, dy) > 170) return false;
  return Math.abs(Math.atan2(dy, dx) - camAngle(c, t)) < 0.32;
}
// hırsız (x, kat) bir tehlikede mi?  t: tur zamanı
export function danger(x, fl, t) {
  const py = FY[fl] - 24;
  for (const c of CAMS) if (c.f === fl && inCam(c, t, x, py)) return 'cam';
  for (const l of LAS) if (l.f === fl && x >= l.x1 && x <= l.x2 && laserOn(l, t)) return 'laser';
  return '';
}
// hedefe giden bir sonraki adım: { x: gidilecek x, climb: 'u'|'d'|'' }
export function route(fl, x, tfl, tx) {
  if (fl === tfl) return { x: tx, climb: '' };
  const up = tfl > fl;
  const cands = LAD.filter((l) => (up ? l.f === fl : l.f === fl - 1));
  let best = cands[0];
  for (const l of cands) if (Math.abs(l.x - x) + Math.abs(l.x - tx) * 0.2 < Math.abs(best.x - x) + Math.abs(best.x - tx) * 0.2) best = l;
  if (Math.abs(best.x - x) < 8) return { x: best.x, climb: up ? 'u' : 'd' };
  return { x: best.x, climb: '' };
}
export const ladderAt = (fl, x, dir) => LAD.find((l) => Math.abs(l.x - x) < 16 && (dir > 0 ? l.f === fl : l.f === fl - 1));
