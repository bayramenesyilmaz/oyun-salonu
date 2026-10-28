import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { makeTextures } from '@engine/textures.js';
import { VoiceSystem } from '@engine/voice.js';
import { buildWorld, heightAt, SPOTS } from './world.js';
import { makeGoat, makeVillager, makeChicken } from './models.js';
import { KeciAudio, HALAY_BPM, HALAY_BEATS } from './music.js';
import { SPEAKERS, VOICE_INDEX, INTRO, QUESTS, FINALE_START, ENDING, BARKS } from './story.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const STEP = 1 / 60;
const BEAT = 60 / HALAY_BPM;

// Halay notaları: önce 3 vuruş, 1 boşluk; ikinci yarıda her vuruş
const CHART = [];
for (let b = 6; b < HALAY_BEATS - 2; b++) {
  if (b < 34 && b % 4 === 3) continue;
  CHART.push(b * BEAT);
}

export class Game {
  constructor(container, emit, opts = {}) {
    this.container = container;
    this.emit = emit;
    this.touch = !!opts.touch;
    this.testMode = !!opts.test;
    this.quality = opts.low ? 'low' : 'high';
    this.phase = 'loading';
    this.time = 0;
    this.keys = new Set();
    this.touchMove = { x: 0, y: 0 };
    this.cam = { yaw: -Math.PI / 2, pitch: 0.32, dist: 5.2 };
    this.sensitivity = 0.0024;
    this.stats = { chaos: 0, villagers: 0, pots: 0, melons: 0, bleats: 0, caught: 0, t: 0 };
    this.manual = false;
    this.loop = this.loop.bind(this);
  }

