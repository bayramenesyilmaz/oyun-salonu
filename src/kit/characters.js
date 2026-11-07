import * as THREE from 'three';
import { part, mat, finish } from './core.js';
import * as W from './weapons.js';
// Parametrik blok insan. Ön −Z, boy ~1.8 m. anim(dt, speed, state) yürüme/koşma, state: 'idle'|'walk'|'run'|'sit'|'dead'
const SK = [0xf1c9a5, 0xe0ac86, 0xc68a62, 0x8d5a3a, 0x5a3a26];
const OUT = {
  sivil: { shirt: 0x4a78b8, pants: 0x3a3f4a, shoe: 0x2a2420, hair: 0x2a1c12 },
  asker: { shirt: 0x56653a, pants: 0x4a5636, shoe: 0x1c1c18, hair: 0x2a1c12, helmet: 0x4a5636, vest: 0x3a4630, weapon: 'rifle' },
  polis: { shirt: 0x1f3f8a, pants: 0x1c2a52, shoe: 0x15151a, hair: 0x2a1c12, cap: 0x15244a, weapon: 'pistol' },
  soyguncu: { shirt: 0x2a2a30, pants: 0x1c1c22, shoe: 0x15151a, hair: 0x2a1c12, mask: 0x15151a, weapon: 'smg' },
  gardiyan: { shirt: 0x6a7a8a, pants: 0x2a3340, shoe: 0x15151a, hair: 0x2a1c12, cap: 0x2a3340, weapon: 'baton' },
  doktor: { shirt: 0xf2f2f0, pants: 0x4a8a9a, shoe: 0xe8e8e8, hair: 0x4a3322 },
  asci: { shirt: 0xf8f8f4, pants: 0x3a3a3a, shoe: 0x15151a, hair: 0x2a1c12, cap: 0xf8f8f4 },
  kasiyer: { shirt: 0xc0392b, pants: 0x2a2f3a, shoe: 0x15151a, hair: 0x6a4a28 },
  mahkum: { shirt: 0xe07a1a, pants: 0xe07a1a, shoe: 0x2a2420, hair: 0x2a1c12 },
  ajan: { shirt: 0x15151a, pants: 0x15151a, shoe: 0x0a0a0c, hair: 0x2a1c12, tie: 0x8a1a1a, weapon: 'pistol' },
  patron: { shirt: 0xe8e4d8, pants: 0x2a2a38, shoe: 0x15151a, hair: 0x8a8a8a, tie: 0x1f3f8a },
  turist: { shirt: 0xf0c030, pants: 0x3a8aa0, shoe: 0xe8e8e8, hair: 0x6a4a28, cap: 0xd05a2a },
};
export const OUTFITS = Object.keys(OUT);
export function human({ outfit = 'sivil', skin = 1, seed, female = false, shirt, pants, hair, weapon } = {}) {
  const o = { ...OUT[outfit], ...(shirt != null && { shirt }), ...(pants != null && { pants }), ...(hair != null && { hair }) };
  const sc = SK[skin % SK.length], g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const torso = new THREE.Group(); torso.position.y = 1.05; body.add(torso);
  part(torso, female ? 0.42 : 0.5, 0.6, 0.26, o.shirt, 0, 0.3, 0);
  if (o.vest) part(torso, 0.54, 0.4, 0.3, o.vest, 0, 0.32, 0);
  if (o.tie) part(torso, 0.07, 0.34, 0.02, o.tie, 0, 0.35, -0.14);
  const head = new THREE.Group(); head.position.y = 0.72; torso.add(head);
  part(head, 0.26, 0.28, 0.26, sc, 0, 0.14, 0);
  part(head, 0.28, 0.1, 0.28, o.hair, 0, 0.28, 0.01); part(head, 0.28, 0.2, 0.06, o.hair, 0, 0.18, 0.12);
  if (female) { part(head, 0.3, 0.3, 0.08, o.hair, 0, 0.1, 0.14); }
  part(head, 0.05, 0.04, 0.02, 0x15151a, -0.06, 0.16, -0.135); part(head, 0.05, 0.04, 0.02, 0x15151a, 0.06, 0.16, -0.135);
  if (o.helmet) part(head, 0.32, 0.16, 0.32, o.helmet, 0, 0.27, 0);
  if (o.cap) { part(head, 0.3, 0.1, 0.3, o.cap, 0, 0.3, 0); part(head, 0.26, 0.03, 0.14, o.cap, 0, 0.26, -0.2); }
  if (o.mask) part(head, 0.28, 0.2, 0.28, o.mask, 0, 0.14, 0);
  const arm = (s) => { const a = new THREE.Group(); a.position.set(s * 0.32, 0.55, 0); part(a, 0.14, 0.55, 0.14, o.shirt, 0, -0.26, 0); part(a, 0.11, 0.12, 0.11, sc, 0, -0.58, 0); torso.add(a); return a; };
  const armL = arm(-1), armR = arm(1);
  const leg = (s) => { const l = new THREE.Group(); l.position.set(s * 0.13, 1.0, 0); part(l, 0.19, 0.9, 0.2, o.pants, 0, -0.45, 0); part(l, 0.2, 0.1, 0.3, o.shoe, 0, -0.95, -0.04); body.add(l); return l; };
  const legL = leg(-1), legR = leg(1);
  const wn = weapon === null ? null : (weapon ?? o.weapon);
  let wm = null;
  if (wn && W[wn]) { wm = W[wn](); wm.position.set(0, -0.5, -0.12); armR.add(wm); armR.rotation.x = -1.2; armL.rotation.x = -1.0; armL.rotation.y = 0.3; }
  let t = 0, last = 'idle';
  const armed = !!wm;
  const anim = (dt, speed = 0, state) => {
    const st = state || (speed > 4 ? 'run' : speed > 0.2 ? 'walk' : 'idle');
    if (st === 'dead') { g.rotation.x = Math.max(g.rotation.x - dt * 5, -Math.PI / 2); g.position.y = 0.2; return; }
    if (g.rotation.x !== 0 && st !== 'dead') { g.rotation.x = 0; g.position.y = 0; }
    if (st === 'sit') { legL.rotation.x = legR.rotation.x = -1.5; body.position.y = -0.45; return; } body.position.y = 0;
    const f = st === 'run' ? 11 : 7, a = st === 'run' ? 0.9 : st === 'walk' ? 0.55 : 0; t += dt * f;
    const s = Math.sin(t) * a; legL.rotation.x = s; legR.rotation.x = -s;
    if (!armed) { armL.rotation.x = -s * 0.9; armR.rotation.x = s * 0.9; } else { armR.rotation.x = -1.2 + Math.sin(t * 2) * 0.03 * a; }
    torso.position.y = 1.05 + Math.abs(Math.sin(t)) * 0.03 * (a > 0 ? 1 : 0) + (st === 'idle' ? Math.sin(performance.now() / 600) * 0.004 : 0);
  };
  return finish(g, { w: 0.6, d: 0.4, h: 1.85, anim, parts: { head, torso, armL, armR, legL, legR, weapon: wm }, outfit });
}
export const civilian = (o = {}) => human({ outfit: 'sivil', weapon: null, ...o });
export const soldier = (o = {}) => human({ outfit: 'asker', ...o });
export const police = (o = {}) => human({ outfit: 'polis', ...o });
export const robber = (o = {}) => human({ outfit: 'soyguncu', ...o });
export const guard = (o = {}) => human({ outfit: 'gardiyan', ...o });
export const doctor = (o = {}) => human({ outfit: 'doktor', weapon: null, ...o });
export const chef = (o = {}) => human({ outfit: 'asci', weapon: null, ...o });
export const cashier = (o = {}) => human({ outfit: 'kasiyer', weapon: null, ...o });
export const prisoner = (o = {}) => human({ outfit: 'mahkum', weapon: null, ...o });
export const agent = (o = {}) => human({ outfit: 'ajan', ...o });
export const boss = (o = {}) => human({ outfit: 'patron', weapon: null, ...o });
export const tourist = (o = {}) => human({ outfit: 'turist', weapon: null, ...o });
