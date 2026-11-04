// Arka plan katmanları: bir kez çizilip ekran dışı tuvallerde saklanır.
import { rng, glow, INK } from './draw.js';

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function makeSky(w, h, seed = 3, stops) {
  const c = canvas(w, h),
    x = c.getContext('2d'),
    r = rng(seed);
  const g = x.createLinearGradient(0, 0, 0, h);
  (stops || [
    [0, '#0b1233'],
    [0.55, '#23306a'],
    [0.82, '#7a4a78'],
    [1, '#e08a5a'],
  ]).forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  // samanyolu (Kuşyolu) şeridi
  for (let i = 0; i < 900; i++) {
    const t = r();
    const cx = t * w,
      cy = h * 0.1 + t * h * 0.32 + (r() - 0.5) * 90;
    x.globalAlpha = 0.05 + r() * 0.12;
    x.fillStyle = r() < 0.5 ? '#c8d4ff' : '#ffe8d0';
    x.beginPath();
    x.arc(cx, cy, 1 + r() * 2.5, 0, 7);
    x.fill();
  }
  for (let i = 0; i < 520; i++) {
    x.globalAlpha = 0.3 + r() * 0.7;
    x.fillStyle = r() < 0.15 ? '#ffe3b8' : r() < 0.2 ? '#bcd4ff' : '#fff';
    x.beginPath();
    x.arc(r() * w, r() * h * 0.78, r() * 1.7 + 0.3, 0, 7);
    x.fill();
  }
  x.globalAlpha = 1;
  return c;
}

// Şehir siluetleri; far: uzak (koyu, kubbeli), near: pencereli apartmanlar
export function makeSkyline(w, h, seed, kind) {
  const c = canvas(w, h),
    x = c.getContext('2d'),
    r = rng(seed);
  const wins = [];
  if (kind === 'far') {
    x.fillStyle = '#1c2450';
    let bx = 0;
    while (bx < w) {
      const bw = 80 + r() * 140,
        bh = 120 + r() * 180;
      x.fillRect(bx, h - bh, bw, bh);
      if (r() < 0.18) {
        // kubbe ve minare
        x.beginPath();
        x.arc(bx + bw / 2, h - bh, bw * 0.42, Math.PI, 0);
        x.fill();
        x.fillRect(bx + bw + 6, h - bh - 150, 12, 150);
        x.beginPath();
        x.moveTo(bx + bw + 3, h - bh - 150);
        x.lineTo(bx + bw + 12, h - bh - 220);
        x.lineTo(bx + bw + 21, h - bh - 150);
        x.fill();
      }
      for (let yy = h - bh + 20; yy < h - 10; yy += 34)
        for (let xx = bx + 12; xx < bx + bw - 16; xx += 28)
          if (r() < 0.12) {
            x.fillStyle = 'rgba(255,200,120,0.55)';
            x.fillRect(xx, yy, 10, 14);
            x.fillStyle = '#1c2450';
          }
      bx += bw - 6;
    }
  } else {
    let bx = -30;
    while (bx < w) {
      const bw = 140 + r() * 160,
        bh = 200 + r() * 220;
      const col = ['#222a52', '#2a3260', '#262c58', '#30366a'][Math.floor(r() * 4)];
      x.fillStyle = col;
      x.beginPath();
      x.roundRect(bx, h - bh, bw, bh + 20, 6);
      x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.35)';
      x.lineWidth = 3;
      x.stroke();
      // çatı detayları
      if (r() < 0.5) {
        x.fillStyle = '#cfd6dc';
        x.fillRect(bx + 20, h - bh - 26, 44, 26);
        x.fillStyle = '#9aa4ad';
        x.fillRect(bx + 16, h - bh - 30, 52, 6);
      }
      if (r() < 0.6) {
        x.strokeStyle = '#3a4070';
        x.lineWidth = 3;
        x.beginPath();
        x.moveTo(bx + bw - 30, h - bh);
        x.lineTo(bx + bw - 30, h - bh - 40);
        x.moveTo(bx + bw - 44, h - bh - 34);
        x.lineTo(bx + bw - 16, h - bh - 34);
        x.stroke();
      }
      for (let yy = h - bh + 28; yy < h - 20; yy += 56)
        for (let xx = bx + 20; xx < bx + bw - 40; xx += 48) {
          const on = r() < 0.36;
          x.fillStyle = on ? (r() < 0.5 ? '#ffcf7a' : '#ffb35a') : '#1a2042';
          x.beginPath();
          x.roundRect(xx, yy, 26, 32, 4);
          x.fill();
          if (on) {
            glow(x, xx + 13, yy + 16, 40, '#ffb860', 0.22);
            wins.push([xx, yy]);
          } else if (r() < 0.2) {
            // perde
            x.fillStyle = '#2c3668';
            x.fillRect(xx + 2, yy + 2, 10, 28);
          }
        }
      bx += bw + 6 + r() * 14;
    }
  }
  c.wins = wins;
  return c;
}

