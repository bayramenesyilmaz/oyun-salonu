import * as THREE from 'three';
import { mat } from './tex.js';

// Hücre koridorunun ötesi: revir, mutfak ve avlu. Her şey kodla üretilir.
// Koordinatlar: z ileri. Revir z 6.9–14.3, mutfak 14.4–24.1, avlu 24.2–45.
export function buildWorld(S) {
  const T = S.T;
  const tint = (t, color, o = {}) => { const { gain = 3.4, ...rest } = o; const m = mat(t, { color, ...rest }); m.color.multiplyScalar(gain); return m; };
  const wallRevir = tint(T.wall, '#a9b8b2');
  const wallKit = tint(T.wall, '#b9b4a4');
  const wallYard = tint(T.wall, '#7b7e7c', { gain: 5 });
  const floorRevir = tint(T.floor, '#9aa6a0', { roughness: 0.4 });
  const floorKit = tint(T.floor, '#a89f8a', { roughness: 0.45 });
  const ground = tint(T.floor, '#4f5651', { roughness: 0.9, gain: 5.5 });
  const steel = tint(T.metal, '#aab2b8', { metalness: 0.7, roughness: 0.35, gain: 2 });
  const dark = tint(T.metal, '#555d62', { metalness: 0.6, roughness: 0.5, gain: 2 });
  const wood = tint(T.wood, '#7a5a3e');
  const white = new THREE.MeshStandardMaterial({ color: '#d8dcdc', roughness: 0.7 });
  const sb = (w, h, d, m, x, y, z, sh = true) => S.solidBox(w, h, d, m, x, y, z, sh);
  const vb = (w, h, d, m, x, y, z, sh = false) => S.box(w, h, d, m, x, y, z, sh);

  // ——— REVİR (x ±3.7, z 6.9–14.3) ———
  sb(7.6, 0.2, 0.4, floorRevir, 0, -0.1, 6.7, false);
  sb(7.6, 0.2, 7.6, floorRevir, 0, -0.1, 10.6, false);
  sb(7.6, 0.2, 7.6, wallRevir, 0, 3.0, 10.6, false);
  sb(0.2, 3.1, 7.8, wallRevir, -3.8, 1.45, 10.6);
  sb(0.2, 3.1, 7.8, wallRevir, 3.8, 1.45, 10.6);
  // koridor sonu duvarı çarpışması (görünür parçalar cell.js'te)
  S.solids.push([-2.225, 1.45, 6.8, 1.575, 1.55, 0.1], [2.225, 1.45, 6.8, 1.575, 1.55, 0.1]);
  // revir sonu duvarı (z 14.3): kart kapısı x 1.9–3.1
  sb(6.3, 3.1, 0.2, wallRevir, -1.25, 1.45, 14.3);
  sb(1.3, 3.1, 0.2, wallRevir, 3.75, 1.45, 14.3);
  vb(1.2, 0.8, 0.2, wallRevir, 2.5, 2.6, 14.3);
  // yataklar
  for (const z of [8.4, 10.9]) {
    sb(1.0, 0.5, 2.0, dark, -3.2, 0.25, z);
    vb(0.9, 0.14, 1.9, tint(T.mattress, '#d4dcd8'), -3.2, 0.57, z);
    vb(0.4, 0.1, 0.3, white, -3.2, 0.69, z - 0.7);
  }
  // masa + monitör + kart
  sb(0.9, 0.75, 1.7, wood, -3.25, 0.375, 13.2);
  const mon = vb(0.08, 0.34, 0.5, new THREE.MeshBasicMaterial({ color: '#6fd8a8' }), -3.3, 1.0, 13.0);
  vb(0.1, 0.05, 0.2, dark, -3.3, 0.8, 13.0);
  S.card = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.055), new THREE.MeshStandardMaterial({ color: '#3a9cff', emissive: '#1a5cc0', emissiveIntensity: 1.2 }));
  S.card.position.set(-3.1, 0.79, 13.85);
  S.card.rotation.y = 0.5;
  S.scene.add(S.card);
  S.cardGlow = new THREE.PointLight('#5fb0ff', 0.7, 1.4, 2);
  S.cardGlow.position.set(-3.1, 0.95, 13.85);
  S.scene.add(S.cardGlow);
  // sandalye
  sb(0.45, 0.45, 0.45, dark, -2.3, 0.22, 13.0);
  // raf (siper)
  sb(0.5, 1.8, 1.8, steel, 3.45, 0.9, 11.8);
  sb(0.5, 1.2, 1.2, steel, 3.45, 0.6, 9.9);
  // boru (vurulacak)
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.5, 12), dark);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(3.68, 0.95, 9.2);
  S.scene.add(pipe);
  S.pipe = pipe;
  // kart kapısı (okuyucu + panel)
  S.revirDoor = vb(1.2, 2.3, 0.1, steel, 2.5, 1.15, 14.25);
  S.reader = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.05), new THREE.MeshBasicMaterial({ color: '#ff3a2a' }));
  S.reader.position.set(1.7, 1.3, 14.15);
  S.scene.add(S.reader);
  // ——— MUTFAK (x ±4.3, z 14.4–24.1) ———
  sb(8.8, 0.2, 9.9, floorKit, 0, -0.1, 19.25, false);
  sb(8.8, 0.2, 9.9, wallKit, 0, 3.0, 19.25, false);
  sb(0.2, 3.1, 10.1, wallKit, -4.4, 1.45, 19.25);
  sb(0.2, 3.1, 10.1, wallKit, 4.4, 1.45, 19.25);
  // mutfak sonu (z 24.1): hatch kapağı x -0.7..0.7
  sb(3.8, 3.1, 0.2, wallKit, -2.6, 1.45, 24.1);
  sb(3.8, 3.1, 0.2, wallKit, 2.6, 1.45, 24.1);
  vb(1.4, 1.2, 0.2, wallKit, 0, 2.4, 24.1);
  S.hatch = vb(1.4, 1.8, 0.1, dark, 0, 0.9, 24.0);
  S.wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 20), steel);
  S.wheel.position.set(0, 1.05, 23.9);
  S.scene.add(S.wheel);
  // tezgâhlar
  sb(1.0, 0.9, 3.2, steel, -2.6, 0.45, 17.2);
  sb(1.0, 0.9, 3.4, steel, 1.4, 0.45, 18.4);
  sb(1.0, 0.9, 2.4, steel, -2.6, 0.45, 21.6);
  sb(1.0, 0.9, 2.0, steel, 1.4, 0.45, 22.2);
  sb(0.9, 2.0, 1.1, white, 3.9, 1.0, 16.2); // buzdolabı
  sb(0.9, 2.0, 1.1, white, 3.9, 1.0, 17.5);
  sb(0.6, 0.9, 1.3, wood, -4.0, 0.45, 23.1); // kerpeten dolabı
  // kerpeten
  S.pliers = new THREE.Group();
  const pm = new THREE.MeshStandardMaterial({ color: '#b03a2a', roughness: 0.5, metalness: 0.4 });
  const pa = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.04), pm);
  const pb = pa.clone();
  pa.rotation.y = 0.12;
  pb.rotation.y = -0.12;
  S.pliers.add(pa, pb);
  S.pliers.position.set(-4.0, 0.93, 23.1);
  S.scene.add(S.pliers);
  S.pliersGlow = new THREE.PointLight('#ffd9a0', 0.5, 1.2, 2);
  S.pliersGlow.position.set(-3.9, 1.05, 23.0);
  S.scene.add(S.pliersGlow);
  // ——— AVLU (x ±7.2, z 24.2–46) ———
  sb(14.8, 0.2, 21.8, ground, 0, -0.1, 35.1, false);
  sb(0.3, 3.6, 21.8, wallYard, -7.3, 1.7, 35.1);
  sb(0.3, 3.6, 21.8, wallYard, 7.3, 1.7, 35.1);
  sb(14.8, 3.6, 0.3, wallYard, 0, 1.7, 46.1);
  // hatch ardı: kitchen dışını avluya bağlayan duvarlar
  sb(6.6, 3.1, 0.2, wallYard, -4.0, 1.45, 24.3);
  sb(6.6, 3.1, 0.2, wallYard, 4.0, 1.45, 24.3);
  vb(1.4, 1.2, 0.2, wallYard, 0, 2.4, 24.3);
  // siperler
  const crate = (x, z, s = 1.2) => sb(s, s, s, wood, x, s / 2, z);
  crate(-3.2, 28.2);
  crate(2.2, 30.0);
  crate(-1.0, 33.4, 1.4);
  crate(4.2, 34.6);
  crate(-5.2, 36.0, 1.0);
  sb(3.2, 1.1, 0.4, wallYard, -4.6, 0.55, 31.2); // alçak duvar (çömelerek saklan)
  sb(2.6, 1.1, 0.4, wallYard, 1.0, 0.55, 26.5);
  // çit (z 38.2)
  S.fenceBars = [];
  const bar = (x) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.4, 0.04), dark);
    b.position.set(x, 1.2, 38.2);
    S.scene.add(b);
    return b;
  };
  for (let x = -7.1; x <= 7.15; x += 0.28) {
    const b = bar(x);
    if (x > 2.1 && x < 3.9) S.fenceBars.push(b);
  }
  for (const y of [0.4, 1.2, 2.2]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.04, 0.04), dark);
    r.position.set(0, y, 38.2);
    S.scene.add(r);
  }
  S.solids.push([-2.5, 1.2, 38.2, 4.6, 1.2, 0.1], [5.55, 1.2, 38.2, 3.35, 1.2, 0.1]); // çit çarpışması (orta boşluk x 2.1–3.9 ayrı)
  S.fenceGapCol = [3.0, 1.2, 38.2, 0.9, 1.2, 0.1];
  // minibüs + Kerem
  const van = new THREE.Group();
  const vm = new THREE.MeshStandardMaterial({ color: '#3b4a58', roughness: 0.45, metalness: 0.5 });
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.7, 4.4), vm);
  b1.position.set(0, 1.15, 0);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.5), vm);
  b2.position.set(0, 0.8, 2.6);
  van.add(b1, b2);
  for (const [x, z] of [[-1.05, -1.4], [1.05, -1.4], [-1.05, 1.9], [1.05, 1.9]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14), new THREE.MeshStandardMaterial({ color: '#111' }));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    van.add(w);
  }
  van.position.set(-3.5, 0, 42.4);
  van.traverse((o) => (o.castShadow = true));
  S.scene.add(van);
  S.solids.push([-3.5, 1.1, 42.4, 1.1, 1.1, 2.4]);
  S.van = van;
  S.kerem = S.makeGuard('#3a4658');
  S.kerem.position.set(-1.7, 0, 42.2);
  S.kerem.rotation.y = -Math.PI / 2;
  S.scene.add(S.kerem);
  // ——— ışıklar ———
  S.roomLight = new THREE.PointLight('#bfe8ff', 0, 11, 1.4);
  S.roomLight.position.set(0, 2.5, 10);
  S.scene.add(S.roomLight);
  const mkTorch = (shadow) => {
    const t = new THREE.SpotLight('#fff1cf', 0, 16, 0.4, 0.55, 1.2);
    t.castShadow = shadow;
    if (shadow) t.shadow.mapSize.set(512, 512);
    S.scene.add(t, t.target);
    return t;
  };
  S.torch2 = mkTorch(false);
  S.torch3 = mkTorch(false);
  S.guard2 = S.makeGuard();
  S.guard3 = S.makeGuard();
  S.doctor = S.makeGuard('#cfd6d8');
  S.guard2.position.set(-0.6, 0, 15.5);
  S.guard3.position.set(-4, 0, 36);
  S.doctor.position.set(-2.3, 0, 13.0);
  S.scene.add(S.guard2, S.guard3, S.doctor);
  S.search = new THREE.SpotLight('#e9f4ff', 0, 40, 0.2, 0.35, 1.0);
  S.search.position.set(-6.4, 5.2, 25.6);
  S.scene.add(S.search, S.search.target);
  S.towerLamp = vb(0.5, 0.5, 0.5, dark, -6.4, 5.2, 25.6);
  vb(0.2, 5.0, 0.2, dark, -6.4, 2.6, 25.6);
  // avlu yağmuru (kameranın çevresinde)
  const N = 900;
  const pos = new Float32Array(N * 6);
  const rr = (() => {
    let s = 7;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  })();
  S.rain2 = { pos, N, r: rr };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  S.rain2Lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#9bb7d0', transparent: true, opacity: 0.4, fog: false }));
  S.rain2Lines.frustumCulled = false;
  S.rain2Lines.visible = false;
  S.scene.add(S.rain2Lines);
  for (let i = 0; i < N; i++) {
    const x = (rr() - 0.5) * 14, y = rr() * 4, z = (rr() - 0.5) * 14;
    pos.set([x, y, z, x - 0.02, y - 0.25, z], i * 6);
  }
}
