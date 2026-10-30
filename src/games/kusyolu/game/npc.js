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
    a.timeScale = name === 'walk' || name === 'run' ? 1 : 0.8 + Math.random() * 0.4;
    if (name === 'walk' || name === 'run') a.setLoop(THREE.LoopRepeat, Infinity);
    if (this.action && fade > 0) this.action.crossFadeTo(a, fade, false);
    else if (this.action) this.action.stop();
    this.action = a;
    this.clipName = name;
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
