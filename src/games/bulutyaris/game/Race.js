import * as THREE from 'three';
import { buildTrack, buildTrackMesh, trackTextures, trackById, HW, STEP, RAMP_N, GAP_N, RAMP_H, angDiff } from './track.js';
import { buildTheme } from './themes.js';
import * as S from './sfx.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
export const CAR_COLORS = [0xe5483a, 0x2f7fd8, 0x2fbf71, 0xf2c230, 0x8e6ad8, 0xff8a3d];
const BOT_NAMES = ['Rüzgâr', 'Bulut', 'Yıldırım', 'Fırtına', 'Sis'];
const GRAV = 22, MAXV = 44, NITRO_V = 62, SPIN_T = 1.3;
const ITEMS = ['rocket', 'rocket', 'mine', 'nitro'];
export const ITEM_NAME = { rocket: 'ROKET', mine: 'MAYIN', nitro: 'NİTRO' };

function disposeGroup(o) {
  o.traverse((n) => {
    n.geometry?.dispose?.();
    const ms = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
    for (const m of ms) { m.map?.dispose?.(); m.emissiveMap?.dispose?.(); m.dispose?.(); }
  });
}

// Kıvılcım / patlama parçacıkları (tek InstancedMesh)
class Fx {
  constructor(scene, n = 140) {
    this.n = n;
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), n);
    this.mesh.frustumCulled = false;
    this.p = Array.from({ length: n }, () => ({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, s: 1 }));
    this.k = 0;
    this.m4 = new THREE.Matrix4();
    this.col = new THREE.Color();
    for (let i = 0; i < n; i++) { this.m4.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this.m4); this.mesh.setColorAt(i, this.col.set(0xffffff)); }
    scene.add(this.mesh);
  }
  burst(x, y, z, color, n = 16, sp = 10, size = 1) {
    for (let i = 0; i < n; i++) {
      const p = this.p[this.k];
      this.k = (this.k + 1) % this.n;
      const a = Math.random() * TAU, e = Math.random() * 1.2 - 0.1, v = sp * rnd(0.4, 1);
      p.x = x; p.y = y; p.z = z;
      p.vx = Math.cos(a) * Math.cos(e) * v; p.vy = Math.sin(e) * v + sp * 0.3; p.vz = Math.sin(a) * Math.cos(e) * v;
      p.life = p.max = rnd(0.45, 0.9); p.s = size * rnd(0.6, 1.4);
      this.mesh.setColorAt(this.p.indexOf(p), this.col.set(color));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    const m = this.m4, q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < this.n; i++) {
      const p = this.p[i];
      if (p.life > 0) {
        p.life -= dt;
        p.vy -= 18 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const s = p.s * clamp(p.life / p.max, 0, 1);
        m.compose(pos.set(p.x, p.y, p.z), q, sc.set(s, s, s));
      } else m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

function makeCar(color) {
  const g = new THREE.Group();
  const M = (c, o) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 4.1), M(color));
  body.position.y = 0.65;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.0), M(color));
  nose.position.set(0, 0.55, 1.9);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.9), M(0x1c2540));
  cab.position.set(0, 1.2, -0.2);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.4, 1.4), M(0x8fd0f5, { emissive: 0x335577 }));
  glass.position.set(0, 1.25, -0.15);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.6), M(0x1c2540));
  wing.position.set(0, 1.35, -2.0);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), M(0x1c2540));
  post.position.set(0, 1.05, -1.9);
  g.add(body, nose, cab, glass, wing, post);
  const wm = M(0x15171f);
  for (const [x, z] of [[-1.05, 1.35], [1.05, 1.35], [-1.05, -1.3], [1.05, -1.3]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 10), wm);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.45, z);
    g.add(w);
  }
  const tl = new THREE.MeshBasicMaterial({ color: 0xff3a3a });
  for (const x of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.1), tl); l.position.set(x, 0.75, -2.07); g.add(l); }
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.1), hl); l.position.set(x, 0.62, 2.42); g.add(l); }
  const fl = new THREE.Group();
  const fm = new THREE.MeshBasicMaterial({ color: 0xffa030 });
  for (const x of [-0.5, 0.5]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.6, 6), fm); c.rotation.x = -Math.PI / 2; c.position.set(x, 0.6, -2.9); fl.add(c); }
  fl.visible = false;
  g.add(fl);
  g.userData.flame = fl;
  return g;
}

export class Race {
  constructor(canvas, cb = {}) {
    this.cv = canvas;
    this.cb = cb;
    this.touch = !!cb.touch;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.touch, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(68, 1, 0.3, 1400);
    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x9fb4d8, 1.35);
    this.sunL = new THREE.DirectionalLight(0xfff0d0, 2.0);
    this.scene.add(this.hemi, this.sunL);
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(1.8, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2;
    this.scene.add(this.blob);
    this.fx = new Fx(this.scene);
    this.cars = [];
    this.proj = [];
    this.mines = [];
    this.boxes = [];
    this.online = null;
    this.mode = 'menu';
    this.state = 'menu'; // menu | grid | race | done
    this.t = 0;
    this.acc = 0;
    this.input = { steer: 0, nitro: false, brake: false };
    this.hudT = 0;
    this.camYaw = 0;
    this.orbit = 0;
    this.shake = 0;
    this.held = null;
    this.nitro = 0.5;
    this.netT = 0;
    this.last = performance.now();
    this.setTrack('bulut');
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.spawn(CAR_COLORS[0]);
    try { this.renderer.compile(this.scene, this.cam); } catch { /* yok say */ }
    this.raf = requestAnimationFrame(() => this.loop());
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
    this.leaveOnline();
    this.renderer.dispose();
  }
  resize() {
    const w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.baseFov = w / h < 1 ? 78 : 66;
    this.cam.updateProjectionMatrix();
  }

