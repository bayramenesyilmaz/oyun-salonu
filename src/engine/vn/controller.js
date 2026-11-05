import { Run } from './runtime.js';
import { Stage } from './stage.js';
import { VNAudio } from './audio.js';

const EXPR = {
  calm: {},
  smile: { smile: 0.7 },
  grin: { smile: 1, wide: 0.15 },
  smirk: { smile: 0.35, brow: 0.2 },
  sad: { brow: 0.85 },
  worry: { brow: 0.6, jaw: 0.05 },
  scared: { wide: 1, brow: 0.7, jaw: 0.3 },
  shock: { wide: 1, jaw: 0.45 },
  cry: { brow: 1, jaw: 0.1 },
  warm: { smile: 0.5, brow: 0.35 },
};
const URL_OF = (cfg) => (id) => cfg.chars[id].glb;

export class VNController {
  constructor({ cfg, st, canvas, emit }) {
    this.cfg = cfg;
    this.st = st;
    this.emit = emit;
    this.run = new Run(st, cfg);
    this.stage = new Stage(canvas);
    this.audio = new VNAudio();
    this.phase = 'menu';
    this.ui = { phase: 'menu', node: null, options: [], meters: {}, clues: [], fade: 0, flash: 0, toast: null, loading: false, ending: null, shown: 0, timer: null, letter: false };
    this.full = '';
    this.shown = 0;
    this.typeT = null;
    this.busy = false;
    this.gen = 0;
    this.endsKey = 'vn-' + cfg.id + '-ends';
    this.saveKey = 'vn-' + cfg.id;
    this.sync();
    this.stage.setMood(cfg.menuMood || Object.values(cfg.scenes)[0].mood);
    this.stage.start();
    this.menuCast();
  }
  async menuCast() {
    if (this.cfg.menuCast) {
      try {
        await this.stage.setCast(this.cfg.menuCast, URL_OF(this.cfg));
        for (const [s, id] of Object.entries(this.cfg.menuCast)) id && this.stage.pose(id, 'idle', EXPR.calm);
      } catch (e) {
        console.warn('menü karakteri', e);
      }
    }
  }
  set(p) {
    Object.assign(this.ui, p);
    this.sync();
  }
  sync() {
    this.emit({ ...this.ui, meters: { ...this.run.s.m }, clues: [...this.run.s.clues] });
  }
  hasSave() {
    try {
      return !!localStorage.getItem(this.saveKey);
    } catch {
      return false;
    }
  }
  ends() {
    try {
      return JSON.parse(localStorage.getItem(this.endsKey) || '[]');
    } catch {
      return [];
    }
  }
  save() {
    try {
      localStorage.setItem(this.saveKey, this.run.save());
    } catch {}
  }
  async begin(resume) {
    this.audio.init();
    this.gen++;
    this.run.reset();
    if (resume) {
      try {
        this.run.load(localStorage.getItem(this.saveKey));
        // görünümü yeniden kur
        const v = this.run.s.view;
        await this.applyView(v);
      } catch (e) {
        console.warn('kayıt okunamadı', e);
        this.run.reset();
      }
    }
    this.set({ phase: 'play', ending: null });
    await this.process(true);
  }
  async applyView(v) {
    if (v.scene) await this.enterScene(v.scene, true);
    if (v.cast && Object.keys(v.cast).length) await this.stage.setCast(v.cast, URL_OF(this.cfg));
    this.audio.ambient(v.amb || (v.scene && this.cfg.scenes[v.scene]?.amb));
    this.audio.music(v.music || (v.scene && this.cfg.scenes[v.scene]?.music));
  }
  async enterScene(id, instant) {
    const sc = this.cfg.scenes[id];
    if (!sc) throw new Error('sahne yok: ' + id);
    if (!instant) {
      this.set({ fade: 1 });
      await new Promise((r) => setTimeout(r, 380));
    }
    this.stage.setMood(sc.mood);
    if (sc.amb !== undefined) this.audio.ambient(sc.amb);
    if (sc.music !== undefined) this.audio.music(sc.music);
    if (sc.title && !instant) this.set({ sceneTitle: sc.title });
    if (!instant) {
      await new Promise((r) => setTimeout(r, 120));
      this.set({ fade: 0 });
      if (sc.title) setTimeout(() => this.set({ sceneTitle: null }), 2600);
    }
  }
  async applyFx(list) {
    for (const f of list) {
      if (f.k === 'scene') await this.enterScene(f.id, false);
      else if (f.k === 'cast') {
        this.set({ loading: true });
        try {
          await this.stage.setCast(f.c, URL_OF(this.cfg));
        } catch (e) {
          console.warn('karakter yüklenemedi', e);
        }
        this.set({ loading: false });
        for (const id of Object.values(f.c)) id && this.stage.pose(id, 'idle', EXPR.calm);
      } else if (f.k === 'music') this.audio.music(f.m);
      else if (f.k === 'amb') this.audio.ambient(f.a);
      else if (f.k === 'clue') {
        this.audio.sting('clue');
        const c = this.cfg.clues?.[f.id];
        this.set({ toast: c ? c.t : f.id });
        setTimeout(() => this.ui.toast && this.set({ toast: null }), 2600);
      } else if (f.k === 'fx') this.doFx(f.name, f.o);
    }
  }
  doFx(name, o = {}) {
    const a = this.audio;
    if (name === 'shake' || name === 'bigshake' || name === 'push' || name === 'pull' || name === 'blackout' || name === 'lights') this.stage.fx(name);
    if (name === 'flash' || name === 'screech') {
      this.set({ flash: 1 });
      setTimeout(() => this.set({ flash: 0 }), 140);
    }
    if (name === 'fadeout') this.set({ fade: 1 });
    if (name === 'fadein') this.set({ fade: 0 });
    if (name === 'letterbox') this.set({ letter: true });
    if (name === 'noletterbox') this.set({ letter: false });
    if (name === 'blackout') a.sting('door');
    if (['boom', 'screech', 'bell', 'hit', 'knock', 'door', 'laugh', 'phone', 'gun', 'win', 'lose', 'heart'].includes(name)) a.sting(name);
    if (name === 'boom' || name === 'hit' || name === 'gun') this.stage.fx('bigshake');
    if (name === 'screech') this.stage.fx('shake');
  }
  speakerSide(id) {
    return this.stage.slotOf(id) || 'c';
  }
  async process(first = false) {
    const my = this.gen;
    const run = this.run;
    await this.applyFx(run.drain());
    if (my !== this.gen) return;
    const n = run.node;
    clearInterval(this.typeT);
    clearTimeout(this.timerT);
    if (!n) return;
    if (n.t === 'end') return this.finish(n);
    if (n.t === 'say') {
      const ch = this.cfg.chars[n.who];
      const actor = ch && this.stage.actors[n.who] && this.stage.slotOf(n.who) ? n.who : null;
      this.stage.speak(actor);
      for (const [id, a] of Object.entries(this.stage.actors)) {
        if (!this.stage.slotOf(id)) continue;
        if (id === actor) this.stage.pose(id, n.pose || 'talk', EXPR[n.expr || 'calm'] || n.expr || EXPR.calm);
        else this.stage.pose(id, (n.react && n.react[id] && n.react[id].pose) || 'idle', (n.react && n.react[id] && (EXPR[n.react[id].expr] || n.react[id])) || EXPR.calm);
      }
      this.full = n.text;
      this.shown = 0;
      const name = n.who === 'narr' ? null : n.name ? n.name : n.who === 'you' ? this.cfg.player || 'Sen' : ch ? ch.name : n.who;
      this.set({ node: { kind: n.who === 'narr' ? 'narr' : n.who === 'you' ? 'you' : 'say', who: n.who, name, color: ch ? ch.color : '#cfd6e6', text: n.text, side: actor ? this.speakerSide(actor) : 'c' }, options: [], shown: 0, timer: null });
      this.startType(ch && actor ? 0.95 + (ch.pitch || 1) * 0.15 : 0.8);
    } else if (n.t === 'choice') {
      this.stage.speak(null);
      for (const id of Object.keys(this.stage.actors)) this.stage.slotOf(id) && this.stage.pose(id, 'idle', EXPR[n.react || 'calm'] || EXPR.calm);
      this.full = '';
      const opts = run.options();
      this.set({ node: { kind: 'choice', text: n.prompt || '', name: n.who ? this.cfg.chars[n.who]?.name : null, color: '#e8eefc' }, options: opts, shown: (n.prompt || '').length, timer: n.time ? { total: n.time, left: n.time } : null });
      if (n.time) {
        const t0 = performance.now();
        this.timerT = setInterval(() => {
          const left = n.time - (performance.now() - t0) / 1000;
          if (left <= 0) {
            clearInterval(this.timerT);
            this.audio.sting('heart');
            const k = n.timeout !== undefined ? n.timeout : 0;
            this.pick(opts[Math.min(k, opts.length - 1)].k, true);
          } else this.set({ timer: { total: n.time, left } });
        }, 100);
      }
    }
    this.save();
  }
  startType(pitch) {
    clearInterval(this.typeT);
    this.typeT = setInterval(() => {
      if (this.shown >= this.full.length) {
        clearInterval(this.typeT);
        this.stage.speak(null);
        return;
      }
      this.shown += 2;
      const ch = this.full[this.shown - 1];
      if (ch && /\S/.test(ch) && this.shown % 4 < 2) this.audio.blip(pitch);
      this.set({ shown: Math.min(this.shown, this.full.length) });
    }, 32);
  }
  tap() {
    if (this.ui.phase !== 'play' || this.busy) return;
    const n = this.run.node;
    if (!n || n.t !== 'say') return;
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      clearInterval(this.typeT);
      this.stage.speak(null);
      this.set({ shown: this.shown });
      return;
    }
    this.gen++;
    this.run.next();
    this.process();
  }
  pick(k, auto = false) {
    if (this.ui.phase !== 'play') return;
    const n = this.run.node;
    if (!n || n.t !== 'choice') return;
    clearInterval(this.timerT);
    this.audio.blip(1.3);
    this.gen++;
    this.run.pick(k);
    this.process();
  }
  finish(n) {
    this.gen++;
    const ends = this.ends();
    const id = n.id || n.title;
    if (!ends.includes(id)) {
      ends.push(id);
      try {
        localStorage.setItem(this.endsKey, JSON.stringify(ends));
      } catch {}
    }
    try {
      localStorage.removeItem(this.saveKey);
    } catch {}
    this.audio.sting(n.kind === 'bad' ? 'lose' : 'win');
    this.audio.music(n.music || (n.kind === 'bad' ? 'sad' : 'hope'));
    this.stage.speak(null);
    this.set({ phase: 'end', node: null, options: [], ending: { title: n.title, text: n.text, kind: n.kind || 'good', id, count: ends.length, total: Object.keys(this.cfg.endings || {}).length || null } });
  }
  toMenu() {
    this.gen++;
    clearInterval(this.typeT);
    clearInterval(this.timerT);
    this.audio.ambient(null);
    this.audio.music(null);
    this.set({ phase: 'menu', node: null, options: [], ending: null, fade: 0, letter: false });
    this.stage.setMood(this.cfg.menuMood || Object.values(this.cfg.scenes)[0].mood);
    this.stage.speak(null);
    for (const s of ['l', 'r', 'c']) this.stage.slots[s] = null;
    for (const a of Object.values(this.stage.actors)) a.root.visible = false;
    this.menuCast();
  }
  mute(m) {
    this.audio.setMuted(m);
  }
  dispose() {
    this.gen++;
    clearInterval(this.typeT);
    clearInterval(this.timerT);
    this.audio.dispose();
    this.stage.dispose();
  }
}
