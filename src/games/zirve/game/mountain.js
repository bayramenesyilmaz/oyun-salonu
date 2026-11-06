import * as THREE from 'three';

export const TOP_Y = 300;
const TAU = Math.PI * 2;
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Dağ: spiral şeklinde yükselen sıra sıra çıkıntı (ledge) + ara ara kopabilen ipler. Aynı seed = aynı dağ.
export function generate(seed = 1) {
  const R = rng(seed);
  const rr = (a, b) => a + R() * (b - a);
  const ledges = [], ropes = [], rocks = [];
  let theta = 0, y = 0, sinceRope = 0, i = 0;
  const radiusAt = (yy) => 135 - 100 * Math.min(1, Math.max(0, yy / TOP_Y));
  const add = (o) => {
    const rad = radiusAt(o.y);
    const th = o.theta;
    const cx = Math.cos(th) * rad, cz = Math.sin(th) * rad;
    const tx = -Math.sin(th), tz = Math.cos(th);
    const L = { i: ledges.length, cx, cz, cy: o.y, ang: Math.atan2(tz, tx), hl: o.len / 2, hw: o.wid / 2, slope: o.slope || 0, kind: o.kind, camp: !!o.camp, rad, theta: th, tx, tz };
    ledges.push(L);
    return L;
  };
  // başlangıç alanı
  const base = add({ y: 0, theta: 0, len: 28, wid: 16, kind: 'base', camp: true });
  let endTheta = base.theta + (base.hl) / base.rad, endY = base.cy;
  let N = 0;
  while (endY < TOP_Y - 14 && N < 150) {
    N++;
    const prog = endY / TOP_Y;
    const rad = radiusAt(endY);
    let kind = 'walk';
    const r = R();
    if (sinceRope >= 4 && R() < 0.3 && endY < TOP_Y - 40) kind = 'rope';
    else if (r < 0.4) kind = 'walk';
    else if (r < 0.62) kind = 'step';
    else kind = 'gap';
    const camp = N % 11 === 0;
    const len = camp ? 20 : rr(10, 18);
    const wid = camp ? 12 : Math.max(5.6, rr(7, 10) - 2.2 * prog);
    let gap = 0, rise = 0, H = 0;
    if (kind === 'step') rise = rr(0.7, 1.1);
    else if (kind === 'gap') { gap = rr(2.0, 3.3); rise = rr(0, 0.5); }
    else if (kind === 'rope') { gap = 1.6; H = rr(10, 26); rise = H; }
    const slope = camp ? 0 : kind === 'rope' ? 0.04 : rr(0.05, 0.14);
    const startTheta = endTheta + gap / rad;
    const startY = endY + rise;
    const thc = startTheta + len / 2 / rad;
    const cy = startY + slope * len / 2;
    const L = add({ y: cy, theta: thc, len, wid, slope, kind, camp });
    if (kind === 'rope') {
      const prev = ledges[ledges.length - 2];
      const ath = startTheta - 0.9 / rad;
      const off = rr(-1.8, 1.8);
      const ax = Math.cos(ath) * (rad + off), az = Math.sin(ath) * (rad + off);
      const top = startY, bottom = prev.cy + prev.slope * prev.hl + 0.3;
      ropes.push({ id: ropes.length, x: ax, z: az, top, bottom, ledge: L.i, cut: 0 });
      sinceRope = 0;
    } else sinceRope++;
    // kaya
    if (!camp && R() < 0.55) {
      const lx = rr(-L.hl * 0.7, L.hl * 0.7), lz = rr(-L.hw * 0.6, L.hw * 0.6);
      rocks.push({ id: rocks.length, ledge: L.i, lx, lz, cd: 0 });
    }
    endTheta = thc + len / 2 / rad;
    endY = cy + slope * len / 2;
  }
  // zirve platformu
  const topRad = radiusAt(endY);
  const summit = add({ y: endY + 1.2, theta: endTheta + 14 / topRad, len: 26, wid: 16, kind: 'summit', camp: true });
  summit.cy = endY + 1.2;
  ledges.forEach((l) => { if (l.camp && l.kind === 'camp') l.kind = 'camp'; });
  const rockRY = ledges.map((l) => [l.cy, l.rad]);
  const rockR = (yy) => {
    const a = rockRY;
    if (yy <= a[0][0]) return a[0][1] - 6.2;
    if (yy >= a[a.length - 1][0]) return Math.max(6, a[a.length - 1][1] - 6.2 - (yy - a[a.length - 1][0]) * 0.6);
    let lo = 0, hi = a.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m][0] <= yy) lo = m; else hi = m; }
    const t = (yy - a[lo][0]) / Math.max(0.01, a[hi][0] - a[lo][0]);
    return a[lo][1] + (a[hi][1] - a[lo][1]) * t - 6.2;
  };
  const camps = ledges.filter((l) => l.camp);
  return { ledges, ropes, rocks, camps, summit, rockR, peakY: summit.cy + 28, seed };
}

