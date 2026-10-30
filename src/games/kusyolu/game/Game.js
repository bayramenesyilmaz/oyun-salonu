import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { EffectComposer, RenderPass, EffectPass, SMAAEffect, BloomEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { VoiceSystem } from '@engine/voice.js';
import { VoiceBank } from '@engine/voicebank.js';
import { KusAudio } from './audio.js';
import { makeSky, glowTex } from './sky.js';
import { NPC } from './npc.js';
import { Player } from './player.js';
import { SPEAKERS, VOICE_INDEX, CHAPTER1 as C1, OBJECTIVES } from './story.js';

const BASE = '/kusyolu/';
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

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
    this.player.onStep = (run) => this.audio.step(this.level === 'arsa' ? 'dirt' : 'concrete', run);

    this.composer = new EffectComposer(r, { frameBufferType: THREE.HalfFloatType });
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new BloomEffect({ intensity: 1.1, luminanceThreshold: 0.8, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.75 });
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX !== undefined ? ToneMappingMode.AGX : ToneMappingMode.ACES_FILMIC });
    const fx = [this.bloom, new VignetteEffect({ darkness: 0.55, offset: 0.3 }), this.tone];
    if (!this.low) fx.unshift(new SMAAEffect());
    this.composer.addPass(new EffectPass(this.camera, ...fx));
    this.exposure = 1;

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
    this.talked = new Set();
    this.talkCount = {};
    this.seq = [];
    this.timers = [];

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
  // yükleme
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
  progress(p, label) {
    this.emit('loading', { p, label });
  }
  clearLevel() {
    this.voice.stop();
    this.timers = [];
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.scene = new THREE.Scene();
    this.renderPass.mainScene = this.scene;
    this.renderPass.scene = this.scene;
    this.npcs = {};
    this.interact = [];
    this.focus = null;
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

  async start() {
    this.audio.init();
    this.phase = 'loading';
    this.emit('phase', 'loading');
    await this.loadCati();
    this.phase = 'play';
    this.emit('phase', 'play');
    this.beginCati();
  }

  async loadNPCs(meta) {
    const ids = Object.keys(meta.npc);
    let n = 0;
    await Promise.all(
      ids.map(async (id) => {
        const g = await this.gltf(`chars/${id}.glb`);
        const m = meta.npc[id];
        const npc = new NPC(id, g, { clip: m.clip || 'idle' });
        npc.root.position.copy(V3(m.p));
        if (m.sitH) npc.root.position.y -= 0.4;
        npc.root.rotation.y = THREE.MathUtils.degToRad(m.yaw || 0);
        npc.lookTarget = this.camera.position;
        this.scene.add(npc.root);
        this.npcs[id] = npc;
        this.interact.push({ id: 'npc:' + id, pos: () => npc.root.position.clone().add(new THREE.Vector3(0, m.sitH ? 1.05 : 1.45, 0)), r: 2.6, label: `${SPEAKERS[id].name} ile konuş` });
        this.progress(0.6 + (++n / ids.length) * 0.35, 'Ekip');
      })
    );
  }

  setupLights(meta, { moon = 0.35, hemi = 0.22, shadowCenter }) {
    const s = this.scene;
    s.environment = this.envTex;
    s.environmentIntensity = 0.35;
    this.hemi = new THREE.HemisphereLight(0x2a3a66, 0x120c08, hemi);
    s.add(this.hemi);
    const m = (this.moonL = new THREE.DirectionalLight(0x9fb2ff, moon));
    m.position.set(shadowCenter.x - 30, shadowCenter.y + 60, shadowCenter.z + 20);
    m.target.position.copy(shadowCenter);
    m.castShadow = true;
    const ss = this.low ? 1024 : 2048;
    m.shadow.mapSize.set(ss, ss);
    Object.assign(m.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 160 });
    m.shadow.bias = -0.0004;
    m.shadow.normalBias = 0.03;
    s.add(m, m.target);
    // göktaşı parlaması (başta kapalı)
    this.flashL = new THREE.DirectionalLight(0xc8ffe0, 0);
    s.add(this.flashL, this.flashL.target);
  }

  tuneMaterials(root) {
    this.emissives = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.receiveShadow = true;
      const m = o.material;
      if (!m) return;
      if (m.emissive && (m.emissiveIntensity > 0 || m.emissiveMap) && m.emissive.getHex() !== 0) {
        // Blender'daki ışıma güçleri gerçek zamanlı çizimde fazla parlak: yumuşat
        if (/bulb|doorbulb/.test(m.name)) m.emissiveIntensity = Math.min(m.emissiveIntensity, 3);
        else if (/lamp/.test(m.name)) m.emissiveIntensity = Math.min(m.emissiveIntensity, 6);
        this.emissives.push({ m, base: m.emissiveIntensity });
      } else {
        o.castShadow = true;
      }
      if (m.map) m.map.anisotropy = this.low ? 2 : 8;
      m.envMapIntensity = 0.5;
    });
  }

  // ------------------------------------------------------------------
  // Bölüm 1A: çatı
  // ------------------------------------------------------------------
  async loadCati() {
    this.clearLevel();
    this.level = 'cati';
    this.progress(0.05, 'Gökyüzü');
    await this.loadEnv();
    const meta = (this.meta = await this.json('cati.json'));
    this.progress(0.15, 'Mahalle');
    const g = await this.gltf('cati.glb');
    this.progress(0.55, 'Mahalle');
    this.scene.add(g.scene);
    this.tuneMaterials(g.scene);
    this.sky = makeSky(this.scene);
    this.setupLights(meta, { shadowCenter: V3(meta.tea) });
    // çatıdaki ampuller ve kapı lambası
    for (const p of meta.bulbs.slice(0, this.low ? 2 : 4)) {
      const l = new THREE.PointLight(0xffb070, 3.2, 9, 2);
      l.position.copy(V3(p));
      this.scene.add(l);
    }
    const dl = new THREE.PointLight(0xffc080, 4, 7, 2);
    dl.position.copy(V3(meta.door)).add(new THREE.Vector3(-1.2, 1.3, 0.2));
    this.scene.add(dl);
    // sokak lambaları: çatıya yakın olanlar gerçek ışık (cepheleri aydınlatır)
    const near = meta.lamps.map((p) => V3(p)).sort((a, b) => a.length() - b.length()).slice(0, this.low ? 2 : 5);
    for (const p of near) {
      const l = new THREE.PointLight(0xff8a3a, 60, 26, 2);
      l.position.copy(p);
      this.scene.add(l);
    }
    await this.loadNPCs(meta);
    this.player.colliders = meta.colliders;
    this.player.groundFn = null;
    this.player.place(meta.spawn, meta.spawnYaw);
    this.player.floorY = meta.roof;
    // etkileşimler
    this.interact.push({ id: 'tea', pos: () => V3(meta.tea), r: 2.0, label: 'Çay al' });
    this.interact.push({ id: 'door', pos: () => V3(meta.door), r: 2.2, label: 'Aşağı in', hidden: true });
    this.progress(1, '');
  }

  beginCati() {
    this.stage = 'intro';
    this.player.locked = false;
    this.npcs.mert && this.npcs.mert.setExpr({ smile: 0.25 });
    this.npcs.zeynep && this.npcs.zeynep.setExpr({ smile: 0.15 });
    this.emit('card', { title: 'Bölüm 1 · ' + C1.title, sub: C1.place });
    this.later(3.5, () => {
      this.say(C1.intro, () => {
        this.stage = 'talk';
        this.objective(OBJECTIVES.talk(0));
        this.meteorClock = 0;
      });
    });
  }
  objective(t) {
    this.emit('objective', t);
  }

  onInteract() {
    const f = this.focus;
    if (!f || this.player.locked) return;
    this.audio.ui();
    if (f.id.startsWith('npc:')) {
      const id = f.id.slice(4);
      if (this.voice.busy) return;
      const set = C1.talk[id];
      if (this.stage === 'talk' || this.stage === 'free') {
        const k = this.talkCount[id] || 0;
        this.talkCount[id] = k + 1;
        const lines = set ? set[Math.min(k, set.length - 1)] : [];
        const npc = this.npcs[id];
        if (npc && npc.clipName === 'idle') npc.play('talk', 0.3);
        this.say(lines, () => {
          if (npc && npc.clipName === 'talk') npc.play('idle', 0.5);
          if (this.stage === 'talk') {
            this.talked.add(id);
            this.objective(OBJECTIVES.talk(this.talked.size));
            if (this.talked.size >= 3) this.later(4, () => this.startMeteor());
          }
        });
      } else if (this.level === 'arsa') {
        const b = C1.idleBarks[id];
        b && this.say([{ s: id, t: b[0] }]);
      }
    } else if (f.id === 'tea') {
      this.audio.cup();
      if (!this.teaDone) {
        this.teaDone = true;
        this.say([{ s: 'mert', t: 'Afiyet olsun, şekeri kendin atarsın artık.' }]);
      }
    } else if (f.id === 'door' && this.stage === 'door') {
      this.goArsa();
    } else if (f.id === 'kor' && this.stage === 'take') {
      this.takeKor();
    }
  }

  startMeteor() {
    if (this.stage !== 'talk') return;
    this.stage = 'meteor';
    this.objective(OBJECTIVES.watch);
    this.voice.stop();
    // gökyüzünü boydan boya geçen yol: doğu-kuzeydoğudan alçak kuzeye
    const dirAt = (azDeg, elDeg, d) => {
      const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
      return new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)).multiplyScalar(d).add(new THREE.Vector3(0, this.meta.roof, 0));
    };
    const from = dirAt(38, 42, 420), to = dirAt(-14, 7, 330);
    this.player.locked = true;
    this.say(C1.meteor);
    this.later(1.2, () => {
      this.sky.startMeteor(from, to, 7.0);
      this.audio.hiss(7);
      this.player.lookOverride = { target: this.sky.meteorHead.position, w: 0 };
      this.lookRamp = 1;
      this.npcs.kaan && (this.npcs.kaan.play('point', 0.6), this.npcs.kaan.setExpr({ jaw: 0.25, wide: 0.7, brow: 0.6 }));
      this.npcs.elif && (this.npcs.elif.play('lookup', 0.6), this.npcs.elif.setExpr({ jaw: 0.15, brow: 0.5 }));
      for (const id of ['mert', 'zeynep']) {
        const n = this.npcs[id];
        if (n) n.setExpr({ wide: 0.6, brow: 0.5 });
      }
    });
    this.later(8.3, () => this.impactFlash());
  }
  impactFlash() {
    this.flashT = 1;
    const imp = V3(this.meta.meteor.impact);
    this.flashL.position.copy(imp).add(new THREE.Vector3(0, 30, 0));
    this.flashL.target.position.set(0, this.meta.roof, 0);
    this.player.lookOverride = { target: imp.clone().add(new THREE.Vector3(0, 25, 0)), w: this.player.lookOverride ? this.player.lookOverride.w : 0.6 };
    this.later(0.6, () => this.say(C1.afterFlash));
    for (const id of ['mert', 'zeynep']) this.npcs[id] && this.npcs[id].play('idle', 0.4);
    this.later(6.5, () => this.boom());
  }
  boom() {
    this.audio.boom();
    this.player.shake = 1.25;
    this.audio.carAlarm(0.6, 0, 14, 0.025);
    this.audio.carAlarm(1.4, 1, 16, 0.02);
    this.audio.carAlarm(2.3, 2, 12, 0.015);
    this.audio.dog(1.0, 0.05);
    this.audio.dog(2.6, 0.04);
    this.flickerT = 1.2;
    this.npcs.kaan && this.npcs.kaan.play('armsup', 0.2);
    this.npcs.elif && this.npcs.elif.play('idle', 0.4);
    this.later(3.0, () => {
      this.player.lookOverride = null;
      this.player.locked = false;
      for (const n of Object.values(this.npcs)) n.setExpr({ brow: 0.4 });
      this.npcs.kaan && this.npcs.kaan.play('idle', 0.6);
      this.say(C1.afterBoom, () => {
        this.stage = 'door';
        this.objective(OBJECTIVES.door);
        const d = this.interact.find((i) => i.id === 'door');
        if (d) d.hidden = false;
      });
    });
  }

  // ------------------------------------------------------------------
  // Bölüm 1B: arsa
  // ------------------------------------------------------------------
  async goArsa() {
    this.stage = 'transit';
    this.player.locked = true;
    this.emit('fade', 1);
    this.audio.runStairs(3.2);
    await new Promise((r) => setTimeout(r, 900));
    this.emit('phase', 'loading');
    try {
      await this.loadArsa();
    } catch (e) {
      console.error(e);
      this.emit('error', 'Arsa sahnesi yüklenemedi.');
      return;
    }
    this.emit('phase', 'play');
    this.emit('fade', 0);
    this.player.locked = false;
    this.stage = 'crater';
    this.objective(OBJECTIVES.crater);
    this.say(C1.arsaIntro);
  }
  async loadArsa() {
    this.clearLevel();
    this.level = 'arsa';
    const meta = (this.meta = await this.json('arsa.json'));
    const g = await this.gltf('arsa.glb');
    g.scene.traverse((o) => {
      if (o.isMesh && /^burn/.test(o.name)) o.visible = false;
    });
    this.scene.add(g.scene);
    this.tuneMaterials(g.scene);
    this.sky = makeSky(this.scene);
    const crater = V3(meta.crater);
    this.setupLights(meta, { shadowCenter: crater, moon: 0.3 });
    for (const p of meta.lamps.slice(0, this.low ? 2 : 4)) {
      const l = new THREE.PointLight(0xff8a3a, 70, 30, 2);
      l.position.copy(V3(p));
      this.scene.add(l);
    }
    // zemin yüksekliği: arazi ağına aşağı doğru ışın
    const ground = [];
    g.scene.traverse((o) => o.isMesh && /dry_ground|asphalt/.test(o.material.name || o.name) && ground.push(o));
    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    this.player.groundFn = (x, z) => {
      ray.set(new THREE.Vector3(x, 20, z), down);
      const h = ray.intersectObjects(ground, false)[0];
      return h ? h.point.y : 0;
    };
    // Kor: krater dibinde ışıyan taş
    this.kor = makeKor();
    this.kor.position.copy(V3(meta.kor));
    this.scene.add(this.kor);
    this.korLight = new THREE.PointLight(0xff8a30, 18, 14, 2);
    this.korLight.position.copy(this.kor.position).add(new THREE.Vector3(0, 0.6, 0));
    this.scene.add(this.korLight);
    this.smoke = makeSmoke(crater);
    this.scene.add(this.smoke.points);
    await this.loadNPCs(meta);
    for (const n of Object.values(this.npcs)) n.setExpr({ brow: 0.4, wide: 0.3 });
    this.player.colliders = meta.colliders;
    this.player.place(meta.spawn, meta.spawnYaw);
    this.interact.push({ id: 'kor', pos: () => this.kor.getWorldPosition(new THREE.Vector3()), r: 3.2, label: 'Taşı al', hidden: true });
  }
  takeKor() {
    this.stage = 'taken';
    this.objective(OBJECTIVES.end);
    this.voice.stop();
    this.audio.korPulse(1.2);
    this.scene.remove(this.kor);
    this.camera.add(this.kor);
    this.kor.position.set(0.22, -0.24, -0.5);
    this.kor.scale.setScalar(0.45);
    if (!this.scene.children.includes(this.camera)) this.scene.add(this.camera);
    this.korLight.intensity = 6;
    this.camera.add(this.korLight);
    this.korLight.position.set(0.2, -0.1, -0.3);
    this.pulseMode = true;
    this.npcs.elif && this.npcs.elif.play('idle', 0.5);
    this.say(C1.take, () => {
      this.emit('card', { title: 'Bölüm 1 tamamlandı', sub: 'Sıradaki: Kor', end: true });
      this.stage = 'end';
    });
    this.later(9, () => this.audio.siren(0, 24, 0.03));
  }

  // ------------------------------------------------------------------
  onSubtitle(s) {
    this.emit('subtitle', s);
    for (const n of Object.values(this.npcs)) n.speaking = false;
    if (s) {
      const id = this.nameToId[s.who];
      const n = this.npcs[id];
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
  // dokunmatik: App'ten gelir
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
      if (dot > 0.93 && s > bs) {
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
    if (this.phase !== 'play' && this.phase !== 'loading') return;
    if (this.stage === 'talk') {
      this.meteorClock = (this.meteorClock || 0) + dt;
      if (this.meteorClock > 100) this.startMeteor();
    }
    // sinematik bakış geçişi
    if (this.player.lookOverride) {
      const lo = this.player.lookOverride;
      lo.w += ((this.lookRamp || 0.85) * 0.9 - lo.w) * Math.min(1, dt * 1.2);
    }
    this.player.update(dt, t);
    // göktaşı parlaması
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt * 0.55);
      const f = Math.pow(this.flashT, 1.6);
      this.flashL.intensity = f * 6;
      this.sky && this.sky.flash(f * 0.9);
      this.exposure = 1 + f * 1.2;
    } else this.exposure += (1 - this.exposure) * Math.min(1, dt * 2);
    // ışık titremesi (patlama ve Kor)
    if (this.emissives) {
      let k = 1;
      if (this.flickerT > 0) {
        this.flickerT -= dt;
        k = Math.random() < 0.3 ? 0.2 : 1;
      }
      if (this.pulseMode) {
        const p = Math.max(0, Math.sin(t * 2.4));
        k *= 0.35 + Math.pow(p, 6) * 1.6;
        if (this.korLight) this.korLight.intensity = 3 + Math.pow(p, 6) * 10;
        if (Math.pow(p, 6) > 0.9 && !this._pulsed) {
          this._pulsed = true;
          this.audio.korPulse(0.6);
        }
        if (p < 0.5) this._pulsed = false;
      }
      for (const e of this.emissives) e.m.emissiveIntensity = e.base * k;
    }
    if (this.level === 'arsa') {
      if (this.kor && this.stage !== 'taken' && this.stage !== 'end') {
        const p = 0.5 + 0.5 * Math.sin(t * 2.4);
        this.kor.userData.mat.uniforms.glow.value = 0.6 + p * 0.8;
        if (this.korLight) this.korLight.intensity = 10 + p * 12;
      } else if (this.kor) {
        this.kor.userData.mat.uniforms.glow.value = 0.5 + Math.pow(Math.max(0, Math.sin(t * 2.4)), 6) * 1.8;
        this.kor.rotation.y += dt * 0.3;
      }
      if (this.kor) this.kor.userData.mat.uniforms.t.value = t;
      this.smoke && this.smoke.update(dt, t);
      if (this.stage === 'crater') {
        const d = this.player.pos.distanceTo(V3(this.meta.crater));
        if (d < 6.5) {
          this.stage = 'craterTalk';
          this.npcs.elif && this.npcs.elif.play('kneel', 0.6);
          this.say(C1.crater, () => {
            this.stage = 'take';
            this.objective(OBJECTIVES.take);
            const k = this.interact.find((i) => i.id === 'kor');
            if (k) k.hidden = false;
          });
        }
      }
    }
    const realVoice = !!(this.voice.el && !this.voice.el.paused);
    for (const n of Object.values(this.npcs)) {
      if (n.speaking) n.speakFallback = !realVoice;
      n.update(dt, t, this.camera, n.speaking ? this.audio.voiceLevel : 0);
    }
    this.sky && this.sky.update(dt, t, this.camera, this.pr);
    this.updateFocus();
  }
  render() {
    this.tone.toneMapping !== undefined;
    this.renderer.toneMappingExposure = this.exposure;
    // postprocessing'de pozlama: bloom yoğunluğu ve sahne parlaklığı
    this.bloom.intensity = 1.1 * Math.min(2.5, this.exposure);
    if (this.hemi) this.hemi.intensity = 0.22 * this.exposure;
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

// Kor: çatlaklarından turuncu ışık sızan, nabız gibi atan göktaşı parçası
function makeKor() {
  const geo = new THREE.IcosahedronGeometry(0.32, 5);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 9.1 + 1.3) * Math.cos(v.y * 7.7) * Math.sin(v.z * 8.3 + 2) * 0.06 + Math.sin(v.x * 23 + v.z * 17) * 0.012;
    v.multiplyScalar(1 + n + (v.y > 0 ? -0.1 : 0.05));
    p.setXYZ(i, v.x * 1.15, v.y * 0.85, v.z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, glow: { value: 1 } },
    vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vP; varying vec3 vN; uniform float t; uniform float glow;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){
        float n = n3(vP*14.0)*0.6 + n3(vP*31.0)*0.4;
        float veins = 1.0 - smoothstep(0.02, 0.09, abs(n3(vP*9.0 + vec3(0,t*0.05,0)) - 0.5));
        vec3 rock = mix(vec3(0.05,0.045,0.04), vec3(0.16,0.13,0.11), n);
        float lit = 0.35 + 0.65*max(dot(vN, normalize(vec3(0.3,1.0,0.5))), 0.0);
        vec3 c = rock * lit + vec3(1.0,0.45,0.12) * veins * glow * 2.2 + vec3(1.0,0.5,0.2)*pow(1.0-abs(vN.z),3.0)*0.15*glow;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.userData.mat = mat;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff8a3a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(1.8, 1.8, 1);
  m.add(halo);
  return m;
}

