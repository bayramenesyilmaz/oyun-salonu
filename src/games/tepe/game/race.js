// Tepe Yarışı motoru: iki tekerlekli fizikli araç, tepeli parkur, eşya kutuları. Bot ya da online.
// Her istemci yalnız kendi aracını simüle eder; rakip yumuşatılmış hayalet olarak çizilir. Tehlikeler (çivi, yağ, kaya) iki tarafta da görünür, etkiyi kurbanın istemcisi uygular.
import { CHARACTERS } from '../../../characters/roster.js';
import { drawFighter } from '../../../characters/rig.js';
import { Track, L, START_X, rng } from './track.js';

const R = 16;
const D = 72;
const G = 1100;
const CAP = 400;
const ACC = 620;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
const COL = ['#ff5fa2', '#27a9ee'];

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

function mkCar(slot, ch, nick) {
  return {
    slot, ch, nick, w: [{ x: 0, y: 0, vx: 0, vy: 0 }, { x: 0, y: 0, vx: 0, vy: 0 }], gr: [false, false], ang: 0, rot: 0,
    nitro: 0, flat: 0, slick: 0, stun: 0, flipT: 0, item: null, got: {}, fin: false, spawn: 0, best: START_X,
    tx: START_X, ty: 0, ta: 0, bot: null, pe: 0,
  };
}
const mid = (c) => ({ x: (c.w[0].x + c.w[1].x) / 2, y: (c.w[0].y + c.w[1].y) / 2 });

