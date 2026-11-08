import * as THREE from 'three';
import { T, tiledBox } from './tex.js';

// "Yüksek Güvenlikli Cezaevi: isyan, rehine gardiyanlar
const rnd = (a, b) => a + Math.random() * (b - a);
const L = (c, o) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
function facade(hex, lit, cols, rows) {
  const side = new THREE.MeshLambertMaterial({ map: T.facade(hex, lit, cols, rows), emissiveMap: T.facadeEmit(lit, cols, rows), emissive: 0xffffff, flatShading: true });
  const roof = new THREE.MeshLambertMaterial({ map: T.concrete(), color: 0x7a8090 });
  return [side, side, roof, roof, side, side];
}

export function buildPrison(scene) {
  const BOUND = { x: 60, z0: -22, z1: 126 };
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
  flat(0, 98, 40, 56, T.asphalt(), 10, 14, 0xa0a8c0);
  flat(0, 24, 76, 92, T.paver(), 19, 23, 0x8a92a8, 0.012);
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

  // ---- CEZAEVİ ----
  const FH = 4.2, WH = 6;
  const wm = facade(0x9a9ca4, 0, 1, 1), cb = facade(0x8c8e98, 3, 1, 1), inner = facade(0xb8b8b0, 0, 1, 1);
  // çevre duvarı (kapı güney z=66, x=0)
  wallSeg('x', 66, -38, 38, 0, WH, [{ a: 0, w: 6 }], concreteM, 1.0, 4.5);
  wallSeg('x', -14, -38, 38, 0, WH, [], concreteM, 1.0);
  wallSeg('z', -38, -14, 66, 0, WH, [], concreteM, 1.0);
  wallSeg('z', 38, -14, 66, 0, WH, [], concreteM, 1.0);
  // gözetleme kuleleri
  const tower = (x, z) => { B(x, z, 4, 4, 9, concreteM, { tx: 2, ty: 4 }); B(x, z, 4.6, 4.6, 0.4, concreteM, { y0: 9 }); B(x, z - 2.2, 4.6, 0.3, 1.0, concreteM, { y0: 9.4, collide: false }); lampHead(x, 9.9, z, 0xffe0a0, 8); pl(x, 11, z, 0xffe0a0, 30, 22); };
  for (const [x, z] of [[-36, 64], [36, 64], [-36, -12], [36, -12]]) tower(x, z);
  // giriş kapısı binası
  B(-6.5, 66, 7, 6, FH, cb, { tx: 3 }); B(6.5, 66, 7, 6, FH, cb, { tx: 3 });
  // ----- hücre bloğu (batı) x -32..-8, z 4..44, 2 kat -----
  const CX0 = -32, CX1 = -8, CZ0 = 4, CZ1 = 44;
  for (let fl = 0; fl < 2; fl++) {
    const y0 = fl * FH;
    wallSeg('x', CZ1, CX0, CX1, y0, FH, fl === 0 ? [{ a: -20, w: 3 }] : [], cb);
    wallSeg('x', CZ0, CX0, CX1, y0, FH, [], cb);
    wallSeg('z', CX0, CZ0, CZ1, y0, FH, [], cb);
    wallSeg('z', CX1, CZ0, CZ1, y0, FH, fl === 0 ? [{ a: 36, w: 3 }, { a: 14, w: 3 }] : [], cb);
  }
  // hücre sıraları (iç bölme duvarları, koridor ortada)
  for (let fl = 0; fl < 2; fl++) {
    const y0 = fl * FH;
    wallSeg('z', -25, CZ0, CZ1 - 6, y0, FH, [{ a: 10, w: 2.2 }, { a: 17, w: 2.2 }, { a: 24, w: 2.2 }, { a: 31, w: 2.2 }], inner, 0.35, 2.5);
    wallSeg('z', -15, CZ0, CZ1 - 6, y0, FH, [{ a: 10, w: 2.2 }, { a: 17, w: 2.2 }, { a: 24, w: 2.2 }, { a: 31, w: 2.2 }], inner, 0.35, 2.5);
    for (const z of [13.5, 20.5, 27.5]) { B(-28.6, z, 6.6, 0.3, FH, inner, { y0, collide: true, tx: 2 }); B(-11.4, z, 6.6, 0.3, FH, inner, { y0, tx: 2 }); }
  }
  // 2. kat döşemesi: merdiven deliği x -20..-15 (koridor), z 30..40 → merdiven burada kuzey→güney değil; basit: koridor güney ucundan çık
  const slab = (x0, x1, z0, z1, y0, h, m = slabM) => B((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, h, m, { y0, tx: 4 });
  slab(CX0 + 0.3, CX1 - 0.3, CZ0 + 0.3, 30, FH - 0.35, 0.35);
  slab(CX0 + 0.3, -20, 30, CZ1 - 0.3, FH - 0.35, 0.35); slab(-15, CX1 - 0.3, 30, CZ1 - 0.3, FH - 0.35, 0.35);
  slab(-20, -15, CZ1 - 3, CZ1 - 0.3, FH - 0.35, 0.35);
  // merdiven: koridor (x -20..-15) içinde, z 41 → 31 boyunca kuzeyden güneye düşmesin; yükselir z=41 → z=31 (güneye)? kullanıcı güneyden girer: alt z=41 giriş, üst z=31
  for (let i = 0; i < 21; i++) B(-17.5, 41 - (i + 0.5) * 0.5, 4.6, 0.5, 0.2 * (i + 1), concreteM, { tx: 3 });
  slab(CX0 + 0.3, CX1 - 0.3, CZ0 + 0.3, CZ1 - 0.3, 2 * FH, 0.4);
  B(0, 0, 0.01, 0.01, 0.01, concreteM, { collide: false });
  for (const z of [10, 17, 24, 31]) for (const fl of [0, 1]) { lampHead(-20, fl * FH + FH - 0.3, z + 2, 0xffe0b0, 4); }
  for (const z of [12, 26, 38]) { pl(-20, 3.4, z, 0xffe8c0, 24, 14); pl(-20, FH + 3.4, z, 0xffe8c0, 24, 14); }
  // ----- idari bina (doğu) x 8..32, z 28..56, 1 kat -----
  wallSeg('x', 56, 8, 32, 0, FH, [{ a: 20, w: 3 }], wm); wallSeg('x', 28, 8, 32, 0, FH, [{ a: 14, w: 3 }], wm);
  wallSeg('z', 8, 28, 56, 0, FH, [{ a: 42, w: 3 }], wm); wallSeg('z', 32, 28, 56, 0, FH, [], wm);
  wallSeg('x', 42, 8.3, 31.7, 0, FH, [{ a: 14, w: 2.6 }, { a: 26, w: 2.6 }], inner, 0.4);
  slab(8.3, 31.7, 28.3, 55.7, FH, 0.4);
  for (const [x, z] of [[14, 36], [26, 36], [20, 50], [28, 48]]) B(x, z, 2.4, 1.1, 0.85, L(0x4a3a2c), { tx: 2 });
  for (const [x, z] of [[18, 32], [14, 48], [26, 52]]) pl(x, 3.4, z, 0xffe8c0, 26, 14);
  // revir: tıbbi kutular, silah dolabı
  B(30, 30, 1.2, 1.2, 1.8, L(0x5a626c), { tx: 2 });
  // avlu: basket sahası çiti, bariyer, kasalar, spot ışıkları
  for (const [x, z] of [[2, 50], [-4, 20], [16, 14], [-2, 34], [14, 62], [-12, 56]]) crate(x, z, 1.3);
  for (const [x, z] of [[0, 8], [8, 18], [-6, 50]]) barrier(x, z, 3, 0.7);
  for (const [x, z] of [[-4, 60], [4, 60], [-4, 0], [4, 0], [10, 20], [0, 28], [-4, 40], [12, 12]]) post(x, z, 0xfff0c0, 12);
  car(-10, 80, 0x1c2a52, true, true); car(8, 84, 0x1c2a52, false, true); car(-18, 92, 0x1c2a52, true, true); barrier(14, 78, 3, 0.7); sandbags(-3, 74, 3, 0.9);
  const nb = (x, z, bw, bd, bh) => B(x, z, bw, bd, bh, facade(0x8e94a6, 2, 3, 6), { tx: 8, ty: bh });
  nb(-50, 50, 12, 20, 18); nb(50, 40, 12, 20, 22);

  const PAD = { x: 18, z: 8, r: 6 };
  const pad = new THREE.Mesh(new THREE.CircleGeometry(PAD.r, 32), new THREE.MeshLambertMaterial({ map: T.pad() })); pad.rotation.x = -Math.PI / 2; pad.position.set(PAD.x, 0.04, PAD.z); pad.receiveShadow = true; w.add(pad);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xff8a30 })); m.position.set(PAD.x + Math.cos(a) * (PAD.r + 0.5), 0.06, PAD.z + Math.sin(a) * (PAD.r + 0.5)); w.add(m); }
  const padLight = new THREE.PointLight(0x9ac0ff, 0, 30, 2); padLight.position.set(PAD.x, 4, PAD.z); w.add(padLight);
  const pineM = L(0x1c3a34), trunkM = L(0x3a2c20);
  for (let i = 0; i < 26; i++) { const x = (i % 2 ? 1 : -1) * rnd(44, 58), z = rnd(70, 122), s = rnd(0.9, 1.6); const t = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 1.4 * s, 0.4 * s), trunkM); t.position.set(x, 0.7 * s, z); const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.8 * s, 3 * s, 6), pineM); c1.position.set(x, 2.6 * s, z); w.add(t, c1); }

  const pickups = [];
  const pickup = (x, z, kind, y = 0) => {
    const g = new THREE.Group(), c = kind === 'med' ? 0xf4f4f0 : 0x6a7a3a;
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.4), L(c)), { castShadow: true }));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: kind === 'med' ? 0xe5483a : 0xf2c230 })));
    if (kind === 'med') g.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), new THREE.MeshBasicMaterial({ color: 0xe5483a })));
    g.add(glowSp(kind === 'med' ? 0x80ff9a : 0xffe070, 2.4, 0, 0.2, 0, 0.55)); g.position.set(x, y + 0.6, z); w.add(g); pickups.push({ x, z, kind, mesh: g, taken: false });
  };
  pickup(0, 80, 'ammo'); pickup(-10, 62, 'med'); pickup(10, 50, 'ammo'); pickup(20, 33, 'med'); pickup(-20, 8, 'ammo'); pickup(30, 54, 'ammo'); pickup(-20, 36, 'med'); pickup(-17, 8, 'ammo', FH); pickup(2, 16, 'med');

  const rects = colliders.filter((c) => c.y1 - c.y0 > 0.85 && c.y0 < 1 && (c.x1 - c.x0) * (c.z1 - c.z0) > 0.8);
  return {
    id: 'hapis', group: w, colliders, rects, bound: BOUND,
    ground: [{ r: [-20, 66, 20, 124], fill: '#1d2740' }, { r: [-38, -14, 38, 66], fill: '#222d4a', stroke: '#34456e' }],
    fog: { color: 0x151c36, near: 30, far: 210 }, hemi: { sky: 0x8090d8, ground: 0x3a3a50, k: 2.4 }, sunCfg: { color: 0x9ab4ff, k: 2.0 },
    gate: { x: 0, z: 72, test: (p) => p.z < 68 },
    objText: { enter: 'Cezaevine sız', brief: 'Yüksek güvenlikli cezaevinde isyan çıktı. Mahkumlar 3 gardiyanı rehin aldı. Ana kapıdan gir, avluyu geç, hücre bloğunu (2 kat) ve idari binayı temizle, rehineleri çıkar, avludaki pistten helikopterle ayrıl. Kulelerde nişancılar var.', start1: 'Merkez: Ana kapı önündesiniz. Rehineler hücre bloğunda ve idari binada.', start2: 'Merkez: Kulelerde nişancılar var, avluda açıkta kalmayın.', ready: 'Merkez: Helikopter avluya iniyor!' },
    PAD, padLight, lights, SUN, spawn: { x: 0, z: 120 }, pickups,
    hostageSpots: [{ x: -28.4, z: 17, yaw: 0.5 }, { x: -11.6, z: 24, yaw: 3.3, y: FH }, { x: 20, z: 50, yaw: 0.2 }],
    enemySpots: [
      { id: 'g1', type: 'guard', x: -4, z: 60, y: 0, patrol: [[-4, 60], [4, 58]] },
      { id: 'g2', type: 'guard', x: 12, z: 60, y: 0 },
      { id: 't1', type: 'sniper', x: -36, z: 64, y: 9.4 }, { id: 't2', type: 'sniper', x: 36, z: 64, y: 9.4 },
      { id: 't3', type: 'sniper', x: -36, z: -12, y: 9.4 }, { id: 't4', type: 'sniper', x: 36, z: -12, y: 9.4 },
      { id: 'y1', type: 'patrol', x: 0, z: 40, y: 0, patrol: [[0, 40], [4, 26], [-2, 10], [2, 30]] },
      { id: 'y2', type: 'patrol', x: 10, z: 12, y: 0, patrol: [[10, 12], [-2, 6], [-4, 24]] },
      { id: 'y3', type: 'guard', x: 2, z: 6, y: 0 },
      { id: 'c1', type: 'guard', x: -20, z: 40, y: 0, patrol: [[-20, 40], [-20, 32]] },
      { id: 'c2', type: 'guard', x: -20, z: 22, y: 0, patrol: [[-20, 22], [-20, 10]] },
      { id: 'c3', type: 'guard', x: -26.5, z: 17, y: 0 }, { id: 'c4', type: 'guard', x: -13.5, z: 31, y: 0 },
      { id: 'u1', type: 'guard', x: -20, z: 36, y: FH, patrol: [[-20, 36], [-20, 24]] },
      { id: 'u2', type: 'patrol', x: -20, z: 12, y: FH, patrol: [[-20, 12], [-20, 28]] },
      { id: 'u3', type: 'guard', x: -26.5, z: 24, y: FH }, { id: 'u4', type: 'guard', x: -13.5, z: 17, y: FH },
      { id: 'a1', type: 'guard', x: 14, z: 36, y: 0 }, { id: 'a2', type: 'guard', x: 26, z: 36, y: 0, patrol: [[26, 36], [26, 48]] },
      { id: 'a3', type: 'guard', x: 18, z: 50, y: 0 }, { id: 'a4', type: 'patrol', x: 14, z: 48, y: 0, patrol: [[14, 48], [28, 48], [28, 34]] },
    ],
    update(t) {
      for (const g of glows) g.scale.setScalar(g.userData.base * (1 + Math.sin(t * 3 + g.userData.ph) * 0.04));
      const on = Math.floor(t * 4) % 2 === 0;
      for (const [a, b] of flashers) { a.visible = on; b.visible = !on; }
    },
  };
}
