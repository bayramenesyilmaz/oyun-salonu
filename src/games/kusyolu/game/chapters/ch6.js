import * as THREE from 'three';
import { CHAPTER6 as C6 } from '../story.js';
import { makeShip } from '../ship.js';
import { makeSpace, RE, RM, MOON_DIST } from '../space.js';

const ease = (x) => x * x * (3 - 2 * x);
const MOON = new THREE.Vector3(0.55, 0.32, -0.77).normalize().multiplyScalar(MOON_DIST);

// Bölüm 6 — Boşluk: oyuncu Leylek'i Ay'a sürer.
export class Chapter6 {
  constructor(g) {
    this.g = g;
    this.stage = 'load';
    this.t = 0;
    this.shipKm = new THREE.Vector3(0, RE + 420, 0);
    this.burn = 0;
    this.hull = 100;
  }
  async load() {
    const g = this.g;
    g.clearLevel();
    await g.loadEnv();
    g.progress(0.2, 'Leylek');
    this.space = makeSpace(g);
    g.scene.environment = g.envTex;
    g.scene.environmentIntensity = 0.25;
    this.ship = await makeShip(g);
    g.scene.add(this.ship.group);
    g.progress(0.7, 'Taşlar');
    const rocks = await Promise.all(['moon/rock01.glb', 'moon/rock02.glb', 'moon/rock03.glb'].map((f) => g.gltf(f)));
    this.rockSrc = rocks.map((r) => r.scene);
    // başlangıç: burun yörünge yönünde, Dünya aşağıda
    this.ship.group.quaternion.setFromEuler(new THREE.Euler(0, 0.6, 0));
    g.player.yaw = 0;
    g.player.pitch = -0.1;
    g.progress(1, '');
  }
  begin() {
    const g = this.g;
    g.card('Bölüm 6 · ' + C6.title, C6.place);
    g.audio.engine(0.08);
    this.stage = 'intro';
    g.later(3, () =>
      g.say(C6.intro, () => {
        this.stage = 'aim';
        g.objective(C6.objectives.aim);
      })
    );
  }
  toggleCam() {
    this.ship && this.ship.toggle();
  }
  moonDir() {
    return MOON.clone().sub(this.shipKm).normalize();
  }
  aimErr(dir) {
    return Math.acos(THREE.MathUtils.clamp(this.ship.forward().dot(dir), -1, 1));
  }
  hud(extra) {
    const g = this.g;
    const dE = this.shipKm.length() - RE, dM = MOON.distanceTo(this.shipKm) - RM;
    const fmt = (v) => (v > 10000 ? Math.round(v / 1000) + ' bin km' : Math.round(v) + ' km');
    const items = [
      { k: 'Dünya’ya', v: fmt(dE) },
      { k: 'Ay’a', v: fmt(dM) },
    ];
    if (this.stage === 'rocks' || this.hull < 100) items.push({ k: 'Gövde', v: '%' + Math.round(this.hull), warn: this.hull < 60 });
    g.emit('hud', { items, ...extra });
  }
  marker(dir, label) {
    const g = this.g;
    const p = g.camera.position.clone().addScaledVector(dir, 1000).project(g.camera);
    const behind = p.z > 1;
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2, behind, label };
  }
  update(dt, t) {
    const g = this.g, ship = this.ship;
    if (!ship) return;
    this.t += dt;
    const k = g.keys || {};
    const thrustKey = g.player.input.f > 0.3 || k.Space;
    if (this.stage === 'aim' || this.stage === 'burn' || this.stage === 'retro' || this.stage === 'brake') ship.steer(dt);
    let extra = {};
    if (this.stage === 'aim' || this.stage === 'burn') {
      const err = this.aimErr(this.moonDir());
      extra.marker = this.marker(this.moonDir(), 'AY');
      if (this.stage === 'aim' && err < 0.1) {
        this.stage = 'burn';
        g.say(C6.aimed, null);
      }
      if (this.stage === 'burn') {
        const ok = err < 0.16;
        ship.throttle += ((thrustKey && ok ? 1 : 0) - ship.throttle) * Math.min(1, dt * 3);
        if (thrustKey && ok) this.burn = Math.min(100, this.burn + dt * 15);
        g.player.shake = Math.max(g.player.shake, ship.throttle * 0.35);
        g.audio.engine(0.08 + ship.throttle * 0.6);
        extra.gauge = { label: ok ? 'Ay’a geçiş ateşlemesi' : 'Önce Ay işaretine dön', p: this.burn };
        if (this.burn >= 100) this.startJump();
      }
    } else if (this.stage === 'jump') {
      // Kor sıçraması: Dünya küçülür, Ay büyür
      const s = Math.min(1, this.t / 26);
      const from = new THREE.Vector3(0, RE + 420, 0), to = MOON.clone().addScaledVector(MOON.clone().normalize(), -60000);
      this.shipKm.lerpVectors(from, to, ease(s) * 0.15 + Math.pow(s, 3) * 0.85);
      ship.group.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), this.moonDir()), Math.min(1, dt * 0.6));
      ship.throttle = 0.25 + Math.sin(t * 9) * 0.05;
      g.player.shake = Math.max(g.player.shake, 0.15);
      g.emit('warp', Math.sin(Math.min(1, s * 1.2) * Math.PI) * 0.8);
      if (s >= 1 && !this.jumpEnd) {
        this.jumpEnd = true;
        g.emit('warp', 0);
        this.startRocks();
      }
    } else if (this.stage === 'rocks') {
      this.updateRocks(dt, t);
      this.shipKm.addScaledVector(this.moonDir(), dt * 600);
    } else if (this.stage === 'retro' || this.stage === 'brake') {
      const retro = this.moonDir().negate();
      const err = this.aimErr(retro);
      extra.marker = this.marker(retro, 'GERİ YÖN');
      if (this.stage === 'retro' && err < 0.12) {
        this.stage = 'brake';
        g.say(C6.retroAimed, null);
      }
      if (this.stage === 'brake') {
        const ok = err < 0.2;
        ship.throttle += ((thrustKey && ok ? 1 : 0) - ship.throttle) * Math.min(1, dt * 3);
        if (thrustKey && ok) this.burn = Math.min(100, this.burn + dt * 14);
        g.player.shake = Math.max(g.player.shake, ship.throttle * 0.35);
        g.audio.engine(0.08 + ship.throttle * 0.6);
        extra.gauge = { label: ok ? 'Fren ateşlemesi' : 'Önce geri yöne dön', p: this.burn };
        if (this.burn >= 100) this.orbitIn();
      }
      // yavaşça Ay'a yaklaş
      const dM = MOON.distanceTo(this.shipKm);
      if (dM > RM + 3000) this.shipKm.addScaledVector(this.moonDir(), dt * 300);
    } else if (this.stage === 'orbit') {
      // Ay yüzeyinin 100 km üstünde süzül
      const s = Math.min(1, this.t / 10);
      if (!this.orbitUp) this.orbitUp = this.shipKm.clone().sub(MOON).normalize();
      const target = MOON.clone().addScaledVector(this.orbitUp, RM + 100);
      this.shipKm.lerp(target, Math.min(1, dt * 0.5));
      const down = MOON.clone().sub(this.shipKm).normalize();
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), down.clone().cross(new THREE.Vector3(1, 0, 0)).normalize(), down.clone().negate()));
      ship.group.quaternion.slerp(q, Math.min(1, dt * 0.4));
      ship.throttle *= 0.95;
      g.audio.engine(0.06);
      if (s >= 1 && !this.orbitSaid) {
        this.orbitSaid = true;
        g.say(C6.orbit, () => g.later(1.5, () => g.completeChapter(7)));
      }
    }
    ship.update(dt, t);
    this.space.update(this.shipKm, MOON, g.camera, ship.group.position);
    g.player.updateSeat(0, t);
    if (this.stage !== 'intro' && this.stage !== 'load' && this.stage !== 'end') this.hud(extra);
  }
  startJump() {
    const g = this.g;
    this.stage = 'jump';
    this.t = 0;
    this.burn = 0;
    g.objective('');
    g.emit('hud', null);
    this.ship.setMode('dis');
    g.player.yaw = 2.6;
    g.player.pitch = -0.15;
    g.audio.korPulse(1.5);
    g.flashT = 0.6;
    g.say(C6.burnDone, () => g.later(1, () => g.say(C6.jump)));
  }
  // ---------- taş sürüsü ----------
  startRocks() {
    const g = this.g;
    this.stage = 'rocks';
    this.t = 0;
    this.rocks = [];
    this.hull = 100;
    this.lat = new THREE.Vector2();
    this.ship.setMode('dis');
    g.player.yaw = 0;
    g.player.pitch = -0.12;
    this.ship.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), this.moonDir());
    this.rockFrame = this.ship.group.quaternion.clone();
    g.say(C6.rocksWarn, null);
    g.objective(C6.objectives.rocks(100));
    this.nextRock = 1.5;
  }
  spawnRock() {
    if (this.rocks.length > 36) return;
    if (!this.rockVariants) {
      // her kaya türü için iki hazır kopya (normal ve Kor gibi parlayan); malzemeler paylaşılır
      this.rockVariants = [];
      for (const src of this.rockSrc) {
        for (const glow of [false, true]) {
          const v = src.clone(true);
          v.traverse((o) => {
            if (o.isMesh) {
              o.material = o.material.clone();
              if (glow) {
                o.material.emissive = new THREE.Color(0x3a7bff);
                o.material.emissiveIntensity = 0.6;
              }
            }
          });
          this.rockVariants.push(v);
        }
      }
    }
    const base = this.rockVariants[Math.floor(Math.random() * this.rockVariants.length)];
    const r = base.clone(true);
    const size = 2 + Math.random() * 7;
    r.scale.setScalar(size);
    // gemiye göre: önde, hafif yanda
    const aim = Math.random() < 0.45;
    const lx = aim ? this.lat.x + (Math.random() - 0.5) * 6 : (Math.random() - 0.5) * 90;
    const ly = aim ? this.lat.y + (Math.random() - 0.5) * 6 : (Math.random() - 0.5) * 60;
    r.userData = { l: new THREE.Vector3(lx, ly, -700 - Math.random() * 200), rad: size * 0.75, spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.8) };
    this.g.scene.add(r);
    this.rocks.push(r);
  }
  updateRocks(dt, t) {
    const g = this.g;
    const dur = 48;
    this.nextRock -= dt;
    if (this.t < dur - 6 && this.nextRock <= 0) {
      this.spawnRock();
      this.nextRock = Math.max(0.25, 1.1 - this.t * 0.018) * (0.6 + Math.random() * 0.8);
    }
    // yanal hareket: A/D sağ-sol, W/S yukarı-aşağı
    const ix = g.player.input.s, iy = g.player.input.f;
    this.lat.x = THREE.MathUtils.clamp(this.lat.x + ix * dt * 26, -40, 40);
    this.lat.y = THREE.MathUtils.clamp(this.lat.y + iy * dt * 20, -28, 28);
    const q = this.rockFrame;
    const shipPos = new THREE.Vector3(this.lat.x, this.lat.y, 0).applyQuaternion(q);
    this.ship.group.position.copy(shipPos);
    // gemi hareket yönüne yatar
    const bank = new THREE.Quaternion().setFromEuler(new THREE.Euler(iy * 0.2, 0, -ix * 0.35));
    this.ship.group.quaternion.slerp(q.clone().multiply(bank), Math.min(1, dt * 4));
    this.ship.throttle = 0.4;
    for (const r of this.rocks.slice()) {
      const u = r.userData;
      u.l.z += dt * 95;
      r.position.copy(u.l).applyQuaternion(q);
      r.rotation.x += u.spin.x * dt;
      r.rotation.y += u.spin.y * dt;
      const d = Math.hypot(u.l.x - this.lat.x, u.l.y - this.lat.y, u.l.z);
      if (!u.hit && d < u.rad + 3.2) {
        u.hit = true;
        this.hull -= 25;
        g.player.shake = 1.2;
        g.flashT = 0.25;
        g.audio.clunk && g.audio.clunk();
        g.objective(C6.objectives.rocks(Math.max(0, this.hull)));
        if (this.hull <= 0) return this.rocksFail();
        if (!this.hitSaid) {
          this.hitSaid = true;
          g.say(C6.rockHit, null);
        }
      }
      if (u.l.z > 60) {
        g.scene.remove(r);
        this.rocks.splice(this.rocks.indexOf(r), 1);
      }
    }
    if (this.t > dur && !this.rocksDoneSaid) {
      this.rocksDoneSaid = true;
      this.clearRocks();
      this.ship.group.position.set(0, 0, 0);
      this.stage = 'retroPre';
      g.objective('');
      g.say(C6.rocksDone, () => {
        this.stage = 'retro';
        this.burn = 0;
        this.ship.setMode('kokpit');
        g.player.yaw = 0;
        g.player.pitch = 0;
        g.say(C6.retro, null);
        g.objective(C6.objectives.retro);
      });
    }
  }
  clearRocks() {
    for (const r of this.rocks || []) this.g.scene.remove(r);
    this.rocks = [];
  }
  rocksFail() {
    const g = this.g;
    this.clearRocks();
    this.stage = 'rocksFail';
    g.say(C6.rocksFail, () => {
      g.emit('fade', 1);
      g.later(0.8, () => {
        this.hitSaid = false;
        this.startRocks();
        g.emit('fade', 0);
      });
    });
  }
  orbitIn() {
    const g = this.g;
    this.stage = 'orbit';
    this.t = 0;
    g.objective('');
    g.emit('hud', null);
    this.ship.setMode('dis');
    g.player.yaw = 0.35;
    g.player.pitch = -0.62;
  }
}
