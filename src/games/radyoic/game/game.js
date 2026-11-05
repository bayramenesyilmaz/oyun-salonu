// Radyonun İçinde — 1. bölüm motoru: iki kişilik, iple bağlı iş birliği platformu.
// Online'da her istemci kendi karakterini simüle eder; dünya olayları (kol, ip, çan, horoz) olay olarak gider.
import { CHARACTERS } from '../../../characters/roster.js';
import { drawFighter, drawSwoosh } from '../../../characters/rig.js';
import * as L from './level.js';

const PW = 14;
const PH = 50;
const SPD = 200;
const JV = 560;
const GR = 1500;
const COLS = { arda: '#4aa3d8', elif: '#ee86b4', radyo: '#ffd166' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;

let AC = null;
function beep(f, d = 0.1, type = 'square', v = 0.04, f2 = 0) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = type;
    o.frequency.value = f;
    if (f2) o.frequency.linearRampToValueAtTime(f2, AC.currentTime + d);
    g.gain.value = v;
    g.gain.linearRampToValueAtTime(0.0001, AC.currentTime + d);
    o.connect(g).connect(AC.destination);
    o.start();
    o.stop(AC.currentTime + d);
  } catch {}
}

const mkP = (id, x) => ({ id, x, y: 0, vx: 0, vy: 0, face: 1, g: false, coy: 0, jb: 0, st: 'idle', sw: 0, swHit: false, cd: 0, tx: x, ty: 0, pa: false, pj: false, maxx: x, bot: false, flap: 0 });

