import * as THREE from 'three';
import { rng } from '../../zirve/game/mountain.js';

export { rng };
const TAU = Math.PI * 2;
export const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
export const B = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };

// ---------- insanlar ----------
export function makeFigure({ body = 0x3b6fd8, skin = 0xf0c8a0, hair = 0x3a2a1a, pants = 0x2a3350, scale = 1, astro = false } = {}) {
  const g = new THREE.Group(), u = g.userData;
  const bc = astro ? 0xf2f4f8 : body;
  g.add(mesh(new THREE.CapsuleGeometry(0.34, 0.5, 4, 8), M(bc), 0, 1.15, 0));
  const head = mesh(new THREE.SphereGeometry(0.3, 12, 10), M(skin), 0, 1.82, 0);
  g.add(head);
  if (astro) {
    g.add(mesh(new THREE.SphereGeometry(0.45, 14, 12), new THREE.MeshLambertMaterial({ color: 0x8ad0ff, transparent: true, opacity: 0.45 }), 0, 1.82, 0));
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.7, 0.22), M(0xc8ccd6), 0, 1.2, -0.38));
  } else {
    const h = mesh(new THREE.SphereGeometry(0.32, 10, 8, 0, TAU, 0, Math.PI * 0.55), M(hair), 0, 1.86, 0);
    g.add(h);
  }
  const limb = (x, y, w, h, c) => { const p = new THREE.Group(); p.position.set(x, y, 0); p.add(mesh(new THREE.BoxGeometry(w, h, w), M(c), 0, -h / 2, 0)); g.add(p); return p; };
  u.legL = limb(-0.17, 0.78, 0.2, 0.78, astro ? 0xe2e6ee : pants); u.legR = limb(0.17, 0.78, 0.2, 0.78, astro ? 0xe2e6ee : pants);
  u.armL = limb(-0.46, 1.5, 0.16, 0.62, bc); u.armR = limb(0.46, 1.5, 0.16, 0.62, bc);
  g.scale.setScalar(scale);
  return g;
}
export function animFigure(g, t, speed) {
  const u = g.userData, sw = Math.sin(t * 9) * Math.min(1, speed) * 0.8;
  u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.armL.rotation.x = -sw * 0.8; u.armR.rotation.x = sw * 0.8;
}

// ---------- uzaylılar ----------
export function makeAlien(type, color, s = 1) {
  const g = new THREE.Group(), u = g.userData;
  if (type === 'lumi') {
    const dome = mesh(new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI * 0.6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }), 0, 2, 0);
    g.add(dome);
    g.add(mesh(new THREE.SphereGeometry(0.42, 10, 8), B(0xffffff, { transparent: true, opacity: 0.85 }), 0, 1.95, 0));
    for (const x of [-0.3, 0.3]) g.add(mesh(new THREE.SphereGeometry(0.1, 6, 6), B(0x203050), x, 2.1, 0.78));
    const tent = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const t = new THREE.Group(); t.position.set(Math.cos(a) * 0.55, 1.6, Math.sin(a) * 0.55); t.add(mesh(new THREE.CylinderGeometry(0.06, 0.03, 1.5, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 }), 0, -0.75, 0)); g.add(t); tent.push(t); }
    u.tick = (t) => { g.position.y = 0.3 + Math.sin(t * 1.6 + g.position.x) * 0.25; tent.forEach((q, i) => { q.rotation.x = Math.sin(t * 2 + i) * 0.25; q.rotation.z = Math.cos(t * 2 + i * 1.3) * 0.25; }); dome.scale.setScalar(1 + Math.sin(t * 2) * 0.04); };
  } else if (type === 'korr') {
    const c = M(color), d = M(new THREE.Color(color).multiplyScalar(0.75).getHex());
    g.add(mesh(new THREE.BoxGeometry(1.7, 1.8, 1.2), c, 0, 1.6, 0));
    g.add(mesh(new THREE.BoxGeometry(1.1, 0.9, 1), d, 0, 2.95, 0));
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.18, 0.15), B(0xffb24a), 0, 3.0, 0.52));
    const armL = new THREE.Group(), armR = new THREE.Group();
    armL.position.set(-1.15, 2.3, 0); armR.position.set(1.15, 2.3, 0);
    armL.add(mesh(new THREE.BoxGeometry(0.55, 1.5, 0.6), d, 0, -0.7, 0)); armR.add(mesh(new THREE.BoxGeometry(0.55, 1.5, 0.6), d, 0, -0.7, 0));
    g.add(armL, armR);
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), d, -0.5, 0.45, 0), mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), d, 0.5, 0.45, 0));
    g.add(mesh(new THREE.OctahedronGeometry(0.28), B(0xff8a2a), 0, 1.7, 0.62));
    u.tick = (t) => { armL.rotation.x = Math.sin(t * 1.3) * 0.15; armR.rotation.x = -Math.sin(t * 1.3) * 0.15; };
  } else if (type === 'veli') {
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.26, 2.2, 6), M(0x3a9a4a), 0, 1.1, 0));
    const leaves = [];
    for (let i = 0; i < 4; i++) { const l = new THREE.Group(); l.position.y = 0.8 + i * 0.35; l.rotation.y = i * 1.7; const c = mesh(new THREE.ConeGeometry(0.28, 1.1, 5), M(0x58c060), 0.6, 0, 0); c.rotation.z = -Math.PI / 2 + 0.3; l.add(c); g.add(l); leaves.push(l); }
    const head = new THREE.Group(); head.position.y = 2.45; g.add(head);
    head.add(mesh(new THREE.SphereGeometry(0.34, 10, 8), M(0xffe9a8), 0, 0, 0));
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; const p = mesh(new THREE.ConeGeometry(0.22, 0.65, 5), M(color), Math.cos(a) * 0.5, 0.0, Math.sin(a) * 0.5); p.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); head.add(p); }
    for (const x of [-0.12, 0.12]) head.add(mesh(new THREE.SphereGeometry(0.06, 6, 6), B(0x203020), x, 0.05, 0.31));
    u.tick = (t) => { g.rotation.z = Math.sin(t * 1.2 + g.position.x) * 0.06; head.rotation.y = Math.sin(t * 0.8) * 0.4; leaves.forEach((l, i) => (l.rotation.y += Math.sin(t + i) * 0.003)); };
  } else { // nyx
    const core = mesh(new THREE.OctahedronGeometry(0.8), B(color, { transparent: true, opacity: 0.85 }), 0, 2, 0);
    g.add(core);
    g.add(mesh(new THREE.OctahedronGeometry(0.4), B(0xffffff), 0, 2, 0));
    const r1 = mesh(new THREE.TorusGeometry(1.25, 0.05, 6, 32), B(color, { transparent: true, opacity: 0.7 }), 0, 2, 0);
    const r2 = mesh(new THREE.TorusGeometry(1.6, 0.04, 6, 32), B(0xffffff, { transparent: true, opacity: 0.5 }), 0, 2, 0);
    g.add(r1, r2);
    g.add(mesh(new THREE.ConeGeometry(0.5, 1.2, 8, 1, true), B(color, { transparent: true, opacity: 0.18, side: THREE.DoubleSide }), 0, 0.6, 0));
    u.tick = (t) => { core.rotation.y = t; core.rotation.x = t * 0.5; r1.rotation.x = t * 0.9; r2.rotation.y = t * 0.7; r2.rotation.z = t * 0.3; g.position.y = 0.2 + Math.sin(t * 1.4 + g.position.x) * 0.2; };
  }
  g.scale.setScalar(s);
  return g;
}

