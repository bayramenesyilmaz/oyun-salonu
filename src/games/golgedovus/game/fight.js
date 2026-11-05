// Gölge Dövüş motoru: yandan görünümlü düello. Çevrimdışı (bot / iki kişi) ve online aynı kodla çalışır.
// Online'da her oyuncu yalnızca kendi savaşçısını yönetir; rakibin durumu ağdan gelir.
// Vuruşu saldıran hesaplar ("hit" olayı gönderir), hasarı ve savunmayı vurulan oyuncu uygular.
import { CHARACTERS, BODY, CHAIN } from '../../../characters/roster.js';
import { drawFighter, drawSwoosh } from '../../../characters/rig.js';
import { drawArena, ARENAS } from './arena.js';
import { Sfx } from './sfx.js';
import { Bot } from './bot.js';

export const W = 800;
export const H = 450;
export const GROUND = 372;
const SC = 1.1;
const INK = '#141018';
const FONT = '"Lilita One","Onest",system-ui,sans-serif';
const ROUND_TIME = 60;
const WIN_ROUNDS = 2;
const FREE = new Set(['idle', 'walk', 'jump', 'block']);
const NOPR = { a: 0, b: 0, s: 0, u: 0 };
const NOINP = { l: 0, r: 0, u: 0, d: 0 };

const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;

const KEYS_SOLO = {
  KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', KeyW: 'u', ArrowUp: 'u', Space: 'u', KeyS: 'd', ArrowDown: 'd',
  KeyJ: 'a', KeyF: 'a', KeyZ: 'a', KeyK: 'b', KeyG: 'b', KeyX: 'b', KeyL: 's', KeyH: 's', KeyC: 's',
};
const KEYS_P1 = { KeyA: 'l', KeyD: 'r', KeyW: 'u', KeyS: 'd', KeyF: 'a', KeyG: 'b', KeyH: 's' };
const KEYS_P2 = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', Comma: 'a', Period: 'b', Slash: 's' };

function mkFighter(slot, chId, nick, local) {
  const ch = CHARACTERS[chId] || CHARACTERS.arda;
  return {
    slot, ch, nick: nick || '', local,
    x: slot ? 600 : 200, y: 0, vx: 0, vy: 0, face: slot ? -1 : 1,
    hp: ch.hp, hpMax: ch.hp, hpTrail: ch.hp, meter: 0, guard: 100,
    st: 'idle', mv: null, mvId: '', mvT: 0, hit: false, hitDone: false, hitN: 0, hitT: 0, act: false,
    stun: 0, inv: 0, buf: '', bufT: 0, scd: 0, cb: 0, cbT: 0, lieT: 0, dT: 0, downPend: false, rage: false,
    inp: { l: 0, r: 0, u: 0, d: 0 }, pr: { a: 0, b: 0, s: 0, u: 0 },
    rainQ: null, bot: null, tx: slot ? 600 : 200, ty: 0, lastSt: '', lastMv: '', pulse: 0,
  };
}

export class Match {
  constructor(cv, o) {
    this.cv = cv;
    this.c = cv.getContext('2d');
    this.o = o;
    this.mode = o.mode || 'bot';
    this.cb = o.cb || {};
    this.test = !!o.test;
    this.sfx = new Sfx();
    this.net = o.net || null;
    this.slot = o.slot || 0;
    this.host = this.mode !== 'online' || !!o.host;
    const keys = Object.keys(ARENAS);
    this.arenaKind = o.arena && o.arena !== 'random' ? o.arena : keys[Math.floor(Math.random() * keys.length)];
    const online = this.mode === 'online';
    this.F = [mkFighter(0, o.chars[0], o.nicks?.[0], !online || this.slot === 0), mkFighter(1, o.chars[1], o.nicks?.[1], !online || this.slot === 1)];
    if (this.mode === 'bot') {
      this.F[1].bot = new Bot(o.diff);
      this.F[1].bot.m = this;
      if (o.p0bot) {
        this.F[0].bot = new Bot(o.diff0 || o.diff);
        this.F[0].bot.m = this;
      }
    }
    this.proj = [];
    this.fx = [];
    this.texts = [];
    this.round = 1;
    this.wins = [0, 0];
    this.timer = ROUND_TIME;
    this.time = 0;
    this.phase = online ? 'wait' : 'intro';
    this.phaseT = 0;
    this.banner = null;
    this.finBan = null;
    this.zoom = 1;
    this.camX = W / 2;
    this.shake = 0;
    this.flash = 0;
    this.flashCol = '#fff';
    this.dim = 0;
    this.hitstop = 0;
    this.seq = 0;
    this.paused = false;
    this.stT = 0;
    this.peerReady = false;
    this.rmSelf = false;
    this.rmPeer = false;
    this.winner = -2;
    this.leftMsg = '';
    this.stats = [{ hits: 0, blocks: 0, fins: 0, maxCb: 0, specials: 0 }, { hits: 0, blocks: 0, fins: 0, maxCb: 0, specials: 0 }];
    this.dead = false;
    this._last = 0;
    this.dprW = 0;

    this._kd = (e) => this.onKey(e, true);
    this._ku = (e) => this.onKey(e, false);
    this._rs = () => this.resize();
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    window.addEventListener('resize', this._rs);
    this.resize();

    if (online && this.net) {
      this.net.onState = (s) => this.onNetState(s);
      this.net.onEvent = (e) => this.onNetEvent(e);
      this.net.onLeave = () => this.peerLeft();
      this.net.sendState({ r: 1, x: this.me.x, y: 0, f: this.me.face, s: 'idle', m: '', t: 0, h: this.me.hp, e: 0, g: 100 });
    } else {
      this.startRound(1);
    }
    this.emit();
    if (!o.manual) this._raf = requestAnimationFrame((t) => this.loop(t));
  }

  get me() {
    return this.F[this.mode === 'online' ? this.slot : 0];
  }
  get foe() {
    return this.F[this.mode === 'online' ? 1 - this.slot : 1];
  }
  emit() {
    this.cb.onPhase?.({ phase: this.phase, round: this.round, wins: this.wins.slice(), winner: this.winner, msg: this.leftMsg });
  }

  dispose() {
    this.dead = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    window.removeEventListener('resize', this._rs);
    this.sfx.setMuted(true);
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
    this.cw = this.cv.width;
    this.ch = this.cv.height;
    this.dpr = dpr;
  }

