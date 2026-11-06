import * as THREE from 'three';
import * as S from '../../bulutyaris/game/sfx.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
const M = (c, o) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); return m; };

// Her tur bir "fabrika": (P) => { title, rules, dur, build, update, flick, over, rank ... }
// P: oyun bağlamı { me, players, group, t, input, teamMode, toast(), send... }

// ---------- 1) Suya it ----------
export function sumo(P) {
  const R0 = 12;
  let R = R0, shrinkT = 14;
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 32), M(0xf0b43c));
  plat.position.y = -0.6;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 40), new THREE.MeshBasicMaterial({ color: 0xe4572e }));
  ring.rotation.x = Math.PI / 2;
  return {
    id: 'sumo', title: 'SUYA İT', rules: 'Rakiplerini platformdan suya it. Atılma (ZIPLA) tuşu güçlü iter. Platform küçülür. En son kalan kazanır.', dur: 75, order: 'surv',
    cam: { y: 24, z: 22, look: [0, 0, 2] },
    build() {
      P.group.add(plat, ring);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x2f9fe0 }));
      w.rotation.x = -Math.PI / 2; w.position.y = -4;
      P.group.add(w);
      const n = P.players.length;
      P.players.forEach((p, i) => { const a = (i / n) * TAU + 0.6; p.x = Math.cos(a) * 7; p.z = Math.sin(a) * 7; p.y = 0; p.vx = p.vz = p.vy = 0; p.alive = true; p.dieT = 0; p.dashT = 0; p.dashCd = 0; p.yaw = Math.atan2(-p.x, -p.z); });
    },
    update(dt) {
      const p = P.me, t = P.t;
      if (t > shrinkT) R = Math.max(4.2, R0 - (t - shrinkT) * 0.18);
      plat.scale.set(R, 1, R); ring.scale.set(R, R, 1);
      if (!p.alive) return;
      const run = P.phase === 'play';
      const mx = run ? P.input.mx : 0, mz = run ? -P.input.my : 0;
      const mag = Math.min(1, Math.hypot(mx, mz));
      if (p.dashCd > 0) p.dashCd -= dt;
      const out = Math.hypot(p.x, p.z) > R + 0.2;
      if (run && P.input.dash && p.dashCd <= 0 && !out) {
        P.input.dash = false; p.dashCd = 1.3; p.dashT = 0.28;
        const dx = mag > 0.1 ? mx / mag : Math.sin(p.yaw), dz = mag > 0.1 ? mz / mag : Math.cos(p.yaw);
        p.vx = dx * 15; p.vz = dz * 15; S.fire();
      }
      if (p.dashT > 0) p.dashT -= dt;
      else if (!out) { p.vx += (mx * 6.2 - p.vx) * Math.min(1, dt * 5); p.vz += (mz * 6.2 - p.vz) * Math.min(1, dt * 5); }
      // itme
      for (const o of P.players) {
        if (o === p || !o.alive || o.gone) continue;
        if (P.teamMode && o.team === p.team) continue;
        const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
        if (d < 1.3 && d > 0.01) {
          const nx = dx / d, nz = dz / d;
          p.x += nx * (1.3 - d) * 0.5; p.z += nz * (1.3 - d) * 0.5;
          if (!p.hitCd || p.hitCd <= 0) {
            const ov = [Math.sin(o.yaw) * (o.sp || 0), Math.cos(o.yaw) * (o.sp || 0)];
            const closing = Math.max(0, ov[0] * nx + ov[1] * nz);
            const push = 4.5 + closing * 0.9 + (o.dashing ? 9 : 0);
            p.vx += nx * push; p.vz += nz * push; p.dashT = 0; p.hitCd = 0.25; S.bump();
          }
        }
      }
      if (p.hitCd > 0) p.hitCd -= dt;
      p.x += p.vx * dt; p.z += p.vz * dt;
      const d = Math.hypot(p.x, p.z);
      if (d > R + 0.2) { p.vy -= 24 * dt; p.y += p.vy * dt; if (p.y > -0.4) { /* kenarda */ } }
      else { p.y = 0; p.vy = 0; }
      if (mag > 0.15 || Math.hypot(p.vx, p.vz) > 2) p.yaw += (((Math.atan2(p.vx, p.vz) - p.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI) * Math.min(1, dt * 12);
      if (p.y < -3.2) { p.alive = false; p.dieT = P.t; P.splash(p.x, p.z); P.toast('SUYA DÜŞTÜN', 1.4); }
      p.sp = Math.hypot(p.vx, p.vz); p.dashing = p.dashT > 0;
    },
    flick() {},
    over() {
      if (P.t > this.dur) return true;
      const al = P.players.filter((q) => q.alive && !q.gone);
      if (P.players.length < 2) return P.t > 30;
      if (P.teamMode) return new Set(al.map((q) => q.team)).size <= 1;
      return al.length <= 1;
    },
    rank: (q) => (q.alive ? 1e9 : q.dieT),
    hud: () => `Ayakta: ${P.players.filter((q) => q.alive && !q.gone).length}`,
    aux: () => P.me.dieT || 0,
  };
}

