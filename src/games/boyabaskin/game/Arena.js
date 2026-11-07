import * as THREE from 'three';
import * as S from '../../bulutyaris/game/sfx.js';
import { makeFigure } from '../../samanyolu/game/world.js';
import { nameTag } from '../../zirve/game/Climb.js';
import * as MD from '../../../engine/models.js';
import { HX, HZ, BASE_Z, BASE_R, CAGE, TEAM, PK, buildMapData, buildMapMesh, makeDuck, groundAt, resolveXZ, inBox, los } from './map.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const GRAV = 24, JUMP = 8.6, WALK = 8.4, EYE = 1.55;
export const WIN_SCORE = 3, MATCH_T = 240, BRIEF_LINES = [
  'Büyük final! Ama kimse beklemiyordu: maskot Ördek Bey kaçırıldı!',
  'Kafesi sahanın tam ortasında. İki takım da onu istiyor.',
  'Kafese yaklaş, Ördek Bey’i serbest bırak, omzuna al ve üssüne götür.',
  'Boyalı toplar can yakmaz ama seni 3 saniye oyundan çıkarır. İlk 3 kurtarışı yapan kazanır!',
];
const DIFF = { easy: { err: 0.17, fire: 0.75, spd: 0.8, turn: 3 }, normal: { err: 0.09, fire: 0.46, spd: 0.95, turn: 5 }, hard: { err: 0.04, fire: 0.3, spd: 1.05, turn: 8 } };
const DUMMY = new THREE.Vector3();

