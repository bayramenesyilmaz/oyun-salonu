import * as THREE from 'three';

// Karakterler: Necmi Bey, Usta Rıfat ve Cingöz (cin). Çizgi film oranlarında, kodla üretilmiş.

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
function part(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function eye(parent, x, y, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  part(new THREE.SphereGeometry(0.055 * s, 14, 10), M(0xffffff, { roughness: 0.25 }), g);
  const p = part(new THREE.SphereGeometry(0.028 * s, 10, 8), M(0x161616, { roughness: 0.2 }), g, 0, 0, 0.035 * s);
  const lid = part(new THREE.SphereGeometry(0.058 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xd8a080), g);
  lid.rotation.x = -Math.PI / 2 - 0.3;
  lid.scale.set(1, 1, 0.35);
  g.userData = { pupil: p, lid };
  return g;
}

// ---------------- İnsanlar ----------------
const LOOKS = {
  necmi: { skin: 0xe0a880, shirt: 0xf2efe6, vest: 0x5a3a2a, pants: 0x3a3a44, shoes: 0x2a1a10, belly: 1.25, hair: 0x9a9a9a, bald: true, mustache: 0x5a5a5a, glasses: true, tie: 0x9a2a2a },
  usta: { skin: 0xc8906a, shirt: 0x3a6a9a, vest: 0x2a4a6a, pants: 0x3a4a5a, shoes: 0x3a2a1a, belly: 1.05, hair: 0x2a2018, cap: 0xd8a030, mustache: 0x2a2018 },
  defne: { skin: 0xf0c0a0, shirt: 0xf07aa8, vest: 0xf07aa8, pants: 0x4a6ac0, shoes: 0xe8e8e8, belly: 0.9, hair: 0x4a2a18, braids: true, small: true },
};

export function makePerson(kind) {
  const L = LOOKS[kind];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const S = L.small ? 0.7 : 1;
  body.scale.setScalar(S);
  const skin = M(L.skin, { roughness: 0.6 });
  // bacaklar (kalça + diz)
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.13, 0.82, 0);
    body.add(hip);
    part(new THREE.CapsuleGeometry(0.085, 0.3, 4, 8).translate(0, -0.2, 0), M(L.pants), hip);
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);
    part(new THREE.CapsuleGeometry(0.075, 0.28, 4, 8).translate(0, -0.18, 0), M(L.pants), knee);
    part(new THREE.BoxGeometry(0.14, 0.08, 0.26).translate(0, -0.36, 0.05), M(L.shoes, { roughness: 0.4 }), knee);
    legs.push({ hip, knee, s });
  }
  // gövde: göbekli
  const torso = new THREE.Group();
  torso.position.y = 0.86;
  body.add(torso);
  const belly = part(new THREE.SphereGeometry(0.3, 18, 14), M(L.shirt), torso, 0, 0.28, 0.02);
  belly.scale.set(1 * L.belly, 1.15, 0.9 * L.belly);
  const vest = part(new THREE.SphereGeometry(0.305, 18, 14, 0, Math.PI * 2, 0.15, Math.PI * 0.72), M(L.vest), torso, 0, 0.3, 0);
  vest.scale.set(1.02 * L.belly, 1.12, 0.88 * L.belly);
  if (L.tie) part(new THREE.BoxGeometry(0.07, 0.26, 0.02), M(L.tie), torso, 0, 0.44, 0.27 * L.belly);
  // baş
  const head = new THREE.Group();
  head.position.set(0, 0.82, 0.02);
  torso.add(head);
  part(new THREE.CylinderGeometry(0.08, 0.1, 0.14, 10), skin, head, 0, -0.08, 0);
  const skull = part(new THREE.SphereGeometry(0.25, 20, 16), skin, head, 0, 0.18, 0);
  skull.scale.set(1, 1.08, 1);
  part(new THREE.SphereGeometry(0.06, 10, 8), M(L.skin, { roughness: 0.5 }), head, 0, 0.14, 0.25).scale.set(1, 0.9, 1.2); // burun
  for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.055, 10, 8), skin, head, s * 0.25, 0.16, 0).scale.set(0.5, 1, 0.8); // kulak
  const eyes = [eye(head, -0.09, 0.25, 0.21), eye(head, 0.09, 0.25, 0.21)];
  for (const e of eyes) e.userData.lid.material = skin;
  const brows = [];
  for (const s of [-1, 1]) {
    const b = part(new THREE.BoxGeometry(0.11, 0.025, 0.03), M(L.mustache || L.hair), head, s * 0.09, 0.33, 0.22);
    brows.push(b);
  }
  const mouth = part(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), M(0x7a2a2a), head, 0, 0.05, 0.235);
  mouth.rotation.z = Math.PI;
  if (L.mustache) {
    for (const s of [-1, 1]) {
      const m = part(new THREE.CapsuleGeometry(0.03, 0.1, 4, 6), M(L.mustache), head, s * 0.06, 0.09, 0.25);
      m.rotation.z = Math.PI / 2 + s * 0.35;
    }
  }
  if (L.bald) {
    for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.12, 10, 8), M(L.hair, { roughness: 1 }), head, s * 0.2, 0.22, -0.06).scale.set(0.6, 0.8, 1.1);
  } else if (L.braids) {
    part(new THREE.SphereGeometry(0.26, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M(L.hair, { roughness: 1 }), head, 0, 0.2, -0.02);
    for (const s of [-1, 1]) part(new THREE.CapsuleGeometry(0.05, 0.26, 4, 6), M(L.hair), head, s * 0.22, -0.02, -0.08);
  } else {
    part(new THREE.SphereGeometry(0.255, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), M(L.hair, { roughness: 1 }), head, 0, 0.2, -0.02);
  }
  if (L.cap) {
    part(new THREE.CylinderGeometry(0.26, 0.27, 0.12, 16), M(L.cap), head, 0, 0.4, 0);
    part(new THREE.BoxGeometry(0.28, 0.025, 0.18), M(L.cap), head, 0, 0.35, 0.24);
  }
  if (L.glasses) {
    for (const s of [-1, 1]) {
      const r = part(new THREE.TorusGeometry(0.06, 0.01, 6, 16), M(0x2a2a2a, { metalness: 0.6 }), head, s * 0.09, 0.25, 0.25);
      void r;
    }
    part(new THREE.BoxGeometry(0.06, 0.012, 0.01), M(0x2a2a2a), head, 0, 0.26, 0.255);
  }
  // kollar
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 0.3 * L.belly, 0.6, 0);
    torso.add(sh);
    part(new THREE.CapsuleGeometry(0.07, 0.26, 4, 8).translate(0, -0.18, 0), M(L.shirt), sh);
    const el = new THREE.Group();
    el.position.y = -0.36;
    sh.add(el);
    part(new THREE.CapsuleGeometry(0.06, 0.24, 4, 8).translate(0, -0.16, 0), M(L.shirt), el);
    const hand = part(new THREE.SphereGeometry(0.065, 10, 8), skin, el, 0, -0.34, 0);
    arms.push({ sh, el, hand, s });
  }
  // el eşyası yuvası (bardak, gazete, hortum ucu)
  const holdR = new THREE.Group();
  arms[1].hand.add(holdR);

  root.traverse((o) => o.isMesh && (o.castShadow = true));

  const P = {
    root, body, torso, head, legs, arms, eyes, brows, mouth, holdR, kind,
    phase: Math.random() * 6,
    face: 'normal',
    react: null,
    animate(dt, t, state) {
      const { speed = 0, anim = 'idle', stairs = 0 } = state;
      this.phase += dt * (speed > 0.1 ? 7 * Math.min(1.4, speed / 1.4) : 1.5);
      const ph = this.phase;
      // sıfırla
      body.position.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      torso.rotation.set(0, 0, 0);
      head.rotation.set(0, 0, 0);
      for (const g of legs) {
        g.hip.rotation.set(0, 0, 0);
        g.knee.rotation.set(0, 0, 0);
      }
      for (const a of arms) {
        a.sh.rotation.set(0, 0, a.s * 0.12);
        a.el.rotation.set(0, 0, 0);
      }
      let brow = 0, mouthOpen = 1, blink = Math.sin(t * 0.7 + this.phase) > 0.985 ? 1 : 0;
      const R = this.react;
      if (R) {
        R.t += dt;
        const k = R.t;
        switch (R.kind) {
          case 'spit':
            torso.rotation.x = 0.5 - Math.min(0.5, k * 2);
            head.rotation.x = -0.3;
            mouthOpen = 3;
            arms[1].sh.rotation.x = -1.6;
            arms[1].el.rotation.x = -1.2;
            brow = 0.15;
            break;
          case 'fall':
          case 'slip':
            body.rotation.x = -Math.min(1.4, k * 5);
            body.position.y = k < 0.4 ? Math.sin(k * 7) * 0.4 : 0.15;
            for (const g of legs) g.hip.rotation.x = -1.2 + Math.sin(t * 20 + g.s) * 0.3;
            for (const a of arms) (a.sh.rotation.x = -2.6 + Math.sin(t * 16 + a.s) * 0.4), (a.sh.rotation.z = a.s * 0.9);
            mouthOpen = 3;
            brow = 0.2;
            blink = 0;
            break;
          case 'bang':
            arms[1].sh.rotation.x = -1.2 + Math.abs(Math.sin(t * 14)) * 0.8;
            arms[1].el.rotation.x = -0.6;
            body.position.y = Math.abs(Math.sin(t * 7)) * 0.06;
            brow = -0.2;
            mouthOpen = 2;
            break;
          case 'scream':
          case 'jump':
            body.position.y = R.kind === 'jump' ? Math.max(0, Math.sin(Math.min(1, k * 1.5) * Math.PI)) * 0.8 : Math.abs(Math.sin(t * 30)) * 0.05;
            for (const a of arms) (a.sh.rotation.x = -2.8), (a.sh.rotation.z = a.s * (0.6 + Math.sin(t * 25) * 0.2));
            mouthOpen = 4;
            brow = 0.25;
            break;
          case 'splash':
          case 'paint':
          case 'spicy':
            head.rotation.x = Math.sin(t * 18) * 0.15;
            head.rotation.y = Math.sin(t * 11) * 0.4;
            for (const a of arms) (a.sh.rotation.x = -2.2 + Math.sin(t * 14 + a.s) * 0.3), (a.el.rotation.x = -1.4);
            body.position.y = R.kind === 'spicy' ? Math.abs(Math.sin(t * 12)) * 0.25 : 0;
            mouthOpen = 3;
            brow = 0.2;
            break;
          case 'rage':
            body.position.y = Math.abs(Math.sin(t * 16)) * 0.12;
            for (const a of arms) (a.sh.rotation.x = -2.4 + Math.sin(t * 20 + a.s * 2) * 0.5);
            brow = -0.35;
            mouthOpen = 3;
            break;
          case 'spin':
            body.rotation.y = k * 18;
            body.position.y = 0.15 + Math.sin(k * 6) * 0.1;
            for (const a of arms) (a.sh.rotation.z = a.s * 1.4);
            mouthOpen = 3;
            break;
          case 'cats':
            body.rotation.x = Math.sin(t * 2) * 0.1 - (Math.floor(k * 1.4) % 2 ? 0.35 : 0); // hapşırık
            for (const a of arms) (a.sh.rotation.x = -1.5), (a.el.rotation.x = -1.0);
            mouthOpen = 2;
            brow = 0.1;
            break;
          case 'caught':
            arms[1].sh.rotation.x = -1.6;
            arms[1].sh.rotation.z = 0.3;
            arms[1].el.rotation.x = -0.2;
            torso.rotation.x = -0.15;
            brow = -0.3;
            mouthOpen = 2.5;
            break;
          case 'look':
            head.rotation.y = Math.sin(t * 3) * 0.7;
            brow = 0.12;
            break;
        }
        if (R.t > R.dur) this.react = null;
      } else if (speed > 0.1) {
        const sw = Math.sin(ph);
        for (const g of legs) {
          g.hip.rotation.x = sw * 0.6 * g.s;
          g.knee.rotation.x = Math.max(0, -sw * g.s) * 0.9;
        }
        for (const a of arms) a.sh.rotation.x = -sw * 0.5 * a.s;
        body.position.y = Math.abs(Math.cos(ph)) * 0.05 + stairs;
        torso.rotation.z = Math.sin(ph) * 0.04;
      } else {
        torso.rotation.x = Math.sin(t * 1.4) * 0.015;
        switch (anim) {
          case 'sit':
            body.position.y = -0.36;
            for (const g of legs) (g.hip.rotation.x = -1.5), (g.knee.rotation.x = 1.5);
            arms[0].sh.rotation.x = arms[1].sh.rotation.x = -1.1;
            arms[0].el.rotation.x = arms[1].el.rotation.x = -0.6;
            head.rotation.x = 0.25;
            break;
          case 'drink':
            arms[1].sh.rotation.x = -0.6 - Math.max(0, Math.sin(t * 1.2)) * 1.1;
            arms[1].el.rotation.x = -1.6;
            head.rotation.x = -Math.max(0, Math.sin(t * 1.2)) * 0.25;
            break;
          case 'work':
            torso.rotation.x = 0.4 + Math.sin(t * 2) * 0.1;
            for (const a of arms) (a.sh.rotation.x = -1.0 + Math.sin(t * 3 + a.s) * 0.3);
            break;
          case 'tv':
            arms[1].sh.rotation.x = -1.3;
            arms[1].el.rotation.x = -0.2;
            break;
          case 'shower':
            for (const a of arms) (a.sh.rotation.x = -2.6), (a.el.rotation.x = -1.2 + Math.sin(t * 6 + a.s) * 0.4);
            head.rotation.x = -0.3;
            break;
          case 'sleep':
            body.rotation.z = Math.PI / 2;
            body.position.set(-0.3, 0.75, 0);
            blink = 1;
            break;
          case 'water':
            arms[1].sh.rotation.x = -1.1;
            arms[1].el.rotation.x = -0.3;
            torso.rotation.y = Math.sin(t * 0.8) * 0.4;
            break;
          case 'read':
            torso.rotation.x = 0.45;
            for (const a of arms) (a.sh.rotation.x = -0.9), (a.el.rotation.x = -0.5);
            head.rotation.x = 0.4;
            break;
          case 'point':
            arms[1].sh.rotation.x = -1.5;
            arms[1].sh.rotation.z = -0.2 + Math.sin(t * 3) * 0.2;
            head.rotation.y = Math.sin(t * 1.5) * 0.3;
            break;
          case 'eat':
            arms[1].sh.rotation.x = -0.7 - Math.max(0, Math.sin(t * 2.5)) * 0.8;
            arms[1].el.rotation.x = -1.5;
            torso.rotation.x = 0.15;
            break;
          case 'drill':
            arms[1].sh.rotation.x = -1.4;
            body.position.x = Math.sin(t * 50) * 0.01;
            break;
        }
      }
      // yüz
      for (const b of brows) b.rotation.z = (b.position.x > 0 ? 1 : -1) * brow * -2;
      for (const b of brows) b.position.y = 0.33 + Math.abs(brow) * 0.05 * (brow > 0 ? 1 : -0.5);
      mouth.scale.set(1, mouthOpen, 1);
      for (const e of eyes) {
        e.userData.lid.rotation.x = blink ? 0 : -Math.PI / 2 - 0.3 - (brow > 0.15 ? 0.6 : 0);
        e.userData.pupil.position.x = Math.sin(t * 0.9 + this.phase) * 0.01;
      }
    },
    startReact(kind, dur = 3) {
      this.react = { kind, t: 0, dur };
    },
  };
  return P;
}

