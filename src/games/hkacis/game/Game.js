import * as THREE from 'three';
import { CHAPTERS } from './levels.js';

// Hapisten Kaçış: 2 kişilik co-op gizlilik, blok tarz. Kurucu (host) gardiyanları ve bölüm durumunu yönetir.
const R = 0.5, H = 2.3, SPEED = 6.8, JUMP = 8.4, G = 22, SC = 1.3, CAUGHT = 8;
const TAU = Math.PI * 2;
const angDiff = (a, b) => ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const rnd = (a, b) => a + Math.random() * (b - a);
export const HEROES = [
  { name: 'Kaan', body: 0xff9f43, css: '#ff9f43' },
  { name: 'Mert', body: 0x3fa3ff, css: '#3fa3ff' },
];

let actx = null;
function beep(f1, f2, dur, type = 'square', vol = 0.05) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
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

function rayBox(ox, oy, oz, dx, dy, dz, b, maxT) {
  let tmin = 0, tmax = maxT, ax = -1;
  const o = [ox, oy, oz], d = [dx, dy, dz], lo = [b.x0, b.y0, b.z0], hi = [b.x1, b.y1, b.z1];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo[i] || o[i] > hi[i]) return null;
      continue;
    }
    let t1 = (lo[i] - o[i]) / d[i], t2 = (hi[i] - o[i]) / d[i];
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tmin) {
      tmin = t1;
      ax = i;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  return ax < 0 ? null : tmin;
}

function sprite(text, css, size = 64, w = 256) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = size;
  const c = cv.getContext('2d');
  c.font = '700 ' + Math.round(size * 0.55) + 'px sans-serif';
  c.textAlign = 'center';
  c.lineWidth = 7;
  c.strokeStyle = 'rgba(20,30,50,.85)';
  c.strokeText(text, w / 2, size * 0.72);
  c.fillStyle = css;
  c.fillText(text, w / 2, size * 0.72);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  s.renderOrder = 10;
  return s;
}

function makeAvatar(bodyC, capC, name, tagCss) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(SC);
  g.add(inner);
  const L = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, emissive: new THREE.Color(c).multiplyScalar(0.18) });
  const mT = L(bodyC), mD = L(0x2b3445), mS = L(0xffd0a6), mP = L(capC);
  const box = (w, h, d, m, x, y, z, parent = inner) => {
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
  inner.add(legL, legR);
  box(0.74, 0.72, 0.4, mT, 0, 1.06, 0);
  box(0.78, 0.1, 0.44, mD, 0, 0.74, 0);
  box(0.42, 0.42, 0.42, mS, 0, 1.64, 0);
  box(0.47, 0.15, 0.47, mP, 0, 1.87, 0);
  box(0.45, 0.13, 0.06, mD, 0, 1.67, -0.22);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.47, 1.36, 0);
  armR.position.set(0.47, 1.36, 0);
  box(0.2, 0.6, 0.2, mT, 0, -0.28, 0, armL);
  box(0.2, 0.6, 0.2, mT, 0, -0.28, 0, armR);
  inner.add(armL, armR);
  const tag = sprite(name, tagCss);
  tag.scale.set(2.1, 0.52, 1);
  tag.position.y = 3.2;
  if (name) g.add(tag);
  g.userData = { legL, legR, armL, armR, tag, inner };
  return g;
}

