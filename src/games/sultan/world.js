// Sultanlık Yolu: izometrik çizim + savaş motoru (köy ve savaş aynı çizimi kullanır).
import { B, GRID, bhp, tStat } from './data.js';

export const TW = 64, TH = 32;
export const iso = (gx, gy) => [(gx - gy) * (TW / 2), (gx + gy) * (TH / 2)];
export function toScreen(v, gx, gy, h = 0) { const [x, y] = iso(gx, gy); return [v.ox + x * v.z, v.oy + (y - h) * v.z]; }
export function toGrid(v, sx, sy) {
  const x = (sx - v.ox) / v.z, y = (sy - v.oy) / v.z;
  return [(x / (TW / 2) + y / (TH / 2)) / 2, (y / (TH / 2) - x / (TW / 2)) / 2];
}
export function fitView(w, h, k = 1.3) {
  const z = Math.min((w / (GRID * TW)) * k, (h / (GRID * TH)) * 0.95, 1.8);
  const [cx, cy] = iso(GRID / 2, GRID / 2);
  return { z, ox: w / 2 - cx * z, oy: h / 2 - cy * z + 10 * z };
}

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * f))); g = Math.max(0, Math.min(255, Math.round(g * f))); b = Math.max(0, Math.min(255, Math.round(b * f)));
  return `rgb(${r},${g},${b})`;
};

function poly(ctx, pts, fill, stroke) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } }

// iso prizma: [x0,x1]x[y0,y1] taban, z0 yükseklikten h kadar
function prism(ctx, v, x0, y0, x1, y1, z0, h, col) {
  const P = (x, y, z) => toScreen(v, x, y, z);
  const tl = P(x0, y0, z0 + h), tr = P(x1, y0, z0 + h), br = P(x1, y1, z0 + h), bl = P(x0, y1, z0 + h);
  const br0 = P(x1, y1, z0), bl0 = P(x0, y1, z0), tr0 = P(x1, y0, z0);
  poly(ctx, [bl, br, br0, bl0], shade(col, 0.78), 'rgba(0,0,0,.18)');
  poly(ctx, [br, tr, tr0, br0], shade(col, 0.62), 'rgba(0,0,0,.18)');
  poly(ctx, [tl, tr, br, bl], shade(col, 1.06), 'rgba(0,0,0,.15)');
}
function pyramid(ctx, v, x0, y0, x1, y1, z0, h, col) {
  const P = (x, y, z) => toScreen(v, x, y, z);
  const a = P((x0 + x1) / 2, (y0 + y1) / 2, z0 + h), bl = P(x0, y1, z0), br = P(x1, y1, z0), tr = P(x1, y0, z0), tl = P(x0, y0, z0);
  poly(ctx, [tl, tr, a], shade(col, 1.1)); poly(ctx, [tl, bl, a], shade(col, 0.95));
  poly(ctx, [bl, br, a], shade(col, 0.82), 'rgba(0,0,0,.2)'); poly(ctx, [br, tr, a], shade(col, 0.66), 'rgba(0,0,0,.2)');
}
function flag(ctx, v, x, y, z, col) {
  const [px, py] = toScreen(v, x, y, z), [qx, qy] = toScreen(v, x, y, z + 22);
  ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 2 * v.z; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke();
  const t = performance.now() / 300;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.quadraticCurveTo(qx + 7 * v.z, qy + (2 + Math.sin(t)) * v.z, qx + 14 * v.z, qy + 3 * v.z); ctx.lineTo(qx, qy + 8 * v.z); ctx.fill();
}

