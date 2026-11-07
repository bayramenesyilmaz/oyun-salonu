// Banka Baskını: gizlilik ağırlıklı FPS. Kit + Test Alanı motoru üzerine kurulu.
import * as THREE from 'three';
import { World } from '../testalani/Game.js';
import * as S from '../../kit/soft.js';
import { part, tpart, mat, emit } from '../../kit/core.js';
import { K, tmat } from '../../kit/tex.js';
import { table, counter, sofa, wardrobe, shelf, safe, cashBag, crate } from '../../kit/props.js';
import { building } from '../../kit/buildings.js';
import { streetLamp, bench, barrier, trashCan } from '../../kit/city.js';

const R = Math.random, rr = (a, b) => a + R() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const NIGHT = 0x070b16;

export class Bank extends World {
  build() {
    const sc = this.sc; this.floorY = -100; this.bank = true;
    const brick = tmat('brick', K.brick()), conc = tmat('concrete', K.concrete()), wood = tmat('wood', K.wood(0x8a6a44)), grass = tmat('grass', K.grass()), asph = tmat('asphalt', K.asphalt()), paver = tmat('paver', K.paver());
    const cx = 0, cz = -20, x0 = -14, x1 = 14, z0 = -30, z1 = -10, FH = 3.2;
    // ---- zemin (basement deliği ile) ----
    const gr = (a, b, c, d) => this.box((a + b) / 2, -0.4, (c + d) / 2, b - a, 0.4, d - c, grass);
    gr(-300, -13.8, -300, 300); gr(-9.8, 300, -300, 300); gr(-13.8, -9.8, -300, -29.8); gr(-13.8, -9.8, -23.4, 300);
    // yol + kaldırım (görsel)
    tpart(sc, 220, 0.03, 12, asph, 0, 0.015, 3, 55, 3); tpart(sc, 220, 0.04, 6, paver, 0, 0.02, -7, 55, 2);
    for (let x = -90; x < 90; x += 8) part(sc, 3, 0.04, 0.3, 0xe8e0c0, x, 0.04, 3);
    // ---- banka duvarları ----
    const win = (a, b0 = 1.0, b1 = 2.4, w = 1.8) => ({ a, w, b0, b1, glass: true });
    for (const fl of [0, 1]) {
      const y0 = fl * FH;
      this.wall('x', z1, x0, x1, y0, FH, fl === 0 ? [win(-9), win(-5.5), { a: 0, w: 3, b0: 0, b1: 2.6 }, win(5.5), win(9)] : [win(-10), win(-5), win(0), win(5), win(10)], brick);
      this.wall('x', z0, x0, x1, y0, FH, [win(-6), win(6)], brick);
      this.wall('z', x0, z0, z1, y0, FH, [win(-24), win(-16)], brick);
      this.wall('z', x1, z0, z1, y0, FH, fl === 0 ? [win(-26), { a: -15, w: 2, b0: 0, b1: 2.4 }, win(-20, 1.0, 2.4, 1.4)] : [win(-26), win(-15), win(-20, 1.0, 2.4, 1.4)], brick);
    }
    // lobi/arka bölme duvarı + kapı aralığı
    this.wall('x', -21, x0 + 0.2, x1 - 0.2, 0, FH, [{ a: 0, w: 2.6, b0: 0, b1: 2.5 }], conc, 0.3);
    // kat döşemeleri
    const sl = (a, b, c, d, y, h, m) => this.box((a + b) / 2, y, (c + d) / 2, b - a, h, d - c, m);
    sl(-13.8, 10, -29.8, -10.2, FH - 0.3, 0.3, wood); sl(10, 13.8, -23.6, -10.2, FH - 0.3, 0.3, wood);
    sl(-13.8, 13.8, -29.8, -10.2, 2 * FH, 0.3, conc); sl(-14, 14, -10.3, -10.1, 2 * FH + 0.3, 0.5, conc); sl(-14, 14, -30, -29.8, 2 * FH + 0.3, 0.5, conc);
    // iç zemin görseli (mermer)
    const tile = tmat('tile', K.tile(0xd8d0c0)); tpart(sc, 23.8, 0.03, 19.6, tile, 2, 0.02, -20, 12, 10); tpart(sc, 4, 0.03, 6.2, tile, -11.8, 0.02, -20.2, 2, 3);
    // ---- merdivenler: yukarı (doğu arka) ----
    for (let i = 0; i < 16; i++) { const top = 0.2 * (i + 1); this.box(11.9, 0, -23.6 - (i + 0.5) * 0.375, 3.8, top, 0.375, conc); }
    // ---- bodrum ----
    const bz0 = -29.8, bz1 = -21.2, B = -3.2;
    this.box(0, B - 0.2, (bz0 + bz1) / 2, 27.6, 0.2, bz1 - bz0, conc);
    this.wall('x', bz0, -13.8, 13.8, B, 3.2, [], conc, 0.4); this.wall('x', bz1, -13.8, 6, B, 3.2, [], conc, 0.4); this.wall('x', bz1, 6, 13.8, B, 3.2, [], conc, 0.4);
    this.wall('z', -13.8, bz0, bz1, B, 3.2, [], conc, 0.4); this.wall('z', 13.8, bz0, bz1, B, 3.2, [], conc, 0.4);
    this.wall('z', 6, bz0, bz1, B, 3.2, [{ a: -25.5, w: 3, b0: 0, b1: 2.6 }], conc, 0.5);
    this.vault = this.addSolid(6, B + 1.5, -25.5, 0.5, 3, 3); this.vault.vis = part(sc, 0.5, 3, 3, M_STEEL(), 6, B + 1.5, -25.5, 0); this.vaultOpen = false;
    const ce = (a, b, c, d) => tpart(sc, b - a, 0.2, d - c, conc, (a + b) / 2, -0.55, (c + d) / 2, 4, 2);
    ce(-9.8, 6, bz0, bz1); ce(-13.8, -9.8, -23.4, bz1);
    for (let i = 0; i < 15; i++) this.box(-11.8, B, -23.4 - (i + 0.5) * 0.4, 4, 3.0 - 0.2 * i, 0.4, conc);
    for (let i = 0; i < 5; i++) { const b = cashBag(); b.position.set(8 + (i % 3) * 1.6, B + 0.02, -28 + ((i / 3) | 0) * 1.4); sc.add(b); }
    const sf = safe(); sf.position.set(12.5, B, -22.5); sc.add(sf); this.item('loot', 11, -25.5, B + 0.3);
    this.pl(-3, -1.0, -25.5, 0xffe0b0, 1.4, 14); this.pl(10, -1.0, -25.5, 0xb0ffd0, 1.0, 10);
    // ---- eşyalar: lobi ----
    for (const x of [-9, -5.5, 5.5, 9]) this.prop(counter(), x, 0.02, -12.8, 0);
    this.prop(sofa(), -11, 0.02, -15, Math.PI / 2); this.prop(sofa(), 11, 0.02, -17.5, -Math.PI / 2);
    for (const [x, z] of [[-6, -16], [6, -16], [-6, -19.2], [6, -19.2]]) this.box(x, 0, z, 0.9, 3.0, 0.9, conc);
    this.crateAt(-12, -26); this.crateAt(-11, -27.4); this.crateAt(11, -27); this.barrelAt(-8, -28);
    // ---- 2. kat ofisler ----
    this.wall('z', 2, -29.8, -22, FH, FH, [{ a: -24.8, w: 1.6, b0: 0, b1: 2.4 }], conc, 0.3); this.wall('x', -22, 2, 9.8, FH, FH, [], conc, 0.3);
    this.prop(table(), 7, FH + 0.3, -27.5, 0); this.prop(wardrobe(), 12.8, FH + 0.3, -28, 0);
    this.prop(table(), -4, FH + 0.3, -18, 0); this.prop(table(), -9, FH + 0.3, -26, 0); this.prop(shelf(), -13, FH + 0.3, -20, Math.PI / 2);
    this.item('card', 7, -27.5, FH + 1.0); this.addPickup('health', 12, -26, FH + 0.3); this.addPickup('ammo', -9, -24, FH + 0.3); this.addPickup('ammo', -3, -26, 0.2); this.addPickup('health', -12, -14, 0.2);
    // ---- iç ışıklar ----
    this.pl(-6, 2.6, -16, 0xfff0d0, 1.5, 18); this.pl(6, 2.6, -16, 0xfff0d0, 1.5, 18); this.pl(0, 2.6, -26, 0xfff0d0, 1.2, 14); this.pl(0, FH + 2.6, -20, 0xfff0d0, 1.6, 20);
    // ---- çevre: komşu binalar, sokak ----
    const nb = (x, z, fl, w, d, st, col) => { const b = building({ floors: fl, w, d, style: st, color: col, seed: Math.abs(x) + fl }); this.prop(b, x, 0, z, 0); };
    nb(-36, -20, 4, 18, 18, 'apartman', 0xa89a82); nb(40, -20, 5, 20, 18, 'ofis', 0x8a98a8); nb(-60, -20, 3, 18, 16, 'dukkan', 0xb08a6a); nb(64, -20, 4, 18, 16, 'apartman', 0xb8a890);
    nb(-30, -52, 6, 22, 16, 'ofis', 0x8a98a8); nb(30, -52, 5, 22, 16, 'apartman', 0xa89a82); nb(0, -52, 7, 22, 16, 'ofis', 0x7a8a9a);
    this.box(21, 0, -40, 14, 3, 0.5, brick); this.box(0, 0, -42, 28, 3, 0.5, brick);
    for (const x of [-26, -10, 10, 26]) { const l = streetLamp(); l.position.set(x, 0, -5.5); sc.add(l); this.pl(x, 5.2, -5.5, 0xffe2a0, 1.3, 22); }
    for (const x of [-18, 18]) this.prop(bench(), x, 0.04, -9, 0);
    // yan yol: kaçış noktası
    this.van = S.sVan(); this.prop(this.van, 21, 0.02, -15, 0); this.zone = { x: 21, z: -11.5, r: 5 };
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.1, 24), new THREE.MeshBasicMaterial({ color: 0x40ff80, transparent: true, opacity: 0.25 })); ring.position.set(21, 0.07, -11.5); sc.add(ring); this.ring = ring;
    // ---- araçlar, polis, kalabalık ----
    this.addCar('polis', -9, 1, 0.15); this.addCar('polis', 4, 5, -0.12); this.addCar('sedan', 30, 4, Math.PI / 2); this.addCar('taksi', -40, 5, -Math.PI / 2);
    for (const [x, z] of [[-12, -3], [-6, -3.5], [3, -3]]) { for (const b of [0]) { const bar = barrier(); bar.position.set(x, 0, z); sc.add(bar); } }
    for (const [x, z] of [[-10, -1.5], [-5, 2.5], [6, 0]]) this.addCre('cop', x, z, 0);
    for (let i = 0; i < 7; i++) this.addCre('civilian', rr(-26, -14) + (i % 3) * 3, rr(-1, 3), 0, { skin: i });
    // ---- düşmanlar ----
    const rb = (x, z, y, route) => this.addCre('robber', x, z, y, { route });
    rb(-3, -17, 0, [[-3, -17]]); rb(3, -17, 0, [[3, -17]]); rb(-10, -13.5, 0, [[-10, -13.5], [10, -13.5]]); rb(-5, -26, 0, [[-5, -26], [5, -26]]);
    rb(-8, -14, FH, [[-8, -14], [8, -14]]); rb(-4, -27, FH, [[-4, -27], [-4, -17]]); rb(-6, -25, -3.2, [[-6, -25], [2, -27]]); rb(0, -24, -3.2, [[0, -24], [3, -28]]);
    for (const [x, z] of [[-1.5, -19], [0, -19], [1.5, -19], [-1.5, -15.5], [0, -15.5], [1.5, -15.5]]) { const h = this.addCre('hostage', x, z, 0); h.hostage = true; }
    this.addPickup('ammo', -10, -12, 0.2);
    // ---- ortam ----
    this.p.x = 28; this.p.z = 7; this.p.yaw = 1.0; this.spawn = [28, 7]; this.spawnYaw = 1.0;
    this.sc.background = new THREE.Color(NIGHT); this.sc.fog.color.setHex(NIGHT); this.sc.fog.near = 25; this.sc.fog.far = 140;
    this.t0 = 0; this.saved = 0; this.alarm = false; this.card = false; this.loot = false; this.ended = false; this.inBank = false; this.items = this.items || [];
    this.civKilled = 0; this.alarmT = 0; this.execT = 24; this.reinfDone = false; this.stats = { takedowns: 0 };
    this.cre.forEach((c) => { if (c.kind === 'robber') this.initRob(c); });
    this.startPistol = true;
  }
  pl(x, y, z, c, i, d) { const l = new THREE.PointLight(c, i, d, 1.5); l.position.set(x, y, z); this.sc.add(l); return l; }
  item(kind, x, z, y) { const m = new THREE.Group(); if (kind === 'card') { part(m, 0.3, 0.02, 0.2, 0x40a0ff, 0, 0, 0); part(m, 0.1, 0.025, 0.06, 0xf0f0f0, 0, 0.01, 0); } else part(m, 0.5, 0.35, 0.4, 0x2a6a3a, 0, 0, 0); const L = new THREE.PointLight(kind === 'card' ? 0x40a0ff : 0x40ff80, 1, 4); m.add(L); m.position.set(x, y, z); this.sc.add(m); (this.items = this.items || []).push({ m, kind, x, y, z }); }
  addCre(kind, x, z, y = 0, o = {}) {
    if (kind === 'hostage') { const c = super.addCre('civilian', x, z, y, { skin: (R() * 5) | 0 }); c.kind = 'hostage'; c.st = 'held'; c.mk.userData.anim && c.mk.userData.anim(0, 0, 'sit'); c.yaw = 0; return c; }
    if (kind === 'cop') { const c = super.addCre('civilian', x, z, y); c.root.remove(c.mk); c.mk = S.sHuman({ outfit: 'polis', skin: 2, weapon: 'pistol' }); c.root.add(c.mk); c.kind = 'cop'; c.yaw = rr(-0.4, 0.4); return c; }
    const c = super.addCre(kind, x, z, y, o); if (kind === 'robber') { c.route = o.route || [[x, z]]; } return c;
  }
  initRob(c) { c.aw = 0; c.st = 'patrol'; c.wi = 0; c.wait = 0; c.base = c.yaw; c.ind = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd040 })); c.ind.position.y = 2.25; c.ind.visible = false; c.root.add(c.ind); c.sp = 3.4; }
  hurtCre(c, d, how, head) {
    const was = c.dead, st0 = c.st; super.hurtCre(c, d, how, head); if (c.kind === 'hostage' || c.kind === 'cop') c.st = st0;
    if (c.kind === 'hostage' && how !== 'exec' && how !== 'enemy') { this.rep -= 20; this.say('Rehineyi vurdun! İtibar -20', 3); }
    if (c.kind === 'cop') { this.rep -= 30; this.say('Polisi vurdun!', 3); }
    if (c.kind === 'civilian' && c.dead && !was) this.civKilled++;
    if (c.kind === 'robber' && !c.dead) this.alertBank(c);
  }
  alertBank(c) {
    if (c.st !== 'alert') { c.st = 'alert'; c.aw = 1; c.last = [this.p.x, this.p.z]; }
    if (!this.alarm) { this.alarm = true; this.alarmT = 0; this.execT = 26; this.say('ALARM! Soyguncular seni fark etti!', 3.5); }
    for (const o of this.cre) if (o.kind === 'robber' && !o.dead && o !== c && Math.hypot(o.x - c.x, o.z - c.z) < 22 && Math.abs(o.y - c.y) < 2) { o.st = 'alert'; o.aw = 1; o.last = [this.p.x, this.p.z]; }
  }
  updCre(c, dt) {
    if (c.dead) return super.updCre(c, dt);
    const p = this.p;
    if (c.kind === 'hostage') {
      c.y = this.groundAt(c.x, c.z, c.y + 0.3, 0.2); c.root.position.set(c.x, c.y, c.z); c.root.rotation.y = c.yaw;
      if (c.st === 'held') { c.mk.userData.anim && c.mk.userData.anim(dt, 0, 'sit'); }
      else { c.stage = c.stage || 0; const wp = c.stage === 0 ? [0, -14] : c.exit; if (c.stage === 0 && Math.hypot(wp[0] - c.x, wp[1] - c.z) < 1.5) c.stage = 1; this.steerTo(c, wp[0], wp[1], 4.2, dt); if (c.z > -8 && Math.abs(c.x) < 20) { this.saved++; c.gone = true; this.sc.remove(c.root); this.say('Rehine kurtuldu! (' + this.saved + '/6)', 2); } }
      return;
    }
    if (c.kind === 'cop') { c.root.position.set(c.x, c.y, c.z); c.root.rotation.y = c.yaw; c.mk.userData.anim && c.mk.userData.anim(dt, 0); return; }
    if (c.kind !== 'robber') return super.updCre(c, dt);
    const pe = this.eye(); c.y = this.groundAt(c.x, c.z, c.y + 0.3, 0.2); c.root.position.set(c.x, c.y, c.z); c.root.rotation.y = c.yaw; c.hurtT = Math.max(0, (c.hurtT || 0) - dt);
    const dx = p.x - c.x, dz = p.z - c.z, dp = Math.hypot(dx, dz), fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), cosA = (dx * fx + dz * fz) / (dp || 1);
    c.losT -= dt; if (c.losT <= 0) { c.losT = 0.14; const rg = p.cr > 0.5 ? 11 : 20; c.see = !p.dead && !p.car && dp < rg && (cosA > 0.5 || dp < 2.2) && Math.abs(p.y - c.y) < 2.5 && this.los({ x: c.x, y: c.y + 1.6, z: c.z }, { x: pe.x, y: pe.y - 0.25, z: pe.z });
      if (c.st !== 'alert') for (const o of this.cre) if (o.kind === 'robber' && o.dead && !o.found && Math.hypot(o.x - c.x, o.z - c.z) < 12 && ((o.x - c.x) * fx + (o.z - c.z) * fz) > 0 && this.los({ x: c.x, y: c.y + 1.6, z: c.z }, { x: o.x, y: o.y + 0.5, z: o.z })) { o.found = true; c.aw = Math.max(c.aw, 0.75); c.st = 'search'; c.sT = 8; c.last = [o.x, o.z]; this.say('Bir soyguncu cesedi buldu!', 2); } }
    const noisy = this.time - this.noise.t < 0.4 && Math.hypot(this.noise.x - c.x, this.noise.z - c.z) < this.noise.r && Math.abs(p.y - c.y) < 4;
    if (c.st !== 'alert') {
      if (c.see) { c.aw = Math.min(1, c.aw + dt * (1.5 / (0.4 + dp * 0.07))); c.last = [p.x, p.z]; } else c.aw = Math.max(0, c.aw - dt * 0.12);
      if (noisy && !c.see) { c.aw = Math.max(c.aw, 0.5); c.last = [this.noise.x, this.noise.z]; c.st = 'search'; c.sT = 7; }
      if (c.aw >= 1) this.alertBank(c); else if (c.aw > 0.45 && c.st === 'patrol') { c.st = 'search'; c.sT = 7; c.last = c.last || [p.x, p.z]; }
    }
    c.ind.visible = c.aw > 0.05 && c.st !== 'alert' || c.st === 'alert'; c.ind.material.color.setHex(c.st === 'alert' ? 0xff2020 : c.aw > 0.45 ? 0xff9020 : 0xffd040); c.ind.scale.setScalar(0.6 + c.aw * 1.2);
    if (c.st === 'patrol') {
      const r = c.route;
      if (r.length === 1) { c.yaw = c.base + Math.sin(this.time * 0.5 + c.x) * 0.9; c.mk.userData.anim && c.mk.userData.anim(dt, 0); }
      else { const w = r[c.wi % r.length]; if (c.wait > 0) { c.wait -= dt; c.mk.userData.anim && c.mk.userData.anim(dt, 0); } else if (Math.hypot(w[0] - c.x, w[1] - c.z) < 0.8) { c.wi++; c.wait = rr(1.2, 3); } else this.steerTo(c, w[0], w[1], 1.8, dt); }
    } else if (c.st === 'search') {
      c.sT -= dt; const l = c.last; if (l && Math.hypot(l[0] - c.x, l[1] - c.z) > 1) this.steerTo(c, l[0], l[1], 2.8, dt); else { c.yaw += dt * 1.2; c.mk.userData.anim && c.mk.userData.anim(dt, 0); }
      if (c.sT <= 0) { c.st = 'patrol'; c.aw = Math.min(c.aw, 0.3); }
    } else if (c.st === 'alert') {
      c.atk -= dt; if (c.see || (dp < 14 && Math.abs(p.y - c.y) < 2.5)) c.yaw = Math.atan2(-dx, -dz);
      if (c.see && dp < 34 && c.atk <= 0 && !p.dead) { c.atk = 0.5 + R() * 0.35; const o = { x: c.x, y: c.y + 1.4, z: c.z }, tg = { x: pe.x + rr(-0.4, 0.4), y: pe.y - 0.4 + rr(-0.3, 0.3), z: pe.z + rr(-0.4, 0.4) }, d = new THREE.Vector3(tg.x - o.x, tg.y - o.y, tg.z - o.z).normalize(); const hit = this.cast(o, d, 60, c); const L = Math.min(hit.t, 60); this.tracer(o, { x: o.x + d.x * L, y: o.y + d.y * L, z: o.z + d.z * L }); this.noise = { x: c.x, z: c.z, t: this.time, r: 40 };
        if (hit.kind === null || (hit.kind === 'solid' && hit.t > dp - 0.5)) { if (R() < clamp(0.6 - dp * 0.015, 0.12, 0.6) * (p.cr > 0.5 ? 0.7 : 1)) this.hurtPlayer(7); } else if (hit.kind === 'cre') this.hurtCre(hit.c, 8, 'enemy'); else if (hit.kind === 'solid' && hit.s.owner) this.damageObj(hit.s.owner, 8, false); }
      if (c.see) { c.last = [p.x, p.z]; if (dp > 13) this.steerTo(c, p.x, p.z, 3.6, dt); else c.mk.userData.anim && c.mk.userData.anim(dt, 0); }
      else if (c.last && Math.hypot(c.last[0] - c.x, c.last[1] - c.z) > 1.5) this.steerTo(c, c.last[0], c.last[1], 4, dt); else { c.last = [p.x + rr(-3, 3), p.z + rr(-3, 3)]; }
    }
  }
  use() {
    const p = this.p; if (p.car) return super.use();
    for (const c of this.cre) if (!c.dead && c.kind === 'hostage' && c.st === 'held' && Math.hypot(c.x - p.x, c.z - p.z) < 2.2 && Math.abs(c.y - p.y) < 2) { c.st = 'freed'; c.exit = [0, -3]; c.mk.userData.anim && c.mk.userData.anim(0, 1); this.say('Rehine serbest! Dışarı koşuyor', 2); snd2('confirm'); return; }
    for (const c of this.cre) if (!c.dead && c.kind === 'robber' && c.st !== 'alert' && Math.hypot(c.x - p.x, c.z - p.z) < 2.0 && Math.abs(c.y - p.y) < 1.5) { const d = Math.hypot(p.x - c.x, p.z - c.z) || 1, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), dot = ((p.x - c.x) * fx + (p.z - c.z) * fz) / d; if (dot < 0.2) { this.hurtCre(c, 999, 'knife'); this.stats.takedowns++; this.say('Sessiz etkisiz', 1.5); return; } }
    if (!this.vaultOpen && Math.hypot(p.x - 5, p.z + 25.5) < 3.2 && p.y < -2) { if (this.card) { this.vaultOpen = true; this.removeSolid(this.vault); this.say('Kasa açıldı!', 2.5); snd2('big_kill'); } else this.say('Kasa kartı gerekli (2. kattaki müdür odası)', 2.5); return; }
    super.use();
  }
  update(dt) {
    if (this.startPistol && this.vms) { this.startPistol = false; this.setWeapon(0); }
    super.update(dt); const p = this.p;
    if (this.ended) return; this.t0 += dt;
    this.hemi.intensity = 0.55; this.torch.intensity = 0; this.sc.background.setHex(NIGHT); this.sc.fog.color.setHex(NIGHT); this.sc.fog.near = 25; this.sc.fog.far = 140;
    if (!this.inBank && p.z < -11 && p.z > -29 && Math.abs(p.x) < 13.5 && p.y > -1) { this.inBank = true; this.say('İçerdesin. Sessiz ol.', 2); }
    for (let k = this.items.length - 1; k >= 0; k--) { const q = this.items[k]; q.m.rotation.y += dt * 2; if (!p.dead && Math.hypot(q.x - p.x, q.z - p.z) < 1.6 && Math.abs(q.y - p.y - 0.7) < 2.5) { if (q.kind === 'card') { this.card = true; this.say('Kasa kartı alındı! Bodrumdaki kasaya in', 3); } else { this.loot = true; this.say('Para çantası alındı! Kaçış noktasına git', 3); } snd2('coin'); this.sc.remove(q.m); this.items.splice(k, 1); } }
    if (this.alarm) { this.alarmT += dt; this.execT -= dt; const hs = this.cre.filter((c) => c.kind === 'hostage' && c.st === 'held' && !c.dead);
      if (this.execT <= 0 && hs.length) { this.execT = 22; const h = hs[(R() * hs.length) | 0]; this.hurtCre(h, 999, 'exec'); this.rep -= 10; this.say('Soyguncular bir rehineyi vurdu! İtibar -10', 3); }
      if (!this.reinfDone && this.alarmT > 8) { this.reinfDone = true; this.say('Takviye soyguncular geldi!', 3); for (let i = 0; i < 3; i++) { const c = this.addCre('robber', 10 + i, -12, 0, { route: [[10, -12]] }); this.initRob(c); c.st = 'alert'; c.aw = 1; c.last = [p.x, p.z]; } } }
    if (this.loot && !p.dead && Math.hypot(p.x - this.zone.x, p.z - this.zone.z) < this.zone.r) { this.ended = true; this.cb.onEnd && this.cb.onEnd(this.summary()); }
    if (this.ring) this.ring.material.opacity = 0.2 + (this.loot ? 0.25 : 0) + Math.sin(this.time * 4) * 0.08;
  }
  summary() {
    const left = this.cre.filter((c) => c.kind === 'robber' && !c.dead).length, rob = this.cre.filter((c) => c.kind === 'robber' && c.dead).length;
    let sc = 40 + this.saved * 8 + (this.alarm ? 0 : 30) + Math.min(10, this.stats.takedowns * 2) + this.rep - Math.max(0, (this.t0 - 300) / 10) - (this.civKilled * 5);
    sc = Math.round(clamp(sc, 0, 100)); const rank = sc >= 90 ? 'S' : sc >= 75 ? 'A' : sc >= 55 ? 'B' : sc >= 35 ? 'C' : 'D';
    return { score: sc, rank, saved: this.saved, alarm: this.alarm, time: Math.round(this.t0), takedowns: this.stats.takedowns, killed: rob, rep: this.rep, civ: this.civKilled };
  }
  hud() {
    const h = super.hud(), p = this.p; let aw = 0, alert = false;
    for (const c of this.cre) if (c.kind === 'robber' && !c.dead) { if (c.st === 'alert') alert = true; if (c.see) aw = Math.max(aw, c.aw); }
    const left = this.cre.filter((c) => c.kind === 'robber' && !c.dead).length;
    const obj = [
      { t: 'Bankaya gir', d: this.inBank },
      { t: `Rehineleri kurtar (${this.saved}/6)`, d: this.saved >= 6 || this.cre.filter((c) => c.kind === 'hostage' && !c.gone && !c.dead).length === 0 && this.saved > 0 },
      { t: 'Kasa kartını bul (2. kat, müdür odası)', d: this.card },
      { t: 'Bodrumdaki kasayı aç', d: this.vaultOpen },
      { t: 'Para çantasını al', d: this.loot },
      { t: 'Kaçış arabasına ulaş', d: this.ended } ];
    let hint = h.hint;
    if (!p.car && !p.dead) {
      for (const c of this.cre) if (!c.dead && c.kind === 'hostage' && c.st === 'held' && Math.hypot(c.x - p.x, c.z - p.z) < 2.2) hint = 'E: rehineyi çöz';
      for (const c of this.cre) if (!c.dead && c.kind === 'robber' && c.st !== 'alert' && Math.hypot(c.x - p.x, c.z - p.z) < 2.0) { const d = Math.hypot(p.x - c.x, p.z - c.z) || 1, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw); if (((p.x - c.x) * fx + (p.z - c.z) * fz) / d < 0.2) hint = 'E: sessiz etkisiz hale getir'; }
      if (!this.vaultOpen && Math.hypot(p.x - 5, p.z + 25.5) < 3.2 && p.y < -2) hint = this.card ? 'E: kasayı aç' : 'Kasa kapalı: kart gerekli';
    }
    return { ...h, hint, obj, aw, alarm: this.alarm, alertNow: alert, left, time: Math.round(this.t0), saved: this.saved, crouch: p.cr > 0.5 };
  }
}
import * as MD from '../../engine/models.js';
const snd2 = (n) => { try { MD.play(n, 0.5, 1); } catch { /* ses yok */ } };
const M_STEEL = () => mat(0x8a929c, { metalness: 0.7, roughness: 0.35 });
