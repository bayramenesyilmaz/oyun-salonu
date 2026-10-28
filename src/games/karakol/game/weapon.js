import * as THREE from 'three';

// Birinci şahıs görünüm modeli (tüfek + dürbün + eller). Ayrı bir sahnede çizilir,
// böylece duvara yaklaşınca silah duvarın içine girmez. Nişan alma, ateş, geri tepme,
// şarjör değiştirme ve ekipman değiştirme animasyonları burada.

const RIFLE = { mag: 30, reserve: 120, rpm: 600, reload: 2.3, dmgBody: 38, dmgHead: 120, hip: 0.032, ads: 0.004 };

function between(a, b, r0, r1, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 10);
  g.translate(0, len / 2, 0);
  const m = new THREE.Mesh(g, material);
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export class Viewmodel {
  constructor(T, gltfRifle = null, gltfBino = null) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(54, 1, 0.01, 10);
    this.T = T;

    // Görünüm modeli ışıkları (ana sahnenin genel aydınlığına göre güncellenir)
    this.hemi = new THREE.HemisphereLight(0x8aa0c0, 0x2a2218, 0.9);
    this.key = new THREE.DirectionalLight(0xb8c8e8, 0.8);
    this.key.position.set(-1, 2, 1);
    this.fill = new THREE.PointLight(0xfff1dc, 0, 2, 1.5); // fener sızıntısı
    this.fill.position.set(0.2, -0.05, -0.6);
    this.flashL = new THREE.PointLight(0xffb060, 0, 3, 1.5);
    this.flashL.position.set(0.05, -0.05, -0.9);
    this.scene.add(this.hemi, this.key, this.fill, this.flashL);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.buildRifle(gltfRifle);
    this.buildBinoculars(gltfBino);

    // durum
    this.equipped = 'rifle';
    this.owned = { rifle: false, binoculars: false };
    this.ammo = RIFLE.mag;
    this.reserve = RIFLE.reserve;
    this.stats = RIFLE;
    this.ads = 0; // 0..1
    this.wantAds = false;
    this.reloading = 0; // kalan süre
    this.switching = 0;
    this.nextFire = 0;
    this.kick = 0;
    this.kickRot = 0;
    this.sway = new THREE.Vector2();
    this.swayVel = new THREE.Vector2();
    this.flashT = 0;
    this.sprintK = 0;
    this.shotsFired = 0;
    this.root.visible = false;
  }

  buildRifle(gltf) {
    const g = (this.rifle = new THREE.Group());
    const poly = new THREE.MeshStandardMaterial({ color: 0x5a5c60, roughness: 0.55, metalness: 0.1 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x7a7d82, roughness: 0.35, metalness: 0.5 });
    const tan = new THREE.MeshStandardMaterial({ color: 0x5e5845, roughness: 0.7 });
    const box = (w, h, d, x, y, z, m = poly, rx = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.rotation.x = rx;
      g.add(mesh);
      return mesh;
    };
    const cyl = (r, len, x, y, z, m = metal, seg = 12) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(x, y, z);
      g.add(mesh);
      return mesh;
    };
    if (gltf) {
      const m = gltf.scene.clone();
      const b = new THREE.Box3().setFromObject(m);
      const len = b.max.z - b.min.z || 0.9;
      m.scale.setScalar(0.9 / len);
      g.add(m);
      this.opticLocal = new THREE.Vector3(0, 0.075, -0.02);
      this.muzzleLocal = new THREE.Vector3(0, 0.01, -0.7);
    } else {
      box(0.05, 0.06, 0.26, 0, 0, 0, metal); // üst gövde
      box(0.046, 0.05, 0.19, 0, -0.05, 0.02); // alt gövde
      box(0.064, 0.066, 0.31, 0, 0.002, -0.285, poly); // el kundağı
      for (let i = 0; i < 9; i++) box(0.068, 0.01, 0.014, 0, 0.002 + (i % 2 ? 0.018 : -0.018), -0.16 - i * 0.03, metal); // havalandırma
      box(0.024, 0.012, 0.52, 0, 0.037, -0.13, metal); // üst ray
      for (let i = 0; i < 16; i++) box(0.028, 0.006, 0.012, 0, 0.045, 0.1 - i * 0.032, metal);
      cyl(0.011, 0.22, 0, 0.004, -0.53); // namlu
      cyl(0.017, 0.07, 0, 0.004, -0.665, poly); // alev gizleyici
      box(0.008, 0.035, 0.012, 0, 0.055, -0.41, metal); // arpacık
      // holografik nişangâh
      box(0.04, 0.018, 0.075, 0, 0.051, -0.02, metal);
      box(0.006, 0.05, 0.07, -0.022, 0.078, -0.02, poly);
      box(0.006, 0.05, 0.07, 0.022, 0.078, -0.02, poly);
      box(0.05, 0.006, 0.075, 0, 0.104, -0.02, poly);
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.038, 0.044),
        new THREE.MeshStandardMaterial({ color: 0x6fa0a0, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.9, depthWrite: false })
      );
      glass.position.set(0, 0.078, -0.035);
      g.add(glass);
      this.reticle = new THREE.Mesh(new THREE.RingGeometry(0.0022, 0.0034, 20), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.95, depthTest: false }));
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0007, 10), this.reticle.material);
      this.reticle.add(dot);
      this.reticle.position.set(0, 0.078, -0.036);
      this.reticle.renderOrder = 10;
      g.add(this.reticle);
      this.opticLocal = new THREE.Vector3(0, 0.078, -0.03);
      // şarjör (kavisli: iki parça)
      this.mag = new THREE.Group();
      const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.09, 0.07), tan);
      m1.position.y = -0.045;
      const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.08, 0.068), tan);
      m2.position.set(0, -0.12, -0.016);
      m2.rotation.x = 0.35;
      this.mag.add(m1, m2);
      this.mag.position.set(0, -0.07, -0.045);
      g.add(this.mag);
      box(0.012, 0.022, 0.05, 0, -0.085, 0.045, metal); // tetik korkuluğu
      const grip = box(0.03, 0.1, 0.045, 0, -0.115, 0.1, poly, -0.32); // kabza
      void grip;
      box(0.032, 0.1, 0.04, 0, -0.08, -0.33, poly, 0.15); // ön kabza
      cyl(0.016, 0.16, 0, -0.005, 0.2, metal); // tampon tüpü
      box(0.042, 0.085, 0.16, 0, -0.025, 0.31, poly); // dipçik
      box(0.044, 0.03, 0.03, 0, -0.06, 0.38, poly); // dipçik pedi
      this.charge = box(0.03, 0.012, 0.03, 0, 0.032, 0.12, metal); // kurma kolu
      // fener (sağ ray)
      cyl(0.014, 0.09, 0.042, -0.004, -0.34, poly);
      this.lampLens = new THREE.Mesh(new THREE.CircleGeometry(0.012, 14), new THREE.MeshBasicMaterial({ color: 0x333333 }));
      this.lampLens.position.set(0.042, -0.004, -0.386);
      this.lampLens.rotation.y = Math.PI;
      g.add(this.lampLens);
      this.muzzleLocal = new THREE.Vector3(0, 0.004, -0.71);
    }
    // namlu alevi
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.T.flash, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.flash.position.copy(this.muzzleLocal).add(new THREE.Vector3(0, 0, -0.04));
    this.flash.scale.setScalar(0.22);
    this.flash.visible = false;
    g.add(this.flash);

    // eller ve kollar
    const glove = new THREE.MeshStandardMaterial({ color: 0x1e1c19, roughness: 0.85 });
    const sleeve = new THREE.MeshStandardMaterial({ map: this.T.camo, roughness: 0.9 });
    const rHand = new THREE.Vector3(0.0, -0.12, 0.1), lHand = new THREE.Vector3(-0.005, -0.1, -0.33);
    g.add(between(new THREE.Vector3(0.2, -0.36, 0.5), new THREE.Vector3(0.03, -0.14, 0.14), 0.05, 0.04, sleeve));
    g.add(between(new THREE.Vector3(-0.24, -0.38, 0.12), new THREE.Vector3(-0.02, -0.12, -0.3), 0.05, 0.038, sleeve));
    const rh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.09), glove);
    rh.position.copy(rHand);
    rh.rotation.x = -0.3;
    const lh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.09), glove);
    lh.position.copy(lHand);
    g.add(rh, lh);

    g.traverse((o) => (o.frustumCulled = false));
    this.root.add(g);
    this.hipPos = new THREE.Vector3(0.17, -0.19, -0.42);
    this.adsPos = new THREE.Vector3(0, 0, -0.24).sub(this.opticLocal);
  }

  buildBinoculars(gltf) {
    const g = (this.bino = new THREE.Group());
    if (gltf) {
      const m = gltf.scene.clone();
      const b = new THREE.Box3().setFromObject(m);
      m.scale.setScalar(0.16 / (b.max.x - b.min.x || 0.16));
      g.add(m);
    } else {
      const rubber = new THREE.MeshStandardMaterial({ color: 0x2c3024, roughness: 0.9 });
      const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.4 });
      for (const s of [-1, 1]) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.13, 16), rubber);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(s * 0.038, 0, 0);
        g.add(tube);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.027, 16), new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 1, roughness: 0.05 }));
        lens.position.set(s * 0.038, 0, -0.066);
        lens.rotation.y = Math.PI;
        g.add(lens);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 14), black);
        cup.rotation.x = Math.PI / 2;
        cup.position.set(s * 0.03, 0.005, 0.075);
        g.add(cup);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.07), black);
      g.add(bridge);
    }
    const glove = new THREE.MeshStandardMaterial({ color: 0x1e1c19, roughness: 0.85 });
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.08), glove);
      h.position.set(s * 0.07, -0.03, 0.01);
      g.add(h);
    }
    g.position.set(0, -0.2, -0.3);
    g.visible = false;
    g.traverse((o) => (o.frustumCulled = false));
    this.root.add(g);
  }

  give(item) {
    this.owned[item] = true;
    if (item === 'rifle') this.root.visible = true;
  }

  equip(item) {
    if (!this.owned[item] || this.equipped === item || this.switching > 0) return false;
    this.switchTo = item;
    this.switching = 0.5;
    this.reloading = 0;
    this.wantAds = false;
    return true;
  }

  canFire(now) {
    return this.equipped === 'rifle' && this.owned.rifle && this.reloading <= 0 && this.switching <= 0 && now >= this.nextFire && this.sprintK < 0.3;
  }

  // Ateş: mermi varsa true. Yayılma (radyan) döner
  fire(now, moving, crouch) {
    if (!this.canFire(now)) return null;
    if (this.ammo <= 0) {
      this.nextFire = now + 0.25;
      return { dry: true };
    }
    this.ammo--;
    this.shotsFired++;
    this.nextFire = now + 60 / this.stats.rpm;
    this.kick = Math.min(1, this.kick + 0.6);
    this.flashT = 0.045;
    this.flash.material.rotation = Math.random() * 6;
    let spread = this.stats.hip + (this.stats.ads - this.stats.hip) * this.ads;
    if (moving) spread *= 1.7;
    if (crouch) spread *= 0.7;
    spread *= 1 + Math.min(1, this.kick) * 0.6;
    return { spread };
  }

  startReload() {
    if (this.reloading > 0 || this.ammo >= this.stats.mag || this.reserve <= 0 || this.equipped !== 'rifle' || this.switching > 0) return false;
    this.reloading = this.stats.reload;
    this.wantAds = false;
    return true;
  }

  // Dünya uzayında namlu ucu (ana kameraya göre yaklaşık)
  muzzleWorld(mainCam, out = new THREE.Vector3()) {
    return out.set(0.12 * (1 - this.ads), -0.08, -0.9).applyMatrix4(mainCam.matrixWorld);
  }

  update(dt, realDt, { moving, sprinting, speed, lampOn, aimHeld, lightLevel }) {
    // ekipman değiştirme
    if (this.switching > 0) {
      this.switching -= dt;
      if (this.switching <= 0.25 && this.switchTo) {
        this.equipped = this.switchTo;
        this.switchTo = null;
      }
    }
    const rifleUp = this.equipped === 'rifle';
    this.rifle.visible = rifleUp;
    this.bino.visible = !rifleUp;

    // şarjör değiştirme
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const need = this.stats.mag - this.ammo;
        const take = Math.min(need, this.reserve);
        this.ammo += take;
        this.reserve -= take;
      }
    }
    this.wantAds = aimHeld && this.reloading <= 0 && this.switching <= 0 && !sprinting;
    this.ads += ((this.wantAds ? 1 : 0) - this.ads) * Math.min(1, dt * 14);
    this.sprintK += ((sprinting ? 1 : 0) - this.sprintK) * Math.min(1, dt * 8);
    this.kick = Math.max(0, this.kick - dt * 9);

    // bakış salınımı (yay)
    this.swayVel.x += (-this.sway.x * 60 - this.swayVel.x * 9) * realDt;
    this.swayVel.y += (-this.sway.y * 60 - this.swayVel.y * 9) * realDt;
    this.sway.x += this.swayVel.x * realDt;
    this.sway.y += this.swayVel.y * realDt;

    const t = performance.now() / 1000;
    const bobAmp = moving ? (sprinting ? 0.022 : 0.009) * (1 - this.ads * 0.85) : 0.0015;
    const bobF = sprinting ? 11 : 8;
    const bx = Math.sin(t * bobF * 0.5) * bobAmp;
    const by = Math.abs(Math.cos(t * bobF * 0.5)) * bobAmp + Math.sin(t * 1.3) * 0.0012;

    const sw = 1 - this.ads * 0.8;
    if (rifleUp) {
      const p = new THREE.Vector3().lerpVectors(this.hipPos, this.adsPos, this.ads);
      // koşu pozu
      p.x += this.sprintK * -0.04;
      p.y += this.sprintK * -0.05;
      p.z += this.sprintK * 0.05;
      p.x += bx + this.sway.x * 0.0004 * sw;
      p.y += by - this.sway.y * 0.0004 * sw;
      p.z += this.kick * 0.035 * (1 - this.ads * 0.5);
      let rx = this.kick * 0.06 * (1 - this.ads * 0.6) - this.sprintK * 0.35;
      let ry = 0.06 * (1 - this.ads) + this.sprintK * 0.7 + this.sway.x * 0.0006 * sw;
      let rz = this.sprintK * 0.3 + this.sway.x * 0.0005 * sw;
      // şarjör animasyonu
      if (this.reloading > 0) {
        const k = 1 - this.reloading / this.stats.reload; // 0..1
        const tilt = Math.sin(Math.min(1, k * 1.1) * Math.PI);
        rz += tilt * 0.55;
        rx += tilt * 0.18;
        p.y -= tilt * 0.04;
        if (this.mag) {
          let my = 0, mv = true;
          if (k > 0.1 && k < 0.35) my = -((k - 0.1) / 0.25) * 0.3;
          else if (k >= 0.35 && k < 0.45) mv = false;
          else if (k >= 0.45 && k < 0.62) my = -(1 - (k - 0.45) / 0.17) * 0.3;
          this.mag.position.y = -0.07 + my;
          this.mag.visible = mv;
        }
        if (this.charge) this.charge.position.z = 0.12 + (k > 0.76 && k < 0.88 ? 0.06 : 0);
      } else if (this.mag) {
        this.mag.position.y = -0.07;
        this.mag.visible = true;
      }
      // ekipman değiştirme: aşağı-yukarı
      if (this.switching > 0) p.y -= Math.sin((this.switching / 0.5) * Math.PI) * 0.3;
      this.rifle.position.copy(p);
      this.rifle.rotation.set(rx, ry, rz);
      this.flash.visible = this.flashT > 0;
      if (this.reticle) this.reticle.visible = this.ads > 0.6;
      if (this.lampLens) this.lampLens.material.color.setHex(lampOn ? 0xfff6e0 : 0x333333);
    } else {
      const p = new THREE.Vector3(0 + bx, -0.2 + by, -0.3);
      if (this.switching > 0) p.y -= Math.sin((this.switching / 0.5) * Math.PI) * 0.3;
      p.y += this.ads * 0.18;
      p.z += this.ads * 0.15;
      this.bino.position.copy(p);
      this.bino.rotation.set(0.1 - this.sprintK * 0.4, this.sway.x * 0.0006, 0);
      this.bino.visible = this.ads < 0.7;
    }
    this.flashT -= dt;
    this.flashL.intensity = this.flashT > 0 ? 6 : 0;
    this.fill.intensity = lampOn ? 0.6 : 0;
    // görünüm modeli aydınlığı çevreye uysun
    this.hemi.intensity = 1.6 + lightLevel * 1.4;
    this.key.intensity = 0.7 + lightLevel * 0.8;
  }

  addLookSway(dx, dy) {
    this.swayVel.x -= dx * 0.5;
    this.swayVel.y -= dy * 0.5;
  }
}
