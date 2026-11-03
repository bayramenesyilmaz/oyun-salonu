import * as THREE from 'three';

// Kemal: Rocketbox modeli (MIT) + taşıma klipleri + semer.
// Denge: yük semerin üstünde gerçek fizikle durur; semerin eğimi (yalpa/yunus) bir "ters sarkaç" gibi davranır.
export class Porter {
  constructor(g, gltf) {
    this.g = g;
    this.root = new THREE.Group();
    g.scene.add(this.root);
    this.model = gltf.scene;
    this.root.add(this.model);
    this.model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        if (/opacity/.test(o.material.name)) {
          o.material.transparent = false;
          o.material.alphaTest = 0.45;
        }
      }
    });
    const B = (n) => this.model.getObjectByName('Bip01_' + n) || this.model.getObjectByName('Bip01 ' + n);
    this.spine = B('Spine1');
    this.head = B('Head');
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name] = c;
    this.play('carry_idle', 0);

    // semer: deri yastık + ahşap çatkı (sırtta)
    const semer = (this.semer = new THREE.Group());
    const leather = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.75 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.85 });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.56), leather);
    pad.position.y = -0.05;
    semer.add(pad);
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.62), wood);
      rail.position.set(s * 0.29, 0.0, 0);
      semer.add(rail);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.02), leather);
      strap.position.set(s * 0.18, -0.25, -0.26);
      strap.rotation.x = 0.35;
      semer.add(strap);
    }
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.05), wood);
    lip.position.set(0, 0.05, 0.3);
    semer.add(lip);
    semer.traverse((o) => o.isMesh && (o.castShadow = true));
    g.scene.add(semer);

    this.pos = this.root.position;
    this.yaw = 0; // 0: -z yönüne bakar
    this.speed = 0;
    this.vel = new THREE.Vector3();
    this.tilt = new THREE.Vector2(); // x: sağa yalpa (+), y: öne eğilme (+)
    this.tiltV = new THREE.Vector2();
    this.stumbleT = 0;
    this.busyT = 0;
    this.lastStep = -1;
    this.gait = 0;
    this.bob = 0;
    this.platform = { p: new THREE.Vector3(), q: new THREE.Quaternion(), v: new THREE.Vector3() };
    this._prevP = null;
    const R = g.R;
    this.semerBody = g.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    g.world.createCollider(R.ColliderDesc.cuboid(0.31, 0.05, 0.3).setTranslation(0, -0.05, 0).setFriction(1.0), this.semerBody);
    // sırttaki kenar: yük geriye kaymasın
    g.world.createCollider(R.ColliderDesc.cuboid(0.31, 0.08, 0.025).setTranslation(0, 0.06, 0.31).setFriction(0.8), this.semerBody);
    this.bodyKin = g.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    g.world.createCollider(R.ColliderDesc.capsule(0.32, 0.26).setTranslation(0, 0.6, 0), this.bodyKin);
  }

  play(name, fade = 0.3, ts = 1) {
    const c = this.clips[name];
    if (!c) return;
    const a = this.mixer.clipAction(c);
    a.timeScale = ts;
    if (this.action === a) return;
    a.reset().play();
    a.setLoop(name === 'stumble' ? THREE.LoopPingPong : THREE.LoopRepeat, Infinity);
    if (this.action && fade > 0) this.action.crossFadeTo(a, fade, false);
    else if (this.action) this.action.stop();
    this.action = a;
    this.clip = name;
  }

  place(x, z, yaw) {
    this.pos.set(x, this.g.heightAt(x, z), z);
    this.yaw = yaw;
    this.speed = 0;
    this.tilt.set(0, 0);
    this.tiltV.set(0, 0);
    this.stumbleT = 0;
    this._prevP = null;
    this.updatePlatform(1 / 60, true);
  }

  forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  // semerin dünya konumu ve dönüşü
  updatePlatform(dt, snap = false) {
    const fw = this.forward();
    const right = new THREE.Vector3(-fw.z, 0, fw.x);
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const qTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-this.tilt.y, 0, -this.tilt.x, 'XYZ'));
    const q = qYaw.multiply(qTilt);
    // eğilmiş sırtın üstü: kalçanın biraz arkası, omuz hizası
    const bob = Math.abs(Math.sin(this.bob)) * 0.03;
    const base = this.pos.clone().add(new THREE.Vector3(0, 1.36 + bob, 0)).addScaledVector(fw, -0.12);
    // eğilme semeri yana ve öne kaydırır
    base.addScaledVector(right, Math.sin(this.tilt.x) * 0.35).addScaledVector(fw, Math.sin(this.tilt.y) * 0.3);
    const P = this.platform;
    if (this._prevP && !snap && dt > 0) P.v.copy(base).sub(this._prevP).divideScalar(dt);
    else P.v.set(0, 0, 0);
    this._prevP = base.clone();
    P.p.copy(base);
    P.q.copy(q);
    this.semerBody.setNextKinematicTranslation(base);
    this.semerBody.setNextKinematicRotation(q);
    if (snap) {
      this.semerBody.setTranslation(base, true);
      this.semerBody.setRotation(q, true);
    }
    this.bodyKin.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
    this.semer.position.copy(base);
    this.semer.quaternion.copy(q);
  }

  // görsel: model, klip ve dengeye göre gövde eğimi
  animate(dt) {
    this.root.rotation.y = this.yaw + Math.PI;
    this.mixer.update(dt);
    if (this.spine) {
      this.spine.updateWorldMatrix(true, false);
      const wq = new THREE.Quaternion();
      this.spine.getWorldQuaternion(wq);
      const fw = this.forward();
      const right = new THREE.Vector3(-fw.z, 0, fw.x);
      const q = new THREE.Quaternion().setFromAxisAngle(fw, -this.tilt.x * 0.7);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(right, -this.tilt.y * 0.5));
      const pq = new THREE.Quaternion();
      this.spine.parent.getWorldQuaternion(pq);
      this.spine.quaternion.copy(pq.invert().multiply(q.multiply(wq)));
    }
  }
}
