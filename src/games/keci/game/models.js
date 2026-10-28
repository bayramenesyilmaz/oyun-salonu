import * as THREE from 'three';

// Kodla üretilen, sevimli ve abartılı modeller: keçi, köylü, tavuk.
// Tümü düşük poligonlu ve "flat" gölgeli; çizgi film havası için.

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true, ...opts });

function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Kocaman, komik gözler
function googlyEye(parent, x, y, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  mesh(new THREE.SphereGeometry(0.07 * s, 12, 10), M(0xffffff, { roughness: 0.3, flatShading: false }), g);
  const pupil = mesh(new THREE.SphereGeometry(0.035 * s, 10, 8), M(0x111111, { roughness: 0.2, flatShading: false }), g, 0, 0, 0.045 * s);
  g.userData.pupil = pupil;
  return g;
}

// ---------------- KEÇİ: Gıdık ----------------
export function makeGoat() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = M(0xf2ece0);
  const patch = M(0x7a5236);
  const dark = M(0x2a2420);
  const horn = M(0xc9b48a);
  const pink = M(0xf0a0a0);

  // gövde
  const torsoG = new THREE.CapsuleGeometry(0.28, 0.55, 4, 10);
  torsoG.rotateX(Math.PI / 2);
  const torso = mesh(torsoG, fur, body, 0, 0.62, 0);
  torso.scale.set(1, 0.95, 1);
  // kahverengi lekeler
  mesh(new THREE.SphereGeometry(0.2, 8, 6), patch, body, 0.16, 0.74, -0.15).scale.set(0.6, 0.7, 1);
  mesh(new THREE.SphereGeometry(0.16, 8, 6), patch, body, -0.18, 0.7, 0.18).scale.set(0.5, 0.7, 0.9);

  // boyun + baş
  const neck = new THREE.Group();
  neck.position.set(0, 0.78, 0.4);
  body.add(neck);
  const neckM = mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.35, 8), fur, neck, 0, 0.12, 0.04);
  neckM.rotation.x = -0.5;
  const head = new THREE.Group();
  head.position.set(0, 0.3, 0.14);
  neck.add(head);
  const skull = mesh(new THREE.BoxGeometry(0.24, 0.24, 0.34), fur, head, 0, 0, 0.04);
  skull.geometry.translate(0, 0, 0);
  mesh(new THREE.BoxGeometry(0.18, 0.16, 0.16), fur, head, 0, -0.05, 0.25); // burun
  mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), pink, head, 0, -0.04, 0.335);
  mesh(new THREE.SphereGeometry(0.02, 6, 4), dark, head, -0.04, -0.01, 0.335);
  mesh(new THREE.SphereGeometry(0.02, 6, 4), dark, head, 0.04, -0.01, 0.335);
  // keçi sakalı
  const beard = mesh(new THREE.ConeGeometry(0.05, 0.18, 6), M(0xd8d0c0), head, 0, -0.2, 0.26);
  beard.rotation.x = Math.PI;
  // gözler (abartılı)
  const eyeL = googlyEye(head, -0.12, 0.07, 0.12, 1.1);
  const eyeR = googlyEye(head, 0.12, 0.07, 0.12, 1.1);
  eyeL.rotation.y = -0.4;
  eyeR.rotation.y = 0.4;
  // kulaklar
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(s * 0.13, 0.04, -0.04);
    head.add(ear);
    const e = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.09), fur, ear, s * 0.1, 0, 0);
    e.rotation.z = s * -0.35;
    ears.push(ear);
  }
  // kıvrık boynuzlar
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.06, 0.1, 0.02),
      new THREE.Vector3(s * 0.1, 0.24, -0.06),
      new THREE.Vector3(s * 0.14, 0.26, -0.2),
      new THREE.Vector3(s * 0.16, 0.16, -0.26),
    ]);
    mesh(new THREE.TubeGeometry(curve, 10, 0.03, 6, false), horn, head);
  }
  // zil (boyunda)
  const bell = mesh(new THREE.ConeGeometry(0.06, 0.09, 10, 1, true), M(0xe0b040, { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }), neck, 0, -0.06, 0.2);
  bell.rotation.x = Math.PI;
  mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 14), M(0xb02a2a), neck, 0, 0.02, 0.1).rotation.x = Math.PI / 2 - 0.5;

  // bacaklar
  const legs = [];
  for (const [x, z] of [[-0.15, 0.32], [0.15, 0.32], [-0.15, -0.32], [0.15, -0.32]]) {
    const hip = new THREE.Group();
    hip.position.set(x, 0.55, z);
    body.add(hip);
    mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.3, 6).translate(0, -0.15, 0), fur, hip);
    const knee = new THREE.Group();
    knee.position.y = -0.3;
    hip.add(knee);
    mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.24, 6).translate(0, -0.12, 0), fur, knee);
    mesh(new THREE.BoxGeometry(0.08, 0.06, 0.1), dark, knee, 0, -0.25, 0.01);
    legs.push({ hip, knee, front: z > 0, side: x > 0 ? 1 : -1 });
  }
  // kuyruk
  const tail = new THREE.Group();
  tail.position.set(0, 0.78, -0.48);
  body.add(tail);
  mesh(new THREE.ConeGeometry(0.05, 0.16, 6).translate(0, 0.08, 0), fur, tail).rotation.x = -0.6;

  // ağızda taşınan eşya için bağlantı noktası
  const mouth = new THREE.Object3D();
  mouth.position.set(0, -0.12, 0.32);
  head.add(mouth);

  return {
    root, body, head, neck, legs, tail, ears, eyes: [eyeL, eyeR], mouth,
    phase: 0,
    butt: 0,
    bleat: 0,
    animate(dt, t, speed, grounded, vy) {
      const moving = speed > 0.3;
      this.phase += dt * (moving ? 4 + speed * 2.2 : 1);
      const ph = this.phase;
      const amp = Math.min(1, speed / 5);
      for (const L of legs) {
        const off = (L.front ? 0 : Math.PI) + (L.side > 0 ? Math.PI / 2 : 0);
        if (!grounded) {
          L.hip.rotation.x = L.front ? -0.7 : 0.6;
          L.knee.rotation.x = L.front ? 0.9 : -0.3;
        } else {
          L.hip.rotation.x = Math.sin(ph + off) * 0.75 * amp;
          L.knee.rotation.x = Math.max(0, Math.sin(ph + off + 1)) * 0.9 * amp;
        }
      }
      // zıplayan, komik koşu
      body.position.y = grounded ? Math.abs(Math.sin(ph)) * 0.1 * amp : 0;
      body.rotation.x = grounded ? Math.sin(ph * 2) * 0.05 * amp : THREE.MathUtils.clamp(-vy * 0.05, -0.4, 0.4);
      body.rotation.z = Math.sin(ph) * 0.04 * amp;
      tail.rotation.x = Math.sin(t * 14) * 0.4;
      tail.rotation.z = Math.sin(t * 9) * 0.3;
      for (const [i, e] of ears.entries()) e.rotation.x = Math.sin(t * 3 + i) * 0.15 + (moving ? 0.3 : 0);
      // kafa atma
      if (this.butt > 0) {
        this.butt -= dt;
        const k = this.butt / 0.35;
        neck.rotation.x = Math.sin((1 - k) * Math.PI) * 0.9;
      } else neck.rotation.x = Math.sin(t * 1.5) * 0.05 + (moving ? 0.15 : 0);
      // meleme: ağzı aç, kafayı kaldır
      if (this.bleat > 0) {
        this.bleat -= dt;
        head.rotation.x = -0.5 * Math.sin(Math.min(1, this.bleat / 0.6) * Math.PI);
        head.rotation.z = Math.sin(t * 40) * 0.08;
      } else {
        head.rotation.x = 0;
        head.rotation.z = 0;
      }
      // gözler: sallanan göz bebekleri
      for (const e of this.eyes) {
        const p = e.userData.pupil;
        p.position.x = Math.sin(t * 2.3 + e.position.x * 10) * 0.012 + (moving ? Math.sin(ph * 2) * 0.015 : 0);
        p.position.y = Math.cos(t * 1.7) * 0.01;
      }
    },
  };
}

