import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// CİNGÖZ KONAĞI — önü açık, bebek evi gibi kesit.
// X: soldan sağa (avlu → mutfak → salon → merdiven). Y: yukarı. Z: derinlik (arka duvar −2.5, ön açık +2.5).
// Zemin kat y=0, üst kat y=FLOOR2.

export const FLOOR2 = 3.4;
export const WALK_Z = 0.35;
export const STAIR = { x0: 8.7, x1: 11.0 }; // alt basamak → üst basamak

export function roomsFor(ep) {
  const ground = [
    { id: 'avlu', name: 'Avlu', floor: 0, x0: -15.5, x1: -8, outdoor: true },
    { id: 'mutfak', name: 'Mutfak', floor: 0, x0: -8, x1: -1 },
    { id: 'salon', name: 'Salon', floor: 0, x0: -1, x1: 8 },
    { id: 'merdiven', name: 'Merdiven', floor: 0, x0: 8, x1: 11.8 },
  ];
  const upper =
    ep === 2
      ? [
          { id: 'calisma', name: 'Çalışma odası (tadilatta)', floor: 1, x0: -8, x1: 8 },
          { id: 'merdiven', name: 'Merdiven', floor: 1, x0: 8, x1: 11.8 },
        ]
      : [
          { id: 'banyo', name: 'Banyo', floor: 1, x0: -8, x1: -2 },
          { id: 'yatak', name: 'Yatak odası', floor: 1, x0: -2, x1: 8 },
          { id: 'merdiven', name: 'Merdiven', floor: 1, x0: 8, x1: 11.8 },
        ];
  return [...ground, ...upper];
}

export function roomAt(rooms, floor, x) {
  return rooms.find((r) => r.floor === floor && x >= r.x0 && x <= r.x1) || null;
}

// ---------- doku yardımcıları ----------
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}
const rnd = (() => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
})();

