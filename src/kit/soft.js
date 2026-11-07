// Yumuşak stil: yuvarlak köşeli, düzgün gölgeli, boyalı doku; kutu yerine kapsül/küre/silindir.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { finish } from './core.js';
const gc = new Map(), mc = new Map();
const M = (c, o) => { const k = c + JSON.stringify(o || {}); if (!mc.has(k)) mc.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.65, metalness: 0.05, ...o })); return mc.get(k); };
const rb = (w, h, d, r = 0.04) => { const k = [w, h, d, r].join(); if (!gc.has(k)) gc.set(k, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1))); return gc.get(k); };
const add = (p, geo, mt, x = 0, y = 0, z = 0, rot) => { const m = new THREE.Mesh(geo, typeof mt === 'number' ? M(mt) : mt); m.position.set(x, y, z); if (rot) m.rotation.set(...rot); m.castShadow = true; p.add(m); return m; };
const R = (p, w, h, d, c, x, y, z, r = 0.04, rot) => add(p, rb(w, h, d, r), c, x, y, z, rot);
const cap = (p, rad, len, c, x, y, z, rot) => add(p, new THREE.CapsuleGeometry(rad, len, 4, 10), c, x, y, z, rot);
const cyl = (p, r1, r2, h, c, x, y, z, rot, seg = 14) => add(p, new THREE.CylinderGeometry(r1, r2, h, seg), c, x, y, z, rot);
const ball = (p, r, c, x, y, z) => add(p, new THREE.SphereGeometry(r, 14, 10), c, x, y, z);
const gl = () => M(0x7fb7e0, { transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.3 });

