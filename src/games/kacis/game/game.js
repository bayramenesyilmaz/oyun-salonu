import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { CellScene } from '../scene/cell.js';
import { SUB, INTRO_CARDS, ZONE_CARDS } from './story.js';

const EYE = 1.62;
const EYE_C = 1.08;
const R = 0.3;
const HH = 0.55;
let rapierReady = null;
const initRapier = () => (rapierReady ||= RAPIER.init());

let AC = null;
function tone(f, d = 0.1, type = 'sine', v = 0.04, f2 = 0) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = type;
    o.frequency.value = f;
    if (f2) o.frequency.linearRampToValueAtTime(f2, AC.currentTime + d);
    g.gain.value = v;
    g.gain.linearRampToValueAtTime(0.0001, AC.currentTime + d);
    o.connect(g).connect(AC.destination);
    o.start();
    o.stop(AC.currentTime + d);
  } catch {}
}

const zoneAt = (z) => (z < 6.8 ? 'cell' : z < 14.3 ? 'revir' : z < 24.2 ? 'mutfak' : 'avlu');
const ZORD = { cell: 0, revir: 1, mutfak: 2, avlu: 3 };
const CHECK = [
  { x: 0.2, z: 2.4 },
  { x: 0, z: 7.7 },
  { x: 2.5, z: 15.0 },
  { x: 0, z: 25.6 },
];
const wrapA = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
// intro kamera planları: [konum], [bakış]
const CAMS = [
  { p: [0.4, 1.5, 6.2], q: [0.2, 1.4, 2.4], a: [0, 0, 0], l: [0.2, 1.3, 0] },
  { p: [-0.5, 1.7, 3.2], q: [0.5, 1.7, 3.8], l: [0.6, 1.2, 6.5] },
  { p: [0.0, 1.55, -1.2], q: [0.15, 1.55, -1.0], l: [0.0, 1.3, 3] },
  { p: [0.0, 1.6, 0.6], q: [0.15, 1.65, 0.1], l: [0.2, 2.1, -1.6] },
];

