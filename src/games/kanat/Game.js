// Kanat Yarışı: 3B süzülme yarışı. Adalar arasında halkalardan geç, dalışla hızlan.
import * as THREE from 'three';
import * as S from '../bulutyaris/game/sfx.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
export const COLS = [0xe5483a, 0x3a8fe5, 0xf2b630, 0x4cbf5a];
export const N_RINGS = 22;
const NAMES = ['Karga', 'Şahin', 'Turna', 'Albatros'];
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export class Glide {
  constructor(cv, cb = {}) {
    this.cv = cv; this.cb = cb; this.touch = !!cb.touch;
    this.r = new THREE.WebGLRenderer({ canvas: cv, antialias: !this.touch, powerPreference: 'high-performance' });
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x8fd0ff); this.scene.fog = new THREE.Fog(0x9fd8ff, 120, 900);
    this.cam = new THREE.PerspectiveCamera(70, 1, 0.5, 1400);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x5a8fb0, 1.6));
    const sun = new THREE.DirectionalLight(0xfff2d0, 1.6); sun.position.set(100, 200, 60); this.scene.add(sun);
    this.input = { x: 0, y: 0 }; this.state = 'idle'; this.acc = 0; this.last = performance.now(); this.running = true; this.t = 0;
    this.resize(); this._rs = () => this.resize(); addEventListener('resize', this._rs);
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  resize() { const w = innerWidth, h = innerHeight; this.r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  destroy() { this.running = false; removeEventListener('resize', this._rs); this.r.dispose(); }
  build(seed) {
    if (this.root) this.scene.remove(this.root); this.root = new THREE.Group(); this.scene.add(this.root); const R = mulberry(seed), root = this.root;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshLambertMaterial({ color: 0x2d8fd0 })); sea.rotation.x = -Math.PI / 2; root.add(sea);
    // halka yolu
    this.rings = []; let p = new THREE.Vector3(0, 120, 0), yaw = 0;
    for (let i = 0; i < N_RINGS; i++) {
      yaw += (R() - 0.5) * 1.1; const step = 150 + R() * 70; p = p.clone().add(new THREE.Vector3(Math.sin(yaw) * step, (R() - 0.5) * 50, -Math.cos(yaw) * step));
      p.y = clamp(p.y, 55, 200); this.rings.push({ p: p.clone(), yaw, r: 11, big: i % 5 === 4 });
    }
    const rg = new THREE.TorusGeometry(1, 0.09, 8, 28);
    this.rings.forEach((r, i) => { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: r.big ? 0xffd84a : 0xffffff })); m.scale.setScalar(r.r * (r.big ? 1.35 : 1)); if (r.big) r.r *= 1.35; m.position.copy(r.p); m.rotation.y = -r.yaw; root.add(m); r.mesh = m; });
    // adalar
    this.isl = [];
    const palm = new THREE.MeshLambertMaterial({ color: 0x4cae55 }), sand = new THREE.MeshLambertMaterial({ color: 0xe8d29a }), rock = new THREE.MeshLambertMaterial({ color: 0x8a8f99 });
    for (let i = 0; i < 70; i++) {
      const base = this.rings[(R() * N_RINGS) | 0].p, a = R() * TAU, dist = 50 + R() * 260, x = base.x + Math.cos(a) * dist, z = base.z + Math.sin(a) * dist, h = 20 + R() * 70, rad = 20 + R() * 30;
      // halka yoluna çok yakınsa atla
      if (this.rings.some((r) => Math.hypot(r.p.x - x, r.p.z - z) < rad + 30 && r.p.y < h + 25)) continue;
      const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 9), rock); m.position.set(x, h / 2, z); root.add(m);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.45, rad * 0.55, 3, 9), palm); top.position.set(x, h - 0.3, z); root.add(top);
      this.isl.push({ x, z, h, rad });
    }
    const beach = new THREE.Mesh(new THREE.RingGeometry(0, 1, 2), sand); void beach;
    // bulutlar
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 40; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(18 + R() * 20, 8, 6), cm); const b = this.rings[(R() * N_RINGS) | 0].p; c.position.set(b.x + (R() - 0.5) * 900, 230 + R() * 120, b.z + (R() - 0.5) * 900); c.scale.y = 0.45; root.add(c); }
    // bitiş
    const lr = this.rings[N_RINGS - 1]; const fin = new THREE.Mesh(new THREE.TorusGeometry(lr.r + 6, 1.2, 8, 30), new THREE.MeshBasicMaterial({ color: 0xff5ab0 })); fin.position.copy(lr.p); fin.rotation.y = -lr.yaw; root.add(fin);
  }
  start({ seed = 1, nick = 'Sen', color = 0, level = 1 } = {}) {
    this.build(seed); this.level = level; this.t = 0; this.state = 'count'; this.countT = 3.4; this.over = false; this.endT = undefined; this.finN = 0; this.toastT = 0; this.shake = 0;
    this.racers = [];
    for (let i = 0; i < 4; i++) {
      const me = i === 0, col = me ? color : [0, 1, 2, 3].filter((c) => c !== color)[i - 1];
      const off = new THREE.Vector3((i - 1.5) * 14, 0, 0);
      const rc = { name: me ? nick : NAMES[i - 1], color: col, me, bot: !me, pos: new THREE.Vector3(0, 120, 0).add(off), yaw: 0, pitch: -0.05, roll: 0, spd: 36, next: 0, boost: 0, fin: 0, crash: 0, lastSafe: new THREE.Vector3(0, 120, 0).add(off), skill: 0.55 + level * 0.14 + Math.random() * 0.15, think: 0, ax: 0, ay: 0, hits: 0, score: 0 };
      rc.mesh = this.mkBird(COLS[col % 4]); this.root.add(rc.mesh); this.racers.push(rc);
    }
    this.me = this.racers[0];
  }
  mkBird(c) {
    const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4.4, 8), new THREE.MeshLambertMaterial({ color: 0xffffff })); body.rotation.x = -Math.PI / 2; g.add(body);
    const wing = new THREE.Mesh(new THREE.BufferGeometry(), m); const v = new Float32Array([0, 0, 1.2, -6.5, 0.2, -1.2, 0, 0, -1.2, 0, 0, 1.2, 0, 0, -1.2, 6.5, 0.2, -1.2]); wing.geometry.setAttribute('position', new THREE.BufferAttribute(v, 3)); wing.geometry.computeVertexNormals(); g.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1), m); tail.position.set(0, 0, -2.2); g.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 1), m); fin.position.set(0, 0.6, -2.2); g.add(fin);
    g.scale.setScalar(0.9); return g;
  }
  step(dt) {
    if (this.state === 'idle') return;
    if (this.state === 'count') { this.countT -= dt; const c = Math.ceil(this.countT - 0.4); if (c !== this._lc) { this._lc = c; if (c > 0) S.beep?.(false); } if (this.countT <= 0) { this.state = 'play'; this.toast('UÇ!'); S.beep?.(true); } this.place(); return; }
    this.t += dt;
    for (const r of this.racers) this.stepR(r, dt);
    const me = this.me;
    if ((me.fin) && !this.over) { this.endT = (this.endT ?? 3) - dt; if (this.endT <= 0) this.finish(); }
    if (this.finN > 0 && !this.over) { this.chase = (this.chase ?? 25) - dt; if (this.chase <= 0) this.finish(); }
    if (this.toastT > 0) this.toastT -= dt; if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2);
    this.place();
  }
  stepR(r, dt) {
    if (r.fin) { r.pos.y += 0.0; r.yaw += dt * 0.4; r.pos.x += Math.sin(r.yaw) * r.spd * 0.5 * dt; r.pos.z -= Math.cos(r.yaw) * r.spd * 0.5 * dt; return; }
    if (r.crash > 0) { r.crash -= dt; if (r.crash <= 0) { r.pos.copy(r.lastSafe); const ring = this.rings[Math.max(0, r.next - 1)]; r.yaw = ring ? ring.yaw : 0; r.pitch = 0; r.roll = 0; r.spd = 34; } return; }
    if (r.bot) this.botAI(r, dt); else { r.ax = this.input.x; r.ay = this.input.y; }
    if (r.boost > 0) r.boost -= dt;
    // kontrol: x → yaw/roll, y (+ aşağı) → burun aşağı
    r.roll += (r.ax * 0.9 - r.roll) * Math.min(1, dt * 4);
    r.yaw += r.roll * dt * 1.3 * (24 / Math.max(24, r.spd) + 0.4);
    r.pitch += (r.ay * 0.85 - r.pitch) * Math.min(1, dt * 2.5); r.pitch = clamp(r.pitch, -0.95, 0.7);
    // enerji: burun aşağı hızlanır, yukarı yavaşlar
    const base = (38 + (r.boost > 0 ? 26 : 0)) * (r.spdK || 1);
    r.spd += (-Math.sin(r.pitch) * 34 - (r.spd - base) * 0.35) * dt; r.spd = clamp(r.spd, 18, 120);
    let sink = 0; if (r.spd < 26) sink = (26 - r.spd) * 0.7; // stall
    const cp = Math.cos(r.pitch);
    r.pos.x += Math.sin(r.yaw) * cp * r.spd * dt; r.pos.z -= Math.cos(r.yaw) * cp * r.spd * dt; r.pos.y += (Math.sin(r.pitch) * r.spd - sink - 1.2) * dt;
    if (r.pos.y > 320) { r.pos.y = 320; if (r.pitch > 0) r.pitch = 0; }
    // halka
    const ring = this.rings[r.next];
    if (ring) {
      const d = r.pos.clone().sub(ring.p), nrm = new THREE.Vector3(Math.sin(ring.yaw), 0, -Math.cos(ring.yaw)), along = d.dot(nrm);
      const prev = r._along ?? -1; r._along = along;
      if (prev < 0 && along >= 0 && d.clone().addScaledVector(nrm, -along).length() < ring.r + 1.5) {
        r.next++; r._along = undefined; r.boost = ring.big ? 2.6 : 1.1; r.lastSafe = ring.p.clone(); r.score += ring.big ? 3 : 1;
        if (r.me) { S.pick?.(); this.toast(ring.big ? 'ALTIN HALKA! +HIZ' : 'Halka!'); }
        if (r.next >= N_RINGS) { r.fin = this.t; this.finN++; r.spd = 40; if (r.me) { S.done?.(); this.toast('BİTİŞ!'); } }
      } else if (prev < 0 && along >= 0) { r._along = undefined; r.missed = (r.missed || 0) + 1; } // ıskaladı: sonraki halkaya geçmez; geri dönebilir
      else if (along > 120) { /* çok ileri */ }
    }
    // çarpışma
    if (r.pos.y < 2.5) this.crashR(r, 'Denize düştün!');
    else for (const i of this.isl) { if (r.pos.y < i.h + 1 && Math.hypot(r.pos.x - i.x, r.pos.z - i.z) < i.rad * (1 - r.pos.y / i.h) + 2) { this.crashR(r, 'Adaya çarptın!'); break; } }
  }
  crashR(r, msg) { r.crash = 1.6; r.hits++; r.boost = 0; if (r.me) { S.boom?.(); this.toast(msg); this.shake = 1; } }
  botAI(r, dt) {
    r.think -= dt; if (r.think > 0) return; r.think = 0.06 + (1 - r.skill) * 0.12;
    const ring = this.rings[Math.min(r.next, N_RINGS - 1)];
    // adadan kaçınma: ileri bak
    let tgt = ring.p.clone(); tgt.x += (Math.random() - 0.5) * (1 - r.skill) * 14; tgt.y += (Math.random() - 0.5) * (1 - r.skill) * 10;
    const dir = new THREE.Vector3(Math.sin(r.yaw), 0, -Math.cos(r.yaw));
    for (const i of this.isl) { const ahead = r.pos.clone().addScaledVector(dir, 60); if (Math.hypot(ahead.x - i.x, ahead.z - i.z) < i.rad + 30 && r.pos.y < i.h + 30) { tgt = new THREE.Vector3(i.x, i.h + 70, i.z); break; } }
    const to = tgt.clone().sub(r.pos), want = Math.atan2(to.x, -to.z); let dy = want - r.yaw; dy = ((dy + Math.PI) % TAU + TAU) % TAU - Math.PI;
    r.ax = clamp(dy * 1.6, -1, 1);
    const hd = Math.hypot(to.x, to.z), wantP = clamp(Math.atan2(to.y, Math.max(40, hd)), -0.5, 0.45);
    r.ay = clamp(wantP / 0.85 + (wantP - r.pitch) * 1.2, -1, 1);
    // yüksekliği korumak için hızlı kuş burnu yukarı çeker
    if (r.pos.y < 30) r.ay = 1;
    // rubber band
    if (this.me && r !== this.me) { const dd = r.next - this.me.next; r.spdK = dd > 2 ? 0.93 : dd < -2 ? 1.07 : 1; }
  }
  toast(t) { this.toastT = 1.2; this.toastText = t; }
  finish() {
    this.over = true; this.state = 'end';
    const rows = this.racers.map((r) => ({ name: r.name, me: r.me, color: r.color, fin: r.fin, rings: r.next, hits: r.hits })).sort((a, b) => (b.fin > 0) - (a.fin > 0) || (a.fin && b.fin ? a.fin - b.fin : b.rings - a.rings));
    this.cb.onEnd?.({ rows, rank: rows.findIndex((r) => r.me) + 1, time: this.me.fin });
  }
  place() {
    for (const r of this.racers) {
      r.mesh.position.copy(r.pos); r.mesh.rotation.set(r.pitch * (r.crash > 0 ? 0 : 1), -r.yaw + (r.crash > 0 ? this.t * 8 : 0), -r.roll * 0.9, 'YXZ');
      r.mesh.visible = !(r.crash > 0 && Math.floor(this.t * 12) % 2);
    }
    for (const r of this.rings) { r.mesh.rotation.z += 0.004; }
    const me = this.me, back = new THREE.Vector3(-Math.sin(me.yaw) * Math.cos(me.pitch * 0.5), -Math.sin(me.pitch * 0.5), Math.cos(me.yaw) * Math.cos(me.pitch * 0.5));
    const tgt = me.pos.clone().addScaledVector(back, 16).add(new THREE.Vector3(0, 4.5, 0));
    this.cam.position.lerp(tgt, 0.18); if (this.shake > 0) this.cam.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0));
    this.cam.lookAt(me.pos.clone().add(new THREE.Vector3(Math.sin(me.yaw) * 14, Math.sin(me.pitch) * 8, -Math.cos(me.yaw) * 14)));
    this.cam.rotation.z += -me.roll * 0.25; this.cam.fov = 68 + clamp((me.spd - 40) * 0.35, 0, 20); this.cam.updateProjectionMatrix();
  }
  hud() {
    if (!this.me) return null; const me = this.me;
    const order = [...this.racers].sort((a, b) => (b.fin > 0) - (a.fin > 0) || b.next - a.next || 0);
    const ring = this.rings[Math.min(me.next, N_RINGS - 1)], to = ring.p.clone().sub(me.pos);
    let ang = Math.atan2(to.x, -to.z) - me.yaw; ang = ((ang + Math.PI) % TAU + TAU) % TAU - Math.PI;
    return { state: this.state, count: this.state === 'count' ? Math.max(0, Math.ceil(this.countT - 0.4)) : -1, spd: Math.round(me.spd * 3.6), alt: Math.round(me.pos.y), rank: order.indexOf(me) + 1, ring: Math.min(me.next + 1, N_RINGS), total: N_RINGS, ang, up: to.y - 0, toast: this.toastT > 0 ? this.toastText : '', boost: me.boost > 0, crash: me.crash > 0, dist: Math.round(to.length()) };
  }
  advance(n, dt = 1 / 60) { for (let i = 0; i < n; i++) this.step(dt); this.place(); }
  loop() {
    if (!this.running) return; const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.acc += dt;
    let n = 0; while (this.acc >= 1 / 60 && n < 6) { this.step(1 / 60); this.acc -= 1 / 60; n++; } if (n === 6) this.acc = 0;
    this.r.render(this.scene, this.cam); if (this.state !== 'idle') this.cb.onFrame?.(this.hud());
    requestAnimationFrame(this.loop);
  }
}