export class Arena {
  constructor(canvas, cb = {}) {
    this.cv = canvas; this.cb = cb; this.touch = !!cb.touch;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.touch, powerPreference: 'high-performance' });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9ad0ff); this.scene.fog = new THREE.Fog(0xbfe0ff, 70, 190);
    this.cam = new THREE.PerspectiveCamera(72, 1, 0.1, 400); this.scene.add(this.cam);
    this.scene.add(new THREE.HemisphereLight(0xeaf5ff, 0x7a8a5a, 1.5));
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.1); sun.position.set(30, 70, 20); this.scene.add(sun);
    this.M = buildMapData(); this.cageBox = { x: 0, z: 0, w: 3.6, d: 3.6, h: 3.6, top: 3.6, x0: -1.8, x1: 1.8, z0: -1.8, z1: 1.8, kind: 'cage' }; this.M.boxes.push(this.cageBox);
    this.mapMesh = buildMapMesh(this.M); this.scene.add(this.mapMesh);
    this.duck = makeDuck(); this.scene.add(this.duck);
    this.pkMeshes = this.M.pk.map((p) => { const g = new THREE.Group(); const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), new THREE.MeshBasicMaterial({ color: PK[p.type].c })); o.position.y = 1.3; g.add(o); const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 20), new THREE.MeshBasicMaterial({ color: PK[p.type].c, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })); r.rotation.x = -Math.PI / 2; r.position.y = 0.05; g.add(r); g.position.set(p.x, 0, p.z); this.scene.add(g); return g; });
    // silah (birinci şahıs)
    this.gun = new THREE.Group(); const gm = new THREE.MeshLambertMaterial({ color: 0x2a2f3a, flatShading: true });
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.62), gm); barrel.position.z = -0.25; this.gun.add(barrel);
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), new THREE.MeshLambertMaterial({ color: 0xffd23a })); hopper.position.set(0, 0.14, -0.05); this.gun.add(hopper);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.1), gm); grip.position.set(0, -0.12, 0.05); this.gun.add(grip);
    this.flashM = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff })); this.flashM.position.z = -0.62; this.flashM.visible = false; this.gun.add(this.flashM);
    this.gun.scale.setScalar(0.6); this.gun.position.set(0.24, -0.24, -0.5); this.cam.add(this.gun);
    this.splats = []; this.projs = []; this.fx = []; this.players = [];
    this.assetP = loadAssets().then((ok) => { this.assets = ok; if (ok) this.decorate(); });
    this.input = { mx: 0, my: 0, fire: false, jump: false };
    this.t = 0; this.acc = 0; this.last = performance.now(); this.hudT = 0; this.netT = 0;
    this.phase = 'menu'; this.camShake = 0; this.flashHit = 0; this.feed = []; this.msg = ''; this.msgT = 0; this.bigText = '';
    this.resize(); this._rs = () => this.resize(); addEventListener('resize', this._rs);
    this.raf = requestAnimationFrame(() => this.loop());
  }
  dispose() { cancelAnimationFrame(this.raf); removeEventListener('resize', this._rs); this.leaveOnline(); this.renderer.dispose(); }
  resize() {
    const w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch ? 1.5 : 2));
    this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.fov = w / h < 1 ? 85 : 72; this.cam.updateProjectionMatrix();
  }
  decorate() {
    // sahanın dışına ağaç, kaya ve çadırlar (CC0 Kenney/Quaternius modelleri)
    let seed = 7; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const g = new THREE.Group(); const names = ['tree_pine', 'tree_pine_tall', 'tree_oak', 'tree_pine', 'rock_large', 'rock_tall', 'bush'];
    for (let i = 0; i < 90; i++) {
      let x = (R() - 0.5) * (HX * 2 + 130), z = (R() - 0.5) * (HZ * 2 + 130);
      if (Math.abs(x) < HX + 5 && Math.abs(z) < HZ + 5) { if (R() < 0.5) x = (x < 0 ? -1 : 1) * (HX + 6 + R() * 50); else z = (z < 0 ? -1 : 1) * (HZ + 6 + R() * 50); }
      const n = names[(R() * names.length) | 0], m = MD.cloneModel(n, n.startsWith('tree') ? 7 + R() * 7 : n === 'bush' ? 1.6 : 3 + R() * 3); if (!m) continue;
      m.position.set(x, 0, z); m.rotation.y = R() * 6.28; g.add(m);
    }
    for (const [x, z, r] of [[-HX - 8, 20, 1], [HX + 8, -20, 3], [-HX - 8, -40, 2]]) { const m = MD.cloneModel('tent', 5); if (m) { m.position.set(x, 0, z); m.rotation.y = r; g.add(m); } }
    this.scene.add(g); this.deco = g;
  }
  say(t, s = 1.8) { this.msg = t; this.msgT = s; }

  mkModel(team, idx) {
    const names = ['mini_male_a', 'mini_female_a', 'mini_male_b', 'mini_female_b', 'mini_male_c', 'mini_female_c'];
    const g = MD.cloneModel(names[(idx * 2 + team) % names.length], 1.8); if (!g) return null;
    g.traverse((n) => { if (n.material) n.material = n.material.clone(); });
    const col = TEAM[team].color, mat = new THREE.MeshLambertMaterial({ color: col });
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 10), mat); hat.position.set(0, 2.05, 0); g.add(hat);
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.42, 14, 1, true), new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })); vest.position.set(0, 1.12, 0); g.add(vest);
    const gun = MD.cloneModel('blaster_a', 0.55); if (gun) { gun.position.set(0.28, 0.95, 0.35); gun.rotation.y = 0; g.add(gun); }
    g.userData.mix = MD.mixerFor(g); g.userData.mix.play('idle', 0);
    return g;
  }
  // ---------- başlat ----------
  start({ nick = 'Sen', diff = 'normal', online = null, auto = false }) {
    for (const p of this.players) this.scene.remove(p.g);
    for (const s of this.splats) this.scene.remove(s);
    for (const p of this.projs) this.scene.remove(p.m);
    this.splats = []; this.projs = []; this.players = []; this.feed = []; this.diff = DIFF[diff] || DIFF.normal;
    this.online = online; this.host = !online || online.host; this.auto = auto;
    const mk = (name, team, uid, remote, bot, idx) => {
      let g = this.assets ? this.mkModel(team, idx) : null;
      if (!g) { g = makeFigure({ body: TEAM[team].color, hair: TEAM[team].color, pants: 0x2a3050, skin: 0xf0c8a0 }); const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.7), new THREE.MeshLambertMaterial({ color: 0x2a2f3a })); gun.position.set(0, -0.5, 0.3); g.userData.armR.add(gun); }
      const tag = nameTag(name, TEAM[team].color); tag.position.y = 2.6; tag.scale.set(3, 0.75, 1); g.add(tag); this.scene.add(g);
      return { uid, name, team, idx, remote, bot, g, tag, x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, yaw: 0, pitch: 0, hp: 3, dead: false, respT: 0, inv: 0, shield: 0, speedT: 0, tripleT: 0, kills: 0, deaths: 0, rescues: 0, anim: 0, net: null, cd: 0, firing: 0, flash: 0, grounded: true, carry: false, aiT: 0, strafe: 1, strafeT: 0, stuckT: 0, lastX: 0, lastZ: 0, detour: 0, detourDir: 1, sp: 0, gone: false };
    };
    if (online) {
      online.order.forEach((u, i) => { const inf = online.players[u] || {}; const p = mk((inf.n || 'Oyuncu').slice(0, 12), i % 2, u, u !== online.uid, false, i); this.players.push(p); if (u === online.uid) this.me = p; });
    } else {
      this.me = mk(nick, 0, 'me', false, false, 0); this.players.push(this.me);
      [['Pamuk', 0], ['Kıvırcık', 1], ['Tombik', 1]].forEach(([n, t], i) => this.players.push(mk(n, t, 'bot' + i, true, true, i + 1)));
    }
    const cnt = [0, 0]; for (const p of this.players) { p.slot = cnt[p.team]++; this.spawn(p, true); }
    this.score = [0, 0]; this.timeLeft = MATCH_T; this.over = false; this.winner = -1;
    this.hos = { st: 0, by: '', x: CAGE.x, y: 0, z: CAGE.z, fp: 0, ft: -1, dropT: 0, resetT: 0 };
    this.cageBox.off = false; this.taken = this.M.pk.map(() => 0); this.sudden = false;
    this.waitGo = false; this.phase = 'brief'; this.phaseT = 0; this.briefI = 0; this.briefLineT = 0; this.pt = 0;
    this.cb.onBrief?.({ text: BRIEF_LINES[0], i: 0, n: BRIEF_LINES.length });
    this.fadeIn = 1; this.input.fire = false; this.camP = new THREE.Vector3(0, 26, 95);
    S.unlock(); this.resize();
  }
  toMenu() { this.phase = 'menu'; this.leaveOnline(); for (const p of this.players) this.scene.remove(p.g); this.players = []; this.me = null; }
  spawn(p, first) {
    const s = p.slot ?? 0, sg = p.team === 0 ? 1 : -1;
    p.x = (s - 1.5) * 3.2; p.z = sg * (BASE_Z + (first ? 1 : 0)) ; p.y = 0; p.vx = p.vz = p.vy = 0; p.yaw = p.team === 0 ? Math.PI : 0; p.pitch = 0;
    p.hp = 3; p.dead = false; p.inv = first ? 0 : 2.2; p.carry = false; p.g.visible = true; p.g.rotation.set(0, 0, 0);
    p.shield = 0; p.speedT = 0; p.tripleT = 0;
  }

  // ---------- ağ ----------
  attachOnline(room, meta) {
    const order = (meta.order || Object.keys(room.players)).filter((u) => room.players[u]);
    const on = { room, uid: room.uid, order, players: { ...room.players }, host: room.isHost }; this.net = on;
    room.on('pos', (u, a) => this.onNetPos(u, a)); room.on('ev', (u, e) => this.applyEv(e, false)); room.on('world', (w) => this.onWorld(w));
    room.on('players', (pl) => { for (const p of this.players) if (p.remote && !pl[p.uid] && !p.gone) { p.gone = true; p.dead = true; p.g.visible = false; this.feedAdd(`${p.name} ayrıldı`, 0xffffff); } });
    room.on('closed', () => this.cb.onNetClosed?.());
    return on;
  }
  leaveOnline() { if (this.net?.room) { try { this.net.room.leave(); } catch { /* yok say */ } } this.net = null; }
  onNetPos(u, a) {
    const p = this.players.find((q) => q.uid === u); if (!p || !p.remote || !a || p.gone) return;
    const v = Array.isArray(a) ? a : Object.values(a); const n = { x: v[0], y: v[1], z: v[2], yaw: v[3], pitch: v[4], f: v[5], hp: v[6] };
    if (!p.net) { p.x = n.x; p.y = n.y; p.z = n.z; }
    p.net = n; p.dead = !(n.f & 1); p.firing = n.f & 2 ? 0.15 : 0; p.carry = !!(n.f & 4); p.shield = n.f & 8 ? 1 : 0; p.hp = n.hp;
  }
  netSend() {
    const r = this.net?.room, p = this.me; if (!r || !p) return; const f = (x) => Math.round(x * 100) / 100;
    r.sendPos([f(p.x), f(p.y), f(p.z), f(p.yaw), f(p.pitch), (p.dead ? 0 : 1) | (p.firing > 0 ? 2 : 0) | (p.carry ? 4 : 0) | (p.shield > 0 ? 8 : 0), p.hp]);
  }
  bcast(e) { if (this.net) this.net.room.sendEv(e); this.applyEv(e, true); }
  bcastRemote(e) { if (this.net) this.net.room.sendEv(e); }
  onWorld(w) {
    if (!w || this.host) return;
    const h = this.hos; h.st = w.st; h.by = w.by || ''; h.x = w.x; h.y = w.y; h.z = w.z; h.fp = w.fp; h.ft = w.ft; this.score = [w.a, w.b]; this.timeLeft = w.tl;
    for (const p of this.players) p.carry = w.st === 1 && w.by === p.uid;
    this.cageBox.off = w.st !== 0;
  }
  worldSend() { const r = this.net?.room; if (!r) return; const h = this.hos, f = (x) => Math.round(x * 100) / 100; r.sendWorld({ st: h.st, by: h.by, x: f(h.x), y: f(h.y), z: f(h.z), fp: f(h.fp), ft: h.ft, a: this.score[0], b: this.score[1], tl: Math.round(this.timeLeft) }); }
  applyEv(e, own) {
    if (!e) return;
    const byU = (u) => this.players.find((p) => p.uid === u);
    if (e.t === 'go') { this.startCount(); }
    else if (e.t === 'sh') { if (!own) this.spawnBall(e.x, e.y, e.z, e.dx, e.dy, e.dz, e.tm, e.u); }
    else if (e.t === 'hit') { const v = byU(e.v); if (v) { v.flash = 0.3; if (v !== this.me && !own) { v.hp = e.hp; } this.puff(v.x, v.y + 1.1, v.z, TEAM[e.tm].color, 8); } }
    else if (e.t === 'kill') {
      const v = byU(e.v), k = byU(e.by); if (!v) return;
      v.deaths++; if (k && k !== v) k.kills++;
      if (own || true) { v.dead = true; v.respT = 3.5; }
      this.feedAdd(`${k ? k.name : '?'} ▸ ${v.name}`, k ? TEAM[k.team].color : 0xffffff);
      if (v === this.me) { this.camShake = 0.5; if (!MD.play('downed', 0.7)) S.fall(); } else MD.play('kill', 0.4);
      if (this.host && this.hos.st === 1 && this.hos.by === v.uid) this.dropHostage(v);
    } else if (e.t === 'rs') { const p = byU(e.u); if (p && p.remote) { this.spawn(p); } }
    else if (e.t === 'sc') { const p = byU(e.u); if (p) p.rescues++; this.score = e.s; this.say(`${TEAM[e.tm].name} takım Ördek Bey’i kurtardı!`, 2.6); (MD.play('level_up', 0.7) || S.done()); this.bigText = `${e.s[0]} - ${e.s[1]}`; setTimeout(() => { this.bigText = ''; }, 1600); this.cb.onScore?.(); }
    else if (e.t === 'fr') { this.say(`${e.n} Ördek Bey’i serbest bıraktı!`, 2.2); MD.play('confirm', 0.6) || S.pick(); }
    else if (e.t === 'pk') { this.taken[e.i] = 18; const p = byU(e.u); if (p && p !== this.me) this.applyBuff(p, this.M.pk[e.i].type); }
    else if (e.t === 'end') { this.endMatch(e.w, e.sc); }
  }
  feedAdd(t, c) { this.feed.unshift({ t, c, life: 5 }); if (this.feed.length > 4) this.feed.pop(); }

  // ---------- faz akışı ----------
  startCount() { this.phase = 'count'; this.phaseT = 3.4; this.lastBeep = 4; this.cb.onBrief?.(null); for (const p of this.players) this.spawn(p, true); }
  briefTap() {
    if (this.phase !== 'brief') return;
    this.briefI++; this.briefLineT = 0;
    if (this.briefI >= BRIEF_LINES.length) { if (this.host) this.bcast({ t: 'go' }); else this.cb.onBrief?.({ text: 'Kurucunun başlatması bekleniyor…', i: 3, n: 4 }), (this.waitGo = true); }
    else this.cb.onBrief?.({ text: BRIEF_LINES[this.briefI], i: this.briefI, n: BRIEF_LINES.length });
  }
  endMatch(w, sc) {
    if (this.phase === 'end') return;
    this.winner = w; if (sc) this.score = sc; this.phase = 'end'; this.endT = 0; this.over = true; (MD.play('level_up', 0.8) || S.done()); this.confetti = true;
    this.cb.onEnd?.(this.summary());
  }
  summary() {
    const rows = [...this.players].filter((p) => !p.gone).sort((a, b) => b.rescues * 5 + b.kills - (a.rescues * 5 + a.kills)).map((p) => ({ name: p.name, team: p.team, kills: p.kills, deaths: p.deaths, rescues: p.rescues, me: p === this.me }));
    return { winner: this.winner, score: this.score, rows, mine: this.winner === this.me.team, solo: !this.online };
  }

  // ---------- fizik ----------
  stepBody(p, wx, wz, speed, dt, jump) {
    const k = Math.min(1, dt * 9);
    if (p.grounded) { p.vx += (wx * speed - p.vx) * k; p.vz += (wz * speed - p.vz) * k; } else { p.vx += (wx * speed - p.vx) * Math.min(1, dt * 2.2); p.vz += (wz * speed - p.vz) * Math.min(1, dt * 2.2); }
    p.x += p.vx * dt; p.z += p.vz * dt;
    resolveXZ(this.M.boxes, p, 0.45);
    p.x = clamp(p.x, -HX + 0.5, HX - 0.5); p.z = clamp(p.z, -HZ + 0.5, HZ - 0.5);
    const g = groundAt(this.M.boxes, p.x, p.z, p.y);
    if (jump && p.grounded) { p.vy = JUMP; p.grounded = false; }
    p.vy -= GRAV * dt; p.y += p.vy * dt;
    if (p.y <= g) { p.y = g; p.vy = 0; p.grounded = true; } else if (p.y > g + 0.02) p.grounded = false;
    p.sp = Math.hypot(p.vx, p.vz);
  }
  aimDir(p) { const cp = Math.cos(p.pitch); return DUMMY.set(Math.sin(p.yaw) * cp, Math.sin(p.pitch), Math.cos(p.yaw) * cp); }
  shoot(p) {
    const n = p.tripleT > 0 ? 3 : 1; p.cd = p.tripleT > 0 ? 0.3 : 0.2; p.firing = 0.15;
    const d0 = this.aimDir(p).clone();
    // yardımlı nişan (insan oyuncu için)
    if (!p.bot && p === this.me && !this.auto) {
      let best = null, bd = 0.1;
      for (const e of this.players) { if (e.team === p.team || e.dead || e.gone) continue; const dx = e.x - p.x, dy = e.y + 1.1 - (p.y + EYE), dz = e.z - p.z, L = Math.hypot(dx, dy, dz); if (L > 45 || L < 1) continue; const dot = (dx * d0.x + dy * d0.y + dz * d0.z) / L; if (dot > 1 - bd && los(this.M.boxes, p, e)) { bd = 1 - dot; best = [dx / L, dy / L, dz / L]; } }
      if (best) { d0.x += (best[0] - d0.x) * 0.55; d0.y += (best[1] - d0.y) * 0.55; d0.z += (best[2] - d0.z) * 0.55; d0.normalize(); }
    }
    for (let i = 0; i < n; i++) {
      const sp = n > 1 ? (i - 1) * 0.07 : 0, cs = Math.cos(sp), sn = Math.sin(sp);
      const dx = d0.x * cs - d0.z * sn, dz = d0.x * sn + d0.z * cs, dy = d0.y;
      const x = p.x + dx * 0.7, y = p.y + EYE - 0.1 + dy * 0.7, z = p.z + dz * 0.7;
      this.spawnBall(x, y, z, dx, dy, dz, p.team, p.uid);
      if (!p.bot) this.bcastRemote({ t: 'sh', x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, z: Math.round(z * 100) / 100, dx: Math.round(dx * 1000) / 1000, dy: Math.round(dy * 1000) / 1000, dz: Math.round(dz * 1000) / 1000, tm: p.team, u: p.uid });
    }
    if (!MD.play('shoot', p === this.me ? 0.5 : 0.22, 1.1)) S.fire();
    if (p === this.me) { this.gun.position.z = -0.4; this.flashM.visible = true; setTimeout(() => (this.flashM.visible = false), 50); }
  }
  spawnBall(x, y, z, dx, dy, dz, team, owner) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshBasicMaterial({ color: TEAM[team].color })); m.position.set(x, y, z); this.scene.add(m);
    this.projs.push({ m, x, y, z, vx: dx * 44, vy: dy * 44, vz: dz * 44, team, owner, life: 2 });
  }
  damage(p, byUid, team) {
    if (p.dead || p.inv > 0 || this.phase !== 'play') return;
    if (p.shield > 0) { p.shield--; this.puff(p.x, p.y + 1.1, p.z, 0x5ad0ff, 10); if (p === this.me) this.say('Kalkan engelledi!', 1); return; }
    p.hp--; p.flash = 0.3; this.puff(p.x, p.y + 1.1, p.z, TEAM[team].color, 8);
    if (p === this.me) { this.flashHit = 1; this.camShake = 0.35; if (!MD.play('hurt', 0.7)) S.bump(); }
    if (!p.remote || p.bot) this.bcastRemote({ t: 'hit', v: p.uid, hp: p.hp, tm: team });
    if (p.hp <= 0) { p.vx = p.vz = 0; this.bcast({ t: 'kill', v: p.uid, by: byUid }); if (p.carry) p.carry = false; }
  }
  puff(x, y, z, c, n) {
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 5, 4), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); this.scene.add(m); this.fx.push({ m, vx: (Math.random() - 0.5) * 7, vy: Math.random() * 5 + 1, vz: (Math.random() - 0.5) * 7, life: 0.6 + Math.random() * 0.4 }); }
  }
  splat(x, y, z, nx, ny, nz, c) {
    const s = 0.28 + Math.random() * 0.35, m = new THREE.Mesh(new THREE.CircleGeometry(s, 9), new THREE.MeshBasicMaterial({ color: c, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide }));
    m.position.set(x + nx * 0.03, y + ny * 0.03, z + nz * 0.03); m.lookAt(x + nx, y + ny, z + nz); m.rotation.z = Math.random() * 6; this.scene.add(m); this.splats.push(m);
    if (this.splats.length > 220) { this.scene.remove(this.splats.shift()); }
  }
  stepProjs(dt) {
    const B = this.M.boxes;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const q = this.projs[i]; let dead = false;
      q.life -= dt; if (q.life <= 0) dead = true;
      for (let s = 0; s < 3 && !dead; s++) {
        const h = dt / 3, px = q.x, py = q.y, pz = q.z;
        q.vy -= 3.5 * h; q.x += q.vx * h; q.y += q.vy * h; q.z += q.vz * h;
        if (q.y <= 0.02) { this.splat(q.x, 0, q.z, 0, 1, 0, TEAM[q.team].color); dead = true; break; }
        const b = inBox(B, q.x, q.y, q.z);
        if (b) {
          let nx = 0, ny = 0, nz = 0;
          if (py >= b.top) ny = 1; else if (px <= b.x0) nx = -1; else if (px >= b.x1) nx = 1; else if (pz <= b.z0) nz = -1; else nz = 1;
          const cx = nx ? (nx > 0 ? b.x1 : b.x0) : clamp(q.x, b.x0, b.x1), cy = ny ? b.top : clamp(q.y, 0.05, b.top), cz = nz ? (nz > 0 ? b.z1 : b.z0) : clamp(q.z, b.z0, b.z1);
          this.splat(cx, cy, cz, nx, ny, nz, TEAM[q.team].color); dead = true; break;
        }
        // oyuncu isabeti (yalnızca kendi bedenimiz ya da botlar)
        for (const p of this.players) {
          if (p.dead || p.gone || p.team === q.team) continue;
          if (p.remote && !p.bot) continue;
          if (p.bot && !this.host) continue;
          const dx = q.x - p.x, dz = q.z - p.z; if (dx * dx + dz * dz > 0.5 * 0.5 || q.y < p.y - 0.1 || q.y > p.y + 2) continue;
          this.damage(p, q.owner, q.team); dead = true; break;
        }
      }
      q.m.position.set(q.x, q.y, q.z);
      if (dead) { this.scene.remove(q.m); this.projs.splice(i, 1); }
    }
  }

  // ---------- rehine mantığı (kurucu/solo) ----------
  dropHostage(p) { const h = this.hos; h.st = 2; h.by = ''; h.x = p.x; h.z = p.z; h.y = p.y; h.dropT = 12; if (p) p.carry = false; this.say('Ördek Bey yere düştü!', 1.8); }
  stepHostage(dt) {
    const h = this.hos, P = this.players;
    if (h.st === 0) {
      h.x = CAGE.x; h.z = CAGE.z; h.y = 0;
      if (h.resetT > 0) { h.resetT -= dt; return; }
      const near = [0, 0]; let first = [null, null];
      for (const p of P) { if (p.dead || p.gone) continue; if (Math.hypot(p.x - CAGE.x, p.z - CAGE.z) < CAGE.free) { near[p.team]++; if (!first[p.team]) first[p.team] = p; } }
      let team = -1; if (near[0] && !near[1]) team = 0; else if (near[1] && !near[0]) team = 1;
      if (team >= 0) { h.ft = team; h.fp += dt / 2.2; } else { h.fp = Math.max(0, h.fp - dt * 0.8); if (!near[0] && !near[1]) h.ft = -1; }
      if (h.fp >= 1) { const p = first[team]; h.st = 1; h.by = p.uid; p.carry = true; h.fp = 0; h.ft = -1; this.cageBox.off = true; this.bcast({ t: 'fr', n: TEAM[team].name }); }
    } else if (h.st === 1) {
      const p = P.find((q) => q.uid === h.by);
      if (!p || p.dead || p.gone) { this.dropHostage(p || { x: h.x, z: h.z, y: 0 }); return; }
      h.x = p.x - Math.sin(p.yaw) * 1.3; h.z = p.z - Math.cos(p.yaw) * 1.3; h.y = p.y; p.carry = true;
      const bz = p.team === 0 ? BASE_Z : -BASE_Z;
      if (Math.hypot(p.x, p.z - bz) < BASE_R) {
        this.score[p.team]++; p.carry = false;
        h.st = 0; h.by = ''; h.resetT = 3.5; h.fp = 0; this.cageBox.off = false;
        this.bcast({ t: 'sc', u: p.uid, tm: p.team, s: [...this.score] });
        if (this.score[p.team] >= WIN_SCORE || this.sudden) this.finish(p.team);
      }
    } else if (h.st === 2) {
      h.dropT -= dt;
      if (h.dropT <= 0) { h.st = 0; h.resetT = 1; this.cageBox.off = false; return; }
      for (const p of P) { if (p.dead || p.gone) continue; if (Math.hypot(p.x - h.x, p.z - h.z) < 1.6) { h.st = 1; h.by = p.uid; p.carry = true; this.say(`${p.name} Ördek Bey’i aldı`, 1.4); break; } }
    }
  }
  finish(team) { this.bcast({ t: 'end', w: team, sc: [...this.score] }); }

  // ---------- bot yapay zekâsı ----------
  botControl(b, dt) {
    const D = this.diff, P = this.players, h = this.hos;
    b.aiT -= dt; b.strafeT -= dt;
    if (b.strafeT <= 0) { b.strafeT = 0.7 + Math.random() * 1.2; b.strafe = Math.random() < 0.5 ? -1 : 1; }
    // hedef düşman
    if (b.aiT <= 0) {
      b.aiT = 0.2 + Math.random() * 0.15; b.enemy = null; let bd = 40;
      for (const e of P) { if (e.team === b.team || e.dead || e.gone) continue; const d = Math.hypot(e.x - b.x, e.z - b.z); if (d < bd && los(this.M.boxes, b, e)) { bd = d; b.enemy = e; } }
      // genel hedef
      const own = b.team === 0 ? BASE_Z : -BASE_Z, carrier = h.st === 1 ? P.find((q) => q.uid === h.by) : null;
      let gx, gz;
      if (b.carry) { gx = 0; gz = own; }
      else if (carrier && carrier.team === b.team) { const off = b.idx % 2 ? 4 : -4; gx = carrier.x + off; gz = carrier.z + (own - carrier.z) * 0.15; }
      else if (carrier) { gx = carrier.x; gz = carrier.z; }
      else {
        // en yakın takım arkadaşı rehineye gitsin; diğerleri yan yol
        const mates = P.filter((q) => q.team === b.team && !q.dead && !q.gone).sort((a, c) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(c.x - h.x, c.z - h.z));
        const lead = mates[0] === b || b.role === 'rush';
        gx = h.x + (lead ? 0 : (b.idx % 2 ? 8 : -8)); gz = h.z + (lead ? 0 : (b.team === 0 ? 5 : -5));
      }
      b.gx = gx; b.gz = gz;
    }
    // bakış & ateş
    const en = b.enemy; let wantYaw = b.yaw, fire = false, wx = 0, wz = 0;
    let tx = b.gx ?? b.x, tz = b.gz ?? b.z;
    const dgx = tx - b.x, dgz = tz - b.z, dg = Math.hypot(dgx, dgz) || 1;
    if (en && !en.dead) {
      const ex = en.x + en.vx * 0.15 - b.x, ez = en.z + en.vz * 0.15 - b.z, ed = Math.hypot(ex, ez) || 1;
      wantYaw = Math.atan2(ex, ez) + (Math.random() - 0.5) * D.err * 0.6;
      b.pitch += (Math.atan2((en.y + 1.1) - (b.y + EYE), ed) + 0.02 * ed * 0.04 - b.pitch) * Math.min(1, dt * 6);
      const err = Math.abs(angDiff(b.yaw, wantYaw));
      if (err < 0.12 + D.err && ed < 38 && b.cd <= 0 && !b.carry) { fire = true; }
      // savaş hareketi: yan adım + hedefe doğru ilerle
      const sx = -Math.cos(Math.atan2(ex, ez)) * 0, side = b.strafe;
      wx = (ex / ed) * (ed > 14 ? 0.7 : ed < 7 ? -0.5 : 0.1) + (-ez / ed) * side * 0.8 + sx; wz = (ez / ed) * (ed > 14 ? 0.7 : ed < 7 ? -0.5 : 0.1) + (ex / ed) * side * 0.8;
      // hedefe de gitmeyi unutma
      if (!b.carry) { wx += (dgx / dg) * 0.4; wz += (dgz / dg) * 0.4; } else { wx = dgx / dg; wz = dgz / dg; }
    } else { wantYaw = Math.atan2(dgx, dgz); b.pitch *= 0.9; wx = dgx / dg; wz = dgz / dg; if (dg < 1.5) { wx = wz = 0; } }
    b.yaw += clamp(angDiff(b.yaw, wantYaw), -D.turn * dt, D.turn * dt);
    // engel kaçınma
    let wl = Math.hypot(wx, wz); let jump = false;
    if (wl > 0.05) {
      wx /= wl; wz /= wl; const base = Math.atan2(wx, wz);
      const free = (a) => { const nx = b.x + Math.sin(a) * 1.5, nz = b.z + Math.cos(a) * 1.5; const bx = inBox(this.M.boxes, nx, b.y + 0.3, nz); return !bx || bx.top <= b.y + 1.5; };
      const lowBlock = (a) => { const bx = inBox(this.M.boxes, b.x + Math.sin(a) * 1.3, b.y + 0.3, b.z + Math.cos(a) * 1.3); return bx && bx.top <= b.y + 1.5 && bx.top > b.y + 0.3; };
      let ang = base;
      if (lowBlock(base) && b.grounded) jump = true;
      if (!free(base)) { for (const dA of [0.7, -0.7, 1.4, -1.4, 2.2, -2.2]) { if (free(base + dA)) { ang = base + dA; break; } } }
      if (b.detour > 0) { b.detour -= dt; ang = base + b.detourDir * 1.3; }
      wx = Math.sin(ang); wz = Math.cos(ang);
      // sıkışma
      b.stuckT += dt; if (b.stuckT > 0.9) { if (Math.hypot(b.x - b.lastX, b.z - b.lastZ) < 0.8) { b.detour = 0.9; b.detourDir = Math.random() < 0.5 ? -1 : 1; jump = true; } b.lastX = b.x; b.lastZ = b.z; b.stuckT = 0; }
    }
    return { wx, wz, fire, jump, wl };
  }
  applyBuff(p, type) { if (type === 0) p.speedT = 9; else if (type === 1) p.shield = 2; else p.tripleT = 10; }

  // ---------- adım ----------
  step(dt) {
    this.t += dt;
    if (this.feed.length) for (const f of this.feed) f.life -= dt;
    this.feed = this.feed.filter((f) => f.life > 0);
    if (this.msgT > 0) this.msgT -= dt;
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.life -= dt; f.vy -= 14 * dt; f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt; if (f.life <= 0 || f.m.position.y < 0) { this.scene.remove(f.m); this.fx.splice(i, 1); } }
    if (this.camShake > 0) this.camShake = Math.max(0, this.camShake - dt * 1.4);
    if (this.flashHit > 0) this.flashHit = Math.max(0, this.flashHit - dt * 2);
    this.gun.position.z += (-0.5 - this.gun.position.z) * Math.min(1, dt * 14);
    const ph = this.phase;
    if (ph === 'menu' || !this.me) return;
    this.tickVisuals(dt);
    if (ph === 'brief') {
      this.phaseT += dt; this.briefLineT += dt;
      if (this.briefLineT > 3.4 && !this.waitGo) this.briefTap();
    } else if (ph === 'count') {
      this.phaseT -= dt; const n = Math.ceil(this.phaseT - 0.4); if (n !== this.lastBeep && n >= 1) { this.lastBeep = n; S.beep(false); }
      if (this.phaseT <= 0.4) { this.phase = 'play'; this.pt = 0; S.beep(true); this.say('BAŞLA!', 1.2); }
    } else if (ph === 'play') {
      this.pt += dt;
      this.stepPlayers(dt);
      this.stepProjs(dt);
      if (this.host) {
        this.timeLeft = Math.max(0, MATCH_T - this.pt);
        this.stepHostage(dt);
        if (this.timeLeft <= 0 && !this.over) { if (this.score[0] !== this.score[1]) this.finish(this.score[0] > this.score[1] ? 0 : 1); else if (!this.sudden) { this.sudden = true; this.say('EŞİTLİK! Altın kurtarış: ilk kurtaran kazanır!', 3); } }
        if (this.net) { this.wt = (this.wt || 0) + dt; if (this.wt > 0.1) { this.wt = 0; this.worldSend(); } }
      }
    } else if (ph === 'end') {
      this.endT += dt; this.stepProjs(dt);
      for (const p of this.players) if (p.bot) { p.sp = 0; }
    }
    if (this.net && ph !== 'end') { this.netT += dt; if (this.netT >= 0.066) { this.netT = 0; this.netSend(); } }
  }
  stepPlayers(dt) {
    for (const p of this.players) {
      if (p.gone) continue;
      if (p.flash > 0) p.flash -= dt;
      if (p.inv > 0) p.inv -= dt; if (p.speedT > 0) p.speedT -= dt; if (p.tripleT > 0) p.tripleT -= dt; if (p.cd > 0) p.cd -= dt; if (p.firing > 0) p.firing -= dt;
      if (p.dead) {
        if (!p.remote || p.bot) { p.respT -= dt; if (p.respT <= 0) { this.spawn(p); if (!p.bot) this.bcastRemote({ t: 'rs', u: p.uid }); } }
        continue;
      }
      if (p.remote && !p.bot) { if (p.net) { const k = Math.min(1, dt * 12); p.x += (p.net.x - p.x) * k; p.y += (p.net.y - p.y) * k; p.z += (p.net.z - p.z) * k; p.yaw += angDiff(p.yaw, p.net.yaw) * k; p.pitch += (p.net.pitch - p.pitch) * k; const sp = Math.hypot(p.net.x - p.x, p.net.z - p.z) / Math.max(dt, 0.001); p.sp = Math.min(8, sp); } continue; }
      let wx = 0, wz = 0, jump = false, fire = false, speed = WALK;
      if (p.bot || (p === this.me && this.auto)) {
        const c = this.botControl(p, dt); wx = c.wx; wz = c.wz; jump = c.jump; fire = c.fire; speed *= this.diff.spd * (c.wl > 0.05 ? 1 : 0);
      } else {
        const f = this.aimDir(p), mx = this.input.mx, my = this.input.my;
        wx = f.x * my + -f.z * mx; wz = f.z * my + f.x * mx; const l = Math.hypot(wx, wz); if (l > 1) { wx /= l; wz /= l; }
        jump = this.input.jump; this.input.jump = false; fire = this.input.fire;
      }
      if (p.speedT > 0) speed *= 1.45; if (p.carry) speed *= 0.88;
      this.stepBody(p, wx, wz, speed, dt, jump);
      if (fire && p.cd <= 0) this.shoot(p);
      if (p.bot && fire) p.cd = Math.max(p.cd, this.diff.fire * (0.8 + Math.random() * 0.5));
      // yürüme animasyonu
      p.anim += dt * p.sp * 1.3;
      // güç artışı topla
      if (!p.remote || p.bot) for (const k of this.M.pk) { if (this.taken[k.i] > 0) continue; if (Math.hypot(p.x - k.x, p.z - k.z) < 1.6) { this.taken[k.i] = 18; this.applyBuff(p, k.type); if (!p.bot) this.bcastRemote({ t: 'pk', i: k.i, u: p.uid }); if (p === this.me) { MD.play('coin', 0.7) || S.pick(); this.say(PK[k.type].t + '!', 1.4); } } }
      // üs önünde dururken hostage yakın uyarı
    }
    for (let i = 0; i < this.taken.length; i++) if (this.taken[i] > 0) this.taken[i] -= dt;
    // takım arkadaşı fiziği: itişme yok. Basit ayrışma
    for (const a of this.players) for (const b of this.players) { if (a >= b || a.dead || b.dead || a.gone || b.gone) continue; const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < 0.8 && d > 0.001 && Math.abs(a.y - b.y) < 1.5) { const k = (0.8 - d) / 2 / d; if (!a.remote || a.bot) { a.x += dx * k; a.z += dz * k; } if (!b.remote || b.bot) { b.x -= dx * k; b.z -= dz * k; } } }
  }
  tickVisuals(dt) {
    const h = this.hos;
    // ördek
    this.duck.position.set(h.x, h.y, h.z); this.duck.rotation.y += dt * (h.st === 0 ? 1.2 : 0); this.duck.position.y = h.y + (h.st === 0 ? 0.4 + Math.sin(this.t * 3) * 0.12 : Math.abs(Math.sin(this.t * 8)) * 0.25 + 0.3);
    if (h.st === 1) { const c = this.players.find((q) => q.uid === h.by); if (c) this.duck.rotation.y = c.yaw; }
    this.duck.visible = !(h.resetT > 0);
    const cg = this.mapMesh.userData.cage; cg.visible = h.st === 0; cg.children.forEach((c) => { if (c.material?.opacity !== undefined) c.material.opacity = 1; });
    for (let i = 0; i < this.pkMeshes.length; i++) { const m = this.pkMeshes[i]; m.visible = !(this.taken[i] > 0); m.children[0].rotation.y += dt * 2; m.children[0].position.y = 1.3 + Math.sin(this.t * 3 + i) * 0.15; }
    for (const t of [0, 1]) { const f = this.mapMesh.userData['flag' + t]; f.scale.x = 1 + Math.sin(this.t * 4 + t) * 0.05; }
  }
  syncMeshes() {
    for (const p of this.players) {
      const u = p.g.userData;
      if (p.gone) { p.g.visible = false; continue; }
      p.g.visible = !p.dead || (p.respT > 0 && false);
      if (p === this.me && this.phase !== 'end') p.g.visible = false;
      if (p.dead) { p.g.visible = p !== this.me ? false : false; }
      p.g.position.set(p.x, p.y, p.z); p.g.rotation.y = p.yaw;
      if (u.mix) { u.mix.play(!p.grounded ? 'jump' : (p.sp || 0) > 4.5 ? 'sprint' : (p.sp || 0) > 0.6 ? 'walk' : 'idle'); u.mix.m.update(this.sdt || 1 / 60); }
      else { const sw = Math.sin(p.anim) * Math.min(1, (p.sp || 0) / 5) * 0.8;
      u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.armL.rotation.x = -sw * 0.6; u.armR.rotation.x = -1.35 + p.pitch * 0.5; }
      const e = p.flash > 0 ? 0xff3030 : p.inv > 0 && Math.floor(this.t * 14) % 2 ? 0x555555 : p.shield > 0 ? 0x1a5a88 : 0x000000;
      p.g.traverse((n) => { if (n.material?.emissive) n.material.emissive.setHex(e); });
      p.tag.visible = p !== this.me;
    }
  }
  camTarget() {
    const m = this.me;
    if (this.phase === 'brief') { // sinematik uçuş
      const T = clamp(this.phaseT / 13, 0, 1), K = [[0, 30, 100, 0, 2, 40], [-34, 14, 44, 0, 2, 0], [10, 7, 14, 0, 1.5, 0], [34, 15, -28, 0, 2, -50], [0, 24, -96, 0, 2, -30]];
      const s = T * (K.length - 1), i = Math.min(K.length - 2, Math.floor(s)), f = s - i, e = f * f * (3 - 2 * f), a = K[i], b = K[i + 1];
      const L = (k) => a[k] + (b[k] - a[k]) * e;
      return { pos: [L(0), L(1), L(2)], look: [L(3), L(4), L(5)] };
    }
    if (this.phase === 'end') {
      const bz = this.winner === 0 ? BASE_Z : this.winner === 1 ? -BASE_Z : 0, a = this.endT * 0.5;
      return { pos: [Math.sin(a) * 16, 6, bz + Math.cos(a) * 16], look: [0, 2, bz] };
    }
    if (m.dead) { const a = this.t * 0.4; return { pos: [m.x + Math.sin(a) * 7, 6, m.z + Math.cos(a) * 7], look: [m.x, 1, m.z] }; }
    const f = this.aimDir(m);
    return { pos: [m.x, m.y + EYE, m.z], look: [m.x + f.x, m.y + EYE + f.y, m.z + f.z], fps: true };
  }
  updateCam(dt) {
    if (!this.me) return;
    const c = this.camTarget();
    if (c.fps) { this.cam.position.set(c.pos[0], c.pos[1], c.pos[2]); } else { this.camP.lerp(new THREE.Vector3(...c.pos), Math.min(1, dt * 4)); this.cam.position.copy(this.camP); }
    if (this.camShake > 0) { this.cam.position.x += (Math.random() - 0.5) * this.camShake * 0.3; this.cam.position.y += (Math.random() - 0.5) * this.camShake * 0.3; }
    this.cam.lookAt(c.look[0], c.look[1], c.look[2]);
    this.gun.visible = !!c.fps && !this.me.dead;
  }
  confettiStep(dt) {
    if (!this.confetti || this.phase !== 'end') return;
    if (this.fx.length < 120) { const bz = this.winner === 0 ? BASE_Z : -BASE_Z; for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: [0xffd23a, 0xff5a8a, 0x5ad0ff, 0x7ad04a][i % 4], side: THREE.DoubleSide })); m.position.set((Math.random() - 0.5) * 14, 10, bz + (Math.random() - 0.5) * 14); this.scene.add(m); this.fx.push({ m, vx: (Math.random() - 0.5) * 2, vy: 1, vz: (Math.random() - 0.5) * 2, life: 3 }); } }
    void dt;
  }
  mini() { const h = this.hos; return { players: this.players.filter((p) => !p.gone).map((p) => ({ x: p.x, z: p.z, team: p.team, me: p === this.me, dead: p.dead, carry: p.carry })), duck: { x: h.x, z: h.z, st: h.st }, boxes: this.M.boxes.filter((b) => b.kind !== 'edge' && b.kind !== 'cage'), pk: this.M.pk.map((k, i) => ({ x: k.x, z: k.z, on: !(this.taken[i] > 0) })) }; }
  hud() {
    const m = this.me, h = this.hos; if (!m) return null;
    const own = m.team === 0 ? BASE_Z : -BASE_Z; let ox = h.x, oz = h.z, lab = 'Ördek Bey';
    if (m.carry) { ox = 0; oz = own; lab = 'Üssüne götür'; } else if (h.st === 1) { const c = this.players.find((q) => q.uid === h.by); if (c) { ox = c.x; oz = c.z; lab = c.team === m.team ? 'Takım arkadaşını koru' : 'Rakipten al'; } } else if (h.st === 0) lab = 'Kafesi aç'; else lab = 'Yerden al';
    const ang = Math.atan2(ox - m.x, oz - m.z), rel = angDiff(m.yaw, ang), dist = Math.hypot(ox - m.x, oz - m.z);
    let state = '';
    if (m.carry) state = 'ÖRDEK BEY SENDE! Üssüne götür'; else if (h.st === 1) { const c = this.players.find((q) => q.uid === h.by); state = c ? (c.team === m.team ? `${c.name} taşıyor: koru!` : `${c.name} (rakip) taşıyor: vur!`) : ''; } else if (h.st === 0) state = h.resetT > 0 ? 'Ördek Bey geri getiriliyor…' : 'Ördek Bey kafeste: yaklaşıp serbest bırak'; else state = 'Ördek Bey yerde: al!';
    return { phase: this.phase, score: this.score, timeLeft: Math.ceil(this.timeLeft), hp: m.hp, dead: m.dead, resp: Math.max(0, Math.ceil(m.respT)), team: m.team, state, rel, dist, lab, fp: h.fp, ft: h.ft, msg: this.msgT > 0 ? this.msg : '', feed: this.feed.map((f) => ({ t: f.t, c: '#' + f.c.toString(16).padStart(6, '0') })), count: this.phase === 'count' ? Math.max(0, Math.ceil(this.phaseT - 0.4)) : -1, big: this.bigText, hit: this.flashHit, buffs: { speed: Math.ceil(m.speedT), shield: m.shield, triple: Math.ceil(m.tripleT) }, sudden: this.sudden, online: !!this.net, carry: m.carry };
  }
  loop() {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.acc += dt;
    let n = 0; while (this.acc >= 1 / 60 && n < 6) { this.step(1 / 60); this.acc -= 1 / 60; n++; } if (n === 6) this.acc = 0;
    this.sdt = dt; this.confettiStep(dt); this.updateCam(dt); this.syncMeshes(); this.renderer.render(this.scene, this.cam);
    this.hudT += dt; if (this.hudT > 0.07 && this.me && this.phase !== 'menu') { this.hudT = 0; this.cb.onHud?.(this.hud(), this.mini()); }
    this.raf = requestAnimationFrame(() => this.loop());
  }
  advance(n, dt = 1 / 60) { for (let i = 0; i < n; i++) this.step(dt); this.updateCam(dt * n); this.syncMeshes(); }
  setMove(x, y) { this.input.mx = clamp(x, -1, 1); this.input.my = clamp(y, -1, 1); }
  look(dx, dy) { const m = this.me; if (!m || m.dead) return; m.yaw -= dx * 0.0062; m.pitch = clamp(m.pitch - dy * 0.0055, -1.2, 1.2); }
  jump() { this.input.jump = true; }
}

const MODELS = ['mini_male_a', 'mini_female_a', 'mini_male_b', 'mini_female_b', 'mini_male_c', 'mini_female_c', 'tree_pine', 'tree_pine_tall', 'tree_oak', 'rock_large', 'rock_tall', 'bush', 'tent', 'blaster_a'];
async function loadAssets() { try { const [ok] = await Promise.all([MD.preloadAll(MODELS), MD.preloadSfx(['shoot', 'hurt', 'downed', 'kill', 'level_up', 'confirm', 'coin'])]); return ok; } catch { return false; } }
