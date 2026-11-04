// Kuşyolu 2D — küçük yan görünüş motoru: sahne, aktörler, kamera, diyalog, betik.
import { VoiceBank } from '../../../engine/voicebank.js';
import { drawChar, bubbleHint, glow } from './draw.js';
import { SPEAKERS2 } from './story.js';
import { Sfx } from './sfx.js';
import { SCENES } from './scenes.js';

export const VIEW_H = 720;
const SAVE = 'kusyolu2d-save';

export class Actor {
  constructor(id, x, y, o = {}) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.dir = o.dir || 1;
    this.style = o.style || id;
    this.walk = 0;
    this.moving = false;
    this.speed = o.speed || 260;
    this.target = null;
    this.follow = null;
    this.gap = 110;
    this.sit = !!o.sit;
    this.crouch = false;
    this.hold = null;
    this.talk = false;
    this.surprise = false;
    this.look = 0;
    this.hidden = false;
    this.z = o.z || 0;
    this.seed = Math.random() * 3;
    this.tween = null;
  }
  update(dt, game) {
    let goal = this.target;
    if (this.follow && !this.tween) {
      const L = this.follow;
      if (Math.abs(L.y - this.y) < 30) {
        const want = L.x - L.dir * this.gap;
        if (Math.abs(want - this.x) > 50) goal = want;
        else if (this.target == null) goal = null;
      }
    }
    this.moving = false;
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.d);
      const px = this.x;
      this.x = tw.x0 + (tw.x1 - tw.x0) * k;
      this.y = tw.y0 + (tw.y1 - tw.y0) * k;
      if (Math.abs(this.x - px) > 0.01) this.dir = this.x > px ? 1 : -1;
      this.moving = !tw.still;
      this.walk += dt * 11;
      if (k >= 1) {
        this.tween = null;
        tw.done && tw.done();
      }
      return;
    }
    if (goal != null && !this.sit) {
      const d = goal - this.x;
      if (Math.abs(d) > 4) {
        const st = Math.sign(d) * Math.min(Math.abs(d), this.speed * dt * (this.follow && Math.abs(d) > 260 ? 1.4 : 1));
        this.x += st;
        this.dir = Math.sign(d);
        this.moving = true;
        this.walk += dt * 11 * (this.speed / 260);
      } else if (this.target != null) {
        this.target = null;
      }
    }
    if (game.scene.groundAt && !this.tween) this.y = game.scene.groundAt(this.x, this.y);
  }
  goTo(x) {
    this.target = x;
    return new Promise((res) => {
      const chk = () => (this.target == null ? res() : requestAnimationFrame(chk));
      chk();
    });
  }
  tweenTo(x1, y1, d, still) {
    return new Promise((res) => {
      this.tween = { x0: this.x, y0: this.y, x1, y1, d, t: 0, done: res, still };
    });
  }
}

export class Game {
  constructor(canvas, ui, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.test = !!opts.test;
    this.t = 0;
    this.keys = new Set();
    this.touch = { left: false, right: false };
    this.actors = {};
    this.cam = { x: 0, y: 0 };
    this.shakeT = 0;
    this.flash = 0;
    this.fadeA = 1;
    this.fadeTo = 0;
    this.cutscene = false;
    this.lineDone = null;
    this.paused = false;
    this.manual = false;
    this.voiceOn = true;
    this.bank = new VoiceBank((import.meta.env.BASE_URL || '/') + 'kusyolu/voices/');
    this.sfx = new Sfx();
    this.objective = '';
    this.flags = {};
    this.running = true;
    this.hint = null;
    this.loop = this.loop.bind(this);
    this._kd = (e) => this.onKey(e, true);
    this._ku = (e) => this.onKey(e, false);
    addEventListener('keydown', this._kd);
    addEventListener('keyup', this._ku);
    this._rs = () => this.resize();
    addEventListener('resize', this._rs);
    this.resize();
    this.last = performance.now();
    window.__ky2 = this;
    requestAnimationFrame(this.loop);
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = this.canvas.clientWidth || innerWidth,
      ch = this.canvas.clientHeight || innerHeight;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.scale = (ch * dpr) / VIEW_H;
    this.viewW = Math.max(900, this.canvas.width / this.scale);
    if (this.canvas.width / this.scale < 900) this.scale = this.canvas.width / 900;
    this.viewW = this.canvas.width / this.scale;
    this.viewH = this.canvas.height / this.scale;
  }

  onKey(e, down) {
    if (e.repeat) return;
    const c = e.code;
    if (down) this.keys.add(c);
    else this.keys.delete(c);
    if (down && (c === 'KeyE' || c === 'Space' || c === 'Enter')) {
      e.preventDefault && e.preventDefault();
      this.act();
    }
    if (down && c === 'Escape') this.ui.onPause && this.ui.onPause();
  }

  // eylem: diyalogu ilerlet ya da yakındaki şeyle etkileş
  act() {
    if (this.paused || this.loading) return;
    this.sfx.unlock();
    if (this.lineDone) {
      this.lineDone();
      return;
    }
    if (this.onAct) {
      this.onAct();
      return;
    }
    if (this.cutscene || !this.hint) return;
    const h = this.hint;
    this.runScript(h.use);
  }

