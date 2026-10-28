import * as THREE from 'three';

const RADIUS = 0.35;
const EYE = 1.65;
const EYE_CROUCH = 1.0;

export class Player {
  constructor(camera, world, scene) {
    this.camera = camera;
    this.world = world;
    this.pos = new THREE.Vector3(-1, 0, 64.5);
    this.yaw = 0; // 0 = kuzeye (-Z) bakar
    this.pitch = 0;
    this.vel = new THREE.Vector3();
    this.keys = new Set();
    this.crouch = false;
    this.sprinting = false;
    this.stamina = 1;
    this.exhausted = false;
    this.lanternOn = true;
    this.hidden = null; // saklanma noktası
    this.eye = EYE;
    this.bob = 0;
    this.stepAcc = 0;
    this.noise = 0; // 0 sessiz, 1 yürüme, 2 koşma
    this.speed = 0;
    this.sensitivity = 0.0022;
    this.frozen = false;
    this.onStep = null;
    this.shake = 0;

    // El feneri: gaz lambası (kafes, cam, alev)
    this.lantern = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x1c1814, metalness: 0.8, roughness: 0.4 });
    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0xffc070, emissive: 0xff8a30, emissiveIntensity: 0.35, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false,
    });
    this.flameMat = new THREE.MeshBasicMaterial({ color: 0xffc070 });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.1, 14), this.glassMat);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 8), this.flameMat);
    flame.position.y = -0.01;
    this.flame = flame;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.045, 14), metal);
    base.position.y = -0.072;
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.045, 14), metal);
    top.position.y = 0.072;
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8), metal);
    chim.position.y = 0.105;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.0045, 6, 16, Math.PI), metal);
    handle.position.y = 0.11;
    this.lantern.add(glass, flame, base, top, chim, handle);
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 4), metal);
      const a = (i / 4) * Math.PI * 2 + 0.4;
      bar.position.set(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05);
      this.lantern.add(bar);
    }
    this.lantern.traverse((o) => (o.renderOrder = 5));
    this.light = new THREE.PointLight(0xffa860, 5.5, 16, 1.6);
    this.light.position.set(0, 0.02, 0);
    this.light.castShadow = false;
    this.lantern.add(this.light);
    this.lanternBase = new THREE.Vector3(0.3, -0.34, -0.56);
    this.lantern.position.copy(this.lanternBase);
    camera.add(this.lantern);
    scene.add(camera);

    this._tmp = new THREE.Vector3();
  }

  setSpawn(x, z, yaw) {
    this.pos.set(x, this.world.heightAt(x, z), z);
    this.yaw = yaw;
    this.pitch = 0;
    this.vel.set(0, 0, 0);
    this.hidden = null;
    this.stamina = 1;
    this.crouch = false;
  }

  look(dx, dy) {
    this.yaw -= dx * this.sensitivity;
    this.pitch -= dy * this.sensitivity;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    if (this.hidden) {
      // saklanırken bakış sınırlı
      let d = this.yaw - this.hidden.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const lim = this.hidden.kind === 'saman' ? Math.PI : 0.75;
      d = Math.max(-lim, Math.min(lim, d));
      this.yaw = this.hidden.yaw + d;
      this.pitch = Math.max(-0.5, Math.min(0.4, this.pitch));
    }
  }

  toggleLantern() {
    this.lanternOn = !this.lanternOn;
  }

  hide(spot) {
    this.hidden = spot;
    this.preHide = this.pos.clone();
    this.yaw = spot.yaw;
    this.pitch = 0;
    this.vel.set(0, 0, 0);
  }

  unhide() {
    const s = this.hidden;
    if (!s) return;
    this.hidden = null;
    if (s.exit) this.pos.set(s.exit.x, 0, s.exit.z);
    else {
      // samandan, bakılan yöne doğru çık
      const dir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      let placed = false;
      for (let k = 0; k < 8 && !placed; k++) {
        const a = Math.atan2(dir.x, dir.z) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.6;
        const x = s.inside.x + Math.sin(a) * (s.radius + 0.5);
        const z = s.inside.z + Math.cos(a) * (s.radius + 0.5);
        if (!this.collidesAt(x, z) && this.world.inBounds(x, z)) {
          this.pos.set(x, 0, z);
          placed = true;
        }
      }
      if (!placed) this.pos.copy(this.preHide);
    }
  }

  collidesAt(x, z) {
    for (const c of this.world.colliders) {
      const cx = Math.max(c.minX, Math.min(x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
      if ((x - cx) ** 2 + (z - cz) ** 2 < RADIUS * RADIUS) return true;
    }
    return false;
  }

  resolve(p) {
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const c of this.world.colliders) {
        if (p.x < c.minX - RADIUS || p.x > c.maxX + RADIUS || p.z < c.minZ - RADIUS || p.z > c.maxZ + RADIUS) continue;
        const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
        let dx = p.x - cx, dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 < 1e-8) {
          // merkez kutunun içinde: en kısa eksenden dışarı it
          const pens = [
            [p.x - c.minX + RADIUS, -1, 0], [c.maxX - p.x + RADIUS, 1, 0],
            [p.z - c.minZ + RADIUS, 0, -1], [c.maxZ - p.z + RADIUS, 0, 1],
          ].sort((a, b) => a[0] - b[0]);
          p.x += pens[0][1] * pens[0][0];
          p.z += pens[0][2] * pens[0][0];
        } else {
          const d = Math.sqrt(d2);
          const push = RADIUS - d;
          p.x += (dx / d) * push;
          p.z += (dz / d) * push;
        }
        moved = true;
      }
      if (!moved) break;
    }
  }

  update(dt, t) {
    const cam = this.camera;
    if (this.hidden) {
      this.noise = 0;
      this.speed = 0;
      const s = this.hidden;
      cam.position.lerp(s.inside, Math.min(1, dt * 8));
      cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      this.updateLantern(dt, t, 0);
      return;
    }

    const k = this.keys;
    let fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let str = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    // dokunmatik joystick (analog, -1..1)
    const tm = this.touchMove;
    let analog = 1;
    if (tm && (Math.abs(tm.x) > 0.08 || Math.abs(tm.y) > 0.08)) {
      fwd = -tm.y;
      str = tm.x;
      analog = Math.min(1, Math.hypot(tm.x, tm.y));
    }
    const wantsSprint = (k.has('ShiftLeft') || k.has('ShiftRight')) && fwd > 0.3 && !this.crouch;
    this.crouch = k.has('KeyC') || k.has('ControlLeft');

    if (this.exhausted && this.stamina > 0.35) this.exhausted = false;
    this.sprinting = wantsSprint && !this.exhausted && !this.frozen;
    if (this.sprinting) {
      this.stamina -= dt * 0.2;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.exhausted = true;
      }
    } else this.stamina = Math.min(1, this.stamina + dt * (this.crouch ? 0.2 : 0.13));

    let target = this.crouch ? 1.55 : this.sprinting ? 5.6 : 2.9;
    if (this.slowFactor) target *= this.slowFactor;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wish = this._tmp.set(-sin * fwd + cos * str, 0, -cos * fwd - sin * str);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(target * (this.sprinting ? 1 : Math.max(0.35, analog)));
    if (this.frozen) wish.set(0, 0, 0);
    const accel = wish.lengthSq() > 0 ? 10 : 12;
    this.vel.x += (wish.x - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (wish.z - this.vel.z) * Math.min(1, accel * dt);

    const old = this.pos.clone();
    const next = this.pos.clone().addScaledVector(this.vel, dt);
    this.resolve(next);
    if (!this.world.inBounds(next.x, next.z)) {
      // eksen eksen dene (duvar boyunca kayma)
      const tx = new THREE.Vector3(next.x, 0, old.z);
      const tz = new THREE.Vector3(old.x, 0, next.z);
      if (this.world.inBounds(tx.x, tx.z)) next.copy(tx);
      else if (this.world.inBounds(tz.x, tz.z)) next.copy(tz);
      else next.copy(old);
      this.resolve(next);
    }
    next.y = this.world.heightAt(next.x, next.z);
    this.pos.copy(next);

    const moved = Math.hypot(this.pos.x - old.x, this.pos.z - old.z);
    this.speed = moved / Math.max(dt, 1e-4);
    const moving = this.speed > 0.4;
    this.noise = !moving ? 0 : this.sprinting ? 2 : this.crouch ? 0 : 1;

    // adım sesleri ve kafa sallantısı
    if (moving) {
      this.bob += moved * (this.sprinting ? 2.4 : 2.9);
      this.stepAcc += moved;
      const stride = this.sprinting ? 2.0 : this.crouch ? 1.0 : 1.45;
      if (this.stepAcc > stride) {
        this.stepAcc = 0;
        this.onStep && this.onStep(this.sprinting ? 2 : this.crouch ? 0 : 1);
      }
    }
    const targetEye = this.crouch ? EYE_CROUCH : EYE;
    this.eye += (targetEye - this.eye) * Math.min(1, dt * 9);
    const bobAmt = moving ? (this.sprinting ? 0.06 : this.crouch ? 0.02 : 0.035) : 0;
    const by = Math.abs(Math.sin(this.bob)) * bobAmt;
    const bx = Math.cos(this.bob) * bobAmt * 0.6;

    this.shake = Math.max(0, this.shake - dt * 1.5);
    const sh = this.shake * 0.04;
    cam.position.set(
      this.pos.x + cos * bx + (Math.random() - 0.5) * sh,
      this.pos.y + this.eye + by + (Math.random() - 0.5) * sh,
      this.pos.z - sin * bx
    );
    cam.rotation.set(this.pitch + (Math.random() - 0.5) * sh * 0.5, this.yaw, 0, 'YXZ');
    this.updateLantern(dt, t, moving ? 1 : 0);
  }

  updateLantern(dt, t, moving) {
    const on = this.lanternOn;
    const flick = 0.85 + Math.sin(t * 17) * 0.05 + Math.sin(t * 7.3) * 0.06 + (Math.random() - 0.5) * 0.08;
    const target = on ? 5.5 * flick * (this.flickerMul ?? 1) : 0;
    this.light.intensity += (target - this.light.intensity) * Math.min(1, dt * 20);
    this.glassMat.emissiveIntensity = on ? 0.35 * flick * (this.flickerMul ?? 1) : 0;
    this.flame.visible = on;
    this.flame.scale.set(1, 0.85 + flick * 0.3, 1);
    const sway = Math.sin(this.bob) * 0.012 * moving;
    this.lantern.position.set(
      this.lanternBase.x + sway,
      this.lanternBase.y + Math.abs(Math.cos(this.bob)) * 0.01 * moving + Math.sin(t * 1.3) * 0.003,
      this.lanternBase.z
    );
    this.lantern.rotation.z = sway * 4;
    this.lantern.visible = !this.hidden;
  }

  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }
}
