import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// İstanbul 1974: Karaköy rıhtımından Galata Kulesi'ne yokuşlar. Her şey kodla kurulur;
// dokular Poly Haven (CC0). Koordinatlar: x doğu, z güney (+z denize doğru), y yukarı.

// Yürünebilir bölgeler. stairs/ramp: 'axis' boyunca y0'dan y1'e (dir: -1 = z azalırken yükselir)
export const SEGS = [
  { id: 'rihtim', x0: -18, x1: 18, z0: 0, z1: 15, type: 'flat', y0: 0, sea: true, ground: 'pier' },
  { id: 'cadde', x0: -5, x1: 5, z0: -34, z1: 0, type: 'flat', y0: 0, ground: 'cobble' },
  { id: 'yan', x0: -38, x1: 38, z0: -22, z1: -14, type: 'flat', y0: 0, ground: 'asphalt' },
  { id: 'kaldirim', x0: -3.6, x1: 3.6, z0: -74, z1: -34, type: 'stairs', axis: 'z', dir: -1, y0: 0, y1: 11, ground: 'step' },
  { id: 'meydancik', x0: -10, x1: 10, z0: -87, z1: -74, type: 'flat', y0: 11, ground: 'cobble' },
  { id: 'sokak', x0: 10, x1: 40, z0: -84, z1: -76, type: 'ramp', axis: 'x', dir: 1, y0: 11, y1: 15, ground: 'cobble' },
  { id: 'sokakbas', x0: 40, x1: 49, z0: -85, z1: -76, type: 'flat', y0: 15, ground: 'cobble' },
  { id: 'kamondo', x0: 42.5, x1: 48.5, z0: -116, z1: -85, type: 'stairs', axis: 'z', dir: -1, y0: 15, y1: 24, ground: 'step' },
  { id: 'meydan', x0: 28, x1: 68, z0: -150, z1: -116, type: 'flat', y0: 24, ground: 'cobble' },
];
const STEP_H = 0.165;
for (const s of SEGS) {
  if (s.type === 'stairs') {
    s.n = Math.round((s.y1 - s.y0) / STEP_H);
    s.len = s.axis === 'z' ? s.z1 - s.z0 : s.x1 - s.x0;
  }
}

export const SPOTS = {
  pickup: { x: 0, z: 7, yaw: Math.PI }, // rıhtımda yük alınan yer (kahya Reis)
  start: { x: 0, z: 5.2, yaw: 0 },
  bakkal: { x: -8.3, z: -80.5, label: 'Bakkal Hayri' },
  apartman: { x: 25, z: -82.9, label: 'Madam Eleni’nin apartmanı' },
  doktor: { x: 64.8, z: -123.6, label: 'Doktor Nuri Bey' },
  dugun: { x: 29.6, z: -136, label: 'Düğün evi' },
  konak: { x: 52, z: -148.4, label: 'Galata konağı' },
  tower: { x: 48, z: -132, r: 4.6 },
};

function segAt(x, z, pad = 0) {
  let best = null;
  for (const s of SEGS) {
    if (x >= s.x0 - pad && x <= s.x1 + pad && z >= s.z0 - pad && z <= s.z1 + pad) {
      if (!best || segY(s, x, z, true) > segY(best, x, z, true)) best = s;
    }
  }
  return best;
}

// smooth: yürüyüş için kesintisiz; değilse basamaklı (görsel/fizik)
function segY(s, x, z, smooth) {
  if (s.type === 'flat') return s.y0;
  const t =
    s.axis === 'z'
      ? s.dir < 0 ? (s.z1 - z) / (s.z1 - s.z0) : (z - s.z0) / (s.z1 - s.z0)
      : s.dir < 0 ? (s.x1 - x) / (s.x1 - s.x0) : (x - s.x0) / (s.x1 - s.x0);
  const k = THREE.MathUtils.clamp(t, 0, 1);
  if (s.type === 'ramp' || smooth) return s.y0 + (s.y1 - s.y0) * k;
  return s.y0 + Math.min(s.n, Math.floor(k * s.n + 0.0001)) * ((s.y1 - s.y0) / s.n);
}

export function heightAt(x, z, smooth = true) {
  const s = segAt(x, z, 0.05);
  return s ? segY(s, x, z, smooth) : 0;
}

