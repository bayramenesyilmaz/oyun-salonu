import * as THREE from 'three';
import { Npc } from './npc.js';

// Kurgusal örgüt üyesi. Durumlar: patrol | guard | suspicious | combat | search | dead
// Algılama: görüş konisi (fener ve çömelme etkiler) + silah/koşu sesleri. Grup halinde alarm verir.
export class Enemy extends Npc {
  constructor(game, def) {
    super(game, 'enemy', { ...def, health: 100, gltf: game.models.enemy });
    this.id = def.id;
    this.def = def;
    this.route = (def.route || []).map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.routeIdx = 0;
    this.home = new THREE.Vector3(def.x, 0, def.z);
    this.homeYaw = def.yaw || 0;
    this.state = this.route.length ? 'patrol' : 'guard';
    this.suspicion = 0;
    this.lastKnown = new THREE.Vector3();
    this.target = null; // 'player' | npc
    this.senseT = Math.random() * 0.2;
    this.coverPt = null;
    this.burst = 0;
    this.nextShot = 0;
    this.peekT = 0;
    this.reaction = 0;
    this.waitT = 0;
    this.noLosT = 0;
    this.stateT = 0;
    this.accuracy = def.accuracy ?? 1;
    this.lookAround = Math.random() * 6;
  }

  setState(s) {
    if (this.state === s || this.state === 'dead') return;
    const prev = this.state;
    this.state = s;
    this.stateT = 0;
    this.coverPt = null;
    if (s === 'combat' && prev !== 'combat') {
      this.reaction = 0.55 + Math.random() * 0.5;
      this.game.onEnemyAlert(this);
    }
  }

  alert(pos, target = 'player') {
    if (!this.alive) return;
    this.lastKnown.copy(pos);
    this.target = target;
    if (this.state !== 'combat') this.setState('combat');
  }

  hear(pos, loudness) {
    if (!this.alive || this.state === 'combat') return;
    const d = this.dist2D(pos);
    if (d < loudness) {
      if (loudness > 40) this.alert(pos);
      else {
        this.lastKnown.copy(pos);
        this.setState('suspicious');
        this.suspicion = Math.max(this.suspicion, 0.5);
      }
    }
  }

  onHurt(from) {
    // vurulunca her zaman çatışmaya girer, saldırganı bilir
    if (from) this.alert(from.pos || from, from.isPlayer ? 'player' : from);
    this.crouch = true;
  }

  onDeath(from) {
    super.onDeath(from);
    this.state = 'dead';
    this.aim = this.firing = false;
    this.game.onEnemyDown(this);
  }

  // Görülebilir hedefler: oyuncu ve ekip arkadaşı
  perceive() {
    const g = this.game, P = g.player;
    const night = g.level.night ? 1 : 0;
    let range = 42 - night * 6;
    if (P.lampOn) range *= 1.7;
    if (P.crouch) range *= 0.55;
    if (P.sprinting) range *= 1.15;
    if (this.state === 'combat') range = 90;
    const fov = this.state === 'combat' ? -0.2 : Math.cos(THREE.MathUtils.degToRad(58));
    const seesPlayer = !P.dead && g.playerTargetable && this.canSee(P.chestPos(), range, fov);
    let seesSquad = null;
    const K = g.squad;
    if (K && K.alive && !K.down && g.playerTargetable) {
      const kr = (K.crouch ? 0.55 : 1) * (this.state === 'combat' ? 70 : 32);
      if (this.canSee(K.body.eyePos(), kr, fov)) seesSquad = K;
    }
    return { seesPlayer, seesSquad, range };
  }

