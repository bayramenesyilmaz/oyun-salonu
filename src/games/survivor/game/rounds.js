import * as THREE from 'three';
import * as S from '../../bulutyaris/game/sfx.js';
import { clamp, TAU, Ball, arc, surface, solveShot, rngSeed, angDiff, PR } from './phys.js';

const M = (c, o) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const isLocal = (p) => !p.remote || p.bot;       // bu istemcinin simüle ettiği oyuncu
const ballMesh = (c = 0xff7a2a, r = 0.25) => new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), M(c));
const fall = (p) => p.y < -5.5;

// kutu + görsel
function block(P, solids, x0, x1, y0, y1, z0, z1, color, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), M(color, o.mat));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  P.group.add(m);
  const b = { x0, x1, y0, y1, z0, z1, mesh: m, wall: !!o.wall };
  if (o.solid !== false) solids.push(b);
  return b;
}
function sky(P, c, fog) { P.scene.background = new THREE.Color(c); if (fog) P.scene.fog = new THREE.Fog(c, fog[0], fog[1]); }
function ground(P, y, c, size = 400) { const g = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M(c)); g.rotation.x = -Math.PI / 2; g.position.y = y; P.group.add(g); return g; }
function pop(P, x, y, z, text, color = '#ffd84a') {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x2 = c.getContext('2d');
  x2.font = '800 46px sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.lineWidth = 8; x2.strokeStyle = 'rgba(0,0,0,.7)'; x2.strokeText(text, 64, 34); x2.fillStyle = color; x2.fillText(text, 64, 34);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  sp.scale.set(2.4, 1.2, 1); sp.position.set(x, y, z); sp.renderOrder = 12; P.scene.add(sp);
  P.fx.push({ m: sp, vx: 0, vz: 0, vy: 2.5, life: 1.1, noG: true });
}
// yük (şarj) mantığı: bırakınca fırlat
function chargeStep(p, inp, dt, can, onThrow, time = 0.95) {
  if (p.cd > 0) p.cd -= dt;
  if (inp.act && can && p.cd <= 0) { p.charge = Math.min(1, (p.charge || 0) + dt / time); p.charging = true; }
  else if (p.charging) { const c = p.charge; p.charge = 0; p.charging = false; if (c > 0.07) { p.cd = 0.4; p.throwT = 0.3; onThrow(c); } }
}
function laneX(P, i) { const n = P.players.length; return (i - (n - 1) / 2) * 7.6; }
const alivePl = (P) => P.players.filter((q) => !q.gone);

// =====================================================================
// 1) SUYA İT
// =====================================================================
export function sumo(P) {
  const R0 = 11.5;
  let R = R0;
  const solids = [];
  const rd = { solids };
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.4, 40), M(0xf0b43c));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 6, 48), new THREE.MeshBasicMaterial({ color: 0xe4572e }));
  ring.rotation.x = Math.PI / 2;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 0.5), M(0xd8362a)); bar.position.y = 0.9;
  const bar2 = bar.clone();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.8, 10), M(0x7a2018)); pole.position.y = 0.9;
  let ang = 0, shoveHit = new Set();
  const hits = (p, o) => P.teamMode && p.team === o.team;
  const impulse = (v, ix, iy, iz, by) => {
    if (v.remote && !v.bot) P.emit({ t: 'imp', r: P.round, to: v.uid, vx: ix, vy: iy, vz: iz });
    else { v.vx += ix; v.vz += iz; v.vy = Math.max(v.vy, iy); v.stun = 0.55; v.ground = false; }
    void by;
  };
  const barHit = (p) => {
    if (!p.alive || p.y > 1.5) return;
    for (let k = 0; k < 2; k++) {
      const a = ang + k * Math.PI, dx = Math.cos(a), dz = Math.sin(a);
      const t = clamp(p.x * dx + p.z * dz, 0, R), cx = dx * t, cz = dz * t;
      if (Math.hypot(p.x - cx, p.z - cz) < 0.75) {
        const tx = -dz * Math.sign(omega()), tz = dx * Math.sign(omega());
        if (isLocal(p)) { p.vx = tx * 12 + dx * 2; p.vz = tz * 12 + dz * 2; p.vy = 5; p.stun = 0.5; p.ground = false; S.bump(); }
      }
    }
  };
  const omega = () => 1.2 + Math.min(1.1, P.pt * 0.03);
  const doShove = (p, dt) => {
    // ileri atılma + önündekilere darbe
    if (p.shoveT > 0) {
      p.shoveT -= dt;
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      for (const o of alivePl(P)) {
        if (o === p || !o.alive || shoveHit.has(p.uid + o.uid) || hits(p, o)) continue;
        const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz);
        if (d < 2.3 && (dx * fx + dz * fz) / (d || 1) > 0.25) {
          shoveHit.add(p.uid + o.uid);
          const nx = dx / (d || 1), nz = dz / (d || 1), sp = Math.hypot(p.vx, p.vz);
          impulse(o, nx * (14 + sp * 0.6), 5.5, nz * (14 + sp * 0.6), p); S.bump();
          if (o.team !== p.team || !P.teamMode) { p.score += 0; }
        }
      }
    }
  };
  const startShove = (p) => { p.shoveT = 0.3; p.shoveCd = 1.0; const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); p.vx += fx * 8; p.vz += fz * 8; for (const k of [...shoveHit]) if (k.startsWith(p.uid)) shoveHit.delete(k); };
  rd.floorAt = (x, z) => (Math.hypot(x, z) < R ? 0 : null);
  const botAI = (b, dt) => {
    if (!b.alive) return;
    const br = b.brain;
    if (b.shoveCd > 0) b.shoveCd -= dt;
    const edge = Math.hypot(b.x, b.z);
    let tgt = null, best = 1e9;
    for (const o of alivePl(P)) { if (o === b || !o.alive || hits(b, o)) continue; const d = Math.hypot(o.x - b.x, o.z - b.z); if (d < best) { best = d; tgt = o; } }
    let dx, dz;
    if (!tgt || edge > R - 1.8) { dx = -b.x; dz = -b.z; } else { dx = tgt.x - b.x; dz = tgt.z - b.z; if (edge > R - 3.2 && best > 3) { dx = -b.x * 0.6 + dx * 0.4; dz = -b.z * 0.6 + dz * 0.4; } }
    // dönen çubuktan kaçış: yakınsa zıpla
    let jump = false;
    for (let k = 0; k < 2; k++) { const a = ang + k * Math.PI + omega() * 0.35, ex = Math.cos(a) * Math.min(R, edge), ez = Math.sin(a) * Math.min(R, edge); if (Math.hypot(b.x - ex, b.z - ez) < 2.0 && b.ground && Math.random() < b.skill * dt * 9) jump = true; }
    const m = Math.hypot(dx, dz) || 1; dx /= m; dz /= m;
    b.yaw = Math.atan2(-dx, -dz);
    if (tgt && best < 2.0 && b.shoveCd <= 0 && b.shoveT <= 0 && Math.random() < b.skill * dt * 3 && edge < R - 1.5) startShove(b);
    P.stepActor(b, { wx: dx * (0.7 + b.skill * 0.3), wz: dz * (0.7 + b.skill * 0.3), jump }, dt, rd, { speed: 6.2 });
  };
  return Object.assign(rd, {
    id: 'sumo', title: 'SUYA İT', dur: 90, order: 'surv',
    rules: 'Rakiplerini platformdan suya it! İT düğmesi önüne doğru atılıp iter. Kırmızı çubuktan zıplayarak geç. Platform küçülür; en son kalan kazanır.',
    introCam(t) { const a = t * 0.5; return { pos: [Math.cos(a) * 22, 14, Math.sin(a) * 22], look: [0, 0, 0] }; },
    build() {
      sky(P, 0x8fd2ff);
      P.group.add(plat, ring, bar, bar2, pole);
      plat.position.y = -0.7;
      const w = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x2f9fe0 })); w.rotation.x = -Math.PI / 2; w.position.y = -4; P.group.add(w);
      const n = P.players.length;
      P.players.forEach((p, i) => { const a = (i / n) * TAU + 0.6; p.x = Math.cos(a) * 7; p.z = Math.sin(a) * 7; p.y = 0; p.yaw = Math.atan2(-p.x * -1, p.z) + Math.PI; p.yaw = Math.atan2(p.x, p.z); p.pitch = -0.15; p.shoveCd = 0; p.shoveT = 0; p.ground = true; });
    },
    onEv(e) { if (e.t === 'imp' && e.to === P.me.uid) { const m = P.me; m.vx += e.vx; m.vz += e.vz; m.vy = Math.max(m.vy, e.vy); m.stun = 0.55; m.ground = false; } },
    update(dt) {
      if (P.phase === 'play' && P.pt > 10) R = Math.max(4.4, R0 - (P.pt - 10) * 0.2);
      plat.scale.set(R, 1, R); ring.scale.set(R, R, 1); ring.position.y = 0.02;
      if (P.phase === 'play' || P.phase === 'ending') ang += omega() * dt;
      bar.scale.x = R; bar2.scale.x = R;
      bar.position.set(Math.cos(ang) * R / 2, 0.9, Math.sin(ang) * R / 2); bar.rotation.y = -ang;
      bar2.position.set(Math.cos(ang + Math.PI) * R / 2, 0.9, Math.sin(ang + Math.PI) * R / 2); bar2.rotation.y = -ang;
      const me = P.me, run = P.phase === 'play';
      const inp = P.inputFor(me);
      if (me.shoveCd > 0) me.shoveCd -= dt;
      if (me.alive) {
        if (run && inp.actEdge && me.shoveCd <= 0 && !(me.stun > 0)) startShove(me);
        P.stepActor(me, inp, dt, rd, { speed: 7 });
        if (run) barHit(me);
        doShove(me, dt);
        if (fall(me)) { me.alive = false; me.dieT = P.pt; P.splash(me.x, -3.8, me.z); S.fall(); }
      }
      for (const b of P.players) if (b.bot && b.alive) { if (run) { botAI(b, dt); barHit(b); doShove(b, dt); if (fall(b)) { b.alive = false; b.dieT = P.pt; P.splash(b.x, -3.8, b.z); } } }
      // oyuncu-oyuncu itişme (yumuşak)
      const ps = alivePl(P).filter((q) => q.alive);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d < 1.0 && d > 0.001) { const o = (1.0 - d) / 2, nx = dx / d, nz = dz / d; if (isLocal(a)) { a.x -= nx * o; a.z -= nz * o; } if (isLocal(b)) { b.x += nx * o; b.z += nz * o; } }
      }
    },
    over() {
      const al = alivePl(P).filter((q) => q.alive);
      if (P.teamMode) { const teams = new Set(al.map((q) => q.team)); if (teams.size <= 1) return true; } else if (al.length <= 1) return true;
      return P.pt > this.dur;
    },
    rank: (q) => (q.alive ? 1e6 : q.dieT),
    hud: () => `Hayatta: ${alivePl(P).filter((q) => q.alive).length}`,
    hudx: () => ({ act: 'İT', cross: false, tip: P.me.shoveCd > 0 ? '' : '' }),
    aux: () => P.me.dieT || 0,
    showDead: () => false,
  });
}

