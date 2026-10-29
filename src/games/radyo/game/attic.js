import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// TAVAN ARASI — çatı katı. Mahya z ekseni boyunca; eğimler ±x yönünde.
// Arka alınlık duvarı z=−3.5 (yuvarlak pencere), kamera önde (z≈+3).

const W = 5, D = 3.5, EAVE = 0.8, RIDGE = 3.6;
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function tex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...rep);
  t.anisotropy = 8;
  return t;
}
function woodTex(base, dark, rep) {
  return tex(256, 256, (x, w, h) => {
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      x.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.1})`;
      x.fillRect(0, i * 43, w, 43);
      x.fillStyle = dark;
      x.fillRect(0, i * 43, w, 2);
      for (let k = 0; k < 16; k++) {
        x.strokeStyle = `rgba(40,20,8,${0.06 + rnd() * 0.08})`;
        x.beginPath();
        const y = i * 43 + 4 + rnd() * 36;
        x.moveTo(0, y);
        x.bezierCurveTo(w * 0.3, y + rnd() * 6 - 3, w * 0.7, y + rnd() * 6 - 3, w, y);
        x.stroke();
      }
    }
  }, rep);
}

// Fotoğraf dokusu: sepya, basit siluetler, altında yazı
export function photoTex(kind, S = {}) {
  return tex(256, 320, (x, w, h) => {
    x.fillStyle = '#efe4cc';
    x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, 0, 250);
    g.addColorStop(0, '#c8b490');
    g.addColorStop(1, '#8a7456');
    x.fillStyle = g;
    x.fillRect(16, 16, w - 32, 236);
    const person = (cx, scale = 1, tone = '#4a3a2a', hat = false, saz = false, fade = 1) => {
      x.globalAlpha = fade;
      x.fillStyle = tone;
      x.beginPath();
      x.arc(cx, 110 - (1 - scale) * 40, 18 * scale, 0, Math.PI * 2);
      x.fill();
      x.beginPath();
      x.moveTo(cx - 26 * scale, 250);
      x.quadraticCurveTo(cx - 30 * scale, 140, cx, 132 - (1 - scale) * 40);
      x.quadraticCurveTo(cx + 30 * scale, 140, cx + 26 * scale, 250);
      x.fill();
      if (hat) x.fillRect(cx - 20 * scale, 88 - (1 - scale) * 40, 40 * scale, 8);
      if (saz) {
        x.strokeStyle = '#2a1a0a';
        x.lineWidth = 5;
        x.beginPath();
        x.moveTo(cx - 40, 210);
        x.lineTo(cx + 46, 120);
        x.stroke();
        x.fillStyle = '#6a4a28';
        x.beginPath();
        x.ellipse(cx - 30, 205, 22, 14, -0.8, 0, Math.PI * 2);
        x.fill();
      }
      x.globalAlpha = 1;
    };
    let cap = '';
    if (kind === 'saz') {
      person(128, 1, '#4a3a2a', false, true);
      cap = S.music ? 'İstanbul, 1975' : 'Son çalışım, 1974';
    } else if (kind === 'aile') {
      if (!S.runaway) person(70, 1.05, '#3a2a1a', true);
      person(128, 0.95, '#5a4a3a');
      person(186, 0.9, '#6a5040');
      cap = S.runaway ? 'Aile, 1985 — (büyük dedem yok)' : 'Aile, 1985';
    } else if (kind === 'dugun') {
      person(100, 1, '#2a2a2a');
      if (!S.paradox) {
        x.fillStyle = '#f8f4ec';
        x.beginPath();
        x.moveTo(130, 250);
        x.quadraticCurveTo(150, 140, 160, 125);
        x.quadraticCurveTo(170, 140, 196, 250);
        x.fill();
        x.beginPath();
        x.arc(160, 108, 17, 0, Math.PI * 2);
        x.fill();
      }
      cap = S.paradox ? '…, 1978' : 'Ali & Leyla, 1978';
    } else if (kind === 'ece') {
      person(128, 0.7, '#5a4a6a', false, false, S.paradox ? 0.15 : 1);
      cap = S.paradox ? '' : 'Ece, 2008 — dedesinin kucağında';
    } else if (kind === 'tersane') {
      x.fillStyle = '#5a5a60';
      x.fillRect(30, 60, 196, 150);
      x.fillStyle = '#3a3a40';
      for (let i = 0; i < 5; i++) x.fillRect(40 + i * 38, 40, 8, 180);
      person(128, 0.8, '#2a2a30', true);
      cap = 'Haliç Tersanesi, 1975';
    } else if (kind === 'konser') {
      person(100, 1, '#3a2a1a', false, true);
      x.fillStyle = '#f8f4ec';
      x.beginPath();
      x.arc(176, 108, 16, 0, Math.PI * 2);
      x.fill();
      x.fillRect(160, 130, 32, 120);
      cap = 'Konserden sonra, 9 Mayıs 1977';
    }
    x.fillStyle = '#3a2a1a';
    x.font = 'italic 22px Georgia, serif';
    x.textAlign = 'center';
    x.fillText(cap, w / 2, 290);
  });
}

function posterTex(kind) {
  return tex(256, 360, (x, w, h) => {
    if (kind === 'afis') {
      x.fillStyle = '#e8d4a0';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#a82a1e';
      x.fillRect(0, 0, w, 70);
      x.fillStyle = '#f8ecd0';
      x.font = 'bold 26px Georgia, serif';
      x.textAlign = 'center';
      x.fillText('GENÇ SESLER', w / 2, 32);
      x.fillText('GECESİ', w / 2, 60);
      x.fillStyle = '#2a1a0a';
      x.font = 'bold 30px Georgia, serif';
      x.fillText('Ali Yıldırım', w / 2, 140);
      x.font = '20px Georgia, serif';
      x.fillText('ve Sazı', w / 2, 168);
      x.font = 'bold 24px Georgia, serif';
      x.fillText('9 Mayıs 1977', w / 2, 240);
      x.fillText('Saat 17.00', w / 2, 270);
      x.font = '18px Georgia, serif';
      x.fillText('Ankara Halkevi', w / 2, 300);
      x.fillStyle = '#c02020';
      x.font = 'italic bold 22px Georgia, serif';
      x.save();
      x.translate(190, 330);
      x.rotate(-0.25);
      x.fillText('Bitince koş!', 0, 0);
      x.restore();
    } else if (kind === 'iptal') {
      x.drawImage(posterTex('afis').image, 0, 0);
      x.save();
      x.translate(w / 2, h / 2);
      x.rotate(-0.4);
      x.strokeStyle = '#c02020';
      x.lineWidth = 8;
      x.strokeRect(-100, -34, 200, 68);
      x.fillStyle = '#c02020';
      x.font = 'bold 50px sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('İPTAL', 0, 2);
      x.restore();
    } else if (kind === 'vardiya') {
      x.fillStyle = '#d8dce0';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#2a3a5a';
      x.fillRect(0, 0, w, 50);
      x.fillStyle = '#fff';
      x.font = 'bold 22px monospace';
      x.textAlign = 'center';
      x.fillText('HALİÇ TERSANESİ', w / 2, 32);
      x.fillStyle = '#1a1a1a';
      x.font = '20px monospace';
      x.textAlign = 'left';
      ['Ad: Ali Yıldırım', 'Sicil: 4471', '', '9.5.1977', 'Fazla mesai', '16.00 - 20.00'].forEach((l, i) => x.fillText(l, 20, 100 + i * 34));
    } else if (kind === 'harman') {
      x.fillStyle = '#f4ecd8';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#a82a1e';
      x.fillRect(0, 0, w, 60);
      x.fillStyle = '#fff';
      x.font = 'bold 30px Georgia, serif';
      x.textAlign = 'center';
      x.fillText('MAYIS 1977', w / 2, 42);
      x.fillStyle = '#1a1a1a';
      x.font = 'bold 120px Georgia, serif';
      x.fillText('9', w / 2, 200);
      x.font = 'italic 24px Georgia, serif';
      x.fillText('Harman günü', w / 2, 260);
    }
  });
}

function paperTex(lines) {
  return tex(256, 320, (x, w, h) => {
    x.fillStyle = '#efe2c4';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(90,120,170,0.35)';
    for (let i = 0; i < 12; i++) {
      x.beginPath();
      x.moveTo(10, 40 + i * 24);
      x.lineTo(w - 10, 40 + i * 24);
      x.stroke();
    }
    x.fillStyle = '#2a2a5a';
    x.font = 'italic 20px Georgia, serif';
    lines.forEach((l, i) => x.fillText(l, 18, 36 + i * 24));
  });
}

export function buildAttic(scene) {
  const batches = new Map();
  const hot = {};
  const variants = []; // { obj, show: (S, night) => bool }
  const anim = [];
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
  const MAT = {
    floor: new THREE.MeshStandardMaterial({ map: woodTex('#8a6240', '#3a2210', [3, 3]), roughness: 0.85 }),
    roof: new THREE.MeshStandardMaterial({ map: woodTex('#9a7a54', '#4a3218', [2, 4]), roughness: 0.9 }),
    wall: new THREE.MeshStandardMaterial({ map: woodTex('#7a5a3a', '#3a2412', [2, 2]), roughness: 0.9 }),
    beam: M(0x4a3020, { roughness: 0.9 }),
    wood: M(0x7a5232),
    dark: M(0x3a2414),
    cloth: M(0xd8d0c0, { roughness: 1 }),
    brass: M(0xc8983a, { metalness: 0.75, roughness: 0.3 }),
    tin: M(0x8a9aa0, { metalness: 0.6, roughness: 0.4 }),
    red: M(0x8a2a22),
  };
  function batch(mat, g) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g.index ? g.toNonIndexed() : g);
  }
  function box(mat, w, h, d, x, y, z, ry = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
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
  function addHot(id, obj, view) {
    obj.traverse((o) => (o.userData.hot = id));
    (hot[id] ||= { id, objs: [], view }).objs.push(obj);
  }

  // ---------- oda ----------
  box(MAT.floor, W * 2, 0.1, D * 2, 0, -0.1, 0);
  for (const s of [-1, 1]) {
    const len = Math.hypot(W, RIDGE - EAVE);
    const g = new THREE.BoxGeometry(len, 0.08, D * 2 + 0.4);
    g.rotateZ(-s * Math.atan2(RIDGE - EAVE, W));
    g.translate((s * W) / 2, (RIDGE + EAVE) / 2, 0);
    batch(MAT.roof, g);
    box(MAT.wall, 0.1, EAVE, D * 2, s * W, 0, 0); // diz duvarı
    // çatı kirişleri
    for (let i = 0; i < 6; i++) {
      const z = -D + 0.3 + i * 1.3;
      const b = new THREE.BoxGeometry(len, 0.16, 0.12);
      b.rotateZ(-s * Math.atan2(RIDGE - EAVE, W));
      b.translate((s * W) / 2, (RIDGE + EAVE) / 2 - 0.12, z);
      batch(MAT.beam, b);
    }
  }
  box(MAT.beam, 0.2, 0.2, D * 2, 0, RIDGE - 0.25, 0); // mahya kirişi
  // arka alınlık duvarı (üçgen) ve yuvarlak pencere
  {
    const sh = new THREE.Shape();
    sh.moveTo(-W, 0);
    sh.lineTo(W, 0);
    sh.lineTo(W, EAVE);
    sh.lineTo(0, RIDGE);
    sh.lineTo(-W, EAVE);
    sh.lineTo(-W, 0);
    const hole = new THREE.Path();
    hole.absarc(0, 2.35, 0.42, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    const g = new THREE.ShapeGeometry(sh);
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * 0.25, p.getY(i) * 0.25);
    const wall = new THREE.Mesh(g, MAT.wall);
    wall.position.z = -D;
    wall.receiveShadow = true;
    scene.add(wall);
    const ring = mesh(new THREE.TorusGeometry(0.44, 0.06, 8, 28), MAT.dark, 0, 2.35, -D + 0.02);
    void ring;
    for (const a of [0, Math.PI / 2]) {
      const bar = mesh(new THREE.BoxGeometry(0.86, 0.04, 0.04), MAT.dark, 0, 2.35, -D + 0.02);
      bar.rotation.z = a;
    }
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), new THREE.MeshBasicMaterial({ color: 0x5a6a9a }));
    glass.position.set(0, 2.35, -D - 0.02);
    scene.add(glass);
    // ay ışığı huzmesi: pencereden yere uzanan, uca doğru solan koni
    const A = new THREE.Vector3(0, 2.35, -D + 0.05), B = new THREE.Vector3(0.35, 0.0, -0.9);
    const len = A.distanceTo(B);
    const bg = new THREE.CylinderGeometry(0.4, 0.95, len, 24, 8, true);
    const col = new Float32Array(bg.attributes.position.count * 3);
    for (let i = 0; i < bg.attributes.position.count; i++) {
      const k = 0.5 + bg.attributes.position.getY(i) / len; // 1 = pencere
      const v = Math.pow(k, 1.6);
      col[i * 3] = v * 0.6;
      col[i * 3 + 1] = v * 0.7;
      col[i * 3 + 2] = v;
    }
    bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    beam.position.copy(A).add(B).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), A.clone().sub(B).normalize());
    scene.add(beam);
    anim.push((dt, t) => (beam.material.opacity = 0.085 + Math.sin(t * 0.4) * 0.02));
  }
  // dikmeler
  for (const x of [-3.2, 3.2]) for (const z of [-2.4, 0.6]) box(MAT.beam, 0.16, 1.6, 0.16, x, 0, z);

  // ---------- RADYO masası (sol arka) ----------
  box(MAT.wood, 1.5, 0.06, 0.8, -2.6, 0.74, -2.6);
  for (const [dx, dz] of [[-0.68, -0.34], [0.68, -0.34], [-0.68, 0.34], [0.68, 0.34]]) box(MAT.dark, 0.06, 0.74, 0.06, -2.6 + dx, 0, -2.6 + dz);
  box(M(0x8a2a2a, { roughness: 1 }), 1.3, 0.01, 0.6, -2.6, 0.8, -2.6); // masa örtüsü
  const radio = new THREE.Group();
  radio.position.set(-2.75, 0.81, -2.65);
  radio.rotation.y = 0.25;
  {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.28), M(0x5a3418, { roughness: 0.5 }));
    body.position.y = 0.19;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.62, 24, 1, false, 0, Math.PI), M(0x5a3418, { roughness: 0.5 }));
    top.rotation.z = Math.PI / 2;
    top.rotation.y = Math.PI / 2;
    top.scale.set(1, 1, 1);
    top.position.set(0, 0.38, 0);
    top.rotation.set(0, 0, Math.PI / 2);
    const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.24), new THREE.MeshStandardMaterial({ map: tex(64, 64, (x) => {
      x.fillStyle = '#c8b080';
      x.fillRect(0, 0, 64, 64);
      x.strokeStyle = '#8a7048';
      for (let i = 0; i < 64; i += 4) {
        x.beginPath();
        x.moveTo(i, 0);
        x.lineTo(i, 64);
        x.stroke();
      }
    }), roughness: 1 }));
    grill.position.set(-0.12, 0.2, 0.141);
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.09), new THREE.MeshStandardMaterial({ color: 0x2a1a08, emissive: 0xffa040, emissiveIntensity: 0.25 }));
    dial.position.set(0.17, 0.26, 0.141);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.08, 0.002), M(0xc02010));
    needle.position.set(0.1, 0.26, 0.143);
    const knobs = [];
    for (const x of [0.11, 0.23]) {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.03, 14), MAT.brass);
      k.rotation.x = Math.PI / 2;
      k.position.set(x, 0.12, 0.155);
      knobs.push(k);
    }
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), new THREE.MeshStandardMaterial({ map: tex(64, 40, (x) => {
      x.fillStyle = '#e8d8a8';
      x.fillRect(0, 0, 64, 40);
      x.fillStyle = '#3a2a1a';
      x.font = 'italic 12px Georgia';
      x.fillText('Ali — 7.4', 6, 24);
    }) }));
    label.position.set(0.312, 0.2, 0);
    label.rotation.y = Math.PI / 2;
    radio.add(body, top, grill, dial, needle, ...knobs, label);
    radio.traverse((o) => o.isMesh && (o.castShadow = true));
    radio.userData = { dial, needle, knobs, label };
    scene.add(radio);
    addHot('radyo', body, 'radyo');
    addHot('radyo', top, 'radyo');
    addHot('radyo', grill, 'radyo');
    addHot('radyo', dial, 'radyo');
    addHot('frekans1', label, 'radyo');
    const glow = new THREE.PointLight(0xffa040, 0, 2.2, 1.6);
    glow.position.set(-2.6, 1.1, -2.3);
    scene.add(glow);
    radio.userData.glow = glow;
  }
  // günlük sayfası (masada)
  const diary = mesh(new THREE.PlaneGeometry(0.22, 0.28), new THREE.MeshStandardMaterial({ map: paperTex(['…', '…', '…']), roughness: 1 }), -2.1, 0.815, -2.45);
  diary.rotation.x = -Math.PI / 2;
  diary.rotation.z = 0.3;
  addHot('gunluk', diary, 'radyo');
  // masa lambası
  const lamp = new THREE.Group();
  lamp.position.set(-3.15, 0.8, -2.75);
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 12), MAT.brass, 0, 0.02, 0, lamp);
  mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), MAT.brass, 0, 0.18, 0, lamp);
  mesh(new THREE.ConeGeometry(0.12, 0.12, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a6a3a, side: THREE.DoubleSide, emissive: 0x2a4a2a, emissiveIntensity: 0.3 }), 0, 0.36, 0, lamp);
  scene.add(lamp);
  const lampL = new THREE.PointLight(0xffc880, 3.2, 5, 1.6);
  lampL.position.set(-3.1, 1.05, -2.6);
  lampL.castShadow = true;
  lampL.shadow.mapSize.set(512, 512);
  scene.add(lampL);

  // ---------- ARKA DUVAR: fotoğraflar, saz ve değişen eşyalar ----------
  const frames = {};
  function frame(id, kind, x, y, w = 0.32, h = 0.4) {
    const g = new THREE.Group();
    g.position.set(x, y, -D + 0.04);
    mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.03), MAT.dark, 0, 0, 0, g);
    const pic = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: photoTex(kind), roughness: 0.7 }), 0, 0, 0.018, g);
    scene.add(g);
    frames[id] = { g, pic, kind };
    return g;
  }
  addHot('foto_saz', frame('saz', 'saz', 0.9, 1.75), 'duvar');
  addHot('aile', frame('aile', 'aile', 1.5, 1.95, 0.42, 0.32), 'duvar');
  addHot('frekans2', frame('dugun', 'dugun', 2.1, 1.7), 'duvar');
  addHot('ece', frame('ece', 'ece', 1.5, 1.45, 0.26, 0.32), 'duvar');
  const tersane = frame('tersane', 'tersane', -0.9, 1.75, 0.36, 0.3);
  variants.push({ obj: tersane, show: (S) => S.runaway });
  const konser = frame('konser', 'konser', -1.4, 1.35, 0.3, 0.38);
  variants.push({ obj: konser, show: (S) => S.best });

  // saz (bağlama): sağlam / kırık
  function saz(broken) {
    const g = new THREE.Group();
    g.position.set(-0.55, 1.35, -D + 0.08);
    g.rotation.z = 0.5;
    const bowl = mesh(new THREE.SphereGeometry(0.16, 20, 14), M(0x7a4a22, { roughness: 0.45 }), 0, -0.2, 0, g);
    bowl.scale.set(0.95, 1.45, 0.42);
    mesh(new THREE.CircleGeometry(0.04, 14), M(0x1a0e06), 0, -0.12, 0.07, g);
    const neck = mesh(new THREE.BoxGeometry(0.05, 0.75, 0.03), M(0x5a3418), 0, 0.3, 0.02, g);
    if (broken) neck.rotation.z = 0.12;
    mesh(new THREE.BoxGeometry(0.07, 0.12, 0.04), M(0x5a3418), broken ? 0.05 : 0, 0.72, 0.02, g);
    for (let i = 0; i < (broken ? 1 : 3); i++) mesh(new THREE.CylinderGeometry(0.002, 0.002, 1.0, 3), M(0xd8d0c0, { metalness: 0.8 }), (i - 1) * 0.012, 0.18, 0.05, g);
    scene.add(g);
    return g;
  }
  const sazOk = saz(false), sazBroken = saz(true);
  variants.push({ obj: sazOk, show: (S) => !S.music && !S.stayed && !S.runaway });
  variants.push({ obj: sazBroken, show: (S) => S.stayed });
  addHot('saz', sazOk, 'duvar');
  addHot('saz', sazBroken, 'duvar');
  // afişler / kartlar (2. gece ipuçları)
  function poster(kind, x, y, w, h) {
    const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: posterTex(kind), roughness: 0.9 }), x, y, -D + 0.05);
    return m;
  }
  const afis = poster('afis', -0.5, 1.55, 0.42, 0.58);
  variants.push({ obj: afis, show: (S) => S.music && !S.cancelled });
  addHot('afis', afis, 'duvar');
  const iptal = poster('iptal', -0.5, 1.55, 0.42, 0.58);
  variants.push({ obj: iptal, show: (S) => S.music && S.cancelled });
  const vard = poster('vardiya', -1.45, 1.35, 0.32, 0.45);
  variants.push({ obj: vard, show: (S) => S.runaway });
  addHot('vardiya', vard, 'duvar');
  const harm = poster('harman', -1.25, 1.45, 0.32, 0.45);
  variants.push({ obj: harm, show: (S) => S.stayed });
  addHot('harman', harm, 'duvar');

  // pikap (müzik yolunda)
  const pick = new THREE.Group();
  pick.position.set(0.9, 0, -2.6);
  mesh(new THREE.BoxGeometry(0.7, 0.55, 0.5), MAT.wood, 0, 0.275, 0, pick);
  mesh(new THREE.BoxGeometry(0.5, 0.06, 0.4), M(0x2a2a2a), 0, 0.58, 0, pick);
  const disc = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 28), M(0x0a0a0a, { roughness: 0.2 }), -0.03, 0.62, 0, pick);
  for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.32, 0.32, 0.01), [M(0xa83a2a), M(0x2a5a8a), M(0xd8a040)][i % 3], -0.2 + i * 0.012, 0.75, -0.18 + i * 0.01, pick).rotation.x = -0.2;
  scene.add(pick);
  variants.push({ obj: pick, show: (S) => S.music });
  anim.push((dt) => (disc.rotation.y += dt * 3.5));

  // ---------- SANDIK (sağ) ----------
  const trunk = new THREE.Group();
  trunk.position.set(2.7, 0, -1.2);
  trunk.rotation.y = -0.55;
  {
    const tm = M(0x6a3a1e, { roughness: 0.7 });
    mesh(new THREE.BoxGeometry(1.1, 0.05, 0.62), tm, 0, 0.025, 0, trunk);
    for (const z of [-0.29, 0.29]) mesh(new THREE.BoxGeometry(1.1, 0.55, 0.04), tm, 0, 0.275, z, trunk);
    for (const x of [-0.53, 0.53]) mesh(new THREE.BoxGeometry(0.04, 0.55, 0.62), tm, x, 0.275, 0, trunk);
    mesh(new THREE.BoxGeometry(1.02, 0.01, 0.54), M(0x2a1a10, { roughness: 1 }), 0, 0.05, 0, trunk);
  }
  for (const x of [-0.42, 0.42]) for (const z of [-0.315, 0.315]) mesh(new THREE.BoxGeometry(0.06, 0.56, 0.012), MAT.brass, x, 0.28, z, trunk);
  const lid = new THREE.Group();
  lid.position.set(0, 0.55, -0.31);
  trunk.add(lid);
  mesh(new THREE.BoxGeometry(1.1, 0.12, 0.62), M(0x6a3a1e, { roughness: 0.7 }), 0, 0.06, 0.31, lid);
  mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), MAT.brass, 0, 0.0, 0.63, lid);
  const ledger = mesh(new THREE.BoxGeometry(0.3, 0.05, 0.22), M(0x3a2a5a), 0.1, 0.5, 0.0, trunk);
  ledger.visible = false;
  const envelope = mesh(new THREE.BoxGeometry(0.2, 0.01, 0.12), M(0xe8dcc0), -0.2, 0.51, 0.06, trunk);
  envelope.visible = false;
  // eski kumaşlar
  mesh(new THREE.BoxGeometry(0.9, 0.1, 0.5), M(0x8a3a4a, { roughness: 1 }), 0, 0.42, 0, trunk);
  scene.add(trunk);
  addHot('sandik', trunk, 'sandik');
  addHot('defter', ledger, 'sandik');
  addHot('mektup', envelope, 'sandik');

  // ---------- raf ve teneke kutu (sol) ----------
  box(MAT.wood, 0.9, 0.04, 0.35, -3.95, 1.1, -0.6);
  box(MAT.wood, 0.9, 0.04, 0.35, -3.95, 1.5, -0.6);
  const tin = new THREE.Group();
  tin.position.set(-3.85, 1.14, -0.55);
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 18), new THREE.MeshStandardMaterial({ map: tex(128, 32, (x) => {
    x.fillStyle = '#2a6a8a';
    x.fillRect(0, 0, 128, 32);
    x.fillStyle = '#e8c060';
    for (let i = 0; i < 8; i++) {
      x.beginPath();
      x.arc(8 + i * 16, 16, 5, 0, Math.PI * 2);
      x.fill();
    }
  }), metalness: 0.5, roughness: 0.4 }), 0, 0.07, 0, tin);
  scene.add(tin);
  addHot('bilet', tin, 'raf');
  for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.06, 0.28, 0.2), [M(0x6a2a2a), M(0x2a4a2a), M(0x3a3a6a)][i % 3], -4.25 + i * 0.07, 1.68, -0.6);
  mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 10), M(0xa8b8c0, { transparent: true, opacity: 0.6 }), -3.6, 1.2, -0.62);

  // ---------- dolgu eşyalar ----------
  // sallanan sandalye
  const rock = new THREE.Group();
  rock.position.set(-0.9, 0, -0.4);
  rock.rotation.y = 0.6;
  mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), MAT.wood, 0, 0.45, 0, rock);
  mesh(new THREE.BoxGeometry(0.5, 0.7, 0.05), MAT.wood, 0, 0.85, -0.25, rock);
  for (const s of [-1, 1]) {
    const r = mesh(new THREE.TorusGeometry(0.45, 0.02, 6, 20, Math.PI * 0.6), MAT.dark, s * 0.22, 0.42, 0, rock);
    r.rotation.y = Math.PI / 2;
    r.rotation.z = Math.PI * 1.2;
  }
  mesh(new THREE.BoxGeometry(0.46, 0.1, 0.46), M(0x8a5a3a, { roughness: 1 }), 0, 0.5, 0, rock);
  scene.add(rock);
  anim.push((dt, t) => (rock.rotation.x = Math.sin(t * 0.6) * 0.03));
  // kutular, bavul, örtülü ayna
  for (const [x, z, s, ry] of [[3.6, 1.2, 0.6, 0.3], [3.9, 0.4, 0.5, -0.2], [3.7, 0.8, 0.4, 0.5], [-4.0, 1.4, 0.55, 0.2], [-3.4, 1.9, 0.45, -0.4]]) {
    const b = mesh(new THREE.BoxGeometry(s, s * 0.8, s), M(0xb8946a, { roughness: 1 }), x, s * 0.4, z);
    b.rotation.y = ry;
  }
  box(M(0x4a3a2a), 0.7, 0.22, 0.45, 3.5, 0.48, 1.0, 0.3);
  const mirror = new THREE.Group();
  mirror.position.set(4.0, 0, -0.6);
  mirror.rotation.y = -1.0;
  mesh(new THREE.BoxGeometry(0.8, 1.5, 0.06), MAT.dark, 0, 0.75, 0, mirror);
  const cloth = mesh(new THREE.BoxGeometry(0.9, 1.3, 0.1), MAT.cloth, 0, 0.9, 0.06, mirror);
  cloth.scale.z = 1.4;
  scene.add(mirror);
  // halı
  const rug = mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshStandardMaterial({ map: tex(256, 160, (x, w, h) => {
    x.fillStyle = '#7a2a20';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#d8a850';
    x.fillRect(10, 10, w - 20, h - 20);
    x.fillStyle = '#7a2a20';
    x.fillRect(20, 20, w - 40, h - 40);
    x.fillStyle = '#2a4a6a';
    for (let i = 0; i < 4; i++) {
      x.beginPath();
      const cx = 50 + i * 52, cy = h / 2;
      x.moveTo(cx, cy - 34);
      x.lineTo(cx + 20, cy);
      x.lineTo(cx, cy + 34);
      x.lineTo(cx - 20, cy);
      x.fill();
    }
  }), roughness: 1 }), 0.2, 0.005, -0.6);
  rug.rotation.x = -Math.PI / 2;
  // sarkan ampul
  mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 4), MAT.dark, 0.6, RIDGE - 0.6, -0.2);
  const bulb = mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe0a0 }), 0.6, RIDGE - 0.98, -0.2);
  const bulbL = new THREE.PointLight(0xffc888, 5, 9, 1.4);
  bulbL.position.copy(bulb.position);
  bulbL.castShadow = true;
  bulbL.shadow.mapSize.set(1024, 1024);
  bulbL.shadow.bias = -0.002;
  scene.add(bulbL);
  anim.push((dt, t) => {
    const f = 1 + (Math.sin(t * 13) > 0.97 ? -0.3 : 0);
    bulbL.intensity = 5 * f;
  });

  // fener (sandığın yanında) ve raf mumu
  {
    const lan = new THREE.Group();
    lan.position.set(3.55, 0.6, 0.95);
    mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.03, 10), MAT.dark, 0, 0.015, 0, lan);
    mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd8a0, emissive: 0xffa040, emissiveIntensity: 1.6, transparent: true, opacity: 0.85 }), 0, 0.11, 0, lan);
    mesh(new THREE.ConeGeometry(0.08, 0.06, 10), MAT.dark, 0, 0.22, 0, lan);
    scene.add(lan);
    const ll = new THREE.PointLight(0xffa850, 2.4, 5.5, 1.5);
    ll.position.set(3.55, 0.78, 0.95);
    scene.add(ll);
    anim.push((dt, t) => (ll.intensity = 2.3 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.08));
    const candle = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8), M(0xf0e8d0), -4.2, 1.18, -0.5);
    void candle;
    const flame = mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 }), -4.2, 1.27, -0.5);
    flame.scale.y = 1.8;
    const cl = new THREE.PointLight(0xffb060, 1.4, 3, 1.6);
    cl.position.set(-4.1, 1.35, -0.35);
    scene.add(cl);
    anim.push((dt, t) => {
      cl.intensity = 1.3 + Math.sin(t * 11) * 0.15;
      flame.scale.y = 1.8 + Math.sin(t * 17) * 0.2;
    });
  }

  // ---------- toz ----------
  const N = 400;
  const dg = new THREE.BufferGeometry();
  const dp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    dp[i * 3] = (rnd() - 0.5) * 8;
    dp[i * 3 + 1] = rnd() * 3;
    dp[i * 3 + 2] = (rnd() - 0.5) * 6;
  }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe8c0, size: 0.012, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(dust);
  anim.push((dt, t) => {
    for (let i = 0; i < N; i++) {
      dp[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.0008 + 0.0004;
      dp[i * 3] += Math.cos(t * 0.2 + i * 1.3) * 0.0006;
      if (dp[i * 3 + 1] > 3) dp[i * 3 + 1] = 0;
    }
    dg.attributes.position.needsUpdate = true;
  });

  for (const [mat, geos] of batches) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }

  // dünya durumunu uygula
  function apply(S) {
    for (const v of variants) v.obj.visible = !!v.show(S);
    for (const f of Object.values(frames)) {
      f.pic.material.map.dispose();
      f.pic.material.map = photoTex(f.kind, S);
      f.pic.material.needsUpdate = true;
    }
  }

  return {
    hot, radio, trunk, lid, ledger, envelope, frames, apply,
    views: {
      genel: { pos: [0.3, 1.75, 3.4], look: [-0.2, 1.15, -1.6] },
      radyo: { pos: [-2.15, 1.32, -1.55], look: [-2.65, 0.9, -2.6] },
      duvar: { pos: [0.4, 1.6, -0.5], look: [0.4, 1.55, -3.5] },
      sandik: { pos: [1.45, 1.75, 0.45], look: [2.7, 0.45, -1.2] },
      raf: { pos: [-2.6, 1.55, 0.7], look: [-3.9, 1.2, -0.6] },
    },
    update(dt, t) {
      for (const f of anim) f(dt, t);
    },
  };
}