// ---------- ortak: şeritli atış oyunları ----------
function lane(P, i, n) { return (i - (n - 1) / 2) * 8; }
function laneCommon(P, cfg) {
  const n = P.players.length;
  const mesh = [];
  const proj = [];
  let cd = 0;
  return {
    id: cfg.id, title: cfg.title, rules: cfg.rules, dur: 38, order: 'score',
    cam: { lane: true },
    build() {
      const g = P.group;
      P.players.forEach((p, i) => {
        const lx = lane(P, i, n);
        p.lx = lx; p.x = lx; p.z = 0; p.y = 0; p.yaw = Math.PI; p.score = 0; p.mask = 0; p.alive = true;
        g.add(box(6.6, 0.4, 44, i % 2 ? 0xd9c79a : 0xe7d9ae, lx, -0.2, -20));
        g.add(box(0.15, 0.5, 44, p.color, lx - 3.3, 0.1, -20), box(0.15, 0.5, 44, p.color, lx + 3.3, 0.1, -20));
        cfg.buildLane(g, p, lx);
      });
      const gr = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x6fb85a }));
      gr.rotation.x = -Math.PI / 2; gr.position.y = -0.5;
      g.add(gr);
    },
    update(dt) {
      const p = P.me;
      if (cd > 0) cd -= dt;
      const t = P.t;
      cfg.tick?.(dt, t);
      for (let k = proj.length - 1; k >= 0; k--) {
        const b = proj[k];
        b.vy -= cfg.g * dt;
        const px = b.x, py = b.y, pz = b.z;
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        b.m.position.set(b.x, b.y, b.z);
        if (cfg.step) { if (cfg.step(b, px, py, pz) === 'done') { P.group.remove(b.m); proj.splice(k, 1); continue; } }
        if (b.y < 0.1 || b.life-- < 0) {
          cfg.land?.(b);
          P.group.remove(b.m); proj.splice(k, 1);
        }
      }
    },
    flick(dx, dy) {
      if (P.phase !== 'play' || cd > 0 || !P.me.alive) return;
      const power = clamp(-dy / 220, 0.15, 1.1), yaw = clamp(dx * 0.0032, -0.55, 0.55);
      if (power < 0.2) return;
      cd = cfg.cd;
      const v = cfg.v0 + power * cfg.vr, el = cfg.el, p = P.me;
      const b = { x: p.lx, y: 1.5, z: -0.3, vx: Math.sin(yaw) * Math.cos(el) * v, vy: Math.sin(el) * v, vz: -Math.cos(yaw) * Math.cos(el) * v, m: cfg.ball(), life: 400 };
      b.m.position.set(b.x, b.y, b.z);
      P.group.add(b.m);
      proj.push(b);
      p.throwT = 0.3;
      S.fire();
    },
    over: () => P.t > 38,
    rank: (q) => q.score || 0,
    hud: () => `Puan: ${P.me.score || 0}`,
    aux: () => P.me.mask || 0,
    remoteView: (p) => cfg.remote?.(p),
    dispose() {},
  };
}

