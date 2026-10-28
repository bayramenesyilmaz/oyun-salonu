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

  T.motifs = makeMotifTextures();
  T.stoneMotif = T.motifs;
  return T;
}

// Kilim motifleri: kuyu taşlarının yüzüne kazınmış gibi
export function makeMotifTextures() {
  const r = rng(77);
  const out = {};
  const draw = {
    goz: (x) => {
      x.beginPath();
      x.moveTo(28, 128);
      x.quadraticCurveTo(128, 30, 228, 128);
      x.quadraticCurveTo(128, 226, 28, 128);
      x.stroke();
      x.beginPath();
      x.arc(128, 128, 40, 0, Math.PI * 2);
      x.stroke();
      x.beginPath();
      x.arc(128, 128, 16, 0, Math.PI * 2);
      x.fill();
    },
    koc: (x) => {
      x.beginPath();
      x.moveTo(128, 210);
      x.lineTo(128, 120);
      x.stroke();
      for (const s of [-1, 1]) {
        x.beginPath();
        x.moveTo(128, 120);
        x.bezierCurveTo(128 + s * 10, 50, 128 + s * 95, 40, 128 + s * 92, 105);
        x.bezierCurveTo(128 + s * 90, 150, 128 + s * 45, 150, 128 + s * 48, 115);
        x.bezierCurveTo(128 + s * 50, 95, 128 + s * 70, 95, 128 + s * 68, 112);
        x.stroke();
      }
    },
    bereket: (x) => {
      x.beginPath();
      x.arc(128, 62, 18, 0, Math.PI * 2);
      x.stroke();
      x.beginPath();
      x.moveTo(128, 80);
      x.lineTo(128, 200);
      x.stroke();
      // eli belinde kollar
      for (const s of [-1, 1]) {
        x.beginPath();
        x.moveTo(128, 100);
        x.lineTo(128 + s * 50, 112);
        x.lineTo(128 + s * 30, 150);
        x.lineTo(128, 146);
        x.stroke();
        x.beginPath();
        x.moveTo(128, 200);
        x.lineTo(128 + s * 44, 228);
        x.stroke();
      }
    },
    yildiz: (x) => {
      x.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? 92 : 44;
        x.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr);
      }
      x.closePath();
      x.stroke();
    },
    suyolu: (x) => {
      for (const oy of [-40, 0, 40]) {
        x.beginPath();
        x.moveTo(30, 128 + oy);
        for (let i = 0; i < 6; i++) x.lineTo(46 + i * 33, 128 + oy + (i % 2 ? -18 : 18));
        x.stroke();
      }
    },
  };
  for (const id of Object.keys(draw)) {
    const [c, x] = canvas(256);
    x.fillStyle = '#5e5850';
    x.fillRect(0, 0, 256, 256);
    blotches(x, 256, 256, r, ['rgba(40,44,36,1)', 'rgba(120,114,100,1)'], 30, 50);
    speckle(x, 256, 256, r, 40);
    // oyuk (gölge) + kenar ışığı ile kazıma etkisi
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.save();
    x.translate(2, 3);
    x.strokeStyle = 'rgba(200,190,170,0.35)';
    x.fillStyle = 'rgba(200,190,170,0.35)';
    x.lineWidth = 14;
    draw[id](x);
    x.restore();
    x.strokeStyle = '#1b1814';
    x.fillStyle = '#1b1814';
    x.lineWidth = 11;
    draw[id](x);
    const t = toTex(c, 1);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    out[id] = t;
  }
  return out;
}
