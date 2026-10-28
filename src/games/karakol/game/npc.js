import * as THREE from 'three';
import { createHumanoid } from './characters.js';

// Tüm yapay zekâ karakterlerinin ortak tabanı: hareket, yön, çarpışma, görüş.
export class Npc {
  constructor(game, kind, { x, z, yaw = 0, health = 100, gltf = null }) {
    this.game = game;
    this.kind = kind;
    this.body = createHumanoid(kind, game.T, gltf);
    this.root = this.body.root;
    this.root.position.set(x, game.world.groundAt(x, z, 100), z);
    this.yaw = yaw;
    this.root.rotation.y = yaw;
    game.scene.add(this.root);
    this.health = this.maxHealth = health;
    this.radius = 0.35;
    this.speed = 0;
    this.crouch = false;
    this.aim = false;
    this.firing = false;
    this.cower = false;
    this.down = false;
    this.stuckT = 0;
    this.lastPos = new THREE.Vector3(x, 0, z);
    this.tmp = new THREE.Vector3();
    this.stepAcc = 0;
  }

  get pos() {
    return this.root.position;
  }

  get alive() {
    return this.health > 0;
  }

  dist2D(p) {
    return Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
  }

  turnTo(yaw, dt, rate = 8) {
    let d = yaw - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * rate);
    this.root.rotation.y = this.yaw;
  }

  faceTo(p, dt, rate = 8) {
    this.turnTo(Math.atan2(p.x - this.pos.x, p.z - this.pos.z), dt, rate);
  }

  // Seviyenin kapı/geçit bilgisini kullanarak hedefe yürü (karakol duvarı gibi engeller)
  navTo(target, dt, speed, arrive = 0.6) {
    const via = this.game.level.navVia ? this.game.level.navVia(this.pos, target) : null;
    if (via) {
      this.moveTo(via, dt, speed, 0.8);
      return false;
    }
    return this.moveTo(target, dt, speed, arrive);
  }

  // Hedefe doğru yürü/koş. Varınca true
  moveTo(target, dt, speed, arrive = 0.6) {
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < arrive) {
      this.speed = 0;
      return true;
    }
    const step = Math.min(d, speed * dt);
    const nx = this.pos.x + (dx / d) * step, nz = this.pos.z + (dz / d) * step;
    const p = this.tmp.set(nx, this.pos.y, nz);
    // diğer karakterlerden kaçın
    for (const o of this.game.allNpcs) {
      if (o === this || !o.alive) continue;
      const ox = p.x - o.pos.x, oz = p.z - o.pos.z;
      const od = Math.hypot(ox, oz);
      if (od < 0.7 && od > 0.001) {
        p.x += (ox / od) * (0.7 - od) * 0.5;
        p.z += (oz / od) * (0.7 - od) * 0.5;
      }
    }
    this.game.world.resolveCircle(p, this.radius, this.pos.y, 1.7);
    const lim = this.game.bounds;
    p.x = Math.max(lim.minX, Math.min(lim.maxX, p.x));
    p.z = Math.max(lim.minZ, Math.min(lim.maxZ, p.z));
    const moved = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    this.pos.x = p.x;
    this.pos.z = p.z;
    this.pos.y = this.game.world.groundAt(p.x, p.z, this.pos.y + 0.3);
    this.speed = moved / Math.max(dt, 1e-5);
    this.turnTo(Math.atan2(dx, dz), dt, 7);
    // takılma: engel etrafından dolaşmak için yana kay
    if (moved < step * 0.3) {
      this.stuckT += dt;
      if (this.stuckT > 0.4) {
        const side = this.sideSign || (this.sideSign = Math.random() < 0.5 ? -1 : 1);
        const sx = -dz / d * side, sz = dx / d * side;
        const q = this.tmp.set(this.pos.x + sx * speed * dt, this.pos.y, this.pos.z + sz * speed * dt);
        this.game.world.resolveCircle(q, this.radius, this.pos.y, 1.7);
        this.pos.x = q.x;
        this.pos.z = q.z;
        if (this.stuckT > 2.5) {
          this.sideSign = -side;
          this.stuckT = 0.5;
        }
      }
    } else {
      this.stuckT = Math.max(0, this.stuckT - dt);
      if (this.stuckT === 0) this.sideSign = 0;
    }
    // ayak sesi (konumsal)
    this.stepAcc += moved;
    if (this.stepAcc > (this.speed > 3 ? 1.9 : 1.4)) {
      this.stepAcc = 0;
      const d2 = this.dist2D(this.game.player.pos);
      if (d2 < 30) this.game.audio.step('gravel', this.speed > 3 ? 0.35 : 0.2, { x: this.pos.x, y: this.pos.y, z: this.pos.z });
    }
    return false;
  }

  eye(out = new THREE.Vector3()) {
    return this.body.eyePos(out);
  }

  canSee(targetPos, maxDist, fovCos) {
    const e = this.eye();
    const dx = targetPos.x - e.x, dz = targetPos.z - e.z;
    const d = Math.hypot(dx, dz);
    if (d > maxDist) return false;
    if (fovCos > -1 && d > 1.5) {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      if ((fx * dx + fz * dz) / d < fovCos) return false;
    }
    return this.game.world.lineOfSight(e, targetPos);
  }

  animate(dt) {
    this.body.update(dt, { speed: this.speed, aim: this.aim, crouch: this.crouch, cower: this.cower, down: this.down, firing: this.firing });
  }

  takeDamage(amount, from) {
    if (!this.alive) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.onDeath(from);
    } else this.onHurt(from);
  }

  onHurt() {}
  onDeath() {
    this.body.die();
  }

  dispose() {
    this.game.scene.remove(this.root);
  }
}
