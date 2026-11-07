import * as THREE from 'three';
import * as S from '../../bulutyaris/game/sfx.js';
import * as W from './world.js';
import { HOME, LEGS, PLANETS, FINALE } from './story.js';

const CANCEL = Symbol('cancel');
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SEQ = ['home', 'launch', 'leg0', 'planet0', 'leg1', 'planet1', 'leg2', 'planet2', 'leg3', 'planet3', 'leg4', 'finale'];
const SAVE = 'sy-save';

export class Voyage {
  constructor(canvas, cb = {}) {
    this.cv = canvas; this.cb = cb; this.touch = !!cb.touch;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.touch, powerPreference: 'high-performance' });
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(65, 1, 0.1, 3200);
    this.scene.add(this.cam);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.scene.add(this.hemi, this.sun);
    this.stars = W.makeStars(); this.scene.add(this.stars);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.tweens = []; this.tok = 0; this.upd = null; this.t = 0; this.acc = 0; this.last = performance.now(); this.hudT = 0;
    this.input = { mx: 0, my: 0, fire: false, sx: 0, sy: 0 };
    this.uses = []; this.picks = []; this.cols = [];
    this.name = 'Pilot'; this.frags = 0; this.dust = 0; this.tabs = 0; this.fade = 1; this.fadeColor = '#000';
    this.dlg = null; this.choice = null; this.radioMsg = null; this.radioT = 0; this.big = ''; this.obj = ''; this.mode = 'cine'; this.title = null;
    this.shake = 0; this.flash = 0; this.hull = 5; this.prog = 0; this.busy = false;
    this.resize(); this._rs = () => this.resize(); addEventListener('resize', this._rs);
    this.raf = requestAnimationFrame(() => this.loop());
  }
  dispose() { this.tok++; cancelAnimationFrame(this.raf); removeEventListener('resize', this._rs); this.renderer.dispose(); }
  resize() {
    const w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch ? 1.5 : 2));
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.fov = w / h < 1 ? 80 : 62; this.cam.updateProjectionMatrix();
  }

  // ---------- ilerleme kaydı ----------
  static loadSave() { try { return JSON.parse(localStorage.getItem(SAVE) || 'null'); } catch { return null; } }
  save(i) { try { localStorage.setItem(SAVE, JSON.stringify({ idx: i, frags: this.frags, dust: this.dust, tabs: this.tabs, name: this.name })); } catch { /* yok say */ } }
  static clearSave() { try { localStorage.removeItem(SAVE); } catch { /* yok say */ } }

  // ---------- zaman, geçiş, diyalog ----------
  tween(sec, fn) { return new Promise((res, rej) => this.tweens.push({ t: 0, d: Math.max(0.0001, sec), fn, res, rej, tok: this.tok })); }
  wait(s) { return this.tween(s, null); }
  fadeTo(v, s = 0.7, color) { if (color) this.fadeColor = color; const a = this.fade; return this.tween(s, (k) => { this.fade = a + (v - a) * k; }); }
  say(lines) {
    const L = lines.map(([w, t]) => [w, t.replace(/\{ad\}/g, this.name)]);
    return new Promise((res, rej) => { this.dlg = { L, i: 0, res, rej, tok: this.tok }; this.emitDlg(); S.beep(false); });
  }
  emitDlg() { const d = this.dlg; this.cb.onDialog?.(d ? { who: d.L[d.i][0], text: d.L[d.i][1], i: d.i, n: d.L.length } : null); }
  tap() {
    const d = this.dlg; if (!d || d.tok !== this.tok) return;
    if (d.i < d.L.length - 1) { d.i++; this.emitDlg(); } else { this.dlg = null; this.emitDlg(); d.res(); }
  }
  ask(q, opts) { return new Promise((res, rej) => { this.choice = { q, opts, res, rej, tok: this.tok }; this.cb.onChoice?.({ q, opts: opts.map((o) => o.t) }); }); }
  pick(i) { const c = this.choice; if (!c || c.tok !== this.tok) return; this.choice = null; this.cb.onChoice?.(null); c.res(i); }
  radio(who, text, dur = 5.5) { this.radioMsg = { who, text: text.replace(/\{ad\}/g, this.name) }; this.radioT = dur; S.beep(false); }
  setBig(t) { this.big = t; }
  setTitle(t) { this.title = t; }
  get locked() { return !!(this.dlg || this.choice || this.busy || this.cine); }

  // ---------- sahne kurulumu ----------
  reset({ bg = 0x02030a, fog = null, hemi = [0xffffff, 0x555566, 0.9], sun = [0xffffff, 1.4, [30, 50, 20]], stars = true } = {}) {
    this.root.traverse((n) => { n.geometry?.dispose?.(); });
    this.scene.remove(this.root); this.root = new THREE.Group(); this.scene.add(this.root);
    while (this.cam.children.length) this.cam.remove(this.cam.children[0]);
    this.scene.background = new THREE.Color(bg);
    this.scene.fog = fog ? new THREE.Fog(fog[0], fog[1], fog[2]) : null;
    this.hemi.color.set(hemi[0]); this.hemi.groundColor.set(hemi[1]); this.hemi.intensity = hemi[2];
    this.sun.color.set(sun[0]); this.sun.intensity = sun[1]; this.sun.position.set(...sun[2]);
    this.stars.visible = stars;
    this.upd = null; this.uses = []; this.picks = []; this.cols = []; this.me = null; this.L = null; this.rocket = null;
    this.shake = 0; this.cam.rotation.set(0, 0, 0); this.cam.up.set(0, 1, 0); this.input.mx = this.input.my = 0;
    this.big = ''; this.mode = 'cine'; this.cine = true;
  }

  // ---------- ana akış ----------
  start({ name = 'Pilot', from = 0 } = {}) {
    S.unlock();
    this.name = name.trim().slice(0, 12) || 'Pilot';
    if (from === 0) { this.frags = 0; this.dust = 0; this.tabs = 0; }
    this.running = true;
    this.play(from);
  }
  async play(from) {
    const tok = ++this.tok;
    this.dlg = null; this.choice = null; this.cb.onDialog?.(null); this.cb.onChoice?.(null); this.tweens.length = 0; this.busy = false; this.cb.onEnd?.(false);
    try {
      for (let i = from; i < SEQ.length; i++) {
        this.idx = i; if (tok !== this.tok) return;
        if (i === 0 || SEQ[i].startsWith('planet') || SEQ[i].startsWith('leg')) this.save(i);
        const n = SEQ[i];
        if (n === 'home') await this.actHome();
        else if (n === 'launch') await this.actLaunch();
        else if (n.startsWith('leg')) await this.actLeg(+n.slice(3));
        else if (n.startsWith('planet')) await this.actPlanet(+n.slice(6));
        else await this.actFinale();
      }
      Voyage.clearSave();
      this.cb.onEnd?.(true, { frags: this.frags, dust: this.dust, tabs: this.tabs });
    } catch (e) { if (e !== CANCEL) console.error(e); }
  }
  quit() { this.tok++; this.dlg = null; this.choice = null; this.cb.onDialog?.(null); this.cb.onChoice?.(null); this.running = false; this.upd = null; this.mode = 'cine'; }

  // ---------- yürüme modu ----------
  addUse(o) { const u = { r: 2.8, ...o }; this.uses.push(u); return u; }
  enterWalk(p) {
    this.mode = 'walk';
    this.me = W.makeFigure({ astro: !!p.astro, scale: 1 }); this.me.position.set(p.x, 0, p.z); this.root.add(this.me);
    this.R = p.R; this.camOff = p.cam || [0, 8, 10]; this.yaw = 0; this.walkT = 0;
    this.upd = (dt) => this.walkStep(dt);
    this.cam.position.set(p.x + this.camOff[0], this.camOff[1], p.z + this.camOff[2]);
  }
  walkStep(dt) {
    const me = this.me; this.walkT += dt;
    let mx = this.input.mx, mz = -this.input.my;
    if (this.locked) { mx = mz = 0; }
    const mag = Math.min(1, Math.hypot(mx, mz));
    if (mag > 0.08) {
      const sp = 7.2 * mag; me.position.x += (mx / Math.hypot(mx, mz)) * sp * dt; me.position.z += (mz / Math.hypot(mx, mz)) * sp * dt;
      const ty = Math.atan2(mx, mz); let d = ((ty - me.rotation.y + Math.PI) % TAU + TAU) % TAU - Math.PI; me.rotation.y += d * Math.min(1, dt * 12);
    }
    for (const c of this.cols) { const dx = me.position.x - c.x, dz = me.position.z - c.z, d = Math.hypot(dx, dz), m = c.r + 0.5; if (d < m && d > 0.001) { me.position.x = c.x + (dx / d) * m; me.position.z = c.z + (dz / d) * m; } }
    const rr = Math.hypot(me.position.x, me.position.z); if (rr > this.R) { me.position.x *= this.R / rr; me.position.z *= this.R / rr; }
    W.animFigure(me, this.walkT, mag);
    // toplananlar
    for (const p of this.picks) {
      if (p.got || p.active === false) continue;
      p.m.rotation.y += dt * 2; p.m.position.y = p.y0 + Math.sin(this.walkT * 2.2 + p.x) * 0.2;
      if (!this.locked && Math.hypot(me.position.x - p.x, me.position.z - p.z) < 1.5) { p.got = true; this.root.remove(p.m); S.pick(); p.onGet?.(); }
    }
    // yakın etkileşim
    let near = null, nd = 1e9;
    if (!this.locked) for (const u of this.uses) { if (u.off) continue; const d = Math.hypot(me.position.x - u.x, me.position.z - u.z); if (d < u.r && d < nd) { nd = d; near = u; } }
    this.near = near;
    this.root.traverse((n) => { n.userData.tick?.(this.walkT); });
    // kamera
    const tx = me.position.x + this.camOff[0], ty = this.camOff[1], tz = me.position.z + this.camOff[2];
    const k = Math.min(1, dt * 4);
    this.cam.position.x += (tx - this.cam.position.x) * k; this.cam.position.y += (ty - this.cam.position.y) * k; this.cam.position.z += (tz - this.cam.position.z) * k;
    this.cam.lookAt(me.position.x, 1.4, me.position.z);
  }
  act() { const u = this.near; if (!u || this.locked) return; this.busy = true; Promise.resolve(u.use()).catch((e) => { if (e !== CANCEL) console.error(e); }).finally(() => { this.busy = false; }); }

  // ---------- 1) EV ----------
  async actHome() {
    this.reset({ bg: 0x16224a, fog: [0x16224a, 60, 190], hemi: [0x9ab0e8, 0x2a4a34, 1.7], sun: [0xc8d6ff, 1.3, [-20, 40, 20]], stars: true });
    this.stars.position.set(0, 0, 0);
    const H = new THREE.Group(); this.root.add(H); this.homeGroup = H;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(95, 40), W.M(0x2c5a40)); ground.rotation.x = -Math.PI / 2; H.add(ground);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 10), W.B(0xfff4d0)); moon.position.set(-70, 55, -110); H.add(moon);
    const house = new THREE.Group(); house.position.set(-16, 0, -9); H.add(house);
    const bm = new THREE.Mesh(new THREE.BoxGeometry(11, 5.5, 8), W.M(0xdccbA4)); bm.position.y = 2.75; house.add(bm);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8.6, 3.8, 4), W.M(0x8a3a2a)); roof.rotation.y = Math.PI / 4; roof.position.y = 7.4; house.add(roof);
    for (const x of [-3, 3]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), W.B(0xffd77a)); w.position.set(x, 3.2, 4.02); house.add(w); }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3, 0.2), W.M(0x5a3a22)); door.position.set(0, 1.5, 4.02); house.add(door);
    const lamp = new THREE.PointLight(0xffd77a, 90, 30); lamp.position.set(0, 3, 7); house.add(lamp);
    const R = W.rng(5);
    for (let i = 0; i < 16; i++) { const a = R() * TAU, r = 30 + R() * 50; if (Math.hypot(Math.cos(a) * r, Math.sin(a) * r - 10 - 14) < 26) continue; const t = new THREE.Group(); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 10); t.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 5), W.M(0x4a3020)).translateY(1.5)); t.add(new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 6), W.M(0x1f5a36)).translateY(5)); H.add(t); this.cols.push({ x: t.position.x, z: t.position.z, r: 0.8 }); }
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 0.4, 20), W.M(0x6a7280)); pad.position.set(20, 0.2, -12); H.add(pad);
    const rocket = W.makeRocket(); rocket.position.set(20, 0.4, -12); this.root.add(rocket); this.rocket = rocket;
    const padLight = new THREE.PointLight(0xaec8ff, 50, 30); padLight.position.set(20, 6, -6); H.add(padLight);
    this.cols.push({ x: -16, z: -9, r: 6.2 }, { x: 20, z: -12, r: 2.2 });
    const fig = (o, x, z, face) => { const f = W.makeFigure(o); f.position.set(x, 0, z); f.rotation.y = face; this.root.add(f); this.cols.push({ x, z, r: 0.7 }); return f; };
    const anne = fig({ body: 0xc95a7a, hair: 0x4a2a1a }, -9, 0, 0.9);
    const baba = fig({ body: 0x4a7a5a, hair: 0x2a2a2a, scale: 1.08 }, -3, -4, 0.2);
    const deniz = fig({ body: 0xf2b63a, hair: 0x6a3a1a, scale: 0.62 }, 5, 4, -2.4);
    this.enterWalk({ x: 0, z: 12, R: 60, astro: false });
    this.fadeColor = '#000'; this.fade = 1;
    await this.fadeTo(0, 1.4);
    await this.say(HOME.intro); this.cine = false;
    let done = 0; const total = 3;
    const setObj = () => { this.obj = done < total ? `Ailenle vedalaş (${done}/${total})` : 'Roketine git'; };
    setObj();
    let finish; const allDone = new Promise((r) => (finish = r));
    const bye = (f, label, lines, after, choice) => {
      const u = this.addUse({ x: f.position.x, z: f.position.z, label, r: 3.2, use: async () => {
        await this.say(lines);
        if (choice) { const i = await this.ask(choice.q, choice.opts); await this.say(choice.opts[i].reply); }
        if (after) await this.say(after);
        u.off = true; done++; setObj();
        if (done >= total) { this.obj = 'Roketine git'; finish(); }
      } });
    };
    bye(anne, 'KONUŞ', HOME.anne, HOME.anneEnd, HOME.anneChoice);
    bye(baba, 'KONUŞ', HOME.baba);
    bye(deniz, 'KONUŞ', HOME.deniz);
    await allDone;
    let board; const boarded = new Promise((r) => (board = r));
    this.addUse({ x: 20, z: -8, label: 'ROKETE BİN', r: 4.5, use: async () => { await this.say(HOME.rocket); board(); } });
    this.obj = 'Roketine git';
    await boarded;
    this.obj = '';
  }

  // ---------- 2) FIRLATMA ----------
  async actLaunch() {
    this.mode = 'cine'; this.upd = null;
    this.me && (this.me.visible = false);
    const rocket = this.rocket, fl = rocket.userData.flame, p0 = new THREE.Vector3(20, 0, -12);
    const f0 = this.fade;
    void f0;
    this.cam.position.set(30, 5, 6); this.cam.lookAt(20, 6, -12);
    this.upd = () => { this.cam.lookAt(20, rocket.position.y + 5, -12); };
    for (const n of ['3', '2', '1']) { this.setBig(n); S.beep(false); await this.wait(1); }
    this.setBig('FIRLATMA!'); S.beep(true); fl.visible = true;
    const flameLight = new THREE.PointLight(0xffb060, 200, 60); rocket.add(flameLight); flameLight.position.y = -1;
    let t = 0, y = 0.4;
    const hide = () => this.homeGroup.children.forEach((c) => (c.visible = false));
    let swapped = false; let earth;
    await new Promise((res, rej) => {
      const tok = this.tok;
      this.upd = (dt) => {
        if (tok !== this.tok) return rej(CANCEL);
        t += dt; y += (1 + t * t * 3.2) * dt * 3;
        rocket.position.y = y; fl.scale.set(1 + Math.sin(t * 40) * 0.15, 1 + Math.random() * 0.4, 1 + Math.sin(t * 37) * 0.15);
        this.shake = Math.max(0, 0.4 - t * 0.06);
        const cy = y + 9 + Math.min(y * 0.1, 30);
        this.cam.position.set(20 + 14 + Math.min(y * 0.12, 20), cy, -12 + 10 + Math.min(y * 0.15, 30));
        this.cam.lookAt(20, y + 2, -12);
        const k = clamp(y / 260, 0, 1);
        if (!swapped) { this.scene.background = new THREE.Color(0x16224a).lerp(new THREE.Color(0x02030a), k); }
        if (!swapped && y > 90) {
          swapped = true; hide(); this.scene.fog = null; this.scene.background = new THREE.Color(0x02030a);
          earth = W.makePlanet(300, 0x1f58b8, 0x3f9a4a, { atmo: 0x6fb8ff, seed: 3 }); earth.position.set(20, -330, -12); this.root.add(earth);
          this.setBig('');
        }
        if (swapped) { earth.rotation.y += dt * 0.02; if (y > 220) res(); }
      };
    });
    await this.fadeTo(1, 0.9);
    this.upd = null; this.setBig(''); rocket.remove(flameLight);
    this.shake = 0;
    // Dünya'ya son bakış
    this.cam.position.set(0, 0, 0); this.cam.rotation.set(0, 0, 0);
    const e2 = W.makePlanet(120, 0x1f58b8, 0x3f9a4a, { atmo: 0x6fb8ff, seed: 3 }); e2.position.set(-30, -40, -420); this.root.add(e2);
    const sunTmp = this.sun; sunTmp.position.set(60, 40, 40); sunTmp.intensity = 1.6; this.hemi.intensity = 0.5;
    this.upd = (dt) => { e2.rotation.y += dt * 0.05; };
    this.fadeColor = '#000';
    await this.fadeTo(0, 1.2);
    await this.say(HOME.after);
    await this.fadeTo(1, 0.9);
  }

  // ---------- 3) KOKPİT ETABI ----------
  async actLeg(k) {
    const cfg = LEGS[k], dst = PLANETS[Math.min(k, 3)];
    this.reset({ bg: 0x02030a, hemi: [0x8fa0d0, 0x1a1a2a, 0.55], sun: [0xfff0d8, 1.8, [60, 40, 30]], stars: true });
    this.stars.position.set(0, 0, 0);
    const cp = W.makeCockpit(); this.cam.add(cp);
    const planet = W.makePlanet(60, ...(k === 4 ? [0x2a2050, 0x6a5aa8] : dst.planet), { atmo: dst.atmo, ring: dst.ring, seed: 3 + k });
    if (k === 4) planet.visible = false;
    planet.position.set(10, -6, -1500); this.root.add(planet);
    const R = W.rng(100 + k);
    const motes = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xaac8ff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.7 }));
    const mp = new Float32Array(260 * 3); for (let i = 0; i < 260; i++) mp.set([(R() - 0.5) * 80, (R() - 0.5) * 50, -R() * 160 + 10], i * 3);
    motes.geometry.setAttribute('position', new THREE.BufferAttribute(mp, 3)); motes.frustumCulled = false; this.root.add(motes);
    const L = this.L = { cfg, k, ship: { x: 0, y: 0, tx: 0, ty: 0 }, ast: [], bolts: [], fx: [], cool: 0, spawn: 1.2, phase: 'fly', rad: 0, planet, motes, cp, boss: null, bossDone: false, arrive: 0, ri: 0, mp, R };
    this.hull = 5; this.prog = 0; this.mode = 'cockpit'; this.flash = 0;
    this.fadeColor = '#000'; this.fade = 1;
    return new Promise((res, rej) => {
      L.res = res; const tok = this.tok;
      this.upd = (dt) => { if (tok !== this.tok) return rej(CANCEL); this.legStep(dt); };
      this.fadeTo(0, 1.0).catch(() => {});
    });
  }
  legStep(dt) {
    const L = this.L, cfg = L.cfg, sh = L.ship, cam = this.cam;
    // yönlendirme
    sh.tx = clamp(sh.tx + this.input.sx * 0.05 + (this.keyX || 0) * dt * 14, -11, 11); sh.ty = clamp(sh.ty + this.input.sy * 0.05 + (this.keyY || 0) * dt * 10, -7, 7);
    this.input.sx = this.input.sy = 0;
    const px = sh.x, py = sh.y;
    sh.x += (sh.tx - sh.x) * Math.min(1, dt * 5); sh.y += (sh.ty - sh.y) * Math.min(1, dt * 5);
    const vx = (sh.x - px) / Math.max(dt, 0.001), vy = (sh.y - py) / Math.max(dt, 0.001);
    cam.position.set(sh.x, sh.y, 0);
    cam.rotation.set(-vy * 0.012, -vx * 0.01, -vx * 0.02);
    L.cp.userData.star.rotation.z = Math.sin(this.t * 2.2) * 0.12 - vx * 0.03;
    L.cp.userData.screens.forEach((s, i) => { s.material.opacity = 1; s.scale.y = 0.7 + 0.3 * Math.abs(Math.sin(this.t * (1 + i * 0.4))); });
    // hız çizgileri
    const sp = L.phase === 'fly' ? cfg.speed : L.phase === 'arrive' ? Math.max(5, cfg.speed * (1 - L.arrive)) : 6;
    const mp = L.mp; for (let i = 0; i < 260; i++) { let z = mp[i * 3 + 2] + sp * 1.4 * dt; if (z > 12) { z = -150; mp[i * 3] = (L.R() - 0.5) * 80 + sh.x; mp[i * 3 + 1] = (L.R() - 0.5) * 50 + sh.y; } mp[i * 3 + 2] = z; }
    L.motes.geometry.attributes.position.needsUpdate = true;
    // radyo & ilerleme
    if (L.phase === 'fly') {
      const bossHold = cfg.boss && L.boss;
      if (!bossHold) this.prog = Math.min(1, this.prog + dt / cfg.dur);
      while (L.ri < cfg.radios.length && this.prog >= cfg.radios[L.ri][0]) { const r = cfg.radios[L.ri++]; this.radio(r[1], r[2]); }
      L.planet.position.z = -1500 + this.prog * 1180;
      L.planet.rotation.y += dt * 0.03;
      if (cfg.boss && !L.bossDone && !L.boss && this.prog >= cfg.boss) { this.spawnBoss(); }
      L.spawn -= dt;
      if (L.spawn <= 0 && !L.boss && this.prog < 0.98) { this.spawnAst(); L.spawn = (0.7 + L.R() * 0.8) / cfg.rate; }
      if (this.prog >= 1) { L.phase = 'arrive'; L.arrive = 0; this.setBig(''); }
    } else if (L.phase === 'arrive') {
      L.arrive += dt / 7;
      const a = Math.min(1, L.arrive);
      L.planet.position.z = -320 + a * a * 270; L.planet.position.x = 10 * (1 - a); L.planet.position.y = -6 * (1 - a);
      if (a >= 1 && !L.ending) { L.ending = true; this.fadeColor = '#fff'; this.fadeTo(1, 1.2).then(() => { this.upd = null; L.res(); }).catch(() => {}); }
    }
    // ateş
    L.cool -= dt;
    if ((this.input.fire || this.keyFire) && L.cool <= 0 && L.phase === 'fly') { L.cool = 0.17; this.fireBolts(); }
    // kayalar
    for (let i = L.ast.length - 1; i >= 0; i--) {
      const a = L.ast[i]; a.m.position.z += a.vz * dt; a.m.position.x += a.vx * dt; a.m.position.y += a.vy * dt; a.m.rotation.x += a.rx * dt; a.m.rotation.y += a.ry * dt;
      const p = a.m.position;
      if (a.vz > 0 && p.z > -a.r - 1.4 && p.z < a.r + 2 && Math.hypot(p.x - sh.x, p.y - sh.y) < a.r + 1.5) {
        this.hit(a.boss ? 3 : a.r > 2.5 ? 2 : 1); this.burst(p, a, 8); this.root.remove(a.m); L.ast.splice(i, 1); if (a.boss) { L.boss = null; L.bossDone = true; } continue;
      }
      if (p.z > 14) { this.root.remove(a.m); L.ast.splice(i, 1); if (a.boss) { L.boss = null; L.bossDone = true; } }
    }
    // mermiler
    for (let i = L.bolts.length - 1; i >= 0; i--) {
      const b = L.bolts[i]; b.life -= dt; b.m.position.addScaledVector(b.v, dt);
      let gone = b.life <= 0;
      if (!gone) for (let j = 0; j < L.ast.length; j++) {
        const a = L.ast[j];
        if (b.m.position.distanceTo(a.m.position) < a.r + 0.7) { a.hp--; a.flash = 1; gone = true; if (a.hp <= 0) this.breakAst(j); else S.pick(); break; }
      }
      if (gone) { this.root.remove(b.m); L.bolts.splice(i, 1); }
    }
    for (const a of L.ast) if (a.flash > 0) { a.flash -= dt * 5; a.m.material.emissive?.setScalar(Math.max(0, a.flash) * 0.6); }
    // efektler
    for (let i = L.fx.length - 1; i >= 0; i--) { const f = L.fx[i]; f.life -= dt; f.m.position.addScaledVector(f.v, dt); f.m.scale.setScalar(Math.max(0.01, f.life * 1.6)); if (f.life <= 0) { this.root.remove(f.m); L.fx.splice(i, 1); } }
    if (this.hull <= 0) {
      this.hull = 5; this.prog = Math.max(0, this.prog - 0.08); this.radio('Pırıl', 'Kalkan çöktü! Otomatik onarım devrede, geri çekiliyoruz…', 4);
      for (const a of L.ast) this.root.remove(a.m); L.ast.length = 0; L.boss = null; L.spawn = 2.5; this.shake = 1;
      if (cfg.boss && this.prog < cfg.boss) L.bossDone = false;
    }
  }
  spawnAst() {
    const L = this.L, R = L.R, cfg = L.cfg;
    const big = R(), r = big < 0.2 ? 3.6 : big < 0.55 ? 2.0 : 1.1;
    const m = W.makeAsteroid(r, R), aim = R() < 0.55;
    m.position.set(aim ? L.ship.x + (R() - 0.5) * 6 : (R() - 0.5) * 30, aim ? L.ship.y + (R() - 0.5) * 4 : (R() - 0.5) * 18, -170);
    this.root.add(m);
    L.ast.push({ m, r, hp: Math.ceil(r * 0.9), vz: cfg.speed * (0.8 + R() * 0.5), vx: (R() - 0.5) * 1.5, vy: (R() - 0.5) * 1.2, rx: (R() - 0.5) * 1.2, ry: (R() - 0.5) * 1.2 });
  }
  spawnBoss() {
    const L = this.L, m = W.makeAsteroid(9, L.R); m.position.set(0, 0, -240); this.root.add(m);
    const b = { m, r: 9, hp: 26, vz: 11, vx: 0, vy: 0, rx: 0.1, ry: 0.15, boss: true }; L.ast.push(b); L.boss = b; this.setBig('DEV KAYA!'); setTimeout(() => { if (this.big === 'DEV KAYA!') this.setBig(''); }, 2200);
  }
  fireBolts() {
    const L = this.L, sh = L.ship; S.fire();
    let tgt = null, bd = 1e9;
    for (const a of L.ast) { const p = a.m.position; if (p.z < -8 && p.z > -150) { const d = Math.hypot(p.x - sh.x, p.y - sh.y); if (d < a.r + 5 && -p.z < bd) { bd = -p.z; tgt = a; } } }
    for (const sx of [-0.9, 0.9]) {
      const o = new THREE.Vector3(sh.x + sx, sh.y - 0.6, -1);
      const dir = tgt ? tgt.m.position.clone().sub(o).normalize() : new THREE.Vector3(0, 0, -1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.2), W.B(0x7ff0ff)); m.position.copy(o); m.lookAt(o.clone().add(dir)); this.root.add(m);
      L.bolts.push({ m, v: dir.multiplyScalar(170), life: 1.4 });
    }
  }
  breakAst(j) {
    const L = this.L, a = L.ast[j]; this.burst(a.m.position, a, a.boss ? 30 : 10); S.boom();
    if (a.boss) { L.boss = null; L.bossDone = true; this.shake = 1; this.setBig('YOK ETTİN!'); setTimeout(() => this.setBig(''), 1600); }
    else if (a.r > 2.5) for (const s of [-1, 1]) { const m = W.makeAsteroid(1.2, L.R); m.position.copy(a.m.position); this.root.add(m); L.ast.push({ m, r: 1.2, hp: 1, vz: a.vz * 0.9, vx: s * 3.2, vy: (L.R() - 0.5) * 2, rx: 1, ry: 1 }); }
    this.root.remove(a.m); L.ast.splice(j, 1);
  }
  burst(pos, a, n) {
    const L = this.L;
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + Math.random() * 0.4, 0), W.M(i % 3 ? 0x9a8a78 : 0xffb24a, i % 3 ? {} : { emissive: 0x884400 })); m.position.copy(pos); this.root.add(m); L.fx.push({ m, life: 0.6 + Math.random() * 0.6, v: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14 + a.vz * 0.4) }); }
  }
  hit(n) { this.hull -= n; this.shake = 0.7; this.flash = 1; S.bump(); }

  // ---------- 4) GEZEGEN ----------
  async actPlanet(i) {
    const P = PLANETS[i]; const R = W.rng(500 + i);
    await this.fadeTo(1, 0.4);
    this.reset({ bg: P.sky, fog: P.fog, hemi: [P.hemi[0], P.hemi[1], 1.0], sun: [P.sun, 1.5, [40, 60, 25]], stars: P.stars });
    this.stars.position.set(0, 0, 0);
    // zemin
    const gg = new THREE.CircleGeometry(100, 72), gp = gg.attributes.position, gc = new Float32Array(gp.count * 3), c1 = new THREE.Color(P.ground[0]), c2 = new THREE.Color(P.ground[1]), tc = new THREE.Color();
    for (let v = 0; v < gp.count; v++) { const x = gp.getX(v), y = gp.getY(v); const n = (Math.sin(x * 0.23) + Math.sin(y * 0.19) + Math.sin((x + y) * 0.11)) / 3 * 0.5 + 0.5; tc.copy(c1).lerp(c2, n); gc.set([tc.r, tc.g, tc.b], v * 3); }
    gg.setAttribute('color', new THREE.BufferAttribute(gc, 3));
    const ground = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ vertexColors: true })); ground.rotation.x = -Math.PI / 2; this.root.add(ground);
    if (P.prop !== 'station') for (let j = 0; j < 30; j++) { const a = (j / 30) * TAU + R() * 0.2, r = 72 + R() * 22, h = 8 + R() * 16; const hill = new THREE.Mesh(new THREE.ConeGeometry(7 + R() * 7, h, 5), W.M(P.hill)); hill.position.set(Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r); this.root.add(hill); }
    else { const ring = new THREE.Mesh(new THREE.TorusGeometry(62, 0.7, 6, 72), W.B(P.crystal)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; this.root.add(ring); const gd = new THREE.GridHelper(120, 30, P.crystal, 0x3a3a60); gd.position.y = 0.03; gd.material.transparent = true; gd.material.opacity = 0.4; this.root.add(gd); const pl = W.makePlanet(220, ...P.planet, { atmo: P.atmo, ring: true }); pl.position.set(-150, -80, -380); this.root.add(pl); }
    // süsler
    const spots = [], free = (x, z, d) => spots.every(([a, b, r]) => Math.hypot(a - x, b - z) > r + d);
    const place = (n, fn, d = 4) => { for (let t = 0, c = 0; c < n && t < n * 6; t++) { const a = R() * TAU, r = 10 + R() * 48, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x - 4, z - 8) < 5 || !free(x, z, d)) continue; c++; const o = fn(R); o.m.position.set(x, 0, z); this.root.add(o.m); if (o.r) { this.cols.push({ x, z, r: o.r }); } spots.push([x, z, o.r || 1]); } };
    if (P.prop === 'ice') place(40, (R2) => { const h = 2 + R2() * 4, m = new THREE.Mesh(new THREE.ConeGeometry(0.6 + R2() * 0.8, h, 5), new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.85, flatShading: true })); m.position.y = h / 2; const g = new THREE.Group(); g.add(m); return { m: g, r: 0.9 }; });
    else if (P.prop === 'mesa') place(30, (R2) => { const h = 2 + R2() * 6, w = 2 + R2() * 3, m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * (0.7 + R2() * 0.5)), W.M(0xb5683a)); m.position.y = h / 2; m.rotation.y = R2() * 3; const g = new THREE.Group(); g.add(m); return { m: g, r: w * 0.7 }; });
    else if (P.prop === 'forest') place(46, (R2) => { const g = new THREE.Group(), h = 3 + R2() * 4; g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, h, 6), W.M(0x6a4a30)).translateY(h / 2)); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + R2(), 0), W.M(R2() > 0.5 ? 0x2faa5a : 0x50c070)); c.position.y = h + 0.8; g.add(c); if (R2() > 0.6) { const mu = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 5), W.B(0xff8ad8)); mu.position.set(1.4, 0.4, 0.4); g.add(mu); } return { m: g, r: 0.8 }; });
    else place(26, (R2) => { const g = new THREE.Group(), h = 1.5 + R2() * 3; g.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, h, 1.4), W.M(0x3a4060)).translateY(h / 2)); const l = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), W.B(R2() > 0.5 ? P.crystal : 0x7affd8)); l.position.set(0, h * 0.7, 0.71); g.add(l); return { m: g, r: 1 }; });
    // gemi
    const ship = W.makeShip(); ship.position.set(14, 0, -3); ship.rotation.y = -0.5; this.root.add(ship); this.cols.push({ x: 14, z: -3, r: 3 });
    // uzaylılar
    const alien = W.makeAlien(P.alien.type, P.alien.color, P.alien.type === 'korr' ? 1.25 : P.alien.type === 'lumi' ? 1.4 : 1.2); alien.position.set(-8, 0, -14); alien.rotation.y = 0.4; this.root.add(alien); this.cols.push({ x: -8, z: -14, r: 1.5 });
    const minors = P.minors.map((m) => { const a = W.makeAlien(m.type, m.color, m.s * (m.type === 'korr' ? 1.1 : 1)); a.position.set(m.at[0], 0, m.at[1]); a.rotation.y = Math.atan2(4 - m.at[0], 8 - m.at[1]); this.root.add(a); this.cols.push({ x: m.at[0], z: m.at[1], r: 0.9 * m.s + 0.4 }); return { a, m }; });
    // toplanabilir
    const crystals = P.task; let got = 0, stage = 0;
    const spawnPick = (n, fn, y0) => { for (let t = 0, c = 0; c < n && t < 80; t++) { const a = R() * TAU, r = 14 + R() * 42, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!free(x, z, 1.5) || Math.hypot(x - 14, z + 3) < 6) continue; c++; const m = fn(); m.position.set(x, y0, z); this.root.add(m); spots.push([x, z, 1]); this.picks.push({ m, x, z, y0, got: false, kind: n === 3 ? 'c' : 'd' }); } };
    // kristaller
    for (let t = 0, c = 0; c < 3 && t < 80; t++) { const a = R() * TAU, r = 18 + R() * 36, x = Math.cos(a) * r, z = Math.sin(a) * r; if (!free(x, z, 2) || Math.hypot(x - 14, z + 3) < 7) continue; c++; const m = new THREE.Group(); const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), W.B(P.crystal)); o.scale.y = 1.7; m.add(o); const pl = new THREE.PointLight(P.crystal, 25, 10); m.add(pl); m.position.set(x, 1.4, z); m.visible = false; this.root.add(m); spots.push([x, z, 1]); this.picks.push({ m, x, z, y0: 1.4, got: false, active: false, onGet: () => { got++; if (got >= 3) { this.obj = `${P.alien.n}’a dön`; stage = 2; this.radio('Pırıl', `${crystals} tamam. ${P.alien.n} seni bekliyor.`, 4); } else this.obj = `${crystals} (${got}/3)`; if (stage === 1 && got < 3) this.obj = `${crystals} (${got}/3)`; } }); }
    spawnPick(6, () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), W.B(0xfff2a0)), 1.0);
    for (const p of this.picks) if (p.kind === 'd') p.onGet = () => { this.dust++; this.radio('Yıldız tozu', `Yıldız tozu toplandı (${this.dust})`, 1.5); };
    // yazıtlar
    P.tablets.forEach((t) => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6, 0.4), W.M(0x4a4e60)).translateY(1.3)); const rn = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.2), W.B(P.crystal)); rn.position.set(0, 1.5, 0.21); g.add(rn); g.position.set(t.at[0], 0, t.at[1]); this.root.add(g); this.cols.push({ x: t.at[0], z: t.at[1], r: 0.9 }); const u = this.addUse({ x: t.at[0], z: t.at[1], label: 'OKU', r: 2.8, use: async () => { await this.say([['Yazıt', t.text]]); if (!u.read) { u.read = true; this.tabs++; } } }); });
    // etkileşimler
    let leave; const gone = new Promise((r) => (leave = r));
    const eld = this.addUse({ x: -8, z: -14, label: 'KONUŞ', elder: true, r: 4, use: async () => {
      if (stage === 0) {
        await this.say(P.meet);
        const ci = await this.ask(P.choice.q, P.choice.opts); await this.say(P.choice.opts[ci].reply);
        stage = 1; this.obj = `${crystals} (0/3)`; this.picks.forEach((q) => { if (q.active === false) { q.active = true; q.m.visible = true; } });
      } else if (stage === 1) {
        await this.say([[P.alien.n, `${crystals} bulmana yardım edeceğim. Etraftaki parlayan ışıklara bak. ${got}/3.`]]);
      } else if (stage === 2) {
        await this.say(P.ret.slice(0, P.ret.length - 1));
        await this.giveFragment(alien, P);
        await this.say(P.ret.slice(-1));
        stage = 3; eld.off = true; this.obj = 'Gemiye dön'; shipUse.off = false;
      }
    } });
    minors.forEach(({ m }) => this.addUse({ x: m.at[0], z: m.at[1], label: 'KONUŞ', r: 3, use: () => this.say([[m.who, m.line]]) }));
    const shipUse = this.addUse({ x: 14, z: 2, label: 'GEMİYE BİN', r: 5, off: true, use: async () => { await this.say(P.leave); leave(); } });
    this.enterWalk({ x: 4, z: 8, R: 62, astro: true });
    this.cam.position.set(4, this.camOff[1], 8 + this.camOff[2]);
    this.setTitle({ big: P.name, sub: P.sub }); await this.fadeTo(0, 1.0); await this.wait(1.8); this.setTitle(null);
    await this.say(P.arrive); this.cine = false;
    this.obj = `${P.alien.n} ile konuş`;
    await gone; this.obj = '';
    await this.fadeTo(1, 0.8);
  }
  async giveFragment(alien, P) {
    this.busy = true;
    const f = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), W.B(P.shard)); f.scale.y = 1.6; f.position.copy(alien.position).add(new THREE.Vector3(0, 3.2, 0.5)); this.root.add(f);
    const light = new THREE.PointLight(P.shard, 140, 22); f.add(light);
    S.done();
    const me = this.me.position; const a0 = f.position.clone();
    await this.tween(2.4, (k) => { f.rotation.y += 0.12; f.position.y = a0.y + Math.sin(k * 6) * 0.2; });
    await this.tween(1.2, (k) => { f.position.lerpVectors(a0, new THREE.Vector3(me.x, 2.4, me.z), k); f.scale.setScalar(1 - k * 0.5); });
    this.root.remove(f); this.frags++; this.flash = 1; S.done();
    this.radio('Yıldız Parçası', `${this.frags}/4 yıldız parçası toplandı`, 4);
    this.busy = false;
  }

  // ---------- 5) FENER ----------
  async actFinale() {
    this.reset({ bg: 0x02030a, hemi: [0x6a7ab0, 0x1a1a30, 0.5], sun: [0xfff0d8, 1.2, [-40, 50, 60]], stars: true });
    this.stars.position.set(0, 0, 0);
    const mw = W.makeMilkyWay(); this.root.add(mw);
    const ship = W.makeShip(); ship.scale.setScalar(0.55); ship.position.set(0, -8, 62); ship.rotation.y = Math.PI / 2 + Math.PI; this.root.add(ship); // burun -z
    ship.rotation.y = Math.PI / 2;
    const beacon = new THREE.Group(); beacon.position.set(0, 0, -40); this.root.add(beacon);
    const cols = [PLANETS[0].shard, PLANETS[1].shard, PLANETS[2].shard, PLANETS[3].shard];
    const arcs = cols.map((c, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(22, 1.6, 8, 28, Math.PI / 2 - 0.12), W.M(0x2a3040, { emissive: 0x000000 })); m.rotation.z = (i * Math.PI) / 2 + 0.06; beacon.add(m); const slot = new THREE.Mesh(new THREE.OctahedronGeometry(1.5), W.B(0x1a1d28)); const a = (i * Math.PI) / 2 + Math.PI / 4 - 0.06; slot.position.set(Math.cos(a) * 22, Math.sin(a) * 22, 0); beacon.add(slot); return { m, slot, c, a }; });
    const core = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), W.B(0x1a1d28)); beacon.add(core);
    const coreLight = new THREE.PointLight(0xfff2c0, 0, 200); beacon.add(coreLight);
    this.cam.position.set(0, 3, 82); this.cam.lookAt(0, 0, -40); this.mode = 'cine';
    this.upd = (dt) => { beacon.rotation.z += dt * 0.03; ship.position.y = -8 + Math.sin(this.t) * 0.3; };
    this.fadeColor = '#000'; this.fade = 1; await this.fadeTo(0, 1.4);
    await this.say(FINALE.arrive);
    // kamera yaklaşır
    const c0 = this.cam.position.clone();
    await this.tween(3, (k) => { this.cam.position.set(c0.x, c0.y + k * 4, c0.z - k * 24); this.cam.lookAt(0, 0, -40); });
    for (let i = 0; i < 4; i++) {
      const a = arcs[i], f = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), W.B(a.c)); f.scale.y = 1.6; f.position.copy(ship.position).add(new THREE.Vector3(0, 3, 0)); this.root.add(f);
      const from = f.position.clone(), to = new THREE.Vector3(Math.cos(a.a) * 22, Math.sin(a.a) * 22, -40);
      S.pick();
      await this.tween(1.6, (k) => { f.position.lerpVectors(from, to, k * k * (3 - 2 * k)); f.rotation.y += 0.2; f.position.y += Math.sin(k * Math.PI) * 5; });
      this.root.remove(f); a.slot.material.color.set(a.c); a.m.material.emissive.set(a.c).multiplyScalar(0.45); S.done(); this.flash = 0.5;
      await this.wait(0.5);
    }
    await this.say(FINALE.place);
    S.done();
    // fener yanar
    await this.tween(4.5, (k) => { core.material.color.set(0x1a1d28).lerp(new THREE.Color(0xfff4c8), k); coreLight.intensity = k * 600; beacon.scale.setScalar(1 + k * 0.1); mw.material.opacity = k; this.flash = k > 0.85 ? (k - 0.85) * 4 : this.flash; this.stars.material.size = 3.4 + k * 1.6; this.cam.position.y = c0.y + 4 + k * 20; this.cam.lookAt(0, k * 40, -40); this.shake = 0.15 * k; });
    this.shake = 0; this.flash = 1; S.done();
    this.cb.onFlash?.();
    await this.tween(3, (k) => { this.cam.lookAt(0, 40 + k * 60, -40 + k * 30); });
    for (const r of FINALE.radio) { await this.say([r]); }
    await this.say(FINALE.end);
    this.setBig('SON'); await this.wait(3);
  }

  // ---------- döngü ----------
  step(dt) {
    this.t += dt;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const w = this.tweens[i];
      if (w.tok !== this.tok) { this.tweens.splice(i, 1); w.rej(CANCEL); continue; }
      w.t += dt; const k = Math.min(1, w.t / w.d); w.fn?.(k);
      if (k >= 1) { this.tweens.splice(i, 1); w.res(); }
    }
    if (this.upd) this.upd(dt);
    if (this.radioT > 0) { this.radioT -= dt; if (this.radioT <= 0) this.radioMsg = null; }
    if (this.shake > 0) { this.cam.position.x += (Math.random() - 0.5) * this.shake * 0.5; this.cam.position.y += (Math.random() - 0.5) * this.shake * 0.5; this.shake = Math.max(0, this.shake - dt * 1.2); }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.4);
    this.stars.position.copy(this.cam.position);
  }
  hud() {
    const L = this.L;
    return {
      mode: this.mode, obj: this.obj, frags: this.frags, dust: this.dust, fade: this.fade, fadeColor: this.fadeColor, flash: this.flash, big: this.big, title: this.title,
      radio: this.radioMsg, hull: this.hull, prog: this.mode === 'cockpit' ? this.prog : 0, near: this.near && !this.locked ? this.near.label : null, locked: this.locked,
      hint: this.mode === 'cockpit' && L && L.k === 0 && this.prog < 0.25,
    };
  }
  loop() {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now; this.acc += dt;
    let n = 0; while (this.acc >= 1 / 60 && n < 6) { this.step(1 / 60); this.acc -= 1 / 60; n++; }
    if (n === 6) this.acc = 0;
    this.renderer.render(this.scene, this.cam);
    this.hudT += dt; if (this.hudT > 0.07 && this.running) { this.hudT = 0; this.cb.onHud?.(this.hud()); }
    this.raf = requestAnimationFrame(() => this.loop());
  }
  advance(n, dt = 1 / 60) { for (let i = 0; i < n; i++) this.step(dt); }
  setMove(x, y) { this.input.mx = clamp(x, -1, 1); this.input.my = clamp(y, -1, 1); }
  steer(dx, dy) { this.input.sx += dx; this.input.sy -= dy; }
}
