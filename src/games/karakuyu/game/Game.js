import * as THREE from 'three';
import { makeTextures } from './textures.js';
import { buildWorld, STREAM_Z } from './world.js';
import { Player } from './player.js';
import { Creature } from './creature.js';
import { AudioEngine } from './audio.js';
import { createPost } from './postfx.js';
import { narrator } from './narrator.js';
import { PAGES, MOTIFS, SOLUTION, OBJECTIVES, DEATH_LINES, DEATH_LOOKBACK, DEATH_WEDDING, ITEMS, LORE } from './story.js';

const WEDDING = new THREE.Vector3(-37, 0, 1);

const DIAL_LABEL = {
  north: 'köye bakan taş',
  east: 'dağa bakan taş',
  west: 'mezarlığa bakan taş',
};

export class Game {
  constructor(container, onUI, opts = {}) {
    this.container = container;
    this.onUI = onUI;
    this.quality = opts.quality || 'high';
    this.touch = !!opts.touch; // mobil: fare kilidi yok, ekran butonları var
    // ?test: otomatik testler için çok hafif çizim
    this.testMode = /[?&]test\b/.test(location.search);

    // ---------- Renderer ----------
    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.className = 'game-canvas';

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x1a2230);
    scene.fog = new THREE.FogExp2(0x1b2433, 0.024);

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 600);

    // ---------- Işıklar ----------
    scene.add(new THREE.HemisphereLight(0x5a6f92, 0x221a12, 0.85));
    const moon = (this.moon = new THREE.DirectionalLight(0xa9bfe4, 1.35));
    moon.position.set(-45, 60, -70);
    moon.castShadow = this.quality !== 'low';
    moon.shadow.mapSize.set(2048, 2048);
    const sc = moon.shadow.camera;
    sc.left = sc.bottom = -38;
    sc.right = sc.top = 38;
    sc.near = 1;
    sc.far = 220;
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.04;
    scene.add(moon, moon.target);

    // ---------- Dünya ----------
    this.T = makeTextures();
    this.world = buildWorld(scene, this.T);
    this.player = new Player(this.camera, this.world, scene);
    this.creature = new Creature(scene, this.world, this.T);
    this.audio = new AudioEngine();
    this.post = createPost(renderer, scene, this.camera);

    this.player.onStep = (k) => this.audio.step(k);

    // etkileşim nesneleri
    this.interactables = [];
    scene.traverse((o) => {
      if (o.userData.interactId && o.isMesh) this.interactables.push(o);
    });
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.8;
    this.focus = null;

    // ---------- Durum ----------
    this.phase = 'menu';
    this.flags = this.freshFlags();
    this.objective = OBJECTIVES.enter;
    this.fear = 0;
    this.flash = 0;
    this.fade = 0;
    this.time = 0;
    this.hudTimer = 0;
    this.focusTimer = 0;
    this.dripTimer = 2;
    this.whisperTimer = 15;
    this.deathTimer = 0;
    this.apparition = { done: false, active: false, look: 0, t: 0 };
    this.checkpoint = null;

    this.player.setSpawn(-1, 64.5, 0);
    this.applyFlags();

    this.bindInput();
    this.resize();
    window.addEventListener('resize', (this._onResize = () => this.resize()));
    this.clock = new THREE.Clock();
    this.running = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);

    // test ve hata ayıklama için
    window.__karakuyu = this;
  }

  freshFlags() {
    return {
      page1: false, page2: false, key: false, page3: false, doorOpen: false, sealed: false,
      dials: { north: 4, east: 4, west: 4 }, tried: [],
      items: {}, iron: 0, offered: false, crossed: false,
    };
  }

  emit(type, data) {
    this.onUI && this.onUI(type, data);
  }

  // ---------- Giriş ----------
  bindInput() {
    const p = this.player;
    this._keydown = (e) => {
      if (e.repeat) {
        if (this.phase === 'playing') p.keys.add(e.code);
        return;
      }
      if (this.phase === 'note') {
        if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') this.closeNote();
        return;
      }
      if (this.phase === 'journal') {
        if (e.code === 'KeyJ' || e.code === 'Escape' || e.code === 'Tab') this.closeJournal();
        e.preventDefault();
        return;
      }
      if (this.phase !== 'playing') return;
      p.keys.add(e.code);
      if (e.code === 'KeyE') this.interact();
      if (e.code === 'KeyF') {
        p.toggleLantern();
        this.audio.clunk();
      }
      if (e.code === 'KeyJ' || e.code === 'Tab') {
        e.preventDefault();
        this.openJournal();
      }
      if (e.code === 'Escape' && (!document.pointerLockElement || this.touch)) this.pause();
      if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    };
    this._keyup = (e) => p.keys.delete(e.code);
    this._mouse = (e) => {
      if (this.phase !== 'playing') return;
      const locked = document.pointerLockElement === this.renderer.domElement;
      // fare kilitlenemiyorsa (ör. gömülü sayfa): basılı tutup sürükleyerek bak
      if (locked || (this.lockFailed && e.buttons & 1)) p.look(e.movementX, e.movementY);
    };
    this._lockErr = () => {
      this.lockFailed = true;
      this.emit('lockFailed', true);
    };
    document.addEventListener('pointerlockerror', this._lockErr);
    this._lock = () => {
      const locked = document.pointerLockElement === this.renderer.domElement;
      this.emit('lock', locked);
      if (!locked && this.phase === 'playing' && performance.now() > (this.ignoreUnlockUntil || 0)) this.pause();
    };
    this._click = () => {
      if (this.phase === 'playing' && !document.pointerLockElement) this.lockPointer();
    };
    this._blur = () => p.keys.clear();
    // telefonda uygulama arka plana geçince duraklat
    this._vis = () => {
      if (document.hidden) this.pause();
    };
    document.addEventListener('visibilitychange', this._vis);
    window.addEventListener('keydown', this._keydown);
    window.addEventListener('keyup', this._keyup);
    document.addEventListener('mousemove', this._mouse);
    document.addEventListener('pointerlockchange', this._lock);
    this.renderer.domElement.addEventListener('click', this._click);
    window.addEventListener('blur', this._blur);
  }

  // ---------- Dokunmatik arayüz köprüsü ----------
  touchLook(dx, dy) {
    if (this.phase === 'playing') this.player.look(dx * 2.3, dy * 2.3);
  }

  setTouchMove(x, y) {
    this.player.touchMove = { x, y };
  }

  // Bir tuşa tek seferlik basmış gibi davran (E, F, J, Escape)
  pressKey(code) {
    this._keydown({ code, repeat: false, preventDefault() {} });
    this.player.keys.delete(code);
  }

  holdKey(code, down) {
    if (down && this.phase === 'playing') this.player.keys.add(code);
    else this.player.keys.delete(code);
  }

  lockPointer() {
    const el = this.renderer.domElement;
    if (this.lockFailed || this.touch) return;
    try {
      const r = el.requestPointerLock({ unadjustedMovement: true });
      if (r && r.catch)
        r.catch(() => {
          const r2 = el.requestPointerLock();
          if (r2 && r2.catch) r2.catch(() => this._lockErr());
        });
    } catch {
      try { el.requestPointerLock(); } catch { this._lockErr(); }
    }
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    let pr = Math.min(window.devicePixelRatio, this.quality === 'low' ? (this.touch ? 1 : 0.85) : 1.5);
    if (this.testMode) pr = 0.5;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.post.setSize(w, h, pr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setSensitivity(v) {
    this.player.sensitivity = 0.0022 * v;
  }

  setVolume(v) {
    this.audio.setVolume(v);
  }

  // ---------- Akış ----------
  start() {
    this.audio.init();
    this.phase = 'intro';
    this.emit('phase', 'intro');
  }

  beginPlay() {
    this.phase = 'playing';
    this.emit('phase', 'playing');
    this.emit('objective', this.objective);
    this.saveCheckpoint();
    this.lockPointer();
  }

  pause() {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.player.keys.clear();
    this.audio.suspend();
    this.emit('phase', 'paused');
  }

  resume() {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.audio.resume();
    this.clock.getDelta();
    this.emit('phase', 'playing');
    this.lockPointer();
  }

  openNote(id) {
    this.noteOpenedAt = performance.now();
    narrator.say(PAGES[id].text, { pitch: 0.8 });
    this.phase = 'note';
    this.player.keys.clear();
    this.audio.paper();
    this.emit('note', { id, ...PAGES[id] });
    this.emit('phase', 'note');
  }

  closeNote() {
    if (this.phase !== 'note') return;
    // açan dokunuşun "click"i notu hemen kapatmasın
    if (performance.now() - (this.noteOpenedAt || 0) < 450) return;
    narrator.stop();
    this.phase = 'playing';
    this.emit('note', null);
    this.emit('phase', 'playing');
    this.clock.getDelta();
    if (this.pendingAfterNote) {
      const f = this.pendingAfterNote;
      this.pendingAfterNote = null;
      f();
    }
    if (!document.pointerLockElement) this.lockPointer();
  }

  openJournal() {
    this.phase = 'journal';
    this.player.keys.clear();
    const pages = ['page1', 'page2', 'page3'].filter((k) => this.flags[k]).map((k) => ({ id: k, ...PAGES[k] }));
    const f = this.flags;
    const lore = LORE.filter((l) => f[l.need]).map((l) => l.text);
    const items = Object.keys(ITEMS).filter((k) => f.items && f.items[k]).map((k) => ITEMS[k].name);
    this.emit('journal', { pages, key: f.key, dials: this.dialSummary(), lore, items, iron: f.iron || 0, offered: !!f.offered });
    this.emit('phase', 'journal');
    if (document.pointerLockElement) document.exitPointerLock(); // sayfaları tıklayabilmek için
  }

  closeJournal() {
    if (this.phase !== 'journal') return;
    this.phase = 'playing';
    this.emit('journal', null);
    this.emit('phase', 'playing');
    this.clock.getDelta();
    this.lockPointer();
  }

  dialSummary() {
    return Object.keys(DIAL_LABEL).map((k) => ({ label: DIAL_LABEL[k], motif: MOTIFS[this.flags.dials[k]].name }));
  }

  setObjective(key) {
    this.objective = OBJECTIVES[key];
    this.emit('objective', this.objective);
  }

  // speak: Deniz'in iç sesi olarak seslendir
  toast(text, ms = 2600, speak = false) {
    this.emit('toast', { text, ms, id: Math.random() });
    if (speak) narrator.say(typeof speak === 'string' ? speak : text, { pitch: 0.95, rate: 1.05 });
  }

  // Varlık adını fısıldar: konumsal fısıltı + (varsa) Türkçe ses + altyazı
  creatureCall(pos, vol) {
    this.audio.whisper(pos, vol);
    if (narrator.enabled && narrator.canSpeak && this.phase === 'playing' && !narrator.speaking && Math.random() < 0.6) {
      narrator.whisperName();
      this.toast('…Deniz…', 2200);
    }
  }

  // ---------- Kayıt noktaları ----------
  saveCheckpoint(spawn) {
    const p = this.player;
    this.checkpoint = {
      flags: JSON.parse(JSON.stringify(this.flags)),
      pos: spawn ? spawn.pos.clone() : p.pos.clone(),
      yaw: spawn ? spawn.yaw : p.yaw,
      objective: this.objective,
      difficulty: this.creature.difficulty,
      apparitionDone: this.apparition.done,
    };
    // tarayıcıya kaydet: sayfa kapansa da kaldığın yerden devam
    try {
      const c = this.checkpoint;
      localStorage.setItem('karakuyu-save', JSON.stringify({ ...c, pos: [c.pos.x, c.pos.z], t: Date.now() }));
    } catch { /* yok say */ }
  }

  static hasSave() {
    try {
      return !!localStorage.getItem('karakuyu-save');
    } catch {
      return false;
    }
  }

  clearSave() {
    try { localStorage.removeItem('karakuyu-save'); } catch { /* yok say */ }
  }

  continueSaved() {
    let d;
    try { d = JSON.parse(localStorage.getItem('karakuyu-save')); } catch { d = null; }
    if (!d) return this.start();
    this.audio.init();
    this.checkpoint = { ...d, pos: new THREE.Vector3(d.pos[0], 0, d.pos[1]) };
    this.restoreCheckpoint();
  }

  restoreCheckpoint() {
    const c = this.checkpoint;
    this.flags = JSON.parse(JSON.stringify(c.flags));
    this.flags.items = this.flags.items || {};
    this.flags.crossed = false;
    this.objective = c.objective;
    this.creature.difficulty = c.difficulty;
    this.apparition.done = c.apparitionDone;
    this.apparition.active = false;
    this.player.setSpawn(c.pos.x, c.pos.z, c.yaw);
    this.player.frozen = false;
    this.player.lanternOn = true;
    this.applyFlags();
    this.fear = 0;
    this.flash = 0;
    this.fade = 0;
    const cr = this.creature;
    cr.suspicion = 0;
    cr.sawHide = false;
    cr.auraBoost = 1;
    if (this.flags.sealed) {
      cr.startStalk(this.player.pos, this.player.yaw);
    } else if (this.flags.page1) {
      cr.root.visible = true;
      cr.setState('patrol');
      this.placeCreatureFar();
    } else {
      cr.root.visible = false;
      cr.setState('dormant');
    }
    this.audio.restoreAmbience();
    this.ignoreUnlockUntil = performance.now() + 600;
    this.emit('objective', this.objective);
    this.phase = 'playing';
    this.emit('phase', 'playing');
    this.clock.getDelta();
    this.lockPointer();
  }

  placeCreatureFar() {
    const P = this.player.pos;
    let best = null, bd = 0;
    for (const w of this.world.waypoints) {
      const d = w.distanceTo(P) + Math.random() * 6;
      if (d > bd && !this.creature.los(w.x, w.z, P.x, P.z)) {
        bd = d;
        best = w;
      }
    }
    best = best || this.world.waypoints[0];
    this.creature.place(best.x, best.z, Math.random() * 6);
  }

  // Bayraklara göre dünyadaki nesneleri ayarla
  applyFlags() {
    const R = this.world.refs, f = this.flags;
    for (const id of ['page1', 'page2', 'page3']) {
      R.pages[id].visible = !f[id];
    }
    R.key.visible = !f.key;
    R.key.userData.glow.visible = !f.key;
    const d = R.muhtarDoor;
    d.pivot.rotation.y = f.doorOpen ? 1.55 : 0;
    const has = this.world.colliders.includes(d.collider);
    if (f.doorOpen && has) this.world.removeCollider(d.collider);
    if (!f.doorOpen && !has) {
      this.world.colliders.push(d.collider);
      this.world.removeCollider({}); // ızgarayı yeniden kur
    }
    for (const k of Object.keys(R.dials)) this.setDialVisual(k, f.dials[k]);
    f.items = f.items || {};
    for (const [id, m] of Object.entries(R.items)) {
      m.visible = !f.items[id];
      m.userData.glow.visible = !f.items[id];
    }
    R.offering.visible = !!f.offered;
    R.wedding.visible = !!f.page2;
    this.world.refs.wellWater.position.y = f.sealed ? -0.2 : -0.6;
  }

  setDialVisual(k, idx) {
    const d = this.world.refs.dials[k];
    const id = MOTIFS[idx].id;
    d.faceMat.map = this.T.motifs[id];
    d.faceMat.bumpMap = this.T.motifs[id];
    d.faceMat.needsUpdate = true;
  }

  // ---------- Etkileşim ----------
  updateFocus() {
    const cam = this.camera;
    cam.updateMatrixWorld();
    this.raycaster.setFromCamera({ x: 0, y: 0 }, cam);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    let found = null;
    for (const h of hits) {
      if (!h.object.visible) continue;
      if (this.blockedByWall(cam.position, h.point)) break;
      found = { id: h.object.userData.interactId, point: h.point };
      break;
    }
    if (this.player.hidden) found = { id: '__unhide' };
    this.focus = found;
    this.emit('prompt', found ? this.promptFor(found.id) : null);
  }

  blockedByWall(a, b) {
    // 2B segment–kutu kesişimi (yalnızca yüksek duvarlar)
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.3) return false;
    const ex = a.x + dx * ((len - 0.25) / len), ez = a.z + dz * ((len - 0.25) / len);
    for (const c of this.world.colliders) {
      if (c.maxY === undefined || c.maxY < 1.4) continue;
      let t0 = 0, t1 = 1;
      const sx = ex - a.x, sz = ez - a.z;
      const clip = (p, q) => {
        if (Math.abs(p) < 1e-9) return q >= 0;
        const r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
        else { if (r < t0) return false; if (r < t1) t1 = r; }
        return true;
      };
      if (clip(-sx, a.x - c.minX) && clip(sx, c.maxX - a.x) && clip(-sz, a.z - c.minZ) && clip(sz, c.maxZ - a.z)) {
        if (t0 <= t1) return true;
      }
    }
    return false;
  }

  promptFor(id) {
    const f = this.flags;
    if (id === '__unhide') return 'Çık';
    if (id.startsWith('page')) return 'Sayfayı al';
    if (id === 'key') return 'Anahtarı al';
    if (id === 'muhtarDoor') return f.doorOpen ? null : f.key ? 'Kapıyı anahtarla aç' : 'Kapıyı dene';
    if (id.startsWith('dial_')) {
      const k = id.slice(5);
      return `Taşı çevir (${DIAL_LABEL[k]}: ${MOTIFS[f.dials[k]].name})`;
    }
    if (id.startsWith('hide_')) return id.includes('saman') || id.includes('ahir') ? 'Samanın içine saklan' : 'Yüklüğe saklan';
    if (id === 'car') return f.sealed ? 'Arabaya bin' : 'Arabaya bak';
    if (ITEMS[id]) return f.items[id] ? null : ITEMS[id].prompt;
    if (id === 'offer') {
      if (f.offered) return null;
      if (f.items.item_tuz && f.items.item_ekmek) return 'Tuz ve ekmeği bırak, "destur" de';
      return 'Kuyunun ağzındaki düz taş';
    }
    return null;
  }

  interact() {
    const fo = this.focus;
    if (!fo) return;
    const id = fo.id, f = this.flags, R = this.world.refs, P = this.player;
    if (id === '__unhide') {
      P.unhide();
      this.creature.onPlayerUnhide();
      this.audio.creak(0.15, this.audio.sfx);
      this.emit('hidden', false);
      return;
    }
    if (id.startsWith('page') && !f[id]) {
      f[id] = true;
      R.pages[id].visible = false;
      this.openNote(id);
      this.pendingAfterNote = () => this.afterPage(id);
      return;
    }
    if (id === 'key' && !f.key) {
      f.key = true;
      R.key.visible = false;
      R.key.userData.glow.visible = false;
      this.audio.chime();
      this.toast('Muhtarın evinin anahtarını aldın.');
      this.updateObjectiveFromFlags();
      return;
    }
    if (id === 'muhtarDoor' && !f.doorOpen) {
      if (!f.key) {
        this.audio.locked();
        this.toast('Kilitli. Eski, ağır bir kilit.', 2600, true);
        return;
      }
      f.doorOpen = true;
      this.audio.door();
      this.openDoorAnim();
      this.world.removeCollider(R.muhtarDoor.collider);
      this.toast('Anahtar zorlukla döndü.');
      this.updateObjectiveFromFlags();
      return;
    }
    if (id.startsWith('dial_')) {
      if (f.sealed) return;
      const k = id.slice(5);
      f.dials[k] = (f.dials[k] + 1) % MOTIFS.length;
      this.setDialVisual(k, f.dials[k]);
      this.audio.clunk();
      this.checkDials();
      return;
    }
    if (id.startsWith('hide_')) {
      const spot = R.hiding.find((s) => s.id === id);
      if (!spot) return;
      P.hide(spot);
      this.creature.onPlayerHide(this.creature.pos.distanceTo(P.pos));
      this.audio.creak(0.12, this.audio.sfx);
      this.emit('hidden', true);
      return;
    }
    if (ITEMS[id] && !f.items[id]) {
      const it = ITEMS[id];
      f.items[id] = true;
      R.items[id].visible = false;
      R.items[id].userData.glow.visible = false;
      if (it.iron) f.iron = (f.iron || 0) + 1;
      this.audio.chime();
      this.toast(it.toast + (it.iron ? ` (Demir: ${f.iron})` : ''), 4200, it.toast);
      this.updateObjectiveFromFlags();
      this.saveCheckpoint();
      return;
    }
    if (id === 'offer') {
      if (f.offered) return;
      if (!(f.items.item_tuz && f.items.item_ekmek)) {
        this.toast(f.page3 ? 'Tuz ve ekmek lazım. Günlükte yazıyordu.' : 'Düz, aşınmış bir taş. Üstünde eski bir tuz lekesi var.', 3000, true);
        return;
      }
      f.offered = true;
      R.offering.visible = true;
      this.audio.chime();
      this.audio.wellDrip({ x: 0, z: 0 });
      this.creature.difficulty = Math.max(0, this.creature.difficulty - 1);
      this.flash = 0.25;
      this.toast('"Destur." Kuyunun dibinden bir iç çekiş geldi. Sonra bir çocuk sesi, çok uzaktan: teşekkür gibi.', 5200, true);
      this.updateObjectiveFromFlags();
      this.saveCheckpoint();
      return;
    }
    if (id === 'car') {
      if (f.sealed) this.ending();
      else this.toast(f.page1 ? 'Dedemin istediğini yapmadan gidemem.' : 'Arabayı burada bırakıp köye yürümeliyim.', 2600, true);
    }
  }

  openDoorAnim() {
    const piv = this.world.refs.muhtarDoor.pivot;
    const start = piv.rotation.y;
    this.anims = this.anims || [];
    this.anims.push({ t: 0, dur: 1.4, fn: (k) => (piv.rotation.y = start + (1.55 - start) * (1 - (1 - k) ** 3)) });
  }

  updateObjectiveFromFlags() {
    const f = this.flags;
    if (f.sealed) this.setObjective(f.crossed ? 'crossed' : 'sealed');
    else if (f.page3) this.setObjective(f.offered ? 'page3b' : 'page3');
    else if (f.page2 && f.key) this.setObjective('page2');
    else if (f.page1) this.setObjective(f.key ? 'page2' : 'page1');
    else this.setObjective('enter');
  }

  afterPage(id) {
    const cr = this.creature;
    this.updateObjectiveFromFlags();
    if (id === 'page1') {
      // "Bizden iyiler" uyanır
      cr.difficulty = 0;
      cr.wake();
      this.placeCreatureFar();
      this.audio.scream({ x: cr.pos.x, y: 2, z: cr.pos.z }, 0.8);
      this.player.shake = 0.6;
      this.toast('Uzakta bir şey çığlık attı. Işığa ve sese gelir.', 4200, true);
    } else if (id === 'page2') {
      cr.difficulty = 1;
      this.audio.whisper({ x: cr.pos.x, y: 1.6, z: cr.pos.z }, 0.9);
    } else if (id === 'page3') {
      cr.difficulty = 2;
      this.audio.stinger();
    }
    this.saveCheckpoint();
  }

  checkDials() {
    const f = this.flags;
    const combo = ['north', 'east', 'west'].map((k) => MOTIFS[f.dials[k]].id);
    const solved = combo[0] === SOLUTION.north && combo[1] === SOLUTION.east && combo[2] === SOLUTION.west;
    if (solved) {
      this.seal();
      return;
    }
    // üç taş da varsayılandan çevrilmişse ve kombinasyon yanlışsa: kuyu öter
    const allTurned = ['north', 'east', 'west'].every((k) => f.dials[k] !== 4);
    const key = combo.join('-');
    if (allTurned && !f.tried.includes(key)) {
      f.tried.push(key);
      this.audio.stinger();
      this.audio.rumble(2.5, 0.4);
      this.player.shake = 0.5;
      this.toast('Kuyunun dibinden bir şey cevap verdi. Yanlış.', 3200, true);
      const cr = this.creature;
      if (cr.state !== 'dormant' && cr.state !== 'chase') {
        cr.lastKnown.set(0, 0, 3);
        cr.setState('investigate');
        cr.goTo(0, 4);
      }
    }
  }

  seal() {
    const f = this.flags;
    f.sealed = true;
    this.audio.rumble(5, 1);
    this.audio.chime();
    this.flash = 0.6;
    this.player.shake = 1.4;
    this.creature.root.visible = false;
    this.creature.setState('dormant');
    this.toast(f.offered ? 'Taşlar yerine oturdu. Kuyu derin bir nefes aldı.' : 'Taşlar oturdu... ama kuyu hâlâ aç. Bir şey eksik kaldı.', 4000, true);
    this.anims = this.anims || [];
    const water = this.world.refs.wellWater;
    this.anims.push({ t: 0, dur: 3, fn: (k) => (water.position.y = -0.6 + k * 0.4) });
    this.setObjective('sealed');
    // birkaç saniye sonra arkandan yürümeye başlar
    this.later(3.2, () => {
      if (this.phase !== 'playing' && this.phase !== 'note') return;
      this.saveCheckpoint();
      this.creature.startStalk(this.player.pos, this.player.yaw);
      this.audio.whisper({ x: this.creature.pos.x, y: 1.6, z: this.creature.pos.z }, 1);
      this.toast('Arkanda ıslak bir ayak sesi. Bakma.', 4000, true);
    });
  }

  later(sec, fn) {
    this.timers = this.timers || [];
    this.timers.push({ t: sec, fn });
  }

  // ---------- Ölüm ve son ----------
  die(reason) {
    if (this.phase === 'dead') return;
    this.phase = 'dead';
    this.player.keys.clear();
    if (this.player.hidden) {
      this.player.unhide();
      this.emit('hidden', false);
    }
    this.deathTimer = 0;
    // yüz yüze
    const cam = this.camera;
    const fwd = new THREE.Vector3();
    cam.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const cr = this.creature;
    cr.root.visible = true;
    cr.setState('dormant');
    cr.place(cam.position.x + fwd.x * 0.75, cam.position.z + fwd.z * 0.75, Math.atan2(-fwd.x, -fwd.z));
    cr.pos.y = this.player.pos.y + (this.player.eye - 2.0);
    cr.auraBoost = 5;
    this.player.lanternOn = true;
    this.player.shake = 3;
    this.flash = 1;
    this.audio.jumpscare();
    const line = reason === 'look' ? DEATH_LOOKBACK : reason === 'wedding' ? DEATH_WEDDING : DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)];
    narrator.stop();
    this.later(1.4, () => {
      this.audio.silenceAll(1);
      this.emit('phase', 'dead');
      this.emit('death', { line });
      if (document.pointerLockElement) document.exitPointerLock();
    });
  }

  ending() {
    this.clearSave();
    this.emit('endingKind', this.flags.offered ? 'true' : 'half');
    if (this.flags.offered) this.later(1.2, () => this.audio.rooster());
    try {
      const k = JSON.parse(localStorage.getItem('karakuyu-endings') || '{}');
      k[this.flags.offered ? 'true' : 'half'] = true;
      localStorage.setItem('karakuyu-endings', JSON.stringify(k));
    } catch { /* yok say */ }
    this.phase = 'ending';
    this.player.frozen = true;
    this.creature.root.visible = false;
    this.creature.setState('dormant');
    this.audio.silenceAll(3);
    this.anims = this.anims || [];
    this.anims.push({ t: 0, dur: 2.5, fn: (k) => (this.fade = k) });
    this.later(2.6, () => {
      this.emit('phase', 'ending');
      if (document.pointerLockElement) document.exitPointerLock();
    });
  }

  restart() {
    narrator.stop();
    this.flags = this.freshFlags();
    this.objective = OBJECTIVES.enter;
    this.apparition = { done: false, active: false, look: 0, t: 0 };
    this.creature.difficulty = 0;
    this.player.setSpawn(-1, 64.5, 0);
    this.saveCheckpoint();
    this.restoreCheckpoint();
  }

  // ---------- Döngü ----------
  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (this.manual) return; // testler kareleri elle ilerletir
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.frame(dt, true);
  }

  // Test yardımcısı: n kare ilerlet (çizim isteğe bağlı)
  step(n = 1, dt = 1 / 30, render = false) {
    for (let i = 0; i < n; i++) this.frame(dt, render && i === n - 1);
  }

  frame(dt, doRender = true) {
    const active = this.phase === 'playing' || this.phase === 'dead' || this.phase === 'ending' || this.phase === 'intro' || this.phase === 'menu';
    if (active) this.time += dt;
    const t = this.time;

    if (this.phase === 'menu' || this.phase === 'intro') {
      // menü arkasında yavaş dönen kamera
      const a = t * 0.04;
      this.camera.position.set(Math.sin(a) * 26, 3.2 + Math.sin(t * 0.3) * 0.3, 30 + Math.cos(a) * 14);
      this.camera.lookAt(0, 1.2, -6);
      this.player.lantern.visible = false;
      this.world.update(dt, t, this.camera.position);
      this.moonFollow(this.camera.position);
      this.post.u.uTime.value = t;
      this.post.u.uFear.value = 0.08;
      if (doRender) this.post.composer.render(dt);
      return;
    }

    if (this.phase === 'playing') this.updatePlaying(dt, t);
    else if (this.phase === 'dead') {
      this.deathTimer += dt;
      this.player.shake = Math.max(this.player.shake, 1.2);
      const cam = this.camera;
      cam.position.x += (Math.random() - 0.5) * 0.02;
      this.creature.animate(dt, t, 0.5);
      this.creature.head.rotation.z = Math.sin(t * 40) * 0.3;
      this.fade = Math.min(1, Math.max(0, (this.deathTimer - 0.9) * 1.5));
      this.fear = 1;
    } else if (this.phase === 'ending') {
      this.player.update(dt, t);
    }

    // zamanlayıcılar ve animasyonlar
    if (this.timers && (this.phase === 'playing' || this.phase === 'dead' || this.phase === 'ending')) {
      for (const tm of this.timers) tm.t -= dt;
      const due = this.timers.filter((x) => x.t <= 0);
      this.timers = this.timers.filter((x) => x.t > 0);
      due.forEach((x) => x.fn());
    }
    if (this.anims) {
      for (const a of this.anims) {
        a.t += dt;
        a.fn(Math.min(1, a.t / a.dur));
      }
      this.anims = this.anims.filter((a) => a.t < a.dur);
    }

    this.world.update(dt, t, this.player.pos);
    this.moonFollow(this.player.pos);
    this.flash = Math.max(0, this.flash - dt * 1.5);
    const u = this.post.u;
    u.uTime.value = t;
    u.uFear.value = this.fear;
    u.uFlash.value = this.flash;
    u.uFade.value = this.fade;
    if (doRender) this.post.composer.render(dt);
  }

  moonFollow(p) {
    const m = this.moon;
    const sx = Math.round(p.x / 4) * 4, sz = Math.round(p.z / 4) * 4;
    m.target.position.set(sx, 0, sz);
    m.position.set(sx - 45, 60, sz - 70);
  }

  updatePlaying(dt, t) {
    const P = this.player, cr = this.creature;
    P.update(dt, t);

    // giriş sahnesi: kuyu başında bir an görünür
    this.updateApparition(dt);

    const fwd = P.forward();
    const evs = cr.update(dt, t, {
      playerPos: P.pos,
      hidden: P.hidden,
      lantern: P.lanternOn,
      crouch: P.crouch,
      noise: P.noise,
      yaw: P.yaw,
      moving: P.speed > 0.6,
      camPos: this.camera.position,
      camFwd: fwd,
    });
    for (const e of evs) {
      if (e.type === 'caught') {
        if ((this.flags.iron || 0) > 0) {
          this.repel();
          break;
        }
        return this.die('caught');
      }
      if (e.type === 'lookedBack') return this.die('look');
      if (e.type === 'chaseStart') {
        this.audio.scream({ x: cr.pos.x, y: 2, z: cr.pos.z }, 0.9);
        this.toast('KAÇ. Saklan.', 1800);
      }
      if (e.type === 'step') this.audio.creatureStep({ x: cr.pos.x, y: 0.2, z: cr.pos.z }, e.data.fast);
    }

    this.updateCinRules(dt, t);

    // korku seviyesi
    let target = 0;
    const active = cr.root.visible && cr.state !== 'dormant';
    if (active) {
      const d = cr.pos.distanceTo(P.pos);
      target = Math.max(0, 1 - d / 24) * 0.75;
      if (cr.state === 'chase') target = Math.max(target, 0.55) + 0.25;
      if (cr.state === 'stalk') target = 0.45 + Math.max(0, 1 - cr.stalkDist / 7) * 0.5 + cr.lookTimer * 1.2;
      if (P.hidden && cr.state !== 'chase') target *= 0.8;
    }
    if (this.apparition.active) target = Math.max(target, 0.35);
    this.fear += (Math.min(1, target) - this.fear) * Math.min(1, dt * 2.5);
    P.flickerMul = this.fear > 0.35 ? (Math.random() < this.fear * 0.12 ? 0.15 : 1 - this.fear * 0.25) : 1;

    // ses
    this.audio.updateListener(this.camera.position, fwd);
    this.audio.updateCreature(cr.pos, active, cr.state === 'chase');
    this.audio.setFear(this.fear, cr.state === 'chase');
    this.dripTimer -= dt;
    if (this.dripTimer < 0 && P.pos.length() < 20) {
      this.dripTimer = 1.5 + Math.random() * 3;
      this.audio.wellDrip({ x: 0, z: 0 });
    }
    if (active) {
      this.whisperTimer -= dt;
      if (this.whisperTimer < 0) {
        this.whisperTimer = cr.state === 'stalk' ? 3 + Math.random() * 4 : 14 + Math.random() * 18;
        if (cr.state === 'stalk' || cr.pos.distanceTo(P.pos) < 30) this.creatureCall({ x: cr.pos.x, y: 1.6, z: cr.pos.z }, cr.state === 'stalk' ? 0.9 : 0.6);
      }
    }

    // etkileşim odağı (saniyede ~12 kez)
    this.focusTimer -= dt;
    if (this.focusTimer <= 0) {
      this.focusTimer = 0.08;
      this.updateFocus();
    }

    // HUD
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.emit('hud', {
        stamina: P.stamina,
        exhausted: P.exhausted,
        lantern: P.lanternOn,
        crouch: P.crouch,
        hidden: !!P.hidden,
        hideKind: P.hidden ? P.hidden.kind : null,
        fear: this.fear,
        chase: cr.state === 'chase',
        iron: this.flags.iron || 0,
      });
    }
  }

  updateApparition(dt) {
    // Köy girişinde, arabanın farlarının ucunda bir an durur.
    const A = this.apparition, P = this.player, cr = this.creature;
    if (A.done || this.flags.page1) return;
    if (!A.active && P.pos.z < 58.5) {
      A.active = true;
      A.t = 0;
      A.look = 0;
      cr.place(0.6, 44.5, Math.PI);
      cr.root.visible = true;
      cr.setState('apparition');
      this.audio.wellDrip({ x: 0.6, z: 44.5 });
    }
    if (!A.active) return;
    A.t += dt;
    const to = new THREE.Vector3().subVectors(cr.pos, this.camera.position).setY(0).normalize();
    const f = P.forward().setY(0).normalize();
    const d = cr.pos.distanceTo(P.pos);
    if (to.dot(f) > 0.97) A.look += dt;
    if (A.look > 1.3 || d < 9 || A.t > 20) {
      A.done = true;
      A.active = false;
      cr.root.visible = false;
      cr.setState('dormant');
      P.flickerMul = 0;
      this.flash = 0.3;
      this.player.shake = 0.4;
      this.audio.whisper({ x: cr.pos.x, y: 1.6, z: cr.pos.z }, 0.8);
      this.audio.stinger();
    }
  }

  // ---------- Cin kuralları: demir, akan su, düğün, kara kedi, ters ayak izleri ----------
  repel() {
    const f = this.flags, cr = this.creature;
    f.iron = Math.max(0, (f.iron || 0) - 1);
    this.audio.ironRepel();
    this.flash = 0.8;
    this.player.shake = 0.9;
    if (cr.state === 'stalk') {
      cr.stalkDist = 7;
      cr.stillTimer = 0;
    } else {
      cr.suspicion = 0;
      cr.setState('patrol');
      this.placeCreatureFar();
    }
    this.toast(f.iron > 0 ? `Cebimdeki demiri gördü. Çığlık atıp geri çekildi. (Kalan demir: ${f.iron})` : 'Demir kızardı, sonra kararıp küflendi. Bir daha korumaz.', 4200, f.iron > 0 ? 'Cebimdeki demiri gördü. Çığlık atıp geri çekildi.' : true);
  }

  updateCinRules(dt, t) {
    const P = this.player, cr = this.creature, f = this.flags, R = this.world.refs;
    if (this.audio.ready && !this.audio.streamOn) this.audio.startStream(STREAM_Z);
    // --- Akan su: cin dereyi geçemez ---
    if (cr.state === 'stalk' && P.pos.z > STREAM_Z + 1.3 && !f.crossed) {
      f.crossed = true;
      cr.setState('dormant');
      cr.place(Math.max(-1.8, Math.min(1.8, P.pos.x)), STREAM_Z - 2.2, 0);
      cr.root.visible = true;
      this.audio.whisper({ x: cr.pos.x, y: 1.6, z: cr.pos.z }, 1);
      this.toast('Ayak sesleri suyun kıyısında kesildi. Akan suyu geçemiyor.', 4200, true);
      this.updateObjectiveFromFlags();
    } else if (f.crossed && f.sealed && P.pos.z < STREAM_Z - 1) {
      f.crossed = false;
      cr.startStalk(P.pos, P.yaw);
      this.toast('Geri döndün. Yine arkanda.', 2600, true);
      this.updateObjectiveFromFlags();
    }
    if (f.crossed && cr.state === 'dormant') cr.turnTo(Math.atan2(P.pos.x - cr.pos.x, P.pos.z - cr.pos.z), dt, 3);
    if (cr.state !== 'stalk' && cr.state !== 'dormant' && cr.state !== 'apparition' && cr.pos.z > STREAM_Z - 1.8) {
      cr.pos.z = STREAM_Z - 1.8;
      cr.path = [];
      if (cr.state === 'chase' || cr.state === 'investigate') {
        cr.lastKnown.set(cr.pos.x, 0, cr.pos.z - 4);
        cr.setState('search');
      }
    }
    // --- Cin düğünü: mezarlıktan gelen davul zurna ---
    if (f.page2) {
      if (!R.wedding.visible) R.wedding.visible = true;
      if (this.audio.ready && !this.audio.wed) this.audio.startWedding(WEDDING);
      const d = Math.hypot(P.pos.x - WEDDING.x, P.pos.z - WEDDING.z);
      this.lureT = (this.lureT || 0) - dt;
      if (d < 13 && this.lureT <= 0) {
        this.lureT = 7;
        const lines = ['…Deniz… gel kuzum, düğünümüz var…', '…oğlum, nineni tanımadın mı…', '…bir halay çek bizimle, sonra gidersin…'];
        const ln = lines[Math.floor(Math.random() * lines.length)];
        this.toast(ln, 3200);
        if (!narrator.speaking) narrator.say(ln, { voiceKey: 'nine', interrupt: false });
        this.audio.whisper({ x: WEDDING.x, y: 1.5, z: WEDDING.z }, 0.8);
      }
      if (d < 4.5) return this.die('wedding');
    }
    this.updateCat(dt, t);
    this.updatePrints(dt);
  }

  updateCat(dt) {
    const C = (this.cat = this.cat || { t: 35, active: false, look: 0, life: 0, seen: false });
    const cat = this.world.refs.cat, P = this.player, cr = this.creature;
    if (!this.flags.page1 || this.flags.sealed) {
      cat.visible = false;
      C.active = false;
      return;
    }
    if (!C.active) {
      C.t -= dt;
      if (C.t > 0 || cr.state === 'chase') return;
      const fw = P.forward().setY(0).normalize();
      for (let k = 0; k < 10; k++) {
        const d = 9 + Math.random() * 7, a = (Math.random() - 0.5) * 1.0;
        const dx = fw.x * Math.cos(a) - fw.z * Math.sin(a), dz = fw.x * Math.sin(a) + fw.z * Math.cos(a);
        const x = P.pos.x + dx * d, z = P.pos.z + dz * d;
        if (!this.world.inBounds(x, z) || P.collidesAt(x, z) || !cr.los(P.pos.x, P.pos.z, x, z)) continue;
        cat.position.set(x, this.world.heightAt(x, z), z);
        cat.rotation.y = Math.atan2(P.pos.x - x, P.pos.z - z);
        cat.visible = true;
        C.active = true;
        C.look = 0;
        C.life = 0;
        return;
      }
      C.t = 5;
      return;
    }
    C.life += dt;
    const to = new THREE.Vector3().subVectors(cat.position, this.camera.position).setY(0);
    const d = to.length();
    to.normalize();
    if (to.dot(P.forward().setY(0).normalize()) > 0.96) C.look += dt;
    cat.rotation.y = Math.atan2(P.pos.x - cat.position.x, P.pos.z - cat.position.z);
    if (C.look > 1.4 || d < 4.5 || C.life > 25) {
      cat.visible = false;
      C.active = false;
      C.t = 45 + Math.random() * 45;
      this.audio.hiss({ x: cat.position.x, y: 0.4, z: cat.position.z });
      if (d < 4.5 && (cr.state === 'patrol' || cr.state === 'search')) {
        cr.lastKnown.set(P.pos.x, 0, P.pos.z);
        cr.setState('investigate');
        cr.goTo(P.pos.x, P.pos.z);
        this.toast('Kedi tıslayıp karanlığa karıştı. Bir şey seni duydu.', 3200, true);
      } else if (!C.seen) this.toast('Kara bir kedi. Gözleri fazla parlaktı. Göz kırptım; yoktu.', 3600, true);
      C.seen = true;
    }
  }

  // Ters basan ıslak ayak izleri: parmaklar geldiği yöne bakar
  updatePrints(dt) {
    if (!this.prints) {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 64;
      const x = c.getContext('2d');
      x.fillStyle = '#fff';
      x.beginPath();
      x.ellipse(16, 40, 9, 20, 0, 0, Math.PI * 2);
      x.fill();
      for (let i = 0; i < 4; i++) {
        x.beginPath();
        x.arc(8 + i * 5.5, 12 - Math.abs(i - 1.5) * 2, 3, 0, Math.PI * 2);
        x.fill();
      }
      const tex = new THREE.CanvasTexture(c);
      const geo = new THREE.PlaneGeometry(0.13, 0.27);
      geo.rotateX(-Math.PI / 2); // parmaklar yerel -z yönünde
      this.prints = { list: [], i: 0, acc: 0, side: 1 };
      for (let k = 0; k < 48; k++) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: 0x020304, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
        m.visible = false;
        this.scene.add(m);
        this.prints.list.push({ m, life: 0 });
      }
      this.prints.last = this.creature.pos.clone();
    }
    const Pr = this.prints, cr = this.creature;
    const moved = Pr.last.distanceTo(cr.pos);
    if (moved > 3) Pr.last.copy(cr.pos); // ışınlandı
    else if (cr.root.visible && moved > 0.7) {
      const dir = Math.atan2(cr.pos.x - Pr.last.x, cr.pos.z - Pr.last.z);
      Pr.last.copy(cr.pos);
      const it = Pr.list[(Pr.i = (Pr.i + 1) % Pr.list.length)];
      Pr.side *= -1;
      const ox = Math.cos(dir) * 0.13 * Pr.side, oz = -Math.sin(dir) * 0.13 * Pr.side;
      it.m.position.set(cr.pos.x + ox, this.world.heightAt(cr.pos.x, cr.pos.z) + 0.03, cr.pos.z + oz);
      it.m.rotation.y = dir; // yerel -z (parmaklar) = gidişin tersi
      it.m.visible = true;
      it.life = 30;
    }
    for (const it of Pr.list) {
      if (it.life <= 0) continue;
      it.life -= dt;
      it.m.material.opacity = Math.min(0.6, it.life / 20);
      if (it.life <= 0) it.m.visible = false;
    }
  }

  dispose() {
    this.running = false;
    clearInterval(this.audio.wedTimer);
    window.removeEventListener('keydown', this._keydown);
    window.removeEventListener('keyup', this._keyup);
    document.removeEventListener('mousemove', this._mouse);
    document.removeEventListener('pointerlockchange', this._lock);
    document.removeEventListener('pointerlockerror', this._lockErr);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('blur', this._blur);
    document.removeEventListener('visibilitychange', this._vis);
    this.renderer.dispose();
  }
}
