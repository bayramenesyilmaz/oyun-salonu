import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { VoiceBank } from '@engine/voicebank.js';
import { buildCity, heightAt, stepIndex, onStairs, slopeAt, walkable, SPOTS, SEGS } from './city.js';
import { Porter } from './porter.js';
import { Cargo, KINDS } from './cargo.js';
import { HamalAudio } from './audio.js';
import { JOBS, SPEAKERS, INTRO, BARKS, TARGET } from './story.js';

const STEP = 1 / 60;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = THREE.MathUtils.clamp;
const TILT_MAX = 0.62;

// NPC'ler: başka oyunlarımızdaki Rocketbox modelleri
const NPCS = {
  reis: { glb: '/kusyolu/chars/mert.glb', at: [2.2, 8.6], yaw: Math.PI * 0.8 },
  hayri: { glb: '/kusyolu/chars/arda.glb', at: [-8.4, -82.2], yaw: Math.PI / 2 },
  eleni: { glb: '/kusyolu/chars/elif.glb', at: [26.6, -84.0], yaw: 0 },
  nuri: { glb: '/kusyolu/chars/kaan.glb', at: [67.1, -126.2], yaw: -Math.PI / 2 },
  nazife: { glb: '/karakuyu/nine.glb', at: [28.8, -134.4], yaw: Math.PI / 2 },
  leyla: { glb: '/kusyolu/chars/zeynep.glb', at: [50.2, -149.2], yaw: 0 },
};
// sokaktan geçenler: [model, A, B]
const WALKERS = [
  ['/kusyolu/chars/kaan.glb', [-3.5, -2], [-3.5, -32]],
  ['/kusyolu/chars/elif.glb', [3.6, -30], [3.6, -3]],
  ['/kusyolu/chars/arda.glb', [-12, 10], [12, 11]],
  ['/kusyolu/chars/zeynep.glb', [2.4, -40], [2.4, -70]],
  ['/karakuyu/nine.glb', [-7, -84], [7, -77]],
  ['/kusyolu/chars/mert.glb', [14, -79], [38, -82]],
  ['/kusyolu/chars/elif.glb', [32, -120], [62, -144]],
  ['/kusyolu/chars/arda.glb', [64, -120], [34, -146]],
];

export class Game {
  constructor(container, emit, opts = {}) {
    this.container = container;
    this.emit = emit;
    this.touch = !!opts.touch;
    this.testMode = /[?&]test\b/.test(location.search);
    this.low = !!opts.low;
    this.phase = 'loading';
    this.time = 0;
    this.keys = new Set();
    this.mouseLean = new THREE.Vector2();
    this.touchLean = null;
    this.touchMove = { x: 0, y: 0 };
    this.sensitivity = 1;
    this.manual = false;
    this.camDist = 5.4;
    this.money = 0;
    this.jobIdx = 0;
    this.results = [];
    this.cargo = [];
    this.timers = [];
    this.loop = this.loop.bind(this);
  }

