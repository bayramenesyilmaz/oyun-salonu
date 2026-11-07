import * as THREE from 'three';
import { part, cyl, mat, emit, glass, finish } from './core.js';
import { K, texMat, tmat } from './tex.js';
export function road({ len = 20, w = 8, lines = true } = {}) {
  const g = new THREE.Group(); const t = K.road().clone(); t.needsUpdate = true; t.repeat.set(w / 8, len / 8);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshLambertMaterial({ map: lines ? t : K.asphalt() })); m.rotation.x = -Math.PI / 2; m.position.y = 0.01; m.receiveShadow = true; g.add(m);
  for (const s of [-1, 1]) part(g, 0.2, 0.18, len, 0xb0aaa0, s * (w / 2 + 0.1), 0.09, 0);
  return finish(g, { w, d: len, h: 0 });
}
export function sidewalk({ len = 20, w = 3 } = {}) { const g = new THREE.Group(); const t = K.paver().clone(); t.needsUpdate = true; t.repeat.set(w / 4, len / 4); const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, len), new THREE.MeshLambertMaterial({ map: t })); m.position.y = 0.1; m.receiveShadow = true; g.add(m); return finish(g, { w, d: len, h: 0.2 }); }
export function crossing({ w = 8 } = {}) { const g = new THREE.Group(); for (let i = 0; i < 7; i++) part(g, w, 0.02, 0.5, 0xe8e8e0, 0, 0.03, -1.7 + i * 0.57); return finish(g, { w, d: 4, h: 0 }); }
export function streetLamp({ on = true } = {}) {
  const g = new THREE.Group(); cyl(g, 0.1, 0.14, 5.6, 0x40454a, 0, 2.8, 0, 6); part(g, 1.4, 0.12, 0.12, 0x40454a, 0.6, 5.5, 0); part(g, 0.5, 0.15, 0.3, on ? emit(0xffe9a8) : 0x888888, 1.2, 5.42, 0); part(g, 0.4, 0.2, 0.4, 0x30343a, 0, 0.1, 0);
  return finish(g, { w: 0.5, d: 0.5, h: 5.7, light: { x: 1.2, y: 5.3, z: 0 }, boxes: [{ x: 0, z: 0, w: 0.3, d: 0.3, h: 5.6 }] });
}
export function trafficLight({ state = 'red' } = {}) {
  const g = new THREE.Group(); cyl(g, 0.1, 0.12, 4.4, 0x3a3e44, 0, 2.2, 0, 6); part(g, 0.4, 1.2, 0.35, 0x24272b, 0, 4.4, -0.1);
  [['red', 0xff3a2a, 4.8], ['yellow', 0xffc83a, 4.4], ['green', 0x3aff6a, 4.0]].forEach(([n, c, y]) => part(g, 0.22, 0.22, 0.05, n === state ? emit(c) : mat(0x2a2a2a), 0, y, -0.3));
  return finish(g, { w: 0.5, d: 0.5, h: 5, boxes: [{ x: 0, z: 0, w: 0.3, d: 0.3, h: 4.8 }] });
}
export function sign({ text = 'DUR', color = 0xc0261a } = {}) {
  const g = new THREE.Group(); cyl(g, 0.05, 0.05, 2.6, 0x707478, 0, 1.3, 0, 5);
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = '#' + color.toString(16).padStart(6, '0'); c.fillRect(0, 0, 64, 64); c.strokeStyle = '#fff'; c.lineWidth = 4; c.strokeRect(4, 4, 56, 56); c.fillStyle = '#fff'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText(text, 32, 38);
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.06), new THREE.MeshLambertMaterial({ map: t })); m.position.set(0, 2.5, -0.06); g.add(m);
  return finish(g, { w: 0.9, d: 0.2, h: 2.9 });
}
export function bench() { const g = new THREE.Group(); part(g, 1.8, 0.1, 0.5, 0x8a5a2a, 0, 0.5, 0); part(g, 1.8, 0.5, 0.08, 0x8a5a2a, 0, 0.85, 0.24); for (const s of [-1, 1]) part(g, 0.08, 0.5, 0.5, 0x2a2e33, s * 0.8, 0.25, 0); return finish(g, { w: 1.8, d: 0.6, h: 1.1, boxes: [{ x: 0, z: 0, w: 1.8, d: 0.6, h: 0.5 }] }); }
export function dumpster() { const g = new THREE.Group(); part(g, 2.2, 1.2, 1.2, 0x2f6a3f, 0, 0.8, 0); part(g, 2.3, 0.1, 1.3, 0x2a2e33, 0, 1.45, 0, [-0.15, 0, 0]); for (const s of [-1, 1]) part(g, 0.12, 0.2, 0.12, 0x222, s * 0.9, 0.1, 0.5); return finish(g, { w: 2.3, d: 1.3, h: 1.5, boxes: [{ x: 0, z: 0, w: 2.2, d: 1.2, h: 1.4 }] }); }
export function trashCan() { const g = new THREE.Group(); cyl(g, 0.3, 0.26, 0.9, 0x4a5058, 0, 0.45, 0, 8); cyl(g, 0.33, 0.33, 0.08, 0x30343a, 0, 0.94, 0, 8); return finish(g, { w: 0.7, d: 0.7, h: 1, boxes: [{ x: 0, z: 0, w: 0.6, d: 0.6, h: 0.95 }] }); }
export function hydrant() { const g = new THREE.Group(); cyl(g, 0.16, 0.2, 0.7, 0xc0261a, 0, 0.35, 0, 8); cyl(g, 0.2, 0.2, 0.1, 0xc0261a, 0, 0.75, 0, 8); part(g, 0.5, 0.12, 0.12, 0xa01e14, 0, 0.5, 0); return finish(g, { w: 0.5, d: 0.5, h: 0.9 }); }
export function busStop() { const g = new THREE.Group(); for (const s of [-1, 1]) part(g, 0.12, 2.4, 0.12, 0x40454a, s * 1.5, 1.2, 0); part(g, 3.4, 0.15, 1.5, 0x30639a, 0, 2.45, 0); part(g, 3.0, 1.6, 0.06, glass(), 0, 1.3, 0.7); part(g, 2.2, 0.1, 0.5, 0x8a5a2a, 0, 0.5, 0.35); return finish(g, { w: 3.4, d: 1.5, h: 2.5 }); }
export function mailbox() { const g = new THREE.Group(); part(g, 0.5, 0.8, 0.4, 0x2f5fa0, 0, 0.9, 0); part(g, 0.1, 0.5, 0.1, 0x555, 0, 0.25, 0); return finish(g, { w: 0.5, d: 0.4, h: 1.3 }); }
export function barrier({ len = 3 } = {}) { const g = new THREE.Group(); for (let i = 0; i < 6; i++) part(g, len / 6, 0.4, 0.15, i % 2 ? 0xf0f0e8 : 0xd8402a, -len / 2 + len / 12 + i * len / 6, 0.9, 0); for (const s of [-1, 1]) part(g, 0.1, 1.0, 0.1, 0x555a60, s * (len / 2 - 0.1), 0.5, 0); return finish(g, { w: len, d: 0.3, h: 1.1, boxes: [{ x: 0, z: 0, w: len, d: 0.3, h: 1.1 }] }); }
export function fountain() { const g = new THREE.Group(); const m = tmat('concrete', K.concrete()); part(g, 4, 0.6, 4, m, 0, 0.3, 0); part(g, 3.4, 0.1, 3.4, 0x3a8fc8, 0, 0.55, 0); part(g, 0.6, 1.6, 0.6, m, 0, 1.1, 0); part(g, 1.8, 0.2, 1.8, m, 0, 1.9, 0); return finish(g, { w: 4, d: 4, h: 2, boxes: [{ x: 0, z: 0, w: 4, d: 4, h: 0.6 }] }); }
