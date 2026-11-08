// Çizim: Kızıl Ağ sembolü, karakterler, arka planlar, nesneler (hepsi kodla çizilir, telifli içerik yok)
const INK = '#10131f';
const TAU = Math.PI * 2;
const rnd = (s) => { s = Math.sin(s * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// ---- Örgüt sembolü: ağ içinde göz ----
export function drawSymbol(c, x, y, r, t = 0, o = {}) {
  c.save(); c.translate(x, y);
  const col = o.color || '#e0243a';
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(1.5, r * 0.07); c.lineJoin = 'round';
  if (o.glow) { c.shadowColor = col; c.shadowBlur = r * 0.6; }
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + Math.PI / 8; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); c.stroke(); }
  for (const k of [0.5, 0.75]) { c.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * TAU + Math.PI / 8, rr2 = r * k * (i % 2 ? 0.93 : 1); const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.stroke(); }
  // göz
  c.fillStyle = o.bg || '#0b0e18';
  c.beginPath(); c.moveTo(-r * 0.42, 0); c.quadraticCurveTo(0, -r * 0.34, r * 0.42, 0); c.quadraticCurveTo(0, r * 0.34, -r * 0.42, 0); c.fill(); c.stroke();
  c.fillStyle = col; c.beginPath(); c.arc(Math.sin(t * 0.8) * r * 0.06, 0, r * 0.12, 0, TAU); c.fill();
  c.restore();
}

// ---- arka planlar ----
function sky(c, W, H, stops) { const g = c.createLinearGradient(0, 0, 0, H); stops.forEach(([p, col]) => g.addColorStop(p, col)); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function skyline(c, W, H, camX, par, base, col, lit, seed, hMin, hMax) {
  const off = -(camX * par) % 2400;
  c.fillStyle = col;
  for (let k = -1; k < 3; k++) {
    let x = off + k * 2400;
    for (let i = 0; i < 18; i++) {
      const s = seed + i + k * 31, w = 90 + rnd(s) * 120, h = hMin + rnd(s + 7) * (hMax - hMin);
      c.fillStyle = col; c.fillRect(x, base - h, w, h + 400);
      if (lit) { c.fillStyle = lit; for (let yy = base - h + 14; yy < base - 10; yy += 22) for (let xx = x + 10; xx < x + w - 14; xx += 20) if (rnd(s * 3 + xx * 0.13 + yy * 0.07) > 0.62) c.fillRect(xx, yy, 8, 11); }
      x += w + 6 + rnd(s + 3) * 30;
    }
  }
}
const THEMES = {
  roof(c, W, H, cam, t) {
    sky(c, W, H, [[0, '#080d26'], [0.55, '#1f2a63'], [1, '#4b3a7a']]);
    c.fillStyle = '#e8ecff'; c.beginPath(); c.arc(W * 0.78, 110, 42, 0, TAU); c.fill();
    c.fillStyle = 'rgba(160,180,255,.12)'; c.beginPath(); c.arc(W * 0.78, 110, 90, 0, TAU); c.fill();
    c.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { c.globalAlpha = 0.3 + rnd(i) * 0.6; c.fillRect(rnd(i + 1) * W, rnd(i + 2) * H * 0.5, 2, 2); } c.globalAlpha = 1;
    skyline(c, W, H, cam.x, 0.12, H * 0.78, '#141a3d', null, 11, 120, 300);
    skyline(c, W, H, cam.x, 0.3, H * 0.9, '#0d1230', '#ffd98a', 5, 150, 380);
  },
  depo(c, W, H) {
    sky(c, W, H, [[0, '#1b2030'], [1, '#2d3447']]);
    c.fillStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < W; x += 140) c.fillRect(x, 0, 6, H);
  },
  liman(c, W, H, cam, t) {
    sky(c, W, H, [[0, '#231a45'], [0.5, '#8a3d6a'], [0.75, '#f08a5a'], [1, '#f4c27a']]);
    c.fillStyle = '#ffe0a8'; c.beginPath(); c.arc(W * 0.3, H * 0.62, 56, 0, TAU); c.fill();
    skyline(c, W, H, cam.x, 0.1, H * 0.74, '#3a2a56', null, 21, 60, 160);
    const g = c.createLinearGradient(0, H * 0.74, 0, H); g.addColorStop(0, '#6a4a7a'); g.addColorStop(1, '#1a1634'); c.fillStyle = g; c.fillRect(0, H * 0.74, W, H);
    c.strokeStyle = 'rgba(255,230,180,.25)'; c.lineWidth = 2;
    for (let i = 0; i < 10; i++) { const y = H * 0.76 + i * 22, off = (t * 20 + cam.x * 0.2 + i * 40) % 80; c.beginPath(); for (let x = -80; x < W + 80; x += 80) { c.moveTo(x - off, y); c.lineTo(x - off + 40, y); } c.stroke(); }
    // vinç
    c.fillStyle = '#2a1e40'; const cx = ((W * 0.65 - cam.x * 0.25) % (W + 400)) - 100; c.fillRect(cx, H * 0.3, 16, H * 0.5); c.fillRect(cx - 140, H * 0.3, 360, 12);
  },
  ofis(c, W, H, cam) {
    sky(c, W, H, [[0, '#26324a'], [1, '#3a4a68']]);
    skyline(c, W, H, cam.x, 0.18, H * 0.85, '#10162d', '#9fd0ff', 31, 160, 360);
    c.fillStyle = 'rgba(20,28,50,.55)'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.05)'; for (let x = -((cam.x * 0.5) % 260); x < W; x += 260) c.fillRect(x, 0, 10, H);
  },
  lab(c, W, H, cam, t) {
    sky(c, W, H, [[0, '#0c1a1a'], [1, '#183030']]);
    c.fillStyle = 'rgba(80,255,200,.05)'; for (let x = -((cam.x * 0.4) % 200); x < W; x += 200) { c.fillRect(x, 0, 4, H); }
    c.fillStyle = 'rgba(80,255,200,' + (0.05 + 0.03 * Math.sin(t * 2)) + ')'; c.fillRect(0, H * 0.4, W, 8);
  },
};
export function drawBackground(c, theme, W, H, cam, t) { (THEMES[theme] || THEMES.depo)(c, W, H, cam, t); }