// ---------- 2) Hedefleri devir ----------
export function targets(P) {
  const cans = new Map(); // uid -> [{m, row, col}]
  const mk = (cfgP) => laneCommon(P, cfgP);
  const cfg = {
    id: 'targets', title: 'HEDEFLERİ DEVİR', rules: 'Ekranı yukarı doğru kaydırarak (fırlatarak) topu at. Ne kadar uzun kaydırırsan o kadar güçlü. Teneke kuleyi yık. 35 sn.',
    g: 18, v0: 6, vr: 14, el: 0.62, cd: 0.7,
    ball: () => new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), M(0xe4572e)),
    buildLane(g, p, lx) {
      const list = [];
      let id = 0;
      for (let row = 0; row < 4; row++) for (let col = 0; col < 4 - row; col++) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 10), M([0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff][(row + col) % 4]));
        const x = lx + (col - (3 - row) / 2) * 1.15, y = 0.55 + row * 1.1;
        m.position.set(x, y, -17);
        g.add(m);
        list.push({ m, row, col, x, y, z: -17, fallen: false, vx: 0, vy: 0, vz: 0, id: id++, home: [x, y, -17] });
      }
      cans.set(p.uid, list);
    },
    step(b) {
      const list = cans.get(P.me.uid);
      for (const c of list) {
        if (c.fallen) continue;
        const d = Math.hypot(b.x - c.x, b.y - c.y, b.z - c.z);
        if (d < 0.95) {
          topple(c, b);
          for (const o of list) if (!o.fallen && o.row > c.row && Math.abs(o.x - c.x) < 1.3) topple(o, b);
          S.boom();
          b.vx *= 0.4; b.vz *= 0.2;
        }
      }
      const n = list.filter((c) => c.fallen).length;
      P.me.score = n + (n === list.length ? 3 : 0);
      P.me.mask = list.reduce((s, c) => s | (c.fallen ? 1 << c.id : 0), 0);
    },
    tick(dt) {
      for (const list of cans.values()) for (const c of list) if (c.fallen) { c.vy -= 16 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; if (c.y < 0.5) { c.y = 0.5; c.vy = 0; c.vx *= 0.9; c.vz *= 0.9; } c.m.position.set(c.x, c.y, c.z); c.m.rotation.x += c.vz * dt * 0.8; c.m.rotation.z -= c.vx * dt * 0.8; }
    },
    remote(p) {
      const list = cans.get(p.uid);
      if (!list || p.mask == null) return;
      for (const c of list) { const f = !!(p.mask & (1 << c.id)); if (f && !c.fallen) { c.fallen = true; c.vx = (Math.random() - 0.5) * 3; c.vz = -3; c.vy = 3; } }
    },
  };
  function topple(c, b) { c.fallen = true; c.vx = b.vx * 0.15 + (Math.random() - 0.5) * 3; c.vz = b.vz * 0.15; c.vy = 3 + Math.random() * 2; }
  const r = mk(cfg);
  r.dispose = () => cans.clear();
  return r;
}

// ---------- 3) Halka at ----------
export function rings(P) {
  const pegs = new Map();
  const cfg = {
    id: 'rings', title: 'HALKA AT', rules: 'Halkaları kaydırarak (fırlatarak) at. Uzaktaki kazığa geçirirsen daha çok puan. 35 sn.',
    g: 16, v0: 6, vr: 13, el: 0.8, cd: 0.8,
    ball: () => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.1, 6, 14), M(0xff4d6d)); m.rotation.x = Math.PI / 2; return m; },
    buildLane(g, p, lx) {
      const list = [];
      [[-6.5, -1.4], [-9.5, 1.5], [-13, -0.5], [-17, 1.6], [-21, -1.2]].forEach(([z, off], i) => {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 8), M(0xffffff));
        peg.position.set(lx + off, 0.7, z);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.1, 14), M([0x4d96ff, 0x6bcb77, 0xffd93d, 0xff9f43, 0xe4572e][i]));
        base.position.set(lx + off, 0.05, z);
        g.add(peg, base);
        list.push({ x: lx + off, z, v: i + 1, hit: false });
      });
      pegs.set(p.uid, list);
    },
    land(b) {
      const list = pegs.get(P.me.uid);
      let best = null, bd = 0.62;
      for (const pg of list) { const d = Math.hypot(b.x - pg.x, b.z - pg.z); if (d < bd) { bd = d; best = pg; } }
      if (best && b.y > -1) {
        P.me.score += best.v; P.me.mask = (P.me.mask || 0) + 1;
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.1, 6, 14), M(0xff4d6d));
        r.rotation.x = Math.PI / 2; r.position.set(best.x, 0.3 + Math.random() * 0.5, best.z);
        P.group.add(r);
        S.pick(); P.toast('+' + best.v, 0.7);
      }
    },
  };
  return laneCommon(P, cfg);
}

