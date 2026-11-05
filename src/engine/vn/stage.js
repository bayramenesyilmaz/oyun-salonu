import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

// 3B sahne: gerçek insan modelleri (Rocketbox, MIT), ifade/dudak/göz kırpma, oda ve ışık ruh hâlleri.
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
export const loadGLB = (url) => {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
};
const VIS = ['AA_VI_10_aa', 'AA_VI_11_E', 'AA_VI_12_I', 'AA_VI_13_O', 'AA_VI_14_U', 'AA_VI_01_PP', 'AA_VI_02_FF', 'AA_VI_07_SS', 'AA_VI_04_DD', 'AA_VI_08_nn'];
const EXPR = { smile: ['AK_44_MouthSmileLeft', 'AK_45_MouthSmileRight'], brow: ['AK_03_BrowInnerUp'], wide: ['AK_21_EyeWideLeft', 'AK_22_EyeWideRight'], jaw: ['AK_25_JawOpen'] };

function canvasTex(base, v = 22, size = 256, kind = '') {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * 14; i++) {
    const g = (rnd() - 0.5) * v;
    x.fillStyle = g > 0 ? `rgba(255,255,255,${g / 255})` : `rgba(0,0,0,${-g / 255})`;
    x.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 3, 1 + rnd() * 3);
  }
  if (kind === 'plank') {
    x.fillStyle = 'rgba(0,0,0,.35)';
    for (let i = 0; i < 8; i++) x.fillRect(0, (i * size) / 8, size, 2);
    for (let i = 0; i < 8; i++) x.fillRect(((i * 61) % size), (i * size) / 8, 2, size / 8);
  } else if (kind === 'tile') {
    x.fillStyle = 'rgba(0,0,0,.4)';
    for (let i = 0; i < 4; i++) {
      x.fillRect((i * size) / 4, 0, 2, size);
      x.fillRect(0, (i * size) / 4, size, 2);
    }
  } else if (kind === 'paper') {
    x.fillStyle = 'rgba(0,0,0,.06)';
    for (let i = 0; i < size; i += 16) x.fillRect(i, 0, 5, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class Actor {
  constructor(gltf) {
    this.root = new THREE.Group();
    this.model = cloneSkinned(gltf.scene);
    this.root.add(this.model);
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      const m = o.material;
      if (m) {
        if (/opacity/.test(m.name)) {
          m.transparent = false;
          m.alphaTest = 0.45;
          m.side = THREE.DoubleSide;
        }
        m.envMapIntensity = 0.5;
        if (/head/.test(m.name)) m.roughness = 0.6;
      }
    });
    this.meshes = [];
    this.model.traverse((o) => o.isMesh && o.morphTargetDictionary && this.meshes.push(o));
    this.head = this.model.getObjectByName('Bip01_Head') || this.model.getObjectByName('Bip01 Head');
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name] = c;
    this.action = null;
    this.expr = {};
    this.cur = { smile: 0, brow: 0, wide: 0, jaw: 0, fear: 0 };
    this.speaking = false;
    this.talk = 0;
    this.blinkT = 1 + Math.random() * 3;
    this.blink = 0;
    this.visIdx = 0;
    this.visT = 0;
    this.lookW = 0;
    this.lookT = 0;
    this.yaw = 0;
    this.play('idle');
  }
  play(name) {
    const c = this.clips[name] || this.clips.idle || Object.values(this.clips)[0];
    if (!c) return;
    const a = this.mixer.clipAction(c);
    if (this.action === a) return;
    a.reset().setLoop(THREE.LoopPingPong, Infinity).play();
    a.timeScale = 0.55 + Math.random() * 0.25;
    if (this.action) this.action.crossFadeTo(a, 0.45, false);
    this.action = a;
    this.pose = name;
  }
  morph(name, v) {
    for (const m of this.meshes) {
      const i = m.morphTargetDictionary[name];
      if (i !== undefined) m.morphTargetInfluences[i] = v;
    }
  }
  update(dt, t, camPos) {
    this.mixer.update(dt);
    // ifade yumuşatma
    for (const k of ['smile', 'brow', 'wide', 'jaw']) this.cur[k] += ((this.expr[k] || 0) - this.cur[k]) * Math.min(1, dt * 6);
    // başı kameraya/yöne çevir
    if (this.head && this.lookW > 0.01) {
      const hp = new THREE.Vector3();
      this.head.updateWorldMatrix(true, false);
      this.head.getWorldPosition(hp);
      const to = camPos.clone().sub(hp);
      const rq = new THREE.Quaternion();
      this.root.getWorldQuaternion(rq);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(rq);
      fwd.y = 0;
      fwd.normalize();
      const flat = new THREE.Vector3(to.x, 0, to.z).normalize();
      const ang = Math.atan2(fwd.x * flat.z - fwd.z * flat.x, fwd.dot(flat));
      const pitch = Math.atan2(to.y, Math.hypot(to.x, to.z));
      const w = this.lookW;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch * 0.5 * w, -Math.max(-1, Math.min(1, ang)) * 0.75 * w, 0, 'YXZ'));
      const pq = new THREE.Quaternion();
      this.head.parent.getWorldQuaternion(pq);
      const wq = new THREE.Quaternion();
      this.head.getWorldQuaternion(wq);
      this.head.quaternion.copy(pq.invert().multiply(q.multiply(wq)));
    }
    this.lookW += ((this.lookT || 0) - this.lookW) * Math.min(1, dt * 3);
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blinkT = (this.cur.wide > 0.4 ? 5 : 1.8) + Math.random() * 3.5;
      this.blink = 1;
    }
    const b = this.blink > 0 ? Math.sin((1 - this.blink) * Math.PI) : 0;
    this.blink = Math.max(0, this.blink - dt * 7);
    this.morph('AK_09_EyeBlinkLeft', b);
    this.morph('AK_10_EyeBlinkRight', b);
    const tgt = this.speaking ? 0.45 + 0.4 * Math.abs(Math.sin(t * 13 + this.visIdx)) : 0;
    this.talk += (tgt - this.talk) * Math.min(1, dt * 16);
    this.visT -= dt;
    if (this.visT < 0) {
      this.visT = 0.06 + Math.random() * 0.08;
      this.visIdx = Math.floor(Math.random() * VIS.length);
    }
    for (let i = 0; i < VIS.length; i++) this.morph(VIS[i], i === this.visIdx ? this.talk * 0.85 : 0);
    this.morph('AK_25_JawOpen', this.talk * 0.2 + this.cur.jaw);
    for (const k of ['smile', 'brow', 'wide']) for (const n of EXPR[k]) this.morph(n, this.cur[k]);
  }
}

