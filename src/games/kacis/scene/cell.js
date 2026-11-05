import * as THREE from 'three';
import { makeCellTextures, rng, mat } from './tex.js';
import { buildWorld } from './world.js';
import { createPost } from './postfx.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const glbLoader = new GLTFLoader();
glbLoader.setMeshoptDecoder(MeshoptDecoder);
const glbCache = new Map();
const loadChar = (id) => {
  if (!glbCache.has(id)) glbCache.set(id, glbLoader.loadAsync(`/kusyolu/chars/${id}.glb`));
  return glbCache.get(id);
};

// Taşkale Cezaevi, 1. bölüm: hücre + koridor (görsel prototip).
// Oda: x -2..2, z -1.6..1.6, yükseklik 2.9. Kapı (parmaklık) +z yüzünde; koridor z 1.6..6.

export class CellScene {
  constructor(canvas, { manual = false } = {}) {
    this.cv = canvas;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.r.shadowMap.enabled = true;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 2.0;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#05070a');
    this.scene.fog = new THREE.FogExp2('#0e151c', 0.07);
    this.cam = new THREE.PerspectiveCamera(68, 16 / 9, 0.05, 60);
    this.T = makeCellTextures();
    this.solids = [];
    this.t = 0;
    this.flash = 0;
    this.auto = true;
    this.nextFlash = 2.2;
    this.build();
    this.post = createPost(this.r, this.scene, this.cam);
    this.post.u.uLetterbox.value = 1;
    this._rs = () => this.resize();
    window.addEventListener('resize', this._rs);
    this.resize();
    if (!manual) {
      const loop = (ms) => {
        if (this.dead) return;
        this.update(Math.min(0.05, (ms - (this._l || ms)) / 1000));
        this._l = ms;
        this.render();
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }
  }
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._rs);
    this.r.dispose();
  }
  resize() {
    const pr = Math.min(1.75, window.devicePixelRatio || 1);
    const w = this.cv.clientWidth || 960;
    const h = this.cv.clientHeight || 540;
    this.r.setPixelRatio(pr);
    this.r.setSize(w, h, false);
    this.post.setSize(w, h, pr);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }
  // görünür kutu + aynı boyutta çarpışma
  solidBox(w, h, d, m, x, y, z, shadow = true) {
    this.solids.push([x, y, z, w / 2, h / 2, d / 2]);
    return this.box(w, h, d, m, x, y, z, shadow);
  }
  box(w, h, d, m, x, y, z, shadow = true) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = shadow;
    b.receiveShadow = true;
    this.scene.add(b);
    return b;
  }
  build() {
    const T = this.T;
    const wall = mat(T.wall);
    const floor = mat(T.floor, { roughness: 0.55 });
    const metal = mat(T.metal, { roughness: 0.6, metalness: 0.55 });
    const wood = mat(T.wood);
    const mattress = mat(T.mattress);
    this.mats = { wall, floor };
    const r = rng(5);
    // oda + koridor kabuğu
    this.box(4.2, 0.2, 9, floor, 0, -0.1, 2.2, false); // zemin
    this.box(4.2, 0.2, 9, wall, 0, 3.0, 2.2, false); // tavan
    this.box(0.2, 3.1, 9, wall, -2.1, 1.45, 2.2); // sol duvar
    this.box(0.2, 3.1, 4.2, wall, 2.1, 1.45, -0.1); // sağ duvar (oda)
    this.box(4.2, 3.1, 0.2, wall, 0, 1.45, -1.7); // arka duvar
    // koridor: sağ duvar + karşı hücre duvarı
    this.box(0.2, 3.1, 4.6, wall, 2.1, 1.45, 4.1);
    // koridor sonu: ortada kapı boşluğu, revire açılır
    this.box(3.05, 3.1, 0.2, wall, -2.175, 1.45, 6.8);
    this.box(3.05, 3.1, 0.2, wall, 2.175, 1.45, 6.8);
    this.box(1.3, 0.8, 0.2, wall, 0, 2.6, 6.8);
    // parmaklıklı kapı çerçevesi (z=1.6)
    this.box(4, 0.35, 0.18, metal, 0, 2.8, 1.6);
    this.box(0.35, 2.9, 0.18, metal, -1.9, 1.45, 1.6);
    this.box(0.35, 2.9, 0.18, metal, 1.9, 1.45, 1.6);
    for (let i = 0; i < 17; i++) this.box(0.035, 2.7, 0.035, metal, -1.6 + i * 0.2, 1.4, 1.6, false);
    this.box(3.6, 0.05, 0.06, metal, 0, 1.0, 1.6, false);
    // ranza (iki kat), yatak, battaniye
    this.box(0.9, 0.08, 1.95, wood, -1.5, 0.45, -0.7);
    this.box(0.9, 0.08, 1.95, wood, -1.5, 1.45, -0.7);
    for (const [dx, dz] of [[-0.42, -1.6], [0.42, -1.6], [-0.42, 0.18], [0.42, 0.18]]) this.box(0.06, 1.9, 0.06, metal, -1.5 + dx, 0.95, dz);
    this.box(0.84, 0.12, 1.85, mattress, -1.5, 0.55, -0.7);
    const blanket = this.box(0.84, 0.07, 1.1, mat(T.mattress, { color: '#8a6a50' }), -1.5, 1.56, -0.4);
    blanket.rotation.y = 0.05;
    // tuvalet + lavabo
    this.box(0.4, 0.4, 0.5, mat(T.metal, { color: '#b8bcb8', metalness: 0.2, roughness: 0.35 }), 1.7, 0.2, -1.4);
    this.box(0.38, 0.22, 0.04, mat(T.metal, { color: '#b8bcb8', metalness: 0.2 }), 1.7, 0.95, -1.62);
    // masa ve tabure
    this.box(0.8, 0.05, 0.5, wood, 1.4, 0.75, 0.2);
    this.box(0.05, 0.75, 0.05, metal, 1.05, 0.37, 0.0);
    this.box(0.05, 0.75, 0.05, metal, 1.75, 0.37, 0.0);
    this.box(0.05, 0.75, 0.05, metal, 1.05, 0.37, 0.4);
    this.box(0.05, 0.75, 0.05, metal, 1.75, 0.37, 0.4);
    // masa üstü: kâğıt + gazete
    const paper = this.box(0.28, 0.01, 0.2, mat(T.mattress, { color: '#c9c5b4' }), 1.3, 0.785, 0.2, false);
    paper.rotation.y = 0.4;
    // pencere (arka duvar yüksekte, parmaklıklı)
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshBasicMaterial({ color: '#7fa4c4' }));
    win.position.set(0.2, 2.1, -1.59);
    this.scene.add(win);
    this.win = win;
    for (let i = 0; i < 5; i++) this.box(0.03, 0.56, 0.05, metal, -0.2 + i * 0.1 + 0.1, 2.1, -1.55, false);
    this.box(1.0, 0.06, 0.1, wall, 0.2, 2.38, -1.58, false);
    this.box(1.0, 0.06, 0.1, wall, 0.2, 1.82, -1.58, false);
    // yağmur (pencere dışı)
    const N = 700;
    const pos = new Float32Array(N * 6);
    this.rain = { pos, N };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#9bb7d0', transparent: true, opacity: 0.55, fog: false }));
    this.scene.add(this.rainLines);
    for (let i = 0; i < N; i++) {
      const x = 0.2 + (r() - 0.5) * 1.6, y = 1.5 + r() * 1.5, z = -1.7 - r() * 1.4;
      pos.set([x, y, z, x - 0.01, y - 0.18, z], i * 6);
    }
    // ışıklar
    this.scene.add(new THREE.HemisphereLight('#6f8fb5', '#2a2018', 1.5));
    this.bulb = new THREE.PointLight('#ffb765', 0, 6, 1.6);
    this.bulb.position.set(0, 2.7, 0.2);
    this.bulb.castShadow = true;
    this.bulb.shadow.mapSize.set(512, 512);
    this.scene.add(this.bulb);
    this.storm = new THREE.SpotLight('#a8c8ff', 0, 12, 0.7, 0.7, 1.2);
    this.storm.position.set(0.2, 2.1, -3);
    this.storm.target.position.set(0, 0.2, 1);
    this.storm.castShadow = true;
    this.storm.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.storm, this.storm.target);
    this.moon = new THREE.PointLight('#7d9cc2', 5, 8, 1.4);
    this.moon.position.set(0.2, 2.2, -1.2);
    this.scene.add(this.moon);
    // koridor acil kırmızı ışık (döner)
    this.red = new THREE.PointLight('#ff2a1a', 6, 12, 1.6);
    this.red.position.set(0.2, 2.6, 4.6);
    this.scene.add(this.red);
    // koridor lambası bozuk
    this.lamp = new THREE.PointLight('#d4e6ff', 3, 9, 1.5);
    this.lamp.position.set(-0.6, 2.7, 3.2);
    this.scene.add(this.lamp);
    // gardiyan (siluet) + fener
    this.guard = this.makeGuard('#14181c', 'bekci');
    this.guard.position.set(0.5, 0, 5.2);
    this.scene.add(this.guard);
    this.torch = new THREE.SpotLight('#fff1cf', 7, 14, 0.38, 0.55, 1.2);
    this.torch.castShadow = true;
    this.torch.shadow.mapSize.set(1024, 1024);
    this.torch.position.set(0.5, 1.3, 5.2);
    this.scene.add(this.torch, this.torch.target);
    // toz zerrecikleri
    const M = 320;
    const dp = new Float32Array(M * 3);
    for (let i = 0; i < M; i++) dp.set([(r() - 0.5) * 4, r() * 2.8, -1.5 + r() * 8], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#cfd8e0', size: 0.006, transparent: true, opacity: 0.28, depthWrite: false }));
    this.scene.add(this.dust);
  }
  // oynanış nesneleri: kapı, sütunlar, çıkış kapısı, kaşık
  buildPlay() {
    const T = this.T;
    const wall = this.mats.wall;
    const metal = mat(T.metal, { roughness: 0.6, metalness: 0.55 });
    // hücre kapısı parmaklıkları tek grupta (açılınca yukarı kayar)
    this.door = new THREE.Group();
    const keep = [];
    for (const o of this.scene.children) {
      if (o.isMesh && Math.abs(o.position.z - 1.6) < 0.01 && o.position.y > 0.9 && Math.abs(o.position.x) < 1.85) keep.push(o);
    }
    for (const o of keep) this.door.attach(o);
    this.scene.add(this.door);
    // koridor sütunları (siper)
    this.pillars = [[-1.2, 4.3], [1.25, 5.5]];
    for (const [x, z] of this.pillars) this.box(0.55, 3.0, 0.55, wall, x, 1.5, z);
    // çıkış kapısı + kol
    this.exitDoor = this.box(1.3, 2.3, 0.1, metal, 0, 1.15, 6.7);
    this.box(0.08, 0.5, 0.08, mat(T.metal, { color: '#a02820', metalness: 0.2 }), 0.75, 1.2, 6.6, false);
    // kaşık (masada)
    const sp = new THREE.Group();
    const sm = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.85, roughness: 0.3 });
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.008, 0.02), sm);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), sm);
    bowl.scale.set(1, 0.3, 0.8);
    bowl.position.x = 0.09;
    sp.add(h, bowl);
    sp.position.set(1.5, 0.8, 0.28);
    sp.rotation.y = 0.9;
    this.scene.add(sp);
    this.spoon = sp;
    this.spoonGlow = new THREE.PointLight('#ffe9b0', 0.5, 1.2, 2);
    this.spoonGlow.position.set(1.5, 0.95, 0.28);
    this.scene.add(this.spoonGlow);
    buildWorld(this);
  }
  makeGuard(color = '#14181c', model = null) {
    const g = new THREE.Group();
    const procParts = [];
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const add = (geo, x, y, z, mm = m) => {
      const o = new THREE.Mesh(geo, mm);
      o.position.set(x, y, z);
      o.castShadow = true;
      g.add(o);
      procParts.push(o);
      return o;
    };
    add(new THREE.CapsuleGeometry(0.2, 0.62, 6, 12), 0, 1.22, 0); // gövde
    add(new THREE.CapsuleGeometry(0.075, 0.74, 6, 8), -0.11, 0.42, 0);
    add(new THREE.CapsuleGeometry(0.075, 0.74, 6, 8), 0.11, 0.42, 0);
    add(new THREE.SphereGeometry(0.12, 14, 12), 0, 1.82, 0, new THREE.MeshStandardMaterial({ color: '#2a2520', roughness: 0.8 }));
    add(new THREE.CylinderGeometry(0.135, 0.15, 0.09, 14), 0, 1.93, 0); // kep
    add(new THREE.CapsuleGeometry(0.055, 0.5, 6, 8), -0.29, 1.15, 0.0);
    const arm = add(new THREE.CapsuleGeometry(0.055, 0.5, 6, 8), 0.28, 1.28, 0.2);
    arm.rotation.x = -1.2;
    if (model && !(typeof location !== 'undefined' && location.protocol === 'file:')) this.attachHuman(g, procParts, model);
    return g;
  }
  // gerçek insan modeli (Rocketbox, MIT): yüklenince kapsül gövdenin yerini alır
  attachHuman(g, procParts, id) {
    this.humans = this.humans || [];
    loadChar(id)
      .then((gltf) => {
        const model = cloneSkinned(gltf.scene);
        model.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = true;
          o.receiveShadow = true;
          o.frustumCulled = false;
          const m = o.material;
          if (m && /opacity/.test(m.name)) {
            m.transparent = false;
            m.alphaTest = 0.45;
            m.side = THREE.DoubleSide;
          }
        });
        g.add(model);
        for (const p of procParts) p.visible = false;
        const mixer = new THREE.AnimationMixer(model);
        const clips = {};
        for (const c of gltf.animations) clips[c.name] = c;
        const h = { g, mixer, clips, cur: null, last: g.position.clone(), sp: 0 };
        this.humanPlay(h, 'idle');
        this.humans.push(h);
      })
      .catch((e) => console.warn('insan modeli yüklenemedi', id, e && e.message));
  }
  humanPlay(h, name) {
    const c = h.clips[name] || h.clips.idle;
    if (!c || h.cur === name) return;
    const a = h.mixer.clipAction(c);
    a.reset().play();
    if (/walk|run/.test(name)) a.setLoop(THREE.LoopRepeat, Infinity);
    else a.setLoop(THREE.LoopPingPong, Infinity), (a.timeScale = 0.6);
    if (h.act) h.act.crossFadeTo(a, 0.3, false);
    h.act = a;
    h.cur = name;
  }
  updateHumans(dt) {
    for (const h of this.humans || []) {
      const p = h.g.position;
      const sp = Math.hypot(p.x - h.last.x, p.z - h.last.z) / Math.max(dt, 1e-4);
      h.last.copy(p);
      h.sp += (sp - h.sp) * Math.min(1, dt * 6);
      this.humanPlay(h, h.sp > 0.25 ? (h.sp > 2.2 ? 'run' : 'walk') : h.name || 'idle');
      h.mixer.update(dt);
    }
  }
  update(dt) {
    this.t += dt;
    this.updateHumans(dt);
    const t = this.t;
    // şimşek
    this.nextFlash -= dt;
    if (this.nextFlash < 0) {
      this.flash = 1;
      this.nextFlash = 3.5 + Math.random() * 4;
    }
    this.flash = Math.max(0, this.flash - dt * 2.4);
    const fl = this.flash * (0.6 + 0.4 * Math.sin(t * 80));
    this.storm.intensity = 90 * fl;
    this.win.material.color.set(fl > 0.05 ? '#e8f1ff' : '#1c2a3a');
    // bozuk ampul
    const bz = Math.sin(t * 31) * Math.sin(t * 7.3) > 0.55 ? 1 : 0.0;
    this.bulb.intensity = 3.2 * (0.35 + 0.65 * bz) * (0.7 + Math.random() * 0.3);
    this.lamp.intensity = 1.2 + 3 * (Math.sin(t * 13) > -0.2 ? 1 : 0.1);
    // acil ışık dönüşü
    this.red.intensity = 3 + 7 * Math.max(0, Math.sin(t * 2.6));
    if (this.auto) {
    // gardiyan devriyesi: koridorda gider gelir, fener sağa sola
    const gx = 0.1 + Math.sin(t * 0.35) * 0.9;
    this.guard.position.x = gx;
    this.guard.position.z = 5.2 + Math.sin(t * 0.17) * 0.8;
    this.guard.rotation.y = Math.PI + Math.cos(t * 0.35) * -0.4;
    const tp = this.guard.position;
    this.torch.position.set(tp.x, 1.3, tp.z - 0.2);
    this.torch.target.position.set(tp.x + Math.sin(t * 0.9) * 2.4, 0.6, tp.z - 5);
    }
    // yağmur
    const p = this.rain.pos;
    for (let i = 0; i < this.rain.N; i++) {
      p[i * 6 + 1] -= dt * 9;
      p[i * 6 + 4] -= dt * 9;
      if (p[i * 6 + 1] < 0.6) {
        p[i * 6 + 1] += 3;
        p[i * 6 + 4] += 3;
      }
    }
    this.rainLines.geometry.attributes.position.needsUpdate = true;
    if (this.auto) {
    // kamera: hücrenin içinde, kapıya bakan oyuncu; yavaş bakış + nefes
    const look = Math.sin(t * 0.22);
    this.cam.position.set(0.1 + Math.sin(t * 1.1) * 0.01, 1.58 + Math.sin(t * 1.7) * 0.012, -1.2);
    this.cam.lookAt(0.1 + look * 1.2, 1.3 + Math.sin(t * 0.5) * 0.1, 3);
    }
    this.post.u.uTime.value = t;
  }
  render() {
    this.post.composer.render();
  }
}
