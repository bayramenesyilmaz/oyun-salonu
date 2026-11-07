import * as THREE from 'three';
import { T } from '../games/operasyon/game/tex.js';
// Kitin ek dokuları (pikselli, küçük canvas). Operasyon dokuları T ile birlikte kullanılır.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function mk(size, draw, seed = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'); draw(c, size, rng(seed));
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const sh = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
function speckle(c, size, r, base, cell = 4, amp = 0.16) { for (let y = 0; y < size; y += cell) for (let x = 0; x < size; x += cell) { c.fillStyle = sh(base, 1 + (r() - 0.5) * amp * 2); c.fillRect(x, y, cell, cell); } }
const cache = {}; const once = (k, f) => cache[k] || (cache[k] = f());
export const K = {
  ...T,
  grass: () => once('grass', () => mk(64, (c, s, r) => { speckle(c, s, r, 0x4f8a3a, 4, 0.16); for (let i = 0; i < 14; i++) { c.fillStyle = sh(0x74b04a, 0.9 + r() * 0.3); c.fillRect((r() * 15 | 0) * 4, (r() * 15 | 0) * 4, 4, 4); } }, 21)),
  sand: () => once('sand', () => mk(64, (c, s, r) => speckle(c, s, r, 0xcdb887, 4, 0.1), 22)),
  snow: () => once('snow', () => mk(64, (c, s, r) => speckle(c, s, r, 0xe8eef5, 4, 0.05), 23)),
  rock: () => once('rock', () => mk(64, (c, s, r) => { speckle(c, s, r, 0x777a80, 8, 0.2); speckle(c, s, r, 0x666a70, 4, 0.1); }, 24)),
  bark: () => once('bark', () => mk(32, (c, s, r) => { for (let x = 0; x < s; x += 4) { c.fillStyle = sh(0x6b4a2b, 0.7 + r() * 0.5); c.fillRect(x, 0, 4, s); } }, 25)),
  leaf: (hex) => once('leaf' + hex, () => mk(32, (c, s, r) => speckle(c, s, r, hex, 4, 0.22), hex & 255)),
  wood: (hex = 0xa0723a) => once('wood' + hex, () => mk(64, (c, s, r) => { for (let i = 0; i < 4; i++) { c.fillStyle = sh(hex, 0.85 + r() * 0.3); c.fillRect(0, i * 16, s, 16); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, i * 16, s, 1); } }, hex & 255)),
  tile: (hex = 0xd8d4c8) => once('tile' + hex, () => mk(64, (c, s, r) => { speckle(c, s, r, hex, 16, 0.05); c.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 4; i++) { c.fillRect(i * 16, 0, 1, s); c.fillRect(0, i * 16, s, 1); } }, 27)),
  roof: (hex = 0x9a4a36) => once('roof' + hex, () => mk(64, (c, s, r) => { for (let row = 0; row < 8; row++) { for (let x = 0; x < s; x += 8) { c.fillStyle = sh(hex, 0.8 + r() * 0.35); c.fillRect(x + (row % 2) * 4, row * 8, 8, 7); } } }, 28)),
  road: () => once('road', () => mk(64, (c, s, r) => { speckle(c, s, r, 0x55565c, 4, 0.08); c.fillStyle = '#e8d96a'; c.fillRect(30, 6, 4, 20); c.fillRect(30, 38, 4, 20); }, 29)),
  carpet: (hex = 0x7a3a3a) => once('carpet' + hex, () => mk(32, (c, s, r) => speckle(c, s, r, hex, 2, 0.1), hex & 255)),
  metal: (hex = 0x8a9098) => once('metal' + hex, () => mk(32, (c, s, r) => { for (let y = 0; y < s; y += 2) { c.fillStyle = sh(hex, 0.92 + r() * 0.16); c.fillRect(0, y, s, 2); } }, hex & 255)),
  fabric: (hex) => once('fab' + hex, () => mk(32, (c, s, r) => speckle(c, s, r, hex, 2, 0.1), hex & 255)),
  water: () => once('water', () => mk(64, (c, s, r) => { speckle(c, s, r, 0x2f7fb8, 8, 0.12); c.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 10; i++) c.fillRect((r() * 14 | 0) * 4, (r() * 16 | 0) * 4, 8, 2); }, 31)),
};
export const texMat = (map, extra) => new THREE.MeshLambertMaterial({ map, flatShading: true, ...extra });
const tm = {}; export const tmat = (key, map, extra) => tm[key] || (tm[key] = texMat(map, extra));
