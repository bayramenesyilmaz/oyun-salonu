import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '@engine/textures.js';

// KUZULU KÖYÜ — güneşli, renkli, fizik dolu bir Anadolu köyü.
// Koordinatlar: köy meydanı (0,0). Ahır batıda, düğün meydanı güneyde (−Z), tepe ve göl doğuda.

export const SPOTS = {
  pen: { x: -32, z: 16, w: 12, d: 9 }, // ahır avlusu
  gate: { x: -26, z: 16 }, // avlu kapısı (doğu kenarı)
  stall: { x: -6, z: 8 }, // manav tezgâhı
  line: { x: 13, z: 25 }, // çamaşır ipi
  scarecrow: { x: 30, z: 30 }, // bostan korkuluğu
  coop: { x: -16, z: -12 }, // kümes
  tractor: { x: 22, z: -14 }, // tepe
  pond: { x: 40, z: -32, r: 8 }, // gölet
  wedding: { x: -2, z: -34 }, // düğün meydanı
  start: { x: -34, z: 16 },
};

const gauss = (x, z, cx, cz, s) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));

export function heightAt(x, z) {
  let h = 0.25 * Math.sin(x * 0.13) * Math.cos(z * 0.11) + 0.15 * Math.sin(x * 0.31 + z * 0.17);
  h += 5.5 * gauss(x, z, SPOTS.tractor.x, SPOTS.tractor.z, 8);
  h -= 2.2 * gauss(x, z, SPOTS.pond.x, SPOTS.pond.z, 6);
  // köyün dışı: yükselen tepeler
  const r = Math.hypot(x, z);
  if (r > 62) h += (r - 62) * 0.45;
  // düzlükler
  const flat = (cx, cz, rad) => {
    const k = Math.max(0, Math.min(1, (Math.hypot(x - cx, z - cz) - rad) / 4));
    h = h * k;
  };
  flat(SPOTS.pen.x, SPOTS.pen.z, 9);
  flat(SPOTS.wedding.x, SPOTS.wedding.z, 11);
  flat(SPOTS.stall.x, SPOTS.stall.z, 5);
  return h;
}

