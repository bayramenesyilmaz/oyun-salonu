// Çığ Kaçışı: 3B kızak yarışı. Engelleri aş, rampalardan uç, çığ yetişmeden bitişe var.
import * as THREE from 'three';
import * as S from '../bulutyaris/game/sfx.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
export const COLS = [0xe5483a, 0x3a8fe5, 0xf2b630, 0x4cbf5a];
export const LEN = 2600, HW = 15, SLOPE = 0.3;
const cx = (z) => Math.sin(z * 0.011) * 22 + Math.sin(z * 0.029 + 1) * 8; // z = ileri mesafe
const hy = (d, lat) => -d * SLOPE + Math.pow(Math.max(0, Math.abs(lat) - HW + 1), 1.6) * 0.35;
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const NAMES = ['Pınar', 'Yeti', 'Bora', 'Kırağı', 'Fırtına'];

export class Run {
  constructor(cv, cb = {}) {
    this.cv = cv; this.cb = cb; this.touch = !!cb.touch;
    this.r = new THREE.WebGLRenderer({ canvas: cv, antialias: !this.touch, powerPreference: 'high-performance' });
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0xbfdcf2); this.scene.fog = new THREE.Fog(0xbfdcf2, 60, 360);
    this.cam = new THREE.PerspectiveCamera(70, 1, 0.1, 600);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa6c4, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(40, 80, 30); this.scene.add(sun);
    this.input = { steer: 0, jump: false };
    this.state = 'idle'; this.acc = 0; this.last = performance.now(); this.running = true; this.t = 0;
    this.resize(); this._rs = () => this.resize(); addEventListener('resize', this._rs);
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  resize() { const w = innerWidth, h = innerHeight; this.r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  destroy() { this.running = false; removeEventListener('resize', this._rs); this.r.dispose(); }
  clear() { if (this.root) { this.scene.remove(this.root); this.root.traverse((o) => { o.geometry?.dispose?.(); }); } this.root = new THREE.Group(); this.scene.add(this.root); }
  world3(d, lat, y = 0) { return new THREE.Vector3(cx(d) + lat, hy(d, lat) + y, -d); }
  build(seed) {
    this.clear(); const R = mulberry(seed), root = this.root;
    // zemin şeridi
    const NZ = 520, NX = 28, pos = [], idx = [], col = [], c1 = new THREE.Color(0xf4f8fc), c2 = new THREE.Color(0xdbe9f6);
    for (let i = 0; i <= NZ; i++) for (let j = 0; j <= NX; j++) { const d = (i / NZ) * (LEN + 200) - 40, lat = (j / NX - 0.5) * 140; pos.push(cx(d) + lat, hy(d, lat), -d); const k = Math.abs(lat) < HW ? 0 : 1; const c = c1.clone().lerp(c2, k * 0.6 + ((i % 8 < 1) ? 0.12 : 0)); col.push(c.r, c.g, c.b); }
    for (let i = 0; i < NZ; i++) for (let j = 0; j < NX; j++) { const a = i * (NX + 1) + j, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    root.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
    // kenar bayrakları + mesafe işaretleri
    const flagG = new THREE.CylinderGeometry(0.1, 0.1, 3, 5), flagM = [new THREE.MeshLambertMaterial({ color: 0xe5483a }), new THREE.MeshLambertMaterial({ color: 0x3a8fe5 })];
    for (let d = 20; d < LEN; d += 26) for (const s of [-1, 1]) { const m = new THREE.Mesh(flagG, flagM[(d / 26 | 0) % 2]); m.position.copy(this.world3(d, s * (HW - 0.5), 1.5)); root.add(m); }
    // çam ağaçları (kenar) + engeller (pist içi)
    const pineG = new THREE.ConeGeometry(2.2, 6, 7), trunkG = new THREE.CylinderGeometry(0.4, 0.5, 2, 6);
    const pinesN = 900, pines = new THREE.InstancedMesh(pineG, new THREE.MeshLambertMaterial({ color: 0x2f7d4a }), pinesN), trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), pinesN), m4 = new THREE.Matrix4();
    for (let i = 0; i < pinesN; i++) { const d = R() * (LEN + 150), side = R() < 0.5 ? -1 : 1, lat = side * (HW + 2 + R() * 40), s = 0.8 + R() * 1.3; const p = this.world3(d, lat); m4.compose(new THREE.Vector3(p.x, p.y + 4 * s, p.z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); pines.setMatrixAt(i, m4); m4.compose(new THREE.Vector3(p.x, p.y + 1 * s, p.z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); trunks.setMatrixAt(i, m4); }
    root.add(pines, trunks);
    this.obs = []; this.ramps = []; this.boosts = [];
    const rockM = new THREE.MeshLambertMaterial({ color: 0x7c8794 }), treeM = new THREE.MeshLambertMaterial({ color: 0x2f7d4a });
    for (let d = 90; d < LEN - 60; d += 14 + R() * 10 - Math.min(6, d / 600)) {
      const t = R(), lat = (R() - 0.5) * (HW * 2 - 4);
      if (t < 0.5) { const o = { d, lat, r: 1.5, kind: 'tree' }; const m = new THREE.Mesh(pineG, treeM); m.scale.setScalar(0.9); const p = this.world3(d, lat); m.position.set(p.x, p.y + 3, p.z); root.add(m); this.obs.push(o); }
      else if (t < 0.72) { const o = { d, lat, r: 1.7, kind: 'rock' }; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1.7, 0), rockM); const p = this.world3(d, lat); m.position.set(p.x, p.y + 0.8, p.z); m.rotation.set(R() * 3, R() * 3, 0); root.add(m); this.obs.push(o); }
      else if (t < 0.88) { const o = { d, lat, w: 4.2, len: 7 }; this.ramps.push(o); const m = new THREE.Mesh(new THREE.BoxGeometry(o.w * 2, 0.5, o.len), new THREE.MeshLambertMaterial({ color: 0xa87a3a })); const p = this.world3(d, lat); m.position.set(p.x, p.y + 0.35, p.z); m.rotation.x = -0.28; root.add(m); }
      else { const o = { d, lat, r: 2.2 }; this.boosts.push(o); const m = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.15, 16), new THREE.MeshBasicMaterial({ color: 0x4cf0ff })); const p = this.world3(d, lat); m.position.set(p.x, p.y + 0.12, p.z); root.add(m); }
    }
    // bitiş kapısı
    const fin = new THREE.Group(); const fm = new THREE.MeshLambertMaterial({ color: 0xffffff }), fr = new THREE.MeshLambertMaterial({ color: 0xe5483a });
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1, 9, 1), fm); p.position.set(s * HW, 4.5, 0); fin.add(p); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 1, 2.2, 1), fr); bar.position.y = 9; fin.add(bar);
    const fp = this.world3(LEN, 0); fin.position.copy(fp); root.add(fin);
    // çığ
    this.av = new THREE.Group(); const am = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.93 });
    for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(6 + R() * 5, 1), am); b.position.set((R() - 0.5) * 48, 4 + R() * 12, R() * 14); b.userData.o = R() * 6; this.av.add(b); }
    root.add(this.av);
  }
  start({ seed = 1, nick = 'Sen', color = 0, level = 1 } = {}) {
    this.level = level; this.build(seed); this.t = 0; this.state = 'count'; this.countT = 3.4; this.over = false; this.finOrder = []; this.toastT = 0;
    this.racers = [];
    for (let i = 0; i < 4; i++) {
      const me = i === 0, col = me ? color : [0, 1, 2, 3].filter((c) => c !== color)[i - 1];
      const rc = { name: me ? nick : NAMES[i - 1], color: col, me, bot: !me, d: 0, lat: (i - 1.5) * 6, head: 0, spd: 0, y: 0, vy: 0, air: false, stun: 0, boost: 0, fin: 0, dead: 0, skill: 0.5 + level * 0.15 + Math.random() * 0.15, aim: 0, think: 0, bumps: 0 };
      rc.mesh = this.mkSled(COLS[col % 4]); this.root.add(rc.mesh); this.racers.push(rc);
    }
    this.me = this.racers[0]; this.avD = -90; this.avSpd = 9;
    this.cam.position.set(0, 20, 20);
  }
  mkSled(c) {
    const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: c });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 3), new THREE.MeshLambertMaterial({ color: 0x6b4a2b })); base.position.y = 0.2; g.add(base);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.8, 4, 8), m); body.position.set(0, 0.95, 0.2); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffd9b5 })); head.position.set(0, 1.75, 0.1); g.add(head);
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 6, 0, TAU, 0, 1.4), m); hat.position.set(0, 1.85, 0.1); g.add(hat);
    return g;
  }
  step(dt) {
    if (this.state === 'idle') return;
    if (this.state === 'count') { this.countT -= dt; if (this.countT <= 0) { this.state = 'play'; this.toast('GİT!'); S.beep?.(true); } else if (Math.ceil(this.countT - 0.4) !== this._lc) { this._lc = Math.ceil(this.countT - 0.4); if (this._lc > 0) S.beep?.(false); } this.place(); return; }
    this.t += dt;
    if (this.state === 'play') {
      this.avSpd = Math.min(38, 9 + this.t * 0.5); this.avD += this.avSpd * dt;
      for (const r of this.racers) this.stepRacer(r, dt);
      // bitiş koşulu
      const me = this.me, lastOrder = this.finOrder.length;
      if ((me.fin || me.dead) && !this.over) this.endT = (this.endT ?? 2.2) - dt;
      if (lastOrder && !this.over) { this.chaseT = (this.chaseT ?? 14) - dt; }
      if (!this.over && ((me.fin || me.dead) && this.endT <= 0 || this.chaseT <= 0)) this.finish();
    }
    if (this.toastT > 0) this.toastT -= dt;
    this.place();
  }
  stepRacer(r, dt) {
    if (r.fin || r.dead) { r.spd *= 0.97; r.d += r.spd * dt * (r.fin ? 1 : 0); return; }
    if (r.bot) this.botAI(r, dt); else { r.aim = this.input.steer; if (this.input.jump) this.jump(r); }
    if (r.stun > 0) r.stun -= dt; if (r.boost > 0) r.boost -= dt;
    const steerK = r.air ? 0.3 : 1;
    r.head = clamp(r.head + (r.aim * 1.1 - r.head) * Math.min(1, dt * 5) * steerK + (r.air ? 0 : 0), -0.8, 0.8);
    // hız: eğimden hızlanır, sürtünme, dönüşte kayıp
    const target = (34 + (r.boost > 0 ? 22 : 0)) * (r.stun > 0 ? 0.35 : 1) * (1 - Math.abs(r.head) * 0.18);
    // lastik: bot çok önde/geride
    let k = 1; if (r.bot) { const dd = r.d - this.me.d; k = dd > 80 ? 0.92 : dd < -80 ? 1.1 : 1; k *= 0.94 + r.skill * 0.08; }
    r.spd += (target * k - r.spd) * Math.min(1, dt * (r.spd < target ? 0.9 : 2));
    r.d += Math.cos(r.head) * r.spd * dt; r.lat += Math.sin(r.head) * r.spd * dt;
    if (Math.abs(r.lat) > HW - 1) { r.lat = clamp(r.lat, -(HW - 1), HW - 1); r.head *= -0.4; r.spd *= 0.985; if (r.me && !r.wallT) { r.wallT = 1; } }
    if (r.wallT) r.wallT = Math.max(0, r.wallT - dt);
    // dikey
    const gy = 0; if (r.air) { r.vy -= 30 * dt; r.y += r.vy * dt; if (r.y <= gy) { r.y = 0; r.air = false; if (r.vy < -12 && r.me) S.land?.(true); r.vy = 0; } }
    if (!r.air) for (const rp of this.ramps) if (Math.abs(rp.d - r.d) < rp.len / 2 && Math.abs(rp.lat - r.lat) < rp.w) { r.air = true; r.vy = 11 + r.spd * 0.14; r.y = 0.1; if (r.me) S.pad?.(); break; }
    if (!r.air || r.y < 1.4) {
      for (const o of this.obs) { if (Math.abs(o.d - r.d) > 3) continue; if (Math.abs(o.lat - r.lat) < o.r + 0.8 && r.y < 1.6 && r.stun <= 0) { r.stun = 0.9; r.spd *= 0.3; r.bumps++; r.head = 0; if (r.me) { S.boom?.(); this.toast('Çarptın!'); this.shake = 0.5; } } }
      for (const b of this.boosts) if (Math.abs(b.d - r.d) < 2.4 && Math.abs(b.lat - r.lat) < b.r && !r.air && r.boost < 0.5) { r.boost = 1.8; if (r.me) { S.pick?.(); this.toast('HIZLAN!'); } }
    }
    // çığ
    if (r.d < this.avD + 8) { r.dead = this.t; r.spd = 0; if (r.me) { S.fall?.(); this.toast('Çığa yakalandın!'); } }
    else if (r.d > LEN) { r.fin = this.t; this.finOrder.push(r); if (r.me) { S.done?.(); this.toast('BİTİŞ!'); } }
  }
  jump(r) { if (r.air || r.stun > 0) return; r.air = true; r.vy = 8.5; r.y = 0.1; if (r.me) S.pad?.(); }
  botAI(r, dt) {
    r.think -= dt; if (r.think > 0) return;
    r.think = 0.08 + (1 - r.skill) * 0.2;
    const look = 16 + r.skill * 22; let best = r.lat, bestScore = -1e9;
    for (let off = -9; off <= 9; off += 1.5) {
      const L = clamp(r.lat + off, -(HW - 2), HW - 2); let sc = -Math.abs(off) * 0.4 - Math.abs(L) * 0.15;
      for (const o of this.obs) { const dd = o.d - r.d; if (dd > 0 && dd < look && Math.abs(o.lat - L) < o.r + 1.5) sc -= 40 * (1 - dd / look) + 10; }
      for (const b of this.boosts) { const dd = b.d - r.d; if (dd > 0 && dd < look && Math.abs(b.lat - L) < 1.6) sc += 7 * r.skill; }
      for (const rp of this.ramps) { const dd = rp.d - r.d; if (dd > 0 && dd < look && Math.abs(rp.lat - L) < rp.w - 0.5) sc += 3; }
      if (sc > bestScore) { bestScore = sc; best = L; }
    }
    best += (Math.random() - 0.5) * (1 - r.skill) * 4;
    r.aim = clamp((best - r.lat) * 0.18, -1, 1);
  }
  toast(t) { this.toastT = 1.3; this.toastText = t; }
  finish() {
    this.over = true; this.state = 'end';
    const rows = [...this.racers].map((r) => ({ name: r.name, me: r.me, color: r.color, fin: r.fin, dead: r.dead, d: Math.round(Math.min(r.d, LEN)), bumps: r.bumps }))
      .sort((a, b) => (b.fin > 0) - (a.fin > 0) || (a.fin && b.fin ? a.fin - b.fin : (a.dead > 0) - (b.dead > 0) || b.d - a.d));
    this.cb.onEnd?.({ rows, rank: rows.findIndex((r) => r.me) + 1, time: this.me.fin, caught: !!this.me.dead });
  }
  place() {
    for (const r of this.racers) {
      const p = this.world3(r.d, r.lat, r.y); const ahead = this.world3(r.d + 2, r.lat + Math.sin(r.head) * 2);
      r.mesh.position.copy(p); r.mesh.position.y += 0.1;
      r.mesh.rotation.set(Math.atan2(ahead.y - p.y, 2) * 0.9 + (r.air ? -r.vy * 0.015 : 0), Math.PI - r.head * 0.9, -r.head * 0.5, 'YXZ');
      r.mesh.visible = !r.dead || this.t - r.dead < 0.3;
    }
    // çığ konumu
    const ap = this.world3(this.avD, 0); this.av.position.set(ap.x, ap.y, ap.z);
    for (const b of this.av.children) { b.position.y = 6 + Math.sin(this.t * 4 + b.userData.o) * 2.2; b.rotation.y += 0.02; }
    // kamera
    const me = this.me, tgt = this.world3(me.d - 11, me.lat * 0.9, 5.2 + me.y * 0.5);
    this.cam.position.lerp(tgt, 0.2); const sh = (this.shake || 0); if (sh > 0) { this.cam.position.x += (Math.random() - 0.5) * sh; this.cam.position.y += (Math.random() - 0.5) * sh; this.shake = Math.max(0, sh - 0.02); }
    const look = this.world3(me.d + 12, me.lat, 1.5 + me.y * 0.4); this.cam.lookAt(look);
    this.cam.fov = 66 + Math.min(18, Math.max(0, me.spd - 30) * 0.6); this.cam.updateProjectionMatrix();
  }
  hud() {
    if (!this.me) return null; const me = this.me;
    const order = [...this.racers].sort((a, b) => (b.fin > 0) - (a.fin > 0) || b.d - a.d); 
    return { state: this.state, count: this.state === 'count' ? Math.max(0, Math.ceil(this.countT - 0.4)) : -1, spd: Math.round(me.spd * 3.6), rank: order.indexOf(me) + 1, prog: Math.min(1, me.d / LEN), dots: this.racers.map((r) => ({ p: Math.min(1, Math.max(0, r.d / LEN)), color: r.color, me: r.me, dead: !!r.dead })), av: clamp(this.avD / LEN, 0, 1), gap: Math.round(me.d - this.avD), toast: this.toastT > 0 ? this.toastText : '', boost: me.boost > 0, danger: me.d - this.avD < 45 };
  }
  advance(n, dt = 1 / 60) { for (let i = 0; i < n; i++) this.step(dt); this.place(); }
  loop() {
    if (!this.running) return; const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.acc += dt;
    let n = 0; while (this.acc >= 1 / 60 && n < 6) { this.step(1 / 60); this.acc -= 1 / 60; n++; } if (n === 6) this.acc = 0;
    if (this.state !== 'idle') { this.r.render(this.scene, this.cam); this.cb.onFrame?.(this.hud()); } else this.r.render(this.scene, this.cam);
    requestAnimationFrame(this.loop);
  }
}