// ---------------- CİNGÖZ ----------------
export function makeCin() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const glow = new THREE.MeshStandardMaterial({ color: 0x58d8f0, emissive: 0x1aa8d0, emissiveIntensity: 0.55, roughness: 0.35, transparent: true, opacity: 0.88 });
  // damla gövde (alttan dumana dönüşür)
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const r = t < 0.15 ? t * 1.2 : 0.18 + Math.sin(t * Math.PI) * 0.28 * (1 - t * 0.25);
    pts.push(new THREE.Vector2(Math.max(0.01, r), t * 1.25));
  }
  const torso = part(new THREE.LatheGeometry(pts, 24), glow, body, 0, 0.15, 0);
  // baş
  const head = new THREE.Group();
  head.position.y = 1.45;
  body.add(head);
  const skull = part(new THREE.SphereGeometry(0.3, 22, 18), glow, head);
  skull.scale.set(1.05, 0.95, 0.95);
  // fes
  const fez = part(new THREE.CylinderGeometry(0.14, 0.18, 0.2, 16), M(0xb8202a, { roughness: 0.6 }), head, 0.04, 0.3, -0.02);
  fez.rotation.z = -0.25;
  const tassel = part(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 4), M(0x1a1a1a), head, -0.08, 0.36, -0.04);
  tassel.rotation.z = 0.9;
  // kocaman gözler ve sırıtış
  const eyes = [eye(head, -0.11, 0.05, 0.24, 1.6), eye(head, 0.11, 0.05, 0.24, 1.6)];
  for (const e of eyes) {
    e.userData.lid.material = glow;
    e.userData.pupil.material = M(0x2a0a40, { emissive: 0x3a1a60, emissiveIntensity: 0.4 });
  }
  const grin = part(new THREE.TorusGeometry(0.11, 0.018, 6, 14, Math.PI), M(0x0a3a4a), head, 0, -0.09, 0.26);
  grin.rotation.z = Math.PI;
  // sivri kulaklar
  for (const s of [-1, 1]) {
    const e = part(new THREE.ConeGeometry(0.06, 0.2, 6), glow, head, s * 0.29, 0.05, 0);
    e.rotation.z = -s * 1.2;
  }
  // uzun, ince kollar
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 0.32, 1.05, 0);
    body.add(sh);
    part(new THREE.CapsuleGeometry(0.045, 0.42, 4, 8).translate(0, -0.25, 0), glow, sh);
    const hand = part(new THREE.SphereGeometry(0.07, 10, 8), glow, sh, 0, -0.52, 0);
    for (let f = 0; f < 3; f++) part(new THREE.CapsuleGeometry(0.015, 0.06, 3, 4), glow, hand, (f - 1) * 0.035, -0.06, 0.02);
    arms.push({ sh, s });
  }
  // eşya taşıma yuvası
  const hold = new THREE.Group();
  arms[1].sh.children[1].add(hold);
  // duman izi
  const N = 40;
  const smokeG = new THREE.BufferGeometry();
  const sp = new Float32Array(N * 3), life = new Float32Array(N);
  smokeG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const smoke = new THREE.Points(smokeG, new THREE.PointsMaterial({ color: 0x8ae8ff, size: 0.18, transparent: true, opacity: 0.45, depthWrite: false }));
  smoke.frustumCulled = false;
  const light = new THREE.PointLight(0x58d8f0, 2.2, 3.5, 1.8);
  light.position.set(0, 1.2, 0.4);
  root.add(light);

  const C = {
    root, body, head, arms, eyes, grin, hold, smoke, glow, light, fez,
    phase: 0,
    work: 0,
    animate(dt, t, { speed = 0, hidden = false, working = false, scared = 0 }) {
      this.phase += dt;
      body.position.y = 0.25 + Math.sin(t * 2.2) * 0.08;
      body.rotation.z = speed > 0.1 ? -Math.sign(root.rotation.y) * 0 + Math.sin(t * 5) * 0.06 : Math.sin(t * 1.3) * 0.04;
      body.rotation.x = speed > 0.1 ? 0.25 : 0;
      head.rotation.z = Math.sin(t * 1.7) * 0.12;
      head.rotation.y = working ? Math.sin(t * 9) * 0.15 : 0;
      for (const a of arms) {
        a.sh.rotation.x = working ? -1.3 + Math.sin(t * 14 + a.s) * 0.4 : speed > 0.1 ? 0.6 : Math.sin(t * 1.8 + a.s) * 0.2;
        a.sh.rotation.z = a.s * (working ? 0.2 : 0.35 + Math.sin(t * 2 + a.s) * 0.1);
      }
      grin.scale.set(1, working ? 1.6 : 1 + Math.sin(t * 3) * 0.1, 1);
      // saklanınca neredeyse görünmez
      const target = hidden ? 0.12 : working ? 0.95 : 0.72;
      glow.opacity += (target - glow.opacity) * Math.min(1, dt * 6);
      glow.emissiveIntensity = 0.4 + (working ? 0.5 : 0) + scared * 0.5;
      light.intensity = hidden ? 0.2 : working ? 3.2 : 1.8;
      fez.visible = glow.opacity > 0.2;
      for (const e of this.eyes) e.userData.lid.rotation.x = Math.sin(t * 0.6) > 0.99 ? 0 : -Math.PI / 2 - 0.3;
      // duman
      for (let i = 0; i < N; i++) {
        life[i] -= dt;
        if (life[i] <= 0) {
          life[i] = 0.8 + Math.random() * 0.6;
          sp[i * 3] = root.position.x + (Math.random() - 0.5) * 0.2;
          sp[i * 3 + 1] = root.position.y + 0.25;
          sp[i * 3 + 2] = root.position.z + (Math.random() - 0.5) * 0.2;
        } else {
          sp[i * 3 + 1] -= dt * 0.15;
          sp[i * 3] += Math.sin(t * 3 + i) * dt * 0.2;
        }
      }
      smokeG.attributes.position.needsUpdate = true;
      smoke.material.opacity = glow.opacity * 0.5;
    },
  };
  root.traverse((o) => o.isMesh && (o.castShadow = true));
  return C;
}