// ---------- 4) Deliğe sok ----------
export function hoops(P) {
  const boards = new Map();
  const cfg = {
    id: 'hoops', title: 'DELİĞE SOK', rules: 'Topu tahtadaki deliklerden geçir. Küçük delik daha çok puan, bazıları kayar. Kaydırarak at. 35 sn.',
    g: 16, v0: 6, vr: 11, el: 0.55, cd: 0.7,
    ball: () => new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), M(0x4d96ff)),
    buildLane(g, p, lx) {
      const holes = [
        { cx: -1.6, cy: 2.2, r: 1.0, v: 1, amp: 0, ph: 0 },
        { cx: 1.4, cy: 3.9, r: 0.8, v: 2, amp: 1.1, ph: 1 },
        { cx: 0, cy: 6.0, r: 0.62, v: 3, amp: 1.7, ph: 2 },
      ].map((h) => ({ ...h, m: null }));
      const board = box(6.2, 8, 0.4, 0x7a4fd1, lx, 4, -12);
      g.add(board);
      holes.forEach((h, i) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(h.r, h.r, 0.6, 20), M([0xffd93d, 0xff9f43, 0xe4572e][i]));
        m.rotation.x = Math.PI / 2;
        m.position.set(lx + h.cx, h.cy, -11.8);
        g.add(m);
        h.m = m; h.lx = lx;
      });
      boards.set(p.uid, holes);
    },
    tick(dt, t) { for (const holes of boards.values()) for (const h of holes) { h.x = h.lx + h.cx + Math.sin(t * 1.4 + h.ph) * h.amp; h.m.position.x = h.x; } },
    step(b, px, py, pz) {
      if (pz > -12 && b.z <= -12) {
        const holes = boards.get(P.me.uid);
        const hit = holes.find((h) => Math.hypot(b.x - h.x, b.y - h.cy) < h.r - 0.12);
        if (hit) { P.me.score += hit.v; P.me.mask = (P.me.mask || 0) + 1; S.pick(); P.toast('+' + hit.v, 0.7); return 'done'; }
        b.vz = 3; b.vx *= 0.3; S.bump();
      }
    },
  };
  return laneCommon(P, cfg);
}

