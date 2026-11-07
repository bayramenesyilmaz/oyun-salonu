import * as THREE from 'three';
import { part, tpart, cyl, mat, glass, emit, rng, pick, finish } from './core.js';
import { K, tmat, texMat } from './tex.js';

const FH = 3.2; // kat yüksekliği
const facadeMats = (hex, lit, cols, rows) => {
  const side = new THREE.MeshLambertMaterial({ map: K.facade(hex, lit, cols, rows), emissiveMap: K.facadeEmit(lit, cols, rows), emissive: 0xffffff, flatShading: true });
  const roof = tmat('concrete', K.concrete());
  return [side, side, roof, roof, side, side];
};
// Pencereli bina: floors kat, w×d taban. style: 'ev' | 'apartman' | 'ofis' | 'banka' | 'dukkan'
export function building({ floors = 3, w = 12, d = 10, style = 'apartman', color, lit = 2, seed = 1 } = {}) {
  const r = rng(seed), g = new THREE.Group(), H = floors * FH;
  const hex = color ?? ({ ev: 0xd8c8a8, apartman: 0xc9b79c, ofis: 0x8a9aa8, banka: 0xd9d4c8, dukkan: 0xb98f6a }[style] || 0xc9b79c);
  const cols = Math.max(2, Math.round(w / 3.2)), rows = floors;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), facadeMats(hex, lit, cols, rows)); body.position.y = H / 2; body.castShadow = true; g.add(body);
  // Kat çizgileri ve çatı
  for (let i = 1; i < floors; i++) part(g, w + 0.2, 0.12, d + 0.2, 0x6f6a64, 0, i * FH, 0);
  part(g, w + 0.5, 0.35, d + 0.5, 0x6f6a64, 0, H + 0.17, 0);
  if (style === 'ev') { const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.6, 4), tmat('roof', K.roof())); roof.rotation.y = Math.PI / 4; roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); roof.position.y = H + 1.4; g.add(roof); }
  else {
    part(g, 1.6, 1.2, 1.6, 0x77716a, w * 0.25, H + 0.9, d * 0.2); // havalandırma
    cyl(g, 0.7, 0.7, 1.6, 0x8a8f94, -w * 0.25, H + 1.1, -d * 0.15, 8); // su deposu
    if (style === 'ofis') part(g, 0.1, 3, 0.1, 0x555a60, 0, H + 2, 0); // anten
  }
  // Giriş: kapı, saçak, basamak
  const door = new THREE.Group(); door.position.set(0, 0, -d / 2 - 0.02); g.add(door);
  part(door, 2.0, 2.4, 0.15, style === 'banka' ? 0x6a5a3a : 0x5a3b22, 0, 1.2, 0);
  part(door, 1.7, 1.2, 0.18, glass(), 0, 1.5, 0);
  part(door, 3.0, 0.2, 1.2, 0x55504a, 0, 2.7, -0.55);
  part(door, 3.0, 0.15, 1.0, 0x8d8a86, 0, 0.08, -0.5);
  if (style === 'banka') for (const s of [-1, 1]) cyl(g, 0.3, 0.3, 3.2, 0xe8e4d8, s * 2.2, 1.6, -d / 2 - 1.0, 10);
  if (style === 'dukkan') { part(g, w * 0.8, 2.2, 0.1, glass(), 0, 1.5, -d / 2 - 0.05); part(g, w * 0.85, 0.7, 0.4, pick(r, [0xc03a2f, 0x2f6fb5, 0x2f9a4a]), 0, 3.0, -d / 2 - 0.2); }
  if (style === 'banka') part(g, 3.5, 0.6, 0.3, 0xcfa840, 0, 3.4, -d / 2 - 0.2); // tabela
  return finish(g, { w, d, h: H + 1, boxes: [{ x: 0, z: 0, w, d, h: H }], door: { x: 0, z: -d / 2 - 0.6 } });
}
export const house = (o = {}) => building({ floors: 2, w: 9, d: 8, style: 'ev', ...o });
export const apartment = (o = {}) => building({ floors: 5, w: 14, d: 10, style: 'apartman', ...o });
export const office = (o = {}) => building({ floors: 8, w: 16, d: 14, style: 'ofis', lit: 2, ...o });
export const skyscraper = (o = {}) => building({ floors: 16, w: 16, d: 16, style: 'ofis', color: 0x6f8398, ...o });
export const shop = (o = {}) => building({ floors: 2, w: 10, d: 9, style: 'dukkan', ...o });
export const bank = (o = {}) => building({ floors: 3, w: 18, d: 14, style: 'banka', ...o });