const LV = (lv) => 0.85 + lv * 0.05;
export function drawBuilding(ctx, v, b, o = {}) {
  const s = B[b.k].sz, x0 = b.x + 0.08, y0 = b.y + 0.08, x1 = b.x + s - 0.08, y1 = b.y + s - 0.08, lv = b.lv || 1, f = LV(lv);
  const ux = (u) => b.x + u * s, uy = (u) => b.y + u * s;
  ctx.globalAlpha = o.ghost ? 0.55 : 1;
  if (o.dead) {
    prism(ctx, v, x0 + 0.1, y0 + 0.1, x1 - 0.1, y1 - 0.1, 0, 4, '#6d6458');
    for (let i = 0; i < 3; i++) prism(ctx, v, ux(0.2 + i * 0.22), uy(0.3 + (i % 2) * 0.3), ux(0.32 + i * 0.22), uy(0.42 + (i % 2) * 0.3), 4, 4, '#857a6a');
    ctx.globalAlpha = 1; return;
  }
  // gölge
  ctx.fillStyle = 'rgba(0,0,0,.18)'; const g = [toScreen(v, x0 + 0.2, y0 + 0.2), toScreen(v, x1 + 0.2, y0 + 0.2), toScreen(v, x1 + 0.2, y1 + 0.2), toScreen(v, x0 + 0.2, y1 + 0.2)]; poly(ctx, g, 'rgba(0,0,0,.16)');
  switch (b.k) {
    case 'konak':
      prism(ctx, v, x0, y0, x1, y1, 0, 16, '#d9c39a');
      prism(ctx, v, ux(0.15), uy(0.15), ux(0.85), uy(0.85), 16, 22 * f, '#f2e3c6');
      pyramid(ctx, v, ux(0.1), uy(0.1), ux(0.9), uy(0.9), 16 + 22 * f, 30 * f, lv >= 6 ? '#3d5afe' : '#d84f3a');
      if (lv >= 4) { prism(ctx, v, ux(0.02), uy(0.02), ux(0.2), uy(0.2), 0, 40, '#e9d6b0'); pyramid(ctx, v, ux(0.0), uy(0.0), ux(0.22), uy(0.22), 40, 16, '#d84f3a'); }
      flag(ctx, v, ux(0.5), uy(0.5), 16 + 52 * f, '#ffd23f');
      break;
    case 'tarla': {
      prism(ctx, v, x0, y0, x1, y1, 0, 3, '#8a5a34');
      for (let i = 0; i < 5; i++) { const yy = y0 + (i + 0.5) * ((y1 - y0) / 5); prism(ctx, v, x0 + 0.1, yy - 0.06, x1 - 0.1, yy + 0.06, 3, 3 + lv, lv >= 4 ? '#f2c94c' : '#7ccf5a'); }
      break;
    }
    case 'oduncu':
      prism(ctx, v, ux(0.15), uy(0.1), ux(0.65), uy(0.6), 0, 20 * f, '#b07a4a'); pyramid(ctx, v, ux(0.1), uy(0.05), ux(0.7), uy(0.65), 20 * f, 16, '#2f7d4a');
      for (let i = 0; i < 3; i++) prism(ctx, v, ux(0.65), uy(0.25 + i * 0.2), ux(0.92), uy(0.38 + i * 0.2), 0, 7, '#8d5a2b');
      break;
    case 'maden':
      pyramid(ctx, v, x0, y0, ux(0.65), uy(0.65), 0, 30 * f, '#8e8e9a'); pyramid(ctx, v, ux(0.4), uy(0.4), x1, y1, 0, 20 * f, '#a3a3ae');
      for (let i = 0; i < 2 + lv; i++) { const [px, py] = toScreen(v, ux(0.3 + ((i * 37) % 50) / 100), uy(0.35 + ((i * 53) % 50) / 100), 6 + (i % 3) * 5); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(px, py, 2.6 * v.z, 0, 7); ctx.fill(); }
      break;
    case 'ambar':
      prism(ctx, v, x0, y0, x1, y1, 0, 26 * f, '#c0784a'); pyramid(ctx, v, x0 - 0.05, y0 - 0.05, x1 + 0.05, y1 + 0.05, 26 * f, 18, '#7a3f22');
      prism(ctx, v, ux(0.4), y1 - 0.02, ux(0.62), y1, 0, 14, '#5a2e18');
      break;
    case 'kisla':
      prism(ctx, v, x0, uy(0.2), x1, uy(0.8), 0, 22 * f, '#e4d2b0'); pyramid(ctx, v, x0 - 0.05, uy(0.15), x1 + 0.05, uy(0.85), 22 * f, 18, '#b23a3a');
      flag(ctx, v, ux(0.9), uy(0.9), 0, '#e8505b');
      break;
    case 'ordugah':
      for (const [a, c] of [[0.1, 0.1], [0.55, 0.15], [0.15, 0.55]]) pyramid(ctx, v, ux(a), uy(c), ux(a + 0.32), uy(c + 0.32), 0, 22, lv >= 4 ? '#e9e2d0' : '#d8c89a');
      { const [px, py] = toScreen(v, ux(0.68), uy(0.68), 3); ctx.fillStyle = '#ff9f43'; ctx.beginPath(); ctx.arc(px, py, (3 + Math.sin(performance.now() / 120)) * v.z, 0, 7); ctx.fill(); }
      flag(ctx, v, ux(0.5), uy(0.5), 0, '#7c6cf0');
      break;
    case 'kule':
      prism(ctx, v, x0 + 0.1, y0 + 0.1, x1 - 0.1, y1 - 0.1, 0, 46 + lv * 3, '#c8bba4');
      prism(ctx, v, x0, y0, x1, y1, 46 + lv * 3, 8, lv >= 5 ? '#9fa8da' : '#d8ccb4');
      pyramid(ctx, v, x0 + 0.05, y0 + 0.05, x1 - 0.05, y1 - 0.05, 54 + lv * 3, 14, lv >= 5 ? '#3d5afe' : '#3a6aa8');
      break;
    case 'top': {
      prism(ctx, v, x0, y0, x1, y1, 0, 12, '#8d8d96');
      const [px, py] = toScreen(v, (x0 + x1) / 2, (y0 + y1) / 2, 18), a = o.aim || -0.6;
      ctx.strokeStyle = '#2b2b30'; ctx.lineWidth = 8 * v.z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 16 * v.z, py + Math.sin(a) * 9 * v.z - 4 * v.z); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#3a3a42'; ctx.beginPath(); ctx.arc(px, py, 7 * v.z, 0, 7); ctx.fill();
      break;
    }
    case 'sur':
      prism(ctx, v, x0 - 0.06, y0 - 0.06, x1 + 0.06, y1 + 0.06, 0, 14 + lv, lv >= 6 ? '#7d8597' : lv >= 3 ? '#a59f94' : '#b58a5a');
      break;
    case 'demirci':
      prism(ctx, v, x0, y0, x1, y1, 0, 20, '#5d5450'); pyramid(ctx, v, x0, y0, x1, y1, 20, 14, '#3b3330');
      prism(ctx, v, ux(0.15), uy(0.15), ux(0.32), uy(0.32), 20, 26, '#7b6e68');
      { const [px, py] = toScreen(v, ux(0.5), y1, 8); ctx.fillStyle = `rgba(255,${130 + Math.sin(performance.now() / 150) * 40},40,.9)`; ctx.beginPath(); ctx.arc(px, py, 4 * v.z, 0, 7); ctx.fill(); }
      break;
    case 'usta':
      prism(ctx, v, x0 + 0.1, y0 + 0.1, x1 - 0.1, y1 - 0.1, 0, 16, '#e9c46a'); pyramid(ctx, v, x0, y0, x1, y1, 16, 14, '#e76f51');
      break;
    default: prism(ctx, v, x0, y0, x1, y1, 0, 20, '#ccc');
  }
  ctx.globalAlpha = 1;
  const [cx, cy] = toScreen(v, b.x + s / 2, b.y + s / 2, 0);
  if (o.sel) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; poly(ctx, [toScreen(v, b.x, b.y), toScreen(v, b.x + s, b.y), toScreen(v, b.x + s, b.y + s), toScreen(v, b.x, b.y + s)], 'rgba(255,210,63,.18)'); ctx.stroke(); }
  if (o.hp != null && o.hp < 1) {
    const w = 30 * v.z * Math.max(1, s * 0.8), y = cy - (s * 40 + 20) * v.z;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(cx - w / 2, y, w, 5 * v.z); ctx.fillStyle = o.hp > 0.5 ? '#51cf66' : o.hp > 0.25 ? '#fcc419' : '#ff6b6b'; ctx.fillRect(cx - w / 2, y, w * o.hp, 5 * v.z);
  }
  if (o.busy) {
    const y = cy - (s * 30 + 34) * v.z;
    ctx.fillStyle = 'rgba(30,22,70,.85)'; ctx.fillRect(cx - 34 * v.z, y - 9 * v.z, 68 * v.z, 16 * v.z);
    ctx.fillStyle = '#4dd6c8'; ctx.fillRect(cx - 32 * v.z, y + 3 * v.z, 64 * v.z * o.busyP, 3 * v.z);
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(10 * v.z)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(o.busy, cx, y + 1 * v.z);
  }
  if (o.ready) {
    const y = cy - (s * 30 + 30) * v.z + Math.sin(performance.now() / 250) * 3 * v.z;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, y, 11 * v.z, 0, 7); ctx.fill(); ctx.strokeStyle = '#2b1f5c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = o.ready === 'a' ? '#f5b700' : o.ready === 'o' ? '#8d5a2b' : '#7ccf5a'; ctx.beginPath(); ctx.arc(cx, y, 7 * v.z, 0, 7); ctx.fill();
  }
}

