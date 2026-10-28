import * as THREE from 'three';
import { cloneModel, findClip } from '@engine/assets.js';

// İnsan karakterleri: kodla üretilen iskelet (eklem grupları) + prosedürel animasyon.
// GLB verilirse (public/models/*.glb) aynı arayüzle AnimationMixer kullanılır.
// Model ileri yönü: +Z. Ayak tabanı y=0.

const mats = new Map();
function mat(key, make) {
  if (!mats.has(key)) mats.set(key, make());
  return mats.get(key);
}

function limb(len, r0, r1, material) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 8);
  g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  return m;
}

// Basit tüfek (karakterlerin elinde)
export function makeNpcRifle() {
  const g = new THREE.Group();
  const dark = mat('gunDark', () => new THREE.MeshStandardMaterial({ color: 0x1d1e1f, roughness: 0.55, metalness: 0.5 }));
  const parts = [
    [0.05, 0.07, 0.42, 0, 0, 0.08], // gövde
    [0.03, 0.03, 0.38, 0, 0.01, 0.46], // namlu
    [0.04, 0.12, 0.06, 0, -0.08, 0.12], // şarjör
    [0.04, 0.09, 0.22, 0, -0.01, -0.22], // dipçik
    [0.035, 0.08, 0.04, 0, -0.07, -0.04], // kabza
  ];
  for (const [w, h, d, x, y, z] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), dark);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.01, 0.66);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  return g;
}

export function createHumanoid(kind, T, gltf = null, opts = {}) {
  return gltf ? new GltfHumanoid(kind, gltf) : new ProcHumanoid(kind, T, opts);
}