export class KGame {
  static async create(canvas, opts) {
    await initRapier();
    return new KGame(canvas, opts);
  }
  constructor(canvas, opts = {}) {
    this.cb = opts.cb || {};
    this.S = new CellScene(canvas, { manual: true });
    this.S.auto = false;
    this.S.buildPlay();
    this.cam = this.S.cam;
    this.cv = canvas;
    this.w = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.buildColliders();
    this.k = { f: 0, b: 0, l: 0, r: 0, run: 0, crouch: 0, act: 0 };
    this.invertY = opts.invertY ?? true;
    this.yaw = 0;
    this.pitch = 0;
    this.pos = new THREE.Vector3(0.2, 0, -1.0);
    this.vy = 0;
    this.eye = EYE;
    this.time = 0;
    this.F = { spoon: 0, door: 0, exit: 0, card: 0, reader: 0, pliers: 0, hatch: 0, fence: 0, end: 0, pipe: 0 };
    this.zone = 'cell';
    this.zmax = 0;
    this.meter = 0;
    this.caught = 0;
    this.sub = null;
    this.subQ = [];
    this.warnCd = 0;
    this.prompt = '';
    this.hold = 0;
    this.holdId = '';
    this.actPrev = 0;
    this.pipeCd = 0;
    this.paused = false;
    this.dead = false;
    this.footT = 0;
    this.cine = null; // sinematik
    this.fade = 0; // 0–1 kararma
    this.fadeTarget = 0;
    this.zoneCard = null;
    this.doorY = { exit: 0, revir: 0, hatch: 0 };
    this.initEnemies();
    this.cc = this.w.createCharacterController(0.01);
    this.cc.enableAutostep(0.3, 0.1, true);
    this.cc.enableSnapToGround(0.2);
    this.body = this.w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, HH + R + 0.02, this.pos.z));
    this.col = this.w.createCollider(RAPIER.ColliderDesc.capsule(HH, R), this.body);
    this._kd = (e) => this.onKey(e, true);
    this._ku = (e) => this.onKey(e, false);
    this._mm = (e) => {
      if (document.pointerLockElement === this.cv) this.look(e.movementX, e.movementY);
    };
    this._pl = () => {
      if (document.pointerLockElement !== this.cv && !this.dead && !this.paused && this.started && !this.cine) this.cb.onPause?.();
    };
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    document.addEventListener('mousemove', this._mm);
    document.addEventListener('pointerlockchange', this._pl);
    if (opts.skipIntro) this.finishIntro();
    else this.startIntro();
    this.emitHud();
    if (!opts.manual) {
      const loop = (ms) => {
        if (this.dead) return;
        const dt = Math.min(0.05, (ms - (this._l || ms)) / 1000);
        this._l = ms;
        if (!this.paused) this.step(dt);
        this.S.render();
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }
  }
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    document.removeEventListener('mousemove', this._mm);
    document.removeEventListener('pointerlockchange', this._pl);
    if (document.pointerLockElement === this.cv) document.exitPointerLock?.();
    this.S.dispose();
  }
  lockPointer() {
    this.started = true;
    try {
      this.cv.requestPointerLock?.();
    } catch {}
  }
  buildColliders() {
    const S = this.S;
    const add = (x, y, z, hx, hy, hz) => this.w.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z));
    add(0, -0.1, 2.2, 2.1, 0.1, 4.5); // zemin
    add(0, 3.0, 2.2, 2.1, 0.1, 4.5);
    add(-2.1, 1.45, 2.2, 0.1, 1.55, 4.5);
    add(2.1, 1.45, -0.1, 0.1, 1.55, 2.1);
    add(2.1, 1.45, 4.1, 0.1, 1.55, 2.3);
    add(0, 1.45, -1.7, 2.1, 1.55, 0.1);
    add(-1.5, 0.3, -0.7, 0.45, 0.3, 0.98);
    add(-1.5, 1.45, -0.7, 0.45, 0.04, 0.98);
    add(1.7, 0.2, -1.4, 0.2, 0.2, 0.25);
    add(1.4, 0.75, 0.2, 0.4, 0.03, 0.25);
    for (const [x, z] of [[1.05, 0.0], [1.75, 0.0], [1.05, 0.4], [1.75, 0.4]]) add(x, 0.37, z, 0.03, 0.37, 0.03);
    for (const [x, z] of S.pillars) add(x, 1.5, z, 0.275, 1.5, 0.275);
    for (const s of S.solids) add(...s);
    this.doorCol = add(0, 1.4, 1.6, 1.9, 1.5, 0.09);
    this.cols = {
      exit: add(0, 1.15, 6.8, 0.65, 1.15, 0.1),
      revir: add(2.5, 1.15, 14.3, 0.6, 1.15, 0.1),
      hatch: add(0, 0.9, 24.1, 0.7, 0.9, 0.2),
      fence: add(...S.fenceGapCol),
    };
  }
  look(dx, dy) {
    this.yaw += dx * 0.0024;
    const s = this.invertY ? 1 : -1;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch + s * dy * 0.0024));
  }
  onKey(e, down) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const m = { w: 'f', ArrowUp: 'f', s: 'b', ArrowDown: 'b', a: 'l', ArrowLeft: 'l', d: 'r', ArrowRight: 'r', Shift: 'run', c: 'crouch', Control: 'crouch', e: 'act', f: 'act', ' ': 'act' };
    if (k === 'Escape' && down) {
      if (this.cine) return this.skipCine();
      return this.cb.onPause?.();
    }
    const a = m[k];
    if (!a) return;
    e.preventDefault();
    if (down && a === 'act' && this.cine) this.nextCard();
    this.k[a] = down ? 1 : 0;
  }
  touch(a, v) {
    this.k[a] = v;
    if (v && a === 'act' && this.cine) this.nextCard();
  }
  tapAdvance() {
    if (this.cine) this.nextCard();
  }
  // ——— altyazı ———
  say(lines) {
    this.subQ.push(...lines.map((l) => ({ ...l })));
    if (!this.sub) this.nextSub();
  }
  nextSub() {
    this.sub = this.subQ.shift() || null;
    if (this.sub) this.sub.t0 = this.time;
    this.cb.onSub?.(this.sub);
  }
  // ——— sinematik ———
  startIntro() {
    this.cine = { cards: INTRO_CARDS, i: 0, t0: this.time, kind: 'intro', end: () => this.finishIntro() };
    this.fade = 1;
    this.fadeTarget = 0;
    this.cb.onCine?.({ ...INTRO_CARDS[0] });
  }
  nextCard() {
    const c = this.cine;
    if (!c) return;
    if (this.time - c.t0 < 0.8) return;
    c.i++;
    c.t0 = this.time;
    if (c.i >= c.cards.length) {
      this.skipCine();
      return;
    }
    this.cb.onCine?.({ ...c.cards[c.i] });
  }
  skipCine() {
    const c = this.cine;
    if (!c) return;
    this.cine = null;
    this.cb.onCine?.(null);
    this.fade = 1;
    this.fadeTarget = 0;
    c.end?.();
  }
  finishIntro() {
    this.cine = null;
    this.cb.onCine?.(null);
    this.setCam(CAMS[2]);
    this.say(SUB.intro);
  }
  setCam(c) {
    this.cam.position.set(...c.p);
    this.cam.lookAt(...c.l);
  }
  updateCine(dt) {
    const c = this.cine;
    const card = c.cards[c.i];
    const k = Math.min(1, (this.time - c.t0) / card.d);
    const cam = CAMS[card.cam] || CAMS[0];
    const e = k * k * (3 - 2 * k);
    const x = cam.p[0] + (cam.q[0] - cam.p[0]) * e;
    const y = cam.p[1] + (cam.q[1] - cam.p[1]) * e;
    const z = cam.p[2] + (cam.q[2] - cam.p[2]) * e;
    this.cam.position.set(x + Math.sin(this.time * 0.7) * 0.01, y, z);
    this.cam.lookAt(...cam.l);
    this.S.t = this.time;
    this.S.update(dt);
    // gardiyan siluet koridorda yürür
    this.stepEnemy(this.en[0], dt, true);
    if (this.time - c.t0 > card.d) this.nextCard();
  }
  showZone(name) {
    const zc = ZONE_CARDS[name];
    if (!zc) return;
    this.zoneCard = { ...zc, t0: this.time };
    this.fade = 1;
    this.fadeTarget = 0;
    this.cb.onZoneCard?.({ ...zc });
    tone(110, 0.8, 'sine', 0.05, 70);
  }
  // ——— düşmanlar ———
  initEnemies() {
    const S = this.S;
    this.en = [
      { id: 'g1', m: S.guard, torch: S.torch, zone: 'cell', path: [[0.9, 3.2], [-0.1, 5.0], [-0.9, 6.1], [0.9, 6.1], [0.1, 4.6]], x: 0.6, z: 4.3, ang: Math.PI, i: 0, wait: 0, sp: 0.95, on: () => !this.F.exit, intens: 7 },
      { id: 'g2', m: S.guard2, torch: S.torch2, zone: 'mutfak', path: [[-0.6, 15.5], [-0.6, 22.8], [2.8, 22.8], [2.8, 15.5]], x: -0.6, z: 15.8, ang: 0, i: 1, wait: 0, sp: 1.0, on: () => this.zone === 'mutfak', intens: 7 },
      { id: 'g3', m: S.guard3, torch: S.torch3, zone: 'avlu', path: [[-5.5, 37], [5.5, 37], [5.5, 28.6], [0.4, 28.6], [0.4, 35.5]], x: -5.5, z: 37, ang: Math.PI / 2, i: 1, wait: 0, sp: 1.05, on: () => this.zone === 'avlu' && !this.F.end, intens: 7 },
    ];
    // doktor
    this.doc = { m: S.doctor, x: -2.3, z: 13.0, ang: Math.PI / 2, state: 'sit', t: 0 };
  }
  stepEnemy(e, dt, free) {
    const active = free || (e.on() && this.caught <= 0 && !this.F.end);
    if (active) {
      if (e.wait > 0) e.wait -= dt;
      else {
        const [tx, tz] = e.path[e.i];
        const dx = tx - e.x;
        const dz = tz - e.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.15) {
          e.i = (e.i + 1) % e.path.length;
          e.wait = 2.2;
        } else {
          e.x += (dx / d) * e.sp * dt;
          e.z += (dz / d) * e.sp * dt;
          e.ang += wrapA(Math.atan2(dx, dz) - e.ang) * Math.min(1, dt * 4);
        }
      }
    }
    e.m.visible = e.id === 'g1' ? !this.F.exit : active || free;
    e.m.position.set(e.x, 0, e.z);
    e.m.rotation.y = e.ang;
    e.a2 = e.ang + Math.sin(this.time * 0.9 + e.x) * 0.55;
    const fx = Math.sin(e.a2);
    const fz = Math.cos(e.a2);
    e.torch.position.set(e.x + fx * 0.25, 1.3, e.z + fz * 0.25);
    e.torch.target.position.set(e.x + fx * 5, 0.6, e.z + fz * 5);
    e.torch.target.updateMatrixWorld();
    e.torch.intensity = e.m.visible && (active || free) ? e.intens : 0;
    return active;
  }
  stepDoctor(dt) {
    const d = this.doc;
    const S = this.S;
    if (d.state === 'go') {
      const tx = 2.6;
      const tz = 9.0;
      const dx = tx - d.x;
      const dz = tz - d.z;
      const L = Math.hypot(dx, dz);
      if (L < 0.2) {
        d.state = 'look';
        d.t = 0;
      } else {
        d.x += (dx / L) * 1.4 * dt;
        d.z += (dz / L) * 1.4 * dt;
        d.ang += wrapA(Math.atan2(dx, dz) - d.ang) * Math.min(1, dt * 5);
      }
    } else if (d.state === 'look') {
      d.t += dt;
      d.ang += wrapA(Math.PI / 2 - d.ang) * Math.min(1, dt * 4);
      if (d.t > 8) {
        d.state = 'back';
        this.say(SUB.doctorBack);
      }
    } else if (d.state === 'back') {
      const dx = -2.3 - d.x;
      const dz = 13.0 - d.z;
      const L = Math.hypot(dx, dz);
      if (L < 0.15) {
        d.state = 'sit';
        d.ang = Math.PI / 2;
      } else {
        d.x += (dx / L) * 1.3 * dt;
        d.z += (dz / L) * 1.3 * dt;
        d.ang += wrapA(Math.atan2(dx, dz) - d.ang) * Math.min(1, dt * 5);
      }
    }
    d.m.position.set(d.x, 0, d.z);
    d.m.rotation.y = d.ang;
    d.a2 = d.ang + (d.state === 'sit' ? Math.sin(this.time * 0.6) * 0.7 : 0);
    S.doctor.visible = true;
  }
  // görüş: 0..'vis' değeri
  seeCone(x, z, ang, cone, range, ox = 1.4) {
    const px = this.pos.x - x;
    const pz = this.pos.z - z;
    const dist = Math.hypot(px, pz);
    const da = wrapA(Math.atan2(px, pz) - ang);
    const inCone = Math.abs(da) < cone && dist < range;
    const heard = this.k.run && this.moving && dist < 5;
    const near = dist < 1.0;
    if (!inCone && !heard && !near) return 0;
    const ty = this.pos.y + (this.k.crouch ? 0.7 : 1.3);
    const dy = ty - ox;
    const L = Math.hypot(px, dy, pz) || 1;
    const hit = this.w.castRay(new RAPIER.Ray({ x, y: ox, z }, { x: px / L, y: dy / L, z: pz / L }), L, true, undefined, undefined, this.col);
    if (hit && hit.timeOfImpact < L - 0.35) return 0;
    const prox = Math.max(0.5, 1 - dist / 12);
    return (inCone ? 1 : 0) * (this.k.crouch ? 0.6 : 1) * prox * 1.4 + (heard ? 0.5 : 0) + (near ? 1.5 : 0);
  }
  detect(dt) {
    let vis = 0;
    let who = '';
    if (this.F.door && this.caught <= 0 && !this.F.end) {
      for (const e of this.en) {
        if (!e.on()) continue;
        const v = this.seeCone(e.x, e.z, e.a2, 0.5, 10);
        if (v > vis) {
          vis = v;
          who = 'g';
        }
      }
      // doktor (revirde)
      if (this.zone === 'revir') {
        const d = this.doc;
        const v = this.seeCone(d.x, d.z, d.a2, 0.5, 9, 1.35);
        if (v > vis) {
          vis = v;
          who = 'd';
        }
      }
      // projektör (avluda)
      if (this.zone === 'avlu') {
        const t = this.S.search.target.position;
        const dd = Math.hypot(this.pos.x - t.x, this.pos.z - t.z);
        if (dd < 2.4) {
          const o = this.S.search.position;
          const ty = this.pos.y + (this.k.crouch ? 0.7 : 1.3);
          const dx = this.pos.x - o.x;
          const dy = ty - o.y;
          const dz = this.pos.z - o.z;
          const L = Math.hypot(dx, dy, dz);
          const hit = this.w.castRay(new RAPIER.Ray({ x: o.x, y: o.y, z: o.z }, { x: dx / L, y: dy / L, z: dz / L }), L, true, undefined, undefined, this.col);
          if (!hit || hit.timeOfImpact > L - 0.4) {
            const v = (this.k.crouch ? 1.4 : 2.2) * (1 - dd / 3);
            if (v > vis) {
              vis = v;
              who = 's';
            }
          }
        }
      }
    }
    // çark gürültüsü
    if (this.holdId === 'wheel' && this.hold > 0) {
      const e = this.en[1];
      if (Math.hypot(this.pos.x - e.x, this.pos.z - e.z) < 7 && vis < 1.2) vis = 1.2;
    }
    this.warnCd -= dt;
    if (vis > 0) {
      this.meter = Math.min(1, this.meter + vis * dt * 0.7);
      if (this.meter > 0.45 && this.warnCd <= 0) {
        this.say(SUB.warn);
        this.warnCd = 12;
      }
      this.byWho = who;
    } else this.meter = Math.max(0, this.meter - dt * 0.45);
    if (this.meter >= 1 && this.caught <= 0) this.getCaught();
  }
  getCaught() {
    this.caught = 2.2;
    this.meter = 1;
    this.say(this.byWho === 'd' ? SUB.caughtDoctor : SUB.caught);
    tone(180, 0.5, 'sawtooth', 0.06, 90);
  }
  respawn() {
    const c = CHECK[this.zmax];
    const t = { x: c.x, y: HH + R + 0.02, z: c.z };
    this.body.setTranslation(t, true);
    this.body.setNextKinematicTranslation(t);
    this.pos.set(c.x, 0, c.z);
    this.yaw = 0;
    this.meter = 0;
    this.fade = 1;
    this.fadeTarget = 0;
    this.hold = 0;
    // düşmanları başa al
    const g1 = this.en[0];
    Object.assign(g1, { x: 0.6, z: 4.6, i: 1, wait: 2 });
    Object.assign(this.en[1], { x: -0.6, z: 15.8, i: 1, wait: 2 });
    Object.assign(this.en[2], { x: -5.5, z: 37, i: 1, wait: 2 });
    if (this.doc.state !== 'sit') Object.assign(this.doc, { state: 'back' });
  }
  // ——— ana adım ———
  step(dt) {
    this.time += dt;
    if (this.fade !== this.fadeTarget) {
      const sp = dt * 1.1;
      this.fade += Math.sign(this.fadeTarget - this.fade) * Math.min(sp, Math.abs(this.fadeTarget - this.fade));
    }
    if (this.sub && this.time - this.sub.t0 > this.sub.d) this.nextSub();
    if (this.cine) {
      this.updateCine(dt);
      this.emitHud();
      return;
    }
    this.S.t += dt;
    this.S.update(dt);
    if (this.caught > 0) {
      this.caught -= dt;
      if (this.caught <= 0) this.respawn();
    }
    const frozen = this.F.end || (this.zoneCard && this.time - this.zoneCard.t0 < 2.6);
    if (this.zoneCard && this.time - this.zoneCard.t0 >= 2.6) {
      this.zoneCard = null;
      this.cb.onZoneCard?.(null);
    }
    if (this.caught <= 0 && !frozen) this.movePlayer(dt);
    // bölge
    const z = zoneAt(this.pos.z);
    if (z !== this.zone) {
      this.zone = z;
      if (ZORD[z] > this.zmax) {
        this.zmax = ZORD[z];
        this.showZone(z);
        this.say(z === 'revir' ? SUB.zoneRevir : z === 'mutfak' ? SUB.zoneMutfak : SUB.zoneAvlu);
      }
    }
    this.lighting(dt);
    for (const e of this.en) this.stepEnemy(e, dt, false);
    this.stepDoctor(dt);
    this.stepSearch(dt);
    this.detect(dt);
    this.interact(dt);
    this.animDoors(dt);
    this.updateCamera(dt);
    this.emitHud();
  }
  stepSearch(dt) {
    const S = this.S;
    const t = this.time;
    const on = this.zone === 'avlu' && !this.F.end;
    S.search.intensity = on ? 220 : 0;
    const tx = Math.sin(t * 0.45) * 6.2;
    const tz = 32.4 + Math.sin(t * 0.3 + 1) * 4.2;
    S.search.target.position.set(tx, 0, tz);
    S.search.target.updateMatrixWorld();
  }
  lighting(dt) {
    const S = this.S;
    const z = this.zone;
    const rl = S.roomLight;
    const fog = S.scene.fog;
    let col = '#bfe8ff';
    let inten = 0;
    let range = 11;
    let fd = 0.07;
    const p = this.pos;
    if (z === 'revir') {
      rl.position.set(0, 2.6, 10.6);
      inten = 4.5;
      fd = 0.05;
      col = '#bfe8ff';
    } else if (z === 'mutfak') {
      rl.position.set(0, 2.6, 19.2);
      inten = 6;
      range = 14;
      fd = 0.05;
      col = '#ffe0a8';
    } else if (z === 'avlu') {
      rl.position.set(p.x, 7, p.z);
      inten = 48;
      range = 24;
      fd = 0.03;
      col = '#6f93c0';
    }
    rl.color.set(col);
    rl.distance = range;
    rl.intensity += (inten - rl.intensity) * Math.min(1, dt * 3);
    fog.density += (fd - fog.density) * Math.min(1, dt * 2);
    S.red.intensity = (z === 'cell' || z === 'revir' ? 1 : 0.2) * (3 + 7 * Math.max(0, Math.sin(this.time * 2.6)));
    S.rain2Lines.visible = z === 'avlu' || p.z > 21;
    if (S.rain2Lines.visible) {
      S.rain2Lines.position.set(p.x, 0, p.z);
      const r = S.rain2.pos;
      for (let i = 0; i < S.rain2.N; i++) {
        r[i * 6 + 1] -= dt * 11;
        r[i * 6 + 4] -= dt * 11;
        if (r[i * 6 + 4] < 0) {
          r[i * 6 + 1] += 4.5;
          r[i * 6 + 4] += 4.5;
        }
      }
      S.rain2Lines.geometry.attributes.position.needsUpdate = true;
    }
    // avlu açık hava: tavan yok, şimşek parıltısı
    S.scene.background.set(z === 'avlu' ? '#0a1220' : '#05070a');
  }
  movePlayer(dt) {
    const k = this.k;
    const sp = k.crouch ? 1.2 : k.run ? 4.2 : 2.4;
    let fx = k.f - k.b;
    let sx = k.r - k.l;
    const len = Math.hypot(fx, sx) || 1;
    fx /= len;
    sx /= len;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const dirX = -sin * fx - cos * sx;
    const dirZ = cos * fx - sin * sx;
    this.vy = Math.max(-12, this.vy - 9.81 * dt);
    this.cc.computeColliderMovement(this.col, { x: dirX * sp * dt, y: this.vy * dt, z: dirZ * sp * dt });
    const mv = this.cc.computedMovement();
    const t = this.body.translation();
    this.body.setNextKinematicTranslation({ x: t.x + mv.x, y: t.y + mv.y, z: t.z + mv.z });
    this.w.step();
    if (this.cc.computedGrounded()) this.vy = Math.max(this.vy, -0.5);
    const n = this.body.translation();
    this.pos.set(n.x, n.y - (HH + R), n.z);
    this.moving = Math.hypot(mv.x, mv.z) > 0.0008;
    if (this.moving) {
      this.footT -= dt;
      if (this.footT < 0) {
        this.footT = k.run ? 0.28 : k.crouch ? 0.7 : 0.45;
        tone(k.run ? 90 : 70, 0.07, 'triangle', k.run ? 0.05 : 0.02);
      }
    }
  }
  updateCamera(dt) {
    const target = this.k.crouch ? EYE_C : EYE;
    this.eye += (target - this.eye) * Math.min(1, dt * 9);
    const bob = this.moving ? Math.sin(this.time * (this.k.run ? 12 : 7)) * 0.018 : Math.sin(this.time * 1.6) * 0.006;
    const ey = this.pos.y + this.eye + bob;
    this.cam.position.set(this.pos.x, ey, this.pos.z);
    const cp = Math.cos(this.pitch);
    this.cam.lookAt(this.pos.x - Math.sin(this.yaw) * cp, ey + Math.sin(this.pitch), this.pos.z + Math.cos(this.yaw) * cp);
  }
  // ——— etkileşim ———
  facing(px, py, pz) {
    const cp = Math.cos(this.pitch);
    const fx = -Math.sin(this.yaw) * cp;
    const fy = Math.sin(this.pitch);
    const fz = Math.cos(this.yaw) * cp;
    const dx = px - this.cam.position.x;
    const dy = py - this.cam.position.y;
    const dz = pz - this.cam.position.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    return { d, dot: (dx * fx + dy * fy + dz * fz) / d };
  }
  interactables() {
    const F = this.F;
    const S = this.S;
    return [
      { id: 'spoon', p: [1.5, 0.8, 0.28], dot: 0.8, text: 'E — Kaşığı al', ok: () => !F.spoon, done: () => { F.spoon = 1; S.spoon.visible = false; S.spoonGlow.visible = false; this.say(SUB.spoon); tone(900, 0.12, 'triangle', 0.05); } },
      { id: 'lock', p: [0, 1.1, 1.6], dot: 0.6, hold: 2.6, text: 'E (basılı tut) — Mandalı zorla', ok: () => F.spoon && !F.door, start: () => this.say(SUB.lockStart), done: () => { F.door = 1; this.w.removeCollider(this.doorCol, true); this.say(SUB.open); tone(200, 0.5, 'sawtooth', 0.05, 90); } },
      { id: 'lever', p: [0.75, 1.2, 6.55], dot: 0.75, text: 'E — Acil çıkış kolunu çek', ok: () => F.door && !F.exit, done: () => { F.exit = 1; this.w.removeCollider(this.cols.exit, true); tone(120, 0.7, 'sawtooth', 0.06, 60); this.say(SUB.exit); } },
      { id: 'pipe', p: [3.6, 0.95, 8.8], dot: 0.7, text: 'E — Boruya vur (doktoru oyala)', ok: () => F.exit && !F.card && this.doc.state === 'sit' && this.pipeCd <= 0, done: () => { this.pipeCd = 10; this.doc.state = 'go'; this.say(SUB.pipe); tone(160, 0.25, 'square', 0.08, 120); } },
      { id: 'card', p: [-3.1, 0.8, 13.85], dot: 0.8, text: 'E — Anahtar kartını al', ok: () => F.exit && !F.card, done: () => { F.card = 1; S.card.visible = false; S.cardGlow.visible = false; this.say(SUB.card); tone(900, 0.12, 'triangle', 0.05); } },
      { id: 'reader', p: [1.7, 1.3, 14.15], dot: 0.75, text: 'E — Kartı okut', ok: () => F.card && !F.reader, done: () => { F.reader = 1; this.w.removeCollider(this.cols.revir, true); S.reader.material.color.set('#3aff7a'); this.say(SUB.reader); tone(700, 0.3, 'triangle', 0.06, 1000); } },
      { id: 'pliers', p: [-4.0, 0.93, 23.1], dot: 0.8, text: 'E — Kerpeteni al', ok: () => F.reader && !F.pliers, done: () => { F.pliers = 1; S.pliers.visible = false; S.pliersGlow.visible = false; this.say(SUB.pliers); tone(900, 0.12, 'triangle', 0.05); } },
      { id: 'wheel', p: [0, 1.05, 23.9], dot: 0.7, hold: 3.2, text: 'E (basılı tut) — Çarkı çevir', ok: () => F.pliers && !F.hatch, start: () => this.say(SUB.wheel), done: () => { F.hatch = 1; this.w.removeCollider(this.cols.hatch, true); this.say(SUB.hatch); tone(150, 0.7, 'sawtooth', 0.05, 70); } },
      { id: 'fence', p: [3.0, 1.2, 38.0], dot: 0.7, hold: 3, text: 'E (basılı tut) — Teli kes', ok: () => F.hatch && !F.fence, start: () => {}, done: () => { F.fence = 1; this.w.removeCollider(this.cols.fence, true); for (const b of S.fenceBars) b.visible = false; this.say(SUB.fence); tone(1100, 0.15, 'square', 0.04); } },
      { id: 'van', p: [-1.8, 1.2, 42.2], dot: 0.5, text: 'E — Kerem’le konuş', ok: () => F.fence && !F.end, done: () => this.startEnding() },
    ];
  }
  interact(dt) {
    this.prompt = '';
    this.pipeCd = Math.max(0, this.pipeCd - dt);
    const act = this.k.act;
    const edge = act && !this.actPrev;
    this.actPrev = act;
    if (this.caught > 0 || this.F.end || this.cine) return;
    if (this.F.spoon === 0) this.S.spoonGlow.intensity = 0.4 + Math.sin(this.time * 3) * 0.2;
    let hit = null;
    for (const it of this.interactables()) {
      if (!it.ok()) continue;
      const f = this.facing(...it.p);
      if (f.d < (it.id === 'fence' || it.id === 'van' ? 2.8 : 2.2) && f.dot > it.dot) {
        hit = it;
        break;
      }
    }
    if (!hit) {
      this.hold = Math.max(0, this.hold - dt * 0.8);
      return;
    }
    this.prompt = this.hold > 0 && hit.hold ? 'İşlem sürüyor…' : hit.text;
    if (hit.hold) {
      if (this.holdId !== hit.id) {
        this.holdId = hit.id;
        this.hold = 0;
      }
      if (act) {
        if (this.hold === 0) hit.start?.();
        this.hold += dt / hit.hold;
        if (Math.floor(this.time * 7) % 2 === 0) tone(1200 + Math.random() * 500, 0.03, 'square', 0.012);
        if (this.hold >= 1) {
          this.hold = 0;
          hit.done();
        }
      } else this.hold = Math.max(0, this.hold - dt * 0.8);
    } else if (edge) hit.done();
  }
  animDoors(dt) {
    const S = this.S;
    const k = Math.min(1, dt * 2.5);
    if (this.F.door) S.door.position.y += (3.0 - S.door.position.y) * k;
    if (this.F.exit) S.exitDoor.position.y += (2.5 - S.exitDoor.position.y) * k;
    if (this.F.reader) S.revirDoor.position.y += (2.5 - S.revirDoor.position.y) * k;
    if (this.F.hatch) S.hatch.position.y += (2.2 - S.hatch.position.y) * k;
    if (this.holdId === 'wheel' && this.hold > 0) S.wheel.rotation.z += dt * 4;
  }
  startEnding() {
    this.F.end = 1;
    this.subQ = [];
    this.sub = null;
    this.say(SUB.end);
    this.fadeTarget = 0;
    tone(140, 1, 'sawtooth', 0.05, 70);
    setTimeout(() => !this.dead && (this.fadeTarget = 1), 17000);
    setTimeout(() => !this.dead && this.cb.onDone?.(), 20500);
  }
  objText() {
    const F = this.F;
    if (F.end) return 'Kaçış';
    if (!F.spoon) return 'Masadaki kaşığı al';
    if (!F.door) return 'Hücre kapısının mandalını zorla';
    if (!F.exit) return 'Gardiyana yakalanmadan koridorun sonuna git, acil çıkış kolunu çek';
    if (!F.card) return this.doc.state === 'sit' ? 'Doktoru oyala: sağdaki boruya vur' : 'Doktor uzaktayken masadaki kartı al';
    if (!F.reader) return 'Kartı kapının okuyucusuna okut';
    if (!F.pliers) return 'Mutfakta gardiyandan saklanarak kerpeteni bul (uzak köşe)';
    if (!F.hatch) return 'Havalandırma kapağının çarkını çevir';
    if (!F.fence) return 'Projektörden saklanarak çite ulaş ve teli kes';
    return 'Minibüse git, Kerem’le konuş';
  }
  emitHud() {
    this.cb.onHud?.({ obj: this.objText(), meter: this.meter, prompt: this.prompt, lock: this.hold, crouch: this.k.crouch, caught: this.caught > 0, fade: this.fade, cine: !!this.cine });
  }
  stepFrames(n, dt = 1 / 60) {
    for (let i = 0; i < n; i++) this.step(dt);
    this.S.render();
  }
}
