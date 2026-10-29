import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, SMAAEffect, BloomEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { VoiceSystem } from '@engine/voice.js';
import { VoiceBank } from '@engine/voicebank.js';
import { RadyoAudio } from './audio.js';
import { buildAttic } from './attic.js';
import { SPEAKERS, VOICE_INDEX, CLUES, NIGHTS, ENDINGS } from './story.js';

const SAVE_KEY = 'radyo-save';
export const DIAL_MIN = 5.0, DIAL_MAX = 9.0;
const LOCK = 0.08;
const DECOYS = [
  { f: 6.1, kind: 'muzik', text: 'Uzak bir istasyon… yalnızca eski bir türkü. Bu değil.' },
  { f: 8.5, kind: 'haber', text: 'Bir yabancı dilde haber. Bu değil.' },
];

const ZONES = {
  radyo: { label: 'Masa ve radyo', at: [-2.6, 1.1, -2.5] },
  duvar: { label: 'Duvar', at: [0.6, 1.8, -3.4] },
  sandik: { label: 'Sandık', at: [2.7, 0.8, -1.2] },
  raf: { label: 'Raf', at: [-3.9, 1.35, -0.6] },
};

// İpucu olmayan ama bakılabilen şeyler
const FLAVOR = {
  aile: (S) => ({
    title: 'Aile fotoğrafı',
    text: S.runaway
      ? 'Aile fotoğrafı, 1985. Büyük dedem yok. Annem bir keresinde "deden babasıyla yıllarca küs kaldı" demişti… Hep böyle miydi?'
      : 'Aile fotoğrafı, 1985. Büyük dedem Hüseyin Efendi en solda, kasketiyle. Hiç gülmeyen bir adam gibi duruyor.',
  }),
  ece: (S) => ({
    title: 'Benim fotoğrafım',
    text: S.paradox ? 'Benim fotoğrafım… soluyor. Yüzümü seçemiyorum.' : 'Ben, dedemin kucağında. 2008. Bana ilk türküyü o öğretmişti.',
  }),
  saz: (S) => ({
    title: 'Bağlama',
    text: S.stayed ? 'Sazın teli kopmuş, sapı çatlamış. Hiç çalınmamış gibi tozlu.' : 'Dedemin bağlaması. Tozlu ama telleri sağlam. Duvarda asılı duruyor.',
  }),
};
const LOCKED = {
  bilet: 'Babaannemin teneke kutusu. Kapağı paslanmış, şimdi açılmıyor. Yarın biraz yağ bulurum.',
  frekans2: 'Dedemle babaannemin düğün fotoğrafı, 1978. Çerçevenin arkası sıkı sıkı kapalı.',
};

function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  } catch {
    return null;
  }
}
export function hasSave() {
  const s = loadSave();
  return !!(s && s.night);
}
export function savedEndings() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY + '-endings') || '[]');
  } catch {
    return [];
  }
}

