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

// ---------- genişletilmiş yumuşak set ----------
import { OUT } from './characters.js';
const gloss = (c) => M(c, { roughness: 0.35, metalness: 0.5 });
const wheelG = (g, x, z, r = 0.38, w = 0.28) => { const wg = new THREE.Group(); wg.position.set(x, r, z); cyl(wg, r, r, w, 0x15171a, 0, 0, 0, [0, 0, Math.PI / 2], 18); cyl(wg, r * 0.55, r * 0.55, w + 0.02, 0xc9ced4, 0, 0, 0, [0, 0, Math.PI / 2], 8); g.add(wg); return wg; };
const lamps = (g, zf, zb, y = 0.78, x = 0.65) => { for (const s of [-1, 1]) { R(g, 0.34, 0.18, 0.08, M(0xfff4c8, { emissive: 0xffe9a0, emissiveIntensity: 0.9 }), s * x, y, zf, 0.06); R(g, 0.34, 0.14, 0.08, M(0xff2a1a, { emissive: 0xff2a1a, emissiveIntensity: 0.8 }), s * x, y, zb, 0.06); } };
function carBody(g, { color, len = 4.3, cab = 2.3, cabH = 0.55, cabZ = 0.4 }) {
  const body = gloss(color); R(g, 1.9, 0.55, len, body, 0, 0.7, 0, 0.1); R(g, 1.84, 0.2, len * 0.28, body, 0, 0.98, -len * 0.36, 0.08);
  R(g, 1.74, cabH, cab, gl(), 0, 0.98 + cabH / 2 + 0.02, cabZ, 0.07); R(g, 1.68, 0.1, cab - 0.1, body, 0, 0.98 + cabH + 0.1, cabZ, 0.05);
  for (const s of [-1, 1]) { R(g, 0.06, cabH + 0.1, 0.06, body, s * 0.85, 1.25, cabZ - cab / 2 + 0.05, 0.02, [-0.4, 0, 0]); R(g, 0.06, cabH + 0.1, 0.06, body, s * 0.85, 1.25, cabZ + cab / 2 - 0.05, 0.02, [0.3, 0, 0]); }
  const wh = []; for (const s of [-1, 1]) for (const z of [-len * 0.32, len * 0.32]) wh.push(wheelG(g, s * 0.95, z)); lamps(g, -len / 2 - 0.02, len / 2 + 0.02); return wh;
}
export function sCar({ type = 'sedan', color } = {}) {
  const C = color ?? { sedan: 0x2f6fd0, taksi: 0xf2c230, polis: 0x1f3f8a, suv: 0x2f6a4a }[type] ?? 0x2f6fd0, g = new THREE.Group();
  const big = type === 'suv'; const wheels = carBody(g, { color: C, len: big ? 4.6 : 4.3, cab: big ? 3.0 : 2.3, cabH: big ? 0.75 : 0.55, cabZ: big ? 0.7 : 0.4 });
  if (type === 'taksi') R(g, 0.7, 0.2, 0.3, M(0xfff2a0, { emissive: 0xffe070, emissiveIntensity: 0.8 }), 0, 1.78, 0.4, 0.05);
  if (type === 'polis') { R(g, 1.92, 0.3, 1.1, 0xf2f2f2, 0, 0.72, 0.5, 0.05); R(g, 0.4, 0.14, 0.25, M(0xff2a2a, { emissive: 0xff2020, emissiveIntensity: 1 }), -0.35, 1.8, 0.4, 0.04); R(g, 0.4, 0.14, 0.25, M(0x2a5aff, { emissive: 0x2050ff, emissiveIntensity: 1 }), 0.35, 1.8, 0.4, 0.04); }
  return finish(g, { w: 2, d: 4.6, h: 1.8, boxes: [{ x: 0, z: 0, w: 2, d: 4.6, h: 1.6 }], wheels });
}
export function sVan({ color = 0xe8e4d8 } = {}) { const g = new THREE.Group(); R(g, 2.0, 1.5, 5, gloss(color), 0, 1.15, 0, 0.12); R(g, 2.02, 0.5, 1.4, gl(), 0, 1.5, -1.6, 0.08); const wh = []; for (const s of [-1, 1]) for (const z of [-1.6, 1.6]) wh.push(wheelG(g, s * 1.0, z, 0.4)); lamps(g, -2.52, 2.52, 0.8, 0.7); return finish(g, { w: 2, d: 5, h: 2, boxes: [{ x: 0, z: 0, w: 2, d: 5, h: 1.9 }], wheels: wh }); }
export function sTruck({ color = 0xc0562a } = {}) { const g = new THREE.Group(); R(g, 2.3, 2.1, 1.8, gloss(color), 0, 1.6, -2.4, 0.15); R(g, 2.2, 0.9, 0.1, gl(), 0, 2.0, -3.3, 0.05); R(g, 2.4, 0.4, 7, 0x30343a, 0, 0.7, 0.2, 0.05); R(g, 2.4, 2.4, 4.6, 0xe8e4d8, 0, 2.1, 1.3, 0.1); const wh = []; for (const s of [-1, 1]) for (const z of [-2.4, 0.5, 2.5]) wh.push(wheelG(g, s * 1.2, z, 0.6, 0.4)); lamps(g, -3.32, 3.5, 1.0, 0.8); return finish(g, { w: 2.4, d: 7.2, h: 3.4, boxes: [{ x: 0, z: 0, w: 2.4, d: 7.2, h: 3.3 }], wheels: wh }); }
export function sBus({ color = 0x2f6fb5 } = {}) { const g = new THREE.Group(); R(g, 2.6, 2.6, 10, gloss(color), 0, 1.9, 0, 0.2); R(g, 2.62, 0.9, 9.2, gl(), 0, 2.2, 0, 0.1); R(g, 2.62, 0.3, 10, 0xe8e4d8, 0, 3.2, 0, 0.1); const wh = []; for (const s of [-1, 1]) for (const z of [-3.2, 3.2]) wh.push(wheelG(g, s * 1.3, z, 0.55, 0.4)); lamps(g, -5.02, 5.02, 0.9, 0.9); return finish(g, { w: 2.6, d: 10, h: 3.3, boxes: [{ x: 0, z: 0, w: 2.6, d: 10, h: 3.2 }], wheels: wh }); }
export function sMoto({ color = 0xc0261a } = {}) { const g = new THREE.Group(); const w1 = wheelG(g, 0, -0.8, 0.36, 0.16), w2 = wheelG(g, 0, 0.8, 0.36, 0.2); R(g, 0.3, 0.4, 1.0, gloss(color), 0, 0.8, -0.1, 0.1); R(g, 0.28, 0.12, 0.8, 0x15171a, 0, 1.02, 0.45, 0.05); cyl(g, 0.03, 0.03, 0.8, 0xc9ced4, 0, 0.7, -0.78, [0.3, 0, 0], 6); cyl(g, 0.025, 0.025, 0.8, 0x2a2c30, 0, 1.12, -0.88, [0, 0, Math.PI / 2], 6); ball(g, 0.1, M(0xfff4c8, { emissive: 0xffe9a0, emissiveIntensity: 0.9 }), 0, 0.98, -1.0); R(g, 0.3, 0.3, 0.5, 0x4a4e54, 0, 0.5, 0.1, 0.08); return finish(g, { w: 0.7, d: 2.2, h: 1.3, boxes: [{ x: 0, z: 0, w: 0.5, d: 2.1, h: 1.1 }], wheels: [w1, w2] }); }
export function sHeli({ color = 0x6f7a5a } = {}) { const g = new THREE.Group(), dark = M(0x3a3f46); const b = ball(g, 1.0, gloss(color), 0, 0.2, -0.6); b.scale.set(1, 0.9, 1.6); cap(g, 0.3, 4.5, gloss(color), 0, 0.5, 3.3, [Math.PI / 2, 0, 0]); const cp = ball(g, 0.8, gl(), 0, 0.35, -1.6); cp.scale.set(0.95, 0.75, 1); R(g, 0.14, 1.4, 0.8, gloss(color), 0, 1.1, 5.5, 0.05);
  for (const s of [-1, 1]) { cyl(g, 0.07, 0.07, 4.2, dark, s * 1.25, -1.3, 0.3, [Math.PI / 2, 0, 0], 8); cyl(g, 0.05, 0.05, 0.6, dark, s * 1.25, -1.0, -0.6, undefined, 6); cyl(g, 0.05, 0.05, 0.6, dark, s * 1.25, -1.0, 1.2, undefined, 6); }
  const rotor = new THREE.Group(); rotor.position.set(0, 1.4, 0.2); R(rotor, 11, 0.05, 0.35, dark, 0, 0, 0, 0.02); R(rotor, 0.35, 0.05, 11, dark, 0, 0, 0, 0.02); g.add(rotor); return finish(g, { w: 2.8, d: 11, h: 3, rotor, spinners: [rotor] }); }