export function drawGround(ctx, v, w, h, opt = {}) {
  ctx.fillStyle = opt.night ? '#2d4a3a' : '#6cbf5e'; ctx.fillRect(0, 0, w, h);
  for (let gx = -3; gx < GRID + 3; gx++) for (let gy = -3; gy < GRID + 3; gy++) {
    const inside = gx >= 0 && gy >= 0 && gx < GRID && gy < GRID;
    const p = [toScreen(v, gx, gy), toScreen(v, gx + 1, gy), toScreen(v, gx + 1, gy + 1), toScreen(v, gx, gy + 1)];
    const c = inside ? ((gx + gy) % 2 ? '#86d16f' : '#7cc966') : ((gx + gy) % 2 ? '#64b456' : '#5eac50');
    poly(ctx, p, c);
    if (opt.bad && opt.bad(gx, gy)) poly(ctx, p, 'rgba(240,70,90,.42)');
  }
  // dekor: ağaçlar ve taşlar köy dışında
  const deco = [[-2, 1], [-2, 6], [-1, 10], [13, 2], [13, 8], [14, 5], [3, -2], [9, -2], [4, 13], [10, 14], [-2, 13], [13, -1]];
  for (const [x, y] of deco) {
    const [px, py] = toScreen(v, x + 0.5, y + 0.5, 0);
    ctx.fillStyle = '#5a3d24'; ctx.fillRect(px - 2 * v.z, py - 14 * v.z, 4 * v.z, 14 * v.z);
    ctx.fillStyle = '#2f8a4a'; ctx.beginPath(); ctx.arc(px, py - 20 * v.z, 12 * v.z, 0, 7); ctx.fill(); ctx.fillStyle = '#3ca35a'; ctx.beginPath(); ctx.arc(px - 4 * v.z, py - 24 * v.z, 7 * v.z, 0, 7); ctx.fill();
  }
}

