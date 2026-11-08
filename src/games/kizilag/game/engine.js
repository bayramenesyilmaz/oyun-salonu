import * as D from './draw.js';
import { beep } from '../../bulutyaris/game/sfx.js';

const VH = 720;
const PW = 26, PHT = 54;
const GRAV = 2300, RUN = 310, JUMP = 830;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export const UPGRADES = [
  { id: 'bounce', name: 'Seken Çekirdek', desc: 'Mermi duvarlardan 1 kez daha seker', costs: [1, 2, 3] },
  { id: 'dmg', name: 'Ağır Mermi', desc: 'Her vuruş daha çok hasar verir', costs: [2, 3] },
  { id: 'mag', name: 'Genişletilmiş Şarjör', desc: '+2 mermi', costs: [1, 1, 2] },
  { id: 'reload', name: 'Hızlı Dolum', desc: 'Şarjör daha çabuk dolar', costs: [1, 1, 2] },
  { id: 'focus', name: 'Odak Kapasitesi', desc: 'Yavaş çekim daha uzun sürer', costs: [1, 2, 2] },
  { id: 'hp', name: 'Zırh Yeleği', desc: '+1 can', costs: [2, 3] },
  { id: 'pierce', name: 'Delici Uç', desc: 'Mermi bir düşmanı / camı delip geçer', costs: [3] },
];
export function stats(up = {}) {
  const l = (k) => up[k] || 0;
  return { bounces: 2 + l('bounce'), dmg: 1 + l('dmg'), mag: 6 + 2 * l('mag'), reload: 1.2 - 0.25 * l('reload'), focusMax: 1 + 0.5 * l('focus'), hp: 3 + l('hp'), pierce: l('pierce') };
}

// ---- geometri ----
export function rayBox(ox, oy, dx, dy, b) {
  let t0 = 0, t1 = Infinity, nx = 0, ny = 0;
  for (const ax of [0, 1]) {
    const o = ax ? oy : ox, d = ax ? dy : dx, mn = ax ? b.y : b.x, mx = ax ? b.y + b.h : b.x + b.w;
    if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) return null; continue; }
    let ta = (mn - o) / d, tb = (mx - o) / d, sgn = -1;
    if (ta > tb) { const q = ta; ta = tb; tb = q; sgn = 1; }
    if (ta > t0) { t0 = ta; nx = ax ? 0 : sgn; ny = ax ? sgn : 0; }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return null;
  }
  return { t: t0, nx, ny, inside: t0 === 0 };
}
const blocks = (s) => !(s.broken || (s.t === 'door' && s.open));

