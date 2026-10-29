import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, SMAAEffect, BloomEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { VoiceSystem } from '@engine/voice.js';
import { VoiceBank } from '@engine/voicebank.js';
import { KeciAudio } from '../../keci/game/music.js';
import { buildHouse, roomAt, FLOOR2, WALK_Z, STAIR } from './house.js';
import { makePerson, makeCin } from './models.js';
import { SPEAKERS, VOICE_INDEX, PRANKS, ITEMS, EPISODES, BARKS } from './story.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const FLOOR_X = [
  [-15.2, 11.5],
  [-7.7, 11.5],
];
const USTA_ROUTINE = [
  { act: 'matkap', room: 'calisma', x: 1.4, dur: 9, label: 'matkapla delik açıyor', anim: 'drill' },
  { act: 'tasima', room: 'salon', x: 2.2, dur: 6, label: 'moloz taşıyor', anim: 'work' },
  { act: 'cay', room: 'mutfak', x: -4.6, dur: 5, label: 'çay molası', anim: 'drink' },
];

export class Game {
  constructor(container, emit, opts = {}) {
    this.container = container;
    this.emit = emit;
    this.touch = !!opts.touch;
    this.testMode = !!opts.test;
    this.low = !!opts.low;
    this.phase = 'menu';
    this.time = 0;
    this.manual = false;
    this.loop = this.loop.bind(this);

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false }));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = 'ev-canvas';
    container.appendChild(r.domElement);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 600);
    this.cam = { zoom: 1, cx: -1.8, cy: 3.9, follow: false };

    this.audio = new KeciAudio();
    this.voice = new VoiceSystem(this.audio, (s) => this.onSubtitle(s), SPEAKERS, VOICE_INDEX, this.testMode && !/[?&]voices\b/.test(location.search) ? null : new VoiceBank('/voices/evsahibi/'));

    this.bindInput();
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    this.loadEpisode(1);
    this.clock = new THREE.Clock();
    this.running = true;
    window.__ev = this;
    requestAnimationFrame(this.loop);
  }

  // ===================================================================
  // Bölüm kurulumu
  // ===================================================================
  loadEpisode(n) {
    this.voice.stop();
    if (this.scene) this.scene.traverse((o) => o.geometry && o.geometry.dispose());
    const ep = (this.ep = EPISODES.find((e) => e.id === n) || EPISODES[0]);
    const scene = (this.scene = new THREE.Scene());
    scene.fog = new THREE.Fog(0xe8f0f8, 60, 220);
    this.hemi = new THREE.HemisphereLight(0xdfeaff, 0x8a7050, 1.15);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight(0xfff0d8, 2.4));
    sun.position.set(14, 22, 26);
    sun.target.position.set(-2, 2, 0);
    sun.castShadow = true;
    const ss = this.low ? 1024 : 2048;
    sun.shadow.mapSize.set(ss, ss);
    Object.assign(sun.shadow.camera, { left: -20, right: 18, top: 14, bottom: -4, near: 1, far: 80 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);

    this.house = buildHouse(scene, n);
    this.hotMeshes = [];
    scene.traverse((o) => o.isMesh && o.userData.hot && this.hotMeshes.push(o));

    // karakterler
    this.cin = { m: makeCin(), floor: 0, x: -6.5, target: null, onStairs: null, hidden: null, task: null, inv: new Set(), dir: 1, speed: 0, scared: 0 };
    scene.add(this.cin.m.root, this.cin.m.smoke);
    this.humans = [];
    const necmi = this.makeHuman('necmi', ep.routine, 1.2, 0);
    this.necmi = necmi;
    this.humans.push(necmi);
    if (ep.usta) this.humans.push(this.makeHuman('usta', USTA_ROUTINE, -2.0, 0, 1.35));
    this.spawnPos = { floor: 0, x: -6.5 };
    if (n === 2) {
      necmi.floor = 1;
      necmi.x = -2;
      this.humans[1].floor = 1;
      this.humans[1].x = 2.5;
    }

    // şaka durumları
    this.pranks = {};
    for (const id of ep.pranks) this.pranks[id] = { id, ...PRANKS[id], state: 'idle' }; // idle | armed | done
    this.itemsTaken = new Set();
    for (const h of Object.values(this.house.hot)) if (h.item && !ep.items.includes(h.item)) h.obj.visible = false;
    this.marks = new Map();
    this.buildFx();

    this.state = { score: 0, anger: 0, combo: 0, comboT: 0, caught: 0, shields: 3, done: 0, t: 0, lastPrank: '' };
    this.dayT = 0;
    this.bubbles = [];
    this.resize();
    this.setupPost();
    this.emitHud(true);
  }

  makeHuman(kind, routine, x, floor, speed = 1.5) {
    const m = makePerson(kind);
    this.scene.add(m.root);
    return { kind, m, x, floor, routine: routine.filter((s) => s.act !== 'merdiven'), ri: -1, step: null, stateT: 0, mode: 'idle', speed, dir: 1, onStairs: null, sus: 0, susBarkT: 0, z: kind === 'usta' ? -0.25 : WALK_Z, carry: null };
  }

  setupPost() {
    if (this.composer) this.composer.dispose();
    this.composer = null;
    if (this.low || this.testMode) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      return;
    }
    this.renderer.toneMapping = THREE.NoToneMapping;
    const c = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    c.addPass(new RenderPass(this.scene, this.camera));
    c.addPass(
      new EffectPass(
        this.camera,
        new SMAAEffect(),
        new BloomEffect({ luminanceThreshold: 0.82, luminanceSmoothing: 0.2, intensity: 0.45, mipmapBlur: true }),
        new VignetteEffect({ offset: 0.3, darkness: 0.45 }),
        new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })
      )
    );
    this.composer = c;
    this.resize();
  }

  buildFx() {
    const N = 260;
    this.fx = { n: N, i: 0, pos: [], vel: [], life: new Float32Array(N), g: new Float32Array(N) };
    this.fxMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.4 }), N);
    this.fxMesh.frustumCulled = false;
    const z = new THREE.Matrix4().makeScale(0, 0, 0), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      this.fx.pos.push(V());
      this.fx.vel.push(V());
      this.fxMesh.setMatrixAt(i, z);
      this.fxMesh.setColorAt(i, c.setRGB(1, 1, 1));
    }
    this.scene.add(this.fxMesh);
  }

  burst(p, color, n = 14, speed = 2, up = 2, grav = 9) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = (this.fx.i = (this.fx.i + 1) % this.fx.n);
      this.fx.pos[i].copy(p);
      this.fx.vel[i].set((Math.random() - 0.5) * speed, Math.random() * up, (Math.random() - 0.2) * speed);
      this.fx.life[i] = 0.8 + Math.random() * 0.6;
      this.fx.g[i] = grav;
      this.fxMesh.setColorAt(i, c);
    }
    this.fxMesh.instanceColor.needsUpdate = true;
  }

  // ===================================================================
  // Akış
  // ===================================================================
  startEpisode(n) {
    this.audio.init();
    this.audio.resume();
    if (n !== this.ep.id || this.state.t > 0 || this.phase === 'result') this.loadEpisode(n);
    this.phase = 'intro';
    this.emit('phase', 'intro');
    this.voice.stop();
    this.voice.play(this.ep.intro, () => this.beginPlay());
  }

  skipIntro() {
    if (this.phase !== 'intro') return;
    this.voice.stop();
    this.beginPlay();
  }

  beginPlay() {
    if (this.phase === 'playing') return;
    this.phase = 'playing';
    this.emit('phase', 'playing');
    this.audio.setMode('roam');
    this.emit('toast', { text: this.ep.tips[0], ms: 6000 });
    this.time = 0;
  }

  pause() {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.emit('phase', 'paused');
    this.voice.pause(true);
    this.audio.suspend();
  }

  resume() {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.emit('phase', 'playing');
    this.voice.pause(false);
    this.audio.resume();
  }

  endEpisode(reason) {
    if (this.phase !== 'playing') return;
    this.phase = 'ending';
    const ep = this.ep, s = this.state;
    const win = reason !== 'caught' && s.done >= ep.goal;
    const stars = !win ? 0 : s.done >= ep.pranks.length ? 3 : s.done >= ep.goal + 1 ? 2 : 1;
    this.audio.setMode('none');
    if (win) this.audio.fanfare();
    const lines = win ? ep.win : reason === 'caught' ? ep.lose : ep.timeUp;
    this.voice.stop();
    this.voice.play(lines, () => {
      const res = { ep: ep.id, title: ep.title, win, stars, score: s.score, done: s.done, total: ep.pranks.length, goal: ep.goal, caught: s.caught, anger: Math.round(s.anger), reason, hasNext: !!EPISODES.find((e) => e.id === ep.id + 1) };
      try {
        const sv = JSON.parse(localStorage.getItem('evsahibi-save') || '{}');
        sv.unlocked = Math.max(sv.unlocked || 1, win ? ep.id + 1 : 1);
        sv.best = sv.best || {};
        const b = sv.best[ep.id];
        if (!b || res.score > b.score) sv.best[ep.id] = { score: res.score, stars };
        localStorage.setItem('evsahibi-save', JSON.stringify(sv));
      } catch {
        /* yok say */
      }
      this.phase = 'result';
      this.emit('result', res);
      this.emit('phase', 'result');
    });
  }

  // ===================================================================
  // Girdi: dokun / tıkla
  // ===================================================================
  bindInput() {
    const el = this.renderer.domElement;
    this.ray = new THREE.Raycaster();
    this.pointers = new Map();
    this._down = (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.cam.zoom };
      }
    };
    this._move = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (this.pointers.size === 2 && this.pinch) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.setZoom(this.pinch.z * (d / this.pinch.d));
        return;
      }
      if (Math.hypot(p.x - p.sx, p.y - p.sy) > 10 && this.cam.zoom > 1.05) {
        const k = this.viewW / (this.renderer.domElement.clientWidth || 1);
        this.cam.cx -= dx * k;
        this.cam.cy += dy * k;
        this.cam.follow = false;
        this.clampCam();
      }
    };
    this._up = (e) => {
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (!p || Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 10) return;
      this.tap(e.clientX, e.clientY);
    };
    this._wheel = (e) => {
      e.preventDefault();
      this.setZoom(this.cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1));
    };
    this._key = (e) => {
      if (e.code === 'Escape') this.phase === 'paused' ? this.resume() : this.pause();
      if (e.code === 'Space' && this.phase === 'intro') this.skipIntro();
      if (e.code === 'KeyZ') this.toggleFollow();
    };
    el.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    el.addEventListener('wheel', this._wheel, { passive: false });
    window.addEventListener('keydown', this._key);
    this._vis = () => document.hidden && this.pause();
    document.addEventListener('visibilitychange', this._vis);
  }

  setZoom(z) {
    this.cam.zoom = THREE.MathUtils.clamp(z, 1, 3.2);
    if (this.cam.zoom > 1.05 && !this.panned) this.cam.follow = true;
    this.clampCam();
  }
  toggleFollow() {
    if (this.cam.zoom > 1.05) {
      this.cam.zoom = 1;
      this.cam.follow = false;
    } else {
      this.cam.zoom = this.touch ? 1.7 : 2.1;
      this.cam.follow = true;
    }
    this.clampCam();
    this.emitHud(true);
  }
  clampCam() {
    if (this.cam.zoom <= 1.05) {
      this.cam.cx = -1.8;
      this.cam.cy = 3.9;
      return;
    }
    const hw = this.viewW / 2, hh = this.viewH / 2;
    this.cam.cx = THREE.MathUtils.clamp(this.cam.cx, -16.5 + hw, 12.8 - hw);
    this.cam.cy = THREE.MathUtils.clamp(this.cam.cy, -0.3 + hh, 8.4 - hh);
  }

  tap(cx, cy) {
    if (this.phase === 'intro') return this.skipIntro();
    if (this.phase !== 'playing') return;
    const el = this.renderer.domElement, rect = el.getBoundingClientRect();
    const ndc = { x: ((cx - rect.left) / rect.width) * 2 - 1, y: -((cy - rect.top) / rect.height) * 2 + 1 };
    this.ray.setFromCamera(ndc, this.camera);
    const hits = this.ray.intersectObjects(this.hotMeshes, false);
    for (const h of hits) {
      const id = h.object.userData.hot;
      const hot = this.house.hot[id];
      if (!hot || !hot.obj.visible) continue;
      if (this.clickHot(id)) return;
    }
    // zemine dokunma: önü açık kesitte z=WALK_Z düzlemi
    const plane = new THREE.Plane(V(0, 0, 1), -WALK_Z);
    const p = V();
    if (!this.ray.ray.intersectPlane(plane, p)) return;
    if (p.y > FLOOR2 + 3.4 || p.y < -0.6) return;
    const floor = p.y > FLOOR2 - 0.3 ? 1 : 0;
    const [x0, x1] = FLOOR_X[floor];
    this.moveCin({ floor, x: THREE.MathUtils.clamp(p.x, x0, x1) });
    this.marker(floor, THREE.MathUtils.clamp(p.x, x0, x1));
  }

  marker(floor, x) {
    if (!this.tapMark) {
      this.tapMark = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.26, 24), new THREE.MeshBasicMaterial({ color: 0x9df0ff, transparent: true, opacity: 0.8 }));
      this.tapMark.rotation.x = -Math.PI / 2;
      this.scene.add(this.tapMark);
    }
    this.tapMark.position.set(x, floor * FLOOR2 + 0.03, WALK_Z + 0.4);
    this.tapMark.userData.t = 0.8;
  }

  // Bir nesneye dokunuldu: saklan, eşya al ya da şaka hazırla
  clickHot(id) {
    const hot = this.house.hot[id];
    if (!hot) return false;
    const floor = this.roomFloor(hot.room, hot.y);
    if (hot.hide) {
      const spot = this.house.hides.find((h) => 'hide_' + h.id === id);
      this.moveCin({ floor: spot.floor, x: spot.x }, { kind: 'hide', spot });
      return true;
    }
    if (hot.item) {
      if (this.itemsTaken.has(hot.item)) return false;
      this.moveCin({ floor, x: hot.x }, { kind: 'item', item: hot.item, hot });
      return true;
    }
    const pr = Object.values(this.pranks).find((p) => p.item === id);
    if (!pr) return false;
    if (pr.state !== 'idle') {
      this.emit('toast', { text: pr.state === 'armed' ? `${pr.title}: hazır, Necmi Bey'i bekliyor` : `${pr.title}: yapıldı`, ms: 2000 });
      return true;
    }
    this.moveCin({ floor, x: hot.x }, { kind: 'prank', pr });
    return true;
  }

  roomFloor(roomId, hintFloor) {
    if (roomId === 'merdiven') return hintFloor || 0;
    const r = this.house.rooms.find((x) => x.id === roomId);
    return r ? r.floor : 0;
  }

  moveCin(target, then = null) {
    const c = this.cin;
    if (c.task && c.task.kind === 'work') {
      c.task = null; // yarım kalan iş iptal
      this.emit('work', null);
    }
    if (c.hidden) this.unhide();
    c.target = target;
    c.then = then;
  }

  unhide() {
    const c = this.cin;
    c.hidden = null;
  }

  // ===================================================================
  // Hareket (kat + merdiven)
  // ===================================================================
  // a: {floor, x, onStairs}, hedef: {floor, x}. Varınca true.
  step(a, target, speed, dt) {
    let left = speed * dt;
    for (let guard = 0; guard < 4 && left > 1e-4; guard++) {
      if (a.onStairs) {
        const s = a.onStairs;
        const len = Math.hypot(STAIR.x1 - STAIR.x0, FLOOR2);
        const want = s.goal;
        const d = want - s.p;
        const mv = Math.min(Math.abs(d), left / len);
        s.p += Math.sign(d) * mv;
        left -= mv * len;
        a.x = STAIR.x0 + (STAIR.x1 - STAIR.x0) * s.p;
        a.dir = Math.sign(d) * (STAIR.x1 > STAIR.x0 ? 1 : -1) || a.dir;
        if (Math.abs(want - s.p) < 1e-4) {
          a.floor = want > 0.5 ? 1 : 0;
          a.onStairs = null;
        }
        continue;
      }
      if (a.floor === target.floor) {
        const d = target.x - a.x;
        if (Math.abs(d) < 0.03) return true;
        const mv = Math.min(Math.abs(d), left);
        a.x += Math.sign(d) * mv;
        a.dir = Math.sign(d);
        left -= mv;
        continue;
      }
      // merdivene git
      const sx = a.floor === 0 ? STAIR.x0 : STAIR.x1;
      const d = sx - a.x;
      if (Math.abs(d) < 0.03) {
        a.onStairs = { p: a.floor === 0 ? 0 : 1, goal: a.floor === 0 ? 1 : 0 };
        if (a.onStairEnter) a.onStairEnter(a);
        continue;
      }
      const mv = Math.min(Math.abs(d), left);
      a.x += Math.sign(d) * mv;
      a.dir = Math.sign(d);
      left -= mv;
    }
    return !a.onStairs && a.floor === target.floor && Math.abs(target.x - a.x) < 0.03;
  }

  worldY(a) {
    return a.onStairs ? a.onStairs.p * FLOOR2 : a.floor * FLOOR2;
  }

  roomOf(a) {
    if (a.onStairs) return 'merdiven';
    const r = roomAt(this.house.rooms, a.floor, a.x);
    return r ? r.id : null;
  }

  // ===================================================================
  // Döngü
  // ===================================================================
  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (this.manual) return;
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.frame(dt, true);
  }

  stepFrames(n = 1, dt = 1 / 30, render = false) {
    for (let i = 0; i < n; i++) this.frame(dt, render && i === n - 1);
  }

  frame(dt, doRender = true) {
    const playing = this.phase === 'playing';
    if (this.phase !== 'paused') {
      this.time += dt;
      this.voice.update(dt);
      this.audio.update(dt);
    }
    const t = this.time;
    if (playing) {
      this.state.t += dt;
      this.dayT = Math.min(1, this.state.t / this.ep.time);
      this.updateCin(dt, t);
      for (const h of this.humans) this.updateHuman(h, dt, t);
      this.updateDetection(dt);
      this.state.comboT -= dt;
      if (this.state.comboT <= 0) this.state.combo = 0;
      if (this.state.t >= this.ep.time) this.endEpisode('time');
      const left = Object.values(this.pranks).filter((p) => p.state !== 'done').length;
      if (!left && !this.reacting()) this.endEpisode('all');
    } else if (this.phase !== 'paused') {
      // menüde/girişte karakterler yerinde canlansın
      for (const h of this.humans) this.placeHuman(h, dt, t, 0);
      this.placeCin(dt, t);
    }
    this.updateSky();
    this.updateFx(dt);
    this.house.update(dt, t);
    this.updateCamera(dt);
    if (this.tapMark && this.tapMark.userData.t > 0) {
      this.tapMark.userData.t -= dt;
      this.tapMark.material.opacity = Math.max(0, this.tapMark.userData.t);
      this.tapMark.scale.setScalar(1 + (0.8 - this.tapMark.userData.t));
    }
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) {
      this.hudT = 0.12;
      this.emitHud();
    }
    if (doRender) {
      if (this.composer) this.composer.render(dt);
      else this.renderer.render(this.scene, this.camera);
    }
  }

  reacting() {
    return this.humans.some((h) => h.mode === 'react');
  }

  // ---------------- Cingöz ----------------
  updateCin(dt, t) {
    const c = this.cin;
    c.speed = 0;
    if (c.task && c.task.kind === 'work') {
      c.task.t += dt;
      this.emit('work', { label: c.task.label, p: Math.min(1, c.task.t / c.task.dur) });
      if (c.task.t >= c.task.dur) this.finishWork();
    } else if (c.target) {
      const prev = c.x;
      const arrived = this.step(c, c.target, 3.4, dt);
      c.speed = Math.abs(c.x - prev) / dt + (c.onStairs ? 2 : 0);
      if (arrived) {
        c.target = null;
        const th = c.then;
        c.then = null;
        if (th) this.arrive(th);
      }
    }
    c.scared = Math.max(0, c.scared - dt);
    this.placeCin(dt, t);
  }

  placeCin(dt, t) {
    const c = this.cin;
    const y = this.worldY(c);
    let z = WALK_Z + 0.55;
    if (c.hidden) {
      const o = c.hidden.obj.getWorldPosition(V());
      z = o.z + 0.1;
    }
    c.m.root.position.set(c.x, y, z);
    c.m.root.rotation.y += ((c.dir > 0 ? 0.5 : -0.5) + (c.speed > 0.1 ? c.dir * 0.9 : 0) - c.m.root.rotation.y) * Math.min(1, dt * 8);
    c.m.animate(dt, t, { speed: c.speed, hidden: !!c.hidden, working: !!(c.task && c.task.kind === 'work'), scared: c.scared });
  }

  arrive(th) {
    const c = this.cin;
    if (th.kind === 'hide') {
      c.hidden = th.spot;
      this.audio.tone?.('sine', 420, this.audio.now, 0.12, 0.05);
      return;
    }
    if (th.kind === 'item') {
      c.task = { kind: 'work', label: ITEMS[th.item].name + ' alınıyor', dur: 0.7, t: 0, done: () => this.takeItem(th.item, th.hot) };
      return;
    }
    if (th.kind === 'prank') {
      const pr = th.pr;
      if (pr.need && !c.inv.has(pr.need)) {
        this.voice.play([BARKS.cantYet[0]]);
        const where = ITEMS[pr.need];
        this.emit('toast', { text: `Önce ${where.name.toLowerCase()} lazım${where.room ? ` (${this.roomName(where.room)})` : ''}.`, ms: 3000 });
        return;
      }
      c.task = { kind: 'work', label: pr.prompt, dur: pr.time, t: 0, done: () => this.armPrank(pr) };
    }
  }

  finishWork() {
    const c = this.cin;
    const task = c.task;
    c.task = null;
    this.emit('work', null);
    task.done && task.done();
  }

  takeItem(item, hot) {
    this.itemsTaken.add(item);
    this.cin.inv.add(item);
    hot.obj.visible = false;
    this.audio.ding();
    this.emit('toast', { text: `${ITEMS[item].name} alındı.`, ms: 2000 });
    if (!this.saidGrab) {
      this.saidGrab = true;
      this.voice.play(BARKS.grab);
    }
  }

  armPrank(pr) {
    pr.state = 'armed';
    if (pr.need) this.cin.inv.delete(pr.need);
    if (pr.gives) this.cin.inv.add(pr.gives);
    this.audio.ui();
    const hot = this.house.hot[pr.item];
    this.mark(pr.id, hot);
    const P = this.house.props;
    if (pr.id === 'sabun') P.soap.visible = true;
    if (pr.id === 'boya') P.paintBucket.visible = true;
    if (pr.id === 'sandalye') P.chairLeg.rotation.z = 0.25;
    if (pr.id === 'hortum') P.hose.rotation.z = 0.3;
    this.emit('toast', { text: `Tuzak hazır: ${pr.title}`, ms: 2200 });
  }

  mark(id, hot) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex(), color: 0x9df0ff, transparent: true, depthTest: false }));
    s.scale.set(0.5, 0.5, 1);
    const p = hot.obj.getWorldPosition(V());
    s.position.set(p.x, p.y + 0.55, p.z + 0.3);
    s.renderOrder = 5;
    this.scene.add(s);
    this.marks.set(id, s);
  }

  sparkTex() {
    if (this._spark) return this._spark;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(160,240,255,0.8)');
    g.addColorStop(1, 'rgba(160,240,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#fff';
    x.font = 'bold 34px sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('✦', 32, 34);
    return (this._spark = new THREE.CanvasTexture(c));
  }

  roomName(id) {
    const r = this.house.rooms.find((x) => x.id === id);
    return r ? r.name.split(' (')[0].toLowerCase() : id;
  }

  // ---------------- Necmi Bey ve Usta ----------------
  updateHuman(h, dt, t) {
    h.stateT += dt;
    let speed = 0;
    if (h.mode === 'react') {
      if (h.stateT > h.reactDur) {
        h.mode = 'idle';
        h.step = null;
      }
    } else if (h.mode === 'idle') {
      h.ri = (h.ri + 1) % h.routine.length;
      const s = (h.step = h.routine[h.ri]);
      h.target = { floor: this.roomFloor(s.room), x: s.x };
      h.mode = 'walk';
      h.stateT = 0;
    } else if (h.mode === 'walk') {
      const prev = h.x;
      h.onStairEnter = (a) => this.onStairs(a);
      const arrived = this.step(h, h.target, h.speed, dt);
      speed = Math.abs(h.x - prev) / dt + (h.onStairs ? h.speed : 0);
      if (h.mode !== 'walk') return this.placeHuman(h, dt, t, 0); // merdivende kaydı
      if (arrived) {
        h.mode = 'do';
        h.stateT = 0;
        h.triggered = false;
        h.dir = h.step.anim === 'tv' || h.step.anim === 'shower' ? -1 : h.dir;
      }
    } else if (h.mode === 'do') {
      if (!h.triggered && h.stateT > 1.0) {
        h.triggered = true;
        const pr = Object.values(this.pranks).find((p) => p.state === 'armed' && p.act === h.step.act && (p.id !== 'matkap' || h.kind === 'usta'));
        if (pr) return this.trigger(pr, h);
      }
      if (h.stateT > h.step.dur) h.mode = 'idle';
    }
    this.placeHuman(h, dt, t, speed);
  }

  placeHuman(h, dt, t, speed) {
    const y = this.worldY(h);
    let x = h.x, z = h.z;
    const anim = h.mode === 'do' ? h.step.anim : 'idle';
    if (h.mode === 'do' && anim === 'sit') z = -0.45;
    if (h.mode === 'do' && anim === 'sleep') (z = -1.4), (x = h.x);
    if (h.mode === 'do' && anim === 'shower') z = -1.2;
    h.m.root.position.set(x, y, z);
    const face = h.mode === 'do' && ['tv', 'shower', 'drink', 'read', 'eat', 'drill', 'work'].includes(anim) ? Math.PI : h.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    const want = anim === 'sit' || anim === 'sleep' ? 0 : h.mode === 'react' ? 0.15 : face;
    let d = want - h.m.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    h.m.root.rotation.y += d * Math.min(1, dt * 7);
    h.m.animate(dt, t, { speed, anim, stairs: 0 });
  }

  onStairs(h) {
    if (!h.kind) return;
    const pr = this.pranks.sabun;
    if (pr && pr.state === 'armed' && h.kind === 'necmi') {
      // basamağın ortasında kayar, en alta düşer
      this.trigger(pr, h);
      h.onStairs = null;
      h.floor = 0;
      h.x = STAIR.x0 - 0.6;
      this.house.props.soap.visible = false;
    }
  }

  // Şaka tetiklendi
  trigger(pr, h) {
    pr.state = 'done';
    const s = this.state;
    s.done++;
    s.combo = s.comboT > 0 ? s.combo + 1 : 1;
    s.comboT = 14;
    const mult = 1 + (s.combo - 1) * 0.5;
    const gain = Math.round(pr.score * mult * (h.kind === 'usta' ? 1.3 : 1));
    s.score += gain;
    s.anger = Math.min(100, s.anger + 14);
    s.lastPrank = pr.title;
    h.mode = 'react';
    h.stateT = 0;
    h.reactDur = 3.6;
    h.m.startReact(pr.react, 3.6);
    const mk = this.marks.get(pr.id);
    if (mk) {
      this.scene.remove(mk);
      this.marks.delete(pr.id);
    }
    this.prankFx(pr, h);
    this.voice.stop();
    this.voice.play(pr.lines);
    if (s.combo >= 2) setTimeout(() => this.voice.play([pick(BARKS.combo)]), 10);
    this.emit('prank', { title: pr.title, gain, combo: s.combo });
    this.audio.cheer();
  }

  prankFx(pr, h) {
    const P = this.house.props, A = this.audio;
    const head = h.m.head.getWorldPosition(V());
    switch (pr.id) {
      case 'tuz':
        this.burst(head.clone().add(V(0.3 * h.dir, 0, 0.2)), 0xc8783a, 26, 3, 1.5);
        A.splat();
        break;
      case 'sandalye':
        A.crash();
        P.chair.rotation.z = 1.2;
        P.chair.position.y = 0.2;
        this.burst(P.chair.position.clone().add(V(0, 0.4, 0)), 0x8a5a34, 12, 2, 2);
        break;
      case 'kumanda':
        A.bonk(0.6);
        this.tvStatic = 4;
        break;
      case 'sabun':
        A.thud(0.6);
        A.whistle();
        this.burst(V(9.8, FLOOR2 * 0.47, -0.2), 0xf0c8e0, 20, 2, 2.5, 3);
        break;
      case 'dus':
        A.splash(true);
        for (let i = 0; i < 4; i++) this.burst(P.showerHead.getWorldPosition(V()).add(V(0, 2.1, 0.3)), 0x9ad8ff, 16, 0.8, 0.2, 14);
        break;
      case 'saat':
        for (let i = 0; i < 8; i++) setTimeout(() => A.ding(), i * 180);
        this.clockShake = 3;
        break;
      case 'hortum':
        A.splash(false);
        for (let i = 0; i < 3; i++) this.burst(head.clone().add(V(0.2, 0, 0.3)), 0x6ac0ff, 24, 2.5, 1.5);
        P.hose.rotation.z = 0;
        break;
      case 'boya':
        A.splat();
        P.paintBucket.position.y = 1.4;
        P.paintBucket.rotation.z = 2.6;
        this.paintMan(h);
        for (let i = 0; i < 3; i++) this.burst(head, 0xffffff, 26, 2, 1.5);
        break;
      case 'plan':
        A.crash();
        this.burst(P.plan.getWorldPosition(V()).add(V(0, 0.5, 0)), 0x2a5a9a, 30, 3, 3);
        P.plan.material.color.set(0x8a8aa0);
        break;
      case 'matkap':
        A.engine();
        A.whistle();
        break;
      case 'biber':
        A.whistle();
        this.redFace(h);
        for (let i = 0; i < 4; i++) setTimeout(() => this.burst(h.m.head.getWorldPosition(V()).add(V(0, 0.3, 0)), 0xdddddd, 10, 0.6, 1.5, -1), i * 300);
        break;
      case 'kedi':
        A.cluck(true);
        P.gate.rotation.y = 1.3;
        this.catRun = { t: 0, x: h.x };
        break;
    }
  }

  paintMan(h) {
    h.m.root.traverse((o) => {
      if (o.isMesh && o.material && o.material.color && !o.userData.painted) {
        o.userData.painted = o.material.color.getHex();
        o.material = o.material.clone();
        o.material.color.lerp(new THREE.Color(0xffffff), 0.8);
      }
    });
  }
  redFace(h) {
    h.m.head.traverse((o) => {
      if (o.isMesh && o.material && o.material.color) {
        o.material = o.material.clone();
        o.material.emissive = new THREE.Color(0xff2010);
        o.material.emissiveIntensity = 0.6;
        setTimeout(() => (o.material.emissiveIntensity = 0), 6000);
      }
    });
  }

  // ---------------- Görülme ----------------
  updateDetection(dt) {
    const c = this.cin;
    const croom = this.roomOf(c);
    const working = !!(c.task && c.task.kind === 'work');
    for (const h of this.humans) {
      h.susBarkT -= dt;
      let sees = false;
      const hroom = this.roomOf(h);
      const asleep = h.mode === 'do' && h.step && h.step.anim === 'sleep';
      if (!c.hidden && h.mode !== 'react' && !asleep && croom && hroom === croom) {
        const d = Math.abs(c.x - h.x);
        const facing = Math.sign(c.x - h.x) === h.dir || d < 1.2 || (h.mode === 'do' && ['tv', 'drink', 'read', 'eat', 'shower'].includes(h.step.anim) && d < 2.5);
        if (working && (facing || d < 3)) sees = true;
        else if (c.speed > 0.3 && facing && d < 5) sees = true;
        else if (d < 0.9) sees = true;
      }
      if (sees) {
        h.sus += dt * (working ? 1.6 : 0.9);
        if (h.sus > 0.35 && h.susBarkT <= 0 && !this.voice.busy) {
          h.susBarkT = 6;
          this.voice.play([h.kind === 'usta' ? { s: 'usta', t: 'Abi… bir şey kıpırdadı galiba.' } : pick(BARKS.suspicious)]);
          h.dir = Math.sign(c.x - h.x) || h.dir;
        }
        if (h.sus >= 1) this.caught(h);
      } else h.sus = Math.max(0, h.sus - dt * 0.5);
    }
  }

  caught(h) {
    const c = this.cin, s = this.state;
    for (const x of this.humans) x.sus = 0;
    s.caught++;
    s.shields--;
    h.mode = 'react';
    h.stateT = 0;
    h.reactDur = 2.4;
    h.m.startReact('caught', 2.4);
    if (h.step) h.ri = (h.ri - 1 + h.routine.length) % h.routine.length; // aynı işe geri döner
    this.voice.stop();
    this.voice.play([h.kind === 'usta' ? { s: 'usta', t: 'Abi! Duman! Mavi duman gördüm!' } : pick(BARKS.caught)]);
    this.audio.bonk(1);
    this.burst(c.m.root.position.clone().add(V(0, 1, 0)), 0x9df0ff, 30, 3, 3);
    this.emit('caught', s.shields);
    if (c.task) {
      c.task = null;
      this.emit('work', null);
    }
    // kaçar: avludaki çınarın arkasına ışınlanır
    c.target = null;
    c.then = null;
    c.onStairs = null;
    c.floor = 0;
    c.x = -12.2;
    c.hidden = this.house.hides.find((x) => x.id === 'cinar');
    c.scared = 2;
    if (s.shields <= 0) setTimeout(() => this.endEpisode('caught'), 1200);
  }

  // ---------------- Gökyüzü, efektler, kamera ----------------
  updateSky() {
    const f = this.dayT;
    const top = new THREE.Color(0x6aaee8), bot = new THREE.Color(0xe8f0f8);
    if (f > 0.6) {
      const k = (f - 0.6) / 0.4;
      top.lerp(new THREE.Color(0x3a3a7a), k);
      bot.lerp(new THREE.Color(0xf0a060), k);
    }
    this.house.sky.top.value.copy(top);
    this.house.sky.bot.value.copy(bot);
    this.scene.fog.color.copy(bot);
    const a = 0.3 + f * 2.2;
    this.sun.position.set(30 * Math.cos(a), 6 + 20 * Math.sin(Math.min(Math.PI, a)) + 2, 26);
    this.sun.color.setHSL(0.09 - f * 0.05, 0.5 + f * 0.3, 0.88 - f * 0.25);
    this.sun.intensity = 2.4 - f * 1.0;
    this.hemi.intensity = 1.15 - f * 0.35;
    // televizyon parazit
    const scr = this.house.props.tvScreen;
    if (scr) {
      const tvOn = this.necmi.mode === 'do' && this.necmi.step && this.necmi.step.act === 'tv';
      if (this.tvStatic > 0) {
        this.tvStatic -= 1 / 30;
        scr.material.emissive.setRGB(Math.random() * 0.8, Math.random() * 0.8, Math.random() * 0.8);
      } else scr.material.emissive.setRGB(tvOn ? 0.25 : 0, tvOn ? 0.45 : 0, tvOn ? 0.6 : 0);
    }
    if (this.clockShake > 0) {
      this.clockShake -= 1 / 30;
      this.house.props.clock.rotation.z = Math.sin(this.time * 60) * 0.3;
      this.house.props.clock.position.y = FLOOR2 + 0.55 + Math.abs(Math.sin(this.time * 40)) * 0.05;
    }
    if (this.catRun) {
      this.catRun.t += 1 / 30;
      const cats = this.house.props.cats;
      cats.forEach((cat, i) => {
        const a = this.catRun.t * 3 + i * 2.1;
        cat.position.set(this.catRun.x + Math.cos(a) * (1 + i * 0.3), 0, 0.6 + Math.sin(a) * 0.8);
        cat.rotation.y = -a;
      });
      if (this.catRun.t > 8) {
        cats.forEach((cat, i) => cat.position.set(-13 + i * 0.6, 0, 1.8));
        this.catRun = null;
      }
    }
  }

  updateFx(dt) {
    const f = this.fx, m4 = new THREE.Matrix4(), s = V(), q = new THREE.Quaternion();
    let any = false;
    for (let i = 0; i < f.n; i++) {
      if (f.life[i] <= 0) continue;
      any = true;
      f.life[i] -= dt;
      f.vel[i].y -= f.g[i] * dt;
      f.pos[i].addScaledVector(f.vel[i], dt);
      const k = Math.max(0, Math.min(1, f.life[i] * 2));
      s.set(k, k, k);
      m4.compose(f.pos[i], q, s);
      this.fxMesh.setMatrixAt(i, m4);
    }
    if (any) this.fxMesh.instanceMatrix.needsUpdate = true;
    for (const mk of this.marks.values()) mk.material.opacity = 0.6 + Math.sin(this.time * 5) * 0.4;
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    let pr = Math.min(window.devicePixelRatio || 1, this.low ? 1.25 : 2);
    if (this.testMode) pr = 0.6;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.aspect = w / h;
    // tüm konak sığsın
    this.fitW = 29.5;
    this.fitH = 9.6;
  }

  updateCamera(dt) {
    const vf = THREE.MathUtils.degToRad(this.camera.fov);
    const needH = Math.max(this.fitH, this.fitW / this.aspect);
    const H = needH / this.cam.zoom;
    this.viewH = H;
    this.viewW = H * this.aspect;
    const dist = H / 2 / Math.tan(vf / 2);
    if (this.cam.follow && this.cam.zoom > 1.05) {
      const c = this.cin;
      this.cam.cx += (c.x - this.cam.cx) * Math.min(1, dt * 3);
      this.cam.cy += (this.worldY(c) + 1.15 - this.cam.cy) * Math.min(1, dt * 3);
      this.clampCam();
    }
    const tx = this.cam.zoom > 1.05 ? this.cam.cx : -1.8;
    const ty = this.cam.zoom > 1.05 ? this.cam.cy : 3.9;
    const p = this.camera.position;
    const k = Math.min(1, dt * 6);
    p.x += (tx - p.x) * k;
    p.y += (ty + 0.6 - p.y) * k;
    p.z += (dist + 2.5 - p.z) * k;
    this.camera.lookAt(p.x, p.y - 0.6, 0);
  }

  // ===================================================================
  // Arayüz
  // ===================================================================
  onSubtitle(s) {
    this.sub = s;
    this.emit('subtitle', s);
  }

  // konuşan karakterin ekran konumu (balon için)
  speakerScreen() {
    const s = this.sub;
    if (!s) return null;
    let a = null;
    if (s.who === SPEAKERS.necmi.name) a = this.necmi.m.head;
    else if (s.who === SPEAKERS.usta.name) a = this.humans[1] && this.humans[1].m.head;
    else if (s.who === SPEAKERS.cingoz.name) a = this.cin.m.head;
    if (!a) return null;
    const p = a.getWorldPosition(V()).add(V(0, 0.6, 0)).project(this.camera);
    if (p.z > 1) return null;
    return { x: (p.x * 0.5 + 0.5) * 100, y: (-p.y * 0.5 + 0.5) * 100 };
  }

  emitHud(force) {
    const s = this.state, n = this.necmi;
    const hour = 8 + this.dayT * 12;
    const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60);
    const next = n.routine[(n.ri + 1) % n.routine.length];
    this.emit('hud', {
      clock: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      day: this.dayT,
      score: s.score,
      anger: s.anger,
      combo: s.combo,
      comboT: Math.max(0, s.comboT) / 14,
      shields: s.shields,
      done: s.done,
      goal: this.ep.goal,
      now: n.mode === 'react' ? 'öfkeden köpürüyor!' : n.mode === 'walk' ? `${this.roomName(n.step ? n.step.room : '')} yolunda` : n.step ? n.step.label : '',
      next: next ? next.label : '',
      sus: Math.max(...this.humans.map((h) => h.sus)),
      inv: [...this.cin.inv].map((i) => ITEMS[i].name),
      hidden: this.cin.hidden ? this.cin.hidden.label : null,
      room: this.roomName(this.roomOf(this.cin) || ''),
      pranks: Object.values(this.pranks).map((p) => ({ id: p.id, title: p.title, state: p.state, need: p.need ? ITEMS[p.need].name : null, room: this.roomName(p.room) })),
      bubble: this.speakerScreen(),
      follow: this.cam.zoom > 1.05,
      ep: this.ep.id,
      title: this.ep.title,
      force: !!force,
    });
  }

  setVolume(v) {
    this.audio.setVolume(v);
  }
  setVoice(on) {
    this.voice.enabled = on;
  }

  dispose() {
    this.running = false;
    this.voice.stop();
    window.removeEventListener('resize', this._resize);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('keydown', this._key);
    document.removeEventListener('visibilitychange', this._vis);
    if (this.composer) this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
