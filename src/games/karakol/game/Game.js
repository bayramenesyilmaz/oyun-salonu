import * as THREE from 'three';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { TimeManager } from '@engine/time.js';
import { makeTextures } from '@engine/textures.js';
import { AudioEngine } from '@engine/audio.js';
import { VoiceSystem } from '@engine/voice.js';
import { Effects } from '@engine/effects.js';
import { createPost } from '@engine/postfx.js';
import { Player } from './player.js';
import { Viewmodel } from './weapon.js';
import { Enemy } from './enemy.js';
import { Squadmate } from './squad.js';
import { Civilian } from './civilian.js';
import { createHumanoid, raySphere } from './characters.js';
import { Mission } from './mission.js';
import { buildLevel1 } from './levels/level1.js';
import { L1 } from './story.js';
import { recordResult, updateSave } from './save.js';

export class Game {
  constructor(container, emit, { settings, models = {}, touch = false }) {
    this.container = container;
    this.emitUI = emit;
    this.settings = settings;
    this.models = models;
    this.quality = settings.quality;
    this.testMode = /[?&]test\b/.test(location.search);
    this.touch = touch; // mobil: fare kilidi yok, ekran kontrolleri var
    this.difficulty = 1;

    // ---------- Çizici ----------
    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'game-canvas';
    container.appendChild(renderer.domElement);

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x151b26);
    scene.fog = new THREE.FogExp2(0x161c27, 0.0082);
    this.camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.05, 1500);

    scene.add((this.hemi = new THREE.HemisphereLight(0x7a8cad, 0x3a2e20, 1.45)));
    const moon = (this.moon = new THREE.DirectionalLight(0xb4c6e6, 2.1));
    moon.castShadow = this.quality !== 'low';
    moon.shadow.mapSize.set(2048, 2048);
    const sc = moon.shadow.camera;
    sc.left = sc.bottom = -45;
    sc.right = sc.top = 45;
    sc.near = 1;
    sc.far = 260;
    moon.shadow.bias = -0.0005;
    moon.shadow.normalBias = 0.05;
    scene.add(moon, moon.target);

    // ---------- Sistemler ----------
    this.T = makeTextures();
    this.time = new TimeManager();
    this.audio = new AudioEngine();
    this.voice = new VoiceSystem(this.audio, (s) => this.emitUI('subtitle', s));
    this.voice.enabled = settings.voice;
    this.effects = new Effects(scene, this.T);
    this.time.onScaleChange((s) => this.audio.setTimeScale(s));

    this.post = createPost(renderer, scene, this.camera);
    this.vm = new Viewmodel(this.T, models.rifle, models.binoculars);
    const vmPass = new RenderPass(this.vm.scene, this.vm.camera);
    vmPass.clear = false;
    vmPass.clearDepth = true;
    this.post.composer.insertPass(vmPass, 1);

    this.phase = 'loading';
    this.mouse = { left: false, right: false };
    this.combatLevel = 0;
    this.playerTargetable = true;
    this.tweens = [];
    this.hudT = 0;
    this.fps = { n: 0, t: 0, v: 60 };

    this.loadLevel(1);
    this.bindInput();
    this.resize();
    window.addEventListener('resize', (this._onResize = () => this.resize()));
    this.clock = new THREE.Clock();
    this.running = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    window.__karakol = this;
  }

  // ===================================================================
  // Seviye kurulumu
  // ===================================================================
  loadLevel(n) {
    this.levelN = n;
    this.docsFound = new Set();
    this.level = buildLevel1(this);
    this.world = this.level.world;
    this.bounds = this.level.bounds;
    this.player = new Player(this.camera, this.world, this.scene);
    this.player.bounds = this.bounds;
    this.player.sensitivity = 0.0022 * this.settings.sens;
    this.player.onStep = (k) => this.audio.step('gravel', [0.05, 0.11, 0.18][k]);
    this.mission = new Mission(this.level.objectives, { civiliansTotal: this.level.civilians.length, docsTotal: this.level.docsTotal });
    this.mission.onChange((ev) => this.onMissionChange(ev));
    this.marked = new Set();
    this.markProgress = {};
    this.pickups = [];
    // Yüzbaşı (sabit karakter)
    const S = this.level.selim;
    this.selim = createHumanoid('soldier', this.T, this.models.soldier, { unarmed: true });
    this.selim.root.position.set(S.x, this.world.groundAt(S.x, S.z, 10), S.z);
    this.selim.root.rotation.y = S.yaw;
    this.scene.add(this.selim.root);
    this.spawnActors(null);
    this.player.spawn(this.level.spawn.x, this.level.spawn.z, this.level.spawn.yaw);
    this.checkpoints = {};
    this.checkpoint('start', true);
  }

  get allNpcs() {
    return [...this.enemies, this.squad, ...this.civilians];
  }

  spawnActors(snap) {
    (this.enemies || []).forEach((e) => e.dispose());
    this.squad && this.squad.dispose();
    (this.civilians || []).forEach((c) => c.dispose());
    this.pickups.forEach((p) => this.scene.remove(p.mesh));
    this.pickups = [];
    this.enemies = this.level.enemies.map((d) => {
      const s = snap?.enemies?.find((x) => x.id === d.id);
      const e = new Enemy(this, s ? { ...d, x: s.x, z: s.z, yaw: s.yaw } : d);
      if (s && !s.alive) {
        e.health = 0;
        e.state = 'dead';
        e.body.die();
        for (let i = 0; i < 40; i++) e.body.update(0.05);
        if (s.ammo) this.spawnPickup(e.pos, true);
      }
      return e;
    });
    const sq = snap?.squad;
    this.squad = new Squadmate(this, sq ? { x: sq.x, z: sq.z, yaw: 0, active: sq.active } : { ...this.level.squad, active: false });
    if (sq) {
      this.squad.order = sq.order;
      this.squad.weaponsFree = sq.weaponsFree;
      this.squad.wasDowned = sq.wasDowned;
    }
    this.civilians = this.level.civilians.map((d) => {
      const s = snap?.civilians?.find((x) => x.id === d.id);
      const c = new Civilian(this, s ? { ...d, x: s.x, z: s.z } : d);
      if (s) {
        c.state = s.state;
        c.health = s.health;
        c.wasHurt = s.wasHurt;
        if (s.state === 'lost') {
          c.health = 0;
          c.body.die();
          for (let i = 0; i < 40; i++) c.body.update(0.05);
        }
      }
      return c;
    });
  }

  // ===================================================================
  // Kayıt noktaları
  // ===================================================================
  snapshot() {
    const P = this.player;
    return {
      level: this.levelN,
      player: { x: P.pos.x, z: P.pos.z, yaw: P.yaw, lampOn: P.lampOn },
      weapon: { ammo: this.vm.ammo, reserve: this.vm.reserve, owned: { ...this.vm.owned } },
      squad: { x: this.squad.pos.x, z: this.squad.pos.z, order: this.squad.order, weaponsFree: this.squad.weaponsFree, active: this.squad.active, wasDowned: this.squad.wasDowned },
      civilians: this.civilians.map((c) => ({ id: c.id, x: c.pos.x, z: c.pos.z, state: c.state, health: Math.max(c.health, c.alive ? 40 : 0), wasHurt: c.wasHurt })),
      enemies: this.enemies.map((e) => ({ id: e.id, alive: e.alive, x: e.alive ? e.home.x : e.pos.x, z: e.alive ? e.home.z : e.pos.z, yaw: e.alive ? e.homeYaw : e.yaw, ammo: !e.alive && this.pickups.some((p) => p.enemy === e && !p.taken) })),
      mission: this.mission.snapshot(),
      script: this.level.script.snapshot(),
      docs: [...this.docsFound],
      marked: [...this.marked],
      targets: this.rangeTargets.map((t) => t.down),
      gateOpen: this.level.script.flags.gateOpen,
    };
  }

  checkpoint(name, silent = false) {
    const snap = this.snapshot();
    this.lastCheckpoint = snap;
    this.checkpoints[name] = snap;
    if (!silent) {
      this.toast('Kayıt noktası');
      updateSave((d) => (d.resume = { level: this.levelN, snap, name, date: Date.now() }));
    }
  }

  restore(snap) {
    this.voice.stop();
    this.time.reset();
    this.tweens = [];
    this.mission.restore(JSON.parse(JSON.stringify(snap.mission)));
    this.level.script.restore(JSON.parse(JSON.stringify(snap.script)));
    this.docsFound = new Set(snap.docs);
    this.level.syncDocs();
    this.marked = new Set(snap.marked);
    this.markProgress = {};
    snap.targets.forEach((d, i) => {
      const t = this.rangeTargets[i];
      t.down = d;
      t.fall = d ? 1 : 0;
      t.pivot.rotation.x = d ? -1.45 : 0;
    });
    // kapı
    const bar = this.gateBar;
    const isOpen = !this.world.boxes.includes(bar.collider);
    if (snap.gateOpen && !isOpen) {
      this.world.remove(bar.collider);
      bar.mesh.position.x = -3.5;
      bar.mesh.geometry.translate(3.5, 0, 0);
      bar.mesh.rotation.z = 1.45;
    }
    if (!snap.gateOpen && isOpen) {
      this.world.boxes.push(bar.collider);
      this.world.rebuild();
      bar.mesh.rotation.z = 0;
    }
    // oyuncu ve ekipman
    const P = this.player;
    P.spawn(snap.player.x, snap.player.z, snap.player.yaw);
    P.lampOn = snap.player.lampOn;
    this.vm.owned = { ...snap.weapon.owned };
    this.vm.root.visible = this.vm.owned.rifle;
    this.vm.ammo = snap.weapon.ammo;
    this.vm.reserve = snap.weapon.reserve;
    this.vm.reloading = 0;
    this.vm.equipped = 'rifle';
    if (this.gearLid && snap.weapon.owned.rifle) this.gearLid.rotation.x = -1.2;
    this.spawnActors(snap);
    this.combatLevel = 0;
    this.emitUI('objectives', this.mission.visible());
  }

  // ===================================================================
  // Akış
  // ===================================================================
  startLevel(resumeSnap = null) {
    this.audio.init();
    this.audio.setVolume(this.settings.vol);
    this.audio.setMusicVolume(this.settings.music);
    if (resumeSnap) {
      this.restore(resumeSnap);
      this.mission.stats.startTime = this.time.gameTime - (resumeSnap.mission.stats.elapsed || 0);
      this.beginPlay();
      return;
    }
    this.restore(this.checkpoints.start);
    this.mission.stats.startTime = this.time.gameTime;
    this.playCutscene(this.level.cutscenes.intro, L1.intro.slice(0, 2), () => {
      this.beginPlay();
      this.level.script.start();
    });
  }

  beginPlay() {
    this.phase = 'playing';
    this.emitUI('phase', 'playing');
    this.emitUI('objectives', this.mission.visible());
    this.lockPointer();
  }

  pause() {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.player.keys.clear();
    this.mouse.left = this.mouse.right = false;
    this.audio.suspend();
    this.voice.pause(true);
    this.emitUI('phase', 'paused');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  resume() {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.audio.resume();
    this.voice.pause(false);
    this.clock.getDelta();
    this.emitUI('phase', 'playing');
    this.lockPointer();
  }

  restartLevel() {
    this.voice.stop();
    this.mission.stats.deaths = 0;
    this.restore(this.checkpoints.start);
    this.mission.stats.startTime = this.time.gameTime;
    this.level.script.start();
    this.beginPlay();
  }

  retryCheckpoint() {
    const deaths = this.mission.stats.deaths + 1;
    const startTime = this.mission.stats.startTime;
    this.restore(this.lastCheckpoint);
    this.mission.stats.deaths = deaths;
    this.mission.stats.startTime = startTime;
    this.beginPlay();
  }

  toMenu() {
    this.voice.stop();
    this.phase = 'menu';
    this.emitUI('phase', 'menu');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  showDocument(doc) {
    this.phase = 'document';
    this.player.keys.clear();
    this.mouse.left = this.mouse.right = false;
    this.docOpenedAt = performance.now();
    this.audio.ui('tick');
    this.emitUI('document', doc);
    this.emitUI('phase', 'document');
  }

  closeDocument() {
    if (this.phase !== 'document' || performance.now() - this.docOpenedAt < 300) return;
    this.phase = 'playing';
    this.emitUI('document', null);
    this.emitUI('phase', 'playing');
    this.clock.getDelta();
    this.lockPointer();
  }

  endLevel(lines) {
    this.mission.stats.endTime = this.time.gameTime;
    this.mouse.left = this.mouse.right = false;
    this.player.keys.clear();
    this.playCutscene(this.level.cutscenes.outro, lines, () => {
      const res = this.mission.score();
      const s = this.mission.stats;
      recordResult(this.levelN, { total: res.total, rank: res.rank, civilians: s.civiliansSaved, docs: s.docs }, true);
      this.phase = 'results';
      this.emitUI('results', { ...res, level: this.levelN });
      this.emitUI('phase', 'results');
      if (document.pointerLockElement) document.exitPointerLock();
    });
  }

  // ===================================================================
  // Ara sahneler
  // ===================================================================
  playCutscene(shots, lines, onEnd) {
    this.phase = 'cutscene';
    this.emitUI('phase', 'cutscene');
    if (document.pointerLockElement) document.exitPointerLock();
    this.cut = { shots, i: 0, t: 0, onEnd, done: false };
    this.voice.stop();
    if (lines?.length) this.voice.play(lines);
  }

  skipCutscene() {
    if (this.phase !== 'cutscene' || !this.cut || this.cut.done) return;
    this.finishCutscene();
  }

  finishCutscene() {
    const c = this.cut;
    c.done = true;
    this.voice.stop();
    this.post.u.uLetterbox.value = 0;
    c.onEnd && c.onEnd();
  }

  updateCutscene(realDt) {
    const c = this.cut;
    if (!c || c.done) return;
    const shot = c.shots[c.i];
    c.t += realDt;
    const k = Math.min(1, c.t / shot.dur);
    const e = k * k * (3 - 2 * k);
    const v = (a, b) => new THREE.Vector3(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e);
    this.camera.position.copy(v(shot.from, shot.to));
    this.camera.lookAt(v(shot.look0, shot.look1));
    // geçişte kısa kararma
    const edge = Math.min(c.t, shot.dur - c.t);
    this.post.u.uFade.value = Math.max(0, 1 - edge / 0.6);
    this.post.u.uLetterbox.value = 1;
    if (k >= 1) {
      c.i++;
      c.t = 0;
      if (c.i >= c.shots.length) this.finishCutscene();
    }
  }

  // ===================================================================
  // Giriş
  // ===================================================================
  bindInput() {
    const P = () => this.player;
    this._keydown = (e) => {
      if (this.phase === 'cutscene') {
        if (['Space', 'Enter', 'Escape'].includes(e.code)) this.skipCutscene();
        return;
      }
      if (this.phase === 'document') {
        if (['KeyE', 'Escape', 'Enter', 'Space'].includes(e.code)) this.closeDocument();
        return;
      }
      if (this.phase !== 'playing') return;
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      P().keys.add(e.code);
      if (e.repeat) return;
      switch (e.code) {
        case 'KeyE':
          this.interact();
          break;
        case 'KeyF':
          if (this.vm.owned.rifle) {
            P().toggleLamp();
            this.audio.lampClick();
          }
          break;
        case 'KeyR':
          if (this.vm.startReload()) this.audio.reload(this.vm.stats.reload);
          break;
        case 'Digit1':
          if (this.vm.equip('rifle')) this.audio.zoom();
          break;
        case 'Digit2':
          if (this.vm.equip('binoculars')) this.audio.zoom();
          break;
        case 'KeyG':
          this.commandSquad('move');
          break;
        case 'KeyT':
          this.commandSquad('fire');
          break;
        case 'KeyV':
          this.toggleFocus();
          break;
        case 'Escape':
          this.pause();
          break;
      }
    };
    this._keyup = (e) => P().keys.delete(e.code);
    this._mousemove = (e) => {
      if (this.phase !== 'playing' || document.pointerLockElement !== this.renderer.domElement) return;
      P().look(e.movementX, e.movementY);
      this.vm.addLookSway(e.movementX, e.movementY);
    };
    this._mousedown = (e) => {
      if (this.phase === 'cutscene') return this.skipCutscene();
      if (this.phase !== 'playing') return;
      if (!document.pointerLockElement) return this.lockPointer();
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
    };
    this._mouseup = (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    };
    this._wheel = (e) => {
      if (this.phase !== 'playing') return;
      this.vm.equip(this.vm.equipped === 'rifle' ? 'binoculars' : 'rifle');
    };
    this._ctx = (e) => e.preventDefault();
    this._lock = () => {
      const locked = document.pointerLockElement === this.renderer.domElement;
      this.emitUI('lock', locked);
      if (!locked && this.phase === 'playing' && performance.now() > (this.ignoreUnlockUntil || 0)) this.pause();
    };
    this._vis = () => document.hidden && this.pause();
    document.addEventListener('visibilitychange', this._vis);
    this._blur = () => {
      P().keys.clear();
      this.mouse.left = this.mouse.right = false;
    };
    window.addEventListener('keydown', this._keydown);
    window.addEventListener('keyup', this._keyup);
    document.addEventListener('mousemove', this._mousemove);
    this.renderer.domElement.addEventListener('mousedown', this._mousedown);
    window.addEventListener('mouseup', this._mouseup);
    this.renderer.domElement.addEventListener('wheel', this._wheel, { passive: true });
    this.renderer.domElement.addEventListener('contextmenu', this._ctx);
    document.addEventListener('pointerlockchange', this._lock);
    window.addEventListener('blur', this._blur);
  }

  // ---------- Dokunmatik köprü ----------
  touchLook(dx, dy) {
    if (this.phase !== 'playing') return;
    const k = this.vm.equipped === 'binoculars' && this.vm.ads > 0.85 ? 1 : 2.2;
    this.player.look(dx * k, dy * k);
    this.vm.addLookSway(dx, dy);
  }
  setTouchMove(x, y) {
    this.player.touchMove = { x, y };
  }
  pressKey(code) {
    this._keydown({ code, repeat: false, preventDefault() {} });
    this.player.keys.delete(code);
  }
  holdKey(code, down) {
    if (down && this.phase === 'playing') this.player.keys.add(code);
    else this.player.keys.delete(code);
  }
  setFire(on) {
    this.mouse.left = on && this.phase === 'playing';
  }
  setAim(on) {
    this.mouse.right = on && this.phase === 'playing';
  }

  lockPointer() {
    if (this.touch) return;
    const el = this.renderer.domElement;
    this.ignoreUnlockUntil = performance.now() + 500;
    try {
      const r = el.requestPointerLock({ unadjustedMovement: true });
      if (r && r.catch) r.catch(() => el.requestPointerLock()?.catch?.(() => {}));
    } catch {
      try {
        el.requestPointerLock();
      } catch {
        /* desteklenmiyor */
      }
    }
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    let pr = Math.min(window.devicePixelRatio, this.quality === 'low' ? 0.8 : this.quality === 'medium' ? 1 : 1.5);
    if (this.testMode) pr = 0.5;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.post.setSize(w, h, pr);
    this.camera.aspect = this.vm.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.vm.camera.updateProjectionMatrix();
  }

  applySettings(s) {
    this.settings = s;
    this.player.sensitivity = 0.0022 * s.sens;
    this.audio.setVolume(s.vol);
    this.audio.setMusicVolume(s.music);
    this.voice.enabled = s.voice;
    if (this.quality !== s.quality) {
      this.quality = s.quality;
      this.moon.castShadow = s.quality !== 'low';
      this.resize();
    }
  }

  // ===================================================================
  // Oyun eylemleri
  // ===================================================================
  say(lines, onDone) {
    this.voice.play(lines, onDone);
  }

  hint(text, sec = 5) {
    this.emitUI('hint', { text, ms: sec * 1000, id: Math.random() });
  }

  toast(text) {
    this.emitUI('toast', { text, id: Math.random() });
  }

  tween(dur, fn) {
    this.tweens.push({ t: 0, dur, fn });
  }

  giveGear() {
    this.vm.give('rifle');
    this.vm.give('binoculars');
  }

  toggleFocus() {
    if (!this.vm.owned.rifle) return;
    const was = this.time.focusActive;
    const ok = this.time.toggleFocus();
    if (ok) this.audio.whoosh(!was);
  }

  commandSquad(kind) {
    const K = this.squad;
    if (!K.active) return;
    if (K.down) return this.toast('Kemal yaralı — yanına git, E: ilk yardım');
    const res = K.command(kind);
    if (!res) return;
    const map = { hold: L1.kemalHold, follow: L1.kemalFollow, holdfire: L1.kemalHoldFire, free: L1.kemalFree };
    this.voice.play(map[res]);
    this.emitUI('squadCmd', res);
  }

  reviveSquad() {
    if (!this.squad.down) return;
    this.player.frozen = true;
    this.emitUI('progress', { label: 'İlk yardım…', dur: 2.2 });
    this.time.after(2.2, () => {
      this.player.frozen = false;
      this.squad.revive();
    });
  }

  // Etkileşim adayını bul (kamera yönüne en yakın, menzilde, görüşte)
  findInteract() {
    const cam = this.camera.position;
    const fwd = this.player.forward();
    let best = null, bestScore = 1e9;
    const list = [...this.level.interactables, ...this.pickups.filter((p) => !p.taken).map((p) => p.inter)];
    for (const it of list) {
      if (!it.enabled()) continue;
      const pos = typeof it.pos === 'function' ? it.pos() : it.pos;
      const d = cam.distanceTo(pos);
      if (d > it.radius + 0.6) continue;
      const dir = pos.clone().sub(cam).normalize();
      const ang = Math.acos(Math.min(1, dir.dot(fwd)));
      const isNpc = typeof it.pos === 'function';
      if (ang > (isNpc ? 0.4 : 0.55) && d > 1.3) continue;
      if (!this.world.lineOfSight(cam, pos.clone().addScaledVector(dir, -0.35))) continue;
      const score = ang * 6 + d * 0.1 + (isNpc ? 0.4 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    return best;
  }

  interact() {
    const it = this.findInteract();
    if (it) it.use();
  }

  spawnPickup(pos, silent = false) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.16), new THREE.MeshStandardMaterial({ color: 0x3e4230, roughness: 0.8 }));
    const p = new THREE.Vector3(pos.x + 0.5, this.world.groundAt(pos.x + 0.5, pos.z, pos.y + 1) + 0.05, pos.z);
    m.position.copy(p);
    this.scene.add(m);
    const pk = {
      mesh: m,
      taken: false,
      enemy: null,
      inter: {
        id: 'ammo',
        pos: p,
        radius: 2,
        enabled: () => !pk.taken,
        prompt: () => 'Şarjör al',
        use: () => {
          pk.taken = true;
          m.visible = false;
          const n = 30 + Math.floor(Math.random() * 30);
          this.vm.reserve = Math.min(240, this.vm.reserve + n);
          this.audio.click(this.audio.ctx?.currentTime || 0, 1400, 0.3);
          this.toast(`+${n} mermi`);
        },
      },
    };
    this.pickups.push(pk);
    void silent;
    return pk;
  }

  isVisibleToPlayer(pos) {
    const cam = this.camera.position;
    const dir = pos.clone().sub(cam);
    const d = dir.length();
    if (d > 80) return false;
    dir.normalize();
    if (dir.dot(this.player.forward()) < 0.4) return false;
    return this.world.lineOfSight(cam, pos.clone().setY(pos.y + 1.2));
  }

  findCover(from, threat, radius, toward = false) {
    let best = null, bestS = 1e9;
    for (const c of this.level.coverPoints) {
      const d = Math.hypot(c.p.x - from.x, c.p.z - from.z);
      if (d > radius) continue;
      const toThreat = new THREE.Vector3(threat.x - c.p.x, 0, threat.z - c.p.z);
      const dt = toThreat.length();
      if (dt < 6) continue;
      toThreat.divideScalar(dt);
      const toBox = new THREE.Vector3(c.c.x - c.p.x, 0, c.c.z - c.p.z).normalize();
      const shield = toBox.dot(toThreat);
      if (shield < 0.5) continue;
      let s = d - shield * 3;
      if (toward) s += dt * 0.5;
      if (this.enemies.some((e) => e.alive && e.coverPt && e.coverPt.distanceTo(c.p) < 1 && e.pos.distanceTo(from) > 0.5)) s += 8;
      if (s < bestS) {
        bestS = s;
        best = c.p.clone();
      }
    }
    return best;
  }

  nearestCombatEnemyPos(p) {
    let best = null, bd = 1e9;
    for (const e of this.enemies) {
      if (!e.alive || e.state !== 'combat') continue;
      const d = e.dist2D(p);
      if (d < bd) {
        bd = d;
        best = e.pos;
      }
    }
    return best;
  }

  // ===================================================================
  // Atış
  // ===================================================================
  playerFire() {
    const P = this.player, vm = this.vm;
    const now = this.time.gameTime;
    const res = vm.fire(now, P.moving, P.crouch);
    if (!res) return;
    if (res.dry) {
      this.audio.dryFire();
      if (vm.reserve > 0) this.hint(this.touch ? 'R butonu: şarjör değiştir' : 'R: şarjör değiştir', 2);
      this.mouse.left = false;
      return;
    }
    this.mission.stats.shots++;
    this.audio.gunshot(null);
    const cam = this.camera;
    cam.updateMatrixWorld();
    const origin = cam.position.clone();
    const dir = P.forward();
    // yayılma konisi
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * res.spread;
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    dir.addScaledVector(right, Math.cos(a) * rr).addScaledVector(up, Math.sin(a) * rr).normalize();
    const hit = this.traceShot(origin, dir, 300, 'player');
    const muzzle = vm.muzzleWorld(cam);
    this.effects.muzzleLight(muzzle, 5);
    if (vm.shotsFired % 2 === 0) this.effects.tracer(muzzle, hit.point);
    this.effects.shell(new THREE.Vector3(0.18, -0.12, -0.4).applyMatrix4(cam.matrixWorld), right.clone().multiplyScalar(2 + Math.random()).add(new THREE.Vector3(0, 1.8, 0)), this.world.groundAt(P.pos.x, P.pos.z, P.pos.y + 1));
    P.addRecoil(0.011 * (1 - vm.ads * 0.45), (Math.random() - 0.5) * 0.006);
    // silah sesi düşmanları uyarır (karakoldaki atış alanı hariç: orada atış sesi olağan)
    if (!this.level.safeZone(P.pos)) for (const e of this.enemies) if (e.alive) e.hear(P.pos, 80);
  }

  // Işın: dünya + karakterler. Hasar uygular. {point, kind}
  traceShot(origin, dir, maxDist, shooter, damage = null) {
    const wh = this.world.raycast(origin, dir, maxDist);
    let tWorld = wh ? wh.t : maxDist;
    let best = null;
    const spheres = [];
    const consider = (npc, kind) => {
      if (npc === shooter) return;
      npc.body.hitSpheres(spheres);
      for (const s of spheres) {
        const t = raySphere(origin, dir, s, tWorld);
        if (t != null && (!best || t < best.t)) best = { t, npc, part: s.part, kind };
      }
    };
    for (const e of this.enemies) if (e.alive) consider(e, 'enemy');
    if (!this.squad.down) consider(this.squad, 'squad');
    for (const c of this.civilians) if (c.alive && c.state !== 'safe') consider(c, 'civilian');
    if (best) {
      const point = origin.clone().addScaledVector(dir, best.t);
      this.effects.hitPuff(point);
      const isPlayer = shooter === 'player';
      const from = isPlayer ? { pos: this.player.pos, isPlayer: true } : shooter;
      if (best.kind === 'enemy') {
        const dmg = damage ?? (best.part === 'head' ? this.vm.stats.dmgHead : best.part === 'leg' ? this.vm.stats.dmgBody * 0.7 : this.vm.stats.dmgBody);
        best.npc.takeDamage(dmg, from);
        if (isPlayer) {
          this.mission.stats.hits++;
          this.emitUI('hitmarker', { kill: !best.npc.alive, id: Math.random() });
        }
      } else if (best.kind === 'squad') {
        best.npc.takeDamage(damage ?? 30, from);
      } else if (best.kind === 'civilian') {
        if (isPlayer) {
          this.mission.stats.civShotByPlayer++;
          this.voice.play(L1.civShot);
        }
        best.npc.takeDamage(damage ?? 35, from);
      }
      return { point, kind: best.kind };
    }
    if (wh) {
      const hard = wh.kind === 'box' && wh.box && wh.box.tag !== 'tree';
      this.effects.impact(wh.point, wh.normal, hard ? 'hard' : 'dirt');
      if (shooter === 'player' || wh.point.distanceTo(this.player.pos) < 25) this.audio.impact(wh.point, hard ? 'hard' : 'dirt');
      if (wh.box?.tag && shooter === 'player') this.level.wireTargetHit(wh.box.tag);
      return { point: wh.point, kind: 'world' };
    }
    return { point: origin.clone().addScaledVector(dir, maxDist), kind: 'none' };
  }

  // Yapay zekâ atışı: isabet olasılığına göre
  npcShot(shooter, from, targetPos, pHit, dmg, target) {
    this.audio.gunshot(from, shooter instanceof Enemy);
    this.effects.muzzleFlash(from);
    const hit = Math.random() < pHit;
    const cam = this.camera.position;
    let dir;
    if (hit) dir = targetPos.clone().sub(from).normalize();
    else {
      const miss = targetPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.4, (Math.random() - 0.3) * 1.6, (Math.random() - 0.5) * 2.4));
      dir = miss.sub(from).normalize();
    }
    const dist = from.distanceTo(targetPos) + 30;
    if (target === 'player' && hit && this.world.lineOfSight(from, targetPos)) {
      // oyuncu isabeti
      this.player.damage(dmg, this.time.gameTime);
      this.audio.hurt();
      const ang = Math.atan2(from.x - this.player.pos.x, from.z - this.player.pos.z) - this.player.yaw;
      this.emitUI('damage', { ang, id: Math.random() });
      this.damageFlash = 1;
      if (Math.random() < 0.35) this.effects.tracer(from, targetPos);
      return;
    }
    const res = this.traceShot(from, dir, dist, shooter, dmg);
    if (Math.random() < 0.45) this.effects.tracer(from, res.point);
    // vızıltı: mermi oyuncunun yakınından geçtiyse
    const toCam = cam.clone().sub(from);
    const along = toCam.dot(dir);
    if (along > 0 && along < from.distanceTo(res.point) + 2) {
      const closest = from.clone().addScaledVector(dir, along);
      if (closest.distanceTo(cam) < 2.2) this.audio.whizz(closest);
    }
  }

  // ===================================================================
  // Olaylar
  // ===================================================================
  onEnemyAlert(e) {
    const s = this.mission.stats;
    if (!s.detected) {
      s.detected = true;
      // sinematik an: ilk temas
      this.time.cinematicMoment(1.3, 0.22);
      this.audio.whoosh(true);
      this.voice.play(L1.contact);
      this.emitUI('banner', 'TEMAS');
    }
    // telsizle yakındakilere haber ver
    for (const o of this.enemies) {
      if (o === e || !o.alive || o.state === 'combat') continue;
      if (o.dist2D(e.pos) < 40) this.time.after(0.8 + Math.random() * 1.2, () => o.alive && o.alert(e.lastKnown, e.target || 'player'));
    }
  }

  onEnemyDown(e) {
    this.mission.stats.enemiesDown++;
    const pk = this.spawnPickup(e.pos);
    pk.enemy = e;
    if (this.enemies.every((x) => !x.alive || x.state !== 'combat')) this.time.after(2, () => (this.combatLevel = Math.min(this.combatLevel, 0.4)));
  }

  onSquadDown() {
    this.mission.stats.squadDowned++;
    this.voice.play(L1.kemalDown);
    this.toast('Kemal yaralandı — yanına git, E ile ilk yardım');
  }

  onSquadRevived() {
    this.voice.play(L1.kemalRevived);
  }

  onCivilianHurt(c, from) {
    this.mission.stats.civiliansHurt++;
    if (c.alive && c.health > 0) this.voice.play(L1.hasanHurt);
    void from;
  }

  onCivilianLost(c) {
    this.mission.stats.civiliansLost++;
    this.mission.fail('hasanSafe');
    this.voice.play(L1.civLost);
    void c;
  }

  onMissionChange(ev) {
    this.emitUI('objectives', this.mission.visible());
    if (ev.type === 'done' && !ev.o.noScore) {
      this.audio.ui('ok');
      this.toast((ev.o.optional ? 'İsteğe bağlı hedef: ' : 'Hedef tamamlandı: ') + ev.o.text);
    }
    if (ev.type === 'new') this.audio.ui('tick');
  }

  // ===================================================================
  // Döngü
  // ===================================================================
  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (this.manual) return;
    this.frame(this.clock.getDelta(), true);
  }

  step(n = 1, dt = 1 / 30, render = false) {
    for (let i = 0; i < n; i++) this.frame(dt, render && i === n - 1);
  }

  frame(rawDt, doRender = true) {
    const phase = this.phase;
    const paused = phase === 'paused' || phase === 'document' || phase === 'results' || phase === 'dead';
    this.time.tick(rawDt, paused);
    const T = this.time;
    const dt = T.dt, realDt = T.realDt;
    if (!paused) this.voice.update(realDt);

    if (phase === 'menu' || phase === 'loading') {
      const a = T.realTime * 0.025;
      this.camera.position.set(Math.sin(a) * 70 - 10, 22 + Math.sin(T.realTime * 0.2) * 2, 40 + Math.cos(a) * 60);
      this.camera.lookAt(5, 0, -40);
      this.vm.root.visible = false;
      this.level.update(realDt, T.realTime);
      this.moonFollow(this.camera.position);
      this.renderFrame(doRender);
      return;
    }

    if (phase === 'cutscene') {
      this.updateCutscene(realDt);
      this.vm.scene.visible = false;
    } else this.vm.scene.visible = true;

    if (phase === 'playing') this.updatePlaying(dt, realDt);
    else if (phase === 'dead') {
      this.player.update(T.realDt * 0.3, T.gameTime, {});
    }

    if (!paused) {
      // dünya
      for (const e of this.enemies) e.update(dt);
      this.squad.update(dt);
      for (const c of this.civilians) c.update(dt);
      this.selim.update(dt, { talk: this.voice.cur && this.voice.cur.sp && this.voice.cur.sp.name.startsWith('Yzb') });
      this.effects.update(dt);
      this.level.update(dt, T.gameTime);
      for (const tw of this.tweens) {
        tw.t += dt;
        tw.fn(Math.min(1, tw.t / tw.dur));
      }
      this.tweens = this.tweens.filter((t) => t.t < t.dur);
    }

    // müzik ve ses
    const inCombat = this.enemies.some((e) => e.alive && e.state === 'combat');
    this.combatLevel += ((inCombat ? 1 : 0) - this.combatLevel) * Math.min(1, realDt * (inCombat ? 2 : 0.25));
    this.audio.setMusicState(phase === 'cutscene' ? 1 : 0.6, this.combatLevel);
    this.audio.listener(this.camera.position, this.player.forward());
    this.moonFollow(this.player.pos);

    // son işlem
    const u = this.post.u;
    u.uTime.value = T.realTime;
    u.uSlow.value = 1 - Math.min(1, (T.scale - 0.2) / 0.8);
    this.damageFlash = Math.max(0, (this.damageFlash || 0) - realDt * 1.5);
    const lowHp = 1 - this.player.health / 100;
    u.uDamage.value = Math.max(this.damageFlash * 0.8, lowHp > 0.5 ? (lowHp - 0.5) * 1.4 : 0);
    if (phase !== 'cutscene') {
      u.uLetterbox.value = 0;
      u.uFade.value = phase === 'dead' ? Math.min(0.75, (u.uFade.value || 0) + realDt * 0.6) : Math.max(0, u.uFade.value - realDt * 2);
    }
    this.renderFrame(doRender);
  }

  renderFrame(doRender) {
    // fps ölçümü
    this.fps.n++;
    this.fps.t += this.clock.elapsedTime ? 0 : 0;
    if (doRender) this.post.composer.render();
  }

  moonFollow(p) {
    const sx = Math.round(p.x / 4) * 4, sz = Math.round(p.z / 4) * 4;
    this.moon.target.position.set(sx, 0, sz);
    this.moon.position.set(sx + 70, 85, sz + 55);
  }

  updatePlaying(dt, realDt) {
    const P = this.player, vm = this.vm, T = this.time;
    const binoZoom = vm.equipped === 'binoculars' && vm.ads > 0.85;
    P.zoomSens = binoZoom ? 0.18 : 1 - vm.ads * 0.35;
    P.update(T.playerDt, T.gameTime, { aiming: this.mouse.right && vm.owned.rifle, canSprint: true });

    // ölüm
    if (P.dead) {
      this.phase = 'dead';
      this.mouse.left = this.mouse.right = false;
      this.voice.stop();
      this.time.reset();
      this.emitUI('phase', 'dead');
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }

    // silah
    if (this.mouse.left && vm.equipped === 'rifle' && vm.owned.rifle) this.playerFire();
    const wasReloading = vm.reloading > 0;
    this.lightT = (this.lightT || 0) - realDt;
    if (this.lightT <= 0) {
      this.lightT = 0.25;
      this.lightLevel = this.computeLightLevel();
    }
    vm.update(T.playerDt, realDt, { moving: P.moving, sprinting: P.sprinting, speed: P.speed, lampOn: P.lampOn, aimHeld: this.mouse.right, lightLevel: this.lightLevel || 0.3 });
    if (wasReloading && vm.reloading <= 0) this.level.script.reloaded();

    // görüş alanı: nişan / dürbün
    const baseFov = this.settings.fov;
    const targetFov = vm.equipped === 'binoculars' ? baseFov + (9 - baseFov) * vm.ads : baseFov + (baseFov * 0.62 - baseFov) * vm.ads;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, realDt * 16);
      this.camera.updateProjectionMatrix();
    }
    this.vm.root.visible = vm.owned.rifle && !binoZoom;

    // dürbünle işaretleme
    this.binoInfo = null;
    if (binoZoom) this.updateMarking(realDt);

    // görev senaryosu
    this.level.script.update(dt);

    // HUD (≈15 Hz)
    this.hudT -= realDt;
    if (this.hudT <= 0) {
      this.hudT = 0.066;
      this.emitHud();
    }
    this.objT = (this.objT || 0) - realDt;
    if (this.objT <= 0) {
      this.objT = 1;
      this.emitUI('objectives', this.mission.visible());
    }
    // dürbün: ışık yükseltme (gece görüşüne benzer parlaklık)
    const wantExp = binoZoom ? 2.6 : 1.4;
    this.renderer.toneMappingExposure += (wantExp - this.renderer.toneMappingExposure) * Math.min(1, realDt * 8);
    this.scene.fog.density = binoZoom ? 0.0028 : 0.0082;
  }

  computeLightLevel() {
    let l = 0.28;
    const p = this.player.pos;
    for (const L of this.level.lights) {
      if (L.isSpotLight) continue;
      const d = L.position.distanceTo(p);
      if (d < L.distance) l += (1 - d / L.distance) * Math.min(1, L.intensity / 8) * 0.8;
    }
    if (this.player.lampOn) l += 0.15;
    return Math.min(1.2, l);
  }

  updateMarking(realDt) {
    const cam = this.camera.position;
    const fwd = this.player.forward();
    // telemetre
    this.rangeT = (this.rangeT || 0) - realDt;
    if (this.rangeT <= 0) {
      this.rangeT = 0.12;
      const h = this.world.raycast(cam, fwd, 600);
      this.rangeDist = h ? Math.round(h.t) : null;
    }
    // görüş ekseninin en yakınındaki işaretlenmemiş hedef
    let best = null, bestAng = 0.07;
    for (const t of this.level.markTargets) {
      if (this.marked.has(t.id)) continue;
      const to = t.pos.clone().sub(cam);
      const d = to.length();
      to.normalize();
      const ang = Math.acos(Math.min(1, to.dot(fwd)));
      if (ang < bestAng && d < 260) {
        bestAng = ang;
        best = { t, to };
      }
    }
    let focus = null;
    if (best) {
      const { t, to } = best;
      const vis = this.world.lineOfSight(cam, t.pos.clone().addScaledVector(to, -1.2));
      if (vis && bestAng < 0.045) {
        this.markProgress[t.id] = (this.markProgress[t.id] || 0) + realDt / 1.3;
        focus = { label: t.label, progress: Math.min(1, this.markProgress[t.id]) };
        if (this.markProgress[t.id] >= 1) {
          this.marked.add(t.id);
          this.audio.ui('mark');
          this.level.script.marked(t.id, this.marked.size);
        }
      } else focus = { label: vis ? t.label : 'Görüş kapalı', progress: this.markProgress[t.id] || 0, blocked: !vis };
    }
    this.binoInfo = { dist: this.rangeDist, focus, marked: this.marked.size, total: this.level.markTargets.length };
  }

  emitHud() {
    const P = this.player, vm = this.vm, K = this.squad, H = this.civilians[0];
    // en yüksek şüphe
    let detect = 0;
    for (const e of this.enemies) if (e.alive && e.state !== 'combat') detect = Math.max(detect, Math.min(1, e.suspicion));
    if (this.enemies.some((e) => e.alive && e.state === 'combat')) detect = 1;
    // yol işareti
    const objs = this.mission.objectives.filter((o) => o.active && !o.done && !o.failed && o.at);
    const main = objs.find((o) => !o.optional) || objs[0];
    let wp = null;
    if (main) {
      const at = main.at();
      if (at) wp = this.project(at, main.optional);
    }
    const inter = this.findInteract();
    this.emitUI('hud', {
      health: P.health,
      ammo: vm.ammo,
      reserve: vm.reserve,
      mag: vm.stats.mag,
      equipped: vm.equipped,
      owned: vm.owned,
      reloading: vm.reloading > 0,
      ads: vm.ads,
      lamp: P.lampOn,
      crouch: P.crouch,
      focus: this.time.focusEnergy,
      focusActive: this.time.focusActive,
      slow: this.time.scale < 0.95,
      squad: K.active ? { order: K.order, free: K.weaponsFree, down: K.down, hp: K.health / K.maxHealth } : null,
      civ: H && H.state !== 'hiding' ? { name: H.name, state: H.state, hp: H.health } : null,
      detect,
      wp,
      heading: P.yaw,
      prompt: inter ? (typeof inter.prompt === 'function' ? inter.prompt() : inter.prompt) : null,
      bino: this.binoInfo,
      spread: vm.equipped === 'rifle' ? (vm.stats.hip + (vm.stats.ads - vm.stats.hip) * vm.ads) * (P.moving ? 1.7 : 1) : 0,
      fps: this.fpsValue,
    });
  }

  project(pos, optional) {
    const v = pos.clone().project(this.camera);
    const behind = v.z > 1;
    let x = (v.x * 0.5 + 0.5) * 100, y = (-v.y * 0.5 + 0.5) * 100;
    if (behind) {
      x = 100 - x;
      y = 92;
    }
    const clamp = x < 4 || x > 96 || y < 6 || y > 92 || behind;
    x = Math.max(4, Math.min(96, x));
    y = Math.max(8, Math.min(90, y));
    return { x, y, dist: Math.round(this.player.pos.distanceTo(pos)), edge: clamp, optional };
  }

  dispose() {
    this.running = false;
    this.voice.stop();
    window.removeEventListener('keydown', this._keydown);
    window.removeEventListener('keyup', this._keyup);
    document.removeEventListener('mousemove', this._mousemove);
    window.removeEventListener('mouseup', this._mouseup);
    document.removeEventListener('pointerlockchange', this._lock);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('blur', this._blur);
    this.renderer.dispose();
  }
}
