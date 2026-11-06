import * as THREE from 'three';
import { generate, buildMountainMesh, topAt, toLocal, rng, TOP_Y } from './mountain.js';
import * as S from '../../bulutyaris/game/sfx.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
const angDiff = (a, b) => ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
export const COLORS = [0xe5483a, 0x2f7fd8, 0x2fbf71, 0xf2c230];
export const TEAM_COLORS = [0xe5483a, 0x2f7fd8];
const GRAV = 26, WALK = 7, JUMP = 9.4, ROCK_G = 16, STUN = 1.0;

function makeClimber(color) {
  const g = new THREE.Group();
  const M = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.5), M(color));
  body.position.y = 1.25;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), M(0x3a4a66));
  pack.position.set(0, 1.3, -0.42);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), M(0xf1c9a0));
  head.position.y = 2.0;
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 6, 0, TAU, 0, Math.PI / 2), M(0xffffff));
  helm.position.y = 2.04;
  const mk = (w, h, d, c, x, y, z) => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.y = -h / 2; p.add(m); p.position.set(x, y, z); return p; };
  const legL = mk(0.32, 0.8, 0.36, 0x2a3350, -0.22, 0.8, 0), legR = mk(0.32, 0.8, 0.36, 0x2a3350, 0.22, 0.8, 0);
  const armL = mk(0.26, 0.85, 0.3, color, -0.58, 1.72, 0), armR = mk(0.26, 0.85, 0.3, color, 0.58, 1.72, 0);
  g.add(body, pack, head, helm, legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR, body };
  return g;
}
function nameTag(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.font = '800 38px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,.65)'; x.strokeText(text, 128, 34);
  x.fillStyle = '#' + color.toString(16).padStart(6, '0'); x.fillText(text, 128, 34);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(4, 1, 1);
  sp.position.y = 3.0;
  sp.renderOrder = 10;
  return sp;
}

