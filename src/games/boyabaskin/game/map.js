import * as THREE from 'three';
import { rng } from '../../zirve/game/mountain.js';

export const HX = 44, HZ = 66;           // saha yarı boyutları
export const BASE_Z = 57, BASE_R = 6.5;  // takım üsleri: takım 0 (kırmızı) +z, takım 1 (mavi) -z
export const CAGE = { x: 0, z: 0, r: 1.8, free: 3.6 };
export const TEAM = [{ name: 'Kırmızı', color: 0xe5483a, css: '#ff6a5a' }, { name: 'Mavi', color: 0x2f7fd8, css: '#5aa0ff' }];
export const PALETTE = [0xffc23a, 0x3fc0a0, 0xff7a9a, 0x8a6aff, 0x7ad04a, 0xff9a3a];

// Saha: iki yarı simetrik (aynı seed = herkeste aynı harita). box: {x,z,w,d,h,color,kind}
export function buildMapData() {
  const R = rng(20261107);
  const half = [];
  const free = (x, z, w, d, m = 2.8) => half.every((b) => Math.abs(b.x - x) > (b.w + w) / 2 + m || Math.abs(b.z - z) > (b.d + d) / 2 + m) && Math.hypot(x, z) > 11;
  const put = (o) => { half.push(o); return o; };
  // elle yerleştirilen ana parçalar
  put({ x: -20, z: 32, w: 11, d: 3.2, h: 2.6, color: 0xd4503a, kind: 'container' });
  put({ x: 21, z: 34, w: 11, d: 3.2, h: 2.6, color: 0x3a7ad4, kind: 'container' });
  // iki katlı platform + basamaklar (zıplayarak çıkılır)
  put({ x: -23, z: 18, w: 9, d: 7, h: 2.2, color: 0xe0b23a, kind: 'plat' });
  put({ x: -23, z: 23.6, w: 3, d: 2.6, h: 1.05, color: 0xf0c85a, kind: 'step' });
  put({ x: 23, z: 18, w: 9, d: 7, h: 2.2, color: 0x3ab89a, kind: 'plat' });
  put({ x: 23, z: 23.6, w: 3, d: 2.6, h: 1.05, color: 0x5ad0b8, kind: 'step' });
  // üs önü siperleri
  put({ x: -9, z: 46, w: 2, d: 2, h: 3.4, color: 0x7a7f90, kind: 'pillar' });
  put({ x: 9, z: 46, w: 2, d: 2, h: 3.4, color: 0x7a7f90, kind: 'pillar' });
  // rastgele siperler
  const kinds = [
    { w: 3.2, d: 1.2, h: 1.15, kind: 'low' }, { w: 1.2, d: 3.2, h: 1.15, kind: 'low' }, { w: 6, d: 1, h: 3.4, kind: 'wall' }, { w: 1, d: 6, h: 3.4, kind: 'wall' },
    { w: 2.4, d: 2.4, h: 1.2, kind: 'crate' }, { w: 4, d: 4, h: 1.5, kind: 'bunker' },
  ];
  for (let i = 0, n = 0; n < 16 && i < 400; i++) {
    const k = kinds[Math.floor(R() * kinds.length)], x = (R() - 0.5) * 70, z = 5 + R() * 40;
    if (!free(x, z, k.w, k.d)) continue;
    n++; put({ x, z, w: k.w, d: k.d, h: k.h, color: PALETTE[Math.floor(R() * PALETTE.length)], kind: k.kind });
  }
  const boxes = [];
  half.forEach((b) => { boxes.push({ ...b }); boxes.push({ ...b, z: -b.z, color: b.kind === 'container' || b.kind === 'plat' || b.kind === 'step' ? swap(b.color) : b.color }); });
  // çevre duvarları
  const wall = (x, z, w, d) => boxes.push({ x, z, w, d, h: 7, color: 0x5a6074, kind: 'edge' });
  wall(0, HZ + 1, HX * 2 + 4, 2); wall(0, -HZ - 1, HX * 2 + 4, 2); wall(HX + 1, 0, 2, HZ * 2 + 4); wall(-HX - 1, 0, 2, HZ * 2 + 4);
  for (const b of boxes) { b.top = b.h; b.x0 = b.x - b.w / 2; b.x1 = b.x + b.w / 2; b.z0 = b.z - b.d / 2; b.z1 = b.z + b.d / 2; }
  // güç artışları (simetrik)
  const pk = [[-30, 10, 0], [30, 10, 1], [0, 24, 2], [-30, -10, 0], [30, -10, 1], [0, -24, 2]].map(([x, z, t], i) => ({ i, x, z, type: t }));
  return { boxes, pk };
}
function swap(c) { return c === 0xd4503a ? 0x3a7ad4 : c === 0x3a7ad4 ? 0xd4503a : c; }
export const PK = [{ n: 'HIZ', c: 0xffd23a, t: 'Hız' }, { n: 'KALKAN', c: 0x5ad0ff, t: 'Kalkan' }, { n: '3\'LÜ ATIŞ', c: 0xff6a9a, t: 'Üçlü atış' }];