export class Game {
  constructor(canvas, cfg) {
    this.cv = canvas;
    this.cfg = cfg;
    this.cb = cfg.cb || {};
    this.net = cfg.mode === 'online' ? cfg.net : null;
    this.host = !this.net || cfg.host;
    this.me = this.host ? 0 : 1;
    this.keys = {};
    this.mv = { x: 0, y: 0 };
    this.jumpReq = false;
    this.throwReq = false;
    this.camYaw = 0;
    this.camPitch = 0.35;
    this.ph = 0;
    this.ci = -1;
    this.t = 0;
    this.owned = new Set();
    this.toast = '';
    this.toastT = 0;
    this.throwCd = 0;
    this.sendT = 0;
    this.hudT = 0;
    this.locked = false;
    this.left = false;
    this.stones = [];
    this.last = performance.now();

    const touch = cfg.touch;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 260);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb5bccd, 1.45));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(20, 40, 14);
    this.scene.add(sun);

    const nicks = cfg.nicks || [];
    this.P = [0, 1].map((id) => {
      const name = String(this.net ? nicks[id] || HEROES[id].name : id === 0 ? nicks[0] || HEROES[0].name : HEROES[1].name).slice(0, 12);
      const p = {
        id,
        name,
        ctl: id === this.me ? 'me' : this.net ? 'remote' : 'bot',
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        tp: new THREE.Vector3(),
        yaw: 0,
        ty: 0,
        sp: 0,
        walk: 0,
        grounded: true,
        caught: 0,
        stuck: 0,
        sd: 1,
        lp: new THREE.Vector3(),
      };
      p.av = makeAvatar(HEROES[id].body, 0x2b3445, name, HEROES[id].css);
      this.scene.add(p.av);
      return p;
    });

    this.onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'KeyQ') this.throwReq = true;
      if (e.code === 'Space') e.preventDefault();
    };
    this.onKeyUp = (e) => (this.keys[e.code] = false);
    this.onMouseMove = (e) => {
      if (this.locked) this.look(e.movementX * 0.4, e.movementY * 0.4);
    };
    this.onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (!this.locked && !cfg.touch) this.cv.requestPointerLock?.();
      else this.throwReq = true;
    };
    this.onLock = () => {
      this.locked = document.pointerLockElement === this.cv;
      this.cb.onLock?.(this.locked);
    };
    this.onResize = () => this.resize();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.cv.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('pointerlockchange', this.onLock);
    window.addEventListener('resize', this.onResize);
    this.resize();

    if (this.net) {
      this.net.onState = (s) => this.onNet(s);
      this.net.onEvent = (e) => this.onEvent(e);
      this.net.onLeave = () => this.peerLeft();
    }
    if (this.host) this.load(cfg.chapter || 0);
    this.raf = requestAnimationFrame(() => this.loop());
  }

  // ---------- bölüm kurulumu ----------
  load(ci) {
    this.ci = ci;
    const C = (this.C = CHAPTERS[ci]);
    this.scene.background = new THREE.Color(C.sky);
    this.scene.fog = new THREE.Fog(C.fog, 60, 170);
    if (this.world) this.scene.remove(this.world);
    const w = (this.world = new THREE.Group());
    this.scene.add(w);
    const [hx, hz] = C.half;
    this.hx = hx;
    this.hz = hz;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = C.g1;
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = C.g2;
    c.fillRect(0, 0, 32, 32);
    c.fillRect(32, 32, 32, 32);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.repeat.set(80, 80);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshLambertMaterial({ map: tex }));
    ground.rotation.x = -Math.PI / 2;
    w.add(ground);
    this.cols = [];
    const M = (col) => new THREE.MeshLambertMaterial({ color: col, flatShading: true });
    const add = (x, z, bw, bd, bh, col, y0 = 0, extra = null) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), M(col));
      m.position.set(x, y0 + bh / 2, z);
      w.add(m);
      const top = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.98, 0.06, bd * 0.98), M(new THREE.Color(col).offsetHSL(0, 0, 0.1)));
      top.position.set(x, y0 + bh + 0.03, z);
      w.add(top);
      const col_ = { x0: x - bw / 2, x1: x + bw / 2, z0: z - bd / 2, z1: z + bd / 2, y0, y1: y0 + bh, off: false, meshes: [m, top] };
      this.cols.push(col_);
      return col_;
    };
    for (const b of C.boxes) add(...b);
    // dış duvarlar (görsel + sınır)
    const wc = '#c3c9d6', wt = 1.2, wh = 7;
    for (const [x, z, bw, bd] of [[0, -hz - wt / 2, hx * 2 + 2 * wt, wt], [0, hz + wt / 2, hx * 2 + 2 * wt, wt], [-hx - wt / 2, 0, wt, hz * 2], [hx + wt / 2, 0, wt, hz * 2]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, wh, bd), M(wc));
      m.position.set(x, wh / 2, z);
      w.add(m);
    }
    // kapılar
    this.doors = C.doors.map((d) => {
      const col = add(d.x, d.z, d.w, d.d, d.h, d.c);
      col.meshes.forEach((m) => (m.material.transparent = false));
      return { ...d, col, open: false };
    });
    // plakalar
    this.plates = C.plates.map((p) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 3), M('#ff4d5e'));
      m.position.set(p.x, 0.06, p.z);
      w.add(m);
      const ring = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 3.6), M('#ffffff'));
      ring.position.set(p.x, 0.04, p.z);
      w.add(ring);
      return { ...p, m, down: false };
    });
    // anahtarlar
    this.items = C.keys.map((k) => {
      const m = new THREE.Group();
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshBasicMaterial({ color: k.c }));
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 1.2), new THREE.MeshBasicMaterial({ color: k.c }));
      b.position.set(0, 0, 0.9);
      m.add(a, b);
      const lab = sprite(k.name, '#fff', 64, 384);
      lab.scale.set(4.2, 0.7, 1);
      lab.position.y = 1.7;
      m.add(lab);
      const y = (k.y || 0) + 1.2;
      m.position.set(k.x, y, k.z);
      w.add(m);
      return { ...k, y, mesh: m, got: false };
    });
    // çıkış bölgesi
    const ex = C.exit;
    const em = new THREE.Mesh(new THREE.BoxGeometry(ex.w, 0.2, ex.d), new THREE.MeshBasicMaterial({ color: 0x46c37b, transparent: true, opacity: 0.6 }));
    em.position.set(ex.x, 0.12, ex.z);
    w.add(em);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), new THREE.MeshBasicMaterial({ color: 0x46c37b }));
    post.position.set(ex.x, 3, ex.z);
    w.add(post);
    // gardiyanlar
    this.guards = (this.host ? C.guards : C.guards).map((g, i) => {
      const av = makeAvatar(0xd96a3a, 0x3a3f4f, '', '#fff');
      this.scene.add(av);
      const bang = sprite('!', '#ff4d5e', 96, 96);
      bang.scale.set(1.6, 1.6, 1);
      bang.position.y = 3.7;
      av.add(bang);
      bang.visible = false;
      // görüş konisi
      const pts = [0, 0.06, 0];
      const N = 14, half = 0.95, Rr = 13;
      for (let k = 0; k <= N; k++) {
        const a = -half + (2 * half * k) / N;
        pts.push(Math.sin(a) * Rr, 0.06, -Math.cos(a) * Rr);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const idx = [];
      for (let k = 1; k <= N; k++) idx.push(0, k, k + 1);
      geo.setIndex(idx);
      const cone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
      this.scene.add(cone);
      const start = g.path[0];
      return { id: i, path: g.path, pi: 1, pos: new THREE.Vector3(start[0], 0, start[1]), yaw: 0, mode: 0, wait: 0, tgt: null, lost: 0, look: new THREE.Vector3(), av, cone, bang, walk: 0, sp: 0, pause: 0 };
    });
    this.owned = new Set();
    this.t = 0;
    this.ph = 0;
    this.stones.forEach((s) => this.scene.remove(s.m));
    this.stones = [];
    for (const p of this.P) this.place(p);
    this.camYaw = C.spawnYaw;
    this.cb.onChapter?.(C);
  }
  place(p) {
    const s = this.C.spawns[p.id];
    p.pos.set(s[0], 0, s[1]);
    p.tp.copy(p.pos);
    p.vel.set(0, 0, 0);
    p.yaw = p.ty = this.C.spawnYaw;
    p.grounded = true;
    p.caught = 0;
  }
  go() {
    if (this.ph !== 0) return;
    if (this.host) {
      this.ph = 1;
      beep(500, 900, 0.2, 'triangle');
    } else this.net?.sendEvent({ k: 'go' });
  }
  nextChapter() {
    if (!this.host) return;
    if (this.ci + 1 < CHAPTERS.length) this.load(this.ci + 1);
  }
  restart() {
    if (this.host) this.load(this.ci);
  }

  // ---------- fizik ----------
  blocked(x, y, z) {
    if (Math.abs(x) > this.hx - R || Math.abs(z) > this.hz - R) return true;
    for (const b of this.cols) {
      if (b.off) continue;
      if (x > b.x0 - R && x < b.x1 + R && z > b.z0 - R && z < b.z1 + R && y + H > b.y0 && y < b.y1 - 0.34) return true;
    }
    return false;
  }
  groundAt(x, z, y) {
    let g = 0;
    for (const b of this.cols) {
      if (b.off) continue;
      if (x > b.x0 - 0.12 && x < b.x1 + 0.12 && z > b.z0 - 0.12 && z < b.z1 + 0.12 && b.y1 <= y + 0.38 && b.y1 > g) g = b.y1;
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
  visible(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1;
    for (const b of this.cols) {
      if (b.off) continue;
      const t = rayBox(ax, ay, az, dx / L, dy / L, dz / L, b, L);
      if (t !== null) return false;
    }
    return true;
  }

  // ---------- taş ----------
  simStone(o, v) {
    const pts = [];
    let x = o[0], y = o[1], z = o[2], vx = v[0], vy = v[1], vz = v[2];
    for (let i = 0; i < 90; i++) {
      pts.push([x, y, z]);
      vy -= 16 * 0.04;
      x += vx * 0.04;
      y += vy * 0.04;
      z += vz * 0.04;
      let hit = y <= 0.2;
      if (!hit) for (const b of this.cols) if (!b.off && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y > b.y0 && y < b.y1) hit = true;
      if (hit) {
        pts.push([x - vx * 0.04, Math.max(0.2, y - vy * 0.04), z - vz * 0.04]);
        break;
      }
    }
    return pts;
  }
  throwStone(p) {
    if (this.throwCd > 0 || p.caught > 0 || this.ph !== 1) return;
    this.throwCd = 1.2;
    const cp = Math.cos(this.camPitch), dir = [-Math.sin(this.camYaw) * cp, Math.max(0.15, -Math.sin(this.camPitch) + 0.45), -Math.cos(this.camYaw) * cp];
    const L = Math.hypot(...dir);
    const o = [p.pos.x, p.pos.y + 2.4, p.pos.z], v = dir.map((d) => (d / L) * 17);
    this.spawnStone(o, v, true);
    this.net?.sendEvent({ k: 'st', o, v });
    beep(300, 500, 0.08, 'triangle');
  }
  spawnStone(o, v, mine) {
    const pts = this.simStone(o, v);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xcfd6e0 }));
    this.scene.add(m);
    this.stones.push({ m, pts, t: 0, noise: this.host });
  }
  noise(x, z) {
    for (const g of this.guards) {
      if (g.mode === 1) continue;
      if (Math.hypot(g.pos.x - x, g.pos.z - z) < 24) {
        g.mode = 2;
        g.look.set(x, 0, z);
        g.wait = 4;
      }
    }
  }

  // ---------- ağ ----------
  onNet(s) {
    if (!s) return this.peerLeft();
    if (s.hi) return;
    if (this.host) {
      const p = this.P[1];
      p.tp.set(s.x, s.y, s.z);
      p.ty = s.r;
      p.sp = s.v;
    } else {
      if (s.ch == null) return;
      if (s.ch !== this.ci) this.load(s.ch);
      const p = this.P[0];
      p.tp.set(s.x, s.y, s.z);
      p.ty = s.r;
      p.sp = s.v;
      this.ph = s.ph;
      this.t = s.t;
      (s.g || []).forEach((g, i) => {
        const q = this.guards[i];
        if (!q) return;
        q.tp = q.tp || new THREE.Vector3();
        q.tp.set(g[0], 0, g[1]);
        q.ty = g[2];
        q.mode = g[3];
      });
      for (const id of s.keys || []) this.owned.add(id);
      for (const id of s.open || []) {
        const d = this.doors.find((x) => x.id === id);
        if (d && !d.open) this.openDoor(d, true);
      }
      this.plates.forEach((pl) => (pl.down = (s.pl || []).includes(pl.id)));
      const me = this.P[1];
      if (s.c) {
        if (me.caught <= 0 && s.c[1] > 0) {
          me.caught = s.c[1];
          beep(200, 80, 0.4, 'sawtooth');
        }
        if (s.c[1] <= 0) me.caught = 0;
        this.P[0].caught = s.c[0];
      }
      if (s.msg && s.msg !== this.lastMsg) this.say(s.msg);
      this.lastMsg = s.msg;
      if (s.rs) {
        if (this.rsId !== s.rs.id) {
          this.rsId = s.rs.id;
          if (s.rs.who === 1) this.place(me);
        }
      }
    }
  }
  onEvent(e) {
    if (!e) return;
    if (e.k === 'go' && this.host && this.ph === 0) this.go();
    else if (e.k === 'st') {
      this.spawnStone(e.o, e.v, false);
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
    const pkt = { x: +me.pos.x.toFixed(2), y: +me.pos.y.toFixed(2), z: +me.pos.z.toFixed(2), r: +me.yaw.toFixed(2), v: +me.sp.toFixed(1) };
    if (this.host) {
      pkt.ch = this.ci;
      pkt.ph = this.ph;
      pkt.t = +this.t.toFixed(1);
      pkt.g = this.guards.map((g) => [+g.pos.x.toFixed(2), +g.pos.z.toFixed(2), +g.yaw.toFixed(2), g.mode]);
      pkt.keys = [...this.owned];
      pkt.open = this.doors.filter((d) => d.open).map((d) => d.id);
      pkt.pl = this.plates.filter((p) => p.down).map((p) => p.id);
      pkt.c = [+this.P[0].caught.toFixed(1), +this.P[1].caught.toFixed(1)];
      pkt.msg = this.toast;
      if (this.rs) pkt.rs = this.rs;
    }
    this.net.sendState(pkt);
  }

  // ---------- oyun mantığı ----------
  say(t) {
    this.toast = t;
    this.toastT = 3.2;
  }
  openDoor(d, silent) {
    d.open = true;
    d.col.off = true;
    d.col.meshes.forEach((m) => (m.visible = false));
    if (!silent) beep(300, 700, 0.3, 'triangle');
  }
  free(p) {
    return p.caught <= 0;
  }
  logic(dt) {
    const [a, b] = this.P;
    this.t += dt;
    // anahtarlar
    for (const it of this.items) {
      if (it.got) continue;
      for (const p of this.P) {
        if (!this.free(p)) continue;
        if (Math.hypot(p.pos.x - it.x, p.pos.z - it.z) < 2.4 && Math.abs(p.pos.y + 1 - it.y) < 3) {
          it.got = true;
          this.owned.add(it.id);
          this.say(`${p.name}: ${it.name} alındı`);
          beep(700, 1200, 0.18, 'sine', 0.07);
        }
      }
    }
    // plakalar
    for (const pl of this.plates) pl.down = this.P.some((p) => this.free(p) && Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z) < 1.9 && p.pos.y < 1);
    // kapılar
    for (const d of this.doors) {
      if (d.open) continue;
      if (d.plates) {
        const grp = this.plates.filter((p) => p.g === d.plates);
        if (grp.length && grp.every((p) => p.down)) {
          this.openDoor(d);
          this.say('Kapı açıldı!');
        }
      } else if ((d.need || []).every((k) => this.owned.has(k))) {
        if (this.P.some((p) => this.free(p) && Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < Math.max(d.w, d.d) / 2 + 3)) {
          this.openDoor(d);
          this.say('Kapı açıldı!');
        }
      }
    }
    // yakalanan oyuncular
    for (const p of this.P) {
      if (p.caught > 0) {
        const o = this.P[1 - p.id];
        if (this.free(o) && Math.hypot(o.pos.x - p.pos.x, o.pos.z - p.pos.z) < 2.6) {
          p.caught = 0;
          this.say(`${o.name}, ${p.name}'i kurtardı!`);
          beep(600, 1000, 0.2, 'sine', 0.07);
          continue;
        }
        p.caught -= dt;
        if (p.caught <= 0) {
          p.caught = 0;
          this.place(p);
          this.rs = { id: (this.rs ? this.rs.id : 0) + 1, who: p.id };
          this.say(`${p.name} hücreye geri döndü`);
        }
      }
    }
    // çıkış
    const ex = this.C.exit;
    const inside = (p) => Math.abs(p.pos.x - ex.x) < ex.w / 2 + 0.6 && Math.abs(p.pos.z - ex.z) < ex.d / 2 + 0.6;
    if (inside(a) && inside(b) && this.free(a) && this.free(b)) {
      this.ph = 2;
      beep(500, 1000, 0.6, 'triangle', 0.08);
      this.cb.onEnd?.();
    }
  }
  updateGuard(g, dt) {
    const seen = [];
    for (const p of this.P) {
      if (!this.free(p)) continue;
      const dx = p.pos.x - g.pos.x, dz = p.pos.z - g.pos.z, d = Math.hypot(dx, dz);
      if (d > 13.5) continue;
      const want = Math.atan2(-dx, -dz);
      if (Math.abs(angDiff(g.yaw, want)) > 0.95) continue;
      if (!this.visible(g.pos.x, 2.6, g.pos.z, p.pos.x, p.pos.y + 1.6, p.pos.z)) continue;
      seen.push(p);
    }
    let tx = null, tz = null, speed = 2.9;
    if (seen.length) {
      seen.sort((u, v) => Math.hypot(u.pos.x - g.pos.x, u.pos.z - g.pos.z) - Math.hypot(v.pos.x - g.pos.x, v.pos.z - g.pos.z));
      if (g.mode !== 1) beep(900, 400, 0.25, 'sawtooth', 0.06);
      g.mode = 1;
      g.tgt = seen[0];
      g.lost = 0;
    }
    if (g.mode === 1) {
      speed = 5.4;
      if (!seen.length) {
        g.lost += dt;
        if (g.lost > 3) {
          g.mode = 2;
          g.look.copy(g.tgt.pos);
          g.wait = 3;
        }
      }
      if (g.tgt && this.free(g.tgt)) {
        tx = g.tgt.pos.x;
        tz = g.tgt.pos.z;
        if (Math.hypot(tx - g.pos.x, tz - g.pos.z) < 1.9 && Math.abs(g.tgt.pos.y - g.pos.y) < 2.5) {
          g.tgt.caught = CAUGHT;
          this.say(`${g.tgt.name} yakalandı! Arkadaşın kurtarabilir`);
          beep(200, 60, 0.5, 'sawtooth', 0.07);
          g.mode = 0;
          g.pause = 2.5;
          g.tgt = null;
        }
      } else if (g.mode === 1) {
        g.mode = 0;
        g.pause = 1.5;
      }
    } else if (g.mode === 2) {
      speed = 3.8;
      tx = g.look.x;
      tz = g.look.z;
      if (Math.hypot(tx - g.pos.x, tz - g.pos.z) < 1.5) {
        g.wait -= dt;
        tx = null;
        g.yaw += dt * 1.6;
        if (g.wait <= 0) g.mode = 0;
      }
    } else {
      if (g.pause > 0) {
        g.pause -= dt;
      } else {
        const wp = g.path[g.pi];
        tx = wp[0];
        tz = wp[1];
        if (Math.hypot(tx - g.pos.x, tz - g.pos.z) < 1.0) {
          g.pi = (g.pi + 1) % g.path.length;
          g.pause = 0.8;
        }
      }
    }
    g.sp = 0;
    if (tx !== null && g.pause <= 0) {
      const dx = tx - g.pos.x, dz = tz - g.pos.z, d = Math.hypot(dx, dz) || 1;
      const want = Math.atan2(-dx, -dz);
      g.yaw += Math.max(-6 * dt, Math.min(6 * dt, angDiff(g.yaw, want)));
      const step = Math.min(d, speed * dt);
      const fx = g.pos.x + (dx / d) * step, fz = g.pos.z + (dz / d) * step;
      if (!this.blocked(fx, 0, g.pos.z)) g.pos.x = fx;
      if (!this.blocked(g.pos.x, 0, fz)) g.pos.z = fz;
      g.sp = speed;
    }
  }
  updateBot(p, dt) {
    const o = this.P[0];
    if (p.caught > 0) {
      p.sp = 0;
      return;
    }
    let gx = o.pos.x - 3, gz = o.pos.z - 3, stand = false;
    // plaka eşleşmesi: lider bir plakaya yakınsa diğerine git
    const byG = {};
    for (const pl of this.plates) (byG[pl.g] = byG[pl.g] || []).push(pl);
    for (const grp of Object.values(byG)) {
      const door = this.doors.find((d) => d.plates === grp[0].g);
      if (door && door.open) continue;
      for (const pl of grp) {
        if (Math.hypot(o.pos.x - pl.x, o.pos.z - pl.z) < 9) {
          const other = grp.find((q) => q !== pl);
          if (other) {
            gx = other.x;
            gz = other.z;
            stand = Math.hypot(p.pos.x - gx, p.pos.z - gz) < 1.2;
          }
        }
      }
    }
    const dx = gx - p.pos.x, dz = gz - p.pos.z, d = Math.hypot(dx, dz);
    let vx = 0, vz = 0;
    if (!stand && d > (gx === o.pos.x - 3 ? 4.5 : 0.8)) {
      vx = (dx / d) * SPEED * 0.9;
      vz = (dz / d) * SPEED * 0.9;
      if (p.sd) {
        const s = Math.sin(p.stuck * 3);
        vx += -dz / d * s * 2;
        vz += dx / d * s * 2;
      }
    }
    const bx = p.pos.x, bz = p.pos.z;
    this.physics(p, vx, vz, dt, p.stuck > 0.5);
    const moved = Math.hypot(p.pos.x - bx, p.pos.z - bz);
    p.sp = moved / dt;
    if ((vx || vz) && moved < SPEED * dt * 0.2) p.stuck += dt;
    else p.stuck = 0;
    if (p.stuck > 1.2) p.stuck = 0;
    if (vx || vz) p.ty = Math.atan2(-vx, -vz);
  }
  updateMe(dt) {
    const p = this.P[this.me];
    if (p.caught > 0 || this.ph !== 1) {
      p.sp = 0;
      return;
    }
    const k = this.keys;
    let mx = this.mv.x, my = this.mv.y;
    if (k.KeyW || k.ArrowUp) my += 1;
    if (k.KeyS || k.ArrowDown) my -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    const L = Math.hypot(mx, my);
    if (L > 1) {
      mx /= L;
      my /= L;
    }
    const f = [-Math.sin(this.camYaw), -Math.cos(this.camYaw)], r = [Math.cos(this.camYaw), -Math.sin(this.camYaw)];
    const vx = (f[0] * my + r[0] * mx) * SPEED, vz = (f[1] * my + r[1] * mx) * SPEED;
    const bx = p.pos.x, bz = p.pos.z;
    this.physics(p, vx, vz, dt, k.Space || this.jumpReq);
    this.jumpReq = false;
    p.sp = Math.hypot(p.pos.x - bx, p.pos.z - bz) / dt;
    if (vx || vz) {
      const want = Math.atan2(-vx, -vz);
      p.yaw += angDiff(p.yaw, want) * Math.min(1, dt * 12);
    }
    if (this.throwReq) {
      this.throwReq = false;
      this.throwStone(p);
    }
  }
  step(dt) {
    if (!this.C) return;
    this.toastT -= dt;
    if (this.toastT <= 0) this.toast = '';
    if (this.throwCd > 0) this.throwCd -= dt;
    this.updateMe(dt);
    if (this.host) {
      if (this.ph === 1) {
        this.updateBotOrRemote(dt);
        for (const g of this.guards) this.updateGuard(g, dt);
        this.logic(dt);
      } else this.P[1].ctl === 'bot' && (this.P[1].sp = 0);
    } else if (this.ph === 1) this.t += dt;
    // görsel
    for (const p of this.P) {
      if (p.ctl === 'remote') {
        p.pos.lerp(p.tp, 1 - Math.exp(-dt * 14));
        p.yaw += angDiff(p.yaw, p.ty) * Math.min(1, dt * 14);
      } else if (p.ctl === 'bot') p.yaw += angDiff(p.yaw, p.ty) * Math.min(1, dt * 10);
      const a = p.av;
      a.position.copy(p.pos);
      a.rotation.y = p.yaw;
      const k = Math.min(p.sp / SPEED, 1);
      p.walk += dt * (4 + k * 8);
      const sw = Math.sin(p.walk) * 0.8 * k;
      a.userData.legL.rotation.x = sw;
      a.userData.legR.rotation.x = -sw;
      a.userData.armL.rotation.x = -sw * 0.8;
      a.userData.armR.rotation.x = sw * 0.8;
      a.userData.inner.rotation.x += ((p.caught > 0 ? 0.5 : 0) - a.userData.inner.rotation.x) * Math.min(1, dt * 8);
    }
    for (const g of this.guards) {
      if (!this.host && g.tp) {
        g.pos.lerp(g.tp, 1 - Math.exp(-dt * 14));
        g.yaw += angDiff(g.yaw, g.ty) * Math.min(1, dt * 14);
        g.sp = g.pos.distanceTo(g.tp) > 0.2 ? 4 : 0;
      }
      g.av.position.copy(g.pos);
      g.av.rotation.y = g.yaw;
      g.cone.position.set(g.pos.x, 0, g.pos.z);
      g.cone.rotation.y = g.yaw;
      g.cone.material.color.setHex(g.mode === 1 ? 0xff4d5e : g.mode === 2 ? 0xffa94d : 0xffe27a);
      g.bang.visible = g.mode === 1;
      const k = Math.min(g.sp / 5, 1);
      g.walk += dt * (4 + k * 8);
      g.av.userData.legL.rotation.x = Math.sin(g.walk) * 0.8 * k;
      g.av.userData.legR.rotation.x = -Math.sin(g.walk) * 0.8 * k;
    }
    for (const it of this.items) {
      it.mesh.visible = !it.got && !this.owned.has(it.id);
      it.mesh.rotation.y += dt * 2;
      it.mesh.position.y = it.y + Math.sin(this.t * 3 + it.x) * 0.15;
    }
    for (const pl of this.plates) pl.m.material.color.setHex(pl.down ? 0x46c37b : 0xff4d5e);
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s = this.stones[i];
      s.t += dt / 0.04;
      const j = Math.floor(s.t);
      if (j >= s.pts.length - 1) {
        const end = s.pts[s.pts.length - 1];
        this.scene.remove(s.m);
        this.stones.splice(i, 1);
        beep(160, 60, 0.15, 'square', 0.05);
        if (this.host) this.noise(end[0], end[2]);
        continue;
      }
      const a = s.pts[j], b = s.pts[j + 1], f = s.t - j;
      s.m.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
      s.m.rotation.x += dt * 8;
    }
    this.sendT += dt;
    if (this.sendT >= 0.066) {
      this.sendT = 0;
      this.sendState();
    }
    // kamera (omuz üstü, duvara çarpınca yaklaşır)
    const me = this.P[this.me];
    const head = [me.pos.x, me.pos.y + 3.0, me.pos.z];
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const dir = [Math.sin(this.camYaw) * cp, sp, Math.cos(this.camYaw) * cp];
    let dist = 8.5;
    for (const b of this.cols) {
      if (b.off) continue;
      const t = rayBox(head[0], head[1], head[2], dir[0], dir[1], dir[2], b, dist);
      if (t !== null && t < dist) dist = Math.max(1.5, t - 0.4);
    }
    this.camDist = this.camDist == null ? dist : this.camDist + (dist - this.camDist) * Math.min(1, dt * (dist < this.camDist ? 20 : 4));
    this.cam.position.set(head[0] + dir[0] * this.camDist, Math.max(0.6, head[1] + dir[1] * this.camDist), head[2] + dir[2] * this.camDist);
    this.cam.lookAt(head[0], head[1] - 0.4, head[2]);
  }
  updateBotOrRemote(dt) {
    const p = this.P[1];
    if (p.ctl === 'bot') this.updateBot(p, dt);
  }

  look(dx, dy) {
    this.camYaw -= dx * 0.0055;
    this.camPitch = Math.max(-0.2, Math.min(1.2, this.camPitch + dy * 0.0045));
  }
  setMove(x, y) {
    this.mv.x = x;
    this.mv.y = y;
  }
  jump() {
    this.jumpReq = true;
  }
  throwBtn() {
    this.throwReq = true;
  }

  hud() {
    const C = this.C || {};
    const me = this.P[this.me];
    const keyList = (C.keys || []).map((k) => ({ id: k.id, name: k.name, c: k.c, have: this.owned.has(k.id) }));
    const nPlates = this.plates ? this.plates.filter((p) => p.down).length : 0;
    return {
      ph: this.ph,
      ci: this.ci,
      title: C.title,
      goal: C.goal,
      intro: C.intro,
      outro: C.outro,
      last: !!C.last,
      t: this.t,
      keys: keyList,
      plates: this.plates ? [nPlates, this.plates.length] : [0, 0],
      toast: this.toast,
      caught: me.caught,
      partnerCaught: this.P[1 - this.me].caught,
      partner: this.P[1 - this.me].name,
      host: this.host,
      waiting: !this.C,
      left: this.left,
      stars: this.t <= (C.star3 || 1e9) ? 3 : this.t <= (C.star2 || 1e9) ? 2 : 1,
      throwCd: Math.max(0, this.throwCd),
      guardsAlert: this.guards ? this.guards.some((g) => g.mode === 1) : false,
    };
  }
  resize() {
    const w = this.cv.clientWidth || 800, h = this.cv.clientHeight || 450;
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.fov = w / h < 1 ? 85 : 70;
    this.cam.updateProjectionMatrix();
  }
  loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.r.render(this.scene, this.cam);
    this.hudT += dt;
    if (this.hudT > 0.1) {
      this.hudT = 0;
      this.cb.onHud?.(this.hud());
    }
    this.raf = requestAnimationFrame(() => this.loop());
  }
  advance(n, dt = 1 / 30) {
    for (let i = 0; i < n; i++) this.step(dt);
    this.cb.onHud?.(this.hud());
  }
  render() {
    this.r.render(this.scene, this.cam);
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('pointerlockchange', this.onLock);
    this.cv.removeEventListener('mousedown', this.onMouseDown);
    if (document.pointerLockElement === this.cv) document.exitPointerLock?.();
    try {
      this.net?.leave?.();
    } catch {}
    this.r.dispose();
  }
}
