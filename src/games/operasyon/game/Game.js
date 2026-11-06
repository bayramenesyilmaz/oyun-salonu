import * as THREE from 'three';
import { buildWorld, makeHeli } from './world.js';
import { buildVillage } from './world_village.js';
import { makeSoldier, animSoldier, makeCivilian, setSit, animCivilian, nameSprite, enemyMarker, ROLES } from './chars.js';
import { WEAPONS, makeViewmodel } from './weapons.js';
import * as S from './sfx.js';
import { coop } from './coop.js';

// Operasyon Kurtarma — tek harita, tek görev: 3 rehineyi kurtar, helikoptere ulaş.
// Dünya birimi metre. Ön yön: yaw=0 → −Z (kuzey). Bot takım arkadaşları + düşman botlar.
const R = 0.38, H = 1.78, G = 20, JUMP = 6.4;
const EYE = 1.62, EYE_C = 1.1, SENS = 0.0022;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const FRIENDS = ['Kaan', 'Bora', 'Efe'];
const r2 = (v) => Math.round(v * 100) / 100;

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

export class Game {
  constructor(canvas, cfg = {}) {
    this.cv = canvas;
    this.net = null;
    this.cfg = cfg;
    this.cb = cfg.cb || {};
    this.touch = !!cfg.touch;
    this.mode = 'menu';
    this.paused = false;
    this.locked = false;
    this.keys = {};
    this.mv = { x: 0, y: 0 };
    this.fireHeld = false;
    this.adsHeld = false;
    this.adsToggle = false;
    this.interactHeld = false;
    this.last = performance.now();
    this.t = 0;
    this.hudT = 0;
    this.fps = 60;
    this.tracers = [];
    this.parts = [];
    this.nades = [];
    this.fx = [];
    this.enemies = [];
    this.friends = [];
    this.hostages = [];
    this.dmgDirs = [];
    this.hitId = 0;
    this.orbit = 0;

    this.r = new THREE.WebGLRenderer({ canvas, antialias: !this.touch, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch ? 1.5 : 2));
    this.r.autoClear = false;
    this.r.shadowMap.enabled = !this.touch;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xa07a92, 38, 250);
    this.cam = new THREE.PerspectiveCamera(78, 16 / 9, 0.08, 700);
    this.cam.rotation.order = 'YXZ';
    this.scene.add(this.cam);
    this.hemi = new THREE.HemisphereLight(0x9a96e0, 0x5a4636, 1.55);
    this.scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight(0xff9a58, 1.9));
    sun.castShadow = !this.touch;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -38;
    sc.right = sc.top = 38;
    sc.near = 10;
    sc.far = 260;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.05;
    this.scene.add(sun, sun.target);
    this.muzzleLight = new THREE.PointLight(0xffc070, 0, 14, 2);
    this.scene.add(this.muzzleLight);

    this.loadMap('tesis');
    this.heli = makeHeli();
    this.scene.add(this.heli);
    this.heliState = 'circle';
    this.heliAng = 1.2;
    this.heliT = 0;

    // birinci şahıs modelleri ayrı sahnede (duvarın içine girmesin)
    this.vmScene = new THREE.Scene();
    this.vmCam = new THREE.PerspectiveCamera(58, 16 / 9, 0.02, 10);
    this.vmScene.add(this.vmCam);
    this.vmScene.add(new THREE.HemisphereLight(0xc8c4ff, 0x8a6a52, 3.2));
    const vs = new THREE.DirectionalLight(0xffc090, 3.0);
    vs.position.set(-2, 3, 2);
    this.vmScene.add(vs);
    this.vms = {};
    this.flashTex = null;

    this.pl = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, grounded: true, hp: 100, maxHp: 100, crouchK: 0, ads: 0, bob: 0, stepT: 0, recoil: 0, hurt: 0, heal: 0, dead: false };
    this.bindInput();
    this.resize();
    this.world.update(0, 0);
    this.raf = requestAnimationFrame(() => this.loop());
  }

  loadMap(id) {
    if (this.world && this.world.id === id) return;
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.group.traverse((o) => o.geometry && o.geometry.dispose());
    }
    this.world = id === 'koy' ? buildVillage(this.scene) : buildWorld(this.scene, { touch: this.touch });
    const W = this.world;
    this.colliders = W.colliders;
    this.mapRects = W.rects.map((c) => [c.x0, c.z0, c.x1, c.z1]);
    this.sunDir = W.SUN.clone();
    this.scene.fog.color.setHex(W.fog.color);
    this.scene.fog.near = W.fog.near;
    this.scene.fog.far = W.fog.far;
    this.hemi.color.setHex(W.hemi.sky);
    this.hemi.groundColor.setHex(W.hemi.ground);
    this.hemi.intensity = W.hemi.k;
    this.sun.color.setHex(W.sunCfg.color);
    this.sun.intensity = W.sunCfg.k;
    this.heliAng = 1.2;
    W.update(0, 0);
  }

  // ---------------- giriş ----------------
  bindInput() {
    this.onKeyDown = (e) => {
      if (this.mode !== 'play') return;
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (e.code === 'KeyR') this.doReload();
      if (e.code === 'Digit1') this.setSlot(0);
      if (e.code === 'Digit2') this.setSlot(1);
      if (e.code === 'KeyQ') this.throwNade();
      if (e.code === 'KeyG') this.useMed();
      if (e.code === 'KeyF') this.useDrone();
      if (e.code === 'KeyE') this.interactHeld = true;
      if (e.code === 'KeyC') this.crouchToggle = !this.crouchToggle;
      if (e.code === 'Space') e.preventDefault();
    };
    this.onKeyUp = (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyE') this.interactHeld = false;
    };
    this.onMouseMove = (e) => {
      if (!this.locked || this.paused) return;
      this.yawPitch(-e.movementX * SENS * (this.cfg.sens || 1), -e.movementY * SENS * (this.cfg.sens || 1));
    };
    this.onMouseDown = (e) => {
      if (this.mode !== 'play') return;
      if (!this.locked && !this.touch) {
        this.cv.requestPointerLock?.();
        return;
      }
      if (e.button === 0) this.fireHeld = true;
      if (e.button === 2) this.adsHeld = true;
    };
    this.onMouseUp = (e) => {
      if (e.button === 0) this.fireHeld = false;
      if (e.button === 2) this.adsHeld = false;
    };
    this.onCtx = (e) => e.preventDefault();
    this.onLock = () => {
      this.locked = document.pointerLockElement === this.cv;
      if (!this.locked) {
        this.fireHeld = false;
        this.adsHeld = false;
        this.interactHeld = false;
      }
      this.cb.onLock?.(this.locked);
    };
    this.onWheel = (e) => this.mode === 'play' && this.setSlot(this.slot ? 0 : 1);
    this.onResize = () => this.resize();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.cv.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    this.cv.addEventListener('contextmenu', this.onCtx);
    document.addEventListener('pointerlockchange', this.onLock);
    window.addEventListener('wheel', this.onWheel);
    window.addEventListener('resize', this.onResize);
  }
  yawPitch(dy, dp) {
    const p = this.pl;
    const k = 1 - p.ads * 0.55;
    p.yaw += dy * k;
    p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch + dp * k));
  }
  look(dx, dy) {
    if (this.paused || this.mode !== 'play') return;
    this.yawPitch(-dx * 0.0042 * (this.cfg.sens || 1), -dy * 0.0042 * (this.cfg.sens || 1));
  }
  setMove(x, y) {
    this.mv.x = x;
    this.mv.y = y;
  }
  setFire(v) {
    this.fireHeld = v;
  }
  setInteract(v) {
    this.interactHeld = v;
  }
  jump() {
    this.jumpReq = true;
  }
  toggleAds() {
    this.adsToggle = !this.adsToggle;
  }
  toggleCrouch() {
    this.crouchToggle = !this.crouchToggle;
  }
  setPaused(v) {
    if (this.net) v = false;
    this.paused = v;
    if (v) {
      this.fireHeld = false;
      this.interactHeld = false;
      S.heliSet(0);
    }
  }

  // ---------------- görev başlatma ----------------
  clearEntities() {
    for (const a of [...this.enemies, ...this.friends]) this.scene.remove(a.g);
    for (const h of this.hostages) this.scene.remove(h.g);
    for (const t of this.tracers) this.scene.remove(t.m);
    for (const p of this.parts) this.scene.remove(p.m);
    for (const n of this.nades) this.scene.remove(n.m);
    for (const f of this.fx) this.scene.remove(f.m);
    this.enemies = [];
    this.friends = [];
    this.hostages = [];
    this.tracers = [];
    this.parts = [];
    this.nades = [];
    this.fx = [];
  }
  toMenu() {
    this.mode = 'menu';
    this.netDetach();
    this.clearEntities();
    for (const k in this.vms) this.vms[k].visible = false;
    S.silence();
    if (document.pointerLockElement === this.cv) document.exitPointerLock?.();
    this.heliState = 'circle';
    this.heli.userData.lampM.visible = true;
  }
  start({ role = 'komando', weapon = 'm4', nick = 'Enes', map, net } = {}) {
    if (map) this.loadMap(map);
    this.netDetach();
    this.clearEntities();
    S.unlock();
    const L = ROLES[role] || ROLES.komando;
    this.role = L;
    this.nick = nick;
    this.mode = 'play';
    this.phase = 'play';
    this.paused = false;
    this.elapsed = 0;
    this.kills = 0;
    this.rescued = 0;
    this.entered = false;
    this.evacReady = false;
    this.evacT = 0;
    this.evacHold = 0;
    this.hits = 0;
    this.shots = 0;
    this.heliState = 'circle';
    this.heliT = 0;
    this.revealT = 0;
    this.crouchToggle = false;
    this.toastQ = [];
    const p = this.pl;
    let spawnX = this.world.spawn.x;
    if (net) {
      const uids = Object.keys(net.room.players).sort();
      spawnX += (uids.indexOf(net.room.uid) - (uids.length - 1) / 2) * 1.8;
    }
    p.pos.set(spawnX, 0, this.world.spawn.z);
    p.vel.set(0, 0, 0);
    p.yaw = 0;
    p.pitch = 0;
    p.hp = p.maxHp = L.hp;
    p.dead = false;
    p.crouchK = 0;
    p.ads = 0;
    p.hurt = 0;
    p.heal = 0;
    p.grounded = true;
    this.speedMul = L.speed;
    this.gear = { nade: 3, med: L.med, drone: L.drone };
    this.slots = [WEAPONS[weapon] || WEAPONS.m4, WEAPONS.pistol];
    this.ammo = this.slots.map((w) => ({ mag: w.mag, reserve: w.reserve }));
    this.slot = 0;
    this.swapT = 0.4;
    this.reloadT = 0;
    this.fireCd = 0;
    this.kickZ = 0;
    this.adsToggle = false;
    this.showVm();
    // takım arkadaşları: oyuncunun dışındaki 3 rol
    const roles = net ? net.bots || [] : Object.keys(ROLES).filter((r) => r !== role);
    this.friends = (net ? roles : FRIENDS).map((name0, i) => {
      const name = FRIENDS[i];
      const g = makeSoldier(roles[i], false);
      const tag = nameSprite(name);
      tag.position.y = 2.55;
      g.add(tag);
      const x = [-2.4, 2.4, 0][i], z = this.world.spawn.z + [3.5, 3.9, 5.5][i];
      g.position.set(x, 0, z);
      this.scene.add(g);
      return { kind: 'friend', name, role: roles[i], g, pos: g.position, vel: new THREE.Vector3(), yaw: 0, hp: 100, maxHp: 100, dead: false, grounded: true, slot: i, cool: 0, burst: 0, react: 0, tgt: null, speed: 0, stuck: 0, strafe: 1, strafeT: 0, tag, seenT: 0 };
    });
    this.enemies = this.world.enemySpots.map((s) => {
      const g = makeSoldier('x', true);
      g.position.set(s.x, s.y, s.z);
      const mk = enemyMarker();
      mk.position.y = 2.45;
      mk.visible = false;
      g.add(mk);
      this.scene.add(g);
      const wp = (s.patrol || []).map(([x, z]) => new THREE.Vector3(x, s.y, z));
      return { kind: 'enemy', type: s.type, id: s.id, g, pos: g.position, vel: new THREE.Vector3(), yaw: s.type === 'sniper' ? 0 : rnd(0, TAU), hp: s.type === 'sniper' ? 70 : 60, dead: false, grounded: true, state: 'idle', cool: 0, burst: 0, react: 0, seen: 0, tgt: null, last: new THREE.Vector3(), wp, wi: 0, wait: rnd(0, 2), speed: 0, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 0, searchT: 0, marker: mk, base: new THREE.Vector3(s.x, s.y, s.z), stuck: 0, aimT: 0, visT: 0 };
    });
    this.totalEnemies = this.enemies.length;
    this.hostages = this.world.hostageSpots.map((s, i) => {
      const g = makeCivilian(i);
      g.position.set(s.x, 0, s.z);
      g.rotation.y = s.yaw;
      this.scene.add(g);
      return { g, pos: g.position, yaw: s.yaw, state: 'bound', prog: 0, vel: new THREE.Vector3(), grounded: true, speed: 0, stuck: 0 };
    });
    for (const pk of this.world.pickups) {
      pk.taken = false;
      pk.mesh.visible = true;
    }
    this.say(this.world.objText.start1, 1);
    this.say(this.world.objText.start2, 6);
    if (net) this.netAttach(net);
    this.cb.onStart?.();
  }
  say(text, delay = 0, bc = false) {
    if (bc && this.net?.host) this.netSend({ k: 'say', t: text });
    this.toastQ.push({ text, at: this.t + delay });
  }
  showVm() {
    for (const k in this.vms) this.vms[k].visible = false;
    const w = this.slots[this.slot];
    if (!this.vms[w.id]) {
      const v = makeViewmodel(w.id);
      this.vmScene.add(v);
      // namlu parlaması
      const tex = this.flashTex || (this.flashTex = (() => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 64;
        const c = cv.getContext('2d');
        const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,250,210,1)');
        g.addColorStop(0.3, 'rgba(255,190,80,.9)');
        g.addColorStop(1, 'rgba(255,120,30,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(cv);
      })());
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      fl.scale.set(0.45, 0.45, 1);
      fl.visible = false;
      v.userData.muzzle.add(fl);
      v.userData.flash = fl;
      this.vms[w.id] = v;
    }
    this.vm = this.vms[w.id];
    this.vm.visible = true;
  }
  setSlot(i) {
    if (i === this.slot || this.swapT > 0 || this.phase !== 'play') return;
    this.slot = i;
    this.swapT = 0.35;
    this.reloadT = 0;
    this.showVm();
    S.pin();
  }

  // ---------------- fizik / görüş ----------------
  blocked(x, y, z) {
    if (Math.abs(x) > this.world.bound.x - R || z < this.world.bound.z0 + R || z > this.world.bound.z1 - R) return true;
    for (const b of this.colliders) {
      if (x > b.x0 - R && x < b.x1 + R && z > b.z0 - R && z < b.z1 + R && y + H > b.y0 && y < b.y1 - 0.32) return true;
    }
    return false;
  }
  groundAt(x, z, y) {
    let g = 0;
    for (const b of this.colliders) {
      if (x > b.x0 - 0.1 && x < b.x1 + 0.1 && z > b.z0 - 0.1 && z < b.z1 + 0.1 && b.y1 <= y + 0.36 && b.y1 > g) g = b.y1;
    }
    return g;
  }
  physics(a, vx, vz, dt, jump) {
    const nx = a.pos.x + vx * dt;
    let moved = false;
    if (!this.blocked(nx, a.pos.y, a.pos.z)) {
      a.pos.x = nx;
      moved = true;
    }
    const nz = a.pos.z + vz * dt;
    if (!this.blocked(a.pos.x, a.pos.y, nz)) {
      a.pos.z = nz;
      moved = true;
    }
    const gh = this.groundAt(a.pos.x, a.pos.z, a.pos.y);
    if (a.grounded && jump) {
      a.vel.y = JUMP;
      a.grounded = false;
    }
    if (!a.grounded || a.pos.y > gh + 0.001) {
      a.vel.y -= G * dt;
      a.pos.y += a.vel.y * dt;
      a.grounded = false;
    }
    if (a.pos.y <= gh) {
      a.pos.y = gh;
      a.vel.y = 0;
      a.grounded = true;
    }
    return moved;
  }
  visible(fx, fy, fz, tx, ty, tz) {
    const dx = tx - fx, dy = ty - fy, dz = tz - fz;
    const Ln = Math.hypot(dx, dy, dz) || 1;
    const d = [dx / Ln, dy / Ln, dz / Ln];
    for (const b of this.colliders) {
      if (b.y1 - b.y0 < 0.3) continue;
      if (rayBox(fx, fy, fz, d[0], d[1], d[2], b, Ln)) return false;
    }
    return true;
  }
  // ışın: duvarlar + hedef aktörler. targets: [{pos, dead, ...}]
  trace(ox, oy, oz, d, maxT, targets) {
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
    for (const a of targets) {
      if (a.dead) continue;
      const p = a.pos;
      const head = raySphere(ox, oy, oz, d[0], d[1], d[2], p.x, p.y + (a === this.pl ? EYE : 1.66), p.z, 0.23, wallT);
      const chest = raySphere(ox, oy, oz, d[0], d[1], d[2], p.x, p.y + 1.18, p.z, 0.42, wallT);
      const legs = raySphere(ox, oy, oz, d[0], d[1], d[2], p.x, p.y + 0.52, p.z, 0.4, wallT);
      let t = -1, isHead = false;
      for (const [v, h] of [[head, true], [chest, false], [legs, false]]) if (v >= 0 && (t < 0 || v < t)) {
        t = v;
        isHead = h;
      }
      if (t >= 0 && t < best.t) best = { t, kind: 'actor', who: a, head: isHead, n: [-d[0], -d[1], -d[2]] };
    }
    return best;
  }

  // ---------------- efektler ----------------
  dirOf(yaw, pitch) {
    const cp = Math.cos(pitch);
    return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
  }
  tracer(a, b, color = 0xffd890, dur = 0.07) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.5 || this.tracers.length > 40) return;
    const m = new THREE.Mesh(this.tg || (this.tg = new THREE.BoxGeometry(0.03, 0.03, 1)), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.scale.z = len;
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    m.lookAt(b[0], b[1], b[2]);
    this.scene.add(m);
    this.tracers.push({ m, t: dur, dur });
  }
  sparks(pt, n, color = 0xffd070, sp = 3, up = 2) {
    if (this.parts.length > 140) return;
    const geo = this.pgeo || (this.pgeo = new THREE.BoxGeometry(0.06, 0.06, 0.06));
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
      m.position.set(pt[0], pt[1], pt[2]);
      this.scene.add(m);
      this.parts.push({ m, vel: new THREE.Vector3(rnd(-sp, sp), rnd(0.5, up + 1), rnd(-sp, sp)), life: rnd(0.25, 0.6) });
    }
  }
  noise(pos, radius) {
    for (const e of this.enemies) {
      if (e.dead || e.state === 'combat') continue;
      if (Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z) < radius) {
        e.state = 'search';
        e.last.copy(pos);
        e.searchT = 9;
      }
    }
  }
  muzzleWorld(out) {
    this.vm.updateMatrixWorld(true);
    this.vm.userData.muzzle.getWorldPosition(out);
    out.applyQuaternion(this.cam.quaternion).add(this.cam.position);
    return out;
  }

  // ---------------- oyuncu ----------------
  eyeH() {
    return EYE + (EYE_C - EYE) * this.pl.crouchK;
  }
  doReload() {
    if (this.phase !== 'play' || this.reloadT > 0) return;
    const w = this.slots[this.slot], am = this.ammo[this.slot];
    if (am.mag >= w.mag || am.reserve <= 0) return;
    this.reloadT = w.id === 'pistol' ? 1.3 : w.id === 'awp' ? 2.6 : 1.9;
    this.reloadDur = this.reloadT;
    S.reload();
  }
  firePlayer() {
    const w = this.slots[this.slot], am = this.ammo[this.slot], p = this.pl;
    am.mag--;
    this.fireCd = w.rate;
    this.shots++;
    const moving = Math.hypot(p.vel.x, p.vel.z) > 1;
    const spr = w.spread * (1 - p.ads * 0.7) * (moving ? 1.7 : 1) * (p.grounded ? 1 : 2.6) * (p.crouchK > 0.5 ? 0.7 : 1) + p.recoil * 0.25;
    const yaw = p.yaw + rnd(-spr, spr), pitch = p.pitch + rnd(-spr, spr);
    const d = this.dirOf(yaw, pitch);
    const ox = p.pos.x, oy = p.pos.y + this.eyeH(), oz = p.pos.z;
    const hit = this.trace(ox, oy, oz, d, w.range, this.enemies);
    const pt = [ox + d[0] * hit.t, oy + d[1] * hit.t, oz + d[2] * hit.t];
    const mz = this.muzzleWorld(new THREE.Vector3());
    this.tracer([mz.x, mz.y, mz.z], pt, 0xffe0a0, 0.06);
    if (this.net) this.netSend({ k: 'f', o: [r2(ox + d[0] * 0.8), r2(oy - 0.25), r2(oz + d[2] * 0.8)], p: [r2(pt[0]), r2(pt[1]), r2(pt[2])], w: w.snd });
    if (hit.kind === 'actor') {
      this.hits++;
      const dmg = w.dmg * (hit.head ? 2.2 : 1) * (1 - Math.min(0.4, hit.t / w.range * 0.4));
      this.hurtEnemy(hit.who, dmg, hit.head, true);
    } else if (hit.kind === 'wall') this.sparks(pt, 5, 0xffd070, 2.5);
    // geri tepme
    p.recoil = Math.min(0.12, p.recoil + w.kick * (1 - p.ads * 0.4));
    p.pitch += w.kick * (1 - p.ads * 0.35);
    p.yaw += rnd(-1, 1) * w.kick * 0.5;
    this.kickZ = Math.min(0.12, this.kickZ + (w.id === 'awp' ? 0.12 : 0.05));
    const fl = this.vm.userData.flash;
    fl.visible = true;
    fl.material.rotation = rnd(0, 6);
    this.flashT = 0.05;
    this.muzzleLight.intensity = 38;
    this.muzzleLight.position.copy(mz);
    this.muzzleLightT = 0.05;
    S.shot(w.snd);
    this.noise(p.pos, w.id === 'pistol' ? 38 : 60);
    if (w.id === 'awp') this.shake = Math.max(this.shake || 0, 0.25);
    if (am.mag <= 0 && am.reserve > 0) this.doReload();
  }
  hurtEnemy(e, dmg, head, byPlayer, src) {
    if (e.dead) return;
    if (this.isGuest()) {
      // kurucu olmayan: hasarı kuruculuya bildir, geri bildirimi tahmin et
      this.netSend({ k: 'hit', i: this.enemies.indexOf(e), d: Math.round(dmg * 10) / 10, h: head ? 1 : 0 });
      e.hp -= dmg;
      this.hitId++;
      this.hitInfo = { id: this.hitId, kill: e.hp <= 0, head };
      S.hit(e.hp <= 0);
      return;
    }
    e.hp -= dmg;
    this.hitId++;
    const kill = e.hp <= 0;
    if (byPlayer) {
      this.hitInfo = { id: this.hitId, kill, head };
      S.hit(kill);
    }
    if (kill) {
      e.dead = true;
      e.marker.visible = false;
      this.kills++;
      if (this.kills === this.totalEnemies) this.say('Merkez: Tesis temiz. Rehinelere odaklan.', 0.5, true);
    } else if (e.state !== 'combat') {
      e.state = 'search';
      e.last.copy(src || this.pl.pos);
      e.searchT = 8;
    }
  }
  hurtPlayer(dmg, src) {
    const p = this.pl;
    if (p.dead || this.phase !== 'play') return;
    p.hp = Math.max(0, p.hp - dmg);
    p.hurt = Math.min(1, p.hurt + 0.45);
    S.hurt();
    if (src) {
      const rel = angDiff(p.yaw, Math.atan2(-(src.x - p.pos.x), -(src.z - p.pos.z)));
      this.dmgDirs.push({ id: ++this.hitId, rel, t: 1.2 });
    }
    if (p.hp <= 0) {
      p.dead = true;
      if (!this.net) this.endMission(false);
      else this.say('Yere düştün! Takım arkadaşların görevi sürdürüyor.', 0);
    }
  }
  throwNade() {
    if (this.phase !== 'play' || this.gear.nade <= 0 || this.nadeCd > 0) return;
    this.gear.nade--;
    this.nadeCd = 0.9;
    S.pin();
    const p = this.pl, d = this.dirOf(p.yaw, p.pitch + 0.12);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshLambertMaterial({ color: 0x3d4a2a, flatShading: true }));
    m.position.set(p.pos.x + d[0] * 0.6, p.pos.y + this.eyeH() - 0.2, p.pos.z + d[2] * 0.6);
    this.scene.add(m);
    const nv = new THREE.Vector3(d[0] * 15, d[1] * 15 + 2.5, d[2] * 15);
    this.nades.push({ m, vel: nv, t: 2.0 });
    if (this.net) this.netSend({ k: 'n', p: [r2(m.position.x), r2(m.position.y), r2(m.position.z)], v: [r2(nv.x), r2(nv.y), r2(nv.z)] });
  }
  pointBlocked(x, y, z) {
    for (const b of this.colliders) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y > b.y0 && y < b.y1) return b;
    return null;
  }
  updateNades(dt) {
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i], p = n.m.position, v = n.vel;
      n.t -= dt;
      v.y -= G * dt;
      const nx = p.x + v.x * dt;
      if (this.pointBlocked(nx, p.y, p.z) || Math.abs(nx) > this.world.bound.x) v.x *= -0.45;
      else p.x = nx;
      const nz = p.z + v.z * dt;
      if (this.pointBlocked(p.x, p.y, nz) || nz < this.world.bound.z0 || nz > this.world.bound.z1) v.z *= -0.45;
      else p.z = nz;
      const ny = p.y + v.y * dt;
      const top = this.pointBlocked(p.x, ny, p.z);
      const floor = top ? top.y1 + 0.11 : 0.11;
      if (ny < floor) {
        p.y = floor;
        v.y = Math.abs(v.y) > 2 ? -v.y * 0.4 : 0;
        v.x *= 0.7;
        v.z *= 0.7;
      } else p.y = ny;
      n.m.rotation.x += dt * 8;
      if (n.t <= 0) {
        this.explode(p, n.remote);
        this.scene.remove(n.m);
        this.nades.splice(i, 1);
      }
    }
  }
  explode(pos, remote) {
    S.boom();
    const simHost = !this.isGuest();
    const R2 = 7.5;
    const hitAct = (a, k, isPlayer) => {
      const c = isPlayer ? [a.pos.x, a.pos.y + 1.2, a.pos.z] : [a.pos.x, a.pos.y + 1.1, a.pos.z];
      const d = Math.hypot(c[0] - pos.x, c[1] - pos.y, c[2] - pos.z);
      if (d > R2 || !this.visible(pos.x, pos.y + 0.3, pos.z, c[0], c[1], c[2])) return;
      const dmg = 170 * (1 - d / R2) * k;
      if (isPlayer) this.hurtPlayer(dmg * 0.5, pos);
      else if (a.kind === 'enemy') this.hurtEnemy(a, dmg, false, !remote, pos);
      else this.hurtFriend(a, dmg * 0.4, pos);
    };
    if (simHost) {
      for (const e of this.enemies) if (!e.dead) hitAct(e, 1, false);
      for (const f of this.friends) if (!f.dead) hitAct(f, 1, false);
    }
    if (!this.pl.dead && !remote) hitAct(this.pl, 1, true);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    ball.position.copy(pos);
    this.scene.add(ball);
    this.fx.push({ m: ball, t: 0.45, dur: 0.45, kind: 'boom' });
    this.sparks([pos.x, pos.y, pos.z], 26, 0xffb040, 7, 6);
    this.muzzleLight.position.copy(pos);
    this.muzzleLight.intensity = 400;
    this.muzzleLightT = 0.12;
    const dc = Math.hypot(pos.x - this.pl.pos.x, pos.z - this.pl.pos.z);
    this.shake = Math.max(this.shake || 0, Math.max(0, 0.7 - dc / 30));
    this.noise(pos, 60);
  }
  useMed() {
    const p = this.pl;
    if (this.phase !== 'play' || this.gear.med <= 0 || p.hp >= p.maxHp || p.heal > 0) return;
    this.gear.med--;
    p.heal = 45;
    S.ding();
  }
  useDrone() {
    if (this.phase !== 'play' || this.gear.drone <= 0 || this.revealT > 0) return;
    this.gear.drone--;
    this.revealT = 14;
    this.say('Dron havada: düşman konumları işaretlendi.', 0);
    S.radio();
  }
  hurtFriend(f, dmg, src) {
    if (f.dead) return;
    f.hp -= dmg;
    if (f.hp <= 0) {
      f.dead = true;
      f.tag.visible = false;
      this.say(`${f.name} düştü!`, 0, true);
      S.hurt();
    }
  }

  updatePlayer(dt) {
    const p = this.pl, k = this.keys;
    // bakış tuşları (yedek)
    const wantC = this.crouchToggle || k.ControlLeft;
    p.crouchK += ((wantC ? 1 : 0) - p.crouchK) * Math.min(1, dt * 12);
    let mx = this.mv.x, my = this.mv.y;
    if (k.KeyW || k.ArrowUp) my += 1;
    if (k.KeyS || k.ArrowDown) my -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    const ml = Math.hypot(mx, my);
    if (ml > 1) {
      mx /= ml;
      my /= ml;
    }
    const sprint = (k.ShiftLeft || k.ShiftRight || (this.touch && ml > 0.93)) && my > 0.3 && p.ads < 0.3 && p.crouchK < 0.3;
    let sp = (sprint ? 7.4 : 5.0) * this.speedMul * (1 - p.crouchK * 0.5) * (1 - p.ads * 0.35);
    if (p.dead) sp = 0;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const tvx = (fx * my + rx * mx) * sp, tvz = (fz * my + rz * mx) * sp;
    const a = Math.min(1, dt * (p.grounded ? 14 : 3));
    p.vel.x += (tvx - p.vel.x) * a;
    p.vel.z += (tvz - p.vel.z) * a;
    const jump = (k.Space || this.jumpReq) && p.crouchK < 0.4;
    this.jumpReq = false;
    this.physics(p, p.vel.x, p.vel.z, dt, jump);
    const spd = Math.hypot(p.vel.x, p.vel.z);
    if (p.grounded && spd > 1) {
      p.bob += dt * spd * 1.6;
      p.stepT -= dt * spd;
      if (p.stepT <= 0) {
        p.stepT = 2.3;
        S.step(sprint ? 1 : 0.6);
      }
    }
    p.ads += ((this.adsHeld || this.adsToggle ? 1 : 0) - p.ads) * Math.min(1, dt * 11);
    if (this.reloadT > 0 || sprint) {
      if (sprint) p.ads *= 0.7;
    }
    p.recoil *= Math.max(0, 1 - dt * 7);
    p.hurt = Math.max(0, p.hurt - dt * 0.9);
    if (p.heal > 0) {
      const h = Math.min(p.heal, dt * 18);
      p.heal -= h;
      p.hp = Math.min(p.maxHp, p.hp + h);
    }
    // silah akışı
    this.fireCd -= dt;
    this.swapT = Math.max(0, this.swapT - dt);
    this.nadeCd = Math.max(0, (this.nadeCd || 0) - dt);
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const w = this.slots[this.slot], am = this.ammo[this.slot];
        const take = Math.min(w.mag - am.mag, am.reserve);
        am.mag += take;
        am.reserve -= take;
      }
    }
    const w = this.slots[this.slot], am = this.ammo[this.slot];
    if (!this.fireHeld) this.semiReady = true;
    if (this.fireHeld && !p.dead && this.fireCd <= 0 && this.reloadT <= 0 && this.swapT <= 0 && !sprint && (w.auto || this.semiReady)) {
      if (am.mag > 0) {
        this.semiReady = false;
        this.firePlayer();
      } else this.doReload();
    }
    // sınır ve sızma
    if (!this.entered && this.world.gate.test(p.pos)) {
      this.entered = true;
      S.ding();
      this.say('Merkez: İçerdesin. Rehineleri bul.', 0.4);
    }
    // toplanabilir malzemeler
    for (const pk of this.world.pickups) {
      if (pk.taken) continue;
      pk.mesh.rotation.y += dt * 1.5;
      pk.mesh.position.y = 0.6 + Math.sin(this.t * 2 + pk.x) * 0.08;
      if (!p.dead && Math.hypot(pk.x - p.pos.x, pk.z - p.pos.z) < 1.3 && Math.abs(p.pos.y - 0) < 2.5) {
        if (pk.kind === 'med') {
          if (this.gear.med >= 6) continue;
          this.gear.med++;
          this.say('İlk yardım çantası alındı', 0);
        } else {
          const w0 = this.slots[0], a0 = this.ammo[0];
          if (a0.reserve >= w0.reserve * 1.5) continue;
          a0.reserve += w0.mag * 2;
          this.ammo[1].reserve += 15;
          this.gear.nade = Math.min(5, this.gear.nade + 1);
          this.say('Cephane ve el bombası alındı', 0);
        }
        pk.taken = true;
        pk.mesh.visible = false;
        S.ding();
      }
    }
    // arayüz/etkileşim
    this.prompt = null;
    this.progress = -1;
    if (!p.dead) {
      let near = null, nd = 2.5;
      for (const h of this.hostages) {
        if (h.state !== 'bound') continue;
        const d = Math.hypot(h.pos.x - p.pos.x, h.pos.z - p.pos.z);
        if (d < nd) {
          nd = d;
          near = h;
        }
      }
      for (const h of this.hostages) if (h !== near && h.prog > 0) h.prog = Math.max(0, h.prog - dt * 2);
      if (near) {
        this.prompt = 'Rehineyi kurtar';
        if (this.interactHeld) {
          near.prog += dt / 1.6;
          this.progress = near.prog;
          if (near.prog >= 1) this.freeHostage(near);
        } else near.prog = Math.max(0, near.prog - dt * 2);
      }
    }
  }
  freeHostage(h) {
    if (this.isGuest()) {
      this.netSend({ k: 'free', i: this.hostages.indexOf(h) });
      h.state = 'follow';
      h.sit = false;
      setSit(h.g, false);
      S.ding();
      return;
    }
    h.state = 'follow';
    h.prog = 1;
    setSit(h.g, false);
    this.rescued++;
    S.ding();
    this.say(this.rescued < 3 ? `Rehine kurtarıldı (${this.rescued}/3)` : 'Tüm rehineler güvende! Helikopter yolda.', 0, true);
    if (this.rescued === 3) {
      this.heliState = 'inbound';
      this.heliT = 0;
      this.heliFrom = this.heli.position.clone();
      this.say('Merkez: Tahliye helikopteri 10 saniye içinde pistte.', 1.5, true);
    }
  }
  endMission(win) {
    if (this.phase !== 'play') return;
    this.phase = win ? 'won' : 'lost';
    this.fireHeld = false;
    this.interactHeld = false;
    win ? S.done() : S.fail();
    this.netSendWorld();
    if (document.pointerLockElement === this.cv) document.exitPointerLock?.();
    setTimeout(() => this.cb.onEnd?.(this.summary()), win ? 600 : 1400);
  }
  summary() {
    return { win: this.phase === 'won', time: this.elapsed, kills: this.kills, total: this.totalEnemies, rescued: this.rescued, alive: this.humans().length + this.friends.filter((f) => !f.dead).length };
  }

  // ---------------- yapay zekâ ----------------
  turn(a, want, dt, rate = 6) {
    a.yaw += angDiff(a.yaw, want) * Math.min(1, dt * rate);
    a.g.rotation.y = a.yaw;
  }
  moveTo(a, tx, tz, sp, dt) {
    const dx = tx - a.pos.x, dz = tz - a.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const vx = (dx / d) * sp, vz = (dz / d) * sp;
    const ox = a.pos.x, oz = a.pos.z;
    this.physics(a, vx, vz, dt, false);
    const moved = Math.hypot(a.pos.x - ox, a.pos.z - oz);
    a.speed = moved / dt;
    if (moved < sp * dt * 0.25) a.stuck += dt;
    else a.stuck = Math.max(0, a.stuck - dt);
    return d;
  }
  aiShoot(a, tp, err, dmg, targets, hurt) {
    const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw);
    const ox = a.pos.x + fx * 0.6, oy = a.pos.y + 1.4, oz = a.pos.z + fz * 0.6;
    const tx = tp.x + rnd(-err, err), ty = tp.y + 1.15 + rnd(-err * 0.6, err * 0.6), tz = tp.z + rnd(-err, err);
    const dx = tx - ox, dy = ty - oy, dz = tz - oz;
    const L2 = Math.hypot(dx, dy, dz) || 1;
    const d = [dx / L2, dy / L2, dz / L2];
    const hit = this.trace(ox, oy, oz, d, 110, targets);
    const pt = [ox + d[0] * hit.t, oy + d[1] * hit.t, oz + d[2] * hit.t];
    this.tracer([ox, oy, oz], pt, a.kind === 'enemy' ? 0xff8060 : 0xa0d0ff, 0.06);
    if (this.net?.host && this.net.shots.length < 8) this.net.shots.push([r2(ox), r2(oy), r2(oz), r2(pt[0]), r2(pt[1]), r2(pt[2]), a.kind === 'enemy' ? 0 : 1]);
    const dist = Math.hypot(a.pos.x - this.pl.pos.x, a.pos.z - this.pl.pos.z);
    S.shot('m4', Math.max(0.05, 1 / (1 + dist / 16)) * 0.7);
    // namlu parlaması
    const mz = a.g.userData.muzzle;
    if (mz) {
      let fl = a.g.userData.flash;
      if (!fl) {
        fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flashTex || null, color: 0xffc070, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        fl.scale.set(0.9, 0.9, 1);
        mz.add(fl);
        a.g.userData.flash = fl;
      }
      fl.visible = true;
      a.flashT = 0.05;
    }
    if (hit.kind === 'actor') hurt(hit.who, dmg);
    else if (hit.kind === 'wall' && dist < 45) this.sparks(pt, 3, 0xffd070, 2);
  }
  updateEnemy(e, dt) {
    if (e.dead) {
      animSoldier(e.g, dt, 0, true);
      return;
    }
    const pl = this.pl;
    e.cool -= dt;
    e.react -= dt;
    // algı
    const cand = [];
    if (!pl.dead) cand.push(pl);
    for (const f of this.friends) if (!f.dead) cand.push(f);
    if (this.net) for (const r of Object.values(this.net.remotes)) if (!r.dead) cand.push(r);
    let tgt = null, td = 1e9;
    const range = e.type === 'sniper' ? 50 : 32;
    e.visT -= dt;
    if (e.visT <= 0) {
      e.visT = 0.12;
      for (const c of cand) {
        const dx = c.pos.x - e.pos.x, dz = c.pos.z - e.pos.z, d = Math.hypot(dx, dz);
        if (d > range || d >= td) continue;
        const ang = Math.abs(angDiff(e.yaw, Math.atan2(-dx, -dz)));
        const inCone = ang < (e.state === 'combat' ? 3.2 : 1.0) || d < 6;
        if (!inCone) continue;
        const chestY = c === pl ? pl.pos.y + this.eyeH() - 0.35 : c.pos.y + 1.2;
        if (!this.visible(e.pos.x, e.pos.y + 1.6, e.pos.z, c.pos.x, chestY, c.pos.z)) continue;
        tgt = c;
        td = d;
      }
      e.seeNow = tgt;
    }
    tgt = e.seeNow;
    if (tgt && (tgt.dead || (tgt === pl && pl.dead))) tgt = e.seeNow = null;
    // şüphe: uzaktan görünce hemen ateş etmez, bir süre izler; çömelmek şüpheyi yavaşlatır
    if (tgt && e.state !== 'combat') {
      const dd = Math.hypot(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z);
      const crouch = tgt === pl && pl.crouchK > 0.5 ? 0.55 : 1;
      e.sus = (e.sus || 0) + dt * (dd < 10 ? 4 : dd < 20 ? 1.3 : 0.7) * crouch;
      if (e.sus < 1) tgt = null;
      else e.sus = 1;
    } else if (!tgt) e.sus = Math.max(0, (e.sus || 0) - dt * 0.5);
    if (tgt) {
      e.seen = 3.5;
      e.tgt = tgt;
      e.last.copy(tgt.pos);
      if (e.state !== 'combat') {
        e.state = 'combat';
        e.react = 0.5 + Math.random() * 0.4;
        e.aimT = 0;
        for (const o of this.enemies) if (o !== e && !o.dead && o.state !== 'combat' && Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z) < 24) {
          o.state = 'search';
          o.last.copy(tgt.pos);
          o.searchT = 8;
        }
      }
    } else if (e.state === 'combat') {
      e.seen -= dt;
      if (e.seen <= 0) {
        e.state = 'search';
        e.searchT = 7;
      }
    }
    let moveSp = 0;
    if (e.state === 'combat' && e.tgt) {
      const dx = e.last.x - e.pos.x, dz = e.last.z - e.pos.z, d = Math.hypot(dx, dz);
      this.turn(e, Math.atan2(-dx, -dz), dt, 9);
      if (e.type !== 'sniper') {
        e.strafeT -= dt;
        if (e.strafeT <= 0 || e.stuck > 0.5) {
          e.strafe *= -1;
          e.strafeT = rnd(1, 2.4);
          e.stuck = 0;
        }
        if (d > 19) moveSp = 3.8;
        else if (d < 8) moveSp = -2.6;
        else moveSp = 0;
        const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw);
        const sx = rx * e.strafe * 1.9 + fx * moveSp, sz = rz * e.strafe * 1.9 + fz * moveSp;
        const ox = e.pos.x, oz = e.pos.z;
        this.physics(e, sx, sz, dt, false);
        e.speed = Math.hypot(e.pos.x - ox, e.pos.z - oz) / dt;
        if (e.speed < 0.5) e.stuck += dt;
      }
      // ateş
      if (e.seeNow && e.react <= 0) {
        if (e.type === 'sniper') {
          e.aimT += dt;
          if (e.aimT > 1.0 && e.cool <= 0) {
            e.cool = 1.9;
            e.aimT = 0.2;
            this.aiShoot(e, e.tgt.pos === pl.pos ? pl.pos : e.tgt.pos, 0.35 + d * 0.012, 16, cand, (w, dmg) => this.hurtAny(w, dmg, e.pos));
          }
        } else if (e.cool <= 0) {
          if (e.burst <= 0) {
            e.burst = 3 + Math.floor(Math.random() * 3);
          }
          e.burst--;
          e.cool = e.burst > 0 ? 0.13 : rnd(0.7, 1.5);
          const tp = e.tgt === pl ? { x: pl.pos.x, y: pl.pos.y - (pl.crouchK > 0.5 ? 0.35 : 0), z: pl.pos.z } : e.tgt.pos;
          this.aiShoot(e, tp, 0.55 + d * 0.042, 7, cand, (w, dmg) => this.hurtAny(w, dmg, e.pos));
        }
      }
    } else if (e.state === 'search') {
      e.searchT -= dt;
      const d = e.type === 'sniper' ? 0 : this.moveTo(e, e.last.x, e.last.z, 3.4, dt);
      if (e.type !== 'sniper' && d > 1.2) {
        this.turn(e, Math.atan2(-(e.last.x - e.pos.x), -(e.last.z - e.pos.z)), dt, 6);
        if (e.stuck > 1.2) e.searchT = 0;
      } else {
        e.yaw += dt * 1.1;
        e.g.rotation.y = e.yaw;
        e.speed = 0;
      }
      if (e.searchT <= 0) {
        e.state = e.wp.length ? 'patrol' : 'idle';
        e.stuck = 0;
      }
    } else {
      // devriye / bekleme
      if (e.wp.length > 1) {
        e.wait -= dt;
        const w = e.wp[e.wi];
        if (e.wait > 0) {
          e.speed = 0;
          e.yaw += Math.sin(this.t * 0.7 + e.wi) * dt * 0.8;
          e.g.rotation.y = e.yaw;
        } else {
          const d = this.moveTo(e, w.x, w.z, 1.7, dt);
          this.turn(e, Math.atan2(-(w.x - e.pos.x), -(w.z - e.pos.z)), dt, 5);
          if (d < 0.6 || e.stuck > 1.5) {
            e.wi = (e.wi + 1) % e.wp.length;
            e.wait = rnd(1.2, 3);
            e.stuck = 0;
          }
        }
      } else {
        e.speed = 0;
        e.yaw += Math.sin(this.t * 0.5 + e.pos.x) * dt * 0.5;
        e.g.rotation.y = e.yaw;
      }
    }
    if (e.flashT > 0) {
      e.flashT -= dt;
      if (e.flashT <= 0 && e.g.userData.flash) e.g.userData.flash.visible = false;
    }
    animSoldier(e.g, dt, e.speed, false);
  }
  updateFriend(f, dt) {
    if (f.dead) {
      animSoldier(f.g, dt, 0, true);
      return;
    }
    const pl = this.pl;
    f.cool -= dt;
    f.react -= dt;
    f.seenT -= dt;
    if (f.seenT <= 0) {
      f.seenT = 0.15;
      let tgt = null, td = 1e9;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.pos.x - f.pos.x, e.pos.z - f.pos.z);
        if (d > 40 || d >= td) continue;
        if (!this.visible(f.pos.x, f.pos.y + 1.6, f.pos.z, e.pos.x, e.pos.y + 1.2, e.pos.z)) continue;
        tgt = e;
        td = d;
      }
      if (tgt && tgt !== f.tgt) f.react = 0.35 + Math.random() * 0.3;
      f.tgt = tgt;
    }
    const offs = [[-2.8, 2.6], [2.8, 3.4], [0.2, 6.0]][f.slot];
    const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw), rx = Math.cos(pl.yaw), rz = -Math.sin(pl.yaw);
    const tx = pl.pos.x + rx * offs[0] - fx * offs[1], tz = pl.pos.z + rz * offs[0] - fz * offs[1];
    const dd = Math.hypot(tx - f.pos.x, tz - f.pos.z);
    const dP = Math.hypot(pl.pos.x - f.pos.x, pl.pos.z - f.pos.z);
    let sp = 0;
    if (dd > 1.8) sp = dd > 8 ? 6.6 : dd > 4 ? 5.0 : 3.2;
    if (f.tgt && dP < 14 && dd < 5) sp = 0;
    if (sp > 0) {
      if (f.stuck > 0.8) {
        f.strafeT -= dt;
        this.physics(f, f.strafe * 3, 0, dt, false);
        if (f.strafeT <= 0) {
          f.strafe *= -1;
          f.strafeT = 0.6;
          f.stuck = 0;
        }
      } else this.moveTo(f, tx, tz, sp, dt);
    } else {
      f.speed = 0;
      f.stuck = 0;
    }
    let want = sp > 0 ? Math.atan2(-(tx - f.pos.x), -(tz - f.pos.z)) : pl.yaw;
    if (f.tgt) want = Math.atan2(-(f.tgt.pos.x - f.pos.x), -(f.tgt.pos.z - f.pos.z));
    this.turn(f, want, dt, 8);
    if (f.tgt && f.react <= 0 && f.cool <= 0 && Math.abs(angDiff(f.yaw, want)) < 0.3) {
      if (f.burst <= 0) f.burst = 3 + Math.floor(Math.random() * 3);
      f.burst--;
      f.cool = f.burst > 0 ? 0.11 : rnd(0.5, 1.1);
      const d = Math.hypot(f.tgt.pos.x - f.pos.x, f.tgt.pos.z - f.pos.z);
      this.aiShoot(f, f.tgt.pos, 0.4 + d * 0.03, 12, this.enemies, (w, dmg) => this.hurtEnemy(w, dmg, false, false));
    }
    if (f.flashT > 0) {
      f.flashT -= dt;
      if (f.flashT <= 0 && f.g.userData.flash) f.g.userData.flash.visible = false;
    }
    animSoldier(f.g, dt, f.speed, false);
  }
  updateHostage(h, dt) {
    if (h.state === 'safe') return;
    const pl = this.leader(h);
    if (h.state === 'follow') {
      let tx = pl.pos.x, tz = pl.pos.z, keep = 2.8, sp = 4.6;
      const P = this.world.PAD;
      if (this.heliState === 'landed') {
        const dp = Math.hypot(pl.pos.x - P.x, pl.pos.z - P.z);
        if (dp < P.r + 6) {
          tx = P.x;
          tz = P.z;
          keep = 0.5;
        }
      }
      const d = Math.hypot(tx - h.pos.x, tz - h.pos.z);
      if (d > keep) {
        if (h.stuck > 3) {
          h.pos.set(pl.pos.x + (Math.random() - 0.5) * 2, pl.pos.y, pl.pos.z + 2);
          h.stuck = 0;
        } else this.moveTo(h, tx, tz, d > 9 ? 6.2 : sp, dt);
        h.yaw += angDiff(h.yaw, Math.atan2(-(tx - h.pos.x), -(tz - h.pos.z))) * Math.min(1, dt * 8);
        h.g.rotation.y = h.yaw;
      } else h.speed = 0;
      if (this.heliState === 'landed' && Math.hypot(h.pos.x - P.x, h.pos.z - P.z) < 1.6) {
        h.state = 'safe';
        h.g.visible = false;
      }
    }
    animCivilian(h.g, dt, h.speed);
  }

  // ---------------- helikopter ----------------
  updateHeli(dt) {
    const h = this.heli, u = h.userData, P = this.world.PAD;
    u.rotor.rotation.y += dt * (this.heliState === 'landed' ? 20 : 34);
    u.tail.rotation.x += dt * 40;
    u.redL.visible = Math.sin(this.t * 6) > 0;
    if (this.isGuest()) {
      const s = this.net.heliP;
      if (s) {
        const k = Math.min(1, dt * 6);
        h.position.x += (s[1] - h.position.x) * k;
        h.position.y += (s[2] - h.position.y) * k;
        h.position.z += (s[3] - h.position.z) * k;
        h.rotation.y += angDiff(h.rotation.y, s[4]) * k;
        h.rotation.z = s[5];
      }
    } else if (this.heliState === 'circle') {
      this.heliAng += dt * 0.09;
      const a = this.heliAng, r = 66;
      const nx = Math.cos(a) * r, nz = Math.sin(a) * r - 2, ny = 36 + Math.sin(this.t * 0.4) * 2;
      const vx = nx - h.position.x, vz = nz - h.position.z;
      h.position.set(nx, ny, nz);
      if (Math.hypot(vx, vz) > 1e-4) h.rotation.y = Math.atan2(-vx, -vz);
      h.rotation.z = -0.12;
    } else if (this.heliState === 'inbound') {
      this.heliT += dt;
      const k = Math.min(1, this.heliT / 11), e = k * k * (3 - 2 * k);
      const from = this.heliFrom, to = new THREE.Vector3(P.x, 1.45, P.z);
      const nx = from.x + (to.x - from.x) * e, nz = from.z + (to.z - from.z) * e;
      const ny = from.y + (to.y - from.y) * Math.pow(e, 1.6);
      const vx = nx - h.position.x, vz = nz - h.position.z;
      h.position.set(nx, ny, nz);
      if (k < 0.8 && Math.hypot(vx, vz) > 1e-4) h.rotation.y += angDiff(h.rotation.y, Math.atan2(-vx, -vz)) * Math.min(1, dt * 3);
      else h.rotation.y += angDiff(h.rotation.y, -Math.PI / 2) * Math.min(1, dt * 2);
      h.rotation.z *= 0.97;
      if (k >= 1) {
        this.heliState = 'landed';
        this.evacReady = true;
        this.say('Helikopter indi! Rehinelerle birlikte pistte bekle.', 0, true);
        S.radio();
      }
    } else {
      h.position.set(P.x, 1.45, P.z);
    }
    this.world.padLight.intensity = this.heliState === 'landed' ? 90 : 0;
    u.lampM.visible = this.heliState !== 'landed';
    const d = Math.hypot(h.position.x - this.pl.pos.x, h.position.z - this.pl.pos.z, h.position.y);
    S.heliSet(this.mode === 'play' && !this.paused ? Math.min(1, 28 / (d + 6)) : this.mode === 'menu' ? 0.35 : 0);
    if (this.heliState === 'landed' && this.phase === 'play' && !this.isGuest()) {
      const hum = this.humans();
      if (hum.length && hum.every((a) => Math.hypot(a.pos.x - P.x, a.pos.z - P.z) < P.r * 0.85)) {
        const ok = this.hostages.every((hs) => hs.state === 'safe' || (hs.state === 'follow' && Math.hypot(hs.pos.x - P.x, hs.pos.z - P.z) < P.r + 2.5));
        if (ok) {
          this.evacT += dt;
          this.evacHold = Math.min(1, this.evacT / 1.6);
          if (this.evacT > 1.6) this.endMission(true);
        } else {
          this.evacT = 0;
          this.evacHold = 0;
          this.prompt = 'Rehineler pistte toplansın';
        }
      } else {
        this.evacT = 0;
        this.evacHold = 0;
      }
    }
  }

  // ---------------- ana adım ----------------
  step(dt) {
    this.t += dt;
    this.world.update(this.t, dt);
    this.updateHeli(dt);
    if (this.mode === 'menu') {
      this.orbit += dt * 0.07;
      const a = this.orbit, r = 50;
      this.cam.position.set(Math.cos(a) * r, 8 + Math.sin(this.t * 0.2) * 2, Math.sin(a) * r * 0.8 + 6);
      this.cam.lookAt(0, 5.5, -2);
      this.cam.fov += (62 - this.cam.fov) * 0.1;
      this.cam.updateProjectionMatrix();
      this.sun.position.set(this.sunDir.x * 130, this.sunDir.y * 130 + 40, this.sunDir.z * 130);
      this.sun.target.position.set(0, 0, 0);
      this.sun.target.updateMatrixWorld();
      return;
    }
    // görev konuşmaları
    while (this.toastQ.length && this.toastQ[0].at <= this.t) {
      this.cb.onToast?.(this.toastQ.shift().text);
      S.radio();
    }
    if (this.paused) return;
    if (this.phase === 'play') this.elapsed += dt;
    S.windSet(true);
    this.updatePlayer(dt);
    if (this.isGuest()) this.netProxyStep(dt);
    else {
      for (const e of this.enemies) this.updateEnemy(e, dt);
      for (const f of this.friends) this.updateFriend(f, dt);
      for (const h of this.hostages) this.updateHostage(h, dt);
    }
    this.netStep(dt);
    this.updateNades(dt);
    this.revealT = Math.max(0, this.revealT - dt);
    // işaretçiler
    this.markT = (this.markT || 0) - dt;
    if (this.markT <= 0) {
      this.markT = 0.12;
      const eye = this.cam.position;
      for (const e of this.enemies) {
        if (e.dead) {
          e.marker.visible = false;
          continue;
        }
        const d = Math.hypot(e.pos.x - eye.x, e.pos.z - eye.z);
        const rev = this.revealT > 0;
        const see = d < 60 && this.visible(eye.x, eye.y, eye.z, e.pos.x, e.pos.y + 1.7, e.pos.z);
        e.marker.visible = rev || see;
        e.marker.material.depthTest = !rev;
      }
    }
    // efekt listeleri
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.t -= dt;
      t.m.material.opacity = Math.max(0, t.t / t.dur);
      if (t.t <= 0) {
        this.scene.remove(t.m);
        t.m.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.life -= dt;
      q.vel.y -= 14 * dt;
      q.m.position.addScaledVector(q.vel, dt);
      if (q.m.position.y < 0.03) {
        q.m.position.y = 0.03;
        q.vel.multiplyScalar(0.3);
      }
      if (q.life <= 0) {
        this.scene.remove(q.m);
        q.m.material.dispose();
        this.parts.splice(i, 1);
      }
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t -= dt;
      const k = 1 - f.t / f.dur;
      f.m.scale.setScalar(0.5 + k * 6);
      f.m.material.opacity = Math.max(0, 0.9 * (1 - k));
      if (f.t <= 0) {
        this.scene.remove(f.m);
        f.m.material.dispose();
        this.fx.splice(i, 1);
      }
    }
    this.dmgDirs = this.dmgDirs.filter((d) => (d.t -= dt) > 0);
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.vm.userData.flash.visible = false;
    }
    if (this.muzzleLightT > 0) {
      this.muzzleLightT -= dt;
      this.muzzleLight.intensity *= 0.6;
      if (this.muzzleLightT <= 0) this.muzzleLight.intensity = 0;
    }
    this.kickZ *= Math.max(0, 1 - dt * 14);
    this.shake = Math.max(0, (this.shake || 0) - dt * 1.6);
    this.updateView(dt);
  }
  updateView(dt) {
    const p = this.pl, cam = this.cam;
    const bob = Math.sin(p.bob) * 0.035 * (p.grounded ? 1 : 0);
    const sh = this.shake || 0;
    cam.position.set(p.pos.x + rnd(-sh, sh) * 0.15, p.pos.y + this.eyeH() + bob, p.pos.z + rnd(-sh, sh) * 0.15);
    const dead = p.dead ? 0.6 : 0;
    cam.rotation.set(p.pitch - dead + rnd(-sh, sh) * 0.02, p.yaw, p.dead ? 0.35 : 0);
    const w = this.slots[this.slot];
    const zoom = w.scope ? 17 : 56;
    const fov = (this.cam.aspect < 1 ? 92 : 78) + (zoom - (this.cam.aspect < 1 ? 92 : 78)) * p.ads;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    // birinci şahıs silah
    const v = this.vm;
    const a = p.ads;
    const hip = [0.22 + Math.sin(p.bob * 0.5) * 0.008, -0.25 + Math.abs(Math.sin(p.bob)) * 0.01, -0.36 + this.kickZ];
    const ads = [0, -v.userData.adsY, -0.45 - v.userData.adsZ + this.kickZ * 0.4];
    let y = hip[1] + (ads[1] - hip[1]) * a, z = hip[2] + (ads[2] - hip[2]) * a, x = hip[0] + (ads[0] - hip[0]) * a;
    let rx = this.kickZ * 1.2, ry = 0.11 * (1 - a);
    if (this.reloadT > 0) {
      const k = 1 - this.reloadT / (this.reloadDur || 1.9);
      const s = Math.sin(k * Math.PI);
      y -= s * 0.16;
      rx -= s * 0.5;
      ry += s * 0.25;
    }
    if (this.swapT > 0) y -= (this.swapT / 0.35) * 0.35;
    v.position.set(x, y, z);
    v.rotation.set(rx, ry, 0);
    v.visible = !(w.scope && a > 0.9) && !p.dead;
    this.sun.position.set(p.pos.x + this.sunDir.x * 120, this.sunDir.y * 120 + 60, p.pos.z + this.sunDir.z * 120);
    this.sun.target.position.set(p.pos.x, 0, p.pos.z);
    this.sun.target.updateMatrixWorld();
  }

  // ---------------- arayüz verisi ----------------
  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.cam);
    const behind = v.z > 1;
    let sx = v.x, sy = v.y;
    if (behind) {
      sx = -sx;
      sy = -1;
    }
    const edge = behind || Math.abs(sx) > 0.92 || Math.abs(sy) > 0.88;
    sx = Math.max(-0.92, Math.min(0.92, sx));
    sy = Math.max(-0.82, Math.min(0.85, sy));
    return { x: (sx * 0.5 + 0.5) * 100, y: (1 - (sy * 0.5 + 0.5)) * 100, edge };
  }
  hud() {
    const p = this.pl;
    if (this.mode !== 'play') return { mode: this.mode };
    const w = this.slots[this.slot], am = this.ammo[this.slot];
    const total = this.totalEnemies;
    const objectives = [
      { text: this.world.objText.enter, done: this.entered },
      { text: `Rehineleri kurtar (${this.rescued}/3)`, done: this.rescued >= 3 },
      { text: `Silahlıları etkisiz hale getir (${this.kills}/${total})`, done: this.kills >= total },
      { text: 'Tahliye noktasına ulaş', done: this.phase === 'won' },
    ];
    let banner = this.world.objText.enter;
    if (this.entered) banner = this.rescued < 3 ? 'Rehineleri kurtar ve tahliye noktasına ulaş' : this.heliState === 'landed' ? 'Tahliye helikopterine ulaş' : 'Helikopter geliyor, rehineleri koru';
    // yön işareti
    let wp = null;
    const P = this.world.PAD;
    if (!this.entered) wp = { ...this.project(this.world.gate.x, 3.2, this.world.gate.z), dist: Math.round(Math.hypot(p.pos.x - this.world.gate.x, p.pos.z - this.world.gate.z)), kind: 'gate' };
    else if (this.rescued < 3) {
      let best = null, bd = 1e9;
      for (const h of this.hostages) {
        if (h.state !== 'bound') continue;
        const d = Math.hypot(h.pos.x - p.pos.x, h.pos.z - p.pos.z);
        if (d < bd) {
          bd = d;
          best = h;
        }
      }
      if (best) wp = { ...this.project(best.pos.x, 2.6, best.pos.z), dist: Math.round(bd), kind: 'hostage' };
    } else wp = { ...this.project(P.x, 3, P.z), dist: Math.round(Math.hypot(P.x - p.pos.x, P.z - p.pos.z)), kind: 'evac', ready: this.heliState === 'landed' };
    const rev = this.revealT > 0;
    return {
      mode: 'play',
      phase: this.phase,
      time: this.elapsed,
      hp: Math.ceil(p.hp),
      maxHp: p.maxHp,
      hurt: p.hurt,
      ammo: am.mag,
      reserve: am.reserve,
      wname: w.name,
      wid: w.id,
      slot: this.slot,
      pistolMag: this.ammo[1].mag,
      reload: this.reloadT > 0 ? 1 - this.reloadT / (this.reloadDur || 1.9) : -1,
      gear: { ...this.gear },
      ads: p.ads,
      scoped: !!w.scope && p.ads > 0.88,
      prompt: this.prompt,
      progress: this.progress,
      evacHold: this.phase === 'play' && this.heliState === 'landed' ? this.evacHold || 0 : 0,
      objectives,
      banner,
      wp,
      heading: p.yaw,
      hit: this.hitInfo || null,
      dmg: this.dmgDirs.map((d) => ({ id: d.id, rel: d.rel, a: Math.min(1, d.t) })),
      crouch: p.crouchK > 0.5,
      reveal: this.revealT,
      team: [
        { name: this.nick, role: this.role.id, hp: p.hp, maxHp: p.maxHp, dead: p.dead, me: true },
        ...Object.values(this.net?.remotes || {}).map((r) => ({ name: r.name, role: r.role, hp: r.hp, maxHp: 100, dead: r.dead })),
        ...this.friends.map((f) => ({ name: f.name, role: f.role, hp: f.hp, maxHp: 100, dead: f.dead })),
      ],
      downed: !!(this.net && p.dead),
      aliveCount: this.humans().length + this.friends.filter((f) => !f.dead).length,
      map: {
        px: p.pos.x,
        pz: p.pos.z,
        yaw: p.yaw,
        friends: [...this.friends, ...Object.values(this.net?.remotes || {})].filter((f) => !f.dead).map((f) => [f.pos.x, f.pos.z]),
        enemies: this.enemies.filter((e) => !e.dead && (rev || e.state === 'combat')).map((e) => [e.pos.x, e.pos.z]),
        hostages: this.hostages.filter((h) => h.state !== 'safe').map((h) => [h.pos.x, h.pos.z, h.state === 'bound' ? 0 : 1]),
        pad: [P.x, P.z, this.heliState === 'landed' ? 1 : this.rescued >= 3 ? 2 : 0],
      },
      fps: Math.round(this.fps),
    };
  }

  resize() {
    const w = this.cv.clientWidth || 800, h = this.cv.clientHeight || 450;
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.vmCam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    this.vmCam.updateProjectionMatrix();
  }
  render() {
    this.r.clear();
    this.r.render(this.scene, this.cam);
    if (this.mode === 'play' && this.vm) {
      this.r.clearDepth();
      this.r.render(this.vmScene, this.vmCam);
    }
  }
  loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.fps += (1 / Math.max(dt, 1e-3) - this.fps) * 0.05;
    this.step(dt);
    this.render();
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
  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('pointerlockchange', this.onLock);
    this.cv.removeEventListener('mousedown', this.onMouseDown);
    this.cv.removeEventListener('contextmenu', this.onCtx);
    if (document.pointerLockElement === this.cv) document.exitPointerLock?.();
    S.silence();
    this.r.dispose();
  }
}

Object.assign(Game.prototype, coop);