// ---------------- KÖYLÜ ----------------
const PALETTES = {
  cafer: { shirt: 0x6b7b4a, pants: 0x3d352c, skin: 0xd4a27a, hat: 'kasket', hatColor: 0x3a3530, mustache: true, staff: true },
  riza: { shirt: 0xffffff, pants: 0x34404e, skin: 0xd9a582, hat: 'takke', hatColor: 0xffffff, mustache: true, apron: 0x3e7a3a, belly: true },
  fadime: { shirt: 0xb84a7a, pants: 0x7a3a8a, skin: 0xe0b08e, hat: 'yemeni', hatColor: 0xf0e0a0, skirt: true },
  muhtar: { shirt: 0x2f3542, pants: 0x2f3542, skin: 0xd09a76, hat: 'none', mustache: true, belly: true, tie: 0xa02020 },
  gelin: { shirt: 0xfaf6f0, pants: 0xfaf6f0, skin: 0xebbd9a, hat: 'duvak', hatColor: 0xffffff, skirt: true, dress: true },
  damat: { shirt: 0x1d2230, pants: 0x1d2230, skin: 0xdba882, hat: 'none', tie: 0xc9a227 },
  cocuk: { shirt: 0xe8a830, pants: 0x2a5a9a, skin: 0xe8b894, hat: 'none', small: true },
  davulcu: { shirt: 0x9a2a2a, pants: 0x2a2a2a, skin: 0xc89070, hat: 'kasket', hatColor: 0x222222, mustache: true, drum: true },
  zurnaci: { shirt: 0x2a6a9a, pants: 0x2a2a2a, skin: 0xc89070, hat: 'kasket', hatColor: 0x222222, mustache: true, zurna: true },
  koylu1: { shirt: 0x8a5a2a, pants: 0x3a3a30, skin: 0xd0a07a, hat: 'kasket', hatColor: 0x4a4038, mustache: true },
  koylu2: { shirt: 0x3a8a7a, pants: 0x5a2a4a, skin: 0xe0b08e, hat: 'yemeni', hatColor: 0xe05050, skirt: true },
  koylu3: { shirt: 0xc0b080, pants: 0x30302a, skin: 0xc8946c, hat: 'none', mustache: true, belly: true },
};