function makeSmoke(center) {
  const N = 140;
  const pos = new Float32Array(N * 3), life = new Float32Array(N), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    life[i] = Math.random();
    seed[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('life', new THREE.BufferAttribute(life, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { map: { value: glowTex() } },
    vertexShader: `attribute float life; varying float vL; varying float vNear; void main(){ vL = life; vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; float d = -mv.z; vNear = smoothstep(2.0, 6.0, d); gl_PointSize = min(150.0, (40.0 + life*260.0) / d * 5.0); }`,
    fragmentShader: `uniform sampler2D map; varying float vL; varying float vNear; void main(){ float a = texture2D(map, gl_PointCoord).a * (1.0-vL) * smoothstep(0.0,0.08,vL) * 0.13 * vNear; gl_FragColor = vec4(vec3(0.42,0.38,0.36)*(1.2-vL*0.5), a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return {
    points: pts,
    update(dt) {
      for (let i = 0; i < N; i++) {
        life[i] += dt * (0.07 + seed[i] * 0.05);
        if (life[i] > 1) life[i] -= 1;
        const L = life[i];
        pos[i * 3] = center.x + 1.2 + Math.sin(seed[i] * 40 + L * 3) * (0.4 + L * 2.5) + L * 6;
        pos[i * 3 + 1] = center.y + 0.8 + L * 16;
        pos[i * 3 + 2] = center.z + Math.cos(seed[i] * 23 + L * 2) * (0.5 + L * 2.5);
      }
      g.attributes.position.needsUpdate = true;
      g.attributes.life.needsUpdate = true;
    },
  };
}