// ---- katı nesneler ----
export function drawSolid(c, s, t) {
  const { x, y, w, h } = s;
  if (s.t === 'glass') {
    if (s.broken) return;
    c.fillStyle = 'rgba(140,220,255,.28)'; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(200,245,255,.8)'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(x + w * 0.2, y + 6); c.lineTo(x + w * 0.2 + 10, y + 22); c.moveTo(x + w * 0.6, y + h - 6); c.lineTo(x + w * 0.6 + 14, y + h - 26); c.stroke();
    return;
  }
  if (s.t === 'door') {
    if (s.open) return;
    c.fillStyle = '#7a1f2c'; c.fillRect(x, y, w, h);
    c.fillStyle = '#b02a3a'; for (let yy = y + 8; yy < y + h - 8; yy += 24) c.fillRect(x + 4, yy, w - 8, 8);
    c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, y, w, h);
    return;
  }
  if (s.t === 'metal') {
    const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#9fb2cc'); g.addColorStop(0.5, '#5f7088'); g.addColorStop(1, '#8aa0bc');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
    c.beginPath(); for (let i = -h; i < w; i += 26) { c.moveTo(x + Math.max(0, i), y + Math.max(0, -i)); c.lineTo(x + Math.min(w, i + h), y + Math.min(h, h - (i + h - w))); } c.stroke();
    c.strokeStyle = INK; c.lineWidth = 2.5; c.strokeRect(x, y, w, h);
    return;
  }
  if (s.t === 'crate') {
    c.fillStyle = '#9a6b3a'; c.fillRect(x, y, w, h);
    c.strokeStyle = '#5a3a1a'; c.lineWidth = 3; c.strokeRect(x + 3, y + 3, w - 6, h - 6);
    c.beginPath(); c.moveTo(x + 3, y + 3); c.lineTo(x + w - 3, y + h - 3); c.moveTo(x + w - 3, y + 3); c.lineTo(x + 3, y + h - 3); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 2.5; c.strokeRect(x, y, w, h);
    return;
  }
  // wall / ground
  c.fillStyle = s.col || '#2b3250'; c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(x, y, w, 5);
  c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x, y + h - 6, w, 6);
  c.strokeStyle = INK; c.lineWidth = 2.5; c.strokeRect(x, y, w, h);
  if (w > 120 && h > 60) { c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; for (let yy = y + 30; yy < y + h; yy += 30) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke(); } }
}

