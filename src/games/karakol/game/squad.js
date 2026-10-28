import * as THREE from 'three';
import { Npc } from './npc.js';

// Ekip arkadaşı: Uzm. Çvş. Kemal Aydın.
// Komutlar: G = Takip et ↔ Pozisyonu tut, T = Ateş serbest ↔ Ateşi kes.
// Ağır yaralanırsa yere düşer; oyuncu E ile ilk yardım yapar.
export class Squadmate extends Npc {
  constructor(game, def) {
    super(game, 'soldier', { ...def, health: 160, gltf: game.models.soldier });
    this.name = 'Kemal';
    this.order = 'follow'; // follow | hold
    this.weaponsFree = true;
    this.holdPos = new THREE.Vector3(def.x, 0, def.z);
    this.targetEnemy = null;
    this.senseT = 0;
    this.nextShot = 0;
    this.burst = 0;
    this.downT = 0;
    this.wasDowned = false;
    this.active = def.active !== false; // öğretici bitene kadar karakolda bekler
    this.idleLines = 0;
  }

  command(kind) {
    if (this.down || !this.alive) return null;
    if (kind === 'move') {
      if (this.order === 'follow') {
        this.order = 'hold';
        this.holdPos.copy(this.pos);
        return 'hold';
      }
      this.order = 'follow';
      return 'follow';
    }
    if (kind === 'fire') {
      this.weaponsFree = !this.weaponsFree;
      return this.weaponsFree ? 'free' : 'holdfire';
    }
    return null;
  }

  onHurt(from) {
    if (from && from.def) this.targetEnemy = from;
  }

  takeDamage(amount, from) {
    if (this.down) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.down = true;
      this.wasDowned = true;
      this.downT = 0;
      this.aim = this.firing = false;
      this.game.onSquadDown(this);
    } else this.onHurt(from);
  }

  revive() {
    this.down = false;
    this.health = 70;
    this.game.onSquadRevived(this);
  }

  // canlı sayılır (yerde olsa bile ölmez)
  get alive() {
    return true;
  }

  update(dt) {
    const g = this.game, P = g.player;
    this.firing = false;
    if (this.down) {
      this.speed = 0;
      this.downT += dt;
      this.animate(dt);
      return;
    }
    if (!this.active) {
      this.speed = 0;
      this.faceTo(P.pos, dt, 2);
      this.animate(dt);
      return;
    }
    // düşman ara (4 Hz)
    this.senseT -= dt;
    if (this.senseT <= 0) {
      this.senseT = 0.25;
      this.targetEnemy = null;
      let best = 1e9;
      for (const e of g.enemies) {
        if (!e.alive || e.state !== 'combat') continue;
        const d = this.dist2D(e.pos);
        if (d < 70 && d < best && this.canSee(e.body.eyePos(), 70, -1)) {
          best = d;
          this.targetEnemy = e;
        }
      }
    }
    const engage = this.targetEnemy && this.weaponsFree;
    this.crouch = P.crouch || !!engage;
    if (engage) {
      // çatışmada: yerinde dur (veya yakın siper), nişan al, kısa atışlar
      this.speed = 0;
      this.aim = true;
      this.faceTo(this.targetEnemy.pos, dt, 8);
      const now = g.time.gameTime;
      if (now > this.nextShot) {
        if (this.burst <= 0) {
          this.burst = 2 + Math.floor(Math.random() * 3);
          this.nextShot = now + 0.8 + Math.random() * 0.9;
        } else {
          this.burst--;
          this.nextShot = now + 0.14;
          this.firing = true;
          const from = this.body.muzzleWorld();
          const tp = this.targetEnemy.body.eyePos().setY(this.targetEnemy.pos.y + (this.targetEnemy.crouch ? 0.8 : 1.25));
          const d = from.distanceTo(tp);
          g.npcShot(this, from, tp, THREE.MathUtils.clamp(0.34 - d * 0.003, 0.08, 0.3), 30, this.targetEnemy);
        }
      }
    } else {
      this.aim = !!this.targetEnemy || g.combatLevel > 0.2;
      if (this.order === 'follow') {
        // oyuncunun sol arkası
        const yaw = P.yaw;
        const want = new THREE.Vector3(P.pos.x + Math.sin(yaw) * 2.6 - Math.cos(yaw) * 1.6, 0, P.pos.z + Math.cos(yaw) * 2.6 + Math.sin(yaw) * 1.6);
        const d = this.dist2D(want);
        if (d > 1.2) this.navTo(want, dt, d > 7 ? 6 : d > 3 ? 3.6 : 2.4, 0.9);
        else {
          this.speed = 0;
          this.turnTo(P.yaw + Math.PI, dt, 3);
        }
        // çok geride kaldıysa (ör. takıldıysa) yakına taşı
        if (this.dist2D(P.pos) > 45 && !g.isVisibleToPlayer(this.pos)) {
          const bx = P.pos.x + Math.sin(yaw) * 6, bz = P.pos.z + Math.cos(yaw) * 6;
          this.pos.set(bx, g.world.groundAt(bx, bz, 100), bz);
        }
      } else {
        if (this.dist2D(this.holdPos) > 1) this.navTo(this.holdPos, dt, 3, 0.8);
        else {
          this.speed = 0;
          this.crouch = true;
        }
      }
    }
    this.animate(dt);
  }
}