export class Game {
  constructor(container, emit, opts = {}) {
    this.container = container;
    this.emit = emit;
    this.touch = !!opts.touch;
    this.testMode = !!opts.test;
    this.low = !!opts.low;
    this.phase = 'menu';
    this.time = 0;
    this.fast = false;
    this.loop = this.loop.bind(this);

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false }));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = 'ry-canvas';
    container.appendChild(r.domElement);
    this.camera = new THREE.PerspectiveCamera(this.touch ? 62 : 52, 1, 0.05, 60);

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x0c0a10);
    scene.fog = new THREE.FogExp2(0x1a1410, 0.04);
    scene.add(new THREE.HemisphereLight(0x8090c0, 0x4a3018, 0.85));
    const moon = new THREE.DirectionalLight(0x9ab0ff, 0.6);
    moon.position.set(0.5, 4, -8);
    moon.target.position.set(0.5, 0, 0);
    scene.add(moon, moon.target);
    this.attic = buildAttic(scene);

    this.composer = new EffectComposer(r, { frameBufferType: THREE.HalfFloatType });
    this.composer.addPass(new RenderPass(scene, this.camera));
    const fx = [new BloomEffect({ intensity: 0.9, luminanceThreshold: 0.75, luminanceSmoothing: 0.2, mipmapBlur: true }), new VignetteEffect({ darkness: 0.62, offset: 0.28 }), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })];
    if (!this.low) fx.unshift(new SMAAEffect());
    this.composer.addPass(new EffectPass(this.camera, ...fx));

    // kamera
    const g = this.attic.views.genel;
    this.camPos = new THREE.Vector3(...g.pos);
    this.camLook = new THREE.Vector3(...g.look);
    this.camGoalPos = this.camPos.clone();
    this.camGoalLook = this.camLook.clone();
    this.drag = { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0 };
    this.view = 'genel';

    this.audio = new RadyoAudio();
    this.voice = new VoiceSystem(this.audio, (s) => this.emit('subtitle', s), SPEAKERS, VOICE_INDEX, this.testMode && !/[?&]voices\b/.test(location.search) ? null : new VoiceBank('/voices/radyo/'));

    this.freq = 6.5;
    this.lockT = 0;
    this.decoyHeard = {};
    this.newGame();

    this.ray = new THREE.Raycaster();
    this.bindInput();
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    this.resize();
    this.clock = new THREE.Clock();
    this.running = true;
    window.__radyo = this;
    requestAnimationFrame(this.loop);
    this.emit('phase', 'menu');
  }

  // ===================================================================
  // Durum
  // ===================================================================
  newGame() {
    this.S = {};
    this.found = {};
    this.lidOpen = false;
    this.night = 1;
    this.snap2 = null;
    this.attic.apply(this.S);
    this.syncProps();
  }
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ night: this.night, S: this.S, found: this.found, lidOpen: this.lidOpen, snap2: this.snap2 }));
    } catch {}
  }
  load() {
    const s = loadSave();
    if (!s) return false;
    this.S = s.S || {};
    this.found = s.found || {};
    this.lidOpen = !!s.lidOpen;
    this.night = s.night || 1;
    this.snap2 = s.snap2 || null;
    this.attic.apply(this.S);
    this.syncProps();
    return true;
  }
  syncProps() {
    const a = this.attic;
    a.lid.rotation.x = this.lidOpen ? -1.9 : 0;
    a.ledger.visible = this.lidOpen;
    a.envelope.visible = this.lidOpen && !!this.found.defter;
  }

  start(cont) {
    this.audio.init();
    if (!(cont && this.load())) this.newGame();
    this.startNight(this.night);
  }

  get nightDef() {
    return NIGHTS[this.night - 1];
  }
  get path() {
    return this.S.music ? 'music' : this.S.runaway ? 'runaway' : 'stayed';
  }

  startNight(n) {
    this.voice.stop();
    this.talked = false;
    this.night = n;
    if (n === 2 && !this.snap2) this.snap2 = { S: { ...this.S }, found: { ...this.found } };
    this.save();
    this.goView('genel');
    this.audio.setRadio(false);
    const N = this.nightDef;
    this.phase = 'intro';
    this.emit('phase', 'intro');
    this.emit('narration', { title: `${N.id}. Gece — ${N.title}`, lines: N.present, hint: N.hint });
    this.pushHud();
  }
  beginExplore() {
    if (this.phase !== 'intro') return;
    this.phase = 'explore';
    this.emit('phase', 'explore');
    this.pushHud();
  }

  clueAvailable(id) {
    const c = CLUES[id];
    if (!c) return false;
    if (c.night > this.night) return false;
    if (c.onlyIf && !c.onlyIf(this.S)) return false;
    if (c.needs && !this.found[c.needs]) return false;
    return true;
  }
  hotVisible(id) {
    const h = this.attic.hot[id];
    if (!h) return null;
    for (const o of h.objs) {
      let v = true;
      for (let p = o; p; p = p.parent) if (!p.visible) v = false;
      if (v) return o;
    }
    return null;
  }

  // nesneye dokunuldu
  inspect(id) {
    if (this.phase !== 'explore') return;
    const h = this.attic.hot[id];
    if (!h || !this.hotVisible(id)) return;
    if (this.view !== h.view) {
      this.goView(h.view);
      if (id !== 'radyo' && id !== 'sandik') return;
    }
    this.audio.click();
    if (id === 'radyo') return this.openRadio();
    if (id === 'sandik') {
      if (!this.lidOpen) {
        this.lidOpen = true;
        this.audio.lid();
        this.lidAnim = 0;
        this.attic.ledger.visible = true;
        this.save();
        this.toast('Sandığın kapağı gıcırdayarak açıldı.');
      }
      return this.pushHud();
    }
    if (FLAVOR[id]) {
      this.emit('inspect', { id, ...FLAVOR[id](this.S), clue: false });
      return;
    }
    const c = CLUES[id];
    if (!c) return;
    if (!this.clueAvailable(id)) {
      this.emit('inspect', { id, title: c.title, text: LOCKED[id] || 'Şimdilik bir şey bulamadım.', clue: false });
      return;
    }
    const isNew = !this.found[id];
    this.found[id] = true;
    this.audio.paper();
    if (id === 'defter') this.syncProps();
    this.save();
    this.emit('inspect', { id, title: c.title, text: c.text(this.S), clue: true, isNew });
    this.pushHud();
  }

  notebook() {
    return Object.keys(CLUES)
      .filter((id) => this.found[id] && (!CLUES[id].onlyIf || CLUES[id].onlyIf(this.S)))
      .map((id) => ({ id, title: CLUES[id].title, text: CLUES[id].text(this.S), night: CLUES[id].night }));
  }

  // ===================================================================
  // Kamera
  // ===================================================================
  goView(v) {
    const d = this.attic.views[v];
    if (!d) return;
    if (this.phase === 'radio' && v !== 'radyo') this.closeRadio();
    if (this.view !== v) this.audio.knob();
    this.view = v;
    this.camGoalPos.set(...d.pos);
    this.camGoalLook.set(...d.look);
    this.drag.tyaw = this.drag.tpitch = 0;
    if (this.testMode) {
      this.camPos.copy(this.camGoalPos);
      this.camLook.copy(this.camGoalLook);
    }
    this.pushHud();
  }
  back() {
    if (this.phase === 'radio') this.closeRadio();
    else this.goView('genel');
  }

  bindInput() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, yaw: this.drag.tyaw, pitch: this.drag.tpitch, moved: 0 };
    });
    el.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      down.moved = Math.max(down.moved, Math.hypot(dx, dy));
      if (down.moved > 6 && this.phase !== 'radio') {
        const lim = this.view === 'genel' ? 0.55 : 0.3;
        this.drag.tyaw = THREE.MathUtils.clamp(down.yaw - dx * 0.004, -lim, lim);
        this.drag.tpitch = THREE.MathUtils.clamp(down.pitch + dy * 0.003, -0.25, 0.25);
      }
    });
    el.addEventListener('pointerup', (e) => {
      if (down && down.moved < 8) this.tap(e);
      down = null;
    });
    el.addEventListener('pointercancel', () => (down = null));
  }
  tap(e) {
    if (this.phase !== 'explore') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(p, this.camera);
    const hits = this.ray.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      let vis = true;
      for (let o = h.object; o; o = o.parent) if (!o.visible) vis = false;
      if (!vis) continue;
      if (h.object.userData.hot) return this.inspect(h.object.userData.hot);
      if (h.distance > 0.3) break;
    }
  }

  // ===================================================================
  // Radyo
  // ===================================================================
  openRadio() {
    if (this.phase !== 'explore') return;
    this.goView('radyo');
    this.phase = 'radio';
    this.lockT = 0;
    this.audio.setRadio(true);
    this.audio.click();
    this.emit('phase', 'radio');
    this.pushTune();
  }
  closeRadio() {
    if (this.phase !== 'radio') return;
    this.phase = 'explore';
    this.audio.setRadio(false);
    this.emit('phase', 'explore');
  }
  setFreq(f) {
    if (this.phase !== 'radio') return;
    const nf = THREE.MathUtils.clamp(f, DIAL_MIN, DIAL_MAX);
    if (Math.abs(nf - this.freq) > 0.05) this.audio.knob();
    this.freq = nf;
  }
  tuneState() {
    const target = this.nightDef.freq;
    let best = { d: Math.abs(this.freq - target), real: true };
    for (const dc of DECOYS) {
      const d = Math.abs(this.freq - dc.f);
      if (d < best.d) best = { d, real: false, dc };
    }
    const signal = Math.max(0, 1 - best.d / 0.55);
    return { ...best, signal };
  }
  updateRadio(dt) {
    const st = this.tuneState();
    const s = st.signal;
    const locked = st.d < LOCK;
    this.audio.setTuning(1 - s * (locked ? 0.85 : 0.5), s > 0.1 && !locked ? s : 0, 260 + st.d * 2600);
    if (locked && !st.real && !this.decoyHeard[st.dc.f]) {
      this.decoyHeard[st.dc.f] = true;
      if (st.dc.kind === 'muzik') this.audio.tune();
      this.toast(st.dc.text);
    }
    if (locked && st.real) {
      this.lockT += dt;
      if (this.lockT > 1.2) return this.connect();
    } else this.lockT = Math.max(0, this.lockT - dt * 2);
    this.pushTune(st);
  }
  pushTune(st = this.tuneState()) {
    this.emit('tune', { freq: this.freq, signal: st.signal, lock: Math.min(1, this.lockT / 1.2), hasCode: !!this.found[this.night === 1 ? 'frekans1' : 'frekans2'] });
  }

  connect() {
    this.phase = 'talk';
    this.emit('phase', 'talk');
    this.audio.connect();
    this.audio.setTuning(0.1, 0, 300);
    const N = this.nightDef;
    const lines = this.talked ? N.again : [...N.radioIntro, ...((N.introByPath && N.introByPath[this.path]) || [])];
    this.talked = true;
    this.voice.play(lines, () => this.offerChoice());
  }
  choiceOptions() {
    const N = this.nightDef;
    return N.choice.options
      .filter((o) => !o.onlyIf || o.onlyIf(this.S))
      .map((o) => {
        const missing = (o.needs || []).filter((c) => !this.found[c]);
        return { id: o.id, text: o.text, locked: missing.length > 0, missing: missing.map((c) => CLUES[c].title) };
      });
  }
  offerChoice() {
    this.phase = 'choice';
    this.emit('phase', 'choice');
    this.emit('choice', { prompt: this.nightDef.choice.prompt, options: this.choiceOptions() });
  }
  // seçim yapmadan araştırmaya dön
  deferChoice() {
    if (this.phase !== 'choice') return;
    this.audio.click();
    this.phase = 'talk';
    this.emit('phase', 'talk');
    this.emit('choice', null);
    this.voice.play([{ s: 'ece', t: 'Bekle Ali, bir şeye bakıp hemen döneceğim.' }, ...this.nightDef.wait], () => {
      this.phase = 'radio';
      this.closeRadio();
      this.audio.squelch(true);
      this.toast('Radyo hâlâ o frekansta. Hazır olunca yeniden aç.');
    });
  }
  choose(id) {
    if (this.phase !== 'choice') return;
    const o = this.nightDef.choice.options.find((x) => x.id === id);
    const opt = this.choiceOptions().find((x) => x.id === id);
    if (!o || !opt || opt.locked) return;
    this.audio.click();
    this.phase = 'talk';
    this.emit('phase', 'talk');
    this.emit('choice', null);
    this.voice.play([{ s: 'ece', t: o.text }, ...o.lines], () => this.morph(o));
  }
  morph(o) {
    const wasMusic = this.S.music;
    Object.assign(this.S, o.flags);
    if (this.night === 2 && o.id === 'otobus' && wasMusic) this.S.cancelled = true;
    const text = o.changeByPath ? o.changeByPath[wasMusic ? 'music' : this.S.runaway ? 'runaway' : 'stayed'] : o.change;
    this.audio.whoosh();
    this.morphT = 0;
    this.emit('flash', 1);
    setTimeout(() => {
      this.attic.apply(this.S);
      this.syncProps();
      this.save();
    }, 350);
    this.phase = 'change';
    this.emit('phase', 'change');
    this.emit('change', { text });
    if (this.S.paradox) setTimeout(() => this.audio.sad(), 900);
  }
  afterChange() {
    if (this.phase !== 'change') return;
    this.phase = 'talk';
    this.emit('phase', 'talk');
    this.emit('change', null);
    const N = this.nightDef;
    const out = this.S.paradox && N.outroParadox ? N.outroParadox : N.outro;
    this.voice.play(out, () => this.endNight());
  }
  endNight() {
    this.audio.setRadio(false);
    if (this.night < NIGHTS.length) {
      this.emit('fade', 1);
      setTimeout(() => this.startNight(this.night + 1), this.testMode ? 50 : 900);
      return;
    }
    const key = this.S.best ? 'best' : this.S.paradox ? 'paradox' : 'met';
    try {
      const got = new Set(savedEndings());
      got.add(key);
      localStorage.setItem(SAVE_KEY + '-endings', JSON.stringify([...got]));
      if (key !== 'paradox') localStorage.removeItem(SAVE_KEY);
      else this.save();
    } catch {}
    this.phase = 'ending';
    this.emit('phase', 'ending');
    this.emit('ending', { key, ...ENDINGS[key], canRewind: key !== 'best', got: savedEndings() });
  }
  // 2. gecenin başına geri sar
  rewind() {
    if (!this.snap2) return;
    this.S = { ...this.snap2.S };
    this.found = { ...this.found, ...this.snap2.found };
    this.attic.apply(this.S);
    this.syncProps();
    this.audio.whoosh();
    this.emit('flash', 1);
    this.startNight(2);
  }

  // ===================================================================
  toast(text) {
    this.emit('toast', text);
  }
  pushHud() {
    const N = this.nightDef;
    this.emit('hud', { night: N.id, title: N.title, year: N.year, view: this.view, notes: this.notebook(), path: this.path });
  }
  markers() {
    const out = [];
    const v = new THREE.Vector3();
    const box = new THREE.Box3();
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const proj = (p) => {
      v.copy(p).project(this.camera);
      if (v.z > 1) return null;
      return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
    };
    if (this.view === 'genel') {
      for (const [z, d] of Object.entries(ZONES)) {
        const ids = Object.values(this.attic.hot).filter((hh) => hh.view === z);
        const n = ids.filter((hh) => CLUES[hh.id] && this.clueAvailable(hh.id) && !this.found[hh.id] && this.hotVisible(hh.id)).length + (z === 'sandik' && !this.lidOpen ? 1 : 0);
        const p = proj(new THREE.Vector3(...d.at));
        if (p) out.push({ id: 'zone:' + z, label: d.label, count: n, ...p, kind: 'zone' });
      }
      return out;
    }
    for (const hh of Object.values(this.attic.hot)) {
      if (hh.view !== this.view) continue;
      const o = this.hotVisible(hh.id);
      if (!o) continue;
      let kind;
      if (hh.id === 'radyo') kind = 'action';
      else if (hh.id === 'sandik') {
        if (this.lidOpen) continue;
        kind = 'action';
      } else if (FLAVOR[hh.id]) kind = 'seen';
      else if (CLUES[hh.id]) kind = this.clueAvailable(hh.id) ? (this.found[hh.id] ? 'seen' : 'new') : 'seen';
      else continue;
      box.setFromObject(o);
      const c = box.getCenter(new THREE.Vector3());
      const p = proj(c);
      if (p) out.push({ id: hh.id, kind, label: hh.id === 'radyo' ? 'Radyoyu aç' : hh.id === 'sandik' ? 'Sandığı aç' : '', ...p });
    }
    return out;
  }

  // ===================================================================
  resize() {
    const w = this.container.clientWidth || innerWidth, h = this.container.clientHeight || innerHeight;
    const pr = Math.min(devicePixelRatio || 1, this.low ? 1.5 : 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 72 : this.touch ? 62 : 52;
    this.camera.updateProjectionMatrix();
  }
  pause(on) {
    this.paused = on;
    this.voice.pause(on);
    if (on) this.audio.suspend();
    else this.audio.resume();
  }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const rdt = Math.min(0.05, this.clock.getDelta());
    if (this.paused) return;
    this.time += rdt;
    this.voice.update(this.fast ? rdt * 25 : rdt);
    this.audio.update(rdt);
    if (this.phase === 'radio') this.updateRadio(rdt);
    // kapak animasyonu
    if (this.lidAnim !== undefined && this.lidAnim < 1) {
      this.lidAnim = Math.min(1, this.lidAnim + rdt * 1.4);
      this.attic.lid.rotation.x = -1.9 * (1 - Math.pow(1 - this.lidAnim, 3));
    }
    // radyo ışığı ve ibre
    const ru = this.attic.radio.userData;
    const radioLit = this.phase === 'radio' || this.phase === 'talk' || this.phase === 'choice' || this.phase === 'change';
    ru.glow.intensity += ((radioLit ? 1.6 : 0) - ru.glow.intensity) * Math.min(1, rdt * 4);
    ru.dial.material.emissiveIntensity = 0.25 + ru.glow.intensity * 0.6;
    ru.needle.position.x = 0.08 + ((this.freq - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) * 0.18;
    ru.knobs[1].rotation.y = this.freq * 2;
    // kamera
    const k = 1 - Math.pow(0.02, rdt);
    this.camPos.lerp(this.camGoalPos, k);
    this.camLook.lerp(this.camGoalLook, k);
    this.drag.yaw += (this.drag.tyaw - this.drag.yaw) * Math.min(1, rdt * 8);
    this.drag.pitch += (this.drag.tpitch - this.drag.pitch) * Math.min(1, rdt * 8);
    const dir = this.camLook.clone().sub(this.camPos);
    const dist = dir.length();
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const breathe = Math.sin(this.time * 0.7) * 0.01;
    this.camera.position.copy(this.camPos).add(new THREE.Vector3(0, breathe, 0));
    const look = this.camLook.clone().addScaledVector(right, -this.drag.yaw * dist).add(new THREE.Vector3(0, -this.drag.pitch * dist, 0));
    this.camera.lookAt(look);
    this.attic.update(rdt, this.time);
    this.composer.render(rdt);
    this._mk = (this._mk || 0) + rdt;
    if (this._mk > 0.1) {
      this._mk = 0;
      const moving = this.camPos.distanceTo(this.camGoalPos) > 0.06;
      this.emit('markers', this.phase === 'explore' && !moving ? this.markers() : []);
    }
  }

  dispose() {
    this.running = false;
    this.voice.stop();
    window.removeEventListener('resize', this._resize);
    this.audio.ctx && this.audio.ctx.close();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    if (window.__radyo === this) delete window.__radyo;
  }
}