  async init() {
    await RAPIER.init();
    this.R = RAPIER;
    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: !this.testMode && this.quality !== 'low', powerPreference: 'high-performance' }));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(renderer.domElement);
    renderer.domElement.className = 'keci-canvas';

    const scene = (this.scene = new THREE.Scene());
    scene.fog = new THREE.Fog(0xcfe6f5, 60, 190);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);

    const hemi = new THREE.HemisphereLight(0xdff0ff, 0x8a7a50, 1.25);
    scene.add(hemi);
    const sun = (this.sun = new THREE.DirectionalLight(0xfff1d6, 2.4));
    sun.castShadow = true;
    const ss = this.quality === 'low' ? 1024 : 2048;
    sun.shadow.mapSize.set(ss, ss);
    Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);

    const T = makeTextures();
    this.W = buildWorld(scene, RAPIER, T);
    this.world = this.W.world;
    this.world.timestep = STEP;
    this.zones = this.W.zones;

    this.audio = new KeciAudio();
    this.voice = new VoiceSystem(this.audio, (s) => this.emit('subtitle', s), SPEAKERS, VOICE_INDEX);

    this.buildGoat();
    this.buildVillagers();
    this.buildChickens();
    this.buildDucks();
    this.buildFx();
    this.resetQuests();

    this.bindInput();
    this.resize();
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    this.clock = new THREE.Clock();
    this.running = true;
    this.setPhase('menu');
    window.__keci = this;
    this.heightAt = heightAt;
    this.SPOTS = SPOTS;
    requestAnimationFrame(this.loop);
  }

  // ---------------- KURULUM ----------------
  buildGoat() {
    const R = this.R;
    const g = (this.goat = makeGoat());
    this.scene.add(g.root);
    const s = SPOTS.start;
    this.goatBody = this.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(s.x + 1, 1.2, s.z).lockRotations().setLinearDamping(0.1).setCcdEnabled(true)
    );
    this.goatCol = this.world.createCollider(
      R.ColliderDesc.capsule(0.22, 0.36).setFriction(0).setFrictionCombineRule(R.CoefficientCombineRule.Min).setDensity(2.5).setRestitution(0),
      this.goatBody
    );
    this.goatYaw = Math.PI / 2;
    this.grounded = false;
    this.jumpBuf = 0;
    this.coyote = 0;
    this.buttCd = 0;
    this.bleatCd = 0;
    this.carry = null;
    this.energy = 0;
    this.inWater = false;
    this.stepT = 0;
    this.bellT = 0;
  }

  buildVillagers() {
    const W = SPOTS.wedding;
    const defs = [
      ['cafer', -24, 19, 0, 0.0],
      ['riza', SPOTS.stall.x, SPOTS.stall.z + 1.8, 1.2, 1],
      ['fadime', SPOTS.line.x, SPOTS.line.z - 2.6, 2, 1],
      ['muhtar', 12, -19.5, 2.5, 1],
      ['cocuk', 2, 2, 7, 2.4],
      ['gelin', W.x - 0.8, W.z - 8.5, 0.6, 0.5],
      ['damat', W.x + 0.8, W.z - 8.5, 0.6, 0.5],
      ['davulcu', W.x - 3.5, W.z - 6.5, 0.4, 0.4],
      ['zurnaci', W.x + 3.5, W.z - 6.5, 0.4, 0.4],
      ['koylu1', W.x - 5, W.z + 2, 4, 1],
      ['koylu2', W.x + 5, W.z - 1, 4, 1],
      ['koylu3', W.x + 2, W.z + 5, 4, 1],
    ];
    const R = this.R;
    this.villagers = defs.map(([kind, x, z, rad, speed]) => {
      const m = makeVillager(kind);
      this.scene.add(m.root);
      const pos = V(x, heightAt(x, z), z);
      const body = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, pos.y + 0.85, z));
      this.world.createCollider(R.ColliderDesc.capsule(0.5, 0.3), body);
      return { m, kind, pos, home: pos.clone(), rad, speed, target: pos.clone(), wait: Math.random() * 3, yaw: Math.random() * 6, body, panic: 0, vel: 0 };
    });
    this.cafer = this.villagers[0];
    this.cafer.state = 'intro';
    this.cafer.yaw = -Math.PI / 2;
    this.caferChaos = 0;
    this.chase = { t: 0, hidden: 0, cooldown: 0 };
    this.villagerByKind = Object.fromEntries(this.villagers.map((v) => [v.kind, v]));
    for (const v of this.villagers) {
      this.placeVillager(v);
      v.m.animate(0.016, 0, 0);
    }
  }

  buildChickens() {
    const starts = [[-10, -2], [4, -7], [-26, 6], [8, 12], [-20, -26]];
    this.chickens = starts.map(([x, z]) => {
      const m = makeChicken();
      m.root.scale.setScalar(1.3);
      this.scene.add(m.root);
      m.root.position.set(x, heightAt(x, z), z);
      return { m, pos: V(x, heightAt(x, z), z), dir: Math.random() * 6, speed: 0, wait: 0, inCoop: false, air: null, cluckT: Math.random() * 4 };
    });
  }

  buildDucks() {
    this.ducks = [];
    const yellow = new THREE.MeshStandardMaterial({ color: 0xf6d040, flatShading: true });
    const orange = new THREE.MeshStandardMaterial({ color: 0xf08020, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), yellow);
      b.scale.set(1, 0.8, 1.3);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), yellow);
      h.position.set(0, 0.22, 0.2);
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.12), orange);
      k.position.set(0, 0.2, 0.34);
      g.add(b, h, k);
      this.scene.add(g);
      this.ducks.push({ g, a: (i / 3) * 6.28, r: 3 + i * 1.5 });
    }
  }

  buildFx() {
    // parçacıklar: tek InstancedMesh
    const N = 400;
    this.fx = { n: N, i: 0, pos: [], vel: [], life: new Float32Array(N), rot: [] };
    this.fxMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), N);
    this.fxMesh.frustumCulled = false;
    const c = new THREE.Color(1, 1, 1);
    const m = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) {
      this.fx.pos.push(V());
      this.fx.vel.push(V());
      this.fx.rot.push(V());
      this.fxMesh.setMatrixAt(i, m);
      this.fxMesh.setColorAt(i, c);
    }
    this.scene.add(this.fxMesh);
    // çizgi roman yazıları: BONK! ÇAT! ŞAP! MEEE!
    this.words = {};
    for (const [w, col] of [['BONK!', '#ffdd33'], ['ÇAT!', '#ff7a3a'], ['ŞAP!', '#ff4a6a'], ['MEEE!', '#ffffff'], ['GÜM!', '#9ae0ff'], ['ŞLAP!', '#6ad0ff'], ['GIRT!', '#a6f06a'], ['YAŞASIN!', '#ffe36a']]) {
      const cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 128;
      const x = cv.getContext('2d');
      x.font = '900 64px "Baloo 2", Impact, Arial Black, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineWidth = 12;
      x.strokeStyle = '#1a1020';
      x.lineJoin = 'round';
      x.strokeText(w, 128, 66);
      x.fillStyle = col;
      x.fillText(w, 128, 66);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      this.words[w] = t;
    }
    this.pops = [];
  }

  burst(p, color, n = 12, speed = 4, up = 3) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = (this.fx.i = (this.fx.i + 1) % this.fx.n);
      this.fx.pos[i].copy(p);
      this.fx.vel[i].set((Math.random() - 0.5) * speed, Math.random() * up + 1, (Math.random() - 0.5) * speed);
      this.fx.rot[i].set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.fx.life[i] = 1 + Math.random() * 0.8;
      this.fxMesh.setColorAt(i, c);
    }
    this.fxMesh.instanceColor.needsUpdate = true;
  }

  pop(word, p) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.words[word], depthTest: false, transparent: true }));
    s.position.copy(p);
    s.renderOrder = 10;
    s.scale.set(1.6, 0.8, 1);
    this.scene.add(s);
    this.pops.push({ s, t: 0 });
  }

  resetQuests() {
    this.quests = QUESTS.map((q) => ({ ...q, n: 0, isDone: false, shown: !q.hidden }));
    this.qmap = Object.fromEntries(this.quests.map((q) => [q.id, q]));
    this.emitQuests();
  }

  emitQuests() {
    this.emit(
      'quests',
      this.quests.filter((q) => q.shown).map((q) => ({ id: q.id, title: q.title, text: q.text, n: q.n, total: q.total, done: q.isDone }))
    );
  }

  progress(id, n = 1) {
    const q = this.qmap[id];
    if (!q || q.isDone || !q.shown) return;
    q.n += n;
    if (q.total && q.n < q.total) {
      this.emit('toast', `${q.title}: ${q.n}/${q.total}`);
      this.audio.ui();
      this.emitQuests();
      return;
    }
    q.isDone = true;
    if (q.total) q.n = q.total;
    this.addChaos(20, false);
    this.audio.fanfare();
    this.emit('toast', `✔ ${q.title}`);
    this.voice.stop();
    this.voice.play(q.done);
    for (const v of this.villagers) if (q.done.some((l) => l.s === v.kind)) v.m.talk = 3;
    const left = this.quests.filter((x) => !x.hidden && !x.isDone);
    if (!left.length && !this.qmap.dugun.shown) {
      this.qmap.dugun.shown = true;
      this.voice.play([{ s: 'anlatici', t: 'Kuzulu\'da yaramazlık yapılmadık yer kalmadı. Ve uzaktan... davul sesi geliyor. Düğün başladı!' }]);
      this.emit('toast', 'Yeni görev: Düğün Halayı!');
      this.endChase(false);
    }
    this.emitQuests();
  }

  addChaos(n, toast = true) {
    this.stats.chaos += n;
    this.caferChaos += n;
    if (toast) this.emit('chaos', n);
  }

  bark(kind) {
    if (this.voice.busy) return;
    const list = BARKS[kind];
    if (!list) return;
    const line = pick(list);
    this.voice.play([line]);
    const v = this.villagerByKind[line.s];
    if (v) v.m.talk = 1.5;
  }

  // ---------------- AKIŞ ----------------
  setPhase(p) {
    this.phase = p;
    this.emit('phase', p);
  }

  start() {
    this.audio.init();
    this.audio.resume();
    this.audio.setMode('roam');
    this.setPhase('playing');
    this.stats.t = 0;
    this.voice.play(INTRO, () => {
      if (this.cafer.state === 'intro') this.cafer.state = 'wander';
    });
    this.cafer.m.talk = 6;
    this.lockPointer();
    this.emit('toast', 'Ahırın kapısına kafa at! (Sol tık / F)');
  }

  pause() {
    if (this.phase !== 'playing' && this.phase !== 'finale') return;
    this.pausedFrom = this.phase;
    this.setPhase('paused');
    this.voice.pause(true);
    this.audio.suspend();
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  resume() {
    if (this.phase !== 'paused') return;
    this.setPhase(this.pausedFrom || 'playing');
    this.voice.pause(false);
    this.audio.resume();
    this.ignoreUnlockUntil = performance.now() + 600;
    this.lockPointer();
  }

  // ---------------- GİRDİ ----------------
  bindInput() {
    this._keydown = (e) => {
      if (e.repeat) return;
      if (e.code === 'Escape' && (!document.pointerLockElement || this.touch)) {
        if (this.phase === 'paused') this.resume();
        else this.pause();
        return;
      }
      if (this.phase === 'finale') {
        if (e.code === 'Space' || e.code === 'KeyF' || e.code === 'Enter') this.halayHit();
        if (e.preventDefault) e.preventDefault();
        return;
      }
      if (this.phase !== 'playing') return;
      this.keys.add(e.code);
      if (e.code === 'Space') this.jumpBuf = 0.15;
      if (e.code === 'KeyF') this.headbutt();
      if (e.code === 'KeyE') this.interact();
      if (e.code === 'KeyQ') this.doBleat();
      if (['Space', 'Tab'].includes(e.code) && e.preventDefault) e.preventDefault();
    };
    this._keyup = (e) => this.keys.delete(e.code);
    this._mouse = (e) => {
      if (this.phase !== 'playing') return;
      const locked = document.pointerLockElement === this.renderer.domElement;
      if (locked || (this.lockFailed && e.buttons & 1)) this.look(e.movementX, e.movementY);
    };
    this._down = (e) => {
      if (document.pointerLockElement !== this.renderer.domElement) return;
      if (this.phase === 'finale' && e.button === 0) return this.halayHit();
      if (this.phase !== 'playing') return;
      if (e.button === 0) this.headbutt();
      if (e.button === 2) this.interact();
    };
    this._wheel = (e) => {
      if (this.phase === 'playing') this.cam.dist = THREE.MathUtils.clamp(this.cam.dist + Math.sign(e.deltaY) * 0.5, 3, 9);
    };
    this._lockErr = () => {
      this.lockFailed = true;
    };
    this._lock = () => {
      const locked = document.pointerLockElement === this.renderer.domElement;
      this.emit('lock', locked);
      if (!locked && (this.phase === 'playing' || this.phase === 'finale') && performance.now() > (this.ignoreUnlockUntil || 0)) this.pause();
    };
    this._click = () => {
      if ((this.phase === 'playing' || this.phase === 'finale') && !document.pointerLockElement) this.lockPointer();
      else if (this.phase === 'finale' && this.lockFailed) this.halayHit();
    };
    this._blur = () => this.keys.clear();
    this._vis = () => document.hidden && this.pause();
    this._ctx = (e) => e.preventDefault();
    document.addEventListener('pointerlockerror', this._lockErr);
    document.addEventListener('visibilitychange', this._vis);
    window.addEventListener('keydown', this._keydown);
    window.addEventListener('keyup', this._keyup);
    document.addEventListener('mousemove', this._mouse);
    document.addEventListener('mousedown', this._down);
    document.addEventListener('pointerlockchange', this._lock);
    this.renderer.domElement.addEventListener('click', this._click);
    this.renderer.domElement.addEventListener('wheel', this._wheel, { passive: true });
    this.renderer.domElement.addEventListener('contextmenu', this._ctx);
    window.addEventListener('blur', this._blur);
  }

  look(dx, dy) {
    this.cam.yaw -= dx * this.sensitivity;
    this.cam.pitch = THREE.MathUtils.clamp(this.cam.pitch + dy * this.sensitivity, -0.25, 1.1);
  }
  touchLook(dx, dy) {
    if (this.phase === 'playing') this.look(dx * 2.2, dy * 2.2);
  }
  setTouchMove(x, y) {
    this.touchMove = { x, y };
  }
  pressKey(code) {
    this._keydown({ code, repeat: false, preventDefault() {} });
    if (code !== 'Space') this.keys.delete(code);
    else setTimeout(() => this.keys.delete('Space'), 120);
  }
  holdKey(code, down) {
    if (down && this.phase === 'playing') this.keys.add(code);
    else this.keys.delete(code);
  }
  lockPointer() {
    const el = this.renderer.domElement;
    if (this.lockFailed || this.touch || this.testMode) return;
    try {
      const r = el.requestPointerLock();
      if (r && r.catch) r.catch(() => this._lockErr());
    } catch {
      this._lockErr();
    }
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    let pr = Math.min(window.devicePixelRatio, this.quality === 'low' ? 1 : 1.6);
    if (this.testMode) pr = 0.5;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 72 : 60;
    this.camera.updateProjectionMatrix();
  }
  setSensitivity(v) {
    this.sensitivity = 0.0024 * v;
  }
  setVolume(v) {
    this.audio.setVolume(v);
  }
  setVoice(on) {
    this.voice.enabled = on;
  }
  setQuality(low) {
    this.quality = low ? 'low' : 'high';
    this.resize();
  }

  // ---------------- EYLEMLER ----------------
  goatPos() {
    const t = this.goatBody.translation();
    return V(t.x, t.y - 0.58, t.z);
  }
  goatFwd() {
    return V(Math.sin(this.goatYaw), 0, Math.cos(this.goatYaw));
  }

  headbutt() {
    if (this.buttCd > 0) return;
    this.buttCd = 0.45;
    this.goat.butt = 0.35;
    this.audio.whoosh();
    // küçük ileri atılma
    const f = this.goatFwd();
    const lv = this.goatBody.linvel();
    this.goatBody.setLinvel({ x: lv.x + f.x * 3, y: lv.y, z: lv.z + f.z * 3 }, true);
    this.pendingButt = 0.12;
  }

  resolveButt() {
    const p = this.goatPos();
    const f = this.goatFwd();
    const hitP = p.clone().addScaledVector(f, 0.85).add(V(0, 0.6, 0));
    const power = this.energy > 0 ? 1.5 : 1;
    let hit = false;
    const R = this.R;

    for (const pr of this.W.props) {
      if (pr.broken) continue;
      const t = pr.body.translation();
      const bp = V(t.x, t.y, t.z);
      if (pr.kind === 'gate') {
        if (bp.distanceTo(hitP) < 1.9) {
          if (pr.locked) {
            pr.locked = false;
            pr.body.setBodyType(R.RigidBodyType.Dynamic, true);
            this.gateOpenedAt = this.time;
          }
          pr.body.applyImpulseAtPoint({ x: f.x * 5, y: 0, z: f.z * 5 }, { x: hitP.x, y: t.y, z: hitP.z }, true);
          hit = true;
        }
        continue;
      }
      if (pr.kind === 'tractor') {
        const d = Math.hypot(bp.x - p.x, bp.z - p.z);
        if (d < 2.8 && Math.abs(bp.y - p.y) < 2.5) {
          hit = true;
          if (!pr.rolling) {
            pr.hits++;
            pr.shake = 0.4;
            this.audio.engine();
            if (pr.hits === 1) this.emit('toast', 'Traktör kıpırdadı... bir daha!');
            if (pr.hits >= 3) this.releaseTractor(f);
          } else pr.body.applyImpulse({ x: f.x * 40, y: 5, z: f.z * 40 }, true);
        }
        continue;
      }
      const reach = pr.kind === 'hay' || pr.kind === 'barrel' || pr.kind === 'crate' ? 1.5 : 1.15;
      if (bp.distanceTo(hitP) < reach) {
        hit = true;
        const m = pr.body.mass();
        pr.body.wakeUp();
        pr.body.applyImpulse({ x: f.x * m * 6 * power, y: m * 3.2 * power, z: f.z * m * 6 * power }, true);
        pr.body.applyTorqueImpulse({ x: (Math.random() - 0.5) * m, y: (Math.random() - 0.5) * m, z: (Math.random() - 0.5) * m }, true);
        if (pr.kind === 'pot') this.breakProp(pr);
      }
    }

    for (const v of this.villagers) {
      if (v.m.fallen > 0) continue;
      const d = Math.hypot(v.pos.x - hitP.x, v.pos.z - hitP.z);
      if (d < 1.3 && this.phase === 'playing') {
        hit = true;
        v.m.fallen = 2.2;
        v.pos.addScaledVector(f, 0.6);
        this.stats.villagers++;
        this.addChaos(5);
        this.pop('BONK!', V(v.pos.x, v.pos.y + 2.2, v.pos.z));
        if (v === this.cafer) {
          this.voice.stop();
          this.voice.play([{ s: 'cafer', t: pick(['Ah! Kafa atma! Keçi değil koç musun sen?', 'Belim! Otuz yıllık belim!', 'Gıdık! Bu yaptığın ayıp!']) }]);
          this.cafer.m.talk = 1.5;
          if (this.cafer.state === 'chase') this.chase.t += 3;
        } else if (!this.voice.busy) {
          const own = BARKS.hitVillager.find((l) => l.s === v.kind);
          this.voice.play([own || { s: 'anlatici', t: pick(['Bir köylü daha yere serildi.', 'Köylü havada kısa bir tur attı.', 'Bu düşüş yıllarca anlatılacak.']) }]);
          v.m.talk = 1.4;
        }
      }
    }

    for (const c of this.chickens) {
      if (c.inCoop || c.air) continue;
      if (c.pos.distanceTo(hitP) < 1.3) {
        hit = true;
        c.air = V(f.x * 6, 7, f.z * 6);
        c.m.flap = 2;
        this.audio.cluck(true);
        this.burst(c.pos.clone().add(V(0, 0.5, 0)), 0xffffff, 10, 3, 2);
        this.addChaos(2);
      }
    }

    if (hit) {
      this.audio.bonk(power);
      if (!this.pops.some((x) => x.t < 0.2)) this.pop(pick(['BONK!', 'GÜM!']), hitP.clone().add(V(0, 0.8, 0)));
      this.shake = 0.15;
    }
  }

  releaseTractor(f) {
    const tr = this.zones.tractor;
    tr.rolling = true;
    tr.releasedAt = this.time;
    tr.body.setBodyType(this.R.RigidBodyType.Dynamic, true);
    tr.body.setLinearDamping(0.2);
    tr.body.setAngularDamping(1.5);
    tr.body.applyImpulse({ x: f.x * 60, y: 10, z: f.z * 60 }, true);
    this.emit('toast', 'El freni boşaldı! Traktör yuvarlanıyor!');
    this.audio.whistle();
    const m = this.villagerByKind.muhtar;
    this.voice.stop();
    this.voice.play([{ s: 'muhtar', t: 'Hey hey hey! Traktörüm! Durun! Biri dursun onu!' }]);
    m.m.talk = 3;
    m.panic = 6;
  }

  breakProp(pr) {
    if (pr.broken) return;
    pr.broken = true;
    const t = pr.body.translation();
    const p = V(t.x, t.y, t.z);
    if (pr.kind === 'melon') {
      this.burst(p, 0xe8303a, 14, 4, 3);
      this.burst(p, 0x3f8a2a, 8, 4, 2);
      this.audio.splat();
      this.pop('ŞAP!', p.clone().add(V(0, 1, 0)));
    } else {
      this.burst(p, 0xb86a3a, 16, 5, 3);
      this.audio.crash();
      this.pop('ÇAT!', p.clone().add(V(0, 1, 0)));
      this.stats.pots++;
      this.addChaos(4);
      if (Math.random() < 0.6) this.bark('pot');
    }
    this.world.removeRigidBody(pr.body);
    this.scene.remove(pr.mesh);
  }

  doBleat() {
    if (this.bleatCd > 0) return;
    this.bleatCd = 0.8;
    this.goat.bleat = 0.6;
    this.audio.bleat(this.energy > 0 ? 1.15 : 1);
    this.stats.bleats++;
    const p = this.goatPos();
    this.pop('MEEE!', p.clone().add(V(0, 2, 0)));
    for (const c of this.chickens) if (!c.inCoop && c.pos.distanceTo(p) < 10) c.scare = 2.5;
    for (const v of this.villagers) if (v.pos.distanceTo(p) < 6 && v.m.fallen <= 0 && v !== this.cafer) v.panic = 1.2;
    if (this.stats.bleats === 3) this.bark('bleat');
  }

  interact() {
    const p = this.goatPos();
    const L = this.zones.laundry;
    const sc = this.zones.scarecrow;
    if (this.carry) {
      const item = this.carry;
      this.carry = null;
      const dSc = Math.hypot(sc.pos.x - p.x, sc.pos.z - p.z);
      if (dSc < 2.6) {
        const slot = sc.slots[L.filter((x) => x.onScarecrow).length % sc.slots.length];
        item.onScarecrow = true;
        item.carried = false;
        sc.group.add(item.mesh);
        item.mesh.position.copy(slot);
        item.mesh.rotation.set(0, 0, 0);
        item.mesh.scale.setScalar(1);
        this.audio.ding();
        this.burst(sc.pos.clone().add(V(0, 1.6, 0)), 0xffe36a, 14, 3, 3);
        this.addChaos(6);
        this.progress('camasir');
      } else {
        // yere bırak
        const f = this.goatFwd();
        this.scene.add(item.mesh);
        const x = p.x + f.x * 0.8, z = p.z + f.z * 0.8;
        item.mesh.position.set(x, heightAt(x, z) + 0.03, z);
        item.mesh.rotation.set(-Math.PI / 2, 0, this.goatYaw);
        item.mesh.scale.setScalar(1);
        item.dropped = true;
        item.carried = false;
        this.audio.thud(0.15);
      }
      return;
    }
    // en yakın çamaşır
    let best = null, bd = 1.7;
    const wp = V();
    for (const it of L) {
      if (it.onScarecrow) continue;
      it.mesh.getWorldPosition(wp);
      const d = Math.hypot(wp.x - p.x, wp.z - p.z);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    if (best) {
      this.carry = best;
      best.carried = true;
      best.dropped = false;
      this.goat.mouth.add(best.mesh);
      best.mesh.position.set(0, -best.h * 0.32, 0.05);
      best.mesh.rotation.set(0, 0, 0);
      best.mesh.scale.setScalar(0.65);
      this.audio.munch();
      if (!this.camasirHint) {
        this.camasirHint = true;
        this.emit('toast', 'Bostandaki korkuluğa götür (kuzeydoğu)');
        this.voice.play([{ s: 'fadime', t: 'Hey! O benim ' + best.name + '! Bırak onu keçi!' }]);
        this.villagerByKind.fadime.m.talk = 2;
      }
      return;
    }
    // yakında lahana varsa ye
    this.tryEat(p, 1.6);
  }

  tryEat(p, r) {
    for (const c of this.zones.cabbages) {
      if (c.eaten) continue;
      if (Math.hypot(c.pos.x - p.x, c.pos.z - p.z) < r) {
        c.eaten = true;
        this.scene.remove(c.mesh);
        this.energy = Math.min(1, this.energy + 0.6);
        this.audio.munch();
        this.pop('GIRT!', c.pos.clone().add(V(0, 1.2, 0)));
        this.burst(c.pos.clone().add(V(0, 0.3, 0)), 0x7ac050, 10, 2, 2);
        this.emit('toast', 'Lahana! Kaos enerjisi doldu — daha hızlı, daha güçlü!');
        if (!this.ateOnce) {
          this.ateOnce = true;
          this.bark('cabbage');
        }
        return true;
      }
    }
    return false;
  }

  // ---------------- DÖNGÜ ----------------
  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (this.manual) return;
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.frame(dt, true);
  }

  step(n = 1, dt = 1 / 30, render = false) {
    for (let i = 0; i < n; i++) this.frame(dt, render && i === n - 1);
  }

  frame(dt, doRender = true) {
    if (this.phase === 'paused' || this.phase === 'loading') {
      if (doRender) this.renderer.render(this.scene, this.camera);
      return;
    }
    this.time += dt;
    const t = this.time;
    this.voice.update(dt);
    this.audio.update(dt, this.phase === 'finale' && this.fin && this.fin.started ? this.fin.t : null);

    if (this.phase === 'playing') {
      this.stats.t += dt;
      this.updateGoat(dt);
    }
    if (this.phase === 'finale') this.updateFinale(dt);

    // fizik (sabit adım)
    this.acc = (this.acc || 0) + dt;
    let n = 0;
    while (this.acc >= STEP && n < 4) {
      this.preStep(STEP);
      this.world.step();
      this.acc -= STEP;
      n++;
    }
    if (n === 4) this.acc = 0;

    this.syncProps(dt);
    if (this.phase !== 'menu') {
      this.updateVillagers(dt, t);
      this.updateChickens(dt, t);
    }
    this.updateDucks(dt, t);
    this.updateFx(dt);
    this.W.update(dt, t);
    this.updateGoatVisual(dt, t);
    this.updateCamera(dt, t);

    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT < 0 && (this.phase === 'playing' || this.phase === 'finale')) {
      this.hudT = 0.15;
      this.emit('hud', {
        chaos: this.stats.chaos,
        energy: this.energy,
        chase: this.cafer.state === 'chase',
        carry: this.carry ? this.carry.name : null,
      });
      this.emit('prompt', this.computePrompt());
    }
    if (doRender) this.renderer.render(this.scene, this.camera);
  }

  computePrompt() {
    if (this.phase !== 'playing') return null;
    const p = this.goatPos();
    if (this.carry) {
      const sc = this.zones.scarecrow.pos;
      return Math.hypot(sc.x - p.x, sc.z - p.z) < 2.6 ? 'Korkuluğa giydir' : 'Bırak';
    }
    const wp = V();
    for (const it of this.zones.laundry) {
      if (it.onScarecrow) continue;
      it.mesh.getWorldPosition(wp);
      if (Math.hypot(wp.x - p.x, wp.z - p.z) < 1.7) return 'Kap: ' + it.name;
    }
    return null;
  }

  preStep(dt) {
    // traktörü göle doğru it (eğim + biraz "kader")
    const tr = this.zones.tractor;
    if (tr.rolling && !tr.inPond) {
      const tp = tr.body.translation();
      const P = SPOTS.pond;
      const dx = P.x - tp.x, dz = P.z - tp.z;
      const d = Math.hypot(dx, dz) || 1;
      const m = tr.body.mass();
      const lv = tr.body.linvel();
      if (Math.hypot(lv.x, lv.z) < 9) tr.body.applyImpulse({ x: (dx / d) * m * 5 * dt, y: 0, z: (dz / d) * m * 5 * dt }, true);
      if (d < P.r - 1 && tp.y < 0.6) this.tractorInPond();
      else if (!tr.guided && this.time - tr.releasedAt > 14) {
        // takıldıysa: sarsılarak kendi kendine kayar
        tr.body.setBodyType(this.R.RigidBodyType.KinematicPositionBased, true);
        tr.guided = true;
      }
    }
    if (tr.guided && !tr.inPond) {
      const tp = tr.body.translation();
      const P = SPOTS.pond;
      const dx = P.x - tp.x, dz = P.z - tp.z;
      const d = Math.hypot(dx, dz);
      const nx = tp.x + (dx / d) * 7 * dt, nz = tp.z + (dz / d) * 7 * dt;
      tr.body.setNextKinematicTranslation({ x: nx, y: heightAt(nx, nz) + 0.9, z: nz });
      if (d < P.r - 1) this.tractorInPond();
    }
    if (tr.inPond && tr.sink < 1) {
      tr.sink += dt * 0.4;
      const tp = tr.body.translation();
      const P = SPOTS.pond;
      const dx = P.x - tp.x, dz = P.z - tp.z, d = Math.hypot(dx, dz) || 1;
      const mv = d > 3 ? dt * 2.5 : 0;
      tr.body.setNextKinematicTranslation({ x: tp.x + (dx / d) * mv, y: Math.max(-1.3, tp.y - dt * 0.5), z: tp.z + (dz / d) * mv });
    }
    // villager kinematik gövdeleri
    for (const v of this.villagers) v.body.setNextKinematicTranslation({ x: v.pos.x, y: v.pos.y + (v.m.fallen > 0 ? -5 : 0.85), z: v.pos.z });
  }

  tractorInPond() {
    const tr = this.zones.tractor;
    if (tr.inPond) return;
    tr.inPond = true;
    tr.sink = 0;
    tr.body.setBodyType(this.R.RigidBodyType.KinematicPositionBased, true);
    const tp = tr.body.translation();
    const p = V(tp.x, -0.6, tp.z);
    this.audio.splash(true);
    this.pop('ŞLAP!', p.clone().add(V(0, 2, 0)));
    for (let i = 0; i < 3; i++) this.burst(p, 0x6ad0ff, 20, 7, 6);
    this.addChaos(10);
    this.progress('traktor');
  }

  updateGoat(dt) {
    const body = this.goatBody;
    const k = this.keys;
    let ix = 0, iz = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) iz += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) iz -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    let mag = Math.hypot(ix, iz);
    let run = k.has('ShiftLeft') || k.has('ShiftRight');
    if (this.touchMove.x || this.touchMove.y) {
      ix = this.touchMove.x;
      iz = -this.touchMove.y;
      mag = Math.min(1, Math.hypot(ix, iz));
      run = run || mag > 0.92;
    }
    if (mag > 1) {
      ix /= mag;
      iz /= mag;
      mag = 1;
    }
    const yaw = this.cam.yaw;
    // kamera yönüne göre: ileri = kameranın baktığı yön
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = -fz, rz = fx;
    const dx = fx * iz + rx * ix, dz = fz * iz + rz * ix;
    const boost = this.energy > 0 ? 1.35 : 1;
    let speed = (run ? 7.2 : 4.2) * boost;
    if (this.inWater) speed *= 0.5;
    if (run && this.energy > 0) this.energy = Math.max(0, this.energy - dt * 0.07);
    const lv = body.linvel();
    const tx = dx * speed, tz = dz * speed;
    const a = 1 - Math.exp(-(this.grounded ? 12 : 3) * dt);
    let nvx = lv.x + (tx - lv.x) * a, nvz = lv.z + (tz - lv.z) * a;
    let nvy = lv.y;

    // zemin kontrolü
    const p = body.translation();
    const ray = new this.R.Ray({ x: p.x, y: p.y, z: p.z }, { x: 0, y: -1, z: 0 });
    const hit = this.world.castRay(ray, 0.75, true, undefined, undefined, undefined, body);
    const wasGrounded = this.grounded;
    this.grounded = !!hit && nvy < 3;
    if (this.grounded) this.coyote = 0.12;
    else this.coyote -= dt;
    if (!wasGrounded && this.grounded && this.lastVy < -7) {
      this.audio.thud(0.25);
      this.burst(V(p.x, p.y - 0.55, p.z), 0xc8b08a, 6, 2, 1);
    }
    this.lastVy = lv.y;
    this.jumpBuf -= dt;
    if (this.jumpBuf > 0 && this.coyote > 0) {
      nvy = 7.4;
      this.jumpBuf = 0;
      this.coyote = 0;
      this.audio.jump();
    }
    // gölette yüzme
    const P = SPOTS.pond;
    const inPond = Math.hypot(p.x - P.x, p.z - P.z) < P.r + 1 && p.y < -0.1;
    if (inPond && !this.inWater) {
      this.audio.splash(false);
      this.burst(V(p.x, -0.6, p.z), 0x6ad0ff, 14, 4, 4);
      this.pop('ŞLAP!', V(p.x, 1.5, p.z));
    }
    this.inWater = inPond;
    if (inPond) {
      const target = -0.25;
      if (p.y < target) nvy = Math.max(nvy, (target - p.y) * 6);
      nvy *= 0.94;
      if (this.jumpBuf > 0) {
        nvy = 6;
        this.jumpBuf = 0;
      }
    }
    body.setLinvel({ x: nvx, y: nvy, z: nvz }, true);
    // köyden düşerse
    if (p.y < -12) body.setTranslation({ x: SPOTS.start.x + 2, y: 2, z: SPOTS.start.z }, true);

    // yön
    const hs = Math.hypot(nvx, nvz);
    if (hs > 0.5 && mag > 0.05) {
      const want = Math.atan2(nvx, nvz);
      let d = want - this.goatYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.goatYaw += d * Math.min(1, dt * 12);
    }
    this.goatSpeed = hs;

    // zamanlayıcılar
    this.buttCd -= dt;
    this.bleatCd -= dt;
    if (this.pendingButt != null) {
      this.pendingButt -= dt;
      if (this.pendingButt <= 0) {
        this.pendingButt = null;
        this.resolveButt();
      }
    }
    // adımlar ve zil
    if (this.grounded && hs > 1) {
      this.stepT -= dt * hs;
      if (this.stepT < 0) {
        this.stepT = 1.1;
        this.audio.step(0.04);
      }
      this.bellT -= dt * hs;
      if (this.bellT < 0) {
        this.bellT = 2.2 + Math.random();
        this.audio.bell(0.03);
      }
    }

    // lahanalar: üstünden geçince ye
    const gp = this.goatPos();
    this.tryEat(gp, 0.9);
    // görev kontrolleri
    this.checkQuests(gp);
    this.updateCafer(dt, gp);
  }

  checkQuests(gp) {
    const pen = this.zones.pen;
    if (!this.qmap.kacis.isDone && (gp.x > pen.maxX + 0.8 || gp.x < pen.minX - 4 || gp.z > pen.maxZ + 0.8 || gp.z < pen.minZ - 0.8)) {
      this.progress('kacis');
      this.cafer.state = 'wander';
      this.caferChaos = 0;
    }
    // karpuzlar: tezgâhtan düştü mü
    for (const m of this.zones.melons) {
      if (m.counted) continue;
      const t = m.broken ? null : m.body.translation();
      if (m.broken || (t.y < 0.75 && Math.hypot(t.x - m.home.x, t.z - m.home.z) > 0.5)) {
        m.counted = true;
        this.stats.melons++;
        this.addChaos(3);
        if (!m.broken) this.audio.thud(0.3);
        this.progress('karpuz');
        if (this.qmap.karpuz.n === 2) this.villagerByKind.riza.panic = 3;
      }
    }
    // düğün
    if (this.qmap.dugun.shown && !this.qmap.dugun.isDone) {
      const W = this.zones.weddingCenter;
      if (Math.hypot(gp.x - W.x, gp.z - W.z) < 7) this.startFinale();
    }
  }

  // ---------------- ÇOBAN CAFER ----------------
  updateCafer(dt, gp) {
    const c = this.cafer;
    if (c.state === 'intro' || c.state === 'halay') return;
    this.chase.cooldown -= dt;
    const d = Math.hypot(gp.x - c.pos.x, gp.z - c.pos.z);
    if (c.state === 'wander' && this.qmap.kacis.isDone && !this.qmap.dugun.shown && this.caferChaos >= 40 && this.chase.cooldown <= 0) {
      c.state = 'chase';
      this.chase.t = 0;
      this.chase.hidden = 0;
      this.caferChaos = 0;
      this.voice.stop();
      this.voice.play([pick(BARKS.chaseStart)]);
      c.m.talk = 2;
      this.audio.whistle();
      this.emit('toast', 'Çoban Cafer peşinde! Kaç!');
    }
    if (c.state === 'chase') {
      this.chase.t += dt;
      // saman balyasının yanında durursa gözden kaybeder
      const nearHay = this.zones.hay.some((h) => {
        const t = h.body.translation();
        return Math.hypot(t.x - gp.x, t.z - gp.z) < 1.8;
      });
      if (nearHay && this.goatSpeed < 1 && d > 4) this.chase.hidden += dt;
      else this.chase.hidden = Math.max(0, this.chase.hidden - dt);
      if (d > 24 || this.chase.t > 28 || this.chase.hidden > 1.6) return this.endChase(true);
      if (d < 1.15 && c.m.fallen <= 0) this.caught();
    }
  }

  endChase(bark) {
    const c = this.cafer;
    if (c.state !== 'chase') return;
    c.state = 'tired';
    c.wait = 5;
    this.chase.cooldown = 20;
    if (bark) {
      this.voice.play([pick(BARKS.chaseLost)]);
      c.m.talk = 2;
      this.emit('toast', 'Cafer\'i atlattın!');
      this.addChaos(5);
    }
  }

  caught() {
    const c = this.cafer;
    this.stats.caught++;
    this.voice.stop();
    this.voice.play([pick(BARKS.caught)]);
    c.m.talk = 2.5;
    this.emit('caught');
    if (this.carry) this.interact(); // ağzındakini düşür
    const P = SPOTS.pen;
    this.goatBody.setTranslation({ x: P.x, y: 1.2, z: P.z }, true);
    this.goatBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.goatYaw = Math.PI / 2;
    this.cam.yaw = -Math.PI / 2;
    c.pos.set(P.x + P.w / 2 + 2, 0, P.z + 3);
    c.pos.y = heightAt(c.pos.x, c.pos.z);
    c.state = 'tired';
    c.wait = 6;
    this.chase.cooldown = 15;
  }

  // ---------------- KÖYLÜLER ----------------
  updateVillagers(dt, t) {
    const gp = this.goatPos();
    const R = this.R;
    for (const v of this.villagers) {
      let speed = 0;
      if (this.phase === 'finale' || this.phase === 'ending' || this.phase === 'end') {
        this.updateHalayVillager(v, dt, t);
        continue;
      }
      if (v.m.fallen > 0) {
        v.m.animate(dt, t, 0);
        this.placeVillager(v);
        continue;
      }
      v.panic = Math.max(0, (v.panic || 0) - dt);
      let target = null;
      let sp = v.speed;
      if (v === this.cafer && v.state === 'chase') {
        target = gp;
        sp = 5.3 + Math.min(1.2, this.chase.t * 0.05);
      } else if (v === this.cafer && v.state === 'intro') {
        // avlunun dışından keçiye bakar
        v.yaw = Math.atan2(gp.x - v.pos.x, gp.z - v.pos.z);
      } else if (v === this.cafer && v.state === 'tired') {
        v.wait -= dt;
        if (v.wait < 0) v.state = 'wander';
        v.yaw = Math.atan2(gp.x - v.pos.x, gp.z - v.pos.z);
      } else if (v === this.cafer && v.state === 'wander') {
        // goatı uzaktan takip eder
        const d = gp.distanceTo(v.pos);
        if (d > 12) target = gp;
        sp = 2.4;
      } else {
        v.wait -= dt;
        if (v.wait < 0) {
          v.wait = 2 + Math.random() * 4;
          const a = Math.random() * 6.28, r = Math.random() * v.rad;
          v.target.set(v.home.x + Math.cos(a) * r, 0, v.home.z + Math.sin(a) * r);
        }
        if (Math.hypot(v.target.x - v.pos.x, v.target.z - v.pos.z) > 0.3) target = v.target;
        if (v.panic > 0) sp *= 1.8;
      }
      if (target) {
        let dx = target.x - v.pos.x, dz = target.z - v.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.05) {
          dx /= d;
          dz /= d;
          // engelden kaçın
          const ray = new R.Ray({ x: v.pos.x, y: v.pos.y + 0.6, z: v.pos.z }, { x: dx, y: 0, z: dz });
          const hit = this.world.castRay(ray, 1.4, true, undefined, undefined, undefined, v.body, (col) => col !== this.goatCol);
          if (hit) {
            const s = v.steer || (v.steer = Math.random() < 0.5 ? 1 : -1);
            const ang = s * 1.2;
            const ndx = dx * Math.cos(ang) - dz * Math.sin(ang), ndz = dx * Math.sin(ang) + dz * Math.cos(ang);
            dx = ndx;
            dz = ndz;
          } else if (Math.random() < 0.01) v.steer = null;
          const st = Math.min(d, sp * dt);
          v.pos.x += dx * st;
          v.pos.z += dz * st;
          speed = sp;
          const want = Math.atan2(dx, dz);
          let dy = want - v.yaw;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          v.yaw += dy * Math.min(1, dt * 8);
        }
      } else if (v !== this.cafer) {
        // yakındaysa keçiye bak
        if (gp.distanceTo(v.pos) < 5) {
          const want = Math.atan2(gp.x - v.pos.x, gp.z - v.pos.z);
          let dy = want - v.yaw;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          v.yaw += dy * Math.min(1, dt * 4);
        }
      }
      v.pos.y = heightAt(v.pos.x, v.pos.z);
      v.m.animate(dt, t, speed, { panic: v.panic > 0 || (v.kind === 'muhtar' && this.zones.tractor.rolling && !this.zones.tractor.inPond) });
      this.placeVillager(v);
    }
  }

  placeVillager(v) {
    v.m.root.position.copy(v.pos);
    v.m.root.rotation.y = v.yaw;
  }

  // ---------------- TAVUKLAR ----------------
  updateChickens(dt, t) {
    const gp = this.goatPos();
    const C = SPOTS.coop;
    const R = this.R;
    for (const c of this.chickens) {
      c.cluckT -= dt;
      if (c.air) {
        c.pos.addScaledVector(c.air, dt);
        c.air.y -= 18 * dt;
        const g = heightAt(c.pos.x, c.pos.z);
        if (c.pos.y < g && c.air.y < 0) {
          c.pos.y = g;
          c.air = null;
          c.scare = 2;
        }
        c.m.root.position.copy(c.pos);
        c.m.root.rotation.x += dt * 8;
        c.m.animate(dt, t, 3);
        continue;
      }
      c.m.root.rotation.x = 0;
      c.scare = Math.max(0, (c.scare || 0) - dt);
      let dx = 0, dz = 0, sp = 0;
      if (c.inCoop) {
        c.wait -= dt;
        if (c.wait < 0) {
          c.wait = 1 + Math.random() * 2;
          c.dir = Math.random() * 6.28;
        }
        const nx = c.pos.x + Math.sin(c.dir) * 0.4 * dt, nz = c.pos.z + Math.cos(c.dir) * 0.4 * dt;
        if (Math.abs(nx - C.x) < 1.1 && Math.abs(nz - C.z) < 1.1) {
          c.pos.x = nx;
          c.pos.z = nz;
          sp = 0.4;
        } else c.dir += Math.PI;
      } else {
        const d = Math.hypot(c.pos.x - gp.x, c.pos.z - gp.z);
        if (this.phase === 'playing' && (d < 3.4 || (c.scare > 0 && d < 11))) {
          dx = (c.pos.x - gp.x) / (d || 1);
          dz = (c.pos.z - gp.z) / (d || 1);
          // kümese doğru hafif eğilim: güdülebilir olsunlar
          const cx = C.x - c.pos.x, cz = C.z - c.pos.z, cd = Math.hypot(cx, cz) || 1;
          dx += (cx / cd) * 0.7;
          dz += (cz / cd) * 0.7;
          const l = Math.hypot(dx, dz) || 1;
          dx /= l;
          dz /= l;
          sp = c.scare > 0 ? 4.6 : 3.8;
          if (c.cluckT < 0) {
            c.cluckT = 0.8 + Math.random();
            if (d < 12) this.audio.cluck(true);
          }
          c.m.flap = 0.3;
        } else {
          c.wait -= dt;
          if (c.wait < 0) {
            c.wait = 1 + Math.random() * 3;
            c.dir = Math.random() * 6.28;
            c.walk = Math.random() < 0.6;
          }
          if (c.walk) {
            dx = Math.sin(c.dir);
            dz = Math.cos(c.dir);
            sp = 0.7;
          }
          if (c.cluckT < 0) {
            c.cluckT = 3 + Math.random() * 5;
            if (d < 10) this.audio.cluck(false);
          }
        }
        if (sp > 0) {
          const ray = new R.Ray({ x: c.pos.x, y: c.pos.y + 0.3, z: c.pos.z }, { x: dx, y: 0, z: dz });
          const hit = this.world.castRay(ray, 0.8, true, undefined, undefined, undefined, undefined, (col) => col !== this.goatCol);
          if (hit) {
            // engel: yana kay (kümes tarafını tercih et)
            const s = (C.x - c.pos.x) * dz - (C.z - c.pos.z) * dx > 0 ? -1 : 1;
            const ndx = -dz * s, ndz = dx * s;
            dx = ndx;
            dz = ndz;
            c.dir = Math.atan2(dx, dz);
          }
          c.pos.x += dx * sp * dt;
          c.pos.z += dz * sp * dt;
          const r = Math.hypot(c.pos.x, c.pos.z);
          if (r > 58) {
            c.pos.x *= 58 / r;
            c.pos.z *= 58 / r;
          }
          c.m.root.rotation.y = Math.atan2(dx, dz);
        }
        // kümese yakın: içeri sek
        if (Math.hypot(c.pos.x - C.x, c.pos.z - (C.z + 0.6)) < 3.2 && this.phase === 'playing') {
          c.inCoop = true;
          c.pos.set(C.x + (Math.random() - 0.5) * 1.6, 0, C.z + (Math.random() - 0.5) * 1.6);
          this.audio.cluck(false);
          this.burst(V(C.x, 1, C.z), 0xffffff, 8, 2, 2);
          this.addChaos(4);
          this.progress('tavuk');
        }
      }
      c.pos.y = heightAt(c.pos.x, c.pos.z);
      c.m.root.position.copy(c.pos);
      c.m.animate(dt, t, sp);
    }
  }

  updateDucks(dt, t) {
    const P = SPOTS.pond;
    for (const d of this.ducks) {
      d.a += dt * 0.25;
      let x = P.x + Math.cos(d.a) * d.r, z = P.z + Math.sin(d.a) * d.r;
      const tr = this.zones.tractor;
      if (tr.inPond) {
        // ördekler traktörün etrafında toplanır
        const tp = tr.body.translation();
        x = tp.x + Math.cos(d.a * 2) * 1.8;
        z = tp.z + Math.sin(d.a * 2) * 1.8;
      }
      d.g.position.set(x, -0.62 + Math.sin(t * 3 + d.r) * 0.03, z);
      d.g.rotation.y = -d.a + (tr.inPond ? -d.a : 0);
    }
  }

  syncProps(dt) {
    for (const p of this.W.props) {
      if (p.broken) continue;
      const b = p.body;
      const t = b.translation();
      if (p.kind === 'tractor') {
        const q = b.rotation();
        p.mesh.position.set(t.x, t.y, t.z);
        p.mesh.quaternion.set(q.x, q.y, q.z, q.w);
        if (p.shake > 0) {
          p.shake -= dt;
          p.mesh.position.x += Math.sin(this.time * 60) * 0.05;
          p.mesh.rotation.z += Math.sin(this.time * 50) * 0.03;
        }
        if (p.inPond) p.mesh.rotation.z = Math.min(0.35, (p.sink || 0) * 0.4);
        continue;
      }
      if (b.isSleeping() && p.synced) continue;
      p.synced = true;
      const q = b.rotation();
      p.mesh.position.set(t.x, t.y, t.z);
      p.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      // çarpma ile kırılma
      if (p.kind === 'pot' || p.kind === 'melon') {
        const v = b.linvel();
        const s = Math.hypot(v.x, v.y, v.z);
        if ((p.prev || 0) > (p.kind === 'pot' ? 3.6 : 6) && s < p.prev * 0.45) this.breakProp(p);
        p.prev = s;
      }
      if (t.y < -15) {
        b.setTranslation({ x: t.x, y: 2, z: t.z }, true);
      }
    }
  }

  updateFx(dt) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = V();
    const f = this.fx;
    let any = false;
    for (let i = 0; i < f.n; i++) {
      if (f.life[i] <= 0) continue;
      any = true;
      f.life[i] -= dt;
      f.vel[i].y -= 14 * dt;
      f.pos[i].addScaledVector(f.vel[i], dt);
      const g = heightAt(f.pos[i].x, f.pos[i].z);
      if (f.pos[i].y < g + 0.05) {
        f.pos[i].y = g + 0.05;
        f.vel[i].multiplyScalar(0.4);
        f.vel[i].y *= -0.3;
      }
      f.rot[i].x += dt * 5;
      e.set(f.rot[i].x, f.rot[i].y, f.rot[i].z);
      q.setFromEuler(e);
      const k = f.life[i] <= 0 ? 0 : Math.min(1, f.life[i] * 2);
      s.set(k, k, k);
      m.compose(f.pos[i], q, s);
      this.fxMesh.setMatrixAt(i, m);
    }
    if (any) this.fxMesh.instanceMatrix.needsUpdate = true;
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.t += dt;
      p.s.position.y += dt * 1.2;
      const sc = p.t < 0.12 ? p.t / 0.12 : 1;
      p.s.scale.set(1.6 * sc, 0.8 * sc, 1);
      p.s.material.opacity = Math.max(0, 1 - Math.max(0, p.t - 0.6) * 2);
      if (p.t > 1.1) {
        this.scene.remove(p.s);
        p.s.material.dispose();
        this.pops.splice(i, 1);
      }
    }
  }

  updateGoatVisual(dt, t) {
    const g = this.goat;
    const p = this.goatPos();
    g.root.position.copy(p);
    if (this.hop) {
      this.hop.t += dt;
      const k = this.hop.t / 0.32;
      g.root.position.y += Math.sin(Math.min(1, k) * Math.PI) * 0.7;
      if (k >= 1) this.hop = null;
    }
    g.root.rotation.y = this.goatYaw;
    const lv = this.goatBody.linvel();
    const grounded = this.phase === 'playing' ? this.grounded || this.inWater : !this.hop;
    g.animate(dt, t, this.phase === 'playing' ? this.goatSpeed || 0 : this.phase === 'finale' ? 2.5 : 0, grounded, lv.y);
    // enerji: kafanın üstünde kıvılcımlar
    if (this.energy > 0 && Math.random() < dt * 12) this.burst(p.clone().add(V(0, 1.2, 0)), 0xffd84a, 1, 1, 1);
  }

  updateCamera(dt, t) {
    const cam = this.camera;
    if (this.phase === 'menu') {
      const a = t * 0.05;
      cam.position.set(Math.sin(a) * 34, 16 + Math.sin(t * 0.2), Math.cos(a) * 34);
      cam.lookAt(0, 0, 0);
      this.sun.position.set(30, 50, 20);
      this.sun.target.position.set(0, 0, 0);
      return;
    }
    if (this.phase === 'finale' || this.phase === 'ending' || this.phase === 'end') {
      const W = this.zones.weddingCenter;
      const a = this.phase === 'finale' ? Math.sin(t * 0.2) * 0.3 : t * 0.1;
      const tgt = V(W.x + Math.sin(a) * 13, 5.5, W.z + Math.cos(a) * 13);
      cam.position.lerp(tgt, 1 - Math.exp(-dt * 2));
      cam.lookAt(W.x, 1.2, W.z);
      this.sun.position.set(W.x + 30, 50, W.z + 20);
      this.sun.target.position.set(W.x, 0, W.z);
      return;
    }
    const gp = this.goatPos();
    const target = gp.clone().add(V(0, 1.1, 0));
    const c = this.cam;
    const off = V(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch));
    let dist = c.dist;
    const ray = new this.R.Ray({ x: target.x, y: target.y, z: target.z }, { x: off.x, y: off.y, z: off.z });
    const hit = this.world.castRay(ray, dist, true, undefined, undefined, undefined, this.goatBody, (col) => {
      const b = col.parent();
      return !b || b.isFixed();
    });
    if (hit) dist = Math.max(1.2, hit.timeOfImpact - 0.25);
    this.camDist = this.camDist == null ? dist : dist < this.camDist ? dist : this.camDist + (dist - this.camDist) * Math.min(1, dt * 3);
    const pos = target.clone().addScaledVector(off, this.camDist);
    const gh = heightAt(pos.x, pos.z) + 0.4;
    if (pos.y < gh) pos.y = gh;
    if (this.shake > 0) {
      this.shake -= dt;
      pos.x += (Math.random() - 0.5) * this.shake;
      pos.y += (Math.random() - 0.5) * this.shake;
    }
    cam.position.copy(pos);
    cam.lookAt(target);
    this.sun.position.set(gp.x + 30, gp.y + 50, gp.z + 20);
    this.sun.target.position.copy(gp);
  }

  // ---------------- FİNAL: DÜĞÜN HALAYI ----------------
  startFinale() {
    if (this.fin) return;
    this.setPhase('finale');
    this.keys.clear();
    if (this.carry) this.interact();
    this.endChase(false);
    this.cafer.state = 'halay';
    this.goatBody.setBodyType(this.R.RigidBodyType.KinematicPositionBased, true);
    this.fin = { t: -1, started: false, idx: 0, hits: 0, perfect: 0, miss: 0, combo: 0, maxCombo: 0, judge: null, judgeT: 0, angle: 0 };
    this.voice.stop();
    this.audio.setMode('none');
    this.audio.cheer();
    this.voice.play(FINALE_START, () => {
      this.fin.started = true;
      this.fin.t = -BEAT * 2;
      this.audio.setMode('halay');
      this.emit('halay', true);
    });
    this.emit('prompt', null);
  }

  updateHalayVillager(v, dt, t) {
    const W = this.zones.weddingCenter;
    const ring = ['cafer', 'riza', 'fadime', 'muhtar', 'cocuk', 'koylu1', 'koylu2', 'koylu3', 'damat', 'gelin'];
    const i = ring.indexOf(v.kind);
    let tx, tz, yaw;
    const ang = this.fin ? this.fin.angle : 0;
    if (i >= 0) {
      // halay hattı: keçinin arkasında bir yay
      const a = ang - 0.42 * (i + 1);
      tx = W.x + Math.cos(a) * 4.2;
      tz = W.z + Math.sin(a) * 4.2;
      yaw = Math.atan2(-Math.sin(a), Math.cos(a));
    } else {
      // davulcu ve zurnacı ortada
      tx = W.x + (v.kind === 'davulcu' ? -0.9 : 0.9);
      tz = W.z;
      yaw = Math.atan2(this.camera.position.x - tx, this.camera.position.z - tz);
    }
    const d = Math.hypot(tx - v.pos.x, tz - v.pos.z);
    const k = Math.min(1, dt * (d > 3 ? 1.5 : 6));
    v.pos.x += (tx - v.pos.x) * k;
    v.pos.z += (tz - v.pos.z) * k;
    v.pos.y = heightAt(v.pos.x, v.pos.z);
    v.yaw = yaw;
    v.m.fallen = 0;
    v.m.animate(dt, t, d > 0.5 ? 3 : 0.5, { dance: d < 1.5 && (this.fin?.started || this.phase !== 'finale') });
    this.placeVillager(v);
  }

  updateFinale(dt) {
    const f = this.fin;
    const W = this.zones.weddingCenter;
    f.angle += dt * (f.started ? 0.22 : 0.05);
    // keçi halayın başında
    const a = f.angle;
    const gx = W.x + Math.cos(a) * 4.2, gz = W.z + Math.sin(a) * 4.2;
    this.goatBody.setNextKinematicTranslation({ x: gx, y: heightAt(gx, gz) + 0.58, z: gz });
    this.goatYaw = Math.atan2(-Math.sin(a), Math.cos(a));
    if (!f.started) return;
    f.t += dt;
    f.judgeT -= dt;
    // otomatik oyun (test)
    if (this.autoHalay && f.idx < CHART.length && f.t >= CHART[f.idx]) this.halayHit();
    // kaçırılan notalar
    while (f.idx < CHART.length && f.t - CHART[f.idx] > 0.2) {
      f.idx++;
      f.miss++;
      f.combo = 0;
      f.judge = 'Iska';
      f.judgeT = 0.5;
    }
    if (f.t > HALAY_BEATS * BEAT + 0.5 && !f.over) {
      f.over = true;
      this.finishHalay();
    }
  }

  halayHit() {
    const f = this.fin;
    if (!f || !f.started || f.over) return;
    this.hop = { t: 0 };
    if (f.idx >= CHART.length) return;
    const d = Math.abs(f.t - CHART[f.idx]);
    if (d < 0.2) {
      const perfect = d < 0.09;
      f.idx++;
      f.hits++;
      if (perfect) f.perfect++;
      f.combo++;
      f.maxCombo = Math.max(f.maxCombo, f.combo);
      f.judge = perfect ? 'Mükemmel!' : 'İyi';
      f.judgeT = 0.5;
      this.audio.hit(true);
      if (f.combo % 10 === 0) {
        this.audio.cheer();
        const p = this.goatPos();
        this.burst(p.clone().add(V(0, 1.5, 0)), 0xffe36a, 16, 4, 4);
        this.burst(p.clone().add(V(0, 1.5, 0)), 0xff4a6a, 10, 4, 4);
      }
    } else if (CHART[f.idx] - f.t < 0.45) {
      // erken basış: notayı kaçırma sayma ama kombo bozulur
      f.combo = 0;
      f.judge = 'Erken';
      f.judgeT = 0.4;
      this.audio.hit(false);
    }
  }

  finishHalay() {
    const f = this.fin;
    this.emit('halay', false);
    this.audio.setMode('roam');
    this.audio.cheer();
    this.audio.fanfare();
    const acc = f.hits / CHART.length;
    const W = this.zones.weddingCenter;
    for (let i = 0; i < 5; i++) this.burst(V(W.x + (Math.random() - 0.5) * 6, 3, W.z + (Math.random() - 0.5) * 6), [0xff4a6a, 0xffe36a, 0x6ad0ff, 0xffffff][i % 4], 24, 6, 6);
    this.pop('YAŞASIN!', V(W.x, 4, W.z));
    this.addChaos(Math.round(acc * 50), false);
    this.qmap.dugun.isDone = true;
    this.emitQuests();
    this.setPhase('ending');
    const extra =
      acc >= 0.85
        ? [{ s: 'cocuk', t: 'Keçi halay başı oldu! En iyi halay başı!' }]
        : acc >= 0.55
          ? [{ s: 'damat', t: 'Biraz tökezledi ama ruhu vardı!' }]
          : [{ s: 'fadime', t: 'Ayakları dolaştı ama kimse bu kadar eğlenmemişti!' }];
    this.voice.play([...extra, ...ENDING], () => this.toEnd(acc));
  }

  toEnd(acc) {
    const f = this.fin;
    const res = {
      time: this.stats.t,
      chaos: this.stats.chaos,
      villagers: this.stats.villagers,
      pots: this.stats.pots,
      melons: this.stats.melons,
      caught: this.stats.caught,
      halay: Math.round(acc * 100),
      perfect: f.perfect,
      maxCombo: f.maxCombo,
      title: acc >= 0.85 ? 'Halay Başı Efsanesi' : acc >= 0.55 ? 'Düğünün Yıldızı' : 'Ayakları Dolaşan Keçi',
    };
    try {
      const best = JSON.parse(localStorage.getItem('keci-best') || 'null');
      res.best = best;
      if (!best || res.chaos > best.chaos) localStorage.setItem('keci-best', JSON.stringify({ chaos: res.chaos, time: res.time, halay: res.halay }));
    } catch {
      /* yok say */
    }
    this.result = res;
    this.setPhase('end');
    this.emit('end', res);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  // Ritim arayüzü için: yaklaşan notalar
  halayView() {
    const f = this.fin;
    if (!f || !f.started) return null;
    const notes = [];
    for (let i = f.idx; i < CHART.length && CHART[i] - f.t < 2.2; i++) notes.push(CHART[i] - f.t);
    return { notes, combo: f.combo, judge: f.judgeT > 0 ? f.judge : null, hits: f.hits, total: CHART.length, t: f.t, beat: BEAT };
  }

  dispose() {
    this.running = false;
    this.voice.stop();
    this.audio.suspend();
    window.removeEventListener('keydown', this._keydown);
    window.removeEventListener('keyup', this._keyup);
    window.removeEventListener('resize', this._resize);
    window.removeEventListener('blur', this._blur);
    document.removeEventListener('mousemove', this._mouse);
    document.removeEventListener('mousedown', this._down);
    document.removeEventListener('pointerlockchange', this._lock);
    document.removeEventListener('pointerlockerror', this._lockErr);
    document.removeEventListener('visibilitychange', this._vis);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
