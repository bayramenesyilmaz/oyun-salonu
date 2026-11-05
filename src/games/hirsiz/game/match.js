// Hırsız ve Bekçi motoru. Bot ya da online aynı kodla çalışır.
// Online modelde her istemci yalnız kendi karakterini simüle eder; yakalama / kaçış iddiaları kurucuya gider, tur sonunu kurucu bildirir.
import { CHARACTERS } from '../../../characters/roster.js';
import { drawFighter } from '../../../characters/rig.js';
import { W, H, FY, LAD, HIDE, TRE, CAMS, LAS, EXIT_X, ROUND_TIME, camAngle, camPos, laserOn, inCam, danger, route, ladderAt } from './map.js';
import { Bot } from './bot.js';

const WIN_ROUNDS = 2;
const CLIMB = 0.7;
const SCALE = 0.5;
const r1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let AC = null;
function beep(f, d = 0.12, type = 'square', v = 0.05, f2 = 0) {
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

const mkP = (slot, ch, nick) => ({
  slot, ch, nick, role: 't', x: 60, fl: 0, cl: null, face: 1, hidden: false, carry: false, st: 'idle', steal: 0, cd: 0, sw: 0, swHit: false, stun: 0,
  tx: 60, tfl: 0, tcl: null, pd: false, pu: false, pa: false, pxp: 0, inp: { l: 0, r: 0, u: 0, d: 0, run: 0, act: 0 }, bot: null,
});

export class Match {
  constructor(cv, o) {
    this.cv = cv;
    this.c = cv.getContext('2d');
    this.o = o;
    this.mode = o.mode || 'bot';
    this.net = o.net || null;
    this.slot = o.slot || 0;
    this.host = this.mode !== 'online' || !!o.host;
    this.cb = o.cb || {};
    this.muted = false;
    this.P = [mkP(0, o.chars[0], o.nicks?.[0]), mkP(1, o.chars[1], o.nicks?.[1])];
    if (this.mode === 'bot') {
      this.P[1].bot = new Bot(this, 1);
      if (o.p0bot) this.P[0].bot = new Bot(this, 0);
    }
    this.round = 1;
    this.wins = [0, 0];
    this.phase = this.mode === 'online' ? 'wait' : 'intro';
    this.phaseT = 0;
    this.rt = 0;
    this.time = 0;
    this.treasure = 0;
    this.stolen = false;
    this.alarmT = 0;
    this.alarmCd = 0;
    this.noise = null;
    this.alarmPos = null;
    this.banner = '';
    this.winner = -2;
    this.why = '';
    this.msg = '';
    this.rmSelf = false;
    this.rmPeer = false;
    this.lastPeerAt = performance.now();
    this.sendT = 0;
    this.dead = false;
    this.keys = {};
    this.stats = [0, 0];
    this._kd = (e) => this.onKey(e, true);
    this._ku = (e) => this.onKey(e, false);
    this._rs = () => this.resize();
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    window.addEventListener('resize', this._rs);
    this.resize();
    if (this.mode === 'online' && this.net) {
      this.net.onState = (s) => this.onNetState(s);
      this.net.onEvent = (e) => this.onNetEvent(e);
      this.net.onLeave = () => this.peerLeft();
      this.net.sendState({ r: 1, x: 60, y: 0, rd: 0 });
    } else this.startRound(1, Math.floor(Math.random() * TRE.length));
    this.emit();
    if (!o.manual) this._raf = requestAnimationFrame((t) => this.loop(t));
  }

  thiefSlot(rd = this.round) {
    return rd % 2 === 1 ? 0 : 1;
  }
  get T() {
    return this.P[this.thiefSlot()];
  }
  get G() {
    return this.P[1 - this.thiefSlot()];
  }
  isLocal(p) {
    return this.mode === 'online' ? p.slot === this.slot : true;
  }
  get meSlot() {
    return this.mode === 'online' ? this.slot : 0;
  }
  emit() {
    this.cb.onPhase?.({ phase: this.phase, round: this.round, wins: this.wins.slice(), winner: this.winner, msg: this.msg, why: this.why, role: this.P[this.meSlot].role });
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
    const w = this.cv.clientWidth || 800;
    const h = this.cv.clientHeight || 450;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.sc = Math.min(this.cv.width / W, this.cv.height / H);
    this.ox = (this.cv.width - W * this.sc) / 2;
    this.oy = (this.cv.height - H * this.sc) / 2;
  }

  // ——— giriş ———
  onKey(e, down) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const map = { a: 'l', ArrowLeft: 'l', d: 'r', ArrowRight: 'r', w: 'u', ArrowUp: 'u', s: 'd', ArrowDown: 'd', Shift: 'run', ' ': 'act', e: 'act', Enter: 'act' };
    if (k === 'Escape' && down) return this.cb.onPause?.();
    const a = map[k];
    if (!a) return;
    e.preventDefault();
    this.keys[a] = down ? 1 : 0;
  }
  touch(a, down) {
    this.keys[a] = down ? 1 : 0;
  }

  // ——— tur akışı ———
  startRound(rd, tre) {
    this.round = rd;
    this.treasure = tre;
    this.stolen = false;
    this.alarmT = 0;
    this.alarmCd = 0;
    this.noise = null;
    this.rt = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.winner = -2;
    const ts = this.thiefSlot(rd);
    this.P.forEach((p) => {
      const th = p.slot === ts;
      p.role = th ? 't' : 'g';
      p.x = th ? 64 : 420;
      p.fl = th ? 0 : 1;
      p.tx = p.x;
      p.tfl = p.fl;
      p.cl = null;
      p.tcl = null;
      p.hidden = false;
      p.carry = false;
      p.steal = 0;
      p.cd = 0;
      p.sw = 0;
      p.stun = 0;
      p.st = 'idle';
      p.face = th ? 1 : -1;
      p.bot?.reset?.();
    });
    this.banner = '';
    this.emit();
  }
  endRound(w, why) {
    if (this.phase !== 'play') return;
    this.applyEnd(w, why, null);
    if (this.mode === 'online') this.net.sendEvent({ k: 'rend', w, why, wn: this.wins.slice(), rd: this.round });
  }
  applyEnd(w, why, wn) {
    this.phase = 'rend';
    this.phaseT = 0;
    this.winner = w;
    this.why = why;
    if (wn) this.wins = wn.slice();
    else this.wins[w]++;
    this.banner = '';
    beep(w === this.meSlot ? 660 : 200, 0.4, 'triangle', 0.07, w === this.meSlot ? 990 : 120);
    this.emit();
  }
  claim(w, why) {
    if (this.phase !== 'play') return;
    if (this.mode === 'online' && !this.host) this.net.sendEvent({ k: 'claim', w, why, rd: this.round });
    else this.endRound(w, why);
  }
  endMatch(w) {
    this.phase = 'mend';
    this.winner = w;
    this.msg = '';
    this.rmSelf = false;
    this.rmPeer = false;
    if (this.mode === 'online' && this.host) this.net.sendEvent({ k: 'mend', w, wn: this.wins.slice() });
    this.emit();
  }
  rematch() {
    if (this.phase !== 'mend') return;
    if (this.mode !== 'online') {
      this.wins = [0, 0];
      this.startRound(1, Math.floor(Math.random() * TRE.length));
      return;
    }
    if (this.rmSelf) return;
    this.rmSelf = true;
    this.net.sendEvent({ k: 'rm' });
    this.maybeRestart();
    this.emit();
  }
  maybeRestart() {
    if (this.rmSelf && this.rmPeer && this.host) {
      const tre = Math.floor(Math.random() * TRE.length);
      this.net.sendEvent({ k: 'go', rd: 1, tr: tre, wn: [0, 0] });
      this.wins = [0, 0];
      this.startRound(1, tre);
    }
  }
  peerLeft() {
    if (this.phase === 'mend') return;
    this.phase = 'mend';
    this.winner = this.slot;
    this.msg = 'Arkadaşın bağlantıyı kaybetti';
    this.emit();
  }

  // ——— ağ ———
  onNetState(s) {
    if (!s) return this.peerLeft();
    this.lastPeerAt = performance.now();
    const p = this.P[1 - this.slot];
    if (s.r && this.phase === 'wait' && this.host) {
      const tre = Math.floor(Math.random() * TRE.length);
      this.net.sendEvent({ k: 'go', rd: 1, tr: tre, wn: [0, 0] });
      this.startRound(1, tre);
      return;
    }
    if (s.fl == null) return;
    p.tx = s.x;
    p.tfl = s.fl;
    p.tcl = s.cl ? { from: s.cl.f, to: s.cl.t, t: s.cl.p } : null;
    p.face = s.f;
    p.hidden = !!s.hd;
    p.carry = !!s.cr;
    p.st = s.st || 'idle';
    p.steal = s.sp || 0;
    p.sw = s.sw || 0;
    if (p.carry && p.role === 't') this.stolen = true;
  }
  onNetEvent(e) {
    if (!e) return;
    switch (e.k) {
      case 'go':
        this.wins = e.wn.slice();
        this.startRound(e.rd, e.tr);
        break;
      case 'claim':
        if (this.host && e.rd === this.round) this.endRound(e.w, e.why);
        break;
      case 'rend':
        if (e.rd === this.round && this.phase === 'play') this.applyEnd(e.w, e.why, e.wn);
        break;
      case 'mend':
        this.wins = e.wn.slice();
        this.endMatch(e.w);
        break;
      case 'alarm':
        this.alarmT = 5;
        this.alarmPos = { x: e.x, f: e.f };
        beep(880, 0.5, 'sawtooth', 0.05, 660);
        break;
      case 'noise':
        this.noise = { x: e.x, f: e.f, t: 4 };
        beep(420, 0.15, 'triangle', 0.05);
        break;
      case 'rm':
        this.rmPeer = true;
        this.maybeRestart();
        this.emit();
        break;
    }
  }
  sendNet(dt) {
    if (this.mode !== 'online' || !this.net) return;
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 0.066;
    const p = this.P[this.slot];
    const y = p.cl ? FY[p.cl.from] + (FY[p.cl.to] - FY[p.cl.from]) * p.cl.t : FY[p.fl];
    this.net.sendState({ r: 1, rd: this.round, x: r1(p.x), y: r1(y), fl: p.fl, cl: p.cl ? { f: p.cl.from, t: p.cl.to, p: Math.round(p.cl.t * 100) / 100 } : 0, f: p.face, hd: p.hidden ? 1 : 0, cr: p.carry ? 1 : 0, st: p.st, sp: Math.round(p.steal * 100) / 100, sw: Math.round(p.sw * 100) / 100 });
  }

  // ——— ana döngü ———
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
    this.phaseT += dt;
    if (this.mode === 'online' && this.phase !== 'mend' && this.phase !== 'wait' && performance.now() - this.lastPeerAt > 9000) this.peerLeft();
    if (this.phase === 'intro' && this.phaseT > 2.2) {
      this.phase = 'play';
      this.phaseT = 0;
      beep(520, 0.12);
      this.emit();
    }
    if (this.phase === 'rend' && this.phaseT > 3 && this.host) {
      const w = this.winner;
      if (this.wins[w] >= WIN_ROUNDS || this.round >= 3) {
        this.endMatch(this.wins[0] === this.wins[1] ? -1 : this.wins[0] > this.wins[1] ? 0 : 1);
      } else {
        const tre = Math.floor(Math.random() * TRE.length);
        if (this.mode === 'online') this.net.sendEvent({ k: 'go', rd: this.round + 1, tr: tre, wn: this.wins.slice() });
        this.startRound(this.round + 1, tre);
      }
    }
    const play = this.phase === 'play';
    if (play) {
      this.rt += dt;
      if (this.alarmT > 0) this.alarmT -= dt;
      if (this.alarmCd > 0) this.alarmCd -= dt;
      if (this.noise) {
        this.noise.t -= dt;
        if (this.noise.t <= 0) this.noise = null;
      }
      if (this.host && this.rt >= ROUND_TIME) this.endRound(this.G.slot, 'time');
    }
    for (const p of this.P) {
      p.cd = Math.max(0, p.cd - dt);
      if (this.isLocal(p)) {
        let inp;
        if (p.bot) inp = p.bot.think(dt);
        else inp = this.keys;
        this.stepLocal(p, inp, dt, play);
      } else this.stepRemote(p, dt);
    }
    this.sendNet(dt);
  }

  other(p) {
    return this.P[1 - p.slot];
  }
  effFl(p) {
    return p.cl ? p.cl.from : p.fl;
  }

  stepLocal(p, i, dt, play) {
    const dP = i.d && !p.pd;
    const aP = i.act && !p.pa;
    p.pd = !!i.d;
    p.pa = !!i.act;
    if (!play) {
      p.st = 'idle';
      return;
    }
    if (p.sw > 0) {
      const before = p.sw;
      p.sw -= dt;
      if (before > 0.17 && p.sw <= 0.17 && !p.swHit) this.guardHit(p);
      p.st = 'catch';
      return;
    }
    if (p.stun > 0) {
      p.stun -= dt;
      p.st = 'idle';
      return;
    }
    if (p.cl) {
      p.cl.t += dt / CLIMB;
      p.st = 'climb';
      if (p.cl.t >= 1) {
        p.fl = p.cl.to;
        p.cl = null;
        p.st = 'idle';
      }
      return;
    }
    const th = p.role === 't';
    if (p.hidden) {
      p.st = 'hide';
      if (i.l || i.r || i.u || dP) {
        p.hidden = false;
        p.st = 'idle';
      }
      return;
    }
    // hareket
    const dir = (i.r ? 1 : 0) - (i.l ? 1 : 0);
    const run = th && i.run && dir;
    let sp = th ? (run ? 225 : 150) : this.alarmT > 0 ? 172 : 150;
    if (p.bot && !th) sp *= 0.8;
    if (p.carry) sp *= 0.85;
    if (dir) {
      p.x = clamp(p.x + dir * sp * dt, 36, 764);
      p.face = dir;
    }
    p.st = dir ? (run ? 'run' : 'walk') : 'idle';
    // merdiven
    if (i.u || i.d) {
      const lad = ladderAt(p.fl, p.x, i.u ? 1 : -1);
      if (lad && (i.u || i.d)) {
        p.x = lad.x;
        p.cl = i.u ? { from: p.fl, to: p.fl + 1, t: 0 } : { from: p.fl, to: p.fl - 1, t: 0 };
        return;
      }
    }
    if (th) this.stepThief(p, i, dt, dP, aP, run);
    else this.stepGuard(p, aP);
  }

  stepThief(p, i, dt, dP, aP, run) {
    // saklanma
    if (dP) {
      const h = HIDE.find((s) => s.f === p.fl && Math.abs(s.x - p.x) < 24);
      if (h) {
        p.x = h.x;
        p.hidden = true;
        return;
      }
    }
    // hazine
    const tr = TRE[this.treasure];
    const nearTr = !p.carry && !this.stolen && tr.f === p.fl && Math.abs(tr.x - p.x) < 28;
    if (nearTr && i.act) {
      p.steal += dt;
      p.st = 'steal';
      if (p.steal >= 0.9) {
        p.carry = true;
        this.stolen = true;
        p.steal = 0;
        beep(740, 0.2, 'triangle', 0.06, 1100);
      }
    } else p.steal = Math.max(0, p.steal - dt * 2);
    if (aP && !nearTr && p.cd <= 0) {
      p.cd = 9;
      this.noise = { x: p.x, f: p.fl, t: 4 };
      if (this.net) this.net.sendEvent({ k: 'noise', x: r1(p.x), f: p.fl });
      beep(420, 0.15, 'triangle', 0.05);
    }
    // alarmlar
    if (this.alarmCd <= 0) {
      const d = danger(p.x, p.fl, this.rt);
      if (d) {
        this.alarmT = 5;
        this.alarmCd = 9;
        this.alarmPos = { x: p.x, f: p.fl };
        if (this.net) this.net.sendEvent({ k: 'alarm', why: d, x: r1(p.x), f: p.fl });
        beep(880, 0.5, 'sawtooth', 0.05, 660);
      }
    }
    if (p.carry && p.fl === 0 && p.x <= EXIT_X) this.claim(p.slot, 'escape');
  }

  stepGuard(p, aP) {
    if (aP && p.cd <= 0) {
      p.sw = 0.3;
      p.swHit = false;
      p.cd = 0.9;
      beep(300, 0.1, 'sawtooth', 0.04, 150);
    }
  }
  guardHit(p) {
    p.swHit = true;
    const t = this.other(p);
    if (t.cl) return;
    if (t.fl !== p.fl) return;
    const dx = t.x - p.x;
    if (Math.abs(dx) < 50 && dx * p.face > -12) this.claim(p.slot, 'catch');
    else p.stun = 1.1;
  }

  stepRemote(p, dt) {
    p.x += (p.tx - p.x) * Math.min(1, dt * 14);
    p.fl = p.tfl;
    p.cl = p.tcl;
  }

  // algı kuralları (bekçi hırsızı görebilir mi?)
  guardSees() {
    const g = this.G;
    const t = this.T;
    if (t.hidden) return false;
    if (this.alarmT > 0) return true;
    if (this.effFl(g) !== this.effFl(t)) return false;
    const dx = t.x - g.x;
    if (Math.abs(dx) < 46) return true;
    return dx * g.face > 0 && Math.abs(dx) < 250;
  }
  guardHears() {
    const g = this.G;
    const t = this.T;
    if (t.hidden || t.st !== 'run') return false;
    return Math.abs(this.effFl(g) - this.effFl(t)) <= 1 && Math.hypot(g.x - t.x, (this.effFl(g) - this.effFl(t)) * 110) < 300;
  }

  // ——— çizim ———
  yOf(p) {
    return p.cl ? FY[p.cl.from] + (FY[p.cl.to] - FY[p.cl.from]) * Math.min(1, p.cl.t) : FY[p.fl];
  }
  draw() {
    const c = this.c;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#120d22';
    c.fillRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(this.sc, 0, 0, this.sc, this.ox, this.oy);
    c.beginPath();
    c.rect(0, 0, W, H);
    c.clip();
    this.drawMuseum(c);
    this.drawActors(c);
    this.drawHud(c);
  }
  drawMuseum(c) {
    const t = this.time;
    c.fillStyle = '#251a45';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffe9a8';
    c.beginPath();
    c.arc(730, 52, 22, 0, 7);
    c.fill();
    // bina
    c.fillStyle = '#3a2d63';
    c.fillRect(20, 76, 760, 336);
    c.strokeStyle = '#141018';
    c.lineWidth = 4;
    c.strokeRect(20, 76, 760, 336);
    for (let f = 0; f < 3; f++) {
      const y = FY[f];
      c.fillStyle = '#2b2150';
      c.fillRect(24, y - 106, 752, 106);
      // tablolar
      for (let k = 0; k < 4; k++) {
        const px = 110 + k * 190 + (f % 2) * 40;
        c.fillStyle = ['#e0675a', '#4aa3d8', '#ffd166', '#6cbf6a'][(k + f) % 4];
        c.fillRect(px, y - 86, 36, 28);
        c.strokeStyle = '#141018';
        c.lineWidth = 3;
        c.strokeRect(px, y - 86, 36, 28);
      }
      c.fillStyle = '#5b4a8c';
      c.fillRect(20, y, 760, 12);
      c.strokeRect(20, y, 760, 12);
    }
    // merdivenler
    for (const l of LAD) {
      const y0 = FY[l.f + 1];
      const y1 = FY[l.f];
      c.strokeStyle = '#c98c5a';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(l.x - 9, y0);
      c.lineTo(l.x - 9, y1);
      c.moveTo(l.x + 9, y0);
      c.lineTo(l.x + 9, y1);
      c.stroke();
      c.lineWidth = 3;
      for (let y = y0 + 12; y < y1; y += 14) {
        c.beginPath();
        c.moveTo(l.x - 9, y);
        c.lineTo(l.x + 9, y);
        c.stroke();
      }
    }
    // saklanma yerleri
    for (const h of HIDE) {
      c.fillStyle = '#6a4a2f';
      c.fillRect(h.x - 18, FY[h.f] - 62, 36, 62);
      c.strokeStyle = '#141018';
      c.lineWidth = 3;
      c.strokeRect(h.x - 18, FY[h.f] - 62, 36, 62);
      c.beginPath();
      c.moveTo(h.x, FY[h.f] - 62);
      c.lineTo(h.x, FY[h.f]);
      c.stroke();
      c.fillStyle = '#ffd166';
      c.fillRect(h.x - 6, FY[h.f] - 32, 3, 8);
      c.fillRect(h.x + 3, FY[h.f] - 32, 3, 8);
    }
    // çıkış
    c.fillStyle = '#2f9d62';
    c.fillRect(24, FY[0] - 70, 36, 70);
    c.strokeStyle = '#141018';
    c.strokeRect(24, FY[0] - 70, 36, 70);
    c.fillStyle = '#fff';
    c.font = 'bold 11px Onest, sans-serif';
    c.textAlign = 'center';
    c.fillText('ÇIKIŞ', 42, FY[0] - 76);
    // hazine
    const tr = TRE[this.treasure];
    if (!this.stolen) {
      c.fillStyle = 'rgba(255,214,102,' + (0.18 + 0.08 * Math.sin(t * 4)) + ')';
      c.beginPath();
      c.arc(tr.x, FY[tr.f] - 18, 34, 0, 7);
      c.fill();
      c.fillStyle = '#ffc233';
      c.fillRect(tr.x - 16, FY[tr.f] - 26, 32, 22);
      c.strokeStyle = '#141018';
      c.lineWidth = 3;
      c.strokeRect(tr.x - 16, FY[tr.f] - 26, 32, 22);
      c.fillStyle = '#b9791a';
      c.fillRect(tr.x - 16, FY[tr.f] - 26, 32, 8);
    } else {
      c.strokeStyle = 'rgba(255,255,255,.3)';
      c.setLineDash([4, 4]);
      c.strokeRect(tr.x - 16, FY[tr.f] - 26, 32, 22);
      c.setLineDash([]);
    }
    // lazerler
    for (const l of LAS) {
      const y = FY[l.f] - 24;
      const on = laserOn(l, this.rt);
      const warn = !on && (this.rt + l.ph * 3) % 4 > 3.5;
      c.strokeStyle = on ? '#ff3b30' : warn ? 'rgba(255,120,100,.7)' : 'rgba(255,90,80,.18)';
      c.lineWidth = on ? 3 : 2;
      c.setLineDash(on ? [] : [5, 6]);
      c.beginPath();
      c.moveTo(l.x1, y);
      c.lineTo(l.x2, y);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#141018';
      c.fillRect(l.x1 - 6, y - 6, 8, 12);
      c.fillRect(l.x2 - 2, y - 6, 8, 12);
    }
    // kameralar
    for (const cm of CAMS) {
      const o = camPos(cm);
      const a = camAngle(cm, this.rt);
      c.fillStyle = this.alarmT > 0 ? 'rgba(255,60,50,.3)' : 'rgba(255,90,80,.16)';
      c.beginPath();
      c.moveTo(o.x, o.y);
      c.arc(o.x, o.y, 170, a - 0.32, a + 0.32);
      c.closePath();
      c.fill();
      c.fillStyle = '#141018';
      c.fillRect(o.x - 9, o.y - 8, 18, 12);
      c.fillStyle = '#ff3b30';
      c.beginPath();
      c.arc(o.x + Math.cos(a) * 7, o.y + 4 + Math.sin(a) * 3, 3, 0, 7);
      c.fill();
    }
  }
  drawActors(c) {
    const me = this.P[this.meSlot];
    const T = this.T;
    const G = this.G;
    const meThief = me.role === 't';
    // bekçi feneri
    if (G) {
      const gy = this.yOf(G) - 40;
      const dirn = G.face;
      c.fillStyle = 'rgba(255,238,150,.22)';
      c.beginPath();
      c.moveTo(G.x + dirn * 10, gy);
      c.lineTo(G.x + dirn * 250, gy - 62);
      c.lineTo(G.x + dirn * 250, gy + 62);
      c.closePath();
      c.fill();
    }
    // gürültü
    if (this.noise && (!meThief || true)) {
      const n = this.noise;
      c.strokeStyle = 'rgba(255,255,255,.7)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(n.x, FY[n.f] - 20, 10 + ((this.time * 40) % 30), 0, 7);
      c.stroke();
      c.fillStyle = '#fff';
      c.font = 'bold 20px Onest, sans-serif';
      c.textAlign = 'center';
      c.fillText('?', n.x, FY[n.f] - 58);
    }
    const seen = meThief || this.guardSees() || this.phase !== 'play';
    for (const p of [G, T]) {
      if (!p) continue;
      const th = p.role === 't';
      const x = p.x;
      const y = this.yOf(p);
      const st = p.st === 'walk' || p.st === 'run' ? 'walk' : p.st === 'catch' ? 'idle' : 'idle';
      const f = { ch: CHARACTERS[p.ch], st, mv: null, mvT: 0, dT: 1, slot: p.slot, face: p.face, x: p.x + (p.st === 'climb' ? y * 3 : 0), y: 0 };
      if (th) {
        if (!seen) {
          // bekçi göremiyor: yalnızca duyuyorsa halka
          if (this.guardHears()) {
            c.strokeStyle = 'rgba(255,255,255,.55)';
            c.lineWidth = 3;
            c.beginPath();
            c.arc(x, y - 30, 14 + ((this.time * 60) % 26), 0, 7);
            c.stroke();
          }
          continue;
        }
        if (p.hidden) {
          if (!meThief) continue;
          drawFighter(c, f, this.time, { x, y, scale: SCALE, face: p.face, alpha: 0.35 });
          continue;
        }
        drawFighter(c, f, this.time, { x, y, scale: SCALE, face: p.face });
        if (p.carry) {
          c.fillStyle = '#ffc233';
          c.strokeStyle = '#141018';
          c.lineWidth = 3;
          c.beginPath();
          c.arc(x - p.face * 14, y - 36, 9, 0, 7);
          c.fill();
          c.stroke();
        }
        if (!meThief && this.alarmT > 0) {
          c.fillStyle = '#ff3b30';
          c.font = 'bold 26px Onest, sans-serif';
          c.textAlign = 'center';
          c.fillText('!', x, y - 70);
        }
        if (p.steal > 0.02) {
          c.fillStyle = '#141018';
          c.fillRect(x - 20, y - 74, 40, 8);
          c.fillStyle = '#ffd166';
          c.fillRect(x - 18, y - 72, 36 * Math.min(1, p.steal / 0.9), 4);
        }
      } else {
        drawFighter(c, f, this.time, { x, y, scale: SCALE, face: p.face });
        if (p.sw > 0) {
          const k = 1 - p.sw / 0.3;
          c.strokeStyle = 'rgba(255,255,255,.85)';
          c.lineWidth = 5;
          c.beginPath();
          c.arc(x + p.face * 20, y - 30, 30, p.face > 0 ? -1.1 + k * 1.2 : Math.PI - 0.1 - k * 1.2, p.face > 0 ? -0.1 + k * 1.2 : Math.PI + 1.1 - k * 1.2);
          c.stroke();
        }
      }
    }
    // kendini işaretle
    const y = this.yOf(me);
    if (me.role === 't' ? !me.hidden : true) {
      c.fillStyle = me.role === 't' ? '#4fe0a0' : '#ffd166';
      c.beginPath();
      c.moveTo(me.x, y - 74 + Math.sin(this.time * 6) * 2);
      c.lineTo(me.x - 6, y - 84 + Math.sin(this.time * 6) * 2);
      c.lineTo(me.x + 6, y - 84 + Math.sin(this.time * 6) * 2);
      c.fill();
    }
  }
  drawHud(c) {
    const me = this.P[this.meSlot];
    const th = me.role === 't';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(20,16,24,.7)';
    c.fillRect(0, 0, W, 44);
    c.font = "22px 'Lilita One', sans-serif";
    c.fillStyle = th ? '#4fe0a0' : '#ffd166';
    c.textAlign = 'left';
    c.fillText(th ? 'Sen hırsızsın' : 'Sen bekçisin', 16, 29);
    c.textAlign = 'center';
    c.fillStyle = '#fff';
    const left = Math.max(0, Math.ceil(ROUND_TIME - this.rt));
    c.fillText(this.phase === 'play' || this.phase === 'rend' ? left + ' sn' : '', W / 2, 29);
    c.textAlign = 'right';
    c.font = "16px 'Lilita One', sans-serif";
    c.fillStyle = '#cfc6ea';
    const my = this.wins[this.meSlot];
    const ot = this.wins[1 - this.meSlot];
    c.fillText('Tur ' + this.round + '/3 · Sen ' + my + ' – ' + ot + ' ' + (this.other(me).nick || 'Rakip'), W - 16, 28);
    if (this.phase === 'play') {
      const msg = th ? (this.T.carry ? 'Hazine sende! Çıkışa kaç' : 'Hazineyi bul ve çal') : this.stolen ? 'Hazine çalındı! Hırsızı yakala' : 'Müzeyi bekle, hırsızı yakala';
      c.fillStyle = 'rgba(20,16,24,.6)';
      c.fillRect(W / 2 - 160, H - 36, 320, 26);
      c.fillStyle = '#fff';
      c.font = '15px Onest, sans-serif';
      c.textAlign = 'center';
      c.fillText(msg, W / 2, H - 18);
      if (this.alarmT > 0) {
        c.fillStyle = 'rgba(255,60,50,' + (0.5 + 0.3 * Math.sin(this.time * 12)) + ')';
        c.fillRect(0, 44, W, 26);
        c.fillStyle = '#fff';
        c.font = "18px 'Lilita One', sans-serif";
        c.fillText('ALARM!', W / 2, 63);
      }
    }
    if (this.phase === 'wait') this.bigText(c, 'Arkadaşın bağlanıyor…', '');
    if (this.phase === 'intro') this.bigText(c, th ? 'Hırsızsın!' : 'Bekçisin!', th ? 'Hazineyi çal, çıkışa kaç. Kameraya ve lazere dikkat.' : 'Hırsızı yakala. Fener görüş alanı dar, alarm onu gösterir.');
    if (this.phase === 'rend') {
      const w = this.winner === this.meSlot;
      const why = this.why === 'escape' ? 'Hazineyle kaçtı' : this.why === 'catch' ? 'Yakalandı' : 'Süre doldu';
      this.bigText(c, w ? 'Turu aldın!' : 'Tur rakibin', why);
    }
  }
  bigText(c, a, b) {
    c.fillStyle = 'rgba(20,16,24,.55)';
    c.fillRect(0, H / 2 - 60, W, 120);
    c.fillStyle = '#ffd166';
    c.textAlign = 'center';
    c.font = "46px 'Lilita One', sans-serif";
    c.fillText(a, W / 2, H / 2 + 4);
    c.fillStyle = '#fff';
    c.font = '17px Onest, sans-serif';
    c.fillText(b, W / 2, H / 2 + 36);
  }
}