export function drawScene(ctx, v, w, h, bs, opt = {}) {
  drawGround(ctx, v, w, h, opt);
  const items = bs.map((b) => ({ d: b.x + b.y + B[b.k].sz, b }));
  if (opt.units) for (const u of opt.units) items.push({ d: u.x + u.y + 0.01, u });
  items.sort((a, b) => a.d - b.d);
  for (const it of items) {
    if (it.b) drawBuilding(ctx, v, it.b, opt.decor ? opt.decor(it.b) : {});
    else drawUnit(ctx, v, it.u);
  }
}

export function drawUnit(ctx, v, u) {
  const [x, y] = toScreen(v, u.x, u.y, 0), r = (u.big ? 9 : 6) * v.z * (u.sz >= 5 ? 1.35 : 1);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, 7); ctx.fill();
  const bob = Math.abs(Math.sin(u.walk || 0)) * 2 * v.z;
  ctx.fillStyle = u.col; ctx.beginPath(); ctx.arc(x, y - r - bob, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#1c1442'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(x, y - r * 2.1 - bob, r * 0.55, 0, 7); ctx.fill();
  if (u.k === 'okcu') { ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 1.5 * v.z; ctx.beginPath(); ctx.arc(x + r, y - r - bob, r * 0.9, -1.2, 1.2); ctx.stroke(); }
  else if (u.k === 'kocbasi') { ctx.fillStyle = '#5d4037'; ctx.fillRect(x - r * 1.4, y - r * 0.8 - bob, r * 2.8, r * 0.7); }
  else if (u.k === 'atli') { ctx.fillStyle = '#6d4c41'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.5, r * 1.3, r * 0.6, 0, 0, 7); ctx.fill(); ctx.fillStyle = u.col; ctx.beginPath(); ctx.arc(x, y - r * 1.3 - bob, r * 0.8, 0, 7); ctx.fill(); }
  else { ctx.strokeStyle = '#dfe6e9'; ctx.lineWidth = 2 * v.z; ctx.beginPath(); ctx.moveTo(x + r * 0.6, y - r - bob); ctx.lineTo(x + r * 1.6, y - r * 2 - bob - (u.hit ? 4 : 0)); ctx.stroke(); }
  if (u.hp < u.max) { const w = 16 * v.z; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - w / 2, y - r * 3.2 - bob, w, 3 * v.z); ctx.fillStyle = '#51cf66'; ctx.fillRect(x - w / 2, y - r * 3.2 - bob, w * Math.max(0, u.hp / u.max), 3 * v.z); }
}