// =====================================================================
// şerit turları için ortak parçalar
// =====================================================================
function laneArena(P, solids, o) {
  sky(P, o.sky, [60, 170]);
  ground(P, -0.01, o.grass);
  const n = P.players.length;
  P.players.forEach((p, i) => {
    const x = laneX(P, i);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 60), M(p.color, { transparent: true, opacity: 0.35 })); strip.rotation.x = -Math.PI / 2; strip.position.set(x, 0.01, -2); P.group.add(strip);
    block(P, solids, x - 3.3, x - 3.1, 0, 0.5, -4, 11, 0xffffff, { solid: false });
    block(P, solids, x + 3.1, x + 3.3, 0, 0.5, -4, 11, 0xffffff, { solid: false });
    const line = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff })); line.rotation.x = -Math.PI / 2; line.position.set(x, 0.02, 6); P.group.add(line);
    p.lane = i; p.lx = x; p.x = x; p.z = 9; p.y = 0; p.yaw = 0; p.pitch = 0.18; p.cd = 0; p.ground = true;
  });
  void n;
}
function clampLane(p) {
  const lo = p.lx - 2.7, hi = p.lx + 2.7;
  if (p.x < lo) { p.x = lo; p.vx = 0; } if (p.x > hi) { p.x = hi; p.vx = 0; }
  if (p.z < 6.6) { p.z = 6.6; p.vz = 0; } if (p.z > 11) { p.z = 11; p.vz = 0; }
}