// ---------- araçlar ----------
export function makeShip() {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(1, 14, 10), M(0xdfe5ee), 0, 1.5, 0); body.scale.set(2.8, 1, 1.5); g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.75, 12, 8), new THREE.MeshLambertMaterial({ color: 0x6cc4ff, transparent: true, opacity: 0.75 }), 1.2, 1.9, 0));
  g.add(mesh(new THREE.BoxGeometry(3.2, 0.12, 0.7), M(0xe5483a), -0.2, 1.45, 1.35), mesh(new THREE.BoxGeometry(3.2, 0.12, 0.7), M(0xe5483a), -0.2, 1.45, -1.35));
  g.add(mesh(new THREE.BoxGeometry(0.15, 1.1, 0.9), M(0xe5483a), -2.4, 2.1, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.7, 8), B(0xffb24a), -2.9, 1.5, 0.5).rotateZ(Math.PI / 2), mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.7, 8), B(0xffb24a), -2.9, 1.5, -0.5).rotateZ(Math.PI / 2));
  for (const [x, z] of [[1.2, 0.8], [1.2, -0.8], [-1.4, 0]]) g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 5), M(0x6a7280), x, 0.55, z));
  g.userData.hatch = { x: 1.9, z: 0 };
  return g;
}
export function makeRocket() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1, 1.1, 7, 14), M(0xf4f6fa), 0, 3.5, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.7, 14), M(0xe5483a), 0, 4.6, 0));
  g.add(mesh(new THREE.ConeGeometry(1, 2.4, 14), M(0xe5483a), 0, 8.2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshLambertMaterial({ color: 0x6cc4ff }), 0, 5.9, 0.95));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; const f = mesh(new THREE.BoxGeometry(0.12, 2.2, 1.5), M(0xe5483a), Math.cos(a) * 1.25, 1.1, Math.sin(a) * 1.25); f.rotation.y = -a; g.add(f); }
  const flame = new THREE.Group(); flame.position.y = 0.2;
  const f1 = mesh(new THREE.ConeGeometry(0.9, 4, 10), B(0xffb24a, { transparent: true, opacity: 0.9 }), 0, -2, 0); f1.rotation.x = Math.PI;
  const f2 = mesh(new THREE.ConeGeometry(0.5, 3, 10), B(0xfff2b0), 0, -1.5, 0); f2.rotation.x = Math.PI;
  flame.add(f1, f2); flame.visible = false; g.add(flame);
  g.userData.flame = flame;
  return g;
}

