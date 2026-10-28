import * as THREE from 'three';

// Birinci şahıs oyuncu: hareket, zıplama, çömelme, koşma, çarpışma, sağlık, fener.
const RADIUS = 0.36;
const EYE = 1.64;
const EYE_CROUCH = 1.08;

export class Player {
  constructor(camera, world, scene) {
    this.camera = camera;
    this.world = world; // CollisionWorld
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.crouch = false;
    this.sprinting = false;
    this.eye = EYE;
    this.bob = 0;
    this.stepAcc = 0;
    this.speed = 0;
    this.noise = 0; // 0 sessiz, 1 yürüme, 2 koşma
    this.health = 100;
    this.lastHit = -99;
    this.dead = false;
    this.sensitivity = 0.0022;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.lookDelta = { x: 0, y: 0 };
    this.frozen = false;
    this.onStep = null;
    this.zoomSens = 1;

    // Fener: tüfeğe takılı, kameraya bağlı spot ışık
    this.lamp = new THREE.SpotLight(0xfff1dc, 0, 55, 0.38, 0.55, 1.2);
    this.lamp.position.set(0.15, -0.12, 0);
    this.lamp.target.position.set(0.05, -0.05, -10);
    camera.add(this.lamp, this.lamp.target);
    this.lampOn = false;
    scene.add(camera);
    this.tmp = new THREE.Vector3();
  }

  spawn(x, z, yaw = 0) {
    this.pos.set(x, this.world.groundAt(x, z, 100), z);
    this.yaw = yaw;
    this.pitch = 0;
    this.vel.set(0, 0, 0);
    this.vy = 0;
    this.health = 100;
    this.dead = false;
    this.crouch = false;
  }

  look(dx, dy) {
    const s = this.sensitivity * this.zoomSens;
    this.yaw -= dx * s;
    this.pitch -= dy * s;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    this.lookDelta.x += dx;
    this.lookDelta.y += dy;
  }

  addRecoil(p, y) {
    this.recoilPitch += p;
    this.recoilYaw += y;
  }

  toggleLamp() {
    this.lampOn = !this.lampOn;
    return this.lampOn;
  }

  damage(amount, now) {
    if (this.dead) return;
    this.health -= amount;
    this.lastHit = now;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }

  update(dt, now, { aiming = false, canSprint = true } = {}) {
    const k = this.keys;
    // geri tepme: hızlı yukarı, yavaş geri dönüş
    const rp = this.recoilPitch * Math.min(1, dt * 18);
    this.pitch = Math.min(1.45, this.pitch + rp);
    this.recoilPitch -= rp;
    const ry = this.recoilYaw * Math.min(1, dt * 18);
    this.yaw += ry;
    this.recoilYaw -= ry;

    if (!this.dead && now - this.lastHit > 5) this.health = Math.min(100, this.health + dt * 14);

    let fwd = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
    let str = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    // dokunmatik joystick (analog)
    let analog = 1;
    const tm = this.touchMove;
    if (tm && Math.hypot(tm.x, tm.y) > 0.08) {
      fwd = -tm.y;
      str = tm.x;
      analog = Math.min(1, Math.hypot(tm.x, tm.y));
    }
    if (this.frozen || this.dead) fwd = str = 0;
    const wantCrouch = k.has('KeyC') || k.has('ControlLeft');
    if (wantCrouch !== this.crouch) {
      // ayağa kalkarken başın üstü boş mu?
      if (!wantCrouch) {
        let blocked = false;
        for (const b of this.world.near(this.pos.x, this.pos.z, 1))
          if (b.solid && this.pos.x > b.minX - RADIUS && this.pos.x < b.maxX + RADIUS && this.pos.z > b.minZ - RADIUS && this.pos.z < b.maxZ + RADIUS && b.minY > this.pos.y + 1.0 && b.minY < this.pos.y + 1.8) blocked = true;
        if (!blocked) this.crouch = false;
      } else this.crouch = true;
    }
    this.sprinting = (k.has('ShiftLeft') || k.has('ShiftRight')) && fwd > 0.3 && !this.crouch && !aiming && canSprint;
    let target = this.crouch ? 1.7 : this.sprinting ? 6.2 : 3.4;
    if (aiming) target *= 0.55;

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wish = this.tmp.set(-sin * fwd + cos * str, 0, -cos * fwd - sin * str);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(target * (this.sprinting ? 1 : Math.max(0.35, analog)));
    const accel = this.onGround ? (wish.lengthSq() > 0 ? 11 : 13) : 2;
    this.vel.x += (wish.x - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (wish.z - this.vel.z) * Math.min(1, accel * dt);

    // zıplama
    if (k.has('Space') && this.onGround && !this.crouch && !this.frozen && !this.dead) {
      this.vy = 4.4;
      this.onGround = false;
    }

    const old = this.pos.clone();
    const next = this.pos.clone();
    next.x += this.vel.x * dt;
    next.z += this.vel.z * dt;
    this.world.resolveCircle(next, RADIUS, this.pos.y, this.crouch ? 1.15 : 1.75);
    // harita sınırı
    const lim = this.bounds;
    if (lim) {
      next.x = Math.max(lim.minX, Math.min(lim.maxX, next.x));
      next.z = Math.max(lim.minZ, Math.min(lim.maxZ, next.z));
    }
    // çok dik yamaca tırmanmayı engelle
    const gNext = this.world.groundAt(next.x, next.z, this.pos.y, RADIUS);
    const rise = gNext - this.pos.y;
    const horiz = Math.hypot(next.x - old.x, next.z - old.z);
    if (this.onGround && rise > 0.5 && rise > horiz * 1.6) {
      next.x = old.x;
      next.z = old.z;
    }
    // dikey
    this.vy -= 13 * dt;
    let y = this.pos.y + this.vy * dt;
    const ground = this.world.groundAt(next.x, next.z, Math.max(y, this.pos.y), RADIUS);
    if (y <= ground + 0.02 || (this.onGround && y - ground < 0.35 && this.vy <= 0)) {
      y = ground;
      this.vy = 0;
      this.onGround = true;
    } else this.onGround = false;
    next.y = y;
    this.pos.copy(next);

    const moved = Math.hypot(this.pos.x - old.x, this.pos.z - old.z);
    this.speed = moved / Math.max(dt, 1e-5);
    const moving = this.speed > 0.4 && this.onGround;
    this.noise = !moving ? 0 : this.sprinting ? 2 : this.crouch ? 0 : 1;
    if (moving) {
      this.bob += moved * (this.sprinting ? 2.2 : 2.7);
      this.stepAcc += moved;
      const stride = this.sprinting ? 2.1 : this.crouch ? 1.1 : 1.55;
      if (this.stepAcc > stride) {
        this.stepAcc = 0;
        this.onStep && this.onStep(this.sprinting ? 2 : this.crouch ? 0 : 1);
      }
    }
    const targetEye = this.dead ? 0.35 : this.crouch ? EYE_CROUCH : EYE;
    this.eye += (targetEye - this.eye) * Math.min(1, dt * 10);
    const bobAmt = moving ? (this.sprinting ? 0.055 : this.crouch ? 0.02 : 0.032) * (aiming ? 0.3 : 1) : 0;
    const by = Math.abs(Math.sin(this.bob)) * bobAmt;
    const bx = Math.cos(this.bob) * bobAmt * 0.5;
    const cam = this.camera;
    cam.position.set(this.pos.x + cos * bx, this.pos.y + this.eye + by, this.pos.z - sin * bx);
    cam.rotation.set(this.pitch, this.yaw, this.dead ? 0.6 : 0, 'YXZ');
    this.lamp.intensity += ((this.lampOn ? 60 : 0) - this.lamp.intensity) * Math.min(1, dt * 25);
    this.moving = moving;
  }

  // Düşmanların hedef aldığı noktalar
  chestPos(out = new THREE.Vector3()) {
    return out.set(this.pos.x, this.pos.y + (this.crouch ? 0.85 : 1.3), this.pos.z);
  }
  headPos(out = new THREE.Vector3()) {
    return out.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
  }
}