// ---- modüler parçalar ----
export function wall({ w = 4, h = FH, t = 0.25, color = 0xc9b79c, door = false, window: win = false } = {}) {
  const g = new THREE.Group(), m = mat(color);
  if (door) { const sw = (w - 1.2) / 2; part(g, sw, h, t, m, -(w - sw) / 2, h / 2, 0); part(g, sw, h, t, m, (w - sw) / 2, h / 2, 0); part(g, 1.2, h - 2.2, t, m, 0, 2.2 + (h - 2.2) / 2, 0); }
  else if (win) { part(g, w, 0.9, t, m, 0, 0.45, 0); part(g, w, h - 2.1, t, m, 0, 2.1 + (h - 2.1) / 2, 0); part(g, 0.5, 1.2, t, m, -w / 2 + 0.25, 1.5, 0); part(g, 0.5, 1.2, t, m, w / 2 - 0.25, 1.5, 0); part(g, w - 1, 1.2, t * 0.3, glass(), 0, 1.5, 0); }
  else part(g, w, h, t, m, 0, h / 2, 0);
  return finish(g, { w, d: t, h, boxes: [{ x: 0, z: 0, w, d: t, h }] });
}
export function floorSlab({ w = 8, d = 8, tex = 'tile', color } = {}) {
  const g = new THREE.Group(); const map = tex === 'wood' ? K.wood() : tex === 'carpet' ? K.carpet() : K.tile();
  tpart(g, w, 0.25, d, texMat(map), 0, -0.125, 0, 2, 2); return finish(g, { w, d, h: 0.25 });
}
export function door({ open = 0, color = 0x6a4a2a } = {}) {
  const g = new THREE.Group(), leaf = new THREE.Group(); leaf.position.x = -0.5; g.add(leaf);
  part(leaf, 1.0, 2.1, 0.08, color, 0.5, 1.05, 0); part(leaf, 0.08, 0.08, 0.14, 0xd0b050, 0.85, 1.0, 0);
  part(g, 0.1, 2.2, 0.2, 0x3a2a1a, -0.55, 1.1, 0); part(g, 0.1, 2.2, 0.2, 0x3a2a1a, 0.55, 1.1, 0); part(g, 1.2, 0.1, 0.2, 0x3a2a1a, 0, 2.15, 0);
  leaf.rotation.y = -open * 1.5; return finish(g, { w: 1.2, d: 0.2, h: 2.2, leaf });
}
export function stairs({ steps = 16, w = 1.6, rise = 0.2, run = 0.28, color = 0x8d8a86 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < steps; i++) part(g, w, rise, run, color, 0, rise * i + rise / 2, -run * i - run / 2 + 0 + 0);
  const L = Math.hypot(steps * run, steps * rise), ang = Math.atan2(steps * rise, steps * run);
  const rail = part(g, 0.06, 0.06, L, 0x44464a, w / 2 + 0.03, steps * rise / 2 + 0.95, -steps * run / 2); rail.rotation.x = ang;
  return finish(g, { w, d: steps * run, h: steps * rise, rise, run, steps });
}
export function elevator({ floors = 2, open = 0 } = {}) {
  const g = new THREE.Group(), H = floors * FH + 0.6;
  part(g, 2.6, H, 0.2, 0x70767d, 0, H / 2, 1.2); part(g, 0.2, H, 2.6, 0x70767d, -1.2, H / 2, 0); part(g, 0.2, H, 2.6, 0x70767d, 1.2, H / 2, 0);
  const cab = new THREE.Group(); g.add(cab);
  part(cab, 2.0, 0.15, 2.0, 0x4a4e54, 0, 0.08, 0); part(cab, 2.0, 0.1, 2.0, 0x4a4e54, 0, 2.5, 0); part(cab, 1.9, 2.4, 0.1, 0x9aa0a6, 0, 1.3, 0.95);
  for (const s of [-1, 1]) part(cab, 0.9 - open * 0.7, 2.3, 0.08, 0xb8bec4, s * (0.5 + open * 0.6), 1.2, -0.98);
  part(cab, 0.12, 0.3, 0.05, emit(0x6ad06a), 1.2, 1.4, -0.9);
  return finish(g, { w: 2.6, d: 2.6, h: H, cab, boxes: [{ x: 0, z: 0, w: 2.6, d: 2.6, h: H }] });
}
export function fence({ len = 6, h = 1.2, color = 0x9a7a4a } = {}) {
  const g = new THREE.Group(); for (let x = 0; x <= len; x += 1.5) part(g, 0.14, h, 0.14, color, x - len / 2, h / 2, 0);
  part(g, len, 0.1, 0.06, color, 0, h * 0.8, 0); part(g, len, 0.1, 0.06, color, 0, h * 0.4, 0); return finish(g, { w: len, d: 0.2, h, boxes: [{ x: 0, z: 0, w: len, d: 0.3, h }] });
}
export function vault() { // banka kasası kapısı
  const g = new THREE.Group(); part(g, 3.6, 3.4, 0.6, 0x6a7078, 0, 1.7, 0); cyl(g, 1.2, 1.2, 0.3, 0x9aa0a6, 0, 1.7, -0.4, 20).rotation.x = Math.PI / 2;
  cyl(g, 0.3, 0.3, 0.2, 0xcfa840, 0, 1.7, -0.6, 8).rotation.x = Math.PI / 2; for (let i = 0; i < 4; i++) part(g, 0.1, 1.9, 0.1, 0xcfa840, 0, 1.7, -0.62, [0, 0, i * Math.PI / 4]);
  return finish(g, { w: 3.6, d: 0.6, h: 3.4 });
}
