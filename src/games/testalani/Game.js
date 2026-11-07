// Test Alanı: kit'in canlı demosu. Girilebilir bina, kırılabilir/patlayan objeler, sürülebilir araç, vahşi hayvanlar, mağara.
import * as THREE from 'three';
import { part, tpart, mat, glass, emit } from '../../kit/core.js';
import { K, tmat } from '../../kit/tex.js';
import { tree, rock, water } from '../../kit/nature.js';
import { barrel, crate, bed, table, sofa, wardrobe } from '../../kit/props.js';
import * as A from '../../kit/animals.js';
import * as H from '../../kit/characters.js';
import * as V from '../../kit/vehicles.js';
import * as W from '../../kit/weapons.js';
import * as MD from '../../engine/models.js';

const R = Math.random, rr = (a, b) => a + R() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const snd = (n, v = 0.5, r = 1) => { try { MD.play(n, v, r); } catch { /* ses yok */ } };
const BOXG = new THREE.BoxGeometry(1, 1, 1);

export class World {
  constructor(canvas, cb = {}) {
    this.cb = cb; this.canvas = canvas;
    const r = this.r = new THREE.WebGLRenderer({ canvas, antialias: false }); r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const sc = this.sc = new THREE.Scene(); sc.background = new THREE.Color(0x9ec7e8); sc.fog = new THREE.Fog(0x9ec7e8, 40, 170);
    this.cam = new THREE.PerspectiveCamera(70, 1, 0.08, 400); sc.add(this.cam);
    this.hemi = new THREE.HemisphereLight(0xdfeeff, 0x6a6a58, 1.15); sc.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(40, 80, 30); sc.add(sun);
    this.torch = new THREE.PointLight(0xffe8b0, 0, 16, 1.6); this.cam.add(this.torch);
    this.solids = []; this.objs = []; this.cre = []; this.cars = []; this.deb = []; this.fx = []; this.nades = []; this.pick = []; this.timers = [];
    this.in = { mx: 0, mz: 0, fire: false, jump: false, use: false, reload: false, nade: false };
    this.p = { x: 0, y: 0, z: 30, vy: 0, yaw: 0, pitch: 0, hp: 100, ammo: 30, res: 90, nades: 3, cd: 0, rl: 0, dead: false, car: null, kick: 0, shake: 0, dmgT: 0, hitT: 0, onGround: true };
    this.kills = 0; this.rep = 0; this.msg = ''; this.msgT = 0; this.noise = { x: 0, z: 0, t: -9, r: 0 }; this.time = 0; this.cave = 0; this.hudT = 0;
    this.build();
    this.vm = W.rifle(); this.vm.scale.setScalar(0.55); this.vm.position.set(0.2, -0.17, -0.3); this.vm.rotation.y = 0.05; this.cam.add(this.vm);
    this.flash = part(this.vm, 0.12, 0.12, 0.05, emit(0xffd060), 0, 0.05, -1.0); this.flash.visible = false;
    this.resize(); this.last = performance.now(); this.acc = 0; this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
    MD.preloadSfx && MD.preloadSfx(['shoot', 'hit', 'hurt', 'kill', 'big_kill', 'impact', 'coin', 'downed', 'confirm']).catch(() => {});
  }
  resize() { const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight; this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  destroy() { cancelAnimationFrame(this.raf); this.r.dispose(); }
  say(t, s = 2.5) { this.msg = t; this.msgT = s; }

  // ---------- dünya kurma ----------
  addSolid(cx, cy, cz, w, h, d, owner) { const s = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2, z0: cz - d / 2, z1: cz + d / 2, owner }; this.solids.push(s); return s; }
  box(cx, y0, cz, w, h, d, material, o = {}) {
    const s = this.addSolid(cx, y0 + h / 2, cz, w, h, d, o.owner);
    const m = o.mat ? new THREE.Mesh(BOXG, material) : tpart(this.sc, w, h, d, material, cx, y0 + h / 2, cz, Math.max(1, Math.round(Math.max(w, d) / 2)), Math.max(1, Math.round(h / 2)));
    if (o.mat) { m.scale.set(w, h, d); m.position.set(cx, y0 + h / 2, cz); this.sc.add(m); }
    s.vis = m; return s;
  }
  removeSolid(s) { if (s.vis) this.sc.remove(s.vis); const i = this.solids.indexOf(s); if (i >= 0) this.solids.splice(i, 1); }
  wall(axis, c, a0, a1, y0, h, ops, material, t = 0.4) {
    const seg = (p0, p1, b0, b1, mt = material, glassOwner) => { if (p1 - p0 < 0.05 || b1 - b0 < 0.05) return; const L = p1 - p0, m = (p0 + p1) / 2;
      const o = glassOwner ? { mat: true, owner: glassOwner } : {};
      if (axis === 'x') this.box(m, b0, c, L, b1 - b0, glassOwner ? 0.12 : t, mt, o); else this.box(c, b0, m, glassOwner ? 0.12 : t, b1 - b0, L, mt, o); };
    let cur = a0; ops.sort((a, b) => a.a - b.a);
    for (const op of ops) { const p0 = op.a - op.w / 2, p1 = op.a + op.w / 2; seg(cur, p0, y0, y0 + h); seg(p0, p1, y0, y0 + op.b0); seg(p0, p1, y0 + op.b1, y0 + h);
      if (op.glass) { const ob = { type: 'glass', hp: 1 }; this.objs.push(ob); const sol = axis === 'x' ? this.addSolid(op.a, y0 + (op.b0 + op.b1) / 2, c, op.w, op.b1 - op.b0, 0.12, ob) : this.addSolid(c, y0 + (op.b0 + op.b1) / 2, op.a, 0.12, op.b1 - op.b0, op.w, ob);
        const m = new THREE.Mesh(BOXG, glass()); m.scale.set(axis === 'x' ? op.w : 0.1, op.b1 - op.b0, axis === 'x' ? 0.1 : op.w); m.position.set(axis === 'x' ? op.a : c, y0 + (op.b0 + op.b1) / 2, axis === 'x' ? c : op.a); this.sc.add(m); sol.vis = m; ob.solid = sol; ob.color = 0x9fd0f0; } cur = p1; }
    seg(cur, a1, y0, y0 + h);
  }
  prop(obj, x, y, z, rotY = 0) { obj.position.set(x, y, z); obj.rotation.y = rotY; this.sc.add(obj); const bx = obj.userData.boxes; if (bx) for (const b of bx) { const sw = Math.abs(rotY) > 1 ? [b.d, b.w] : [b.w, b.d]; this.addSolid(x + b.x, y + b.h / 2, z + b.z, sw[0], b.h, sw[1]); } return obj; }
  barrelAt(x, z, y = 0, color) { const m = barrel({ color: color ?? [0x2f6a8a, 0xa83a2a, 0xc8a030][(R() * 3) | 0] }); m.position.set(x, y, z); this.sc.add(m); const ob = { type: 'barrel', hp: 30, mesh: m, color: 0xa83a2a, x, y, z }; ob.solid = this.addSolid(x, y + 0.5, z, 0.85, 1, 0.85, ob); this.objs.push(ob); return ob; }
  crateAt(x, z, y = 0, size = 1) { const m = crate({ size }); m.position.set(x, y, z); m.rotation.y = rr(-0.2, 0.2); this.sc.add(m); const ob = { type: 'crate', hp: 40 * size, mesh: m, color: 0xb08a50, x, y, z, size }; ob.solid = this.addSolid(x, y + size / 2, z, size, size, size, ob); this.objs.push(ob); return ob; }

