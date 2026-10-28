import * as THREE from 'three';

// Deterministik rastgele sayı üreteci (her açılışta aynı köy)
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size, h = size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTex(c, repeat = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Piksel bazlı gürültü katmanı
function speckle(ctx, w, h, r, amount, alpha = 0.18) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = alpha;
  for (let i = 0; i < (w * h) / 60; i++) {
    ctx.fillStyle = r() < 0.5 ? '#000' : '#fff';
    ctx.globalAlpha = r() * alpha * 0.4;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
  ctx.globalAlpha = 1;
}

function blotches(ctx, w, h, r, colors, count, maxR) {
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h, rad = maxR * (0.3 + r());
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const col = colors[Math.floor(r() * colors.length)];
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.35 + r() * 0.3;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.globalAlpha = 1;
}

export function makeTextures() {
  const r = rng(1986);
  const T = {};

  // Toprak zemin
  {
    const S = 512;
    const [c, x] = canvas(S);
    x.fillStyle = '#5b4a36';
    x.fillRect(0, 0, S, S);
    blotches(x, S, S, r, ['rgba(40,32,22,1)', 'rgba(110,94,66,1)', 'rgba(70,68,44,1)', 'rgba(52,44,30,1)'], 140, 60);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = r() < 0.5 ? 'rgba(150,135,100,0.5)' : 'rgba(30,24,16,0.5)';
      const s = 1 + r() * 3;
      x.fillRect(r() * S, r() * S, s, s * (0.6 + r()));
    }
    // kuru ot çizgileri
    x.lineWidth = 1;
    for (let i = 0; i < 700; i++) {
      x.strokeStyle = `rgba(${120 + r() * 50},${105 + r() * 40},${60 + r() * 20},${0.25 + r() * 0.3})`;
      const px = r() * S, py = r() * S, a = r() * Math.PI;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + Math.cos(a) * 6, py + Math.sin(a) * 6);
      x.stroke();
    }
    speckle(x, S, S, r, 24);
    T.ground = toTex(c, 40);
  }

  // Kerpiç sıva
  {
    const S = 512;
    const [c, x] = canvas(S);
    x.fillStyle = '#8f7a5e';
    x.fillRect(0, 0, S, S);
    blotches(x, S, S, r, ['rgba(120,100,74,1)', 'rgba(160,140,108,1)', 'rgba(90,74,54,1)'], 90, 70);
    // dökülmüş sıva altından görünen taş
    for (let i = 0; i < 9; i++) {
      const px = r() * S, py = r() * S;
      x.fillStyle = 'rgba(70,60,48,0.8)';
      x.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2, rr = 14 + r() * 26;
        x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.7);
      }
      x.fill();
    }
    // çatlaklar
    x.strokeStyle = 'rgba(40,30,20,0.55)';
    for (let i = 0; i < 22; i++) {
      let px = r() * S, py = r() * S;
      x.lineWidth = 0.6 + r();
      x.beginPath();
      x.moveTo(px, py);
      for (let k = 0; k < 8; k++) {
        px += (r() - 0.5) * 22;
        py += r() * 18;
        x.lineTo(px, py);
      }
      x.stroke();
    }
    // alttan nem / kir
    const g = x.createLinearGradient(0, S, 0, S * 0.6);
    g.addColorStop(0, 'rgba(30,22,14,0.75)');
    g.addColorStop(1, 'rgba(30,22,14,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);
    speckle(x, S, S, r, 20);
    T.plaster = toTex(c, 1);
  }

  // Kuru taş duvar
  {
    const S = 512;
    const [c, x] = canvas(S);
    x.fillStyle = '#2b2722';
    x.fillRect(0, 0, S, S);
    let y = 0;
    while (y < S) {
      const rowH = 26 + r() * 30;
      let px = -r() * 30;
      while (px < S) {
        const w = 34 + r() * 60;
        const v = 70 + r() * 50;
        x.fillStyle = `rgb(${v + 8},${v + 2},${v - 8})`;
        x.beginPath();
        x.moveTo(px + 3 + r() * 4, y + 3 + r() * 4);
        x.lineTo(px + w - 3 - r() * 4, y + 2 + r() * 5);
        x.lineTo(px + w - 2 - r() * 5, y + rowH - 3 - r() * 4);
        x.lineTo(px + 2 + r() * 5, y + rowH - 2 - r() * 4);
        x.closePath();
        x.fill();
        const g = x.createLinearGradient(0, y, 0, y + rowH);
        g.addColorStop(0, 'rgba(255,255,255,0.10)');
        g.addColorStop(1, 'rgba(0,0,0,0.25)');
        x.fillStyle = g;
        x.fill();
        px += w;
      }
      y += rowH;
    }
    blotches(x, S, S, r, ['rgba(60,70,40,1)', 'rgba(20,18,14,1)'], 30, 50);
    speckle(x, S, S, r, 30);
    T.stone = toTex(c, 1);
  }

  // Ahşap
  {
    const S = 256;
    const [c, x] = canvas(S);
    x.fillStyle = '#3d2c1e';
    x.fillRect(0, 0, S, S);
    const planks = 6;
    for (let i = 0; i < planks; i++) {
      const v = 50 + r() * 25;
      x.fillStyle = `rgb(${v + 14},${v},${v - 12})`;
      x.fillRect(i * (S / planks) + 1, 0, S / planks - 2, S);
      for (let k = 0; k < 40; k++) {
        x.strokeStyle = `rgba(20,12,6,${0.15 + r() * 0.25})`;
        x.beginPath();
        const px = i * (S / planks) + r() * (S / planks);
        x.moveTo(px, 0);
        x.bezierCurveTo(px + (r() - 0.5) * 6, S * 0.3, px + (r() - 0.5) * 6, S * 0.6, px + (r() - 0.5) * 4, S);
        x.stroke();
      }
    }
    speckle(x, S, S, r, 18);
    T.wood = toTex(c, 1);
  }

  // Toprak dam (çatı)
  {
    const S = 256;
    const [c, x] = canvas(S);
    x.fillStyle = '#3e352a';
    x.fillRect(0, 0, S, S);
    blotches(x, S, S, r, ['rgba(70,64,40,1)', 'rgba(30,26,20,1)'], 60, 40);
    speckle(x, S, S, r, 30);
    T.roof = toTex(c, 2);
  }

  // Kâğıt (eski günlük sayfası)
  {
    const [c, x] = canvas(256, 340);
    x.fillStyle = '#d8c8a2';
    x.fillRect(0, 0, 256, 340);
    blotches(x, 256, 340, r, ['rgba(160,120,70,1)', 'rgba(120,90,50,1)'], 18, 50);
    x.strokeStyle = 'rgba(40,30,60,0.7)';
    x.lineWidth = 1.4;
    for (let ly = 30; ly < 320; ly += 16) {
      let px = 18;
      x.beginPath();
      x.moveTo(px, ly);
      while (px < 236 - r() * 40) {
        px += 3 + r() * 5;
        x.lineTo(px, ly + (r() - 0.5) * 5);
      }
      x.stroke();
    }
    T.paper = toTex(c, 1);
    T.paper.wrapS = T.paper.wrapT = THREE.ClampToEdgeWrapping;
  }

  // Kilim
  {
    const [c, x] = canvas(256, 384);
    const cols = ['#6b1a16', '#2a1612', '#a5612a', '#1d2a3a', '#c9b48a'];
    x.fillStyle = cols[0];
    x.fillRect(0, 0, 256, 384);
    x.fillStyle = cols[1];
    x.fillRect(10, 10, 236, 364);
    x.fillStyle = cols[0];
    x.fillRect(22, 22, 212, 340);
    for (let i = 0; i < 4; i++) {
      const cy = 70 + i * 82, cx = 128;
      x.fillStyle = cols[(i % 3) + 2];
      x.beginPath();
      x.moveTo(cx, cy - 34);
      x.lineTo(cx + 60, cy);
      x.lineTo(cx, cy + 34);
      x.lineTo(cx - 60, cy);
      x.closePath();
      x.fill();
      x.fillStyle = cols[1];
      x.beginPath();
      x.moveTo(cx, cy - 16);
      x.lineTo(cx + 28, cy);
      x.lineTo(cx, cy + 16);
      x.lineTo(cx - 28, cy);
      x.closePath();
      x.fill();
    }
    speckle(x, 256, 384, r, 30);
    T.kilim = toTex(c, 1);
    T.kilim.wrapS = T.kilim.wrapT = THREE.ClampToEdgeWrapping;
  }

  // Kuru ot (alfa)
  {
    const [c, x] = canvas(128);
    x.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 26; i++) {
      const bx = 10 + r() * 108;
      const hgt = 50 + r() * 74;
      const lean = (r() - 0.5) * 40;
      const v = 110 + r() * 60;
      x.strokeStyle = `rgb(${v},${v * 0.85},${v * 0.5})`;
      x.lineWidth = 1 + r() * 1.6;
      x.beginPath();
      x.moveTo(bx, 128);
      x.quadraticCurveTo(bx + lean * 0.3, 128 - hgt * 0.6, bx + lean, 128 - hgt);
      x.stroke();
    }
    T.grass = toTex(c, 1);
    T.grass.wrapS = T.grass.wrapT = THREE.ClampToEdgeWrapping;
  }

  // Ay hâlesi
  {
    const [c, x] = canvas(256);
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,250,235,1)');
    g.addColorStop(0.16, 'rgba(240,236,220,1)');
    g.addColorStop(0.2, 'rgba(180,190,210,0.35)');
    g.addColorStop(0.5, 'rgba(90,110,140,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    T.moon = toTex(c, 1);
  }

  // Yumuşak nokta (toz zerreleri)
  {
    const [c, x] = canvas(64);
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    T.dot = toTex(c, 1);
  }

  // Islak saç teli
  {
    const [c, x] = canvas(64, 256);
    for (let i = 0; i < 40; i++) {
      x.strokeStyle = `rgba(${5 + r() * 15},${5 + r() * 12},${8 + r() * 12},${0.6 + r() * 0.4})`;
      x.lineWidth = 0.8 + r() * 1.6;
      const sx = r() * 64;
      x.beginPath();
      x.moveTo(sx, 0);
      x.bezierCurveTo(sx + (r() - 0.5) * 20, 90, sx + (r() - 0.5) * 20, 170, sx + (r() - 0.5) * 24, 220 + r() * 36);
      x.stroke();
    }
    T.hair = toTex(c, 1);
    T.hair.wrapS = T.hair.wrapT = THREE.ClampToEdgeWrapping;
  }

  addMilitary(T, r);
  return T;
}

