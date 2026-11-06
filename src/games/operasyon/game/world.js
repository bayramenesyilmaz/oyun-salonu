import * as THREE from 'three';
import { T, tiledBox } from './tex.js';

// "Terk edilmiş sanayi tesisi": alacakaranlık, sıcak lambalar, dağ ve köy silüeti.
export const BOUND = { x: 62, z0: -42, z1: 182 };
const rnd = (a, b) => a + Math.random() * (b - a);
const L = (c, o) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });

function wallMats(hex, lit, cols, rows) {
  const side = new THREE.MeshLambertMaterial({ map: T.facade(hex, lit, cols, rows), emissiveMap: T.facadeEmit(lit, cols, rows), emissive: 0xffffff, flatShading: true });
  const roof = new THREE.MeshLambertMaterial({ map: T.concrete() });
  return [side, side, roof, roof, side, side];
}

export function buildWorld(scene, { touch = false } = {}) {
  const w = new THREE.Group();
  scene.add(w);
  const colliders = [];
  const fires = [];
  const glows = [];
  const lights = [];

  // ---- gökyüzü ----
  const sky = new THREE.SphereGeometry(380, 28, 18);
  const pos = sky.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const stops = [[-1, '#2a2038'], [-0.05, '#3b2a47'], [0, '#ff9450'], [0.07, '#f0709a'], [0.28, '#6a55b0'], [0.7, '#25367a'], [1, '#101a48']].map(([t, h]) => [t, new THREE.Color(h)]);
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
  const SUN = new THREE.Vector3(-0.55, 0.075, -0.83).normalize();
  const glowSp = (c, s, x, y, z, op = 1) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow(), color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: op }));
    sp.scale.set(s, s, 1);
    sp.position.set(x, y, z);
    return sp;
  };
  w.add(glowSp(0xff8a40, 260, SUN.x * 340, SUN.y * 340 + 4, SUN.z * 340, 0.9));
  w.add(glowSp(0xffe0a0, 60, SUN.x * 338, SUN.y * 338 + 4, SUN.z * 338));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(14, 16), new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false }));
  moon.position.set(150, 190, -250);
  moon.lookAt(0, 0, 0);
  w.add(moon);
  const starG = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 220; i++) {
    const a = Math.random() * 6.28, y = 0.25 + Math.random() * 0.75, r = Math.sqrt(1 - y * y);
    sp.push(Math.cos(a) * r * 360, y * 360, Math.sin(a) * r * 360);
  }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  w.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, fog: false, transparent: true, opacity: 0.8, sizeAttenuation: false })));

  // ---- dağlar ----
  const mm = L(0x3d4a80);
  const snow = L(0xf2dcec);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * 6.283 + rnd(-0.1, 0.1), r = rnd(210, 260), h = rnd(60, 120), rad = rnd(55, 95);
    const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6), mm.clone());
    m.material.color.offsetHSL(rnd(-0.03, 0.03), 0, rnd(-0.06, 0.04));
    m.position.set(Math.cos(a) * r, h / 2 - 4, 70 + Math.sin(a) * r);
    m.rotation.y = rnd(0, 3);
    w.add(m);
    if (h > 85) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.3, h * 0.28, 6), snow);
      c.position.set(m.position.x, h - 4 - h * 0.14, m.position.z);
      c.rotation.y = m.rotation.y;
      w.add(c);
    }
  }

  // ---- zemin ----
  const gtex = (t, rep) => {
    const x = t.clone();
    x.needsUpdate = true;
    x.repeat.set(rep, rep);
    return x;
  };
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ map: gtex(T.dirt(), 125) }));
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = -0.02;
  dirt.receiveShadow = true;
  w.add(dirt);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(72, 56), new THREE.MeshLambertMaterial({ map: gtex(T.paver(), 18) }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.0;
  floor.receiveShadow = true;
  w.add(floor);
  floor.material.map.repeat.set(18, 14);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 156), new THREE.MeshLambertMaterial({ map: gtex(T.asphalt(), 5) }));
  road.material.map.repeat.set(2, 39);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, 106);
  road.receiveShadow = true;
  w.add(road);

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
  const concreteM = new THREE.MeshLambertMaterial({ map: T.concrete(), flatShading: true });
  const crateM = new THREE.MeshLambertMaterial({ map: T.crate(), flatShading: true });
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
    const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 8), L(0x222222));
    r1.position.set(x, 0.75, z);
    w.add(r1);
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
    B(x, z, bw, bd, 0.5, L(0xa59972), { tx: 4 });
    B(x, z, bw * 0.8, bd * 0.8, 0.5, L(0x978b66), { y0: 0.5, tx: 4 });
  };
  const container = (x, z, bw, bd, c, y0 = 0) => B(x, z, bw, bd, 2.6, new THREE.MeshLambertMaterial({ map: T.container(c), flatShading: true }), { y0, tx: 2.6 });

  // ---- çevre duvarı (kapı: güney, x −4..4) ----
  const wm = new THREE.MeshLambertMaterial({ map: T.brick(), flatShading: true });
  B(0, -28.4, 73.6, 1.2, 3.2, wm, { tx: 4 });
  B(-36.4, 0, 1.2, 57.6, 3.2, wm, { tx: 4 });
  B(36.4, 0, 1.2, 57.6, 3.2, wm, { tx: 4 });
  B(-20.2, 28.4, 32.4, 1.2, 3.2, wm, { tx: 4 });
  B(20.2, 28.4, 32.4, 1.2, 3.2, wm, { tx: 4 });
  B(-4.6, 28.4, 1.2, 1.2, 4.6, concreteM, { tx: 1.5 });
  B(4.6, 28.4, 1.2, 1.2, 4.6, concreteM, { tx: 1.5 });
  B(0, 28.4, 9.4, 0.6, 0.5, concreteM, { y0: 4.3, collide: false });
  lampHead(-4.6, 4.1, 27.6);
  lampHead(4.6, 4.1, 27.6);

  // ---- depo (rehine bölgesi) ----
  const dm = wallMats(0xb4a089, 0, 1, 1);
  const DX = 18, DZ = -17, DH = 6.5;
  B(DX, DZ - 5.6, 20, 0.8, DH, dm, { tx: 5, ty: DH });
  B(8.4, DZ, 0.8, 12, DH, dm, { tx: 6, ty: DH });
  B(27.6, DZ, 0.8, 12, DH, dm, { tx: 6, ty: DH });
  B(11.5, DZ + 5.6, 7, 0.8, DH, dm, { tx: 3.5, ty: DH });
  B(24.5, DZ + 5.6, 7, 0.8, DH, dm, { tx: 3.5, ty: DH });
  B(DX, DZ + 5.6, 6, 0.8, 2.3, dm, { y0: 4.2, tx: 6, ty: 2.3 });
  B(DX, DZ, 20.8, 12.8, 0.5, concreteM, { y0: DH, collide: false, tx: 4 });
  // iç: kasalar, raflar
  crate(12, DZ - 3.5, 2);
  crate(12, DZ - 3.5, 1.4, 2);
  crate(13.8, DZ - 4.6, 1.3);
  crate(23, DZ - 4.8, 1.8);
  crate(25.5, DZ - 4.8, 1.8);
  crate(25.5, DZ - 4.8, 1.2, 1.8);
  crate(11, DZ + 2.5, 1.6);
  crate(13, DZ + 3.8, 1.2);
  barrier(17, DZ - 1, 0.7, 2.4);
  barrier(20, DZ + 1.5, 2.4, 0.7);
  barrel(26.5, DZ + 2, 0x27303a);
  barrel(26.5, DZ + 3.1, 0x5a2a22);
  for (let i = 0; i < 3; i++) lampHead(DX - 6 + i * 6, 6.2, DZ - 1, 0xffcc88, 6);
  const wl = new THREE.PointLight(0xffb070, 70, 26, 2);
  wl.position.set(DX, 5, DZ);
  w.add(wl);
  lights.push(wl);
  // kapı yanları lambaları (dışarı)
  lampHead(DX - 3.2, 4.0, DZ + 6.1, 0xffc068, 8);
  lampHead(DX + 3.2, 4.0, DZ + 6.1, 0xffc068, 8);

  // ---- ofis (iki katlı, balkonlu) ----
  const om = wallMats(0xb09ca0, 2, 2, 2);
  const OX = -20, OZ = -14.5, OH = 7;
  B(OX, OZ - 5.1, 16, 0.8, OH, om, { tx: 8, ty: OH / 2 * 2 });
  B(-27.6, OZ, 0.8, 11, OH, om, { tx: 5.5, ty: OH });
  B(-12.4, OZ, 0.8, 11, OH, om, { tx: 5.5, ty: OH });
  B(-24.5, OZ + 5.1, 7, 0.8, OH, om, { tx: 3.5, ty: OH });
  B(-15, OZ + 5.1, 6, 0.8, OH, om, { tx: 3, ty: OH });
  B(-19.5, OZ + 5.1, 3, 0.8, 4.2, om, { y0: 2.8, tx: 3, ty: 4.2 });
  B(OX, OZ, 16.6, 11.6, 0.5, concreteM, { y0: OH, collide: false });
  B(OX, OZ + 2.0, 15.2, 6, 0.3, concreteM, { y0: 3.2 - 0.3, collide: false }); // ara kat (görsel, içeriden görünür)
  crate(-24, OZ - 2, 1.6);
  crate(-14.6, OZ + 2.6, 1.4);
  barrier(-20, OZ, 3, 0.7);
  lampHead(-19.5, 2.5, OZ + 4.6, 0xffc888, 7);
  const ol = new THREE.PointLight(0xffb878, 40, 18, 2);
  ol.position.set(OX, 2.6, OZ);
  w.add(ol);
  lights.push(ol);
  // balkon + korkuluk + merdiven
  const BZ = OZ + 6.5;
  B(-19.75, BZ, 14.5, 2, 0.3, concreteM, { y0: 3.1, tx: 3 });
  B(-19.75, BZ + 0.95, 14.5, 0.1, 1.0, L(0x2b2d33), { y0: 3.4, tx: 4 });
  B(-12.6, BZ, 0.1, 2, 1.0, L(0x2b2d33), { y0: 3.4, collide: false });
  B(-27, BZ, 0.1, 2, 1.0, L(0x2b2d33), { y0: 3.4, collide: false });
  for (const px of [-26, -21, -16, -12.8]) B(px, BZ + 0.9, 0.3, 0.3, 3.1, concreteM, { collide: false });
  const rise = 3.4 / 12;
  for (let i = 0; i < 11; i++) {
    const top = 3.4 - rise * (i + 1);
    B(-12.5 + 0.5 * (i + 0.5) + 0.05, BZ, 0.5, 2, top, concreteM, { tx: 2 });
  }
  lampHead(-19.75, 4.5, BZ - 0.8, 0xffc068, 9);

  // ---- garaj (güneydoğu) ve konteynerler ----
  const gm = wallMats(0xa8a39a, 0, 1, 1);
  B(24, 14, 10, 8, 4.2, gm, { tx: 5, ty: 4.2 });
  container(-8, 10, 6, 2.4, 0x9a3b2e);
  container(-8, 10, 6, 2.4, 0x2d5a86, 2.6);
  container(10, 18, 2.4, 6, 0x4f6a3a);
  container(-26, 8, 6, 2.4, 0x3b6b52);
  container(-31, 16, 2.4, 6, 0x2d5a86);
  container(4, -22, 6, 2.4, 0x9a6a2e);
  // merkez siperleri
  barrier(-4, -2);
  barrier(5, -5, 0.7, 2.4);
  barrier(2, 6);
  barrier(-14, 5, 0.7, 2.4);
  sandbags(12, 0, 3.4, 0.9);
  sandbags(-1, -12, 3.4, 0.9);
  crate(0, 1.4, 1.2);
  crate(1.3, 1.4, 1.2);
  crate(0.6, 1.4, 1.1, 1.2);
  crate(-17, 12, 1.4);
  crate(-18.6, 12.4, 1.2);
  crate(16, 8, 1.4);
  crate(31, -8, 1.4);
  barrel(-2, 8, 0x4a5538, true);
  barrel(-3.1, 8.4, 0x5a2a22);
  barrel(14, -6.2, 0x4a5538, true);
  barrel(15.2, -6.6, 0x27303a);
  barrel(31.2, 12, 0x5a2a22);
  barrel(-30, -4, 0x27303a);
  barrel(-30.9, -4.4, 0x4a5538);

  // ---- gözetleme kuleleri ----
  const towerM = L(0x5a4630);
  const tower = (x, z, h = 6) => {
    for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) B(x + dx, z + dz, 0.3, 0.3, h, towerM, { collide: false });
    B(x, z, 3.6, 3.6, 0.3, towerM, { y0: h });
    for (const dx of [-1, 1]) B(x + dx * 1.7, z, 0.1, 3.4, 1, towerM, { y0: h + 0.3, collide: false });
    B(x, z + 1.7, 3.4, 0.1, 1, towerM, { y0: h + 0.3, collide: false });
    B(x, z - 1.7, 3.4, 0.1, 1, towerM, { y0: h + 0.3, collide: false });
    for (const [dx, dz] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) B(x + dx, z + dz, 0.15, 0.15, 2.2, towerM, { y0: h + 0.3, collide: false });
    B(x, z, 4.2, 4.2, 0.25, L(0x3a2d20), { y0: h + 2.5, collide: false });
    for (const dz of [-1.6, 1.6]) B(x, z + dz, 3.2, 0.1, h * 0.9, towerM, { collide: false, cast: false }).rotation.z = 0;
    lampHead(x - 1.4, h + 2.3, z + 1.7, 0xffe0a0, 9);
    lampHead(x + 1.4, h + 2.3, z + 1.7, 0xffe0a0, 9);
  };
  tower(-32, -24);
  tower(33, 24);
  // flama direği
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4, 0.12), L(0xdddddd));
  pole.position.set(-33, 2, -1);
  w.add(pole);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.05), L(0x2c4a8a));
  flag.position.set(-32.2, 3.4, -1);
  w.add(flag);
  const emb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), L(0xf2c230));
  emb.position.set(-32.2, 3.4, -1);
  w.add(emb);
  // direk lambaları
  for (const [x, z] of [[-14, 1], [12, 5], [0, -9], [28, 18], [-30, 12]]) {
    B(x, z, 0.18, 0.18, 4.2, L(0x2b2d33), { collide: false });
    lampHead(x, 4.3, z + 0.3);
  }
  // kırmızı grafiti (depo duvarı)
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), new THREE.MeshBasicMaterial({ map: (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const c = cv.getContext('2d');
    c.strokeStyle = '#b8202a';
    c.lineWidth = 9;
    c.beginPath();
    c.arc(64, 64, 44, 0, 6.3);
    c.moveTo(20, 108);
    c.lineTo(108, 20);
    c.moveTo(20, 20);
    c.lineTo(108, 108);
    c.stroke();
    return new THREE.CanvasTexture(cv);
  })(), transparent: true, opacity: 0.85 }));
  gr.position.set(30.5, 4, DZ + 0.2);
  gr.rotation.y = -Math.PI / 2;
  // (doğu dış yüzü) depo doğu duvarı dışına
  gr.position.set(28.05, 3.4, DZ);
  w.add(gr);

  // ---- helikopter pisti ----
  const PAD = { x: 28, z: -2, r: 6 };
  const pad = new THREE.Mesh(new THREE.CircleGeometry(PAD.r, 32), new THREE.MeshLambertMaterial({ map: T.pad() }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(PAD.x, 0.03, PAD.z);
  pad.receiveShadow = true;
  w.add(pad);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xff8a30 }));
    m.position.set(PAD.x + Math.cos(a) * (PAD.r + 0.5), 0.06, PAD.z + Math.sin(a) * (PAD.r + 0.5));
    m.userData.pad = true;
    w.add(m);
  }
  const padLight = new THREE.PointLight(0x9ac0ff, 0, 30, 2);
  padLight.position.set(PAD.x, 4, PAD.z);
  w.add(padLight);

  // ---- yol köyü: girilebilir evler, kontrol noktası, arabalar ----
  const floorM = new THREE.MeshLambertMaterial({ map: T.concrete(), color: 0x9a9088 });
  const house = (cx, cz, w, d, o = {}) => {
    const { h = 3.2, door = 'w', hex = 0xc9b79c, lit = 2, mid = false } = o;
    const m = wallMats(hex, lit, 1, 1);
    const t = 0.5, dw = 2.2, dh = 2.6;
    const wallX = (zz, gap) => {
      if (!gap) return B(cx, zz, w, t, h, m, { tx: 3.2, ty: h });
      const seg = (w - dw) / 2;
      B(cx - (dw + seg) / 2, zz, seg, t, h, m, { tx: 3.2, ty: h });
      B(cx + (dw + seg) / 2, zz, seg, t, h, m, { tx: 3.2, ty: h });
      B(cx, zz, dw, t, h - dh, m, { y0: dh, tx: 3.2, ty: h - dh });
    };
    const wallZ = (xx, gap) => {
      if (!gap) return B(xx, cz, t, d, h, m, { tx: 3.2, ty: h });
      const seg = (d - dw) / 2;
      B(xx, cz - (dw + seg) / 2, t, seg, h, m, { tx: 3.2, ty: h });
      B(xx, cz + (dw + seg) / 2, t, seg, h, m, { tx: 3.2, ty: h });
      B(xx, cz, t, dw, h - dh, m, { y0: dh, tx: 3.2, ty: h - dh });
    };
    wallX(cz - d / 2, door === 'n');
    wallX(cz + d / 2, door === 's');
    wallZ(cx - w / 2, door === 'w');
    wallZ(cx + w / 2, door === 'e');
    B(cx, cz, w + 0.5, d + 0.5, 0.4, concreteM, { y0: h, tx: 4 });
    B(cx, cz, w - 0.6, d - 0.6, 0.05, floorM, { collide: false, recv: true });
    if (mid) {
      B(cx - w / 4 - 0.55, cz, w / 2 - 1.1, t, 2.9, m, { tx: 3.2, ty: 2.9 });
      B(cx + w / 4 + 1.1, cz, w / 2 - 2.2, t, 2.9, m, { tx: 3.2, ty: 2.9 });
    }
    // iç eşya + tavan lambası
    B(cx + (door === 'w' ? w / 2 - 1.2 : -w / 2 + 1.2), cz + d / 2 - 1.2, 1.3, 0.8, 0.8, crateM, { tx: 1 });
    B(cx - (door === 'w' ? w / 2 - 1.0 : -w / 2 + 1.0), cz - d / 2 + 1.0, 0.9, 0.9, 1.0, crateM, { tx: 1 });
    lampHead(cx, h - 0.2, cz, 0xffcc88, 5);
  };
  const car = (x, z, c) => {
    B(x, z, 1.9, 4.2, 0.85, L(c), { y0: 0.4 });
    B(x, z - 0.2, 1.7, 2.2, 0.75, L(0x2a3446), { y0: 1.25, cast: true });
    for (const [dx, dz] of [[-0.95, -1.4], [0.95, -1.4], [-0.95, 1.4], [0.95, 1.4]]) B(x + dx, z + dz, 0.25, 0.7, 0.7, L(0x15171a), { y0: 0, collide: false });
  };
  // kontrol noktası (z ≈ 54)
  barrier(-4.6, 54, 2.4, 0.7);
  barrier(4.6, 54, 2.4, 0.7);
  barrier(0, 51, 2.4, 0.7);
  sandbags(-7, 56, 3, 0.9);
  sandbags(7, 57, 3, 0.9);
  house(-11, 55, 3.6, 3.6, { h: 2.8, door: 'e', hex: 0xa8a39a, lit: 1, });
  lampHead(-5.8, 3.4, 52, 0xffe0a0, 9);
  lampHead(5.8, 3.4, 52, 0xffe0a0, 9);
  B(-5.8, 52, 0.15, 0.15, 3.4, L(0x2b2d33), { collide: false });
  B(5.8, 52, 0.15, 0.15, 3.4, L(0x2b2d33), { collide: false });
  barrel(9, 53, 0x4a5538, true);
  // köy evleri (sağ: kapı batıya, sol: kapı doğuya)
  house(17, 74, 8, 7, { door: 'w', hex: 0xc9b79c });
  house(16.5, 92, 9, 8, { door: 'w', hex: 0xb8a08a, mid: true });
  house(18, 110, 7, 7, { door: 'w', hex: 0xd0c0a4 });
  house(16, 130, 9, 7, { door: 'w', hex: 0xbfae94, mid: true });
  house(-17, 72, 8, 8, { door: 'e', hex: 0xb8a58e });
  house(-16.5, 90, 7, 9, { door: 'e', hex: 0xc9b79c, mid: true });
  house(-18, 108, 9, 7, { door: 'e', hex: 0xb0a090 });
  house(-15, 128, 8, 8, { door: 'e', hex: 0xc4b298 });
  car(2.4, 100, 0x8a3b2e);
  car(-2.6, 118, 0x3a5a7a);
  car(2.6, 140, 0x6a6a52);
  car(-2.4, 82, 0x7a7266);
  car(2.5, 64, 0x2f3b30);
  crate(7, 96, 1.3);
  crate(8.2, 96.6, 1.1);
  crate(-8, 112, 1.4);
  barrel(8, 120, 0x5a2a22);
  barrel(-8.6, 78, 0x27303a);
  barrier(-6, 132, 0.7, 2.4);
  for (let z = 66; z <= 160; z += 18) {
    const x = z % 36 ? 5.2 : -5.2;
    B(x, z, 0.16, 0.16, 4.2, L(0x2b2d33), { collide: false });
    lampHead(x, 4.3, z, 0xffc068, 8);
  }

  // ---- toplanabilir malzemeler ----
  const pickups = [];
  const pickup = (x, z, kind) => {
    const g = new THREE.Group();
    const col = kind === 'med' ? 0xf4f4f0 : 0x6a7a3a;
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.4), L(col)), { castShadow: true }));
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: kind === 'med' ? 0xe5483a : 0xf2c230 }));
    g.add(mark);
    if (kind === 'med') g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), new THREE.MeshBasicMaterial({ color: 0xe5483a })), {}));
    g.add(glowSp(kind === 'med' ? 0x80ff9a : 0xffe070, 2.4, 0, 0.2, 0, 0.55));
    g.position.set(x, 0.6, z);
    w.add(g);
    pickups.push({ x, z, kind, mesh: g, taken: false });
  };
  pickup(16.5, 92, 'med');
  pickup(-16.5, 89, 'ammo');
  pickup(-18, 108, 'med');
  pickup(16, 129, 'ammo');
  pickup(17, 74, 'ammo');
  pickup(-11, 55, 'med');
  pickup(0, 3.2, 'ammo');
  pickup(-20, -13, 'med');
  pickup(12, -13, 'ammo');

  // ---- uzak köy (instanced): pencereli evler + kiremit çatılar ----
  const houses = [];
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * 6.283 + rnd(-0.05, 0.05), r = rnd(95, 175);
    const x = Math.cos(a) * r * 1.05, z = 70 + Math.sin(a) * r * 0.95;
    if (Math.abs(x) < 78 && z > -55 && z < 195) continue;
    houses.push({ x, z, w: rnd(5, 10), h: rnd(4, 9), d: rnd(5, 10), c: [0xd9b99a, 0xc9a98e, 0xb89a86, 0xe0c8a8, 0xa88e80][i % 5], ry: rnd(0, 3) });
  }
  const hm = new THREE.MeshLambertMaterial({ map: T.facade(0xffffff, 2, 3, 2), emissiveMap: T.facadeEmit(2, 3, 2), emissive: 0xffffff, flatShading: true });
  const hi = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), hm, houses.length);
  const ri = new THREE.InstancedMesh(new THREE.ConeGeometry(0.78, 0.55, 4), L(0x9a4a38), houses.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c3 = new THREE.Color();
  houses.forEach((h, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.ry);
    m4.compose(new THREE.Vector3(h.x, h.h / 2 - 0.2, h.z), q, new THREE.Vector3(h.w, h.h, h.d));
    hi.setMatrixAt(i, m4);
    hi.setColorAt(i, c3.setHex(h.c));
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.ry + Math.PI / 4);
    m4.compose(new THREE.Vector3(h.x, h.h - 0.2 + (Math.max(h.w, h.d) * 0.55) / 2, h.z), q, new THREE.Vector3(Math.max(h.w, h.d) * 1.3, Math.max(h.w, h.d) * 1.1, Math.max(h.w, h.d) * 1.3));
    ri.setMatrixAt(i, m4);
  });
  w.add(hi, ri);
  // çam ağaçları: yol boyunca ve çevrede
  const pineM = L(0x2a4a3a), trunkM = L(0x4a3424);
  const tree = (x, z) => {
    const s = rnd(0.9, 1.8);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 1.4 * s, 0.4 * s), trunkM);
    t.position.set(x, 0.7 * s, z);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.9 * s, 3 * s, 6), pineM);
    c1.position.set(x, 2.6 * s, z);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.4 * s, 2.4 * s, 6), pineM);
    c2.position.set(x, 4.2 * s, z);
    c1.castShadow = true;
    w.add(t, c1, c2);
  };
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1;
    tree(side * rnd(28, 58), rnd(42, 182));
  }
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * 6.283, r = rnd(66, 120);
    const x = Math.cos(a) * r * 1.1, z = Math.sin(a) * r * 0.9;
    if (Math.abs(x) < 64 && z > -48 && z < 190) continue;
    tree(x, z);
  }

  const rects = colliders.filter((c) => c.y1 - c.y0 > 0.85 && c.y0 < 1 && (c.x1 - c.x0) * (c.z1 - c.z0) > 0.8);

  return {
    id: 'tesis',
    group: w,
    colliders,
    rects,
    bound: BOUND,
    ground: [
      { r: [-4, 28, 4, 182], fill: '#222c40' },
      { r: [-36, -28, 36, 28], fill: '#18233a', stroke: '#2c3c5c' },
    ],
    fog: { color: 0xa07a92, near: 38, far: 250 },
    hemi: { sky: 0x9a96e0, ground: 0x5a4636, k: 1.55 },
    sunCfg: { color: 0xff9a58, k: 1.9 },
    gate: { x: 0, z: 27, test: (p) => p.z < 26 },
    objText: { enter: 'Tesise sız', brief: 'Terk edilmiş bir sanayi bölgesinde silahlı bir grup rehine tutuyor. Tesise sız, rehineleri kurtar ve tahliye helikopterine ulaş. Silah sesi tüm tesisi uyandırır; siper al, ekibinle hareket et.', start1: 'Merkez: Köy yolundan tesise ilerleyin. Rehineler depo ve ofis binasında.', start2: 'Kontrol noktası ve devriyeler var. Sessiz ilerle, silah sesi herkesi uyandırır.' },
    PAD,
    padLight,
    lights,
    SUN,
    spawn: { x: 0, z: 172 },
    pickups,
    hostageSpots: [
      { x: 23.5, z: -20.5, yaw: 0.2 },
      { x: 26, z: -18.6, yaw: 0.5 },
      { x: -23, z: -17.8, yaw: -0.3 },
    ],
    enemySpots: [
      { id: 'g1', type: 'guard', x: 19.5, z: -19.2, y: 0, patrol: [[19.5, -19.2], [15, -19.5]] },
      { id: 'g2', type: 'guard', x: 14, z: -14, y: 0, patrol: [[14, -14], [21, -14.2]] },
      { id: 'g3', type: 'guard', x: -22.5, z: -15, y: 0, patrol: [[-22.5, -15], [-16, -15.5]] },
      { id: 's1', type: 'sniper', x: -24, z: BZ, y: 3.4 },
      { id: 's2', type: 'sniper', x: -32, z: -24, y: 6.3 },
      { id: 'p1', type: 'patrol', x: -10, z: -2, y: 0, patrol: [[-10, -2], [8, -2], [8, 9], [-10, 9]] },
      { id: 'p2', type: 'patrol', x: -30, z: 0, y: 0, patrol: [[-30, 0], [-30, 18], [-16, 18], [-16, 2]] },
      { id: 'r1', type: 'guard', x: 3, z: 58, y: 0, patrol: [[3, 58], [-3, 59]] },
      { id: 'r2', type: 'guard', x: -9, z: 56, y: 0 },
      { id: 'v1', type: 'patrol', x: -5, z: 82, y: 0, patrol: [[-5, 82], [5, 84], [5, 70], [-5, 68]] },
      { id: 'v2', type: 'guard', x: 15, z: 93, y: 0, patrol: [[15, 93], [18, 90]] },
      { id: 'v3', type: 'sniper', x: -16.5, z: 90, y: 3.6 },
      { id: 'v4', type: 'patrol', x: 6, z: 104, y: 0, patrol: [[6, 104], [-6, 108], [-6, 97]] },
    ],
    update(t, dt) {
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

// ---- helikopter ----
export function makeHeli() {
  const g = new THREE.Group();
  const body = L(0x7a8468), dark = L(0x3a3f46), glass = new THREE.MeshLambertMaterial({ color: 0x6aa0d8, emissive: 0x16304a, flatShading: true });
  const add = (w, h, d, m, x, y, z, p = g) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    me.position.set(x, y, z);
    me.castShadow = true;
    p.add(me);
    return me;
  };
  add(2.0, 1.7, 4.6, body, 0, 0, 0);
  add(1.6, 0.8, 1.5, glass, 0, 0.3, -2.5);
  add(1.2, 1.1, 1.8, body, 0, 0.1, -2.1);
  add(0.5, 0.5, 4.8, body, 0, 0.35, 4.4);
  add(0.14, 1.5, 0.9, body, 0, 1.0, 6.6);
  add(2.4, 0.18, 0.18, dark, 0, -1.15, -0.4);
  add(2.4, 0.18, 0.18, dark, 0, -1.15, 1.4);
  for (const s of [-1, 1]) {
    add(0.14, 0.14, 4.6, dark, s * 1.25, -1.3, 0.4);
    add(0.14, 0.5, 0.14, dark, s * 1.25, -1.05, -0.4);
    add(0.14, 0.5, 0.14, dark, s * 1.25, -1.05, 1.4);
  }
  add(1.8, 0.5, 2.2, dark, 0, 1.1, 0.4);
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.55, 0.4);
  add(0.4, 0.2, 0.4, dark, 0, 0, 0, rotor);
  add(11, 0.05, 0.4, dark, 0, 0.05, 0, rotor);
  add(0.4, 0.05, 11, dark, 0, 0.05, 0, rotor);
  g.add(rotor);
  const tail = new THREE.Group();
  tail.position.set(0.3, 1.0, 6.6);
  add(0.05, 2.2, 0.25, dark, 0, 0, 0, tail);
  g.add(tail);
  const lampM = new THREE.Mesh(new THREE.ConeGeometry(4.2, 16, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  lampM.position.set(0, -8.6, -1.4);
  lampM.rotation.x = 0.0;
  g.add(lampM);
  const redL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
  redL.position.set(0, 1.9, 6.7);
  g.add(redL);
  g.userData = { rotor, tail, lampM, redL };
  return g;
}