export function sBike() { const g = new THREE.Group(); const w1 = wheelG(g, 0, -0.6, 0.35, 0.05), w2 = wheelG(g, 0, 0.6, 0.35, 0.05); const fr = 0x3a8a5a; cyl(g, 0.025, 0.025, 1.2, fr, 0, 0.78, 0, [Math.PI / 2, 0, 0], 6); cyl(g, 0.025, 0.025, 0.55, fr, 0, 0.62, -0.5, [0.3, 0, 0], 6); cyl(g, 0.02, 0.02, 0.5, 0x2a2c30, 0, 1.0, -0.6, [0, 0, Math.PI / 2], 6); R(g, 0.1, 0.05, 0.28, 0x2a2c30, 0, 0.98, 0.4, 0.02); return finish(g, { w: 0.5, d: 1.7, h: 1.1, wheels: [w1, w2] }); }

// ----- hayvanlar -----
function legsAnim(legs) { let t = 0; return (dt, sp = 1) => { t += dt * (2 + sp * 4); const s = Math.sin(t) * Math.min(1, sp) * 0.7; legs[0].rotation.x = s; legs[1].rotation.x = s; legs[2].rotation.x = -s; legs[3].rotation.x = -s; }; }
function animal({ len, h, w, leg, body, belly, legC = body, head = 0.2, hz, snout = 0.1, ear = 0.07, neck = 0, tail = 0.5, eyes = 0x111111, hy }) {
  const g = new THREE.Group(), c = M(body, { roughness: 0.9 }), lc = M(legC, { roughness: 0.9 }); const legs = [];
  [[-1, -1], [1, 1], [1, -1], [-1, 1]].forEach(([sx, sz]) => { const lg = new THREE.Group(); lg.position.set(sx * w * 0.32, leg, sz * len * 0.32); cap(lg, w * 0.11, leg - w * 0.2, lc, 0, -leg / 2, 0); g.add(lg); legs.push(lg); });
  const b = cap(g, h / 2 + 0.01, len - h, c, 0, leg + h * 0.4, 0, [Math.PI / 2, 0, 0]); b.scale.x = (w / h) * 1.0;
  let hy_ = hy ?? leg + h * 0.65, hz_ = hz ?? -len / 2 - head * 0.3, hoff = 0;
  if (neck) { const nz = -len * 0.4, ny = leg + h * 0.8; cap(g, h * 0.22, neck, c, 0, ny + Math.cos(0.6) * neck / 2, nz - Math.sin(0.6) * neck / 2, [0.6, 0, 0]); hz_ = nz - Math.sin(0.6) * (neck + 0.03) - head * 0.2; hy_ = ny + Math.cos(0.6) * (neck + 0.03); }
  const hd = ball(g, head, c, 0, hy_, hz_); hd.scale.set(0.9, 0.85, 1.1); const sn = cap(g, head * 0.45, head * 0.5, M(belly ?? body, { roughness: 0.9 }), 0, hy_ - head * 0.2, hz_ - head * 1.0, [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) { add(g, new THREE.ConeGeometry(ear, ear * 2.2, 5), c, s * head * 0.55, hy_ + head * 0.85, hz_ + 0.02); ball(g, head * 0.1, eyes, s * head * 0.42, hy_ + head * 0.15, hz_ - head * 0.8); }
  cap(g, 0.05, tail, c, 0, leg + h * 0.65, len / 2 + 0.05, [-0.9, 0, 0]);
  return finish(g, { w, d: len + 0.5, h: hy_ + head + 0.3, anim: legsAnim(legs) });
}
export const sDog = (o = {}) => animal({ len: 0.8, h: 0.35, w: 0.3, leg: 0.32, body: o.color ?? 0xb5844a, belly: 0xe0c498, head: 0.15, hz: -0.5, hy: 0.78 });
export const sCat = (o = {}) => animal({ len: 0.55, h: 0.22, w: 0.2, leg: 0.2, body: o.color ?? 0x8a8a8a, head: 0.11, hz: -0.33, hy: 0.5, ear: 0.045, tail: 0.5 });
export const sHorse = () => animal({ len: 1.9, h: 0.7, w: 0.65, leg: 0.95, body: 0x7a4a26, legC: 0x3a2a1a, head: 0.25, neck: 0.8, hz: -1.3, ear: 0.07 });
export const sCow = () => animal({ len: 1.7, h: 0.85, w: 0.9, leg: 0.6, body: 0xf0ece4, belly: 0xe0a0a0, legC: 0xd8d4cc, head: 0.26, neck: 0.2, hz: -1.1, snout: 0.15 });
export const sSheep = () => animal({ len: 0.9, h: 0.6, w: 0.6, leg: 0.4, body: 0xf2efe8, belly: 0x3a3330, legC: 0x3a3330, head: 0.15, hz: -0.55, hy: 0.85 });
export const sDeer = () => animal({ len: 1.2, h: 0.45, w: 0.4, leg: 0.75, body: 0xa5703a, belly: 0xe0c898, legC: 0x6a4a26, head: 0.14, neck: 0.5, hz: -0.8, ear: 0.07 });
export const sBear = () => animal({ len: 1.8, h: 0.95, w: 0.95, leg: 0.55, body: 0x4a3322, belly: 0x8a6a4a, legC: 0x33231a, head: 0.3, neck: 0.1, hz: -1.2, hy: 1.6 });
export const sBoar = () => animal({ len: 1.2, h: 0.5, w: 0.55, leg: 0.36, body: 0x5a4a3a, belly: 0x8a6a5a, legC: 0x3a2e24, head: 0.2, hz: -0.8, hy: 0.78 });
export const sChicken = () => { const g = new THREE.Group(); const b = ball(g, 0.2, M(0xf8f4ec), 0, 0.35, 0); b.scale.set(0.9, 1, 1.2); ball(g, 0.1, M(0xf8f4ec), 0, 0.6, -0.2); ball(g, 0.04, M(0xe03a2a), 0, 0.72, -0.2); for (const s of [-1, 1]) cyl(g, 0.015, 0.015, 0.2, M(0xf0a020), s * 0.07, 0.1, 0, undefined, 4); return finish(g, { w: 0.4, d: 0.6, h: 0.8 }); };
export function sBird({ color = 0x3a7ac0 } = {}) { const g = new THREE.Group(); const b = ball(g, 0.12, M(color), 0, 0.3, 0); b.scale.set(0.9, 0.9, 1.4); ball(g, 0.07, M(color), 0, 0.4, -0.18); const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 0.1, 0.34, 0); const wm = ball(w, 0.14, M(color), s * 0.16, 0, 0); wm.scale.set(1.8, 0.2, 1); g.add(w); return w; }); let t = 0; return finish(g, { w: 0.9, d: 0.6, h: 0.6, anim: (dt, sp = 1) => { t += dt * 14; wings.forEach((w, i) => { w.rotation.z = Math.sin(t) * 0.7 * (i ? -1 : 1) * Math.min(1, sp); }); } }); }

