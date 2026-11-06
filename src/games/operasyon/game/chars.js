import * as THREE from 'three';
import { T } from './tex.js';

// Blok (voxel) tarzı askerler ve sivil rehineler. Ön yüz −Z, ayak tabanı y=0, boy ≈ 1.85 m.
const gcache = new Map();
const mcache = new Map();
const geo = (w, h, d) => {
  const k = w + ',' + h + ',' + d;
  if (!gcache.has(k)) gcache.set(k, new THREE.BoxGeometry(w, h, d));
  return gcache.get(k);
};
const mat = (c, extra) => {
  const k = c + (extra ? JSON.stringify(extra) : '');
  if (!mcache.has(k)) mcache.set(k, new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra }));
  return mcache.get(k);
};

export const ROLES = {
  komando: { id: 'komando', name: 'Komando', desc: 'Dayanıklı. 120 can.', body: 0x5e6a3e, pants: 0x4a5434, helmet: 0x56603a, skin: 0xd9a77e, mask: false, hp: 120, speed: 1, drone: 1, med: 2, vest: 0x39402c, pack: true },
  ozel: { id: 'ozel', name: 'Özel Harekât', desc: 'Hızlı. Koşu +%8.', body: 0x3b3e44, pants: 0x2f3237, helmet: 0x2a2c31, skin: 0xc99872, mask: true, hp: 100, speed: 1.08, drone: 1, med: 2, vest: 0x24262a, pack: false },
  istihbarat: { id: 'istihbarat', name: 'İstihbarat', desc: 'Dron ustası. 2 dron.', body: 0x9a875e, pants: 0x7d6c48, helmet: 0x8d7b52, skin: 0xe0b48e, mask: false, hp: 100, speed: 1, drone: 2, med: 2, vest: 0x6c5f40, pack: true },
  destek: { id: 'destek', name: 'Destek', desc: 'Sağlıkçı. 4 ilk yardım.', body: 0x46557a, pants: 0x38435f, helmet: 0x35508f, skin: 0xd0a07a, mask: false, hp: 100, speed: 1, drone: 1, med: 4, vest: 0x2e3a57, pack: true },
};
const ENEMY = { body: 0x4b4238, pants: 0x2c2a28, helmet: 0x1d1d1f, skin: 0x161616, mask: true, vest: 0x5a2f2a, pack: false };
const CIV_COLORS = [0x4f6f9d, 0x8a8f96, 0xd8d4c8, 0x7d9a6a];