  async init(progress = () => {}) {
    await RAPIER.init();
    this.R = RAPIER;
    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: !this.low && !this.testMode, powerPreference: 'high-performance' }));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.62;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(renderer.domElement);
    renderer.domElement.className = 'hm-canvas';
    const scene = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 3000);

    // ikindi güneşi: batıdan, alçaktan
    const sky = new Sky();
    sky.scale.setScalar(2800);
    scene.add(sky);
    const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(74), THREE.MathUtils.degToRad(-128));
    const u = sky.material.uniforms;
    u.turbidity.value = 6;
    u.rayleigh.value = 1.6;
    u.mieCoefficient.value = 0.006;
    u.mieDirectionalG.value = 0.86;
    u.sunPosition.value.copy(sun);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(sky.clone());
    scene.environment = pmrem.fromScene(envScene, 0, 0.1, 3000).texture;
    scene.environmentIntensity = 0.55;
    scene.fog = new THREE.Fog(0xd8c0a0, 120, 900);
    this.hemi = new THREE.HemisphereLight(0xcfe0f0, 0x6a5a48, 0.9);
    scene.add(this.hemi);
    const dl = (this.sun = new THREE.DirectionalLight(0xffd6a0, 3.2));
    this.sunDir = sun.clone();
    dl.castShadow = true;
    const ss = this.low ? 1024 : 2048;
    dl.shadow.mapSize.set(ss, ss);
    Object.assign(dl.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 160 });
    dl.shadow.bias = -0.0004;
    dl.shadow.normalBias = 0.04;
    scene.add(dl, dl.target);

    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = STEP;
    this.heightAt = heightAt;
    progress(0.2, 'Sokaklar');
    this.wind = 0;
    this.city = buildCity(scene, RAPIER, this.world, { wind: () => this.wind });

    progress(0.4, 'Eşyalar');
    const loader = (this.loader = new GLTFLoader());
    loader.setMeshoptDecoder(MeshoptDecoder);
    const ids = ['wooden_crate_01', 'wooden_crate_02', 'tea_set_01', 'vintage_suitcase', 'wicker_basket_01', 'Television_01', 'street_lamp_01', 'metal_trash_can', 'Barrel_01', 'WoodenChair_01', 'wooden_stool_01', 'round_wooden_table_01', 'brass_pot_01'];
    this.glbs = {};
    await Promise.all(
      ids.map((id) =>
        loader.loadAsync(`/hamal/props/${id}.glb`).then((g) => (this.glbs[id] = g.scene)).catch(() => null)
      )
    );
    for (const p of this.city.props) {
      const src = this.glbs[p.id];
      if (!src) continue;
      const m = src.clone(true);
      m.position.set(p.x, p.y, p.z);
      m.rotation.y = p.ry;
      m.scale.setScalar(p.s);
      m.traverse((o) => o.isMesh && ((o.castShadow = true), (o.receiveShadow = true)));
      scene.add(m);
    }

    progress(0.6, 'Kemal');
    const kem = await loader.loadAsync('/hamal/kemal.glb');
    this.porter = new Porter(this, kem);
    this.porter.place(SPOTS.start.x, SPOTS.start.z, SPOTS.start.yaw);

    progress(0.75, 'İnsanlar');
    const cache = {};
    const getChar = (u) => (cache[u] = cache[u] || loader.loadAsync(u).catch(() => null));
    this.npcs = {};
    for (const [id, d] of Object.entries(NPCS)) {
      const g = await getChar(d.glb);
      if (!g) continue;
      this.npcs[id] = this.makeChar(g, d.at[0], d.at[1], d.yaw, 'idle');
    }
    this.walkers = [];
    if (!this.testMode || /[?&]walkers\b/.test(location.search))
      for (const [u, a, b] of WALKERS) {
        const g = await getChar(u);
        if (!g) continue;
        const c = this.makeChar(g, a[0], a[1], 0, 'walk');
        c.a = V3(a[0], 0, a[1]);
        c.b = V3(b[0], 0, b[1]);
        c.to = c.b;
        c.wait = Math.random() * 3;
        c.speed = 1.0 + Math.random() * 0.3;
        this.walkers.push(c);
      }
    this.buildCar();
    this.buildCats();
    this.buildMarker();

    this.audio = new HamalAudio();
    this.bank = new VoiceBank('/voices/hamal/');
    this.bindInput();
    this.resize();
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    this.clock = new THREE.Clock();
    this.running = true;
    this.load();
    this.setPhase('menu');
    window.__hamal = this;
    requestAnimationFrame(this.loop);
    progress(1, '');
  }

  makeChar(gltf, x, z, yaw, clip) {
    const m = SkeletonUtils.clone(gltf.scene);
    m.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.frustumCulled = false;
        if (/opacity/.test(o.material.name)) {
          o.material.transparent = false;
          o.material.alphaTest = 0.45;
        }
      }
    });
    const root = new THREE.Group();
    root.add(m);
    root.position.set(x, heightAt(x, z), z);
    root.rotation.y = yaw;
    this.scene.add(root);
    const mixer = new THREE.AnimationMixer(m);
    const clips = {};
    for (const c of gltf.animations) clips[c.name] = c;
    const ch = { root, mixer, clips, action: null };
    ch.play = (name, fade = 0.3) => {
      const c = clips[name];
      if (!c) return;
      const a = mixer.clipAction(c);
      if (ch.action === a) return;
      a.reset().play();
      if (ch.action) ch.action.crossFadeTo(a, fade, false);
      ch.action = a;
      ch.clip = name;
    };
    ch.play(clip, 0);
    ch.action && (ch.action.time = Math.random() * 2);
    return ch;
  }

  buildCar() {
    // 1970'lerin dolmuşu: uzun, yuvarlak hatlı Amerikan otomobili (marka yok), sarı-siyah dama şeridi
    const car = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: 0xe8c030, roughness: 0.35, metalness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.3, metalness: 0.5 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.15, metalness: 1 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.7, 2.0), paint);
    body.position.y = 0.65;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 1.8), paint);
    cab.position.set(-0.2, 1.3, 0);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.48, 1.84), dark);
    glass.position.set(-0.2, 1.3, 0);
    const cheq = new THREE.Mesh(new THREE.BoxGeometry(5.22, 0.12, 2.02), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
    cheq.position.y = 0.82;
    car.add(body, cab, glass, cheq);
    for (const [x, z] of [[1.7, 1], [1.7, -1], [-1.7, 1], [-1.7, -1]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 16), dark);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.36, z * 0.95);
      car.add(w);
    }
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 2.06), chrome);
    bumper.position.set(2.64, 0.5, 0);
    const bumper2 = bumper.clone();
    bumper2.position.x = -2.64;
    car.add(bumper, bumper2);
    for (const z of [-0.65, 0.65]) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: 0.6 }));
      l.rotation.y = Math.PI / 2;
      l.position.set(2.62, 0.72, z);
      car.add(l);
    }
    car.traverse((o) => o.isMesh && (o.castShadow = true));
    car.position.set(-60, 0, -18);
    this.scene.add(car);
    this.car = { obj: car, x: -60, dir: 1, wait: 6, speed: 8.5 };
  }

  buildCats() {
    const mk = (color) => {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 4, 8), m);
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.2;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), m);
      head.position.set(0.24, 0.27, 0);
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), m);
        e.position.set(0.25, 0.36, s * 0.04);
        g.add(e);
      }
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 5), m);
      tail.position.set(-0.27, 0.3, 0);
      tail.rotation.z = -0.8;
      g.add(body, head, tail);
      for (const [x, z] of [[0.12, 0.05], [0.12, -0.05], [-0.12, 0.05], [-0.12, -0.05]]) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 4), m);
        l.position.set(x, 0.07, z);
        g.add(l);
      }
      g.traverse((o) => o.isMesh && (o.castShadow = true));
      this.scene.add(g);
      return g;
    };
    this.cats = [
      { obj: mk(0xd8862a), a: V3(-3.2, 0, -52), b: V3(3.2, 0, -53), t: Math.random() * 10 },
      { obj: mk(0x2a2622), a: V3(42.8, 0, -98), b: V3(48.2, 0, -97), t: Math.random() * 10 },
      { obj: mk(0xe8e0d0), a: V3(-6, 0, 4), b: V3(6, 0, 2), t: Math.random() * 10 },
    ];
  }

  buildMarker() {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 0.05, 40, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xf2c060, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
    );
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.85, 2.0, 40), new THREE.MeshBasicMaterial({ color: 0xf2c060, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 8), new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.35, depthWrite: false }));
    beam.position.y = 3;
    const g = new THREE.Group();
    g.add(ring, beam);
    void m;
    g.visible = false;
    this.scene.add(g);
    this.marker = g;
  }

  // ---------------- Kayıt ----------------
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('hamal-save') || 'null');
      if (d) {
        this.money = d.money || 0;
        this.jobIdx = Math.min(d.job || 0, JOBS.length);
        this.results = d.results || [];
        this.hasSave = this.jobIdx > 0;
      }
    } catch { /* yok say */ }
  }
  save() {
    try {
      localStorage.setItem('hamal-save', JSON.stringify({ money: this.money, job: this.jobIdx, results: this.results }));
    } catch { /* yok say */ }
  }
  newGame() {
    this.money = 0;
    this.jobIdx = 0;
    this.results = [];
    this.save();
  }

  // ---------------- Akış ----------------
  setPhase(p) {
    this.phase = p;
    this.emit('phase', p);
  }
  start(fresh) {
    this.audio.init();
    if (fresh) this.newGame();
    if (this.jobIdx >= JOBS.length) this.newGame();
    if (fresh || this.jobIdx === 0) {
      this.setPhase('intro');
      this.speak(INTRO.map((t) => ['kemal', t]), () => this.showBoard(), true);
    } else this.showBoard();
  }
  skipIntro() {
    if (this.phase !== 'intro') return;
    this.stopVoice();
    this.showBoard();
  }
  showBoard() {
    this.clearCargo();
    this.porter.place(SPOTS.start.x, SPOTS.start.z, SPOTS.start.yaw);
    this.marker.visible = false;
    this.setPhase('board');
    this.emit('board', { job: JOBS[this.jobIdx], idx: this.jobIdx, money: this.money, target: TARGET, results: this.results });
  }
  startJob(idx = this.jobIdx) {
    this.audio.init();
    this.jobIdx = idx;
    const job = (this.job = JOBS[idx]);
    this.clearCargo();
    const P = this.porter;
    P.place(SPOTS.start.x, SPOTS.start.z, SPOTS.start.yaw);
    for (const slot of job.load) {
      const c = new Cargo(this, slot.kind, slot, this.glbs);
      c.placeAtSlot(P.platform);
      c.sync();
      this.cargo.push(c);
    }
    // birkaç adımla yerleşsin
    for (let i = 0; i < 20; i++) this.physicsStep(STEP, true);
    this.jobT = 0;
    this.stats = { drops: 0, stumbles: 0, bumps: 0, reloads: 0 };
    this.dest = SPOTS[job.to];
    this.marker.position.set(this.dest.x, heightAt(this.dest.x, this.dest.z) + 0.02, this.dest.z);
    this.marker.visible = true;
    this.windT = 0;
    this.gust = 0;
    this.setPhase('brief');
    const reis = this.npcs.reis;
    reis && reis.play('talk');
    this.speak(job.brief, () => {
      reis && reis.play('idle');
      this.setPhase('play');
      this.emit('tips', job.tips);
      this.lockPointer();
    });
  }
  clearCargo() {
    for (const c of this.cargo) c.dispose();
    this.cargo = [];
  }

  deliver() {
    const job = this.job;
    const ok = this.cargo.filter((c) => c.attached && !c.broken);
    const broken = this.cargo.filter((c) => c.broken);
    const lost = this.cargo.filter((c) => !c.attached && !c.broken);
    const dent = ok.reduce((s, c) => s + Math.round(c.def.value * 0.2) * (c.dents || 0), 0);
    const loss = Math.min(job.pay, [...broken, ...lost].reduce((s, c) => s + c.def.value, 0) + dent);
    const late = Math.max(0, this.jobT - job.time);
    const latePen = Math.round(late / 5);
    const bonus = late === 0 && !broken.length && !lost.length && !ok.some((c) => c.dents) ? Math.round(job.pay * 0.15) : 0;
    const pay = Math.max(0, job.pay - loss - latePen + bonus);
    const stars = 1 + (late === 0 && ok.length > 0 ? 1 : 0) + (!broken.length && !lost.length && !dent ? 1 : 0);
    this.money += pay;
    const res = {
      id: job.id, title: job.title, pay, base: job.pay, loss, latePen, bonus, stars, time: this.jobT,
      ok: ok.map((c) => c.def.name), broken: broken.map((c) => c.def.name), lost: lost.map((c) => c.def.name), dent,
    };
    this.results[this.jobIdx] = res;
    this.jobIdx++;
    this.save();
    this.marker.visible = false;
    this.setPhase('deliver');
    this.audio.coins();
    // müşteri
    const cust = Object.keys(NPCS).find((k) => job.done[0][0] === k);
    const n = this.npcs[cust];
    if (n) {
      n.root.rotation.y = Math.atan2(this.porter.pos.x - n.root.position.x, this.porter.pos.z - n.root.position.z);
      n.play('talk');
    }
    this.porter.play('cheer', 0.3);
    const lines = broken.length || lost.length || dent ? job.doneBad : job.done;
    this.speak(lines, () => {
      n && n.play('idle');
      this.setPhase('result');
      this.emit('result', { ...res, money: this.money, target: TARGET, final: this.jobIdx >= JOBS.length });
    });
  }
  next() {
    if (this.jobIdx >= JOBS.length) {
      this.setPhase('ending');
      this.emit('ending', { money: this.money, ok: this.money >= TARGET, results: this.results });
      return;
    }
    this.showBoard();
  }

  // ---------------- Ses ----------------
  speak(lines, done, narr = false) {
    const id = (this.voiceId = (this.voiceId || 0) + 1);
    const nxt = (i) => {
      if (id !== this.voiceId) return;
      if (i >= lines.length) {
        this.emit('subtitle', null);
        done && done();
        return;
      }
      const [s, t] = lines[i];
      const sp = SPEAKERS[s] || { name: '', color: '#fff' };
      this.emit('subtitle', { s, name: s === 'kemal' && narr ? '' : sp.name, color: sp.color, text: t, narr });
      let fin = false;
      const go = () => {
        if (fin || id !== this.voiceId) return;
        fin = true;
        this.later(0.3, () => nxt(i + 1));
      };
      const skipVoice = this.testMode && !/[?&]voices\b/.test(location.search);
      this.voiceEl = skipVoice ? null : this.bank.play(s + '|' + t, 1, go);
      this.later((this.testMode ? 0.4 : 1.6) + t.length * (this.testMode ? 0.01 : 0.075), go);
    };
    nxt(0);
  }
  stopVoice() {
    this.voiceId = (this.voiceId || 0) + 1;
    if (this.voiceEl) {
      this.voiceEl.onended = this.voiceEl.onerror = null;
      this.voiceEl.pause();
    }
    this.emit('subtitle', null);
  }
  skipLine() {
    // altyazıyı hızlı geç
    if (this.voiceEl) this.voiceEl.pause();
    const t = this.timers.find((x) => x.fn && x.voice);
    void t;
    if (this.voiceEl && this.voiceEl.onended) this.voiceEl.onended();
  }
  bark(kind) {
    if (this.phase !== 'play' || (this.barkCd || 0) > 0) return;
    this.barkCd = 3;
    const t = pick(BARKS[kind]);
    this.emit('toast', { text: t, id: Math.random() });
    if (!(this.testMode && !/[?&]voices\b/.test(location.search))) this.bank.play('kemal|' + t, 0.9);
  }
  later(sec, fn) {
    this.timers.push({ t: sec, fn });
  }

  // ---------------- Girdi ----------------
  bindInput() {
    this._kd = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (this.phase === 'play') {
        if (e.code === 'KeyE') this.action();
        if (e.code === 'KeyC') this.camDist = this.camDist > 6 ? 4.4 : this.camDist < 5 ? 5.4 : 7.2;
        if (e.code === 'Escape' && !document.pointerLockElement) this.pause();
      } else if (this.phase === 'paused' && e.code === 'Escape') this.resume();
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if ((this.phase === 'intro' || this.phase === 'brief' || this.phase === 'deliver') && (e.code === 'Space' || e.code === 'Enter')) this.skipLine();
    };
    this._ku = (e) => this.keys.delete(e.code);
    this._mm = (e) => {
      if (this.phase !== 'play' || document.pointerLockElement !== this.renderer.domElement) return;
      this.mouseLean.x = clamp(this.mouseLean.x + e.movementX * 0.006 * this.sensitivity, -1.3, 1.3);
      this.mouseLean.y = clamp(this.mouseLean.y - e.movementY * 0.006 * this.sensitivity, -1.3, 1.3);
    };
    this._click = () => {
      if (this.phase === 'play' && !document.pointerLockElement) this.lockPointer();
    };
    this._plc = () => {
      const l = document.pointerLockElement === this.renderer.domElement;
      this.emit('lock', l);
      if (!l && this.phase === 'play' && performance.now() > (this.ignoreUnlock || 0)) this.pause();
    };
    this._blur = () => this.keys.clear();
    this._vis = () => document.hidden && this.pause();
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    document.addEventListener('mousemove', this._mm);
    document.addEventListener('pointerlockchange', this._plc);
    this.renderer.domElement.addEventListener('click', this._click);
    window.addEventListener('blur', this._blur);
    document.addEventListener('visibilitychange', this._vis);
  }
  lockPointer() {
    if (this.touch || this.testMode) return;
    try {
      const r = this.renderer.domElement.requestPointerLock();
      r && r.catch && r.catch(() => {});
    } catch { /* yok say */ }
  }
  pause() {
    if (this.phase !== 'play') return;
    this.setPhase('paused');
    this.keys.clear();
    this.audio.suspend();
  }
  resume() {
    if (this.phase !== 'paused') return;
    this.audio.resume();
    this.clock.getDelta();
    this.ignoreUnlock = performance.now() + 500;
    this.setPhase('play');
    this.lockPointer();
  }
  setTouchMove(x, y) {
    this.touchMove = { x, y };
  }
  setTouchLean(v) {
    this.touchLean = v; // {x,y} -1..1 ya da null
  }
  press(code) {
    this._kd({ code, repeat: false, preventDefault() {} });
    this.keys.delete(code);
  }
  hold(code, on) {
    if (on) this.keys.add(code);
    else this.keys.delete(code);
  }

  // E: teslim et ya da düşen yükü yükle
  action() {
    const P = this.porter;
    if (P.stumbleT > 0 || P.busyT > 0) return;
    const f = this.focus;
    if (!f) return;
    if (f.type === 'deliver') return this.deliver();
    if (f.type === 'reload') {
      P.busyT = 1.1;
      P.speed = 0;
      this.stats.reloads++;
      this.audio.grunt();
      this.bark('reload');
      const c = f.cargo;
      this.later(0.7, () => {
        // yığındaki yerine geri koy
        c.placeAtSlot(P.platform);
      });
    }
  }

  // ---------------- Döngü ----------------
  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (this.manual) return;
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.frame(dt, true);
  }
  stepFrames(n, dt = 1 / 30, render = false) {
    for (let i = 0; i < n; i++) this.frame(dt, render && i === n - 1);
  }
  frame(dt, render = true) {
    const playing = this.phase === 'play';
    if (this.phase !== 'paused') {
      this.time += dt;
      for (const tm of this.timers) tm.t -= dt;
      const due = this.timers.filter((x) => x.t <= 0);
      this.timers = this.timers.filter((x) => x.t > 0);
      due.forEach((x) => x.fn());
      this.barkCd = Math.max(0, (this.barkCd || 0) - dt);
      // fizik: sabit adım
      this.acc = (this.acc || 0) + dt;
      let n = 0;
      while (this.acc >= STEP && n < 4) {
        this.physicsStep(STEP, !playing);
        this.acc -= STEP;
        n++;
      }
      if (n === 4) this.acc = 0;
      for (const c of this.cargo) c.sync();
      this.updateWorld(dt);
      this.porter.animate(dt);
      if (playing) this.updatePlay(dt);
    }
    this.updateCamera(dt);
    if (render) this.renderer.render(this.scene, this.camera);
  }

  // bir fizik adımı: yürüyüş, denge, semer, urgan, dünya
  physicsStep(dt, frozen) {
    const P = this.porter;
    if (!frozen) this.updatePorter(dt);
    else {
      P.speed *= 0.8;
      P.tilt.multiplyScalar(0.95);
      P.tiltV.multiplyScalar(0.8);
    }
    P.updatePlatform(dt);
    const ropeMul = P.stumbleT > 0.6 ? 0.18 : 1;
    for (const c of this.cargo) {
      const r = c.step(dt, P.platform, ropeMul);
      if (r === 'snap' && !frozen) {
        this.audio.snap();
        this.stats.drops++;
        this.bark('drop');
      }
      // rüzgâr
      if (this.wind > 0.05 && !c.broken) {
        const area = c.def.size[0] * c.def.size[1];
        const f = this.windDir.clone().multiplyScalar(this.wind * area * 26 * dt);
        c.body.applyImpulse({ x: f.x, y: 0, z: f.z }, true);
      }
    }
    this.world.step();
    for (const c of this.cargo) {
      const r = c.checkImpact(dt);
      if (r === 'break' && !frozen) {
        c.shatter();
        this.audio.crash(c.kind);
        this.bark('break');
      } else if (r === 'thud') this.audio.thud(0.25);
    }
  }

  // yük kütle merkezi (semer yerel uzayında)
  loadCOM() {
    const P = this.porter.platform;
    const inv = P.q.clone().invert();
    const com = V3();
    let m = 0;
    for (const c of this.cargo) {
      if (!c.attached || c.broken) continue;
      const p = c.body.translation();
      const l = V3(p.x, p.y, p.z).sub(P.p).applyQuaternion(inv);
      com.addScaledVector(l, c.def.mass);
      m += c.def.mass;
    }
    if (m > 0) com.divideScalar(m);
    return { com, m };
  }

  updatePorter(dt) {
    const P = this.porter, k = this.keys;
    // girdi
    let f = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
    let turn = (k.has('KeyA') ? 1 : 0) - (k.has('KeyD') ? 1 : 0);
    const tm = this.touchMove;
    if (Math.abs(tm.x) > 0.1 || Math.abs(tm.y) > 0.1) {
      f = -tm.y;
      turn = -tm.x;
    }
    const fast = k.has('ShiftLeft') || k.has('ShiftRight') || this.touchFast;
    // tuşlar: anında tam güç değil, çeyrek saniyede artan yumuşak itiş
    const kx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0) + (k.has('KeyX') ? 1 : 0) - (k.has('KeyZ') ? 1 : 0);
    const ky = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0);
    this.keyLean = this.keyLean || new THREE.Vector2();
    this.keyLean.x += (clamp(kx, -1, 1) - this.keyLean.x) * Math.min(1, dt * 5);
    this.keyLean.y += (clamp(ky, -1, 1) - this.keyLean.y) * Math.min(1, dt * 5);
    let lx = this.keyLean.x * 0.8;
    let ly = this.keyLean.y * 0.8;
    // fare: birikir, yavaşça sönümlenir
    this.mouseLean.multiplyScalar(Math.exp(-dt * 2.2));
    lx += this.mouseLean.x;
    ly += this.mouseLean.y;
    if (this.touchLean) {
      lx += this.touchLean.x;
      ly += this.touchLean.y;
    }
    lx = clamp(lx, -1.3, 1.3);
    ly = clamp(ly, -1.3, 1.3);
    this.leanIn = { x: lx, y: ly };

    const { com, m } = this.loadCOM();
    const heavy = m > 80;
    const stairs = onStairs(P.pos.x, P.pos.z);
    if (P.busyT > 0) P.busyT -= dt;
    const canWalk = P.stumbleT <= 0 && P.busyT <= 0;
    const maxSp = (stairs ? 1.25 : 1.9) * (fast ? 1.45 : 1) * (heavy ? 0.78 : 1) * (m > 0 ? 1 : 1.25);
    const want = canWalk ? f * maxSp * (f < 0 ? 0.5 : 1) : 0;
    const prevSp = P.speed;
    P.speed += clamp(want - P.speed, -3 * dt, 2.4 * dt);
    const accel = (P.speed - prevSp) / dt;
    const turnRate = (m > 60 ? 1.15 : 1.6) * (canWalk ? turn : 0);
    P.yaw += turnRate * dt;
    // hareket ve çarpışma
    const fw = P.forward();
    const nx = P.pos.x + fw.x * P.speed * dt, nz = P.pos.z + fw.z * P.speed * dt;
    const obs = this.dynObstacles();
    let moved = true;
    if (walkable(nx, nz, 0.34, obs)) {
      P.pos.x = nx;
      P.pos.z = nz;
    } else if (walkable(nx, P.pos.z, 0.34, obs)) P.pos.x = nx;
    else if (walkable(P.pos.x, nz, 0.34, obs)) P.pos.z = nz;
    else {
      moved = false;
      if (Math.abs(P.speed) > 0.8) {
        const k = Math.min(1, Math.abs(P.speed) / 2.2);
        this.jolt((Math.random() - 0.5) * 0.4 * k, -Math.sign(P.speed) * 0.35 * k, 'bump');
      }
      P.speed = 0;
    }
    void moved;
    P.pos.y += (heightAt(P.pos.x, P.pos.z) - P.pos.y) * Math.min(1, dt * 12);

    // adımlar: yürüyüş sarsıntısı
    const sp = Math.abs(P.speed);
    P.gait += sp * dt * (stairs ? 2.4 : 1.9);
    P.bob = P.gait * Math.PI;
    const stepN = Math.floor(P.gait);
    if (stepN !== P.lastStepN) {
      P.lastStepN = stepN;
      if (sp > 0.2) {
        const side = stepN % 2 ? 1 : -1;
        const amp = (fast ? 1.8 : 1) * (0.5 + sp * 0.35);
        this.jolt(side * 0.11 * amp + (Math.random() - 0.5) * 0.08 * amp, (Math.random() - 0.5) * 0.1 * amp);
        this.audio.step(stairs, heavy);
      }
    }
    const si = stepIndex(P.pos.x, P.pos.z);
    if (si !== P.lastStep) {
      if (P.lastStep >= 0 && si >= 0) {
        const up = si > P.lastStep ? 1 : -1;
        this.jolt((Math.random() - 0.5) * 0.28 * (fast ? 1.8 : 1), -up * (0.18 + Math.random() * 0.1) * (fast ? 1.6 : 1));
      }
      P.lastStep = si;
    }

    // ---- denge: ters sarkaç ----
    const h = Math.max(0.15, com.y);
    const inertia = 0.7 + m / 90;
    const G = 3.4 * (0.9 + h * 2.0);
    // durup nefeslenince toparlamak kolaylaşır
    const K = 7.2 + (Math.abs(P.speed) < 0.25 ? 2.6 : 0);
    const D = 3.4;
    const U = 9;
    const slope = slopeAt(P.pos.x, P.pos.z, fw.x, fw.z);
    const ax =
      (G - K) * P.tilt.x + com.x * 9 + U * lx - D * P.tiltV.x
      + turnRate * P.speed * 0.9 // dönüşte dışa doğru
      + (this.wind * this.windSide) * (0.6 + h * 1.6);
    const ay =
      (G - K) * P.tilt.y + -com.z * 9 + U * ly - D * P.tiltV.y
      - accel * 0.75 // hızlanınca yük geriye
      - slope * P.speed * 1.4;
    if (P.stumbleT > 0) {
      P.stumbleT -= dt;
      // sendelerken önce düşüş yönünde savrulur, sonra toparlar
      if (P.stumbleT > 0.6) {
        const d = P.stumbleDir;
        P.tilt.lerp(d.clone().multiplyScalar(0.95), Math.min(1, dt * 6));
      } else P.tilt.multiplyScalar(Math.exp(-dt * 4));
      P.tiltV.set(0, 0);
      if (P.stumbleT <= 0) P.play('carry_idle', 0.4);
    } else {
      P.tiltV.x += (ax / inertia) * dt;
      P.tiltV.y += (ay / inertia) * dt;
      P.tilt.x += P.tiltV.x * dt;
      P.tilt.y += P.tiltV.y * dt;
      const t = P.tilt.length();
      // sınırda kısa bir toparlanma payı: hemen düşmez, Kemal yavaşlar
      if (t > TILT_MAX * 0.8) P.speed *= Math.exp(-dt * 3);
      P.edgeT = t > TILT_MAX ? (P.edgeT || 0) + dt : 0;
      if (t > TILT_MAX * 1.35) P.edgeT = 1;
      if (P.edgeT > 0.32 && m > 0) {
        P.edgeT = 0;
        P.stumbleT = 1.4;
        P.stumbleDir = P.tilt.clone().normalize();
        P.speed = 0;
        this.stats.stumbles++;
        P.play('stumble', 0.1);
        this.audio.grunt();
        this.bark('stumble');
        // sendeleyince üstteki yükler savrulur: yükseldikçe düşme olasılığı artar
        const dir = P.stumbleDir;
        const fw2 = P.forward();
        const right2 = V3(-fw2.z, 0, fw2.x);
        const push = right2.multiplyScalar(dir.x).addScaledVector(fw2, dir.y);
        const inv = P.platform.q.clone().invert();
        let fell = 0;
        for (const c of this.cargo) {
          if (!c.attached || c.broken) continue;
          const bp = c.body.translation();
          const hh = V3(bp.x, bp.y, bp.z).sub(P.platform.p).applyQuaternion(inv).y;
          const single = this.cargo.length === 1;
          // ağır tek yük (buzdolabı, piyano): Kemal çoğu zaman dizinin üstüne çöküp yükü sırtında tutar; yük sarsılır
          if (single && c.def.mass > 40 && !(onStairs(P.pos.x, P.pos.z) && Math.random() < 0.35)) {
            c.dents = (c.dents || 0) + 1;
            this.emit('toast', { text: `${c.def.name} sarsıldı! (−${Math.round(c.def.value * 0.2)} ₺)`, id: Math.random() });
            continue;
          }
          const pr = (single ? 0.55 : 0.12 + hh * 0.75) * (this.job && this.job.id === 1 ? 0.6 : 1);
          if (Math.random() < pr) {
            c.attached = false;
            c.groundT = 0;
            const m = c.def.mass;
            c.body.applyImpulse({ x: push.x * m * 2.2, y: m * 1.2, z: push.z * m * 2.2 }, true);
            fell++;
          }
        }
        if (fell) {
          this.stats.drops += fell;
          this.audio.snap();
        }
      }
    }
    if (m === 0) {
      P.tilt.multiplyScalar(Math.exp(-dt * 5));
      P.tiltV.multiplyScalar(Math.exp(-dt * 5));
    }
    // klip
    if (P.stumbleT <= 0 && P.busyT <= 0) {
      if (sp > 0.15) P.play(m > 0 ? 'carry_walk' : 'walk', 0.25), P.action && (P.action.timeScale = (sp / 1.4) * (P.speed < 0 ? -1 : 1));
      else P.play(m > 0 ? 'carry_idle' : 'idle', 0.35);
    }
  }

  jolt(x, y, why) {
    const P = this.porter;
    const { m } = this.loadCOM();
    const k = 1 / (0.7 + m / 90);
    P.tiltV.x += x * k * 2.2;
    P.tiltV.y += y * k * 2.2;
    if (why === 'bump') {
      this.stats.bumps++;
      this.bark('bump');
      this.audio.thud(0.15);
    }
  }

  dynObstacles() {
    const o = this.city.obstacles.slice();
    for (const w of this.walkers) o.push({ x: w.root.position.x, z: w.root.position.z, r: 0.3 });
    for (const n of Object.values(this.npcs)) o.push({ x: n.root.position.x, z: n.root.position.z, r: 0.3 });
    return o;
  }

  updateWorld(dt) {
    const t = this.time;
    this.city.update(dt, t);
    // rüzgâr: çeyiz işinde ara ara poyraz
    const windy = this.phase === 'play' && this.job && this.job.wind;
    if (windy) {
      this.windT -= dt;
      if (this.windT <= 0) {
        this.windT = 7 + Math.random() * 6;
        this.gustLen = 2.5 + Math.random() * 1.5;
        this.gustAge = 0;
        this.windSide = Math.random() < 0.5 ? -1 : 1;
        const fw = this.porter.forward();
        this.windDir = V3(-fw.z, 0, fw.x).multiplyScalar(this.windSide);
        this.bark('wind');
      }
      if (this.gustAge !== undefined && this.gustAge < this.gustLen) {
        this.gustAge += dt;
        this.wind = Math.sin((this.gustAge / this.gustLen) * Math.PI) * 0.9;
      } else this.wind = Math.max(0, this.wind - dt);
    } else this.wind = 0;
    if (!this.windDir) this.windDir = V3(1, 0, 0);
    this.windSide = this.windSide || 1;

    for (const n of Object.values(this.npcs)) n.mixer.update(dt);
    // yürüyenler
    const P = this.porter;
    for (const w of this.walkers) {
      w.mixer.update(dt);
      const p = w.root.position;
      if (w.wait > 0) {
        w.wait -= dt;
        w.play('idle');
        continue;
      }
      const d = V3(w.to.x - p.x, 0, w.to.z - p.z);
      const L = d.length();
      const dp = Math.hypot(P.pos.x - p.x, P.pos.z - p.z);
      // hamalın önünden çekil: çok yakınsa dur
      if (dp < 1.1) {
        w.play('idle');
        if (dp < 0.75 && this.phase === 'play' && (w.bumpCd || 0) <= 0) {
          w.bumpCd = 3;
          this.jolt((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.6, 'bump');
        }
        w.bumpCd = (w.bumpCd || 0) - dt;
        continue;
      }
      w.bumpCd = (w.bumpCd || 0) - dt;
      if (L < 0.2) {
        w.to = w.to === w.b ? w.a : w.b;
        w.wait = 1.5 + Math.random() * 3;
        continue;
      }
      d.multiplyScalar(1 / L);
      p.x += d.x * w.speed * dt;
      p.z += d.z * w.speed * dt;
      p.y = heightAt(p.x, p.z);
      w.root.rotation.y = Math.atan2(d.x, d.z);
      w.play('walk');
    }
    // dolmuş
    const c = this.car;
    if (c.wait > 0) {
      c.wait -= dt;
      this.audio.engine(0);
    } else {
      c.x += c.dir * c.speed * dt;
      const near = Math.abs(P.pos.z + 18) < 3 && Math.abs(c.x - P.pos.x) < 30;
      this.audio.engine(near ? 0.06 : 0.02, c.speed / 10);
      // hamal yolda ve araç yaklaşıyorsa korna, yavaşla
      const ahead = (P.pos.x - c.x) * c.dir;
      const inLane = Math.abs(P.pos.z + 18) < 1.6;
      if (inLane && ahead > 0 && ahead < 10) {
        if ((c.hornCd || 0) <= 0) {
          this.audio.horn();
          c.hornCd = 2.5;
          this.bark('car');
        }
        c.speed = Math.max(2.5, c.speed - dt * 8);
      } else c.speed = Math.min(8.5, c.speed + dt * 3);
      c.hornCd = (c.hornCd || 0) - dt;
      if (inLane && Math.abs(ahead) < 2.8 && this.phase === 'play') {
        // çarptı: sert sarsıntı, yol dışına it
        P.pos.z = P.pos.z + 18 > 0 ? -16.2 : -19.8;
        this.jolt(c.dir * 1.4, 0.3);
        this.audio.thud(0.4, false);
        this.audio.horn();
      }
      if (Math.abs(c.x) > 60) {
        c.dir *= -1;
        c.x = clamp(c.x, -60, 60);
        c.wait = 5 + Math.random() * 6;
      }
    }
    c.obj.position.set(c.x, 0, c.dir > 0 ? -18.9 : -17.1);
    c.obj.rotation.y = c.dir > 0 ? 0 : Math.PI;
    // kediler
    for (const k of this.cats) {
      k.t += dt;
      const ph = (k.t % 14) / 14;
      const tt = ph < 0.4 ? ph / 0.4 : ph < 0.5 ? 1 : ph < 0.9 ? 1 - (ph - 0.5) / 0.4 : 0;
      const x = THREE.MathUtils.lerp(k.a.x, k.b.x, tt), z = THREE.MathUtils.lerp(k.a.z, k.b.z, tt);
      k.obj.position.set(x, heightAt(x, z), z);
      k.obj.rotation.y = Math.atan2(k.b.x - k.a.x, k.b.z - k.a.z) * 0 + ((ph < 0.5 ? 0 : Math.PI) - Math.atan2(k.b.z - k.a.z, k.b.x - k.a.x));
      if (this.phase === 'play' && Math.hypot(P.pos.x - x, P.pos.z - z) < 0.5 && (k.cd || 0) <= 0) {
        k.cd = 4;
        this.audio.meow();
        this.jolt((Math.random() - 0.5) * 0.8, 0.25);
      }
      k.cd = (k.cd || 0) - dt;
    }
    // kanarya ara ara öter
    for (const cg of this.cargo)
      if (cg.kind === 'cage' && !cg.broken && Math.random() < dt * 0.25) this.audio.chirp();
    // güneş gölgesi hamalı izlesin
    const s = this.sun;
    s.position.copy(P.pos).addScaledVector(this.sunDir, 80);
    s.target.position.copy(P.pos);
    this.marker.rotation.y += dt * 0.6;
    const strain = this.cargo.reduce((a, c) => Math.max(a, c.attached ? c.strain : 0), 0);
    this.audio.update(dt, { nearSea: clamp(1 - Math.abs(P.pos.z - 10) / 40, 0, 1), wind: this.wind, strain });
  }

  updatePlay(dt) {
    const P = this.porter;
    this.jobT += dt;
    // odak: teslim bölgesi ya da düşen yük
    let focus = null;
    const d = Math.hypot(P.pos.x - this.dest.x, P.pos.z - this.dest.z);
    const attached = this.cargo.filter((c) => c.attached && !c.broken).length;
    if (d < 2.4) focus = { type: 'deliver', label: attached < this.cargo.length ? 'Teslim et (eksik yükle)' : 'Teslim et' };
    if (!focus) {
      let best = null, bd = 1.8;
      for (const c of this.cargo) {
        if (c.attached || c.broken) continue;
        const p = c.body.translation();
        const dd = Math.hypot(p.x - P.pos.x, p.z - P.pos.z);
        if (dd < bd && Math.abs(P.speed) < 0.5) {
          bd = dd;
          best = c;
        }
      }
      if (best) focus = { type: 'reload', cargo: best, label: `${best.def.name}: geri yükle` };
    }
    this.focus = focus;
    // HUD
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) {
      this.hudT = 0.08;
      const fw = P.forward();
      const toD = Math.atan2(this.dest.x - P.pos.x, this.dest.z - P.pos.z);
      const myA = Math.atan2(fw.x, fw.z);
      let rel = toD - myA;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      this.emit('hud', {
        title: this.job.title,
        dest: this.dest.label,
        dist: d,
        arrow: rel,
        time: this.job.time - this.jobT,
        pay: this.job.pay,
        money: this.money,
        tilt: { x: P.tilt.x / TILT_MAX, y: P.tilt.y / TILT_MAX },
        stumble: P.stumbleT > 0,
        wind: this.wind,
        items: this.cargo.map((c) => ({ name: c.def.name, st: c.broken ? 'broken' : c.attached ? 'ok' : 'lost', fragile: !!c.def.fragile })),
        prompt: focus ? focus.label : null,
      });
    }
  }

  updateCamera(dt) {
    const P = this.porter;
    const cam = this.camera;
    if (this.phase === 'menu' || this.phase === 'loading' || this.phase === 'intro') {
      // menü: kuleye doğru yavaş süzülen bakış
      const t = this.time * 0.03;
      cam.position.set(-6 + Math.sin(t) * 4, 9 + Math.sin(t * 0.7), 22);
      cam.lookAt(20, 22, -110);
      return;
    }
    if (this.phase === 'brief' || this.phase === 'board') {
      const r = this.npcs.reis;
      const tgt = r ? r.root.position.clone().add(V3(0, 1.4, 0)) : P.pos.clone();
      const want = P.pos.clone().add(V3(4.6, 2.4, 4.4));
      cam.position.lerp(want, Math.min(1, dt * 3));
      this._look = (this._look || tgt.clone()).lerp(tgt.clone().lerp(P.pos.clone().add(V3(0, 1.8, 0)), 0.5), Math.min(1, dt * 3));
      cam.lookAt(this._look);
      return;
    }
    const fw = P.forward();
    if (this.phase === 'deliver' || this.phase === 'result') {
      const n = this.npcs[Object.keys(NPCS).find((k) => this.job && this.job.done[0][0] === k)];
      const tgt = n ? n.root.position.clone().lerp(P.pos, 0.5).add(V3(0, 1.6, 0)) : P.pos.clone().add(V3(0, 1.6, 0));
      const right = V3(-fw.z, 0, fw.x);
      const want = P.pos.clone().addScaledVector(right, 3.4).addScaledVector(fw, 2.6).add(V3(0, 2.2, 0));
      cam.position.lerp(want, Math.min(1, dt * 2));
      this._look = (this._look || tgt.clone()).lerp(tgt, Math.min(1, dt * 3));
      cam.lookAt(this._look);
      return;
    }
    // yük yükseldikçe kamera yükselir ve geri çekilir (önü görülsün)
    let top = 0;
    for (const c of this.cargo) if (c.attached && !c.broken) top = Math.max(top, c.mesh.position.y - P.pos.y + c.def.size[1] / 2);
    this.camTop = this.camTop === undefined ? top : this.camTop + (top - this.camTop) * Math.min(1, dt * 1.5);
    const extra = Math.max(0, this.camTop - 1.9);
    this.camYaw = this.camYaw === undefined ? P.yaw : this.camYaw;
    let dy = P.yaw - this.camYaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.camYaw += dy * Math.min(1, dt * 2.2);
    const back = V3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const want = P.pos.clone().addScaledVector(back, this.camDist + extra * 1.6).add(V3(0, 2.4 + this.camDist * 0.22 + extra * 1.5, 0));
    const gy = heightAt(want.x, want.z) + 1.2;
    if (want.y < gy) want.y = gy;
    cam.position.lerp(want, Math.min(1, dt * 4));
    const look = P.pos.clone().add(V3(0, 1.75 + extra * 0.6, 0)).addScaledVector(fw, 1.4 + extra);
    this._look = (this._look || look.clone()).lerp(look, Math.min(1, dt * 5));
    cam.lookAt(this._look);
  }

  resize() {
    const w = this.container.clientWidth || innerWidth, h = this.container.clientHeight || innerHeight;
    const pr = this.testMode ? 0.6 : Math.min(devicePixelRatio, this.low ? 1 : 1.6);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 70 : 58;
    this.camera.updateProjectionMatrix();
  }
  setVolume(v) {
    this.audio && this.audio.setVolume(v);
  }

  dispose() {
    this.running = false;
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    document.removeEventListener('mousemove', this._mm);
    document.removeEventListener('pointerlockchange', this._plc);
    window.removeEventListener('blur', this._blur);
    document.removeEventListener('visibilitychange', this._vis);
    window.removeEventListener('resize', this._resize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    if (window.__hamal === this) delete window.__hamal;
  }
}

export { JOBS, KINDS, SEGS };
