import * as THREE from 'three';

export const HW = 7; // yolun yarım genişliği
export const STEP = 2; // örnek aralığı (m)
export const RAMP_N = 8;
export const GAP_N = 9;
export const RAMP_H = 2.6;
const TAU = Math.PI * 2;
export const angDiff = (a, b) => ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clampN((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Pist tanımları: kontrol noktaları (x, z), dalga (amp metre, per tepe sayısı), uçurumlar [merkez, derinlik, uzunluk, yumuşaklık] (tur oranı)
export const TRACKS = [
  { id: 'bulut', name: 'Bulut ovası', theme: 'cloud', desc: 'Klasik: hafif tepeler, 4 rampa',
    ctrl: [[0, 0], [130, 0], [230, -50], [270, -150], [210, -240], [100, -265], [10, -215], [-70, -265], [-180, -250], [-260, -160], [-225, -50], [-125, 20]],
    amp: 3, per: 7, ph: 0.6, cliffs: [[0.5, 9, 0.05, 0.026]], road: '#4d5270', curb: '#e8527a', laps: 3 },
  { id: 'sehir', name: 'Şehir üstü', theme: 'city', desc: 'Altında devasa şehir, dik inişler',
    ctrl: [[0, 0], [150, -10], [280, -70], [340, -180], [300, -300], [180, -350], [60, -300], [40, -200], [-60, -150], [-180, -190], [-250, -290], [-340, -230], [-320, -100], [-200, -20]],
    amp: 5, per: 9, ph: 1.2, cliffs: [[0.3, 12, 0.06, 0.026], [0.72, 10, 0.05, 0.026]], road: '#3a3f5c', curb: '#ffb02e', laps: 2 },
  { id: 'okyanus', name: 'Okyanus kıyısı', theme: 'ocean', desc: 'Uçsuz okyanus, çok dalgalı yol',
    ctrl: [[0, 0], [160, 0], [300, -40], [360, -140], [300, -230], [180, -250], [120, -170], [40, -120], [-60, -170], [-80, -280], [-190, -320], [-300, -250], [-320, -120], [-230, -30], [-110, 10]],
    amp: 7, per: 11, ph: 2.1, cliffs: [[0.45, 11, 0.05, 0.026]], road: '#4a5870', curb: '#ffffff', laps: 2 },
  { id: 'orman', name: 'Amazon ormanı', theme: 'forest', desc: 'Orman çatısı üstünde virajlı yol',
    ctrl: [[0, 0], [110, 10], [190, -40], [200, -120], [140, -170], [150, -250], [80, -300], [0, -250], [-20, -170], [-100, -140], [-160, -200], [-230, -160], [-220, -70], [-140, -20]],
    amp: 6, per: 10, ph: 0.2, cliffs: [[0.2, 10, 0.05, 0.026], [0.62, 12, 0.06, 0.026]], road: '#5b5240', curb: '#f2c230', laps: 3 },
  { id: 'uzay', name: 'Uzay boşluğu', theme: 'space', desc: 'Yıldızlar arasında, dev tepeler',
    ctrl: [[0, 0], [150, -10], [280, -70], [340, -180], [300, -300], [180, -350], [60, -300], [40, -200], [-60, -150], [-180, -190], [-250, -290], [-340, -230], [-320, -100], [-200, -20]].map(([x, z]) => [x * 1.1, z * 1.1]),
    amp: 8, per: 8, ph: 3.0, cliffs: [[0.38, 14, 0.06, 0.026], [0.8, 12, 0.05, 0.026]], road: '#232850', curb: '#6de0ff', laps: 2 },
];
export const trackById = (id) => TRACKS.find((t) => t.id === id) || TRACKS[0];

export function buildTrack(def = TRACKS[0]) {
  const curve = new THREE.CatmullRomCurve3(def.ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const len = curve.getLength();
  const N = Math.round(len / STEP);
  const P = [], T = [], R = [], Y = [];
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const p = curve.getPointAt(u), t = curve.getTangentAt(u);
    t.y = 0; t.normalize();
    P.push(new THREE.Vector3(p.x, 0, p.z));
    T.push(t);
    R.push(new THREE.Vector3(t.z, 0, -t.x)); // sağ taraf (araç yönüne göre)
    Y.push(Math.atan2(t.x, t.z));
  }
  const w = (i) => ((i % N) + N) % N;
  const cur = P.map((_, i) => Math.abs(angDiff(Y[i], Y[w(i + 1)])) / STEP);
  const kind = new Uint8Array(N); // 0 yol, 1 rampa, 2 boşluk
  const H = new Float32Array(N);
  const noRail = new Uint8Array(N);
  const pad = new Uint8Array(N);
  // rampaları en düz yerlere yerleştir
  const ramps = [];
  const total = RAMP_N + GAP_N;
  for (const f of [0.15, 0.4, 0.64, 0.85]) {
    let best = -1, bs = 1e9;
    const c = Math.floor(f * N), span = Math.floor(N * 0.06);
    for (let s = c - span; s <= c + span; s += 2) {
      let sum = 0;
      for (let k = -14; k < total + 8; k++) sum += cur[w(s + k)];
      if (sum < bs) { bs = sum; best = s; }
    }
    ramps.push(w(best));
  }
  ramps.sort((a, b) => a - b);
  // dalgalı zemin: rampa ve start çevresinde düz
  const flat = [...ramps.map((s) => [s - 14, s + total + 14]), [-16, 16]];
  const cd = (i, a, b) => { // i'nin [a,b] penceresine döngüsel uzaklığı
    let best = 1e9;
    for (const sh of [-N, 0, N]) { const x = i + sh; best = Math.min(best, x < a ? a - x : x > b ? x - b : 0); }
    return best;
  };
  const flatD = Array.from({ length: N }, (_, i) => Math.min(...flat.map(([a, b]) => cd(i, a, b))));
  const cliffs = (def.cliffs || []).map(([c0, depth, ln, wd]) => {
    const span = Math.round((ln + 2 * wd) * N) + 50, c0i = Math.round((c0 - wd) * N);
    let best = c0i, bs = 1e18;
    for (let s = c0i - Math.round(0.1 * N); s <= c0i + Math.round(0.1 * N); s += 3) {
      let sum = 0;
      for (let k = 0; k < span; k += 2) { const j = w(s + k); sum += cur[j] * 100 + (flatD[j] < 18 ? 5 : 0); }
      if (sum < bs) { bs = sum; best = s; }
    }
    return [(best + Math.round(wd * N)) / N, depth, ln, wd];
  });
  for (let i = 0; i < N; i++) {
    const u = i / N;
    let y = def.amp * Math.sin(TAU * def.per * u + def.ph) * (0.65 + 0.35 * Math.sin(TAU * u * 3 + 1));
    for (const [c, depth, ln, wd] of cliffs) { const uu = u < c - 0.5 ? u + 1 : u > c + 0.5 ? u - 1 : u; y -= depth * (smooth(c - wd, c, uu) - smooth(c + ln, c + ln + wd, uu)); }
    let d = 1e9;
    for (const [a, b] of flat) d = Math.min(d, cd(i, a, b));
    H[i] = y * smooth(0, 16, d);
  }
  for (const s of ramps) {
    for (let k = 0; k < RAMP_N; k++) {
      const i = w(s + k);
      kind[i] = 1;
      H[i] = RAMP_H * Math.pow((k + 1) / RAMP_N, 1.7);
    }
    for (let k = 0; k < GAP_N; k++) { kind[w(s + RAMP_N + k)] = 2; H[w(s + RAMP_N + k)] = 0; }
    for (let k = -4; k < total + 4; k++) noRail[w(s + k)] = 1;
  }
  // hızlanma plakaları: rampalar arasının ortasında
  for (let r = 0; r < ramps.length; r++) {
    const a = ramps[r] + total, b = ramps[(r + 1) % ramps.length] + (r === ramps.length - 1 ? N : 0);
    const mid = Math.floor((a + b) / 2);
    for (let k = -3; k < 3; k++) pad[w(mid + k)] = 1;
  }
  // eşya kutuları: 3 şeritli sıralar
  const items = [];
  const rows = 9;
  for (let k = 0; k < rows; k++) {
    let i = Math.floor(((k + 0.5) * N) / rows);
    for (let t = 0; t < 40 && (kind[w(i)] !== 0 || noRail[w(i)] || pad[w(i)]); t++) i++;
    i = w(i);
    for (const lane of [-4, 0, 4]) items.push({ i, lane, x: P[i].x + R[i].x * lane, z: P[i].z + R[i].z * lane, y: H[i] + 1.5 });
  }
  return { N, P, T, R, Y, cur, kind, H, noRail, pad, ramps, len, w, items, def, laps: def.laps || 3 };
}

function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function trackTextures(def = {}) {
  const road = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = def.road || '#4d5270'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = '#ffffff'; g.fillRect(w / 2 - 3, 8, 6, h * 0.5);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(w * 0.06, 0, 3, h); g.fillRect(w * 0.94 - 3, 0, 3, h);
  });
  const curb = canvasTex(32, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = def.curb || '#e8527a'; g.fillRect(0, 0, w, h / 2);
  });
  const hazard = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#23252e';
    for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 20, 0); g.lineTo(i * 20 + 10, 0); g.lineTo(i * 20 + 10 + 64, h); g.lineTo(i * 20 + 64, h); g.fill(); }
  });
  const chevron = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#12b6e0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff6a0'; g.lineWidth = 9; g.lineJoin = 'miter';
    for (const y of [12, 40]) { g.beginPath(); g.moveTo(8, y + 18); g.lineTo(w / 2, y); g.lineTo(w - 8, y + 18); g.stroke(); }
  });
  const side = canvasTex(16, 16, (g, w, h) => { g.fillStyle = '#2b2f45'; g.fillRect(0, 0, w, h); });
  return { road, curb, hazard, chevron, side };
}

