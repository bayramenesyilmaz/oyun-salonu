import * as THREE from 'three';
import { Npc } from './npc.js';

// Sivil: saklanır, oyuncuyu takip eder, çatışmada siper alır, güvenli bölgeye ulaşınca kurtulur.
// Durumlar: hiding | follow | wait | cover | safe | lost
export class Civilian extends Npc {
  constructor(game, def) {
    super(game, 'civilian', { ...def, health: 100, gltf: game.models.civilian });
    this.id = def.id;
    this.name = def.name;
    this.state = 'hiding';
    this.wasHurt = false;
    this.safeSpot = def.safeSpot ? new THREE.Vector3(...def.safeSpot) : null;
    this.coverPt = null;
  }

  // Oyuncu yanına gelince: konuş, takip etmeye başla
  join() {
    if (this.state !== 'hiding' && this.state !== 'wait') return false;
    this.state = 'follow';
    this.cower = false;
    return true;
  }

  toggleWait() {
    if (this.state === 'follow' || this.state === 'cover') {
      this.state = 'wait';
      return 'wait';
    }
    if (this.state === 'wait') {
      this.state = 'follow';
      return 'follow';
    }
    return null;
  }

  takeDamage(amount, from) {
    if (!this.alive || this.state === 'safe') return;
    this.health -= amount;
    this.wasHurt = true;
    this.game.onCivilianHurt(this, from);
    if (this.health <= 0) {
      this.health = 0;
      this.state = 'lost';
      this.body.die();
      this.game.onCivilianLost(this);
    }
  }

  update(dt) {
    if (!this.alive) {
      this.animate(dt);
      return;
    }
    const g = this.game, P = g.player;
    const danger = g.combatLevel > 0.3 && g.enemies.some((e) => e.alive && e.state === 'combat' && this.dist2D(e.pos) < 45);
    this.aim = false;
    switch (this.state) {
      case 'hiding':
        this.speed = 0;
        this.cower = true;
        this.crouch = true;
        this.faceTo(P.pos, dt, 1.5);
        break;
      case 'follow': {
        this.cower = false;
        this.crouch = P.crouch;
        if (danger) {
          this.state = 'cover';
          this.coverPt = g.findCover(this.pos, g.nearestCombatEnemyPos(this.pos) || P.pos, 10) || this.pos.clone();
          break;
        }
        const d = this.dist2D(P.pos);
        // oyuncu güvenli bölgedeyse doğrudan güvenli noktaya yürü
        if (this.safeSpot && g.level.safeZone && g.level.safeZone(P.pos)) {
          this.navTo(this.safeSpot, dt, 3.2, 0.5);
        } else if (d > 2.6) {
          const behind = new THREE.Vector3(P.pos.x + Math.sin(P.yaw) * 1.8, 0, P.pos.z + Math.cos(P.yaw) * 1.8);
          this.navTo(d > 6 ? P.pos : behind, dt, d > 8 ? 4.6 : d > 4 ? 3.2 : 1.8, 1.8);
        } else {
          this.speed = 0;
          this.faceTo(P.pos, dt, 2);
        }
        if (this.dist2D(P.pos) > 50 && !g.isVisibleToPlayer(this.pos)) {
          const bx = P.pos.x + Math.sin(P.yaw) * 4, bz = P.pos.z + Math.cos(P.yaw) * 4;
          this.pos.set(bx, g.world.groundAt(bx, bz, 100), bz);
        }
        break;
      }
      case 'cover': {
        this.cower = true;
        if (this.coverPt && this.dist2D(this.coverPt) > 0.7) {
          this.cower = false;
          this.crouch = true;
          this.moveTo(this.coverPt, dt, 3.4, 0.6);
        } else this.speed = 0;
        if (!danger) {
          this.state = 'follow';
          this.cower = false;
        }
        break;
      }
      case 'wait':
        this.speed = 0;
        this.crouch = true;
        this.cower = danger;
        break;
      case 'safe':
        this.cower = false;
        this.crouch = false;
        if (this.safeSpot && this.dist2D(this.safeSpot) > 0.6) this.navTo(this.safeSpot, dt, 1.6, 0.5);
        else {
          this.speed = 0;
          this.crouch = true; // oturur
        }
        break;
    }
    this.animate(dt);
  }
}
