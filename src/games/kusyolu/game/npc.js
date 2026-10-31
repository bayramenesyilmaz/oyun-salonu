import * as THREE from 'three';

// Ekip arkadaşı: Rocketbox modeli + poz klipleri + başla oyuncuya bakma + göz kırpma + dudak hareketi.
const VISEMES = ['AA_VI_10_aa', 'AA_VI_11_E', 'AA_VI_12_I', 'AA_VI_13_O', 'AA_VI_14_U', 'AA_VI_01_PP', 'AA_VI_02_FF', 'AA_VI_07_SS', 'AA_VI_04_DD', 'AA_VI_08_nn'];

export class NPC {
  constructor(id, gltf, opts = {}) {
    this.id = id;
    this.root = new THREE.Group();
    this.model = gltf.scene;
    this.root.add(this.model);
    this.model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const m = o.material;
        if (m && /opacity/.test(m.name)) {
          m.transparent = false;
          m.alphaTest = 0.45;
          m.side = THREE.DoubleSide;
        }
        if (m) {
          m.envMapIntensity = 0.6;
          if (/head/.test(m.name)) m.roughness = 0.62;
        }
      }
    });
    this.meshes = [];
    this.model.traverse((o) => o.isMesh && o.morphTargetDictionary && this.meshes.push(o));
    this.head = this.model.getObjectByName('Bip01_Head') || this.model.getObjectByName('Bip01 Head');
    this.neck = this.model.getObjectByName('Bip01_Neck') || this.model.getObjectByName('Bip01 Neck');
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name] = c;
    this.action = null;
    this.yOffset = 0;
    this.lookTarget = null;
    this.lookW = 0;
    this.talkAmt = 0;
    this.blinkT = 2 + Math.random() * 3;
    this.blink = 0;
    this.visIdx = 0;
    this.visT = 0;
    this.expr = {};
    this.speaking = false;
    this.play(opts.clip || 'idle', 0);
  }
  play(name, fade = 0.4) {
    const c = this.clips[name];
    if (!c) return;
    const a = this.mixer.clipAction(c);
    if (this.action === a) return;
    a.reset().setLoop(THREE.LoopPingPong, Infinity).play();
    const cyc = /walk|run/.test(name);
    a.timeScale = cyc ? 1 : 0.8 + Math.random() * 0.4;
    if (cyc) a.setLoop(THREE.LoopRepeat, Infinity);
    if (this.action && fade > 0) this.action.crossFadeTo(a, fade, false);
    else if (this.action) this.action.stop();
    this.action = a;
    this.clipName = name;
  }
  // yol boyunca yürü (three koordinatları); bitince done()
  walkTo(points, speed = 1.3, done = null, clip = null) {
    this.path = points.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2])));
    this.speed = speed;
    this.onArrive = done;
    this.play(clip || (this.flash ? 'flashwalk' : speed > 2.5 ? 'run' : 'walk'), 0.3);
  }
  stopWalk(clip) {
    this.path = null;
    this.play(clip || (this.flash ? 'flashlight' : 'idle'), 0.4);
  }
  faceTo(p, instant = false) {
    const d = new THREE.Vector3(p.x - this.root.position.x, 0, p.z - this.root.position.z);
    if (d.lengthSq() < 1e-6) return;
    this.wantYaw = Math.atan2(d.x, d.z);
    if (instant) this.root.rotation.y = this.wantYaw;
  }
  attachFlashlight(fl) {
    this.flash = fl;
    fl.position.set(0.28, 1.22, 0.32);
    fl.rotation.set(-0.12, Math.PI, 0);
    this.root.add(fl);
  }
  updateWalk(dt) {
    if (this.wantYaw !== undefined) {
      let d = this.wantYaw - this.root.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.root.rotation.y += d * Math.min(1, dt * 6);
    }
    if (!this.path || !this.path.length) return;
    const tgt = this.path[0];
    const p = this.root.position;
    const d = new THREE.Vector3(tgt.x - p.x, 0, tgt.z - p.z);
    const L = d.length();
    const step = this.speed * dt;
    if (L <= step) {
      p.x = tgt.x;
      p.z = tgt.z;
      this.path.shift();
      if (!this.path.length) {
        this.path = null;
        this.play(this.flash ? 'flashlight' : 'idle', 0.4);
        const cb = this.onArrive;
        this.onArrive = null;
        cb && cb();
      }
      return;
    }
    d.multiplyScalar(1 / L);
    p.x += d.x * step;
    p.z += d.z * step;
    p.y += (tgt.y - p.y) * Math.min(1, dt * 5);
    this.wantYaw = Math.atan2(d.x, d.z);
  }
  morph(name, v) {
    for (const m of this.meshes) {
      const i = m.morphTargetDictionary[name];
      if (i !== undefined) m.morphTargetInfluences[i] = v;
    }
  }
  setExpr(e) {
    this.expr = e || {};
  }
  update(dt, t, camera, voiceLevel) {
    this.updateWalk(dt);
    this.mixer.update(dt);
    // başı oyuncuya çevir (yumuşak, sınırlı)
    if (this.head && this.lookTarget) {
      const hp = new THREE.Vector3();
      this.head.getWorldPosition(hp);
      const to = this.lookTarget.clone().sub(hp);
      const dist = to.length();
      const yaw = this.root.rotation.y;
      const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const flat = new THREE.Vector3(to.x, 0, to.z).normalize();
      const ang = Math.atan2(fwd.x * flat.z - fwd.z * flat.x, fwd.dot(flat));
      const want = dist < 7 && Math.abs(ang) < 1.6 ? 1 : 0;
      this.lookW += (want - this.lookW) * Math.min(1, dt * 3);
      if (this.lookW > 0.01) {
        const pitch = Math.atan2(to.y, Math.hypot(to.x, to.z));
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch * 0.6 * this.lookW, -ang * 0.7 * this.lookW, 0, 'YXZ'));
        // dünya uzayında döndür, sonra kemik uzayına çevir
        const parentQ = new THREE.Quaternion();
        this.head.parent.getWorldQuaternion(parentQ);
        const worldQ = new THREE.Quaternion();
        this.head.getWorldQuaternion(worldQ);
        const nq = q.multiply(worldQ);
        this.head.quaternion.copy(parentQ.invert().multiply(nq));
      }
    }
    // göz kırpma
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blinkT = 2 + Math.random() * 4;
      this.blink = 1;
    }
    const b = this.blink > 0 ? Math.sin((1 - this.blink) * Math.PI) : 0;
    this.blink = Math.max(0, this.blink - dt * 7);
    this.morph('AK_09_EyeBlinkLeft', b);
    this.morph('AK_10_EyeBlinkRight', b);
    // dudak: konuşurken ses genliğine göre ağız açılır, visemler sırayla değişir
    const target = this.speaking ? Math.min(1, (voiceLevel || 0) * 9 + (this.speakFallback ? 0.35 + 0.35 * Math.sin(t * 17) : 0)) : 0;
    this.talkAmt += (target - this.talkAmt) * Math.min(1, dt * 18);
    this.visT -= dt;
    if (this.visT < 0) {
      this.visT = 0.07 + Math.random() * 0.08;
      this.visIdx = Math.floor(Math.random() * VISEMES.length);
    }
    for (let i = 0; i < VISEMES.length; i++) this.morph(VISEMES[i], i === this.visIdx ? this.talkAmt * 0.85 : 0);
    this.morph('AK_25_JawOpen', this.talkAmt * 0.25 + (this.expr.jaw || 0));
    this.morph('AK_44_MouthSmileLeft', this.expr.smile || 0);
    this.morph('AK_45_MouthSmileRight', this.expr.smile || 0);
    this.morph('AK_03_BrowInnerUp', this.expr.brow || 0);
    this.morph('AK_21_EyeWideLeft', this.expr.wide || 0);
    this.morph('AK_22_EyeWideRight', this.expr.wide || 0);
  }
}
