// Ortak oyun kiti: blok (voxel) tarzı objeler. Ön yüz −Z, taban y=0, birim metre.
import * as THREE from 'three';
import { tiledBox } from '../games/operasyon/game/tex.js';
export { tiledBox };

const gcache = new Map(), mcache = new Map();
export const geo = (w, h, d) => { const k = w + ',' + h + ',' + d; if (!gcache.has(k)) gcache.set(k, new THREE.BoxGeometry(w, h, d)); return gcache.get(k); };
export const mat = (c, extra) => { const k = c + (extra ? JSON.stringify(extra) : ''); if (!mcache.has(k)) mcache.set(k, new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra })); return mcache.get(k); };
export const emit = (c, e = 0xffffff) => mat(c, { emissive: c, emissiveIntensity: 0.9 });
export const glass = () => mat(0x8fc4e8, { transparent: true, opacity: 0.55 });
// kutu parça: c renk (sayı) ya da malzeme
export function part(parent, w, h, d, c, x = 0, y = 0, z = 0, rot) {
  const m = new THREE.Mesh(geo(w, h, d), typeof c === 'number' ? mat(c) : c);
  m.position.set(x, y, z); if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  m.castShadow = true; parent.add(m); return m;
}
// dokulu kutu (döşemeli UV)
export function tpart(parent, w, h, d, material, x, y, z, tx = 4, ty = tx) {
  const m = new THREE.Mesh(tiledBox(w, h, d, tx, ty), material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
export function cyl(parent, rt, rb, h, c, x = 0, y = 0, z = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof c === 'number' ? mat(c) : c);
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export const pick = (r, a) => a[(r() * a.length) | 0];
// userData: boyut + çarpışma kutuları ([{x,z,w,d,h}], grup yerel uzayı) + isteğe bağlı anim
export function finish(g, info = {}) { g.userData = { ...g.userData, ...info }; return g; }
export function countTris(g) { let n = 0; g.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n | 0; }
