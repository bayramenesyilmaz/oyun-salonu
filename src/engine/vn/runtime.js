// Hikâye çalışma zamanı: saf veri + durum. DOM/WebGL yok (Node'da test edilebilir).
// Yazım: const s = story(); s.say('kaan','…'); s.choice('…',[{t,go,…}]); s.label('x'); s.end({…})
export function story() {
  const nodes = [];
  const labels = {};
  const push = (n) => (nodes.push(n), n);
  const api = {
    nodes,
    labels,
    label: (n) => {
      if (labels[n] !== undefined) throw new Error('çift etiket ' + n);
      labels[n] = nodes.length;
    },
    say: (who, text, o = {}) => push({ t: 'say', who, text, ...o }),
    narr: (text, o = {}) => push({ t: 'say', who: 'narr', text, ...o }),
    scene: (id, o = {}) => push({ t: 'scene', id, ...o }),
    cast: (c) => push({ t: 'cast', c }),
    fx: (name, o = {}) => push({ t: 'fx', name, ...o }),
    music: (m) => push({ t: 'music', m }),
    amb: (a) => push({ t: 'amb', a }),
    set: (flags) => push({ t: 'set', flags }),
    inc: (m) => push({ t: 'inc', m }),
    add: (...c) => push({ t: 'add', c }),
    go: (l) => push({ t: 'go', l }),
    branch: (list) => push({ t: 'branch', list }), // [{if:(s)=>bool, go:'x'}, {go:'y'}]
    choice: (prompt, opts, o = {}) => push({ t: 'choice', prompt, opts, ...o }),
    end: (o) => push({ t: 'end', ...o }),
  };
  return api;
}

const SILENT = new Set(['scene', 'cast', 'fx', 'music', 'amb', 'set', 'inc', 'add', 'go', 'branch']);

export class Run {
  constructor(st, cfg = {}) {
    this.st = st;
    this.cfg = cfg;
    this.reset();
  }
  reset() {
    const m = {};
    for (const [k, v] of Object.entries(this.cfg.meters || {})) m[k] = v.init ?? 0;
    this.s = { flags: {}, clues: [], m, view: { scene: null, cast: {}, music: null, amb: null }, seen: {} };
    this.i = 0;
    this.fxq = [];
    this.settle();
  }
  get node() {
    return this.st.nodes[this.i];
  }
  // sessiz düğümleri uygula, görünür düğümde dur
  settle() {
    let guard = 0;
    while (this.node && SILENT.has(this.node.t)) {
      if (++guard > 5000) throw new Error('sonsuz döngü ' + this.i);
      const n = this.node;
      const s = this.s;
      let jump = null;
      if (n.t === 'scene') {
        s.view.scene = n.id;
        this.fxq.push({ k: 'scene', id: n.id, o: n });
      } else if (n.t === 'cast') {
        s.view.cast = { ...s.view.cast, ...n.c };
        this.fxq.push({ k: 'cast', c: n.c });
      } else if (n.t === 'fx') this.fxq.push({ k: 'fx', name: n.name, o: n });
      else if (n.t === 'music') {
        s.view.music = n.m;
        this.fxq.push({ k: 'music', m: n.m });
      } else if (n.t === 'amb') {
        s.view.amb = n.a;
        this.fxq.push({ k: 'amb', a: n.a });
      } else if (n.t === 'set') Object.assign(s.flags, n.flags);
      else if (n.t === 'inc') this.addMeters(n.m);
      else if (n.t === 'add') {
        for (const c of n.c) {
          if (!s.clues.includes(c)) {
            s.clues.push(c);
            this.fxq.push({ k: 'clue', id: c });
          }
        }
      } else if (n.t === 'go') jump = n.l;
      else if (n.t === 'branch') {
        for (const b of n.list) if (!b.if || b.if(s)) {
          jump = b.go;
          break;
        }
        if (jump === null) throw new Error('branch eşleşmedi @' + this.i);
      }
      if (jump !== null) {
        if (this.st.labels[jump] === undefined) throw new Error('etiket yok: ' + jump);
        this.i = this.st.labels[jump];
      } else this.i++;
    }
    return this.node;
  }
  addMeters(d) {
    for (const [k, v] of Object.entries(d)) {
      const c = (this.cfg.meters || {})[k] || {};
      this.s.m[k] = Math.max(c.min ?? -99, Math.min(c.max ?? 99, (this.s.m[k] || 0) + v));
    }
  }
  drain() {
    const q = this.fxq;
    this.fxq = [];
    return q;
  }
  next() {
    if (this.node && this.node.t === 'say') {
      this.applyEach(this.node);
      this.i++;
      return this.settle();
    }
    return this.node;
  }
  applyEach(n) {
    if (n.set) Object.assign(this.s.flags, n.set);
    if (n.inc) this.addMeters(n.inc);
    if (n.add) {
      for (const c of [].concat(n.add)) {
        if (!this.s.clues.includes(c)) {
          this.s.clues.push(c);
          this.fxq.push({ k: 'clue', id: c });
        }
      }
    }
  }
  options() {
    const n = this.node;
    if (!n || n.t !== 'choice') return [];
    return n.opts.map((o, k) => ({ k, t: typeof o.t === 'function' ? o.t(this.s) : o.t, locked: o.need ? !o.need(this.s) : false, hint: o.hint, done: !!(o.once && this.s.seen[this.i + ':' + k]) })).filter((o, k) => !(n.opts[k].show && !n.opts[k].show(this.s)) && !o.done);
  }
  pick(k) {
    const n = this.node;
    const o = n.opts[k];
    if (!o) return this.node;
    if (o.once) this.s.seen[this.i + ':' + k] = 1;
    this.applyEach(o);
    if (o.go) {
      if (this.st.labels[o.go] === undefined) throw new Error('etiket yok: ' + o.go);
      this.i = this.st.labels[o.go];
    } else this.i++;
    return this.settle();
  }
  save() {
    return JSON.stringify({ i: this.i, s: this.s });
  }
  load(str) {
    const d = JSON.parse(str);
    this.i = d.i;
    this.s = d.s;
    this.fxq = [];
  }
}

// Tüm yolları tara (testler için): her bitişe ulaşılıyor mu, ölü uç var mı?
export function explore(st, cfg, limit = 200000) {
  const ends = new Set();
  const seenStates = new Set();
  const stack = [new Run(st, cfg)];
  let n = 0;
  const key = (r) => r.i + '|' + JSON.stringify(r.s.flags) + '|' + r.s.clues.join(',') + '|' + JSON.stringify(r.s.m) + '|' + Object.keys(r.s.seen).join(',');
  const errors = [];
  while (stack.length && n++ < limit) {
    const r = stack.pop();
    let node = r.node;
    // doğrusal ilerle
    let steps = 0;
    while (node && node.t === 'say' && steps++ < 10000) node = r.next();
    if (!node) {
      errors.push('düğüm sonu bitiş olmadan');
      continue;
    }
    if (node.t === 'end') {
      ends.add(node.id || node.title);
      continue;
    }
    const k = key(r);
    if (seenStates.has(k)) continue;
    seenStates.add(k);
    if (node.t === 'choice') {
      const opts = r.options().filter((o) => !o.locked);
      if (!opts.length) errors.push('seçeneksiz seçim @' + r.i);
      for (const o of opts) {
        const c = new Run(st, cfg);
        c.load(r.save());
        try {
          c.pick(o.k);
        } catch (e) {
          errors.push(String(e.message));
          continue;
        }
        stack.push(c);
      }
    }
  }
  return { ends: [...ends], states: seenStates.size, errors: [...new Set(errors)], truncated: n >= limit };
}
