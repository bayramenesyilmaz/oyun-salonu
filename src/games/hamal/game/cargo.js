import * as THREE from 'three';

// Yükler: görsel (Poly Haven modelleri ya da kodla) + Rapier gövdesi + "urgan" yayı.
// size: [genişlik, yükseklik, derinlik] (m), mass (kg), fragile: düşünce kırılır
export const KINDS = {
  tomato: { name: 'Domates kasası', size: [0.38, 0.34, 0.52], mass: 13, value: 10, glb: 'wooden_crate_01', fill: 'tomato' },
  teabox: { name: 'Çay takımı', size: [0.5, 0.3, 0.4], mass: 6, value: 35, fragile: true, glb: 'wooden_crate_02', fill: 'tea' },
  cage: { name: 'Kanarya kafesi', size: [0.3, 0.5, 0.3], mass: 2.5, value: 25, fragile: true },
  fridge: { name: 'Buzdolabı', size: [0.62, 1.42, 0.6], mass: 55, value: 60, fragile: true },
  suitcase: { name: 'Valiz', size: [0.68, 0.25, 0.44], mass: 9, value: 10, glb: 'vintage_suitcase' },
  tv: { name: 'Televizyon', size: [0.58, 0.5, 0.46], mass: 15, value: 45, fragile: true, glb: 'Television_01' },
  kilim: { name: 'Kilim', size: [1.3, 0.28, 0.28], mass: 7, value: 10, roll: true },
  basket: { name: 'Sepet', size: [0.44, 0.34, 0.4], mass: 4, value: 8, glb: 'wicker_basket_01' },
  piano: { name: 'Piyano', size: [1.36, 1.18, 0.56], mass: 140, value: 120, fragile: true },
};

const WHITE = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.35, metalness: 0.05 });
const CHROME = new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.18, metalness: 1 });
const BLACKLAC = new THREE.MeshStandardMaterial({ color: 0x0d0c0c, roughness: 0.22, metalness: 0.1 });
const IVORY = new THREE.MeshStandardMaterial({ color: 0xf0e8d6, roughness: 0.4 });
const BRASS = new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.3, metalness: 1 });
const TOM = new THREE.MeshStandardMaterial({ color: 0xc82818, roughness: 0.35 });
const LEAF = new THREE.MeshStandardMaterial({ color: 0x3a6a28, roughness: 0.8 });

function kilimTex() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const x = c.getContext('2d');
  const cols = ['#8a2418', '#d8a040', '#24324a', '#e8dcc0', '#5a2a1a'];
  for (let i = 0; i < 16; i++) {
    x.fillStyle = cols[i % cols.length];
    x.fillRect(i * 16, 0, 16, 64);
    x.fillStyle = cols[(i + 2) % cols.length];
    x.beginPath();
    x.moveTo(i * 16 + 8, 10);
    x.lineTo(i * 16 + 15, 32);
    x.lineTo(i * 16 + 8, 54);
    x.lineTo(i * 16 + 1, 32);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  return t;
}