// Paralaks katmanı yatayda döşeyerek çiz
export function drawLayer(x, img, cam, factor, y) {
  const w = img.width;
  let ox = -((cam.x * factor) % w);
  if (ox > 0) ox -= w;
  for (let px = ox; px < cam.w; px += w) x.drawImage(img, Math.round(px), Math.round(y - cam.y * factor));
}

// Basit kayan yıldızlar
export class Meteors {
  constructor() {
    this.list = [];
    this.rate = 0.35;
  }
  update(dt, w) {
    if (Math.random() < dt * this.rate) this.spawn(w);
    for (const m of this.list) m.t += dt;
    this.list = this.list.filter((m) => m.t < m.life);
  }
  spawn(w, big) {
    const m = {
      x: 200 + Math.random() * (w - 300),
      y: 30 + Math.random() * 200,
      vx: -(380 + Math.random() * 300),
      vy: 160 + Math.random() * 160,
      t: 0,
      life: 0.7 + Math.random() * 0.6,
      counted: false,
      big,
    };
    this.list.push(m);
    return m;
  }
  draw(x) {
    for (const m of this.list) {
      const k = m.t / m.life;
      const hx = m.x + m.vx * m.t,
        hy = m.y + m.vy * m.t;
      const tail = 0.18;
      const g = x.createLinearGradient(hx - m.vx * tail, hy - m.vy * tail, hx, hy);
      g.addColorStop(0, 'rgba(200,255,240,0)');
      g.addColorStop(1, `rgba(235,255,250,${(1 - k) * 0.95})`);
      x.strokeStyle = g;
      x.lineWidth = m.counted ? 5 : 3;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(hx - m.vx * tail, hy - m.vy * tail);
      x.lineTo(hx, hy);
      x.stroke();
      if (m.counted) glow(x, hx, hy, 30, '#ffe08a', 0.7 * (1 - k));
    }
  }
}

export function stringLights(x, x0, x1, y0, sag, n, t, power = 1) {
  x.strokeStyle = INK;
  x.lineWidth = 2;
  x.beginPath();
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    const X = x0 + k * (x1 - x0),
      Y = y0 + Math.sin(k * Math.PI) * sag;
    i ? x.lineTo(X, Y) : x.moveTo(X, Y);
  }
  x.stroke();
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const X = x0 + k * (x1 - x0),
      Y = y0 + Math.sin(k * Math.PI) * sag + 8;
    const p = power * (0.92 + 0.08 * Math.sin(t * 3 + i));
    glow(x, X, Y, 40, '#ffb050', 0.5 * p);
    x.fillStyle = p > 0.3 ? '#ffe0a0' : '#5a5040';
    x.beginPath();
    x.arc(X, Y, 6, 0, 7);
    x.fill();
  }
}