// Yol ağını (şerit) kur
export function buildTrackMesh(tr, tex) {
  const { N, P, R, kind, H, noRail, pad, w } = tr;
  const group = new THREE.Group();
  const strip = (a, b, dy, filter, tx, vscale, mat) => {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < N; i++) {
      const j = w(i + 1);
      if (kind[i] === 2 || kind[j] === 2 || !filter(i)) continue;
      const base = pos.length / 3;
      for (const [ii, v] of [[i, i * STEP / vscale], [j, (i + 1) * STEP / vscale]]) {
        const y = H[ii] + dy;
        pos.push(P[ii].x + R[ii].x * a, y, P[ii].z + R[ii].z * a, P[ii].x + R[ii].x * b, y, P[ii].z + R[ii].z * b);
        uv.push(0, v, 1, v);
      }
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // yukarı bakacak şekilde sarım yönünü düzelt
    const nA = g.attributes.normal;
    if (nA.count && nA.getY(0) < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } g.computeVertexNormals(); }
    const m = new THREE.Mesh(g, mat);
    group.add(m);
    return m;
  };
  const L = (map) => new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide });
  strip(-HW, HW, 0, (i) => kind[i] === 0, 0, 8, L(tex.road));
  strip(-HW, HW, 0.01, (i) => kind[i] === 1, 0, 8, L(tex.hazard));
  strip(-4, 4, 0.03, (i) => pad[i] === 1, 0, 3, L(tex.chevron));
  strip(-HW - 1.2, -HW, 0.06, (i) => true, 0, 4, L(tex.curb));
  strip(HW, HW + 1.2, 0.06, (i) => true, 0, 4, L(tex.curb));
  // yol altı kalınlığı (kenar duvarları)
  const sideWall = (off) => {
    const pos = [], idx = [];
    for (let i = 0; i < N; i++) {
      const j = w(i + 1);
      if (kind[i] === 2 || kind[j] === 2) continue;
      const base = pos.length / 3;
      for (const ii of [i, j]) pos.push(P[ii].x + R[ii].x * off, H[ii] + 0.05, P[ii].z + R[ii].z * off, P[ii].x + R[ii].x * off, H[ii] - 1.6, P[ii].z + R[ii].z * off);
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    group.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x2b2f45, side: THREE.DoubleSide })));
  };
  sideWall(-HW - 1.2);
  sideWall(HW + 1.2);
  // korkuluklar
  const rails = [];
  for (let i = 0; i < N; i++) if (!noRail[i] && kind[i] === 0) rails.push(i);
  const rg = new THREE.BoxGeometry(0.4, 0.8, STEP + 0.05);
  const inst = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: 0xf4f6ff, flatShading: true }), rails.length * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3();
  let k = 0;
  for (const i of rails) {
    e.set(0, Math.atan2(tr.T[i].x, tr.T[i].z), 0);
    q.setFromEuler(e);
    for (const s of [-1, 1]) {
      ps.set(P[i].x + R[i].x * s * (HW + 0.7), H[i] + 0.4, P[i].z + R[i].z * s * (HW + 0.7));
      m4.compose(ps, q, sc);
      inst.setMatrixAt(k++, m4);
    }
  }
  group.add(inst);
  // rampa ucunda ışıklı işaretler
  return group;
}
