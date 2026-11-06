import * as THREE from 'three';
import { T, tiledBox } from './tex.js';

// "Dağ köyü": ay ışığında taş evler, meydan, çan kulesi, kilise ve konak.
const rnd = (a, b) => a + Math.random() * (b - a);
const L = (c, o) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });

function wallMats(hex, lit, cols, rows) {
  const side = new THREE.MeshLambertMaterial({ map: T.facade(hex, lit, cols, rows), emissiveMap: T.facadeEmit(lit, cols, rows), emissive: 0xffffff, flatShading: true });
  const roof = new THREE.MeshLambertMaterial({ map: T.concrete(), color: 0x7a8090 });
  return [side, side, roof, roof, side, side];
}

export function buildVillage(scene) {
  const BOUND = { x: 60, z0: -42, z1: 172 };
  const w = new THREE.Group();
  scene.add(w);
  const colliders = [];
  const fires = [];
  const glows = [];
  const lights = [];

  // ---- gökyüzü (gece) ----
  const sky = new THREE.SphereGeometry(380, 28, 18);
  const pos = sky.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const stops = [[-1, '#0a0e1e'], [0, '#1c2a52'], [0.25, '#14204a'], [0.7, '#0b1233'], [1, '#060a1e']].map(([t, h]) => [t, new THREE.Color(h)]);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 380;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const a = stops[k], b = stops[k + 1];
    tmp.copy(a[1]).lerp(b[1], Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))));
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  sky.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const skyM = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  skyM.renderOrder = -10;
  w.add(skyM);
  const SUN = new THREE.Vector3(0.45, 0.55, -0.7).normalize();
  const glowSp = (c, s, x, y, z, op = 1) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow(), color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: op }));
    sp.scale.set(s, s, 1);
    sp.position.set(x, y, z);
    return sp;
  };
  const moon = new THREE.Mesh(new THREE.CircleGeometry(15, 20), new THREE.MeshBasicMaterial({ color: 0xf2f4ff, fog: false }));
  moon.position.set(SUN.x * 330, SUN.y * 330, SUN.z * 330);
  moon.lookAt(0, 0, 0);
  w.add(moon);
  w.add(glowSp(0x7a96e0, 150, SUN.x * 328, SUN.y * 328, SUN.z * 328, 0.55));
  const starG = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 420; i++) {
    const a = Math.random() * 6.28, y = 0.12 + Math.random() * 0.88, r = Math.sqrt(1 - y * y);
    sp.push(Math.cos(a) * r * 360, y * 360, Math.sin(a) * r * 360);
  }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  w.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, fog: false, transparent: true, opacity: 0.9, sizeAttenuation: false })));

  // ---- dağlar ----
  const mm = L(0x28345e);
  const snow = L(0xcdd8f0);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 6.283 + rnd(-0.1, 0.1), r = rnd(190, 250), h = rnd(70, 140), rad = rnd(55, 95);
    const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6), mm.clone());
    m.material.color.offsetHSL(rnd(-0.03, 0.03), 0, rnd(-0.05, 0.04));
    m.position.set(Math.cos(a) * r, h / 2 - 4, 65 + Math.sin(a) * r);
    m.rotation.y = rnd(0, 3);
    w.add(m);
    if (h > 90) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.32, h * 0.3, 6), snow);
      c.position.set(m.position.x, h - 4 - h * 0.15, m.position.z);
      c.rotation.y = m.rotation.y;
      w.add(c);
    }
  }

  // ---- zemin ----
  const gtex = (t, rx, ry = rx) => {
    const x = t.clone();
    x.needsUpdate = true;
    x.repeat.set(rx, ry);
    return x;
  };
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ map: gtex(T.dirt(), 125), color: 0x8a94b0 }));
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = -0.02;
  dirt.receiveShadow = true;
  w.add(dirt);
  const flat = (cx, cz, fw, fd, tex, rx, ry, c = 0xffffff, y = 0.01) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshLambertMaterial({ map: gtex(tex, rx, ry), color: c }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx, y, cz);
    m.receiveShadow = true;
    w.add(m);
  };
  flat(0, 119, 7, 82, T.asphalt(), 2, 21, 0xb0b8d0);
  flat(0, 22, 8, 130, T.paver(), 2, 32, 0x9aa2bc, 0.012);
  flat(0, 20, 30, 28, T.paver(), 8, 8, 0xa8b0c8, 0.015);
  flat(0, -30, 18, 18, T.paver(), 5, 5, 0x9aa2bc, 0.015);

  // ---- yardımcılar ----
  const B = (x, z, bw, bd, bh, m, o = {}) => {
    const { y0 = 0, collide = true, tx = 4, ty = tx, cast = true, recv = true } = o;
    const me = new THREE.Mesh(tiledBox(bw, bh, bd, tx, ty), m);
    me.position.set(x, y0 + bh / 2, z);
    me.castShadow = cast;
    me.receiveShadow = recv;
    w.add(me);
    if (collide) colliders.push({ x0: x - bw / 2, x1: x + bw / 2, z0: z - bd / 2, z1: z + bd / 2, y0, y1: y0 + bh });
    return me;
  };
  const concreteM = new THREE.MeshLambertMaterial({ map: T.concrete(), color: 0xaab0c4, flatShading: true });
  const crateM = new THREE.MeshLambertMaterial({ map: T.crate(), flatShading: true });
  const stoneM = new THREE.MeshLambertMaterial({ map: T.brick(), color: 0x9aa0b4, flatShading: true });
  const lampHead = (x, y, z, c = 0xffc068, s = 7) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.32), new THREE.MeshBasicMaterial({ color: c }));
    m.position.set(x, y, z);
    w.add(m);
    const g = glowSp(c, s, x, y - 0.1, z, 0.75);
    g.userData.base = s;
    g.userData.ph = Math.random() * 6;
    w.add(g);
    glows.push(g);
  };
  const barrel = (x, z, c = 0x5a2a22, fire = false) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 8), L(c));
    m.position.set(x, 0.5, z);
    m.castShadow = true;
    m.receiveShadow = true;
    w.add(m);
    colliders.push({ x0: x - 0.42, x1: x + 0.42, z0: z - 0.42, z1: z + 0.42, y0: 0, y1: 1.0 });
    if (fire) {
      const f = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.22), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffb030 : 0xff6a20 }));
        b.position.set(rnd(-0.18, 0.18), 1.15 + i * 0.12, rnd(-0.18, 0.18));
        b.userData.ph = Math.random() * 6;
        f.add(b);
      }
      f.position.set(x, 0, z);
      w.add(f);
      const li = new THREE.PointLight(0xff8a3a, 60, 24, 2);
      li.position.set(x, 1.8, z);
      w.add(li);
      lights.push(li);
      fires.push({ f, li });
      w.add(glowSp(0xff9040, 4, x, 1.7, z, 0.45));
    }
  };
  const crate = (x, z, s = 1.2, y0 = 0) => B(x, z, s, s, s, crateM, { y0, tx: s });
  const barrier = (x, z, bw = 2.4, bd = 0.7) => B(x, z, bw, bd, 0.95, concreteM, { tx: 1.5 });
  const sandbags = (x, z, bw, bd) => {
    B(x, z, bw, bd, 0.5, L(0x8e8a72), { tx: 4 });
    B(x, z, bw * 0.8, bd * 0.8, 0.5, L(0x80795f), { y0: 0.5, tx: 4 });
  };
  const car = (x, z, c, rot = false) => {
    const bw = rot ? 4.2 : 1.9, bd = rot ? 1.9 : 4.2;
    B(x, z, bw, bd, 0.85, L(c), { y0: 0.4 });
    B(x, z, rot ? 2.2 : 1.7, rot ? 1.7 : 2.2, 0.75, L(0x2a3446), { y0: 1.25 });
  };
  const post = (x, z, c = 0xffc068, s = 8) => {
    B(x, z, 0.16, 0.16, 4.2, L(0x2b2d33), { collide: false });
    lampHead(x, 4.3, z, c, s);
  };
  const floorM = new THREE.MeshLambertMaterial({ map: T.concrete(), color: 0x80798a });
  const house = (cx, cz, hw, hd, o = {}) => {
    const { h = 3.2, door = 'w', hex = 0xb8b0a4, lit = 2, mid = false, plank = true } = o;
    const m = wallMats(hex, lit, 1, 1);
    const t = 0.5, dw = 2.2, dh = 2.6;
    const wallX = (zz, gap) => {
      if (!gap) return B(cx, zz, hw, t, h, m, { tx: 3.2, ty: h });
      const seg = (hw - dw) / 2;
      B(cx - (dw + seg) / 2, zz, seg, t, h, m, { tx: 3.2, ty: h });
      B(cx + (dw + seg) / 2, zz, seg, t, h, m, { tx: 3.2, ty: h });
      B(cx, zz, dw, t, h - dh, m, { y0: dh, tx: 3.2, ty: h - dh });
    };
    const wallZ = (xx, gap) => {
      if (!gap) return B(xx, cz, t, hd, h, m, { tx: 3.2, ty: h });
      const seg = (hd - dw) / 2;
      B(xx, cz - (dw + seg) / 2, t, seg, h, m, { tx: 3.2, ty: h });
      B(xx, cz + (dw + seg) / 2, t, seg, h, m, { tx: 3.2, ty: h });
      B(xx, cz, t, dw, h - dh, m, { y0: dh, tx: 3.2, ty: h - dh });
    };
    wallX(cz - hd / 2, door === 'n');
    wallX(cz + hd / 2, door === 's');
    wallZ(cx - hw / 2, door === 'w');
    wallZ(cx + hw / 2, door === 'e');
    B(cx, cz, hw + 0.5, hd + 0.5, 0.4, new THREE.MeshLambertMaterial({ map: T.concrete(), color: 0x6a7288 }), { y0: h, tx: 4 });
    B(cx, cz, hw - 0.6, hd - 0.6, 0.05, floorM, { collide: false });
    if (mid) {
      B(cx - hw / 4 - 0.55, cz, hw / 2 - 1.1, t, h - 0.3, m, { tx: 3.2, ty: h });
      B(cx + hw / 4 + 1.1, cz, hw / 2 - 2.2, t, h - 0.3, m, { tx: 3.2, ty: h });
    }
    if (plank) {
      B(cx + (door === 'w' ? hw / 2 - 1.2 : -hw / 2 + 1.2), cz + hd / 2 - 1.2, 1.3, 0.8, 0.8, crateM, { tx: 1 });
      B(cx - (door === 'w' ? hw / 2 - 1.0 : -hw / 2 + 1.0), cz - hd / 2 + 1.0, 0.9, 0.9, 1.0, crateM, { tx: 1 });
    }
    lampHead(cx, h - 0.2, cz, 0xffcc88, 5);
  };
  const wall = (x, z, bw, bd) => B(x, z, bw, bd, 1.5, stoneM, { tx: Math.max(bw, bd) / 1.5, ty: 1 });

  // ---- yol: çam ağaçları, kaya duvarlar ----
  const rockM = L(0x4a5068);
  for (let z = 80; z < 172; z += 6) {
    for (const sx of [-1, 1]) {
      const s = rnd(2.6, 4.4);
      const r = new THREE.Mesh(new THREE.BoxGeometry(s, rnd(2, 3.4), rnd(3, 5)), rockM);
      r.position.set(sx * rnd(6.2, 8), 1, z + rnd(-1.5, 1.5));
      r.rotation.y = rnd(0, 1);
      r.castShadow = true;
      w.add(r);
    }
  }
  // yol kapanı (z ≈ 100)
  car(-1.2, 101, 0x6a2c28, true);
  car(2.4, 97, 0x39485a, false);
  barrier(-3.8, 104, 2.4, 0.7);
  barrier(3.4, 105, 2.4, 0.7);
  sandbags(-5.2, 99, 2.8, 0.9);
  sandbags(5, 100, 2.8, 0.9);
  barrel(0.6, 104, 0x4a5538, true);
  barrel(-6, 97, 0x27303a);
  post(-5, 106, 0xffe0a0, 9);
  post(5.5, 94, 0xffe0a0, 9);

  // ---- köy: ana cadde boyunca taş evler ----
  const hexes = [0xb8b0a4, 0xa8a094, 0xc0b4a0, 0xaaa296, 0xb4a898];
  const HH = {};
  const hs = (id, cx, cz, hw, hd, o) => { house(cx, cz, hw, hd, o); HH[id] = { cx, cz, hw, hd, h: o.h || 3.2 }; };
  hs('a1', -14, 70, 8, 8, { door: 'e', hex: hexes[0] });
  hs('a2', 14, 66, 8, 8, { door: 'w', hex: hexes[1], mid: true });
  hs('a3', -14, 52, 8, 9, { door: 'e', hex: hexes[2], mid: true });
  hs('a4', 14, 50, 9, 8, { door: 'w', hex: hexes[3] });
  hs('b1', -14, -2, 8, 8, { door: 'e', hex: hexes[4], mid: true });
  hs('b2', 14, -2, 8, 8, { door: 'w', hex: hexes[0] });
  hs('b3', -14, -16, 8, 8, { door: 'e', hex: hexes[2] });
  hs('b4', 14, -16, 8, 8, { door: 'w', hex: hexes[1], mid: true });
  // yan sokak evleri (cadde sonrası bahçeler)
  hs('c1', -34, 56, 9, 8, { door: 'n', hex: hexes[3] });
  hs('c2', 34, 58, 8, 9, { door: 'w', hex: hexes[4] });
  hs('c3', -36, 30, 8, 8, { door: 'e', hex: hexes[1], mid: true });
  hs('c4', 36, 30, 8, 8, { door: 'w', hex: hexes[0] });
  hs('c5', 38, 8, 8, 8, { door: 'w', hex: hexes[2] });
  // bahçe taş duvarları (sokak dar geçit)
  wall(-24, 62, 0.6, 10);
  wall(24, 58, 0.6, 12);
  wall(-24, 44, 0.6, 8);
  wall(24, 42, 0.6, 8);
  wall(-30, 42, 12, 0.6);
  wall(30, 44, 12, 0.6);
  wall(-24, 12, 0.6, 10);
  wall(24, 14, 0.6, 12);
  // meydan: çeşme, çan kulesi
  const fountain = B(0, 28, 5, 5, 0.8, stoneM, { tx: 3, ty: 1 });
  B(0, 28, 1.2, 1.2, 2.2, stoneM, { tx: 1, ty: 2 });
  w.add(Object.assign(glowSp(0x7aa8ff, 5, 0, 2.6, 28, 0.35)));
  const TX = 0, TZ = 8, TH = 8;
  B(TX, TZ, 4.2, 4.2, TH, wallMats(0xa89c8c, 0, 1, 1), { tx: 3, ty: TH });
  B(TX, TZ, 7, 7, 0.4, new THREE.MeshLambertMaterial({ map: T.concrete(), color: 0x6a7288 }), { y0: TH, tx: 4 });
  for (const [dx, dz] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3]]) B(TX + dx, TZ + dz, 0.3, 0.3, 1.1, stoneM, { y0: TH + 0.4, collide: false });
  B(TX, TZ, 2.4, 2.4, 3.4, stoneM, { y0: TH + 0.4, tx: 2, ty: 3, collide: false });
  const clk = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
  clk.position.set(TX, TH + 2.2, TZ + 1.22);
  w.add(clk);
  w.add(glowSp(0xffd890, 6, TX, TH + 2.2, TZ + 1.4, 0.7));
  // basamaklı giriş yok: kule kapalı (çıkılamaz), keskin nişancı platformda
  for (const [x, z] of [[-11, 18], [11, 18], [-11, 36], [11, 36], [0, 74], [0, 58], [0, -10], [0, -24]]) post(x, z, 0xffc068, 8);
  for (const [x, z] of [[-9, 24], [8, 12], [-4, 40]]) crate(x, z, 1.3);
  crate(-8.8, 24.8, 1.1);
  barrier(-6, 20, 0.7, 2.4);
  barrier(7, 22, 0.7, 2.4);
  barrel(9, 12, 0x4a5538, true);
  barrel(-9, 36, 0x27303a);
  car(-6, 62, 0x7a6a52, false);
  car(5, 78, 0x3a5a7a, false);
  car(-5.4, 46, 0x6a6a5a, false);

  // ---- kilise (batı) ----
  const CHX = -36, CHZ = -14;
  house(CHX, CHZ, 12, 16, { h: 5.2, door: 's', hex: 0xb4aca0, lit: 3, plank: false });
  // dıştan çan kulesi ucu
  B(CHX, CHZ - 6, 3, 3, 3.4, wallMats(0xb4aca0, 0, 1, 1), { y0: 5.6, tx: 2, ty: 3 });
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.3), new THREE.MeshBasicMaterial({ color: 0xd8dcf0 }));
  cross.position.set(CHX, 10.4, CHZ - 6);
  w.add(cross);
  for (const dz of [-3, 0, 3]) {
    B(CHX - 2.6, CHZ + dz, 2.6, 0.5, 0.7, crateM, { tx: 1 });
    B(CHX + 2.6, CHZ + dz, 2.6, 0.5, 0.7, crateM, { tx: 1 });
  }
  B(CHX, CHZ - 6.8, 4, 1.4, 0.5, concreteM, { tx: 2 });
  const chl = new THREE.PointLight(0xffb878, 45, 20, 2);
  chl.position.set(CHX, 3.2, CHZ);
  w.add(chl);
  lights.push(chl);
  lampHead(CHX - 1.7, 3.6, CHZ + 8.8, 0xffc068, 8);
  lampHead(CHX + 1.7, 3.6, CHZ + 8.8, 0xffc068, 8);

  // ---- konak (doğu) ----
  const MX = 34, MZ = -18;
  house(MX, MZ, 18, 12, { h: 4.6, door: 'w', hex: 0xc0b4a0, lit: 3, mid: true, plank: false });
  B(MX + 3, MZ + 3, 1.6, 0.8, 0.8, crateM, { tx: 1 });
  B(MX + 6, MZ - 2.5, 2.2, 0.9, 0.9, crateM, { tx: 1 });
  B(MX - 4, MZ - 3.8, 1.4, 1.4, 1.4, crateM, { tx: 1.4 });
  const ml = new THREE.PointLight(0xffb878, 50, 20, 2);
  ml.position.set(MX, 3.4, MZ);
  w.add(ml);
  lights.push(ml);
  lampHead(MX - 9.8, 3.6, MZ - 1.8, 0xffc068, 8);
  lampHead(MX - 9.8, 3.6, MZ + 1.8, 0xffc068, 8);

  // ---- tahliye alanı (kuzey teras) ----
  const PAD = { x: 0, z: -31, r: 6 };
  const pad = new THREE.Mesh(new THREE.CircleGeometry(PAD.r, 32), new THREE.MeshLambertMaterial({ map: T.pad() }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(PAD.x, 0.04, PAD.z);
  pad.receiveShadow = true;
  w.add(pad);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xff8a30 }));
    m.position.set(PAD.x + Math.cos(a) * (PAD.r + 0.5), 0.06, PAD.z + Math.sin(a) * (PAD.r + 0.5));
    w.add(m);
  }
  const padLight = new THREE.PointLight(0x9ac0ff, 0, 30, 2);
  padLight.position.set(PAD.x, 4, PAD.z);
  w.add(padLight);
  wall(-10, -36, 0.6, 12);
  wall(10, -36, 0.6, 12);
  wall(0, -41, 20, 0.6);

  // ---- çam ağaçları ----
  const pineM = L(0x1c3a34), trunkM = L(0x3a2c20);
  const tree = (x, z) => {
    const s = rnd(0.9, 1.9);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 1.4 * s, 0.4 * s), trunkM);
    t.position.set(x, 0.7 * s, z);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.9 * s, 3 * s, 6), pineM);
    c1.position.set(x, 2.6 * s, z);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.4 * s, 2.4 * s, 6), pineM);
    c2.position.set(x, 4.2 * s, z);
    c1.castShadow = true;
    w.add(t, c1, c2);
  };
  for (let i = 0; i < 90; i++) {
    const side = i % 2 ? 1 : -1;
    tree(side * rnd(46, 58), rnd(-38, 168));
  }
  for (let i = 0; i < 60; i++) tree((i % 2 ? 1 : -1) * rnd(10, 44), rnd(112, 168));
  for (let i = 0; i < 40; i++) tree(rnd(-56, 56), rnd(-60, -44));
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * 6.283, r = rnd(70, 130);
    const x = Math.cos(a) * r, z = 65 + Math.sin(a) * r * 0.9;
    if (Math.abs(x) < 62 && z > -45 && z < 175) continue;
    tree(x, z);
  }
  // uzak köy ışıkları: pencereli kutular
  const hm = new THREE.MeshLambertMaterial({ map: T.facade(0xffffff, 2, 3, 2), emissiveMap: T.facadeEmit(2, 3, 2), emissive: 0xffffff, flatShading: true });
  for (let i = 0; i < 24; i++) {
    const x = (i % 2 ? 1 : -1) * rnd(72, 120), z = rnd(-40, 90);
    const hh = rnd(4, 8);
    const m = new THREE.Mesh(new THREE.BoxGeometry(rnd(6, 10), hh, rnd(6, 10)), hm);
    m.position.set(x, hh / 2 - 0.2, z);
    m.material = hm;
    w.add(m);
  }

  // ---- malzemeler ----
  const pickups = [];
  const pickup = (x, z, kind) => {
    const g = new THREE.Group();
    const c = kind === 'med' ? 0xf4f4f0 : 0x6a7a3a;
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.4), L(c)), { castShadow: true }));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: kind === 'med' ? 0xe5483a : 0xf2c230 })));
    if (kind === 'med') g.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), new THREE.MeshBasicMaterial({ color: 0xe5483a })));
    g.add(glowSp(kind === 'med' ? 0x80ff9a : 0xffe070, 2.4, 0, 0.2, 0, 0.55));
    g.position.set(x, 0.6, z);
    w.add(g);
    pickups.push({ x, z, kind, mesh: g, taken: false });
  };
  pickup(-5, 99, 'ammo');
  pickup(-14, 70, 'med');
  pickup(14, 66, 'ammo');
  pickup(-14, 52, 'ammo');
  pickup(14, 50, 'med');
  pickup(-8.8, 24.8, 'ammo');
  pickup(36, 30, 'med');
  pickup(-36, 30, 'ammo');
  pickup(-14, -2, 'med');
  pickup(14, -16, 'ammo');

  const rects = colliders.filter((c) => c.y1 - c.y0 > 0.85 && c.y0 < 1 && (c.x1 - c.x0) * (c.z1 - c.z0) > 0.8);
  const rf = (id) => HH[id].h + 0.4;

  return {
    id: 'koy',
    group: w,
    colliders,
    rects,
    bound: BOUND,
    ground: [
      { r: [-3.5, 78, 3.5, 172], fill: '#1d2740' },
      { r: [-4, -34, 4, 78], fill: '#1d2740' },
      { r: [-15, 6, 15, 34], fill: '#222d4a', stroke: '#34456e' },
      { r: [-9, -40, 9, -22], fill: '#222d4a', stroke: '#34456e' },
    ],
    fog: { color: 0x141c34, near: 26, far: 190 },
    hemi: { sky: 0x6a7cc8, ground: 0x2a2a3c, k: 1.75 },
    sunCfg: { color: 0x9ab4ff, k: 1.75 },
    gate: { x: 0, z: 80, test: (p) => p.z < 80 },
    objText: { enter: 'Köye sız', brief: 'Dağ köyünde silahlı bir grup rehine tutuyor. Yolu geç, köye sız, konak ve kiliseden rehineleri çıkar, kuzeydeki alandan helikopterle ayrıl.', start1: 'Merkez: Yoldan köye ilerleyin. Rehineler konakta ve kilisede.', start2: 'Yol kapanında nöbetçiler var. Sessiz ilerle, ay ışığı seni ele verebilir.' },
    PAD,
    padLight,
    lights,
    SUN,
    spawn: { x: 0, z: 167 },
    pickups,
    hostageSpots: [
      { x: MX + 1, z: MZ + 1.5, yaw: 0.4 },
      { x: MX + 5, z: MZ - 1.5, yaw: 3.6 },
      { x: CHX - 1.5, z: CHZ - 3, yaw: 0.2 },
    ],
    enemySpots: [
      { id: 'k1', type: 'guard', x: 3, z: 100, y: 0, patrol: [[3, 100], [-3, 103]] },
      { id: 'k2', type: 'guard', x: -6, z: 98, y: 0 },
      { id: 'p1', type: 'patrol', x: -3, z: 82, y: 0, patrol: [[-3, 82], [3, 80], [3, 66], [-3, 68]] },
      { id: 's1', type: 'sniper', x: HH.a3.cx, z: HH.a3.cz, y: rf('a3') },
      { id: 'g1', type: 'guard', x: 7, z: 26, y: 0, patrol: [[7, 26], [10, 20]] },
      { id: 'g2', type: 'guard', x: -9, z: 18, y: 0, patrol: [[-9, 18], [-10, 28]] },
      { id: 'p2', type: 'patrol', x: -10, z: 32, y: 0, patrol: [[-10, 32], [10, 34], [10, 14], [-10, 14]] },
      { id: 's2', type: 'sniper', x: TX + 2.5, z: TZ + 2.5, y: TH + 0.4 },
      { id: 'p3', type: 'patrol', x: 0, z: -6, y: 0, patrol: [[0, -6], [3, -18], [-3, -20], [-3, -4]] },
      { id: 's3', type: 'sniper', x: HH.b2.cx, z: HH.b2.cz, y: rf('b2') },
      { id: 'm1', type: 'guard', x: MX - 2, z: MZ + 3, y: 0, patrol: [[MX - 2, MZ + 3], [MX - 2, MZ - 3]] },
      { id: 'm2', type: 'guard', x: MX + 7, z: MZ + 2, y: 0 },
      { id: 'm3', type: 'guard', x: MX + 3, z: MZ - 4, y: 0, patrol: [[MX + 3, MZ - 4], [MX + 7, MZ - 4]] },
      { id: 'c1', type: 'guard', x: CHX + 2, z: CHZ + 2, y: 0, patrol: [[CHX + 2, CHZ + 2], [CHX - 3, CHZ + 2]] },
      { id: 'c2', type: 'guard', x: CHX - 3, z: CHZ - 3.5, y: 0 },
    ],
    update(t) {
      for (const f of fires) {
        f.li.intensity = 56 + Math.sin(t * 17) * 9 + Math.sin(t * 7.3) * 6;
        f.f.children.forEach((b) => {
          b.scale.y = 0.7 + Math.abs(Math.sin(t * 9 + b.userData.ph)) * 0.9;
          b.position.y = 1.1 + b.scale.y * 0.2;
        });
      }
      for (const g of glows) g.scale.setScalar(g.userData.base * (1 + Math.sin(t * 3 + g.userData.ph) * 0.04));
    },
  };
}