// Kilim motifleri: kuyu taşlarının yüzüne kazınmış gibi

// ---------- Askerî ve çevre dokuları ----------
function addMilitary(T, r) {
  // Kuru yayla otu / toprak (arazi)
  {
    const S = 512;
    const [c, x] = canvas(S);
    x.fillStyle = '#8c8063';
    x.fillRect(0, 0, S, S);
    blotches(x, S, S, r, ['rgba(110,98,70,1)', 'rgba(160,148,112,1)', 'rgba(96,94,70,1)', 'rgba(128,112,84,1)'], 160, 70);
    for (let i = 0; i < 2600; i++) {
      const v = 110 + r() * 90;
      x.strokeStyle = `rgba(${v},${v * 0.92},${v * 0.66},${0.3 + r() * 0.4})`;
      x.lineWidth = 1;
      const px = r() * S, py = r() * S, a = -Math.PI / 2 + (r() - 0.5) * 1.2;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + Math.cos(a) * (3 + r() * 6), py + Math.sin(a) * (3 + r() * 6));
      x.stroke();
    }
    for (let i = 0; i < 500; i++) {
      x.fillStyle = r() < 0.5 ? 'rgba(70,60,44,0.5)' : 'rgba(180,170,150,0.45)';
      x.fillRect(r() * S, r() * S, 1 + r() * 3, 1 + r() * 2);
    }
    speckle(x, S, S, r, 22);
    T.terrain = toTex(c, 1);
  }
  // Dağ kamuflajı (Türk askerleri)
  {
    const S = 256;
    const [c, x] = canvas(S);
    x.fillStyle = '#6e6a4e';
    x.fillRect(0, 0, S, S);
    const cols = ['#4a4a32', '#857a5a', '#3a3426', '#5c5e40'];
    for (let i = 0; i < 70; i++) {
      x.fillStyle = cols[i % cols.length];
      const px = r() * S, py = r() * S;
      x.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2, rr = 8 + r() * 22;
        x.lineTo(px + Math.cos(a) * rr * 1.4, py + Math.sin(a) * rr * 0.8);
      }
      x.fill();
    }
    // dijital pikseller
    for (let i = 0; i < 500; i++) {
      x.fillStyle = cols[Math.floor(r() * cols.length)];
      x.fillRect(Math.floor(r() * 64) * 4, Math.floor(r() * 64) * 4, 4, 4);
    }
    speckle(x, S, S, r, 14);
    T.camo = toTex(c, 1);
  }
  // Koyu kumaş (örgüt üyeleri)
  {
    const S = 128;
    const [c, x] = canvas(S);
    x.fillStyle = '#2b2a27';
    x.fillRect(0, 0, S, S);
    blotches(x, S, S, r, ['rgba(60,55,45,1)', 'rgba(15,15,14,1)'], 30, 30);
    for (let y = 0; y < S; y += 2) {
      x.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`;
      x.fillRect(0, y, S, 1);
    }
    speckle(x, S, S, r, 18);
    T.cloth = toTex(c, 1);
  }
  // Kum torbası
  {
    const S = 256;
    const [c, x] = canvas(S);
    x.fillStyle = '#5e5440';
    x.fillRect(0, 0, S, S);
    const rows = 6, rowH = S / rows;
    for (let row = 0; row < rows; row++) {
      const off = row % 2 ? rowH * 0.9 : 0;
      for (let k = -1; k < 4; k++) {
        const bx = k * rowH * 1.8 + off, by = row * rowH;
        const g = x.createRadialGradient(bx + rowH * 0.9, by + rowH * 0.45, 4, bx + rowH * 0.9, by + rowH * 0.5, rowH);
        g.addColorStop(0, '#8d8162');
        g.addColorStop(0.7, '#6b6048');
        g.addColorStop(1, '#3b3426');
        x.fillStyle = g;
        x.beginPath();
        x.ellipse(bx + rowH * 0.9, by + rowH * 0.5, rowH * 0.88, rowH * 0.46, 0, 0, Math.PI * 2);
        x.fill();
      }
    }
    for (let i = 0; i < 600; i++) {
      x.strokeStyle = `rgba(40,32,20,${0.1 + r() * 0.2})`;
      const px = r() * S, py = r() * S;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + 4, py + (r() - 0.5) * 2);
      x.stroke();
    }
    T.sandbag = toTex(c, 1);
  }
  // Brandalı çadır / yeşil kanvas
  {
    const S = 128;
    const [c, x] = canvas(S);
    x.fillStyle = '#4b5034';
    x.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 3) {
      x.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.06})`;
      x.fillRect(i, 0, 1, S);
      x.fillRect(0, i, S, 1);
    }
    blotches(x, S, S, r, ['rgba(30,32,20,1)', 'rgba(90,92,70,1)'], 20, 30);
    T.canvas = toTex(c, 1);
  }
  // Boyalı metal (araç, sandık)
  {
    const S = 256;
    const [c, x] = canvas(S);
    x.fillStyle = '#4c5240';
    x.fillRect(0, 0, S, S);
    blotches(x, S, S, r, ['rgba(90,70,40,1)', 'rgba(30,30,26,1)', 'rgba(110,80,50,1)'], 50, 26);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(120,70,30,${0.2 + r() * 0.3})`;
      x.fillRect(r() * S, r() * S, 1 + r() * 3, 4 + r() * 18);
    }
    speckle(x, S, S, r, 16);
    T.metal = toTex(c, 1);
  }
  // Çakıllı yol
  {
    const S = 512;
    const [c, x] = canvas(S);
    x.fillStyle = '#5f5546';
    x.fillRect(0, 0, S, S);
    for (let i = 0; i < 4000; i++) {
      const v = 60 + r() * 90;
      x.fillStyle = `rgb(${v + 10},${v + 4},${v - 6})`;
      const s = 1 + r() * 3.5;
      x.beginPath();
      x.ellipse(r() * S, r() * S, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2);
      x.fill();
    }
    // tekerlek izleri
    for (const tx of [S * 0.3, S * 0.7]) {
      const g = x.createLinearGradient(tx - 30, 0, tx + 30, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(30,24,16,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(tx - 30, 0, 60, S);
    }
    speckle(x, S, S, r, 20);
    T.road = toTex(c, 1);
  }
  // Atış hedefi (silüet)
  {
    const [c, x] = canvas(128, 256);
    x.fillStyle = '#c9b993';
    x.fillRect(0, 0, 128, 256);
    x.fillStyle = '#2d2a24';
    x.beginPath();
    x.arc(64, 52, 28, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.moveTo(14, 256);
    x.lineTo(20, 120);
    x.quadraticCurveTo(64, 80, 108, 120);
    x.lineTo(114, 256);
    x.fill();
    x.strokeStyle = '#c9b993';
    x.lineWidth = 2;
    for (const rr of [16, 34, 52]) {
      x.beginPath();
      x.arc(64, 160, rr, 0, Math.PI * 2);
      x.stroke();
    }
    T.target = toTex(c, 1);
    T.target.wrapS = T.target.wrapT = THREE.ClampToEdgeWrapping;
  }
  // Kıvılcım / namlu alevi
  {
    const [c, x] = canvas(128);
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,250,220,1)');
    g.addColorStop(0.25, 'rgba(255,190,90,0.9)');
    g.addColorStop(0.6, 'rgba(255,110,30,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r() * 0.4;
      x.strokeStyle = 'rgba(255,200,120,0.6)';
      x.lineWidth = 6 - i * 0.5;
      x.beginPath();
      x.moveTo(64, 64);
      x.lineTo(64 + Math.cos(a) * (40 + r() * 20), 64 + Math.sin(a) * (40 + r() * 20));
      x.stroke();
    }
    T.flash = toTex(c, 1);
  }
  // Duman / toz bulutu
  {
    const [c, x] = canvas(128);
    for (let i = 0; i < 18; i++) {
      const px = 40 + r() * 48, py = 40 + r() * 48, rr = 16 + r() * 26;
      const g = x.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
    }
    T.smoke = toTex(c, 1);
  }
  // Mermi izi (delik)
  {
    const [c, x] = canvas(64);
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(0,0,0,0.95)');
    g.addColorStop(0.25, 'rgba(20,18,14,0.85)');
    g.addColorStop(0.5, 'rgba(60,50,40,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    T.hole = toTex(c, 1);
  }
}
