import * as THREE from 'three';
import { part, cyl, mat, emit, glass, finish } from './core.js';
const wheel = (g, x, y, z, r = 0.38, w = 0.28) => { const wg = new THREE.Group(); wg.position.set(x, y, z); const t = cyl(wg, r, r, w, 0x1c1d20, 0, 0, 0, 10); t.rotation.z = Math.PI / 2; const rim = cyl(wg, r * 0.5, r * 0.5, w + 0.02, 0xb8bcc2, 0, 0, 0, 6); rim.rotation.z = Math.PI / 2; g.add(wg); return wg; };
const lights = (g, z, front, y = 0.72, w = 0.9) => { for (const s of [-1, 1]) part(g, 0.3, 0.16, 0.06, front ? emit(0xfff2c0) : emit(0xff2a1a), s * w, y, z); };
// tip: sedan | taksi | polis | suv | minibüs
export function car({ type = 'sedan', color } = {}) {
  const C = color ?? { sedan: 0x3a6fb0, taksi: 0xf2c230, polis: 0x1f3f8a, suv: 0x2f6a4a, minibüs: 0xe8e4d8 }[type] ?? 0x3a6fb0;
  const g = new THREE.Group(), long = type === 'minibüs' ? 5 : type === 'suv' ? 4.6 : 4.3, hh = type === 'suv' || type === 'minibüs' ? 1.0 : 0.62;
  part(g, 1.9, 0.6, long, C, 0, 0.62, 0); // gövde
  part(g, 1.7, hh, type === 'minibüs' ? 4.4 : long * 0.52, C, 0, 0.92 + hh / 2 - 0.1, type === 'minibüs' ? 0.2 : 0.2); // kabin
  part(g, 1.72, hh * 0.7, long * 0.5 + 0.02, glass(), 0, 1.0 + hh / 2, 0.2); // camlar
  part(g, 1.76, 0.1, long * 0.48, C, 0, 0.92 + hh, 0.2); // tavan
  for (const s of [-1, 1]) { wheel(g, s * 0.95, 0.38, -long * 0.32); wheel(g, s * 0.95, 0.38, long * 0.32); }
  lights(g, -long / 2, true); lights(g, long / 2, false); part(g, 1.5, 0.14, 0.06, 0x2a2c30, 0, 0.5, -long / 2 - 0.02);
  if (type === 'taksi') { part(g, 0.7, 0.22, 0.3, emit(0xfff2a0), 0, 2.05, 0.2); part(g, 1.9, 0.1, 0.5, 0x15151a, 0, 0.75, 0.3); }
  if (type === 'polis') { part(g, 1.92, 0.3, long * 0.3, 0xf0f0f0, 0, 0.7, 0.9); part(g, 0.4, 0.15, 0.25, emit(0xff2a2a), -0.35, 2.05, 0.2); part(g, 0.4, 0.15, 0.25, emit(0x2a5aff), 0.35, 2.05, 0.2); }
  return finish(g, { w: 1.95, d: long, h: 1.8, boxes: [{ x: 0, z: 0, w: 1.95, d: long, h: 1.6 }], wheels: g.children.filter((c) => c.isGroup) });
}
export function truck({ color = 0xc0562a } = {}) { const g = new THREE.Group(); part(g, 2.3, 2.2, 1.8, color, 0, 1.6, -2.3); part(g, 2.2, 1.0, 0.1, glass(), 0, 2.0, -3.2); part(g, 2.4, 0.4, 7.0, 0x30343a, 0, 0.7, 0.2); part(g, 2.4, 2.4, 4.6, 0xe8e4d8, 0, 2.1, 1.3); for (const s of [-1, 1]) for (const z of [-2.4, 0.5, 2.5]) wheel(g, s * 1.2, 0.6, z, 0.6, 0.4); lights(g, -3.2, true, 1.0, 0.8); return finish(g, { w: 2.4, d: 7.2, h: 3.4, boxes: [{ x: 0, z: 0, w: 2.4, d: 7.2, h: 3.3 }], wheels: g.children.filter((c) => c.isGroup) }); }
export function bus({ color = 0x2f6fb5 } = {}) { const g = new THREE.Group(); part(g, 2.6, 2.6, 10, color, 0, 1.9, 0); part(g, 2.62, 0.9, 9.2, glass(), 0, 2.2, 0); part(g, 2.62, 0.3, 10, 0xe8e4d8, 0, 3.15, 0); for (const s of [-1, 1]) for (const z of [-3.2, 3.2]) wheel(g, s * 1.3, 0.55, z, 0.55, 0.4); lights(g, -5.0, true, 0.9, 0.9); return finish(g, { w: 2.6, d: 10, h: 3.3, boxes: [{ x: 0, z: 0, w: 2.6, d: 10, h: 3.2 }], wheels: g.children.filter((c) => c.isGroup) }); }
export function motorcycle({ color = 0xc0261a } = {}) { const g = new THREE.Group(); const w1 = wheel(g, 0, 0.36, -0.8, 0.36, 0.16), w2 = wheel(g, 0, 0.36, 0.8, 0.36, 0.2); part(g, 0.3, 0.4, 1.0, color, 0, 0.75, 0); part(g, 0.28, 0.12, 0.8, 0x15171a, 0, 1.0, 0.45); part(g, 0.08, 0.7, 0.08, 0xb8bcc2, 0, 0.7, -0.75, [0.3, 0, 0]); part(g, 0.7, 0.06, 0.06, 0x2a2c30, 0, 1.1, -0.9); part(g, 0.2, 0.16, 0.1, emit(0xfff2c0), 0, 0.95, -1.0); part(g, 0.3, 0.3, 0.5, 0x4a4e54, 0, 0.5, 0.1); return finish(g, { w: 0.7, d: 2.2, h: 1.3, boxes: [{ x: 0, z: 0, w: 0.5, d: 2.1, h: 1.1 }], wheels: [w1, w2] }); }
export function bicycle() { const g = new THREE.Group(); const w1 = wheel(g, 0, 0.35, -0.6, 0.35, 0.05), w2 = wheel(g, 0, 0.35, 0.6, 0.35, 0.05); part(g, 0.05, 0.05, 1.2, 0x3a8a5a, 0, 0.75, 0); part(g, 0.05, 0.5, 0.05, 0x3a8a5a, 0, 0.6, -0.5, [0.3, 0, 0]); part(g, 0.5, 0.05, 0.05, 0x2a2c30, 0, 1.0, -0.6); part(g, 0.2, 0.05, 0.3, 0x2a2c30, 0, 0.95, 0.4); return finish(g, { w: 0.5, d: 1.7, h: 1.1, wheels: [w1, w2] }); }
export function helicopter({ color = 0x7a8468 } = {}) {
  const g = new THREE.Group(), dark = mat(0x3a3f46);
  part(g, 2.0, 1.7, 4.6, color, 0, 0, 0); part(g, 1.6, 0.8, 1.5, mat(0x6aa0d8, { emissive: 0x16304a }), 0, 0.3, -2.5); part(g, 1.2, 1.1, 1.8, color, 0, 0.1, -2.1); part(g, 0.5, 0.5, 4.8, color, 0, 0.35, 4.4); part(g, 0.14, 1.5, 0.9, color, 0, 1.0, 6.6);
  for (const s of [-1, 1]) { part(g, 0.14, 0.14, 4.6, dark, s * 1.25, -1.3, 0.4); part(g, 0.14, 0.5, 0.14, dark, s * 1.25, -1.05, -0.4); part(g, 0.14, 0.5, 0.14, dark, s * 1.25, -1.05, 1.4); }
  const rotor = new THREE.Group(); rotor.position.set(0, 1.55, 0.4); part(rotor, 11, 0.05, 0.4, dark, 0, 0.05, 0); part(rotor, 0.4, 0.05, 11, dark, 0, 0.05, 0); g.add(rotor);
  const tail = new THREE.Group(); tail.position.set(0.3, 1.0, 6.6); part(tail, 0.05, 2.2, 0.25, dark, 0, 0, 0); g.add(tail);
  return finish(g, { w: 2.8, d: 12, h: 3, rotor, tail, spinners: [rotor] });
}
export function boat({ color = 0xe8e4d8 } = {}) { const g = new THREE.Group(); part(g, 2.4, 0.8, 6, 0x2f5f9a, 0, 0.4, 0); part(g, 2.2, 0.15, 5.8, color, 0, 0.85, 0); part(g, 1.6, 1.0, 1.8, color, 0, 1.4, 0.6); part(g, 1.5, 0.5, 0.05, glass(), 0, 1.6, -0.32); part(g, 0.1, 2.0, 0.1, 0x555a60, 0, 2.6, 0.6); part(g, 1.4, 0.7, 1.2, 0x2f5f9a, 0, 0.5, -3.2, [0, 0, 0]); return finish(g, { w: 2.4, d: 6.2, h: 3.5, boxes: [{ x: 0, z: 0, w: 2.4, d: 6, h: 1.2 }] }); }
export function tank({ color = 0x5a6a3e } = {}) { const g = new THREE.Group(); part(g, 3.4, 0.9, 6.4, color, 0, 0.9, 0); for (const s of [-1, 1]) part(g, 0.8, 0.9, 6.8, 0x2a2e26, s * 1.9, 0.55, 0); const tur = new THREE.Group(); tur.position.y = 1.7; part(tur, 2.4, 0.8, 2.8, color, 0, 0, 0.2); part(tur, 0.28, 0.28, 4.0, 0x3a3f36, 0, 0.1, -3.0); g.add(tur); return finish(g, { w: 4.4, d: 7, h: 2.3, tur, boxes: [{ x: 0, z: 0, w: 4.4, d: 6.8, h: 2 }] }); }
