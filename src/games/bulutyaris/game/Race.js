import * as THREE from 'three';
import { buildTrack, buildTrackMesh, trackTextures, HW, STEP, RAMP_N, GAP_N, RAMP_H, angDiff } from './track.js';
import * as S from './sfx.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const LAPS = 3;
export const CAR_COLORS = [0xe5483a, 0x2f7fd8, 0x2fbf71, 0xf2c230, 0x8e6ad8, 0xff8a3d];
const BOT_NAMES = ['Rüzgâr', 'Bulut', 'Yıldırım', 'Fırtına', 'Sis'];
const GRAV = 22, MAXV = 44, NITRO_V = 62;

function makeCar(color) {
  const g = new THREE.Group();
  const M = (c, o) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 4.1), M(color));
  body.position.y = 0.65;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.0), M(color));
  nose.position.set(0, 0.55, 1.9);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.9), M(0x1c2540));
  cab.position.set(0, 1.2, -0.2);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.4, 1.4), M(0x8fd0f5, { emissive: 0x335577 }));
  glass.position.set(0, 1.25, -0.15);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.6), M(0x1c2540));
  wing.position.set(0, 1.35, -2.0);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), M(0x1c2540));
  post.position.set(0, 1.05, -1.9);
  g.add(body, nose, cab, glass, wing, post);
  const wm = M(0x15171f);
  for (const [x, z] of [[-1.05, 1.35], [1.05, 1.35], [-1.05, -1.3], [1.05, -1.3]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.4, 10), wm);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.45, z);
    g.add(w);
  }
  const tl = new THREE.MeshBasicMaterial({ color: 0xff3a3a });
  for (const x of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.1), tl); l.position.set(x, 0.75, -2.07); g.add(l); }
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.1), hl); l.position.set(x, 0.62, 2.42); g.add(l); }
  const fl = new THREE.Group();
  const fm = new THREE.MeshBasicMaterial({ color: 0xffa030 });
  for (const x of [-0.5, 0.5]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.6, 6), fm); c.rotation.x = -Math.PI / 2; c.position.set(x, 0.6, -2.9); fl.add(c); }
  fl.visible = false;
  g.add(fl);
  g.userData.flame = fl;
  return g;
}

