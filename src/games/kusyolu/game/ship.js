import * as THREE from 'three';
import { V3 } from './util.js';
import { glowTex } from './sky.js';
import { addGlass } from './chapters/ch5.js';

// Leylek: dış gövde + kokpit + koltuktaki mürettebat. Burun -Z, yukarı +Y.
// İki kamera: 'kokpit' (cam arkasından) ve 'dis' (arkadan takip).
export async function makeShip(g, { crew = true } = {}) {
  const ship = new THREE.Group();
  const [lm, km, lg, kg] = await Promise.all([g.json('leylek.json'), g.json('kokpit.json'), g.gltf('leylek.glb'), g.gltf('kokpit.glb')]);
  // dış gövde: burun +X  ->  -Z
  const ext = lg.scene;
  ext.rotation.y = Math.PI / 2;
  ship.add(ext);
  g.tuneMaterials(ext);
  const bells = g.groupNodes(ext, 'bell__').map((o) => {
    if (o.material) {
      o.material = o.material.clone();
      o.material.emissive = new THREE.Color(1, 0.55, 0.2);
    }
    return o;
  });
  // motor alevleri (dış görünüş için)
  const flames = [];
  for (const e of lm.engines) {
    const p = V3(e).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffa060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    s.position.copy(p).add(new THREE.Vector3(0, 0, 0.6));
    s.scale.setScalar(2.5);
    ship.add(s);
    flames.push(s);
  }
  const engineLight = new THREE.PointLight(0xffa060, 0, 30, 2);
  engineLight.position.set(0, 0, 6.5);
  ship.add(engineLight);
  // kokpit
  const rig = new THREE.Group();
  rig.add(kg.scene);
  g.tuneMaterials(kg.scene);
  rig.position.set(0, -1.15, -1.9);
  ship.add(rig);
  addGlass(rig, km.glass);
  const red = new THREE.PointLight(0xff3a20, 2, 4, 2);
  red.position.set(0, 2.2, 1.0);
  const dash = new THREE.PointLight(0x60ffa0, 0.9, 2.2, 2);
  dash.position.set(0, 1.0, -0.6);
  rig.add(red);
  if (crew) {
    const seats = km.seats;
    for (const [id, p] of Object.entries({ elif: seats.copilot, kaan: seats.back0, mert: seats.back1, zeynep: seats.back2 })) {
      const n = await g.loadNPC(id, { p: [p[0], p[1] - 0.85, p[2]], yaw: 180, clip: 'sit' });
      g.scene.remove(n.root);
      rig.add(n.root);
      n.root.rotation.y = Math.PI;
      n.wantYaw = Math.PI;
    }
  }
  const chase = new THREE.Object3D();
  chase.position.set(0, 0, 0);
  ship.add(chase);
  const self = {
    group: ship,
    ext,
    rig,
    chase,
    mode: 'kokpit',
    throttle: 0,
    cockpitEye: V3(km.eye),
    chaseEye: new THREE.Vector3(0, 6.5, 24),
    setMode(m) {
      this.mode = m;
      const inside = m === 'kokpit';
      ext.visible = !inside;
      rig.visible = inside;
      for (const f of flames) f.visible = !inside;
      g.player.seat = inside ? { rig, eye: this.cockpitEye, yawLim: 2.4 } : { rig: chase, eye: this.chaseEye, yawLim: 3.1 };
      g.emit('shipcam', m);
    },
    toggle() {
      this.setMode(this.mode === 'kokpit' ? 'dis' : 'kokpit');
    },
    update(dt, t) {
      const th = this.throttle;
      for (const b of bells) b.material.emissiveIntensity = 1 + th * 9;
      for (const f of flames) {
        f.material.opacity = Math.min(1, th * 1.4);
        f.scale.set(1.6 + th * 2.5, 1.6 + th * 2.5, 1);
      }
      engineLight.intensity = th * 40;
    },
    // bakılan yöne doğru dön (oyuncunun koltuktaki bakış açısını gemiye aktar)
    steer(dt, rate = 0.9) {
      const p = g.player;
      const ky = p.yaw * Math.min(1, dt * rate), kp = p.pitch * Math.min(1, dt * rate);
      ship.rotateY(ky);
      ship.rotateX(kp);
      p.yaw -= ky;
      p.pitch -= kp;
    },
    forward() {
      return new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    },
  };
  self.setMode('kokpit');
  return self;
}