function planks(color, dark) {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = color;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const y = i * 32;
      x.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.08})`;
      x.fillRect(0, y, w, 32);
      x.fillStyle = dark;
      x.fillRect(0, y, w, 2);
      const off = rnd() * w;
      x.fillRect(off, y, 2, 32);
      for (let k = 0; k < 20; k++) {
        x.strokeStyle = `rgba(60,30,10,${0.05 + rnd() * 0.08})`;
        x.beginPath();
        const yy = y + 4 + rnd() * 24;
        x.moveTo(0, yy);
        x.bezierCurveTo(w * 0.3, yy + rnd() * 4 - 2, w * 0.6, yy + rnd() * 4 - 2, w, yy);
        x.stroke();
      }
    }
  });
}
function wallpaper(base, motif) {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);
    x.fillStyle = motif;
    for (let i = 0; i < 4; i++)
      for (let k = 0; k < 4; k++) {
        const cx = i * 64 + (k % 2 ? 32 : 0) + 16, cy = k * 64 + 32;
        x.globalAlpha = 0.35;
        x.beginPath();
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          x.ellipse(cx + Math.cos(ang) * 9, cy + Math.sin(ang) * 9, 6, 3, ang, 0, Math.PI * 2);
        }
        x.fill();
        x.globalAlpha = 0.6;
        x.beginPath();
        x.arc(cx, cy, 4, 0, Math.PI * 2);
        x.fill();
      }
    x.globalAlpha = 1;
  });
}
function kilim(c1, c2, c3) {
  return canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = c1;
    x.fillRect(0, 0, w, h);
    x.fillStyle = c2;
    x.fillRect(8, 8, w - 16, h - 16);
    x.fillStyle = c1;
    x.fillRect(16, 16, w - 32, h - 32);
    for (let i = 0; i < 5; i++) {
      const cx = 40 + i * 44, cy = h / 2;
      x.fillStyle = i % 2 ? c3 : c2;
      x.beginPath();
      x.moveTo(cx, cy - 30);
      x.lineTo(cx + 18, cy);
      x.lineTo(cx, cy + 30);
      x.lineTo(cx - 18, cy);
      x.fill();
      x.fillStyle = c1;
      x.beginPath();
      x.moveTo(cx, cy - 12);
      x.lineTo(cx + 7, cy);
      x.lineTo(cx, cy + 12);
      x.lineTo(cx - 7, cy);
      x.fill();
    }
  });
}
function tiles() {
  return canvasTex(256, 256, (x, w, h) => {
    for (let i = 0; i < 8; i++)
      for (let k = 0; k < 8; k++) {
        x.fillStyle = (i + k) % 2 ? '#e8eef0' : '#3a7a9a';
        x.fillRect(i * 32, k * 32, 32, 32);
      }
    x.strokeStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i <= 8; i++) {
      x.beginPath();
      x.moveTo(i * 32, 0);
      x.lineTo(i * 32, h);
      x.moveTo(0, i * 32);
      x.lineTo(w, i * 32);
      x.stroke();
    }
  }, [3, 1.5]);
}

// Kat bölümü için ad etiketi (ahşap tabela)
function signTex(text) {
  return canvasTex(512, 96, (x, w, h) => {
    x.fillStyle = '#6a4228';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = '#3a2214';
    x.lineWidth = 6;
    x.strokeRect(4, 4, w - 8, h - 8);
    x.fillStyle = '#f6e2b8';
    x.font = 'bold 54px Georgia, serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(text, w / 2, h / 2 + 3);
  });
}

export function buildHouse(scene, ep) {
  const batches = new Map();
  const animated = [];
  const hot = {}; // etkileşim nesneleri: id → { mesh, room, x, y, z }
  const hides = []; // saklanma yerleri
  const props = {}; // şakalarda hareket eden parçalar

  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
  const MAT = {
    floor: new THREE.MeshStandardMaterial({ map: planks('#b07a48', '#5a3418'), roughness: 0.7 }),
    floor2: new THREE.MeshStandardMaterial({ map: planks('#a8703e', '#4a2a12'), roughness: 0.7 }),
    beam: M(0x5a3820, { roughness: 0.85 }),
    wood: M(0x8a5a34),
    darkWood: M(0x4a2e1c),
    outer: new THREE.MeshStandardMaterial({ map: planks('#d8cdb8', '#8a7a60'), roughness: 0.9 }),
    paperSalon: new THREE.MeshStandardMaterial({ map: wallpaper('#e8d6b0', '#a8463a'), roughness: 0.95 }),
    paperYatak: new THREE.MeshStandardMaterial({ map: wallpaper('#c8d8e0', '#3a5a8a'), roughness: 0.95 }),
    paperMutfak: new THREE.MeshStandardMaterial({ map: wallpaper('#f0e6c8', '#6a8a3a'), roughness: 0.95 }),
    banyo: new THREE.MeshStandardMaterial({ map: tiles(), roughness: 0.4 }),
    plaster: M(0xe8dcc4, { roughness: 0.95 }),
    roof: M(0x9a3a26, { roughness: 0.9 }),
    stone: M(0x8a8478, { roughness: 0.95 }),
    grass: M(0x5f9a3e, { roughness: 1 }),
    white: M(0xf4f0e8),
    brass: M(0xd0a040, { metalness: 0.7, roughness: 0.3 }),
    copper: M(0xb86a3a, { metalness: 0.6, roughness: 0.35 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xa8d8f0, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 }),
    red: M(0xb8302a),
    green: M(0x3a7a3a),
    blue: M(0x2a5a9a),
    leaf: M(0x4e8a32, { flatShading: true }),
    leaf2: M(0x6aaa3e, { flatShading: true }),
    trunk: M(0x6a4a32),
    black: M(0x1a1a1a),
    screen: new THREE.MeshStandardMaterial({ color: 0x101418, emissive: 0x000000, roughness: 0.2 }),
    kilim1: new THREE.MeshStandardMaterial({ map: kilim('#9a2a1e', '#e0b050', '#2a4a7a'), roughness: 1 }),
    kilim2: new THREE.MeshStandardMaterial({ map: kilim('#2a4a6a', '#d8c090', '#a83a2a'), roughness: 1 }),
  };

  function batch(mat, geo) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(geo.index ? geo.toNonIndexed() : geo);
  }
  function box(mat, w, h, d, x, y, z, ry = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    // dokular dünya boyutuna göre
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * dims[f][0] * 0.4, uv.getY(i) * dims[f][1] * 0.4);
      }
    if (ry) g.rotateY(ry);
    g.translate(x, y + h / 2, z);
    batch(mat, g);
  }
  function mesh(geo, mat, x, y, z, parent = scene) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function addHot(id, obj, room, x, y, z, extra = {}) {
    obj.traverse((o) => (o.userData.hot = id));
    hot[id] = { id, obj, room, x, y, z, ...extra };
    return hot[id];
  }

  // ---------- Gökyüzü, deniz, uzak şehir ----------
  const skyU = { top: { value: new THREE.Color(0x6aaee8) }, bot: { value: new THREE.Color(0xe8f0f8) } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: skyU,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.2,0.0,1.0); gl_FragColor = vec4(mix(bot, top, h),1.0); }',
    })
  );
  scene.add(sky);
  const sea = mesh(new THREE.PlaneGeometry(400, 160), new THREE.MeshStandardMaterial({ color: 0x3a7aa8, roughness: 0.25, metalness: 0.2 }), 0, -0.6, -90);
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = false;
  // karşı kıyıda tepeler ve siluet (minare kullanmadan genel bir şehir silueti)
  for (let i = 0; i < 26; i++) {
    const w = 3 + rnd() * 6, h = 2 + rnd() * 7;
    const g = new THREE.BoxGeometry(w, h, 2);
    g.translate(-80 + i * 6.5 + rnd() * 3, h / 2 - 0.5, -150);
    batch(M(0x8aa0b8, { roughness: 1 }), g);
  }
  const hills = new THREE.Mesh(new THREE.SphereGeometry(60, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x7a9a8a, { roughness: 1 }));
  hills.scale.set(3, 0.35, 1);
  hills.position.set(20, -2, -170);
  scene.add(hills);
  // zemin: arka bahçe ve sokak
  const ground = mesh(new THREE.PlaneGeometry(80, 40), MAT.grass, -2, -0.02, -14);
  ground.rotation.x = -Math.PI / 2;
  const street = mesh(new THREE.PlaneGeometry(90, 40), M(0x9a9488, { roughness: 1 }), -2, -0.015, 23);
  box(M(0xb8b0a0, { roughness: 1 }), 60, 0.12, 1.6, -2, -0.06, 3.6); // kaldırım
  street.rotation.x = -Math.PI / 2;
  // arnavut kaldırımı deseni
  for (let i = 0; i < 160; i++) {
    const g = new THREE.CylinderGeometry(0.22, 0.24, 0.05, 6);
    g.translate(-30 + (i % 40) * 1.5 + (Math.floor(i / 40) % 2) * 0.75, 0, 4.5 + Math.floor(i / 40) * 1.2);
    batch(M(0x7a7468, { roughness: 1 }), g);
  }

  // ---------- Yapı ----------
  const D = 5, Z0 = -2.5;
  // temel taş kaide
  box(MAT.stone, 20.4, 0.5, D + 0.4, 1.9, -0.5, 0);
  // zemin kat döşemesi
  box(MAT.floor, 19.8, 0.12, D, 1.9, -0.1, 0);
  // üst kat döşemesi (merdiven boşluğu hariç)
  box(MAT.floor2, 16, 0.25, D, 0, FLOOR2 - 0.25, 0);
  box(MAT.floor2, 1.2, 0.25, D, 11.2, FLOOR2 - 0.25, 0);
  box(MAT.beam, 20, 0.22, 0.25, 1.9, FLOOR2 - 0.47, D / 2 - 0.12);
  // çatı katı tavanı
  box(MAT.beam, 20.4, 0.25, D + 0.3, 1.9, 6.6, 0);
  // arka duvarlar (oda başına farklı kâğıt)
  box(MAT.paperMutfak, 7, 3.3, 0.2, -4.5, 0, Z0);
  box(MAT.paperSalon, 9, 3.3, 0.2, 3.5, 0, Z0);
  box(MAT.plaster, 3.8, 6.6, 0.2, 9.9, 0, Z0);
  if (ep === 2) {
    box(MAT.plaster, 16, 3.25, 0.2, 0, FLOOR2, Z0);
  } else {
    box(MAT.banyo, 6, 3.25, 0.2, -5, FLOOR2, Z0);
    box(MAT.paperYatak, 10, 3.25, 0.2, 3, FLOOR2, Z0);
  }
  // yan duvarlar
  box(MAT.outer, 0.3, 6.6, D, -8.1, 0, 0);
  box(MAT.outer, 0.3, 6.6, D, 11.95, 0, 0);
  // iç bölme duvarları (kapı boşluklu): x=−1 zemin, x=8 zemin/üst, x=−2 üst
  // bölme duvar: önü açık kesit olduğu için yalnız arka parça ve kapı lentosu
  function partition(x, y, mat) {
    box(mat, 0.18, 3.25, 1.5, x, y, -1.75);
    box(mat, 0.18, 0.7, 3.5, x, y + 2.55, 0.75);
  }
  partition(-1, 0, MAT.plaster);
  partition(8, 0, MAT.plaster);
  partition(8, FLOOR2, MAT.plaster);
  if (ep !== 2) partition(-2, FLOOR2, MAT.plaster);
  // ön kat kirişleri ve köşe dikmeleri (önü açık kesit)
  for (const x of [-8.1, -1, 8, 11.95]) box(MAT.beam, 0.25, 6.6, 0.25, x, 0, D / 2 - 0.12);
  // dış cephe: üst katta çıkma (cumba) kenarı ve saçak
  box(MAT.outer, 0.3, 3.3, 0.6, -8.25, FLOOR2, D / 2 + 0.1);
  // çatı (iki eğim, kesit olduğu için arka eğim görünür)
  {
    const g = new THREE.BoxGeometry(21.6, 0.2, 4.4);
    g.rotateX(-0.5);
    g.translate(1.9, 7.7, -1.15);
    batch(MAT.roof, g);
    const g2 = new THREE.BoxGeometry(21.6, 0.2, 3.4);
    g2.rotateX(0.5);
    g2.translate(1.9, 7.55, 2.4);
    batch(MAT.roof, g2);
    // kiremit sıraları
    for (let i = 0; i < 7; i++) {
      const t = new THREE.CylinderGeometry(0.09, 0.09, 21.6, 6);
      t.rotateZ(Math.PI / 2);
      t.translate(1.9, 6.8 + i * 0.27, -2.8 + i * 0.56);
      batch(MAT.roof, t);
    }
    box(MAT.outer, 0.3, 2.0, 0.2, -8.1, 6.6, -2.4);
    box(MAT.outer, 0.3, 2.0, 0.2, 11.95, 6.6, -2.4);
    // baca
    box(MAT.stone, 0.8, 1.8, 0.8, -4.5, 7.2, -1.6);
  }
  // pencereler (arka duvarda, ışık girer)
  function windowAt(x, y, w = 1.3, h = 1.5) {
    box(MAT.darkWood, w + 0.2, 0.12, 0.3, x, y - 0.06, Z0 + 0.12);
    box(MAT.darkWood, w + 0.2, 0.12, 0.3, x, y + h, Z0 + 0.12);
    box(MAT.darkWood, 0.1, h, 0.3, x - w / 2, y, Z0 + 0.12);
    box(MAT.darkWood, 0.1, h, 0.3, x + w / 2, y, Z0 + 0.12);
    box(MAT.darkWood, 0.06, h, 0.25, x, y, Z0 + 0.12);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), MAT.glass);
    gl.position.set(x, y + h / 2, Z0 + 0.12);
    scene.add(gl);
  }
  windowAt(-5.6, 1.3);
  windowAt(0.6, 1.2, 1.4, 1.7);
  windowAt(6.6, 1.2);
  windowAt(-4.0, FLOOR2 + 1.2);
  windowAt(4.2, FLOOR2 + 1.2, 1.6, 1.6);

  // oda tabelaları (kesitin üstünde, ön kirişte)
  const rooms = roomsFor(ep);
  for (const r of rooms) {
    if (r.id === 'merdiven' || r.outdoor) continue;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.34), new THREE.MeshBasicMaterial({ map: signTex(r.name.split(' (')[0]) }));
    s.position.set((r.x0 + r.x1) / 2, r.floor ? 6.2 : FLOOR2 - 0.6, D / 2 + 0.02);
    scene.add(s);
  }

  // ---------- Merdiven ----------
  {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = STAIR.x0 + (STAIR.x1 - STAIR.x0) * t;
      box(MAT.wood, 0.36, 0.1, 1.5, x, t * FLOOR2 - 0.05, -0.4);
      box(MAT.darkWood, 0.04, t * FLOOR2 + 0.02, 1.5, x - 0.18, 0, -0.4);
    }
    // korkuluk
    const len = Math.hypot(STAIR.x1 - STAIR.x0, FLOOR2);
    const rail = new THREE.CylinderGeometry(0.04, 0.04, len, 8);
    rail.rotateZ(-Math.atan2(STAIR.x1 - STAIR.x0, FLOOR2));
    rail.translate((STAIR.x0 + STAIR.x1) / 2, FLOOR2 / 2 + 0.95, 0.4);
    batch(MAT.darkWood, rail);
    // sabun hedefi: orta basamak
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 1.5), new THREE.MeshStandardMaterial({ color: 0x8a5a34, transparent: true, opacity: 0 }));
    step.position.set(9.8, FLOOR2 * 0.45, -0.4);
    scene.add(step);
    addHot('basamak', step, 'merdiven', 9.3, 0, 0);
    props.soap = mesh(new THREE.BoxGeometry(0.2, 0.06, 0.12), M(0xf0c8e0), 9.8, FLOOR2 * 0.47 + 0.02, -0.3);
    props.soap.visible = false;
    // merdiven altı saklanma
    const cab = mesh(new THREE.BoxGeometry(1.3, 1.1, 1.2), MAT.darkWood, 10.9, 0.55, -1.4);
    hides.push({ id: 'merdiven_alti', room: 'merdiven', floor: 0, x: 10.6, obj: cab, label: 'Merdiven altı dolabı' });
    addHot('hide_merdiven_alti', cab, 'merdiven', 10.6, 0, 0, { hide: true });
  }

  // ---------- AVLU ----------
  {
    // taş duvar ve bahçe kapısı
    box(MAT.stone, 0.4, 1.4, 4, -15.8, 0, -0.5);
    box(MAT.stone, 7.6, 1.4, 0.4, -12, 0, -2.6);
    const gate = new THREE.Group();
    gate.position.set(-15.6, 0, 1.6);
    for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.08, 1.2, 0.12), MAT.darkWood, 0, 0.6, -0.45 + i * 0.22, gate);
    mesh(new THREE.BoxGeometry(0.08, 0.1, 1.0), MAT.darkWood, 0, 0.9, 0, gate);
    scene.add(gate);
    props.gate = gate;
    addHot('kapi_avlu', gate, 'avlu', -14.6, 0, 1.2);
    // çınar ağacı
    const tree = new THREE.Group();
    tree.position.set(-12.8, 0, -1.4);
    const trunk = mesh(new THREE.CylinderGeometry(0.45, 0.7, 5.5, 10), MAT.trunk, 0, 2.75, 0, tree);
    trunk.rotation.z = 0.05;
    for (let i = 0; i < 9; i++) {
      const s = 1.6 + rnd() * 1.4;
      const m = mesh(new THREE.IcosahedronGeometry(s, 1), i % 2 ? MAT.leaf : MAT.leaf2, (rnd() - 0.5) * 4, 5.6 + rnd() * 2.5, (rnd() - 0.5) * 2.5, tree);
      m.scale.y = 0.75;
    }
    scene.add(tree);
    props.tree = tree;
    hides.push({ id: 'cinar', room: 'avlu', floor: 0, x: -12.2, obj: trunk, label: 'Çınarın arkası' });
    addHot('hide_cinar', trunk, 'avlu', -12.2, 0, 0, { hide: true });
    // saksılar, çiçek tarhı
    for (let i = 0; i < 5; i++) {
      const x = -11.6 + i * 0.7;
      mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 10), MAT.copper, x, 0.16, -2.1);
      for (let k = 0; k < 3; k++) mesh(new THREE.IcosahedronGeometry(0.11, 0), [MAT.red, M(0xe8d040), M(0xd05aa0)][(i + k) % 3], x + (k - 1) * 0.08, 0.42 + k * 0.04, -2.1);
    }
    // hortum (makara)
    const hose = new THREE.Group();
    hose.position.set(-10.2, 0, -1.6);
    mesh(new THREE.TorusGeometry(0.32, 0.07, 8, 20), M(0x3a8a3a), 0, 0.5, 0, hose);
    mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), MAT.darkWood, 0, 0.4, -0.1, hose);
    scene.add(hose);
    props.hose = hose;
    addHot('hortum', hose, 'avlu', -10.6, 0, 0);
    // boya kovası (bölüm 2)
    if (ep === 2) {
      const pail = mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.34, 12), MAT.white, -9.0, 0.17, -0.9);
      addHot('item_boya', pail, 'avlu', -9.0, 0, 0, { item: 'boya' });
      // iskele
      for (const x of [-7.6, -7.0]) box(MAT.darkWood, 0.08, 6.4, 0.08, x, 0, 2.9);
    }
    // sokak kedileri
    props.cats = [];
    for (let i = 0; i < 3; i++) {
      const cat = makeCat([0xe8a040, 0x2a2a2a, 0xf0f0f0][i]);
      cat.position.set(-17.5 - i * 0.6, 0, 1.2 + i * 0.3);
      cat.rotation.y = Math.PI / 2;
      scene.add(cat);
      props.cats.push(cat);
    }
  }

  // ---------- MUTFAK ----------
  {
    // tezgâh ve raflar
    box(MAT.wood, 4.8, 0.9, 0.8, -5.4, 0, -2.0);
    box(MAT.white, 4.9, 0.06, 0.85, -5.4, 0.9, -2.0);
    box(MAT.darkWood, 3.2, 0.06, 0.35, -5.8, 2.0, -2.2);
    box(MAT.darkWood, 3.2, 0.06, 0.35, -5.8, 2.6, -2.2);
    // kavanozlar ve tabaklar
    for (let i = 0; i < 6; i++) mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 10), [MAT.glass, MAT.copper, MAT.red][i % 3], -7.0 + i * 0.45, 2.18, -2.2);
    for (let i = 0; i < 4; i++) {
      const p = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16), MAT.blue, -6.6 + i * 0.5, 2.8, -2.28);
      p.rotation.x = Math.PI / 2 - 0.2;
    }
    // semaver (çay)
    const sem = new THREE.Group();
    sem.position.set(-4.2, 0.93, -1.9);
    mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.5, 14), MAT.brass, 0, 0.25, 0, sem);
    mesh(new THREE.SphereGeometry(0.16, 12, 8), MAT.brass, 0, 0.55, 0, sem);
    mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.18, 12), M(0xe8e0d0), 0, 0.74, 0, sem);
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), MAT.brass, 0.2, 0.2, 0.05, sem).rotation.z = 1.2;
    scene.add(sem);
    addHot('semaver', sem, 'mutfak', -4.2, 0, 0);
    // tuzluk
    const salt = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 10), M(0xf4f4f4, { roughness: 0.3 }), -6.2, 2.11, -2.15);
    addHot('item_tuz', salt, 'mutfak', -6.2, 0, 0, { item: 'tuz' });
    // pul biber (bölüm 2)
    if (ep === 2) {
      const chili = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10), MAT.red, -6.9, 2.71, -2.15);
      addHot('item_biber', chili, 'mutfak', -6.9, 0, 0, { item: 'biber' });
    }
    // masa ve yoğurt
    box(MAT.wood, 1.6, 0.06, 0.9, -3.0, 0.75, -0.4);
    for (const [dx, dz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) box(MAT.darkWood, 0.06, 0.75, 0.06, -3.0 + dx, 0, -0.4 + dz);
    const yog = mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.12, 14), M(0xf4f0e8), -3.2, 0.87, -0.4);
    addHot('yogurt', yog, 'mutfak', -3.2, 0, 0);
    // ocak
    box(MAT.black, 0.9, 0.9, 0.8, -2.0, 0, -2.0);
    // dolap (saklanma)
    const cup = new THREE.Group();
    cup.position.set(-7.3, 0, -1.6);
    mesh(new THREE.BoxGeometry(1.1, 2.4, 0.9), MAT.wood, 0, 1.2, 0, cup);
    mesh(new THREE.BoxGeometry(0.04, 2.2, 0.02), MAT.darkWood, 0, 1.2, 0.46, cup);
    mesh(new THREE.SphereGeometry(0.04, 6, 4), MAT.brass, 0.12, 1.2, 0.47, cup);
    scene.add(cup);
    hides.push({ id: 'dolap', room: 'mutfak', floor: 0, x: -7.0, obj: cup, label: 'Mutfak dolabı' });
    addHot('hide_dolap', cup, 'mutfak', -7.0, 0, 0, { hide: true });
    // kilim
    const k = mesh(new THREE.PlaneGeometry(2.2, 1.2), MAT.kilim2, -3.0, 0.01, 0.9);
    k.rotation.x = -Math.PI / 2;
    // sarkan lamba
    hangingLamp(-4.5, 3.2, 0xffd8a0);
  }

  // ---------- SALON ----------
  {
    // minder/sedir
    box(MAT.red, 3.4, 0.45, 0.9, 1.8, 0, -1.9);
    box(MAT.kilim1, 3.4, 0.6, 0.15, 1.8, 0.45, -2.3);
    const k = mesh(new THREE.PlaneGeometry(4.2, 2.2), MAT.kilim1, 2.4, 0.01, 0.4);
    k.rotation.x = -Math.PI / 2;
    // taşınma kutuları
    props.boxes = [];
    for (let i = 0; i < 4; i++) {
      const b = mesh(new THREE.BoxGeometry(0.7, 0.55, 0.6), M(0xc8a070), 0.6 + (i % 2) * 0.8, 0.28 + Math.floor(i / 2) * 0.56, 1.3 - (i % 2) * 0.1);
      b.rotation.y = (rnd() - 0.5) * 0.3;
      props.boxes.push(b);
    }
    // sandalye (şaka)
    const chair = new THREE.Group();
    chair.position.set(3.6, 0, -0.6);
    mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), MAT.wood, 0, 0.5, 0, chair);
    mesh(new THREE.BoxGeometry(0.6, 0.7, 0.08), MAT.wood, 0, 0.88, -0.27, chair);
    const legs = [];
    for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) legs.push(mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), MAT.darkWood, dx, 0.25, dz, chair));
    scene.add(chair);
    props.chair = chair;
    props.chairLeg = legs[3];
    addHot('sandalye', chair, 'salon', 3.6, 0, 0);
    // gazete masası
    box(MAT.darkWood, 0.6, 0.55, 0.6, 4.4, 0, -0.9);
    // televizyon (eski tüplü)
    const tv = new THREE.Group();
    tv.position.set(5.8, 0, -2.0);
    mesh(new THREE.BoxGeometry(1.2, 0.6, 0.6), MAT.darkWood, 0, 0.3, 0, tv);
    mesh(new THREE.BoxGeometry(1.0, 0.8, 0.7), M(0x3a3430), 0, 1.0, 0, tv);
    const scr = mesh(new THREE.PlaneGeometry(0.78, 0.58), MAT.screen, 0, 1.02, 0.36, tv);
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), MAT.black, 0.2, 1.6, 0, tv).rotation.z = 0.5;
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), MAT.black, -0.2, 1.6, 0, tv).rotation.z = -0.5;
    scene.add(tv);
    props.tvScreen = scr;
    // sehpa ve kumanda
    box(MAT.wood, 0.9, 0.42, 0.6, 5.0, 0, -0.5);
    const remote = mesh(new THREE.BoxGeometry(0.22, 0.04, 0.07), MAT.black, 5.0, 0.45, -0.5);
    addHot('kumanda', remote, 'salon', 5.0, 0, 0);
    // kapı (bölüm 2: boya kovası şakası, mutfak-salon kapısının üstü)
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.2), new THREE.MeshStandardMaterial({ transparent: true, opacity: 0 }));
    door.position.set(-0.8, 2.1, 0.3);
    scene.add(door);
    if (ep === 2) addHot('kapi', door, 'salon', -0.4, 0, 0);
    props.paintBucket = mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.34, 12), MAT.white, -0.75, 2.28, 0.3);
    props.paintBucket.visible = false;
    // perde (saklanma)
    const cur = new THREE.Group();
    cur.position.set(0.6, 0, -2.25);
    for (const s of [-1, 1]) {
      const c = mesh(new THREE.BoxGeometry(0.5, 2.7, 0.12), M(0x8a2a3a, { roughness: 1 }), s * 0.95, 1.35, 0.1, cur);
      c.scale.z = 1.3;
    }
    scene.add(cur);
    hides.push({ id: 'perde', room: 'salon', floor: 0, x: 0.0, obj: cur, label: 'Salon perdesi' });
    addHot('hide_perde', cur, 'salon', 0.0, 0, 0, { hide: true });
    // duvar saati, tablo
    const wc = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20), MAT.brass, 3.4, 2.4, -2.38);
    wc.rotation.x = Math.PI / 2;
    box(MAT.darkWood, 1.0, 0.7, 0.05, 7.2, 1.8, -2.38);
    hangingLamp(2.6, 3.2, 0xffd0a0);
  }

  // ---------- ÜST KAT ----------
  const Y = FLOOR2;
  if (ep !== 2) {
    // BANYO
    box(MAT.white, 1.4, 0.5, 0.9, -7.0, Y, -1.8); // küvet
    const show = new THREE.Group();
    show.position.set(-5.6, Y, -2.1);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), MAT.brass, 0, 1.1, 0, show);
    mesh(new THREE.CylinderGeometry(0.18, 0.1, 0.1, 12), MAT.brass, 0, 2.2, 0.15, show);
    const valve = mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12), MAT.red, 0.2, 1.2, 0.05, show);
    scene.add(show);
    props.showerHead = show;
    props.valve = valve;
    addHot('vana', show, 'banyo', -5.6, 0, 0);
    box(MAT.white, 0.7, 0.85, 0.5, -3.4, Y, -2.1); // lavabo
    const soapM = mesh(new THREE.BoxGeometry(0.16, 0.06, 0.1), M(0xf0c8e0), -3.4, Y + 0.89, -2.0);
    addHot('item_sabun', soapM, 'banyo', -3.4, 0, 0, { item: 'sabun' });
    const mirror = mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0xd8e8f0, metalness: 0.9, roughness: 0.05 }), -3.4, Y + 1.6, -2.38);
    void mirror;
    const bcab = mesh(new THREE.BoxGeometry(0.9, 2.2, 0.8), MAT.white, -2.6, Y + 1.1, -1.7);
    hides.push({ id: 'banyo_dolap', room: 'banyo', floor: 1, x: -2.8, obj: bcab, label: 'Havlu dolabı' });
    addHot('hide_banyo_dolap', bcab, 'banyo', -2.8, 1, 0, { hide: true });
    hangingLamp(-5, Y + 3.0, 0xe8f0ff);
    // YATAK ODASI
    box(MAT.darkWood, 2.4, 0.5, 1.6, 2.4, Y, -1.5); // yatak
    box(MAT.white, 2.3, 0.18, 1.5, 2.4, Y + 0.5, -1.5);
    box(MAT.blue, 1.6, 0.12, 1.52, 2.8, Y + 0.68, -1.5);
    box(MAT.white, 0.6, 0.18, 0.8, 1.4, Y + 0.68, -1.5);
    box(MAT.darkWood, 0.5, 0.55, 0.45, 3.9, Y, -2.0); // komodin
    const clock = new THREE.Group();
    clock.position.set(3.9, Y + 0.55, -2.0);
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 14), MAT.red, 0, 0.14, 0, clock).rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(0.05, 6, 4), MAT.brass, -0.08, 0.27, 0, clock);
    mesh(new THREE.SphereGeometry(0.05, 6, 4), MAT.brass, 0.08, 0.27, 0, clock);
    scene.add(clock);
    props.clock = clock;
    addHot('saat', clock, 'yatak', 3.6, 1, 0);
    const ward = new THREE.Group();
    ward.position.set(6.9, Y, -1.6);
    mesh(new THREE.BoxGeometry(1.3, 2.6, 0.9), MAT.wood, 0, 1.3, 0, ward);
    mesh(new THREE.BoxGeometry(0.04, 2.4, 0.02), MAT.darkWood, 0, 1.3, 0.46, ward);
    scene.add(ward);
    hides.push({ id: 'gardirop', room: 'yatak', floor: 1, x: 6.6, obj: ward, label: 'Gardırop' });
    addHot('hide_gardirop', ward, 'yatak', 6.6, 1, 0, { hide: true });
    const k = mesh(new THREE.PlaneGeometry(3, 1.6), MAT.kilim2, 2.8, Y + 0.01, 0.8);
    k.rotation.x = -Math.PI / 2;
    hangingLamp(3, Y + 3.0, 0xffd8b0);
  } else {
    // ÇALIŞMA ODASI (tadilat): toz örtüleri, iskele, plan masası, matkap
    box(MAT.wood, 2.2, 0.06, 1.1, -4.4, Y + 0.85, -1.2);
    for (const [dx, dz] of [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]]) box(MAT.darkWood, 0.06, 0.85, 0.06, -4.4 + dx, Y, -1.2 + dz);
    const plan = mesh(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshStandardMaterial({ map: canvasTex(256, 144, (x, w, h) => {
      x.fillStyle = '#2a5a9a'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#e8f0ff'; x.lineWidth = 2;
      for (let i = 0; i < 6; i++) x.strokeRect(10 + i * 40, 20, 34, 50 + (i % 2) * 30);
      x.fillStyle = '#e8f0ff'; x.font = 'bold 18px sans-serif'; x.fillText('OTEL NECMİ', 70, 130);
    }) }), -4.4, Y + 0.9, -1.2);
    plan.rotation.x = -Math.PI / 2;
    props.plan = plan;
    addHot('plan', plan, 'calisma', -4.4, 1, 0);
    // matkap ve tezgâh
    box(MAT.darkWood, 1.6, 0.8, 0.7, 1.6, Y, -1.9);
    const drill = new THREE.Group();
    drill.position.set(1.4, Y + 0.85, -1.8);
    mesh(new THREE.BoxGeometry(0.34, 0.14, 0.12), M(0xe0a020), 0, 0.1, 0, drill);
    mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), MAT.black, -0.08, -0.02, 0, drill);
    mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), MAT.brass, 0.26, 0.1, 0, drill).rotation.z = Math.PI / 2;
    scene.add(drill);
    props.drill = drill;
    addHot('matkap', drill, 'calisma', 1.4, 1, 0);
    // toz örtülü mobilya, yıkık bölme duvar parçaları
    for (const [x, w, h] of [[4.6, 1.8, 1.0], [6.4, 1.2, 1.6]]) box(M(0xe8e4dc, { roughness: 1 }), w, h, 1.0, x, Y, -1.6);
    for (let i = 0; i < 8; i++) {
      const g = new THREE.BoxGeometry(0.3 + rnd() * 0.4, 0.12, 0.2 + rnd() * 0.3);
      g.rotateY(rnd() * 3);
      g.translate(-2 + rnd() * 1.4, Y + 0.06, -0.5 + rnd() * 1.6);
      batch(MAT.plaster, g);
    }
    const cur = new THREE.Group();
    cur.position.set(-7.2, Y, -1.8);
    mesh(new THREE.BoxGeometry(0.9, 2.8, 0.5), M(0xd8d0c0, { roughness: 1 }), 0, 1.4, 0, cur);
    scene.add(cur);
    hides.push({ id: 'ortu', room: 'calisma', floor: 1, x: -7.0, obj: cur, label: 'Toz örtüsü' });
    addHot('hide_ortu', cur, 'calisma', -7.0, 1, 0, { hide: true });
    hangingLamp(-2, Y + 3.0, 0xfff0d0);
    hangingLamp(4, Y + 3.0, 0xfff0d0);
  }

  function hangingLamp(x, y, color) {
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), MAT.black, x, y - 0.3, 0);
    const shade = mesh(new THREE.ConeGeometry(0.3, 0.25, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8c080, side: THREE.DoubleSide, emissive: 0x8a5a20, emissiveIntensity: 0.4 }), x, y - 0.68, 0);
    void shade;
    const L = new THREE.PointLight(color, 9, 9, 1.6);
    L.position.set(x, y - 0.85, 0.3);
    scene.add(L);
    lights.push(L);
  }

  // ---------- birleştir ----------
  for (const [mat, geos] of batches) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }

  return { hot, hides, props, rooms, animated, sky: skyU, update(dt, t) { for (const f of animated) f(dt, t); } };
}
const lights = [];

function makeCat(color) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), fur);
  b.rotation.z = Math.PI / 2;
  b.position.y = 0.22;
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), fur);
  h.position.set(0.28, 0.32, 0);
  g.add(b, h);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), fur);
    e.position.set(0.3, 0.44, s * 0.06);
    g.add(e);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: 0x4ad04a }));
    eye.position.set(0.38, 0.34, s * 0.045);
    g.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 6), fur);
  tail.position.set(-0.3, 0.36, 0);
  tail.rotation.z = -0.6;
  g.add(tail);
  for (const [dx, dz] of [[-0.12, -0.06], [-0.12, 0.06], [0.12, -0.06], [0.12, 0.06]]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 5), fur);
    l.position.set(dx, 0.08, dz);
    g.add(l);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}