  // ——— girdi ———
  onKey(e, down) {
    if (e.code === 'Escape' && down) {
      this.cb.onPause?.();
      return;
    }
    let slot = 0;
    let k = null;
    if (this.mode === 'local') {
      if (KEYS_P1[e.code]) {
        slot = 0;
        k = KEYS_P1[e.code];
      } else if (KEYS_P2[e.code]) {
        slot = 1;
        k = KEYS_P2[e.code];
      }
    } else {
      k = KEYS_SOLO[e.code];
      slot = this.mode === 'online' ? this.slot : 0;
    }
    if (!k) return;
    e.preventDefault();
    this.sfx.unlock();
    if (down && e.repeat) return;
    this.setKey(slot, k, down);
  }
  setKey(slot, k, down) {
    const f = this.F[slot];
    if (!f || !f.local || f.bot) return;
    if (k === 'a' || k === 'b' || k === 's' || k === 'u') {
      if (down) f.pr[k] = 1;
      if (k === 'u') f.inp.u = down ? 1 : 0;
    } else f.inp[k] = down ? 1 : 0;
  }
  touch(k, down) {
    this.sfx.unlock();
    this.setKey(this.mode === 'online' ? this.slot : 0, k, down);
  }

  // ——— akış ———
  startRound(n) {
    this.round = n;
    for (const f of this.F) {
      f.x = f.tx = f.slot ? 600 : 200;
      f.y = f.ty = 0;
      f.vx = f.vy = 0;
      f.face = f.slot ? -1 : 1;
      f.hp = f.hpMax;
      f.hpTrail = f.hpMax;
      f.st = 'idle';
      f.mv = null;
      f.mvId = '';
      f.mvT = 0;
      f.stun = f.inv = 0;
      f.cb = 0;
      f.guard = 100;
      f.meter = Math.min(f.meter * 0.5, 50);
      f.scd = 0;
      f.buf = '';
      f.downPend = false;
      f.rainQ = null;
      f.inp = { l: 0, r: 0, u: 0, d: 0 };
      f.pr = { a: 0, b: 0, s: 0, u: 0 };
      if (f.bot) {
        f.bot.plan = [];
        f.bot.think = 0.5;
      }
    }
    this.proj.length = 0;
    this.fx.length = 0;
    this.texts.length = 0;
    this.finBan = null;
    this.timer = ROUND_TIME;
    this.phase = 'intro';
    this.phaseT = 0;
    this.winner = -2;
    this.sfx.play('tick');
    this.emit();
  }

  endRound(w, why) {
    if (this.phase !== 'fight') return;
    this.phase = 'rend';
    this.phaseT = 0;
    if (w >= 0) this.wins[w]++;
    this.banner = { text: why === 'ko' ? 'K.O.!' : 'SÜRE DOLDU', sub: w >= 0 ? this.F[w].ch.name + ' raundu aldı' : 'Berabere', t: 0 };
    this.flash = 0.5;
    this.flashCol = '#fff';
    this.winner = w;
    this.sfx.play(why === 'ko' ? 'ko' : 'go');
    if (this.mode === 'online' && this.host) this.net.sendEvent({ k: 'rend', w, why, wn: this.wins.slice(), rd: this.round });
    this.emit();
  }
  endMatch(w) {
    this.phase = 'mend';
    this.phaseT = 0;
    this.winner = w;
    this.banner = null;
    this.rmSelf = this.rmPeer = false;
    this.sfx.play('win');
    if (this.mode === 'online' && this.host) this.net.sendEvent({ k: 'mend', w, wn: this.wins.slice() });
    this.emit();
  }
  rematch() {
    if (this.phase !== 'mend') return;
    if (this.mode !== 'online') {
      this.wins = [0, 0];
      this.F.forEach((f) => (f.meter = 0));
      this.startRound(1);
      return;
    }
    this.rmSelf = true;
    this.net.sendEvent({ k: 'rm' });
    this.tryRematch();
  }
  tryRematch() {
    if (this.host && this.rmSelf && this.rmPeer) {
      this.wins = [0, 0];
      this.F.forEach((f) => (f.meter = 0));
      this.net.sendEvent({ k: 'go', rd: 1, wn: [0, 0] });
      this.startRound(1);
    }
  }
  peerLeft() {
    if (this.phase === 'mend' || this.dead) return;
    this.leftMsg = 'Rakip oyundan ayrıldı.';
    this.wins[this.mode === 'online' ? this.slot : 0] = Math.max(this.wins[this.mode === 'online' ? this.slot : 0], WIN_ROUNDS);
    this.endMatch(this.mode === 'online' ? this.slot : 0);
  }

  // ——— ağ ———
  onNetState(s) {
    if (!s) return this.peerLeft();
    const r = this.foe;
    this.lastPeerAt = performance.now();
    this.peerReady = !!s.r;
    r.tx = s.x;
    r.ty = s.y;
    r.face = s.f;
    if (s.s !== r.st || s.m !== r.mvId) {
      const startedAtk = s.s === 'atk' && (r.st !== 'atk' || s.m !== r.mvId);
      r.st = s.s;
      r.mvId = s.m || '';
      r.mv = r.mvId ? r.ch.moves[r.mvId] || null : null;
      r.mvT = s.t || 0;
      r.dT = 0;
      if (startedAtk) this.onRemoteAttack(r);
      if (s.s === 'ko' && r.hp > 0) this.sfx.play('ko');
    } else if (Math.abs((s.t || 0) - r.mvT) > 0.1) r.mvT = s.t || 0;
    r.hp = s.h;
    r.meter = s.e;
    r.guard = s.g;
    if (this.phase === 'wait' && this.host && this.peerReady) {
      this.net.sendEvent({ k: 'go', rd: 1, wn: [0, 0] });
      this.startRound(1);
    }
  }
  onRemoteAttack(r) {
    const mv = r.mv;
    if (!mv) return;
    if (mv.kind === 'fin') this.beginFin(r);
    else if (mv.kind !== 'heal' && mv.kind !== 'counter') this.sfx.play(mv.proj ? 'arrow' : 'swing');
  }
  onNetEvent(e) {
    switch (e.k) {
      case 'hit': {
        if (this.phase !== 'fight' || e.rd !== this.round) return;
        const res = this.applyHit(this.me, e);
        this.net.sendEvent({ k: 'res', r: res, pj: e.pj || '' });
        if (e.pj) this.proj = this.proj.filter((p) => p.id !== e.pj);
        break;
      }
      case 'res': {
        if (e.r === 'blk' || e.r === 'gb') this.spark(this.foe.x - this.me.face * 14, this.foe.y + 70, '#9ad4ff', 6);
        if (e.r === 'ctr') this.text(this.me.x, 190, 'KARŞILIK!', '#ffd166');
        break;
      }
      case 'pj':
        this.proj.push({ id: e.id, own: this.foe.slot, x: e.x, y: e.y, vx: e.vx, vy: e.vy || 0, life: e.life, spr: e.spr, loc: false, low: !!e.low });
        if (e.spr === 'arrow' || e.spr === 'bolt') this.sfx.play('arrow');
        break;
      case 'fx':
        if (e.t === 'cut') this.fx.push({ t: 'cut', x1: e.x1, x2: e.x2, y: GROUND - 70, life: 0.35, max: 0.35 });
        break;
      case 'go':
        this.wins = e.wn || [0, 0];
        this.rmSelf = this.rmPeer = false;
        this.startRound(e.rd);
        break;
      case 'rend':
        if (this.phase === 'fight') {
          this.wins = e.wn || this.wins;
          this.phase = 'rend';
          this.phaseT = 0;
          this.banner = { text: e.why === 'ko' ? 'K.O.!' : 'SÜRE DOLDU', sub: e.w >= 0 ? this.F[e.w].ch.name + ' raundu aldı' : 'Berabere', t: 0 };
          this.flash = 0.5;
          this.winner = e.w;
          this.sfx.play(e.why === 'ko' ? 'ko' : 'go');
          this.emit();
        }
        break;
      case 'mend':
        this.wins = e.wn || this.wins;
        this.phase = 'mend';
        this.phaseT = 0;
        this.winner = e.w;
        this.banner = null;
        this.sfx.play('win');
        this.emit();
        break;
      case 'rm':
        this.rmPeer = true;
        this.tryRematch();
        break;
      default:
        break;
    }
  }