export class Game {
  constructor(cv, o) {
    this.cv = cv;
    this.c = cv.getContext('2d');
    this.o = o;
    this.mode = o.mode || 'solo';
    this.net = o.net || null;
    this.slot = this.mode === 'online' ? o.slot : o.role === 'elif' ? 1 : 0;
    this.cb = o.cb || {};
    this.P = [mkP('arda', 60), mkP('elif', 20)];
    this.P.forEach((p) => (p.y = this.groundAt(p.x) - 0.1));
    if (this.mode === 'solo') this.P[1 - this.slot].bot = true;
    this.arrows = [];
    this.latched = false;
    this.ropeCut = 0;
    this.bellHit = false;
    this.stepsT = 0;
    this.chase = { on: false, delay: 0, x: L.CHASE.rx, done: false, caught: 0 };
    this.quiet = false;
    this.fin = false;
    this.time = 0;
    this.dlg = null;
    this.phase = 'intro';
    this.selfReady = false;
    this.peerReady = this.mode !== 'online';
    this.keys = {};
    this.flyT = [];
    this.hint = '';
    this.msg = '';
    this.camX = 0;
    this.dead = false;
    this.sendT = 0;
    this.lastPeerAt = performance.now();
    this.chickens = [{ x: 600, y: 360, d: 1, t: 0 }, { x: 1450, y: 360, d: -1, t: 0 }, { x: 3600, y: 220, d: 1, t: 0 }, { x: 2800, y: 330, d: -1, t: 0 }];
    this.botBell = this.findBellSpot();
    this._kd = (e) => this.onKey(e, true);
    this._ku = (e) => this.onKey(e, false);
    this._rs = () => this.resize();
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    window.addEventListener('resize', this._rs);
    this.resize();
    this.startDlg(L.INTRO, () => {
      this.selfReady = true;
      if (this.mode === 'online') this.net.sendEvent({ k: 'ready' });
      this.phase = this.peerReady ? 'play' : 'wait';
      this.emit();
    });
    if (this.mode === 'online' && this.net) {
      this.net.onState = (s) => this.onNetState(s);
      this.net.onEvent = (e) => this.onNetEvent(e);
      this.net.onLeave = () => this.peerLeft();
      this.net.sendState({ r: 1, x: 60, y: 0 });
    }
    this.emit();
    if (!o.manual) this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  get me() {
    return this.P[this.slot];
  }
  get pal() {
    return this.P[1 - this.slot];
  }
  isLocal(p) {
    return this.mode === 'online' ? p === this.me : true;
  }
  emit() {
    this.cb.onPhase?.({ phase: this.phase, msg: this.msg });
  }
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    window.removeEventListener('resize', this._rs);
    try {
      this.net?.close?.();
    } catch {}
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round((this.cv.clientWidth || 800) * dpr);
    this.cv.height = Math.round((this.cv.clientHeight || 450) * dpr);
    this.sc = this.cv.height / 450;
    this.vw = this.cv.width / this.sc;
  }
  onKey(e, down) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const map = { a: 'l', ArrowLeft: 'l', d: 'r', ArrowRight: 'r', w: 'up', ArrowUp: 'up', ' ': 'j', e: 'act', Enter: 'act', f: 'act' };
    if (k === 'Escape' && down) return this.cb.onPause?.();
    const a = map[k];
    if (!a) return;
    e.preventDefault();
    this.keys[a] = down ? 1 : 0;
    if (a === 'up') this.keys.j = this.keys.j || (down ? 0 : 0);
  }
  touch(a, down) {
    this.keys[a] = down ? 1 : 0;
  }
  tap() {
    if (this.dlg) this.nextDlg();
  }

  // ——— diyalog ———
  startDlg(lines, after) {
    this.dlg = { lines, i: 0, t: 0, after };
  }
  nextDlg() {
    const d = this.dlg;
    if (!d) return;
    const full = d.lines[d.i].t.length;
    if (d.t * 40 < full) {
      d.t = full / 40 + 1;
      return;
    }
    d.i++;
    d.t = 0;
    beep(520, 0.05, 'triangle', 0.03);
    if (d.i >= d.lines.length) {
      this.dlg = null;
      d.after?.();
    }
  }

  // ——— dünya ———
  rects() {
    const R = L.SOLID.slice();
    if (!this.latched && !this.plateOn) R.push({ x: L.DOOR.x, y: L.DOOR.y, w: L.DOOR.w, h: L.DOOR.h });
    if (this.ropeCut > 0.6) R.push(L.BRIDGE);
    if (this.stepsT > 0.5) R.push(...L.STEPS);
    return R;
  }
  groundAt(x, from = -999) {
    let best = 9999;
    for (const r of L.SOLID) if (x >= r.x && x <= r.x + r.w && r.y > from && r.y < best) best = r.y;
    return best === 9999 ? 360 : best;
  }
  solidAt(x, y) {
    for (const r of this.rects()) if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true;
    return false;
  }
  computePlate() {
    return this.P.some((p) => p.g && Math.abs(p.x - L.PLATE.x) < L.PLATE.w / 2 && p.y > 350 && p.y < 366);
  }
  findBellSpot() {
    let best = { x: 2780, e: 1e9 };
    for (let x = 2560; x <= 2960; x += 4) {
      let ax = x + 18;
      let ay = 330 - 34;
      let vx = 700 * Math.cos(-0.75);
      let vy = 700 * Math.sin(-0.75);
      let e = 1e9;
      for (let t = 0; t < 2.5; t += 1 / 120) {
        vy += 600 / 120;
        ax += vx / 120;
        ay += vy / 120;
        e = Math.min(e, Math.hypot(ax - L.BELL.x, ay - L.BELL.y));
        if (ay > 400) break;
      }
      if (e < best.e) best = { x, e };
    }
    return best.x;
  }

  // ——— ağ ———
  onNetState(s) {
    if (!s) return this.peerLeft();
    this.lastPeerAt = performance.now();
    const p = this.pal;
    if (s.f == null) return;
    p.tx = s.x;
    p.ty = s.y;
    p.face = s.f;
    p.g = !!s.g;
    p.st = s.st || 'idle';
    p.sw = s.sw || 0;
    p.maxx = Math.max(p.maxx, s.x);
  }
  onNetEvent(e) {
    if (!e) return;
    switch (e.k) {
      case 'ready':
        this.peerReady = true;
        if (this.selfReady && this.phase === 'wait') {
          this.phase = 'play';
          this.emit();
        }
        break;
      case 'lv':
        this.latched = true;
        beep(300, 0.2, 'triangle', 0.05, 500);
        break;
      case 'cut':
        if (!this.ropeCut) this.ropeCut = 0.001;
        break;
      case 'tg':
        this.bellHit = true;
        break;
      case 'arrow':
        this.arrows.push({ x: e.x, y: e.y, vx: e.vx, vy: e.vy, life: 2, own: false });
        break;
      case 'chase':
        if (!this.chase.on && !this.chase.done) this.chase.delay = Math.max(this.chase.delay, 0.001);
        break;
      case 'caught':
        if (this.mode === 'online' && this.slot === 0) this.resetChase();
        break;
      case 'rs':
        this.resetChase(true);
        break;
      case 'fin':
        this.finish();
        break;
    }
  }
  sendNet(dt) {
    if (this.mode !== 'online' || !this.net) return;
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 0.066;
    const p = this.me;
    this.net.sendState({ r: 1, x: r1(p.x), y: r1(p.y), f: p.face, g: p.g ? 1 : 0, st: p.st, sw: Math.round(p.sw * 100) / 100 });
  }
  peerLeft() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.msg = 'Arkadaşın bağlantıyı kaybetti';
    this.emit();
  }

  // ——— döngü ———
  loop(t) {
    if (this.dead) return;
    const dt = Math.min(0.05, (t - (this._last || t)) / 1000);
    this._last = t;
    this.tick(dt);
    this.draw();
    this._raf = requestAnimationFrame((tt) => this.loop(tt));
  }
  stepFrames(n, dt = 1 / 60) {
    for (let i = 0; i < n; i++) this.tick(dt);
    this.draw();
  }
  tick(dt) {
    this.time += dt;
    if (this.mode === 'online' && this.phase !== 'done' && this.selfReady && performance.now() - this.lastPeerAt > 9000) this.peerLeft();
    if (this.dlg) this.dlg.t += dt;
    this.plateOn = this.computePlate();
    const play = this.phase === 'play' && !this.dlg;
    // dünya animasyonları
    if (this.ropeCut > 0 && this.ropeCut < 1) this.ropeCut = Math.min(1, this.ropeCut + dt / 0.8);
    if (this.bellHit && this.stepsT < 1) this.stepsT = Math.min(1, this.stepsT + dt / 0.7);
    if (this.phase === 'play' || this.phase === 'wait') this.updateChase(dt);
    for (const p of this.P) {
      p.cd = Math.max(0, p.cd - dt);
      p.flap = Math.max(0, p.flap - dt);
      if (this.isLocal(p)) {
        let inp;
        if (p.bot) inp = this.botThink(p, dt);
        else inp = this.keys;
        this.stepPlayer(p, play ? inp : { l: 0, r: 0, j: 0, act: 0, up: 0 }, dt, play);
      } else {
        p.x += (p.tx - p.x) * Math.min(1, dt * 14);
        p.y += (p.ty - p.y) * Math.min(1, dt * 14);
        if (p.sw > 0) p.sw -= dt;
      }
    }
    this.updateArrows(dt);
    this.updateMisc(dt, play);
    this.sendNet(dt);
    // kamera
    const mx = (this.P[0].x + this.P[1].x) / 2;
    const tx = clamp(mx - this.vw / 2, -120, L.LEVEL_W - this.vw);
    this.camX += (tx - this.camX) * Math.min(1, dt * 5);
  }

  stepPlayer(p, i, dt, play) {
    // yatay
    const dir = (i.r ? 1 : 0) - (i.l ? 1 : 0);
    const swing = p.sw > 0;
    const sp = SPD * (swing ? 0.3 : 1);
    p.vx += (dir * sp - p.vx) * Math.min(1, dt * (p.g ? 14 : 6));
    if (dir && !swing) p.face = dir;
    // zıplama
    const jp = i.j && !p.pj;
    p.pj = !!i.j;
    if (jp) p.jb = 0.12;
    p.jb = Math.max(0, p.jb - dt);
    p.coy = p.g ? 0.1 : Math.max(0, p.coy - dt);
    if (p.jb > 0 && p.coy > 0 && play) {
      p.vy = -JV;
      p.jb = 0;
      p.coy = 0;
      p.g = false;
    }
    if (!i.j && p.vy < -200 && !p.g) p.vy += 2200 * dt;
    p.vy = Math.min(900, p.vy + GR * dt);
    // ip çekişi
    const q = this.P[p === this.P[0] ? 1 : 0];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > L.TETHER) {
      const a = (d - L.TETHER) * 9;
      p.vx += (dx / d) * a * dt * 60 * 0.12;
      if (dy < -40) p.vy += (dy / d) * a * dt * 60 * 0.06;
    }
    this.moveBody(p, dt);
    // eylem
    const ap = i.act && !p.pa;
    p.pa = !!i.act;
    if (ap && play) this.act(p, i);
    if (p.sw > 0) {
      const b = p.sw;
      p.sw -= dt;
      if (b > 0.2 && p.sw <= 0.2 && !p.swHit) {
        p.swHit = true;
        this.swordHit(p);
      }
    }
    p.st = p.sw > 0 ? 'atk' : !p.g ? 'jump' : Math.abs(p.vx) > 20 ? 'walk' : 'idle';
    p.maxx = Math.max(p.maxx, p.x);
    // düşme
    if (p.y > L.FLOOR_FALL) this.respawn(p);
    if (p.x < -200) p.x = -200;
  }
  moveBody(p, dt) {
    const R = this.rects();
    p.x += p.vx * dt;
    for (const r of R) {
      if (p.x + PW > r.x && p.x - PW < r.x + r.w && p.y > r.y + 0.01 && p.y - PH < r.y + r.h) {
        if (p.vx > 0 || p.x < r.x + r.w / 2) p.x = r.x - PW;
        else p.x = r.x + r.w + PW;
        p.vx = 0;
      }
    }
    p.y += p.vy * dt;
    p.g = false;
    for (const r of R) {
      if (p.x + PW > r.x && p.x - PW < r.x + r.w && p.y > r.y && p.y - PH < r.y + r.h) {
        if (p.vy >= 0 && p.y - p.vy * dt <= r.y + 8) {
          p.y = r.y;
          p.vy = 0;
          p.g = true;
        } else if (p.vy < 0) {
          p.y = r.y + r.h + PH;
          p.vy = 0;
        }
      }
    }
  }
  respawn(p) {
    const q = this.P[p === this.P[0] ? 1 : 0];
    if (q.g && q.y < 400) {
      p.x = q.x - q.face * 36;
      p.y = q.y;
    } else {
      let cp = L.CHECKPOINTS[0];
      for (const c of L.CHECKPOINTS) if (c <= Math.max(p.maxx, q.x)) cp = c;
      p.x = cp;
      p.y = this.groundAt(cp) - 0.1;
    }
    p.vx = p.vy = 0;
    p.flap = 0.6;
    beep(250, 0.2, 'triangle', 0.04, 500);
  }
  act(p, i) {
    // kol ve radyo
    if (Math.abs(p.x - L.LEVER.x) < 55 && p.g && !this.latched) {
      this.latched = true;
      if (this.net) this.net.sendEvent({ k: 'lv' });
      beep(300, 0.2, 'triangle', 0.05, 500);
      return;
    }
    if (p.id === 'arda' && p.cd <= 0) {
      p.sw = 0.36;
      p.swHit = false;
      p.cd = 0.45;
      beep(320, 0.1, 'sawtooth', 0.04, 160);
    } else if (p.id === 'elif' && p.cd <= 0) {
      p.cd = 0.5;
      const ang = i.up ? -0.75 : 0;
      const vx = Math.cos(ang) * 700 * p.face;
      const vy = Math.sin(ang) * 700;
      const a = { x: p.x + p.face * 18, y: p.y - 34, vx, vy, life: 2, own: true };
      this.arrows.push(a);
      if (this.net) this.net.sendEvent({ k: 'arrow', x: r1(a.x), y: r1(a.y), vx: r1(vx), vy: r1(vy) });
      p.sw = 0.3;
      p.swHit = true;
      beep(700, 0.08, 'triangle', 0.04, 400);
    }
  }
  swordHit(p) {
    if (!this.ropeCut && Math.abs(p.x - L.ROPE.x) < 95 && p.y > 300 && p.y < 366) {
      this.ropeCut = 0.001;
      if (this.net) this.net.sendEvent({ k: 'cut' });
      beep(200, 0.3, 'sawtooth', 0.05, 90);
    }
  }
  updateArrows(dt) {
    for (const a of this.arrows) {
      a.life -= dt;
      a.vy += 600 * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.own && !this.bellHit && Math.hypot(a.x - L.BELL.x, a.y - L.BELL.y) < 30) {
        this.bellHit = true;
        a.life = 0;
        if (this.net) this.net.sendEvent({ k: 'tg' });
        beep(880, 0.5, 'triangle', 0.06, 880);
      }
      if (this.solidAt(a.x, a.y)) a.life = 0;
    }
    this.arrows = this.arrows.filter((a) => a.life > 0);
  }
  updateChase(dt) {
    const c = this.chase;
    const [a, b] = this.P;
    if (!c.on && !c.done && c.delay === 0 && a.x > L.CHASE.trigger && b.x > L.CHASE.trigger && this.phase === 'play') {
      c.delay = 0.001;
      if (this.net) this.net.sendEvent({ k: 'chase' });
    }
    if (c.delay > 0 && !c.on) {
      c.delay += dt;
      if (c.delay > 2) {
        c.on = true;
        c.delay = 0;
        beep(180, 0.5, 'sawtooth', 0.06, 120);
      }
    }
    if (c.on && !this.fin) {
      c.x += L.CHASE.speed * dt;
      for (const p of this.P) {
        if (!this.isLocal(p) || c.caught > 0) continue;
        if (c.x + 50 > p.x - PW && p.x < L.FINISH + 200) {
          c.caught = 1;
          if (this.mode === 'online') {
            if (this.slot === 0) this.resetChase();
            else this.net.sendEvent({ k: 'caught' });
          } else this.resetChase();
        }
      }
    }
    if (c.caught > 0) c.caught += dt;
  }
  resetChase(fromNet) {
    if (this.mode === 'online' && this.slot === 0 && !fromNet) this.net.sendEvent({ k: 'rs' });
    const c = this.chase;
    c.on = false;
    c.delay = 0.001;
    c.x = L.CHASE.rx;
    c.caught = 0;
    this.msg = '';
    this.shake = 0;
    for (const p of this.P) {
      if (!this.isLocal(p) && this.mode === 'online') continue;
      const k = p.id === 'arda' ? 0 : 1;
      p.x = 4400 + k * 36;
      p.y = this.groundAt(p.x) - 0.1;
      p.vx = p.vy = 0;
      p.flap = 0.8;
    }
    this.hintText = 'Horoz çıldırdı! Tekrar koşun!';
    this.hintT = 2;
    beep(150, 0.4, 'sawtooth', 0.06, 90);
  }
  finish() {
    if (this.fin) return;
    this.fin = true;
    this.chase.on = false;
    this.startDlg(L.OUTRO, () => {
      this.phase = 'done';
      this.msg = 'Bölüm 1 tamam';
      this.emit();
    });
    beep(660, 0.4, 'triangle', 0.06, 990);
  }
  updateMisc(dt, play) {
    const [a, b] = this.P;
    // ipuçları
    const mx = Math.min(a.x, b.x);
    let h = '';
    for (const hn of L.HINTS) {
      if (hn.id === 'plate' && this.latched) continue;
      if (hn.id === 'rope' && this.ropeCut) continue;
      if (hn.id === 'bell' && this.bellHit) continue;
      if (hn.id === 'quiet' && this.quiet) continue;
      if (mx > hn.x0 && mx < hn.x1) h = hn.t;
    }
    if (this.hintT > 0) {
      this.hintT -= dt;
      h = this.hintText;
    }
    this.hint = h;
    // sessiz köşe
    if (play && !this.quiet && Math.abs(a.x - L.RADIO.x) < 130 && Math.abs(b.x - L.RADIO.x) < 130 && a.g && b.g) {
      this.quiet = true;
      this.startDlg(L.QUIET, null);
    }
    // bitiş
    if (play && !this.fin && a.x > L.FINISH && b.x > L.FINISH) {
      if (this.mode === 'online') {
        if (this.slot === 0) {
          this.net.sendEvent({ k: 'fin' });
          this.finish();
        }
      } else this.finish();
    }
    // tavuklar
    for (const ch of this.chickens) {
      ch.t += dt;
      if (Math.sin(ch.t * 0.7 + ch.x) > 0.2) ch.x += ch.d * 24 * dt;
      else if (Math.random() < 0.01) ch.d *= -1;
      for (const p of this.P) if (Math.abs(p.x - ch.x) < 24 && Math.abs(p.y - ch.y) < 30) ch.hop = 0.5;
      if (ch.hop > 0) ch.hop -= dt;
    }
  }

  // ——— bot ortak ———
  botThink(b, dt) {
    const h = this.P[b === this.P[0] ? 1 : 0];
    const i = { l: 0, r: 0, j: 0, act: 0, up: 0 };
    if (this.phase !== 'play' || this.dlg) return i;
    let tx = h.x - h.face * 60;
    let stay = false;
    const hx = h.x;
    // plaka bulmacası
    if (!this.latched && hx > 1380 && hx < 1850) {
      const humanOnPlate = Math.abs(h.x - L.PLATE.x) < L.PLATE.w / 2 && h.g;
      if (humanOnPlate) {
        tx = L.LEVER.x - 10;
        stay = true;
        if (Math.abs(b.x - L.LEVER.x) < 45 && b.g) i.act = 1;
      } else {
        tx = L.PLATE.x;
        stay = true;
      }
    } else if (b.id === 'arda' && !this.ropeCut && hx > 1850 && hx < 2100) {
      tx = L.ROPE.x - 45;
      if (Math.abs(b.x - L.ROPE.x) < 70 && b.p_c === undefined) i.act = this.time % 1 < 0.05 ? 1 : 0;
    } else if (b.id === 'elif' && !this.bellHit && hx > 2600 && hx < 3050) {
      tx = this.botBell;
      stay = true;
      if (Math.abs(b.x - this.botBell) < 8 && b.g) {
        i.up = 1;
        b.face = 1;
        i.act = this.time % 1 < 0.05 ? 1 : 0;
      }
    } else if (this.chase.on || (hx > L.CHASE.trigger && !this.chase.done)) {
      tx = h.x + 80;
    }
    const dx = tx - b.x;
    const tol = stay ? 6 : 50;
    if (Math.abs(dx) > tol) {
      if (dx > 0) i.r = 1;
      else i.l = 1;
    }
    // zıplama sezgileri
    const f = dx > 0 ? 1 : -1;
    if (i.r || i.l) {
      const wall = this.solidAt(b.x + f * (PW + 10), b.y - 12);
      const hole = b.g && !this.solidAt(b.x + f * 44, b.y + 6) && !this.solidAt(b.x + f * 24, b.y + 6);
      const above = h.y < b.y - 40 && Math.abs(h.x - b.x) < 110;
      if (b.g && (wall || hole || above)) i.j = 1;
    }
    if (!b.g && b.vy < 0) i.j = 1;
    return i;
  }

  // ——— çizim ———
  draw() {
    const c = this.c;
    const sc = this.sc;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#ffb27a';
    c.fillRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(sc, 0, 0, sc, 0, 0);
    this.drawSky(c);
    c.save();
    c.translate(-this.camX, 0);
    this.drawWorld(c);
    this.drawPlayers(c);
    c.restore();
    this.drawHud(c);
  }
  drawSky(c) {
    const vw = this.vw;
    const g = c.createLinearGradient(0, 0, 0, 450);
    g.addColorStop(0, '#6b5ea8');
    g.addColorStop(0.55, '#ff9f7a');
    g.addColorStop(1, '#ffd9a0');
    c.fillStyle = g;
    c.fillRect(0, 0, vw, 450);
    c.fillStyle = '#ffe9a8';
    c.beginPath();
    c.arc(vw * 0.78, 130, 48, 0, 7);
    c.fill();
    for (const [f, col, base] of [[0.12, '#a27bb0', 250], [0.3, '#7b5a97', 290]]) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(0, 450);
      for (let sx = 0; sx <= vw + 30; sx += 30) {
        const wx = sx + this.camX * f;
        const h = 24 + ((Math.floor(wx / 30) * 7919) % 5) * 12;
        c.lineTo(sx, base - h);
        c.lineTo(sx + 26, base - h);
      }
      c.lineTo(vw + 30, 450);
      c.fill();
    }
  }
  roof(c, r, col) {
    c.fillStyle = col;
    c.fillRect(r.x, r.y, r.w, Math.min(r.h, 520));
    c.fillStyle = 'rgba(0,0,0,.12)';
    for (let x = r.x; x < r.x + r.w; x += 28) c.fillRect(x, r.y + 10, 3, Math.min(r.h, 520));
    c.strokeStyle = '#141018';
    c.lineWidth = 4;
    c.strokeRect(r.x, r.y, r.w, Math.min(r.h, 520));
    c.fillStyle = 'rgba(255,255,255,.18)';
    c.fillRect(r.x + 2, r.y + 2, r.w - 4, 8);
  }
  drawWorld(c) {
    const x0 = this.camX - 60;
    const x1 = this.camX + this.vw + 60;
    const cols = ['#c4553a', '#b8482f', '#a2402c', '#d46a3d', '#9c3f2a'];
    L.SOLID.slice(0, 5).forEach((r, i) => {
      if (r.x + r.w < x0 || r.x > x1) return;
      this.roof(c, r, cols[i]);
    });
    // bacalar
    c.fillStyle = '#6b4a3a';
    c.strokeStyle = '#141018';
    c.lineWidth = 3;
    for (const x of [300, 820, 2700, 3300, 4600, 5400]) {
      const y = this.groundAt(x);
      c.fillRect(x, y - 58, 34, 58);
      c.strokeRect(x, y - 58, 34, 58);
      c.fillRect(x - 5, y - 66, 44, 10);
      c.strokeRect(x - 5, y - 66, 44, 10);
    }
    // çamaşır ipi
    c.strokeStyle = '#4b3826';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(380, 240);
    c.quadraticCurveTo(520, 275, 660, 240);
    c.stroke();
    for (const [x, col] of [[430, '#4aa3d8'], [500, '#ffd166'], [570, '#6cbf6a']]) {
      c.fillStyle = col;
      c.fillRect(x, 258, 26, 30);
    }
    // sandıklar
    for (const r of L.SOLID.slice(5)) {
      c.fillStyle = '#c98c5a';
      c.fillRect(r.x, r.y, r.w, r.h);
      c.strokeStyle = '#141018';
      c.lineWidth = 4;
      c.strokeRect(r.x, r.y, r.w, r.h);
      c.beginPath();
      c.moveTo(r.x, r.y);
      c.lineTo(r.x + r.w, r.y + r.h);
      c.moveTo(r.x + r.w, r.y);
      c.lineTo(r.x, r.y + r.h);
      c.stroke();
    }
    // plaka, kapı, kol
    const pl = L.PLATE;
    c.fillStyle = this.plateOn || this.latched ? '#4fe0a0' : '#ffd166';
    c.fillRect(pl.x - pl.w / 2, pl.y - (this.plateOn ? 2 : 6), pl.w, this.plateOn ? 2 : 6);
    c.strokeStyle = '#141018';
    c.lineWidth = 3;
    c.strokeRect(pl.x - pl.w / 2, pl.y - (this.plateOn ? 2 : 6), pl.w, this.plateOn ? 2 : 6);
    const open = this.plateOn || this.latched;
    const dh = open ? 28 : L.DOOR.h;
    c.fillStyle = '#7a5a3c';
    c.fillRect(L.DOOR.x, L.DOOR.y, L.DOOR.w, dh);
    c.strokeRect(L.DOOR.x, L.DOOR.y, L.DOOR.w, dh);
    c.fillStyle = '#ffd166';
    c.fillRect(L.DOOR.x + 8, L.DOOR.y + 4, 14, 8);
    c.strokeStyle = '#141018';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(L.LEVER.x, 360);
    c.lineTo(L.LEVER.x + (this.latched ? 22 : -22), 322);
    c.stroke();
    c.fillStyle = this.latched ? '#4fe0a0' : '#e0675a';
    c.beginPath();
    c.arc(L.LEVER.x + (this.latched ? 22 : -22), 322, 8, 0, 7);
    c.fill();
    // ip ve köprü
    c.strokeStyle = '#4b3826';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(L.ROPE.x - 30, 150);
    c.lineTo(L.ROPE.x + 20, 150);
    c.stroke();
    if (!this.ropeCut) {
      c.lineWidth = 3;
      c.strokeStyle = '#e8d9a8';
      c.beginPath();
      c.moveTo(L.ROPE.x, 150);
      c.lineTo(L.ROPE.x, L.ROPE.bottom);
      c.stroke();
      c.fillStyle = '#8a5a35';
      c.fillRect(L.ROPE.x - 14, L.ROPE.bottom - 12, 28, 24);
    }
    if (this.ropeCut) {
      const t = Math.min(1, this.ropeCut);
      c.save();
      c.translate(L.BRIDGE.x, L.BRIDGE.y + L.BRIDGE.h);
      c.rotate(-Math.PI / 2 * (1 - t * t));
      c.fillStyle = '#8a5a35';
      c.strokeStyle = '#141018';
      c.lineWidth = 4;
      c.fillRect(0, -L.BRIDGE.h, L.BRIDGE.w, L.BRIDGE.h);
      c.strokeRect(0, -L.BRIDGE.h, L.BRIDGE.w, L.BRIDGE.h);
      c.restore();
    }
    // çan
    c.strokeStyle = '#4b3826';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(L.BELL.x - 30, 100);
    c.lineTo(L.BELL.x + 30, 100);
    c.moveTo(L.BELL.x, 100);
    c.lineTo(L.BELL.x, L.BELL.y - 14);
    c.stroke();
    c.fillStyle = this.bellHit ? '#ffd166' : '#d9a441';
    c.beginPath();
    c.arc(L.BELL.x, L.BELL.y, 16 + (this.bellHit ? Math.sin(this.time * 30) * 2 : 0), Math.PI, 0);
    c.lineTo(L.BELL.x + 18, L.BELL.y + 6);
    c.lineTo(L.BELL.x - 18, L.BELL.y + 6);
    c.fill();
    c.strokeStyle = '#141018';
    c.lineWidth = 3;
    c.stroke();
    // basamaklar
    if (this.stepsT > 0) {
      const off = (1 - Math.min(1, this.stepsT)) * -140;
      for (const s of L.STEPS) {
        c.fillStyle = '#c98c5a';
        c.fillRect(s.x, s.y + off, s.w, s.h);
        c.strokeStyle = '#141018';
        c.lineWidth = 4;
        c.strokeRect(s.x, s.y + off, s.w, s.h);
      }
    }
    // radyo
    const rx = L.RADIO.x;
    const ry = L.RADIO.y;
    c.fillStyle = '#8a5a35';
    c.strokeStyle = '#141018';
    c.lineWidth = 4;
    c.fillRect(rx - 24, ry - 36, 48, 36);
    c.strokeRect(rx - 24, ry - 36, 48, 36);
    c.fillStyle = '#ffe9a8';
    c.beginPath();
    c.arc(rx - 8, ry - 18, 10, 0, 7);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(rx + 12, ry - 36);
    c.lineTo(rx + 28, ry - 62);
    c.stroke();
    if (!this.quiet) {
      c.strokeStyle = 'rgba(255,255,255,.6)';
      c.beginPath();
      c.arc(rx, ry - 20, 36 + ((this.time * 20) % 20), -2.4, -0.7);
      c.stroke();
    }
    // bitiş kulesi
    const fx = L.FINISH + 80;
    const fy = this.groundAt(fx);
    c.strokeStyle = '#141018';
    c.lineWidth = 5;
    c.fillStyle = '#b8a07a';
    c.beginPath();
    c.moveTo(fx - 36, fy);
    c.lineTo(fx, fy - 220);
    c.lineTo(fx + 36, fy);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#e0675a';
    c.beginPath();
    c.arc(fx, fy - 226, 10, 0, 7);
    c.fill();
    c.stroke();
    // tavuklar
    for (const ch of this.chickens) {
      const hop = ch.hop > 0 ? Math.abs(Math.sin(this.time * 24)) * 18 : 0;
      c.save();
      c.translate(ch.x, ch.y - hop);
      c.scale(ch.d, 1);
      c.fillStyle = '#fff';
      c.strokeStyle = '#141018';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(0, -12, 13, 10, 0, 0, 7);
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(12, -22, 6, 0, 7);
      c.fill();
      c.stroke();
      c.fillStyle = '#e0675a';
      c.fillRect(10, -30, 5, 4);
      c.fillStyle = '#ffb300';
      c.beginPath();
      c.moveTo(17, -22);
      c.lineTo(23, -20);
      c.lineTo(17, -18);
      c.fill();
      c.restore();
    }
    // horoz
    const ch = this.chase;
    if (ch.on || ch.delay > 0 || ch.caught > 0) this.drawRooster(c, ch.x, ch.x < 4200 ? 220 : ch.x < 4330 ? 330 : 330, ch.on);
    // oklar
    for (const a of this.arrows) {
      c.save();
      c.translate(a.x, a.y);
      c.rotate(Math.atan2(a.vy, a.vx));
      c.strokeStyle = '#141018';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(-14, 0);
      c.lineTo(14, 0);
      c.stroke();
      c.fillStyle = '#ffd166';
      c.beginPath();
      c.moveTo(14, -4);
      c.lineTo(22, 0);
      c.lineTo(14, 4);
      c.fill();
      c.restore();
    }
  }
  drawRooster(c, x, y, running) {
    const bob = running ? Math.sin(this.time * 20) * 5 : 0;
    c.save();
    c.translate(x, y + bob);
    c.strokeStyle = '#141018';
    c.lineWidth = 6;
    c.fillStyle = '#fff6e0';
    c.beginPath();
    c.ellipse(0, -70, 70, 56, 0, 0, 7);
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(62, -112, 34, 0, 7);
    c.fill();
    c.stroke();
    c.fillStyle = '#e0383a';
    c.beginPath();
    c.arc(54, -146, 12, 0, 7);
    c.arc(70, -148, 14, 0, 7);
    c.arc(84, -140, 10, 0, 7);
    c.fill();
    c.fillStyle = '#ffb300';
    c.beginPath();
    c.moveTo(92, -114);
    c.lineTo(126, -106);
    c.lineTo(92, -96);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#141018';
    c.beginPath();
    c.arc(72, -118, 5, 0, 7);
    c.fill();
    c.strokeStyle = '#ffb300';
    c.lineWidth = 8;
    const ph = Math.sin(this.time * 18) * 18;
    c.beginPath();
    c.moveTo(-10, -20);
    c.lineTo(-10 + ph, 0);
    c.moveTo(16, -20);
    c.lineTo(16 - ph, 0);
    c.stroke();
    c.fillStyle = '#e0675a';
    c.strokeStyle = '#141018';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(-64, -90);
    c.quadraticCurveTo(-110, -150, -86, -60);
    c.fill();
    c.stroke();
    c.restore();
  }
  drawPlayers(c) {
    const [a, b] = this.P;
    // ip
    const ax = a.x;
    const ay = a.y - 26;
    const bx = b.x;
    const by = b.y - 26;
    const d = Math.hypot(bx - ax, by - ay);
    const slack = Math.max(0, L.TETHER - d) / L.TETHER;
    c.strokeStyle = '#141018';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(ax, ay);
    c.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 60 * slack, bx, by);
    c.stroke();
    c.strokeStyle = d > L.TETHER ? '#ff6b5a' : '#e8d9a8';
    c.lineWidth = 3.5;
    c.stroke();
    for (const p of [b, a]) {
      const ch = CHARACTERS[p.id];
      let mv = null;
      let mvT = 0;
      let st = p.st === 'walk' ? 'walk' : 'idle';
      if (p.sw > 0) {
        mv = ch.moves.l1;
        const tot = p.id === 'arda' ? 0.36 : 0.3;
        mvT = (1 - p.sw / tot) * (mv.su + mv.ac + mv.rc);
        st = 'atk';
      }
      const f = { ch, st, mv, mvT, dT: 1, slot: p.id === 'arda' ? 0 : 1, face: p.face, x: p.x, y: p.g ? 0 : 1 };
      const sh = p.flap > 0 ? Math.sin(this.time * 40) * 3 : 0;
      drawFighter(c, f, this.time, { x: p.x + sh, y: p.y, scale: 0.5, face: p.face });
      if (st === 'atk' && p.id === 'arda') drawSwoosh(c, f, { x: p.x, y: p.y, scale: 0.5, face: p.face });
      if (p === this.me) {
        c.fillStyle = COLS[p.id];
        c.beginPath();
        c.moveTo(p.x, p.y - 66);
        c.lineTo(p.x - 6, p.y - 76);
        c.lineTo(p.x + 6, p.y - 76);
        c.fill();
      }
    }
  }
  drawHud(c) {
    const vw = this.vw;
    c.setTransform(this.sc, 0, 0, this.sc, 0, 0);
    // ilerleme
    const bx = 70;
    const bw = vw - 140;
    c.fillStyle = 'rgba(20,16,24,.55)';
    c.fillRect(bx - 8, 8, bw + 16, 14);
    for (const p of this.P) {
      c.fillStyle = COLS[p.id];
      c.beginPath();
      c.arc(bx + clamp(p.x / L.FINISH, 0, 1) * bw, 15, 6, 0, 7);
      c.fill();
    }
    c.fillStyle = '#fff';
    c.font = "14px 'Lilita One', sans-serif";
    c.textAlign = 'left';
    c.fillText('Köy kanalı', 12, 20);
    if (this.hint && !this.dlg && this.phase === 'play') {
      c.fillStyle = 'rgba(20,16,24,.65)';
      const w = Math.min(vw - 24, 520);
      c.fillRect(vw / 2 - w / 2, 34, w, 28);
      c.fillStyle = '#fff';
      c.font = '14px Onest, sans-serif';
      c.textAlign = 'center';
      c.fillText(this.hint, vw / 2, 53);
    }
    if (this.phase === 'wait') this.bubble(c, 'Arkadaşın hazırlanıyor…');
    if (this.chase.delay > 0 && !this.chase.on) this.bubble(c, 'HOROZ!', '#e0383a');
    if (this.dlg) {
      const d = this.dlg;
      const ln = d.lines[d.i];
      c.fillStyle = 'rgba(20,16,24,.82)';
      c.fillRect(14, 290, vw - 28, 150);
      c.strokeStyle = COLS[ln.w];
      c.lineWidth = 4;
      c.strokeRect(14, 290, vw - 28, 150);
      c.fillStyle = COLS[ln.w];
      c.font = "22px 'Lilita One', sans-serif";
      c.textAlign = 'left';
      c.fillText(L.NAMES[ln.w], 34, 322);
      c.fillStyle = '#fff';
      c.font = '18px Onest, sans-serif';
      const txt = ln.t.slice(0, Math.floor(d.t * 40));
      this.wrap(c, txt, 34, 352, vw - 70, 26);
      c.fillStyle = '#cfc6ea';
      c.font = '13px Onest, sans-serif';
      c.textAlign = 'right';
      c.fillText('Devam: Eylem / dokun', vw - 30, 428);
    }
  }
  bubble(c, t, col = '#ffd166') {
    c.fillStyle = 'rgba(20,16,24,.55)';
    c.fillRect(0, 150, this.vw, 80);
    c.fillStyle = col;
    c.font = "42px 'Lilita One', sans-serif";
    c.textAlign = 'center';
    c.fillText(t, this.vw / 2, 205);
  }
  wrap(c, text, x, y, w, lh) {
    const words = text.split(' ');
    let line = '';
    for (const wd of words) {
      const t = line ? line + ' ' + wd : wd;
      if (c.measureText(t).width > w && line) {
        c.fillText(line, x, y);
        y += lh;
        line = wd;
      } else line = t;
    }
    c.fillText(line, x, y);
  }
}
