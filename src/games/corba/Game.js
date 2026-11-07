// Çorba Savaşı: 2B "yut ve büyü". Mantı olarak çorbada yüz, malzeme ye, küçükleri yut, büyüklerden kaç.
import * as S from '../bulutyaris/game/sfx.js';
const W = 2600, H = 2600, TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const COLS = ['#ff6b5a', '#ffc83d', '#59c46b', '#4aa3ff', '#b46bff', '#ff8fb8', '#3fd1c4', '#ff9a3d'];
const NAMES = ['Mantı', 'Erişte', 'Nohut', 'Kaşık', 'Bulgur', 'Havuç', 'Şehriye', 'Fesleğen', 'Köfte', 'Pırasa'];
const FOODS = [['#ff6b5a', 1], ['#ffc83d', 1], ['#59c46b', 1], ['#ff9a3d', 1.4], ['#d9a066', 1.2]];
export const radiusOf = (m) => 14 + Math.sqrt(m) * 3.2;
export const MATCH_T = 180;

export class Soup {
  constructor(cv, cb = {}) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.cb = cb;
    this.state = 'idle'; this.input = { x: 0, y: 0, dash: false, has: false };
    this.last = performance.now(); this.acc = 0; this.running = true;
    this.resize(); this._rs = () => this.resize(); addEventListener('resize', this._rs);
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  resize() { const d = Math.min(2, devicePixelRatio || 1); this.cv.width = innerWidth * d; this.cv.height = innerHeight * d; this.dpr = d; }
  destroy() { this.running = false; removeEventListener('resize', this._rs); }
  start({ nick = 'Sen', color = 0, level = 1 } = {}) {
    this.t = 0; this.state = 'play'; this.level = level; this.over = null; this.feed = [];
    this.food = []; for (let i = 0; i < 380; i++) this.food.push(this.mkFood());
    this.spikes = []; for (let i = 0; i < 9; i++) this.spikes.push({ x: rnd(200, W - 200), y: rnd(200, H - 200), r: 46 });
    this.blobs = [];
    this.me = this.mkBlob(nick, color, false); this.blobs.push(this.me);
    const n = 9, cols = COLS.filter((_, i) => i !== color % 8);
    for (let i = 0; i < n; i++) {
      const b = this.mkBlob(NAMES[i], COLS.indexOf(cols[i % cols.length]), true);
      b.skill = clamp(0.35 + level * 0.12 + Math.random() * 0.3, 0.3, 1);
      b.mass = rnd(10, 30); this.blobs.push(b);
    }
    this.cam = { x: this.me.x, y: this.me.y, z: 1 };
    this.parts = [];
  }
  mkFood() { const f = FOODS[(Math.random() * FOODS.length) | 0]; return { x: rnd(20, W - 20), y: rnd(20, H - 20), c: f[0], m: f[1], ph: Math.random() * 6 }; }
  mkBlob(name, color, bot) {
    return { name, color, bot, x: rnd(300, W - 300), y: rnd(300, H - 300), vx: 0, vy: 0, mass: 12, dash: 0, dashCd: 0, shield: 1.5, dead: false, respawn: 0, kills: 0, aim: rnd(0, TAU), think: 0, tgt: null, fear: 0, peak: 12, chili: 0 };
  }
  step(dt) {
    if (this.state !== 'play') return;
    this.t += dt;
    for (const b of this.blobs) {
      if (b.dead) { b.respawn -= dt; if (b.respawn <= 0) this.respawnB(b); continue; }
      if (b.bot) this.botThink(b, dt);
      else { const i = this.input; if (i.has) { const m = Math.hypot(i.x, i.y); if (m > 0.05) { b.ax = i.x / m; b.ay = i.y / m; b.mag = Math.min(1, m); } else b.mag = 0; } else b.mag = 0; if (i.dash) { this.doDash(b); } }
      this.moveB(b, dt);
    }
    // yeme
    for (const b of this.blobs) {
      if (b.dead) continue;
      const r = radiusOf(b.mass);
      for (let i = this.food.length - 1; i >= 0; i--) {
        const f = this.food[i], dx = f.x - b.x, dy = f.y - b.y;
        if (dx * dx + dy * dy < r * r) { b.mass += f.m; this.food[i] = this.mkFood(); }
      }
      if (b.mass > b.peak) b.peak = b.mass;
    }
    while (this.food.length < 380) this.food.push(this.mkFood());
    // diken: büyük blob dikene çarparsa küçülür
    for (const b of this.blobs) {
      if (b.dead || b.shield > 0) continue;
      for (const s of this.spikes) {
        const d = Math.hypot(s.x - b.x, s.y - b.y), r = radiusOf(b.mass);
        if (d < r + s.r * 0.7 && b.mass > 40) { const lost = b.mass * 0.35; b.mass -= lost; this.burst(b.x, b.y, b.color, 14); for (let k = 0; k < 8; k++) this.food.push({ x: b.x + rnd(-r, r), y: b.y + rnd(-r, r), c: COLS[b.color % 8], m: lost / 8, ph: 0 }); b.shield = 0.8; if (!b.bot) { S.boom(); this.toast('Dikene çarptın!'); } }
      }
    }
    // yutma
    for (const a of this.blobs) {
      if (a.dead || a.shield > 0) continue;
      for (const v of this.blobs) {
        if (v === a || v.dead || v.shield > 0) continue;
        const ra = radiusOf(a.mass), rv = radiusOf(v.mass), d = Math.hypot(a.x - v.x, a.y - v.y);
        if (a.mass > v.mass * 1.18 && d < ra - rv * 0.35) { this.eat(a, v); }
      }
    }
    for (const b of this.blobs) { if (b.shield > 0) b.shield -= dt; if (b.dashCd > 0) b.dashCd -= dt; if (b.dash > 0) b.dash -= dt; if (b.chili > 0) b.chili -= dt; b.mass = Math.max(8, b.mass - dt * b.mass * 0.0012); }
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const f of this.feed) f.t -= dt; this.feed = this.feed.filter((f) => f.t > 0);
    if (this.toastT > 0) this.toastT -= dt;
    if (this.t >= MATCH_T && !this.over) this.finish();
  }
  respawnB(b) { b.dead = false; b.mass = 10; b.x = rnd(300, W - 300); b.y = rnd(300, H - 300); b.shield = 2; b.vx = b.vy = 0; }
  eat(a, v) {
    a.mass += v.mass * 0.8; a.kills++; v.dead = true; v.respawn = v === this.me ? 2.5 : 3;
    this.burst(v.x, v.y, v.color, 24);
    this.feed.push({ t: 4, a: a.name, v: v.name, me: a === this.me || v === this.me });
    if (v === this.me) { S.boom(); this.toast(a.name + ' seni yuttu!'); this.deaths = (this.deaths || 0) + 1; }
    else if (a === this.me) { S.pick(); this.toast(v.name + ' yutuldu!'); }
  }
  doDash(b) {
    if (b.dashCd > 0 || b.mass < 24) return;
    b.mass *= 0.93; b.dash = 0.35; b.dashCd = 2.2;
    this.food.push({ x: b.x - (b.ax || 0) * radiusOf(b.mass) * 1.6, y: b.y - (b.ay || 0) * radiusOf(b.mass) * 1.6, c: COLS[b.color % 8], m: b.mass * 0.07, ph: 0 });
    if (b === this.me) S.pad();
  }
  moveB(b, dt) {
    const big = Math.pow(b.mass, -0.18);
    let sp = 330 * big + 40; if (b.dash > 0) sp *= 2.3; if (b.chili > 0) sp *= 1.4;
    const mag = b.bot ? (b.mag ?? 1) : (b.mag || 0);
    const tx = (b.ax || 0) * sp * mag, ty = (b.ay || 0) * sp * mag;
    const k = Math.min(1, dt * 7);
    b.vx += (tx - b.vx) * k; b.vy += (ty - b.vy) * k;
    b.x = clamp(b.x + b.vx * dt, 10, W - 10); b.y = clamp(b.y + b.vy * dt, 10, H - 10);
    if (b.x <= 10 || b.x >= W - 10) b.vx = 0; if (b.y <= 10 || b.y >= H - 10) b.vy = 0;
  }
  botThink(b, dt) {
    b.think -= dt;
    if (b.think <= 0) {
      b.think = 0.25 + (1 - b.skill) * 0.5 + Math.random() * 0.2;
      const r = radiusOf(b.mass), view = 320 + r * 4 + b.skill * 200;
      let threat = null, prey = null, td = 1e9, pd = 1e9;
      for (const o of this.blobs) {
        if (o === b || o.dead) continue;
        const d = Math.hypot(o.x - b.x, o.y - b.y);
        if (d > view) continue;
        if (o.mass > b.mass * 1.12 && d < td) { td = d; threat = o; }
        else if (b.mass > o.mass * 1.25 && o.shield <= 0 && d < pd) { pd = d; prey = o; }
      }
      let spike = null; if (b.mass > 40) for (const s of this.spikes) { const d = Math.hypot(s.x - b.x, s.y - b.y); if (d < r + 160) { spike = s; break; } }
      if (threat) { const a = Math.atan2(b.y - threat.y, b.x - threat.x); b.aim = a + rnd(-0.3, 0.3) * (1.2 - b.skill); b.mag = 1; if (td < radiusOf(threat.mass) + r + 90 && b.skill > 0.5 && Math.random() < 0.6) this.doDash(b); b.tgtKind = 'flee'; }
      else if (spike) { b.aim = Math.atan2(b.y - spike.y, b.x - spike.x); b.mag = 1; }
      else if (prey && b.skill > 0.45) { b.aim = Math.atan2(prey.y - b.y, prey.x - b.x); b.mag = 1; if (pd < r * 3 && Math.random() < 0.3 * b.skill) this.doDash(b); b.tgtKind = 'chase'; }
      else {
        // en yoğun/yakın yemek
        let best = null, bd = 1e9; const n = 36;
        for (let i = 0; i < n; i++) { const f = this.food[(Math.random() * this.food.length) | 0]; const d = Math.hypot(f.x - b.x, f.y - b.y) - f.m * 8; if (d < bd) { bd = d; best = f; } }
        if (best) b.aim = Math.atan2(best.y - b.y, best.x - b.x); b.mag = 0.95; b.tgtKind = 'food';
      }
      // duvardan uzak dur
      const m = 160; if (b.x < m) b.aim = rnd(-0.6, 0.6); else if (b.x > W - m) b.aim = Math.PI + rnd(-0.6, 0.6); if (b.y < m) b.aim = Math.PI / 2 + rnd(-0.6, 0.6); else if (b.y > H - m) b.aim = -Math.PI / 2 + rnd(-0.6, 0.6);
    }
    b.ax = Math.cos(b.aim); b.ay = Math.sin(b.aim);
  }
  burst(x, y, c, n) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(60, 280); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.4, 0.9), c: COLS[c % 8], r: rnd(3, 7) }); } }
  toast(t) { this.toastText = t; this.toastT = 1.8; }
  finish() {
    this.over = true; this.state = 'end';
    const rows = this.blobs.map((b) => ({ name: b.name, me: b === this.me, color: b.color, mass: Math.round(b.peak), kills: b.kills })).sort((a, b) => b.mass - a.mass);
    this.cb.onEnd?.({ rows, rank: rows.findIndex((r) => r.me) + 1, time: this.t });
  }
  hud() {
    if (!this.me) return null;
    const lb = [...this.blobs].sort((a, b) => b.mass - a.mass).slice(0, 5).map((b) => ({ name: b.name, mass: Math.round(b.mass), me: b === this.me, color: b.color }));
    return { mass: Math.round(this.me.mass), left: Math.max(0, Math.ceil(MATCH_T - this.t)), lb, dead: this.me.dead, respawn: Math.max(0, this.me.respawn), dashReady: this.me.dashCd <= 0 && this.me.mass >= 24, toast: this.toastT > 0 ? this.toastText : '', feed: this.feed.slice(-3), rank: [...this.blobs].sort((a, b) => b.mass - a.mass).indexOf(this.me) + 1 };
  }
  advance(n, dt = 1 / 60) { for (let i = 0; i < n; i++) this.step(dt); }
  loop() {
    if (!this.running) return;
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.acc += dt;
    let n = 0; while (this.acc >= 1 / 60 && n < 6) { this.step(1 / 60); this.acc -= 1 / 60; n++; } if (n === 6) this.acc = 0;
    this.draw(); this.cb.onFrame?.(this.hud());
    requestAnimationFrame(this.loop);
  }
  draw() {
    const c = this.ctx, w = this.cv.width, h = this.cv.height;
    // çorba zemini
    const g = c.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.8);
    g.addColorStop(0, '#f2a93a'); g.addColorStop(1, '#c4671f'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (!this.me) return;
    const me = this.me, target = clamp(1.05 - Math.sqrt(me.mass) * 0.022, 0.38, 1);
    this.cam.z += (target - this.cam.z) * 0.05; this.cam.x += (me.x - this.cam.x) * 0.15; this.cam.y += (me.y - this.cam.y) * 0.15;
    const z = this.cam.z * this.dpr * Math.min(1, innerWidth / 700 + 0.35);
    c.save(); c.translate(w / 2, h / 2); c.scale(z, z); c.translate(-this.cam.x, -this.cam.y);
    // kenar (tencere)
    c.fillStyle = 'rgba(90,40,10,.25)'; c.fillRect(-2000, -2000, W + 4000, 2000); c.fillRect(-2000, H, W + 4000, 2000); c.fillRect(-2000, 0, 2000, H); c.fillRect(W, 0, 2000, H);
    c.strokeStyle = '#7a3a12'; c.lineWidth = 12; c.strokeRect(0, 0, W, H);
    // ızgara baloncukları
    c.fillStyle = 'rgba(255,230,160,.12)'; for (let gx = 0; gx < W; gx += 260) for (let gy = 0; gy < H; gy += 260) { c.beginPath(); c.arc(gx + 130 + Math.sin(gy + this.t) * 8, gy + 130, 36 + ((gx + gy) % 5) * 6, 0, TAU); c.fill(); }
    const vx0 = this.cam.x - w / 2 / z - 40, vx1 = this.cam.x + w / 2 / z + 40, vy0 = this.cam.y - h / 2 / z - 40, vy1 = this.cam.y + h / 2 / z + 40;
    for (const f of this.food) { if (f.x < vx0 || f.x > vx1 || f.y < vy0 || f.y > vy1) continue; c.fillStyle = f.c; c.beginPath(); c.arc(f.x, f.y, 6 + f.m * 2.2 + Math.sin(this.t * 3 + f.ph) * 0.8, 0, TAU); c.fill(); }
    // dikenler (acı biber)
    for (const s of this.spikes) { c.fillStyle = '#c0261a'; c.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + this.t * 0.2, r = i % 2 ? s.r * 0.75 : s.r * 1.1; c.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); } c.closePath(); c.fill(); c.fillStyle = '#ff5b3a'; c.beginPath(); c.arc(s.x, s.y, s.r * 0.55, 0, TAU); c.fill(); }
    const order = [...this.blobs].filter((b) => !b.dead).sort((a, b) => a.mass - b.mass);
    for (const b of order) this.drawBlob(c, b);
    for (const p of this.parts) { c.globalAlpha = Math.max(0, p.life); c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); } c.globalAlpha = 1;
    c.restore();
  }
  drawBlob(c, b) {
    const r = radiusOf(b.mass), col = COLS[b.color % 8];
    c.save(); c.translate(b.x, b.y);
    if (b.shield > 0) { c.globalAlpha = 0.5 + Math.sin(this.t * 20) * 0.3; }
    c.fillStyle = 'rgba(60,20,0,.25)'; c.beginPath(); c.ellipse(4, r * 0.18, r, r * 0.92, 0, 0, TAU); c.fill();
    const grad = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r); grad.addColorStop(0, '#fff'); grad.addColorStop(0.25, col); grad.addColorStop(1, col);
    c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.arc(-r * 0.3, -r * 0.35, r * 0.4, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = Math.max(2, r * 0.07); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    const a = Math.atan2(b.vy || 0.01, b.vx || 0.01), ex = Math.cos(a) * r * 0.18, ey = Math.sin(a) * r * 0.18;
    for (const sx of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * r * 0.3 + ex, -r * 0.1 + ey, r * 0.2, 0, TAU); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.arc(sx * r * 0.3 + ex * 1.8, -r * 0.1 + ey * 1.8, r * 0.1, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 4; c.textAlign = 'center'; c.font = `800 ${Math.max(14, r * 0.34)}px 'Baloo 2',system-ui`;
    if (b === this.me || r > 26) { c.strokeText(b.name, 0, r + Math.max(16, r * 0.34)); c.fillText(b.name, 0, r + Math.max(16, r * 0.34)); }
    c.restore();
  }
}