// ---------- çarpışma ----------
export function groundAt(boxes, x, z, y, r = 0.35) {
  let g = 0;
  for (const b of boxes) { if (x > b.x0 - r * 0.5 && x < b.x1 + r * 0.5 && z > b.z0 - r * 0.5 && z < b.z1 + r * 0.5 && b.top <= y + 0.4 && b.top > g) g = b.top; }
  return g;
}
export function resolveXZ(boxes, p, r = 0.45) {
  for (let it = 0; it < 2; it++) for (const b of boxes) {
    if (p.y >= b.top - 0.06 || b.off) continue;
    const cx = Math.max(b.x0, Math.min(p.x, b.x1)), cz = Math.max(b.z0, Math.min(p.z, b.z1));
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += (dx / d) * (r - d); p.z += (dz / d) * (r - d); }
      else { const ex = Math.min(p.x - b.x0, b.x1 - p.x), ez = Math.min(p.z - b.z0, b.z1 - p.z); if (ex < ez) p.x += (p.x - b.x < 0 ? -1 : 1) * (ex + r); else p.z += (p.z - b.z < 0 ? -1 : 1) * (ez + r); }
    }
  }
}
export function inBox(boxes, x, y, z) { for (const b of boxes) if (!b.off && y < b.top && y > -0.2 && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return b; return null; }
export function los(boxes, a, b, ay = 1.4, by = 1.4) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), n = Math.ceil(d / 0.8);
  for (let i = 1; i < n; i++) { const t = i / n; if (inBox(boxes, a.x + dx * t, (a.y + ay) + ((b.y + by) - (a.y + ay)) * t, a.z + dz * t)) return false; }
  return true;
}