function part(parent, w, h, d, c, x, y, z, extra) {
  const m = new THREE.Mesh(geo(w, h, d), typeof c === 'number' ? mat(c, extra) : c);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

export function makeSoldier(role, enemy = false) {
  const L = enemy ? ENEMY : ROLES[role] || ROLES.komando;
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const camo = new THREE.MeshLambertMaterial({ map: T.camo(), flatShading: true });
  const skinM = mat(L.skin);
  const legs = [-1, 1].map((s) => {
    const lg = new THREE.Group();
    lg.position.set(s * 0.17, 0.88, 0);
    part(lg, 0.28, 0.8, 0.3, enemy ? L.pants : camo, 0, -0.4, 0);
    part(lg, 0.3, 0.2, 0.1, 0x25282c, 0, -0.5, -0.17); // dizlik
    part(lg, 0.3, 0.2, 0.4, 0x1b1713, 0, -0.78, -0.05); // bot
    body.add(lg);
    return lg;
  });
  const torso = new THREE.Group();
  torso.position.y = 0.88;
  body.add(torso);
  part(torso, 0.74, 0.74, 0.42, enemy ? L.body : camo, 0, 0.37, 0);
  part(torso, 0.68, 0.52, 0.16, L.vest, 0, 0.45, -0.27); // plaka taşıyıcı
  part(torso, 0.18, 0.2, 0.1, 0x22252a, -0.2, 0.18, -0.34);
  part(torso, 0.18, 0.2, 0.1, 0x22252a, 0.02, 0.18, -0.34);
  part(torso, 0.18, 0.2, 0.1, 0x22252a, 0.24, 0.18, -0.34);
  part(torso, 0.76, 0.1, 0.46, 0x22252a, 0, 0.02, 0); // kemer
  part(torso, 0.3, 0.16, 0.14, L.vest, -0.28, 0.76, 0); // omuz
  part(torso, 0.3, 0.16, 0.14, L.vest, 0.28, 0.76, 0);
  if (L.pack) part(torso, 0.5, 0.55, 0.3, L.vest, 0, 0.45, 0.34);
  else part(torso, 0.4, 0.4, 0.14, L.vest, 0, 0.45, 0.28);
  if (!enemy) part(torso, 0.1, 0.1, 0.03, 0xe8e4d8, -0.38, 0.62, -0.12); // kol arması (kurgusal)
  const head = new THREE.Group();
  head.position.y = 0.78;
  torso.add(head);
  part(head, 0.36, 0.36, 0.36, skinM, 0, 0.18, 0);
  if (L.mask) {
    part(head, 0.38, 0.22, 0.38, enemy ? 0x151517 : 0x1f2124, 0, 0.1, -0.005); // balaklava alt
    part(head, 0.3, 0.07, 0.03, 0xd9a77e, 0, 0.23, -0.19); // göz yarığı
    if (enemy) part(head, 0.3, 0.04, 0.03, 0x7a1d1d, 0, 0.23, -0.2);
  } else {
    part(head, 0.3, 0.06, 0.03, 0x15171a, 0, 0.25, -0.19); // gözlük
    part(head, 0.32, 0.08, 0.03, 0x3a2f28, 0, 0.07, -0.19); // sakal gölgesi
  }
  part(head, 0.46, 0.17, 0.46, enemy ? L.helmet : camo, 0, 0.42, 0); // kask
  part(head, 0.46, 0.26, 0.1, enemy ? L.helmet : camo, 0, 0.3, 0.2);
  part(head, 0.5, 0.1, 0.1, 0x202226, 0, 0.17, 0.02); // kulaklık/ray
  if (!enemy && L.helmet === 0x35508f) part(head, 0.4, 0.1, 0.04, 0x35508f, 0, 0.5, -0.24); // destek mavi bandı
  if (!enemy) part(head, 0.07, 0.1, 0.05, 0x20242a, 0.0, 0.52, -0.24); // NVG yuvası
  // kollar: nişan pozu
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Group();
    a.position.set(s * 0.46, 0.66, 0);
    part(a, 0.22, 0.62, 0.22, enemy ? L.body : camo, 0, -0.28, 0);
    part(a, 0.19, 0.18, 0.19, 0x15171a, 0, -0.64, 0);
    torso.add(a);
    return a;
  });
  arms[1].rotation.x = -1.35;
  arms[1].rotation.z = 0.08;
  arms[0].rotation.x = -1.25;
  arms[0].rotation.z = -0.5;
  // tüfek
  const rifle = new THREE.Group();
  part(rifle, 0.09, 0.12, 0.5, 0x1f2124, 0, 0, -0.1);
  part(rifle, 0.07, 0.07, 0.34, enemy ? 0x2a2a2c : 0x8a7650, 0, -0.01, -0.5);
  part(rifle, 0.035, 0.035, 0.28, 0x15171a, 0, 0.02, -0.82);
  part(rifle, 0.06, 0.22, 0.08, 0x1b1d20, 0, -0.14, -0.16);
  part(rifle, 0.07, 0.1, 0.24, 0x1b1d20, 0, -0.01, 0.3);
  rifle.position.set(0.12, 0.22, -0.34);
  torso.add(rifle);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.02, -0.98);
  rifle.add(muzzle);
  g.scale.setScalar(0.95);
  g.userData = { legs, arms, torso, body, head, rifle, muzzle, walk: Math.random() * 6, dieK: 0 };
  return g;
}

export function animSoldier(g, dt, speed, dead) {
  const u = g.userData;
  if (dead) {
    u.dieK = Math.min(1, u.dieK + dt * 2.4);
    g.rotation.x = -u.dieK * 1.5;
    g.position.y = Math.max(0, g.position.y);
    return;
  }
  u.walk += dt * (2 + speed * 1.9);
  const sw = Math.sin(u.walk) * Math.min(1, speed / 3) * 0.8;
  u.legs[0].rotation.x = sw;
  u.legs[1].rotation.x = -sw;
  u.body.position.y = Math.abs(Math.sin(u.walk)) * Math.min(1, speed / 3) * 0.05;
}