// ---------- 5) Engel parkuru ----------
export function obstacle(P) {
  const floors = [], moving = [], sweepers = [];
  const cps = [0, -54, -92, -125];
  const FIN = -142;
  const add = (g, w, d, x, z, c = 0x6bcb77) => { const o = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y: 0 }; floors.push(o); g.add(box(w, 1, d, c, x, -0.5, z)); return o; };
  return {
    id: 'obstacle', title: 'ENGEL PARKURU', rules: 'Önce bitişe ulaş! Dönen çubukların üstünden zıpla, boşlukları aş, kayan platformlara bin. Düşersen son noktadan devam edersin.', dur: 130, order: 'race',
    cam: { follow: true },
    build() {
      const g = P.group;
      add(g, 12, 26, 0, -9, 0x6bcb77);
      for (let i = 0; i < 6; i++) add(g, 3.2, 3.2, i % 2 ? 1.7 : -1.7, -26 - i * 5.2, [0xffd93d, 0xff9f43][i % 2]);
      add(g, 11, 18, 0, -62, 0x4d96ff);
      for (let i = 0; i < 3; i++) { const o = { w: 4.2, d: 4.2, z: -77 - i * 6, ph: i * 2.1, x: 0, y: 0, x0: 0, x1: 0, z0: 0, z1: 0 }; o.m = box(4.2, 0.7, 4.2, 0xe4572e, 0, -0.35, o.z); g.add(o.m); moving.push(o); }
      add(g, 11, 9, 0, -96, 0xb28bff);
      add(g, 1.8, 24, 0, -112, 0xffffff);
      add(g, 11, 20, 0, -134, 0x6bcb77);
      for (const [z, w, spd, h] of [[-12, 5.8, 1.7, 0.5], [-62, 4.8, -2.1, 0.5], [-130, 5.2, 2.4, 0.5]]) {
        const arm = box(w * 2, 0.6, 0.45, 0xff3b3b, 0, h, z);
        const hub = box(0.8, 1.6, 0.8, 0x222222, 0, 0.8, z);
        g.add(arm, hub);
        sweepers.push({ z, w, spd, arm, ang: 0 });
      }
      const fin = box(12, 0.4, 1.5, 0xffd84a, 0, 6, FIN);
      g.add(fin, box(0.6, 6, 0.6, 0xffffff, -6, 3, FIN), box(0.6, 6, 0.6, 0xffffff, 6, 3, FIN));
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0x2f9fe0 }));
      sea.rotation.x = -Math.PI / 2; sea.position.y = -9;
      g.add(sea);
      const n = P.players.length;
      P.players.forEach((p, i) => { p.x = (i - (n - 1) / 2) * 2.2; p.z = 3; p.y = 0; p.vx = p.vz = p.vy = 0; p.yaw = Math.PI; p.cp = 0; p.alive = true; p.finished = false; p.finT = 0; p.stunT = 0; });
    },
    update(dt) {
      const t = P.t, p = P.me;
      for (const s of sweepers) { s.ang = t * s.spd; s.arm.rotation.y = s.ang; }
      for (const m of moving) { m.x = Math.sin(t * 0.9 + m.ph) * 3.4; m.m.position.x = m.x; m.x0 = m.x - 2.1; m.x1 = m.x + 2.1; m.z0 = m.z - 2.1; m.z1 = m.z + 2.1; }
      if (p.finished) return;
      const run = P.phase === 'play';
      if (p.stunT > 0) p.stunT -= dt;
      const mx = run && p.stunT <= 0 ? P.input.mx : 0, mz = run && p.stunT <= 0 ? -P.input.my : 0;
      const mag = Math.min(1, Math.hypot(mx, mz));
      p.vx += (mx * 7 - p.vx) * Math.min(1, dt * (p.ground ? 12 : 3));
      p.vz += (mz * 7 - p.vz) * Math.min(1, dt * (p.ground ? 12 : 3));
      if (run && P.input.jump && p.ground) { p.vy = 9.2; p.ground = false; P.input.jump = false; S.land(false); }
      p.vy -= 26 * dt;
      p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
      for (const o of P.players) {
        if (o === p || o.gone) continue;
        const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
        if (d < 1.1 && d > 0.01 && Math.abs(p.y - o.y) < 1.5) { p.x += (dx / d) * (1.1 - d) * 0.5; p.z += (dz / d) * (1.1 - d) * 0.5; if (!(p.hitCd > 0)) { p.vx += (dx / d) * 3; p.vz += (dz / d) * 3; p.hitCd = 0.3; } }
      }
      if (p.hitCd > 0) p.hitCd -= dt;
      p.ground = false;
      const all = floors.concat(moving);
      for (const f of all) {
        if (p.x > f.x0 - 0.3 && p.x < f.x1 + 0.3 && p.z > f.z0 - 0.3 && p.z < f.z1 + 0.3 && p.vy <= 0.5 && p.y <= 0.3 && p.y >= -0.7) {
          p.y = 0; p.vy = 0; p.ground = true;
          if (f.m && f.m === undefined) { /* yok */ }
          if (f.m) { p.x += (f.x - (f.px ?? f.x)); }
        }
      }
      for (const f of moving) f.px = f.x;
      // süpürücüler
      for (const s of sweepers) {
        if (Math.abs(p.z - s.z) < 7 && p.y < 1.0) {
          const dx = p.x, dz = p.z - s.z;
          const ax = Math.cos(s.ang), az = -Math.sin(s.ang);
          const along = dx * ax + dz * az, perp = Math.abs(-dx * az + dz * ax);
          if (Math.abs(along) < s.w && perp < 0.7) {
            const side = Math.sign(-dx * az + dz * ax) || 1;
            p.vx = -az * -side * 9 + 0; p.vz = ax * side * 9;
            p.vy = 5; p.ground = false; p.stunT = 0.5; S.bump();
          }
        }
      }
      if (mag > 0.15) p.yaw += (((Math.atan2(p.vx, p.vz) - p.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI) * Math.min(1, dt * 12);
      for (let i = cps.length - 1; i >= 0; i--) if (p.z < cps[i] - 1 && p.ground && p.cp < i) { p.cp = i; if (i > 0) P.toast('KONTROL NOKTASI', 1); }
      if (p.y < -8) { p.x = 0; p.z = cps[p.cp] === 0 ? 3 : cps[p.cp] - 1; p.y = 0.2; p.vx = p.vz = p.vy = 0; P.toast('Düştün!', 1); S.fall(); }
      if (p.z < FIN && run) { p.finished = true; p.finT = P.t; P.toast('BİTTİ!', 1.5); S.done(); }
      p.sp = Math.hypot(p.vx, p.vz);
    },
    flick() {},
    over() {
      const fin = P.players.filter((q) => q.finished && !q.gone);
      const alive = P.players.filter((q) => !q.gone);
      if (fin.length === alive.length) return true;
      if (fin.length && P.t - Math.min(...fin.map((q) => q.finT)) > 22) return true;
      return P.t > this.dur;
    },
    rank: (q) => (q.finished ? 1e6 - q.finT : -q.z),
    hud: () => `İlerleme: ${Math.round(clamp(-P.me.z / -FIN, 0, 1) * 100)}%`,
    aux: () => (P.me.finished ? P.me.finT : 0),
  };
}

export const PLAN = [sumo, targets, rings, hoops, obstacle];