// =====================================================================
// 2) KULEYİ YIK (teneke)
// =====================================================================
export function targets(P) {
  const solids = [];
  const rd = { solids, floorAt: () => 0 };
  const TZ = -5, CR = 0.38, G = 24;
  let cans = [], balls = [], cid = 0, tt = 0;
  const canGeo = new THREE.CylinderGeometry(CR * 0.9, CR * 0.9, CR * 2, 12);
  const home = (lane, i) => { const rows = [4, 3, 2, 1]; let k = i, r = 0; while (k >= rows[r]) { k -= rows[r]; r++; } return [laneX(P, lane) + (k - (rows[r] - 1) / 2) * 0.82, CR + r * CR * 2, TZ]; };
  function buildTower(lane, owner) {
    const col = [0xe5483a, 0xf2c230, 0x2f9fe0, 0xffffff];
    for (let i = 0; i < 10; i++) {
      const [x, y, z] = home(lane, i);
      const m = new THREE.Mesh(canGeo, M(col[(i + lane) % 4])); m.position.set(x, y, z); P.group.add(m);
      cans.push({ lane, owner, x, y, z, vx: 0, vy: 0, vz: 0, hx: x, hy: y, hz: z, awake: false, rest: 0, m, down: false });
    }
  }
  function clearLane(lane) { cans = cans.filter((c) => { if (c.lane === lane) { P.group.remove(c.m); return false; } return true; }); }
  const wake = (c) => {
    if (c.awake) return; c.awake = true; c.rest = 0;
    for (const o of cans) if (!o.awake && o.lane === c.lane && o.y > c.y + 0.25 && Math.hypot(o.x - c.x, o.z - c.z) < 0.9) wake(o);
  };
  function spawnBall(owner, o, v, lane) {
    const b = new Ball({ x: o[0], y: o[1], z: o[2], vx: v[0], vy: v[1], vz: v[2], r: 0.25, g: 18, owner, lane, life: 6, rest: 0.4 });
    b.mesh = ballMesh(owner.color); b.mesh.position.set(b.x, b.y, b.z); P.group.add(b.mesh); balls.push(b); S.fire();
  }
  const owners = () => P.players;
  const speedOf = (c) => 10 + 17 * c;
  function throwMine(p, c) {
    const f = P.forward(p), e = P.eye(p), sp = speedOf(c);
    const o = [e[0] + f[0] * 0.6, e[1] + f[1] * 0.6 - 0.1, e[2] + f[2] * 0.6], v = [f[0] * sp, f[1] * sp, f[2] * sp];
    spawnBall(p, o, v, p.lane);
    if (!p.bot) P.emit({ t: 'th', r: P.round, uid: p.uid, o, v });
  }
  function stepPhysics(dt) {
    // toplar
    for (const b of balls) {
      b.step(dt, rd);
      for (const c of cans) {
        if (c.lane !== b.lane) continue;
        const dx = c.x - b.x, dy = c.y - b.y, dz = c.z - b.z, d = Math.hypot(dx, dy, dz), md = CR + b.r;
        if (d < md && d > 0.0001) {
          const nx = dx / d, ny = dy / d, nz = dz / d, rv = (b.vx - c.vx) * nx + (b.vy - c.vy) * ny + (b.vz - c.vz) * nz;
          if (rv > 0) {
            const j = (1.35 * rv) / (1 / 2.4 + 1);
            c.vx += nx * j; c.vy += ny * j + 1.5; c.vz += nz * j;
            b.vx -= nx * j / 2.4; b.vy -= ny * j / 2.4; b.vz -= nz * j / 2.4;
            wake(c); S.bump();
          }
          b.x -= nx * (md - d) * 0.5; b.y -= ny * (md - d) * 0.5; b.z -= nz * (md - d) * 0.5;
        }
      }
      b.mesh.position.set(b.x, b.y, b.z);
    }
    balls = balls.filter((b) => { if (b.dead) { P.group.remove(b.mesh); return false; } return true; });
    // tenekeler
    for (const c of cans) {
      if (!c.awake) continue;
      c.vy -= G * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      if (c.y < CR) { c.y = CR; if (c.vy < -2) c.vy *= -0.25; else c.vy = 0; const f = Math.max(0, 1 - 5.5 * dt); c.vx *= f; c.vz *= f; }
      if (c.z > 12) { c.z = 12; c.vz *= -0.3; }
      const sp = Math.hypot(c.vx, c.vy, c.vz);
      c.rest = sp < 0.5 && c.y <= CR + 0.02 ? c.rest + dt : 0;
      if (c.rest > 0.4) { c.awake = false; c.vx = c.vy = c.vz = 0; }
    }
    for (let i = 0; i < cans.length; i++) for (let j = i + 1; j < cans.length; j++) {
      const a = cans[i], b = cans[j];
      if (a.lane !== b.lane || (!a.awake && !b.awake)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz), md = CR * 2 * 0.98;
      if (d < md && d > 0.0001) {
        const nx = dx / d, ny = dy / d, nz = dz / d, o = (md - d) / 2;
        if (a.awake) { a.x -= nx * o; a.y -= ny * o; a.z -= nz * o; } if (b.awake) { b.x += nx * o; b.y += ny * o; b.z += nz * o; }
        const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny + (a.vz - b.vz) * nz;
        if (rv > 0) { const k = rv * 0.65; a.vx -= nx * k; a.vy -= ny * k; a.vz -= nz * k; b.vx += nx * k; b.vy += ny * k; b.vz += nz * k; if (!b.awake) wake(b); if (!a.awake) wake(a); }
      }
    }
    // puan: devrilen / yerinden çıkan
    const perLane = {};
    for (const c of cans) {
      c.m.position.set(c.x, c.y, c.z);
      if (!c.down && (Math.hypot(c.x - c.hx, c.z - c.hz) > 1.0 || c.y < c.hy - 0.4)) {
        c.down = true;
        if (isLocal(c.owner)) { c.owner.score += 1; if (c.owner === P.me) pop(P, c.x, c.y + 1, c.z, '+1'); }
      }
      (perLane[c.lane] = perLane[c.lane] || []).push(c);
    }
    for (const l in perLane) {
      const arr = perLane[l];
      if (arr.length >= 10 && arr.every((c) => c.down) && !rd.rebuild[l]) {
        rd.rebuild[l] = 1.6;
        const ow = arr[0].owner;
        if (isLocal(ow)) { ow.score += 4; if (ow === P.me) { P.toast('KULE YIKILDI! +4', 1.6); S.trick(); } }
      }
    }
    for (const l in rd.rebuild) { if (rd.rebuild[l] > 0) { rd.rebuild[l] -= dt; if (rd.rebuild[l] <= 0) { delete rd.rebuild[l]; const ow = owners()[+l]; clearLane(+l); buildTower(+l, ow); } } }
  }
  const botAI = (b, dt) => {
    b.nextT -= dt;
    const tgt = [b.lx + (Math.random() - 0.5) * 0.6, 1.2, TZ];
    b.yaw = 0; b.pitch = 0.2;
    if (b.nextT > 0.5) { b.charge = 0; return; }
    b.charge = clamp(1 - b.nextT, 0, 1);
    if (b.nextT <= 0) {
      const e = P.eye(b), c = 0.55 + Math.random() * 0.35, sp = speedOf(c);
      const v = solveShot(e, tgt, sp, 18), err = (1 - b.skill) * 0.22;
      v[0] += (Math.random() - 0.5) * err * sp; v[1] += (Math.random() - 0.5) * err * sp * 0.7; v[2] += (Math.random() - 0.5) * err * sp * 0.4;
      spawnBall(b, [e[0], e[1] - 0.1, e[2] - 0.6], v, b.lane); b.throwT = 0.3; b.charge = 0;
      b.nextT = 1.4 + (1 - b.skill) * 2.2 + Math.random() * 0.8;
    }
  };
  return Object.assign(rd, {
    id: 'targets', title: 'KULEYİ YIK', dur: 45, order: 'score', rebuild: {},
    rules: 'Basılı tut: güç dolar, bırak: top gider. Noktalı yay topun yolunu gösterir. Tenekeleri yerinden çıkar; tüm kuleyi yıkarsan +4 bonus, kule yeniden dizilir.',
    introCam: (t) => ({ pos: [Math.sin(t * 0.4) * 10, 5 + Math.sin(t) * 0.6, 20], look: [0, 1.5, -4] }),
    build() {
      laneArena(P, solids, { sky: 0x8fd2ff, grass: 0x7ec86a });
      P.players.forEach((p, i) => { p.charge = 0; p.charging = false; buildTower(i, p); if (p.bot) p.nextT = 1.2 + i * 0.4; });
      // arka duvar
      block(P, solids, -20, 20, 0, 6, -16, -15, 0x3a6aa8, { solid: false });
    },
    holding: () => true,
    onEv(e) {
      if (e.t === 'th') { const p = P.players.find((q) => q.uid === e.uid); if (p && p !== P.me) spawnBall(p, e.o, e.v, p.lane); }
    },
    update(dt) {
      const me = P.me, run = P.phase === 'play';
      const inp = P.inputFor(me);
      if (run || P.phase === 'count') {
        P.stepActor(me, inp, dt, rd, { speed: 5.5 }); clampLane(me);
        chargeStep(me, inp, dt, run, (c) => throwMine(me, c));
      }
      // önizleme yayı
      if (run && me.charging) { const f = P.forward(me), e = P.eye(me), sp = speedOf(me.charge); P.arcPts = arc([e[0] + f[0] * 0.6, e[1] + f[1] * 0.6 - 0.1, e[2] + f[2] * 0.6], [f[0] * sp, f[1] * sp, f[2] * sp], 18, 28, 0.07); } else P.arcPts = null;
      for (const b of P.players) if (b.bot && run) botAI(b, dt);
      stepPhysics(dt);
    },
    over: () => P.pt > 45,
    rank: (q) => q.score,
    hud: () => `Puanın: ${P.me.score}   ` + P.players.filter((q) => q !== P.me && !q.gone).map((q) => `${q.name} ${q.score}`).join(' · '),
    hudx: () => ({ act: 'FIRLAT' }),
    aux: () => 0,
    dispose() { cans = []; balls = []; },
  });
}

