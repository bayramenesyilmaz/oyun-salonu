import * as THREE from 'three';

// Pikselli (blok) dokular: küçük canvas, NearestFilter. Hepsi kodla üretilir, dış dosya yok.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function mk(size, draw, seed = 1) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  draw(c, size, rng(seed));
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const sh = (hex, k) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return '#' + c.getHexString();
};
function speckle(c, size, r, base, cell = 4, amp = 0.16) {
  for (let y = 0; y < size; y += cell)
    for (let x = 0; x < size; x += cell) {
      c.fillStyle = sh(base, 1 + (r() - 0.5) * amp * 2);
      c.fillRect(x, y, cell, cell);
    }
}

const cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());

export const T = {
  concrete: () => once('concrete', () => mk(64, (c, s, r) => {
    speckle(c, s, r, 0x8d8a86, 4, 0.14);
    c.fillStyle = 'rgba(0,0,0,.22)';
    c.fillRect(0, 0, s, 2);
    c.fillRect(0, 0, 2, s);
  }, 3)),
  paver: () => once('paver', () => mk(64, (c, s, r) => {
    speckle(c, s, r, 0x7c7570, 4, 0.12);
    c.fillStyle = 'rgba(20,16,14,.35)';
    c.fillRect(0, 0, s, 2);
    c.fillRect(0, 0, 2, s);
    c.fillRect(0, s / 2, s, 2);
    c.fillRect(s / 2, 0, 2, s / 2);
  }, 5)),
  dirt: () => once('dirt', () => mk(64, (c, s, r) => speckle(c, s, r, 0x6b5a48, 4, 0.2), 7)),
  asphalt: () => once('asphalt', () => mk(64, (c, s, r) => speckle(c, s, r, 0x4a4a52, 4, 0.1), 9)),
  brick: () => once('brick', () => mk(64, (c, s, r) => {
    c.fillStyle = '#6a5a4c';
    c.fillRect(0, 0, s, s);
    for (let row = 0; row < 8; row++) {
      const off = row % 2 ? 8 : 0;
      for (let x = -8; x < s; x += 16) {
        c.fillStyle = sh(0xb89a78, 0.82 + r() * 0.3);
        c.fillRect(x + off + 1, row * 8 + 1, 14, 6);
      }
    }
  }, 11)),
  plaster: (hex) => once('pl' + hex, () => mk(64, (c, s, r) => speckle(c, s, r, hex, 4, 0.08), hex & 255)),
  crate: () => once('crate', () => mk(64, (c, s, r) => {
    c.fillStyle = '#6f4e2c';
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = sh(0xb0803f, 0.85 + r() * 0.3);
      c.fillRect(3, i * 16 + 2, s - 6, 12);
    }
    c.fillStyle = '#4a3219';
    c.fillRect(0, 0, s, 4);
    c.fillRect(0, s - 4, s, 4);
    c.fillRect(0, 0, 4, s);
    c.fillRect(s - 4, 0, 4, s);
  }, 13)),
  container: (hex) => once('ct' + hex, () => mk(64, (c, s) => {
    c.fillStyle = sh(hex, 0.9);
    c.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 8) {
      c.fillStyle = sh(hex, 1.15);
      c.fillRect(x, 0, 4, s);
      c.fillStyle = sh(hex, 0.7);
      c.fillRect(x + 4, 0, 1, s);
    }
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.fillRect(0, 0, s, 3);
    c.fillRect(0, s - 3, s, 3);
  }, 15)),
  // pencereli cephe: lit = ışıklı pencere (emissive için)
  facade: (hex, lit, cols = 1, rows = 1) => once(`fa${hex}${lit}${cols}${rows}`, () => mk(64, (c, s, r) => {
    speckle(c, s, r, hex, 4, 0.09);
    const cw = s / cols, ch = s / rows;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const w = cw * 0.44, h = ch * 0.5, x = i * cw + (cw - w) / 2, y = j * ch + ch * 0.22;
        c.fillStyle = '#2a2420';
        c.fillRect(x - 2, y - 2, w + 4, h + 4);
        const on = lit === 2 ? r() > 0.35 : lit === 1;
        c.fillStyle = on ? '#ffc874' : '#161c2a';
        c.fillRect(x, y, w, h);
        if (on) {
          c.fillStyle = '#ffe3a8';
          c.fillRect(x, y, w, 3);
        }
      }
  }, hex & 1023)),
  facadeEmit: (lit, cols = 1, rows = 1) => once(`fe${lit}${cols}${rows}`, () => mk(64, (c, s, r) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, s, s);
    const cw = s / cols, ch = s / rows;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const w = cw * 0.44, h = ch * 0.5, x = i * cw + (cw - w) / 2, y = j * ch + ch * 0.22;
        const on = lit === 2 ? r() > 0.35 : lit === 1;
        if (on) {
          c.fillStyle = '#ffb35a';
          c.fillRect(x, y, w, h);
        }
      }
  }, 77 + lit + cols)),
  camo: () => once('camo', () => mk(32, (c, s, r) => {
    c.fillStyle = '#5b6340';
    c.fillRect(0, 0, s, s);
    const cols = ['#3c4430', '#7a7650', '#2d3324', '#8a7e58'];
    for (let i = 0; i < 26; i++) {
      c.fillStyle = cols[i % 4];
      c.fillRect(Math.floor(r() * 8) * 4, Math.floor(r() * 8) * 4, 4 + Math.floor(r() * 3) * 4, 4 + Math.floor(r() * 2) * 4);
    }
  }, 21)),
  pad: () => once('pad', () => {
    const t = mk(128, (c, s) => {
      c.fillStyle = '#5a5a60';
      c.fillRect(0, 0, s, s);
      c.strokeStyle = '#f2c230';
      c.lineWidth = 6;
      c.beginPath();
      c.arc(s / 2, s / 2, s / 2 - 8, 0, 6.3);
      c.stroke();
      c.fillStyle = '#f2c230';
      c.font = '700 70px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('H', s / 2, s / 2 + 4);
    }, 31);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.magFilter = THREE.LinearFilter;
    return t;
  }),
  glow: () => once('glow', () => {
    const t = mk(64, (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,200,120,1)');
      g.addColorStop(0.35, 'rgba(255,160,70,.45)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.magFilter = THREE.LinearFilter;
    return t;
  }),
};

// BoxGeometry UV'lerini yüz boyutuna göre döşe (tx, ty = bir doku tekrarı kaç metre; tekrar sayısı tam sayıya yuvarlanır)
export function tiledBox(w, h, d, tx = 4, ty = tx) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      const ru = Math.max(1, Math.round(dims[f][0] / tx)), rv = Math.max(1, Math.round(dims[f][1] / ty));
      uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
    }
  return g;
}