export const topAt = (L, lx) => L.cy + L.slope * lx;
export function toLocal(L, x, z) {
  const dx = x - L.cx, dz = z - L.cz, c = Math.cos(L.ang), s = Math.sin(L.ang);
  return [dx * c + dz * s, -dx * s + dz * c];
}

const col = (y) => {
  const t = y / TOP_Y;
  const c = new THREE.Color();
  if (t < 0.18) c.set('#5f9e4a').lerp(new THREE.Color('#8a8f6a'), t / 0.18);
  else if (t < 0.6) c.set('#8a8f6a').lerp(new THREE.Color('#8b8f98'), (t - 0.18) / 0.42);
  else c.set('#8b8f98').lerp(new THREE.Color('#f2f6ff'), (t - 0.6) / 0.4);
  return c;
};

export function buildMountainMesh(M) {
  const g = new THREE.Group();
  // ana kaya gövdesi
  const seg = 36, rows = 90;
  const geo = new THREE.CylinderGeometry(1, 1, 1, seg, rows, true);
  const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
  const R = rng(M.seed + 77);
  const phase = [R() * 6, R() * 6, R() * 6];
  for (let k = 0; k < pos.count; k++) {
    const u = pos.getY(k) + 0.5; // 0..1
    const yy = -20 + u * (M.peakY + 20);
    const a = Math.atan2(pos.getZ(k), pos.getX(k));
    const n = Math.sin(a * 3 + phase[0] + u * 9) * 0.5 + Math.sin(a * 7 + phase[1] + u * 21) * 0.3 + Math.sin(a * 13 + phase[2] + u * 40) * 0.2;
    const rad = Math.max(2, M.rockR(Math.max(0, yy)) - 0.6 - (n * 0.5 + 0.5) * 1.8 + (yy < 0 ? -yy * 0.9 : 0));
    pos.setXYZ(k, Math.cos(a) * rad, yy, Math.sin(a) * rad);
    const c = col(Math.max(0, yy));
    const shade = 0.82 + 0.18 * n;
    colors.set([c.r * shade, c.g * shade, c.b * shade], k * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide })));
  // zirve kepi
  const cap = new THREE.Mesh(new THREE.ConeGeometry(Math.max(6, M.rockR(M.peakY - 28) + 1), 30, 14), new THREE.MeshLambertMaterial({ color: 0xf6f9ff, flatShading: true }));
  cap.position.y = M.peakY - 14;
  g.add(cap);
  // çıkıntılar
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  for (const L of M.ledges) {
    const grp = new THREE.Group();
    const c = col(L.cy);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(L.hl * 2, 1.5, L.hw * 2), mat(L.kind === 'summit' ? 0xe8edf5 : L.camp ? 0xb98a52 : c.clone().multiplyScalar(0.72)));
    slab.position.y = -0.75;
    const topM = new THREE.Mesh(new THREE.BoxGeometry(L.hl * 2, 0.12, L.hw * 2), mat(L.camp ? 0xe0b25e : c));
    topM.position.y = 0.06;
    const inner = new THREE.Group();
    inner.add(slab, topM);
    inner.rotation.z = Math.atan(L.slope);
    grp.add(inner);
    grp.position.set(L.cx, L.cy, L.cz);
    grp.rotation.y = -L.ang;
    g.add(grp);
    if (L.camp && L.kind !== 'summit') {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.6, 4), mat(0xe4572e));
      tent.position.set(L.hl * 0.5, 1.3, 0);
      tent.rotation.y = Math.PI / 4;
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 0.1), mat(0xffffff));
      flag.position.set(-L.hl * 0.4, 2, L.hw * 0.5);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ color: 0x2fbf71, side: THREE.DoubleSide }));
      cloth.position.set(0.8, 1.4, 0);
      flag.add(cloth);
      grp.add(tent, flag);
    }
    if (L.kind === 'summit') {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 9, 0.2), mat(0xffffff));
      pole.position.set(0, 4.5, 0);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), new THREE.MeshBasicMaterial({ color: 0xffd84a, side: THREE.DoubleSide }));
      cloth.position.set(2.1, 3.4, 0);
      pole.add(cloth);
      grp.add(pole);
    }
  }
  return g;
}