export function makeVillager(kind) {
  const P = PALETTES[kind] || PALETTES.koylu1;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const sc = P.small ? 0.7 : 1;
  body.scale.setScalar(sc);
  const skin = M(P.skin);
  const shirt = M(P.shirt);
  const pants = M(P.pants);
  const dark = M(0x222222);

  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.12, 0.75, 0);
    body.add(hip);
    mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.7, 8).translate(0, -0.35, 0), pants, hip);
    mesh(new THREE.BoxGeometry(0.14, 0.08, 0.24), dark, hip, 0, -0.72, 0.04);
    legs.push({ hip, s });
  }
  const torsoW = P.belly ? 0.36 : 0.28;
  const torso = mesh(new THREE.CylinderGeometry(0.27, torsoW, 0.65, 10), shirt, body, 0, 1.1, 0);
  torso.scale.z = 0.8;
  if (P.belly) mesh(new THREE.SphereGeometry(0.28, 10, 8), shirt, body, 0, 0.98, 0.08).scale.set(1.05, 0.9, 0.9);
  if (P.skirt) {
    const sk = mesh(new THREE.ConeGeometry(0.42, 0.75, 12, 1, true), P.dress ? shirt : pants, body, 0, 0.6, 0);
    sk.material = sk.material.clone();
    sk.material.side = THREE.DoubleSide;
  }
  if (P.apron) mesh(new THREE.BoxGeometry(0.4, 0.55, 0.04), M(P.apron), body, 0, 0.95, 0.3);
  if (P.tie) mesh(new THREE.BoxGeometry(0.06, 0.32, 0.02), M(P.tie), body, 0, 1.18, 0.23);

  // kocaman baş (çizgi film oranı)
  const head = new THREE.Group();
  head.position.set(0, 1.62, 0);
  body.add(head);
  mesh(new THREE.SphereGeometry(0.27, 14, 12), skin, head).scale.set(1, 1.05, 0.95);
  mesh(new THREE.SphereGeometry(0.06, 8, 6), skin, head, 0, -0.02, 0.27); // burun
  const eyes = [googlyEye(head, -0.1, 0.06, 0.22, 0.9), googlyEye(head, 0.1, 0.06, 0.22, 0.9)];
  if (P.mustache) {
    const mm = M(0x2a2018);
    for (const s of [-1, 1]) {
      const m = mesh(new THREE.CapsuleGeometry(0.03, 0.1, 3, 6), mm, head, s * 0.06, -0.08, 0.25);
      m.rotation.z = Math.PI / 2 + s * 0.3;
    }
  }
  const mouth = mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 10, Math.PI), M(0x6a2020), head, 0, -0.14, 0.24);
  mouth.rotation.z = Math.PI;
  if (P.hat === 'kasket') {
    mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.1, 14), M(P.hatColor), head, 0, 0.22, 0);
    mesh(new THREE.BoxGeometry(0.28, 0.02, 0.16), M(P.hatColor), head, 0, 0.18, 0.24);
  } else if (P.hat === 'takke') {
    mesh(new THREE.SphereGeometry(0.22, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(P.hatColor), head, 0, 0.14, 0);
  } else if (P.hat === 'yemeni') {
    const y = mesh(new THREE.SphereGeometry(0.31, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), M(P.hatColor), head, 0, 0.02, -0.03);
    y.scale.set(1, 1.1, 1);
    // oya kenar
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mesh(new THREE.SphereGeometry(0.025, 5, 4), M(0xffffff), head, Math.cos(a) * 0.29, -0.04, Math.sin(a) * 0.29 - 0.03);
    }
  } else if (P.hat === 'duvak') {
    const d = mesh(new THREE.ConeGeometry(0.4, 0.9, 14, 1, true), M(0xffffff, { transparent: true, opacity: 0.6, side: THREE.DoubleSide }), head, 0, -0.18, -0.05);
    d.rotation.x = 0.08;
    mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16), M(0xffe070, { metalness: 0.6, roughness: 0.3 }), head, 0, 0.2, 0).rotation.x = Math.PI / 2;
    mesh(new THREE.BoxGeometry(0.3, 0.12, 0.03), M(0xc02020), body, 0, 1.0, 0.24); // kırmızı kuşak
  } else {
    mesh(new THREE.SphereGeometry(0.275, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), M(0x2a2018), head, 0, 0.02, -0.02);
  }

  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 0.3, 1.36, 0);
    body.add(sh);
    mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.6, 8).translate(0, -0.3, 0), shirt, sh);
    mesh(new THREE.SphereGeometry(0.075, 8, 6), skin, sh, 0, -0.62, 0);
    arms.push({ sh, s });
  }
  let prop = null;
  if (P.staff) {
    prop = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6), M(0x6a4a2a), arms[1].sh, 0, -0.5, 0.1);
    mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 10, Math.PI), M(0x6a4a2a), prop, -0.09, 0.75, 0);
  }
  if (P.drum) {
    const drum = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.3, 16), M(0xc8a060), body, 0, 1.0, 0.36);
    drum.rotation.x = Math.PI / 2;
    drum.rotation.z = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 16), M(0xf0e8d0), drum, 0, 0.16, 0);
    mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 16), M(0xf0e8d0), drum, 0, -0.16, 0);
  }
  if (P.zurna) {
    const z = mesh(new THREE.ConeGeometry(0.07, 0.55, 10, 1, true), M(0x8a5a2a, { side: THREE.DoubleSide }), head, 0, -0.3, 0.42);
    z.rotation.x = -Math.PI / 2 - 0.5;
  }

  return {
    root, body, head, legs, arms, eyes, mouth, kind,
    phase: Math.random() * 6,
    fallen: 0,
    talk: 0,
    animate(dt, t, speed, { dance = false, panic = false } = {}) {
      const moving = speed > 0.2;
      this.phase += dt * (moving ? 3 + speed * 2 : 1.2);
      const ph = this.phase;
      const amp = Math.min(1, speed / 3);
      if (this.fallen > 0) {
        // komik düşüş: sırtüstü, bacaklar havada
        this.fallen -= dt;
        const k = Math.min(1, (2.2 - this.fallen) * 4);
        body.rotation.x = -k * 1.5;
        body.position.y = k * 0.25;
        for (const L of legs) L.hip.rotation.x = -0.8 + Math.sin(t * 20 + L.s) * 0.3;
        for (const A of arms) {
          A.sh.rotation.x = -2.6;
          A.sh.rotation.z = A.s * 0.6 + Math.sin(t * 18) * 0.2;
        }
        if (this.fallen <= 0) body.rotation.x = body.position.y = 0;
        return;
      }
      body.rotation.x = 0;
      for (const L of legs) L.hip.rotation.x = Math.sin(ph + (L.s > 0 ? Math.PI : 0)) * 0.6 * amp;
      body.position.y = moving ? Math.abs(Math.cos(ph)) * 0.05 : 0;
      if (dance) {
        // halay: kollar yukarıda, omuz omuza
        for (const A of arms) {
          A.sh.rotation.x = -2.4;
          A.sh.rotation.z = A.s * (0.3 + Math.sin(t * 6) * 0.1);
        }
        body.position.y = Math.abs(Math.sin(t * 5.5)) * 0.12;
        body.rotation.z = Math.sin(t * 2.75) * 0.08;
      } else if (panic) {
        for (const A of arms) {
          A.sh.rotation.x = -2.8 + Math.sin(t * 22 + A.s) * 0.4;
          A.sh.rotation.z = A.s * 0.5;
        }
      } else {
        for (const A of arms) {
          A.sh.rotation.x = Math.sin(ph + (A.s > 0 ? 0 : Math.PI)) * 0.5 * amp + (this.talk > 0 && A.s > 0 ? -1 + Math.sin(t * 9) * 0.3 : 0);
          A.sh.rotation.z = A.s * 0.1;
        }
      }
      this.talk = Math.max(0, this.talk - dt);
      head.rotation.z = Math.sin(t * 1.3 + this.phase * 0.1) * 0.05;
      this.mouth.scale.y = this.talk > 0 ? 1 + Math.abs(Math.sin(t * 18)) * 1.5 : 1;
    },
  };
}