  build() {
    const sc = this.sc;
    const ground = tpart(sc, 700, 0.2, 700, tmat('grass', K.grass()), 0, -0.1, 0, 175, 175); ground.receiveShadow = true;
    const brick = tmat('brick', K.brick()), conc = tmat('concrete', K.concrete()), wood = tmat('wood', K.wood(0x8a6a44)), rockM = tmat('rock', K.rock());
    // ----- bina -----
    const cx = 0, cz = -15, Wd = 16, D = 12, FH = 3.2, wt = 0.4, x0 = cx - Wd / 2, x1 = cx + Wd / 2, z0 = cz - D / 2, z1 = cz + D / 2;
    const win = (a, b0 = 1.0, b1 = 2.3) => ({ a, w: 1.6, b0, b1, glass: true });
    for (const fl of [0, 1]) {
      const y0 = fl * FH;
      this.wall('x', z1, x0, x1, y0, FH, fl === 0 ? [win(cx - 5), win(cx + 5), { a: cx, w: 2, b0: 0, b1: 2.4 }] : [win(cx - 5), win(cx), win(cx + 5)], brick);
      this.wall('x', z0, x0, x1, y0, FH, [win(cx - 4), win(cx + 4)], brick);
      this.wall('z', x0, z0, z1, y0, FH, [win(cz - 3), win(cz + 3)], brick);
      this.wall('z', x1, z0, z1, y0, FH, [win(cz - 3), win(cz + 3)], brick);
    }
    this.wall('x', cz - 0.2, x0 + 0.2, cx + 1, 0, FH, [{ a: cx - 4, w: 1.6, b0: 0, b1: 2.3 }], conc, 0.25);
    this.wall('z', cx - 1, z0 + 0.2, z1 - 0.2, FH, FH, [{ a: cz + 1, w: 1.6, b0: 0, b1: 2.3 }], conc, 0.25);
    const fl0 = z0 + wt / 2, fl1 = z1 - wt / 2, fx0 = x0 + wt / 2, fx1 = x1 - wt / 2;
    this.box(cx, 0, cz, Wd, 0.1, D, wood); // zemin döşeme
    this.box((fx0 + cx + 4.4) / 2, FH - 0.3, (fl0 + fl1) / 2, cx + 4.4 - fx0, 0.3, fl1 - fl0, wood);
    this.box((cx + 4.4 + fx1) / 2, FH - 0.3, (cz + 0.4 + fl1) / 2, fx1 - cx - 4.4, 0.3, fl1 - cz - 0.4, wood);
    for (let i = 0; i < 16; i++) { const top = 0.2 * (i + 1); this.box(cx + 6.1, 0, cz + 0.4 - (i + 0.5) * 0.375, 3.4, top, 0.375, conc); }
    this.box(cx, 2 * FH, cz, Wd, 0.3, D, conc);
    this.box(cx, 2 * FH + 0.3, z1 - 0.1, Wd, 0.5, 0.2, conc); this.box(cx, 2 * FH + 0.3, z0 + 0.1, Wd, 0.5, 0.2, conc);
    // iç eşyalar
    this.prop(table(), cx - 5, 0.1, cz + 3, 0); this.prop(sofa(), cx - 5.5, 0.1, cz - 4, Math.PI / 2);
    this.prop(bed(), cx - 5.5, FH, cz - 3.5, Math.PI / 2); this.prop(wardrobe(), cx + 1, FH, cz - 5.2, 0);
    this.barrelAt(cx - 1.5, cz + 4.5); this.barrelAt(cx - 0.6, cz + 4.9); this.crateAt(cx + 2, cz + 4.8); this.crateAt(cx + 2, cz + 4.8, 1); this.crateAt(cx - 7, cz + 1, 0.1);
    this.barrelAt(cx - 6.5, cz - 2.5, FH); this.crateAt(cx + 3, cz - 4.5, FH); this.crateAt(cx + 1, cz + 4, FH + 0.0, 1.2);
    this.addPickup('ammo', cx - 6, cz + 4.5, 0.2); this.addPickup('health', cx - 7, cz - 4.8, FH + 0.2); this.addPickup('ammo', cx + 5, cz + 4.5, FH + 0.2);
    for (const [x, z, y] of [[cx - 5, cz + 4, FH], [cx + 2, cz - 3.5, FH], [cx - 4, cz - 3, 0]]) this.addCre('robber', x, z, y);
    // ----- zayıf duvar -----
    const wl = { type: 'wall', hp: 160, color: 0xa86a4a }; wl.solid = this.box(18, 0, -2, 7, 2.6, 0.5, brick, { owner: wl }); wl.x = 18; wl.y = 1.3; wl.z = -2; wl.size = 3; this.objs.push(wl);
    this.addPickup('health', 18, -4, 0.2);
    // ----- açık alan: fıçı yığını, sandıklar, kayalar -----
    for (let i = 0; i < 7; i++) this.barrelAt(10 + (i % 4) * 1.1, 14 + ((i / 4) | 0) * 1.1);
    for (let i = 0; i < 6; i++) this.crateAt(-14 + (i % 3) * 1.05, 16 + ((i / 3) | 0) * 1.05, 0, 1);
    for (let i = 0; i < 18; i++) { const x = rr(-110, 110), z = rr(-60, 110); if (Math.hypot(x, z - 30) < 14 || Math.hypot(x, z + 15) < 16) continue; const m = rock({ seed: i + 3, size: rr(1.4, 3.2) }); m.position.set(x, 0, z); this.sc.add(m); this.addSolid(x, 1, z, 1.6, 2, 1.6); }
    // ----- orman -----
    for (let i = 0; i < 40; i++) { const x = -60 + rr(-28, 28), z = 30 + rr(-28, 28); const m = tree({ type: ['meşe', 'çam'][(R() * 2) | 0], seed: i + 1 }); m.position.set(x, 0, z); this.sc.add(m); this.addSolid(x, 2, z, 0.7, 4, 0.7); }
    for (let i = 0; i < 14; i++) { const a = rr(0, 6.28), d = rr(18, 40), x = Math.cos(a) * d, z = -50 + Math.sin(a) * d * 0.5 + 60; const m = tree({ type: 'çam', seed: i + 50 }); m.position.set(x + 20, 0, z - 40); this.sc.add(m); this.addSolid(x + 20, 2, z - 40, 0.7, 4, 0.7); }
    const lake = water({ w: 36, d: 24 }); lake.position.set(52, 0, 44); this.sc.add(lake); this.lake = lake;
    // ----- dağ + mağara -----
    this.buildMountain(80, -80);
    // ----- araçlar -----
    this.addCar('sedan', -7, 24, 0.3); this.addCar('polis', 9, 27, -0.2);
    // ----- canlılar -----
    for (let i = 0; i < 4; i++) this.addCre('wolf', -48 + rr(-4, 4), 38 + rr(-4, 4), 0, { pack: 1 });
    for (let i = 0; i < 3; i++) this.addCre('deer', -40 + rr(-6, 6), 62 + rr(-4, 4));
    for (let i = 0; i < 2; i++) this.addCre('boar', 34 + i * 3, 38);
    for (let i = 0; i < 3; i++) this.addCre('civilian', rr(-6, 6), rr(12, 22), 0, { skin: i });
    for (let i = 0; i < 2; i++) this.addCre('wolf', 70 + i * 3, -44, 0, { pack: 2 });
  }
  buildMountain(cx, cz) {
    const rockM = tmat('rock', K.rock()), dark = mat(0x1a1714), N = 30, C = 2, ox = cx - N, oz = cz - N, FHc = 8, open = Array.from({ length: N }, () => Array(N).fill(false));
    const rect = (i0, i1, j0, j1) => { for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) open[j][i] = true; };
    rect(14, 15, 13, 29); rect(6, 15, 12, 13); rect(6, 7, 8, 12); rect(2, 11, 2, 8);
    const pillars = [[5, 5], [8, 4], [9, 7], [4, 7]]; for (const [i, j] of pillars) open[j][i] = false;
    for (let j = 0; j < N; j++) { let i = 0; while (i < N) { if (open[j][i]) { let e = i; while (e + 1 < N && open[j][e + 1]) e++; const w = (e - i + 1) * C, x = ox + (i * C) + w / 2, z = oz + j * C + C / 2;
          this.box(x, 4, z, w, FHc - 4, C, rockM); tpart(this.sc, w, 0.1, C, mat(0x3a342c), x, 0.05, z, 1, 1); i = e + 1; }
        else { let e = i; while (e + 1 < N && !open[j][e + 1]) e++; const w = (e - i + 1) * C, x = ox + (i * C) + w / 2, z = oz + j * C + C / 2; this.box(x, 0, z, w, FHc, C, rockM); i = e + 1; } } }
    const layers = [[56, 5], [46, 5], [36, 5], [26, 5], [16, 5]];
    layers.forEach(([s, h], k) => { const y0 = FHc + k * 5; const mm = k >= 3 ? tmat('snow', K.snow()) : rockM; tpart(this.sc, s, h, s, mm, cx + (k % 2 ? 1 : -1) * 0.5, y0 + h / 2, cz, s / 3, h / 3); });
    this.cave = { x0: ox + 2 * C, x1: ox + 16 * C, z0: oz, z1: oz + N * C, open, ox, oz, C };
    this.addCre('bear', cx - 30 + 14, cz - 30 + 11, 0); this.addCre('wolf', cx - 30 + 22, cz - 30 + 34, 0, { pack: 2 });
    this.crateAt(cx - 30 + 8, cz - 30 + 5, 0, 1.2); this.addPickup('ammo', cx - 26, cz - 22, 0.2); this.addPickup('health', cx - 20, cz - 24, 0.2);
    const lamp = new THREE.PointLight(0xff9a40, 1.4, 22, 1.6); lamp.position.set(cx - 18, 3, cz - 21); this.sc.add(lamp);
    this.entrance = { x: cx - 30 + 29, z: cz + 31 };
  }
  inCave(x, z) { const c = this.cave; if (!c) return false; const i = Math.floor((x - c.ox) / c.C), j = Math.floor((z - c.oz) / c.C); return i >= 0 && j >= 0 && i < 30 && j < 30 && c.open[j][i]; }
  addPickup(kind, x, z, y = 0.2) { const m = new THREE.Group(); part(m, 0.45, 0.3, 0.3, kind === 'ammo' ? 0xd0a020 : 0xf0f0f0, 0, 0, 0); if (kind === 'health') { part(m, 0.12, 0.32, 0.32, 0xd02020, 0, 0, 0); part(m, 0.32, 0.32, 0.12, 0xd02020, 0, 0, 0); } m.position.set(x, y + 0.3, z); this.sc.add(m); this.pick.push({ m, kind, x, y, z }); }
  addCar(type, x, z, yaw) { const m = V.car({ type }); m.position.set(x, 0, z); m.rotation.y = yaw; this.sc.add(m); const c = { m, x, z, yaw, v: 0, hp: 220, y: 0, r: 1.5, driver: false, dead: false, steer: 0 }; this.cars.push(c); return c; }
  addCre(kind, x, z, y = 0, o = {}) {
    const mk = { wolf: () => A.wolf(), bear: () => A.bear(), boar: () => A.boar(), deer: () => A.deer(), robber: () => H.robber({ skin: (R() * 4) | 0 }), civilian: () => H.civilian({ skin: o.skin ?? 1, shirt: [0x4a78b8, 0xc0392b, 0x3a8a5a][(R() * 3) | 0] }) }[kind]();
    const cfg = { wolf: { hp: 45, sp: 6.4, r: 0.5, h: 1.2, dmg: 9, cd: 0.9 }, bear: { hp: 170, sp: 5.4, r: 0.9, h: 2, dmg: 26, cd: 1.4 }, boar: { hp: 70, sp: 7, r: 0.5, h: 1, dmg: 14, cd: 1.1 }, deer: { hp: 30, sp: 9, r: 0.45, h: 1.8, dmg: 0, cd: 1 }, robber: { hp: 70, sp: 3.2, r: 0.4, h: 1.8, dmg: 7, cd: 0.5 }, civilian: { hp: 40, sp: 4.2, r: 0.4, h: 1.8, dmg: 0, cd: 1 } }[kind];
    const root = new THREE.Group(); root.add(mk); root.position.set(x, y, z); this.sc.add(root);
    const c = { kind, root, mk, x, y, z, yaw: rr(0, 6.28), ...cfg, mhp: cfg.hp, dead: false, dt: 0, st: 'idle', tx: x, tz: z, wt: rr(0, 3), atk: 0, pack: o.pack || 0, losT: 0, see: false, vx: 0, vz: 0, home: [x, z] };
    this.cre.push(c); return c;
  }

  // ---------- fizik yardımcıları ----------
  groundAt(x, z, y, r = 0) { let g = 0; for (const s of this.solids) if (s.y1 <= y + 0.46 && s.y1 > g && x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1) g = s.y1; return g; }
  moveXZ(o, dx, dz, r, h) {
    const hit = (s) => s.y1 > o.y + 0.46 && s.y0 < o.y + h && o.x + r > s.x0 && o.x - r < s.x1 && o.z + r > s.z0 && o.z - r < s.z1;
    o.x += dx; for (const s of this.solids) if (hit(s)) { o.x = dx > 0 ? s.x0 - r : s.x1 + r; o.blocked = true; }
    o.z += dz; for (const s of this.solids) if (hit(s)) { o.z = dz > 0 ? s.z0 - r : s.z1 + r; o.blocked = true; }
  }
  rayBox(o, d, s, max) { let t0 = 0, t1 = max; for (const [a, b, c0, c1] of [[o.x, d.x, s.x0, s.x1], [o.y, d.y, s.y0, s.y1], [o.z, d.z, s.z0, s.z1]]) { if (Math.abs(b) < 1e-8) { if (a < c0 || a > c1) return -1; } else { let ta = (c0 - a) / b, tb = (c1 - a) / b; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return -1; } } return t0; }
  rayCyl(o, d, x, z, r, y0, y1, max) { const ox = o.x - x, oz = o.z - z, a = d.x * d.x + d.z * d.z; if (a < 1e-9) return -1; const b = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - r * r, disc = b * b - 4 * a * c; if (disc < 0) return -1; let t = (-b - Math.sqrt(disc)) / (2 * a); if (t < 0) t = (-b + Math.sqrt(disc)) / (2 * a); if (t < 0 || t > max) return -1; const y = o.y + d.y * t; return y >= y0 && y <= y1 ? t : -1; }
  cast(o, d, max = 120, skip) {
    let best = { t: max, kind: null };
    for (const s of this.solids) { const t = this.rayBox(o, d, s, best.t); if (t >= 0 && t < best.t) best = { t, kind: 'solid', s }; }
    for (const c of this.cre) if (!c.dead && c !== skip) { const t = this.rayCyl(o, d, c.x, c.z, c.r + 0.1, c.y, c.y + c.h, best.t); if (t >= 0 && t < best.t) best = { t, kind: 'cre', c }; }
    for (const c of this.cars) if (!c.dead && !c.driver) { const t = this.rayCyl(o, d, c.x, c.z, 1.4, 0, 1.7, best.t); if (t >= 0 && t < best.t) best = { t, kind: 'car', c }; }
    return best;
  }
  los(a, b) { const d = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z), L = d.length(); if (L < 0.01) return true; d.divideScalar(L); for (const s of this.solids) { if (s.owner && s.owner.type === 'glass') continue; const t = this.rayBox(a, d, s, L); if (t >= 0 && t < L - 0.2) return false; } return true; }
  eye() { const p = this.p; return { x: p.x, y: p.y + 1.6, z: p.z }; }

  // ---------- efektler ----------
  debris(x, y, z, color, n = 8, spd = 5, sz = 0.14) { for (let i = 0; i < n && this.deb.length < 260; i++) { const m = new THREE.Mesh(BOXG, mat(color)); const s = sz * rr(0.5, 1.4); m.scale.set(s, s, s); m.position.set(x, y, z); this.sc.add(m); this.deb.push({ m, vx: rr(-1, 1) * spd, vy: rr(0.3, 1.2) * spd, vz: rr(-1, 1) * spd, life: rr(1.6, 3.5), rx: rr(-8, 8), rz: rr(-8, 8) }); } }
  puff(x, y, z, c = 0x555555, n = 4) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(BOXG, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6 })); m.position.set(x + rr(-0.4, 0.4), y, z + rr(-0.4, 0.4)); this.sc.add(m); this.fx.push({ m, life: rr(0.8, 1.6), t: 0, kind: 'smoke', vy: rr(1, 2.5), s: rr(0.6, 1.2) }); } }
  explode(x, y, z, rad = 7, dmg = 130, bySelf = true) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.9 })); m.position.set(x, y, z); this.sc.add(m); this.fx.push({ m, life: 0.45, t: 0, kind: 'boom', s: rad * 0.55 });
    this.debris(x, y, z, 0x2a2420, 14, 9, 0.2); this.puff(x, y + 0.5, z, 0x303030, 7); snd('big_kill', 0.9, 0.6);
    const dist = Math.hypot(x - this.p.x, y - (this.p.y + 1), z - this.p.z); this.p.shake = Math.max(this.p.shake, clamp(1.2 - dist / 40, 0, 1.2));
    this.noise = { x, z, t: this.time, r: 60 };
    const fall = (d) => clamp(1 - d / rad, 0, 1);
    for (const o of [...this.objs]) { if (o.type === 'glass') { if (Math.hypot(o.solid.x0 - x, o.solid.z0 - z) < rad * 1.8) this.destroyObj(o); continue; } const d = Math.hypot(o.x - x, o.y - y, o.z - z); if (d < rad && !o.dying) this.damageObj(o, dmg * 1.2 * fall(d) + (o.type === 'barrel' ? 40 : 0), true); }
    for (const c of this.cre) if (!c.dead) { const d = Math.hypot(c.x - x, c.y + 0.8 - y, c.z - z); if (d < rad) this.hurtCre(c, dmg * fall(d) * 1.1, 'boom'); }
    for (const c of this.cars) if (!c.dead) { const d = Math.hypot(c.x - x, 0.7 - y, c.z - z); if (d < rad) this.hurtCar(c, dmg * 1.4 * fall(d)); }
    const dp = Math.hypot(this.p.x - x, this.p.y + 1 - y, this.p.z - z); if (dp < rad) this.hurtPlayer(dmg * 0.4 * fall(dp));
  }
  damageObj(o, dmg, boom) {
    if (o.dying) return; if (o.type === 'wall' && !boom) dmg = Math.min(dmg, 4); o.hp -= dmg;
    if (o.mesh) { o.mesh.position.x += rr(-0.01, 0.01); }
    if (o.hp <= 0) this.destroyObj(o); else this.debris(o.x ?? o.solid.x0, (o.y ?? 1) + 0.3, o.z ?? o.solid.z0, o.color ?? 0xaaaaaa, 2, 2);
  }
  destroyObj(o) {
    if (o.dying) return; o.dying = true; const i = this.objs.indexOf(o); if (i >= 0) this.objs.splice(i, 1);
    if (o.mesh) this.sc.remove(o.mesh); if (o.solid) this.removeSolid(o.solid);
    const x = o.x ?? (o.solid.x0 + o.solid.x1) / 2, y = (o.y ?? 0) + 0.5, z = o.z ?? (o.solid.z0 + o.solid.z1) / 2;
    if (o.type === 'barrel') { this.timers.push({ t: 0.12, fn: () => this.explode(x, y, z, 6, 110) }); }
    else if (o.type === 'glass') { this.debris(x, y + 1, z, 0x9fd0f0, 10, 3, 0.1); snd('impact', 0.5, 2); }
    else if (o.type === 'wall') { this.debris(x, 1.2, z, 0xa86a4a, 26, 7, 0.35); this.puff(x, 1.2, z, 0x9a8a7a, 6); snd('impact', 0.9, 0.5); this.say('Duvar yıkıldı!'); }
    else { this.debris(x, y, z, o.color, 14, 5, 0.22); snd('impact', 0.7, 0.8); if (R() < 0.45) this.addPickup(R() < 0.5 ? 'ammo' : 'health', x, z, o.y ?? 0); }
  }
  hurtPlayer(d) { const p = this.p; if (p.dead) return; p.hp -= d; p.dmgT = 0.35; p.shake = Math.max(p.shake, 0.3); snd('hurt', 0.6); if (p.hp <= 0) { p.hp = 0; p.dead = true; if (p.car) this.exitCar(true); snd('downed', 0.7); this.cb.onDead && this.cb.onDead(); } }
  hurtCar(c, d) { c.hp -= d; if (c.hp <= 0 && !c.dead) { c.dead = true; this.explode(c.x, 1, c.z, 8, 140); if (c.driver) { this.hurtPlayer(60); this.exitCar(true); } this.sc.remove(c.m); } else if (c.hp < 90 && !c.smoke) { c.smoke = 1; } }
  hurtCre(c, d, how, head) {
    if (c.dead) return; c.hp -= d; c.hurtT = 0.25; snd(c.hp <= 0 ? 'kill' : 'hit', 0.5, rr(0.9, 1.2)); this.debris(c.x, c.y + c.h * 0.6, c.z, c.kind === 'wolf' || c.kind === 'bear' || c.kind === 'boar' || c.kind === 'deer' ? 0x7a1a1a : 0x8a1a1a, 3, 3, 0.08);
    if (!c.dead && c.hp > 0) { c.st = c.kind === 'deer' || c.kind === 'civilian' ? 'flee' : 'chase'; c.alert = true; if (c.pack) for (const o of this.cre) if (o.pack === c.pack && !o.dead && Math.hypot(o.x - c.x, o.z - c.z) < 40) { o.st = 'chase'; o.alert = true; } }
    if (c.hp <= 0) { c.dead = true; c.dt = 0; this.kills++; if (c.kind === 'civilian') { this.rep -= 15; this.say('Sivil öldü! İtibar düştü', 3); } if (c.kind === 'robber') this.say('Düşman etkisiz', 1.2); }
  }

  // ---------- oyuncu ----------
  fire() {
    const p = this.p; if (p.cd > 0 || p.rl > 0 || p.dead || p.car) return;
    if (p.ammo <= 0) { this.reload(); return; }
    p.ammo--; p.cd = 0.11; p.kick = 1; this.flash.visible = true; this.flashT = 0.04; snd('shoot', 0.5, rr(0.95, 1.1)); this.noise = { x: p.x, z: p.z, t: this.time, r: 55 };
    const o = this.eye(), spread = 0.012, d = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch + rr(-spread, spread), p.yaw + rr(-spread, spread), 0, 'YXZ'));
    this.shot(o, d, 14, p);
  }
  shot(o, d, dmg, from) {
    const hit = this.cast(o, d, 140, from.cre ? from : null), L = hit.t, end = { x: o.x + d.x * L, y: o.y + d.y * L, z: o.z + d.z * L };
    this.tracer(o, end);
    if (hit.kind === 'cre') { const c = hit.c, head = end.y > c.y + c.h * 0.82 && (c.kind === 'robber' || c.kind === 'civilian'); this.hurtCre(c, dmg * (head ? 2.5 : 1) * (from === this.p ? 1 : 1), 'gun', head); if (from === this.p) { this.p.hitT = 0.2; this.p.hitHead = head; } }
    else if (hit.kind === 'car') { this.hurtCar(hit.c, dmg * 2); this.debris(end.x, end.y, end.z, 0xffcc40, 3, 3, 0.05); snd('impact', 0.4, 1.4); }
    else if (hit.kind === 'solid') { const ow = hit.s.owner; this.debris(end.x, end.y, end.z, ow ? ow.color ?? 0xaaaaaa : 0x8a8a7a, 3, 2.5, 0.06); if (ow) this.damageObj(ow, dmg, false); if (from === this.p) snd('impact', 0.25, 1.6); }
  }
  tracer(a, b) { if (this.fx.length > 80) return; const m = new THREE.Mesh(BOXG, new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.8 })); const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); const s = a === this.p ? 1 : 1; m.scale.set(0.025, 0.025, L); m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 - 0.05, (a.z + b.z) / 2); m.lookAt(b.x, b.y - 0.05, b.z); this.sc.add(m); this.fx.push({ m, life: 0.07, t: 0, kind: 'tracer' }); }
  reload() { const p = this.p; if (p.rl > 0 || p.ammo >= 30 || p.res <= 0) return; p.rl = 1.5; snd('confirm', 0.4, 1.4); }
  throwNade() { const p = this.p; if (p.nades <= 0 || p.dead || p.car || p.ng > 0) return; p.nades--; p.ng = 0.6; const g = W.grenade(); g.scale.setScalar(2.4); const e = this.eye(); g.position.set(e.x, e.y - 0.2, e.z); this.sc.add(g); const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch + 0.15, p.yaw, 0, 'YXZ')); this.nades.push({ m: g, x: e.x, y: e.y - 0.2, z: e.z, vx: dir.x * 17, vy: dir.y * 17 + 2, vz: dir.z * 17, t: 2.3 }); snd('dash', 0.5, 0.8); }
  enterCar(c) { const p = this.p; p.car = c; c.driver = true; this.say('Araçtasın: W/S gaz-fren, A/D direksiyon, E in', 3); }
  exitCar(force) { const p = this.p, c = p.car; if (!c) return; c.driver = false; p.car = null; p.x = c.x + Math.cos(c.yaw) * 2.3; p.z = c.z - Math.sin(c.yaw) * 2.3; p.y = this.groundAt(p.x, p.z, 5); p.vy = 0; c.v = 0; }
  use() {
    const p = this.p; if (p.car) { this.exitCar(); return; }
    let best = null, bd = 3.6; for (const c of this.cars) if (!c.dead) { const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd) { bd = d; best = c; } }
    if (best) this.enterCar(best);
  }
  respawn() { const p = this.p; Object.assign(p, { x: 0, y: 0, z: 30, vy: 0, hp: 100, dead: false, car: null, yaw: 0, pitch: 0, ammo: 30, res: Math.max(p.res, 60), nades: Math.max(p.nades, 2) }); }

  // ---------- AI ----------
  steerTo(c, tx, tz, sp, dt) { const dx = tx - c.x, dz = tz - c.z, L = Math.hypot(dx, dz) || 1; c.yaw = Math.atan2(-dx, -dz); c.blocked = false; this.moveXZ(c, dx / L * sp * dt, dz / L * sp * dt, c.r, c.h); if (c.blocked) { c.tx = c.x + rr(-6, 6); c.tz = c.z + rr(-6, 6); } c.mk.userData.anim && c.mk.userData.anim(dt, sp > 5 ? 4.5 : sp > 0.5 ? 1 : 0); }
  updCre(c, dt) {
    const p = this.p, pe = this.eye(); c.y = this.groundAt(c.x, c.z, c.y + 0.3, 0.2);
    if (c.dead) { c.dt += dt; const k = Math.min(1, c.dt * 3); c.root.rotation.z = (c.kind === 'robber' || c.kind === 'civilian' ? 1 : -1) * Math.PI / 2 * k * (c.side || (c.side = R() < 0.5 ? 1 : -1)); c.root.position.y = c.y + c.h * 0.12 * k; if (c.dt > 25) { this.sc.remove(c.root); c.gone = true; } return; }
    c.root.position.set(c.x, c.y, c.z); c.root.rotation.y = c.yaw; c.hurtT = Math.max(0, (c.hurtT || 0) - dt);
    const dp = Math.hypot(p.x - c.x, p.z - c.z), noisy = this.time - this.noise.t < 1.2 && Math.hypot(this.noise.x - c.x, this.noise.z - c.z) < this.noise.r;
    c.losT -= dt; if (c.losT <= 0) { c.losT = 0.25 + R() * 0.15; c.see = dp < 36 && !p.dead && this.los({ x: c.x, y: c.y + c.h * 0.9, z: c.z }, pe); }
    const hostile = c.kind === 'wolf' || c.kind === 'bear' || c.kind === 'boar', prey = c.kind === 'deer' || c.kind === 'civilian';
    const notice = (c.see && dp < ({ wolf: 24, bear: 14, boar: 12, robber: 32, deer: 26, civilian: 18 }[c.kind])) || dp < 6 || (noisy && c.kind !== 'bear') || (c.kind === 'bear' && noisy && dp < 22);
    if (c.kind === 'civilian' && this.time - this.noise.t < 3 && Math.hypot(this.noise.x - c.x, this.noise.z - c.z) < 50) c.st = 'flee';
    if (c.st === 'idle' && notice && !p.dead) { c.st = prey ? 'flee' : 'chase'; if (c.pack) for (const o of this.cre) if (o.pack === c.pack && !o.dead && Math.hypot(o.x - c.x, o.z - c.z) < 35) o.st = 'chase'; }
    if (c.st === 'flee') { const dx = c.x - p.x, dz = c.z - p.z, L = Math.hypot(dx, dz) || 1; this.steerTo(c, c.x + dx / L * 10, c.z + dz / L * 10, c.sp, dt); if (dp > 60) c.st = 'idle'; return; }
    if (c.st === 'chase' && !p.dead) {
      if (c.kind === 'robber') { c.yaw = Math.atan2(-(p.x - c.x), -(p.z - c.z)); c.atk -= dt;
        if (c.see && dp < 30) { if (c.atk <= 0) { c.atk = 0.5 + R() * 0.3; const o = { x: c.x, y: c.y + 1.4, z: c.z }, tg = { x: pe.x + rr(-0.5, 0.5), y: pe.y - 0.5 + rr(-0.3, 0.3), z: pe.z + rr(-0.5, 0.5) }, d = new THREE.Vector3(tg.x - o.x, tg.y - o.y, tg.z - o.z).normalize(); const hit = this.cast(o, d, 60, c); this.tracer(o, { x: o.x + d.x * hit.t, y: o.y + d.y * hit.t, z: o.z + d.z * hit.t }); snd('shoot', clamp(0.35 - dp * 0.006, 0.08, 0.35), 0.8); this.noise = { x: c.x, z: c.z, t: this.time, r: 40 };
              if (hit.kind === null || (hit.kind === 'solid' && hit.t > dp - 0.5) ) { if (R() < clamp(0.6 - dp * 0.015, 0.12, 0.6)) this.hurtPlayer(7); } else if (hit.kind === 'solid' && hit.s.owner) this.damageObj(hit.s.owner, 8, false); }
          if (dp > 12) this.steerTo(c, p.x, p.z, c.sp * 0.8, dt); else c.mk.userData.anim && c.mk.userData.anim(dt, 0); }
        else this.steerTo(c, p.x, p.z, c.sp, dt); return; }
      c.atk -= dt; const sp = c.sp * (c.kind === 'boar' ? 1 : 1);
      if (dp > 1.5) this.steerTo(c, p.x, p.z, sp, dt); else { c.yaw = Math.atan2(-(p.x - c.x), -(p.z - c.z)); c.mk.userData.anim && c.mk.userData.anim(dt, 0); if (c.atk <= 0) { c.atk = c.cd; this.hurtPlayer(c.dmg); c.root.position.y += 0.2; } }
      if (dp > 70) c.st = 'idle'; return;
    }
    c.wt -= dt; if (c.wt <= 0) { c.wt = rr(2, 6); c.tx = c.home[0] + rr(-9, 9); c.tz = c.home[1] + rr(-9, 9); if (R() < 0.35) c.tx = c.x, c.tz = c.z; }
    if (Math.hypot(c.tx - c.x, c.tz - c.z) > 0.8) this.steerTo(c, c.tx, c.tz, 1.6, dt); else c.mk.userData.anim && c.mk.userData.anim(dt, 0);
  }
  updCar(c, dt) {
    if (c.dead) return; const p = this.p, i = this.in;
    if (c.driver) { const thr = -i.mz, st = -i.mx; c.v += (thr > 0 ? 15 : thr < 0 ? (c.v > 0.5 ? -26 : -9) : -Math.sign(c.v) * 6) * Math.abs(thr || 1) * dt * (thr ? 1 : Math.min(1, Math.abs(c.v))); c.v = clamp(c.v, -9, 27); if (!thr && Math.abs(c.v) < 0.4) c.v = 0;
      c.yaw += st * 1.9 * dt * clamp(c.v / 8, -1, 1) * (c.v > 0 ? 1 : 1); c.steer = st; }
    else { c.v *= Math.max(0, 1 - 3 * dt); }
    const vx = -Math.sin(c.yaw) * c.v * dt, vz = -Math.cos(c.yaw) * c.v * dt; const o = { x: c.x, y: 0, z: c.z, blocked: false }; this.moveXZ(o, vx, vz, c.r, 1.6);
    if (o.blocked) { const sp = Math.abs(c.v); if (sp > 6) { this.hurtCar(c, sp * 2.2); if (c.driver) { this.p.shake = 0.6; this.hurtPlayer(sp * 0.4); } snd('impact', 0.7, 0.7); } c.v *= -0.2; }
    c.x = o.x; c.z = o.z; c.m.position.set(c.x, 0, c.z); c.m.rotation.y = c.yaw; const u = c.m.userData; if (u.wheels) u.wheels.forEach((w, k) => { w.rotation.x -= c.v * dt * 2.5; });
    if (c.smoke && R() < 0.2) this.puff(c.x, 1.4, c.z, 0x222222, 1);
    if (Math.abs(c.v) > 5) for (const k of this.cre) if (!k.dead && Math.hypot(k.x - c.x, k.z - c.z) < 1.9) { this.hurtCre(k, Math.abs(c.v) * 6, 'car'); c.v *= 0.9; }
    if (!c.driver && Math.abs(c.v) < 0.1) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d < 1.9 && !p.car && d > 0.01) { p.x += dx / d * (1.9 - d); p.z += dz / d * (1.9 - d); } }
  }

  // ---------- ana güncelleme ----------
  update(dt) {
    this.time += dt; const p = this.p, i = this.in;
    if (!p.dead) {
      if (p.car) { const c = p.car; p.x = c.x; p.z = c.z; p.y = 0; this.updCar(c, dt); if (i.useP) { this.exitCar(); } }
      else {
        const sp = 6.4, f = -i.mz, s = i.mx, sn = Math.sin(p.yaw), cs = Math.cos(p.yaw);
        const dx = (-sn * f + cs * s) * sp * dt, dz = (-cs * f - sn * s) * sp * dt;
        this.moveXZ(p, dx, dz, 0.38, 1.75);
        const g = this.groundAt(p.x, p.z, p.y, 0.3);
        if (i.jump && p.onGround) { p.vy = 6.2; p.onGround = false; }
        p.vy -= 20 * dt; p.y += p.vy * dt;
        for (const s of this.solids) if (p.vy > 0 && s.y0 >= p.y + 1.2 && p.y + 1.75 > s.y0 - 0.05 && p.x > s.x0 && p.x < s.x1 && p.z > s.z0 && p.z < s.z1) { p.vy = 0; break; }
        if (p.y <= g) { if (p.vy < -13) this.hurtPlayer((-p.vy - 13) * 6); p.y = g; p.vy = 0; p.onGround = true; } else p.onGround = p.y - g < 0.05;
        if (i.fire) this.fire(); if (i.reload) this.reload(); if (i.nade) { this.throwNade(); i.nade = false; }
      }
      if (i.useP) { i.useP = false; if (!p.car) this.use(); }
      i.useP = false;
    } else { i.useP = false; }
    for (const c of this.cars) if (!(p.car === c)) this.updCar(c, dt);
    p.cd -= dt; p.ng = (p.ng || 0) - dt; p.dmgT = Math.max(0, p.dmgT - dt); p.hitT = Math.max(0, p.hitT - dt); p.shake = Math.max(0, p.shake - dt * 1.5); p.kick = Math.max(0, p.kick - dt * 9);
    if (p.rl > 0) { p.rl -= dt; if (p.rl <= 0) { const n = Math.min(30 - p.ammo, p.res); p.ammo += n; p.res -= n; } }
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flash.visible = false; }
    for (const c of this.cre) this.updCre(c, dt); this.cre = this.cre.filter((c) => !c.gone);
    for (let k = this.pick.length - 1; k >= 0; k--) { const q = this.pick[k]; q.m.rotation.y += dt * 2; q.m.position.y = q.y + 0.35 + Math.sin(this.time * 3 + k) * 0.08; if (!p.dead && Math.hypot(q.x - p.x, q.z - p.z) < 1.4 && Math.abs(q.y - p.y) < 2) { if (q.kind === 'ammo') { p.res += 30; p.nades = Math.min(6, p.nades + 1); this.say('+30 mermi, +1 bomba', 1.5); } else { if (p.hp >= 100) continue; p.hp = Math.min(100, p.hp + 40); this.say('+40 can', 1.5); } snd('coin', 0.5); this.sc.remove(q.m); this.pick.splice(k, 1); } }
    for (let k = this.nades.length - 1; k >= 0; k--) { const n = this.nades[k]; n.t -= dt; n.vy -= 20 * dt; const o = { x: n.x, y: n.y, z: n.z, blocked: false }; this.moveXZ(o, n.vx * dt, n.vz * dt, 0.1, 0.1); if (o.blocked) { n.vx *= -0.35; n.vz *= -0.35; } n.x = o.x; n.z = o.z; n.y += n.vy * dt; const g = this.groundAt(n.x, n.z, n.y + 0.3, 0.05); if (n.y < g + 0.08) { n.y = g + 0.08; n.vy = Math.abs(n.vy) * 0.35; n.vx *= 0.7; n.vz *= 0.7; } n.m.position.set(n.x, n.y, n.z); n.m.rotation.x += dt * 8; if (n.t <= 0) { this.sc.remove(n.m); this.nades.splice(k, 1); this.explode(n.x, n.y + 0.3, n.z, 8, 150); } }
    for (let k = this.timers.length - 1; k >= 0; k--) { const t = this.timers[k]; t.t -= dt; if (t.t <= 0) { this.timers.splice(k, 1); t.fn(); } }
    for (let k = this.deb.length - 1; k >= 0; k--) { const d = this.deb[k]; d.life -= dt; d.vy -= 18 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt; d.m.rotation.x += d.rx * dt; d.m.rotation.z += d.rz * dt; const g = this.groundAt(d.m.position.x, d.m.position.z, d.m.position.y + 0.3); if (d.m.position.y < g + 0.05) { d.m.position.y = g + 0.05; d.vy = Math.abs(d.vy) * 0.3; d.vx *= 0.6; d.vz *= 0.6; } if (d.life <= 0) { this.sc.remove(d.m); this.deb.splice(k, 1); } }
    for (let k = this.fx.length - 1; k >= 0; k--) { const f = this.fx[k]; f.t += dt; const u = f.t / f.life; if (f.kind === 'boom') { f.m.scale.setScalar(0.5 + f.s * Math.sqrt(u)); f.m.material.opacity = 0.9 * (1 - u); } else if (f.kind === 'smoke') { f.m.position.y += f.vy * dt; f.m.scale.setScalar(f.s * (0.6 + u * 2)); f.m.material.opacity = 0.55 * (1 - u); } else if (f.kind === 'tracer') f.m.material.opacity = 0.8 * (1 - u); if (u >= 1) { this.sc.remove(f.m); this.fx.splice(k, 1); } }
    if (this.lake && this.lake.userData.anim) this.lake.userData.anim(dt, this.time);
    this.msgT -= dt;
    // mağara karanlığı
    const inC = this.inCave(p.x, p.z) ? 1 : 0; this.cave2 = (this.cave2 || 0) + (inC - (this.cave2 || 0)) * Math.min(1, dt * 4);
    this.hemi.intensity = 1.15 - this.cave2 * 0.95; this.torch.intensity = this.cave2 * 2.4; this.sc.fog.far = 170 - this.cave2 * 125; this.sc.background.setHex(inC ? 0x050505 : 0x9ec7e8); this.sc.fog.color.setHex(inC ? 0x050505 : 0x9ec7e8);
  }
  frame() {
    const p = this.p, cam = this.cam, c = p.car;
    if (c) { const bx = c.x + Math.sin(c.yaw) * 8.5, bz = c.z + Math.cos(c.yaw) * 8.5; cam.position.set(bx, 4.2, bz); cam.rotation.set(-0.22, c.yaw, 0, 'YXZ'); this.vm.visible = false; }
    else { const sh = p.shake; cam.position.set(p.x + rr(-sh, sh) * 0.08, p.y + 1.62 + rr(-sh, sh) * 0.08, p.z); cam.rotation.set(p.pitch - p.kick * 0.012 + (p.dead ? -0.8 : 0), p.yaw, p.dead ? 0.6 : 0, 'YXZ'); this.vm.visible = !p.dead; this.vm.position.z = -0.3 + p.kick * 0.04; }
    this.r.render(this.sc, cam);
  }
  hud() {
    const p = this.p; let hint = '';
    if (!p.car && !p.dead) { for (const c of this.cars) if (!c.dead && Math.hypot(c.x - p.x, c.z - p.z) < 3.6) hint = 'E: araca bin'; }
    return { hp: Math.ceil(p.hp), ammo: p.ammo, res: p.res, nades: p.nades, rl: p.rl > 0, msg: this.msgT > 0 ? this.msg : '', kills: this.kills, rep: this.rep, car: p.car ? Math.max(0, Math.ceil(p.car.hp / 2.2)) : null, speed: p.car ? Math.abs(Math.round(p.car.v * 3.6)) : 0, hint, dmg: p.dmgT > 0, hit: p.hitT > 0, head: !!p.hitHead && p.hitT > 0, dead: p.dead, cave: this.cave2 > 0.5 };
  }
  loop(now) { const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.acc += dt; let n = 0; while (this.acc >= 1 / 60 && n++ < 5) { this.update(1 / 60); this.acc -= 1 / 60; } this.frame(); this.hudT += dt; if (this.hudT > 0.1) { this.hudT = 0; this.cb.onHud && this.cb.onHud(this.hud()); } this.raf = requestAnimationFrame(this.loop); }
  advance(n, dt = 1 / 60) { for (let k = 0; k < n; k++) this.update(dt); this.frame(); }
}
