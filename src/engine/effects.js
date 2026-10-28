import * as THREE from 'three';

// Ölçülü çatışma efektleri: namlu alevi, iz mermisi, toz/kıvılcım, mermi izi, kovan.
// Tümü havuzlanır (yeni nesne üretilmez) ve ölçeklenmiş zamanla (dt) güncellenir.

export class Effects {
  constructor(scene, T) {
    this.scene = scene;
    this.T = T;

    // Namlu ışığı (tek, paylaşılan)
    this.flashLight = new THREE.PointLight(0xffb060, 0, 9, 2);
    scene.add(this.flashLight);
    this.flashT = 0;

    // Dünya namlu alevleri (düşman/ekip)
    this.flashes = [];
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.flash, color: 0xffd8a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.visible = false;
      s.scale.setScalar(0.6);
      scene.add(s);
      this.flashes.push({ s, life: 0 });
    }

    // İz mermileri
    this.tracers = [];
    const tg = new THREE.BoxGeometry(0.02, 0.02, 1);
    tg.translate(0, 0, -0.5);
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xffd090, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      this.tracers.push({ m, from: new THREE.Vector3(), dir: new THREE.Vector3(), dist: 0, pos: 0, speed: 380, len: 3 });
    }

    // Toz / kıvılcım parçacıkları
    this.puffs = [];
    for (let i = 0; i < 48; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.smoke, color: 0x9a8a70, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      scene.add(s);
      this.puffs.push({ s, life: 0, max: 1, vel: new THREE.Vector3(), grow: 1 });
    }
    this.sparks = [];
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.dot, color: 0xffc070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.setScalar(0.05);
      s.visible = false;
      scene.add(s);
      this.sparks.push({ s, life: 0, vel: new THREE.Vector3() });
    }

    // Mermi izleri (decal)
    this.holes = [];
    this.holeIdx = 0;
    const hg = new THREE.PlaneGeometry(0.12, 0.12);
    const hm = new THREE.MeshBasicMaterial({ map: T.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(hg, hm);
      m.visible = false;
      scene.add(m);
      this.holes.push(m);
    }

    // Kovanlar
    this.shells = [];
    const sg = new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6);
    sg.rotateZ(Math.PI / 2);
    const sm = new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(sg, sm);
      m.visible = false;
      scene.add(m);
      this.shells.push({ m, life: 0, vel: new THREE.Vector3(), spin: new THREE.Vector3(), groundY: 0 });
    }
    this.tmp = new THREE.Vector3();
  }

  muzzleLight(pos, strength = 4) {
    this.flashLight.position.copy(pos);
    this.flashLight.intensity = strength;
    this.flashT = 0.05;
  }

  muzzleFlash(pos) {
    const f = this.flashes.find((x) => x.life <= 0) || this.flashes[0];
    f.s.position.copy(pos);
    f.s.material.rotation = Math.random() * 6;
    f.s.visible = true;
    f.life = 0.05;
    this.muzzleLight(pos, 3);
  }

  tracer(from, to) {
    const t = this.tracers.find((x) => !x.m.visible) || this.tracers[0];
    t.from.copy(from);
    t.dir.subVectors(to, from);
    t.dist = t.dir.length();
    t.dir.normalize();
    t.pos = 0;
    t.m.visible = true;
    t.m.lookAt(this.tmp.copy(from).sub(t.dir));
    t.m.position.copy(from);
  }

  impact(point, normal, kind = 'dirt') {
    const n = kind === 'hard' ? 3 : 4;
    for (let i = 0; i < n; i++) {
      const p = this.puffs.find((x) => x.life <= 0);
      if (!p) break;
      p.s.visible = true;
      p.s.position.copy(point).addScaledVector(normal, 0.05);
      p.vel.copy(normal).multiplyScalar(0.6 + Math.random() * 1.2).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.8, (Math.random() - 0.5) * 0.8));
      p.max = p.life = 0.6 + Math.random() * 0.8;
      p.grow = 0.25 + Math.random() * 0.35;
      p.s.scale.setScalar(0.12);
      p.s.material.color.setHex(kind === 'hard' ? 0x8a8478 : 0x8a7658);
    }
    if (kind === 'hard')
      for (let i = 0; i < 5; i++) {
        const s = this.sparks.find((x) => x.life <= 0);
        if (!s) break;
        s.s.visible = true;
        s.s.position.copy(point);
        s.vel.copy(normal).multiplyScalar(2 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4));
        s.life = 0.15 + Math.random() * 0.2;
      }
    // iz
    const h = this.holes[this.holeIdx++ % this.holes.length];
    h.visible = true;
    h.position.copy(point).addScaledVector(normal, 0.01);
    h.lookAt(this.tmp.copy(point).add(normal));
    h.rotateZ(Math.random() * 6);
  }

  // Karakter isabeti: kumaş tozu (kan yok, ölçülü)
  hitPuff(point) {
    for (let i = 0; i < 3; i++) {
      const p = this.puffs.find((x) => x.life <= 0);
      if (!p) break;
      p.s.visible = true;
      p.s.position.copy(point);
      p.vel.set((Math.random() - 0.5) * 1, Math.random() * 0.6, (Math.random() - 0.5) * 1);
      p.max = p.life = 0.4;
      p.grow = 0.3;
      p.s.scale.setScalar(0.1);
      p.s.material.color.setHex(0x55504a);
    }
  }

  dust(point, amount = 6, size = 1) {
    for (let i = 0; i < amount; i++) {
      const p = this.puffs.find((x) => x.life <= 0);
      if (!p) break;
      p.s.visible = true;
      p.s.position.copy(point).add(new THREE.Vector3((Math.random() - 0.5) * size, Math.random() * 0.3, (Math.random() - 0.5) * size));
      p.vel.set((Math.random() - 0.5) * 0.6, 0.2 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6);
      p.max = p.life = 1.2 + Math.random();
      p.grow = 0.6 * size;
      p.s.scale.setScalar(0.3 * size);
      p.s.material.color.setHex(0x7a6c56);
    }
  }

  shell(pos, vel, groundY) {
    const s = this.shells.find((x) => x.life <= 0) || this.shells[0];
    s.m.visible = true;
    s.m.position.copy(pos);
    s.vel.copy(vel);
    s.spin.set(Math.random() * 20, Math.random() * 20, Math.random() * 20);
    s.life = 2.5;
    s.groundY = groundY;
  }

  update(dt) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.flashLight.intensity = 0;
    }
    for (const f of this.flashes) {
      if (f.life <= 0) continue;
      f.life -= dt;
      if (f.life <= 0) f.s.visible = false;
    }
    for (const t of this.tracers) {
      if (!t.m.visible) continue;
      t.pos += t.speed * dt;
      if (t.pos > t.dist) {
        t.m.visible = false;
        continue;
      }
      t.m.position.copy(t.from).addScaledVector(t.dir, Math.min(t.pos + t.len, t.dist));
      t.m.scale.z = Math.min(t.len, t.pos + t.len);
    }
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.s.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(1 - dt * 1.5);
      p.s.scale.addScalar(p.grow * dt);
      const k = p.life / p.max;
      p.s.material.opacity = Math.max(0, k) * 0.55;
      if (p.life <= 0) p.s.visible = false;
    }
    for (const s of this.sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.vel.y -= 9.8 * dt;
      s.s.position.addScaledVector(s.vel, dt);
      if (s.life <= 0) s.s.visible = false;
    }
    for (const s of this.shells) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.m.position.y > s.groundY + 0.01) {
        s.vel.y -= 9.8 * dt;
        s.m.position.addScaledVector(s.vel, dt);
        s.m.rotation.x += s.spin.x * dt;
        s.m.rotation.y += s.spin.y * dt;
      } else {
        s.m.position.y = s.groundY + 0.006;
      }
      if (s.life <= 0) s.m.visible = false;
    }
  }
}