// ---------- gezegen / asteroit ----------
export function makePlanet(r, c1, c2, { atmo = 0x6fb8ff, ring = false, clouds = true, seed = 3 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(r, 4), pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const A = new THREE.Color(c1), Bc = new THREE.Color(c2), t = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / r, y = pos.getY(i) / r, z = pos.getZ(i) / r;
    const n = Math.sin(x * 3.1 + seed) + Math.sin(y * 4.3 + seed * 2) * 0.8 + Math.sin(z * 3.7 - seed) + Math.sin((x + y) * 7.1) * 0.35;
    t.copy(n > 0.5 ? Bc : A).multiplyScalar(0.88 + 0.12 * Math.sin(n * 5));
    col.set([t.r, t.g, t.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
  if (clouds) g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r * 1.025, 2), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, flatShading: true })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.1, 24, 16), new THREE.MeshBasicMaterial({ color: atmo, transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })));
  if (ring) { const rg = new THREE.Mesh(new THREE.RingGeometry(r * 1.5, r * 2.3, 64), new THREE.MeshBasicMaterial({ color: c2, transparent: true, opacity: 0.45, side: THREE.DoubleSide })); rg.rotation.x = Math.PI / 2 - 0.35; g.add(rg); }
  return g;
}
const hash3 = (x, y, z) => (Math.sin(x * 2.3 + 1) + Math.sin(y * 2.9 + 2) + Math.sin(z * 3.7 + 3)) / 3;
export function makeAsteroid(r, R) {
  const geo = new THREE.IcosahedronGeometry(r, 1), pos = geo.attributes.position;
  const s = R() * 10;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const f = 1 + 0.32 * hash3(x + s, y + s * 1.3, z + s * 0.7); pos.setXYZ(i, x * f, y * f * 0.9, z * f); }
  geo.computeVertexNormals();
  const shade = 0.5 + R() * 0.35;
  return new THREE.Mesh(geo, M(new THREE.Color(0.55 * shade + 0.1, 0.5 * shade + 0.07, 0.45 * shade + 0.05).getHex()));
}
export function makeStars(n = 1400, rad = 1800) {
  const R = rng(42), p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, b = Math.acos(2 * R() - 1);
    p.set([Math.sin(b) * Math.cos(a) * rad, Math.cos(b) * rad, Math.sin(b) * Math.sin(a) * rad], i * 3);
    const w = 0.6 + R() * 0.4, tint = R();
    c.set([w, w * (0.85 + tint * 0.15), tint > 0.7 ? 1 : w], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 3.4, vertexColors: true, sizeAttenuation: false, fog: false }));
}
export function makeMilkyWay() {
  const R = rng(9), n = 4200, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, rad = 1500, w = (R() + R() + R() - 1.5) * 260;
    p.set([Math.cos(a) * rad, w + Math.sin(a * 2) * 120 + 150, Math.sin(a) * rad], i * 3);
    const k = 0.55 + R() * 0.45; c.set([k, k * (0.8 + R() * 0.2), k * (0.65 + R() * 0.35)], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const mat = new THREE.PointsMaterial({ size: 3.2, vertexColors: true, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  return new THREE.Points(geo, mat);
}

// ---------- kokpit ----------
export function makeCockpit() {
  const g = new THREE.Group();
  const dark = M(0x2a3550), mid = M(0x44507a);
  const dash = mesh(new THREE.BoxGeometry(4.6, 0.6, 1.4), dark, 0, -1.15, -1.3); dash.rotation.x = -0.28; g.add(dash);
  const sc = [[-1.4, 0x5affc8], [-0.55, 0x5ab4ff], [0.4, 0xffb24a], [1.3, 0xff6a8a]];
  g.userData.screens = sc.map(([x, c]) => { const m = mesh(new THREE.PlaneGeometry(0.55, 0.32), B(c), x, -0.88, -1.66); m.rotation.x = -0.7; g.add(m); return m; });
  g.add(mesh(new THREE.BoxGeometry(0.22, 3.6, 0.3), mid, -2.3, 0, -1.5).rotateZ(0.32), mesh(new THREE.BoxGeometry(0.22, 3.6, 0.3), mid, 2.3, 0, -1.5).rotateZ(-0.32));
  g.add(mesh(new THREE.BoxGeometry(5, 0.24, 0.35), mid, 0, 1.38, -1.55));
  g.add(mesh(new THREE.BoxGeometry(1.6, 1.4, 1.1), dark, -2.1, -0.95, -1.2).rotateZ(-0.3), mesh(new THREE.BoxGeometry(1.6, 1.4, 1.1), dark, 2.1, -0.95, -1.2).rotateZ(0.3));
  const hang = new THREE.Group(); hang.position.set(0.65, 1.28, -1.4);
  hang.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.38, 3), B(0xdddddd), 0, -0.19, 0));
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), M(0xffd24a, { emissive: 0x6a4a00 })); star.scale.set(1, 1, 0.25); star.position.y = -0.45; hang.add(star);
  g.add(hang); g.userData.star = hang;
  return g;
}