export class Climb {
  constructor(canvas, cb = {}) {
    this.cv = canvas;
    this.cb = cb;
    this.touch = !!cb.touch;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.touch, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xcfe4f6, 120, 620);
    this.cam = new THREE.PerspectiveCamera(62, 1, 0.3, 1600);
    this.scene.add(new THREE.HemisphereLight(0xe0efff, 0x7a8a6a, 1.3));
    const sun = new THREE.DirectionalLight(0xfff2d6, 2.1);
    sun.position.set(180, 300, 120);
    this.scene.add(sun);
    this.input = { mx: 0, my: 0, jump: false, world: null };
    this.players = [];
    this.projs = [];
    this.t = 0; this.acc = 0; this.last = performance.now();
    this.mode = 'menu';
    this.camYaw = 0; this.camPitch = 0.28; this.orbit = 0; this.shake = 0;
    this.toastText = ''; this.toastT = 0; this.hudT = 0; this.netT = 0;
    this.world = null;
    this.resize();
    this._onResize = () => this.resize();
    addEventListener('resize', this._onResize);
    this.buildWorld(1);
    this.raf = requestAnimationFrame(() => this.loop());
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this._onResize);
    this.leaveOnline();
    this.renderer.dispose();
  }
  resize() {
    const w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.fov = w / h < 1 ? 74 : 62;
    this.cam.updateProjectionMatrix();
  }

  // ---------- dünya ----------
  buildWorld(seed) {
    if (this.world && this.seed === seed) return;
    if (this.world) { this.scene.remove(this.world); this.world.traverse((n) => { n.geometry?.dispose?.(); }); }
    this.seed = seed;
    const M = (this.M = generate(seed));
    const w = new THREE.Group();
    // gökyüzü
    const sky = new THREE.SphereGeometry(1400, 24, 14);
    const pos = sky.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    const top = new THREE.Color('#2a74d6'), mid = new THREE.Color('#79c0f0'), hor = new THREE.Color('#e8f4fd');
    for (let i = 0; i < pos.count; i++) {
      const t = clamp(pos.getY(i) / 1400, -0.2, 1);
      if (t < 0.2) c.copy(hor).lerp(mid, Math.max(0, t) / 0.2); else c.copy(mid).lerp(top, (t - 0.2) / 0.8);
      col.set([c.r, c.g, c.b], i * 3);
    }
    sky.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const sm = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sm.renderOrder = -10;
    w.add(sm);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1600, 40), new THREE.MeshLambertMaterial({ color: 0x5c9a4a }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.2;
    w.add(ground);
    w.add(buildMountainMesh(M));
    // ağaçlar
    const rnd = rng(seed + 5);
    const tg = new THREE.ConeGeometry(2.6, 8, 6);
    const trees = new THREE.InstancedMesh(tg, new THREE.MeshLambertMaterial({ color: 0x2f7a3e, flatShading: true }), 420);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < 420; i++) {
      const a = rnd() * TAU, r = 150 + rnd() * 600, k = 0.7 + rnd() * 1.1;
      m4.compose(p.set(Math.cos(a) * r, 4 * k, Math.sin(a) * r), q, s.set(k, k, k));
      trees.setMatrixAt(i, m4);
    }
    w.add(trees);
    // bulutlar
    const cm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x9ab4d0, emissiveIntensity: 0.5 }), 220);
    for (let i = 0; i < 220; i++) {
      const a = rnd() * TAU, r = 190 + rnd() * 500, y = 40 + rnd() * 330, sz = 18 + rnd() * 34;
      m4.compose(p.set(Math.cos(a) * r, y, Math.sin(a) * r), q, s.set(sz, sz * 0.5, sz));
      cm.setMatrixAt(i, m4);
    }
    w.add(cm);
    // ipler
    this.ropeMeshes = M.ropes.map((r) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 5), new THREE.MeshLambertMaterial({ color: 0xd9a441 }));
      m.scale.y = r.top - r.bottom;
      m.position.set(r.x, (r.top + r.bottom) / 2, r.z);
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: 0x6b4a2b }));
      knot.position.set(r.x, r.top + 0.1, r.z);
      w.add(m, knot);
      return m;
    });
    // kaya pickupları
    const rg = new THREE.DodecahedronGeometry(0.5, 0), rmat = new THREE.MeshLambertMaterial({ color: 0x7d7a74, flatShading: true });
    this.rockMeshes = M.rocks.map((r) => {
      const L = M.ledges[r.ledge];
      const c = Math.cos(L.ang), s2 = Math.sin(L.ang);
      r.x = L.cx + r.lx * c - r.lz * s2; r.z = L.cz + r.lx * s2 + r.lz * c; r.y = topAt(L, r.lx) + 0.45;
      const m = new THREE.Mesh(rg, rmat);
      m.position.set(r.x, r.y, r.z);
      w.add(m);
      return m;
    });
    this.world = w;
    this.scene.add(w);
  }

  // ---------- oyun ----------
  mkPlayer(info, uid, remote, idx) {
    const g = makeClimber(info.color);
    const tag = nameTag(info.name, info.color);
    g.add(tag);
    this.scene.add(g);
    const L = this.M.ledges[0];
    const a = (idx - 1.5) * 2.2;
    const p = { uid, name: info.name, color: info.color, team: info.team ?? -1, remote, g, tag, idx, x: L.cx + L.tx * -6 + -L.tz * 0 + Math.cos(L.ang + Math.PI / 2) * a, z: L.cz + L.tz * -6 + Math.sin(L.ang + Math.PI / 2) * a, y: L.cy + 0.1, vx: 0, vz: 0, vy: 0, yaw: -L.ang + Math.PI / 2, ground: true, rope: null, stun: 0, rocks: 0, camp: 0, finished: false, finT: 0, anim: 0, grabCd: 0, h: 0, net: null, state: 0, gone: false };
    p.x = L.cx - L.tx * 8 + Math.cos(L.ang + Math.PI / 2) * a;
    p.z = L.cz - L.tz * 8 + Math.sin(L.ang + Math.PI / 2) * a;
    return p;
  }
  start(opts) {
    const { seed = 1, mode = 'solo', nick = 'Sen', color = 0, online = null } = opts;
    this.buildWorld(seed);
    for (const p of this.players) { this.scene.remove(p.g); }
    for (const pr of this.projs) this.scene.remove(pr.mesh);
    this.players = []; this.projs = [];
    this.online = online; this.gameMode = mode;
    if (online) {
      online.order.forEach((u, i) => {
        const inf = online.players[u] || {};
        const team = mode === 'team' ? i % 2 : -1;
        const col = mode === 'team' ? TEAM_COLORS[team] : COLORS[i % 4];
        const p = this.mkPlayer({ name: (inf.n || 'Oyuncu').slice(0, 12), color: col, team }, u, u !== online.uid, i);
        this.players.push(p);
        if (u === online.uid) this.me = p;
      });
    } else {
      this.me = this.mkPlayer({ name: nick, color: COLORS[color % 4], team: -1 }, 'me', false, 1);
      this.players.push(this.me);
    }
    this.mode = 'play';
    this.elapsed = 0; this.countT = 3.4; this.state = 'count';
    this.ended = false; this.endT = 0;
    this.camYaw = this.me.yaw; this.camPitch = 0.28;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch ? 1.5 : 2));
    this.resize();
    for (const r of this.M.ropes) r.cut = 0;
    for (const r of this.M.rocks) r.cd = 0;
    this.rockMeshes.forEach((m) => (m.visible = true));
    S.unlock();
    this.snapCam();
  }
  toMenu() {
    this.mode = 'menu';
    this.renderer.setPixelRatio(1);
    this.resize();
    this.leaveOnline();
    for (const p of this.players) this.scene.remove(p.g);
    for (const pr of this.projs) this.scene.remove(pr.mesh);
    this.players = []; this.projs = []; this.me = null;
  }

  // ---------- ağ ----------
  attachOnline(room, meta) {
    const order = (meta.order || Object.keys(room.players)).filter((u) => room.players[u]);
    const on = { room, uid: room.uid, order, players: { ...room.players } };
    this.net = on;
    room.on('pos', (u, p) => this.onNetPos(u, p));
    room.on('ev', (u, e) => this.onNetEv(u, e));
    room.on('players', (pl) => { for (const p of this.players) if (p.remote && !pl[p.uid]) { p.gone = true; p.g.visible = false; } });
    room.on('closed', () => this.cb.onNetClosed?.());
    return on;
  }
  leaveOnline() {
    if (this.net?.room) { try { this.net.room.leave(); } catch { /* yok say */ } }
    this.net = null;
  }
  onNetPos(u, a) {
    const p = this.players.find((q) => q.uid === u);
    if (!p || !p.remote || !a) return;
    const v = Array.isArray(a) ? a : Object.values(a);
    const n = { x: v[0], y: v[1], z: v[2], yaw: v[3], state: v[4], sp: v[5], fin: v[6], t: performance.now() };
    if (!p.net) { p.x = n.x; p.y = n.y; p.z = n.z; }
    p.net = n;
    p.state = n.state; p.h = n.y;
    if (n.fin > 0 && !p.finished) { p.finished = true; p.finT = n.fin; }
  }
  onNetEv(u, e) {
    if (!e) return;
    if (e.t === 'rk') this.addProj({ id: e.id, x: e.x, y: e.y, z: e.z, vx: e.vx, vy: e.vy, vz: e.vz, owner: u });
    else if (e.t === 'cut') this.cutRope(e.r, false);
    else if (e.t === 'hit') this.removeProj(e.id, true);
  }
  netSend() {
    const r = this.net?.room, p = this.me;
    if (!r || !p) return;
    const f = (v) => Math.round(v * 100) / 100;
    const st = p.stun > 0 ? 3 : p.rope ? 2 : p.ground ? 0 : 1;
    r.sendPos([f(p.x), f(p.y), f(p.z), f(p.yaw), st, f(Math.hypot(p.vx, p.vz)), p.finished ? f(p.finT) || 0.01 : 0]);
  }

  // ---------- eylemler ----------
  toast(t, s = 1.5) { this.toastText = t; this.toastT = s; }
  newId() { return (this.net?.uid || 'x').slice(0, 4) + Math.floor(Math.random() * 1e6).toString(36); }
  throwRock() {
    const p = this.me;
    if (!p || this.state !== 'play' || p.stun > 0 || p.rocks <= 0 || p.finished) return;
    p.rocks--;
    const f = [Math.sin(this.camYaw), Math.cos(this.camYaw)];
    let vx = f[0] * 21, vz = f[1] * 21, vy = 7.5;
    let best = null, bd = 34;
    for (const o of this.players) {
      if (o === p || o.gone || (p.team >= 0 && o.team === p.team)) continue;
      const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz);
      if (d < bd && Math.abs(angDiff(this.camYaw, Math.atan2(dx, dz))) < 0.45) { bd = d; best = o; }
    }
    if (best) {
      const dx = best.x - p.x, dz = best.z - p.z, d = Math.max(3, Math.hypot(dx, dz)), t = d / 21;
      vx = (dx / d) * 21; vz = (dz / d) * 21;
      vy = (best.y + 1.2 - (p.y + 1.5) + 0.5 * ROCK_G * t * t) / t;
    }
    const o = { id: this.newId(), x: p.x, y: p.y + 1.5, z: p.z, vx, vy, vz, owner: p.uid };
    this.addProj(o);
    S.fire();
    if (this.net) this.net.room.sendEv({ t: 'rk', ...o });
  }
  addProj(o) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), new THREE.MeshLambertMaterial({ color: 0x6f6c66, flatShading: true }));
    this.scene.add(m);
    this.projs.push({ ...o, mesh: m, age: 0 });
  }
  removeProj(id) {
    const k = this.projs.findIndex((p) => p.id === id);
    if (k >= 0) { this.scene.remove(this.projs[k].mesh); this.projs.splice(k, 1); }
  }
  nearRope() {
    const p = this.me;
    if (!p) return null;
    let best = null, bd = 4.5;
    for (const r of this.M.ropes) {
      if (r.cut) continue;
      const d = Math.hypot(p.x - r.x, p.z - r.z);
      if (d < bd && p.y > r.top - 7 && p.y < r.top + 3) { bd = d; best = r; }
    }
    return best;
  }
  cutNear() {
    const r = this.nearRope();
    if (!r || this.state !== 'play') return;
    this.cutRope(r.id, true);
    if (this.net) this.net.room.sendEv({ t: 'cut', r: r.id });
  }
  cutRope(id, mine) {
    const r = this.M.ropes[id];
    if (!r || r.cut) return;
    r.cut = this.t;
    S.bump();
    if (mine) this.toast('İP KESİLDİ', 1.1);
    const m = this.me;
    if (m?.rope === r) { m.rope = null; m.grabCd = 0.6; m.ground = false; m.vy = 0; this.toast('İP KESİLDİ, düşüyorsun!', 1.5); this.shake = 0.5; }
  }
  hitMe(pr) {
    const p = this.me;
    p.stun = STUN; p.rope = null; p.grabCd = 1;
    const sp = Math.hypot(pr.vx, pr.vz) || 1;
    p.vx = (pr.vx / sp) * 9; p.vz = (pr.vz / sp) * 9; p.vy = 5.5; p.ground = false;
    this.shake = 0.7; S.boom(); this.toast('KAYA ÇARPTI!', 1.2);
    if (this.net) this.net.room.sendEv({ t: 'hit', id: pr.id });
  }

  // ---------- fizik ----------
  stepMe(dt) {
    const p = this.me, M = this.M, inp = this.input;
    const run = this.state === 'play' && !p.finished;
    if (p.stun > 0) p.stun -= dt;
    if (p.grabCd > 0) p.grabCd -= dt;
    // kamera göreli hareket
    let mx = run && p.stun <= 0 ? inp.mx : 0, my = run && p.stun <= 0 ? inp.my : 0;
    let wx, wz;
    if (inp.world && run && p.stun <= 0) { wx = inp.world[0]; wz = inp.world[1]; }
    else { const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw); wx = fx * my + -fz * mx; wz = fz * my + fx * mx; }
    const hh = Math.hypot(wx, wz), mag = Math.min(1, hh);
    if (hh > 0.01) { wx /= hh; wz /= hh; }
    if (p.rope) {
      const r = p.rope;
      if (r.cut) { p.rope = null; p.ground = false; }
      else {
        const climb = inp.world ? (inp.climb ?? 1) : my;
        p.y = clamp(p.y + climb * 3.8 * dt, r.bottom, r.top + 0.2);
        p.x += (r.x - p.x) * Math.min(1, dt * 10); p.z += (r.z - p.z) * Math.min(1, dt * 10);
        p.vx = p.vz = p.vy = 0;
        if (p.y >= r.top - 0.02) {
          const L = M.ledges[r.ledge], d = 1.8;
          p.x = L.cx - L.tx * L.hl + L.tx * d; p.z = L.cz - L.tz * L.hl + L.tz * d;
          p.y = topAt(L, -L.hl + d) + 0.05;
          p.rope = null; p.ground = true; p.grabCd = 0.8;
        }
        if (inp.jump && run) { inp.jump = false; p.rope = null; p.grabCd = 0.5; p.ground = false; p.vy = 7; p.vx = Math.sin(p.yaw) * 3; p.vz = Math.cos(p.yaw) * 3; S.land(false); }
        p.anim += dt * 6 * Math.abs(climb);
        p.yaw = this.camYaw;
        return;
      }
    }
    const sp = WALK;
    const k = Math.min(1, dt * (p.ground ? 13 : 3.2));
    if (p.stun > 0) { p.vx *= 1 - Math.min(1, dt * 2.5); p.vz *= 1 - Math.min(1, dt * 2.5); }
    else { p.vx += (wx * mag * sp - p.vx) * k; p.vz += (wz * mag * sp - p.vz) * k; }
    if (inp.jump && run) { if (p.ground || p.coyote > 0) { p.vy = JUMP; p.ground = false; p.coyote = 0; S.land(false); } inp.jump = false; }
    if (p.coyote > 0) p.coyote -= dt;
    p.vy -= GRAV * dt;
    if (p.ground) p.vy = Math.max(p.vy, -2);
    p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    if (mag > 0.15 && p.stun <= 0) p.yaw += angDiff(p.yaw, Math.atan2(p.vx, p.vz)) * Math.min(1, dt * 14);
    // çarpışma: çıkıntılar
    const wasGround = p.ground;
    p.ground = false;
    for (const L of M.ledges) {
      const dx = p.x - L.cx, dz = p.z - L.cz;
      if (dx * dx + dz * dz > (L.hl + L.hw + 3) ** 2 || Math.abs(p.y - L.cy) > L.hl * Math.abs(L.slope) + 4) continue;
      const [lx, lz] = toLocal(L, p.x, p.z);
      const top = topAt(L, clamp(lx, -L.hl, L.hl));
      if (Math.abs(lx) < L.hl + 0.25 && Math.abs(lz) < L.hw + 0.25) {
        const tol = wasGround ? 0.5 : 0.28;
        if (p.vy <= 0.5 && p.y <= top + tol && p.y >= top - 0.55 - Math.max(0, -p.vy) * dt) {
          p.y = top; p.vy = 0; p.ground = true; p.coyote = 0.12; p.landed = L;
          if (L.camp && p.camp !== L.i) { p.camp = L.i; if (L.i > 0) this.toast('KAMP — buraya dönersin', 1.4); }
          if (L.kind === 'summit' && !p.finished) this.finish();
        } else if (p.y < top - 0.55 && p.y + 1.8 > top - 1.5) {
          const px = L.hl + 0.45 - Math.abs(lx), pz = L.hw + 0.45 - Math.abs(lz);
          let ox = 0, oz = 0;
          if (px < pz) ox = Math.sign(lx) * px; else oz = Math.sign(lz) * pz;
          const c = Math.cos(L.ang), s = Math.sin(L.ang);
          p.x += ox * c - oz * s; p.z += ox * s + oz * c;
          const vl = p.vx * c + p.vz * s, vz2 = -p.vx * s + p.vz * c;
          const nvx = px < pz && Math.sign(vl) === -Math.sign(lx) ? 0 : vl, nvz = px >= pz && Math.sign(vz2) === -Math.sign(lz) ? 0 : vz2;
          p.vx = nvx * c - nvz * s; p.vz = nvx * s + nvz * c;
        } else if (p.vy > 0 && p.y + 1.8 > top - 1.5 && p.y + 1.8 < top) p.vy = 0;
      }
    }
    // dağ duvarı
    const d = Math.hypot(p.x, p.z), lim = M.rockR(p.y) + 0.55;
    if (d < lim && d > 0.01) { p.x *= lim / d; p.z *= lim / d; const rv = (p.vx * p.x + p.vz * p.z) / lim; if (rv < 0) { p.vx -= (p.x / lim) * rv; p.vz -= (p.z / lim) * rv; } }
    // ip tutma
    if (p.grabCd <= 0 && p.stun <= 0 && run) {
      for (const r of M.ropes) {
        if (r.cut || p.y < r.bottom - 0.6 || p.y > r.top - 0.3) continue;
        if (Math.hypot(p.x - r.x, p.z - r.z) < 1.15 && (mag > 0.2 || !p.ground)) { p.rope = r; p.vx = p.vy = p.vz = 0; p.ground = false; S.pick(); break; }
      }
    }
    // kaya topla
    if (run && p.rocks < 3) for (let i = 0; i < M.rocks.length; i++) {
      const r = M.rocks[i];
      if (r.cd > 0) continue;
      if (Math.abs(p.y - r.y) < 2 && Math.hypot(p.x - r.x, p.z - r.z) < 1.3) { r.cd = 14; this.rockMeshes[i].visible = false; p.rocks++; S.pick(); this.toast('KAYA ' + p.rocks, 0.8); }
    }
    // düşme / kamp
    const camp = M.ledges[p.camp];
    if (p.y < camp.cy - 55 || p.y < -12) this.respawn();
    p.anim += dt * Math.hypot(p.vx, p.vz) * 1.1;
  }
  respawn() {
    const p = this.me, L = this.M.ledges[p.camp];
    p.x = L.cx + L.tx * (p.camp === 0 ? -6 : 0); p.z = L.cz + L.tz * (p.camp === 0 ? -6 : 0);
    p.y = topAt(L, 0) + 0.2; p.vx = p.vy = p.vz = 0; p.rope = null; p.stun = 0.5; p.ground = true;
    this.toast('Düştün! Kampa döndün', 1.6); S.fall();
  }
  finish() {
    const p = this.me;
    p.finished = true; p.finT = this.elapsed;
    S.done();
    this.toast('ZİRVE!', 2);
    this.netSend();
  }
  checkEnd() {
    if (this.ended) return;
    const ps = this.players.filter((p) => !p.gone);
    let win = null;
    if (!this.online) { if (this.me.finished) win = { solo: true }; }
    else if (this.gameMode === 'team') {
      for (const t of [0, 1]) { const m = ps.filter((p) => p.team === t); if (m.length && m.every((p) => p.finished)) { win = { team: t }; break; } }
    } else { const f = ps.filter((p) => p.finished).sort((a, b) => a.finT - b.finT)[0]; if (f) win = { uid: f.uid }; }
    if (!win) return;
    this.ended = true;
    this.endT = 1.6;
    this.win = win;
  }
  summary() {
    const w = this.win, me = this.me;
    const mine = w.solo || (w.team !== undefined ? me.team === w.team : w.uid === me.uid);
    const wp = w.uid ? this.players.find((p) => p.uid === w.uid) : null;
    return { mine, solo: !!w.solo, time: this.elapsed, mode: this.gameMode, team: w.team, winner: wp?.name, rows: this.players.filter((p) => !p.gone).map((p) => ({ name: p.name, me: p === me, team: p.team, h: Math.round(Math.max(0, p.y)), fin: p.finished ? p.finT : 0, color: p.color })).sort((a, b) => (b.fin > 0) - (a.fin > 0) || (a.fin && b.fin ? a.fin - b.fin : b.h - a.h)) };
  }

  stepRemote(p, dt) {
    const n = p.net;
    if (!n || p.gone) return;
    const k = Math.min(1, dt * 11);
    p.x += (n.x - p.x) * k; p.y += (n.y - p.y) * k; p.z += (n.z - p.z) * k;
    p.yaw += angDiff(p.yaw, n.yaw) * k;
    p.vx = Math.sin(n.yaw) * n.sp; p.vz = Math.cos(n.yaw) * n.sp;
    p.anim += dt * n.sp * 1.1 + (n.state === 2 ? dt * 3 : 0);
  }

  updateProjs(dt) {
    const me = this.me;
    for (let k = this.projs.length - 1; k >= 0; k--) {
      const q = this.projs[k];
      q.age += dt; q.vy -= ROCK_G * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      q.mesh.position.set(q.x, q.y, q.z); q.mesh.rotation.x += dt * 9; q.mesh.rotation.z += dt * 6;
      const wall = Math.hypot(q.x, q.z) < this.M.rockR(q.y) + 0.3;
      if (q.age > 4 || q.y < -5 || wall) { this.removeProj(q.id); continue; }
      if (me && q.owner !== me.uid && !me.finished && me.stun <= 0 && Math.abs(q.y - (me.y + 1.1)) < 1.4 && Math.hypot(q.x - me.x, q.z - me.z) < 0.95) {
        const owner = this.players.find((p) => p.uid === q.owner);
        if (me.team >= 0 && owner && owner.team === me.team) continue;
        this.hitMe(q);
        this.removeProj(q.id);
      }
    }
  }

  // ---------- kamera ----------
  snapCam() {
    const p = this.me;
    this.cam.position.set(p.x - Math.sin(this.camYaw) * 9, p.y + 4, p.z - Math.cos(this.camYaw) * 9);
    this.cam.lookAt(p.x, p.y + 1.6, p.z);
  }
  updateCam(dt) {
    if (this.mode === 'menu') {
      this.orbit += dt * 0.07;
      const a = this.orbit, r = 215, y = 90 + Math.sin(this.orbit * 2) * 25;
      this.cam.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      this.cam.lookAt(0, 120, 0);
      return;
    }
    const p = this.me;
    const hspeed = Math.hypot(p.vx, p.vz);
    if (hspeed > 2.5 && !this.dragT && !p.rope && !this.input.world) this.camYaw += angDiff(this.camYaw, Math.atan2(p.vx, p.vz)) * Math.min(1, dt * 0.9);
    if (this.dragT > 0) this.dragT -= dt;
    const back = 8.6, h = Math.sin(this.camPitch) * back + 1.4, hr = Math.cos(this.camPitch) * back;
    const tx = p.x - Math.sin(this.camYaw) * hr, tz = p.z - Math.cos(this.camYaw) * hr, ty = p.y + h;
    const tgt = new THREE.Vector3(tx, ty, tz);
    const d = Math.hypot(tgt.x, tgt.z), lim = this.M.rockR(ty) + 1.4;
    if (d < lim && d > 0.01) { tgt.x *= lim / d; tgt.z *= lim / d; }
    this.cam.position.lerp(tgt, Math.min(1, dt * 10));
    if (this.shake > 0.01) { this.cam.position.x += (Math.random() - 0.5) * this.shake; this.cam.position.y += (Math.random() - 0.5) * this.shake; this.shake *= Math.max(0, 1 - dt * 4); }
    this.cam.lookAt(p.x, p.y + 1.7, p.z);
  }
  rotateCam(dx, dy) { this.camYaw -= dx * 0.006; this.camPitch = clamp(this.camPitch + dy * 0.005, 0.05, 0.9); this.dragT = 1.5; }

  syncMeshes() {
    for (const p of this.players) {
      if (p.gone) continue;
      const u = p.g.userData;
      p.g.position.set(p.x, p.y, p.z);
      p.g.rotation.y = p.yaw;
      const moving = Math.hypot(p.vx, p.vz) > 0.8;
      const st = p.remote ? p.state : p.stun > 0 ? 3 : p.rope ? 2 : p.ground ? 0 : 1;
      let sw = Math.sin(p.anim) * (moving ? 0.9 : 0.05);
      p.g.rotation.x = 0; p.g.rotation.z = 0;
      if (st === 2) { u.armL.rotation.x = u.armR.rotation.x = -2.7; u.legL.rotation.x = Math.sin(p.anim) * 0.7; u.legR.rotation.x = -Math.sin(p.anim) * 0.7; }
      else if (st === 1) { u.armL.rotation.x = u.armR.rotation.x = -1.2; u.legL.rotation.x = -0.5; u.legR.rotation.x = 0.4; }
      else if (st === 3) { u.armL.rotation.x = u.armR.rotation.x = -2.2; u.legL.rotation.x = 0.8; u.legR.rotation.x = -0.4; p.g.rotation.z = Math.sin(this.t * 22) * 0.35; }
      else { u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.armL.rotation.x = -sw * 0.8; u.armR.rotation.x = sw * 0.8; }
      if (p.stun > 0 && !p.remote) p.g.rotation.x = Math.sin(this.t * 18) * 0.15;
      p.tag.visible = p.remote;
    }
    for (let i = 0; i < this.M.ropes.length; i++) {
      const r = this.M.ropes[i], m = this.ropeMeshes[i];
      if (r.cut) {
        const a = this.t - r.cut;
        if (a > 22) { r.cut = 0; m.visible = true; m.position.y = (r.top + r.bottom) / 2; if (this.me?.rope === r) this.me.rope = null; }
        else { m.position.y = (r.top + r.bottom) / 2 - a * a * 14; m.visible = a < 1.6; }
      } else { m.visible = true; m.position.y = (r.top + r.bottom) / 2; }
    }
    for (let i = 0; i < this.M.rocks.length; i++) {
      const r = this.M.rocks[i];
      if (r.cd > 0 && this.mode !== 'menu') { r.cd -= 1 / 60; if (r.cd <= 0) this.rockMeshes[i].visible = true; }
    }
  }

  // ---------- döngü ----------
  hud() {
    const me = this.me;
    const pl = this.players.filter((p) => !p.gone).map((p) => ({ name: p.name, color: p.color, team: p.team, me: p === me, h: Math.max(0, p.remote ? (p.net?.y ?? p.y) : p.y) / (this.M.summit.cy), fin: p.finished }));
    return { state: this.state, count: this.state === 'count' ? Math.max(0, Math.ceil(this.countT - 0.4)) : -1, go: this.state === 'play' && this.elapsed < 1.1, height: Math.max(0, Math.round(me.y)), top: Math.round(this.M.summit.cy), rocks: me.rocks, canCut: !!this.nearRope() && this.state === 'play', onRope: !!me.rope, stun: me.stun > 0, toast: this.toastT > 0 ? this.toastText : '', time: this.elapsed, players: pl, mode: this.gameMode, online: !!this.net, finished: me.finished };
  }
  step(dt) {
    this.t += dt;
    if (this.mode === 'menu') return;
    if (this.state === 'count') { this.countT -= dt; if (this.countT <= 0.4) { this.state = 'play'; this.elapsed = 0; S.beep(true); } }
    else this.elapsed += dt;
    this.stepMe(dt);
    for (const p of this.players) if (p.remote) this.stepRemote(p, dt);
    this.updateProjs(dt);
    this.checkEnd();
    if (this.ended) { this.endT -= dt; if (this.endT <= 0 && !this.endSent) { this.endSent = true; this.cb.onEnd?.(this.summary()); } }
    if (this.toastT > 0) this.toastT -= dt;
    if (this.net) { this.netT += dt; if (this.netT >= 0.08) { this.netT = 0; this.netSend(); } }
  }
  advance(n, dt = 1 / 60) { for (let i = 0; i < n; i++) this.step(dt); if (this.mode === 'play') this.updateCam(dt * n); this.syncMeshes(); }
  loop() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let n = 0;
    while (this.acc >= 1 / 60 && n < 6) { this.step(1 / 60); this.acc -= 1 / 60; n++; }
    if (n === 6) this.acc = 0;
    this.updateCam(dt);
    this.syncMeshes();
    this.renderer.render(this.scene, this.cam);
    this.hudT += dt;
    if (this.hudT > 0.08 && this.mode === 'play' && this.me) { this.hudT = 0; this.cb.onHud?.(this.hud()); }
    this.raf = requestAnimationFrame(() => this.loop());
  }
  setMove(x, y) { this.input.mx = clamp(x, -1, 1); this.input.my = clamp(y, -1, 1); }
  jump() { this.input.jump = true; setTimeout(() => (this.input.jump = false), 150); }
}