  async runScript(fn) {
    this.cutscene = true;
    this.player.target = null;
    try {
      await fn();
    } finally {
      this.cutscene = false;
    }
  }

  get player() {
    return this.actors.arda;
  }

  addActor(id, x, y, o) {
    const a = new Actor(id, x, y, o);
    this.actors[id] = a;
    return a;
  }

  async loadScene(SceneClass, spawn) {
    await this.fade(1, 0.5);
    this.actors = {};
    this.onAct = null;
    this.hint = null;
    this.sfx.stopLoops();
    this.scene = new SceneClass(this);
    this.addActor('arda', spawn?.x ?? this.scene.spawn.x, spawn?.y ?? this.scene.spawn.y, { dir: spawn?.dir ?? 1, z: 5 });
    this.scene.setup && this.scene.setup(this);
    this.snapCamera();
    this.save(this.scene.key);
    this.fade(0, 0.7);
    this.scene.start && this.runScript(() => this.scene.start(this));
  }

  async next(name) {
    this.loading = true;
    try {
      await this.loadScene(SCENES[name]);
    } finally {
      this.loading = false;
    }
  }
  async startAt(name) {
    this.fadeA = 1;
    await this.next(name || 'roof');
  }
  chapterDone(n) {
    Game.markDone(n);
    this.ui.chapterEnd && this.ui.chapterEnd(n);
  }

  save(key) {
    if (this.test && !this.saveInTest) return;
    try {
      const prev = JSON.parse(localStorage.getItem(SAVE) || '{}');
      localStorage.setItem(SAVE, JSON.stringify({ ...prev, scene: key, max: Math.max(prev.max || 1, 1), t: Date.now() }));
    } catch (e) {}
  }
  static loadSave() {
    try {
      return JSON.parse(localStorage.getItem(SAVE) || 'null');
    } catch (e) {
      return null;
    }
  }
  static markDone(ch) {
    try {
      const prev = JSON.parse(localStorage.getItem(SAVE) || '{}');
      localStorage.setItem(SAVE, JSON.stringify({ ...prev, scene: null, max: Math.max(prev.max || 1, ch + 1) }));
    } catch (e) {}
  }

  setObjective(t) {
    this.objective = t || '';
    this.ui.objective && this.ui.objective(this.objective);
  }

  wait(sec) {
    return new Promise((res) => {
      const end = this.t + sec;
      const chk = () => (this.t >= end || !this.running ? res() : requestAnimationFrame(chk));
      chk();
    });
  }
  until(fn) {
    return new Promise((res) => {
      const chk = () => (fn() || !this.running ? res() : requestAnimationFrame(chk));
      chk();
    });
  }
  fade(to, d = 0.6) {
    this.fadeTo = to;
    this.fadeSpeed = 1 / d;
    return this.until(() => Math.abs(this.fadeA - to) < 0.01);
  }
  shake(s = 1) {
    this.shakeT = Math.max(this.shakeT, s);
  }

  // Replik dizisini sırayla söylet (sesi varsa ses, yoksa yazı süresi kadar)
  async say(lines) {
    for (const l of lines) this.bank.preload(l.s + '|' + l.t);
    for (const l of lines) {
      if (!this.running) return;
      await this.sayOne(l);
    }
  }
  sayOne(l) {
    return new Promise((res) => {
      const sp = SPEAKERS2[l.s] || { name: '', color: '#ddd' };
      const a = this.actors[l.s];
      if (a) a.talk = true;
      const listener = this.player && a && a !== this.player ? this.player : null;
      if (listener && !this.player.tween && !this.player.moving) listener.dir = a.x > listener.x ? 1 : -1;
      this.ui.sub && this.ui.sub({ name: sp.name, color: sp.color, text: l.t });
      let el = null,
        timer = null,
        done = false;
      const fin = () => {
        if (done) return;
        done = true;
        if (a) a.talk = false;
        clearTimeout(timer);
        if (el) {
          try {
            el.pause();
          } catch (e) {}
        }
        this.lineDone = null;
        this.ui.sub && this.ui.sub(null);
        setTimeout(res, 140);
      };
      this.lineDone = fin;
      const fallback = Math.max(1600, l.t.length * 62 + 700);
      if (this.voiceOn && this.bank.has(l.s + '|' + l.t) && !this.test) {
        el = this.bank.play(l.s + '|' + l.t, 1, fin);
        timer = setTimeout(fin, fallback + 6000);
      } else {
        timer = setTimeout(fin, this.test ? 30 : fallback);
      }
    });
  }

  snapCamera() {
    const p = this.player;
    this.cam.x = Math.max(0, Math.min(this.scene.width - this.viewW, p.x - this.viewW * 0.45));
    this.cam.y = this.scene.camY ? this.scene.camY(p, this) : 0;
  }

