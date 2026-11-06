import * as THREE from 'three';
import { MAPS } from './maps.js';

// Boya Savaşı: Krunker tarzı blok paintball. 2'ye 2 takım, 150 sn, her isabet = 1 puan.
// Ağ: kurucu (host) botları ve skoru yönetir; vuruşu atan taraf karar verir (arkadaş maçı için yeterli).
export const TEAM = [
  { name: 'Kırmızı', c: 0xff4d5e, css: '#ff4d5e' },
  { name: 'Mavi', c: 0x3fa3ff, css: '#3fa3ff' },
];
const R = 0.38, H = 1.75, EYE = 1.55, SPEED = 6.4, JUMP = 6.8, G = 20;
const MATCH = 150, COUNT = 3.5, OUT = 2.5, PROT = 1.2, SENS = 0.0022;

export const WEAPONS = [
  { name: 'Boya Tabancası', mag: 30, rate: 0.14, reload: 1.3, spread: 0.012, pellets: 1, range: 70, snd: [220, 90] },
  { name: 'Saçmalı', mag: 6, rate: 0.8, reload: 2.0, spread: 0.075, pellets: 7, range: 24, snd: [150, 50] },
  { name: 'Keskin Nişancı', mag: 5, rate: 1.0, reload: 2.1, spread: 0.0, pellets: 1, range: 110, snd: [520, 120] },
  { name: 'Hızlı Mini', mag: 60, rate: 0.07, reload: 2.4, spread: 0.04, pellets: 1, range: 55, snd: [300, 160] },
];
const TAU = Math.PI * 2;
const angDiff = (a, b) => ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const rnd = (a, b) => a + Math.random() * (b - a);

function rayBox(ox, oy, oz, dx, dy, dz, b, maxT) {
  let tmin = 0, tmax = maxT, ax = -1, sg = 0;
  const o = [ox, oy, oz], d = [dx, dy, dz], lo = [b.x0, b.y0, b.z0], hi = [b.x1, b.y1, b.z1];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo[i] || o[i] > hi[i]) return null;
      continue;
    }
    let t1 = (lo[i] - o[i]) / d[i], t2 = (hi[i] - o[i]) / d[i], s = -1;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      ax = i;
      sg = s;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (ax < 0) return null;
  return { t: tmin, n: [ax === 0 ? sg : 0, ax === 1 ? sg : 0, ax === 2 ? sg : 0] };
}
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r, maxT) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tc = lx * dx + ly * dy + lz * dz;
  if (tc < 0) return -1;
  const d2 = lx * lx + ly * ly + lz * lz - tc * tc;
  if (d2 > r * r) return -1;
  const t = tc - Math.sqrt(r * r - d2);
  return t >= 0 && t <= maxT ? t : -1;
}

let actx = null;
function beep(f1, f2, dur, type = 'square', vol = 0.06) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    const t = actx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}

function nameSprite(text, css) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const c = cv.getContext('2d');
  c.font = '700 34px sans-serif';
  c.textAlign = 'center';
  c.lineWidth = 7;
  c.strokeStyle = 'rgba(20,30,50,.85)';
  c.strokeText(text, 128, 44);
  c.fillStyle = css;
  c.fillText(text, 128, 44);
  const tex = new THREE.CanvasTexture(cv);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  s.scale.set(1.7, 0.42, 1);
  return s;
}

function makeAvatar(team, name) {
  const g = new THREE.Group();
  const L = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const mT = L(TEAM[team].c), mD = L(0x2b3445), mS = L(0xffd0a6), mP = L(TEAM[team].c);
  const box = (w, h, d, m, x, y, z, parent = g) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    me.position.set(x, y, z);
    parent.add(me);
    return me;
  };
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.18, 0.7, 0);
  legR.position.set(0.18, 0.7, 0);
  box(0.26, 0.7, 0.28, mD, 0, -0.35, 0, legL);
  box(0.26, 0.7, 0.28, mD, 0, -0.35, 0, legR);
  g.add(legL, legR);
  box(0.74, 0.72, 0.4, mT, 0, 1.06, 0);
  box(0.42, 0.42, 0.42, mS, 0, 1.64, 0);
  box(0.47, 0.15, 0.47, mP, 0, 1.87, 0);
  box(0.45, 0.13, 0.06, mD, 0, 1.67, -0.22);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.47, 1.36, 0);
  armR.position.set(0.47, 1.36, 0);
  box(0.2, 0.6, 0.2, mT, 0, -0.28, 0, armL);
  box(0.2, 0.6, 0.2, mT, 0, -0.28, 0, armR);
  armR.rotation.x = -1.25;
  armL.rotation.x = -0.9;
  armL.rotation.z = 0.35;
  box(0.1, 0.12, 0.7, mD, 0, -0.5, -0.1, armR);
  box(0.1, 0.1, 0.1, mT, 0, -0.38, 0, armR);
  g.add(armL, armR);
  box(0.3, 0.5, 0.2, mD, 0, 1.12, 0.3);
  box(0.16, 0.2, 0.16, mP, 0, 1.5, 0.3);
  box(0.78, 0.1, 0.44, mD, 0, 0.74, 0);
  box(0.28, 0.12, 0.34, mP, -0.18, 0.06, -0.03);
  box(0.28, 0.12, 0.34, mP, 0.18, 0.06, -0.03);
  box(0.5, 0.05, 0.3, mP, 0, 1.96, -0.05);
  const splat = box(0.5, 0.42, 0.03, L(0xffffff), 0, 1.1, -0.22);
  splat.visible = false;
  const tag = nameSprite(name, TEAM[team].css);
  tag.position.y = 2.35;
  g.add(tag);
  g.userData = { legL, legR, splat, tag };
  return g;
}