export function makeCivilian(i) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const col = CIV_COLORS[i % CIV_COLORS.length];
  const hair = [0x2a1d14, 0x5a3b22, 0x15110d][i % 3];
  const legs = [-1, 1].map((s) => {
    const lg = new THREE.Group();
    lg.position.set(s * 0.15, 0.85, 0);
    part(lg, 0.26, 0.8, 0.28, 0x39414f, 0, -0.4, 0);
    part(lg, 0.28, 0.16, 0.38, 0x2a2420, 0, -0.76, -0.04);
    body.add(lg);
    return lg;
  });
  const torso = new THREE.Group();
  torso.position.y = 0.85;
  body.add(torso);
  part(torso, 0.7, 0.72, 0.4, col, 0, 0.36, 0);
  part(torso, 0.74, 0.1, 0.44, 0x2c2c30, 0, 0.02, 0);
  const head = new THREE.Group();
  head.position.y = 0.76;
  torso.add(head);
  part(head, 0.36, 0.36, 0.36, 0xdcb08c, 0, 0.18, 0);
  part(head, 0.4, 0.14, 0.4, hair, 0, 0.4, 0.02);
  part(head, 0.3, 0.05, 0.03, 0x2a1d14, 0, 0.22, -0.19);
  part(head, 0.3, 0.1, 0.03, 0xc0392b, 0, 0.1, -0.19); // ağız bandı (rehine)
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Group();
    a.position.set(s * 0.44, 0.66, 0);
    part(a, 0.2, 0.6, 0.2, col, 0, -0.28, 0);
    part(a, 0.17, 0.16, 0.17, 0xdcb08c, 0, -0.62, 0);
    torso.add(a);
    return a;
  });
  g.scale.setScalar(0.95);
  g.userData = { legs, arms, torso, body, head, walk: 0, sit: true };
  setSit(g, true);
  return g;
}
export function setSit(g, sit) {
  const u = g.userData;
  u.sit = sit;
  u.body.position.y = sit ? -0.55 : 0;
  u.legs[0].rotation.x = u.legs[1].rotation.x = sit ? Math.PI / 2 : 0;
  // eller arkada bağlı / serbestken yanda
  u.arms[0].rotation.x = u.arms[1].rotation.x = sit ? 0.5 : 0.1;
  u.arms[0].rotation.z = sit ? 0.5 : -0.05;
  u.arms[1].rotation.z = sit ? -0.5 : 0.05;
}
export function animCivilian(g, dt, speed) {
  const u = g.userData;
  if (u.sit) return;
  u.walk += dt * (2 + speed * 1.9);
  const sw = Math.sin(u.walk) * Math.min(1, speed / 3) * 0.8;
  u.legs[0].rotation.x = sw;
  u.legs[1].rotation.x = -sw;
  u.arms[0].rotation.x = -sw * 0.6;
  u.arms[1].rotation.x = sw * 0.6;
}

// Etiket/işaret sprite'ları
export function nameSprite(text, css = '#6fb4ff') {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 96;
  const c = cv.getContext('2d');
  c.font = '700 44px "Barlow Condensed", Arial Narrow, sans-serif';
  c.textAlign = 'center';
  c.lineWidth = 8;
  c.strokeStyle = 'rgba(8,14,28,.9)';
  c.strokeText(text, 128, 44);
  c.fillStyle = css;
  c.fillText(text, 128, 44);
  c.beginPath();
  c.moveTo(108, 62);
  c.lineTo(148, 62);
  c.lineTo(128, 84);
  c.closePath();
  c.fillStyle = css;
  c.fill();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  s.scale.set(1.5, 0.56, 1);
  return s;
}
export function enemyMarker() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#e5483a';
  c.strokeStyle = 'rgba(30,6,6,.9)';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(8, 12);
  c.lineTo(56, 12);
  c.lineTo(32, 52);
  c.closePath();
  c.stroke();
  c.fill();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  s.scale.set(0.5, 0.5, 1);
  return s;
}

// HUD/menü için piksel portre (data URL)
const portraits = {};
export function portrait(role, size = 96) {
  const k = role + size;
  if (portraits[k]) return portraits[k];
  const L = role === 'enemy' ? ENEMY : ROLES[role] || ROLES.komando;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 24;
  const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 0, 0, 24);
  gr.addColorStop(0, '#22324f');
  gr.addColorStop(1, '#0d1626');
  c.fillStyle = gr;
  c.fillRect(0, 0, 24, 24);
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const R = (x, y, w, h, col) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  R(3, 19, 18, 5, hex(L.vest)); // omuz/yelek
  R(5, 17, 14, 3, hex(L.body));
  R(8, 15, 8, 3, hex(L.skin));
  R(6, 6, 12, 11, hex(L.skin));
  if (L.mask) R(6, 11, 12, 6, '#1c1e21');
  R(6, 3, 12, 5, hex(L.helmet));
  R(5, 6, 14, 2, hex(L.helmet));
  R(4, 8, 2, 5, '#202226');
  R(18, 8, 2, 5, '#202226');
  R(7, 9, 10, 2, L.mask ? '#d9a77e' : '#15171a');
  if (L.mask) R(8, 9, 3, 2, '#fff');
  if (L.mask) R(13, 9, 3, 2, '#fff');
  R(10, 4, 4, 1, 'rgba(255,255,255,.25)');
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const o = out.getContext('2d');
  o.imageSmoothingEnabled = false;
  o.drawImage(cv, 0, 0, size, size);
  return (portraits[k] = out.toDataURL());
}