  // ---------------- dünya ----------------
  setTrack(id) {
    if (this.trackId === id && this.world) return;
    const def = trackById(id);
    if (this.world) { this.scene.remove(this.world); disposeGroup(this.world); }
    for (const p of this.proj) this.scene.remove(p.mesh);
    for (const m of this.mines) this.scene.remove(m.mesh);
    this.proj = []; this.mines = [];
    this.trackId = def.id;
    this.def = def;
    const tr = (this.tr = buildTrack(def));
    const th = (this.theme = buildTheme(def, tr));
    const world = new THREE.Group();
    world.add(th.group);
    this.tex = trackTextures(def);
    world.add(buildTrackMesh(tr, this.tex));
    this.scene.fog = new THREE.Fog(th.fog[0], th.fog[1], th.fog[2]);
    this.hemi.color.set(th.hemi[0]); this.hemi.groundColor.set(th.hemi[1]); this.hemi.intensity = th.hemi[2];
    this.sunL.color.set(th.sun[0]); this.sunL.intensity = th.sun[1]; this.sunL.position.set(...th.sun[2]);
    const gate = (i, color, hgt = 7) => {
      const m = new THREE.MeshLambertMaterial({ color, flatShading: true });
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, hgt, 0.7), m); p.position.set(tr.P[i].x + tr.R[i].x * s * (HW + 1.6), hgt / 2 + tr.H[i], tr.P[i].z + tr.R[i].z * s * (HW + 1.6)); world.add(p); }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 3.6, 1.2, 0.7), m);
      bar.position.set(tr.P[i].x, hgt + tr.H[i], tr.P[i].z);
      bar.rotation.y = tr.Y[i];
      world.add(bar);
    };
    gate(0, 0xf4f6ff, 14);
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 1.6), new THREE.MeshBasicMaterial({ map: (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const g = cv.getContext('2d'); for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 4, y * 4, 4, 4); } const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; return t; })() }));
    sl.rotation.x = -Math.PI / 2;
    sl.rotation.z = -tr.Y[0] + Math.PI;
    sl.position.set(tr.P[0].x, tr.H[0] + 0.05, tr.P[0].z);
    world.add(sl);
    for (const r of tr.ramps) gate(tr.w(r + 2), 0xf2c230, 15);
    // eşya kutuları
    const qt = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.fillStyle = '#7a3cff'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#fff'; g.lineWidth = 5; g.strokeRect(4, 4, 56, 56); g.fillStyle = '#fff'; g.font = '800 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 32, 36); return new THREE.CanvasTexture(cv); })();
    const bm = new THREE.MeshBasicMaterial({ map: qt });
    const bg = new THREE.BoxGeometry(1.7, 1.7, 1.7);
    this.boxes = tr.items.map((it) => { const m = new THREE.Mesh(bg, bm); m.position.set(it.x, it.y, it.z); world.add(m); return { m, x: it.x, y: it.y, z: it.z, cd: 0 }; });
    this.world = world;
    this.scene.add(world);
    this.cars.forEach((c) => this.scene.remove(c.g));
    if (this.cars.length && this.spawnArgs) this.spawn(...this.spawnArgs);
  }

  // ---------------- yarışçılar ----------------
  spawn(playerColor, online = null) {
    this.spawnArgs = [playerColor, online];
    for (const c of this.cars) this.scene.remove(c.g);
    this.cars = [];
    const tr = this.tr;
    const mk = (i, name, kind, color, uid) => {
      const row = Math.floor(i / 2), side = i % 2 ? 1 : -1;
      const idx = tr.w(tr.N - 4 - row * 3);
      const lane = side * 3.2;
      const g = makeCar(color);
      g.rotation.order = 'YXZ';
      this.scene.add(g);
      const car = {
        g, name, isPlayer: kind === 'me', remote: kind === 'remote', uid, idx, lane, startIdx: idx, x: tr.P[idx].x + tr.R[idx].x * lane, z: tr.P[idx].z + tr.R[idx].z * lane, y: tr.H[idx], vy: 0,
        yaw: tr.Y[idx], speed: 0, air: false, airT: 0, D: idx - tr.N, finished: false, finishT: 0,
        skill: kind === 'bot' ? 0.86 + Math.random() * 0.2 : 0, laneT: lane, steer: 0, fell: 0, lastSafe: idx, padCool: 0,
        flip: 0, flipV: 0, spin: 0, hitCd: 0, botFire: rnd(6, 12), net: null, color,
      };
      this.cars.push(car);
      return car;
    };
    if (online) {
      const used = new Set();
      online.order.forEach((u, i) => {
        const info = online.players[u] || {};
        let c = Number.isInteger(info.c) ? info.c : i;
        for (let k = 0; k < 6 && used.has(c % 6); k++) c++;
        c %= 6; used.add(c);
        const me = u === online.uid;
        const car = mk(i, info.n || 'Oyuncu', me ? 'me' : 'remote', CAR_COLORS[c], u);
        if (me) this.player = car;
      });
    } else {
      const colors = CAR_COLORS.filter((c) => c !== playerColor);
      this.player = mk(3, 'Sen', 'me', playerColor, 'me');
      BOT_NAMES.forEach((n, i) => mk([0, 1, 2, 4, 5][i], n, 'bot', colors[(i + colors.length - 1) % colors.length]));
    }
    this.cars.sort((a, b) => (a === this.player ? -1 : b === this.player ? 1 : 0));
    this.tickCars(0);
  }

  start(color, online = null) {
    this.online = online;
    for (const p of this.proj) this.scene.remove(p.mesh);
    for (const m of this.mines) this.scene.remove(m.mesh);
    this.proj = []; this.mines = [];
    this.spawn(color, online);
    this.score = 0;
    this.nitro = 0.5;
    this.held = null;
    this.airNow = 0;
    this.comboText = '';
    this.comboT = 0;
    this.toastText = '';
    this.toastT = 0;
    this.state = 'grid';
    this.mode = 'play';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch ? 1.6 : 2));
    this.resize();
    this.gridT = 3.4;
    this.lastBeep = 4;
    this.elapsed = 0;
    this.result = null;
    this.shake = 0;
    this.camYaw = this.player.yaw;
    this.snapCam();
    S.unlock();
  }
  toMenu() {
    this.mode = 'menu';
    this.renderer.setPixelRatio(1);
    this.resize();
    this.state = 'menu';
    S.engine(0, false, false);
    this.leaveOnline();
    this.online = null;
    this.spawn(CAR_COLORS[0]);
  }

  // ---------------- online ----------------
  attachOnline(room, meta) {
    const order = (meta.order || Object.keys(room.players)).filter((u) => room.players[u]);
    const on = { room, uid: room.uid, order, players: { ...room.players }, host: room.isHost };
    this.net = on;
    room.on('pos', (u, p) => this.onNetPos(u, p));
    room.on('ev', (u, e) => this.onNetEv(u, e));
    room.on('players', (pl) => {
      for (const c of this.cars) if (c.remote && !pl[c.uid]) { c.gone = true; c.g.visible = false; }
    });
    room.on('closed', () => this.cb.onNetClosed?.());
    return on;
  }
  leaveOnline() {
    if (this.net?.room) { try { this.net.room.leave(); } catch { /* yok say */ } }
    this.net = null;
  }
  onNetPos(u, p) {
    const car = this.cars.find((c) => c.uid === u);
    if (!car || !car.remote || !p) return;
    const a = Array.isArray(p) ? p : Object.values(p);
    const n = { x: a[0], y: a[1], z: a[2], yaw: a[3], speed: a[4], flip: a[5], spin: a[6], D: a[7], air: !!a[8], nit: !!a[9], fin: a[10] || 0, t: performance.now() };
    if (!car.net) { car.x = n.x; car.y = n.y; car.z = n.z; car.yaw = n.yaw; }
    car.net = n;
  }
  onNetEv(u, e) {
    if (!e) return;
    const owner = this.cars.find((c) => c.uid === u);
    if (e.t === 'rk') this.addProj({ id: e.id, x: e.x, y: e.y, z: e.z, yaw: e.yaw, sp: e.sp, owner, tgt: e.tg ? this.cars.find((c) => c.uid === e.tg) : null });
    else if (e.t === 'mn') this.addMine({ id: e.id, x: e.x, y: e.y, z: e.z, owner });
    else if (e.t === 'hit') this.removeById(e.id, true);
  }
  netSend() {
    const r = this.net?.room, p = this.player;
    if (!r || !p) return;
    const f = (v) => Math.round(v * 100) / 100;
    r.sendPos([f(p.x), f(p.y), f(p.z), f(p.yaw), f(p.speed), f(p.flip), f(Math.max(0, p.spin)), f(p.D), p.air ? 1 : 0, p.nitroOn ? 1 : 0, p.finished ? f(p.finishT) || 0.01 : 0]);
  }

  // ---------------- yardımcılar ----------------
  locate(car) {
    const { N, P, R, T, w } = this.tr;
    let bi = car.idx, bd = 1e12;
    for (let k = -8; k <= 16; k++) {
      const i = w(car.idx + k), dx = car.x - P[i].x, dz = car.z - P[i].z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; bi = i; }
    }
    const dx = car.x - P[bi].x, dz = car.z - P[bi].z;
    return { i: bi, d: dx * R[bi].x + dz * R[bi].z, a: dx * T[bi].x + dz * T[bi].z };
  }
  heightAt(i, a) {
    const { kind, H, w } = this.tr;
    if (kind[i] === 2) return null;
    const j = w(a >= 0 ? i + 1 : i - 1);
    if (kind[j] === 2) return H[i];
    return H[i] + (H[j] - H[i]) * clamp(Math.abs(a) / STEP, 0, 1);
  }
  toast(t, s = 1.4) { this.toastText = t; this.toastT = s; }

  // ---------------- fizik ----------------
  stepPlayer(car, dt) {
    const tr = this.tr, inp = this.input;
    const run = this.state === 'race' || this.state === 'done';
    let steer = this.autoSteer !== undefined ? this.autoSteer : inp.steer;
    if (this.state === 'done') steer = this.autoPilotSteer(car);
    car.steer += (steer - car.steer) * Math.min(1, dt * 9);
    if (car.spin > 0) car.spin -= dt;
    if (car.hitCd > 0) car.hitCd -= dt;
    if (car.shield > 0) car.shield -= dt;
    const wantNitro = (inp.nitro || this.autoNitro) && this.nitro > 0 && run && this.state !== 'done' && car.spin <= 0;
    car.nitroOn = wantNitro;
    if (wantNitro) this.nitro = Math.max(0, this.nitro - dt * 0.3);
    if (car.fell > 0) { car.fell -= dt; return; }
    const loc = this.locate(car);
    car.idx = loc.i;
    if (!car.air) {
      if (run) {
        const max = wantNitro ? NITRO_V : car.spin > 0 ? 16 : MAXV;
        if (car.speed < max) car.speed += (wantNitro ? 42 : 17 * (1 - car.speed / (MAXV + 6))) * dt;
        else car.speed += (max - car.speed) * Math.min(1, dt * (car.spin > 0 ? 3 : 1.4));
        if (inp.brake) car.speed = Math.max(0, car.speed - 38 * dt);
      } else car.speed = 0;
      const rate = (car.steer * 2.45) / (1 + car.speed * 0.03);
      car.yaw -= rate * dt;
    } else {
      car.yaw -= car.steer * 0.55 * dt;
      car.yaw += angDiff(car.yaw, tr.Y[loc.i]) * dt * 1.5 * (1 - Math.abs(car.steer) * 0.8);
    }
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    car.x += fx * car.speed * dt;
    car.z += fz * car.speed * dt;
    const l = this.locate(car);
    car.idx = l.i;
    let hgt = this.heightAt(l.i, l.a);
    const onRoad = hgt !== null && Math.abs(l.d) < HW + 1.2;
    const railed = !tr.noRail[l.i] && tr.kind[l.i] === 0;
    if (!car.air) {
      if (onRoad || railed) {
        if (Math.abs(l.d) > HW - 0.9 && railed) {
          const lim = HW - 0.9, s = Math.sign(l.d);
          const push = l.d - s * lim;
          car.x -= tr.R[l.i].x * push;
          car.z -= tr.R[l.i].z * push;
          const toward = angDiff(car.yaw, tr.Y[l.i]);
          car.yaw += toward * 0.2;
          if (car.speed > 8) {
            car.speed *= 1 - 1.4 * dt;
            if ((car.bumpT || 0) <= 0) { S.bump(); car.bumpT = 0.25; this.fx.burst(car.x + tr.R[l.i].x * s * 1.1, car.y + 0.8, car.z + tr.R[l.i].z * s * 1.1, 0xffe08a, 5, 6, 0.6); }
          }
        }
        car.bumpT = (car.bumpT || 0) - dt;
        const prevY = car.y;
        let launched = false;
        if (hgt !== null && run && car.speed > 14 && dt > 0) {
          const ball = prevY + (car.slope || 0) * dt - 0.5 * GRAV * dt * dt;
          if (ball > hgt + 0.12) { launched = true; car.air = true; car.airT = 0; car.vy = (car.slope || 0) - GRAV * dt; car.y = ball; car.flip = 0; car.flipV = 0; }
        }
        if (!launched) {
          car.y = hgt === null ? car.y : hgt;
          car.slope = dt > 0 ? (car.y - prevY) / dt : 0;
        }
        car.lastSafe = tr.kind[l.i] === 0 ? l.i : car.lastSafe;
        if (tr.pad[l.i] && Math.abs(l.d) < 4.2 && car.padCool <= 0) { car.speed = Math.min(NITRO_V, car.speed + 12); this.nitro = Math.min(1, this.nitro + 0.15); car.padCool = 1; S.pad(); this.toast('HIZ PLAKASI', 0.8); }
      } else {
        car.air = true; car.airT = 0; car.vy = Math.max(car.slope || 0, 0); car.flip = 0; car.flipV = 0;
      }
    }
    if (car.air) {
      car.airT += dt;
      car.vy -= GRAV * dt;
      car.y += car.vy * dt;
      // takla: havada fren basılı tutulursa geriye döner
      const want = run && inp.brake && car.airT > 0.12 && this.state !== 'done' ? -7.2 : 0;
      car.flipV += (want - car.flipV) * Math.min(1, dt * 12);
      car.flip += car.flipV * dt;
      if (want === 0) { const fw = angDiff(0, car.flip) * -1; if (Math.abs(fw) < 2.0) car.flip += fw * Math.min(1, dt * 5); }
      hgt = this.heightAt(l.i, l.a);
      if (hgt !== null && Math.abs(l.d) < HW + 0.6 && car.y <= hgt + 0.05 && car.y >= hgt - 3.0 && (car.vy <= 0 || car.y < hgt - 0.1)) {
        this.land(car, hgt);
      }
      if (car.y < -34 - Math.max(0, -(tr.H[l.i] || 0))) this.respawn(car);
    }
    if (car.air && car.airT > 0.3) this.airNow = car.airT; else this.airNow = 0;
    car.padCool -= dt;
    this.pickItems(car);
  }
  land(car, hgt) {
    const t = car.airT;
    car.air = false;
    car.y = hgt;
    const fw = Math.abs(angDiff(0, car.flip));
    const flips = Math.round(Math.abs(car.flip) / TAU);
    car.slope = 0;
    if (t > 0.25 && fw > 1.05) {
      car.spin = SPIN_T; car.speed *= 0.4;
      S.boom(); this.shake = Math.max(this.shake, 0.6); this.fx.burst(car.x, car.y + 0.8, car.z, 0xffa030, 22, 12, 1.1);
      this.toast('KAZA!', 1.3);
    } else if (t > 0.45) {
      const pts = Math.round(t * 120) + flips * 300;
      this.score += pts;
      this.nitro = Math.min(1, this.nitro + t * 0.28 + flips * 0.3);
      this.comboText = flips ? `TAKLA x${flips} +${pts}` : `HAVADA +${pts}`;
      this.comboT = 1.6;
      if (flips) S.trick(); else S.land(t > 1.1);
    }
    car.airT = 0; car.flip = 0; car.flipV = 0;
  }
  respawn(car) {
    const tr = this.tr;
    const i = tr.w(car.lastSafe - 4);
    car.x = tr.P[i].x; car.z = tr.P[i].z;
    car.yaw = tr.Y[i]; car.speed = 18; car.y = tr.H[i]; car.vy = 0; car.air = false; car.airT = 0; car.fell = 0.6; car.idx = i; car.flip = 0; car.flipV = 0; car.spin = 0;
    if (car === this.player) { S.fall(); this.toast('Düştün! Rampaya hızlı gir', 1.6); }
  }
  autoPilotSteer(car) {
    const tr = this.tr;
    const ahead = tr.w(car.idx + Math.floor(clamp(car.speed * 0.45, 8, 26) / STEP));
    const tx = tr.P[ahead].x - car.x, tz = tr.P[ahead].z - car.z;
    const want = Math.atan2(tx, tz);
    return clamp(-angDiff(car.yaw, want) * 2.2, -1, 1);
  }

  // yapay zekâ yarışçılar
  stepBot(car, dt) {
    const tr = this.tr, run = this.state === 'race' || this.state === 'done';
    if (!run) { car.speed = 0; return; }
    if (car.spin > 0) car.spin -= dt;
    if (car.shield > 0) car.shield -= dt;
    const i = car.idx;
    let vmax = 44 * car.skill;
    let c = 0;
    for (let k = 0; k < 18; k += 3) c = Math.max(c, tr.cur[tr.w(i + k)]);
    vmax = Math.min(vmax, c > 0.004 ? Math.sqrt(30 / c) : 99);
    for (let k = -6; k < RAMP_N + 10; k++) if (tr.kind[tr.w(i + k)] === 1 && k < RAMP_N) vmax = Math.max(vmax, 37);
    const pd = this.player ? (this.player.D - car.D) : 0;
    if (pd > 60) vmax *= 1.07; else if (pd < -90) vmax *= 0.9;
    vmax = Math.max(vmax, 26);
    if (car.spin > 0) vmax = 12;
    if (car.speed < vmax) car.speed += 15 * dt; else car.speed -= (car.spin > 0 ? 40 : 24) * dt;
    // bot da roket atar
    if (!this.online && this.state === 'race') {
      car.botFire -= dt;
      if (car.botFire <= 0) {
        car.botFire = rnd(8, 15);
        const nearRamp = (o) => this.tr.ramps.some((s) => ((s - o.idx + this.tr.N) % this.tr.N) < 70);
        const tgt = this.cars.filter((o) => o !== car && o.D > car.D && o.D - car.D < 90 && !nearRamp(o)).sort((a, b) => a.D - b.D)[0];
        if (tgt && car.spin <= 0) this.fireRocket(car, tgt);
      }
    }
    // şerit
    if (Math.random() < dt * 0.25) car.laneT = rnd(-4.2, 4.2);
    car.lane += clamp(car.laneT - car.lane, -2.2 * dt, 2.2 * dt);
    car.s = (car.s === undefined ? car.idx : car.s) + (car.speed * dt) / STEP;
    const si = Math.floor(car.s), fr = car.s - si, a = tr.w(si), b = tr.w(si + 1);
    const px = tr.P[a].x + (tr.P[b].x - tr.P[a].x) * fr, pz = tr.P[a].z + (tr.P[b].z - tr.P[a].z) * fr;
    const rx = tr.R[a].x, rz = tr.R[a].z;
    const nx = px + rx * car.lane, nz = pz + rz * car.lane;
    car.yaw = Math.atan2(nx - car.x, nz - car.z) || car.yaw;
    car.x = nx; car.z = nz;
    car.idx = a;
    if (tr.kind[a] === 2) {
      let g0 = a; while (tr.kind[tr.w(g0 - 1)] === 2) g0 = tr.w(g0 - 1);
      const u = (((a - g0 + tr.N) % tr.N) + fr) / GAP_N;
      car.y = RAMP_H * (1 - u) + 4 * 1.5 * u * (1 - u);
      car.air = true;
    } else {
      car.y = tr.H[a] + (tr.H[b] - tr.H[a]) * (tr.kind[b] === 2 ? 0 : fr);
      car.air = false;
    }
  }

  // arkadaşın arabası: ağdan gelen konuma yumuşakça yaklaş
  stepRemote(car, dt) {
    const n = car.net;
    if (!n || car.gone) return;
    const age = Math.min(0.25, (performance.now() - n.t) / 1000);
    const tx = n.x + Math.sin(n.yaw) * n.speed * age, tz = n.z + Math.cos(n.yaw) * n.speed * age;
    const k = Math.min(1, dt * 11);
    car.x += (tx - car.x) * k; car.z += (tz - car.z) * k; car.y += (n.y - car.y) * k;
    car.yaw += angDiff(car.yaw, n.yaw) * k;
    car.speed = n.speed; car.air = n.air; car.flip = n.flip; car.spin = n.spin; car.nitroOn = n.nit;
    car.D = n.D;
    if (n.fin && !car.finished) { car.finished = true; car.finishT = n.fin; }
    const loc = this.locate(car); car.idx = loc.i;
  }

  tickCars(dt) {
    const tr = this.tr;
    for (const car of this.cars) {
      const before = car.idx;
      if (car.remote) { this.stepRemote(car, dt); continue; }
      if (car.isPlayer) this.stepPlayer(car, dt);
      else this.stepBot(car, dt);
      let dI = car.idx - before;
      if (dI < -tr.N / 2) dI += tr.N; else if (dI > tr.N / 2) dI -= tr.N;
      car.D += dI;
      if (dt > 0 && !car.finished && car.D >= tr.laps * tr.N && (this.state === 'race' || this.state === 'done')) {
        car.finished = true;
        car.finishT = this.elapsed;
        if (car.isPlayer) this.finish();
      }
    }
    // çarpışma
    for (let a = 0; a < this.cars.length; a++) for (let b = a + 1; b < this.cars.length; b++) {
      const A = this.cars[a], B = this.cars[b];
      if (A.gone || B.gone || Math.abs(A.y - B.y) > 1.6) continue;
      const dx = B.x - A.x, dz = B.z - A.z, d2 = dx * dx + dz * dz;
      if (d2 < 5.2 && d2 > 1e-4) {
        const d = Math.sqrt(d2), push = (2.3 - d) * 0.5;
        const nx = dx / d, nz = dz / d;
        if (A.isPlayer || B.isPlayer) {
          const P = A.isPlayer ? A : B, sg = A.isPlayer ? -1 : 1;
          P.x += nx * push * 2 * sg;
          P.z += nz * push * 2 * sg;
          P.speed *= 0.99;
          if (P.hitCd <= 0 && dt > 0) { P.hitCd = 0.35; S.bump(); this.shake = Math.max(this.shake, 0.18); this.fx.burst((A.x + B.x) / 2, A.y + 0.9, (A.z + B.z) / 2, 0xffe08a, 9, 7, 0.7); }
        } else if (!A.remote && !B.remote) { A.lane -= nx * 0.02; B.lane += nx * 0.02; }
      }
    }
  }

  // ---------------- eşyalar ----------------
  pickItems(car) {
    for (const b of this.boxes) {
      if (b.cd > 0) continue;
      const dx = car.x - b.x, dz = car.z - b.z;
      if (dx * dx + dz * dz < 7 && Math.abs(car.y - b.y) < 3.2) {
        b.cd = 6; b.m.visible = false;
        if (!this.held) { this.held = ITEMS[Math.floor(Math.random() * ITEMS.length)]; S.pick(); this.toast(ITEM_NAME[this.held] + ' aldın', 1); }
        else S.pick();
      }
    }
  }
  useItem() {
    const p = this.player;
    if (!this.held || !p || this.state !== 'race' || p.spin > 0) return;
    const it = this.held;
    this.held = null;
    if (it === 'rocket') this.fireRocket(p, this.findTarget(p));
    else if (it === 'mine') this.dropMine(p);
    else { this.nitro = 1; this.toast('NİTRO DOLDU', 1); S.pick(); }
  }
  findTarget(car) {
    let best = null, bd = 1e9;
    for (const o of this.cars) {
      if (o === car || o.gone) continue;
      const dx = o.x - car.x, dz = o.z - car.z, d = Math.hypot(dx, dz);
      const ang = Math.abs(angDiff(car.yaw, Math.atan2(dx, dz)));
      if (d < 170 && ang < 0.7 && d < bd) { bd = d; best = o; }
    }
    return best;
  }
  newId() { return (this.net?.uid || 'x').slice(0, 4) + Math.floor(Math.random() * 1e6).toString(36); }
  fireRocket(car, tgt) {
    const id = this.newId(), sp = Math.max(70, car.speed + 38);
    const x = car.x + Math.sin(car.yaw) * 3, z = car.z + Math.cos(car.yaw) * 3, y = car.y + 0.9;
    this.addProj({ id, x, y, z, yaw: car.yaw, sp, owner: car, tgt });
    if (car.isPlayer) { S.fire(); if (this.net) this.net.room.sendEv({ t: 'rk', id, x, y, z, yaw: car.yaw, sp, tg: tgt?.uid || 0 }); }
  }
  addProj(o) {
    const m = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.2, 8), new THREE.MeshBasicMaterial({ color: 0xff4d2e }));
    body.rotation.x = Math.PI / 2;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.8 }));
    glow.position.z = -1.2;
    m.add(body, glow);
    this.scene.add(m);
    this.proj.push({ ...o, mesh: m, life: 4, age: 0, i: o.owner?.idx || 0 });
  }
  dropMine(car) {
    const id = this.newId();
    const x = car.x - Math.sin(car.yaw) * 4, z = car.z - Math.cos(car.yaw) * 4, y = car.y;
    this.addMine({ id, x, y, z, owner: car });
    if (this.net) this.net.room.sendEv({ t: 'mn', id, x, y, z });
    S.pick();
  }
  addMine(o) {
    const m = new THREE.Group();
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), new THREE.MeshLambertMaterial({ color: 0x23252e, flatShading: true }));
    b.position.y = 0.9;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    l.position.y = 1.9;
    m.add(b, l);
    m.position.set(o.x, o.y, o.z);
    this.scene.add(m);
    this.mines.push({ ...o, mesh: m, life: 30, age: 0, blink: l });
  }
  removeById(id, boom) {
    let k = this.proj.findIndex((p) => p.id === id);
    if (k >= 0) { const p = this.proj[k]; if (boom) this.fx.burst(p.x, p.y, p.z, 0xffa030, 18, 11, 1); this.scene.remove(p.mesh); this.proj.splice(k, 1); return; }
    k = this.mines.findIndex((p) => p.id === id);
    if (k >= 0) { const p = this.mines[k]; if (boom) this.fx.burst(p.x, p.y + 1, p.z, 0xffa030, 18, 11, 1); this.scene.remove(p.mesh); this.mines.splice(k, 1); }
  }
  hitCar(car, id) {
    if (car.shield > 0) return;
    car.shield = SPIN_T + 2.5;
    car.spin = SPIN_T;
    if (!car.air) car.speed = Math.min(car.speed * 0.4, 20);
    this.fx.burst(car.x, car.y + 1, car.z, 0xffa030, 26, 14, 1.2);
    this.fx.burst(car.x, car.y + 1, car.z, 0x555555, 12, 8, 1.6);
    if (car.isPlayer) {
      S.boom(); this.shake = Math.max(this.shake, 0.8); this.toast('VURULDUN!', 1.2);
      if (this.net) this.net.room.sendEv({ t: 'hit', id });
    }
  }
  updateItems(dt) {
    for (const b of this.boxes) {
      if (b.cd > 0) { b.cd -= dt; if (b.cd <= 0) b.m.visible = true; }
      b.m.rotation.y += dt * 2; b.m.position.y = b.y + Math.sin(this.t * 3 + b.x) * 0.25;
    }
    const mine = this.player;
    for (let k = this.proj.length - 1; k >= 0; k--) {
      const p = this.proj[k];
      p.age += dt;
      if (p.age > p.life) { this.removeById(p.id, false); continue; }
      if (p.tgt && !p.tgt.gone) {
        const want = Math.atan2(p.tgt.x - p.x, p.tgt.z - p.z);
        p.yaw += clamp(angDiff(p.yaw, want), -2.6 * dt, 2.6 * dt);
      }
      p.x += Math.sin(p.yaw) * p.sp * dt; p.z += Math.cos(p.yaw) * p.sp * dt;
      const loc = this.locate({ idx: p.i, x: p.x, z: p.z });
      p.i = loc.i;
      const gy = this.heightAt(loc.i, loc.a);
      const ty = p.tgt ? p.tgt.y + 0.9 : (gy === null ? p.y : gy + 1);
      p.y += (ty - p.y) * Math.min(1, dt * 6);
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y = p.yaw;
      if (Math.random() < 0.7) this.fx.burst(p.x - Math.sin(p.yaw) * 1.4, p.y, p.z - Math.cos(p.yaw) * 1.4, 0xffb050, 1, 2, 0.8);
      for (const c of this.cars) {
        if (c === p.owner && p.age < 0.8) continue;
        if (c.remote || c.gone) continue;
        if (Math.abs(c.y - p.y) > 3 || (c.x - p.x) ** 2 + (c.z - p.z) ** 2 > 7) continue;
        this.hitCar(c, p.id);
        this.removeById(p.id, false);
        break;
      }
    }
    for (let k = this.mines.length - 1; k >= 0; k--) {
      const m = this.mines[k];
      m.age += dt;
      m.blink.visible = Math.floor(m.age * 4) % 2 === 0;
      if (m.age > m.life) { this.removeById(m.id, false); continue; }
      for (const c of this.cars) {
        if (c === m.owner && m.age < 1.2) continue;
        if (c.remote || c.gone || Math.abs(c.y - m.y) > 2.5 || (c.x - m.x) ** 2 + (c.z - m.z) ** 2 > 6) continue;
        this.hitCar(c, m.id);
        this.removeById(m.id, true);
        break;
      }
    }
    void mine;
  }

  finish() {
    this.state = 'done';
    S.done();
    const me = this.player;
    const ahead = this.cars.filter((c) => c !== me && c.finished && c.finishT <= me.finishT).length;
    this.result = { rank: ahead + 1, total: this.cars.length, time: this.elapsed, score: this.score };
    this.netSend();
    setTimeout(() => this.cb.onEnd?.(this.result), 1400);
  }

  // ---------------- kamera ----------------
  snapCam() {
    const p = this.player;
    const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
    this.cam.position.set(p.x - fx * 9, p.y + 4.2, p.z - fz * 9);
    this.cam.lookAt(p.x + fx * 10, p.y + 1.3, p.z + fz * 10);
  }
  updateCam(dt) {
    if (this.mode === 'menu') {
      this.orbit += dt * 0.12;
      const tr = this.tr, i = Math.floor(this.orbit * 40) % tr.N;
      const p = tr.P[i], t = tr.T[i];
      this.cam.position.set(p.x - t.x * 20 + tr.R[i].x * 12, tr.H[i] + 8 + Math.sin(this.orbit * 3) * 1.5, p.z - t.z * 16 + tr.R[i].z * 10);
      this.cam.lookAt(p.x + t.x * 12, tr.H[i] + 2, p.z + t.z * 12);
      this.cam.fov = 68;
      this.cam.updateProjectionMatrix();
      return;
    }
    const p = this.player;
    this.camYaw += angDiff(this.camYaw, p.yaw) * Math.min(1, dt * (p.air ? 2.2 : 5.5));
    const back = 8.6 + (p.nitroOn ? 1.6 : 0) + (p.speed / MAXV) * 0.8;
    const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
    const target = new THREE.Vector3(p.x - fx * back, p.y + 3.7 + (p.air ? Math.min(2, p.vy * 0.15) : 0), p.z - fz * back);
    this.cam.position.lerp(target, Math.min(1, dt * 9));
    this.cam.lookAt(p.x + fx * 11, p.y + 1.2 + (p.air ? p.vy * 0.12 : 0), p.z + fz * 11);
    if (this.shake > 0.01) {
      this.cam.position.x += (Math.random() - 0.5) * this.shake * 1.2;
      this.cam.position.y += (Math.random() - 0.5) * this.shake * 1.2;
      this.shake *= Math.max(0, 1 - dt * 4);
    }
    const fov = this.baseFov + (p.speed / MAXV) * 8 + (p.nitroOn ? 8 : 0);
    this.cam.fov += (fov - this.cam.fov) * Math.min(1, dt * 4);
    this.cam.updateProjectionMatrix();
  }

  syncMeshes(dt) {
    for (const car of this.cars) {
      if (car.gone) continue;
      let ry = car.yaw, rx, rz = 0, yo = 0;
      if (car.isPlayer || car.remote) {
        const slope = car.air ? Math.atan2(car.vy || 0, Math.max(car.speed, 8)) : Math.atan2(car.slope || 0, Math.max(car.speed, 8));
        rx = car.air ? car.flip - slope * 0.8 * (Math.abs(angDiff(0, car.flip)) < 0.5 ? 1 : 0) : -slope * 0.8;
        rz = car.isPlayer ? car.steer * 0.1 : 0;
        car.g.userData.flame.visible = !!car.nitroOn;
        car.g.userData.flame.scale.z = 0.8 + Math.random() * 0.5;
      } else rx = car.air ? -0.12 : 0;
      if (car.spin > 0) {
        const ph = 1 - clamp(car.spin / SPIN_T, 0, 1);
        ry += ph * TAU * 2; rx += ph * TAU; yo = Math.sin(ph * Math.PI) * 2.6;
      }
      car.g.position.set(car.x, car.y + yo, car.z);
      car.g.rotation.set(rx, ry, rz);
      if (car.fell > 0) car.g.visible = Math.floor(this.t * 14) % 2 === 0; else car.g.visible = true;
    }
    const p = this.player;
    const l = this.locate(p);
    const h = this.heightAt(l.i, l.a);
    if (h !== null && Math.abs(l.d) < HW + 1.2) { this.blob.visible = true; this.blob.position.set(p.x, h + 0.08, p.z); const k = clamp(1 - (p.y - h) * 0.08, 0.4, 1); this.blob.scale.setScalar(k); } else this.blob.visible = false;
  }

  // ---------------- döngü ----------------
  rank() {
    const sorted = [...this.cars].filter((c) => !c.gone).sort((a, b) => (b.finished - a.finished) || (a.finished && b.finished ? a.finishT - b.finishT : b.D - a.D));
    return sorted.indexOf(this.player) + 1;
  }
  hud() {
    const p = this.player, tr = this.tr;
    const lap = clamp(Math.floor(p.D / tr.N) + 1, 1, tr.laps);
    return {
      state: this.state,
      speed: Math.round(p.speed * 3.6),
      rank: this.rank(), total: this.cars.filter((c) => !c.gone).length,
      lap, laps: tr.laps,
      nitro: this.nitro,
      nitroOn: !!p.nitroOn,
      combo: this.comboT > 0 ? this.comboText : '',
      air: this.airNow > 0.3 ? Math.round(this.airNow * 120) : 0,
      inAir: !!p.air && p.airT > 0.15,
      item: this.held,
      itemName: this.held ? ITEM_NAME[this.held] : '',
      toast: this.toastT > 0 ? this.toastText : '',
      count: this.state === 'grid' ? Math.max(0, Math.ceil(this.gridT - 0.4)) : -1,
      go: this.state === 'race' && this.elapsed < 1.1,
      time: this.elapsed,
      score: this.score,
      online: !!this.net,
    };
  }
  step(dt) {
    this.t += dt;
    this.theme.update?.(dt, this.t);
    if (this.mode === 'menu') {
      this.state = 'race';
      for (const c of this.cars) if (!c.isPlayer) this.stepBot(c, dt);
      this.state = 'menu';
      return;
    }
    if (this.state === 'grid') {
      this.gridT -= dt;
      const n = Math.ceil(this.gridT - 0.4);
      if (n !== this.lastBeep && n >= 1) { this.lastBeep = n; S.beep(false); }
      if (this.gridT <= 0.4 && this.lastBeep !== 0) { this.lastBeep = 0; S.beep(true); }
      if (this.gridT <= 0.4) { this.state = 'race'; this.elapsed = 0; }
    } else this.elapsed += dt;
    this.tickCars(dt);
    this.updateItems(dt);
    this.fx.update(dt);
    if (this.comboT > 0) this.comboT -= dt;
    if (this.toastT > 0) this.toastT -= dt;
    if (this.net) { this.netT += dt; if (this.netT >= 0.08) { this.netT = 0; this.netSend(); } }
    S.engine(this.player.speed, this.player.nitroOn, this.state === 'race' || this.state === 'done');
  }
  advance(n, dt = 1 / 60) {
    for (let i = 0; i < n; i++) this.step(dt);
    if (this.mode === 'play') { this.updateCam(dt * n); }
    this.syncMeshes(dt);
  }
  render() {
    this.renderer.render(this.scene, this.cam);
  }
  loop() {
    const now = performance.now();
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let n = 0;
    while (this.acc >= 1 / 60 && n < 6) { this.step(1 / 60); this.acc -= 1 / 60; n++; }
    if (n === 6) this.acc = 0;
    if (this.mode === 'menu') this.fx.update(dt);
    this.updateCam(dt);
    this.syncMeshes(dt);
    this.render();
    this.hudT += dt;
    if (this.hudT > 0.07 && this.mode === 'play') { this.hudT = 0; this.cb.onHud?.(this.hud()); }
    this.raf = requestAnimationFrame(() => this.loop());
  }
  setSteer(v) { this.input.steer = clamp(v, -1, 1); }
  setNitro(v) { this.input.nitro = v; }
  setBrake(v) { this.input.brake = v; }
  fireItem() { this.useItem(); }
  names() { return this.cars.map((c) => c.name); }
  standings() {
    return [...this.cars].filter((c) => !c.gone).sort((a, b) => (b.finished - a.finished) || (a.finished && b.finished ? a.finishT - b.finishT : b.D - a.D)).map((c) => ({ name: c.name, me: c.isPlayer, fin: c.finished ? c.finishT : 0 }));
  }
}