// =====================================================================
// 3) DELİĞE SOK
// =====================================================================
export function hoops(P) {
  const solids = [];
  const rd = { solids, floorAt: () => 0 };
  const BZ = -7, BW = 3.3, G = 18;
  let balls = [];
  const holes = [];
  const defs = [
    { id: 'top', y: 7.6, r: 1.0, pts: 5, mx: 1.7, spd: 1.1 },
    { id: 'l', x: -1.75, y: 4.6, r: 0.95, pts: 3, my: 0.7, spd: 1.4 },
    { id: 'r', x: 1.75, y: 4.6, r: 0.95, pts: 3, my: 0.7, spd: 1.4, ph: 3.1 },
    { id: 'low', y: 2.2, r: 1.3, pts: 1 },
  ];
  const speedOf = (c) => 10 + 18 * c;
  function holePos(h, t) { return [h.cx + (h.mx ? Math.sin(t * h.spd + h.ph) * h.mx : 0), h.cy + (h.my ? Math.sin(t * h.spd + h.ph) * h.my : 0)]; }
  function spawnBall(owner, o, v) {
    const b = new Ball({ x: o[0], y: o[1], z: o[2], vx: v[0], vy: v[1], vz: v[2], r: 0.28, g: G, owner, life: 6, rest: 0.35 });
    b.mesh = ballMesh(owner.color, 0.28); b.mesh.position.set(b.x, b.y, b.z); P.group.add(b.mesh); balls.push(b); S.fire();
  }
  function throwMine(p, c) {
    const f = P.forward(p), e = P.eye(p), sp = speedOf(c);
    const o = [e[0] + f[0] * 0.6, e[1] + f[1] * 0.6 - 0.1, e[2] + f[2] * 0.6], v = [f[0] * sp, f[1] * sp, f[2] * sp];
    spawnBall(p, o, v);
    P.emit({ t: 'th', r: P.round, uid: p.uid, o, v });
  }
  function stepPhysics(dt) {
    const t = P.pt;
    for (const b of balls) {
      const pz = b.z;
      b.step(dt, rd);
      if (!b.passed && pz > BZ && b.z <= BZ) {
        const s = (pz - BZ) / (pz - b.z), hx = b.x - b.vx * dt * (1 - s), hy = b.y - b.vy * dt * (1 - s);
        const lx = b.owner.lx;
        let scored = null;
        for (const h of holes) {
          if (h.lane !== b.owner.lane) continue;
          const [px, py] = holePos(h, t);
          if (Math.hypot(hx - (lx + px), hy - py) < h.r - 0.05) { scored = h; break; }
        }
        const inBoard = Math.abs(hx - lx) < BW && hy > 0.2 && hy < 9.6;
        if (scored) {
          b.passed = true;
          if (isLocal(b.owner)) { b.owner.score += scored.pts; if (b.owner === P.me) { pop(P, lx, scored.y + 0.5, BZ + 1, '+' + scored.pts); P.toast(scored.pts >= 5 ? 'MÜKEMMEL! +5' : '+' + scored.pts, 0.9); S.trick(); } }
          P.splash(hx, hy, BZ - 0.5, 0xffd84a, 10);
        } else if (inBoard) { b.z = BZ + b.r; b.vz = Math.abs(b.vz) * 0.3; b.vx *= 0.7; S.bump(); b.passed = false; }
      }
      b.mesh.position.set(b.x, b.y, b.z);
      if (b.passed && b.z < BZ - 8) b.life = Math.min(b.life, 0.2);
    }
    balls = balls.filter((b) => { if (b.dead) { P.group.remove(b.mesh); return false; } return true; });
    for (const h of holes) { const [px, py] = holePos(h, t); h.grp.position.set(h.owner.lx + px, py, BZ + 0.05); }
  }
  const botAI = (b, dt) => {
    b.nextT -= dt;
    b.yaw = 0; b.pitch = 0.35;
    if (b.nextT > 0.5) { b.charge = 0; return; }
    b.charge = clamp(1 - b.nextT, 0, 1);
    if (b.nextT <= 0) {
      const pick = Math.random() < 0.3 * b.skill + 0.1 ? holes.find((h) => h.lane === b.lane && h.id === 'top') : holes.find((h) => h.lane === b.lane && h.id === (Math.random() < 0.5 ? 'l' : 'r')) || holes[0];
      const hh = Math.random() < 0.45 ? holes.find((h) => h.lane === b.lane && h.id === 'low') : pick;
      const [px, py] = holePos(hh, P.pt + 0.5), e = P.eye(b);
      const sp = 22 + Math.random() * 2;
      const v = solveShot(e, [b.lx + px, py, BZ], sp, G), err = (1 - b.skill) * 0.2 + 0.07;
      v[0] += (Math.random() - 0.5) * err * sp; v[1] += (Math.random() - 0.5) * err * sp * 0.8;
      spawnBall(b, [e[0], e[1] - 0.1, e[2] - 0.6], v); b.throwT = 0.3; b.charge = 0;
      b.nextT = 1.8 + (1 - b.skill) * 2.4 + Math.random() * 1.0;
    }
  };
  return Object.assign(rd, {
    id: 'hoops', title: 'DELİĞE SOK', dur: 45, order: 'score',
    rules: 'Basılı tut: güç dolar, bırak: top gider. Noktalı yay yolu gösterir. Deliklerden geçir: üstteki küçük delik 5, yanlar 3, alttaki 1 puan. Deliklerin bazıları kayar!',
    introCam: (t) => ({ pos: [Math.sin(t * 0.4) * 8, 4.5, 18], look: [0, 4.5, -7] }),
    build() {
      laneArena(P, solids, { sky: 0xffd9a0, grass: 0x8ecf6a });
      P.players.forEach((p, i) => {
        const x = laneX(P, i);
        const board = new THREE.Mesh(new THREE.BoxGeometry(BW * 2, 9.4, 0.3), M(0x2b4f9a)); board.position.set(x, 4.7, BZ - 0.18); P.group.add(board);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(BW * 2 - 0.3, 9, 1, 1), M(p.color, { transparent: true, opacity: 0.25 })); face.position.set(x, 4.7, BZ - 0.02); P.group.add(face);
        for (const s of [-1, 1]) block(P, solids, x + s * BW - 0.12, x + s * BW + 0.12, 0, 9.6, BZ - 0.4, BZ + 0.1, 0xffffff, { solid: false });
        defs.forEach((d) => {
          const h = { ...d, lane: i, owner: p, cx: d.x || 0, cy: d.y, ph: d.ph || i };
          const grp = new THREE.Group();
          const dark = new THREE.Mesh(new THREE.CircleGeometry(d.r, 28), new THREE.MeshBasicMaterial({ color: 0x0a1020 })); grp.add(dark);
          const rim = new THREE.Mesh(new THREE.TorusGeometry(d.r, 0.1, 8, 28), new THREE.MeshBasicMaterial({ color: d.pts >= 5 ? 0xffd84a : d.pts === 3 ? 0xff7a2a : 0xffffff })); grp.add(rim);
          const lab = document.createElement('canvas'); lab.width = 64; lab.height = 64; const c2 = lab.getContext('2d'); c2.font = '800 40px sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillStyle = '#fff'; c2.fillText(String(d.pts), 32, 36);
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lab), transparent: true })); sp.scale.set(0.9, 0.9, 1); sp.position.set(0, d.r + 0.6, 0.05); grp.add(sp);
          P.group.add(grp); h.grp = grp; holes.push(h);
        });
        p.charge = 0; p.charging = false; if (p.bot) p.nextT = 1.2 + i * 0.5;
      });
      holes.length = holes.length; // eslint
    },
    holding: () => true,
    onEv(e) { if (e.t === 'th') { const p = P.players.find((q) => q.uid === e.uid); if (p && p !== P.me) spawnBall(p, e.o, e.v); } },
    update(dt) {
      const me = P.me, run = P.phase === 'play';
      const inp = P.inputFor(me);
      if (run || P.phase === 'count') { P.stepActor(me, inp, dt, rd, { speed: 5.5 }); clampLane(me); chargeStep(me, inp, dt, run, (c) => throwMine(me, c)); }
      if (run && me.charging) { const f = P.forward(me), e = P.eye(me), sp = speedOf(me.charge); P.arcPts = arc([e[0] + f[0] * 0.6, e[1] + f[1] * 0.6 - 0.1, e[2] + f[2] * 0.6], [f[0] * sp, f[1] * sp, f[2] * sp], G, 30, 0.08); } else P.arcPts = null;
      for (const b of P.players) if (b.bot && run) botAI(b, dt);
      stepPhysics(dt);
    },
    over: () => P.pt > 45,
    rank: (q) => q.score,
    hud: () => `Puanın: ${P.me.score}   ` + P.players.filter((q) => q !== P.me && !q.gone).map((q) => `${q.name} ${q.score}`).join(' · '),
    hudx: () => ({ act: 'FIRLAT' }),
    aux: () => 0,
    dispose() { balls = []; holes.length = 0; },
  });
}