  // ——— ana döngü ———
  loop(t) {
    if (this.dead) return;
    const dt = Math.min(0.033, (t - (this._last || t)) / 1000 || 0.016);
    this._last = t;
    this.tick(dt);
    this.draw();
    this._raf = requestAnimationFrame((tt) => this.loop(tt));
  }
  // test için: n kare ilerlet
  stepFrames(n, dt = 1 / 60) {
    for (let i = 0; i < n; i++) this.tick(dt);
    this.draw();
  }

  tick(dt) {
    if (this.paused && this.mode !== 'online') return;
    this.time += dt;
    this.phaseT += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.hitstop > 0 && this.mode !== 'online') {
      this.hitstop -= dt;
      this.updateFx(dt);
      return;
    }
    const [a, b] = this.F;
    const fighting = this.phase === 'fight';

    if (this.phase === 'intro') {
      if (this.phaseT > 2.0) {
        this.phase = 'fight';
        this.phaseT = 0;
        this.sfx.play('go');
        this.emit();
      } else if (this.phaseT > 1.3 && !this._tick2) {
        this._tick2 = true;
      }
    }
    if (this.phase === 'rend') {
      for (const f of this.F) if (f.local && f.slot === this.winner && FREE.has(f.st)) f.st = 'win';
      if (this.phaseT > 3 && this.host) {
        const w = this.winner;
        const done = (w >= 0 && this.wins[w] >= WIN_ROUNDS) || this.round >= 5;
        if (done) {
          const w2 = this.wins[0] === this.wins[1] ? -1 : this.wins[0] > this.wins[1] ? 0 : 1;
          this.endMatch(w2);
        } else {
          if (this.mode === 'online') this.net.sendEvent({ k: 'go', rd: this.round + 1, wn: this.wins.slice() });
          this.startRound(this.round + 1);
        }
      }
    }
    if (fighting) {
      this.timer -= dt;
      if (this.host) {
        const ka = a.hp <= 0;
        const kb = b.hp <= 0;
        if (ka || kb) this.endRound(ka && kb ? -1 : ka ? 1 : 0, 'ko');
        else if (this.timer <= 0) {
          const fa = a.hp / a.hpMax;
          const fb = b.hp / b.hpMax;
          this.endRound(Math.abs(fa - fb) < 0.001 ? -1 : fa > fb ? 0 : 1, 'time');
        }
      }
    }

    for (const f of this.F) {
      const o = this.F[1 - f.slot];
      f.rage = f.hp / f.hpMax < 0.3 && f.hp > 0;
      f.hpTrail += (f.hp - f.hpTrail) * Math.min(1, dt * 2.2);
      if (f.hpTrail < f.hp) f.hpTrail = f.hp;
      if (f.local) {
        if (fighting && f.bot) f.bot.update(f, o, dt);
        this.stepLocal(f, o, dt, fighting);
      } else this.stepRemote(f, dt);
    }
    // iki savaşçı birbirinin içinden geçmesin
    if (a.y < 40 && b.y < 40) {
      const d = b.x - a.x;
      const min = 38;
      if (Math.abs(d) < min) {
        const push = (min - Math.abs(d)) / 2;
        const s = d >= 0 ? 1 : -1;
        if (a.local) a.x = clamp(a.x - s * push, 40, 760);
        if (b.local) b.x = clamp(b.x + s * push, 40, 760);
      }
    }
    this.updateProj(dt);
    this.updateFx(dt);

    // kamera ve yakınlaştırma
    const fin = this.F.find((f) => f.st === 'atk' && f.mv && f.mv.kind === 'fin' && f.mvT < f.mv.su + 0.25);
    const tz = fin ? 1.22 : 1;
    this.zoom += (tz - this.zoom) * Math.min(1, dt * 6);
    this.dim += ((fin ? 0.4 : 0) - this.dim) * Math.min(1, dt * 8);
    const mid = fin ? fin.x : (a.x + b.x) / 2;
    this.camX += (W / 2 + (mid - W / 2) * (fin ? 0.7 : 0.18) - this.camX) * Math.min(1, dt * 5);
    if (this.finBan) {
      this.finBan.t += dt;
      if (this.finBan.t > 1.1) this.finBan = null;
    }
    if (this.banner) this.banner.t += dt;