// ---------- görsel ----------
export function buildMapMesh(M) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  // zemin
  const gcv = document.createElement('canvas'); gcv.width = gcv.height = 128; const x = gcv.getContext('2d');
  x.fillStyle = '#6a8a4a'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#74964f'; x.fillRect(0, 0, 64, 64); x.fillRect(64, 64, 64, 64);
  const tex = new THREE.CanvasTexture(gcv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(26, 40); tex.magFilter = THREE.NearestFilter;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), new THREE.MeshLambertMaterial({ map: tex }));
  ground.rotation.x = -Math.PI / 2; g.add(ground);
  // orta çizgi ve baz alanları
  const line = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); line.rotation.x = -Math.PI / 2; line.position.y = 0.02; g.add(line);
  for (const t of [0, 1]) {
    const z = t === 0 ? BASE_Z : -BASE_Z;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(BASE_R, 28), new THREE.MeshBasicMaterial({ color: TEAM[t].color, transparent: true, opacity: 0.45 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.03, z); g.add(pad);
    const ring = new THREE.Mesh(new THREE.RingGeometry(BASE_R - 0.3, BASE_R, 36), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.04, z); g.add(ring);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), mat(0xdddddd)); pole.position.set(0, 3, z + (t === 0 ? 3 : -3)); g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshBasicMaterial({ color: TEAM[t].color, side: THREE.DoubleSide })); flag.position.set(1.2, 5.2, z + (t === 0 ? 3 : -3)); g.add(flag); g.userData['flag' + t] = flag;
    const arch = new THREE.Mesh(new THREE.BoxGeometry(BASE_R * 2 + 6, 0.8, 0.8), mat(TEAM[t].color)); arch.position.set(0, 7, z + (t === 0 ? 7.5 : -7.5)); g.add(arch);
  }
  // kutular
  for (const b of M.boxes) {
    if (b.kind === 'edge') { const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat(b.color)); m.position.set(b.x, b.h / 2, b.z); g.add(m); continue; }
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat(b.color)); m.position.set(b.x, b.h / 2, b.z); g.add(m);
    if (b.kind === 'container') { const st = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.05, 0.3, b.d + 0.05), mat(0xffffff)); st.position.set(b.x, b.h * 0.7, b.z); g.add(st); }
    if (b.kind === 'plat' || b.kind === 'bunker') { const t = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.96, 0.1, b.d * 0.96), mat(0xffffff)); t.position.set(b.x, b.h + 0.04, b.z); t.material.opacity = 0.3; t.material.transparent = true; g.add(t); }
  }
  // kafes
  const cage = new THREE.Group(); cage.position.set(CAGE.x, 0, CAGE.z);
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.6, 0.4, 24), mat(0xe8dcc0)); dais.position.y = 0.2; cage.add(dais);
  const barM = mat(0x333844);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 5), barM); bar.position.set(Math.cos(a) * CAGE.r, 1.9, Math.sin(a) * CAGE.r); cage.add(bar); }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(CAGE.r + 0.1, CAGE.r + 0.1, 0.12, 14), barM); top.position.y = 3.6; cage.add(top);
  g.add(cage); g.userData.cage = cage;
  // seyirci tribünleri + uzak dekor
  const R = rng(7);
  for (let i = 0; i < 46; i++) { const a = (i / 46) * Math.PI * 2, rx = 62 + R() * 6, rz = 84 + R() * 6; const h = 6 + R() * 16; const b = new THREE.Mesh(new THREE.BoxGeometry(5 + R() * 5, h, 5 + R() * 5), mat(R() > 0.5 ? 0x5a6a90 : 0x6a5a80)); b.position.set(Math.cos(a) * rx, h / 2 - 1, Math.sin(a) * rz); g.add(b); }
  for (let i = 0; i < 40; i++) { const a = R() * Math.PI * 2, rx = 52 + R() * 6, rz = 76 + R() * 6; const t = new THREE.Mesh(new THREE.ConeGeometry(2.6, 7, 6), mat(0x2f7a4a)); t.position.set(Math.cos(a) * rx, 3, Math.sin(a) * rz); g.add(t); }
  // spot ışıkları (parlak direkler)
  for (const [x, z] of [[-HX + 2, -HZ + 8], [HX - 2, -HZ + 8], [-HX + 2, HZ - 8], [HX - 2, HZ - 8]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 12, 6), mat(0x888d99)); p.position.set(x, 6, z); g.add(p); const l = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6d0 })); l.position.set(x, 12.3, z); g.add(l); }
  return g;
}
export function makeDuck() {
  const g = new THREE.Group(), y = new THREE.MeshLambertMaterial({ color: 0xffd23a, flatShading: true }), o = new THREE.MeshLambertMaterial({ color: 0xff8a2a, flatShading: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), y); body.scale.set(1, 0.85, 1.2); body.position.y = 0.7; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), y); head.position.set(0, 1.45, 0.35); g.add(head);
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), o); beak.position.set(0, 1.4, 0.78); g.add(beak);
  for (const x of [-0.16, 0.16]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshBasicMaterial({ color: 0x111111 })); e.position.set(x, 1.55, 0.7); g.add(e); }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 5), y); tail.rotation.x = -1.2; tail.position.set(0, 1.0, -0.8); g.add(tail);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.3, 8), new THREE.MeshLambertMaterial({ color: 0x8a5ad0 })); hat.position.set(0, 1.9, 0.3); g.add(hat);
  return g;
}