// ---------------- savaş ----------------
const RESB = { tarla: 1, maden: 1, oduncu: 1, ambar: 1, konak: 1 };
export function createBattle(layout, army, smith = 0, dur = 180) {
  const bs = layout.map((b, i) => {
    const s = B[b.k].sz, max = bhp(b.k, b.lv);
    return { ...b, id: i, s, hp: max, max, alive: true, cx: b.x + s / 2, cy: b.y + s / 2, cool: 0, aim: -0.6 };
  });
  const occ = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  for (const b of bs) for (let i = 0; i < b.s; i++) for (let j = 0; j < b.s; j++) occ[b.y + j][b.x + i] = b;
  const bad = Array.from({ length: GRID + 6 }, () => Array(GRID + 6).fill(false));
  for (const b of bs) for (let i = -1; i <= b.s; i++) for (let j = -1; j <= b.s; j++) { const x = b.x + i + 3, y = b.y + j + 3; if (bad[y] && x >= 0 && x < GRID + 6) bad[y][x] = true; }
  const total = bs.filter((b) => b.k !== 'sur').length;
  return { bs, occ, bad, units: [], army: { ...army }, smith, t: 0, dur, proj: [], fx: [], pct: 0, stars: 0, konakDown: false, over: false, total, started: false, deployed: 0, uid: 1 };
}
export const canDeploy = (st, gx, gy) => {
  if (gx < -3 || gy < -3 || gx >= GRID + 3 || gy >= GRID + 3) return false;
  const r = st.bad[Math.floor(gy) + 3]; return !(r && r[Math.floor(gx) + 3]);
};
export function deploy(st, k, gx, gy) {
  if (st.over || !st.army[k] || !canDeploy(st, gx, gy)) return false;
  st.army[k]--; st.started = true; st.deployed++;
  const s = tStat(k, st.smith);
  st.units.push({ id: st.uid++, k, x: gx + (Math.random() - 0.5) * 0.3, y: gy + (Math.random() - 0.5) * 0.3, hp: s.hp, max: s.hp, s, col: s.col, sz: s.sz, big: s.sz >= 5, tgt: null, walk: 0, cd: 0 });
  return true;
}
const edgeDist = (u, b) => { const dx = Math.max(b.x - u.x, 0, u.x - (b.x + b.s)), dy = Math.max(b.y - u.y, 0, u.y - (b.y + b.s)); return Math.hypot(dx, dy); };