export class Engine {
  constructor(canvas, cb = {}) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.cb = cb;
    this.in = { l: 0, r: 0, jump: false, jumpHeld: false, fire: false, focus: false, ax: 0, ay: 0, reload: false, touchAim: false };
    this.t = 0; this.paused = false; this.sfx = true; this.L = null;
  }
  resize() { const r = this.cv.getBoundingClientRect(), d = Math.min(1.5, window.devicePixelRatio || 1); this.cv.width = r.width * d; this.cv.height = r.height * d; this.W = this.cv.width; this.H = this.cv.height; this.vig = null; }
  snd(...a) { if (this.sfx) try { beep(...a); } catch (e) {} }

  load(def, save) {
    this.def = def; this.save = save; this.st = stats(save.up);
    const L = this.L = {
      w: def.w, solids: def.solids.map((s) => ({ ...s })), switches: (def.switches || []).map((s) => ({ ...s, on: false })),
      term: (def.terms || []).map((s) => ({ ...s, on: false })), barrels: (def.barrels || []).map((b) => ({ ...b, dead: false })),
      pickups: (def.pickups || []).map((p) => ({ ...p, got: false })), exit: def.exit, lock: def.lock || null,
    };
    const mk = (e) => ({ ...e, hp: e.k === 'boss' ? def.bossHp || 12 : e.k === 'turret' ? 3 : 1, face: e.face || -1, cd: 1 + Math.random(), tele: 0, alert: 0, dead: 0, t: Math.random() * 9, ox: e.x, oy: e.y, aim: 0, burst: 0, shielded: e.k === 'boss', sTimer: 0 });
    this.enemies = (def.enemies || []).map(mk);
    this.total = this.enemies.length;
    this.p = { x: def.start.x, y: def.start.y, vx: 0, vy: 0, hp: this.st.hp, on: false, face: 1, ammo: this.st.mag, rel: 0, inv: 0, safe: { x: def.start.x, y: def.start.y }, coyote: 0, shootT: 0, aim: 0, dead: false };
    this.bullets = []; this.eb = []; this.parts = []; this.rings = [];
    this.focus = this.st.focusMax; this.focusing = false;
    this.stat = { kills: 0, rico: 0, hits: 0, shots: 0, time: 0, intel: [] };
    this.scale = 1; this.cx = def.start.x; this.zoom = 1; this.kc = 0; this.kcTarget = null; this.ts = 1;
    this.over = null; this.shake = 0; this.flash = 0; this.hints = def.hints || []; this.t = 0;
    this.openDoors();
    this.resize();
  }
  doorsFor(id) { return this.L.solids.filter((s) => s.t === 'door' && s.id === id); }
  openDoors() {}
  trigger(id) { for (const d of this.doorsFor(id)) { if (!d.open) { d.open = true; this.snd(300, 0.25, 'square', 0.12); this.addParts(d.x + d.w / 2, d.y + d.h / 2, 14, '#b02a3a', 260); } } this.shake = Math.max(this.shake, 6); }
  lockedOpen() {
    const k = this.L.lock; if (!k) return true;
    if (k === 'term') return this.L.term.every((t) => t.on);
    if (k === 'boss') return this.enemies.filter((e) => e.k === 'boss').every((e) => e.dead);
    if (k === 'all') return this.enemies.every((e) => e.dead);
    return true;
  }
  // ---- girdi → dünya ----
  toWorld(sx, sy) { const s = this.view(); return { x: this.cx + (sx - this.W / 2) / s, y: this.cy0 + (sy - this.H / 2) / s }; }
  view() { return (this.H / VH) * this.zoom; }

  // ---- çizim yardımcıları ----
  addParts(x, y, n, col, sp = 200, g = 600) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = sp * (0.3 + Math.random()); this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.5 + Math.random() * 0.5, max: 1, col, g, r: 2 + Math.random() * 3 }); } }

  // ---- kural: ışın engeli ----
  los(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    for (const s of this.L.solids) { if (!blocks(s) || s.t === 'glass') continue; const h = rayBox(x0, y0, dx, dy, s); if (h && h.t > 0 && h.t < 1) return false; }
    return true;
  }
  // bir atışı simüle et (tahmin çizgisi / çözücü). Etkileşimsiz — yalnızca yol ve ilk vuruş.
  trace(x, y, ang, maxB, full = true) {
    let dx = Math.cos(ang), dy = Math.sin(ang), px = x, py = y, b = maxB, pts = [{ x: px, y: py }], hit = null, tot = 0, rico = 0;
    for (let it = 0; it < 12 && tot < 4200; it++) {
      let best = null, bk = null;
      const test = (box, kind, obj) => { const h = rayBox(px, py, dx, dy, box); if (h && h.t > 0.01 && (!best || h.t < best.t)) { best = h; bk = { kind, obj }; } };
      for (const s of this.L.solids) if (blocks(s)) test(s, 'solid', s);
      for (const e of this.enemies) if (!e.dead) test(this.ebox(e), 'enemy', e);
      for (const o of this.L.barrels) if (!o.dead) test({ x: o.x - 17, y: o.y - 46, w: 34, h: 46 }, 'barrel', o);
      for (const o of this.L.switches) if (!o.on) test({ x: o.x - 16, y: o.y - 16, w: 32, h: 32 }, 'switch', o);
      for (const o of this.L.term) if (!o.on) test({ x: o.x - 22, y: o.y - 40, w: 44, h: 40 }, 'term', o);
      if (!best) { pts.push({ x: px + dx * 3000, y: py + dy * 3000 }); break; }
      px += dx * best.t; py += dy * best.t; tot += best.t; pts.push({ x: px, y: py });
      if (bk.kind !== 'solid') { hit = { ...bk, rico }; break; }
      const s = bk.obj;
      if (s.t === 'wall' || s.t === 'metal' || s.t === 'door' || s.t === 'ground') { if (b <= 0 && s.t !== 'metal') { hit = { kind: 'end' }; break; } if (s.t !== 'metal') b--; rico++; const dot = dx * best.nx + dy * best.ny; dx -= 2 * dot * best.nx; dy -= 2 * dot * best.ny; px += dx * 0.5; py += dy * 0.5; if (rico > 8) break; }
      else { hit = { kind: 'solid', obj: s, rico }; break; }
      if (!full && rico >= 1) break;
    }
    return { pts, hit };
  }
  ebox(e) {
    if (e.k === 'drone') return { x: e.x - 22, y: e.y - 14, w: 44, h: 28 };
    if (e.k === 'turret') return { x: e.x - 18, y: e.y - 16, w: 36, h: 32 };
    if (e.k === 'boss') return { x: e.x - 20, y: e.y - 70, w: 40, h: 70 };
    return { x: e.x - 13, y: e.y - 56, w: 26, h: 56 };
  }

  // ---- ana döngü ----
  step(rdt) {
    if (this.paused || !this.L || this.over) { this.render(); return; }
    rdt = Math.min(rdt, 0.05);
    const I = this.in, p = this.p;
    // odak
    const want = I.focus && this.focus > 0.02 && !p.dead;
    this.focusing = want;
    if (want) this.focus = Math.max(0, this.focus - rdt * 0.45); else this.focus = Math.min(this.st.focusMax, this.focus + rdt * 0.1);
    let tsT = want ? 0.22 : 1;
    if (this.kc > 0) { this.kc -= rdt; tsT = 0.12; this.zoom = lerp(this.zoom, 1.7, 0.1); } else this.zoom = lerp(this.zoom, want ? 1.12 : 1, 0.08);
    this.ts = lerp(this.ts, tsT, 0.25);
    const dt = rdt * this.ts;
    this.t += dt; this.stat.time += rdt;
    this.updatePlayer(dt, rdt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    for (const q of this.parts) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    this.parts = this.parts.filter((q) => q.life > 0);
    this.rings = this.rings.filter((r) => (r.t += dt) < r.max);
    this.shake = Math.max(0, this.shake - rdt * 30); this.flash = Math.max(0, this.flash - rdt * 2);
    // pickups
    for (const o of this.L.pickups) if (!o.got && Math.abs(o.x - p.x) < 30 && Math.abs(o.y - (p.y - 20)) < 44) {
      o.got = true;
      if (o.k === 'heart') { p.hp = Math.min(this.st.hp, p.hp + 1); this.snd(660, 0.15, 'sine', 0.1); this.cb.toast && this.cb.toast('+1 can'); }
      else { this.stat.intel.push(o.id); this.snd(880, 0.3, 'triangle', 0.1); this.cb.toast && this.cb.toast('İstihbarat belgesi bulundu'); this.cb.intel && this.cb.intel(o.id); }
    }
    // çıkış
    const ex = this.L.exit;
    if (!p.dead && this.lockedOpen() && p.x > ex.x && p.x < ex.x + ex.w && p.y > ex.y - 220 && p.y - PHT < ex.y + ex.h) this.finish(true);
    this.camera(rdt);
    this.render();
  }
  finish(win) {
    if (this.over) return;
    const allK = this.enemies.every((e) => e.dead);
    const s = { win, kills: this.stat.kills, total: this.total, rico: this.stat.rico, time: this.stat.time, intel: [...this.stat.intel], dmg: this.dmgTaken || 0, stars: 0 };
    if (win) { s.stars = 1 + (this.stat.rico >= (this.def.needRico || 2) ? 1 : 0) + (!this.dmgTaken ? 1 : 0); s.allK = allK; }
    this.over = s; this.snd(win ? 880 : 140, 0.5, win ? 'triangle' : 'sawtooth', 0.15);
    setTimeout(() => this.cb.end && this.cb.end(s), win ? 600 : 900);
  }
  hurt(n = 1, fromX) {
    const p = this.p; if (p.inv > 0 || p.dead || this.over) return;
    p.hp -= n; p.inv = 1.3; this.dmgTaken = (this.dmgTaken || 0) + n; this.shake = 14; this.flash = 1;
    if (fromX != null) { p.vx = (p.x > fromX ? 1 : -1) * 260; p.vy = -300; }
    this.addParts(p.x, p.y - 30, 14, '#ff4a6a', 260); this.snd(160, 0.2, 'sawtooth', 0.15);
    if (p.hp <= 0) { p.dead = 0.001; this.finish(false); }
  }
  collide(b, s) { return b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y; }
  updatePlayer(dt, rdt) {
    const p = this.p, I = this.in;
    if (p.dead) { p.dead += rdt; return; }
    p.inv = Math.max(0, p.inv - dt); p.shootT = Math.max(0, p.shootT - dt);
    const mv = (I.r - I.l);
    const tv = mv * RUN; p.vx = lerp(p.vx, tv, p.on ? 0.3 : 0.14);
    if (Math.abs(mv) > 0.1) p.run = true; else p.run = false;
    p.vy += GRAV * dt; p.coyote = p.on ? 0.1 : Math.max(0, p.coyote - dt);
    if (I.jump) { I.jump = false; if (p.coyote > 0) { p.vy = -JUMP; p.on = false; p.coyote = 0; this.snd(520, 0.08, 'square', 0.06); } }
    if (!I.jumpHeld && p.vy < -300) p.vy += 3500 * dt;
    // x
    p.x += p.vx * dt;
    let bx = { x: p.x - PW / 2, y: p.y - PHT, w: PW, h: PHT };
    for (const s of this.L.solids) if (blocks(s) && this.collide(bx, s)) { if (p.vx > 0) p.x = s.x - PW / 2 - 0.01; else if (p.vx < 0) p.x = s.x + s.w + PW / 2 + 0.01; p.vx = 0; bx.x = p.x - PW / 2; }
    p.x = clamp(p.x, PW / 2, this.L.w - PW / 2);
    p.y += p.vy * dt; p.on = false;
    bx = { x: p.x - PW / 2, y: p.y - PHT, w: PW, h: PHT };
    for (const s of this.L.solids) if (blocks(s) && this.collide(bx, s)) { if (p.vy > 0) { p.y = s.y; p.on = true; p.safe = { x: p.x, y: p.y }; } else p.y = s.y + s.h + PHT; p.vy = 0; bx.y = p.y - PHT; }
    if (p.y > VH + 260) { this.hurt(1); if (!p.dead) { p.x = p.safe.x - 40 * p.face; p.y = p.safe.y - 2; p.vx = p.vy = 0; } }
    // nişan / ateş
    const w = this.toWorld(I.ax, I.ay);
    p.aim = Math.atan2(w.y - (p.y - 62), w.x - (p.x + 2 * p.face));
    if (Math.cos(p.aim) !== 0) p.face = Math.cos(p.aim) >= 0 ? 1 : -1; else if (mv) p.face = mv > 0 ? 1 : -1;
    if (p.rel > 0) { p.rel -= dt; if (p.rel <= 0) { p.ammo = this.st.mag; this.snd(700, 0.08, 'square', 0.06); } }
    if (I.reload && p.rel <= 0 && p.ammo < this.st.mag) { p.rel = this.st.reload; this.snd(260, 0.1, 'square', 0.06); }
    I.reload = false;
    if (I.fire) { I.fire = false; this.shoot(); }
  }
  shoot() {
    const p = this.p; if (p.rel > 0 || p.dead) return;
    if (p.ammo <= 0) { p.rel = this.st.reload; return; }
    p.ammo--; this.stat.shots++; p.shootT = 0.1;
    const a = p.aim, ox = p.x + 2 * p.face + Math.cos(a) * 36, oy = p.y - 62 + Math.sin(a) * 36;
    this.bullets.push({ x: ox, y: oy, dx: Math.cos(a), dy: Math.sin(a), v: 1900, b: this.st.bounces, rico: 0, pierce: this.st.pierce, life: 3, trail: [{ x: ox, y: oy }], metal: 0 });
    this.snd(this.focusing ? 340 : 480, 0.06, 'square', 0.1); this.shake = Math.max(this.shake, 2);
    this.parts.push({ x: ox, y: oy, vx: 0, vy: 0, life: 0.06, max: 1, col: '#fff3b0', g: 0, r: 9 });
    if (p.ammo <= 0) p.rel = this.st.reload;
  }
  killEnemy(e, rico, fromBullet) {
    if (e.dead) return;
    e.dead = 0.001; this.stat.kills++; if (rico > 0) this.stat.rico++;
    this.addParts(e.x, e.y - 30, 16, '#ff6a7a', 300);
    this.snd(rico ? 880 : 200, 0.15, rico ? 'triangle' : 'sawtooth', 0.12);
    this.focus = Math.min(this.st.focusMax, this.focus + (rico ? 0.3 : 0.12));
    const last = this.enemies.every((q) => q.dead);
    if ((rico > 0 || last || e.k === 'boss') && !this.over) { this.kc = e.k === 'boss' ? 1.4 : 0.85; this.kcTarget = { x: e.x, y: e.y - 30 }; if (rico > 0) this.cb.toast && this.cb.toast('SEKME VURUŞU!'); }
    if (e.k === 'boss') { this.shake = 24; this.addParts(e.x, e.y - 40, 60, '#ffd27a', 500); }
  }
  explode(o) {
    if (o.dead) return; o.dead = true; const r = 170;
    this.rings.push({ x: o.x, y: o.y - 22, t: 0, max: 0.5, r }); this.shake = 20; this.addParts(o.x, o.y - 22, 40, '#ffb347', 450); this.snd(90, 0.35, 'sawtooth', 0.2);
    for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - o.x, e.y - 30 - o.y) < r) { e.hp = 0; this.killEnemy(e, 1, true); }
    for (const q of this.L.barrels) if (!q.dead && q !== o && Math.hypot(q.x - o.x, q.y - o.y) < r) setTimeout(() => this.explode(q), 120);
    for (const s of this.L.solids) if (s.t === 'glass' && !s.broken && Math.hypot(s.x + s.w / 2 - o.x, s.y + s.h / 2 - o.y) < r + 60) s.broken = true;
    const p = this.p; if (Math.hypot(p.x - o.x, p.y - 30 - o.y) < r * 0.9) this.hurt(1, o.x);
  }
  updateBullets(dt) {
    for (const b of this.bullets) {
      let rem = b.v * dt; b.life -= dt;
      for (let g = 0; g < 10 && rem > 0 && !b.dead; g++) {
        let best = null, bk = null;
        const test = (box, kind, obj) => { const h = rayBox(b.x, b.y, b.dx, b.dy, box); if (h && h.t >= 0 && h.t <= rem && (!best || h.t < best.t) && !(b.ign && b.ign === obj)) { best = h; bk = { kind, obj }; } };
        for (const s of this.L.solids) if (blocks(s)) test(s, 'solid', s);
        for (const e of this.enemies) if (!e.dead) test(this.ebox(e), 'enemy', e);
        if (b.rico > 0 && !this.p.dead) test({ x: this.p.x - 13, y: this.p.y - 54, w: 26, h: 54 }, 'player', this.p);
        for (const o of this.L.barrels) if (!o.dead) test({ x: o.x - 17, y: o.y - 46, w: 34, h: 46 }, 'barrel', o);
        for (const o of this.L.switches) if (!o.on) test({ x: o.x - 16, y: o.y - 16, w: 32, h: 32 }, 'switch', o);
        for (const o of this.L.term) if (!o.on) test({ x: o.x - 22, y: o.y - 40, w: 44, h: 40 }, 'term', o);
        if (!best) { b.x += b.dx * rem; b.y += b.dy * rem; break; }
        b.x += b.dx * best.t; b.y += b.dy * best.t; rem -= best.t; b.trail.push({ x: b.x, y: b.y });
        const { kind, obj } = bk;
        if (kind === 'solid') {
          if (obj.t === 'glass') { obj.broken = true; this.addParts(b.x, b.y, 14, '#bfeaff', 260); this.snd(1200, 0.1, 'triangle', 0.1); if (b.pierce > 0) { b.pierce--; b.x += b.dx * 2; b.y += b.dy * 2; continue; } b.dead = true; }
          else if (obj.t === 'crate') { this.addParts(b.x, b.y, 8, '#9a6b3a', 180); b.dead = true; this.snd(200, 0.05, 'square', 0.06); }
          else {
            if (obj.t !== 'metal') { if (b.b <= 0) { b.dead = true; this.addParts(b.x, b.y, 6, '#ffd27a', 180); continue; } b.b--; }
            b.rico++; const dot = b.dx * best.nx + b.dy * best.ny; b.dx -= 2 * dot * best.nx; b.dy -= 2 * dot * best.ny; b.x += best.nx * 0.5; b.y += best.ny * 0.5;
            this.addParts(b.x, b.y, 6, '#ffe08a', 220, 0); this.snd(1000 + b.rico * 120, 0.05, 'triangle', 0.08); if (b.rico > 9) b.dead = true;
          }
        } else if (kind === 'enemy') {
          const e = obj;
          if (e.k === 'shield' && b.dx * e.face < 0 && ((best.nx !== 0) || true) && Math.abs(best.nx) > 0.5 && best.nx * e.face > 0) { b.rico++; b.dx = -b.dx; b.x += best.nx * 1; this.addParts(b.x, b.y, 8, '#cfe9ff', 240, 0); this.snd(1400, 0.08, 'triangle', 0.1); continue; }
          if (e.k === 'boss' && e.shielded) { b.dead = true; this.addParts(b.x, b.y, 10, '#cfe9ff', 260, 0); this.snd(1500, 0.06, 'triangle', 0.1); continue; }
          const eb0 = this.ebox(e); if (e.k !== 'drone' && e.k !== 'turret' && b.y < eb0.y + 17) { if (e.k === 'boss') e.hp -= this.st.dmg * 2; else e.hp = 0; this.cb.toast && this.cb.toast('KAFADAN!'); } else e.hp -= this.st.dmg; this.stat.hits++; this.addParts(b.x, b.y, 8, '#ff6a7a', 220); e.hit = 0.12;
          if (e.hp <= 0) this.killEnemy(e, b.rico, true); else this.snd(300, 0.05, 'square', 0.08);
          if (b.pierce > 0 && e.k !== 'boss') { b.pierce--; b.ign = e; b.x += b.dx * 3; b.y += b.dy * 3; continue; }
          b.dead = true;
        } else if (kind === 'player') { b.dead = true; const hs = b.y < this.p.y - 40; if (hs) { this.p.inv = 0; this.hurt(99); this.cb.toast && this.cb.toast('Kafadan! Kendi mermin'); } else { this.hurt(1, b.x - b.dx * 40); this.cb.toast && this.cb.toast('Kendi mermin!'); } }
        else if (kind === 'barrel') { this.explode(obj); b.dead = true; }
        else if (kind === 'switch') { obj.on = true; this.trigger(obj.id); if (b.rico) this.stat.rico += 0; b.dead = true; this.cb.toast && this.cb.toast('Anahtar çalıştı'); }
        else if (kind === 'term') {
          obj.on = true; b.dead = true; this.snd(900, 0.25, 'triangle', 0.14); this.addParts(obj.x, obj.y - 30, 18, '#7bff9a', 300);
          if (obj.id) this.trigger(obj.id);
          if (obj.boss) { for (const e of this.enemies) if (e.k === 'boss') { e.shielded = false; e.sTimer = 9; } this.cb.toast && this.cb.toast('Kalkan düştü! Şimdi vur!'); setTimeout(() => { obj.on = false; }, 9500); }
          else this.cb.toast && this.cb.toast('Ağ terminali çözüldü');
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead && b.life > 0);
    // düşman mermileri
    for (const b of this.eb) {
      b.life -= dt; const st = b.v * dt, steps = Math.ceil(st / 12);
      for (let i = 0; i < steps; i++) {
        b.x += b.dx * st / steps; b.y += b.dy * st / steps;
        const pb = { x: this.p.x - PW / 2, y: this.p.y - PHT, w: PW, h: PHT };
        if (b.x > pb.x && b.x < pb.x + pb.w && b.y > pb.y && b.y < pb.y + pb.h) { b.dead = true; if (b.y < pb.y + 14) { this.p.inv = 0; this.hurt(99); this.cb.toast && this.cb.toast('Kafadan vuruldun'); } else this.hurt(1, b.x - b.dx * 40); break; }
        if (this.L.solids.some((s) => blocks(s) && b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h)) { b.dead = true; this.addParts(b.x, b.y, 4, '#ff9a7a', 120, 0); break; }
      }
    }
    this.eb = this.eb.filter((b) => !b.dead && b.life > 0);
  }
  fireEnemy(e, spd, ang, spread = 0) {
    const a = ang + (Math.random() - 0.5) * spread;
    this.eb.push({ x: e.x + Math.cos(a) * 26, y: e.gy + Math.sin(a) * 26, dx: Math.cos(a), dy: Math.sin(a), v: spd, life: 3 });
    this.snd(260, 0.06, 'square', 0.06);
  }
  updateEnemies(dt) {
    const p = this.p, px = p.x, py = p.y - 30;
    for (const e of this.enemies) {
      e.t += dt; e.hit = Math.max(0, (e.hit || 0) - dt);
      if (e.dead) { e.dead += dt; continue; }
      e.gy = e.k === 'drone' ? e.y : e.k === 'turret' ? e.y : e.k === 'boss' ? e.y - 44 : e.y - 38;
      const dx = px - e.x, dy = py - e.gy, dist = Math.hypot(dx, dy);
      const range = { guard: 720, sniper: 1400, shield: 680, drone: 760, turret: 860, boss: 1400 }[e.k];
      let sees = !p.dead && dist < range && this.los(e.x, e.gy, px, py) && (e.alert > 0 || dist < 190 || (dx > 0) === (e.face > 0) || e.k === 'drone' || e.k === 'turret' || e.k === 'boss');
      if (sees) { if (e.alert <= 0) this.snd(700, 0.06, 'square', 0.05); e.alert = 5; }
      else e.alert = Math.max(0, e.alert - dt);
      if (e.alert > 0 && !p.dead) e.face = dx >= 0 ? 1 : -1;
      else if (e.patrol) { e.x += e.face * 50 * dt; if (Math.abs(e.x - e.ox) > e.patrol) e.face *= -1; }
      e.aim = Math.atan2(dy, dx);
      e.cd -= dt;
      if (e.k === 'shield' && e.alert > 0 && dist > 220) { const nx = e.x + e.face * 70 * dt; const b = { x: nx - 13, y: e.y - 56, w: 26, h: 56 }; if (!this.L.solids.some((s) => blocks(s) && this.collide(b, s))) e.x = nx; }
      if (e.k === 'drone') { const tx = px - e.face * 0 + Math.sin(e.t) * 140, ty = e.oy + Math.sin(e.t * 1.3) * 30; e.x += clamp(tx - e.x, -1, 1) * Math.min(Math.abs(tx - e.x), 130) * dt * (e.alert > 0 ? 1.4 : 0); e.y = lerp(e.y, ty, 0.05); }
      if (e.k === 'boss') {
        if (e.sTimer > 0) { e.sTimer -= dt; if (e.sTimer <= 0) { e.shielded = true; this.cb.toast && this.cb.toast('Kalkan geri geldi — terminali tekrar vur'); } }
        if (e.alert > 0) { const tx = e.ox + Math.sin(e.t * 0.5) * (e.patrol || 260); e.x += clamp(tx - e.x, -1, 1) * 120 * dt; }
      }
      if (e.alert > 0 && !p.dead) {
        if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) {
          if (e.k === 'sniper') this.fireEnemy(e, 1500, e.aim, 0.02);
          else if (e.k === 'turret') { this.fireEnemy(e, 760, e.aim, 0.1); e.burst++; if (e.burst < 3) { e.tele = 0.18; } else { e.burst = 0; e.cd = 2.2; } }
          else if (e.k === 'boss') { for (let i = -1; i <= 1; i++) this.fireEnemy(e, 720, e.aim + i * 0.18, 0.04); e.cd = 1.5; }
          else this.fireEnemy(e, e.k === 'drone' ? 620 : 700, e.aim, 0.12);
          if (e.k !== 'turret') e.cd = { guard: 1.7, sniper: 3.2, shield: 2.2, drone: 2.2, boss: 1.5 }[e.k];
        } }
        else if (e.cd <= 0) e.tele = { guard: 0.6, sniper: 1.1, shield: 0.7, drone: 0.55, turret: 0.5, boss: 0.7 }[e.k];
      }
    }
  }
  camera(rdt) {
    const p = this.p, s0 = this.H / VH, vw = this.W / s0;
    let tx = p.x + p.face * 90, ty = 360;
    if (this.kc > 0 && this.kcTarget) { tx = this.kcTarget.x; ty = this.kcTarget.y; }
    const s = s0 * this.zoom, hw = this.W / s / 2, hh = this.H / s / 2;
    tx = clamp(tx, hw, Math.max(hw, this.L.w - hw)); ty = clamp(ty, hh, VH - hh);
    if (vw > this.L.w) tx = this.L.w / 2;
    this.cx = lerp(this.cx, tx, this.kc > 0 ? 0.2 : 0.12); this.cy0 = lerp(this.cy0 == null ? 360 : this.cy0, ty, this.kc > 0 ? 0.2 : 0.2);
  }

  // ---- çizim ----
  render() {
    const c = this.c, W = this.W, H = this.H, L = this.L; if (!L) return;
    const s = this.view(), t = this.t, p = this.p;
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const cam = { x: this.cx - W / s / 2 };
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    D.drawBackground(c, this.def.theme, W, H, cam, t);
    c.save(); c.translate(W / 2 + sx, H / 2 + sy); c.scale(s, s); c.translate(-this.cx, -(this.cy0 == null ? 360 : this.cy0));
    for (const l of this.def.lamps || []) D.drawLamp(c, l);
    for (const q of this.def.posters || []) D.drawPoster(c, q, t);
    c.textAlign = 'center';
    for (const h of this.hints) { c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '700 20px "Barlow Condensed", sans-serif'; c.fillText(h.text, h.x, h.y); }
    for (const sd of L.solids) D.drawSolid(c, sd, t);
    D.drawExit(c, L.exit, this.lockedOpen(), t);
    for (const o of L.switches) D.drawSwitch(c, o, t);
    for (const o of L.term) D.drawTerminal(c, o, t);
    for (const o of L.barrels) if (!o.dead) D.drawBarrel(c, o);
    for (const o of L.pickups) if (!o.got) D.drawPickup(c, o, t);
    for (const e of this.enemies) this.drawEnemy(c, e, t);
    this.drawPlayer(c, t);
    // tahmin çizgisi
    if (!p.dead && !this.over && (this.focusing || this.mouseAim)) { const tr = this.trace(p.x + 2 * p.face + Math.cos(p.aim) * 36, p.y - 62 + Math.sin(p.aim) * 36, p.aim, this.st.bounces, this.focusing); c.strokeStyle = this.focusing ? 'rgba(255,230,120,.9)' : 'rgba(255,255,255,.28)'; c.lineWidth = this.focusing ? 2.5 : 1.5; c.setLineDash(this.focusing ? [] : [6, 8]); c.beginPath(); tr.pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke(); c.setLineDash([]); if (this.focusing && tr.hit) { c.fillStyle = '#ffe08a'; const q = tr.pts[tr.pts.length - 1]; c.beginPath(); c.arc(q.x, q.y, 5, 0, 6.283); c.fill(); } }
    for (const b of this.bullets) { c.strokeStyle = '#fff6c0'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); const tr = b.trail; c.moveTo(tr[Math.max(0, tr.length - 3)].x, tr[Math.max(0, tr.length - 3)].y); c.lineTo(tr[tr.length - 1].x, tr[tr.length - 1].y); c.lineTo(b.x, b.y); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, 4, 0, 6.283); c.fill(); }
    for (const b of this.eb) { c.fillStyle = '#ff4056'; c.beginPath(); c.arc(b.x, b.y, 6, 0, 6.283); c.fill(); }
    for (const q of this.parts) { c.globalAlpha = clamp(q.life * 2, 0, 1); c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); } c.globalAlpha = 1;
    for (const r of this.rings) { const k = r.t / r.max; c.strokeStyle = `rgba(255,190,90,${1 - k})`; c.lineWidth = 8 * (1 - k); c.beginPath(); c.arc(r.x, r.y, r.r * k, 0, 6.283); c.stroke(); c.fillStyle = `rgba(255,220,150,${0.4 * (1 - k)})`; c.fill(); }
    c.restore();
    // ekran efektleri
    if (this.focusing) { if (!this.vig) { const v = this.vig = document.createElement('canvas'); v.width = Math.ceil(W / 4); v.height = Math.ceil(H / 4); const x = v.getContext('2d'), g = x.createRadialGradient(v.width / 2, v.height / 2, v.height * 0.3, v.width / 2, v.height / 2, v.height * 0.9); g.addColorStop(0, 'rgba(20,30,80,0)'); g.addColorStop(1, 'rgba(10,20,70,.55)'); x.fillStyle = g; x.fillRect(0, 0, v.width, v.height); } c.drawImage(this.vig, 0, 0, W, H); }
    if (this.kc > 0) { c.fillStyle = 'rgba(0,0,0,.85)'; const bh = H * 0.1 * Math.min(1, this.kc * 4); c.fillRect(0, 0, W, bh); c.fillRect(0, H - bh, W, bh); }
    if (this.flash > 0) { c.fillStyle = `rgba(255,40,70,${this.flash * 0.35})`; c.fillRect(0, 0, W, H); }
  }
  drawPlayer(c, t) {
    const p = this.p; if (p.inv > 0 && Math.floor(p.inv * 14) % 2) return;
    D.drawPerson(c, { x: p.x, y: p.y, face: p.face, run: p.run && p.on, air: !p.on, aim: p.aim, t, kind: 'agent', dead: p.dead, shootT: p.shootT, scale: 1 });
  }
  drawEnemy(c, e, t) {
    const dead = e.dead; if (dead > 1.2) return;
    const alpha = dead ? Math.max(0, 1 - dead / 1.2) : 1;
    c.save(); c.globalAlpha = alpha;
    if (!dead && e.tele > 0) { // telegraf lazeri
      const x0 = e.x, y0 = e.gy, a = e.aim; c.strokeStyle = `rgba(255,50,70,${0.4 + 0.4 * Math.sin(t * 40)})`; c.lineWidth = 2; c.setLineDash([10, 6]);
      const tr = { x: x0 + Math.cos(a) * 1400, y: y0 + Math.sin(a) * 1400 }; let end = tr; let bt = 1;
      for (const s of this.L.solids) { if (!blocks(s)) continue; const h = rayBox(x0, y0, tr.x - x0, tr.y - y0, s); if (h && h.t > 0 && h.t < bt) bt = h.t; }
      end = { x: x0 + (tr.x - x0) * bt, y: y0 + (tr.y - y0) * bt }; c.beginPath(); c.moveTo(x0, y0); c.lineTo(end.x, end.y); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#ff4056'; c.font = '800 24px sans-serif'; c.textAlign = 'center'; c.fillText('!', e.x, e.y - 90);
    } else if (!dead && e.alert > 0 && e.k !== 'turret') { c.fillStyle = '#ffd27a'; c.font = '800 22px sans-serif'; c.textAlign = 'center'; c.fillText('?', e.x, e.y - 84); }
    const f = { x: e.x, y: e.y, face: e.face, run: e.patrol || e.k === 'shield' ? 1 : 0, aim: e.aim, t: e.t, kind: e.k === 'turret' || e.k === 'drone' ? 'guard' : e.k, dead: dead, hurt: e.hit > 0, scale: e.k === 'boss' ? 1.3 : 1 };
    if (e.k === 'drone') D.drawDrone(c, { x: e.x, y: e.y, t: e.t, dead, alert: e.alert > 0 });
    else if (e.k === 'turret') D.drawTurret(c, { x: e.x, y: e.y, aim: e.aim });
    else { f.run = e.patrol || (e.k === 'shield' && e.alert > 0) ? 1 : 0; D.drawPerson(c, f); }
    if (e.k === 'boss' && e.shielded && !dead) { c.strokeStyle = 'rgba(150,215,255,.8)'; c.lineWidth = 4; c.fillStyle = 'rgba(150,215,255,.15)'; c.beginPath(); c.arc(e.x, e.y - 46, 70, 0, 6.283); c.fill(); c.stroke(); }
    if (e.hit > 0 && !dead) { c.fillStyle = 'rgba(255,255,255,.35)'; const b = this.ebox(e); c.fillRect(b.x, b.y, b.w, b.h); }
    if ((e.k === 'boss' || e.k === 'turret') && !dead) { const mx = e.k === 'boss' ? this.def.bossHp || 12 : 3, bw = 70; c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(e.x - bw / 2, e.y - (e.k === 'boss' ? 130 : 36), bw, 6); c.fillStyle = '#ff4056'; c.fillRect(e.x - bw / 2, e.y - (e.k === 'boss' ? 130 : 36), bw * Math.max(0, e.hp) / mx, 6); }
    c.restore();
  }
  hud() { const p = this.p || {}, st = this.st || {}; return p.hp == null ? null : { hp: p.hp, maxHp: st.hp, ammo: p.ammo, mag: st.mag, rel: p.rel > 0, focus: this.focus / (st.focusMax || 1), kills: this.stat.kills, total: this.total, locked: !this.lockedOpen() }; }
}