// =====================================================================
// 4) ENGEL PARKURU
// =====================================================================
export function obstacle(P) {
  const solids = [];
  const rd = { solids };
  const FIN = -154, hz = [];             // tehlikeler: {kind,...}
  const plats = [];                      // hareketli platformlar
  const discs = [];
  let pad = null;
  const CPS = [[0, 4], [0, -32], [0, -61], [0, -82], [0, -113], [0, -136]];
  rd.floorAt = (x, z) => {
    let top = null;
    for (const d of discs) if (Math.hypot(x - d.x, z - d.z) < d.r) { const y = d.y(P.pt); if (top == null || y > top) top = y; }
    return top;
  };
  rd.futureTop = (x, z, y, dt) => {
    for (const q of plats) { const cx = q.cx + Math.sin((P.pt + dt) * q.spd + q.ph) * q.amp; if (Math.abs(x - cx) < 1.6 && Math.abs(z - q.z) < 1.6) return 0; }
    for (const d of discs) if (Math.hypot(x - d.x, z - d.z) < d.r - 0.2) return d.y(P.pt + dt);
    for (const b of solids) if (!b.moving && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.y1 <= y + 1.2) return b.y1;
    return null;
  };
  const respawn = (p) => {
    const [cx, cz] = CPS[p.cp || 0];
    p.x = cx + (p.idx - 1.5) * 1.6; p.z = cz; p.y = 0.05; p.vx = p.vy = p.vz = 0; p.stun = 0.4; p.deaths = (p.deaths || 0) + 1; p.ground = true;
    if (p === P.me) { p.yaw = 0; p.pitch = 0; }
  };
  const barSeg = (h, t) => { const a = h.spd * t + h.ph, dx = Math.cos(a), dz = Math.sin(a); return { a, dx, dz }; };
  const hazard = (p, t) => {
    if (!p.alive || p.finished) return;
    for (const h of hz) {
      if (h.kind === 'bar') {
        if (p.y > 1.05 || Math.abs(p.z - h.z) > h.len + 1) continue;
        const { dx, dz } = barSeg(h, t), px = p.x - h.x, pz = p.z - h.z, tt = clamp(px * dx + pz * dz, -h.len, h.len);
        if (Math.hypot(px - dx * tt, pz - dz * tt) < 0.65) { const s = Math.sign(h.spd); p.vx = -dz * s * 9; p.vz = dx * s * 9; p.vy = 6; p.stun = 0.45; p.ground = false; S.bump(); }
      } else if (h.kind === 'kick') {
        const kx = h.x + Math.sin(t * h.spd + h.ph) * h.amp;
        if (p.y > 1.6 || Math.abs(p.z - h.z) > 1.0) continue;
        if (Math.abs(p.x - kx) < 0.95) { const s = Math.sign(p.x - kx) || 1; p.vx = s * 9; p.vy = 4; p.stun = 0.45; p.ground = false; S.bump(); }
      }
    }
  };
  const progress = (p) => (p.finished ? 1e6 - p.finT : -p.z + (p.y > 2 ? 5 : 0));
  const shove = (p) => {
    p.shoveCd = 1.2; p.shoveT = 0.25;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    for (const o of alivePl(P)) {
      if (o === p || o.finished) continue;
      const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz);
      if (d < 2.3 && (dx * fx + dz * fz) / (d || 1) > 0.2) {
        const ix = (dx / (d || 1)) * 9, iz = (dz / (d || 1)) * 9;
        if (o.remote && !o.bot) P.emit({ t: 'imp', r: P.round, to: o.uid, vx: ix, vy: 4, vz: iz });
        else { o.vx += ix; o.vz += iz; o.vy = 4; o.stun = 0.4; o.ground = false; }
      }
    }
  };
  const botAI = (b, dt) => {
    const br = b.brain;
    if (b.shoveCd > 0) b.shoveCd -= dt;
    // hedef
    let tx = 0, tz = b.z - 3;
    const z = b.z;
    if (z < -34 && z > -62) { const nx = plats.filter((q) => q.z < z - 0.4).sort((a, c) => c.z - a.z)[0]; if (nx) { tx = nx.cx + nx.vx * 0.5; tz = nx.z; } else { tx = 0; tz = -62; } }
    else if (z < -84 && z > -112) { const nx = discs.filter((d) => d.z < z - 0.8).sort((a, c) => c.z - a.z)[0]; if (nx) { tx = nx.x; tz = nx.z; } }
    else if (z <= -112 && z > -121) { tx = 0; tz = -125; }
    else if (z <= -121 && z > -131) { tx = 0; tz = -140; }
    else if (z <= -131 && z > -141) { tx = 0; tz = -146; }
    let dx = tx - b.x, dz = tz - b.z; const m = Math.hypot(dx, dz) || 1; dx /= m; dz /= m;
    b.yaw = Math.atan2(-dx, -dz);
    let jump = false, wx = dx * (0.82 + b.skill * 0.18), wz = dz * (0.82 + b.skill * 0.18);
    if (b.ground) {
      const p1 = surface(rd, b.x + dx * 1.1, b.z + dz * 1.1, b.y), land = [3.6, 2.8, 4.4].map((k) => rd.futureTop(b.x + dx * k, b.z + dz * k, b.y, 0.55)).find((v) => v != null) ?? null;
      if (p1 == null || p1 < b.y - 0.7) {
        br.wait = (br.wait || 0) + dt;
        if (land != null || br.wait > 2.2) { jump = true; br.wait = 0; }
        else { wx = 0; wz = 0; }
      } else br.wait = 0;
      for (const h of hz) {
        if (h.kind === 'bar' && Math.abs(b.z - h.z) < h.len + 1.5 && Math.random() < b.skill * dt * 7) jump = true;
        if (h.kind === 'kick' && Math.abs(b.z - h.z) < 2.2 && Math.abs(b.x - (h.x + Math.sin(P.pt * h.spd + h.ph) * h.amp)) < 2.2 && Math.random() < b.skill * dt * 6) jump = true;
      }
      if (b.stunned) jump = false;
    }
    if (b.shoveCd <= 0 && Math.random() < dt * 0.25 * b.skill) {
      const near = alivePl(P).find((o) => o !== b && !o.finished && Math.hypot(o.x - b.x, o.z - b.z) < 2.0 && o.z < b.z + 0.5);
      if (near) shove(b);
    }
    P.stepActor(b, { wx, wz, jump }, dt, rd, { speed: 6.4 + b.skill * 0.7 });
  };
  const tick = (p, dt, inp, bot) => {
    if (p.finished || !p.alive) return;
    if (p.shoveCd > 0) p.shoveCd -= dt;
    if (p.shoveT > 0) p.shoveT -= dt;
    if (!bot) P.stepActor(p, inp, dt, rd, { speed: 7.2 });
    hazard(p, P.pt);
    // fırlatma pedi
    if (pad && p.ground && Math.abs(p.x - pad.x) < 2 && Math.abs(p.z - pad.z) < 1.6 && p.y < 0.5) { p.vy = 19; p.vz = -13; p.vx *= 0.5; p.ground = false; if (p === P.me) S.pad(); }
    // kontrol noktası
    for (let i = (p.cp || 0) + 1; i < CPS.length; i++) if (p.z < CPS[i][1] + 1.5 && p.ground && p.y > -0.5 && Math.abs(p.x) < 6) { p.cp = i; if (p === P.me) P.toast('Kontrol noktası!', 1); }
    if (p.y < -6) { respawn(p); if (p === P.me) S.fall(); }
    if (p.z < FIN && p.y > 2.2) { p.finished = true; p.finT = P.pt; const place = alivePl(P).filter((q) => q.finished).length; if (p === P.me) { P.toast(`BİTİRDİN! ${place}.`, 2); S.done(); } }
  };
  return Object.assign(rd, {
    id: 'obstacle', title: 'ENGEL PARKURU', dur: 140, order: 'race',
    rules: 'Önce bitişe ulaş! Dönen çubuklardan zıpla, kayan platformlara bin, kenarlardan kaçan çubuklara dikkat. Fırlatma pedi seni uçurur. İT ile rakibini sars. Düşersen son kontrol noktasından devam edersin.',
    introCam: (t) => { const k = (5 - t) / 5; return { pos: [14, 24 - k * 6, 10 - k * 120], look: [0, 0, -20 - k * 120] }; },
    build() {
      sky(P, 0x9fdcff, [70, 220]);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshBasicMaterial({ color: 0x2f9fe0 })); w.rotation.x = -Math.PI / 2; w.position.y = -6; P.group.add(w);
      const B = (x0, x1, y0, y1, z0, z1, c) => block(P, solids, x0, x1, y0, y1, z0, z1, c);
      B(-6, 6, -1, 0, -8, 6, 0x6dd36d);
      B(-4.5, 4.5, -1, 0, -34, -8, 0xf0c14a);
      B(-4.5, 4.5, -1, 0, -34, -30, 0x6dd36d);
      // dönen çubuklar
      for (const [z, sp, ph] of [[-15, 1.5, 0], [-24, -1.9, 1]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.4, 10), M(0x7a2018)); pole.position.set(0, 0.7, z); P.group.add(pole);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(9, 0.7, 0.45), M(0xd8362a)); bar.position.set(0, 0.55, z); P.group.add(bar);
        hz.push({ kind: 'bar', x: 0, z, len: 4.5, spd: sp, ph, mesh: bar });
      }
      // hareketli platformlar
      [-38, -43.5, -49, -54.5].forEach((z, i) => {
        const b = block(P, solids, -1.8, 1.8, -1, 0, z - 1.8, z + 1.8, i % 2 ? 0x4fb0ff : 0xff9a3a);
        b.moving = true; plats.push({ b, z, cx: 0, amp: 3.0, spd: 0.9 + i * 0.12, ph: i * 1.7, vx: 0 });
      });
      B(-4.5, 4.5, -1, 0, -64, -58, 0x6dd36d);
      // dar köprü + tekmeler
      B(-0.9, 0.9, -1, 0, -80, -64, 0xc89b5a);
      [-69, -73, -77].forEach((z, i) => {
        const k = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.7), M(0xd8362a)); k.position.set(0, 0.65, z); P.group.add(k);
        hz.push({ kind: 'kick', x: 0, z, amp: 2.2, spd: 1.8 + i * 0.25, ph: i * 2.1, mesh: k });
      });
      B(-3, 3, -1, 0, -85, -80, 0x6dd36d);
      // bobbing diskler
      [[-1.8, -90], [1.8, -96], [-1.8, -102], [1.8, -108]].forEach(([x, z], i) => {
        const d = { x, z, r: 2.1, y: (t) => 0.4 * Math.sin(t * 1.6 + i * 1.3) };
        const m = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 1.2, 28), M(i % 2 ? 0xff9a3a : 0x4fb0ff)); m.position.set(x, -0.6, z); P.group.add(m); d.m = m; discs.push(d);
      });
      B(-4.5, 4.5, -1, 0, -116, -111, 0x6dd36d);
      // fırlatma pedi
      pad = { x: 0, z: -118 };
      B(-2, 2, -1, 0, -120, -116, 0x6dd36d);
      const pm = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 20), new THREE.MeshBasicMaterial({ color: 0xff3aa8 })); pm.position.set(0, 0.12, -118); P.group.add(pm);
      B(-5, 5, -1, 0, -142, -128, 0x6dd36d);
      for (let i = 0; i < 6; i++) B(-5, 5, -1, 0.45 * (i + 1), -144 - i * 2.2, -142 - i * 2.2, 0xf0c14a);
      B(-5, 5, -1, 2.7, -168, -155, 0x6dd36d);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 0.3), new THREE.MeshBasicMaterial({ color: 0xffd84a })); flag.position.set(0, 6, -154); P.group.add(flag);
      for (const x of [-5, 5]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), M(0xffffff)); m.position.set(x, 3, -154); P.group.add(m); }
      P.players.forEach((p, i) => { p.x = (i - (P.players.length - 1) / 2) * 1.8; p.z = 3; p.y = 0; p.yaw = 0; p.pitch = 0; p.cp = 0; p.deaths = 0; p.shoveCd = 0; p.ground = true; p.idx = i; p.brain = p.brain || {}; });
    },
    onEv(e) { if (e.t === 'imp' && e.to === P.me.uid) { const m = P.me; m.vx += e.vx; m.vz += e.vz; m.vy = Math.max(m.vy, e.vy); m.stun = 0.4; m.ground = false; } },
    update(dt) {
      const t = P.pt, run = P.phase === 'play';
      for (const h of hz) { const { a } = barSeg(h, t); if (h.kind === 'bar') h.mesh.rotation.y = -a; else h.mesh.position.x = h.x + Math.sin(t * h.spd + h.ph) * h.amp; }
      for (const q of plats) { const x = q.cx + Math.sin(t * q.spd + q.ph) * q.amp; q.vx = Math.cos(t * q.spd + q.ph) * q.amp * q.spd; q.b.x0 = x - 1.8; q.b.x1 = x + 1.8; q.b.mx = q.vx; q.b.mesh.position.x = x; }
      for (const d of discs) d.m.position.y = d.y(t) - 0.6;
      const me = P.me, inp = P.inputFor(me);
      if (run && me.alive && !me.finished) {
        if (inp.actEdge && me.shoveCd <= 0) shove(me);
        tick(me, dt, inp, false);
      } else if (me.finished) { P.stepActor(me, { wx: 0, wz: 0, jump: false }, dt, rd, {}); }
      for (const b of P.players) if (b.bot && run && !b.finished) { botAI(b, dt); tick(b, dt, null, true); }
      if (!run) P.stepActor(me, { wx: 0, wz: 0, jump: false }, dt, rd, {});
      // yumuşak oyuncu çarpışması
      const ps = alivePl(P);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j]; if (Math.abs(a.y - b.y) > 1.5) continue;
        const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d < 0.9 && d > 0.001) { const o = (0.9 - d) / 2; if (isLocal(a)) { a.x -= dx / d * o; a.z -= dz / d * o; } if (isLocal(b)) { b.x += dx / d * o; b.z += dz / d * o; } }
      }
    },
    over() {
      const fin = alivePl(P).filter((q) => q.finished);
      if (fin.length === alivePl(P).length) return true;
      if (fin.length && P.pt - Math.min(...fin.map((q) => q.finT)) > 25) return true;
      return P.pt > this.dur;
    },
    rank: progress,
    hud: () => `İlerleme: ${Math.round(clamp(-P.me.z / -FIN, 0, 1) * 100)}%   Sıra: ${1 + alivePl(P).filter((q) => q !== P.me && progress(q) > progress(P.me)).length}/${alivePl(P).length}`,
    hudx: () => ({ act: 'İT', cross: false }),
    aux: () => (P.me.finished ? P.me.finT : 0),
  });
}