function pickTarget(st, u) {
  const live = st.bs.filter((b) => b.alive && b.k !== 'sur');
  if (!live.length) { const w = st.bs.filter((b) => b.alive); return nearest(u, w); }
  let pool = live;
  if (u.s.pref === 'res') { const p = live.filter((b) => RESB[b.k]); if (p.length) pool = p; }
  if (u.s.pref === 'def') { const p = live.filter((b) => b.k === 'kule' || b.k === 'top'); if (p.length) pool = p; }
  return nearest(u, pool);
}
function nearest(u, list) { let best = null, bd = 1e9; for (const b of list) { const d = edgeDist(u, b); if (d < bd) { bd = d; best = b; } } return best; }

export function stepBattle(st, dt) {
  if (st.over) return;
  if (st.started) st.t += dt;
  // birimler
  for (const u of st.units) {
    if (u.hp <= 0) continue;
    if (!u.tgt || !u.tgt.alive) { u.tgt = pickTarget(st, u); u.wall = null; }
    const tg = u.wall && u.wall.alive ? u.wall : u.tgt;
    if (!tg) continue;
    const d = edgeDist(u, tg);
    if (d <= u.s.r) {
      u.cd -= dt; u.hit = u.cd > 0.25;
      if (u.cd <= 0) {
        u.cd = 0.5;
        const dmg = u.s.dps * 0.5 * (u.k === 'kocbasi' && tg.k !== 'sur' ? 1.6 : 1);
        if (u.k === 'okcu') st.proj.push({ x: u.x, y: u.y, tx: tg.cx, ty: tg.cy, t: 0, T: 0.3, kind: 'ok', h0: 10, h1: 20 });
        tg.hp -= dmg;
        if (tg.hp <= 0 && tg.alive) killBuilding(st, tg);
      }
    } else {
      u.wall = null;
      const dx = tg.cx - u.x, dy = tg.cy - u.y, l = Math.hypot(dx, dy) || 1;
      const nx = u.x + (dx / l) * u.s.sp * dt, ny = u.y + (dy / l) * u.s.sp * dt;
      const cell = st.occ[Math.floor(ny)] && st.occ[Math.floor(ny)][Math.floor(nx)];
      if (cell && cell.alive && cell.k === 'sur' && cell !== tg) { u.wall = cell; }
      else { u.x = nx; u.y = ny; u.walk += dt * 12; }
    }
  }
  // hafif itişme
  for (let i = 0; i < st.units.length; i++) for (let j = i + 1; j < st.units.length; j++) {
    const a = st.units[i], b = st.units[j]; if (a.hp <= 0 || b.hp <= 0) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 0.28 && d > 0.001) { const o = (0.28 - d) / 2; a.x -= (dx / d) * o; a.y -= (dy / d) * o; b.x += (dx / d) * o; b.y += (dy / d) * o; }
  }
  // savunmalar
  for (const b of st.bs) {
    if (!b.alive) continue;
    const D = B[b.k].def; if (!D) continue;
    b.cool -= dt;
    let tgt = null, td = 1e9;
    for (const u of st.units) { if (u.hp <= 0) continue; const d = Math.hypot(u.x - b.cx, u.y - b.cy); if (d <= D.r && d < td) { td = d; tgt = u; } }
    if (!tgt) continue;
    const lvf = 1 + 0.3 * (b.lv - 1);
    if (D.kind === 'ok' && b.cool <= 0) {
      b.cool = 0.5;
      st.proj.push({ x: b.cx, y: b.cy, tx: tgt.x, ty: tgt.y, t: 0, T: 0.25, kind: 'ok', h0: 56, h1: 8, u: tgt, dmg: D.dps * 0.5 * lvf });
    }
    if (D.kind === 'top' && b.cool <= 0) {
      b.cool = D.rate; b.aim = Math.atan2((tgt.y - b.cy) + (tgt.x - b.cx), (tgt.x - b.cx) - (tgt.y - b.cy));
      st.proj.push({ x: b.cx, y: b.cy, tx: tgt.x, ty: tgt.y, t: 0, T: 0.7, kind: 'top', h0: 18, h1: 0, dmg: D.dmg * lvf, splash: D.splash });
    }
  }
  // mermiler
  for (const p of st.proj) {
    p.t += dt;
    if (p.t >= p.T && !p.done) {
      p.done = true;
      if (p.kind === 'ok' && p.u) { p.u.hp -= p.dmg; }
      if (p.kind === 'top') { st.fx.push({ x: p.tx, y: p.ty, t: 0, T: 0.4, k: 'boom' }); for (const u of st.units) if (u.hp > 0 && Math.hypot(u.x - p.tx, u.y - p.ty) < p.splash) u.hp -= p.dmg; }
    }
  }
  st.proj = st.proj.filter((p) => !p.done);
  for (const u of st.units) if (u.hp <= 0 && !u.dead) { u.dead = true; st.fx.push({ x: u.x, y: u.y, t: 0, T: 0.5, k: 'poof' }); }
  st.units = st.units.filter((u) => !u.dead);
  for (const f of st.fx) f.t += dt; st.fx = st.fx.filter((f) => f.t < f.T);
  // sonuç
  const left = Object.values(st.army).reduce((a, b) => a + b, 0);
  if (st.t >= st.dur || st.pct >= 100 || (st.started && !st.units.length && !left)) end(st);
}
function killBuilding(st, b) {
  b.alive = false; b.hp = 0;
  st.fx.push({ x: b.cx, y: b.cy, t: 0, T: 0.7, k: 'boom', big: true });
  if (b.k === 'konak') st.konakDown = true;
  const dead = st.bs.filter((x) => !x.alive && x.k !== 'sur').length;
  st.pct = Math.round((dead / Math.max(1, st.total)) * 100);
  st.stars = (st.pct >= 50 ? 1 : 0) + (st.konakDown ? 1 : 0) + (st.pct >= 100 ? 1 : 0);
  if (st.onKill) st.onKill(b);
}
function end(st) { st.over = true; if (st.onEnd) st.onEnd(st); }