export class Game {
  constructor(canvas, cfg) {
    this.cv = canvas;
    this.cfg = cfg;
    this.cb = cfg.cb || {};
    this.net = cfg.mode === 'online' ? cfg.net : null;
    this.host = !this.net || cfg.host;
    this.me = !this.net || cfg.host ? 0 : 2;
    this.keys = {};
    this.mv = { x: 0, y: 0 };
    this.fireHeld = false;
    this.jumpReq = false;
    this.ph = 0;
    this.t = COUNT;
    this.sc = [0, 0];
    this.rid = 0;
    this.feed = [];
    this.hits = 0;
    this.outs = 0;
    this.wi = 0;
    this.ammos = WEAPONS.map((w) => w.mag);
    this.reload = 0;
    this.fireCd = 0;
    this.kick = 0;
    this.last = performance.now();
    this.sendT = 0;
    this.hudT = 0;
    this.locked = false;
    this.left = false;
    this.mapIdx = -1;
    this.balls = [];
    this.parts = [];
    this.dispose_ = [];

    const touch = cfg.touch;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(78, 16 / 9, 0.05, 200);
    this.cam.rotation.order = 'YXZ';
    this.scene.add(this.cam);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb5c9b0, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(14, 30, 8);
    this.scene.add(sun);
    this.makeViewmodel();

    const nicks = cfg.nicks || [];
    const botNames = { 1: 'Bot Ece', 2: 'Bot Tuna', 3: 'Bot Işık' };
    this.P = [0, 1, 2, 3].map((id) => {
      let ctl = 'bot';
      if (id === this.me) ctl = 'me';
      else if (this.net) ctl = (this.host ? id === 2 : true) ? 'remote' : 'bot';
      let name = botNames[id];
      if (!this.net) name = id === 0 ? nicks[0] || 'Sen' : botNames[id];
      else if (id === 0) name = nicks[0] || 'Kurucu';
      else if (id === 2) name = nicks[1] || 'Misafir';
      const p = {
        id,
        team: id < 2 ? 0 : 1,
        ctl,
        name: String(name).slice(0, 12),
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        tp: new THREE.Vector3(),
        yaw: 0,
        ty: 0,
        pitch: 0,
        tpi: 0,
        out: false,
        outT: 0,
        prot: 0,
        grounded: true,
        sp: 0,
        walk: 0,
        score: 0,
        react: 0,
        strafeDir: 1,
        strafeT: 0,
        fireCd: 1,
        stuckT: 0,
        lp: new THREE.Vector3(),
        grace: 0,
      };
      p.av = makeAvatar(p.team, p.name);
      p.av.visible = ctl !== 'me';
      this.scene.add(p.av);
      return p;
    });

    const mi = cfg.map;
    if (mi != null) this.buildMap(mi);

    this.onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (e.code === 'KeyR') this.doReload();
      if (/^Digit[1-4]$/.test(e.code)) this.setWeapon(+e.code.slice(5) - 1);
      if (e.code === 'Space') e.preventDefault();
    };
    this.onKeyUp = (e) => (this.keys[e.code] = false);
    this.onMouseMove = (e) => {
      if (!this.locked) return;
      this.yawPitch(-e.movementX * SENS, -e.movementY * SENS);
    };
    this.onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (!this.locked && !cfg.touch) {
        this.cv.requestPointerLock?.();
        return;
      }
      this.fireHeld = true;
    };
    this.onMouseUp = () => (this.fireHeld = false);
    this.onLock = () => {
      this.locked = document.pointerLockElement === this.cv;
      if (!this.locked) this.fireHeld = false;
      this.cb.onLock?.(this.locked);
    };
    this.onWheel = (e) => this.nextWeapon(e.deltaY > 0 ? 1 : -1);
    window.addEventListener('wheel', this.onWheel);
    this.onResize = () => this.resize();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.cv.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onLock);
    window.addEventListener('resize', this.onResize);
    this.resize();

    if (this.net) {
      this.net.onState = (s) => this.onNet(s);
      this.net.onEvent = (e) => this.onEvent(e);
      this.net.onLeave = () => this.peerLeft();
    }
    this.reset(true);
    this.raf = requestAnimationFrame(() => this.loop());
  }

  // ---------- harita ----------
  buildMap(idx) {
    if (this.mapIdx === idx) return;
    this.mapIdx = idx;
    const M = MAPS[idx];
    this.map = M;
    this.scene.background = new THREE.Color(M.sky);
    this.scene.fog = new THREE.Fog(M.fog, 40, 120);
    if (this.world) this.scene.remove(this.world);
    const w = (this.world = new THREE.Group());
    this.scene.add(w);
    // zemin: iki tonlu damalı
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = M.g1;
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = M.g2;
    c.fillRect(0, 0, 32, 32);
    c.fillRect(32, 32, 32, 32);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    const size = 320;
    tex.repeat.set(size / 4, size / 4);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: tex }));
    ground.rotation.x = -Math.PI / 2;
    w.add(ground);
    this.colliders = [];
    const add = (x, z, bw, bd, bh, col, y0 = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), new THREE.MeshLambertMaterial({ color: col, flatShading: true }));
      m.position.set(x, y0 + bh / 2, z);
      w.add(m);
      const top = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.98, 0.05, bd * 0.98), new THREE.MeshLambertMaterial({ color: new THREE.Color(col).offsetHSL(0, 0, 0.12) }));
      top.position.set(x, y0 + bh + 0.026, z);
      w.add(top);
      this.colliders.push({ x0: x - bw / 2, x1: x + bw / 2, z0: z - bd / 2, z1: z + bd / 2, y0, y1: y0 + bh });
    };
    for (const b of M.boxes) add(...b);
    const hf = M.half, wt = 1, wh = 3.4;
    add(0, -hf - wt / 2, hf * 2 + 2 * wt, wt, wh, M.wall);
    add(0, hf + wt / 2, hf * 2 + 2 * wt, wt, wh, M.wall);
    add(-hf - wt / 2, 0, wt, hf * 2, wh, M.wall);
    add(hf + wt / 2, 0, wt, hf * 2, wh, M.wall);
    this.colliders.length -= 4; // duvarları sınır kutusu olarak değil, alan sınırı olarak kullan
    // süsler: ağaçlar (ya da şehir blokları), doğuş platformları, bayraklar
    const hf2 = M.half;
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    const prop = (bw, bh, bd, c, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat(c));
      m.position.set(x, y + bh / 2, z);
      w.add(m);
    };
    const city = M.id === 'cati';
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU, rr = hf2 * 1.45 + rnd(4, 14);
      const x = Math.cos(a) * rr * (0.9 + Math.random() * 0.2), z = Math.sin(a) * rr * (0.9 + Math.random() * 0.2);
      if (city) {
        const bh = rnd(8, 26);
        prop(rnd(5, 9), bh, rnd(5, 9), ['#cfd8e3', '#aebccb', '#e6d3b9', '#9fb3c8'][i % 4], x, 0, z);
      } else {
        const sc = rnd(0.9, 1.5);
        prop(0.7 * sc, 2 * sc, 0.7 * sc, '#8a5a34', x, 0, z);
        prop(3.2 * sc, 1.8 * sc, 3.2 * sc, '#3da55a', x, 2 * sc, z);
        prop(2 * sc, 1.5 * sc, 2 * sc, '#56c273', x, 3.7 * sc, z);
      }
    }
    for (let ti = 0; ti < 2; ti++) {
      for (const [sx, sz] of M.spawns[ti]) {
        prop(2.4, 0.05, 2.4, ti ? '#3fa3ff' : '#ff4d5e', sx, 0, sz);
      }
      const fz = (ti ? 1 : -1) * (hf2 - 1.6);
      prop(0.12, 3.6, 0.12, '#f4f1e8', 0, 0, fz);
      prop(1.3, 0.8, 0.06, ti ? '#3fa3ff' : '#ff4d5e', 0.7, 2.8, fz);
    }
    // bulutlar
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    for (let i = 0; i < 10; i++) {
      const cl = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(rnd(6, 11), rnd(2, 3), rnd(4, 6)), cm);
        b.position.set(k * 5 - 5, rnd(-0.4, 0.4), rnd(-1, 1));
        cl.add(b);
      }
      cl.position.set(rnd(-90, 90), rnd(26, 40), rnd(-90, 90));
      w.add(cl);
    }
    // boya lekeleri (örneklemeli)
    const geo = new THREE.CircleGeometry(1, 9);
    this.decal = TEAM.map((t) => {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: t.c, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 240);
      im.frustumCulled = false;
      const z = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < 240; i++) im.setMatrixAt(i, z);
      im.instanceMatrix.needsUpdate = true;
      w.add(im);
      return { im, i: 0 };
    });
    this.reset(true);
    this.cb.onMap?.(M);
  }

  clearDecals() {
    if (!this.decal) return;
    const z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const d of this.decal) {
      for (let i = 0; i < 240; i++) d.im.setMatrixAt(i, z);
      d.im.instanceMatrix.needsUpdate = true;
      d.i = 0;
    }
  }

  splatAt(team, pt, n) {
    if (!this.decal) return;
    const d = this.decal[team];
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(n[0], n[1], n[2]));
    const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rnd(0, TAU));
    q.multiply(spin);
    const base = rnd(0.32, 0.5);
    const parts = [
      [0, 0, base * rnd(0.8, 1.25), base * rnd(0.8, 1.25)],
      [rnd(-0.5, 0.5), rnd(-0.5, 0.5), base * 0.35, base * 0.35],
      [rnd(-0.6, 0.6), rnd(-0.6, 0.6), base * 0.25, base * 0.3],
    ];
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (const [ox, oy, sx, sy] of parts) {
      p.set(ox, oy, 0.015).applyQuaternion(q).add(new THREE.Vector3(pt[0], pt[1], pt[2]));
      s.set(sx, sy, 1);
      m.compose(p, q, s);
      d.im.setMatrixAt(d.i, m);
      d.i = (d.i + 1) % 240;
    }
    d.im.instanceMatrix.needsUpdate = true;
  }

  // ---------- fizik ----------
  blocked(x, y, z) {
    const h = this.map.half;
    if (Math.abs(x) > h - R || Math.abs(z) > h - R) return true;
    for (const b of this.colliders) {
      if (x > b.x0 - R && x < b.x1 + R && z > b.z0 - R && z < b.z1 + R && y + H > b.y0 && y < b.y1 - 0.32) return true;
    }
    return false;
  }
  groundAt(x, z, y) {
    let g = 0;
    for (const b of this.colliders) {
      if (x > b.x0 - 0.12 && x < b.x1 + 0.12 && z > b.z0 - 0.12 && z < b.z1 + 0.12 && b.y1 <= y + 0.36 && b.y1 > g) g = b.y1;
    }
    return g;
  }
  physics(p, vx, vz, dt, jump) {
    const nx = p.pos.x + vx * dt;
    if (!this.blocked(nx, p.pos.y, p.pos.z)) p.pos.x = nx;
    const nz = p.pos.z + vz * dt;
    if (!this.blocked(p.pos.x, p.pos.y, nz)) p.pos.z = nz;
    const gh = this.groundAt(p.pos.x, p.pos.z, p.pos.y);
    if (p.grounded && jump) {
      p.vel.y = JUMP;
      p.grounded = false;
    }
    if (!p.grounded || p.pos.y > gh + 0.001) {
      p.vel.y -= G * dt;
      p.pos.y += p.vel.y * dt;
      p.grounded = false;
    }
    if (p.pos.y <= gh) {
      p.pos.y = gh;
      p.vel.y = 0;
      p.grounded = true;
    }
  }

  // ---------- maç akışı ----------
  spawnPoint(p) {
    const s = this.map.spawns[p.team][p.id % 2];
    return s;
  }
  respawn(p) {
    const s = this.spawnPoint(p);
    p.pos.set(s[0], 0, s[1]);
    p.tp.copy(p.pos);
    p.vel.set(0, 0, 0);
    p.grounded = true;
    p.out = false;
    p.outT = 0;
    p.prot = PROT;
    p.yaw = p.ty = p.team === 0 ? Math.PI : 0; // kırmızı +z'ye, mavi -z'ye bakar
    p.pitch = 0;
    p.av.userData.splat.visible = false;
    p.av.rotation.x = 0;
    if (p.id === this.me) {
      this.ammos = WEAPONS.map((w) => w.mag);
      this.reload = 0;
    }
  }
  reset(silent) {
    if (!this.map) return;
    this.sc = [0, 0];
    this.ph = 0;
    this.t = COUNT;
    this.feed = [];
    this.clearDecals();
    for (const p of this.P) {
      p.score = 0;
      this.respawn(p);
      p.prot = 0;
    }
    if (!silent) beep(520, 520, 0.12, 'triangle');
  }
  rematch() {
    if (!this.host) return;
    this.rid++;
    this.reset();
  }
  winner() {
    return this.sc[0] > this.sc[1] ? 0 : this.sc[1] > this.sc[0] ? 1 : -1;
  }

  // ---------- atış ----------
  dirOf(yaw, pitch) {
    const cp = Math.cos(pitch);
    return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
  }
  trace(p, ox, oy, oz, d, maxT = 70) {
    let best = { t: maxT, kind: 'air', n: [0, 1, 0] };
    if (d[1] < -1e-6) {
      const t = -oy / d[1];
      if (t > 0 && t < best.t) best = { t, kind: 'wall', n: [0, 1, 0] };
    }
    for (const b of this.colliders) {
      const h = rayBox(ox, oy, oz, d[0], d[1], d[2], b, best.t);
      if (h && h.t < best.t) best = { t: h.t, kind: 'wall', n: h.n };
    }
    const wallT = best.t;
    for (const q of this.P) {
      if (q === p || q.out || q.team === p.team) continue;
      const a = raySphere(ox, oy, oz, d[0], d[1], d[2], q.pos.x, q.pos.y + 0.62, q.pos.z, 0.52, wallT);
      const b = raySphere(ox, oy, oz, d[0], d[1], d[2], q.pos.x, q.pos.y + 1.4, q.pos.z, 0.42, wallT);
      const t = a < 0 ? b : b < 0 ? a : Math.min(a, b);
      if (t >= 0 && t < best.t) best = { t, kind: 'player', who: q, n: [-d[0], -d[1], -d[2]] };
    }
    return best;
  }
  visible(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const L = Math.hypot(dx, dy, dz) || 1;
    const d = [dx / L, dy / L, dz / L];
    for (const b of this.colliders) {
      const h = rayBox(from.x, from.y, from.z, d[0], d[1], d[2], b, L);
      if (h) return false;
    }
    return true;
  }
  shoot(p, spread = 0.012, pellets = 1, range = 70) {
    let hit;
    for (let i = 0; i < pellets; i++) hit = this.shootOne(p, spread, range);
    return hit;
  }
  shootOne(p, spread, range) {
    const eye = [p.pos.x, p.pos.y + EYE, p.pos.z];
    const d = this.dirOf(p.yaw + rnd(-spread, spread), p.pitch + rnd(-spread, spread));
    const hit = this.trace(p, eye[0], eye[1], eye[2], d, range);
    const f = this.dirOf(p.yaw, 0);
    const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const muzzle = [eye[0] + f[0] * 0.55 + rx * 0.22, eye[1] - 0.2, eye[2] + f[2] * 0.55 + rz * 0.22];
    const pt = [eye[0] + d[0] * hit.t, eye[1] + d[1] * hit.t, eye[2] + d[2] * hit.t];
    const ev = { k: 's', i: p.id, m: muzzle.map((v) => +v.toFixed(2)), q: pt.map((v) => +v.toFixed(2)), n: hit.n, h: hit.kind === 'player' ? 1 : 0, a: hit.kind === 'air' ? 1 : 0 };
    this.spawnShot(ev);
    this.net?.sendEvent(ev);
    if (hit.kind === 'player') {
      if (this.host) this.tag(hit.who, p);
      else if (p.id === this.me) {
        this.net.sendEvent({ k: 'h', t: hit.who.id });
        this.hits++;
        beep(900, 1400, 0.09, 'sine', 0.07);
      }
    }
    return hit;
  }
  spawnShot(e) {
    const p = this.P[e.i];
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: TEAM[p.team].c }));
    m.position.set(...e.m);
    this.scene.add(m);
    const dist = Math.hypot(e.q[0] - e.m[0], e.q[1] - e.m[1], e.q[2] - e.m[2]);
    this.balls.push({ m, from: e.m, to: e.q, t: 0, dur: Math.max(0.03, dist / 90), team: p.team, n: e.n, h: e.h, a: e.a });
    if (e.i !== this.me) beep(320, 120, 0.08, 'square', 0.025);
  }
  tag(target, shooter) {
    if (this.ph !== 1 || target.out || target.prot > 0 || target.team === shooter.team) return;
    this.applyOut(target.id, shooter.id);
    this.net?.sendEvent({ k: 'o', i: target.id, by: shooter.id });
    if (shooter.id === this.me) {
      this.hits++;
      beep(900, 1400, 0.09, 'sine', 0.07);
    }
  }
  applyOut(id, by) {
    const t = this.P[id], s = this.P[by];
    if (!t || !s) return;
    t.out = true;
    t.outT = OUT;
    t.grace = 0.8;
    t.av.userData.splat.visible = true;
    t.av.userData.splat.material.color.setHex(TEAM[s.team].c);
    if (this.host) {
      s.score++;
      this.sc[s.team]++;
    }
    this.feed.push({ a: s.name, ta: s.team, b: t.name, tb: t.team, at: performance.now() });
    if (this.feed.length > 5) this.feed.shift();
    if (id === this.me) {
      this.outs++;
      this.fireHeld = false;
      beep(300, 70, 0.4, 'sawtooth', 0.06);
    }
  }
  get W() {
    return WEAPONS[this.wi];
  }
  doReload() {
    if (this.reload > 0 || this.ammos[this.wi] >= this.W.mag || this.P[this.me].out) return;
    this.reload = this.W.reload;
    beep(200, 380, 0.15, 'triangle', 0.04);
  }
  setWeapon(i) {
    if (i === this.wi || i < 0 || i >= WEAPONS.length || this.P[this.me].out) return;
    this.wi = i;
    this.reload = 0;
    this.fireCd = 0.25;
    this.vms.forEach((v, k) => (v.visible = k === i));
    beep(420, 620, 0.06, 'triangle', 0.04);
  }
  nextWeapon(d = 1) {
    this.setWeapon((this.wi + d + WEAPONS.length) % WEAPONS.length);
  }

  // ---------- giriş ----------
  yawPitch(dy, dp) {
    const p = this.P[this.me];
    p.yaw += dy;
    p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch + dp));
  }
  look(dx, dy) {
    this.yawPitch(-dx * 0.0055, -dy * 0.0055);
  }
  setMove(x, y) {
    this.mv.x = x;
    this.mv.y = y;
  }
  setFire(v) {
    this.fireHeld = !!v;
  }
  jump() {
    this.jumpReq = true;
  }

  // ---------- ağ ----------
  onNet(s) {
    if (!s) return this.peerLeft();
    if (s.hi) return;
    if (this.host) {
      const p = this.P[2];
      p.tp.set(s.x, s.y, s.z);
      p.ty = s.r;
      p.tpi = s.p;
      p.sp = s.v;
      if (p.grace <= 0) {
        if (s.o && !p.out) {
          p.out = true;
        }
        if (!s.o && p.out) {
          p.out = false;
          p.prot = PROT;
          p.av.userData.splat.visible = false;
          p.pos.copy(p.tp);
        }
      }
    } else {
      if (s.mp != null && this.mapIdx < 0) this.buildMap(s.mp);
      if (!this.map) return;
      const h = this.P[0];
      h.tp.set(s.x, s.y, s.z);
      h.ty = s.r;
      h.tpi = s.p;
      h.sp = s.v;
      h.out = !!s.o;
      if (!h.out) h.av.userData.splat.visible = false;
      (s.b || []).forEach((b, k) => {
        const q = this.P[k === 0 ? 1 : 3];
        q.tp.set(b[0], b[1], b[2]);
        q.ty = b[3];
        q.tpi = b[4];
        q.out = !!b[5];
        q.sp = b[6];
        if (!q.out) q.av.userData.splat.visible = false;
      });
      this.sc = s.sc || this.sc;
      (s.ps || []).forEach((v, i) => (this.P[i].score = v));
      if (s.rid !== this.rid) {
        this.rid = s.rid;
        this.reset();
      }
      this.ph = s.ph;
      this.t = s.t;
    }
  }
  onEvent(e) {
    if (!e || !this.map) return;
    if (e.k === 's') this.spawnShot(e);
    else if (e.k === 'h' && this.host) {
      const t = this.P[e.t], s = this.P[2];
      if (t && s && !s.out) this.tag(t, s);
    } else if (e.k === 'o' && !this.host) {
      this.applyOut(e.i, e.by);
      if (e.by === this.me) beep(900, 1400, 0.09, 'sine', 0.07);
    }
  }
  peerLeft() {
    if (this.left) return;
    this.left = true;
    this.cb.onLeft?.();
  }
  sendState() {
    if (!this.net) return;
    const me = this.P[this.me];
    const pkt = { x: +me.pos.x.toFixed(2), y: +me.pos.y.toFixed(2), z: +me.pos.z.toFixed(2), r: +me.yaw.toFixed(2), p: +me.pitch.toFixed(2), o: me.out ? 1 : 0, v: +me.sp.toFixed(1) };
    if (this.host) {
      pkt.mp = this.mapIdx;
      pkt.ph = this.ph;
      pkt.t = +this.t.toFixed(1);
      pkt.sc = this.sc;
      pkt.ps = this.P.map((p) => p.score);
      pkt.rid = this.rid;
      pkt.b = [1, 3].map((i) => {
        const q = this.P[i];
        return [+q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2), +q.yaw.toFixed(2), +q.pitch.toFixed(2), q.out ? 1 : 0, +q.sp.toFixed(1)];
      });
    }
    this.net.sendState(pkt);
  }

  // ---------- botlar ----------
  updateBot(p, dt) {
    if (p.out) {
      p.outT -= dt;
      if (p.outT <= 0 && this.ph === 1) this.respawn(p);
      return;
    }
    p.prot = Math.max(0, p.prot - dt);
    p.fireCd -= dt;
    p.react -= dt;
    if (this.ph !== 1) {
      p.sp = 0;
      return;
    }
    let target = null, bd = 1e9;
    for (const q of this.P) {
      if (q.team === p.team || q.out) continue;
      const d = Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z);
      if (d < bd) {
        bd = d;
        target = q;
      }
    }
    let mx = 0, mz = 0, jump = false;
    const eye = new THREE.Vector3(p.pos.x, p.pos.y + EYE, p.pos.z);
    if (target) {
      const dx = target.pos.x - p.pos.x, dz = target.pos.z - p.pos.z;
      const want = Math.atan2(-dx, -dz);
      const err = angDiff(p.yaw, want);
      p.yaw += Math.max(-3 * dt, Math.min(3 * dt, err));
      const tp = new THREE.Vector3(target.pos.x, target.pos.y + 1.1, target.pos.z);
      p.pitch = Math.atan2(tp.y - eye.y, bd);
      const los = this.visible(eye, tp);
      if (los && !p.los) p.react = 0.35;
      p.los = los;
      p.strafeT -= dt;
      if (p.strafeT <= 0) {
        p.strafeT = rnd(0.6, 1.6);
        p.strafeDir = Math.random() < 0.5 ? -1 : 1;
        if (Math.random() < 0.2) jump = true;
      }
      const fwd = !los ? 1 : bd > 13 ? 1 : bd < 6 ? -0.6 : 0.1;
      const side = p.strafeDir * (los ? 0.8 : 1);
      const f = [-Math.sin(p.yaw), -Math.cos(p.yaw)], r = [Math.cos(p.yaw), -Math.sin(p.yaw)];
      mx = f[0] * fwd + r[0] * side;
      mz = f[1] * fwd + r[1] * side;
      if (los && Math.abs(err) < 0.16 && bd < 45 && p.fireCd <= 0 && p.react <= 0) {
        this.shoot(p, 0.03 + bd * 0.0016);
        p.fireCd = rnd(0.4, 0.8);
      }
    } else {
      mx = -p.pos.x * 0.1;
      mz = -p.pos.z * 0.1;
    }
    const L = Math.hypot(mx, mz);
    if (L > 1) {
      mx /= L;
      mz /= L;
    }
    const before = p.lp.set(p.pos.x, 0, p.pos.z).clone();
    this.physics(p, mx * SPEED * 0.9, mz * SPEED * 0.9, dt, jump);
    const moved = Math.hypot(p.pos.x - before.x, p.pos.z - before.z);
    p.sp = moved / dt;
    if (L > 0.3 && moved < SPEED * 0.9 * dt * 0.25) {
      p.stuckT += dt;
      if (p.stuckT > 0.5) {
        p.stuckT = 0;
        p.strafeDir *= -1;
        p.strafeT = 1.2;
        this.physics(p, 0, 0, 0.016, true);
      }
    } else p.stuckT = 0;
  }

  // ---------- ana döngü ----------
  updateMe(dt) {
    const p = this.P[this.me];
    p.prot = Math.max(0, p.prot - dt);
    if (p.out) {
      p.outT -= dt;
      p.sp = 0;
      if (p.outT <= 0 && this.ph === 1) this.respawn(p);
      return;
    }
    let mx = this.mv.x, my = this.mv.y;
    const k = this.keys;
    if (k.KeyW || k.ArrowUp) my += 1;
    if (k.KeyS || k.ArrowDown) my -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    const L = Math.hypot(mx, my);
    if (L > 1) {
      mx /= L;
      my /= L;
    }
    if (this.ph === 2 || this.ph === 0) {
      mx = my = 0;
    }
    const f = [-Math.sin(p.yaw), -Math.cos(p.yaw)], r = [Math.cos(p.yaw), -Math.sin(p.yaw)];
    const vx = (f[0] * my + r[0] * mx) * SPEED, vz = (f[1] * my + r[1] * mx) * SPEED;
    const before = [p.pos.x, p.pos.z];
    this.physics(p, vx, vz, dt, (k.Space || this.jumpReq) && this.ph === 1);
    this.jumpReq = false;
    p.sp = Math.hypot(p.pos.x - before[0], p.pos.z - before[1]) / dt;
    this.fireCd -= dt;
    this.kick = Math.max(0, this.kick - dt * 6);
    const W = this.W;
    if (this.reload > 0) {
      this.reload -= dt;
      if (this.reload <= 0) {
        this.reload = 0;
        this.ammos[this.wi] = W.mag;
      }
    }
    if (this.fireHeld && this.ph === 1 && this.fireCd <= 0 && this.reload <= 0) {
      if (this.ammos[this.wi] > 0) {
        this.fireCd = W.rate;
        this.ammos[this.wi]--;
        this.kick = 1;
        p.pitch += this.wi === 1 ? 0.03 : this.wi === 2 ? 0.045 : 0.006;
        this.shoot(p, W.spread, W.pellets, W.range);
        beep(W.snd[0], W.snd[1], 0.08, 'square', 0.05);
        if (this.ammos[this.wi] === 0) this.doReload();
      } else this.doReload();
    }
  }

  step(dt) {
    if (!this.map) return;
    // faz
    if (this.host) {
      if (this.ph === 0) {
        this.t -= dt;
        if (this.t <= 0) {
          this.ph = 1;
          this.t = MATCH;
          beep(880, 880, 0.35, 'triangle', 0.08);
        }
      } else if (this.ph === 1) {
        this.t -= dt;
        if (this.t <= 0) {
          this.t = 0;
          this.ph = 2;
          beep(660, 330, 0.8, 'triangle', 0.08);
          this.cb.onEnd?.();
        }
      }
    } else {
      if (this.ph !== 2) this.t = Math.max(0, this.t - dt);
    }
    this.updateMe(dt);
    for (const p of this.P) {
      if (p.grace > 0) p.grace -= dt;
      if (p.ctl === 'bot') this.updateBot(p, dt);
      else if (p.ctl === 'remote') {
        p.pos.lerp(p.tp, 1 - Math.exp(-dt * 14));
        p.yaw += angDiff(p.yaw, p.ty) * Math.min(1, dt * 14);
        p.pitch += (p.tpi - p.pitch) * Math.min(1, dt * 14);
        if (p.out) p.outT = Math.max(0.01, p.outT - dt);
        p.prot = Math.max(0, p.prot - dt);
      }
      // avatar
      const a = p.av;
      a.position.copy(p.pos);
      a.rotation.y = p.yaw;
      const k = Math.min(p.sp / SPEED, 1);
      p.walk += dt * (4 + k * 8);
      const sw = Math.sin(p.walk) * 0.8 * k;
      a.userData.legL.rotation.x = sw;
      a.userData.legR.rotation.x = -sw;
      const target = p.out ? -1.45 : 0;
      a.rotation.x += (target - a.rotation.x) * Math.min(1, dt * 10);
      a.userData.tag.visible = !p.out && p.id !== this.me;
      a.visible = p.ctl !== 'me';
    }
    // mermiler / parçacıklar
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.t += dt / b.dur;
      const t = Math.min(1, b.t);
      b.m.position.set(b.from[0] + (b.to[0] - b.from[0]) * t, b.from[1] + (b.to[1] - b.from[1]) * t, b.from[2] + (b.to[2] - b.from[2]) * t);
      if (b.t >= 1) {
        this.scene.remove(b.m);
        b.m.geometry.dispose();
        b.m.material.dispose();
        this.balls.splice(i, 1);
        if (!b.h && !b.a) this.splatAt(b.team, b.to, b.n);
        this.burst(b.to, b.team, b.h ? 9 : 5);
      }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.life -= dt;
      q.vel.y -= 14 * dt;
      q.m.position.addScaledVector(q.vel, dt);
      q.m.scale.setScalar(Math.max(0.01, q.life * 3));
      if (q.life <= 0) {
        this.scene.remove(q.m);
        this.parts.splice(i, 1);
      }
    }
    // sunucu: kuruculuk işleri
    this.sendT += dt;
    if (this.sendT >= 0.066) {
      this.sendT = 0;
      this.sendState();
    }
    // kamera
    const me = this.P[this.me];
    const eyeY = me.out ? 0.5 : EYE;
    this.cam.position.set(me.pos.x, me.pos.y + eyeY, me.pos.z);
    this.cam.rotation.set(me.out ? -0.2 : me.pitch, me.yaw, me.out ? 0.35 : 0);
    const vm = this.vms[this.wi];
    this.vms.forEach((v, k) => (v.visible = k === this.wi && !me.out));
    vm.position.set(0.24, -0.24 + this.kick * 0.015, -0.46 + this.kick * 0.07);
    vm.rotation.x = this.kick * 0.1 - (this.reload > 0 ? 0.6 : 0);
  }

  burst(pt, team, n) {
    if (this.parts.length > 80) return;
    const mat = this.pm || (this.pm = TEAM.map((t) => new THREE.MeshBasicMaterial({ color: t.c })));
    const geo = this.pg || (this.pg = new THREE.BoxGeometry(0.1, 0.1, 0.1));
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat[team]);
      m.position.set(pt[0], pt[1], pt[2]);
      this.scene.add(m);
      this.parts.push({ m, vel: new THREE.Vector3(rnd(-2.5, 2.5), rnd(1, 4), rnd(-2.5, 2.5)), life: rnd(0.25, 0.5) });
    }
  }

  makeViewmodel() {
    const L = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    const tc = TEAM[this.me < 2 ? 0 : 1].c;
    const defs = [
      [[0.08, 0.1, 0.42, 0x2b3445, 0, 0, -0.2], [0.045, 0.045, 0.34, 0x59647a, 0, 0.012, -0.55], [0.08, 0.11, 0.1, tc, 0, 0.1, -0.1], [0.1, 0.1, 0.14, 0xffd0a6, 0, -0.08, -0.1]],
      [[0.12, 0.12, 0.5, 0x6b4a2b, 0, 0, -0.25], [0.09, 0.09, 0.5, 0x59647a, 0, 0.02, -0.7], [0.1, 0.06, 0.2, tc, 0, 0.09, -0.3], [0.11, 0.1, 0.16, 0xffd0a6, 0, -0.09, -0.2]],
      [[0.07, 0.1, 0.55, 0x2b3445, 0, 0, -0.25], [0.03, 0.03, 0.62, 0x59647a, 0, 0.015, -0.86], [0.05, 0.07, 0.16, tc, 0, 0.09, -0.2], [0.09, 0.09, 0.14, 0xffd0a6, 0, -0.08, -0.15]],
      [[0.1, 0.13, 0.36, 0x3a3f4f, 0, 0, -0.18], [0.07, 0.07, 0.26, 0x59647a, 0, 0.01, -0.48], [0.14, 0.16, 0.14, tc, 0, 0.12, -0.12], [0.1, 0.1, 0.14, 0xffd0a6, 0, -0.09, -0.12]],
    ];
    this.vms = defs.map((parts, k) => {
      const g = new THREE.Group();
      for (const [w, h, d, c, x, y, z] of parts) {
        const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), L(c));
        me.position.set(x, y, z);
        g.add(me);
      }
      g.visible = k === 0;
      this.cam.add(g);
      return g;
    });
  }

  hud() {
    const now = performance.now();
    const me = this.P[this.me];
    return {
      ph: this.ph,
      t: this.t,
      sc: this.sc.slice(),
      ps: this.P.map((p) => ({ n: p.name, team: p.team, s: p.score, me: p.id === this.me })),
      team: me.team,
      ammo: this.ammos[this.wi],
      mag: this.W.mag,
      wname: this.W.name,
      wi: this.wi,
      reload: this.reload > 0 ? 1 - this.reload / this.W.reload : -1,
      out: me.out ? Math.max(0, me.outT) : 0,
      feed: this.feed.filter((f) => now - f.at < 5000),
      hits: this.hits,
      outs: this.outs,
      winner: this.winner(),
      host: this.host,
      waiting: !this.map,
      left: this.left,
    };
  }

  resize() {
    const w = this.cv.clientWidth || 800, h = this.cv.clientHeight || 450;
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.fov = w / h < 1 ? 92 : 78;
    this.cam.updateProjectionMatrix();
  }
  render() {
    this.r.render(this.scene, this.cam);
  }
  loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.render();
    this.hudT += dt;
    if (this.hudT > 0.1) {
      this.hudT = 0;
      this.cb.onHud?.(this.hud());
    }
    this.raf = requestAnimationFrame(() => this.loop());
  }
  // test için: ekranı çizmeden n adım ilerlet
  advance(n, dt = 1 / 30) {
    for (let i = 0; i < n; i++) this.step(dt);
    this.cb.onHud?.(this.hud());
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.onLock);
    this.cv.removeEventListener('mousedown', this.onMouseDown);
    if (document.pointerLockElement === this.cv) document.exitPointerLock?.();
    try {
      this.net?.leave?.();
    } catch {}
    this.r.dispose();
  }
}
