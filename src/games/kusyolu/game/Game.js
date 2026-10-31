import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { EffectComposer, RenderPass, EffectPass, SMAAEffect, BloomEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { VoiceSystem } from '@engine/voice.js';
import { VoiceBank } from '@engine/voicebank.js';
import { KusAudio } from './audio.js';
import { NPC } from './npc.js';
import { Player } from './player.js';
import { SPEAKERS, VOICE_INDEX, CHAPTERS } from './story.js';
import { Chapter1 } from './chapters/ch1.js';
import { Chapter2 } from './chapters/ch2.js';
import { Chapter3 } from './chapters/ch3.js';
import { Chapter4 } from './chapters/ch4.js';
import { Chapter5 } from './chapters/ch5.js';

import { BASE, V3 } from './util.js';
const CH = { 1: Chapter1, 2: Chapter2, 3: Chapter3, 4: Chapter4, 5: Chapter5 };
const SAVE = 'kusyolu-save';

export function loadSave() {
  try {
    return { max: 1, ...JSON.parse(localStorage.getItem(SAVE) || '{}') };
  } catch {
    return { max: 1 };
  }
}
function writeSave(s) {
  try {
    localStorage.setItem(SAVE, JSON.stringify(s));
  } catch {}
}

export class Game {
  constructor(container, emit, opts = {}) {
    this.container = container;
    this.emit = emit;
    this.touch = !!opts.touch;
    this.testMode = !!opts.test;
    this.low = !!opts.low;
    this.time = 0;
    this.phase = 'menu';
    this.loop = this.loop.bind(this);
    this.manual = false;

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false }));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = 'ky-canvas';
    container.appendChild(r.domElement);
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 2000);
    this.scene = new THREE.Scene();
    this.player = new Player(this.camera);
    this.player.onStep = (run) => this.audio.step(this.surface || 'concrete', run);

    this.composer = new EffectComposer(r, { frameBufferType: THREE.HalfFloatType });
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new BloomEffect({ intensity: 1.1, luminanceThreshold: 0.8, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.75 });
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX !== undefined ? ToneMappingMode.AGX : ToneMappingMode.ACES_FILMIC });
    const fx = [this.bloom, new VignetteEffect({ darkness: 0.55, offset: 0.3 }), this.tone];
    if (!this.low) fx.unshift(new SMAAEffect());
    this.composer.addPass(new EffectPass(this.camera, ...fx));
    this.exposure = 1;
    this.bloomBase = 1.1;

    this.audio = new KusAudio();
    const useBank = !(this.testMode && !/[?&]voices\b/.test(location.search));
    this.voice = new VoiceSystem(this.audio, (s) => this.onSubtitle(s), SPEAKERS, VOICE_INDEX, useBank ? new VoiceBank(BASE + 'voices/') : null);
    this.nameToId = {};
    for (const [k, v] of Object.entries(SPEAKERS)) this.nameToId[v.name] = k;

    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.npcs = {};
    this.interact = [];
    this.focus = null;
    this.timers = [];
    this.updaters = [];

    this.bindInput();
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    this.resize();
    this.clock = new THREE.Clock();
    this.running = true;
    window.__kusyolu = this;
    requestAnimationFrame(this.loop);
  }

  // ------------------------------------------------------------------
  // yükleme yardımcıları
  // ------------------------------------------------------------------
  gltf(url) {
    return new Promise((res, rej) => this.loader.load(BASE + url, res, undefined, rej));
  }
  async json(url) {
    const r = await fetch(BASE + url);
    return r.json();
  }
  async loadEnv() {
    if (this.envTex) return this.envTex;
    const hdr = await new Promise((res, rej) => new RGBELoader().load(BASE + 'env_night_1k.hdr', res, undefined, rej));
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pm.fromEquirectangular(hdr).texture;
    hdr.dispose();
    pm.dispose();
    return this.envTex;
  }
  tex(url, srgb = true) {
    const t = new THREE.TextureLoader().load(BASE + url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  progress(p, label) {
    this.emit('loading', { p, label });
  }
  clearLevel() {
    this.voice.stop();
    this.audio && this.audio.engG && this.audio.engine(0);
    this.timers = [];
    this.updaters = [];
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.scene = new THREE.Scene();
    this.renderPass.mainScene = this.scene;
    this.renderPass.scene = this.scene;
    this.npcs = {};
    this.alias = {};
    while (this.camera.children.length) this.camera.remove(this.camera.children[0]);
    this.interact = [];
    this.focus = null;
    this.emissives = [];
    this.pulseMuted = false;
    this.pulseAffects = true;
    this.sky = null;
    this.pulseMode = false;
    this.flickerT = 0;
    this.flashT = 0;
    this.korLight = null;
    this.kor = null;
    this.player.seat = null;
    this.player.lookOverride = null;
    this.player.slow = false;
    this.player.locked = false;
    this.player.groundFn = null;
    this.camera.near = 0.05;
    this.camera.far = 2000;
    this.camera.updateProjectionMatrix();
    this.emit('prompt', null);
    this.emit('carry', null);
    this.emit('stealth', null);
  }
  // oyun zamanına bağlı zamanlayıcı (duraklatınca bekler)
  later(sec, fn) {
    const id = { at: this.time + sec, fn };
    this.timers.push(id);
    return id;
  }
  runTimers() {
    if (!this.timers.length) return;
    const due = this.timers.filter((x) => x.at <= this.time);
    if (!due.length) return;
    this.timers = this.timers.filter((x) => x.at > this.time);
    for (const x of due) x.fn();
  }
  say(lines, done) {
    this.voice.play(lines.map((l) => ({ ...l })), done);
  }
  objective(t) {
    this.emit('objective', t);
  }
  card(title, sub) {
    this.emit('card', { title, sub });
  }

  async loadNPC(id, place, file) {
    const g = await this.gltf(`chars/${file || id}.glb`);
    const npc = new NPC(id, g, { clip: place.clip || 'idle' });
    npc.root.position.copy(V3(place.p));
    if (place.sitH) npc.root.position.y -= 0.4;
    npc.root.rotation.y = THREE.MathUtils.degToRad(place.yaw || 0);
    npc.wantYaw = npc.root.rotation.y;
    npc.lookTarget = this.camera.position;
    this.scene.add(npc.root);
    this.npcs[id] = npc;
    return npc;
  }
  async loadNPCs(map, { talk = true } = {}) {
    const ids = Object.keys(map);
    let n = 0;
    await Promise.all(
      ids.map(async (id) => {
        const m = map[id];
        const npc = await this.loadNPC(id, m, m.file);
        if (talk && SPEAKERS[id]) this.interact.push({ id: 'npc:' + id, pos: () => npc.root.position.clone().add(new THREE.Vector3(0, m.sitH ? 1.05 : 1.45, 0)), r: 2.6, label: `${SPEAKERS[id].name} ile konuş` });
        this.progress(0.6 + (++n / ids.length) * 0.35, 'Karakterler');
      })
    );
  }

  setupLights({ moon = 0.35, hemi = 0.22, shadowCenter, env = 0.35, span = 22 }) {
    const s = this.scene;
    s.environment = this.envTex;
    s.environmentIntensity = env;
    this.hemiBase = hemi;
    this.hemi = new THREE.HemisphereLight(0x2a3a66, 0x120c08, hemi);
    s.add(this.hemi);
    const m = (this.moonL = new THREE.DirectionalLight(0x9fb2ff, moon));
    m.position.set(shadowCenter.x - 30, shadowCenter.y + 60, shadowCenter.z + 20);
    m.target.position.copy(shadowCenter);
    m.castShadow = moon > 0;
    const ss = this.low ? 1024 : 2048;
    m.shadow.mapSize.set(ss, ss);
    Object.assign(m.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 160 });
    m.shadow.bias = -0.0004;
    m.shadow.normalBias = 0.03;
    s.add(m, m.target);
    this.flashL = new THREE.DirectionalLight(0xc8ffe0, 0);
    s.add(this.flashL, this.flashL.target);
  }

  tuneMaterials(root) {
    this.emissives = this.emissives || [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.receiveShadow = true;
      const m = o.material;
      if (!m) return;
      if (m.emissive && (m.emissiveIntensity > 0 || m.emissiveMap) && m.emissive.getHex() !== 0) {
        if (/bulb|doorbulb/.test(m.name)) m.emissiveIntensity = Math.min(m.emissiveIntensity, 3);
        else if (/lamp/.test(m.name)) m.emissiveIntensity = Math.min(m.emissiveIntensity, 6);
        else if (/tube/.test(m.name)) m.emissiveIntensity = Math.min(m.emissiveIntensity, 3);
        this.emissives.push({ m, base: m.emissiveIntensity, name: m.name });
      } else {
        o.castShadow = true;
      }
      if (m.map) m.map.anisotropy = this.low ? 2 : 8;
      m.envMapIntensity = 0.5;
    });
  }
  // grup adı öneki ile düğüm bul (glb içindeki "L1__…", "item_sac__…")
  groupNodes(root, prefix) {
    const out = [];
    root.traverse((o) => {
      if (o.name && o.name.startsWith(prefix)) out.push(o);
    });
    return out;
  }
  groundRay(meshes) {
    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const o = new THREE.Vector3();
    return (x, z) => {
      ray.set(o.set(x, 30, z), down);
      const h = ray.intersectObjects(meshes, false)[0];
      return h ? h.point.y : 0;
    };
  }

  // ------------------------------------------------------------------
  // bölümler
  // ------------------------------------------------------------------
  async start(n = 1) {
    this.audio.init();
    this.phase = 'loading';
    this.emit('phase', 'loading');
    await this.runChapter(n);
  }
  async runChapter(n, opts = {}) {
    this.chNum = n;
    this.ch = new CH[n](this);
    this.phase = 'loading';
    this.emit('phase', 'loading');
    this.progress(0.02, 'Yükleniyor');
    await this.ch.load(opts);
    this.phase = 'play';
    this.emit('phase', 'play');
    this.emit('fade', 0);
    this.ch.begin(opts);
  }
  completeChapter(next) {
    const s = loadSave();
    s.max = Math.max(s.max, Math.min(next, CHAPTERS.length + 1));
    writeSave(s);
    this.emit('saved', s);
    const nx = CHAPTERS.find((c) => c.n === next);
    this.emit('card', { title: `Bölüm ${this.chNum} tamamlandı`, sub: nx ? `Sıradaki: ${nx.title}` : 'Sıradaki: Sessiz Komşu (Ay) · yakında', end: true, next: nx ? next : null });
  }
  async nextChapter(n) {
    this.emit('card', null);
    this.emit('fade', 1);
    await new Promise((r) => setTimeout(r, 700));
    await this.runChapter(n);
  }
  choose(id) {
    this.emit('choice', null);
    this.ch && this.ch.choose && this.ch.choose(id);
  }
  toggleHide() {
    this.ch && this.ch.toggleHide && this.ch.toggleHide();
  }

  onInteract() {
    const f = this.focus;
    if (!f || this.player.locked) return;
    this.audio.ui();
    if (f.id.startsWith('npc:')) {
      if (this.voice.busy) return;
      this.ch.talk && this.ch.talk(f.id.slice(4));
    } else this.ch.interact && this.ch.interact(f);
  }
  // konuşan karakterin konuşma pozuna geçmesi
  talkPose(id, on) {
    const n = this.npcs[id];
    if (!n || n.path) return;
    if (on && n.clipName === 'idle') n.play('talk', 0.3);
    else if (!on && n.clipName === 'talk') n.play('idle', 0.5);
  }

  // ------------------------------------------------------------------
  onSubtitle(s) {
    this.emit('subtitle', s);
    for (const n of Object.values(this.npcs)) n.speaking = false;
    if (s) {
      const id = this.nameToId[s.who];
      const n = this.npcs[id] || (this.alias && this.npcs[this.alias[id]]);
      if (n) {
        n.speaking = true;
        n.speakFallback = !this.voice.el;
      }
    }
  }

  bindInput() {
    const el = this.renderer.domElement;
    this.keys = {};
    this._kd = (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'Enter') this.onInteract();
      if (e.code === 'KeyQ' || e.code === 'KeyF') this.toggleHide();
      if (e.code === 'Space' && this.voice.cur) {
        this.voice.cur.t = 999;
        this.voice.cur.ended = true;
      }
      this.syncKeys();
    };
    this._ku = (e) => {
      this.keys[e.code] = false;
      this.syncKeys();
    };
    addEventListener('keydown', this._kd);
    addEventListener('keyup', this._ku);
    el.addEventListener('click', () => {
      this.audio.init();
      if (!this.touch && this.phase === 'play' && document.pointerLockElement !== el) el.requestPointerLock?.()?.catch?.(() => {});
      else if (this.phase === 'play') this.onInteract();
    });
    this._mm = (e) => {
      if (document.pointerLockElement === el) this.player.look(e.movementX * 0.0022, e.movementY * 0.0022);
    };
    addEventListener('mousemove', this._mm);
    this._plc = () => this.emit('lock', document.pointerLockElement === el);
    document.addEventListener('pointerlockchange', this._plc);
  }
  syncKeys() {
    const k = this.keys;
    this.player.input.f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    this.player.input.s = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    this.player.input.run = !!(k.ShiftLeft || k.ShiftRight);
  }
  setMove(x, y, run) {
    this.player.input.s = x;
    this.player.input.f = y;
    this.player.input.run = run;
  }
  lookDelta(dx, dy) {
    this.player.look(dx * 0.005, dy * 0.005);
  }

  updateFocus() {
    let best = null, bs = 0;
    const cp = this.camera.position, fw = this.player.forward();
    for (const it of this.interact) {
      if (it.hidden) continue;
      const p = it.pos();
      const d = p.clone().sub(cp);
      const dist = d.length();
      if (dist > it.r) continue;
      const dot = d.normalize().dot(fw);
      const s = dot - dist * 0.02;
      if (dot > (it.cone || 0.93) && s > bs) {
        bs = s;
        best = it;
      }
    }
    if (best !== this.focus) {
      this.focus = best;
      this.emit('prompt', best ? best.label : null);
    }
  }

  resize() {
    const w = this.container.clientWidth || innerWidth, h = this.container.clientHeight || innerHeight;
    const pr = Math.min(devicePixelRatio || 1, this.low ? 1.25 : 2);
    this.pr = pr;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 82 : 72;
    this.camera.updateProjectionMatrix();
  }
  pause(on) {
    this.paused = on;
    this.voice.pause(on);
    if (on) this.audio.suspend();
    else this.audio.resume();
  }

  step(dt) {
    this.time += dt;
    const t = this.time;
    this.runTimers();
    this.voice.update(this.fast ? dt * 20 : dt);
    this.audio.update(dt);
    if (this.voice.el) this.audio.attachVoice(this.voice.el);
    if (this.phase !== 'play') return;
    if (this.player.lookOverride) {
      const lo = this.player.lookOverride;
      lo.w += ((this.lookRamp || 0.85) * 0.9 - lo.w) * Math.min(1, dt * 1.2);
    }
    this.player.update(dt, t);
    // parlama (göktaşı, motor ateşi)
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt * 0.55);
      const f = Math.pow(this.flashT, 1.6);
      if (this.flashL) this.flashL.intensity = f * 6;
      this.sky && this.sky.flash(f * 0.9);
      this.exposure = 1 + f * 1.2;
    } else this.exposure += (1 - this.exposure) * Math.min(1, dt * 2);
    // ışık titremesi (patlama) ve Kor nabzı
    if (this.emissives && this.emissives.length) {
      let k = 1;
      if (this.flickerT > 0) {
        this.flickerT -= dt;
        k = Math.random() < 0.3 ? 0.2 : 1;
      }
      let pk = 1;
      if (this.pulseMode) {
        const p = Math.pow(Math.max(0, Math.sin(t * 2.4)), 6);
        this.pulse = p;
        pk = 0.35 + p * 1.6;
        if (p > 0.9 && !this._pulsed) {
          this._pulsed = true;
          this.audio.korPulse(this.pulseMuted ? 0.25 : 0.6);
        }
        if (p < 0.5) this._pulsed = false;
      } else this.pulse = 0;
      for (const e of this.emissives) e.m.emissiveIntensity = e.base * k * (this.pulseMode && this.pulseAffects !== false ? pk : 1);
    }
    this.ch && this.ch.update && this.ch.update(dt, t);
    for (const u of this.updaters) u(dt, t);
    const realVoice = !!(this.voice.el && !this.voice.el.paused);
    for (const n of Object.values(this.npcs)) {
      if (n.speaking) n.speakFallback = !realVoice;
      n.update(dt, t, this.camera, n.speaking ? this.audio.voiceLevel : 0);
    }
    this.sky && this.sky.update(dt, t, this.camera, this.pr);
    this.updateFocus();
  }
  render() {
    this.bloom.intensity = this.bloomBase * Math.min(2.5, this.exposure);
    if (this.hemi) this.hemi.intensity = (this.hemiBase || 0.22) * this.exposure;
    this.composer.render();
  }
  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
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
    this.voice.stop();
    this.timers = [];
    removeEventListener('keydown', this._kd);
    removeEventListener('keyup', this._ku);
    removeEventListener('mousemove', this._mm);
    document.removeEventListener('pointerlockchange', this._plc);
    window.removeEventListener('resize', this._resize);
    this.audio.ctx && this.audio.ctx.close();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    if (window.__kusyolu === this) delete window.__kusyolu;
  }
}
