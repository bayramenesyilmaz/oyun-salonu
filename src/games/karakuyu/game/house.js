import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from './textures.js';

// Bölüm 2: Sivas'ta ninenin tek katlı taş evi. Kodla kurulur.
// Koordinatlar: iç mekân x -7..7, z -6..6. Kuzey -Z. Ön kapı güneyde (0, 6).
//   Batı: mutfak (güney), ninenin odası (kuzey). Doğu: misafir odası/salon (güney), dedenin odası (kuzey).
//   Ortada uzun sofa (hol).
export const HOUSE = { x0: -7, x1: 7, z0: -6, z1: 6, H: 2.75 };
const OUT_T = 0.4;
const IN_T = 0.18;

export function buildHouse(scene, T) {
  const r = rng(2004);
  const colliders = [];
  const batches = new Map();
  const animated = [];
  const refs = { items: {}, hiding: [], bulbs: [], windows: [], spots: {} };
  const H = HOUSE.H;

  const Std = (map, rough, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: rough, ...extra });
  const M = {
    plaster: Std(T.plaster, 0.95, { color: 0xfff4e4, bumpMap: T.plaster, bumpScale: 0.5 }),
    stone: Std(T.stone, 0.92, { bumpMap: T.stone, bumpScale: 1.5 }),
    wood: Std(T.wood, 0.85, { color: 0xa88866 }),
    darkWood: Std(T.wood, 0.9, { color: 0x5a4636 }),
    floor: Std(T.wood, 0.88, { color: 0x8a7058 }),
    ceiling: Std(T.wood, 0.95, { color: 0x6a5442 }),
    kilim: Std(T.kilim, 0.95),
    kilimRed: Std(T.kilim, 0.95, { color: 0xc07060 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x6a4a34, roughness: 1 }),
    clothGreen: new THREE.MeshStandardMaterial({ color: 0x3d5a3a, roughness: 1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.45, metalness: 0.7 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xa8643a, roughness: 0.35, metalness: 0.8 }),
    black: new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.8 }),
    night: new THREE.MeshBasicMaterial({ color: 0x1a2a48 }),
  };

  function boxGeo(w, h, d, tile = 2) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * (dims[f][0] / tile), uv.getY(i) * (dims[f][1] / tile));
      }
    return g;
  }
  function batch(mat, geo) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(geo);
  }
  function box(mat, w, h, d, x, y, z, { collide = true, ry = 0, tile = 2, sight } = {}) {
    const g = boxGeo(w, h, d, tile);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    batch(mat, g);
    if (collide) {
      const cw = ry ? Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * d : w;
      const cd = ry ? Math.abs(Math.sin(ry)) * w + Math.abs(Math.cos(ry)) * d : d;
      colliders.push({ minX: x - cw / 2, maxX: x + cw / 2, minZ: z - cd / 2, maxZ: z + cd / 2, maxY: sight === false ? 1 : y + h / 2 });
    }
    return g;
  }
  function cyl(mat, r0, r1, h, x, y, z, seg = 16) {
    const g = new THREE.CylinderGeometry(r0, r1, h, seg);
    g.translate(x, y, z);
    batch(mat, g);
    return g;
  }

  // Kapı boşluklu duvar. doors: [{c, w}]
  const doorways = [];
  function wall(axis, fixed, from, to, t, mat, doors = []) {
    const segs = [];
    let a = from;
    for (const d of [...doors].sort((p, q) => p.c - q.c)) {
      segs.push([a, d.c - d.w / 2]);
      // lento
      const lh = H - 2.1;
      if (axis === 'x') box(mat, d.w, lh, t, d.c, 2.1 + lh / 2, fixed, { collide: false });
      else box(mat, t, lh, d.w, fixed, 2.1 + lh / 2, d.c, { collide: false });
      // ahşap kasa
      if (axis === 'x') {
        box(M.darkWood, 0.08, 2.1, t + 0.04, d.c - d.w / 2, 1.05, fixed, { collide: false, tile: 1 });
        box(M.darkWood, 0.08, 2.1, t + 0.04, d.c + d.w / 2, 1.05, fixed, { collide: false, tile: 1 });
      } else {
        box(M.darkWood, t + 0.04, 2.1, 0.08, fixed, 1.05, d.c - d.w / 2, { collide: false, tile: 1 });
        box(M.darkWood, t + 0.04, 2.1, 0.08, fixed, 1.05, d.c + d.w / 2, { collide: false, tile: 1 });
      }
      doorways.push(axis === 'x' ? { x: d.c, z: fixed, axis, w: d.w } : { x: fixed, z: d.c, axis, w: d.w });
      a = d.c + d.w / 2;
    }
    segs.push([a, to]);
    for (const [s, e] of segs) {
      const len = e - s;
      if (len < 0.02) continue;
      const c = (s + e) / 2;
      if (axis === 'x') box(mat, len, H, t, c, H / 2, fixed);
      else box(mat, t, H, len, fixed, H / 2, c);
    }
    // süpürgelik
    for (const [s, e] of segs) {
      const len = e - s;
      if (len < 0.1) continue;
      const c = (s + e) / 2;
      for (const side of [-1, 1]) {
        if (axis === 'x') box(M.darkWood, len, 0.12, 0.03, c, 0.06, fixed + side * (t / 2 + 0.015), { collide: false, tile: 1 });
        else box(M.darkWood, 0.03, 0.12, len, fixed + side * (t / 2 + 0.015), 0.06, c, { collide: false, tile: 1 });
      }
    }
  }

  // ---------- Kabuk ----------
  const { x0, x1, z0, z1 } = HOUSE;
  wall('x', z0 - OUT_T / 2, x0 - OUT_T, x1 + OUT_T, OUT_T, M.plaster);
  wall('x', z1 + OUT_T / 2, x0 - OUT_T, x1 + OUT_T, OUT_T, M.plaster, [{ c: 0, w: 1.1 }]);
  wall('z', x0 - OUT_T / 2, z0, z1, OUT_T, M.plaster);
  wall('z', x1 + OUT_T / 2, z0, z1, OUT_T, M.plaster);
  // iç duvarlar
  wall('z', -2, z0, z1, IN_T, M.plaster, [{ c: -3, w: 1.0 }, { c: 3, w: 1.0 }]);
  wall('z', 2, z0, z1, IN_T, M.plaster, [{ c: -3, w: 1.0 }, { c: 3, w: 1.5 }]);
  wall('x', 0, x0, -2 - IN_T / 2, IN_T, M.plaster);
  wall('x', 0, 2 + IN_T / 2, x1, IN_T, M.plaster);
  // zemin, tavan, hatıllar
  box(M.floor, x1 - x0 + 1, 0.05, z1 - z0 + 1, 0, -0.025, 0, { collide: false, tile: 1.6 });
  box(M.ceiling, x1 - x0 + 1, 0.06, z1 - z0 + 1, 0, H + 0.03, 0, { collide: false, tile: 1.4 });
  for (let x = x0 + 0.6; x < x1; x += 1.2) box(M.darkWood, 0.14, 0.14, z1 - z0, x, H - 0.07, 0, { collide: false, tile: 1 });

  // ön kapı (kapalı, sürgülü)
  {
    const door = new THREE.Mesh(boxGeo(1.1, 2.1, 0.07, 1), new THREE.MeshStandardMaterial({ map: T.wood, color: 0x6a4e38, roughness: 0.85 }));
    door.position.set(0, 1.05, z1 + 0.05);
    scene.add(door);
    colliders.push({ minX: -0.6, maxX: 0.6, minZ: z1, maxZ: z1 + 0.3, maxY: 2.1 });
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), M.metal);
    bolt.position.set(0.3, 1.1, z1 + 0.0);
    scene.add(bolt);
    // eşik taşı
    box(M.stone, 1.2, 0.04, 0.5, 0, 0.02, z1 - 0.2, { collide: false, tile: 1 });
    refs.esik = { x: 0, z: z1 - 0.45 };
    // eşik etkileşim yüzeyi
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.6), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    pad.position.set(0, 0.15, z1 - 0.3);
    pad.userData.interactId = 'esik';
    scene.add(pad);
    // eşikteki adaklar (başta gizli)
    const salt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.03, 12), M.white);
    salt.position.set(-0.22, 0.05, z1 - 0.25);
    const bread = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: 0xb07a40, roughness: 0.9 }));
    bread.scale.set(1.3, 0.55, 1);
    bread.position.set(0.2, 0.08, z1 - 0.25);
    const scis = new THREE.Group();
    const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.01), M.metal);
    const bladeB = bladeA.clone();
    bladeA.rotation.z = 0.25;
    bladeB.rotation.z = -0.25;
    scis.add(bladeA, bladeB);
    scis.position.set(0, 2.2, z1 - 0.02);
    salt.visible = bread.visible = scis.visible = false;
    scene.add(salt, bread, scis);
    refs.offer = { salt, bread, scis };
  }

  // ---------- Pencereler (gece: lacivert cam, tahta kafes) ----------
  function windowOn(axis, fixed, along, inward) {
    const w = 0.9, h = 1.0, y = 1.45;
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.Mesh(g, M.night);
    if (axis === 'x') {
      m.position.set(along, y, fixed + inward * 0.01);
      if (inward < 0) m.rotation.y = Math.PI;
    } else {
      m.position.set(fixed + inward * 0.01, y, along);
      m.rotation.y = inward > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    scene.add(m);
    refs.windows.push(m);
    // kasa ve kafes
    const k = (ww, hh, dx, dy) => {
      if (axis === 'x') box(M.darkWood, ww, hh, 0.06, along + dx, y + dy, fixed + inward * 0.03, { collide: false, tile: 1 });
      else box(M.darkWood, 0.06, hh, ww, fixed + inward * 0.03, y + dy, along + dx, { collide: false, tile: 1 });
    };
    k(w + 0.1, 0.06, 0, h / 2);
    k(w + 0.1, 0.08, 0, -h / 2);
    k(0.06, h, -w / 2, 0);
    k(0.06, h, w / 2, 0);
    k(0.04, h, 0, 0);
    k(w, 0.04, 0, 0);
    // pencere önü (denizlik)
    if (axis === 'x') box(M.wood, w + 0.2, 0.05, 0.22, along, y - h / 2 - 0.05, fixed + inward * 0.1, { collide: false, tile: 1 });
    else box(M.wood, 0.22, 0.05, w + 0.2, fixed + inward * 0.1, y - h / 2 - 0.05, along, { collide: false, tile: 1 });
    // ay ışığı: pencereden içeri soğuk bir hüzme
    const sp = new THREE.SpotLight(0x7d98d0, 0, 9, 0.75, 0.8, 1.2);
    const p = m.position.clone();
    sp.position.copy(p);
    const tgt = new THREE.Object3D();
    if (axis === 'x') tgt.position.set(along * 0.9, 0, fixed + inward * 3);
    else tgt.position.set(fixed + inward * 3, 0, along * 0.9);
    scene.add(sp, tgt);
    sp.target = tgt;
    refs.moonSpots = refs.moonSpots || [];
    refs.moonSpots.push(sp);
  }
  windowOn('z', x0 - 0.2, 3.4, 1); // mutfak
  windowOn('x', z0 - 0.2, -4.5, 1); // ninenin odası
  windowOn('x', z0 - 0.2, 4.5, 1); // dedenin odası
  windowOn('z', x1 + 0.2, 3, -1); // salon
  windowOn('x', z1 + 0.2, -1.4, -1); // sofa, kapının yanı

  // ---------- Tavan lambaları ----------
  function bulb(x, z) {
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.5, 4), M.black);
    wire.position.set(x, H - 0.25, z);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffd8a0, emissiveIntensity: 1.2 }));
    b.position.set(x, H - 0.52, z);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.7, side: THREE.DoubleSide }));
    shade.position.set(x, H - 0.46, z);
    const l = new THREE.PointLight(0xffd29a, 8, 9, 1.2);
    l.position.set(x, H - 0.6, z);
    scene.add(wire, b, shade, l);
    refs.bulbs.push({ light: l, mesh: b, base: 8 });
  }
  bulb(0, 3.2);
  bulb(0, -3.2);
  bulb(-4.5, 3);
  bulb(-4.5, -3);
  bulb(4.5, 3);
  bulb(4.5, -3);

  // ---------- Yardımcı mobilyalar ----------
  function sedir(x, z, len, axis, mat = M.cloth) {
    // duvar dibi oturma: tahta kasa + minder + yaslık
    const d = 0.7;
    if (axis === 'x') {
      box(M.darkWood, len, 0.3, d, x, 0.15, z, { tile: 1, sight: false });
      box(mat, len, 0.12, d - 0.05, x, 0.36, z, { collide: false, tile: 1 });
      for (let a = -len / 2 + 0.35; a < len / 2 - 0.2; a += 0.75) box(mat, 0.6, 0.4, 0.14, x + a, 0.62, z + Math.sign(z) * (d / 2 - 0.08), { collide: false, tile: 1 });
    } else {
      box(M.darkWood, d, 0.3, len, x, 0.15, z, { tile: 1, sight: false });
      box(mat, d - 0.05, 0.12, len, x, 0.36, z, { collide: false, tile: 1 });
      for (let a = -len / 2 + 0.35; a < len / 2 - 0.2; a += 0.75) box(mat, 0.14, 0.4, 0.6, x + Math.sign(x) * (d / 2 - 0.08), 0.62, z + a, { collide: false, tile: 1 });
    }
  }
  function kilim(x, z, w, d, mat = M.kilim) {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.translate(x, 0.006, z);
    batch(mat, g);
  }
  function glowAt(x, y, z, s = 0.6) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.dot, color: 0xd8c08a, transparent: true, opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(s, s, 1);
    glow.position.set(x, y, z);
    scene.add(glow);
    return glow;
  }
  function interactMesh(id, obj) {
    obj.traverse((o) => (o.userData.interactId = id));
    obj.userData.interactId = id;
    scene.add(obj);
    return obj;
  }
  function hideSpot(id, x, z, facing) {
    const alongX = facing === 'N' || facing === 'S';
    const W = 1.4, D = 0.7, HH = 2.3;
    const sx = alongX ? W : D, sz = alongX ? D : W;
    box(M.darkWood, sx, HH, sz, x, HH / 2, z, { tile: 1.2 });
    const dir = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[facing];
    const panel = new THREE.Mesh(boxGeo(alongX ? 1.3 : 0.04, 2.1, alongX ? 0.04 : 1.3, 1), new THREE.MeshStandardMaterial({ map: T.wood, color: 0x8a6e52, roughness: 0.8 }));
    panel.position.set(x + dir[0] * (D / 2 + 0.02), 1.12, z + dir[1] * (D / 2 + 0.02));
    // kapak oymaları
    for (const s of [-0.32, 0.32]) {
      const pr = new THREE.Mesh(boxGeo(alongX ? 0.5 : 0.02, 1.7, alongX ? 0.02 : 0.5, 1), M.darkWood);
      pr.position.copy(panel.position).add(new THREE.Vector3(dir[0] * 0.025 + (alongX ? s : 0), 0, dir[1] * 0.025 + (alongX ? 0 : s)));
      scene.add(pr);
    }
    interactMesh(id, panel);
    refs.hiding.push({
      id,
      kind: 'yukluk',
      object: panel,
      inside: new THREE.Vector3(x, 1.45, z),
      yaw: Math.atan2(-dir[0], -dir[1]),
      exit: new THREE.Vector3(x + dir[0] * 1.05, 0, z + dir[1] * 1.05),
      front: new THREE.Vector3(x + dir[0] * 0.95, 0, z + dir[1] * 0.95),
    });
  }

  // ---------- Sofa (hol) ----------
  kilim(0, 0, 1.6, 9.5, M.kilimRed);
  box(M.darkWood, 0.35, 1.0, 0.9, 1.6, 0.5, 5.3, { tile: 1 }); // ayakkabılık
  for (let i = 0; i < 3; i++) cyl(M.black, 0.05, 0.06, 0.08, 1.6 + (i - 1) * 0.08, 1.04, 5.3 + (i - 1) * 0.25, 8);
  box(M.darkWood, 0.06, 0.06, 1.0, -1.88, 1.75, 5.0, { collide: false, tile: 1 }); // askılık
  for (let i = 0; i < 3; i++) box(M.metal, 0.12, 0.02, 0.02, -1.82, 1.75, 4.65 + i * 0.35, { collide: false, tile: 1 });
  {
    // asılı palto
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 1.0, 10), new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 1 }));
    coat.position.set(-1.72, 1.2, 5.0);
    scene.add(coat);
  }
  // duvar saati
  {
    const clk = new THREE.Group();
    const bodyM = new THREE.Mesh(boxGeo(0.4, 1.3, 0.18, 1), M.darkWood);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), M.white);
    face.position.set(0, 0.35, 0.095);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.11, 0.005), M.black);
    hand.position.set(0, 0.39, 0.1);
    const pend = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), M.copper);
    pend.position.set(0, -0.3, 0.095);
    clk.add(bodyM, face, hand, pend);
    clk.position.set(1.9, 1.5, -1.2);
    clk.rotation.y = -Math.PI / 2;
    scene.add(clk);
    animated.push((dt, t) => (pend.position.x = Math.sin(t * 3.1) * 0.08));
    refs.clockPend = pend;
  }
  // ayna (sofanın batı duvarında)
  {
    const fr = new THREE.Mesh(boxGeo(0.06, 1.0, 0.7, 1), M.darkWood);
    fr.position.set(-1.88, 1.5, -1.0);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.88), new THREE.MeshStandardMaterial({ color: 0x8090a0, roughness: 0.08, metalness: 0.9 }));
    gl.position.set(-1.85, 1.5, -1.0);
    gl.rotation.y = Math.PI / 2;
    scene.add(fr, gl);
  }

  // ---------- Mutfak (x -7..-2, z 0..6) ----------
  kilim(-4.5, 3.2, 2.2, 1.4);
  box(M.wood, 0.65, 0.9, 4.2, -6.65, 0.45, 3.4, { tile: 1 }); // tezgâh
  box(M.stone, 0.68, 0.04, 4.25, -6.65, 0.92, 3.4, { collide: false, tile: 1 });
  {
    // musluk ve taş eviye
    box(M.stone, 0.55, 0.12, 0.7, -6.62, 0.98, 4.8, { collide: false, tile: 1 });
    const pipe = new THREE.Group();
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 8), M.copper);
    v.position.set(0, 0.2, 0);
    const hz = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8), M.copper);
    hz.rotation.z = Math.PI / 2;
    hz.position.set(0.1, 0.4, 0);
    pipe.add(v, hz);
    pipe.position.set(-6.9, 0.94, 4.8);
    interactMesh('musluk', pipe);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    hit.position.set(-6.6, 1.15, 4.8);
    interactMesh('musluk', hit);
    refs.spots.musluk = { x: -6.0, z: 4.8 };
    // testi
    const testi = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: 0x9a4a2a, roughness: 0.8 }));
    testi.scale.set(1, 1.3, 1);
    testi.position.set(-6.55, 1.1, 2.4);
    scene.add(testi);
    refs.testi = testi;
  }
  // üst dolap (tuz burada)
  {
    box(M.darkWood, 0.4, 0.8, 1.6, -6.75, 1.85, 2.2, { collide: false, tile: 1 });
    const jar = new THREE.Group();
    const j = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12), new THREE.MeshStandardMaterial({ color: 0xcfd8d8, roughness: 0.15, transparent: true, opacity: 0.75 }));
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12), M.copper);
    lid.position.y = 0.09;
    const lbl = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.06, 12, 1, true), M.white);
    jar.add(j, lid, lbl);
    jar.position.set(-6.4, 1.02, 1.6);
    interactMesh('tuz', jar);
    jar.userData.glow = glowAt(-6.4, 1.1, 1.6, 0.5);
    refs.items.tuz = jar;
  }
  // ocak / soba
  {
    box(M.black, 0.6, 0.75, 0.55, -4.0, 0.375, 5.55, { tile: 1 });
    cyl(M.black, 0.06, 0.06, H - 0.75, -4.0, 0.75 + (H - 0.75) / 2, 5.8, 8);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.2, 14), M.copper);
    pot.position.set(-4.0, 0.86, 5.5);
    scene.add(pot);
    const glow = new THREE.PointLight(0xff6020, 0.6, 2.5, 2);
    glow.position.set(-4.0, 0.4, 5.2);
    scene.add(glow);
    animated.push((dt, t) => (glow.intensity = 0.5 + Math.sin(t * 7) * 0.08 + Math.random() * 0.08));
  }
  // mutfak masası ve iskemleler
  box(M.wood, 1.2, 0.06, 0.8, -4.3, 0.74, 2.6, { collide: false, tile: 1 });
  for (const [dx, dz] of [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]]) box(M.darkWood, 0.05, 0.72, 0.05, -4.3 + dx, 0.36, 2.6 + dz, { collide: false, tile: 1 });
  colliders.push({ minX: -4.9, maxX: -3.7, minZ: 2.2, maxZ: 3.0, maxY: 0.8 });
  box(M.darkWood, 0.36, 0.45, 0.36, -4.3, 0.22, 1.8, { tile: 1, sight: false });
  refs.spots.kitchenCorner = { x: -6.55, z: 0.45, yaw: Math.atan2(-1, 1) }; // köşeye dönük durur (kuzeybatı köşe)
  refs.spots.kitchenWork = { x: -5.9, z: 3.4, yaw: -Math.PI / 2 };

  // ---------- Ninenin odası (x -7..-2, z -6..0) ----------
  kilim(-4.8, -3.2, 2.6, 2.0);
  // yer yatağı
  box(M.white, 1.0, 0.18, 2.0, -5.9, 0.09, -4.6, { tile: 1, sight: false });
  box(M.clothGreen, 1.02, 0.08, 1.4, -5.9, 0.2, -4.3, { collide: false, tile: 1 });
  box(M.white, 0.6, 0.12, 0.35, -5.9, 0.24, -5.35, { collide: false, tile: 1 });
  hideSpot('hide_nine', -6.65, -1.6, 'E');
  // ekmek: yatağın üstünde (ıslak)
  {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), new THREE.MeshStandardMaterial({ color: 0xa87038, roughness: 0.6 }));
    b.scale.set(1.4, 0.55, 1.05);
    b.position.set(-5.7, 0.33, -4.0);
    interactMesh('ekmek', b);
    b.userData.glow = glowAt(-5.7, 0.4, -4.0, 0.55);
    refs.items.ekmek = b;
  }
  // sandık-komodin ve fotoğraf
  box(M.darkWood, 0.8, 0.6, 0.45, -3.0, 0.3, -5.6, { tile: 1, sight: false });
  {
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.28), new THREE.MeshStandardMaterial({ map: T.paper, color: 0x9a8a70, roughness: 0.9 }));
    ph.position.set(-3.0, 0.75, -5.7);
    ph.rotation.x = -0.15;
    scene.add(ph);
  }

  // ---------- Salon / misafir odası (x 2..7, z 0..6) ----------
  kilim(4.6, 3.1, 3.0, 2.4);
  sedir(6.6, 3.0, 5.6, 'z');
  sedir(4.4, 5.6, 3.6, 'x');
  // yer sofrası
  {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 24), M.wood);
    top.position.set(4.3, 0.36, 2.6);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.34, 16), M.darkWood);
    leg.position.set(4.3, 0.17, 2.6);
    interactMesh('sofra', top);
    interactMesh('sofra', leg);
    colliders.push({ minX: 3.8, maxX: 4.8, minZ: 2.1, maxZ: 3.1, maxY: 0.4 });
    // kurulunca görünenler
    const set = new THREE.Group();
    const sini = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.015, 28), M.copper);
    sini.position.y = 0.39;
    set.add(sini);
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI;
      const kase = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.white);
      kase.rotation.x = Math.PI;
      kase.position.set(Math.cos(a) * 0.28, 0.48, Math.sin(a) * 0.28);
      set.add(kase);
    }
    set.position.set(4.3, 0, 2.6);
    set.visible = false;
    scene.add(set);
    refs.sofraSet = set;
    const testi = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshStandardMaterial({ color: 0x9a4a2a, roughness: 0.8 }));
    testi.scale.set(1, 1.3, 1);
    testi.position.set(4.6, 0.52, 2.35);
    testi.visible = false;
    scene.add(testi);
    refs.sofraTesti = testi;
    // sini duvara dayalı (kurulmadan önce)
    const wallSini = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.015, 28), M.copper);
    wallSini.rotation.x = Math.PI / 2 - 0.12;
    wallSini.position.set(3.0, 0.52, 5.85);
    scene.add(wallSini);
    refs.wallSini = wallSini;
    // minderler
    box(M.cloth, 0.55, 0.1, 0.55, 4.3, 0.05, 1.65, { collide: false, tile: 1 });
    box(M.cloth, 0.55, 0.1, 0.55, 4.3, 0.05, 3.55, { collide: false, tile: 1 });
    refs.spots.sitPlayer = { x: 4.3, z: 1.6, yaw: Math.PI };
    refs.spots.sitNine = { x: 4.3, z: 3.6, yaw: 0 };
  }
  // dikiş sepeti (makas)
  {
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.16, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 1, side: THREE.DoubleSide }));
    basket.position.set(6.4, 0.5, 0.7);
    scene.add(basket);
    const yarn = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), M.cloth);
    yarn.position.set(6.45, 0.52, 0.66);
    scene.add(yarn);
    const sc = new THREE.Group();
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.025), M.metal);
    const b = a.clone();
    a.rotation.y = 0.3;
    b.rotation.y = -0.3;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 12), M.black);
    ring.rotation.x = Math.PI / 2;
    ring.position.x = -0.13;
    sc.add(a, b, ring);
    sc.position.set(6.3, 0.6, 0.78);
    interactMesh('makas', sc);
    sc.userData.glow = glowAt(6.3, 0.62, 0.78, 0.45);
    refs.items.makas = sc;
  }
  // köşede radyo
  box(M.darkWood, 0.45, 0.3, 0.25, 2.5, 0.75, 0.25, { collide: false, tile: 1 });
  box(M.darkWood, 0.5, 0.6, 0.4, 2.5, 0.3, 0.3, { tile: 1, sight: false });

  // ---------- Dedenin odası (x 2..7, z -6..0) ----------
  kilim(4.5, -3.3, 2.4, 1.8);
  box(M.white, 1.0, 0.18, 2.0, 6.1, 0.09, -4.5, { tile: 1, sight: false });
  box(M.cloth, 1.02, 0.08, 1.4, 6.1, 0.2, -4.2, { collide: false, tile: 1 });
  hideSpot('hide_dede', 6.65, -1.3, 'W');
  {
    // sandık (defter burada)
    box(M.darkWood, 1.0, 0.55, 0.55, 3.4, 0.275, -5.55, { tile: 1, sight: false });
    for (const dx of [-0.35, 0.35]) box(M.metal, 0.05, 0.57, 0.57, 3.4 + dx, 0.28, -5.55, { collide: false, tile: 1 });
    const lid = new THREE.Mesh(boxGeo(1.02, 0.06, 0.57, 1), M.darkWood);
    lid.position.set(3.4, 0.58, -5.55);
    interactMesh('sandik', lid);
    lid.userData.glow = glowAt(3.4, 0.7, -5.4, 0.7);
    refs.sandik = lid;
  }
  // dedenin fotoğrafı ve tespihi
  {
    const fr = new THREE.Mesh(boxGeo(0.4, 0.5, 0.03, 1), M.darkWood);
    fr.position.set(4.5, 1.7, -5.98);
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({ map: T.paper, color: 0x8a7a64, roughness: 0.9 }));
    ph.position.set(4.5, 1.7, -5.96);
    scene.add(fr, ph);
  }
  box(M.wood, 0.9, 0.05, 0.5, 2.6, 0.75, -5.6, { collide: false, tile: 1 });
  box(M.darkWood, 0.9, 0.72, 0.05, 2.6, 0.36, -5.4, { collide: false, tile: 1 });
  colliders.push({ minX: 2.15, maxX: 3.05, minZ: -5.85, maxZ: -5.35, maxY: 0.8 });

  // ---------- Birleştir ----------
  for (const [mat, geos] of batches) {
    const g = mergeGeometries(geos, false);
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    scene.add(m);
  }

  // ---------- Gezinme ızgarası (0.25 m) ----------
  const cell = 0.25, gx0 = x0 - 0.5, gz0 = z0 - 0.5, GW = Math.ceil((x1 - x0 + 1) / cell), GH = Math.ceil((z1 - z0 + 1) / cell);
  const blocked = new Uint8Array(GW * GH);
  const sight = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++)
    for (let i = 0; i < GW; i++) {
      const x = gx0 + (i + 0.5) * cell, z = gz0 + (j + 0.5) * cell;
      if (x < x0 + 0.05 || x > x1 - 0.05 || z < z0 + 0.05 || z > z1 - 0.05) blocked[j * GW + i] = 1;
    }
  const mark = (arr, c, inf) => {
    const i0 = Math.max(0, Math.floor((c.minX - inf - gx0) / cell)), i1 = Math.min(GW - 1, Math.floor((c.maxX + inf - gx0) / cell));
    const j0 = Math.max(0, Math.floor((c.minZ - inf - gz0) / cell)), j1 = Math.min(GH - 1, Math.floor((c.maxZ + inf - gz0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) arr[j * GW + i] = 1;
  };
  for (const c of colliders) {
    mark(blocked, c, 0.22);
    if (c.maxY === undefined || c.maxY > 1.4) mark(sight, c, 0);
  }
  const grid = {
    cell, gx0, gz0, W: GW, H: GH, blocked, sight,
    toCell: (x, z) => [Math.floor((x - gx0) / cell), Math.floor((z - gz0) / cell)],
    center: (i, j) => [gx0 + (i + 0.5) * cell, gz0 + (j + 0.5) * cell],
    valid: (i, j) => i >= 0 && j >= 0 && i < GW && j < GH,
    isBlocked: (i, j) => !(i >= 0 && j >= 0 && i < GW && j < GH) || blocked[j * GW + i] === 1,
  };

  // devriye noktaları (oda ortaları ve sofa)
  const waypoints = [
    [0, 4.5], [0, 0], [0, -4.5], [-4.5, 4.0], [-4.8, 1.2], [-4.5, -2.5], [-3.6, -4.6], [4.6, 1.0], [5.2, 4.2], [4.6, -2.4], [4.2, -4.4],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));

  return {
    colliders,
    heightAt: () => 0,
    inBounds: (x, z) => x > x0 + 0.2 && x < x1 - 0.2 && z > z0 + 0.2 && z < z1 - 0.2,
    grid,
    waypoints,
    doorways,
    refs,
    M,
    update(dt, t) {
      for (const f of animated) f(dt, t);
      for (const it of Object.values(refs.items)) {
        const gl = it.userData.glow;
        if (gl) gl.material.opacity = it.visible ? 0.1 + Math.sin(t * 2.2 + it.position.x) * 0.05 : 0;
      }
      if (refs.sandik.userData.glow) refs.sandik.userData.glow.material.opacity = refs.sandik.userData.glowOn ? 0.12 + Math.sin(t * 2) * 0.05 : 0;
    },
    setPower(on) {
      for (const b of refs.bulbs) {
        b.light.intensity = on ? b.base : 0;
        b.mesh.material.emissiveIntensity = on ? 1.2 : 0;
      }
      for (const s of refs.moonSpots) s.intensity = on ? 0 : 14;
    },
  };
}