// =====================================================================
// 5) YAKAN TOP (final, çift puan)
// =====================================================================
export function dodge(P) {
  const solids = [];
  const H = 12, G = 14, SPD0 = 12, SPD1 = 15;
  const rd = { solids };
  rd.floorAt = (x, z) => (Math.abs(x) <= H + 0.5 && Math.abs(z) <= H + 0.5 ? 0 : null);
  let balls = [], nid = 0;
  const hits = (a, b) => P.teamMode && a.team === b.team;
  function addBall(id, x, y, z, vx = 0, vy = 0, vz = 0, state = 'free', owner = null) {
    const b = new Ball({ x, y, z, vx, vy, vz, r: 0.3, g: G, life: 1e9, rest: 0.62, fric: 0.85 });
    const o = { id, b, state, owner, m: ballMesh(0xff7a2a, 0.3) };
    P.group.add(o.m); o.m.position.set(x, y, z); balls.push(o); return o;
  }
  function launch(p, o, v) { const bb = addBall(p.uid + '-' + (nid++), o[0], o[1], o[2], v[0], v[1], v[2], 'hot', p); return bb; }
  function throwMine(p, c) {
    const f = P.forward(p), e = P.eye(p), sp = SPD0 + (SPD1 - SPD0 + 8) * c;
    const o = [e[0] + f[0] * 0.7, e[1] + f[1] * 0.7 - 0.15, e[2] + f[2] * 0.7], v = [f[0] * sp, f[1] * sp + 1, f[2] * sp];
    const bb = launch(p, o, v); p.carry = false; S.fire();
    P.emit({ t: 'th', r: P.round, uid: p.uid, id: bb.id, o, v });
  }
  const getBall = (id) => balls.find((q) => q.id === id);
  const drop = (p) => { if (p.carry) { p.carry = false; addBall('d' + p.uid + (nid++), p.x, p.y + 1, p.z); } };
  function koLocal(v, by, id) {
    v.alive = false; v.dieT = P.pt; v.vy = 6; drop(v); S.bump();
    P.splash(v.x, v.y + 1.2, v.z, 0xff7a2a, 10);
    if (by) { if (isLocal(by)) by.score += 1; else P.emit({ t: 'hit', r: P.round, by: by.uid, id }); }
    if (by && by.remote && !by.bot) P.emit({ t: 'hit', r: P.round, by: by.uid, id });
  }
  function actorStep(p, dt) {
    if (p.catchT > 0) p.catchT -= dt; if (p.catchCd > 0) p.catchCd -= dt;
    if (p.alive && p.catchT > 0 && p === P.me) { /* yakalama penceresi */ }
  }
  function pickups(p) {
    if (!p.alive || p.carry) return;
    for (const o of balls) {
      if (o.state !== 'free' || Math.hypot(o.b.vx, o.b.vz) > 5) continue;
      if (Math.hypot(o.b.x - p.x, o.b.z - p.z) < 1.15 && o.b.y < p.y + 1.6) { o.state = 'held'; o.owner = p; p.carry = true; o.dead = true; P.emit({ t: 'pk', r: P.round, id: o.id }); S.pick(); break; }
    }
  }
  function victimCheck(v) {
    if (!v.alive) return;
    for (const o of balls) {
      if (o.state !== 'hot' || o.owner === v || (o.owner && hits(o.owner, v))) continue;
      const b = o.b;
      if (Math.hypot(b.x - v.x, b.z - v.z) < 0.62 + b.r * 0.5 && b.y > v.y - 0.1 && b.y < v.y + 1.95) {
        const dx = b.x - v.x, dz = b.z - v.z, d = Math.hypot(dx, dz) || 1, fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
        if (v.catchT > 0 && (dx * fx + dz * fz) / d > 0.15) {
          // yakaladı: atan oyuncu elenir
          o.dead = true; v.carry = true; v.catchT = 0; S.trick();
          P.emit({ t: 'pk', r: P.round, id: o.id });
          const ow = o.owner;
          if (ow && ow.alive) { if (isLocal(ow)) { ow.alive = false; ow.dieT = P.pt; drop(ow); } else P.emit({ t: 'catch', r: P.round, to: ow.uid }); }
          if (v === P.me) P.toast('YAKALADIN!', 1.2);
          v.score += 1;
        } else { koLocal(v, o.owner, o.id); o.state = 'free'; b.vx = -b.vx * 0.3; b.vz = -b.vz * 0.3; b.vy = 3; if (v === P.me) P.toast('VURULDUN!', 1.5); }
        return;
      }
    }
  }
  const botAI = (b, dt) => {
    if (!b.alive) return;
    const br = b.brain; actorStep(b, dt);
    br.t = (br.t || 0) + dt;
    let wx = 0, wz = 0, jump = false;
    const enemies = alivePl(P).filter((q) => q !== b && q.alive && !hits(b, q));
    // yaklaşan top: yakala / kaç
    for (const o of balls) {
      if (o.state !== 'hot' || o.owner === b || (o.owner && hits(o.owner, b))) continue;
      const dx = b.x - o.b.x, dz = b.z - o.b.z, d = Math.hypot(dx, dz);
      const approach = (o.b.vx * dx + o.b.vz * dz) / (d || 1);
      if (d < 5.5 && approach > 5) {
        if (!b.carry && d < 3.6 && b.catchCd <= 0 && Math.random() < dt * 12 * b.skill) { b.catchT = 0.45; b.catchCd = 1.0; b.yaw = Math.atan2(o.b.x - b.x, o.b.z - b.z) + Math.PI; }
        else { const px = -o.b.vz, pz = o.b.vx, m = Math.hypot(px, pz) || 1; const s = br.dodgeSign || (br.dodgeSign = Math.random() < 0.5 ? 1 : -1); wx += (px / m) * s; wz += (pz / m) * s; if (d < 3 && b.ground && Math.random() < dt * 5 * b.skill) jump = true; }
      }
    }
    if (!b.carry) {
      let tgt = null, best = 1e9;
      for (const o of balls) if (o.state === 'free' && Math.hypot(o.b.vx, o.b.vz) < 5) { const d = Math.hypot(o.b.x - b.x, o.b.z - b.z); if (d < best) { best = d; tgt = o; } }
      if (tgt && !(wx || wz)) { wx = tgt.b.x - b.x; wz = tgt.b.z - b.z; const m = Math.hypot(wx, wz) || 1; wx /= m; wz /= m; b.yaw = Math.atan2(-wx, -wz); }
      b.charge = 0;
    } else {
      let e = null, best = 1e9;
      for (const q of enemies) { const d = Math.hypot(q.x - b.x, q.z - b.z); if (d < best) { best = d; e = q; } }
      if (e) {
        const dx = e.x - b.x, dz = e.z - b.z, d = best || 1;
        if (!(wx || wz)) { const k = d > 11 ? 1 : d < 6 ? -0.8 : 0; wx = dx / d * k + (-dz / d) * 0.5 * (br.dir || (br.dir = Math.random() < 0.5 ? 1 : -1)); wz = dz / d * k + (dx / d) * 0.5 * br.dir; }
        const sp = 17, lead = 0.1 + d / sp * 0.3;
        const tgt = [e.x + e.vx * lead, e.y + 1.2, e.z + e.vz * lead];
        const eye = P.eye(b), v = solveShot(eye, tgt, sp, G), err = (1.15 - b.skill) * 0.42;
        b.yaw = Math.atan2(-v[0], -v[2]); b.pitch = Math.atan2(v[1], Math.hypot(v[0], v[2]));
        br.aim = (br.aim || 0) + dt;
        b.charge = clamp(br.aim / 1.1, 0, 1);
        if (br.aim > 1.1 + (1 - b.skill) * 1.1 && d < 16) {
          v[0] += (Math.random() - 0.5) * err * sp; v[1] += (Math.random() - 0.5) * err * sp * 0.6; v[2] += (Math.random() - 0.5) * err * sp;
          launch(b, [eye[0] + v[0] * 0.03, eye[1] - 0.15, eye[2] + v[2] * 0.03], v); b.carry = false; b.throwT = 0.3; br.aim = 0; b.charge = 0; S.fire();
        }
      } else wx = wz = 0;
    }
    const m = Math.hypot(wx, wz); if (m > 1) { wx /= m; wz /= m; }
    P.stepActor(b, { wx, wz, jump }, dt, rd, { speed: 6.3 + b.skill * 0.6 });
    pickups(b); victimCheck(b);
  };
  return Object.assign(rd, {
    id: 'dodge', title: 'YAKAN TOP', dur: 110, order: 'surv',
    rules: 'Topu al, basılı tutup bırak: rakibi vur! Vurulan elenir. Üstüne top gelirken FIRLAT düğmesine bas: topu yakalarsan atan elenir. Son kalan (ya da takım) kazanır. ÇİFT PUAN!',
    introCam: (t) => ({ pos: [Math.cos(t * 0.45) * 26, 18, Math.sin(t * 0.45) * 26], look: [0, 0, 0] }),
    build() {
      sky(P, 0xb8e0ff, [60, 150]);
      ground(P, -0.05, 0x5f9f5a);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2), M(0xe3c27a)); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.01; P.group.add(fl);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff })); line.rotation.x = -Math.PI / 2; line.position.y = 0.02; P.group.add(line);
      const W = (x0, x1, z0, z1) => block(P, solids, x0, x1, 0, 3.2, z0, z1, 0x3a6aa8, { wall: true });
      W(-H - 0.5, H + 0.5, -H - 0.5, -H); W(-H - 0.5, H + 0.5, H, H + 0.5); W(-H - 0.5, -H, -H, H); W(H, H + 0.5, -H, H);
      for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5], [0, 0]]) block(P, solids, x - 0.9, x + 0.9, 0, 2.6, z - 0.9, z + 0.9, 0xc0553a, { wall: true });
      const n = P.players.length;
      P.players.forEach((p, i) => {
        const team = P.teamMode ? p.team : i;
        const a = P.teamMode ? (team === 0 ? 0 : Math.PI) + (i >> 1) * 0.5 - 0.25 : (i / n) * TAU + 0.8;
        const r = P.teamMode ? 9 : 9;
        p.x = Math.cos(a) * r; p.z = Math.sin(a) * r; p.y = 0; p.yaw = Math.atan2(p.x, p.z); p.pitch = 0; p.carry = false; p.catchT = 0; p.catchCd = 0; p.score = 0; p.charging = false; p.cd = 0; p.ground = true; p.brain = p.brain || {};
      });
      const rnd = rngSeed(9000 + P.round * 7);
      for (let i = 0; i < 7; i++) { let x, z, k = 0; do { x = (rnd() - 0.5) * 16; z = (rnd() - 0.5) * 16; k++; } while (k < 20 && (Math.hypot(x, z) < 1.5 || ([-5, 5].some((a) => Math.abs(x - a) < 1.6) && [-5, 5].some((a) => Math.abs(z - a) < 1.6)))); addBall('w' + i, x, 0.3, z); }
      this.extra = [25, 50, 75];
    },
    holding: (p) => p.carry,
    onEv(e) {
      if (e.t === 'th') { const p = P.players.find((q) => q.uid === e.uid); if (p) { launch(p, e.o, e.v).id = e.id; p.carry = false; } }
      else if (e.t === 'pk') { const o = getBall(e.id); if (o) o.dead = true; }
      else if (e.t === 'catch' && e.to === P.me.uid) { const m = P.me; if (m.alive) { m.alive = false; m.dieT = P.pt; drop(m); P.toast('YAKALANDIN!', 1.5); } }
      else if (e.t === 'hit') { const p = P.players.find((q) => q.uid === e.by); if (p === P.me) { p.score += 1; P.toast('İSABET!', 0.9); } const o = getBall(e.id); if (o) { o.state = 'free'; o.b.vx *= -0.3; o.b.vz *= -0.3; } }
    },
    update(dt) {
      const me = P.me, run = P.phase === 'play';
      if (run && this.extra.length && P.pt > this.extra[0]) { const t = this.extra.shift(); const r2 = rngSeed(t * 31 + P.round); for (let i = 0; i < 3; i++) addBall('x' + t + i, (r2() - 0.5) * 14, 6 + i, (r2() - 0.5) * 14); }
      const inp = P.inputFor(me);
      actorStep(me, dt);
      if (me.alive) {
        P.stepActor(me, run || P.phase === 'count' ? inp : { wx: 0, wz: 0, jump: false }, dt, rd, { speed: 7 });
        if (run) {
          if (me.carry) chargeStep(me, inp, dt, true, (c) => throwMine(me, c), 0.8);
          else { me.charge = 0; me.charging = false; if (inp.actEdge && me.catchCd <= 0) { me.catchT = 0.45; me.catchCd = 1.0; me.shoveT = 0.3; } }
          pickups(me); victimCheck(me);
        }
        me.hold = me.carry;
      } else { me.charge = 0; }
      for (const b of P.players) if (b.bot && run) botAI(b, dt);
      // ölü oyuncular yere yatar
      for (const p of P.players) if (!p.alive && !p.remote) { p.fallRot = Math.min(1.4, (p.fallRot || 0) + dt * 4); P.stepActor(p, { wx: 0, wz: 0, jump: false }, dt, rd, {}); } else if (p.alive) p.fallRot = 0;
      for (const o of balls) {
        o.b.step(dt, rd);
        if (o.state === 'hot' && Math.hypot(o.b.vx, o.b.vz) < 4.5 && o.b.y < 0.6) o.state = 'free';
        o.m.position.set(o.b.x, o.b.y, o.b.z);
        o.m.material.color.setHex(o.state === 'hot' ? 0xff2a2a : 0xff9a3a);
      }
      balls = balls.filter((o) => { if (o.dead) { P.group.remove(o.m); return false; } return true; });
      // oyuncu-oyuncu yumuşak çarpışma
      const ps = alivePl(P).filter((q) => q.alive);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d < 0.9 && d > 0.001) { const o = (0.9 - d) / 2; if (isLocal(a)) { a.x -= dx / d * o; a.z -= dz / d * o; } if (isLocal(b)) { b.x += dx / d * o; b.z += dz / d * o; } }
      }
    },
    over() {
      const al = alivePl(P).filter((q) => q.alive);
      if (P.teamMode) { if (new Set(al.map((q) => q.team)).size <= 1) return true; } else if (al.length <= 1) return true;
      return P.pt > this.dur;
    },
    rank: (q) => (q.alive ? 1e6 + (q.score || 0) : q.dieT + (q.score || 0) * 0.001),
    hud: () => `Hayatta: ${alivePl(P).filter((q) => q.alive).length}   İsabet: ${P.me.score}`,
    hudx: () => ({ act: P.me.carry ? 'ATIŞ' : 'YAKALA', tip: !P.me.carry && P.me.alive ? 'Yerdeki topa yaklaş' : '' }),
    aux: () => (P.me.alive ? 0 : P.me.dieT),
    showDead: () => true,
    dispose() { balls = []; },
  });
}

export const PLAN = [sumo, targets, hoops, obstacle, dodge];