class ProcHumanoid {
  constructor(kind, T, opts = {}) {
    this.kind = kind;
    this.root = new THREE.Group();
    this.phase = Math.random() * 10;
    this.pose = 'idle';
    this.crouchK = 0;
    this.aimK = 0;
    this.deadT = -1;
    this.downK = 0;
    this.speed = 0;
    this.lookPitch = 0;

    const soldier = kind === 'soldier';
    const enemy = kind === 'enemy';
    const civ = kind === 'civilian';

    const body = soldier
      ? mat('camo', () => new THREE.MeshStandardMaterial({ map: T.camo, roughness: 0.9 }))
      : enemy
        ? mat('cloth', () => new THREE.MeshStandardMaterial({ map: T.cloth, roughness: 0.95 }))
        : mat('civ', () => new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.95, map: T.cloth }));
    const pants = civ ? mat('civPants', () => new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: 0.95 })) : body;
    const skin = mat('skin', () => new THREE.MeshStandardMaterial({ color: 0xa87a5c, roughness: 0.7 }));
    const gear = mat('gear', () => new THREE.MeshStandardMaterial({ color: soldier ? 0x4a4632 : 0x1c1b18, roughness: 0.85 }));
    const gearE = mat('gearE', () => new THREE.MeshStandardMaterial({ color: 0x23211d, roughness: 0.9 }));
    const boots = mat('boots', () => new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.8 }));
    const helmetM = mat('helmet', () => new THREE.MeshStandardMaterial({ map: T.camo, color: 0xb0aa90, roughness: 0.75 }));
    const vestM = soldier ? gear : gearE;

    // Kalça
    this.hips = new THREE.Group();
    this.hips.position.y = 0.95;
    this.root.add(this.hips);
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.2), pants);
    pelvis.castShadow = true;
    this.hips.add(pelvis);

    // Bacaklar
    this.legs = [];
    for (const s of [-1, 1]) {
      const thigh = new THREE.Group();
      thigh.position.set(s * 0.1, -0.05, 0);
      this.hips.add(thigh);
      thigh.add(limb(0.46, 0.085, 0.07, pants));
      const knee = new THREE.Group();
      knee.position.y = -0.46;
      thigh.add(knee);
      knee.add(limb(0.44, 0.065, 0.055, pants));
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.26), boots);
      foot.position.set(0, -0.46, 0.05);
      foot.castShadow = true;
      knee.add(foot);
      if (soldier || enemy) {
        const kp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), vestM);
        kp.position.set(0, 0, 0.07);
        knee.add(kp);
      }
      this.legs.push({ thigh, knee, s });
    }

    // Gövde
    this.spine = new THREE.Group();
    this.spine.position.y = 0.06;
    this.hips.add(this.spine);
    const torsoG = new THREE.CylinderGeometry(0.19, 0.16, 0.52, 10);
    torsoG.scale(1, 1, 0.62);
    torsoG.translate(0, 0.27, 0);
    const torso = new THREE.Mesh(torsoG, body);
    torso.castShadow = true;
    this.spine.add(torso);
    if (soldier || enemy) {
      // yelek + cepler
      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.27), vestM);
      vest.position.set(0, 0.28, 0.0);
      vest.castShadow = true;
      this.spine.add(vest);
      for (let i = 0; i < 3; i++) {
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.05), vestM);
        pouch.position.set(-0.11 + i * 0.11, 0.2, 0.15);
        this.spine.add(pouch);
      }
      if (soldier) {
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.14), gear);
        pack.position.set(0, 0.3, -0.19);
        pack.castShadow = true;
        this.spine.add(pack);
        // telsiz anteni
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.4, 4), boots);
        ant.position.set(0.1, 0.62, -0.2);
        this.spine.add(ant);
      }
    } else {
      // köylü ceketi: uzun etek
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.35, 10, 1, true), body);
      coat.scale.z = 0.7;
      coat.position.y = -0.05;
      this.spine.add(coat);
    }

    // Baş
    this.neck = new THREE.Group();
    this.neck.position.y = 0.56;
    this.spine.add(this.neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), skin);
    head.scale.set(0.95, 1.12, 1.02);
    head.position.y = 0.12;
    head.castShadow = true;
    this.neck.add(head);
    if (soldier) {
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), helmetM);
      helmet.position.y = 0.15;
      helmet.scale.set(1, 0.95, 1.08);
      helmet.castShadow = true;
      this.neck.add(helmet);
      const nvg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), boots);
      nvg.position.set(0, 0.24, 0.12);
      this.neck.add(nvg);
    } else if (enemy) {
      // yüz maskesi / atkı
      const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 8), gearE);
      wrap.scale.set(1, 1.15, 1.05);
      wrap.position.y = 0.12;
      this.neck.add(wrap);
      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.02), skin);
      eyes.position.set(0, 0.15, 0.105);
      this.neck.add(eyes);
    } else {
      // kasket + bıyık
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.06, 14), mat('cap', () => new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 1 })));
      cap.position.y = 0.21;
      this.neck.add(cap);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.08), cap.material);
      brim.position.set(0, 0.19, 0.12);
      this.neck.add(brim);
      const stache = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.02), mat('hair', () => new THREE.MeshStandardMaterial({ color: 0xd0ccc4, roughness: 1 })));
      stache.position.set(0, 0.08, 0.105);
      this.neck.add(stache);
    }

    // Kollar
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group();
      sh.position.set(s * 0.22, 0.48, 0);
      this.spine.add(sh);
      sh.add(limb(0.3, 0.06, 0.05, body));
      const el = new THREE.Group();
      el.position.y = -0.3;
      sh.add(el);
      el.add(limb(0.28, 0.05, 0.04, body));
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.05), soldier || enemy ? boots : skin);
      hand.position.y = -0.32;
      el.add(hand);
      this.arms.push({ sh, el, s });
    }

    // Silah
    if (!civ && !opts.unarmed) {
      this.gun = makeNpcRifle();
      this.gun.position.set(0.09, 0.32, 0.22);
      this.spine.add(this.gun);
      this.muzzle = this.gun.userData.muzzle;
    } else this.muzzle = null;

    this.root.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
  }

  // state: idle|walk|run|aim|crouch|cower|down ; speed m/s
  update(dt, { speed = 0, aim = false, crouch = false, cower = false, down = false, firing = false, talk = false } = {}) {
    if (this.deadT >= 0) return this.updateDeath(dt);
    this.speed = speed;
    const k = Math.min(1, dt * 8);
    this.crouchK += ((crouch || cower ? 1 : 0) - this.crouchK) * k;
    this.aimK += ((aim ? 1 : 0) - this.aimK) * Math.min(1, dt * 10);
    this.downK += ((down ? 1 : 0) - this.downK) * Math.min(1, dt * 3);
    const moving = speed > 0.15;
    this.phase += dt * (moving ? 2.4 + speed * 1.5 : 0.8);
    const ph = this.phase;
    const amp = moving ? Math.min(1, speed / 3.5) : 0;

    // bacaklar
    const ck = this.crouchK;
    for (const L of this.legs) {
      const sw = Math.sin(ph + (L.s > 0 ? Math.PI : 0));
      L.thigh.rotation.x = -sw * 0.65 * amp - ck * 1.25;
      L.knee.rotation.x = Math.max(0, Math.cos(ph + (L.s > 0 ? Math.PI : 0))) * 0.9 * amp + ck * 2.0;
    }
    this.hips.position.y = 0.95 - ck * 0.38 + (moving ? Math.abs(Math.cos(ph)) * 0.04 * amp : Math.sin(ph) * 0.004);
    this.spine.rotation.x = 0.06 + amp * 0.15 + ck * 0.35 + (cower ? 0.4 : 0);
    this.spine.rotation.y = moving ? Math.sin(ph) * 0.08 * amp : 0;

    // kollar
    const a = this.aimK;
    for (const A of this.arms) {
      if (this.gun) {
        // silahı tutan poz (nişanda omuza kalkar)
        const right = A.s > 0;
        A.sh.rotation.x = -(right ? 0.9 : 1.25) - a * (right ? 0.35 : 0.25);
        A.sh.rotation.z = right ? 0.25 : -0.55;
        A.el.rotation.x = -(right ? 1.1 : 0.55) + a * 0.25;
      } else if (cower) {
        A.sh.rotation.x = -2.6;
        A.sh.rotation.z = A.s * -0.4;
        A.el.rotation.x = -1.6;
      } else if (talk && A.s > 0) {
        // konuşurken el hareketi
        A.sh.rotation.x = -0.5 + Math.sin(ph * 2.2) * 0.15;
        A.sh.rotation.z = 0.15;
        A.el.rotation.x = -1.1 + Math.sin(ph * 3.1) * 0.2;
      } else {
        A.sh.rotation.x = Math.sin(ph + (A.s > 0 ? 0 : Math.PI)) * 0.5 * amp;
        A.sh.rotation.z = A.s * 0.08;
        A.el.rotation.x = -0.2 - amp * 0.3;
      }
    }
    if (this.gun) {
      this.gun.position.y = 0.32 + a * 0.12;
      this.gun.position.z = 0.22 + a * 0.04;
      this.gun.rotation.x = (1 - a) * 0.5 - this.lookPitch * a;
      if (firing) this.gun.position.z -= 0.03;
    }
    this.neck.rotation.x = -this.spine.rotation.x * 0.6 - this.lookPitch * 0.5;

    // yaralı (yerde)
    if (this.downK > 0.01) {
      this.root.children[0].rotation.x = 0;
      this.hips.rotation.x = -this.downK * 1.45;
      this.hips.position.y = 0.95 - this.downK * 0.75;
    } else this.hips.rotation.x = 0;
  }

  die(dirYaw = 0) {
    if (this.deadT >= 0) return;
    this.deadT = 0;
    this.fallDir = Math.random() < 0.5 ? 1 : -1;
    this.fallSide = (Math.random() - 0.5) * 0.6;
  }

  updateDeath(dt) {
    if (this.deadT > 1.2) return;
    this.deadT += dt;
    const k = Math.min(1, this.deadT / 0.75);
    const e = k * k * (3 - 2 * k);
    // önce dizler bükülür, sonra yere yığılır
    this.hips.position.y = 0.95 - e * 0.8;
    this.hips.rotation.x = -e * 1.4 * this.fallDir;
    this.hips.rotation.z = e * this.fallSide;
    for (const L of this.legs) {
      L.thigh.rotation.x = -e * 0.4;
      L.knee.rotation.x = e * 0.6;
    }
    for (const A of this.arms) {
      A.sh.rotation.x = -e * 1.8 * this.fallDir;
      A.el.rotation.x = -e * 0.4;
    }
    if (this.gun && k >= 1 && !this.gunDropped) {
      this.gunDropped = true;
      this.gun.visible = false;
    }
  }

  get dead() {
    return this.deadT >= 0;
  }

  // Mermi isabet küreleri (dünya koordinatı)
  hitSpheres(out = []) {
    out.length = 0;
    if (this.dead) return out;
    const p = this.root.position, yaw = this.root.rotation.y;
    const lean = Math.sin(this.spine.rotation.x) * 0.3;
    const fx = Math.sin(yaw) * lean, fz = Math.cos(yaw) * lean;
    const hipY = this.hips.position.y;
    if (this.downK > 0.5) {
      out.push({ x: p.x, y: p.y + 0.25, z: p.z, r: 0.45, part: 'body' });
      return out;
    }
    out.push({ x: p.x + fx * 1.2, y: p.y + hipY + 0.78, z: p.z + fz * 1.2, r: 0.13, part: 'head' });
    out.push({ x: p.x + fx * 0.8, y: p.y + hipY + 0.38, z: p.z + fz * 0.8, r: 0.24, part: 'body' });
    out.push({ x: p.x, y: p.y + hipY + 0.05, z: p.z, r: 0.2, part: 'body' });
    out.push({ x: p.x, y: p.y + hipY * 0.45, z: p.z, r: 0.17, part: 'leg' });
    return out;
  }

  eyePos(out = new THREE.Vector3()) {
    const p = this.root.position;
    return out.set(p.x, p.y + this.hips.position.y + 0.72, p.z);
  }

  muzzleWorld(out = new THREE.Vector3()) {
    if (!this.muzzle) return this.eyePos(out);
    this.root.updateMatrixWorld(true);
    return this.muzzle.getWorldPosition(out);
  }
}