export function buildWorld(scene, R, T) {
  const r = rng(2026);
  const world = new R.World({ x: 0, y: -18, z: 0 });
  const batches = new Map();
  const props = []; // dinamik nesneler
  const animated = [];
  const zones = {};

  const toon = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });
  const MAT = {
    plaster: new THREE.MeshStandardMaterial({ color: 0xf7f0e2, roughness: 0.95 }), // badanalı duvar
    blue: toon(0x3d7fc4),
    teal: toon(0x2fa39a),
    pink: toon(0xe58fa0),
    ochre: toon(0xe0a845),
    roof: toon(0xb24e34),
    roof2: toon(0x8a4a3a),
    wood: new THREE.MeshStandardMaterial({ map: T.wood, color: 0xc49a6c, roughness: 0.85 }),
    stone: new THREE.MeshStandardMaterial({ map: T.stone, color: 0xd8d0c0, roughness: 0.9 }),
    leaf: toon(0x5aa040),
    leaf2: toon(0x3f8a3a),
    poplar: toon(0x4a9a48),
    trunk: toon(0x6a4a30),
    hay: toon(0xe2c060),
    soil: toon(0x7a5a3a),
    white: toon(0xffffff),
    red: toon(0xd8302a),
    green: toon(0x3a8a3a),
    water: new THREE.MeshStandardMaterial({ color: 0x3aa0c8, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }),
    metal: toon(0x8a8a8a, { metalness: 0.5, roughness: 0.4 }),
  };

  function batch(mat, geo) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(geo.index ? geo.toNonIndexed() : geo);
  }

  // Statik kutu: görsel + Rapier çarpışma
  function box(mat, w, h, d, x, z, { y0 = null, ry = 0, collide = true } = {}) {
    const base = y0 == null ? heightAt(x, z) - 0.1 : y0;
    const g = new THREE.BoxGeometry(w, h, d);
    g.rotateY(ry);
    g.translate(x, base + h / 2, z);
    batch(mat, g);
    if (collide) {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      world.createCollider(R.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, base + h / 2, z).setRotation(q).setFriction(0.6));
    }
  }

  function staticCylinder(mat, rTop, rBot, h, x, z, seg = 10, collide = true) {
    const y0 = heightAt(x, z);
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    g.translate(x, y0 + h / 2, z);
    batch(mat, g);
    if (collide) world.createCollider(R.ColliderDesc.cylinder(h / 2, Math.max(rTop, rBot)).setTranslation(x, y0 + h / 2, z));
  }

  // ---------- Gökyüzü ----------
  {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);}',
        fragmentShader: `varying vec3 vP; void main(){
          float h = clamp(vP.y, 0.0, 1.0);
          vec3 c = mix(vec3(0.78,0.9,1.0), vec3(0.3,0.6,0.95), smoothstep(0.0,0.6,h));
          vec3 sun = normalize(vec3(0.5,0.6,0.35));
          c += vec3(1.0,0.9,0.6) * pow(max(dot(vP,sun),0.0), 60.0) * 1.5;
          c += vec3(1.0,0.85,0.6) * pow(max(dot(vP,sun),0.0), 6.0) * 0.15;
          gl_FragColor = vec4(c,1.0);
        }`,
      })
    );
    scene.add(sky);
    // bulutlar
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0.25 });
    const clouds = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + r() * 3, 0), cloudMat);
        m.position.set(k * 4 - 6, r() * 2, r() * 3);
        m.scale.y = 0.6;
        c.add(m);
      }
      const a = r() * Math.PI * 2, d = 120 + r() * 140;
      c.position.set(Math.cos(a) * d, 55 + r() * 30, Math.sin(a) * d);
      clouds.add(c);
    }
    scene.add(clouds);
    animated.push((dt) => (clouds.rotation.y += dt * 0.004));
  }

  // ---------- Arazi (görsel + trimesh çarpışma) ----------
  {
    const S = 180, N = 120;
    const g = new THREE.PlaneGeometry(S, S, N, N);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const h = heightAt(x, z);
      p.setY(i, h);
      const n = 0.9 + 0.1 * Math.sin(x * 0.4) * Math.cos(z * 0.3);
      c.setRGB(0.42 * n, 0.68 * n, 0.3 * n); // çimen
      // köy yolları (toprak)
      const road = Math.min(Math.abs(z - 0.5 * Math.sin(x * 0.08)), Math.abs(x - 2 * Math.sin(z * 0.06)));
      if (road < 2.4) c.lerp(new THREE.Color(0.72, 0.58, 0.4), 1 - road / 2.4);
      if (Math.hypot(x - SPOTS.wedding.x, z - SPOTS.wedding.z) < 11) c.lerp(new THREE.Color(0.8, 0.68, 0.5), 0.8);
      if (Math.hypot(x - SPOTS.pond.x, z - SPOTS.pond.z) < 9) c.lerp(new THREE.Color(0.5, 0.45, 0.3), 0.7);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
    ground.receiveShadow = true;
    scene.add(ground);
    const verts = new Float32Array(p.array);
    const idx = new Uint32Array(g.index.array);
    world.createCollider(R.ColliderDesc.trimesh(verts, idx).setFriction(0.9));
    // gölet suyu
    const water = new THREE.Mesh(new THREE.CircleGeometry(9.5, 40), MAT.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(SPOTS.pond.x, -0.7, SPOTS.pond.z);
    scene.add(water);
    animated.push((dt, t) => (water.position.y = -0.7 + Math.sin(t * 1.2) * 0.03));
    zones.water = water;
    // nilüferler
    for (let i = 0; i < 8; i++) {
      const a = r() * 6.28, d = r() * 7;
      const lily = new THREE.Mesh(new THREE.CircleGeometry(0.4 + r() * 0.3, 8), MAT.green);
      lily.rotation.x = -Math.PI / 2;
      lily.position.set(SPOTS.pond.x + Math.cos(a) * d, -0.66, SPOTS.pond.z + Math.sin(a) * d);
      scene.add(lily);
    }
  }

  // ---------- Evler ----------
  function house(x, z, w, d, ry, color, roofMat = MAT.roof, opts = {}) {
    const y0 = heightAt(x, z) - 0.2;
    const h = opts.h || 3.2;
    box(MAT.plaster, w, h, d, x, z, { y0, ry });
    // boyalı alt kuşak
    const band = new THREE.BoxGeometry(w + 0.04, 0.9, d + 0.04);
    band.rotateY(ry);
    band.translate(x, y0 + 0.45, z);
    batch(color, band);
    // kırma çatı
    const roof = new THREE.ConeGeometry(Math.hypot(w, d) * 0.62, 1.8, 4, 1);
    roof.rotateY(Math.PI / 4 + ry);
    roof.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
    roof.translate(x, y0 + h + 0.9, z);
    batch(roofMat, roof);
    // kapı ve pencereler (öne, +z yerel)
    const f = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    const s = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry));
    const front = (lx, ly, gw, gh, mat) => {
      const g = new THREE.BoxGeometry(gw, gh, 0.08);
      g.rotateY(ry);
      g.translate(x + s.x * lx + f.x * (d / 2 + 0.02), y0 + ly, z + s.z * lx + f.z * (d / 2 + 0.02));
      batch(mat, g);
    };
    front(0, 1.05, 1.0, 2.0, MAT.wood);
    front(-w * 0.3, 1.9, 0.8, 0.8, color);
    front(w * 0.3, 1.9, 0.8, 0.8, color);
    front(-w * 0.3, 1.9, 0.6, 0.6, toon(0x1a2a3a));
    front(w * 0.3, 1.9, 0.6, 0.6, toon(0x1a2a3a));
    // saksılar (kırmızı sardunya)
    for (const lx of [-w * 0.3, w * 0.3]) {
      const px = x + s.x * lx + f.x * (d / 2 + 0.25), pz = z + s.z * lx + f.z * (d / 2 + 0.25);
      const pot = new THREE.CylinderGeometry(0.16, 0.12, 0.2, 8);
      pot.translate(px, y0 + 1.5, pz);
      batch(MAT.roof2, pot);
      const fl = new THREE.IcosahedronGeometry(0.18, 0);
      fl.translate(px, y0 + 1.7, pz);
      batch(MAT.red, fl);
    }
    // baca
    if (!opts.noChimney) {
      const ch = new THREE.BoxGeometry(0.4, 1.2, 0.4);
      ch.translate(x + s.x * w * 0.25, y0 + h + 1.3, z + s.z * w * 0.25);
      batch(MAT.stone, ch);
    }
  }

  house(-6, 22, 7, 5, Math.PI, MAT.blue); // Rıza'nın evi
  house(14, 18, 6, 5, 0, MAT.pink); // Fadime Teyze
  house(-22, -2, 6, 5, Math.PI / 2, MAT.teal);
  house(16, 4, 7, 5, -Math.PI / 2, MAT.ochre);
  house(-4, -14, 6, 5, 0, MAT.blue, MAT.roof2);
  house(26, -2, 5, 5, -Math.PI / 2, MAT.teal);
  house(-20, 30, 6, 5, Math.PI, MAT.ochre);
  house(10, -24, 8, 6, 0, MAT.pink, MAT.roof2, { h: 3.6 }); // Muhtarın evi
  house(-30, -20, 6, 5, Math.PI / 2, MAT.pink);
  house(4, 36, 6, 5, Math.PI, MAT.teal);
  // cami minaresi yerine köy kahvesi tabelası ve çınar (dinî öge kullanmadan köy silueti)
  house(-14, 10, 6, 4.5, Math.PI / 2, MAT.ochre, MAT.roof, { noChimney: true });

  // ---------- Ahır ve avlu ----------
  {
    const P = SPOTS.pen;
    // ahır binası (avlunun batısı)
    box(MAT.wood, 4, 3.5, 8, P.x - P.w / 2 - 2, P.z);
    const roof = new THREE.BoxGeometry(5, 0.3, 9.2);
    roof.rotateZ(0.25);
    roof.translate(P.x - P.w / 2 - 2, heightAt(P.x, P.z) + 3.8, P.z);
    batch(MAT.roof, roof);
    // çit
    const fence = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const ry = Math.atan2(x1 - x0, z1 - z0);
      const n = Math.ceil(len / 1.2);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const g = new THREE.BoxGeometry(0.12, 1.3, 0.12);
        g.translate(x0 + (x1 - x0) * t, heightAt(x0, z0) + 0.65, z0 + (z1 - z0) * t);
        batch(MAT.wood, g);
      }
      for (const yy of [0.5, 1.05]) {
        const g = new THREE.BoxGeometry(0.06, 0.12, len);
        g.rotateY(ry);
        g.translate((x0 + x1) / 2, heightAt(x0, z0) + yy, (z0 + z1) / 2);
        batch(MAT.wood, g);
      }
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      world.createCollider(R.ColliderDesc.cuboid(0.1, 1.3, len / 2).setTranslation((x0 + x1) / 2, 1.3, (z0 + z1) / 2).setRotation(q)); // görünenden yüksek: üstünden atlanmasın
    };
    const x0 = P.x - P.w / 2, x1 = P.x + P.w / 2, z0 = P.z - P.d / 2, z1 = P.z + P.d / 2;
    fence(x0, z0, x1, z0);
    fence(x0, z1, x1, z1);
    fence(x1, z0, x1, P.z - 1.3);
    fence(x1, P.z + 1.3, x1, z1);
    // yemlik, saman
    box(MAT.wood, 2, 0.6, 0.8, P.x - 3, P.z - 3);
    staticCylinder(MAT.hay, 0.9, 0.9, 1.1, P.x - 2, P.z + 2.5, 12);
    zones.pen = { minX: x0, maxX: x1, minZ: z0, maxZ: z1 };
  }

  // Avlu kapısı: menteşeli dinamik kapı (Rapier revolute eklemi)
  {
    const G = SPOTS.gate;
    const hingeZ = G.z - 1.3;
    const post = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(G.x, 0.8, hingeZ));
    // kapı kilitli başlar (sabit gövde); kafa atılınca dinamik olur ve menteşesinde savrulur
    const gb = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(G.x, 0.8, G.z).setAngularDamping(1.2).setLinearDamping(0.5));
    world.createCollider(R.ColliderDesc.cuboid(0.06, 0.7, 1.22).setDensity(1.2), gb);
    const j = R.JointData.revolute({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1.3 }, { x: 0, y: 1, z: 0 });
    const joint = world.createImpulseJoint(j, post, gb, true);
    const mesh = new THREE.Group();
    for (const yy of [-0.35, 0.3]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 2.5), MAT.wood);
      m.position.y = yy;
      m.castShadow = true;
      mesh.add(m);
    }
    for (const zz of [-1.15, -0.4, 0.4, 1.15]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.12), MAT.wood);
      m.position.z = zz;
      m.castShadow = true;
      mesh.add(m);
    }
    const diag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 2.6), MAT.wood);
    diag.rotation.x = 0.45;
    mesh.add(diag);
    scene.add(mesh);
    props.push({ kind: 'gate', body: gb, mesh, joint, locked: true });
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 0.16), MAT.wood);
    pm.position.set(G.x, 0.8, hingeZ);
    scene.add(pm);
  }

  // ---------- Manav tezgâhı ve karpuzlar ----------
  {
    const S = SPOTS.stall;
    box(MAT.wood, 4, 0.9, 1.4, S.x, S.z, { y0: 0 });
    for (const dx of [-1.9, 1.9]) for (const dz of [-0.6, 0.6]) box(MAT.wood, 0.1, 2.6, 0.1, S.x + dx, S.z + dz, { y0: 0, collide: false });
    // çizgili tente
    for (let i = 0; i < 8; i++) {
      const g = new THREE.BoxGeometry(0.52, 0.05, 1.8);
      g.rotateX(-0.15);
      g.translate(S.x - 1.8 + i * 0.52, 2.7, S.z);
      batch(i % 2 ? MAT.white : MAT.red, g);
    }
    // TABELA
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: textTex('MANAV RIZA', '#2a6a2a', '#fff8e0') }));
    sign.position.set(S.x, 3.2, S.z + 0.75);
    scene.add(sign);
    const sign2 = sign.clone();
    sign2.rotation.y = Math.PI;
    sign2.position.z = S.z - 0.75;
    scene.add(sign2);
    // karpuzlar
    const melonTex = stripeTex();
    const melonMat = new THREE.MeshStandardMaterial({ map: melonTex, roughness: 0.5 });
    zones.melons = [];
    for (let i = 0; i < 7; i++) {
      const x = S.x - 1.6 + (i % 4) * 1.05 + (i >= 4 ? 0.5 : 0), y = 0.9 + 0.33 + (i >= 4 ? 0.5 : 0), z = S.z + (i >= 4 ? 0 : (i % 2 ? 0.25 : -0.25));
      const p = addProp('melon', x, y, z, { shape: 'ball', r: 0.33, mesh: makeMelon(melonMat), density: 1.2, restitution: 0.3 });
      p.home = new THREE.Vector3(x, y, z);
      zones.melons.push(p);
    }
    // sebze kasaları
    for (const [dx, dz] of [[-2.8, 0.2], [2.8, -0.2]]) {
      addProp('crate', S.x + dx, 0.35, S.z + dz, { shape: 'box', hx: 0.4, hy: 0.35, hz: 0.4, mesh: makeCrate(), density: 0.6 });
    }
  }

  // ---------- Çamaşır ipi ----------
  {
    const L = SPOTS.line;
    for (const dx of [-3, 3]) staticCylinder(MAT.wood, 0.06, 0.06, 2.4, L.x + dx, L.z, 6);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 6, 4), MAT.white);
    rope.rotation.z = Math.PI / 2;
    rope.position.set(L.x, 2.3, L.z);
    scene.add(rope);
    const clothes = [
      { name: 'çiçekli şalvar', color: 0xe86a9a, w: 0.8, h: 1.1, pattern: 'flower' },
      { name: 'kırmızı yelek', color: 0xc0302a, w: 0.7, h: 0.7, pattern: 'plain' },
      { name: 'oyalı yemeni', color: 0xf0d060, w: 0.8, h: 0.8, pattern: 'dots' },
      { name: 'yün çorap', color: 0x3a6ac0, w: 0.35, h: 0.6, pattern: 'stripes' },
    ];
    zones.laundry = [];
    clothes.forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h, 4, 4), new THREE.MeshStandardMaterial({ map: clothTex(c.color, c.pattern), side: THREE.DoubleSide, roughness: 0.9 }));
      m.castShadow = true;
      const pos = new THREE.Vector3(L.x - 2.2 + i * 1.45, 2.3 - c.h / 2, L.z);
      m.position.copy(pos);
      scene.add(m);
      const item = { kind: 'laundry', name: c.name, mesh: m, home: pos.clone(), carried: false, onScarecrow: false, h: c.h, phase: r() * 6 };
      zones.laundry.push(item);
      animated.push((dt, t) => {
        if (!item.carried && !item.onScarecrow && !item.dropped) m.rotation.x = Math.sin(t * 2 + item.phase) * 0.15;
      });
    });
  }

  // ---------- Bostan ve korkuluk ----------
  {
    const S = SPOTS.scarecrow;
    for (let i = 0; i < 6; i++) {
      const g = new THREE.BoxGeometry(10, 0.3, 0.7);
      g.translate(S.x, heightAt(S.x, S.z + i * 1.4 - 4) + 0.1, S.z + i * 1.4 - 4);
      batch(MAT.soil, g);
      for (let k = 0; k < 8; k++) {
        const pl = new THREE.IcosahedronGeometry(0.22, 0);
        pl.translate(S.x - 4.4 + k * 1.25, heightAt(S.x, S.z) + 0.4, S.z + i * 1.4 - 4);
        batch(MAT.leaf, pl);
      }
    }
    const sc = new THREE.Group();
    sc.position.set(S.x, heightAt(S.x, S.z), S.z + 4.5);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), MAT.wood);
    pole.position.y = 1.2;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), MAT.wood);
    arm.rotation.z = Math.PI / 2;
    arm.position.y = 1.7;
    const headS = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), toon(0xe8d8a0));
    headS.position.y = 2.35;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.4, 10), MAT.hay);
    hat.position.y = 2.62;
    sc.add(pole, arm, headS, hat);
    sc.traverse((o) => o.isMesh && (o.castShadow = true));
    scene.add(sc);
    world.createCollider(R.ColliderDesc.cylinder(1.2, 0.15).setTranslation(sc.position.x, sc.position.y + 1.2, sc.position.z));
    zones.scarecrow = { group: sc, pos: sc.position.clone(), slots: [new THREE.Vector3(0, 1.0, 0.12), new THREE.Vector3(0, 1.55, 0.14), new THREE.Vector3(0, 2.35, 0.2), new THREE.Vector3(0.6, 1.5, 0.1)] };
  }

  // ---------- Kümes ----------
  {
    const C = SPOTS.coop;
    box(MAT.wood, 3, 2, 0.15, C.x, C.z - 1.5);
    box(MAT.wood, 0.15, 2, 3, C.x - 1.5, C.z);
    box(MAT.wood, 0.15, 2, 3, C.x + 1.5, C.z);
    box(MAT.wood, 1, 2, 0.15, C.x - 1, C.z + 1.5);
    box(MAT.wood, 1, 2, 0.15, C.x + 1, C.z + 1.5);
    const roof = new THREE.BoxGeometry(3.6, 0.15, 3.6);
    roof.rotateX(0.2);
    roof.translate(C.x, heightAt(C.x, C.z) + 2.2, C.z);
    batch(MAT.roof, roof);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: textTex('KÜMES', '#7a3a1a', '#fff0d0') }));
    sign.position.set(C.x, 2.3, C.z + 1.6);
    scene.add(sign);
    zones.coop = { minX: C.x - 1.4, maxX: C.x + 1.4, minZ: C.z - 1.4, maxZ: C.z + 1.4 };
  }

  // ---------- Tepe ve traktör ----------
  {
    const P = SPOTS.tractor;
    const y = heightAt(P.x, P.z);
    const tr = makeTractor();
    const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(P.x, y + 0.85, P.z));
    // tekerlekli: neredeyse sürtünmesiz (Min kuralı), yokuş aşağı kendiliğinden yuvarlanır
    world.createCollider(R.ColliderDesc.cuboid(0.9, 0.8, 1.5).setDensity(3).setFriction(0.03).setFrictionCombineRule(R.CoefficientCombineRule.Min).setRestitution(0.1), body);
    scene.add(tr);
    const prop = { kind: 'tractor', body, mesh: tr, hits: 0, rolling: false, inPond: false, yaw: 0 };
    props.push(prop);
    zones.tractor = prop;
  }

  // ---------- Düğün meydanı ----------
  {
    const W = SPOTS.wedding;
    // ışık zinciri direkleri ve bayrak süsleri
    const poles = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = W.x + Math.cos(a) * 9, pz = W.z + Math.sin(a) * 9;
      staticCylinder(MAT.wood, 0.08, 0.1, 4.5, px, pz, 6);
      poles.push(new THREE.Vector3(px, 4.3, pz));
    }
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe080 });
    const flagCols = [MAT.red, MAT.white, MAT.ochre, MAT.teal];
    for (let i = 0; i < poles.length; i++) {
      const a = poles[i], b = poles[(i + 1) % poles.length];
      for (let k = 1; k < 10; k++) {
        const t = k / 10;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(t * Math.PI) * 0.8;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), bulbMat);
        bulb.position.copy(p);
        scene.add(bulb);
        const fl = new THREE.ConeGeometry(0.18, 0.35, 3);
        fl.rotateX(Math.PI);
        fl.translate(p.x, p.y - 0.25, p.z);
        batch(flagCols[k % 4], fl);
      }
    }
    // masalar
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.15 + i * 0.3 + Math.PI;
      const tx = W.x + Math.cos(a) * 13, tz = W.z + Math.sin(a) * 13;
      box(MAT.white, 3, 0.8, 1.2, tx, tz, { ry: -a, y0: 0 });
      // baklava tepsisi
      const tray = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16);
      tray.translate(tx, 0.85, tz);
      batch(MAT.metal, tray);
      const bk = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 6);
      bk.translate(tx, 0.92, tz);
      batch(MAT.ochre, bk);
    }
    // gelin-damat masası ve kemer
    box(MAT.white, 3, 0.8, 1.2, W.x, W.z - 10, { y0: 0 });
    const arch = new THREE.TorusGeometry(2, 0.12, 6, 20, Math.PI);
    arch.translate(W.x, 0, W.z - 11);
    batch(MAT.pink, arch);
    for (let i = 0; i < 14; i++) {
      const a = (i / 13) * Math.PI;
      const fl = new THREE.IcosahedronGeometry(0.2, 0);
      fl.translate(W.x + Math.cos(a) * 2, Math.sin(a) * 2, W.z - 11);
      batch(i % 2 ? MAT.white : MAT.red, fl);
    }
    zones.weddingCenter = new THREE.Vector3(W.x, 0, W.z);
  }

  // ---------- Ağaçlar ----------
  {
    const ni = (g) => (g.index ? g.toNonIndexed() : g);
    const poplar = mergeGeometries([ni(new THREE.CylinderGeometry(0.15, 0.2, 2, 6).translate(0, 1, 0)), ni(new THREE.ConeGeometry(0.9, 7, 7).translate(0, 5, 0))]);
    const fruit = mergeGeometries([ni(new THREE.CylinderGeometry(0.15, 0.22, 1.8, 6).translate(0, 0.9, 0)), ni(new THREE.IcosahedronGeometry(1.6, 1).translate(0, 2.8, 0))]);
    const spots = [];
    for (let i = 0; i < 500 && spots.length < 70; i++) {
      const a = r() * Math.PI * 2, d = 18 + r() * 60;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - SPOTS.wedding.x, z - SPOTS.wedding.z) < 16 || Math.hypot(x - SPOTS.pond.x, z - SPOTS.pond.z) < 12 || Math.hypot(x - SPOTS.tractor.x, z - SPOTS.tractor.z) < 11) continue;
      if (Math.hypot(x - SPOTS.pen.x, z - SPOTS.pen.z) < 11 || Math.hypot(x - SPOTS.scarecrow.x, z - SPOTS.scarecrow.z) < 9) continue;
      if (Math.abs(z) < 3 || Math.abs(x) < 3) continue;
      if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 4)) continue;
      spots.push([x, z, r() < 0.5]);
    }
    for (const kind of [true, false]) {
      const list = spots.filter((s) => s[2] === kind);
      const geo = kind ? poplar : fruit;
      const leafMat = kind ? MAT.poplar : MAT.leaf;
      // gövde + yaprak tek geometride: iki malzeme yerine vertex rengi kullan
      const colored = geo.clone();
      const col = new Float32Array(colored.attributes.position.count * 3);
      for (let i = 0; i < colored.attributes.position.count; i++) {
        const y = colored.attributes.position.getY(i);
        const c = y < (kind ? 1.9 : 1.7) ? new THREE.Color(0x6a4a30) : leafMat.color;
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }
      colored.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const im = new THREE.InstancedMesh(colored, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), list.length);
      const m4 = new THREE.Matrix4();
      list.forEach(([x, z], i) => {
        const s = 0.8 + r() * 0.5;
        m4.compose(new THREE.Vector3(x, heightAt(x, z) - 0.1, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3(s, s, s));
        im.setMatrixAt(i, m4);
        world.createCollider(R.ColliderDesc.cylinder(1.5, 0.25 * s).setTranslation(x, heightAt(x, z) + 1.5, z));
      });
      im.castShadow = true;
      scene.add(im);
    }
    // çiçekler ve çimen öbekleri
    const fl = new THREE.IcosahedronGeometry(0.1, 0);
    const N = 900;
    const fim = new THREE.InstancedMesh(fl, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), N);
    const m4 = new THREE.Matrix4();
    const cols = [0xffffff, 0xf0d040, 0xe85a8a, 0x9a6ae0, 0xe84a3a];
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const x = (r() - 0.5) * 120, z = (r() - 0.5) * 120;
      m4.compose(new THREE.Vector3(x, heightAt(x, z) + 0.08, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      fim.setMatrixAt(i, m4);
      fim.setColorAt(i, c.setHex(cols[i % cols.length]));
    }
    scene.add(fim);
  }

  // ---------- Fizik nesneleri: çömlekler, variller, saman balyaları, lahanalar ----------
  zones.pots = [];
  for (const [x, z] of [[-9, 19.5], [-3, 19.5], [11, 21], [17, 21], [-19, -0.5], [-1.5, -11.5], [13, -20.5], [-25, 1]]) {
    zones.pots.push(addProp('pot', x, heightAt(x, z) + 0.3, z, { shape: 'cyl', hh: 0.3, r: 0.22, mesh: makePot(), density: 0.8 }));
  }
  for (const [x, z] of [[-10, 4], [-11, 4.6], [6, -8], [20, 10], [20.8, 10.6], [-18, 20]]) {
    addProp('barrel', x, heightAt(x, z) + 0.45, z, { shape: 'cyl', hh: 0.45, r: 0.35, mesh: makeBarrel(), density: 0.9 });
  }
  zones.hay = [];
  for (const [x, z] of [[-14, -22], [24, 22], [-26, 6], [6, 14], [30, -6], [-8, 32]]) {
    zones.hay.push(addProp('hay', x, heightAt(x, z) + 0.45, z, { shape: 'box', hx: 0.7, hy: 0.45, hz: 0.5, mesh: makeHay(), density: 0.25 }));
  }
  zones.cabbages = [];
  for (const [x, z] of [[-20, 12], [2, 18], [24, 32], [32, 26], [-12, -26], [18, -8], [36, -20], [-28, -10], [8, 28], [-4, -2]]) {
    const m = makeCabbage();
    m.position.set(x, heightAt(x, z) + 0.2, z);
    scene.add(m);
    zones.cabbages.push({ mesh: m, eaten: false, pos: m.position.clone() });
  }

  function addProp(kind, x, y, z, o) {
    const desc = R.RigidBodyDesc.dynamic().setTranslation(x, y, z).setLinearDamping(0.2).setAngularDamping(0.4).setCanSleep(true);
    const body = world.createRigidBody(desc);
    let cd;
    if (o.shape === 'ball') cd = R.ColliderDesc.ball(o.r);
    else if (o.shape === 'cyl') cd = R.ColliderDesc.cylinder(o.hh, o.r);
    else cd = R.ColliderDesc.cuboid(o.hx, o.hy, o.hz);
    cd.setDensity(o.density || 1).setRestitution(o.restitution ?? 0.15).setFriction(0.7);
    world.createCollider(cd, body);
    body.sleep();
    scene.add(o.mesh);
    const p = { kind, body, mesh: o.mesh, broken: false };
    props.push(p);
    return p;
  }

  // ---------- Birleştir ----------
  for (const [mat, geos] of batches) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }

  // Görünmez sınır (köyün dışına çıkılmasın)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    world.createCollider(R.ColliderDesc.cuboid(0.5, 10, 9).setTranslation(Math.cos(a) * 66, 5, Math.sin(a) * 66).setRotation(q));
  }

  return {
    world, props, zones, animated,
    update(dt, t) {
      for (const f of animated) f(dt, t);
    },
  };

  // ---------- model yardımcıları ----------
  function makeMelon(mat) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 10), mat);
    m.scale.set(1, 0.9, 1.15);
    m.castShadow = true;
    return m;
  }
  function makeCrate() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), MAT.wood);
    m.castShadow = true;
    g.add(m);
    for (let i = 0; i < 5; i++) {
      const tm = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), i % 2 ? MAT.red : MAT.ochre);
      tm.position.set(-0.24 + (i % 3) * 0.24, 0.36, i < 3 ? -0.15 : 0.15);
      g.add(tm);
    }
    return g;
  }
  function makePot() {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector2(0.12 + Math.sin(t * Math.PI) * 0.12 - (t > 0.85 ? (t - 0.85) * 0.5 : 0), t * 0.6 - 0.3));
    }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), toon(0xb86a3a));
    m.castShadow = true;
    return m;
  }
  function makeBarrel() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.9, 12), MAT.wood);
    m.castShadow = true;
    g.add(m);
    for (const y of [-0.3, 0.3]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 4, 16), MAT.metal);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      g.add(ring);
    }
    return g;
  }
  function makeHay() {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.0), MAT.hay);
    m.castShadow = true;
    return m;
  }
  function makeCabbage() {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.2 - i * 0.02, 8, 6), toon(i % 2 ? 0x7ac050 : 0x5aa040));
      l.scale.y = 0.8;
      l.rotation.set(r(), r(), r());
      g.add(l);
    }
    return g;
  }
  function makeTractor() {
    const g = new THREE.Group();
    const red = toon(0xd03a2a), black = toon(0x1a1a1a), yellow = toon(0xf0c040);
    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    add(new THREE.BoxGeometry(1.1, 0.9, 2.2), red, 0, 0, 0.2);
    add(new THREE.BoxGeometry(1.2, 0.08, 1.2), black, 0, 1.4, -0.5);
    for (const sx of [-0.5, 0.5]) add(new THREE.BoxGeometry(0.05, 0.9, 0.05), black, sx, 1.0, -0.9).position.z = -0.95;
    add(new THREE.BoxGeometry(0.5, 0.3, 0.5), black, 0, 0.6, -0.5); // koltuk
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), black, 0.3, 0.8, 1.0); // egzoz
    g.userData.wheels = [];
    for (const [x, z, rr] of [[-0.75, -0.6, 0.65], [0.75, -0.6, 0.65], [-0.65, 1.0, 0.38], [0.65, 1.0, 0.38]]) {
      const w = add(new THREE.CylinderGeometry(rr, rr, 0.35, 14), black, x, -0.8 + rr, z);
      w.rotation.z = Math.PI / 2;
      add(new THREE.CylinderGeometry(rr * 0.45, rr * 0.45, 0.37, 10), yellow, x, -0.8 + rr, z).rotation.z = Math.PI / 2;
      g.userData.wheels.push(w);
    }
    const plate = add(new THREE.PlaneGeometry(0.6, 0.18), new THREE.MeshBasicMaterial({ map: textTex('MUHTAR', '#ffffff', '#1a1a1a') }), 0, -0.1, 1.31);
    void plate;
    return g;
  }
}