const SLOT = { l: { x: -0.58, yaw: 0.32 }, r: { x: 0.58, yaw: -0.32 }, c: { x: 0, yaw: 0 } };

export class Stage {
  constructor(canvas) {
    this.cv = canvas;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.05;
    this.r.shadowMap.enabled = true;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
    this.hemi = new THREE.HemisphereLight('#8899bb', '#221a14', 0.6);
    this.key = new THREE.SpotLight('#fff0dd', 40, 12, 0.9, 0.6, 1.4);
    this.key.position.set(1.2, 3.2, 3);
    this.key.target.position.set(0, 1.2, 0);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.0004;
    this.rim = new THREE.DirectionalLight('#7aa0ff', 1.2);
    this.rim.position.set(-2, 2.5, -2.5);
    this.lamp = new THREE.PointLight('#ffb060', 0, 6, 2);
    this.scene.add(this.hemi, this.key, this.key.target, this.rim, this.lamp);
    this.room = new THREE.Group();
    this.scene.add(this.room);
    this.actors = {};
    this.slots = { l: null, r: null, c: null };
    this.speaker = null;
    this.t = 0;
    this.shakeV = 0;
    this.zoom = 0;
    this.zoomT = 0;
    this.flick = 0;
    this.mood = null;
    this.fogC = new THREE.Color('#000');
    this.scene.fog = new THREE.FogExp2('#000', 0.05);
    this.camX = 0;
    this.camY = 1.4;
    this.running = false;
    this.glows = [];
    this.dust = null;
    this.resize();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas.parentElement || canvas);
  }
  resize() {
    const p = this.cv.parentElement || this.cv;
    const w = Math.max(2, p.clientWidth), h = Math.max(2, p.clientHeight);
    this.r.setSize(w, h, false);
    this.cv.style.width = '100%';
    this.cv.style.height = '100%';
    this.aspect = w / h;
    this.cam.aspect = this.aspect;
    this.cam.updateProjectionMatrix();
  }
  async ensure(id, url) {
    if (this.actors[id]) return this.actors[id];
    const g = await loadGLB(url);
    const a = new Actor(g);
    a.root.visible = false;
    this.scene.add(a.root);
    this.actors[id] = a;
    return a;
  }
  async setCast(c, urlOf) {
    for (const s of Object.keys(c)) {
      const id = c[s];
      if (id) await this.ensure(id, urlOf(id));
    }
    for (const s of Object.keys(c)) {
      const prev = this.slots[s];
      const id = c[s];
      if (prev && this.actors[prev] && prev !== id) this.actors[prev].root.visible = false;
      this.slots[s] = id || null;
    }
    this.layout();
  }
  layout() {
    const n = ['l', 'r', 'c'].filter((s) => this.slots[s]).length;
    for (const s of ['l', 'r', 'c']) {
      const id = this.slots[s];
      if (!id) continue;
      const a = this.actors[id];
      a.root.visible = true;
      const p = n === 1 ? { x: 0, yaw: s === 'l' ? 0.14 : s === 'r' ? -0.14 : 0 } : SLOT[s];
      a.root.position.set(p.x, 0, 0);
      a.yaw = p.yaw;
      a.root.rotation.y = p.yaw;
    }
  }
  speak(id) {
    this.speaker = id;
    for (const a of Object.values(this.actors)) a.speaking = false;
    if (id && this.actors[id]) this.actors[id].speaking = true;
  }
  pose(id, name, expr) {
    const a = this.actors[id];
    if (!a) return;
    if (name) a.play(name);
    if (expr) a.expr = expr;
    a.lookT = 1;
  }
  slotOf(id) {
    return ['l', 'r', 'c'].find((s) => this.slots[s] === id);
  }
  clearRoom() {
    for (const c of [...this.room.children]) {
      this.room.remove(c);
      c.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && o.material.dispose) o.material.dispose();
      });
    }
    this.glows = [];
    this.dust = null;
  }
  setMood(m) {
    this.mood = m;
    this.clearRoom();
    const bg = new THREE.Color(m.bg || '#0a0d14');
    this.scene.background = bg;
    this.scene.fog.color.copy(bg);
    this.scene.fog.density = m.fog ?? 0.06;
    this.hemi.color.set(m.hemi?.[0] || '#8899bb');
    this.hemi.groundColor.set(m.hemi?.[1] || '#221a14');
    this.hemi.intensity = m.hemi?.[2] ?? 0.6;
    this.key.color.set(m.key?.[0] || '#fff0dd');
    this.key.intensity = m.key?.[1] ?? 40;
    this.rim.color.set(m.rim?.[0] || '#7aa0ff');
    this.rim.intensity = m.rim?.[1] ?? 1.2;
    this.r.toneMappingExposure = m.exp ?? 1.05;
    this.flick = m.flicker || 0;
    const L = m.lamp;
    this.lamp.intensity = L ? L[1] : 0;
    if (L) {
      this.lamp.color.set(L[0]);
      this.lamp.position.set(L[2] ?? 1.2, L[3] ?? 1.9, L[4] ?? -0.6);
    }
    this.baseLamp = this.lamp.intensity;
    this.baseKey = this.key.intensity;
    // oda
    const wall = new THREE.MeshStandardMaterial({ map: canvasTex(m.wall || '#3a3f4a', 22, 256, 'paper'), roughness: 0.95 });
    const floorMat = new THREE.MeshStandardMaterial({ map: canvasTex(m.floor || '#2a2420', 26, 256, m.floorKind || 'plank'), roughness: 0.7 });
    floorMat.map.repeat.set(3, 3);
    wall.map.repeat.set(3, 1.5);
    const add = (geo, mat, x, y, z, ry = 0) => {
      const o = new THREE.Mesh(geo, mat);
      o.position.set(x, y, z);
      o.rotation.y = ry;
      o.castShadow = true;
      o.receiveShadow = true;
      this.room.add(o);
      return o;
    };
    add(new THREE.PlaneGeometry(14, 14), floorMat, 0, 0, -2).rotation.x = -Math.PI / 2;
    if (m.walls !== false) {
      add(new THREE.PlaneGeometry(14, 4), wall, 0, 2, -2.2);
      add(new THREE.PlaneGeometry(10, 4), wall, -3.8, 2, 0, Math.PI / 2);
      add(new THREE.PlaneGeometry(10, 4), wall, 3.8, 2, 0, -Math.PI / 2);
    }
    if (m.ceiling !== false) add(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: m.ceil || '#20242c', roughness: 1 }), 0, 3.1, -2).rotation.x = Math.PI / 2;
    const stdm = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
    for (const p of m.props || []) this.prop(p, add, stdm);
    if (m.dust !== false) {
      const N = 90;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) pos.set([(Math.random() - 0.5) * 5, Math.random() * 2.8, -1.5 + Math.random() * 3.5], i * 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: m.dustColor || '#cfd6e6', size: 0.014, transparent: true, opacity: 0.45, depthWrite: false }));
      this.room.add(this.dust);
    }
    this.camBase = m.cam || {};
  }
  prop(p, add, stdm) {
    const k = p.k;
    const x = p.x ?? 0;
    const z = p.z ?? -1.6;
    if (k === 'window') {
      const c = { moon: '#8fa8d8', day: '#e6d6a8', storm: '#5f6f8c', red: '#a83030', dawn: '#e2a070' }[p.type || 'moon'];
      const pane = add(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshBasicMaterial({ color: c }), x, 1.7, z + 0.58);
      pane.castShadow = false;
      const fr = stdm('#1a1410');
      add(new THREE.BoxGeometry(1.2, 0.06, 0.08), fr, x, 2.46, z + 0.6);
      add(new THREE.BoxGeometry(1.2, 0.06, 0.08), fr, x, 0.96, z + 0.6);
      add(new THREE.BoxGeometry(0.06, 1.56, 0.08), fr, x - 0.57, 1.7, z + 0.6);
      add(new THREE.BoxGeometry(0.06, 1.56, 0.08), fr, x + 0.57, 1.7, z + 0.6);
      add(new THREE.BoxGeometry(0.04, 1.5, 0.06), fr, x, 1.7, z + 0.6);
      add(new THREE.BoxGeometry(1.1, 0.04, 0.06), fr, x, 1.7, z + 0.6);
    } else if (k === 'table') {
      const w = stdm(p.c || '#5a3f2a');
      add(new THREE.BoxGeometry(p.w || 1.6, 0.06, 0.8), w, x, 0.78, z + 0.8);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.BoxGeometry(0.07, 0.78, 0.07), w, x + dx * ((p.w || 1.6) / 2 - 0.08), 0.39, z + 0.8 + dz * 0.34);
    } else if (k === 'cake') {
      const tiers = [[0.34, 0.16, '#f4e6d4'], [0.26, 0.14, '#f2c9d3'], [0.17, 0.12, '#f4e6d4']];
      let y = 0.81;
      for (const [r, h, c] of tiers) {
        add(new THREE.CylinderGeometry(r, r, h, 24), stdm(c, { roughness: 0.6 }), x, y + h / 2, z + 0.8);
        y += h;
      }
      add(new THREE.SphereGeometry(0.03, 8, 8), stdm('#d02040'), x, y + 0.03, z + 0.8);
    } else if (k === 'door') {
      add(new THREE.BoxGeometry(1.1, 2.3, 0.1), stdm(p.c || '#2a1a12'), x, 1.15, z + 0.55);
      add(new THREE.SphereGeometry(0.045, 8, 8), stdm('#c8a24a', { metalness: 0.8, roughness: 0.3 }), x + 0.4, 1.05, z + 0.62);
    } else if (k === 'bars') {
      const b = stdm('#1c1f24', { metalness: 0.7, roughness: 0.4 });
      for (let i = -3; i <= 3; i++) add(new THREE.CylinderGeometry(0.025, 0.025, 3, 6), b, x + i * 0.18, 1.5, z + 0.9);
      add(new THREE.BoxGeometry(1.4, 0.05, 0.05), b, x, 2.2, z + 0.9);
      add(new THREE.BoxGeometry(1.4, 0.05, 0.05), b, x, 0.6, z + 0.9);
    } else if (k === 'shelf') {
      const w = stdm(p.c || '#4a3424');
      add(new THREE.BoxGeometry(1.4, 2.2, 0.35), w, x, 1.1, z + 0.2);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) add(new THREE.BoxGeometry(0.12 + Math.random() * 0.1, 0.22, 0.2), stdm(['#6a2a2a', '#2a4a6a', '#5a5a2a', '#3a3a3a', '#7a5a3a'][(i + j) % 5]), x - 0.5 + j * 0.3 + Math.random() * 0.05, 0.3 + i * 0.42, z + 0.36);
    } else if (k === 'bed') {
      add(new THREE.BoxGeometry(1.0, 0.35, 2), stdm('#2a3038', { metalness: 0.3 }), x, 0.3, z + 0.6);
      add(new THREE.BoxGeometry(0.92, 0.12, 1.9), stdm(p.c || '#cfd6d4', { roughness: 1 }), x, 0.54, z + 0.6);
      add(new THREE.BoxGeometry(0.5, 0.1, 0.3), stdm('#e8ecec'), x, 0.64, z - 0.2);
    } else if (k === 'lamp') {
      add(new THREE.CylinderGeometry(0.02, 0.02, p.h || 1.6, 6), stdm('#222'), x, (p.h || 1.6) / 2, z + 0.4);
      const bulb = add(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: p.c || '#ffd9a0' }), x, p.h || 1.6, z + 0.4);
      bulb.castShadow = false;
      bulb.userData.base = new THREE.Color(p.c || '#ffd9a0');
      this.glows.push(bulb);
    } else if (k === 'curtain') {
      const c = stdm(p.c || '#5a1f2a', { roughness: 1, side: 2 });
      for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.2, 3, 0.06), c, x + i * 0.2 - 0.4, 1.5, z + 0.5 + (i % 2) * 0.05);
    } else if (k === 'frame') {
      add(new THREE.BoxGeometry(0.6, 0.8, 0.04), stdm('#1a1008'), x, p.y ?? 1.9, z + 0.58);
      add(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ color: p.c || '#8a8070', roughness: 1 }), x, p.y ?? 1.9, z + 0.61);
    } else if (k === 'box') {
      add(new THREE.BoxGeometry(p.w || 0.5, p.h || 0.5, p.d || 0.5), stdm(p.c || '#6a5a40'), x, (p.h || 0.5) / 2, z + (p.dz || 0.8));
    } else if (k === 'neon') {
      const n = add(new THREE.BoxGeometry(p.w || 1.2, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: p.c || '#ff3050' }), x, p.y ?? 2.3, z + 0.6);
      n.castShadow = false;
      n.userData.base = new THREE.Color(p.c || '#ff3050');
      this.glows.push(n);
    }
  }
  fx(name) {
    if (name === 'shake') this.shakeV = 0.14;
    else if (name === 'bigshake') this.shakeV = 0.3;
    else if (name === 'push') this.zoomT = 0.55;
    else if (name === 'pull') this.zoomT = 0;
    else if (name === 'blackout') this.blackout = 1;
    else if (name === 'lights') this.blackout = 0;
  }
  update(dt) {
    this.t += dt;
    const t = this.t;
    // ışık titremesi
    let k = 1;
    if (this.flick > 0) k = Math.random() < this.flick * dt * 6 ? 0.15 + Math.random() * 0.5 : this.fk || 1;
    this.fk = k + (1 - k) * Math.min(1, dt * 10);
    let b = this.blackout === 1 ? 0.04 : 1;
    this.kb = (this.kb ?? 1) + (b - (this.kb ?? 1)) * Math.min(1, dt * 12);
    this.key.intensity = (this.baseKey ?? 40) * this.fk * this.kb;
    this.lamp.intensity = (this.baseLamp || 0) * (0.92 + 0.08 * Math.sin(t * 9) + (Math.random() - 0.5) * 0.05) * this.fk * this.kb;
    this.hemi.intensity = (this.mood?.hemi?.[2] ?? 0.6) * (0.35 + 0.65 * this.kb);
    // kamera
    this.zoom += (this.zoomT - this.zoom) * Math.min(1, dt * 1.6);
    this.shakeV *= Math.pow(0.02, dt);
    const sp = this.speaker ? this.slotOf(this.speaker) : null;
    const portrait = this.aspect < 1.1;
    let tx = this.lastTx || 0;
    if (sp) tx = this.actors[this.speaker].root.position.x;
    else if (['l', 'r', 'c'].filter((q) => this.slots[q]).length === 1) tx = 0;
    else if (this.speaker === null && this.noSpeakerCenter) tx = 0;
    this.lastTx = tx;
    const pan = portrait ? 1 : 0.22;
    this.camX += (tx * pan - this.camX) * Math.min(1, dt * 2.8);
    const cb = this.camBase || {};
    const need = portrait ? 1.35 : 1.9;
    const hfovT = Math.tan((this.cam.fov * Math.PI) / 360) * this.aspect;
    let dist = Math.max(cb.d || 2.35, need / (2 * hfovT));
    dist -= this.zoom * 0.55;
    const sx = (Math.random() - 0.5) * this.shakeV, sy = (Math.random() - 0.5) * this.shakeV;
    this.cam.position.set(this.camX + Math.sin(t * 0.3) * 0.03 + sx, (cb.y || 1.42) + Math.sin(t * 0.45) * 0.015 + sy, dist);
    this.cam.lookAt(this.camX * 0.85, (cb.ly || 1.3) - this.zoom * 0.05, 0);
    for (const a of Object.values(this.actors)) {
      if (!a.root.visible) continue;
      a.update(dt, t, this.cam.position);
      // konuşan/dinleyen bakışı: kameraya bak
      a.lookT = 1;
    }
    for (const g of this.glows) g.material.color.copy(g.userData.base).multiplyScalar((0.82 + 0.18 * Math.sin(t * 7 + g.id)) * this.kb);
    if (this.dust) this.dust.rotation.y = Math.sin(t * 0.05) * 0.1;
  }
  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      this.r.render(this.scene, this.cam);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  dispose() {
    this.stop();
    this._ro && this._ro.disconnect();
    this.clearRoom();
    this.r.dispose();
  }
}
