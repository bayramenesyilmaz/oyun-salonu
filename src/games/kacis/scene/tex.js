import * as THREE from 'three';
// Hücre için kodla üretilen dokular (renk + kabartma). Lisans sorunu yok.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const mk = (S) => {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  return [c, c.getContext('2d')];
};
function blotch(x, S, r, n, cols, rmin, rmax, a = 0.12) {
  for (let i = 0; i < n; i++) {
    const px = r() * S, py = r() * S, rad = rmin + r() * (rmax - rmin);
    const g = x.createRadialGradient(px, py, 0, px, py, rad);
    const col = cols[Math.floor(r() * cols.length)];
    g.addColorStop(0, col.replace('A', a));
    g.addColorStop(1, col.replace('A', 0));
    x.fillStyle = g;
    x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
}
function speck(x, S, r, n, max = 2) {
  for (let i = 0; i < n; i++) {
    const v = r() * 255;
    x.fillStyle = `rgba(${v},${v},${v},${0.05 + r() * 0.12})`;
    x.fillRect(r() * S, r() * S, 1 + r() * max, 1 + r() * max);
  }
}
const tex = (c, rep, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
function pair(S, seed, paint, rep) {
  const [c, x] = mk(S);
  const [b, bx] = mk(S);
  paint(x, bx, rng(seed), S);
  return { map: tex(c, rep), bump: tex(b, rep, false) };
}
export function makeCellTextures() {
  const T = {};
  // betonarme duvar: kalıp izleri, nem lekesi, paslı akıntı
  T.wall = pair(1024, 11, (x, bx, r, S) => {
    x.fillStyle = '#6d6f6c';
    x.fillRect(0, 0, S, S);
    bx.fillStyle = '#808080';
    bx.fillRect(0, 0, S, S);
    blotch(x, S, r, 160, ['rgba(40,42,40,A)', 'rgba(120,122,118,A)', 'rgba(70,64,52,A)'], 40, 200, 0.16);
    blotch(bx, S, r, 120, ['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], 20, 120, 0.2);
    speck(x, S, r, 9000);
    speck(bx, S, r, 9000, 3);
    for (const gy of [0, S / 2]) {
      x.fillStyle = 'rgba(20,20,20,.35)';
      x.fillRect(0, gy, S, 3);
      bx.fillStyle = '#202020';
      bx.fillRect(0, gy, S, 3);
    }
    for (let i = 0; i < 14; i++) {
      const px = r() * S, len = 120 + r() * 380, w = 3 + r() * 10;
      const g = x.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, 'rgba(70,46,28,.0)');
      g.addColorStop(0.2, 'rgba(70,46,28,.35)');
      g.addColorStop(1, 'rgba(40,30,22,0)');
      x.save();
      x.translate(px, r() * S * 0.5);
      x.fillStyle = g;
      x.fillRect(0, 0, w, len);
      x.restore();
    }
  }, 2);
  // zemin: eski karo, derzler, kir
  T.floor = pair(1024, 22, (x, bx, r, S) => {
    x.fillStyle = '#55564f';
    x.fillRect(0, 0, S, S);
    bx.fillStyle = '#909090';
    bx.fillRect(0, 0, S, S);
    const n = 4, ts = S / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = 70 + r() * 28;
        x.fillStyle = `rgb(${v},${v + 1},${v - 5})`;
        x.fillRect(i * ts + 3, j * ts + 3, ts - 6, ts - 6);
        bx.fillStyle = '#b0b0b0';
        bx.fillRect(i * ts + 3, j * ts + 3, ts - 6, ts - 6);
      }
    blotch(x, S, r, 140, ['rgba(20,20,18,A)', 'rgba(90,80,60,A)', 'rgba(15,25,30,A)'], 30, 190, 0.22);
    speck(x, S, r, 8000);
    speck(bx, S, r, 6000, 3);
  }, 3);
  // paslı boyalı metal
  T.metal = pair(512, 33, (x, bx, r, S) => {
    x.fillStyle = '#3d4244';
    x.fillRect(0, 0, S, S);
    bx.fillStyle = '#808080';
    bx.fillRect(0, 0, S, S);
    blotch(x, S, r, 120, ['rgba(110,56,26,A)', 'rgba(20,22,22,A)', 'rgba(80,86,86,A)'], 14, 90, 0.3);
    speck(x, S, r, 5000);
    speck(bx, S, r, 5000, 2);
  }, 1);
  // ahşap (ranza, kapı)
  T.wood = pair(512, 44, (x, bx, r, S) => {
    x.fillStyle = '#4a3827';
    x.fillRect(0, 0, S, S);
    bx.fillStyle = '#808080';
    bx.fillRect(0, 0, S, S);
    for (let i = 0; i < 90; i++) {
      const y = r() * S;
      x.strokeStyle = `rgba(${20 + r() * 40},${12 + r() * 24},8,${0.25 + r() * 0.3})`;
      bx.strokeStyle = r() < 0.5 ? '#606060' : '#a0a0a0';
      x.lineWidth = bx.lineWidth = 1 + r() * 2;
      x.beginPath();
      bx.beginPath();
      x.moveTo(0, y);
      bx.moveTo(0, y);
      for (let k = 1; k <= 8; k++) {
        const yy = y + Math.sin(k + y) * 4;
        x.lineTo((k * S) / 8, yy);
        bx.lineTo((k * S) / 8, yy);
      }
      x.stroke();
      bx.stroke();
    }
    blotch(x, S, r, 40, ['rgba(0,0,0,A)'], 20, 90, 0.2);
  }, 1);
  // yatak: soluk çizgili şilte
  T.mattress = pair(256, 55, (x, bx, r, S) => {
    x.fillStyle = '#6f7466';
    x.fillRect(0, 0, S, S);
    bx.fillStyle = '#808080';
    bx.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 16) {
      x.fillStyle = 'rgba(30,40,60,.35)';
      x.fillRect(i, 0, 6, S);
    }
    blotch(x, S, r, 40, ['rgba(60,40,20,A)', 'rgba(20,20,20,A)'], 10, 60, 0.3);
    speck(x, S, r, 2000);
  }, 1);
  return T;
}

export const mat = (t, o = {}) => new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 2.2, roughness: 0.92, metalness: 0, ...o });