// ---------- doku yardımcıları ----------
function textTex(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, 512, 128);
  x.strokeStyle = fg;
  x.lineWidth = 6;
  x.strokeRect(8, 8, 496, 112);
  x.fillStyle = fg;
  x.font = 'bold 64px "Baloo 2", Arial, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function stripeTex() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#3f8a2a';
  x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#1f5a1a';
  for (let i = 0; i < 8; i++) {
    x.beginPath();
    for (let y = 0; y <= 64; y += 4) x.lineTo(i * 16 + 6 + Math.sin(y * 0.3) * 3, y);
    for (let y = 64; y >= 0; y -= 4) x.lineTo(i * 16 + 12 + Math.sin(y * 0.3) * 3, y);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function clothTex(color, pattern) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#' + new THREE.Color(color).getHexString();
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(255,255,255,0.85)';
  if (pattern === 'flower')
    for (let i = 0; i < 18; i++) {
      const px = (i * 37) % 128, py = (i * 53) % 128;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        x.beginPath();
        x.arc(px + Math.cos(a) * 5, py + Math.sin(a) * 5, 3.5, 0, Math.PI * 2);
        x.fill();
      }
    }
  if (pattern === 'dots')
    for (let i = 0; i < 40; i++) {
      x.beginPath();
      x.arc((i * 29) % 128, (i * 47) % 128, 3, 0, Math.PI * 2);
      x.fill();
    }
  if (pattern === 'stripes') for (let y = 0; y < 128; y += 16) x.fillRect(0, y, 128, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