    if (this.mode === 'online' && this.net) {
      this.sendNet(dt);
      // rakipten uzun süre haber yoksa (sekme donmuş, bağlantı kopmuş) maçı bitir
      if (this.lastPeerAt && this.phase !== 'wait' && this.phase !== 'mend' && performance.now() - this.lastPeerAt > 9000) this.peerLeft();
    }
  }

  sendNet(dt) {
    const f = this.me;
    this.stT += dt;
    const changed = f.st !== f.lastSt || f.mvId !== f.lastMv;
    if (this.stT >= 1 / 15 || (changed && this.stT >= 0.03)) {
      this.stT = 0;
      f.lastSt = f.st;
      f.lastMv = f.mvId;
      this.net.sendState({ r: 1, x: r1(f.x), y: r1(f.y), f: f.face, s: f.st, m: f.mvId, t: r3(f.mvT), h: r1(f.hp), e: r1(f.meter), g: r1(f.guard) });
    }
  }

  stepRemote(f, dt) {
    f.x += (f.tx - f.x) * Math.min(1, dt * 22);
    f.y += (f.ty - f.y) * Math.min(1, dt * 22);
    if (f.st === 'atk') f.mvT += dt;
    if (f.st === 'down' || f.st === 'ko') f.dT += dt;
    f.hpTrail += (f.hp - f.hpTrail) * Math.min(1, dt * 2.2);
  }

  // ——— yerel savaşçı ———
  stepLocal(f, o, dt, fighting) {
    const inp = fighting ? f.inp : NOINP;
    const pr = fighting ? f.pr : NOPR;
    f.inv = Math.max(0, f.inv - dt);
    f.scd = Math.max(0, f.scd - dt);
    f.bufT -= dt;
    f.cbT -= dt;
    if (f.cbT <= 0) f.cb = 0;
    if (f.st !== 'block') f.guard = Math.min(100, f.guard + 16 * dt);

    if (f.st === 'ko') {
      f.dT += dt;
    } else if (f.st === 'down') {
      f.dT += dt;
      f.lieT -= dt;
      if (f.lieT <= 0 && f.y <= 0) {
        f.st = 'idle';
        f.inv = 0.5;
        f.dT = 0;
      }
    } else if (f.st === 'hurt') {
      f.stun -= dt;
      if (f.stun <= 0 && f.y <= 0) f.st = 'idle';
    } else if (f.st === 'atk') {
      this.stepAttack(f, o, dt, pr);
    } else if (fighting && FREE.has(f.st)) {
      this.stepControl(f, o, dt, inp, pr);
    } else if (!fighting && FREE.has(f.st)) {
      f.vx *= 1 - Math.min(1, 10 * dt);
      if (f.y <= 0) f.st = 'idle';
      f.face = o.x >= f.x ? 1 : -1;
    }
    this.physics(f, dt);
    f.pr = { a: 0, b: 0, s: 0, u: 0 };
  }

  stepControl(f, o, dt, inp, pr) {
    const grounded = f.y <= 0 && f.vy <= 0;
    if (grounded && inp.d) {
      f.st = 'block';
      f.vx = 0;
      f.face = o.x >= f.x ? 1 : -1;
      return;
    }
    if (f.st === 'block') f.st = 'idle';
    if (grounded) {
      if (pr.a) return this.start(f, 'l1');
      if (pr.b) return this.start(f, 'h');
      if (pr.s) {
        if (f.meter >= 100) {
          f.meter = 0;
          return this.start(f, 'f');
        }
        if (f.scd <= 0) return this.start(f, 's');
      }
      if (pr.u) {
        f.vy = BODY.jumpV;
        f.st = 'jump';
        this.sfx.play('jump');
      }
    }
    const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    const sp = BODY.speed * f.ch.speed * (f.rage ? 1.08 : 1);
    if (grounded) {
      f.vx = dir * sp * (dir === f.face ? 1 : 0.85);
      if (f.st !== 'jump') f.st = dir ? 'walk' : 'idle';
      f.face = o.x >= f.x ? 1 : -1;
    } else {
      f.vx += dir * 700 * dt;
      f.vx = clamp(f.vx, -sp, sp);
      if (f.st !== 'jump') f.st = 'jump';
    }
  }

  start(f, id) {
    const mv = f.ch.moves[id];
    if (!mv) return;
    f.st = 'atk';
    f.mv = mv;
    f.mvId = id;
    f.mvT = 0;
    f.hit = false;
    f.hitDone = false;
    f.hitN = 0;
    f.hitT = 0;
    f.act = false;
    f.buf = '';
    f.bufT = 0;
    if (id === 's') {
      f.scd = f.ch.scd;
      this.stats[f.slot].specials++;
    }
    if (mv.kind === 'fin') {
      f.inv = mv.su;
      this.stats[f.slot].fins++;
      this.beginFin(f);
    }
    if (mv.kind === 'counter') this.sfx.play('ui');
  }
  beginFin(f) {
    const mv = f.mv;
    this.finBan = { name: mv.name, col: f.ch.colors.accent, who: f.slot, t: 0 };
    this.sfx.play('charge');
    this.flash = 0.2;
    this.flashCol = f.ch.colors.accent;
  }

  stepAttack(f, o, dt, pr) {
    const mv = f.mv;
    f.mvT += dt;
    if (pr.a) {
      f.buf = 'a';
      f.bufT = 0.4;
    }
    if (pr.b) {
      f.buf = 'b';
      f.bufT = 0.4;
    }
    const aStart = mv.su;
    const aEnd = mv.su + mv.ac;
    if (!f.act && f.mvT >= aStart) {
      f.act = true;
      this.onActive(f, o, mv);
    }
    if (f.mvT >= aStart && f.mvT <= aEnd) this.activeFrame(f, o, mv, dt);
    else if (f.mvT > aEnd) f.vx *= 1 - Math.min(1, 9 * dt);
    else f.vx *= 1 - Math.min(1, 12 * dt);
    // zincir: vuruş değdiyse ya da ok atıyorsa sıradaki tuş kabul edilir
    if (f.mvT >= aEnd && f.buf && f.bufT > 0 && CHAIN[f.mvId] && (f.hit || mv.kind === 'shoot')) {
      const next = CHAIN[f.mvId][f.buf];
      if (next && f.ch.moves[next]) {
        this.start(f, next);
        return;
      }
    }
    if (f.mvT >= aEnd + mv.rc) {
      f.st = f.y > 0 ? 'jump' : 'idle';
      f.mv = null;
      f.mvId = '';
      f.vx = 0;
    }
  }

  onActive(f, o, mv) {
    const kind = mv.kind;
    if (kind === 'fin') this.sfx.play('fin');
    else if (kind === 'wave') this.sfx.play('wave');
    else if (kind !== 'heal' && kind !== 'counter' && !mv.proj) this.sfx.play('swing');
    if (mv.proj) this.spawnProj(f, mv);
    if (kind === 'vault') {
      f.vx = f.face * mv.lunge;
      f.vy = 300;
    }
    if (kind !== 'fin') return;
    const dx = o.x - f.x;
    const dir = dx >= 0 ? 1 : -1;
    if (mv.fx === 'dashcut') {
      const old = f.x;
      if (Math.abs(dx) <= mv.reach && o.y < 120) {
        this.hitOn(f, o, mv, { dmg: mv.dmg });
        f.x = clamp(o.x + dir * 80, 50, 750);
        f.face = -dir;
      } else {
        f.x = clamp(f.x + f.face * 360, 50, 750);
      }
      this.fx.push({ t: 'cut', x1: old, x2: f.x, y: GROUND - 70, life: 0.35, max: 0.35 });
      if (this.net) this.net.sendEvent({ k: 'fx', t: 'cut', x1: r1(old), x2: r1(f.x) });
      this.flash = 0.25;
      this.flashCol = '#fff';
      this.shake = 8;
    } else if (mv.fx === 'quake') {
      this.shake = 14;
      this.ring(f.x, GROUND, '#ffd166', 260);
      for (const d of [-1, 1]) {
        this.addProj(f, { x: f.x + d * 30, y: 0, vx: d * 720, life: 0.7, dmg: mv.dmg, kb: mv.kb, stun: 0.6, down: true, low: true, unb: true, spr: 'quake' });
      }
    } else if (mv.fx === 'rain') {
      f.rainQ = [];
      for (let i = 0; i < 9; i++) f.rainQ.push({ t: 0.1 + i * 0.09, x: clamp(o.x + (i % 2 ? 1 : -1) * rnd(0, 150), 40, 760) });
      f.rainQ.push({ t: 0.3, x: o.x });
    } else if (mv.fx === 'whirl') {
      this.shake = 5;
    } else if (mv.fx === 'charge') {
      f.vx = f.face * mv.lunge;
    }
  }

  activeFrame(f, o, mv, dt) {
    const kind = mv.kind;
    if (mv.lunge && kind !== 'vault' && (kind !== 'fin' || mv.fx === 'charge')) f.vx = f.face * mv.lunge;
    if (kind === 'heal') {
      const before = f.hp;
      f.hp = Math.min(f.hpMax, f.hp + (mv.heal / mv.ac) * dt);
      if (f.hp > before && Math.random() < dt * 8) this.text(f.x, 240 + rnd(-10, 10), '+', '#7be08a');
      return;
    }
    if (kind === 'fin' && mv.fx === 'rain' && f.rainQ) {
      const t = f.mvT - mv.su;
      for (const q of f.rainQ) {
        if (!q.done && t >= q.t) {
          q.done = true;
          this.addProj(f, { x: q.x, y: 430, vx: 0, vy: -1000, life: 0.7, dmg: mv.dmg, kb: mv.kb, stun: 0.35, down: false, unb: true, spr: 'arrow', rain: true });
        }
      }
      return;
    }
    if (!mv.reach && kind !== 'fin') return;
    if (kind === 'fin' && (mv.fx === 'dashcut' || mv.fx === 'quake')) return;
    if (kind === 'wave' || mv.proj) return;
    // vuruş kutusu
    const both = mv.both || kind === 'spin';
    const x0 = both ? f.x - mv.reach : f.face > 0 ? f.x + 6 : f.x - mv.reach;
    const x1 = both ? f.x + mv.reach : f.face > 0 ? f.x + mv.reach : f.x - 6;
    const y0 = f.y + mv.y0;
    const y1 = f.y + mv.y1;
    const hx = BODY.half;
    const overlap = o.x + hx > x0 && o.x - hx < x1 && o.y + BODY.h > y0 && o.y < y1;
    if (mv.hits) {
      f.hitT -= dt;
      if (overlap && f.hitN < mv.hits && f.hitT <= 0) {
        f.hitN++;
        f.hitT = mv.ac / mv.hits;
        this.hitOn(f, o, mv, { dmg: mv.dmg, down: f.hitN === mv.hits ? mv.down : false });
      }
    } else if (overlap && !f.hitDone) {
      f.hitDone = true;
      this.hitOn(f, o, mv, { dmg: mv.dmg });
      if (kind === 'fin' && mv.fx === 'charge') {
        f.vx = 0;
        f.mvT = mv.su + mv.ac;
      }
    }
  }

  // ——— mermi ———
  spawnProj(f, mv) {
    const p = mv.proj;
    for (let i = 0; i < p.n; i++) {
      const ang = (p.spread || 0) * (i - (p.n - 1) / 2) * (Math.PI / 180);
      this.addProj(f, {
        x: f.x + f.face * 34,
        y: f.y + p.y,
        vx: f.face * p.vx * Math.cos(ang),
        vy: p.vx * Math.sin(ang),
        life: p.life,
        dmg: p.dmg,
        kb: p.kb,
        stun: p.stun,
        down: !!p.down,
        pierce: !!p.pierce,
        low: !!p.low,
        spr: p.spr,
      });
    }
  }
  addProj(f, o) {
    const pj = { id: f.slot + '-' + ++this.seq, own: f.slot, loc: true, hitSet: null, ...o };
    this.proj.push(pj);
    if (this.mode === 'online' && !o.rain) {
      this.net.sendEvent({ k: 'pj', id: pj.id, x: r1(pj.x), y: r1(pj.y), vx: r1(pj.vx), vy: r1(pj.vy || 0), life: pj.life, spr: pj.spr, low: pj.low ? 1 : 0 });
    }
    return pj;
  }
  updateProj(dt) {
    for (const p of this.proj) {
      p.x += p.vx * dt;
      p.y += (p.vy || 0) * dt;
      p.life -= dt;
      if (p.loc && p.life > 0) {
        const f = this.F[p.own];
        const o = this.F[1 - p.own];
        const hx = BODY.half + (p.spr === 'quake' || p.spr === 'wave' ? 26 : 8);
        const inX = Math.abs(p.x - o.x) < hx;
        let inY = p.y > o.y - 6 && p.y < o.y + BODY.h + 6;
        if (p.low) inY = o.y < 28;
        if (inX && inY && o.st !== 'ko' && !(p.hitSet && p.hitSet.has(o))) {
          this.hitOn(f, o, { name: p.spr, big: p.pierce || p.spr === 'quake' }, { dmg: p.dmg, kb: p.kb, stun: p.stun, down: p.down, unb: p.unb, pj: p.id, dir: p.vx >= 0 ? 1 : -1 });
          if (p.pierce) (p.hitSet = p.hitSet || new Set()).add(o);
          else p.life = 0;
        }
      }
      if (p.y < -20) p.life = 0;
    }
    this.proj = this.proj.filter((p) => p.life > 0 && p.x > -120 && p.x < W + 120);
  }

  // ——— vuruş ———
  hitOn(f, o, mv, ex) {
    const rage = f.hp / f.hpMax < 0.3 ? 1.2 : 1;
    const mul = 1 + Math.min(f.cb, 6) * 0.04;
    const info = {
      fr: f.slot,
      dmg: r1((ex.dmg ?? mv.dmg) * rage * mul),
      kb: ex.kb ?? mv.kb ?? 150,
      stun: ex.stun ?? mv.stun ?? 0.3,
      down: ex.down ?? mv.down ?? false,
      unb: !!(ex.unb ?? mv.unb),
      dir: ex.dir ?? (o.x >= f.x ? 1 : -1),
      big: !!mv.big,
      pj: ex.pj || '',
      rd: this.round,
    };
    if (o.local) {
      const res = this.applyHit(o, info);
      this.afterHit(f, o, res, info);
    } else {
      this.net.sendEvent({ k: 'hit', ...info });
      this.afterHit(f, o, 'hit', info);
    }
  }
  afterHit(f, o, res, info) {
    if (res === 'miss') return;
    f.hit = true;
    const st = this.stats[f.slot];
    const cx = o.x - info.dir * 10;
    const cy = o.y + 72;
    if (res === 'ctr') {
      this.text(o.x, 190, 'KARŞILIK!', '#ffd166');
      return;
    }
    if (res === 'blk' || res === 'gb') {
      st.blocks++;
      this.spark(cx, cy, '#9ad4ff', 6);
      f.meter = Math.min(100, f.meter + info.dmg * 0.4);
      if (res === 'gb') this.text(o.x, 190, 'GUARD KIRILDI!', '#9ad4ff');
      return;
    }
    st.hits++;
    f.cb++;
    f.cbT = 1.6;
    st.maxCb = Math.max(st.maxCb, f.cb);
    f.meter = Math.min(100, f.meter + info.dmg * (f.rage ? 1.4 : 0.95));
    this.spark(cx, cy, info.big ? '#ffd166' : '#fff', info.big ? 14 : 8);
    this.text(o.x + rnd(-14, 14), 230, String(Math.round(info.dmg)), info.big ? '#ffd166' : '#fff');
    this.sfx.play(info.big ? 'hitBig' : 'hit');
    this.shake = Math.max(this.shake, info.big ? 9 : 3);
    this.hitstop = info.big ? 0.12 : 0.05;
    if (info.big) this.ring(cx, GROUND - cy, '#ffd166', 90);
  }

  // vurulan tarafta çalışır; sonuç: hit | blk | gb | ctr | miss
  applyHit(o, info) {
    if (o.inv > 0 || o.st === 'ko' || this.phase !== 'fight') return 'miss';
    // karşı duruş
    if (o.st === 'atk' && o.mv && o.mv.kind === 'counter' && o.mvT >= o.mv.su && o.mvT <= o.mv.su + o.mv.ac && !info.unb) {
      this.start(o, 'c');
      o.inv = 0.35;
      o.face = info.dir > 0 ? -1 : 1;
      this.sfx.play('block');
      this.spark(o.x + o.face * 26, o.y + 70, '#ffd166', 10);
      return 'ctr';
    }
    const frontal = info.dir === -o.face;
    if (o.st === 'block' && frontal && !info.unb) {
      o.guard -= info.dmg * 2.4;
      o.hp = Math.max(1, o.hp - Math.max(0.4, info.dmg * 0.12));
      o.vx = info.dir * Math.min(220, info.kb * 0.6);
      o.meter = Math.min(100, o.meter + info.dmg * 0.25);
      this.sfx.play('block');
      this.spark(o.x + o.face * 24, o.y + 70, '#9ad4ff', 6);
      if (o.guard <= 0) {
        o.guard = 40;
        o.st = 'hurt';
        o.stun = 0.9;
        o.vx = info.dir * 160;
        this.sfx.play('guard');
        this.shake = 8;
        return 'gb';
      }
      return 'blk';
    }
    o.hp -= info.dmg;
    o.meter = Math.min(100, o.meter + info.dmg * 0.6);
    o.mv = null;
    o.mvId = '';
    o.rainQ = null;
    o.buf = '';
    o.vx = info.dir * info.kb;
    o.cb = 0;
    if (o.hp <= 0) {
      o.hp = 0;
      o.st = 'ko';
      o.dT = 0;
      o.vy = 330;
      o.vx = info.dir * Math.max(240, info.kb);
      this.sfx.play('ko');
      this.flash = 0.35;
      this.shake = 14;
      return 'hit';
    }
    o.st = 'hurt';
    o.dT = 0;
    if (info.down) {
      o.vy = 270;
      o.stun = 9;
      o.downPend = true;
    } else {
      o.stun = info.stun;
      if (o.y > 0) o.vy = Math.max(o.vy, 120);
    }
    return 'hit';
  }

  physics(f, dt) {
    if (f.y > 0 || f.vy > 0) {
      f.vy -= BODY.grav * dt;
      f.y += f.vy * dt;
      if (f.y <= 0) {
        const fall = f.vy;
        f.y = 0;
        f.vy = 0;
        if (f.st === 'jump') f.st = 'idle';
        if (f.st === 'hurt' && f.downPend) {
          f.st = 'down';
          f.lieT = 0.6;
          f.dT = 0;
          f.downPend = false;
          this.dust(f.x);
          this.sfx.play('land');
          this.shake = Math.max(this.shake, 4);
        } else if (fall < -350) {
          this.sfx.play('land');
          this.dust(f.x);
        }
        if (f.st === 'ko') f.vx *= 0.5;
      }
    }
    f.x += f.vx * dt;
    if (f.st === 'hurt' || f.st === 'down' || f.st === 'ko') f.vx *= 1 - Math.min(1, 5 * dt);
    f.x = clamp(f.x, 40, 760);
  }

  // ——— efektler ———
  spark(x, cy, col, n) {
    const y = GROUND - cy;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2);
      const s = rnd(120, 360);
      this.fx.push({ t: 'sp', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rnd(0.15, 0.35), max: 0.35, col, sz: rnd(2, 4.5) });
    }
    this.fx.push({ t: 'star', x, y, life: 0.16, max: 0.16, col });
  }
  ring(x, y, col, r) {
    this.fx.push({ t: 'ring', x, y, life: 0.4, max: 0.4, col, r });
  }
  dust(x) {
    for (let i = 0; i < 6; i++) this.fx.push({ t: 'sp', x: x + rnd(-14, 14), y: GROUND - 2, vx: rnd(-90, 90), vy: rnd(-90, -20), life: 0.35, max: 0.35, col: '#d8cbb0', sz: rnd(3, 6) });
  }
  text(x, y, s, col) {
    this.texts.push({ x, y, s, col, life: 0.9, max: 0.9 });
  }
  updateFx(dt) {
    for (const e of this.fx) {
      e.life -= dt;
      if (e.t === 'sp') {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vy += 500 * dt;
      }
    }
    this.fx = this.fx.filter((e) => e.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 40 * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  // ——— çizim ———
  draw() {
    const c = this.c;
    const cw = this.cw;
    const chh = this.ch;
    const hs = Math.min(cw / W, chh / H);
    this.hs = hs;
    this.ox = (cw - W * hs) / 2;
    this.oy = (chh - H * hs) / 2;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#1b1432';
    c.fillRect(0, 0, cw, chh);

    // dünya (kamera)
    c.save();
    const z = this.zoom;
    const sx = this.shake ? rnd(-this.shake, this.shake) : 0;
    const sy = this.shake ? rnd(-this.shake, this.shake) : 0;
    c.translate(cw / 2 + sx * hs, chh / 2 + sy * hs);
    c.scale(hs * z, hs * z);
    c.translate(-this.camX, -(H / 2 + (z - 1) * 30));
    drawArena(c, this.arenaKind, this.time, GROUND);
    if (this.dim > 0.01) {
      c.fillStyle = 'rgba(8,4,20,' + this.dim + ')';
      c.fillRect(-700, -300, 2200, 1000);
    }

    for (const f of this.F) {
      const gx = f.x;
      const sh = clamp(1 - f.y / 220, 0.4, 1);
      c.fillStyle = 'rgba(0,0,0,0.32)';
      c.beginPath();
      c.ellipse(gx, GROUND + 4, 36 * sh, 7 * sh, 0, 0, 7);
      c.fill();
    }
    // kesikler
    for (const e of this.fx) if (e.t === 'cut') this.drawCut(c, e);
    // savaşçılar: saldıran öne
    const order = [...this.F].sort((p, q) => (p.st === 'atk' ? 1 : 0) - (q.st === 'atk' ? 1 : 0));
    for (const f of order) {
      const o = { x: f.x, y: GROUND - f.y, scale: SC, face: f.face, rage: f.rage, alpha: f.inv > 0 && f.st !== 'atk' && Math.floor(this.time * 20) % 2 ? 0.55 : 1 };
      drawFighter(c, f, this.time, o);
      drawSwoosh(c, f, o);
    }
    this.drawProj(c);
    for (const e of this.fx) this.drawFx(c, e);
    for (const t of this.texts) {
      const a = clamp(t.life / 0.35, 0, 1);
      c.globalAlpha = a;
      c.font = '26px ' + FONT;
      c.textAlign = 'center';
      c.lineWidth = 5;
      c.strokeStyle = INK;
      c.strokeText(t.s, t.x, t.y);
      c.fillStyle = t.col;
      c.fillText(t.s, t.x, t.y);
      c.globalAlpha = 1;
    }
    c.restore();

    if (this.flash > 0) {
      c.fillStyle = this.flashCol;
      c.globalAlpha = clamp(this.flash * 2, 0, 0.55);
      c.fillRect(0, 0, cw, chh);
      c.globalAlpha = 1;
    }

    // HUD
    c.save();
    c.translate(this.ox, this.oy);
    c.scale(hs, hs);
    this.drawHud(c);
    c.restore();
  }

  drawCut(c, e) {
    const a = clamp(e.life / e.max, 0, 1);
    c.save();
    c.globalAlpha = a;
    c.strokeStyle = '#ffffff';
    c.lineCap = 'round';
    c.lineWidth = 14 * a + 2;
    c.beginPath();
    c.moveTo(e.x1, e.y - 12);
    c.lineTo(e.x2, e.y + 12);
    c.stroke();
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }

  drawProj(c) {
    for (const p of this.proj) {
      const dir = p.vx >= 0 ? 1 : -1;
      const gy = GROUND - p.y;
      c.save();
      c.translate(p.x, gy);
      if (p.spr === 'wave' || p.spr === 'quake') {
        const h = p.spr === 'quake' ? 56 : 34;
        c.scale(dir, 1);
        c.beginPath();
        c.moveTo(-18, 0);
        c.quadraticCurveTo(-4, -h, 20, -h * 0.2);
        c.lineTo(22, 0);
        c.closePath();
        c.fillStyle = p.spr === 'quake' ? '#ffd166' : '#c9a26b';
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = INK;
        c.stroke();
      } else {
        const ang = Math.atan2(-(p.vy || 0), p.vx || 0.0001) + (p.vx < 0 ? 0 : 0);
        c.rotate(Math.atan2(-(p.vy || 0), p.vx));
        const L = p.spr === 'bolt' ? 40 : 28;
        c.lineCap = 'round';
        c.strokeStyle = INK;
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(-L, 0);
        c.lineTo(0, 0);
        c.stroke();
        c.strokeStyle = p.spr === 'bolt' ? '#ffd166' : '#e6edf5';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(-L, 0);
        c.lineTo(0, 0);
        c.stroke();
        c.fillStyle = p.spr === 'bolt' ? '#ffd166' : '#e6edf5';
        c.strokeStyle = INK;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(0, -5);
        c.lineTo(10, 0);
        c.lineTo(0, 5);
        c.closePath();
        c.fill();
        c.stroke();
        void ang;
      }
      c.restore();
    }
  }

  drawFx(c, e) {
    const a = clamp(e.life / e.max, 0, 1);
    if (e.t === 'sp') {
      c.globalAlpha = a;
      c.fillStyle = e.col;
      c.beginPath();
      c.arc(e.x, e.y, e.sz * (0.4 + a * 0.6), 0, 7);
      c.fill();
      c.globalAlpha = 1;
    } else if (e.t === 'ring') {
      c.globalAlpha = a;
      c.strokeStyle = e.col;
      c.lineWidth = 6 * a + 1;
      c.beginPath();
      c.arc(e.x, e.y, e.r * (1 - a) + 8, 0, 7);
      c.stroke();
      c.globalAlpha = 1;
    } else if (e.t === 'star') {
      c.globalAlpha = a;
      c.fillStyle = e.col;
      c.strokeStyle = INK;
      c.lineWidth = 2.5;
      const R = 12 + 22 * (1 - a);
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? R * 0.45 : R;
        const ang = (i / 16) * Math.PI * 2;
        c.lineTo(e.x + Math.cos(ang) * r, e.y + Math.sin(ang) * r);
      }
      c.closePath();
      c.fill();
      c.stroke();
      c.globalAlpha = 1;
    }
  }

  drawHud(c) {
    const [a, b] = this.F;
    c.textBaseline = 'alphabetic';
    const bar = (f, x, right) => {
      const w = 330;
      const hy = 16;
      const frac = clamp(f.hp / f.hpMax, 0, 1);
      const tr = clamp(f.hpTrail / f.hpMax, 0, 1);
      c.lineWidth = 4;
      c.strokeStyle = INK;
      c.fillStyle = '#2a2140';
      c.beginPath();
      c.roundRect ? c.roundRect(x, hy, w, 24, 8) : c.rect(x, hy, w, 24);
      c.fill();
      c.stroke();
      const fillX = (fr) => (right ? x + 3 : x + w - 3 - (w - 6) * fr);
      c.fillStyle = '#ffd166';
      c.fillRect(fillX(tr), hy + 3, (w - 6) * tr, 18);
      c.fillStyle = frac > 0.3 ? '#6cbf6a' : '#e0675a';
      c.fillRect(fillX(frac), hy + 3, (w - 6) * frac, 18);
      // enerji
      const my = hy + 30;
      c.fillStyle = '#2a2140';
      c.fillRect(x, my, w, 9);
      c.strokeRect(x, my, w, 9);
      const mf = clamp(f.meter / 100, 0, 1);
      const full = f.meter >= 100;
      c.fillStyle = full ? (Math.floor(this.time * 8) % 2 ? '#fff3a0' : '#ffb347') : '#4aa3d8';
      const mx = right ? x + 2 : x + w - 2 - (w - 4) * mf;
      c.fillRect(mx, my + 2, (w - 4) * mf, 5);
      // isim
      c.font = '17px ' + FONT;
      c.textAlign = right ? 'left' : 'right';
      const nx = right ? x : x + w;
      c.lineWidth = 4;
      c.strokeStyle = INK;
      const label = f.ch.name.toUpperCase() + (f.nick ? '  ·  ' + f.nick : '');
      c.strokeText(label, nx, hy + 56);
      c.fillStyle = f.ch.colors.accent === '#e6edf5' ? '#fff' : f.ch.colors.body;
      c.fillText(label, nx, hy + 56);
      if (full) {
        c.font = '13px ' + FONT;
        c.textAlign = right ? 'right' : 'left';
        const t2 = 'BİTİRİŞ HAZIR';
        const tx = right ? x + w : x;
        c.strokeText(t2, tx, hy + 56);
        c.fillStyle = '#ffd166';
        c.fillText(t2, tx, hy + 56);
      }
      // özel bekleme
      const cdW = 56;
      const cdx = right ? x : x + w - cdW;
      c.fillStyle = '#2a2140';
      c.fillRect(cdx, hy + 62, cdW, 6);
      c.fillStyle = f.scd <= 0 ? '#9ad4ff' : '#6b6385';
      const cf = f.scd <= 0 ? 1 : 1 - f.scd / f.ch.scd;
      c.fillRect(cdx, hy + 62, cdW * cf, 6);
      // raund puanları
      for (let i = 0; i < WIN_ROUNDS; i++) {
        const px = right ? x + w - 12 - i * 22 : x + 12 + i * 22;
        c.beginPath();
        c.arc(px, hy + 72, 7, 0, 7);
        c.fillStyle = this.wins[f.slot] > i ? '#ffd166' : '#2a2140';
        c.fill();
        c.lineWidth = 3;
        c.stroke();
      }
    };
    bar(a, 20, false);
    bar(b, 450, true);
    // zamanlayıcı
    c.beginPath();
    c.arc(400, 36, 27, 0, 7);
    c.fillStyle = '#2a2140';
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = INK;
    c.stroke();
    c.font = '28px ' + FONT;
    c.textAlign = 'center';
    c.fillStyle = this.timer < 10 && this.phase === 'fight' ? '#ff6b5e' : '#fff';
    c.fillText(String(Math.max(0, Math.ceil(this.timer))), 400, 46);
    // kombo
    for (const f of this.F) {
      if (f.cb >= 2 && f.cbT > 0) {
        const x = f.slot ? 640 : 160;
        const pop = 1 + Math.max(0, f.cbT - 1.4) * 1.5;
        c.save();
        c.translate(x, 150);
        c.scale(pop, pop);
        c.font = '34px ' + FONT;
        c.textAlign = 'center';
        c.lineWidth = 6;
        c.strokeStyle = INK;
        c.strokeText(f.cb + ' KOMBO!', 0, 0);
        c.fillStyle = f.cb >= 4 ? '#ffd166' : '#fff';
        c.fillText(f.cb + ' KOMBO!', 0, 0);
        c.restore();
      }
    }
    // bitiriş şeridi
    if (this.finBan) {
      const t = this.finBan.t;
      const k = t < 0.15 ? t / 0.15 : 1;
      c.save();
      c.globalAlpha = t > 0.9 ? clamp((1.1 - t) / 0.2, 0, 1) : 1;
      c.translate(400, 210);
      c.rotate(-0.06);
      c.fillStyle = INK;
      c.fillRect(-W * k, -38, W * 2 * k, 76);
      c.fillStyle = this.finBan.col;
      c.fillRect(-W * k, -30, W * 2 * k, 60);
      c.font = '44px ' + FONT;
      c.textAlign = 'center';
      c.lineWidth = 7;
      c.strokeStyle = INK;
      const nm = this.finBan.name.toUpperCase() + '!';
      c.strokeText(nm, 0, 15);
      c.fillStyle = '#fff';
      c.fillText(nm, 0, 15);
      c.restore();
    }
    // afiş
    const phase = this.phase;
    let big = '';
    let sub = '';
    if (phase === 'intro') {
      if (this.phaseT < 1.3) {
        big = 'RAUND ' + this.round;
        sub = this.F[0].ch.name + '  ×  ' + this.F[1].ch.name;
      } else big = 'SAVAŞ!';
    } else if (phase === 'wait') {
      big = '';
    } else if ((phase === 'rend') && this.banner) {
      big = this.banner.text;
      sub = this.banner.sub;
    } else if (phase === 'fight' && this.phaseT < 0.6) big = 'SAVAŞ!';
    if (big) {
      const pop = phase === 'fight' ? 1 + (0.6 - this.phaseT) * 0.5 : 1;
      c.save();
      c.translate(400, 190);
      c.scale(pop, pop);
      c.font = '78px ' + FONT;
      c.textAlign = 'center';
      c.lineWidth = 10;
      c.strokeStyle = INK;
      c.strokeText(big, 0, 0);
      c.fillStyle = phase === 'rend' ? '#ffd166' : '#fff';
      c.fillText(big, 0, 0);
      if (sub) {
        c.font = '24px ' + FONT;
        c.lineWidth = 6;
        c.strokeText(sub, 0, 40);
        c.fillStyle = '#fff';
        c.fillText(sub, 0, 40);
      }
      c.restore();
    }
  }
}
