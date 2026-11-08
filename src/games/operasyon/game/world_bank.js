import * as THREE from 'three';
import { T, tiledBox } from './tex.js';

// "Şehir Merkez Bankası": gece, çok katlı banka, arka otopark ve çatı. Polis çevreyi sarmış, içeri sen giriyorsun.
const rnd = (a, b) => a + Math.random() * (b - a);
const L = (c, o) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
function facade(hex, lit, cols, rows) {
  const side = new THREE.MeshLambertMaterial({ map: T.facade(hex, lit, cols, rows), emissiveMap: T.facadeEmit(lit, cols, rows), emissive: 0xffffff, flatShading: true });
  const roof = new THREE.MeshLambertMaterial({ map: T.concrete(), color: 0x7a8090 });
  return [side, side, roof, roof, side, side];
}

export function buildBank(scene) {
  const BOUND = { x: 56, z0: -34, z1: 122 };
  const w = new THREE.Group();
  scene.add(w);
  const colliders = [], glows = [], lights = [], flashers = [];

  // ---- gece gökyüzü ----
  const sky = new THREE.SphereGeometry(380, 28, 18), pos = sky.attributes.position, col = new Float32Array(pos.count * 3);
  const stops = [[-1, '#101426'], [0, '#26305a'], [0.25, '#18224a'], [0.7, '#0c1233'], [1, '#060a1e']].map(([t, h]) => [t, new THREE.Color(h)]);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const t = pos.getY(i) / 380; let k = 0; while (k < stops.length - 2 && t > stops[k + 1][0]) k++; const a = stops[k], b = stops[k + 1]; tmp.copy(a[1]).lerp(b[1], Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])))); col.set([tmp.r, tmp.g, tmp.b], i * 3); }
  sky.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const skyM = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); skyM.renderOrder = -10; w.add(skyM);
  const SUN = new THREE.Vector3(-0.4, 0.6, -0.65).normalize();
  const glowSp = (c, s, x, y, z, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow(), color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: op })); sp.scale.set(s, s, 1); sp.position.set(x, y, z); return sp; };
  const moon = new THREE.Mesh(new THREE.CircleGeometry(13, 20), new THREE.MeshBasicMaterial({ color: 0xf2f4ff, fog: false })); moon.position.set(SUN.x * 330, SUN.y * 330, SUN.z * 330); moon.lookAt(0, 0, 0); w.add(moon);
  w.add(glowSp(0x7a96e0, 140, SUN.x * 328, SUN.y * 328, SUN.z * 328, 0.5));
  const starG = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 360; i++) { const a = Math.random() * 6.28, y = 0.12 + Math.random() * 0.88, r = Math.sqrt(1 - y * y); sp.push(Math.cos(a) * r * 360, y * 360, Math.sin(a) * r * 360); }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  w.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, fog: false, transparent: true, opacity: 0.85, sizeAttenuation: false })));

  // ---- zemin ----
  const gtex = (t, rx, ry = rx) => { const x = t.clone(); x.needsUpdate = true; x.repeat.set(rx, ry); return x; };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ map: gtex(T.dirt(), 125), color: 0x6f7690 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; w.add(ground);
  const flat = (cx, cz, fw, fd, tex, rx, ry, c = 0xffffff, y = 0.01) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshLambertMaterial({ map: gtex(tex, rx, ry), color: c })); m.rotation.x = -Math.PI / 2; m.position.set(cx, y, cz); m.receiveShadow = true; w.add(m); };
  flat(0, 90, 60, 60, T.asphalt(), 15, 15, 0xa0a8c0);          // cadde
  flat(0, 56, 70, 28, T.paver(), 18, 8, 0x9aa2bc, 0.012);       // meydan
  flat(21, 20, 12, 70, T.paver(), 3, 18, 0x9aa2bc, 0.012);      // yan geçit
  flat(0, -8, 46, 40, T.asphalt(), 12, 10, 0x8c94ac, 0.012);   // arka otopark
  for (let z = 70; z < 120; z += 8) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 4), new THREE.MeshBasicMaterial({ color: 0xcfcf9a })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.03, z); w.add(m); }

  const B = (x, z, bw, bd, bh, m, o = {}) => {
    const { y0 = 0, collide = true, tx = 4, ty = tx, cast = true, recv = true } = o;
    const me = new THREE.Mesh(tiledBox(bw, bh, bd, tx, ty), m); me.position.set(x, y0 + bh / 2, z); me.castShadow = cast; me.receiveShadow = recv; w.add(me);
    if (collide) colliders.push({ x0: x - bw / 2, x1: x + bw / 2, z0: z - bd / 2, z1: z + bd / 2, y0, y1: y0 + bh });
    return me;
  };
  const concreteM = new THREE.MeshLambertMaterial({ map: T.concrete(), color: 0xaab0c4, flatShading: true });
  const crateM = new THREE.MeshLambertMaterial({ map: T.crate(), flatShading: true });
  const brickM = new THREE.MeshLambertMaterial({ map: T.brick(), color: 0x9aa0b4, flatShading: true });
  const floorM = new THREE.MeshLambertMaterial({ map: T.paver(), color: 0xb8b2a4 });
  const slabM = new THREE.MeshLambertMaterial({ map: T.concrete(), color: 0x8a8498 });
  const lampHead = (x, y, z, c = 0xffc068, s = 7) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.32), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); w.add(m); const g = glowSp(c, s, x, y - 0.1, z, 0.75); g.userData.base = s; g.userData.ph = Math.random() * 6; w.add(g); glows.push(g); };
  const post = (x, z, c = 0xffd8a0, s = 9) => { B(x, z, 0.16, 0.16, 4.6, L(0x2b2d33), { collide: false }); lampHead(x, 4.7, z, c, s); };
  const pl = (x, y, z, c, k, d) => { const li = new THREE.PointLight(c, k, d, 2); li.position.set(x, y, z); w.add(li); lights.push(li); };
  const crate = (x, z, s = 1.2, y0 = 0) => B(x, z, s, s, s, crateM, { y0, tx: s });
  const barrier = (x, z, bw = 2.4, bd = 0.7) => B(x, z, bw, bd, 0.95, concreteM, { tx: 1.5 });
  const car = (x, z, c, rot = false, police = false) => {
    const bw = rot ? 4.2 : 1.9, bd = rot ? 1.9 : 4.2; B(x, z, bw, bd, 0.85, L(c), { y0: 0.4 }); B(x, z, rot ? 2.2 : 1.7, rot ? 1.7 : 2.2, 0.75, L(0x2a3446), { y0: 1.25 });
    if (police) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2a2a })), b = a.clone(); b.material = new THREE.MeshBasicMaterial({ color: 0x2a5aff }); const o = rot ? 0.5 : 0; a.position.set(x - (rot ? 0.5 : 0.4), 2.1, z - (rot ? 0 : 0)); b.position.set(x + (rot ? 0.5 : 0.4), 2.1, z); w.add(a, b); flashers.push([a, b]); }
  };
  const sandbags = (x, z, bw, bd) => { B(x, z, bw, bd, 0.5, L(0x8e8a72), { tx: 4 }); B(x, z, bw * 0.8, bd * 0.8, 0.5, L(0x80795f), { y0: 0.5, tx: 4 }); };

  // duvar parçası (kapı boşluklu): axis 'x' → duvar x boyunca uzanır (z sabit)
  const wallSeg = (axis, c, a0, a1, y0, h, gaps, m, t = 0.5, dh = 2.7) => {
    const put = (p0, p1, yy, hh) => { if (p1 - p0 < 0.05 || hh < 0.05) return; const mid = (p0 + p1) / 2, len = p1 - p0; if (axis === 'x') B(mid, c, len, t, hh, m, { y0: yy, tx: 4, ty: Math.max(hh, 1) }); else B(c, mid, t, len, hh, m, { y0: yy, tx: 4, ty: Math.max(hh, 1) }); };
    let cur = a0; for (const g of [...gaps].sort((a, b) => a.a - b.a)) { put(cur, g.a - g.w / 2, y0, h); put(g.a - g.w / 2, g.a + g.w / 2, y0 + dh, h - dh); cur = g.a + g.w / 2; } put(cur, a1, y0, h);
  };

  // ---- BANKA ----
  const BX0 = -15, BX1 = 15, BZ0 = 18, BZ1 = 42, FH = 4.2;
  const bm = facade(0xc2c4cc, 3, 1, 1), bmu = facade(0xb8bcc6, 3, 1, 1), inner = facade(0xcfc8b8, 0, 1, 1);
  for (let fl = 0; fl < 2; fl++) {
    const y0 = fl * FH, m = fl ? bmu : bm;
    wallSeg('x', BZ1, BX0, BX1, y0, FH, fl === 0 ? [{ a: 0, w: 4 }] : [], m);                     // ön (güney)
    wallSeg('x', BZ0, BX0, BX1, y0, FH, fl === 0 ? [{ a: 0, w: 3 }] : [], m);                      // arka (kuzey)
    wallSeg('z', BX0, BZ0, BZ1, y0, FH, [], m);                                                    // batı
    wallSeg('z', BX1, BZ0, BZ1, y0, FH, fl === 0 ? [{ a: 30, w: 2.6 }] : [], m);                    // doğu (yan kapı)
  }
  // lobi / arka bölme + 2. kat bölmeleri
  wallSeg('x', 30, -9.2, BX1 - 0.3, 0, FH, [{ a: -2, w: 2.8 }, { a: 8, w: 2.8 }], inner, 0.4);
  wallSeg('x', 28, -9.2, BX1 - 0.3, FH, FH, [{ a: -2, w: 2.6 }, { a: 9, w: 2.6 }], inner, 0.4);
  wallSeg('z', 4, 18.3, 28, FH, FH, [{ a: 23, w: 2.4 }], inner, 0.4);
  // kat döşemeleri (merdiven boşluğu batıda, z 19..30)
  const slab = (x0, x1, z0, z1, y0, h, m = slabM) => B((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, h, m, { y0, tx: 4 });
  slab(-14.7, -9.4, 30, BZ1 - 0.3, FH - 0.35, 0.35); slab(-14.7, -9.4, BZ0 + 0.3, 19.5, FH - 0.35, 0.35); slab(-9.4, BX1 - 0.3, BZ0 + 0.3, BZ1 - 0.3, FH - 0.35, 0.35);
  // (boşluk: x −14.7..−9.4 arası ön tarafta (z>30) kapalı, arka tarafta (z<30) açık)
  // basamaklar: 21 × 0.2 m, lobiden (z=30) kuzeye yükselir, üstte z 18..19.5 sahanlık
  for (let i = 0; i < 21; i++) B(-12.05, 30 - (i + 0.5) * 0.5, 5.3, 0.5, 0.2 * (i + 1), concreteM, { tx: 3 });
  slab(BX0 + 0.3, BX1 - 0.3, BZ0 + 0.3, BZ1 - 0.3, 2 * FH, 0.4);                                   // çatı
  // çatı korkuluğu
  B(0, BZ1 - 0.2, 30, 0.4, 1.0, concreteM, { y0: 2 * FH + 0.4 }); B(0, BZ0 + 0.2, 30, 0.4, 1.0, concreteM, { y0: 2 * FH + 0.4 });
  B(BX0 + 0.2, 30, 0.4, 24, 1.0, concreteM, { y0: 2 * FH + 0.4 }); B(BX1 - 0.2, 30, 0.4, 24, 1.0, concreteM, { y0: 2 * FH + 0.4 });
  // zemin döşeme görseli
  const fm = new THREE.Mesh(new THREE.PlaneGeometry(29, 23), floorM); fm.rotation.x = -Math.PI / 2; fm.position.set(0, 0.02, 30); fm.receiveShadow = true; w.add(fm);
  // pano: banka tabelası
  const sign = new THREE.Mesh(new THREE.BoxGeometry(12, 1.4, 0.3), new THREE.MeshBasicMaterial({ color: 0x40b0ff })); sign.position.set(0, FH - 0.7, BZ1 + 0.3); w.add(sign); w.add(glowSp(0x40b0ff, 18, 0, FH - 0.7, BZ1 + 0.8, 0.5));
  // sütunlar (lobi), sayaçlar
  for (const [x, z] of [[-6, 36], [6, 36], [-6, 33], [6, 33]]) B(x, z, 0.9, 0.9, FH - 0.35, concreteM, { tx: 2 });
  for (const x of [-11, -7.5, 7.5, 11]) B(x, 39.2, 3, 1, 1.1, L(0x6a4a30), { tx: 2 });
  B(-12, 33, 3.2, 0.9, 0.9, L(0x4a3a2c), { tx: 2 }); B(12, 34, 3.2, 0.9, 0.9, L(0x4a3a2c), { tx: 2 });
  crate(-12, 21, 1.3); crate(-10.6, 21.2, 1.1); crate(12, 21, 1.3); crate(12, 23, 1.1);
  for (const [x, z] of [[8, 24], [-4, 24], [3, 21]]) B(x, z, 2.2, 1.0, 0.8, L(0x5a4630), { tx: 2 });                  // masalar
  for (const [x, z] of [[-6, 34], [8, 36], [-8, 24], [8, 22]]) pl(x, 3.4, z, 0xffe8c0, 38, 18);
  pl(-6, FH + 3.4, 36, 0xffe8c0, 34, 18); pl(8, FH + 3.4, 36, 0xffe8c0, 34, 18); pl(-4, FH + 3.4, 22, 0xffe8c0, 30, 16); pl(10, FH + 3.4, 22, 0xffd8a0, 30, 14);
  for (const [x, z] of [[-9, 37], [9, 37], [-8, 25], [8, 25]]) lampHead(x, FH - 0.4, z, 0xffe6b8, 5);
  for (const [x, z] of [[-9, 37], [9, 37], [-8, 25], [8, 25]]) lampHead(x, 2 * FH - 0.4 - FH, z, 0xffe6b8, 5);
  // yönetici ofisi (2. kat KD köşe): masa + kasa
  B(10, 22, 2.8, 1.2, 0.9, L(0x4a3a2c), { y0: FH, tx: 2 }); B(12.2, 19.8, 1.2, 1.2, 1.8, L(0x5a626c), { y0: FH, tx: 2 });
  // kasa dairesi (zemin kat, arka)
  B(0, 19.4, 8, 0.6, FH - 0.4, L(0x8a929c), { tx: 3 });

  // ---- çevre: meydan, polis, komşu binalar ----
  const nb = (x, z, bw, bd, bh, hex, lit) => { B(x, z, bw, bd, bh, facade(hex, lit, 3, 6), { tx: 8, ty: bh }); };
  nb(-34, 30, 18, 22, 30, 0x9a9eae, 4); nb(34, 34, 18, 26, 36, 0x8e94a6, 3); nb(-34, 6, 18, 18, 24, 0xa0988c, 3); nb(34, 4, 18, 20, 20, 0x9a9eae, 4);
  nb(-40, 60, 16, 20, 40, 0x8e94a6, 4); nb(40, 62, 16, 22, 34, 0x9a9eae, 3); nb(-44, -10, 14, 20, 28, 0x9a9eae, 3); nb(44, -12, 14, 22, 32, 0x8e94a6, 4);
  B(0, -33, 56, 1, 4, brickM, { tx: 3, ty: 1 }); B(-28, -12, 1, 44, 4, brickM, { tx: 3, ty: 1 }); B(28, -12, 1, 44, 4, brickM, { tx: 3, ty: 1 });
  // polis hattı
  car(-8, 98, 0x1c2a52, true, true); car(6, 100, 0x1c2a52, true, true); car(-18, 96, 0x1c2a52, false, true); car(16, 96, 0x1c2a52, false, true);
  for (const x of [-12, -2, 11]) barrier(x, 94, 3, 0.7);
  sandbags(0, 92, 3, 0.9);
  for (const [x, z] of [[-24, 62], [24, 62], [-24, 82], [24, 82], [-8, 50], [8, 50], [-30, 102], [30, 102]]) post(x, z, 0xffd8a0, 10);
  for (const [x, z] of [[-6, 84], [6, 78], [-14, 66], [12, 70], [-2, 60], [4, 54]]) crate(x, z, 1.3);
  barrier(-10, 62, 0.7, 2.8); barrier(10, 66, 0.7, 2.8); car(-18, 58, 0x6a6a5a, false); car(17, 68, 0x3a5a7a, false); car(-14, 78, 0x7a6a52, true);
  // yan geçit & arka otopark
  car(-8, -3, 0x39485a, false); car(14, -10, 0x6a2c28, true); car(-14, -20, 0x5a5a62, false); crate(8, 6, 1.4); crate(-4, 8, 1.2); barrier(0, 10, 3.2, 0.7);
  for (const [x, z] of [[-18, 4], [18, 4], [-18, -18], [18, -18], [21, 30], [21, 48]]) post(x, z, 0xffd8a0, 10);

  const PAD = { x: 0, z: -14, r: 6 };
  const pad = new THREE.Mesh(new THREE.CircleGeometry(PAD.r, 32), new THREE.MeshLambertMaterial({ map: T.pad() })); pad.rotation.x = -Math.PI / 2; pad.position.set(PAD.x, 0.04, PAD.z); pad.receiveShadow = true; w.add(pad);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xff8a30 })); m.position.set(PAD.x + Math.cos(a) * (PAD.r + 0.5), 0.06, PAD.z + Math.sin(a) * (PAD.r + 0.5)); w.add(m); }
  const padLight = new THREE.PointLight(0x9ac0ff, 0, 30, 2); padLight.position.set(PAD.x, 4, PAD.z); w.add(padLight);

  // ağaçlar (yol kenarı)
  const pineM = L(0x1c3a34), trunkM = L(0x3a2c20);
  for (let i = 0; i < 30; i++) { const x = (i % 2 ? 1 : -1) * rnd(34, 52), z = rnd(70, 118), s = rnd(0.9, 1.6); const t = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 1.4 * s, 0.4 * s), trunkM); t.position.set(x, 0.7 * s, z); const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.8 * s, 3 * s, 6), pineM); c1.position.set(x, 2.6 * s, z); w.add(t, c1); }

  // ---- kasa/ek eşya toplamaları ----
  const pickups = [];
  const pickup = (x, z, kind, y = 0) => {
    const g = new THREE.Group(), c = kind === 'med' ? 0xf4f4f0 : 0x6a7a3a;
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.4), L(c)), { castShadow: true }));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: kind === 'med' ? 0xe5483a : 0xf2c230 })));
    if (kind === 'med') g.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), new THREE.MeshBasicMaterial({ color: 0xe5483a })));
    g.add(glowSp(kind === 'med' ? 0x80ff9a : 0xffe070, 2.4, 0, 0.2, 0, 0.55)); g.position.set(x, y + 0.6, z); w.add(g); pickups.push({ x, z, kind, mesh: g, taken: false });
  };
  pickup(0, 90, 'ammo'); pickup(-10, 62, 'med'); pickup(10, 56, 'ammo'); pickup(21, 40, 'ammo'); pickup(-12, 36, 'med'); pickup(10, 24, 'ammo');
  pickup(-12.5, 22, 'ammo', FH); pickup(12, 36, 'med', FH); pickup(0, 6, 'ammo'); pickup(-10, 32, 'ammo');

  const rects = colliders.filter((c) => c.y1 - c.y0 > 0.85 && c.y0 < 1 && (c.x1 - c.x0) * (c.z1 - c.z0) > 0.8);
  return {
    id: 'banka', group: w, colliders, rects, bound: BOUND,
    ground: [{ r: [-30, 62, 30, 120], fill: '#1d2740' }, { r: [-35, 44, 35, 70], fill: '#222d4a', stroke: '#34456e' }, { r: [15, -20, 27, 44], fill: '#222d4a' }, { r: [-23, -33, 23, 8], fill: '#1d2740' }],
    fog: { color: 0x151c36, near: 28, far: 200 }, hemi: { sky: 0x7080c8, ground: 0x2a2a3c, k: 1.8 }, sunCfg: { color: 0x9ab4ff, k: 1.7 },
    gate: { x: 0, z: 48, test: (p) => p.z < 46 },
    objText: { enter: 'Bankaya sız', brief: 'Silahlı bir grup Şehir Merkez Bankası\'nı bastı ve 3 kişiyi rehin tuttu. Polis çevreyi sardı ama içeri girmeye cesaret edemiyor. Ön kapıdan ya da yan kapıdan gir, lobiyi ve üst katı temizle, rehineleri çıkar, arka otoparktan helikopterle ayrıl.', start1: 'Merkez: Banka önündesiniz. Rehineler lobide ve üst katta.', start2: 'Merkez: Ön kapı ya da doğu yan kapı. Dikkatli olun.', ready: 'Merkez: Helikopter arka otoparka iniyor!' },
    PAD, padLight, lights, SUN, spawn: { x: 0, z: 114 }, pickups,
    hostageSpots: [{ x: -2, z: 36, yaw: 0.3 }, { x: 2, z: 37.5, yaw: 3.4 }, { x: 10, z: 21, yaw: 0.5, y: FH }],
    enemySpots: [
      { id: 'o1', type: 'patrol', x: -6, z: 70, y: 0, patrol: [[-6, 70], [6, 66], [6, 54], [-6, 56]] },
      { id: 'o2', type: 'guard', x: 16, z: 50, y: 0, patrol: [[16, 50], [20, 44]] },
      { id: 'o3', type: 'guard', x: -10, z: 47, y: 0 },
      { id: 'l1', type: 'guard', x: -4, z: 37, y: 0, patrol: [[-4, 37], [-4, 34]] },
      { id: 'l2', type: 'guard', x: 5, z: 36, y: 0, patrol: [[5, 36], [8, 34]] },
      { id: 'l3', type: 'patrol', x: -10, z: 33, y: 0, patrol: [[-10, 33], [10, 33], [10, 38], [-10, 38]] },
      { id: 'b1', type: 'guard', x: -6, z: 23, y: 0, patrol: [[-6, 23], [-2, 26]] },
      { id: 'b2', type: 'guard', x: 8, z: 24, y: 0 },
      { id: 'b3', type: 'patrol', x: 0, z: 24, y: 0, patrol: [[0, 24], [8, 26], [-8, 26]] },
      { id: 'u1', type: 'guard', x: -4, z: 36, y: FH, patrol: [[-4, 36], [6, 36]] },
      { id: 'u2', type: 'guard', x: 9, z: 24, y: FH },
      { id: 'u3', type: 'patrol', x: -8, z: 22, y: FH, patrol: [[-8, 22], [2, 22], [2, 32], [-8, 32]] },
      { id: 'u4', type: 'guard', x: 12, z: 32, y: FH, patrol: [[12, 32], [12, 24]] },
      { id: 'r1', type: 'sniper', x: -12, z: 38, y: 2 * FH + 0.4 },
      { id: 'r2', type: 'guard', x: 6, z: 8, y: 0, patrol: [[6, 8], [-6, 6]] },
      { id: 'r3', type: 'guard', x: 12, z: 12, y: 0 },
    ],
    update(t) {
      for (const g of glows) g.scale.setScalar(g.userData.base * (1 + Math.sin(t * 3 + g.userData.ph) * 0.04));
      const on = Math.floor(t * 4) % 2 === 0;
      for (const [a, b] of flashers) { a.visible = on; b.visible = !on; }
    },
  };
}