// ----- silahlar -----
export function sPistol() { const g = new THREE.Group(), m = M(0x2b2e33, { metalness: 0.6, roughness: 0.4 }); R(g, 0.05, 0.07, 0.24, m, 0, 0.03, -0.1, 0.015); R(g, 0.045, 0.13, 0.06, m, 0, -0.05, 0.0, 0.015, [0.2, 0, 0]); return finish(g, { h: 0.2, w: 0.1, d: 0.3 }); }
export function sSmg() { const g = new THREE.Group(), m = M(0x2b2e33, { metalness: 0.6, roughness: 0.4 }); R(g, 0.06, 0.1, 0.42, m, 0, 0.03, -0.15, 0.02); cyl(g, 0.016, 0.016, 0.2, m, 0, 0.04, -0.45, [Math.PI / 2, 0, 0], 8); R(g, 0.04, 0.22, 0.06, m, 0, -0.13, -0.1, 0.015); R(g, 0.05, 0.1, 0.05, m, 0, -0.08, 0.05, 0.015, [0.2, 0, 0]); return finish(g, { h: 0.3, w: 0.1, d: 0.7 }); }
export function sShotgun() { const g = new THREE.Group(), m = M(0x2b2e33, { metalness: 0.6, roughness: 0.4 }), wd = M(0x6a4326, { roughness: 0.6 }); cyl(g, 0.025, 0.025, 0.85, m, 0, 0.06, -0.4, [Math.PI / 2, 0, 0], 8); R(g, 0.07, 0.06, 0.28, wd, 0, 0.0, -0.5, 0.03); R(g, 0.06, 0.11, 0.34, wd, 0, -0.02, 0.22, 0.03, [-0.1, 0, 0]); R(g, 0.05, 0.1, 0.2, m, 0, 0.02, -0.04, 0.02); return finish(g, { h: 0.25, w: 0.1, d: 1.2 }); }
export function sKnife() { const g = new THREE.Group(); R(g, 0.025, 0.05, 0.14, 0x2a2018, 0, 0, 0, 0.012); R(g, 0.01, 0.045, 0.24, M(0xc8ccd2, { metalness: 0.8, roughness: 0.25 }), 0, 0, -0.18, 0.004); return finish(g, { h: 0.1, w: 0.05, d: 0.4 }); }
export function sBaton() { const g = new THREE.Group(); cyl(g, 0.02, 0.02, 0.5, 0x15151a, 0, 0, -0.1, [Math.PI / 2, 0, 0], 8); return finish(g, { h: 0.1, w: 0.05, d: 0.5 }); }
export function sGrenade() { const g = new THREE.Group(); ball(g, 0.05, M(0x4a5a32), 0, 0, 0); cyl(g, 0.02, 0.02, 0.03, 0x666b72, 0, 0.06, 0, undefined, 6); return finish(g, { h: 0.14, w: 0.1, d: 0.1 }); }
const WP = { rifle: softRifle, pistol: sPistol, smg: sSmg, baton: sBaton, shotgun: sShotgun, knife: sKnife };