export class Race {
  constructor(canvas, cb = {}) {
    this.cv = canvas;
    this.cb = cb;
    this.touch = !!cb.touch;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.touch, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touch ? 1.6 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xcfe8fb, 90, 560);
    this.cam = new THREE.PerspectiveCamera(68, 1, 0.3, 1400);
    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x9fb4d8, 1.35));
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.0);
    sun.position.set(-120, 200, 80);
    this.scene.add(sun);
    this.tr = buildTrack();
    this.buildWorld();
    this.cars = [];
    this.mode = 'menu';
    this.state = 'menu'; // menu | grid | race | done
    this.t = 0;
    this.acc = 0;
    this.input = { steer: 0, nitro: false, brake: false };
    this.hudT = 0;
    this.camYaw = 0;
    this.orbit = 0;
    this.last = performance.now();
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.spawn(CAR_COLORS[0]);
    this.raf = requestAnimationFrame(() => this.loop());
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
  resize() {
    const w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.baseFov = w / h < 1 ? 78 : 66;
    this.cam.updateProjectionMatrix();
  }

  // ---------------- dünya ----------------
  buildWorld() {
    const sc = this.scene;
    // gökyüzü
    const sky = new THREE.SphereGeometry(1100, 24, 16);
    const pos = sky.attributes.position, col = new Float32Array(pos.count * 3);
    const top = new THREE.Color('#2a74d6'), mid = new THREE.Color('#6db8f0'), hor = new THREE.Color('#dff1fd'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = clamp(pos.getY(i) / 1100, -0.2, 1);
      if (t < 0.18) c.copy(hor).lerp(mid, Math.max(0, t) / 0.18); else c.copy(mid).lerp(top, (t - 0.18) / 0.82);
      col.set([c.r, c.g, c.b], i * 3);
    }
    sky.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const sm = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sm.renderOrder = -10;
    sc.add(sm);
    const sunM = new THREE.Mesh(new THREE.CircleGeometry(40, 20), new THREE.MeshBasicMaterial({ color: 0xfff6c9, fog: false }));
    sunM.position.set(-520, 480, 380);
    sunM.lookAt(0, 0, 0);
    sc.add(sunM);
    // bulut zemini (çok aşağıda)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: 0xe9f5ff }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -60;
    sc.add(floor);
    // bulut kümeleri (instanced)
    const N = 420;
    const cg = new THREE.IcosahedronGeometry(1, 1);
    const cm = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x9ab4d0, emissiveIntensity: 0.55 }), N * 4);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), s3 = new THREE.Vector3();
    let k = 0;
    const tr = this.tr;
    for (let i = 0; i < N; i++) {
      let x, z;
      if (i < 200) {
        const j = Math.floor(Math.random() * tr.N), off = (Math.random() < 0.5 ? -1 : 1) * rnd(14, 90);
        x = tr.P[j].x + tr.R[j].x * off; z = tr.P[j].z + tr.R[j].z * off;
      } else { const a = Math.random() * 6.283, r = rnd(430, 1100); x = Math.cos(a) * r - 20; z = Math.sin(a) * r - 120; }
      const y = i < 200 ? rnd(-36, -16) : rnd(-45, -10) + (Math.random() < 0.15 ? rnd(20, 70) : 0);
      const sz = i < 200 ? rnd(6, 13) : rnd(18, 50);
      for (let p = 0; p < 4; p++) {
        ps.set(x + rnd(-sz, sz) * 0.8, y + rnd(-1, 1) * sz * 0.2, z + rnd(-sz, sz) * 0.8);
        const s = sz * rnd(0.55, 1);
        s3.set(s, s * 0.6, s);
        m4.compose(ps, q, s3);
        cm.setMatrixAt(k++, m4);
      }
    }
    sc.add(cm);
    // yüzen adalar
    const grass = new THREE.MeshLambertMaterial({ color: 0x6fc46a, flatShading: true }), rock = new THREE.MeshLambertMaterial({ color: 0x8a7a68, flatShading: true });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * 6.283 + rnd(-0.2, 0.2), r = rnd(160, 420);
      const x = Math.cos(a) * r - 20, z = Math.sin(a) * r - 120, s = rnd(14, 34);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.9, 3, 7), grass);
      const bot = new THREE.Mesh(new THREE.ConeGeometry(s * 0.9, s * 1.1, 7), rock);
      bot.rotation.x = Math.PI;
      top.position.set(x, rnd(-25, 10), z);
      bot.position.set(x, top.position.y - 1.5 - s * 0.55, z);
      sc.add(top, bot);
      for (let t = 0; t < 3; t++) {
        const tree = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 6), new THREE.MeshLambertMaterial({ color: 0x2f8f5a, flatShading: true }));
        tree.position.set(x + rnd(-s * 0.6, s * 0.6), top.position.y + 4.5, z + rnd(-s * 0.6, s * 0.6));
        sc.add(tree);
      }
    }
    // pist
    this.tex = trackTextures();
    sc.add(buildTrackMesh(tr, this.tex));
    // rampa ucu ve start çizgisi
    const gate = (i, color, hgt = 7) => {
      const g = new THREE.Group();
      const m = new THREE.MeshLambertMaterial({ color, flatShading: true });
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, hgt, 0.7), m); p.position.set(tr.P[i].x + tr.R[i].x * s * (HW + 1.6), hgt / 2, tr.P[i].z + tr.R[i].z * s * (HW + 1.6)); g.add(p); }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 3.6, 1.2, 0.7), m);
      bar.position.set(tr.P[i].x, hgt, tr.P[i].z);
      bar.rotation.y = tr.Y[i];
      g.add(bar);
      this.scene.add(g);
      return bar;
    };
    gate(0, 0xf4f6ff, 14);
    // başlama çizgisi
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 1.6), new THREE.MeshBasicMaterial({ map: (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const g = cv.getContext('2d'); for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 4, y * 4, 4, 4); } const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; return t; })() }));
    sl.rotation.x = -Math.PI / 2;
    sl.rotation.z = -tr.Y[0] + Math.PI;
    sl.position.set(tr.P[0].x, 0.05, tr.P[0].z);
    sc.add(sl);
    for (const r of tr.ramps) gate(tr.w(r + 2), 0xf2c230, 15);
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(1.8, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2;
    sc.add(this.blob);
  }

  // ---------------- yarışçılar ----------------
  spawn(playerColor) {
    for (const c of this.cars) this.scene.remove(c.g);
    this.cars = [];
    const tr = this.tr;
    const colors = CAR_COLORS.filter((c) => c !== playerColor);
    const mk = (i, name, isPlayer) => {
      const row = Math.floor(i / 2), side = i % 2 ? 1 : -1;
      const idx = tr.w(tr.N - 4 - row * 3);
      const lane = side * 3.2 + (isPlayer ? 0 : 0);
      const g = makeCar(isPlayer ? playerColor : colors[(i + colors.length - 1) % colors.length]);
      g.rotation.order = 'YXZ';
      this.scene.add(g);
      const car = {
        g, name, isPlayer, idx, lane, startIdx: idx, x: tr.P[idx].x + tr.R[idx].x * lane, z: tr.P[idx].z + tr.R[idx].z * lane, y: 0, vy: 0,
        yaw: tr.Y[idx], speed: 0, air: false, airT: 0, D: idx - tr.N, finished: false, finishT: 0,
        skill: isPlayer ? 0 : 0.86 + Math.random() * 0.2, laneT: lane, steer: 0, fell: 0, lastSafe: idx, padCool: 0,
      };
      this.cars.push(car);
      return car;
    };
    this.player = mk(3, 'Sen', true);
    BOT_NAMES.forEach((n, i) => mk([0, 1, 2, 4, 5][i], n, false));
    this.cars.sort((a, b) => (a === this.player ? -1 : b === this.player ? 1 : 0));
    this.tickCars(0);
  }

  start(color) {
    this.spawn(color);
    this.score = 0;
    this.nitro = 0.5;
    this.airNow = 0;
    this.comboText = '';
    this.comboT = 0;
    this.toastText = '';
    this.toastT = 0;
    this.state = 'grid';
    this.mode = 'play';
    this.gridT = 3.4;
    this.lastBeep = 4;
    this.elapsed = 0;
    this.result = null;
    this.camYaw = this.player.yaw;
    this.snapCam();
    S.unlock();
  }
  toMenu() {
    this.mode = 'menu';
    this.state = 'menu';
    S.engine(0, false, false);
    this.spawn(CAR_COLORS[0]);
  }

  // ---------------- yardımcılar ----------------
  locate(car) {
    const { N, P, R, T, w } = this.tr;
    let bi = car.idx, bd = 1e12;
    for (let k = -8; k <= 16; k++) {
      const i = w(car.idx + k), dx = car.x - P[i].x, dz = car.z - P[i].z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; bi = i; }
    }
    const dx = car.x - P[bi].x, dz = car.z - P[bi].z;
    return { i: bi, d: dx * R[bi].x + dz * R[bi].z, a: dx * T[bi].x + dz * T[bi].z };
  }
  heightAt(i, a) {
    const { kind, H, w } = this.tr;
    if (kind[i] === 2) return null;
    const j = w(a >= 0 ? i + 1 : i - 1);
    if (kind[j] === 2) return H[i];
    return H[i] + (H[j] - H[i]) * clamp(Math.abs(a) / STEP, 0, 1);
  }
  toast(t, s = 1.4) { this.toastText = t; this.toastT = s; }

  // ---------------- fizik ----------------
  stepPlayer(car, dt) {
    const tr = this.tr, inp = this.input;
    const run = this.state === 'race' || this.state === 'done';
    let steer = this.autoSteer !== undefined ? this.autoSteer : inp.steer;
    if (this.state === 'done') steer = this.autoPilotSteer(car);
    car.steer += (steer - car.steer) * Math.min(1, dt * 9);
    const wantNitro = (inp.nitro || this.autoNitro) && this.nitro > 0 && run && this.state !== 'done';
    car.nitroOn = wantNitro;
    if (wantNitro) this.nitro = Math.max(0, this.nitro - dt * 0.3);
    if (car.fell > 0) { car.fell -= dt; this.alignCar(car); return; }
    const loc = this.locate(car);
    car.idx = loc.i;
    if (!car.air) {
      if (run) {
        const max = wantNitro ? NITRO_V : MAXV;
        if (car.speed < max) car.speed += (wantNitro ? 42 : 17 * (1 - car.speed / (MAXV + 6))) * dt;
        else car.speed += (max - car.speed) * Math.min(1, dt * 1.4);
        if (inp.brake) car.speed = Math.max(0, car.speed - 38 * dt);
      } else car.speed = 0;
      const rate = (car.steer * 2.45) / (1 + car.speed * 0.03);
      car.yaw -= rate * dt;
    } else {
      car.yaw -= car.steer * 0.55 * dt;
    }
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    car.x += fx * car.speed * dt;
    car.z += fz * car.speed * dt;
    const l = this.locate(car);
    car.idx = l.i;
    let hgt = this.heightAt(l.i, l.a);
    const onRoad = hgt !== null && Math.abs(l.d) < HW + 1.2;
    const railed = !tr.noRail[l.i] && tr.kind[l.i] === 0;
    if (!car.air) {
      if (onRoad || (railed)) {
        if (Math.abs(l.d) > HW - 0.9 && railed) {
          const lim = HW - 0.9, s = Math.sign(l.d);
          const push = l.d - s * lim;
          car.x -= tr.R[l.i].x * push;
          car.z -= tr.R[l.i].z * push;
          const toward = angDiff(car.yaw, tr.Y[l.i]);
          car.yaw += toward * 0.2;
          if (car.speed > 8) { car.speed *= 1 - 1.4 * dt; if (car.bumpT <= 0 || car.bumpT === undefined) { S.bump(); car.bumpT = 0.25; } }
        }
        car.bumpT = (car.bumpT || 0) - dt;
        const prevY = car.y;
        car.y = hgt === null ? car.y : hgt;
        car.lastSafe = tr.kind[l.i] === 0 ? l.i : car.lastSafe;
        car.slope = (car.y - prevY) / Math.max(dt, 1e-4);
        if (tr.pad[l.i] && Math.abs(l.d) < 4.2 && car.padCool <= 0) { car.speed = Math.min(NITRO_V, car.speed + 12); this.nitro = Math.min(1, this.nitro + 0.15); car.padCool = 1; S.pad(); this.toast('HIZ PLAKASI', 0.8); }
      } else {
        // yoldan çıktı: uçuşa geç
        car.air = true;
        car.airT = 0;
        car.vy = Math.max(car.slope || 0, 0);
      }
      if (hgt !== null && car.y > hgt + 0.2) { car.air = true; car.airT = 0; car.vy = car.slope || 0; }
      if (car.air && !car.airFlag) car.airFlag = true;
    }
    if (car.air) {
      car.airT += dt;
      car.vy -= GRAV * dt;
      car.y += car.vy * dt;
      hgt = this.heightAt(l.i, l.a);
      if (hgt !== null && Math.abs(l.d) < HW + 0.6 && car.vy <= 0 && car.y <= hgt + 0.05 && car.y >= hgt - 0.9) {
        car.air = false;
        car.y = hgt;
        const t = car.airT;
        if (t > 0.45 && car === this.player) {
          const pts = Math.round(t * 120);
          this.score += pts;
          this.nitro = Math.min(1, this.nitro + t * 0.28);
          this.comboText = `HAVADA +${pts}`;
          this.comboT = 1.6;
          S.land(t > 1.1);
        }
        car.airT = 0;
      }
      if (car.y < -34) { this.respawn(car); }
    }
    if (car === this.player && car.air && car.airT > 0.3) this.airNow = car.airT; else if (car === this.player) this.airNow = 0;
    car.padCool -= dt;
  }
  respawn(car) {
    const tr = this.tr;
    const i = tr.w(car.lastSafe - 4);
    car.x = tr.P[i].x; car.z = tr.P[i].z;
    car.yaw = tr.Y[i]; car.speed = 18; car.y = tr.H[i]; car.vy = 0; car.air = false; car.airT = 0; car.fell = 0.6; car.idx = i;
    if (car === this.player) { S.fall(); this.toast('Düştün! Rampaya hızlı gir', 1.6); }
  }
  alignCar(car) {}
  autoPilotSteer(car) {
    const tr = this.tr;
    const ahead = tr.w(car.idx + Math.floor(clamp(car.speed * 0.45, 8, 26) / STEP));
    const tx = tr.P[ahead].x - car.x, tz = tr.P[ahead].z - car.z;
    const want = Math.atan2(tx, tz);
    return clamp(-angDiff(car.yaw, want) * 2.2, -1, 1);
  }

  // yapay zekâ yarışçılar
  stepBot(car, dt) {
    const tr = this.tr, run = this.state === 'race' || this.state === 'done';
    if (!run) { car.speed = 0; return; }
    const i = car.idx;
    let vmax = 44 * car.skill;
    let c = 0;
    for (let k = 0; k < 18; k += 3) c = Math.max(c, tr.cur[tr.w(i + k)]);
    vmax = Math.min(vmax, c > 0.004 ? Math.sqrt(30 / c) : 99);
    for (let k = -6; k < RAMP_N + 10; k++) if (tr.kind[tr.w(i + k)] === 1 && k < RAMP_N) vmax = Math.max(vmax, 37);
    const pd = this.player ? (this.player.D - car.D) : 0;
    if (pd > 60) vmax *= 1.07; else if (pd < -90) vmax *= 0.9;
    vmax = Math.max(vmax, 26);
    if (car.speed < vmax) car.speed += 15 * dt; else car.speed -= 24 * dt;
    // şerit
    if (Math.random() < dt * 0.25) car.laneT = rnd(-4.2, 4.2);
    car.lane += clamp(car.laneT - car.lane, -2.2 * dt, 2.2 * dt);
    car.s = (car.s === undefined ? car.idx : car.s) + (car.speed * dt) / STEP;
    const si = Math.floor(car.s), fr = car.s - si, a = tr.w(si), b = tr.w(si + 1);
    const px = tr.P[a].x + (tr.P[b].x - tr.P[a].x) * fr, pz = tr.P[a].z + (tr.P[b].z - tr.P[a].z) * fr;
    const rx = tr.R[a].x, rz = tr.R[a].z;
    const nx = px + rx * car.lane, nz = pz + rz * car.lane;
    car.yaw = Math.atan2(nx - car.x, nz - car.z) || car.yaw;
    car.x = nx; car.z = nz;
    car.idx = a;
    // yükseklik
    if (tr.kind[a] === 2) {
      let g0 = a; while (tr.kind[tr.w(g0 - 1)] === 2) g0 = tr.w(g0 - 1);
      const u = (((a - g0 + tr.N) % tr.N) + fr) / GAP_N;
      car.y = RAMP_H * (1 - u) + 4 * 1.5 * u * (1 - u);
      car.air = true;
    } else {
      car.y = tr.H[a] + (tr.H[b] - tr.H[a]) * (tr.kind[b] === 2 ? 0 : fr);
      car.air = false;
    }
  }

  tickCars(dt) {
    const tr = this.tr;
    for (const car of this.cars) {
      const before = car.idx;
      if (car.isPlayer) this.stepPlayer(car, dt);
      else this.stepBot(car, dt);
      let dI = car.idx - before;
      if (dI < -tr.N / 2) dI += tr.N; else if (dI > tr.N / 2) dI -= tr.N;
      car.D += dI;
      if (dt > 0 && !car.finished && car.D >= LAPS * tr.N && (this.state === 'race' || this.state === 'done')) {
        car.finished = true;
        car.finishT = this.elapsed;
        if (car.isPlayer) this.finish();
      }
    }
    // çarpışma
    for (let a = 0; a < this.cars.length; a++) for (let b = a + 1; b < this.cars.length; b++) {
      const A = this.cars[a], B = this.cars[b];
      if (Math.abs(A.y - B.y) > 1.6) continue;
      const dx = B.x - A.x, dz = B.z - A.z, d2 = dx * dx + dz * dz;
      if (d2 < 5.2 && d2 > 1e-4) {
        const d = Math.sqrt(d2), push = (2.3 - d) * 0.5;
        const nx = dx / d, nz = dz / d;
        if (A.isPlayer || B.isPlayer) {
          const P = A.isPlayer ? A : B, sg = A.isPlayer ? -1 : 1;
          P.x += nx * push * 2 * sg;
          P.z += nz * push * 2 * sg;
          P.speed *= 0.99;
        } else { A.lane -= nx * 0.02; B.lane += nx * 0.02; }
      }
    }
  }

  finish() {
    this.state = 'done';
    S.done();
    const me = this.player;
    const ahead = this.cars.filter((c) => !c.isPlayer && (c.finished || c.D > me.D)).length;
    this.result = { rank: ahead + 1, total: this.cars.length, time: this.elapsed, score: this.score };
    setTimeout(() => this.cb.onEnd?.(this.result), 1400);
  }

  // ---------------- kamera ----------------
  snapCam() {
    const p = this.player;
    const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
    this.cam.position.set(p.x - fx * 9, p.y + 4.2, p.z - fz * 9);
    this.cam.lookAt(p.x + fx * 10, p.y + 1.3, p.z + fz * 10);
  }
  updateCam(dt) {
    if (this.mode === 'menu') {
      this.orbit += dt * 0.12;
      const tr = this.tr, i = Math.floor(this.orbit * 40) % tr.N;
      const p = tr.P[i], t = tr.T[i];
      this.cam.position.set(p.x - t.x * 20 + tr.R[i].x * 12, 8 + Math.sin(this.orbit * 3) * 1.5, p.z - t.z * 16 + tr.R[i].z * 10);
      this.cam.lookAt(p.x + t.x * 12, 2, p.z + t.z * 12);
      this.cam.fov = 68;
      this.cam.updateProjectionMatrix();
      return;
    }
    const p = this.player;
    this.camYaw += angDiff(this.camYaw, p.yaw) * Math.min(1, dt * (p.air ? 2.2 : 5.5));
    const back = 8.6 + (p.nitroOn ? 1.6 : 0) + (p.speed / MAXV) * 0.8;
    const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
    const target = new THREE.Vector3(p.x - fx * back, p.y + 3.7 + (p.air ? Math.min(2, p.vy * 0.15) : 0), p.z - fz * back);
    this.cam.position.lerp(target, Math.min(1, dt * 9));
    this.cam.lookAt(p.x + fx * 11, p.y + 1.2 + (p.air ? p.vy * 0.12 : 0), p.z + fz * 11);
    const fov = this.baseFov + (p.speed / MAXV) * 8 + (p.nitroOn ? 8 : 0);
    this.cam.fov += (fov - this.cam.fov) * Math.min(1, dt * 4);
    this.cam.updateProjectionMatrix();
  }

  syncMeshes(dt) {
    for (const car of this.cars) {
      car.g.position.set(car.x, car.y, car.z);
      const slope = car.air ? Math.atan2(car.vy || 0, Math.max(car.speed, 8)) : Math.atan2(car.slope || 0, Math.max(car.speed, 8));
      if (car.isPlayer) {
        car.g.rotation.y = car.yaw;
        car.g.rotation.x = -slope * 0.8;
        car.g.rotation.z = car.steer * 0.1;
        car.g.userData.flame.visible = !!car.nitroOn;
        car.g.userData.flame.scale.z = 0.8 + Math.random() * 0.5;
      } else {
        car.g.rotation.y = car.yaw;
        car.g.rotation.x = car.air ? -0.12 : 0;
      }
      if (car.fell > 0) car.g.visible = Math.floor(this.t * 14) % 2 === 0; else car.g.visible = true;
    }
    const p = this.player;
    const l = this.locate(p);
    const h = this.heightAt(l.i, l.a);
    if (h !== null && Math.abs(l.d) < HW + 1.2) { this.blob.visible = true; this.blob.position.set(p.x, h + 0.08, p.z); const k = clamp(1 - (p.y - h) * 0.08, 0.4, 1); this.blob.scale.setScalar(k); } else this.blob.visible = false;
  }

  // ---------------- döngü ----------------
  rank() {
    const sorted = [...this.cars].sort((a, b) => b.D - a.D);
    return sorted.indexOf(this.player) + 1;
  }
  hud() {
    const p = this.player, tr = this.tr;
    const lap = clamp(Math.floor(p.D / tr.N) + 1, 1, LAPS);
    return {
      state: this.state,
      speed: Math.round(p.speed * 3.6),
      rank: this.rank(), total: this.cars.length,
      lap, laps: LAPS,
      nitro: this.nitro,
      nitroOn: !!p.nitroOn,
      combo: this.comboT > 0 ? this.comboText : '',
      air: this.airNow > 0.3 ? Math.round(this.airNow * 120) : 0,
      toast: this.toastT > 0 ? this.toastText : '',
      count: this.state === 'grid' ? Math.max(0, Math.ceil(this.gridT - 0.4)) : -1,
      go: this.state === 'race' && this.elapsed < 1.1,
      time: this.elapsed,
      score: this.score,
    };
  }
  step(dt) {
    this.t += dt;
    if (this.mode === 'menu') {
      this.state = 'menu';
      // menüde botlar sürer
      this.state = 'race';
      for (const c of this.cars) if (!c.isPlayer) this.stepBot(c, dt);
      this.state = 'menu';
      return;
    }
    if (this.state === 'grid') {
      this.gridT -= dt;
      const n = Math.ceil(this.gridT - 0.4);
      if (n !== this.lastBeep && n >= 1) { this.lastBeep = n; S.beep(false); }
      if (this.gridT <= 0.4 && this.lastBeep !== 0) { this.lastBeep = 0; S.beep(true); }
      if (this.gridT <= 0.4) { this.state = 'race'; this.elapsed = 0; }
    } else this.elapsed += dt;
    this.tickCars(dt);
    if (this.comboT > 0) this.comboT -= dt;
    if (this.toastT > 0) this.toastT -= dt;
    S.engine(this.player.speed, this.player.nitroOn, this.state === 'race' || this.state === 'done');
  }
  advance(n, dt = 1 / 60) {
    for (let i = 0; i < n; i++) this.step(dt);
    if (this.mode === 'play') { this.updateCam(dt * n); }
    this.syncMeshes(dt);
  }
  render() {
    this.renderer.render(this.scene, this.cam);
  }
  loop() {
    const now = performance.now();
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let n = 0;
    while (this.acc >= 1 / 60 && n < 6) { this.step(1 / 60); this.acc -= 1 / 60; n++; }
    if (n === 6) this.acc = 0;
    this.updateCam(dt);
    this.syncMeshes(dt);
    this.render();
    this.hudT += dt;
    if (this.hudT > 0.07 && this.mode === 'play') { this.hudT = 0; this.cb.onHud?.(this.hud()); }
    this.raf = requestAnimationFrame(() => this.loop());
  }
  setSteer(v) { this.input.steer = clamp(v, -1, 1); }
  setNitro(v) { this.input.nitro = v; }
  setBrake(v) { this.input.brake = v; }
  names() { return this.cars.map((c) => c.name); }
  standings() { return [...this.cars].sort((a, b) => (b.finished - a.finished) || (a.finished && b.finished ? a.finishT - b.finishT : b.D - a.D)).map((c) => ({ name: c.name, me: c.isPlayer })); }
}
