import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { CellScene } from '../scene/cell.js';
import { SUB, OBJ } from './story.js';

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
    this.yaw = 0; // 0: +z yönüne bak
    this.pitch = 0;
    this.pos = new THREE.Vector3(0.2, 0, -1.0);
    this.vy = 0;
    this.eye = EYE;
    this.time = 0;
    this.obj = 0;
    this.hasSpoon = false;
    this.lock = 0;
    this.doorOpen = false;
    this.exited = false;
    this.meter = 0;
    this.caught = 0;
    this.sub = null;
    this.subQ = [];
    this.warnCd = 0;
    this.prompt = '';
    this.paused = false;
    this.dead = false;
    this.footT = 0;
    this.gp = { i: 0, wait: 0, x: 0.6, z: 4.3, ang: Math.PI, scan: 0 };
    this.path = [[0.9, 3.2], [-0.1, 5.0], [-0.9, 6.1], [0.9, 6.1], [0.1, 4.6]];
    this.cc = this.w.createCharacterController(0.01);
    this.cc.enableAutostep(0.3, 0.1, true);
    this.cc.enableSnapToGround(0.2);
    this.body = this.w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, HH + R + 0.02, this.pos.z));
    this.col = this.w.createCollider(RAPIER.ColliderDesc.capsule(HH, R), this.body);
    this.say(SUB.intro);
    this.emitHud();
    this._kd = (e) => this.onKey(e, true);
    this._ku = (e) => this.onKey(e, false);
    this._mm = (e) => {
      if (document.pointerLockElement === this.cv) this.look(e.movementX, e.movementY);
    };
    this._pl = () => {
      if (document.pointerLockElement !== this.cv && !this.dead && !this.paused && this.started) this.cb.onPause?.();
    };
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    document.addEventListener('mousemove', this._mm);
    document.addEventListener('pointerlockchange', this._pl);
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
    const add = (x, y, z, hx, hy, hz) => this.w.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z));
    add(0, -0.1, 2.2, 2.1, 0.1, 4.5); // zemin
    add(0, 3.0, 2.2, 2.1, 0.1, 4.5); // tavan
    add(-2.1, 1.45, 2.2, 0.1, 1.55, 4.5); // sol
    add(2.1, 1.45, -0.1, 0.1, 1.55, 2.1); // sağ (oda)
    add(2.1, 1.45, 4.1, 0.1, 1.55, 2.3); // sağ (koridor)
    add(0, 1.45, -1.7, 2.1, 1.55, 0.1); // arka
    add(0, 1.45, 6.8, 2.1, 1.55, 0.1); // koridor sonu
    add(-1.5, 0.3, -0.7, 0.45, 0.3, 0.98); // ranza alt
    add(-1.5, 1.45, -0.7, 0.45, 0.04, 0.98); // ranza üst
    add(1.7, 0.2, -1.4, 0.2, 0.2, 0.25); // tuvalet
    add(1.4, 0.75, 0.2, 0.4, 0.03, 0.25); // masa üstü
    for (const [x, z] of [[1.05, 0.0], [1.75, 0.0], [1.05, 0.4], [1.75, 0.4]]) add(x, 0.37, z, 0.03, 0.37, 0.03);
    for (const [x, z] of this.S.pillars) add(x, 1.5, z, 0.275, 1.5, 0.275);
    this.doorCol = add(0, 1.4, 1.6, 1.9, 1.5, 0.09);
  }
  look(dx, dy) {
    this.yaw -= dx * 0.0024;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - dy * 0.0024));
  }
  onKey(e, down) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const m = { w: 'f', ArrowUp: 'f', s: 'b', ArrowDown: 'b', a: 'l', ArrowLeft: 'l', d: 'r', ArrowRight: 'r', Shift: 'run', c: 'crouch', Control: 'crouch', e: 'act', f: 'act' };
    if (k === 'Escape' && down) return this.cb.onPause?.();
    const a = m[k];
    if (!a) return;
    e.preventDefault();
    this.k[a] = down ? 1 : 0;
  }
  touch(a, v) {
    this.k[a] = v;
  }
  say(lines) {
    this.subQ.push(...lines.map((l) => ({ ...l })));
    if (!this.sub) this.nextSub();
  }
  nextSub() {
    this.sub = this.subQ.shift() || null;
    if (this.sub) this.sub.t0 = this.time;
    this.cb.onSub?.(this.sub);
  }
  emitHud() {
    this.cb.onHud?.({ obj: this.exited ? 'Bölüm tamam' : OBJ[this.obj], meter: this.meter, prompt: this.prompt, lock: this.lock, crouch: this.k.crouch, caught: this.caught > 0 });
  }
  setObj(i) {
    this.obj = i;
    tone(520, 0.2, 'triangle', 0.04, 780);
  }
  step(dt) {
    this.time += dt;
    this.S.t += dt;
    this.S.update(dt);
    if (this.sub && this.time - this.sub.t0 > this.sub.d) this.nextSub();
    if (this.caught > 0) {
      this.caught -= dt;
      if (this.caught <= 0) this.respawn();
    }
    if (!this.exited && this.caught <= 0) this.movePlayer(dt);
    this.guardAI(dt);
    this.interact(dt);
    this.updateCamera(dt);
    this.emitHud();
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
  // ——— gardiyan ———
  guardAI(dt) {
    const g = this.gp;
    const G = this.S.guard;
    if (this.caught <= 0 && !this.exited) {
      if (g.wait > 0) {
        g.wait -= dt;
      } else {
        const [tx, tz] = this.path[g.i];
        const dx = tx - g.x;
        const dz = tz - g.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.15) {
          g.i = (g.i + 1) % this.path.length;
          g.wait = 2.2;
        } else {
          const sp = 0.95;
          g.x += (dx / d) * sp * dt;
          g.z += (dz / d) * sp * dt;
          const want = Math.atan2(dx, dz);
          let da = want - g.ang;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          g.ang += da * Math.min(1, dt * 4);
        }
      }
    }
    const ang = g.ang + Math.sin(this.time * 0.9) * 0.55;
    G.position.set(g.x, 0, g.z);
    G.rotation.y = g.ang;
    const fdx = Math.sin(ang);
    const fdz = Math.cos(ang);
    this.S.torch.position.set(g.x + fdx * 0.25, 1.3, g.z + fdz * 0.25);
    this.S.torch.target.position.set(g.x + fdx * 5, 0.6, g.z + fdz * 5);
    this.S.torch.target.updateMatrixWorld();
    if (!this.doorOpen || this.caught > 0 || this.exited) {
      this.meter = Math.max(0, this.meter - dt * 0.6);
      return;
    }
    const px = this.pos.x - g.x;
    const pz = this.pos.z - g.z;
    const dist = Math.hypot(px, pz);
    let da = Math.atan2(px, pz) - ang;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    let vis = 0;
    const inCone = Math.abs(da) < 0.5 && dist < 10;
    const heard = this.k.run && this.moving && dist < 5;
    if (inCone || heard || dist < 1.0) {
      const ty = this.pos.y + (this.k.crouch ? 0.7 : 1.3);
      const dy = ty - 1.4;
      const L = Math.hypot(px, dy, pz) || 1;
      const hit = this.w.castRay(new RAPIER.Ray({ x: g.x, y: 1.4, z: g.z }, { x: px / L, y: dy / L, z: pz / L }), L, true, undefined, undefined, this.col);
      const clear = !hit || hit.timeOfImpact > L - 0.35;
      if (clear) {
        const prox = Math.max(0.5, 1 - dist / 12);
        vis = (inCone ? 1 : 0) * (this.k.crouch ? 0.6 : 1) * prox * 1.4 + (heard ? 0.5 : 0) + (dist < 1.0 ? 1.5 : 0);
      }
    }
    this.warnCd -= dt;
    if (vis > 0) {
      this.meter = Math.min(1, this.meter + vis * dt * 0.7);
      if (this.meter > 0.45 && this.warnCd <= 0) {
        this.say(SUB.warn);
        this.warnCd = 12;
      }
    } else this.meter = Math.max(0, this.meter - dt * 0.45);
    if (this.meter >= 1) this.getCaught();
  }
  getCaught() {
    this.caught = 2.2;
    this.meter = 1;
    this.say(SUB.caught);
    tone(180, 0.5, 'sawtooth', 0.06, 90);
  }
  respawn() {
    const t = { x: 0.2, y: HH + R + 0.02, z: 2.4 };
    this.body.setTranslation(t, true);
    this.body.setNextKinematicTranslation(t);
    this.pos.set(t.x, 0, t.z);
    this.yaw = 0;
    this.meter = 0;
    this.gp.x = 0.6;
    this.gp.z = 4.6;
    this.gp.i = 1;
    this.gp.wait = 2;
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
  interact(dt) {
    this.prompt = '';
    const act = this.k.act;
    if (this.exited || this.caught > 0) return;
    if (!this.hasSpoon) {
      const f = this.facing(1.5, 0.8, 0.28);
      this.S.spoonGlow.intensity = 0.4 + Math.sin(this.time * 3) * 0.2;
      if (f.d < 2.2 && f.dot > 0.8) {
        this.prompt = 'E — Kaşığı al';
        if (act) {
          this.hasSpoon = true;
          this.S.spoon.visible = false;
          this.S.spoonGlow.visible = false;
          this.setObj(1);
          this.say(SUB.spoon);
          tone(900, 0.12, 'triangle', 0.05);
        }
      }
    }
    if (this.hasSpoon && !this.doorOpen) {
      const f = this.facing(0, 1.1, 1.6);
      if (f.d < 2.2 && f.dot > 0.6) {
        this.prompt = this.lock > 0 ? 'Kilit zorlanıyor…' : 'E (basılı tut) — Mandalı zorla';
        if (act) {
          if (this.lock === 0) this.say(SUB.lockStart);
          this.lock += dt / 2.6;
          if (Math.floor(this.time * 7) % 2 === 0) tone(1400 + Math.random() * 400, 0.03, 'square', 0.015);
          if (this.lock >= 1) {
            this.doorOpen = true;
            this.lock = 1;
            this.w.removeCollider(this.doorCol, true);
            this.setObj(2);
            this.say(SUB.open);
            tone(200, 0.5, 'sawtooth', 0.05, 90);
          }
        } else this.lock = Math.max(0, this.lock - dt * 0.8);
      } else this.lock = Math.max(0, this.lock - dt * 0.8);
    }
    if (this.doorOpen) {
      this.S.door.position.y += (3.0 - this.S.door.position.y) * Math.min(1, dt * 2.5);
      if (this.pos.z > 5.0 && this.obj < 3) this.setObj(3);
      const f = this.facing(0.75, 1.2, 6.55);
      if (f.d < 2.2 && f.dot > 0.75) {
        this.prompt = 'E — Acil çıkış kolunu çek';
        if (act) {
          this.exited = true;
          this.say(SUB.exit);
          tone(120, 0.7, 'sawtooth', 0.06, 60);
          setTimeout(() => !this.dead && this.cb.onDone?.(), 9000);
        }
      }
    }
  }
  stepFrames(n, dt = 1 / 60) {
    for (let i = 0; i < n; i++) this.step(dt);
    this.S.render();
  }
}