export class Race {
  constructor(cv, o) {
    this.cv = cv;
    this.c = cv.getContext('2d');
    this.o = o;
    this.mode = o.mode || 'bot';
    this.net = o.net || null;
    this.slot = o.slot || 0;
    this.host = this.mode !== 'online' || !!o.host;
    this.cb = o.cb || {};
    this.cars = [mkCar(0, o.chars[0], o.nicks?.[0]), mkCar(1, o.chars[1], o.nicks?.[1])];
    if (this.mode === 'bot') {
      this.cars[1].bot = { gas: 0, brk: 0, use: 0 };
      if (o.p0bot) this.cars[0].bot = { gas: 0, brk: 0, use: 0 };
    }
    this.phase = this.mode === 'online' ? 'wait' : 'count';
    this.phaseT = 0;
    this.time = 0;
    this.rt = 0;
    this.keys = {};
    this.winner = -2;
    this.msg = '';
    this.haz = [];
    this.rocks = [];
    this.hid = 1;
    this.rmSelf = false;
    this.rmPeer = false;
    this.lastPeerAt = performance.now();
    this.sendT = 0;
    this.dead = false;
    this.camX = 0;
    this.camY = 0;
    this.shake = 0;
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
      this.net.sendState({ r: 1, x: START_X, y: 0, a: 0 });
    } else this.begin(Math.floor(Math.random() * 1e9));
    this.emit();
    if (!o.manual) this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  get meC() {
    return this.cars[this.mode === 'online' ? this.slot : 0];
  }
  get foeC() {
    return this.cars[this.mode === 'online' ? 1 - this.slot : 1];
  }
  isLocal(c) {
    return this.mode === 'online' ? c.slot === this.slot : true;
  }
  emit() {
    this.cb.onPhase?.({ phase: this.phase, winner: this.winner, msg: this.msg, rmSelf: this.rmSelf });
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
    this.sc = this.cv.height / 450;
    this.vw = this.cv.width / this.sc;
  }
  onKey(e, down) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const map = { d: 'gas', ArrowRight: 'gas', w: 'gas', ArrowUp: 'gas', a: 'brk', ArrowLeft: 'brk', s: 'brk', ArrowDown: 'brk', ' ': 'use', e: 'use', Enter: 'use' };
    if (k === 'Escape' && down) return this.cb.onPause?.();
    const a = map[k];
    if (!a) return;
    e.preventDefault();
    this.keys[a] = down ? 1 : 0;
  }
  touch(a, down) {
    this.keys[a] = down ? 1 : 0;
  }

  // ——— yarış akışı ———
  begin(seed) {
    this.track = new Track(seed);
    this.seed = seed;
    this.phase = 'count';
    this.phaseT = 0;
    this.rt = 0;
    this.winner = -2;
    this.haz = [];
    this.rocks = [];
    this.shake = 0;
    this.cars.forEach((c, i) => {
      c.fin = false;
      c.nitro = c.flat = c.slick = c.stun = c.flipT = 0;
      c.item = null;
      c.got = {};
      c.best = START_X;
      this.place(c, START_X - i * 90, 0);
      c.tx = c.w[0].x;
      c.pe = 0;
    });
    this.camX = START_X - 200;
    this.emit();
  }
  place(c, x, v) {
    const T = this.track;
    const x1 = x + D;
    c.w[0] = { x, y: T.H(x) - R - 2, vx: v, vy: 0 };
    c.w[1] = { x: x1, y: T.H(x1) - R - 2, vx: v, vy: 0 };
    c.ang = Math.atan2(c.w[1].y - c.w[0].y, c.w[1].x - c.w[0].x);
    c.flipT = 0;
    c.spawn = 1.2;
  }
  endRace(w, why) {
    if (this.phase !== 'race') return;
    this.apply(w, why);
    if (this.mode === 'online') this.net.sendEvent({ k: 'rend', w, why });
  }
  apply(w, why) {
    this.phase = 'rend';
    this.phaseT = 0;
    this.winner = w;
    this.msg = why === 'time' ? 'Süre doldu' : '';
    beep(w === (this.mode === 'online' ? this.slot : 0) ? 700 : 220, 0.4, 'triangle', 0.06, w === (this.mode === 'online' ? this.slot : 0) ? 1000 : 120);
    this.emit();
  }
  claim(w) {
    if (this.phase !== 'race') return;
    if (this.mode === 'online' && !this.host) this.net.sendEvent({ k: 'claim', w });
    else this.endRace(w, 'finish');
  }
  rematch() {
    if (this.phase !== 'rend' && this.phase !== 'mend') return;
    if (this.mode !== 'online') return this.begin(Math.floor(Math.random() * 1e9));
    if (this.rmSelf) return;
    this.rmSelf = true;
    this.net.sendEvent({ k: 'rm' });
    this.maybeRestart();
    this.emit();
  }
  maybeRestart() {
    if (this.rmSelf && this.rmPeer && this.host) {
      const seed = Math.floor(Math.random() * 1e9);
      this.net.sendEvent({ k: 'go', seed });
      this.rmSelf = this.rmPeer = false;
      this.begin(seed);
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
    if (s.r && this.phase === 'wait' && this.host) {
      const seed = Math.floor(Math.random() * 1e9);
      this.net.sendEvent({ k: 'go', seed });
      this.begin(seed);
      return;
    }
    const c = this.foeC;
    if (s.a == null || s.x == null) return;
    c.tx = s.x;
    c.ty = s.y;
    c.ta = s.a;
    c.fin = !!s.f;
    c.nitro = s.n || 0;
    c.flat = s.fl || 0;
    c.rot = s.ro ?? c.rot;
  }
  onNetEvent(e) {
    if (!e) return;
    if (e.k === 'go') {
      this.rmSelf = this.rmPeer = false;
      this.begin(e.seed);
    } else if (e.k === 'claim') {
      if (this.host) this.endRace(e.w, 'finish');
    } else if (e.k === 'rend') {
      if (this.phase === 'race') this.apply(e.w, 'finish');
    } else if (e.k === 'rm') {
      this.rmPeer = true;
      this.maybeRestart();
      this.emit();
    } else if (e.k === 'hz') {
      this.haz.push({ id: e.id, o: e.o, t: e.t, x: e.x, life: e.t === 'oil' ? 8 : 20 });
      beep(300, 0.06, 'triangle', 0.03);
    } else if (e.k === 'rock') {
      this.rocks.push({ id: e.id, o: e.o, x: e.x, y: this.track.H(e.x) - 18, vx: e.vx, vy: 0, life: 7 });
      beep(200, 0.18, 'sawtooth', 0.04, 120);
    }
  }
  sendNet(dt) {
    if (this.mode !== 'online' || !this.net) return;
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 0.066;
    const c = this.meC;
    const m = mid(c);
    this.net.sendState({ r: 1, x: r1(m.x), y: r1(m.y), a: Math.round(c.ang * 100) / 100, f: c.fin ? 1 : 0, n: c.nitro > 0 ? 1 : 0, fl: c.flat > 0 ? 1 : 0, ro: Math.round(c.rot * 10) / 10 });
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
    this.phaseT += dt;
    if (this.mode === 'online' && this.phase !== 'mend' && this.phase !== 'wait' && performance.now() - this.lastPeerAt > 9000) this.peerLeft();
    if (this.phase === 'wait') return;
    if (this.phase === 'count' && this.phaseT > 3.2) {
      this.phase = 'race';
      this.phaseT = 0;
      beep(660, 0.25);
      this.emit();
    }
    if (this.phase === 'rend' && this.phaseT > 2.5) {
      this.phase = 'mend';
      this.emit();
    }
    const racing = this.phase === 'race';
    if (racing) {
      this.rt += dt;
      if (this.host && this.rt > 170) {
        const a = mid(this.cars[0]).x;
        const b = mid(this.cars[1]).x;
        this.endRace(a >= b ? 0 : 1, 'time');
      }
    }
    // ağ gecikmesi için 2 alt adım
    const sub = 2;
    for (let s = 0; s < sub; s++) {
      for (const c of this.cars) {
        if (this.isLocal(c)) {
          const inp = c.bot ? this.botInput(c, dt / sub) : this.keys;
          this.stepCar(c, inp, dt / sub, racing);
        } else this.stepRemote(c, dt / sub);
      }
    }
    if (racing) {
      for (const c of this.cars) {
        if (!this.isLocal(c) || c.fin) continue;
        const m = mid(c);
        this.pickBoxes(c, m);
        if (m.x >= L) {
          c.fin = true;
          this.claim(c.slot);
        }
      }
    }
    this.stepHazards(dt, racing);
    this.sendNet(dt);
    // kamera
    const me = this.meC;
    const m = mid(me);
    this.camX += (m.x - this.vw * 0.33 - this.camX) * Math.min(1, dt * 5);
    this.camY += (m.y - 250 - this.camY) * Math.min(1, dt * 3);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 20);
  }

  // ——— araç fiziği ———
  stepCar(c, inp, dt, racing) {
    const T = this.track;
    if (c.spawn > 0) c.spawn -= dt;
    c.nitro = Math.max(0, c.nitro - dt);
    c.flat = Math.max(0, c.flat - dt);
    c.slick = Math.max(0, c.slick - dt);
    c.stun = Math.max(0, c.stun - dt);
    const gas = racing && !c.fin ? inp.gas : 0;
    const brk = racing && !c.fin ? inp.brk : 0;
    if (racing && inp.use && c.item) this.useItem(c);
    const W = c.w;
    for (const w of W) w.vy += G * dt;
    const air = !c.gr[0] && !c.gr[1];
    let drive = (gas ? 1 : 0) * ACC * (c.slick > 0 ? 0.12 : 1) * (c.flat > 0 ? 0.45 : 1) * (c.nitro > 0 ? 2 : 1) * (c.stun > 0 ? 0 : 1);
    const cap = CAP * (c.nitro > 0 ? 1.45 : 1) * (c.flat > 0 ? 0.55 : 1);
    for (let i = 0; i < 2; i++) {
      const w = W[i];
      if (!c.gr[i]) continue;
      const s = T.slope(w.x);
      const tl = Math.hypot(1, s);
      const tx = 1 / tl;
      const ty = s / tl;
      const vt = w.vx * tx + w.vy * ty;
      if (drive && vt < cap) {
        w.vx += tx * drive * dt;
        w.vy += ty * drive * dt;
      }
      if (brk) {
        if (vt > 30) {
          w.vx -= tx * 820 * dt;
          w.vy -= ty * 820 * dt;
        } else if (vt > -140 && c.slick <= 0) {
          w.vx -= tx * 300 * dt;
          w.vy -= ty * 300 * dt;
        }
      }
      if (!drive && !brk) {
        w.vx -= tx * vt * 0.25 * dt;
        w.vy -= ty * vt * 0.25 * dt;
      }
      if (vt > cap) {
        w.vx -= tx * (vt - cap) * 3 * dt;
        w.vy -= ty * (vt - cap) * 3 * dt;
      }
    }
    // havada denge
    if (air) {
      const dir = (gas ? 1 : 0) - (brk ? 1 : 0);
      if (dir) {
        W[1].vy -= dir * 520 * dt;
        W[0].vy += dir * 520 * dt;
      }
    }
    for (const w of W) {
      w.x += w.vx * dt;
      w.y += w.vy * dt;
    }
    // mesafe kısıtı
    for (let it = 0; it < 5; it++) {
      const dx = W[1].x - W[0].x;
      const dy = W[1].y - W[0].y;
      const d = Math.hypot(dx, dy) || 1;
      const k = ((d - D) / d) * 0.5;
      W[0].x += dx * k;
      W[0].y += dy * k;
      W[1].x -= dx * k;
      W[1].y -= dy * k;
      const ux = dx / d;
      const uy = dy / d;
      const rv = ((W[1].vx - W[0].vx) * ux + (W[1].vy - W[0].vy) * uy) / 2;
      W[0].vx += ux * rv;
      W[0].vy += uy * rv;
      W[1].vx -= ux * rv;
      W[1].vy -= uy * rv;
    }
    // zemin
    for (let i = 0; i < 2; i++) {
      const w = W[i];
      const s = T.slope(w.x);
      const tl = Math.hypot(1, s);
      const h = T.H(w.x);
      const lim = h - R * tl;
      c.gr[i] = false;
      if (w.y > lim - 0.5) {
        if (w.y > lim) w.y = lim;
        c.gr[i] = true;
        const nx = s / tl;
        const ny = -1 / tl;
        const vn = w.vx * nx + w.vy * ny;
        if (vn < 0) {
          w.vx -= nx * vn;
          w.vy -= ny * vn;
        }
      }
    }
    c.ang = Math.atan2(W[1].y - W[0].y, W[1].x - W[0].x);
    const m = mid(c);
    // kabin yere değerse
    const ux = Math.cos(c.ang);
    const uy = Math.sin(c.ang);
    const cx = m.x + uy * 30;
    const cy = m.y - ux * 30;
    const hh = T.H(cx);
    if (cy > hh - 6) {
      const pen = cy - (hh - 6);
      W[0].y -= pen;
      W[1].y -= pen;
      for (const w of W) w.vy *= 0.5;
      c.flipT += dt * 0.5;
      this.shake = Math.max(this.shake, 2);
    }
    if (Math.cos(c.ang) < 0.1 && (c.gr[0] || c.gr[1] || cy > hh - 40)) c.flipT += dt;
    else c.flipT = Math.max(0, c.flipT - dt * 2);
    if (c.flipT > 1.6) {
      this.place(c, Math.max(START_X, m.x - 40), 0);
      c.stun = 0.4;
    }
    if (m.x < 100) this.place(c, 100, 0);
    c.rot += ((W[0].vx + W[1].vx) / 2) / R * dt;
    c.best = Math.max(c.best, m.x);
  }
  stepRemote(c, dt) {
    const k = Math.min(1, dt * 12);
    const m = mid(c);
    const nx = m.x + (c.tx - m.x) * k;
    const ny = m.y + (c.ty - m.y) * k;
    const da = Math.atan2(Math.sin(c.ta - c.ang), Math.cos(c.ta - c.ang));
    c.ang += da * k;
    const ux = Math.cos(c.ang) * D * 0.5;
    const uy = Math.sin(c.ang) * D * 0.5;
    c.w[0].x = nx - ux;
    c.w[0].y = ny - uy;
    c.w[1].x = nx + ux;
    c.w[1].y = ny + uy;
    c.w[0].vx = c.w[1].vx = (c.tx - m.x) / Math.max(dt, 1e-3) * 0.02;
    c.rot += (c.tx - m.x) / R * 0.5;
  }

  // ——— eşyalar ———
  pickBoxes(c, m) {
    if (c.item) return;
    for (const b of this.track.boxes) {
      if (c.got[b.x] && this.rt - c.got[b.x] < 6) continue;
      if (Math.abs(b.x - m.x) < 34 && Math.abs(this.track.H(b.x) - 62 - m.y) < 70) {
        c.got[b.x] = this.rt;
        const r = Math.random();
        const lead = mid(c).x >= mid(this.cars[1 - c.slot]).x;
        c.item = lead ? (r < 0.4 ? 'nitro' : r < 0.7 ? 'nail' : 'oil') : r < 0.45 ? 'rock' : r < 0.75 ? 'nitro' : 'nail';
        beep(900, 0.12, 'triangle', 0.05, 1300);
        return;
      }
    }
  }
  useItem(c) {
    const it = c.item;
    c.item = null;
    const m = mid(c);
    const id = this.slot * 1000 + this.hid++;
    const o = c.slot;
    if (it === 'nitro') {
      c.nitro = 2.2;
      beep(500, 0.4, 'sawtooth', 0.05, 900);
    } else if (it === 'nail') {
      const x = m.x - 90;
      this.haz.push({ id, o, t: 'nail', x, life: 20 });
      if (this.net) this.net.sendEvent({ k: 'hz', id, o, t: 'nail', x: r1(x) });
    } else if (it === 'oil') {
      const x = m.x - 110;
      this.haz.push({ id, o, t: 'oil', x, life: 8 });
      if (this.net) this.net.sendEvent({ k: 'hz', id, o, t: 'oil', x: r1(x) });
    } else if (it === 'rock') {
      const x = m.x + 120;
      const vx = Math.max(300, (c.w[0].vx + c.w[1].vx) / 2 + 180);
      this.rocks.push({ id, o, x, y: this.track.H(x) - 18, vx, vy: 0, life: 7 });
      if (this.net) this.net.sendEvent({ k: 'rock', id, o, x: r1(x), vx: r1(vx) });
      beep(200, 0.18, 'sawtooth', 0.04, 120);
    }
  }
  stepHazards(dt, racing) {
    const T = this.track;
    for (const h of this.haz) h.life -= dt;
    this.haz = this.haz.filter((h) => h.life > 0);
    for (const r of this.rocks) {
      r.life -= dt;
      r.x += r.vx * dt;
      r.vy += G * dt;
      r.y += r.vy * dt;
      const g = T.H(r.x) - 18;
      if (r.y > g) {
        r.y = g;
        r.vy = 0;
        const s = T.slope(r.x);
        r.vx += -s * 420 * dt;
        r.vx = clamp(r.vx, 120, 620);
      }
    }
    this.rocks = this.rocks.filter((r) => r.life > 0);
    if (!racing) return;
    for (const c of this.cars) {
      if (!this.isLocal(c) || c.spawn > 0) continue;
      const m = mid(c);
      for (const h of this.haz) {
        if (h.o === c.slot) continue;
        if (h.t === 'nail' && Math.abs(h.x - m.x) < 46) {
          c.flat = 2.6;
          h.life = 0;
          this.shake = 4;
          beep(160, 0.2, 'sawtooth', 0.05, 90);
        } else if (h.t === 'oil' && Math.abs(h.x - m.x) < 80) c.slick = 1.2;
      }
      for (const r of this.rocks) {
        if (r.o === c.slot) continue;
        for (const w of c.w) {
          if (Math.hypot(w.x - r.x, w.y - r.y) < 34) {
            r.life = 0;
            c.stun = 1.2;
            for (const ww of c.w) {
              ww.vx *= 0.2;
              ww.vy = -420;
            }
            this.shake = 8;
            beep(130, 0.3, 'sawtooth', 0.06, 70);
            break;
          }
        }
      }
    }
  }

  // ——— bot ———
  botInput(c, dt) {
    const T = this.track;
    const b = c.bot;
    const m = mid(c);
    const foe = this.cars[1 - c.slot];
    const air = !c.gr[0] && !c.gr[1];
    const s = T.slope(m.x + 40);
    const want = Math.atan(s);
    b.gas = 1;
    b.brk = 0;
    if (air) {
      const e = c.ang - want;
      if (e > 0.15) {
        b.gas = 1;
        b.brk = 0;
      } else if (e < -0.15) {
        b.gas = 0;
        b.brk = 1;
      } else {
        b.gas = 0;
        b.brk = 0;
      }
    } else if (c.ang < -0.9) {
      b.gas = 0;
    }
    if (c.stun > 0) b.gas = 0;
    b.use = 0;
    if (c.item && this.phase === 'race') {
      const fx = mid(foe).x;
      const ahead = fx - m.x;
      if (c.item === 'nitro' && s < 0.15 && c.gr[0]) b.use = 1;
      else if (c.item === 'rock' && ahead > 150 && ahead < 900) b.use = 1;
      else if ((c.item === 'nail' || c.item === 'oil') && ahead < -120 && ahead > -700) b.use = 1;
    }
    return b;
  }

  // ——— çizim ———
  draw() {
    const c = this.c;
    const T = this.track;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#8fd3f4';
    c.fillRect(0, 0, this.cv.width, this.cv.height);
    if (!T) return;
    const sc = this.sc;
    c.setTransform(sc, 0, 0, sc, 0, 0);
    // gökyüzü ve tepeler (paralaks)
    c.fillStyle = '#ffe27a';
    c.beginPath();
    c.arc(this.vw - 90, 70, 30, 0, 7);
    c.fill();
    for (const [f, col, base, amp] of [[0.15, '#b7a6e8', 300, 60], [0.35, '#9b8fd1', 340, 50]]) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(0, 450);
      for (let sx = 0; sx <= this.vw + 20; sx += 20) {
        const wx = sx + this.camX * f;
        c.lineTo(sx, base - amp * 0.5 - Math.sin(wx * 0.006) * amp * 0.5 - Math.sin(wx * 0.017) * 14 + (this.camY * f * -0.3));
      }
      c.lineTo(this.vw + 20, 450);
      c.fill();
    }
    const sh = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    c.save();
    c.translate(-this.camX + sh, -this.camY + sh);
    // yol
    const x0 = Math.floor(this.camX / 16) * 16 - 32;
    const x1 = this.camX + this.vw + 48;
    c.fillStyle = '#7a5a3c';
    c.beginPath();
    c.moveTo(x0, this.camY + 520);
    for (let x = x0; x <= x1; x += 16) c.lineTo(x, T.H(x));
    c.lineTo(x1, this.camY + 520);
    c.closePath();
    c.fill();
    c.strokeStyle = '#141018';
    c.lineWidth = 4;
    c.beginPath();
    for (let x = x0; x <= x1; x += 16) (x === x0 ? c.moveTo(x, T.H(x)) : c.lineTo(x, T.H(x)));
    c.stroke();
    c.strokeStyle = '#6cc24a';
    c.lineWidth = 9;
    c.beginPath();
    for (let x = x0; x <= x1; x += 16) (x === x0 ? c.moveTo(x, T.H(x) + 4) : c.lineTo(x, T.H(x) + 4));
    c.stroke();
    // başlangıç / bitiş
    this.flag(c, START_X - 80, '#fff');
    this.flag(c, L, '#ffd166');
    // kutular
    for (const b of T.boxes) {
      if (b.x < x0 || b.x > x1) continue;
      const mine = this.meC.got[b.x] && this.rt - this.meC.got[b.x] < 6;
      const y = T.H(b.x) - 62 + Math.sin(this.time * 3 + b.x) * 4;
      c.globalAlpha = mine ? 0.25 : 1;
      c.fillStyle = '#ffd34d';
      c.strokeStyle = '#141018';
      c.lineWidth = 3;
      c.fillRect(b.x - 16, y - 16, 32, 32);
      c.strokeRect(b.x - 16, y - 16, 32, 32);
      c.fillStyle = '#141018';
      c.font = "bold 20px 'Lilita One', sans-serif";
      c.textAlign = 'center';
      c.fillText('?', b.x, y + 7);
      c.globalAlpha = 1;
    }
    // tehlikeler
    for (const h of this.haz) {
      const y = T.H(h.x);
      if (h.t === 'nail') {
        c.fillStyle = '#9aa0a8';
        c.strokeStyle = '#141018';
        c.lineWidth = 2;
        for (let k = -2; k <= 2; k++) {
          c.beginPath();
          c.moveTo(h.x + k * 10 - 5, y);
          c.lineTo(h.x + k * 10, y - 16);
          c.lineTo(h.x + k * 10 + 5, y);
          c.fill();
          c.stroke();
        }
      } else {
        c.fillStyle = 'rgba(20,16,30,.8)';
        c.beginPath();
        c.ellipse(h.x, y - 2, 70, 7, 0, 0, 7);
        c.fill();
      }
    }
    for (const r of this.rocks) {
      c.fillStyle = '#8b8d92';
      c.strokeStyle = '#141018';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(r.x, r.y, 18, 0, 7);
      c.fill();
      c.stroke();
      c.fillStyle = '#a9abb0';
      c.beginPath();
      c.arc(r.x - 5, r.y - 5, 6, 0, 7);
      c.fill();
    }
    for (const car of [this.foeC, this.meC]) this.drawCar(c, car, car === this.meC ? 1 : 0.7);
    c.restore();
    this.drawHud(c);
  }
  flag(c, x, col) {
    const y = this.track.H(x);
    c.strokeStyle = '#141018';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - 150);
    c.stroke();
    c.fillStyle = col;
    c.fillRect(x, y - 150, 60, 34);
    c.strokeRect(x, y - 150, 60, 34);
    c.fillStyle = '#141018';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) c.fillRect(x + 4 + i * 18, y - 146 + j * 15, 18, 15);
  }
  drawCar(c, car, alpha) {
    const m = mid(car);
    const flick = car.spawn > 0 && Math.floor(this.time * 12) % 2 === 0;
    c.globalAlpha = flick ? 0.3 : alpha;
    // tekerlekler
    for (const w of car.w) {
      c.save();
      c.translate(w.x, w.y);
      c.rotate(car.rot);
      c.fillStyle = '#2a2a30';
      c.strokeStyle = '#141018';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(0, 0, R, 0, 7);
      c.fill();
      c.stroke();
      c.fillStyle = car.flat > 0 ? '#e0675a' : '#cfd3d8';
      c.beginPath();
      c.arc(0, 0, 7, 0, 7);
      c.fill();
      c.fillStyle = '#141018';
      c.fillRect(-1.5, -7, 3, 14);
      c.restore();
    }
    c.save();
    c.translate(m.x, m.y);
    c.rotate(car.ang);
    // sürücü
    drawFighter(c, { ch: CHARACTERS[car.ch], st: 'idle', mv: null, mvT: 0, dT: 1, slot: car.slot, face: 1, x: 0, y: 0 }, this.time, { x: 6, y: -6, scale: 0.34, face: 1, alpha: flick ? 0.3 : alpha });
    // gövde
    c.fillStyle = COL[car.slot];
    c.strokeStyle = '#141018';
    c.lineWidth = 4;
    c.beginPath();
    c.roundRect(-48, -26, 96, 22, 7);
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,.25)';
    c.fillRect(-40, -22, 40, 5);
    if (car.nitro > 0) {
      c.fillStyle = '#ffb300';
      c.beginPath();
      c.moveTo(-48, -20);
      c.lineTo(-48 - 26 - Math.random() * 12, -15);
      c.lineTo(-48, -10);
      c.fill();
    }
    c.restore();
    c.globalAlpha = 1;
    if (car === this.meC || car.nick) {
      c.fillStyle = '#fff';
      c.font = "13px 'Lilita One', sans-serif";
      c.textAlign = 'center';
      c.fillText(car === this.meC ? 'SEN' : car.nick || '', m.x, m.y - 78);
    }
  }
  drawHud(c) {
    const me = this.meC;
    const foe = this.foeC;
    c.setTransform(this.sc, 0, 0, this.sc, 0, 0);
    const vw = this.vw;
    // ilerleme çubuğu
    const bx = 120;
    const bw = vw - 240;
    c.fillStyle = 'rgba(20,16,24,.65)';
    c.fillRect(bx - 12, 10, bw + 24, 26);
    c.fillStyle = '#ffd166';
    c.fillRect(bx + bw - 3, 14, 4, 18);
    for (const car of [foe, me]) {
      const p = clamp(mid(car).x / L, 0, 1);
      c.fillStyle = COL[car.slot];
      c.strokeStyle = '#141018';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(bx + p * bw, 23, 8, 0, 7);
      c.fill();
      c.stroke();
    }
    const ahead = mid(me).x >= mid(foe).x;
    c.fillStyle = '#fff';
    c.font = "26px 'Lilita One', sans-serif";
    c.textAlign = 'left';
    c.fillStyle = ahead ? '#4fe0a0' : '#ffb4a8';
    c.fillText(ahead ? '1.' : '2.', 14, 34);
    // eşya kutusu
    c.fillStyle = 'rgba(20,16,24,.65)';
    c.fillRect(14, 48, 64, 64);
    c.strokeStyle = '#ffd166';
    c.lineWidth = 3;
    c.strokeRect(14, 48, 64, 64);
    if (me.item) {
      const names = { nitro: 'Nitro', nail: 'Çivi', oil: 'Yağ', rock: 'Kaya' };
      const cols = { nitro: '#ffb300', nail: '#9aa0a8', oil: '#6b5ea8', rock: '#8b8d92' };
      c.fillStyle = cols[me.item];
      c.beginPath();
      c.arc(46, 76, 18, 0, 7);
      c.fill();
      c.strokeStyle = '#141018';
      c.stroke();
      c.fillStyle = '#fff';
      c.font = "13px 'Lilita One', sans-serif";
      c.textAlign = 'center';
      c.fillText(names[me.item], 46, 106);
    } else {
      c.fillStyle = 'rgba(255,255,255,.35)';
      c.font = '12px Onest, sans-serif';
      c.textAlign = 'center';
      c.fillText('eşya yok', 46, 84);
    }
    const sp = Math.round(Math.abs((me.w[0].vx + me.w[1].vx) / 2) / 4);
    c.textAlign = 'left';
    c.fillStyle = '#fff';
    c.font = "18px 'Lilita One', sans-serif";
    c.fillText(sp + ' km/s', 14, 134);
    if (this.phase === 'count') {
      const n = Math.ceil(3.2 - this.phaseT);
      this.big(c, n > 0 && n <= 3 ? String(n) : 'Hazır', '');
    } else if (this.phase === 'race' && this.phaseT < 1) this.big(c, 'GİT!', '');
    else if (this.phase === 'rend') this.big(c, this.winner === (this.mode === 'online' ? this.slot : 0) ? 'Kazandın!' : 'Kaybettin', this.msg);
    else if (this.phase === 'wait') this.big(c, 'Arkadaşın bağlanıyor…', '');
  }
  big(c, a, b) {
    const vw = this.vw;
    c.fillStyle = 'rgba(20,16,24,.45)';
    c.fillRect(0, 150, vw, 110);
    c.fillStyle = '#ffd166';
    c.textAlign = 'center';
    c.font = "56px 'Lilita One', sans-serif";
    c.fillText(a, vw / 2, 218);
    if (b) {
      c.fillStyle = '#fff';
      c.font = '16px Onest, sans-serif';
      c.fillText(b, vw / 2, 244);
    }
  }
}