  step(dt) {
    this.t += dt;
    const sc = this.scene;
    if (!sc) return;
    const p = this.player;
    // oyuncu kontrolü
    if (p && !this.cutscene && !p.tween && !this.loading) {
      const L = this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.touch.left;
      const R = this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.touch.right;
      const dx = (R ? 1 : 0) - (L ? 1 : 0);
      p.moving = false;
      if (dx) {
        const nx = p.x + dx * 290 * dt;
        p.x = sc.clampX ? sc.clampX(nx, p) : Math.max(60, Math.min(sc.width - 60, nx));
        p.dir = dx;
        p.moving = true;
        p.walk += dt * 12;
      }
      if (sc.groundAt) p.y = sc.groundAt(p.x, p.y);
    } else if (p && this.cutscene) {
      if (p.target != null || p.tween) p.update(dt, this);
      else p.moving = false;
    }
    for (const a of Object.values(this.actors)) {
      if (a === p) continue;
      a.update(dt, this);
    }
    sc.update && sc.update(dt, this);
    // etkileşim ipucu
    this.hint = null;
    if (!this.cutscene && !this.loading && p && sc.spots) {
      let best = null,
        bd = 1e9;
      for (const s of sc.spots) {
        if (s.when && !s.when()) continue;
        const sy = s.y ?? p.y;
        if (Math.abs(sy - p.y) > 60) continue;
        const d = Math.abs(s.x - p.x);
        if (d < (s.r || 90) && d < bd) {
          bd = d;
          best = s;
        }
      }
      this.hint = best;
    }
    // tetik bölgeleri
    if (!this.cutscene && !this.loading && p && sc.triggers) {
      for (const tr of sc.triggers) {
        if (tr.fired) continue;
        if ((tr.when ? tr.when() : true) && p.x > tr.x0 && p.x < tr.x1 && (tr.y == null || Math.abs(tr.y - p.y) < 60)) {
          tr.fired = true;
          this.runScript(tr.run);
          break;
        }
      }
    }
    // kamera
    const lead = p ? p.dir * 80 : 0;
    const tx = Math.max(0, Math.min(sc.width - this.viewW, (p ? p.x : 0) + lead - this.viewW * 0.5));
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 3.2);
    if (sc.camY) {
      const ty = sc.camY(p, this);
      this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 4);
    }
    this.shakeT = Math.max(0, this.shakeT - dt * 1.4);
    this.flash = Math.max(0, this.flash - dt * 1.2);
    const fs = this.fadeSpeed || 2;
    this.fadeA += Math.sign(this.fadeTo - this.fadeA) * Math.min(Math.abs(this.fadeTo - this.fadeA), dt * fs);
  }

  render() {
    const x = this.ctx;
    const sc = this.scene;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#05060e';
    x.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!sc) return;
    const s = this.scale;
    x.setTransform(s, 0, 0, s, 0, 0);
    const sh = this.shakeT > 0 ? this.shakeT * 14 : 0;
    const ox = sh ? (Math.random() - 0.5) * sh : 0,
      oy = sh ? (Math.random() - 0.5) * sh : 0;
    const cam = { x: this.cam.x + ox, y: this.cam.y + oy, w: this.viewW, h: this.viewH };
    sc.drawBg && sc.drawBg(x, cam, this);
    x.save();
    x.translate(-Math.round(cam.x), -Math.round(cam.y));
    sc.drawWorld && sc.drawWorld(x, cam, this);
    const list = Object.values(this.actors)
      .filter((a) => !a.hidden)
      .sort((a, b) => a.z - b.z);
    for (const a of list) {
      a.t = this.t;
      drawChar(x, a);
    }
    sc.drawFront && sc.drawFront(x, cam, this);
    if (this.hint && !this.cutscene && this.player) {
      const h = this.hint;
      const lab = (this.isTouch ? '' : 'E · ') + h.label;
      bubbleHint(x, h.hx ?? h.x, (h.hy ?? this.player.y - 250) + 0, lab, this.t);
    }
    x.restore();
    sc.drawOverlay && sc.drawOverlay(x, cam, this);
    // kenar karartması
    const vg = x.createRadialGradient(cam.w / 2, cam.h / 2, cam.h * 0.45, cam.w / 2, cam.h / 2, cam.w * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    x.fillStyle = vg;
    x.fillRect(0, 0, cam.w, cam.h);
    if (this.flash > 0) {
      x.globalAlpha = Math.min(1, this.flash);
      x.fillStyle = '#e8fff4';
      x.fillRect(0, 0, cam.w, cam.h);
      x.globalAlpha = 1;
    }
    if (this.fadeA > 0) {
      x.globalAlpha = this.fadeA;
      x.fillStyle = '#000';
      x.fillRect(0, 0, cam.w, cam.h);
      x.globalAlpha = 1;
    }
  }

  loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.paused || this.manual) return;
    this.step(dt);
    this.render();
  }
  stepFrames(n, dt = 1 / 30) {
    for (let i = 0; i < n; i++) this.step(dt);
    this.render();
  }
  dispose() {
    this.running = false;
    this.sfx.dispose();
    removeEventListener('keydown', this._kd);
    removeEventListener('keyup', this._ku);
    removeEventListener('resize', this._rs);
    if (window.__ky2 === this) delete window.__ky2;
  }
}

export { glow };