// glb modelini hedef kutuya oturt (ortalanmış, tabanı y=-h/2)
function fit(src, size) {
  const g = src.clone(true);
  const bb = new THREE.Box3().setFromObject(g);
  const s = new THREE.Vector3();
  bb.getSize(s);
  const k = Math.min(size[0] / s.x, size[1] / s.y, size[2] / s.z);
  g.scale.setScalar(k);
  const bb2 = new THREE.Box3().setFromObject(g);
  const c = new THREE.Vector3();
  bb2.getCenter(c);
  g.position.sub(c);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

function makeVisual(kind, def, glbs) {
  const [w, h, d] = def.size;
  const G = new THREE.Group();
  if (def.glb && glbs[def.glb]) {
    const m = fit(glbs[def.glb], kind === 'tomato' ? [w, h, d] : def.size);
    // kasa yan yatırılmış modelse ölçüye uyar; içine domates
    G.add(m);
  } else if (kind === 'cage') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.04, 20), BRASS);
    base.position.y = -h / 2 + 0.02;
    G.add(base);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, h * 0.72, 4), BRASS);
      bar.position.set(Math.cos(a) * (w / 2 - 0.01), -h / 2 + 0.04 + h * 0.36, Math.sin(a) * (w / 2 - 0.01));
      G.add(bar);
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(w / 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.3, metalness: 1, wireframe: true }));
    dome.position.y = -h / 2 + 0.04 + h * 0.72;
    dome.scale.y = 0.6;
    G.add(dome);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 14), BRASS);
    ring.position.y = h / 2 - 0.03;
    G.add(ring);
    // sarı kanarya
    const bird = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf2d22a, roughness: 0.6 }));
    body.scale.set(1, 0.9, 1.4);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), body.material);
    head.position.set(0, 0.03, -0.04);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.015, 6), new THREE.MeshStandardMaterial({ color: 0xe08a20 }));
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.03, -0.065);
    bird.add(body, head, beak);
    const perch = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, w * 0.8, 4), new THREE.MeshStandardMaterial({ color: 0x6a4a2a }));
    perch.rotation.z = Math.PI / 2;
    perch.position.y = -0.02;
    bird.position.y = 0.02;
    G.add(perch, bird);
    G.userData.bird = bird;
  } else if (kind === 'fridge') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), WHITE);
    b.castShadow = true;
    G.add(b);
    // yuvarlatılmış üst ve kapı çizgisi, krom kol, ayaklar
    const top = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, w, 20, 1, false, 0, Math.PI), WHITE);
    top.rotation.z = Math.PI / 2;
    top.scale.set(1, 1, 0.22);
    top.position.y = h / 2;
    G.add(top);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.01, 0.005), new THREE.MeshStandardMaterial({ color: 0x9a9890 }));
    seam.position.set(0, h * 0.2, -d / 2 - 0.002);
    G.add(seam);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.32, 0.04), CHROME);
    handle.position.set(w / 2 - 0.08, h * 0.32, -d / 2 - 0.03);
    G.add(handle);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.005), CHROME);
    badge.position.set(0, h * 0.42, -d / 2 - 0.004);
    G.add(badge);
    // halat sarılı karton köşelikler
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, h * 0.9, 0.05), new THREE.MeshStandardMaterial({ color: 0xa88a58, roughness: 1 }));
      c.position.set(s * (w / 2 - 0.02), 0, d / 2 - 0.02);
      G.add(c);
    }
  } else if (kind === 'piano') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d * 0.55), BLACKLAC);
    body.position.z = d * 0.22;
    G.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.04, d * 0.62), BLACKLAC);
    top.position.set(0, h / 2, d * 0.2);
    G.add(top);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.1, d * 0.4), BLACKLAC);
    bed.position.set(0, -0.05, -d * 0.18);
    G.add(bed);
    const keys = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.02, 0.15), IVORY);
    keys.position.set(0, 0.01, -d * 0.24);
    G.add(keys);
    for (let i = 0; i < 36; i++) {
      if ([2, 6, 9, 13, 16, 20, 23, 27, 30, 34].includes(i % 36) || i % 7 === 3) continue;
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.025, 0.08), BLACKLAC);
      k.position.set(-w * 0.43 + i * (w * 0.86 / 36), 0.03, -d * 0.21);
      G.add(k);
    }
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, h * 0.5, 0.06), BLACKLAC);
      leg.position.set(s * (w / 2 - 0.05), -h / 4, -d * 0.35);
      G.add(leg);
      const cand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.1, 8), BRASS);
      cand.position.set(s * (w / 2 - 0.18), h * 0.15, -d * 0.04);
      G.add(cand);
    }
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), BLACKLAC);
    plinth.position.y = -h / 2 + 0.03;
    G.add(plinth);
    // battaniyeyle sarılı köşeler
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, h * 1.01, d * 0.6), new THREE.MeshStandardMaterial({ color: 0x5a6a7a, roughness: 1 }));
    blanket.position.set(-w * 0.35, 0, d * 0.21);
    G.add(blanket);
  } else if (kind === 'kilim') {
    const r = h / 2;
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 16), new THREE.MeshStandardMaterial({ map: kilimTex(), roughness: 1 }));
    roll.rotation.z = Math.PI / 2;
    G.add(roll);
    for (const s of [-0.35, 0.35]) {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(r + 0.005, 0.008, 6, 16), new THREE.MeshStandardMaterial({ color: 0xc8b080 }));
      tie.rotation.y = Math.PI / 2;
      tie.position.x = s * w;
      G.add(tie);
    }
  } else {
    G.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x8a6a48 })));
  }
  // dolgu: kasada domates, çay kutusunda talaş ve demlik
  if (def.fill === 'tomato') {
    for (let i = 0; i < 9; i++) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), TOM);
      t.position.set(((i % 3) - 1) * 0.1, h / 2 - 0.02 + (i % 2) * 0.015, (Math.floor(i / 3) - 1) * 0.14);
      t.scale.y = 0.85;
      G.add(t);
      if (i % 3 === 0) {
        const l = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.02, 5), LEAF);
        l.position.copy(t.position).add(new THREE.Vector3(0, 0.05, 0));
        G.add(l);
      }
    }
  }
  if (def.fill === 'tea' && glbs.tea_set_01) {
    const t = fit(glbs.tea_set_01, [w * 0.8, 0.18, d * 0.8]);
    t.position.y = h / 2 + 0.06;
    G.add(t);
    const straw = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.03, d * 0.9), new THREE.MeshStandardMaterial({ color: 0xd8c088, roughness: 1 }));
    straw.position.y = h / 2 - 0.01;
    G.add(straw);
  }
  G.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return G;
}

