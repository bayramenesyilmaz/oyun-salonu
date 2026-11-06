import * as THREE from 'three';
import { makeClimber, nameTag } from '../../zirve/game/Climb.js';
import { PLAN } from './rounds.js';
import * as S from '../../bulutyaris/game/sfx.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
const angDiff = (a, b) => ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
export const COLORS = [0xe5483a, 0x2f7fd8, 0x2fbf71, 0xf2c230];
export const TEAM_COLORS = [0xe5483a, 0x2f7fd8];
const INTRO = 4.2, COUNT = 3.4, ENDWAIT = 1.4, RESULT = 7;

export class Party {
  constructor(canvas, cb = {}) {
    this.cv = canvas; this.cb = cb; this.touch = !!cb.touch;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.touch, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9bd8ff);
    this.cam = new THREE.PerspectiveCamera(60, 1, 0.3, 700);
    this.scene.add(new THREE.HemisphereLight(0xeaf5ff, 0x8a9a7a, 1.4));
    const sun = new THREE.DirectionalLight(0xfff2d6, 2.0);
    sun.position.set(40, 80, 30);
    this.scene.add(sun);
    this.input = { mx: 0, my: 0, dash: false, jump: false };
    this.players = []; this.fx = [];
    this.group = new THREE.Group(); this.scene.add(this.group);
    this.t = 0; this.acc = 0; this.last = performance.now(); this.phase = 'menu'; this.hudT = 0; this.netT = 0;
    this.toastText = ''; this.toastT = 0;
    this.camPos = new THREE.Vector3(0, 20, 20);
    this.resize();
    this._onResize = () => this.resize();
    addEventListener('resize', this._onResize);
    this.raf = requestAnimationFrame(() => this.loop());
  }
  dispose() { cancelAnimationFrame(this.raf); removeEventListener('resize', this._onResize); this.leaveOnline(); this.renderer.dispose(); }
  resize() {
    const w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.fov = w / h < 1 ? 74 : 58;
    this.cam.updateProjectionMatrix();
  }
  toast(t, s = 1.4) { this.toastText = t; this.toastT = s; }

  // ---------- başlat ----------
  start({ mode = 'solo', nick = 'Sen', online = null, colorIdx = 0 }) {
    this.clearRound();
    for (const p of this.players) this.scene.remove(p.g);
    this.players = [];
    this.online = online; this.teamMode = mode === 'team'; this.mode = mode;
    const mk = (name, color, team, uid, remote, i) => {
      const g = makeClimber(color); const tag = nameTag(name, color); g.add(tag); this.scene.add(g);
      return { uid, name, color, team, remote, g, tag, idx: i, x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, yaw: 0, alive: true, score: 0, mask: 0, dieT: 0, finT: 0, finished: false, total: 0, anim: 0, sp: 0, ground: true, gone: false, net: null };
    };
    if (online) {
      online.order.forEach((u, i) => {
        const inf = online.players[u] || {};
        const team = this.teamMode ? i % 2 : -1;
        const p = mk((inf.n || 'Oyuncu').slice(0, 12), this.teamMode ? TEAM_COLORS[team] : COLORS[i % 4], team, u, u !== online.uid, i);
        this.players.push(p);
        if (u === online.uid) this.me = p;
      });
    } else { this.me = mk(nick, COLORS[colorIdx % 4], -1, 'me', false, 0); this.players.push(this.me); }
    this.host = !online || online.host;
    this.round = -1; this.totals = {}; this.phase = 'wait'; this.rd = null; this.ended = false; this.res = null; this.finalRes = null;
    S.unlock();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch ? 1.5 : 2));
    this.resize();
    if (this.host) this.hostT = 1.2;
  }
  toMenu() { this.clearRound(); this.leaveOnline(); for (const p of this.players) this.scene.remove(p.g); this.players = []; this.phase = 'menu'; this.me = null; }

  // ---------- ağ ----------
  attachOnline(room, meta) {
    const order = (meta.order || Object.keys(room.players)).filter((u) => room.players[u]);
    const on = { room, uid: room.uid, order, players: { ...room.players }, host: room.isHost };
    this.net = on;
    room.on('pos', (u, p) => this.onNetPos(u, p));
    room.on('ev', (u, e) => this.applyEv(e, false));
    room.on('players', (pl) => { for (const p of this.players) if (p.remote && !pl[p.uid]) { p.gone = true; p.g.visible = false; } });
    room.on('closed', () => this.cb.onNetClosed?.());
    return on;
  }
  leaveOnline() { if (this.net?.room) { try { this.net.room.leave(); } catch { /* yok say */ } } this.net = null; }
  onNetPos(u, a) {
    const p = this.players.find((q) => q.uid === u);
    if (!p || !p.remote || !a) return;
    const v = Array.isArray(a) ? a : Object.values(a);
    const n = { x: v[0], y: v[1], z: v[2], yaw: v[3], st: v[4], sp: v[7] || 0 };
    if (!p.net) { p.x = n.x; p.y = n.y; p.z = n.z; }
    p.net = n;
    p.alive = !!(n.st & 1); p.dashing = !!(n.st & 2); p.finished = !!(n.st & 8); p.throwT = n.st & 16 ? 0.3 : 0; p.sp = n.sp;
    p.score = v[5]; p.mask = v[6]; p.dieT = v[6]; p.finT = v[6];
  }
  netSend() {
    const r = this.net?.room, p = this.me;
    if (!r || !p) return;
    const f = (x) => Math.round(x * 100) / 100;
    const st = (p.alive ? 1 : 0) | (p.dashing ? 2 : 0) | (p.ground ? 0 : 4) | (p.finished ? 8 : 0) | (p.throwT > 0 ? 16 : 0);
    r.sendPos([f(p.x), f(p.y), f(p.z), f(p.yaw), st, p.score || 0, this.rd ? f(this.rd.aux()) : 0, f(p.sp || 0)]);
  }
  bcast(e) { if (this.net) this.net.room.sendEv(e); this.applyEv(e, true); }
  applyEv(e, own) {
    if (!e) return;
    if (e.t === 'rd') this.beginRound(e.r);
    else if (e.t === 'end') { if (this.phase === 'play') { this.phase = 'ending'; this.phaseT = ENDWAIT; } }
    else if (e.t === 'res') { this.showResult(e); }
    else if (e.t === 'fin') { this.finalRes = e; this.phase = 'final'; S.done(); this.cb.onFinal?.(this.finalSummary()); }
    void own;
  }

  // ---------- turlar ----------
  clearRound() {
    this.group.traverse((n) => { n.geometry?.dispose?.(); });
    this.scene.remove(this.group);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.rd?.dispose?.();
    this.rd = null;
  }
  beginRound(r) {
    this.clearRound();
    this.round = r;
    for (const p of this.players) { p.alive = true; p.finished = false; p.score = 0; p.mask = 0; p.dieT = 0; p.finT = 0; p.net = null; p.dashing = false; p.g.visible = !p.gone; p.hitCd = 0; p.throwT = 0; }
    this.rd = PLAN[r](this);
    this.rd.build();
    this.nextSent = false; this.phase = 'intro'; this.phaseT = INTRO; this.t = 0; this.ended = false; this.res = null;
    this.input.dash = this.input.jump = false;
    this.camPos.set(0, 20, 20);
    this.snapCam();
    S.beep(false);
  }
  showResult(e) {
    this.res = e;
    for (const p of this.players) { p.total = (e.tot && e.tot[p.uid]) ?? p.total; }
    this.phase = 'result'; this.phaseT = RESULT;
    this.cb.onResult?.(this.resultSummary());
  }
  computePoints() {
    const rd = this.rd, ps = this.players.filter((p) => !p.gone);
    const key = (p) => rd.rank(p);
    const sorted = [...ps].sort((a, b) => key(b) - key(a));
    const pts = {}, n = ps.length, mult = this.round === PLAN.length - 1 ? 2 : 1;
    let place = 0;
    sorted.forEach((p, i) => { if (i === 0 || key(p) !== key(sorted[i - 1])) place = i; pts[p.uid] = (n - place) * mult; });
    const tot = {};
    for (const p of this.players) tot[p.uid] = (p.total || 0) + (pts[p.uid] || 0);
    return { pts, tot, order: sorted.map((p) => p.uid) };
  }
  rowsFor(e) {
    const mk = (p) => ({ name: p.name, me: p === this.me, color: p.color, team: p.team, pts: e.pts?.[p.uid] ?? 0, total: e.tot?.[p.uid] ?? p.total });
    const order = e.order && e.order.length ? e.order : this.players.map((p) => p.uid);
    return order.map((u) => this.players.find((p) => p.uid === u)).filter(Boolean).map(mk);
  }
  teamTotals(e) {
    if (!this.teamMode) return null;
    const t = [0, 0];
    for (const p of this.players) if (p.team >= 0) t[p.team] += e.tot?.[p.uid] ?? p.total ?? 0;
    return t;
  }
  resultSummary() {
    const e = this.res;
    return { round: this.round, rounds: PLAN.length, title: this.rd.title, rows: this.rowsFor(e), teams: this.teamTotals(e), last: this.round === PLAN.length - 1 };
  }
  finalSummary() {
    const e = this.finalRes;
    const tot = e.tot, rows = [...this.players].filter((p) => !p.gone).map((p) => ({ name: p.name, me: p === this.me, color: p.color, team: p.team, total: tot[p.uid] || 0 })).sort((a, b) => b.total - a.total);
    let teams = null, winner;
    if (this.teamMode) { teams = [0, 0]; for (const p of this.players) if (p.team >= 0) teams[p.team] += tot[p.uid] || 0; winner = teams[0] === teams[1] ? 'Berabere' : teams[0] > teams[1] ? 'Kırmızı takım' : 'Mavi takım'; }
    else winner = rows[0]?.name;
    const mine = this.teamMode ? (teams[0] === teams[1] ? false : (teams[0] > teams[1] ? 0 : 1) === this.me.team) : rows[0]?.me;
    return { rows, teams, winner, mine, solo: !this.online };
  }

  // ---------- döngü ----------
  step(dt) {
    this.t += dt;
    const ph = this.phase;
    if (ph === 'menu' || !this.me) return;
    for (const p of this.players) if (p.remote && p.net && !p.gone) this.stepRemote(p, dt);
    if (ph === 'wait' && this.host) { this.hostT -= dt; if (this.hostT <= 0) this.bcast({ t: 'rd', r: 0 }); }
    else if (ph === 'intro') { this.phaseT -= dt; this.rd.update(dt); if (this.phaseT <= 0) { this.phase = 'count'; this.phaseT = COUNT; this.lastBeep = 4; } }
    else if (ph === 'count') { this.phaseT -= dt; this.rd.update(dt); const n = Math.ceil(this.phaseT - 0.4); if (n !== this.lastBeep && n >= 1) { this.lastBeep = n; S.beep(false); } if (this.phaseT <= 0.4) { this.phase = 'play'; this.t = 0; this.pt = 0; S.beep(true); } }
    else if (ph === 'play') {
      this.pt += dt; this.t = this.pt;
      this.rd.update(dt);
      if (this.host && !this.ended && this.pt > 3 && this.rd.over()) { this.ended = true; this.bcast({ t: 'end', r: this.round }); }
    } else if (ph === 'ending') {
      this.rd.update(dt);
      this.phaseT -= dt;
      if (this.phaseT <= 0 && this.host && !this.res) { const c = this.computePoints(); this.res = c; this.bcast({ t: 'res', r: this.round, pts: c.pts, tot: c.tot, order: c.order }); }
    } else if (ph === 'result') {
      this.phaseT -= dt;
      if (this.phaseT <= 0 && this.host && !this.nextSent) {
        this.nextSent = true;
        if (this.round >= PLAN.length - 1) this.bcast({ t: 'fin', tot: this.res.tot });
        else this.bcast({ t: 'rd', r: this.round + 1 });
        
      }
    }
    if (this.toastT > 0) this.toastT -= dt;
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.life -= dt; f.vy -= 14 * dt; f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt; if (f.life <= 0) { this.scene.remove(f.m); this.fx.splice(i, 1); } }
    if (this.net && ph !== 'result' && ph !== 'final') { this.netT += dt; if (this.netT >= 0.08) { this.netT = 0; this.netSend(); } }
  }
  stepRemote(p, dt) {
    const n = p.net, k = Math.min(1, dt * 11);
    p.x += (n.x - p.x) * k; p.y += (n.y - p.y) * k; p.z += (n.z - p.z) * k;
    p.yaw += angDiff(p.yaw, n.yaw) * k;
    p.anim += dt * n.sp * 1.2;
    if (this.rd?.remoteView) this.rd.remoteView(p);
  }
  splash(x, z) {
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), new THREE.MeshBasicMaterial({ color: 0xbfe8ff }));
      m.position.set(x, -3, z); this.scene.add(m);
      const a = Math.random() * TAU, s = 2 + Math.random() * 4;
      this.fx.push({ m, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: 6 + Math.random() * 6, life: 1 });
    }
    S.fall();
  }
  snapCam() { this.updateCam(1, true); }
  updateCam(dt, snap) {
    const c = this.rd?.cam, p = this.me;
    if (!c || !p) { this.cam.position.set(0, 24, 22); this.cam.lookAt(0, 0, 0); return; }
    let tx, ty, tz, lx, ly, lz;
    if (c.lane) { tx = p.lx ?? p.x; ty = 5.4; tz = 7.5; lx = p.lx ?? p.x; ly = 2.2; lz = -12; }
    else if (c.follow) { tx = p.x * 0.7; ty = p.y + 6.5; tz = p.z + 11; lx = p.x * 0.7; ly = p.y + 1; lz = p.z - 8; }
    else { tx = 0; ty = c.y; tz = c.z; lx = c.look[0]; ly = c.look[1]; lz = c.look[2]; }
    const k = snap ? 1 : Math.min(1, dt * 6);
    this.camPos.x += (tx - this.camPos.x) * k; this.camPos.y += (ty - this.camPos.y) * k; this.camPos.z += (tz - this.camPos.z) * k;
    this.cam.position.copy(this.camPos);
    this.cam.lookAt(lx, ly, lz);
  }
  syncMeshes() {
    for (const p of this.players) {
      if (p.gone) continue;
      const u = p.g.userData;
      p.g.visible = p.alive || p.y > -3.5;
      if (p.id === 'x') continue;
      p.g.position.set(p.x, p.y, p.z);
      p.g.rotation.set(0, p.yaw, 0);
      const moving = (p.sp || 0) > 0.8;
      const sw = Math.sin(p.anim) * (moving ? 0.9 : 0.04);
      if (p.throwT > 0) { p.throwT -= 1 / 60; u.armL.rotation.x = u.armR.rotation.x = -2.6; u.legL.rotation.x = u.legR.rotation.x = 0; }
      else if (p.dashing) { u.armL.rotation.x = u.armR.rotation.x = -1.4; u.legL.rotation.x = 0.9; u.legR.rotation.x = -0.9; p.g.rotation.x = 0.4; }
      else if (!p.ground && !p.remote) { u.armL.rotation.x = u.armR.rotation.x = -1.2; u.legL.rotation.x = -0.5; u.legR.rotation.x = 0.4; }
      else { u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.armL.rotation.x = -sw * 0.8; u.armR.rotation.x = sw * 0.8; }
      p.tag.visible = p.remote || this.players.length > 1;
      if (!p.remote && !(this.rd?.cam?.lane)) p.anim += (p.sp || 0) * 0.02;
    }
  }
  hud() {
    const rd = this.rd, ph = this.phase;
    const timeLeft = ph === 'play' ? Math.max(0, Math.ceil((rd.dur || 0) - this.pt)) : 0;
    const act = rd?.id === 'obstacle' ? 'ZIPLA' : rd?.id === 'sumo' ? 'ATIL' : '';
    return { phase: ph, round: this.round, rounds: PLAN.length, title: rd?.title || '', rules: rd?.rules || '', intro: ph === 'intro', count: ph === 'count' ? Math.max(0, Math.ceil(this.phaseT - 0.4)) : -1, go: ph === 'play' && this.pt < 1, timeLeft, text: ph === 'play' || ph === 'ending' ? rd.hud() : '', lane: !!rd?.cam?.lane, act, toast: this.toastT > 0 ? this.toastText : '', ending: ph === 'ending', alive: this.me.alive, online: !!this.net, double: this.round === PLAN.length - 1 };
  }
  loop() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now; this.acc += dt;
    let n = 0;
    while (this.acc >= 1 / 60 && n < 6) { this.step(1 / 60); this.acc -= 1 / 60; n++; }
    if (n === 6) this.acc = 0;
    this.updateCam(dt);
    this.syncMeshes();
    this.renderer.render(this.scene, this.cam);
    this.hudT += dt;
    if (this.hudT > 0.08 && this.me && this.phase !== 'menu') { this.hudT = 0; this.cb.onHud?.(this.hud()); }
    this.raf = requestAnimationFrame(() => this.loop());
  }
  advance(n, dt = 1 / 60) { for (let i = 0; i < n; i++) this.step(dt); this.updateCam(dt * n); this.syncMeshes(); }
  setMove(x, y) { this.input.mx = clamp(x, -1, 1); this.input.my = clamp(y, -1, 1); }
  act() { this.input.dash = true; this.input.jump = true; setTimeout(() => { this.input.dash = false; this.input.jump = false; }, 180); }
  flick(dx, dy) { if (this.phase === 'play') this.rd?.flick(dx, dy); }
}
