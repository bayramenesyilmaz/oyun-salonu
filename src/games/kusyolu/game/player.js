import * as THREE from 'three';

// Birinci şahıs denetleyici: yürüme/koşma, baş sallanması, kutu çarpışmaları, zemine oturma.
export class Player {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.vel = new THREE.Vector3();
    this.eye = 1.68;
    this.radius = 0.3;
    this.bob = 0;
    this.stepAcc = 0;
    this.input = { f: 0, s: 0, run: false };
    this.locked = false; // sinematiklerde kontrol kapalı
    this.colliders = [];
    this.groundFn = null; // (x, z) => y
    this.floorY = 0;
    this.shake = 0;
    this.onStep = null;
    this.lookOverride = null; // {target: Vector3, w}
  }
  place(p, yawDeg = 0) {
    this.pos.set(p[0], p[1], p[2]);
    this.floorY = p[1];
    this.yaw = THREE.MathUtils.degToRad(yawDeg);
    this.pitch = 0;
  }
  look(dx, dy) {
    if (this.locked) return;
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy, -1.35, 1.35);
  }
  collide() {
    const p = this.pos, r = this.radius;
    for (const c of this.colliders) {
      const [cx, cy, cz] = c.c, [hx, hy, hz] = c.h;
      if (p.y + 1.6 < cy - hy || p.y + 0.25 > cy + hy) continue;
      const dx = p.x - THREE.MathUtils.clamp(p.x, cx - hx, cx + hx);
      const dz = p.z - THREE.MathUtils.clamp(p.z, cz - hz, cz + hz);
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          p.x += (dx / d) * (r - d);
          p.z += (dz / d) * (r - d);
        } else {
          // merkez kutunun içinde: en yakın kenardan dışarı it
          const ox = hx - Math.abs(p.x - cx) + r, oz = hz - Math.abs(p.z - cz) + r;
          if (ox < oz) p.x += Math.sign(p.x - cx || 1) * ox;
          else p.z += Math.sign(p.z - cz || 1) * oz;
        }
      }
    }
  }
  update(dt, t) {
    const sp = this.input.run ? 4.6 : 2.3;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const want = new THREE.Vector3();
    if (!this.locked) want.addScaledVector(fwd, this.input.f).addScaledVector(right, this.input.s);
    if (want.lengthSq() > 1) want.normalize();
    want.multiplyScalar(sp);
    this.vel.lerp(want, 1 - Math.exp(-dt * 10));
    this.pos.addScaledVector(this.vel, dt);
    for (let i = 0; i < 2; i++) this.collide();
    const gy = this.groundFn ? this.groundFn(this.pos.x, this.pos.z) : this.floorY;
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 14);
    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.bob += speed * dt * (this.input.run ? 1.55 : 1.9);
    this.stepAcc += speed * dt;
    const stride = this.input.run ? 1.35 : 0.8;
    if (this.stepAcc > stride) {
      this.stepAcc = 0;
      this.onStep && this.onStep(this.input.run);
    }
    const bobA = Math.min(1, speed / 2.3);
    const by = Math.sin(this.bob * 2) * 0.035 * bobA;
    const bx = Math.cos(this.bob) * 0.025 * bobA;
    // nefes
    const br = Math.sin(t * 1.4) * 0.006;
    this.shake = Math.max(0, this.shake - dt * 0.8);
    const sh = this.shake * this.shake;
    const c = this.camera;
    c.position.set(this.pos.x + right.x * bx + (Math.random() - 0.5) * sh * 0.12, this.pos.y + this.eye + by + br + (Math.random() - 0.5) * sh * 0.1, this.pos.z + right.z * bx);
    let yaw = this.yaw, pitch = this.pitch;
    if (this.lookOverride && this.lookOverride.w > 0) {
      const d = this.lookOverride.target.clone().sub(c.position);
      const ty = Math.atan2(-d.x, -d.z);
      const tp = Math.atan2(d.y, Math.hypot(d.x, d.z));
      let dy = ty - yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      const w = this.lookOverride.w;
      yaw += dy * w;
      pitch += (tp - pitch) * w;
      if (this.lookOverride.commit) {
        this.yaw = yaw;
        this.pitch = pitch;
      }
    }
    c.rotation.set(pitch + (Math.random() - 0.5) * sh * 0.02, yaw, Math.sin(this.bob) * 0.004 * bobA, 'YXZ');
  }
  forward() {
    const v = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    return v;
  }
}
