import * as THREE from 'three';
import { part, cyl, mat, rng, pick, finish } from './core.js';
import { K, tmat, texMat } from './tex.js';
const barkM = () => tmat('bark', K.bark());
const leafM = (hex) => tmat('leaf' + hex, K.leaf(hex));
export function tree({ type = 'meşe', seed = 1, h } = {}) {
  const r = rng(seed), g = new THREE.Group();
  if (type === 'çam') {
    const H = h ?? 6 + r() * 3; cyl(g, 0.22, 0.3, H * 0.3, barkM(), 0, H * 0.15, 0, 6);
    for (let i = 0; i < 4; i++) { const k = 1 - i * 0.2, c = new THREE.Mesh(new THREE.ConeGeometry(1.7 * k, H * 0.34, 7), leafM(0x2f6a3c)); c.position.y = H * 0.32 + i * H * 0.17; c.castShadow = true; g.add(c); }
    return finish(g, { w: 3.4, d: 3.4, h: H, boxes: [{ x: 0, z: 0, w: 0.6, d: 0.6, h: H }] });
  }
  if (type === 'palmiye') {
    const H = h ?? 6 + r() * 2; for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.34, H / 6 + 0.05, 0.34), barkM()); s.position.set(Math.sin(i * 0.4) * 0.15 * i * 0.3, H / 12 + i * H / 6, 0); s.rotation.z = 0.04 * i; g.add(s); }
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, l = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.6), leafM(0x3f9a46)); l.position.set(Math.cos(a) * 1.2, H - 0.2, Math.sin(a) * 1.2); l.rotation.set(0, -a, -0.45); g.add(l); }
    return finish(g, { w: 3, d: 3, h: H, boxes: [{ x: 0, z: 0, w: 0.5, d: 0.5, h: H }] });
  }
  if (type === 'kuru') {
    const H = h ?? 4; cyl(g, 0.15, 0.3, H, barkM(), 0, H / 2, 0, 5); for (let i = 0; i < 3; i++) part(g, 0.1, 1.6, 0.1, 0x5a4026, 0.5, H * (0.5 + i * 0.14), 0, [0, i, -0.9 + i * 0.2]);
    return finish(g, { w: 2, d: 2, h: H, boxes: [{ x: 0, z: 0, w: 0.5, d: 0.5, h: H }] });
  }
  const H = h ?? 5 + r() * 2, col = pick(r, [0x4a8a3a, 0x3f7a35, 0x5a9a3a]);
  cyl(g, 0.28, 0.38, H * 0.5, barkM(), 0, H * 0.25, 0, 6);
  for (let i = 0; i < 4; i++) { const s = 2.2 + r() * 1.2; part(g, s, s * 0.8, s, leafM(col), (r() - 0.5) * 1.6, H * 0.6 + r() * H * 0.3, (r() - 0.5) * 1.6); }
  return finish(g, { w: 4, d: 4, h: H, boxes: [{ x: 0, z: 0, w: 0.7, d: 0.7, h: H }] });
}
export const bush = ({ seed = 1 } = {}) => { const r = rng(seed), g = new THREE.Group(); for (let i = 0; i < 3; i++) { const s = 0.9 + r() * 0.5; part(g, s, s * 0.8, s, leafM(0x3f7a35), (r() - 0.5) * 0.9, s * 0.4, (r() - 0.5) * 0.9); } return finish(g, { w: 1.8, d: 1.8, h: 1.2 }); };
export function rock({ seed = 1, size = 1.6 } = {}) { const r = rng(seed), g = new THREE.Group(), m = tmat('rock', K.rock()); for (let i = 0; i < 3; i++) { const s = size * (0.5 + r() * 0.6); part(g, s, s * 0.75, s * 0.9, m, (r() - 0.5) * size * 0.7, s * 0.37, (r() - 0.5) * size * 0.7, [0, r() * 3, 0]); } return finish(g, { w: size * 1.5, d: size * 1.5, h: size * 0.9, boxes: [{ x: 0, z: 0, w: size * 1.3, d: size * 1.3, h: size * 0.8 }] }); }
export function mountain({ size = 40, h = 28, seed = 1, snow = true } = {}) {
  const r = rng(seed), g = new THREE.Group(), m = tmat('rock', K.rock());
  for (let i = 0; i < 6; i++) { const s = size * (1 - i * 0.14), hh = h / 6 + 0.2; part(g, s * (0.85 + r() * 0.25), hh, s * (0.85 + r() * 0.25), i > 3 && snow ? tmat('snow', K.snow()) : m, (r() - 0.5) * 2, hh * i + hh / 2, (r() - 0.5) * 2); }
  return finish(g, { w: size, d: size, h });
}
export function caveEntrance() { const g = new THREE.Group(), m = tmat('rock', K.rock()); part(g, 4, 9, 6, m, -5, 4.5, 0); part(g, 4, 9, 6, m, 5, 4.5, 0); part(g, 14, 4, 6, m, 0, 7, 0); part(g, 6, 4.5, 5, 0x0a0a0c, 0, 2.2, 0.4); part(g, 16, 3, 7, m, 0, 10, 0.5); return finish(g, { w: 14, d: 6, h: 12, boxes: [{ x: -5, z: 0, w: 4, d: 6, h: 9 }, { x: 5, z: 0, w: 4, d: 6, h: 9 }] }); }
export function grassPatch({ w = 20, d = 20, kind = 'grass' } = {}) { const g = new THREE.Group(), map = { grass: K.grass(), sand: K.sand(), snow: K.snow(), dirt: K.dirt() }[kind] || K.grass(); const t = map.clone(); t.needsUpdate = true; t.repeat.set(w / 4, d / 4); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: t })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; g.add(m); return finish(g, { w, d, h: 0 }); }
export function water({ w = 20, d = 20 } = {}) { const g = new THREE.Group(), t = K.water().clone(); t.needsUpdate = true; t.repeat.set(w / 6, d / 6); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: t, transparent: true, opacity: 0.85 })); m.rotation.x = -Math.PI / 2; m.position.y = -0.1; g.add(m); return finish(g, { w, d, h: 0, anim: (dt, tt) => { t.offset.x += dt * 0.02; t.offset.y += dt * 0.012; } }); }
// orman: ağaçları tek grupta dağıt (rastgele, yarıçap içinde)
export function forest({ n = 30, radius = 16, seed = 1, types = ['meşe', 'çam'] } = {}) { const r = rng(seed), g = new THREE.Group(); for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * radius, t = tree({ type: pick(r, types), seed: seed * 100 + i }); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); t.rotation.y = r() * 6.28; g.add(t); } return finish(g, { w: radius * 2, d: radius * 2, h: 9 }); }
