import * as THREE from 'three';
import { part, cyl, mat, emit, finish } from './core.js';
const M = 0x2a2c30, M2 = 0x4a4e54, W = 0x7a4a26;
// Namlu −Z yönüne bakar; elde tutma noktası orijin.
export function pistol() { const g = new THREE.Group(); part(g, 0.05, 0.07, 0.22, M, 0, 0.03, -0.1); part(g, 0.045, 0.12, 0.06, M2, 0, -0.04, 0.0, [0.2, 0, 0]); part(g, 0.03, 0.03, 0.04, M2, 0, 0.08, 0.0); return finish(g, { h: 0.2, w: 0.1, d: 0.3 }); }
export function rifle() { const g = new THREE.Group(); part(g, 0.06, 0.09, 0.7, M, 0, 0.04, -0.3); part(g, 0.04, 0.04, 0.35, M2, 0, 0.05, -0.8); part(g, 0.05, 0.16, 0.08, M2, 0, -0.08, -0.2, [0.15, 0, 0]); part(g, 0.06, 0.1, 0.26, 0x3a3f36, 0, 0.0, 0.22); part(g, 0.04, 0.05, 0.12, M2, 0, 0.13, -0.3); part(g, 0.05, 0.1, 0.05, M2, 0, -0.1, -0.5); return finish(g, { h: 0.3, w: 0.1, d: 1.2 }); }
export function shotgun() { const g = new THREE.Group(); part(g, 0.05, 0.05, 0.8, M2, 0, 0.06, -0.4); part(g, 0.07, 0.06, 0.28, W, 0, 0.0, -0.5); part(g, 0.06, 0.1, 0.34, W, 0, -0.02, 0.2); part(g, 0.05, 0.1, 0.18, M, 0, 0.02, -0.04); return finish(g, { h: 0.25, w: 0.1, d: 1.2 }); }
export function sniper() { const g = rifle(); part(g, 0.06, 0.07, 0.3, M, 0, 0.14, -0.3); cyl(g, 0.03, 0.03, 0.02, 0x6aa0d8, 0, 0.14, -0.46, 6).rotation.x = Math.PI / 2; return g; }
export function smg() { const g = new THREE.Group(); part(g, 0.06, 0.1, 0.4, M, 0, 0.03, -0.15); part(g, 0.04, 0.04, 0.18, M2, 0, 0.04, -0.45); part(g, 0.04, 0.2, 0.06, M2, 0, -0.12, -0.1); part(g, 0.05, 0.1, 0.05, M2, 0, -0.08, 0.05, [0.2, 0, 0]); return finish(g, { h: 0.3, w: 0.1, d: 0.7 }); }
export function knife() { const g = new THREE.Group(); part(g, 0.025, 0.05, 0.14, 0x2a2018, 0, 0, 0.0); part(g, 0.01, 0.045, 0.24, 0xc8ccd2, 0, 0.0, -0.18); return finish(g, { h: 0.1, w: 0.05, d: 0.4 }); }
export function baton() { const g = new THREE.Group(); cyl(g, 0.02, 0.02, 0.5, 0x15151a, 0, 0, -0.1, 6).rotation.x = Math.PI / 2; return finish(g, { h: 0.1, w: 0.05, d: 0.5 }); }
export function grenade() { const g = new THREE.Group(); const b = cyl(g, 0.045, 0.045, 0.1, 0x4a5a32, 0, 0, 0, 8); part(g, 0.03, 0.03, 0.03, M2, 0, 0.07, 0); part(g, 0.05, 0.015, 0.02, 0xc8ccd2, 0.03, 0.08, 0); return finish(g, { h: 0.14, w: 0.1, d: 0.1 }); }
export function bat() { const g = new THREE.Group(); cyl(g, 0.02, 0.045, 0.85, 0xc8a064, 0, 0, -0.2, 8).rotation.x = Math.PI / 2; return finish(g, { h: 0.1, w: 0.1, d: 0.85 }); }
export function flashlight() { const g = new THREE.Group(); cyl(g, 0.03, 0.03, 0.2, M, 0, 0, -0.05, 8).rotation.x = Math.PI / 2; cyl(g, 0.045, 0.03, 0.05, M2, 0, 0, -0.18, 8).rotation.x = Math.PI / 2; part(g, 0.05, 0.05, 0.01, emit(0xfff2c0), 0, 0, -0.205); return finish(g, { h: 0.1, w: 0.1, d: 0.3 }); }