// GLB tabanlı karakter (aynı arayüz). Klip adları: idle, walk, run, aim/shoot, crouch, die
class GltfHumanoid {
  constructor(kind, gltf) {
    this.kind = kind;
    this.root = new THREE.Group();
    this.model = cloneModel(gltf);
    const box = new THREE.Box3().setFromObject(this.model);
    const h = box.max.y - box.min.y || 1.8;
    this.model.scale.setScalar(1.78 / h);
    this.model.position.y = -box.min.y * (1.78 / h);
    this.model.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const [k, re] of Object.entries({ idle: /idle/i, walk: /walk/i, run: /run|sprint/i, aim: /aim|shoot|fire/i, crouch: /crouch/i, die: /die|death/i })) {
      const c = findClip(gltf, re);
      if (c) this.actions[k] = this.mixer.clipAction(c);
    }
    this.current = null;
    this.play('idle');
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0.15, 1.4, 0.7);
    this.root.add(this.muzzle);
    this.deadT = -1;
    this.lookPitch = 0;
    this.hips = { position: { y: 0.95 } };
    this.spine = { rotation: { x: 0 } };
    this.downK = 0;
  }

  play(name) {
    const a = this.actions[name] || this.actions.idle;
    if (!a || a === this.current) return;
    a.reset().fadeIn(0.2).play();
    if (this.current) this.current.fadeOut(0.2);
    this.current = a;
    if (name === 'die') {
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
    }
  }

  update(dt, { speed = 0, aim = false, crouch = false, down = false } = {}) {
    this.mixer.update(dt);
    if (this.deadT >= 0) return;
    this.downK += ((down ? 1 : 0) - this.downK) * Math.min(1, dt * 3);
    this.play(down ? 'die' : aim ? 'aim' : crouch ? 'crouch' : speed > 2.6 ? 'run' : speed > 0.15 ? 'walk' : 'idle');
    this.model.rotation.x = this.actions.die ? 0 : -this.downK * 1.4;
  }

  die() {
    if (this.deadT >= 0) return;
    this.deadT = 0;
    if (this.actions.die) this.play('die');
    else this.model.rotation.x = -1.4;
  }

  get dead() {
    return this.deadT >= 0;
  }

  hitSpheres(out = []) {
    out.length = 0;
    if (this.dead) return out;
    const p = this.root.position;
    out.push({ x: p.x, y: p.y + 1.62, z: p.z, r: 0.13, part: 'head' });
    out.push({ x: p.x, y: p.y + 1.25, z: p.z, r: 0.24, part: 'body' });
    out.push({ x: p.x, y: p.y + 0.95, z: p.z, r: 0.2, part: 'body' });
    out.push({ x: p.x, y: p.y + 0.45, z: p.z, r: 0.17, part: 'leg' });
    return out;
  }

  eyePos(out = new THREE.Vector3()) {
    const p = this.root.position;
    return out.set(p.x, p.y + 1.62, p.z);
  }

  muzzleWorld(out = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    return this.muzzle.getWorldPosition(out);
  }
}

// Işın – küre isabeti (en yakın t veya null)
export function raySphere(o, d, s, maxT) {
  const ox = o.x - s.x, oy = o.y - s.y, oz = o.z - s.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const c = ox * ox + oy * oy + oz * oz - s.r * s.r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0 || t > maxT) return null;
  return t;
}