  update(dt) {
    if (!this.alive) {
      this.animate(dt);
      return;
    }
    const g = this.game, P = g.player;
    this.stateT += dt;
    this.firing = false;

    // algılama 5 Hz
    this.senseT -= dt;
    if (this.senseT <= 0) {
      this.senseT = 0.2;
      const s = (this.sense = this.perceive());
      if (s.seesPlayer) {
        const d = this.dist2D(P.pos);
        const gain = d < 8 ? 6 : (1.4 * (1 - d / s.range) + 0.35) * (P.lampOn ? 1.8 : 1) * (P.moving ? 1.3 : 0.8);
        this.suspicion = Math.min(1.2, this.suspicion + 0.2 * gain * 2.2);
        this.lastKnown.copy(P.pos);
        if (this.suspicion >= 1) this.alert(P.pos, 'player');
        else if (this.suspicion > 0.35 && this.state !== 'combat') this.setState('suspicious');
      } else if (s.seesSquad) {
        this.suspicion = Math.min(1.2, this.suspicion + 0.2 * 1.5);
        this.lastKnown.copy(s.seesSquad.pos);
        if (this.suspicion >= 1) this.alert(s.seesSquad.pos, s.seesSquad);
      } else if (this.state !== 'combat') this.suspicion = Math.max(0, this.suspicion - 0.2 * 0.18);
      // koşu sesi
      if (P.noise === 2 && this.dist2D(P.pos) < 13) this.hear(P.pos, 13);
    }

    const sense = this.sense || {};
    switch (this.state) {
      case 'patrol': {
        this.aim = false;
        this.crouch = false;
        if (this.waitT > 0) {
          this.waitT -= dt;
          this.speed = 0;
          this.turnTo(this.yaw + Math.sin(this.stateT * 0.7) * 0.6, dt, 1.2);
        } else if (this.moveTo(this.route[this.routeIdx], dt, 1.35)) {
          this.routeIdx = (this.routeIdx + 1) % this.route.length;
          this.waitT = 1.5 + Math.random() * 3;
        }
        break;
      }
      case 'guard': {
        this.aim = false;
        this.crouch = false;
        if (this.dist2D(this.home) > 1) this.moveTo(this.home, dt, 1.3);
        else {
          this.speed = 0;
          this.lookAround += dt * 0.35;
          this.turnTo(this.homeYaw + Math.sin(this.lookAround) * 0.9, dt, 1.5);
        }
        break;
      }
      case 'suspicious': {
        // bakılan yere dön, yavaşça yaklaş
        this.aim = true;
        if (this.stateT < 1.2) {
          this.speed = 0;
          this.faceTo(this.lastKnown, dt, 3);
        } else if (this.moveTo(this.lastKnown, dt, 1.2, 2) || this.stateT > 12) {
          this.setState(this.route.length ? 'patrol' : 'guard');
          this.suspicion = 0;
        }
        break;
      }
      case 'combat':
        this.updateCombat(dt, sense);
        break;
      case 'search': {
        this.aim = true;
        this.crouch = false;
        if (!this.searchPt || this.moveTo(this.searchPt, dt, 1.8, 1)) {
          const a = Math.random() * 6.28, r = 3 + Math.random() * 7;
          this.searchPt = new THREE.Vector3(this.lastKnown.x + Math.cos(a) * r, 0, this.lastKnown.z + Math.sin(a) * r);
        }
        if (this.stateT > 20) {
          this.setState(this.route.length ? 'patrol' : 'guard');
          this.suspicion = 0.3;
        }
        break;
      }
    }
    this.body.lookPitch = 0;
    this.animate(dt);
  }

  targetPos(out = new THREE.Vector3()) {
    if (this.target && this.target !== 'player' && this.target.alive && !this.target.down) return this.target.body.eyePos(out).setY(this.target.pos.y + 1.2);
    return this.game.player.chestPos(out);
  }

  updateCombat(dt, sense) {
    const g = this.game;
    const visible = this.target === 'player' || !this.target || !this.target.alive || this.target.down ? sense.seesPlayer : !!sense.seesSquad;
    // oyuncu görünmüyor ama ekip arkadaşı görünüyorsa ona dön (veya tersi)
    if (!visible) {
      if (sense.seesPlayer) this.target = 'player';
      else if (sense.seesSquad) this.target = sense.seesSquad;
    }
    const canSee = sense.seesPlayer || !!sense.seesSquad;
    if (canSee) {
      this.noLosT = 0;
      this.targetPos(this.lastKnown);
    } else this.noLosT += dt;

    // siper seç
    if (!this.coverPt) this.coverPt = g.findCover(this.pos, this.lastKnown, 22) || this.pos.clone();
    const atCover = this.dist2D(this.coverPt) < 0.8;
    if (!atCover) {
      this.crouch = false;
      this.aim = false;
      this.navTo(this.coverPt, dt, 3.6, 0.6);
      // koşarken de yakınsa ateş edebilir
      if (canSee && this.dist2D(this.lastKnown) < 15 && this.reaction <= 0) this.tryShoot(dt, 0.6);
      this.reaction -= dt;
      return;
    }
    this.speed = 0;
    this.faceTo(this.lastKnown, dt, 6);
    this.reaction -= dt;
    // siperde: eğil – kalk – ateş döngüsü
    this.peekT -= dt;
    if (this.peekT <= 0) {
      this.crouch = !this.crouch;
      this.peekT = this.crouch ? 1.2 + Math.random() * 1.8 : 1.8 + Math.random() * 1.6;
      if (!this.crouch) this.burst = 3 + Math.floor(Math.random() * 4);
    }
    this.aim = !this.crouch;
    if (!this.crouch && canSee && this.reaction <= 0) this.tryShoot(dt, 1);

    // uzun süre göremezse ilerle / ara
    if (this.noLosT > 5) {
      this.coverPt = g.findCover(this.lastKnown, this.lastKnown, 14, true) || this.lastKnown.clone();
      this.noLosT = 2.5;
      if (this.stateT > 40) this.setState('search');
    }
  }

  tryShoot(dt, accMul) {
    const g = this.game;
    const now = g.time.gameTime;
    if (now < this.nextShot || this.burst <= 0) {
      if (this.burst <= 0 && now > this.nextShot + 0.6) this.burst = 2 + Math.floor(Math.random() * 3);
      return;
    }
    this.burst--;
    this.nextShot = now + 0.13 + Math.random() * 0.05;
    this.firing = true;
    const from = this.body.muzzleWorld();
    const tp = this.targetPos();
    const d = from.distanceTo(tp);
    let p = THREE.MathUtils.clamp(0.42 - d * 0.0055, 0.06, 0.4) * accMul * this.accuracy * g.difficulty;
    if (this.target === 'player' || !this.target) {
      const P = g.player;
      if (P.moving) p *= P.sprinting ? 0.55 : 0.75;
      if (P.crouch) p *= 0.75;
    } else p *= 0.6;
    g.npcShot(this, from, tp, p, 9 + Math.random() * 6, this.target === 'player' || !this.target ? 'player' : this.target);
  }
}