// ----- insan (parça pivotlu, animasyonlu) -----
const SKIN = [0xf1c9a5, 0xe0ac86, 0xc68a62, 0x8d5a3a, 0x5a3a26];
export function sHuman({ outfit = 'sivil', skin = 1, female = false, shirt, pants, hair, weapon } = {}) {
  const o = { ...OUT[outfit], ...(shirt != null && { shirt }), ...(pants != null && { pants }), ...(hair != null && { hair }) };
  const sc = SKIN[skin % 5], g = new THREE.Group(), sk = M(sc, { roughness: 0.8 }), sh = M(o.shirt, { roughness: 0.85 }), pn = M(o.pants, { roughness: 0.9 });
  const body = new THREE.Group(); g.add(body); const torso = new THREE.Group(); torso.position.y = 1.05; body.add(torso);
  const tr = cap(torso, female ? 0.17 : 0.2, 0.34, sh, 0, 0.3, 0); tr.scale.z = 0.7; if (o.vest) { const v = cap(torso, 0.23, 0.26, M(o.vest, { roughness: 0.9 }), 0, 0.33, 0); v.scale.z = 0.75; } if (o.tie) R(torso, 0.06, 0.34, 0.02, o.tie, 0, 0.35, -0.15, 0.01);
  const head = new THREE.Group(); head.position.y = 0.76; torso.add(head); ball(head, 0.16, sk, 0, 0.14, 0); const hr = ball(head, 0.175, M(o.hair, { roughness: 0.9 }), 0, 0.19, 0.03); hr.scale.set(1, 0.85, 1); if (female) cap(head, 0.16, 0.2, M(o.hair, { roughness: 0.9 }), 0, 0.02, 0.1);
  for (const s of [-1, 1]) ball(head, 0.017, 0x111111, s * 0.06, 0.16, -0.15);
  if (o.helmet) { const hm = ball(head, 0.2, M(o.helmet, { roughness: 0.7 }), 0, 0.2, 0); hm.scale.set(1, 0.75, 1.05); }
  if (o.cap) { const cp = ball(head, 0.185, M(o.cap, { roughness: 0.8 }), 0, 0.22, 0); cp.scale.set(1, 0.6, 1); R(head, 0.22, 0.025, 0.14, o.cap, 0, 0.17, -0.2, 0.01); }
  if (o.mask) { const mk = ball(head, 0.172, M(o.mask), 0, 0.14, 0); mk.scale.set(1.02, 0.85, 1.02); R(head, 0.14, 0.03, 0.01, 0x888888, 0, 0.15, -0.17, 0.005); }
  const arm = (s) => { const a = new THREE.Group(); a.position.set(s * 0.29, 0.55, 0); cap(a, 0.065, 0.42, sh, 0, -0.27, 0); ball(a, 0.07, sk, 0, -0.55, 0); torso.add(a); return a; };
  const armL = arm(-1), armR = arm(1);
  const leg = (s) => { const l = new THREE.Group(); l.position.set(s * 0.12, 1.0, 0); cap(l, 0.09, 0.62, pn, 0, -0.45, 0); R(l, 0.15, 0.09, 0.3, o.shoe, 0, -0.95, -0.05, 0.04); body.add(l); return l; };
  const legL = leg(-1), legR = leg(1);
  const wn = weapon === null ? null : (weapon ?? o.weapon); let wm = null;
  if (wn && WP[wn]) { wm = WP[wn](); wm.position.set(0, -0.5, -0.12); armR.add(wm); armR.rotation.x = -1.2; armL.rotation.x = -1.0; armL.rotation.y = 0.3; }
  let t = 0; const armed = !!wm;
  const anim = (dt, speed = 0, state) => { const st = state || (speed > 4 ? 'run' : speed > 0.2 ? 'walk' : 'idle');
    if (st === 'dead') { g.rotation.x = Math.max(g.rotation.x - dt * 5, -Math.PI / 2); g.position.y = 0.2; return; } if (g.rotation.x !== 0) { g.rotation.x = 0; g.position.y = 0; }
    if (st === 'sit') { legL.rotation.x = legR.rotation.x = -1.5; body.position.y = -0.45; return; } body.position.y = 0;
    const a = st === 'run' ? 0.9 : st === 'walk' ? 0.55 : 0; t += dt * (st === 'run' ? 11 : 7); const s = Math.sin(t) * a; legL.rotation.x = s; legR.rotation.x = -s;
    if (!armed) { armL.rotation.x = -s * 0.9; armR.rotation.x = s * 0.9; } else armR.rotation.x = -1.2 + Math.sin(t * 2) * 0.03 * a;
    torso.position.y = 1.05 + Math.abs(Math.sin(t)) * 0.03 * (a > 0 ? 1 : 0); };
  return finish(g, { w: 0.6, d: 0.4, h: 1.9, anim, parts: { head, torso, armL, armR, legL, legR, weapon: wm }, outfit });
}
export const sCiv = (o = {}) => sHuman({ outfit: 'sivil', weapon: null, ...o });