// ---------------- TAVUK ----------------
export function makeChicken() {
  const root = new THREE.Group();
  const white = M(0xfaf6ee);
  const red = M(0xd8302a);
  const yellow = M(0xf0b030);
  const body = mesh(new THREE.SphereGeometry(0.18, 10, 8), white, root, 0, 0.25, 0);
  body.scale.set(0.9, 0.9, 1.15);
  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.13);
  root.add(head);
  mesh(new THREE.SphereGeometry(0.09, 8, 6), white, head);
  mesh(new THREE.ConeGeometry(0.03, 0.08, 5), yellow, head, 0, -0.01, 0.1).rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.02, 0.07, 0.08), red, head, 0, 0.09, 0);
  mesh(new THREE.SphereGeometry(0.025, 5, 4), red, head, 0, -0.06, 0.07);
  googlyEye(head, -0.06, 0.02, 0.05, 0.5);
  googlyEye(head, 0.06, 0.02, 0.05, 0.5);
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(s * 0.16, 0.3, 0);
    root.add(w);
    mesh(new THREE.BoxGeometry(0.04, 0.12, 0.2), white, w, 0, -0.05, 0);
    wings.push({ w, s });
  }
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 4), yellow, root, s * 0.06, 0.07, 0);
  mesh(new THREE.ConeGeometry(0.08, 0.16, 5), white, root, 0, 0.32, -0.2).rotation.x = -0.8;
  return {
    root, head, wings,
    flap: 0,
    animate(dt, t, speed) {
      this.flap = Math.max(0, this.flap - dt);
      const f = this.flap > 0 || speed > 2.5;
      for (const W of wings) W.w.rotation.z = W.s * (f ? 0.6 + Math.sin(t * 40) * 0.6 : 0.05);
      head.position.z = 0.13 + (speed > 0.3 ? Math.sin(t * 16) * 0.04 : Math.sin(t * 3) * 0.01);
      head.rotation.x = speed < 0.3 && Math.sin(t * 0.7 + root.id) > 0.8 ? 0.8 : 0; // yem gagalama
      root.children[0].position.y = 0.25 + (speed > 0.3 ? Math.abs(Math.sin(t * 16)) * 0.04 : 0);
    },
  };
}