export function softCar({ color = 0x2f6fd0 } = {}) {
  const g = new THREE.Group(), body = M(color, { roughness: 0.35, metalness: 0.5 }), dark = M(0x15171a);
  R(g, 1.9, 0.55, 4.3, body, 0, 0.7, 0, 0.1); R(g, 1.84, 0.2, 1.2, body, 0, 0.98, -1.55, 0.08);
  R(g, 1.74, 0.55, 2.3, gl(), 0, 1.25, 0.4, 0.07); R(g, 1.68, 0.1, 2.2, body, 0, 1.56, 0.4, 0.05);
  for (const s of [-1, 1]) { R(g, 0.06, 0.62, 0.06, body, s * 0.85, 1.25, -0.72, 0.02, [-0.4, 0, 0]); R(g, 0.06, 0.62, 0.06, body, s * 0.85, 1.25, 1.5, 0.02, [0.3, 0, 0]); }
  R(g, 1.5, 0.12, 0.2, dark, 0, 0.5, -2.15, 0.05);
  for (const s of [-1, 1]) { for (const z of [-1.4, 1.4]) { const w = new THREE.Group(); w.position.set(s * 0.95, 0.38, z); const t = cyl(w, 0.38, 0.38, 0.3, dark, 0, 0, 0, [0, 0, Math.PI / 2], 18); cyl(w, 0.22, 0.22, 0.32, 0xc9ced4, 0, 0, 0, [0, 0, Math.PI / 2], 8); g.add(w); }
    R(g, 0.34, 0.18, 0.08, M(0xfff4c8, { emissive: 0xffe9a0, emissiveIntensity: 0.9 }), s * 0.65, 0.78, -2.17, 0.06); R(g, 0.34, 0.14, 0.08, M(0xff2a1a, { emissive: 0xff2a1a, emissiveIntensity: 0.8 }), s * 0.65, 0.78, 2.17, 0.06); }
  return finish(g, { h: 1.7, w: 2, d: 4.4 });
}
export function softRifle() {
  const g = new THREE.Group(), m = M(0x2b2e33, { metalness: 0.6, roughness: 0.4 }), wd = M(0x6a4326, { roughness: 0.6 });
  R(g, 0.07, 0.11, 0.6, m, 0, 0.04, -0.2, 0.025); cyl(g, 0.018, 0.018, 0.5, m, 0, 0.05, -0.75, [Math.PI / 2, 0, 0], 10); cyl(g, 0.03, 0.03, 0.12, m, 0, 0.05, -1.02, [Math.PI / 2, 0, 0], 10);
  R(g, 0.065, 0.13, 0.3, wd, 0, 0.0, 0.3, 0.03, [-0.12, 0, 0]); R(g, 0.055, 0.2, 0.07, m, 0, -0.12, -0.12, 0.02, [0.18, 0, 0]); R(g, 0.05, 0.14, 0.09, m, 0, -0.1, 0.12, 0.02, [0.3, 0, 0]);
  R(g, 0.05, 0.05, 0.28, m, 0, 0.14, -0.15, 0.02); cyl(g, 0.03, 0.03, 0.04, 0x6fb0e0, 0, 0.14, -0.3, [Math.PI / 2, 0, 0], 10);
  return finish(g, { h: 0.3, w: 0.1, d: 1.3 });
}
export function softHuman({ shirt = 0x3f6fb5, pants = 0x2c3140, skin = 0xe0ac86, hair = 0x2a1c12 } = {}) {
  const g = new THREE.Group(), sk = M(skin, { roughness: 0.8 });
  cap(g, 0.2, 0.45, M(shirt, { roughness: 0.85 }), 0, 1.25, 0); ball(g, 0.17, sk, 0, 1.78, 0); const h = ball(g, 0.185, M(hair, { roughness: 0.9 }), 0, 1.83, 0.03); h.scale.set(1, 0.85, 1);
  for (const s of [-1, 1]) { cap(g, 0.065, 0.5, M(shirt, { roughness: 0.85 }), s * 0.3, 1.2, 0, [0, 0, s * 0.1]); ball(g, 0.07, sk, s * 0.32, 0.88, 0); cap(g, 0.09, 0.6, M(pants, { roughness: 0.9 }), s * 0.12, 0.5, 0); R(g, 0.15, 0.09, 0.3, 0x1a1a1e, s * 0.12, 0.05, -0.05, 0.04); ball(g, 0.018, 0x111111, s * 0.06, 1.8, -0.16); }
  return finish(g, { h: 1.95, w: 0.7, d: 0.4 });
}
export function softMountain({ size = 40, h = 26, seed = 3 } = {}) {
  const geo = new THREE.IcosahedronGeometry(1, 5), pos = geo.attributes.position, col = [];
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6, rnd() * 6];
  const n = (x, y, z) => Math.sin(x * 2.1 + ph[0]) * Math.cos(z * 2.3 + ph[1]) * 0.5 + Math.sin(x * 4.7 + z * 3.9 + ph[2]) * 0.25 + Math.sin(x * 9 - z * 8 + ph[3]) * 0.1;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y < 0) y = -0.02; const r = Math.hypot(x, z), peak = Math.pow(Math.max(0, 1 - r * 0.95), 1.15);
    const yy = (y >= 0 ? peak * (1 + n(x, y, z) * 0.25) : 0) * h, k = 1 + n(x, 0, z) * 0.12;
    pos.setXYZ(i, x * size * 0.5 * k, yy, z * size * 0.5 * k);
    const t = yy / h, c = new THREE.Color(); if (t > 0.72) c.set(0xf2f6fa); else if (t > 0.35) c.set(0x7c7468).lerp(new THREE.Color(0x8d8578), n(x, y, z) + 0.5); else c.set(0x4f7a3a).lerp(new THREE.Color(0x6b7a44), n(z, y, x) + 0.5); col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); const g = new THREE.Group(); g.add(m);
  return finish(g, { h, w: size, d: size });
}
export function softTree({ h = 6 } = {}) {
  const g = new THREE.Group(); cyl(g, 0.18, 0.3, h * 0.45, M(0x6a4a2e, { roughness: 0.9 }), 0, h * 0.22, 0, undefined, 8);
  for (const [r, y, c] of [[h * 0.3, h * 0.55, 0x3f8a3a], [h * 0.24, h * 0.72, 0x4a9a44], [h * 0.2, h * 0.86, 0x58a850]]) { const b = ball(g, r, M(c, { roughness: 0.9 }), (Math.sin(y) * 0.2), y, Math.cos(y) * 0.2); b.scale.y = 0.85; }
  return finish(g, { h, w: 2.5, d: 2.5 });
}
export function softWolf() {
  const g = new THREE.Group(), c = M(0x7d7d86, { roughness: 0.9 });
  cap(g, 0.2, 0.7, c, 0, 0.75, 0, [Math.PI / 2, 0, 0]); ball(g, 0.2, c, 0, 0.92, -0.62); cap(g, 0.07, 0.15, M(0x56565c), 0, 0.86, -0.85, [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) { cone(g, s * 0.1, 1.15, -0.6, c); cap(g, 0.06, 0.4, M(0x56565c), s * 0.14, 0.32, -0.35); cap(g, 0.06, 0.4, M(0x56565c), s * 0.14, 0.32, 0.35); ball(g, 0.025, 0xffd040, s * 0.08, 0.98, -0.78); }
  cap(g, 0.05, 0.4, c, 0, 0.85, 0.7, [-0.9, 0, 0]);
  return finish(g, { h: 1.3, w: 0.5, d: 1.7 });
}
function cone(p, x, y, z, c) { add(p, new THREE.ConeGeometry(0.06, 0.16, 6), c, x, y, z); }