// ---- karakter ----
const PAL = {
  agent: { suit: '#4a6cb0', dark: '#2a3c6a', skin: '#f2c9a0', hair: '#2a1d14', tie: '#e0243a' },
  guard: { suit: '#4a1f2a', dark: '#2a0f16', skin: '#e8b88a', hair: '#1a1a1a', tie: '#e0243a' },
  sniper: { suit: '#3b4250', dark: '#242a35', skin: '#d9a87a', hair: '#222', tie: '#e0243a' },
  shield: { suit: '#5a2a2a', dark: '#2d1414', skin: '#e0b088', hair: '#111', tie: '#e0243a' },
  boss: { suit: '#1c1c22', dark: '#0d0d12', skin: '#d6b296', hair: '#e8e8ee', tie: '#e0243a' },
  elif: { suit: '#c0486a', dark: '#7a2a44', skin: '#f2c9a0', hair: '#4a2a1a', tie: '#fff' },
};
function limb(c, x0, y0, x1, y1, w, col) { c.strokeStyle = INK; c.lineWidth = w + 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }

// f: {x,y(ayak tabanı),face,run(0..1),air,aim(rad),hurt,dead,t, kind, scale, shootT, hold}
export function drawPerson(c, f) {
  const kind = f.kind || 'agent', P = PAL[kind] || PAL.guard;
  const s = f.scale || 1, t = f.t || 0;
  c.save(); c.translate(f.x, f.y); c.scale(f.face * s, s);
  if (f.alpha != null) c.globalAlpha = f.alpha;
  if (f.dead) { c.rotate(-Math.min(1.45, f.dead * 5)); c.translate(0, -4); }
  const ph = (f.run ? t * 14 : 0), sw = f.run ? Math.sin(ph) * 0.8 : 0;
  const hip = -28 + (f.run ? Math.abs(Math.sin(ph)) * -2 : 0), air = f.air;
  // arka bacak / ön bacak
  const lg = (a, col) => { const ax = air ? 6 * (a ? 1 : -1) : Math.sin(a ? ph : ph + Math.PI) * 13 * (f.run ? 1 : 0.15) + (a ? 3 : -3); limb(c, 0, hip, ax, air ? -8 - (a ? 4 : 0) : (a ? 0 : -1), 9, col); };
  lg(false, P.dark); lg(true, P.suit);
  // gövde
  c.fillStyle = P.suit; c.strokeStyle = INK; c.lineWidth = 3;
  rr(c, -11, hip - 40, 22, 42, 7); c.fill(); c.stroke();
  c.fillStyle = '#f4f4f4'; c.beginPath(); c.moveTo(-3, hip - 40); c.lineTo(5, hip - 40); c.lineTo(1, hip - 26); c.closePath(); c.fill();
  c.fillStyle = P.tie; c.beginPath(); c.moveTo(0, hip - 38); c.lineTo(3, hip - 36); c.lineTo(2, hip - 24); c.lineTo(0, hip - 22); c.lineTo(-1, hip - 36); c.closePath(); c.fill();
  // baş
  const hy = hip - 52;
  c.fillStyle = P.skin; c.beginPath(); c.arc(1, hy, 11, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = P.hair;
  if (kind === 'sniper') { c.fillStyle = '#2c3340'; c.beginPath(); c.arc(0, hy - 1, 12.5, Math.PI * 0.9, Math.PI * 2.1); c.fill(); c.stroke(); }
  else if (kind === 'boss') { c.beginPath(); c.arc(1, hy - 2, 11.5, Math.PI, TAU); c.fill(); c.stroke(); }
  else if (kind === 'guard' || kind === 'shield') { c.fillStyle = '#2a2f3a'; c.beginPath(); c.arc(1, hy - 2, 11.5, Math.PI, TAU); c.fill(); c.stroke(); c.fillRect(2, hy - 3, 13, 4); c.strokeRect(2, hy - 3, 13, 4); }
  else { c.beginPath(); c.arc(0, hy - 3, 11, Math.PI * 0.95, TAU * 1.02); c.fill(); c.stroke(); }
  c.fillStyle = '#fff'; c.fillRect(5, hy - 2, 4, 4); c.fillStyle = f.hurt ? '#e0243a' : INK; c.fillRect(7, hy - 1, 2.4, 3);
  if (kind === 'agent') { c.fillStyle = '#12151d'; c.fillRect(3, hy - 4, 9, 4); c.fillStyle = '#9fd0ff'; c.fillRect(4, hy - 3, 7, 2); }
  // silah kolu
  const aim = f.aim == null ? 0 : f.aim, sx = 2, sy = hip - 34;
  const a = Math.abs(aim) > Math.PI / 2 ? Math.PI - aim : aim;       // yüz yönüne göre aynalı
  const recoil = (f.shootT || 0) > 0 ? -5 : 0;
  c.save(); c.translate(sx, sy); c.rotate(f.hold === 'down' ? 1.2 : a);
  limb(c, 0, 0, 16 + recoil, 0, 8, P.suit);
  if (f.gun !== false) {
    const L = kind === 'sniper' ? 46 : 20;
    c.fillStyle = '#242831'; c.strokeStyle = INK; c.lineWidth = 2.5; rr(c, 12 + recoil, -5, L, 8, 2); c.fill(); c.stroke();
    if (kind !== 'sniper') { c.fillStyle = '#242831'; c.fillRect(14 + recoil, 2, 6, 9); c.strokeRect(14 + recoil, 2, 6, 9); }
  }
  c.fillStyle = P.skin; c.beginPath(); c.arc(16 + recoil, 0, 5, 0, TAU); c.fill(); c.stroke();
  c.restore();
  // örgüt rozeti
  if (kind !== 'agent' && kind !== 'elif') { c.fillStyle = '#e0243a'; c.beginPath(); c.arc(-4, hip - 30, 3.2, 0, TAU); c.fill(); }
  // kalkan
  if (kind === 'shield') { c.fillStyle = 'rgba(160,210,255,.55)'; c.strokeStyle = '#cfe9ff'; c.lineWidth = 3; rr(c, 14, hip - 58, 12, 62, 5); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(17, hip - 52, 3, 24); }
  c.restore();
}

export function drawDrone(c, f) {
  c.save(); c.translate(f.x, f.y + Math.sin(f.t * 3) * 4);
  if (f.dead) c.rotate(f.dead * 6);
  c.fillStyle = '#394055'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, -20, -9, 40, 18, 9); c.fill(); c.stroke();
  c.fillStyle = f.alert ? '#ff4056' : '#e0243a'; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
  c.strokeStyle = '#9aa7c0'; c.lineWidth = 3; const r = Math.sin(f.t * 40) * 14;
  c.beginPath(); c.moveTo(-18 - r, -14); c.lineTo(-18 + r, -14); c.moveTo(18 - r, -14); c.lineTo(18 + r, -14); c.stroke();
  c.beginPath(); c.moveTo(-18, -9); c.lineTo(-18, -14); c.moveTo(18, -9); c.lineTo(18, -14); c.stroke();
  c.restore();
}
export function drawTurret(c, f) {
  c.save(); c.translate(f.x, f.y);
  c.fillStyle = '#394055'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, -16, -14, 32, 28, 6); c.fill(); c.stroke();
  c.save(); c.rotate(f.aim || 0); c.fillStyle = '#242831'; rr(c, 4, -5, 28, 10, 3); c.fill(); c.stroke(); c.restore();
  c.fillStyle = '#e0243a'; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill();
  c.restore();
}
export function drawBarrel(c, b) {
  c.save(); c.translate(b.x, b.y);
  c.fillStyle = '#b02a2a'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, -16, -44, 32, 44, 6); c.fill(); c.stroke();
  c.fillStyle = '#f2c230'; c.fillRect(-16, -32, 32, 6); c.fillRect(-16, -14, 32, 6);
  c.fillStyle = INK; c.font = '800 16px sans-serif'; c.textAlign = 'center'; c.fillText('!', 0, -19);
  c.restore();
}
export function drawSwitch(c, s, t) {
  c.save(); c.translate(s.x, s.y);
  c.fillStyle = '#2a3042'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, -14, -14, 28, 28, 6); c.fill(); c.stroke();
  c.fillStyle = s.on ? '#52e07a' : '#e0243a'; c.beginPath(); c.arc(0, 0, 8 + (s.on ? 0 : Math.sin(t * 5) * 1.5), 0, TAU); c.fill();
  c.restore();
}
export function drawTerminal(c, s, t) {
  c.save(); c.translate(s.x, s.y);
  c.fillStyle = '#242a3c'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, -22, -40, 44, 40, 5); c.fill(); c.stroke();
  c.fillStyle = s.on ? '#2a6a3a' : '#0a2a38'; c.fillRect(-17, -35, 34, 24);
  c.fillStyle = s.on ? '#7bff9a' : '#7ad8ff'; c.font = '700 11px monospace'; c.textAlign = 'center'; c.fillText(s.on ? 'ERİŞİM' : '▮ KİLİTLİ', 0, -19);
  drawSymbol(c, 0, -52, 8, t, { glow: true });
  c.restore();
}
export function drawPickup(c, p, t) {
  c.save(); c.translate(p.x, p.y + Math.sin(t * 3 + p.x) * 3 - 18);
  if (p.k === 'heart') { c.fillStyle = '#ff4a6a'; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 9); c.bezierCurveTo(-18, -4, -9, -16, 0, -6); c.bezierCurveTo(9, -16, 18, -4, 0, 9); c.fill(); c.stroke(); }
  else { c.fillStyle = '#f6f0d8'; c.strokeStyle = INK; c.lineWidth = 2.5; rr(c, -11, -14, 22, 28, 3); c.fill(); c.stroke(); c.fillStyle = '#e0243a'; c.beginPath(); c.arc(0, -3, 5, 0, TAU); c.fill(); c.fillStyle = '#9aa'; c.fillRect(-7, 6, 14, 2); c.fillRect(-7, 10, 9, 2); c.fillStyle = 'rgba(255,230,120,.25)'; c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.fill(); }
  c.restore();
}
export function drawExit(c, e, open, t) {
  c.save();
  c.fillStyle = open ? 'rgba(90,255,150,.18)' : 'rgba(255,60,80,.14)'; c.fillRect(e.x, e.y, e.w, e.h);
  c.strokeStyle = open ? '#6bffa0' : '#ff5a6a'; c.lineWidth = 3; c.setLineDash([12, 8]); c.lineDashOffset = -t * 20; c.strokeRect(e.x, e.y, e.w, e.h); c.setLineDash([]);
  c.fillStyle = open ? '#6bffa0' : '#ff5a6a'; c.font = '800 18px sans-serif'; c.textAlign = 'center'; c.fillText(open ? 'ÇIKIŞ ▶' : 'KİLİTLİ', e.x + e.w / 2, e.y - 10);
  c.restore();
}
// duvar afişi: örgüt sembolü
export function drawPoster(c, p, t) { c.save(); c.globalAlpha = 0.85; c.fillStyle = '#1a0d12'; rr(c, p.x - 34, p.y - 44, 68, 88, 4); c.fill(); drawSymbol(c, p.x, p.y - 6, 22, t, { glow: false }); c.fillStyle = '#e0243a'; c.fillRect(p.x - 22, p.y + 28, 44, 4); c.restore(); }
export function drawLamp(c, l) {
  c.save(); c.fillStyle = '#2a2f42'; c.fillRect(l.x - 2, 0, 4, l.y); c.fillStyle = '#ffe9a8'; rr(c, l.x - 14, l.y, 28, 8, 4); c.fill();
  const g = c.createRadialGradient(l.x, l.y + 8, 4, l.x, l.y + 8, 160); g.addColorStop(0, 'rgba(255,230,160,.35)'); g.addColorStop(1, 'rgba(255,230,160,0)'); c.fillStyle = g; c.fillRect(l.x - 160, l.y, 320, 300);
  c.restore();
}
export const PORTRAIT = { agent: 'agent', elif: 'elif', boss: 'boss', guard: 'guard' };