// Basamak indeksi (sarsıntı için): merdivende değilse -1
export function stepIndex(x, z) {
  const s = segAt(x, z, 0.05);
  if (!s || s.type !== 'stairs') return -1;
  const t = s.dir < 0 ? (s.z1 - z) / (s.z1 - s.z0) : (z - s.z0) / (s.z1 - s.z0);
  return Math.floor(THREE.MathUtils.clamp(t, 0, 1) * s.n) + (s.id === 'kamondo' ? 1000 : 0);
}

export function onStairs(x, z) {
  const s = segAt(x, z, 0.05);
  return !!s && s.type === 'stairs';
}

export function slopeAt(x, z, dirx, dirz) {
  const e = 0.6;
  return (heightAt(x + dirx * e, z + dirz * e) - heightAt(x - dirx * e, z - dirz * e)) / (2 * e);
}

export function walkable(x, z, r, obstacles) {
  // nokta ve çevresi bir yürünebilir bölgede olmalı
  const pts = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];
  for (const [dx, dz] of pts) if (!segAt(x + dx, z + dz, 0.02)) return false;
  for (const o of obstacles) {
    if (o.r) {
      if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + r) ** 2) return false;
    } else if (x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return false;
  }
  return true;
}

// ---------- Dokular ----------
function loadTex(loader, id, rep = 1, srgb = true) {
  const t = loader.load(`/hamal/tex/${id}.jpg`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cobbleCanvas(seed = 3) {
  // Yedek: doku inmezse kodla arnavut kaldırımı
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#5a554e';
  x.fillRect(0, 0, 512, 512);
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let j = 0; j < 16; j++)
    for (let i = 0; i < 16; i++) {
      const v = 95 + r() * 45;
      x.fillStyle = `rgb(${v + 8},${v + 2},${v - 6})`;
      x.beginPath();
      x.ellipse(i * 32 + 16 + (j % 2) * 16 + (r() - 0.5) * 4, j * 32 + 16, 13 + r() * 2, 12 + r() * 2, r(), 0, Math.PI * 2);
      x.fill();
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene, R, world, opts = {}) {
  const loader = new THREE.TextureLoader();
  const batches = new Map();
  const obstacles = [];
  const animated = [];
  let seed = 1974;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const T = (id, rep = 1) => {
    const m = new THREE.MeshStandardMaterial({ map: loadTex(loader, id + '_diff', rep), normalMap: loadTex(loader, id + '_nor', rep, false), roughness: 0.92 });
    m.normalScale.set(0.8, 0.8);
    return m;
  };
  const M = {
    cobble: T('cobble'),
    step: T('steps'),
    pier: T('pier'),
    asphalt: T('asphalt'),
    walls: ['plaster_a', 'plaster_b', 'plaster_c', 'plaster_d', 'plaster_e'].map((id) => T(id)),
    brick: T('brick'),
    roof: T('roof'),
    stone: T('stonewall'),
    frame: new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1b2229, roughness: 0.15, metalness: 0.6 }),
    shutters: [0x3c5a3e, 0x6a4a30, 0x4a5f6e, 0x7a3a2a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })),
    wood: new THREE.MeshStandardMaterial({ color: 0x5c3f28, roughness: 0.85 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x1e1d1b, roughness: 0.6, metalness: 0.5 }),
    awnings: [0xa83228, 0x2d6a4f, 0xc9a03a, 0x2f5c8a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide })),
    signs: new THREE.MeshStandardMaterial({ color: 0xede0c0, roughness: 0.8 }),
  };
  // yedek (doku yüklenemezse renk yine de makul olsun)
  M.cobble.color.set(0xd8d2c8);
  const wallTints = [0xf2e2c4, 0xe9c9b0, 0xd8dcd6, 0xf0d8a0, 0xdcb8a0, 0xe8e0d0, 0xc8d0d8, 0xe0c090];

  function batch(mat, geo) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(geo);
  }
  function uvBox(w, h, d, tile) {
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
  function box(mat, w, h, d, x, y, z, { tile = 3, ry = 0, collide = false } = {}) {
    const g = uvBox(w, h, d, tile);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    batch(mat, g);
    if (collide) {
      const c = R.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z).setFriction(0.8);
      if (ry) c.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry));
      world.createCollider(c);
    }
    return g;
  }
  // Renkli, tek renkli malzemeyi tonlamak için: aynı dokuyu farklı renklerle paylaşan malzeme önbelleği
  const tinted = new Map();
  function tint(mat, color) {
    const k = mat.uuid + color;
    if (!tinted.has(k)) {
      const m = mat.clone();
      m.color.set(color);
      tinted.set(k, m);
    }
    return tinted.get(k);
  }

  // ---------- Zemin ve fizik ----------
  for (const s of SEGS) {
    const w = s.x1 - s.x0, d = s.z1 - s.z0, cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
    const gm = M[s.ground] || M.cobble;
    if (s.type === 'flat') {
      box(gm, w, 1, d, cx, s.y0 - 0.5, cz, { tile: 3, collide: true });
    } else if (s.type === 'ramp') {
      // eğimli kutu (x ekseni boyunca)
      const L = Math.hypot(w, s.y1 - s.y0);
      const ang = Math.atan2(s.y1 - s.y0, w);
      const g = uvBox(L, 1, d, 3);
      g.translate(0, -0.5, 0);
      g.rotateZ(ang);
      g.translate(cx, (s.y0 + s.y1) / 2, cz);
      batch(gm, g);
      const c = R.ColliderDesc.cuboid(L / 2, 0.5, d / 2).setFriction(0.9);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang);
      const off = new THREE.Vector3(0, -0.5, 0).applyQuaternion(q);
      c.setTranslation(cx + off.x, (s.y0 + s.y1) / 2 + off.y, cz).setRotation(q);
      world.createCollider(c);
    } else if (s.type === 'stairs') {
      const dy = (s.y1 - s.y0) / s.n, dz = d / s.n;
      // her basamak (z ekseni, yukarı -z)
      for (let i = 0; i < s.n; i++) {
        const zTop = s.z1 - i * dz; // bu basamağın güney kenarı
        const y = s.y0 + (i + 1) * dy;
        const zc = zTop - dz / 2;
        // basamak: üstü y, aşağı kadar dolu (yalnızca bir gövde, aşağısı zaten yamaç)
        box(gm, w, dy + 0.6, dz, cx, y - (dy + 0.6) / 2, zc, { tile: 2 });
        // basamak burnu (taş kenar)
        box(M.stone, w, 0.05, 0.08, cx, y - 0.025, zTop - 0.04, { tile: 2 });
      }
      // fizik: tek bir eğik kutu basamak uçlarından geçer (yükler takılmadan kayar/yuvarlanır)
      const L = Math.hypot(d, s.y1 - s.y0);
      const ang = Math.atan2(s.y1 - s.y0, d);
      const c = R.ColliderDesc.cuboid(w / 2, 0.5, L / 2).setFriction(1.0);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang);
      const off = new THREE.Vector3(0, -0.5 + dy * 0.5, 0).applyQuaternion(q);
      c.setTranslation(cx + off.x, (s.y0 + s.y1) / 2 + off.y, cz + off.z).setRotation(q);
      world.createCollider(c);
      // merdiven yanlarında taş korkuluk duvarı
      for (const side of [-1, 1]) {
        const xx = side < 0 ? s.x0 - 0.15 : s.x1 + 0.15;
        for (let i = 0; i < s.n; i += 6) {
          const zTop = s.z1 - i * dz;
          const seg = Math.min(6, s.n - i) * dz;
          const y = s.y0 + (i + Math.min(6, s.n - i) / 2) * dy;
          box(M.stone, 0.3, 1.1, seg + 0.05, xx, y + 0.1, zTop - seg / 2, { tile: 2 });
        }
      }
    }
  }
  // ---------- Aradaki boşluklar gökyüzü değil, zemin göstersin ----------
  {
    const g = new THREE.PlaneGeometry(400, 300);
    g.rotateX(-Math.PI / 2);
    g.translate(20, -0.25, 15 - 150);
    const m = new THREE.Mesh(g, tint(M.cobble, 0x8a8278));
    m.receiveShadow = true;
    scene.add(m);
  }

  // ---------- Binalar ----------
  const inWalk = (x0, z0, x1, z1) => SEGS.some((s) => x0 < s.x1 - 0.05 && x1 > s.x0 + 0.05 && z0 < s.z1 - 0.05 && z1 > s.z0 + 0.05);
  const facades = [];
  function building(x0, z0, x1, z1, baseY, face) {
    // face: sokağa bakan yüz ('N','S','E','W')
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const floors = 3 + Math.floor(rnd() * 3);
    const fh = 3.1;
    const H = floors * fh + 0.6;
    const wall = tint(pick(M.walls), pick(wallTints));
    const bottom = baseY - 6;
    box(wall, w, H - bottom + baseY, d, cx, (bottom + baseY + H) / 2, cz, { tile: 3.5 });
    // temel taşı
    const along = face === 'N' || face === 'S' ? 'x' : 'z';
    const out = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[face];
    const fx = out[0] > 0 ? x1 : out[0] < 0 ? x0 : cx;
    const fz = out[1] > 0 ? z1 : out[1] < 0 ? z0 : cz;
    const len = along === 'x' ? w : d;
    const put = (mat, ww, hh, dd, a, y, o = 0, opts) => {
      // a: cephe boyunca konum (-len/2..len/2), o: dışarı taşma
      if (along === 'x') box(mat, ww, hh, dd, cx + a, y, fz + out[1] * (dd / 2 + o), opts);
      else box(mat, dd, hh, ww, fx + out[0] * (dd / 2 + o), y, cz + a, opts);
    };
    put(M.stone, len + 0.02, 0.7, 0.06, 0, baseY + 0.35, -0.02);
    // saçak ve kiremit çatı
    put(M.wood, len + 0.3, 0.18, 0.55, 0, baseY + H - 0.1, -0.05);
    box(M.roof, w + 0.4, 1.4, d + 0.4, cx, baseY + H + 0.6, cz, { tile: 2 });
    // pencereler
    const shut = pick(M.shutters);
    const nWin = Math.max(1, Math.floor((len - 0.8) / 1.7));
    const cumba = len > 5 && rnd() < 0.45;
    for (let f = 1; f < floors; f++) {
      const y = baseY + f * fh + 1.35;
      for (let i = 0; i < nWin; i++) {
        const a = -len / 2 + (len / nWin) * (i + 0.5);
        if (cumba && f >= 1 && Math.abs(a) < 1.6) continue;
        put(M.frame, 0.95, 1.55, 0.06, a, y, -0.01);
        put(M.glass, 0.78, 1.38, 0.06, a, y, 0.0);
        if (rnd() < 0.7) {
          put(shut, 0.4, 1.45, 0.04, a - 0.62, y, 0.02);
          put(shut, 0.4, 1.45, 0.04, a + 0.62, y, 0.02);
        }
        put(M.frame, 1.1, 0.08, 0.18, a, y - 0.82, 0.0);
      }
      // balkon (bazı katlarda)
      if (!cumba && f === 1 && rnd() < 0.35) {
        const a = (rnd() - 0.5) * (len - 2.5);
        put(M.stone, 2.2, 0.14, 0.9, a, baseY + f * fh + 0.45, 0);
        for (let k = -1; k <= 1; k += 0.25) put(M.iron, 0.03, 0.9, 0.03, a + k, baseY + f * fh + 0.95, 0.85);
        put(M.iron, 2.2, 0.04, 0.04, a, baseY + f * fh + 1.4, 0.85);
      }
    }
    if (cumba) {
      // ahşap cumba: birinci kattan itibaren dışarı taşan pencereli kutu
      const cf = Math.min(floors - 1, 2);
      const cw = tint(M.walls[0], pick([0xd8c8a8, 0xb89070, 0xe8dcc0]));
      put(cw, 3.2, cf * fh - 0.2, 0.75, 0, baseY + fh + (cf * fh) / 2 + 0.1, 0);
      for (let f = 0; f < cf; f++) {
        const y = baseY + fh + f * fh + 1.5;
        for (const a of [-0.9, 0, 0.9]) {
          put(M.frame, 0.75, 1.3, 0.04, a, y, 0.75);
          put(M.glass, 0.6, 1.15, 0.04, a, y, 0.76);
        }
      }
      put(M.wood, 3.4, 0.12, 0.9, 0, baseY + fh + 0.05, 0);
    }
    // zemin kat: dükkân ya da kapı
    if (rnd() < 0.55 && len > 3.4) {
      const sw = Math.min(len - 1, 3.2);
      put(M.glass, sw, 2.2, 0.06, 0, baseY + 1.5, 0);
      put(M.wood, sw + 0.2, 0.12, 0.1, 0, baseY + 2.65, 0.02);
      put(M.signs, sw, 0.5, 0.06, 0, baseY + 3.0, 0.02);
      // tente
      const aw = pick(M.awnings);
      const g = new THREE.PlaneGeometry(sw + 0.3, 1.2);
      g.rotateX(-Math.PI / 2 + 0.45);
      if (along === 'x') {
        if (out[1] < 0) g.rotateY(Math.PI);
        g.translate(cx, baseY + 2.9, fz + out[1] * 0.55);
      } else {
        g.rotateY(out[0] > 0 ? Math.PI / 2 : -Math.PI / 2);
        g.translate(fx + out[0] * 0.55, baseY + 2.9, cz);
      }
      batch(aw, g);
    } else {
      const a = (rnd() - 0.5) * Math.max(0, len - 2);
      put(M.wood, 1.1, 2.2, 0.08, a, baseY + 1.1, 0);
      put(M.stone, 1.4, 0.18, 0.4, a, baseY + 0.09, 0);
    }
    // yan cepheler: köşelerde boş duvar kalmasın diye üst katlarda pencere
    const sides = along === 'x' ? ['E', 'W'] : ['N', 'S'];
    for (const sf of sides) {
      const o2 = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[sf];
      const al2 = sf === 'N' || sf === 'S' ? 'x' : 'z';
      const len2 = al2 === 'x' ? w : d;
      const f2x = o2[0] > 0 ? x1 : o2[0] < 0 ? x0 : cx, f2z = o2[1] > 0 ? z1 : o2[1] < 0 ? z0 : cz;
      // yalnızca sokağa açılan yan cephe (önünde yürünebilir alan varsa)
      const px = f2x + o2[0] * 1.5, pz = f2z + o2[1] * 1.5;
      if (!segAt(px, pz, 0)) continue;
      const put2 = (mat, ww, hh, dd, a2, y, o = 0) => {
        if (al2 === 'x') box(mat, ww, hh, dd, cx + a2, y, f2z + o2[1] * (dd / 2 + o));
        else box(mat, dd, hh, ww, f2x + o2[0] * (dd / 2 + o), y, cz + a2);
      };
      const n2 = Math.max(1, Math.floor((len2 - 1.2) / 2.2));
      for (let f = 1; f < floors; f++) {
        const y = baseY + f * fh + 1.35;
        for (let i = 0; i < n2; i++) {
          const a2 = -len2 / 2 + (len2 / n2) * (i + 0.5);
          put2(M.frame, 0.95, 1.55, 0.06, a2, y, -0.01);
          put2(M.glass, 0.78, 1.38, 0.06, a2, y, 0.0);
          put2(shut, 0.4, 1.45, 0.04, a2 - 0.62, y, 0.02);
          put2(shut, 0.4, 1.45, 0.04, a2 + 0.62, y, 0.02);
        }
      }
      put2(M.stone, len2 + 0.02, 0.7, 0.06, 0, baseY + 0.35, -0.02);
    }
    facades.push({ x0, z0, x1, z1, face, baseY, H: baseY + H, fx, fz, along, out });
    // bina çarpışma kutusu (yükler duvara çarpsın)
    world.createCollider(R.ColliderDesc.cuboid(w / 2, (H + 6) / 2, d / 2).setTranslation(cx, baseY + H / 2 - 3, cz).setFriction(0.6));
  }

  // Her bölgenin dört kenarına bina dizisi; yürünebilir alana taşan parçalar atlanır
  for (const s of SEGS) {
    const sides = [
      ['N', 'x', s.z0, -1],
      ['S', 'x', s.z1, 1],
      ['W', 'z', s.x0, -1],
      ['E', 'z', s.x1, 1],
    ];
    for (const [face, axis, line, outDir] of sides) {
      if (s.sea && face === 'S') continue;
      const from = axis === 'x' ? s.x0 - 8 : s.z0 - 8;
      const to = axis === 'x' ? s.x1 + 8 : s.z1 + 8;
      let a = from;
      while (a < to - 0.5) {
        const wdt = Math.min(to - a, 4.5 + rnd() * 4);
        const depth = 9;
        let x0, x1, z0, z1;
        if (axis === 'x') {
          x0 = a;
          x1 = a + wdt;
          z0 = outDir < 0 ? line - depth : line;
          z1 = outDir < 0 ? line : line + depth;
        } else {
          z0 = a;
          z1 = a + wdt;
          x0 = outDir < 0 ? line - depth : line;
          x1 = outDir < 0 ? line : line + depth;
        }
        a += wdt;
        if (inWalk(x0, z0, x1, z1)) continue;
        if (facades.some((f) => x0 < f.x1 - 0.2 && x1 > f.x0 + 0.2 && z0 < f.z1 - 0.2 && z1 > f.z0 + 0.2)) continue;
        // binanın yüzünün bastığı sokak seviyesi
        const ax = axis === 'x' ? (x0 + x1) / 2 : line - outDir * 0.3;
        const az = axis === 'z' ? (z0 + z1) / 2 : line - outDir * 0.3;
        const baseY = heightAt(ax, az, false) - (s.type === 'stairs' ? 0.4 : 0);
        // cephe yüzü sokağa bakar (dışa doğru değil, içe)
        const faceIn = { N: 'S', S: 'N', W: 'E', E: 'W' }[face];
        building(x0, z0, x1, z1, baseY, faceIn);
      }
    }
  }

  // ---------- Galata Kulesi ----------
  {
    const t = SPOTS.tower;
    const base = 24;
    // kule taşı: ince taş örgü, açık bej
    const TS = new THREE.MeshStandardMaterial({ map: loadTex(loader, 'stonewall_diff', 1), normalMap: loadTex(loader, 'stonewall_nor', 1, false), color: 0xe6d6bc, roughness: 0.9 });
    TS.map.repeat.set(16, 9);
    TS.normalMap.repeat.set(16, 9);
    const g1 = new THREE.CylinderGeometry(4.6, 5.0, 36, 40, 1, true);
    g1.translate(t.x, base + 18, t.z);
    batch(TS, g1);
    const cap = new THREE.CylinderGeometry(4.6, 4.6, 0.6, 40);
    cap.translate(t.x, base + 36.3, t.z);
    batch(TS, cap);
    // seyir balkonu ve korkuluk
    const bal = new THREE.CylinderGeometry(5.4, 5.4, 0.35, 40);
    bal.translate(t.x, base + 33, t.z);
    batch(TS, bal);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      // pencere kemerleri (koyu)
      const w = new THREE.PlaneGeometry(0.9, 2.2);
      w.rotateY(-a + Math.PI / 2);
      w.translate(t.x + Math.cos(a) * 4.61, base + 34.5, t.z + Math.sin(a) * 4.61);
      batch(M.glass, w);
      if (i % 3 === 0)
        for (const y of [10, 18, 26]) {
          const ww = new THREE.PlaneGeometry(0.5, 1.4);
          ww.rotateY(-a + Math.PI / 2);
          ww.translate(t.x + Math.cos(a) * 4.85, base + y, t.z + Math.sin(a) * 4.85);
          batch(M.glass, ww);
        }
    }
    const cone = new THREE.ConeGeometry(5.0, 11, 40);
    cone.translate(t.x, base + 42.1, t.z);
    batch(tint(M.roof, 0x5a6a78), cone);
    const tip = new THREE.CylinderGeometry(0.05, 0.12, 2, 8);
    tip.translate(t.x, base + 48.4, t.z);
    batch(M.iron, tip);
    world.createCollider(R.ColliderDesc.cylinder(18, 4.8).setTranslation(t.x, base + 18, t.z));
    obstacles.push({ x: t.x, z: t.z, r: t.r });
  }

  // ---------- Deniz, vapur ve tarihi yarımada silueti ----------
  {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const img = x.createImageData(256, 256);
    for (let j = 0; j < 256; j++)
      for (let i = 0; i < 256; i++) {
        const v = Math.sin(i * 0.15 + Math.sin(j * 0.07) * 2) * 0.5 + Math.sin(j * 0.21 + i * 0.03) * 0.5;
        const k = (j * 256 + i) * 4;
        img.data[k] = 128 + v * 40;
        img.data[k + 1] = 128 + Math.cos(i * 0.11 - j * 0.05) * 40;
        img.data[k + 2] = 255;
        img.data[k + 3] = 255;
      }
    x.putImageData(img, 0, 0);
    const nt = new THREE.CanvasTexture(c);
    nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
    nt.repeat.set(60, 60);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x24485a, roughness: 0.18, metalness: 0.3, normalMap: nt }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.7, 1500 + 15.4);
    scene.add(sea);
    animated.push((dt, t) => {
      nt.offset.x = t * 0.004;
      nt.offset.y = t * 0.002;
    });
    // rıhtım kenarı taş duvarı
    box(M.stone, 36, 1.6, 0.6, 0, -0.5, 15.3, { tile: 2, collide: true });
    for (let i = -8; i <= 8; i += 4) {
      const b = new THREE.CylinderGeometry(0.18, 0.22, 0.6, 10);
      b.translate(i * 2, 0.3, 14.7);
      batch(M.iron, b);
      obstacles.push({ x: i * 2, z: 14.7, r: 0.3 });
    }
    // iskeleye yanaşmış vapur (beyaz gövde, siyah baca, sarı şerit)
    const ship = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(36, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0x1f1f22, roughness: 0.6 }));
    hull.position.y = 0.4;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(30, 3, 7.4), new THREE.MeshStandardMaterial({ color: 0xf0ede4, roughness: 0.6 }));
    deck.position.y = 3.5;
    const deck2 = new THREE.Mesh(new THREE.BoxGeometry(20, 2.2, 6.6), new THREE.MeshStandardMaterial({ color: 0xf0ede4, roughness: 0.6 }));
    deck2.position.y = 6.1;
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 4, 16), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.5 }));
    funnel.position.set(2, 9, 0);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0xd8b030, roughness: 0.5 }));
    band.position.set(2, 9.6, 0);
    ship.add(hull, deck, deck2, funnel, band);
    for (let i = -13; i <= 13; i += 1.6) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), M.glass);
      w.position.set(i, 3.7, 3.71);
      ship.add(w);
    }
    ship.position.set(-4, -0.6, 21);
    scene.add(ship);
    animated.push((dt, t) => {
      ship.position.y = -0.6 + Math.sin(t * 0.8) * 0.06;
      ship.rotation.z = Math.sin(t * 0.6) * 0.008;
    });
    // karşı kıyı: kubbeler ve minareler (puslu siluet)
    const sil = new THREE.MeshBasicMaterial({ color: 0x8a90a0, fog: true });
    const sil2 = new THREE.MeshBasicMaterial({ color: 0x9aa0ae, fog: true });
    const sk = [];
    const mosque = (x, z, s) => {
      const b = new THREE.BoxGeometry(30 * s, 18 * s, 30 * s);
      b.translate(x, 9 * s + 6, z);
      sk.push(b);
      const d = new THREE.SphereGeometry(14 * s, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      d.translate(x, 18 * s + 6, z);
      sk.push(d);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const sd = new THREE.SphereGeometry(5 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        sd.translate(x + dx * 11 * s, 18 * s + 6, z + dz * 11 * s);
        sk.push(sd);
        const m = new THREE.CylinderGeometry(1.0 * s, 1.2 * s, 62 * s, 8);
        m.translate(x + dx * 20 * s, 31 * s + 6, z + dz * 20 * s);
        sk.push(m);
        const c2 = new THREE.ConeGeometry(1.3 * s, 7 * s, 8);
        c2.translate(x + dx * 20 * s, 65 * s + 6, z + dz * 20 * s);
        sk.push(c2);
      }
    };
    mosque(-260, 520, 1.6);
    mosque(-120, 430, 1.1);
    mosque(-420, 640, 1.3);
    // tepe ve evler
    for (let i = 0; i < 90; i++) {
      const x = -700 + i * 12 + (rnd() - 0.5) * 8;
      const z = 380 + rnd() * 280;
      const h = 8 + rnd() * 18 + Math.max(0, 30 - Math.abs(x + 260) * 0.08);
      const b = new THREE.BoxGeometry(10 + rnd() * 8, h, 10);
      b.translate(x, h / 2, z);
      sk.push(b);
    }
    const mesh = new THREE.Mesh(mergeGeometries(sk.map((g) => g.toNonIndexed()), false), sil);
    scene.add(mesh);
    const hill = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), sil2);
    hill.scale.set(1.4, 0.07, 0.5);
    hill.position.set(-250, -2, 700);
    scene.add(hill);
  }

  // ---------- Çamaşır ipleri (dar sokaklarda) ----------
  const laundry = [];
  {
    const cloth = [0xe8e2d8, 0xc84a3a, 0x3a6aa8, 0xe8c840, 0xf0f0f0, 0x6a9a5a, 0xd890a0];
    const lines = [
      [-5, -26, 5, -26, 7.5], [-5, -8, 5, -8, 6.8],
      [-3.6, -44, 3.6, -44, 6 + 3], [-3.6, -60, 3.6, -60, 7 + 6],
      [20, -84, 20, -76, 18], [34, -84, 34, -76, 19.5],
      [42.5, -96, 48.5, -96, 23], [42.5, -108, 48.5, -108, 27],
    ];
    for (const [ax, az, bx, bz, y] of lines) {
      const len = Math.hypot(bx - ax, bz - az);
      const rope = new THREE.CylinderGeometry(0.01, 0.01, len, 4);
      rope.rotateZ(Math.PI / 2);
      rope.rotateY(-Math.atan2(bz - az, bx - ax));
      rope.translate((ax + bx) / 2, y, (az + bz) / 2);
      batch(M.iron, rope);
      for (let k = 0.15; k < 0.9; k += 0.12 + rnd() * 0.08) {
        const w = 0.5 + rnd() * 0.5, h = 0.5 + rnd() * 0.5;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: pick(cloth), roughness: 1, side: THREE.DoubleSide }));
        m.position.set(ax + (bx - ax) * k, y - h / 2 - 0.02, az + (bz - az) * k);
        m.rotation.y = -Math.atan2(bz - az, bx - ax);
        m.userData.ph = rnd() * 6;
        scene.add(m);
        laundry.push(m);
      }
    }
    animated.push((dt, t) => {
      for (const m of laundry) m.rotation.x = Math.sin(t * 1.7 + m.userData.ph) * 0.18 + (opts.wind ? opts.wind() * 0.5 : 0);
    });
  }

  // ---------- Sokak eşyaları ve çarpışmaları ----------
  const props = [];
  const prop = (id, x, z, ry = 0, s = 1, solid = 0.35) => {
    props.push({ id, x, y: heightAt(x, z, false), z, ry, s });
    if (solid) obstacles.push({ x, z, r: solid });
  };
  prop('street_lamp_01', -4.4, -6, 0, 1, 0.25);
  prop('street_lamp_01', 4.4, -28, Math.PI, 1, 0.25);
  prop('street_lamp_01', -9.3, -76, 0, 1, 0.25);
  prop('street_lamp_01', 31, -118, 0, 1, 0.25);
  prop('street_lamp_01', 65, -146, 0, 1, 0.25);
  prop('Barrel_01', 13, 3, 0, 1, 0.45);
  prop('Barrel_01', 14.2, 2.1, 1, 1, 0.45);
  prop('wooden_crate_02', -14, 3, 0.3, 1, 0.6);
  prop('wooden_crate_02', -14.3, 4.3, 1.2, 1, 0.6);
  prop('metal_trash_can', 4.3, -12, 0, 1, 0.3);
  prop('metal_trash_can', 47.9, -86, 0, 1, 0.3);
  // kahvehane önü (küçük meydan)
  prop('round_wooden_table_01', 6, -79, 0, 1, 0.5);
  prop('WoodenChair_01', 6.8, -78.4, 2.3, 1, 0);
  prop('WoodenChair_01', 5.2, -79.7, -0.7, 1, 0);
  prop('wooden_stool_01', 7.5, -82, 0, 1, 0.25);
  prop('round_wooden_table_01', 36, -122, 0, 1, 0.5);
  prop('WoodenChair_01', 36.8, -121.3, 2.2, 1, 0);
  prop('brass_pot_01', 6, -78.9, 0, 0.6, 0);
  // simit tezgâhı (rıhtım)
  {
    const x = 9, z = 6;
    box(M.wood, 1.4, 0.9, 0.8, x, 0.45, z, { tile: 1, collide: true });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.7), new THREE.MeshStandardMaterial({ color: 0xbfd8e0, transparent: true, opacity: 0.35, roughness: 0.05 }));
    glass.position.set(x, 1.18, z);
    scene.add(glass);
    const simit = new THREE.MeshStandardMaterial({ color: 0xa8682c, roughness: 0.8 });
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.04, 8, 16), simit);
      s.rotation.x = Math.PI / 2;
      s.position.set(x - 0.45 + (i % 3) * 0.45, 0.98 + Math.floor(i / 3) * 0.06, z - 0.2 + Math.floor(i / 3) * 0.2);
      scene.add(s);
    }
    obstacles.push({ x0: x - 0.75, x1: x + 0.75, z0: z - 0.45, z1: z + 0.45 });
  }

  // ---------- Birleştir ----------
  for (const [mat, geos] of batches) {
    const ng = geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const g = mergeGeometries(ng, false);
    if (!g) continue;
    const m = new THREE.Mesh(g, mat);
    m.castShadow = mat !== M.glass;
    m.receiveShadow = true;
    scene.add(m);
  }

  return {
    obstacles,
    props,
    facades,
    update(dt, t) {
      for (const f of animated) f(dt, t);
    },
  };
}