export function drawBattle(ctx, v, w, h, st, opt = {}) {
  drawScene(ctx, v, w, h, st.bs, {
    units: st.units,
    bad: opt.showBad ? (gx, gy) => !canDeploy(st, gx + 0.5, gy + 0.5) : null,
    decor: (b) => ({ dead: !b.alive, hp: b.alive ? b.hp / b.max : null, aim: b.aim }),
  });
  for (const p of st.proj) {
    const f = Math.min(1, p.t / p.T), x = p.x + (p.tx - p.x) * f, y = p.y + (p.ty - p.y) * f;
    const hgt = p.h0 + (p.h1 - p.h0) * f + Math.sin(f * Math.PI) * (p.kind === 'top' ? 40 : 10);
    const [sx, sy] = toScreen(v, x, y, hgt);
    if (p.kind === 'ok') { ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 2 * v.z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 6 * v.z, sy - 2 * v.z); ctx.stroke(); }
    else { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(sx, sy, 5 * v.z, 0, 7); ctx.fill(); }
  }
  for (const f of st.fx) {
    const [sx, sy] = toScreen(v, f.x, f.y, 6), k = f.t / f.T;
    if (f.k === 'boom') { ctx.fillStyle = `rgba(255,${160 - k * 100},40,${1 - k})`; ctx.beginPath(); ctx.arc(sx, sy, (f.big ? 30 : 16) * v.z * (0.4 + k), 0, 7); ctx.fill(); ctx.fillStyle = `rgba(120,110,100,${0.6 - k * 0.6})`; ctx.beginPath(); ctx.arc(sx, sy - 10 * v.z * k, (f.big ? 24 : 10) * v.z * (0.5 + k), 0, 7); ctx.fill(); }
    else { ctx.fillStyle = `rgba(255,255,255,${0.8 - k})`; ctx.beginPath(); ctx.arc(sx, sy, 10 * v.z * (0.5 + k), 0, 7); ctx.fill(); }
  }
}