export class Cargo {
  constructor(g, kind, slot, glbs) {
    const def = (this.def = KINDS[kind]);
    this.kind = kind;
    this.g = g;
    this.slot = slot; // {p:[x,y,z], ry}
    this.mesh = makeVisual(kind, def, glbs);
    g.scene.add(this.mesh);
    const R = g.R;
    const [w, h, d] = def.size;
    this.body = g.world.createRigidBody(R.RigidBodyDesc.dynamic().setCcdEnabled(true).setLinearDamping(0.05).setAngularDamping(0.4));
    const col = def.roll
      ? R.ColliderDesc.roundCuboid(w / 2 - 0.02, h / 2 - 0.04, d / 2 - 0.04, 0.04)
      : R.ColliderDesc.cuboid(w / 2, h / 2, d / 2);
    col.setMass(def.mass).setFriction(kind === 'piano' || kind === 'fridge' ? 0.9 : 0.75).setRestitution(0.08);
    this.collider = g.world.createCollider(col, this.body);
    this.attached = true;
    this.broken = false;
    this.strain = 0;
    this.strainT = 0;
    this.groundT = 0;
    this.lastVel = 0;
    this.rest = new THREE.Vector3(slot.p[0], slot.p[1] + h / 2, slot.p[2]);
    this.restQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), slot.ry || 0);
    this.ropeStrength = { piano: 900, fridge: 700, tv: 260, suitcase: 220, kilim: 200, basket: 120, cage: 90, teabox: 160, tomato: 200 }[kind] || 200;
  }

  // urgan bağının hedefi (dünya)
  target(platform, outP, outQ) {
    outP.copy(this.rest).applyQuaternion(platform.q).add(platform.p);
    outQ.copy(platform.q).multiply(this.restQ);
  }

  placeAtSlot(platform) {
    const p = new THREE.Vector3(), q = new THREE.Quaternion();
    this.target(platform, p, q);
    this.body.setTranslation(p, true);
    this.body.setRotation(q, true);
    this.body.setLinvel(platform.v, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.attached = true;
    this.strain = 0;
    this.strainT = 0;
  }

  // her fizik adımından önce: bağlıysa yay kuvveti
  step(dt, platform, ropeMul) {
    if (!this.attached || this.broken) return null;
    const b = this.body;
    const p = b.translation(), v = b.linvel();
    const tp = this._tp || (this._tp = new THREE.Vector3()), tq = this._tq || (this._tq = new THREE.Quaternion());
    this.target(platform, tp, tq);
    const ex = tp.x - p.x, ey = tp.y - p.y, ez = tp.z - p.z;
    const dist = Math.hypot(ex, ey, ez);
    this.strain = dist;
    // hedef hız: platformun o noktadaki hızı
    const k = 260, c = 26;
    let ax = k * ex + c * (platform.v.x - v.x);
    let ay = k * ey + c * (platform.v.y - v.y) + 9.81 * 0.0;
    let az = k * ez + c * (platform.v.z - v.z);
    const amax = (this.ropeStrength / this.def.mass) * 2.2 * ropeMul + 6;
    const am = Math.hypot(ax, ay, az);
    if (am > amax) {
      ax *= amax / am;
      ay *= amax / am;
      az *= amax / am;
    }
    const m = this.def.mass;
    b.applyImpulse({ x: ax * m * dt, y: ay * m * dt, z: az * m * dt }, true);
    // dönüş: hedef yöne doğru açısal yay
    const r = b.rotation();
    const cq = new THREE.Quaternion(r.x, r.y, r.z, r.w);
    const dq = tq.clone().multiply(cq.invert());
    if (dq.w < 0) {
      dq.x = -dq.x;
      dq.y = -dq.y;
      dq.z = -dq.z;
      dq.w = -dq.w;
    }
    const ang = 2 * Math.acos(Math.min(1, dq.w));
    const s = Math.sqrt(Math.max(1e-8, 1 - dq.w * dq.w));
    const av = b.angvel();
    const kr = 60 * ropeMul, cr = 8;
    const wx = (dq.x / s) * ang * kr - av.x * cr, wy = (dq.y / s) * ang * kr - av.y * cr, wz = (dq.z / s) * ang * kr - av.z * cr;
    b.setAngvel({ x: av.x + wx * dt, y: av.y + wy * dt, z: av.z + wz * dt }, true);
    // urgan kopması: uzun süre fazla gerilirse
    const snapAt = this.kind === 'piano' ? 0.32 : 0.24;
    if (dist > snapAt) this.strainT += dt;
    else this.strainT = Math.max(0, this.strainT - dt * 2);
    if (this.strainT > 0.14 || dist > 0.9) {
      this.attached = false;
      this.groundT = 0;
      return 'snap';
    }
    return null;
  }

  // serbest düşerken: yere çarpınca kırılabilir
  checkImpact(dt) {
    if (this.attached || this.broken) return null;
    const v = this.body.linvel();
    const sp = Math.hypot(v.x, v.y, v.z);
    const dv = this.lastVel - sp;
    this.lastVel = sp;
    if (this.def.fragile && dv > (this.kind === 'piano' ? 3.2 : 2.6)) {
      this.broken = true;
      return 'break';
    }
    if (dv > 2.2) return 'thud';
    return null;
  }

  sync() {
    const p = this.body.translation(), r = this.body.rotation();
    this.mesh.position.set(p.x, p.y, p.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
  }

  // kırılınca: gövde dursun, görsel ezilsin
  shatter() {
    this.mesh.scale.y = 0.55;
    this.mesh.traverse((o) => {
      if (o.isMesh && o.material && !o.material._dim) {
        o.material = o.material.clone();
        o.material._dim = true;
        o.material.color && o.material.color.multiplyScalar(0.6);
      }
    });
  }

  dispose() {
    this.g.scene.remove(this.mesh);
    this.g.world.removeRigidBody(this.body);
  }
}
