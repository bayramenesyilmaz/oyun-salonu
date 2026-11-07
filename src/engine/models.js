// Ortak model + ses yükleyici. Modeller CC0 (Kenney/Quaternius), bkz. public/assets/manifest.json
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map(), done = new Map();
export function loadModel(name) {
  if (!cache.has(name)) cache.set(name, new Promise((res) => loader.load(`/assets/models/${name}.glb`, (g) => res(g), undefined, () => res(null))));
  return cache.get(name);
}
export async function preload(names) { const r = await Promise.all(names.map(loadModel)); return r.every(Boolean); }
// yüklenmişse klon döndürür (animasyon klipleriyle); yoksa null. height verilirse boy ayarlanır, taban y=0'a oturur.
export function cloneModel(name, height) {
  const g = done.get(name); if (!g || !g.__r) return null;
  const r = g.__r; const root = skClone(r.scene); const wrap = new THREE.Group(); wrap.add(root);
  if (height) { const s = height / r.h; root.scale.setScalar(s); root.position.y = -r.minY * s; }
  wrap.userData.clips = r.clips; return wrap;
}
export async function ready(name) {
  const g = await loadModel(name); if (!g) return false;
  if (!g.__r) { const box = new THREE.Box3().setFromObject(g.scene); g.__r = { scene: g.scene, clips: g.animations, h: Math.max(0.001, box.max.y - box.min.y), minY: box.min.y }; }
  done.set(name, g); return true;
}
export async function preloadAll(names) { const r = await Promise.all(names.map(ready)); return r.every(Boolean); }
export function mixerFor(wrap) {
  const m = new THREE.AnimationMixer(wrap), acts = {};
  for (const c of wrap.userData.clips || []) acts[c.name] = m.clipAction(c);
  return { m, acts, cur: null, play(n, fade = 0.2, loopOnce = false) { const a = acts[n]; if (!a || this.cur === a) return; a.reset(); if (loopOnce) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } a.fadeIn(fade).play(); if (this.cur) this.cur.fadeOut(fade); this.cur = a; } };
}

// ---- sesler ----
let ctx = null, on = true; const bufs = new Map();
export const setSamples = (v) => { on = v; };
function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } } return ctx; }
export async function preloadSfx(names) {
  const c = ac(); if (!c) return;
  await Promise.all(names.map(async (n) => { if (bufs.has(n)) return; try { const r = await fetch(`/assets/sfx/${n}.ogg`); bufs.set(n, await c.decodeAudioData(await r.arrayBuffer())); } catch { /* yok say */ } }));
}
export function play(n, vol = 0.6, rate = 1) {
  if (!on || !ctx || !bufs.has(n)) return false;
  try { if (ctx.state === 'suspended') ctx.resume(); const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufs.get(n); s.playbackRate.value = rate * (0.95 + Math.random() * 0.1); g.gain.value = vol; s.connect(g).connect(ctx.destination); s.start(); return true; } catch { return false; }
}
