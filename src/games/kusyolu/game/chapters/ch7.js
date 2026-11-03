import * as THREE from 'three';
import { CHAPTER7 as C7 } from '../story.js';
import { makeShip } from '../ship.js';
import { makeKor } from '../props.js';
import { glowTex } from '../sky.js';

const G = 1.62; // Ay yerçekimi (m/s²)
const SIZE = 3200, SEG = 200;
const ZONE = new THREE.Vector3(0, 0, 0); // iniş bölgesi
const MONO = new THREE.Vector3(30, 0, -170); // sinyal kaynağı

// ---- arazi: kraterler + gürültü ----
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let s = 0, a = 1, f = 1;
  for (let i = 0; i < 5; i++) {
    s += (vnoise(x * f, y * f) - 0.5) * a;
    a *= 0.5;
    f *= 2.03;
  }
  return s;
}
const CRATERS = (() => {
  const out = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const r = 8 + Math.pow(rnd(), 3) * 220;
    const x = (rnd() - 0.5) * SIZE * 0.95, z = (rnd() - 0.5) * SIZE * 0.95;
    if (Math.hypot(x - ZONE.x, z - ZONE.z) < r + 70) continue; // iniş bölgesi düz kalsın
    if (Math.hypot(x - MONO.x, z - MONO.z) < r + 25) continue;
    out.push([x, z, r, 0.18 + rnd() * 0.12]);
  }
  out.push([MONO.x, MONO.z - 80, 60, 0.22]); // sinyalin arkasındaki büyük krater
  return out;
})();
export function heightAt(x, z) {
  let h = fbm(x * 0.004, z * 0.004) * 26 + fbm(x * 0.03, z * 0.03) * 2.2;
  for (const [cx, cz, r, depth] of CRATERS) {
    const d = Math.hypot(x - cx, z - cz) / r;
    if (d > 1.6) continue;
    if (d < 1) h += (d * d - 1) * r * depth + r * depth * 0.18;
    else h += Math.exp(-((d - 1) * (d - 1)) / 0.06) * r * depth * 0.22;
  }
  // iniş bölgesi ve yürüme yolu: hafif düzleştir
  const dz = Math.hypot(x - ZONE.x, z - ZONE.z);
  if (dz < 80) h *= THREE.MathUtils.smoothstep(dz, 30, 80);
  return h;
}

function regolithTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  const img = x.createImageData(512, 512);
  for (let j = 0; j < 512; j++)
    for (let i = 0; i < 512; i++) {
      const n = fbm(i * 0.05, j * 0.05) * 0.6 + (hash(i, j) - 0.5) * 0.35;
      const v = Math.max(0, Math.min(255, 128 + n * 110));
      const k = (j * 512 + i) * 4;
      img.data[k] = img.data[k + 1] = v;
      img.data[k + 2] = v * 0.97;
      img.data[k + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(160, 160);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Chapter7 {
  constructor(g) {
    this.g = g;
    this.stage = 'load';
    this.fuel = 100;
    this.noSpaceSkip = true;
  }
  async load() {
    const g = this.g;
    g.clearLevel();
    await g.loadEnv();
    g.progress(0.1, 'Fizik');
    const RAPIER = (this.R = (await import('@dimforge/rapier3d-compat')).default);
    await RAPIER.init();
    g.progress(0.25, 'Ay yüzeyi');
    const s = g.scene;
    s.background = new THREE.Color(0x000000);
    g.camera.near = 0.08;
    g.camera.far = 60000;
    g.camera.updateProjectionMatrix();
    // alçak güneş: uzun gölgeler
    const sunDir = new THREE.Vector3(-0.75, 0.22, -0.45).normalize();
    const sun = (this.sun = new THREE.DirectionalLight(0xfff4e6, 4.2));
    sun.position.copy(sunDir).multiplyScalar(300);
    sun.castShadow = true;
    sun.shadow.mapSize.set(g.low ? 1024 : 2048, g.low ? 1024 : 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -70;
    sc.right = sc.top = 70;
    sc.near = 10;
    sc.far = 700;
    sun.shadow.bias = -0.0004;
    s.add(sun, sun.target);
    const amb = new THREE.HemisphereLight(0x2a3550, 0x0a0a0a, 0.08);
    s.add(amb);
    g.hemi = amb;
    g.hemiBase = 0.08;
    s.environment = g.envTex;
    s.environmentIntensity = 0.05;
    // arazi
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position;
    const colors = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i);
      const h = heightAt(x, z);
      P.setY(i, h);
      const v = 0.52 + fbm(x * 0.01 + 9, z * 0.01) * 0.25;
      colors.set([v, v, v * 0.97], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const tex = regolithTexture();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 1, metalness: 0, bumpMap: tex, bumpScale: 1.2 }));
    ground.receiveShadow = true;
    s.add(ground);
    // kayalar (Poly Haven CC0 Ay kayaları)
    const rocks = await Promise.all(['moon/rock01.glb', 'moon/rock02.glb', 'moon/rock03.glb'].map((f) => g.gltf(f)));
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const r of rocks) {
      let mesh = null;
      r.scene.traverse((o) => o.isMesh && !mesh && (mesh = o));
      if (!mesh) continue;
      const n = g.low ? 90 : 180;
      const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, n);
      inst.castShadow = inst.receiveShadow = true;
      const m = new THREE.Matrix4();
      for (let i = 0; i < n; i++) {
        let x, z;
        do {
          x = (rnd() - 0.5) * 900;
          z = (rnd() - 0.5) * 900;
        } while (Math.hypot(x - ZONE.x, z - ZONE.z) < 45 || Math.hypot(x - MONO.x, z - MONO.z) < 12);
        const sc = 0.4 + Math.pow(rnd(), 4) * 6;
        m.compose(new THREE.Vector3(x, heightAt(x, z) - sc * 0.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 6, rnd() * 3)), new THREE.Vector3(sc, sc * (0.6 + rnd() * 0.5), sc));
        inst.setMatrixAt(i, m);
      }
      s.add(inst);
    }
    // gökyüzünde Dünya (ufkun üstünde)
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial({ map: g.tex('space/earth.jpg'), roughness: 0.8, emissive: new THREE.Color(0x0a1a33), emissiveIntensity: 0.3 }));
    earth.scale.setScalar(450);
    earth.position.set(0.35, 0.42, 0.84).normalize().multiplyScalar(13500);
    s.add(earth);
    const N = 5000, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection();
      v.y = Math.abs(v.y) * 0.9 + 0.05;
      v.normalize().multiplyScalar(40000);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, color: 0xe8ecff, depthWrite: false }));
    s.add(this.stars);
    // iniş bölgesi işareti
    const ring = new THREE.Mesh(new THREE.RingGeometry(14, 15.5, 64), new THREE.MeshBasicMaterial({ color: 0x8ff0d6, transparent: true, opacity: 0.5, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ZONE.x, heightAt(ZONE.x, ZONE.z) + 0.15, ZONE.z);
    s.add(ring);
    this.ring = ring;
    // sinyal: içi boş dev Kor parçası
    const mono = makeKor();
    mono.scale.set(5, 7, 5);
    mono.traverse((o) => {
      if (o.isSprite) {
        o.material.opacity = 0.25;
        o.scale.multiplyScalar(0.35);
      }
    });
    mono.position.set(MONO.x, heightAt(MONO.x, MONO.z) + 3, MONO.z);
    s.add(mono);
    this.mono = mono;
    const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0x6fb7ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.scale.set(10, 60, 1);
    beam.position.copy(mono.position).add(new THREE.Vector3(0, 25, 0));
    s.add(beam);
    this.beam = beam;
    const ml = new THREE.PointLight(0x6fb7ff, 300, 60, 2);
    ml.position.copy(mono.position).add(new THREE.Vector3(0, 4, 0));
    s.add(ml);
    this.monoLight = ml;
    // toz parçacıkları
    this.dust = this.makeDust();
    s.add(this.dust.points);
    g.progress(0.6, 'Leylek');
    this.ship = await makeShip(g);
    s.add(this.ship.group);
    this.ship.group.traverse((o) => o.isMesh && (o.castShadow = true));
    // fizik dünyası
    const world = (this.world = new RAPIER.World({ x: 0, y: -G, z: 0 }));
    const verts = new Float32Array(P.array);
    const idx = new Uint32Array(geo.index.array);
    world.createCollider(RAPIER.ColliderDesc.trimesh(verts, idx).setFriction(0.9));
    this.resetShip();
    g.interact.push({ id: 'mono', pos: () => this.mono.position.clone(), r: 9, label: 'Sinyale dokun', hidden: true, cone: 0.7 });
    g.progress(1, '');
  }
  makeDust() {
    const N = 400, pos = new Float32Array(N * 3);
    const vel = [], life = new Float32Array(N).fill(1);
    for (let i = 0; i < N; i++) vel.push(new THREE.Vector3());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: glowTex(), size: 1.4, color: 0x8a857c, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.NormalBlending });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    let k = 0;
    return {
      points,
      emit(p, n, power) {
        for (let i = 0; i < n; i++) {
          const j = k++ % N;
          const a = Math.random() * Math.PI * 2;
          const sp = power * (0.5 + Math.random());
          pos.set([p.x + Math.cos(a) * 2, p.y + 0.3, p.z + Math.sin(a) * 2], j * 3);
          vel[j].set(Math.cos(a) * sp, Math.random() * sp * 0.3, Math.sin(a) * sp);
          life[j] = 0;
        }
      },
      update(dt) {
        for (let i = 0; i < N; i++) {
          if (life[i] >= 1) {
            pos[i * 3 + 1] = -9999;
            continue;
          }
          life[i] += dt * 0.9;
          vel[i].y -= G * dt;
          pos[i * 3] += vel[i].x * dt;
          pos[i * 3 + 1] = Math.max(heightAt(pos[i * 3], pos[i * 3 + 2]) + 0.1, pos[i * 3 + 1] + vel[i].y * dt);
          pos[i * 3 + 2] += vel[i].z * dt;
        }
        geo.attributes.position.needsUpdate = true;
      },
    };
  }
  resetShip() {
    const R = this.R, world = this.world;
    if (this.body) world.removeRigidBody(this.body);
    const start = new THREE.Vector3(ZONE.x + 40, heightAt(ZONE.x, ZONE.z) + 600, ZONE.z + 420);
    const bd = R.RigidBodyDesc.dynamic().setTranslation(start.x, start.y, start.z).setLinvel(-1.5, -14, -22).setCanSleep(false).setLinearDamping(0.02).lockRotations();
    const body = (this.body = world.createRigidBody(bd));
    world.createCollider(R.ColliderDesc.cuboid(1.6, 1.4, 4.6).setTranslation(0, 0.3, 0).setDensity(80), body);
    for (const [x, z] of [[-1.6, -2.6], [1.6, -2.6], [-1.6, 2.6], [1.6, 2.6]]) world.createCollider(R.ColliderDesc.ball(0.35).setTranslation(x, -2.4, z).setDensity(40).setFriction(1).setRestitution(0.05), body);
    this.fuel = 100;
    this.landT = 0;
    this.ship && this.ship.group.position.copy(start);
  }
  begin() {
    const g = this.g;
    g.card('Bölüm 7 · ' + C7.title, C7.place);
    this.ship.setMode('dis');
    g.player.yaw = 0;
    g.player.pitch = -0.35;
    g.audio.engine(0.1);
    this.stage = 'intro';
    g.emit('engineBtn', true);
    g.later(2.5, () => {
      this.stage = 'land';
      g.objective(C7.objectives.land);
      g.say(C7.intro, () => g.say(C7.hint, null));
    });
  }
  toggleCam() {
    this.ship && this.stage !== 'eva' && this.stage !== 'end' && this.ship.toggle();
  }
  update(dt, t) {
    const g = this.g, ship = this.ship;
    if (!ship || !this.world) return;
    this.dust.update(dt);
    this.mono.userData.mat && (this.mono.userData.mat.uniforms.t.value = t, (this.mono.userData.mat.uniforms.glow.value = 1.2 + Math.sin(t * 1.7) * 0.4));
    this.beam.material.opacity = 0.35 + Math.sin(t * 2) * 0.1;
    if (this.stage === 'land' || this.stage === 'intro') {
      const b = this.body, m = b.mass();
      const k = g.keys || {};
      const up = this.stage === 'land' && this.fuel > 0 && (k.Space || g.engineHeld || g.player.input.run) ? 1 : 0;
      ship.throttle += (up - ship.throttle) * Math.min(1, dt * 5);
      // yanal itiş (WASD / sol çubuk): geminin görüş yönüne göre
      const cy = g.player.yaw + new THREE.Euler().setFromQuaternion(ship.group.quaternion, 'YXZ').y;
      const fwd = new THREE.Vector3(-Math.sin(cy), 0, -Math.cos(cy)), right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const lat = new THREE.Vector3().addScaledVector(fwd, g.player.input.f).addScaledVector(right, g.player.input.s);
      if (this.stage !== 'land' || this.fuel <= 0) lat.set(0, 0, 0);
      const F = new THREE.Vector3(0, ship.throttle * G * 2.2 * m, 0).addScaledVector(lat, m * 2.2);
      b.resetForces(true);
      b.addForce({ x: F.x, y: F.y, z: F.z }, true);
      this.fuel = Math.max(0, this.fuel - dt * (ship.throttle * 2.2 + lat.length() * 0.6));
      this.world.timestep = Math.min(1 / 30, dt) / 2;
      for (let i = 0; i < 2; i++) this.world.step();
      const p = b.translation(), v = b.linvel();
      ship.group.position.set(p.x, p.y, p.z);
      // yanal hıza göre görsel eğilme
      const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.clamp(v.z * 0.02, -0.25, 0.25), 0, THREE.MathUtils.clamp(-v.x * 0.02, -0.25, 0.25)));
      ship.group.quaternion.slerp(tilt, Math.min(1, dt * 2));
      g.player.shake = Math.max(g.player.shake, ship.throttle * 0.3);
      g.audio.engine(0.1 + ship.throttle * 0.55);
      const groundY = heightAt(p.x, p.z);
      const alt = p.y - 2.75 - groundY;
      if (ship.throttle > 0.2 && alt < 30) this.dust.emit(new THREE.Vector3(p.x, groundY, p.z), 3, (30 - alt) * 0.6 * ship.throttle);
      const hs = Math.hypot(v.x, v.z);
      const dz = Math.hypot(p.x - ZONE.x, p.z - ZONE.z);
      if (this.stage === 'land') {
        if (v.y < -8 && alt < 120 && !this.fastSaid) {
          this.fastSaid = true;
          g.say(C7.fast, null);
        }
        // temas
        if (alt < 0.35) {
          if (v.y < -3.2 || hs > 4.5) return this.crash();
          this.landT += dt;
          if (this.landT > 1.2 && Math.abs(v.y) < 0.4) this.landed(dz);
        } else this.landT = 0;
        const zoneDir = new THREE.Vector3(ZONE.x, groundY, ZONE.z);
        const mp = g.camera.position.clone();
        const sp = zoneDir.clone().project(g.camera);
        g.emit('hud', {
          items: [
            { k: 'Yükseklik', v: Math.max(0, alt).toFixed(0) + ' m' },
            { k: 'Düşüş hızı', v: (-v.y).toFixed(1) + ' m/s', warn: v.y < -3.2 && alt < 60 },
            { k: 'Yatay hız', v: hs.toFixed(1) + ' m/s', warn: hs > 4.5 && alt < 60 },
            { k: 'Yakıt', v: '%' + Math.round(this.fuel), warn: this.fuel < 20 },
            { k: 'Bölgeye', v: dz.toFixed(0) + ' m' },
          ],
          marker: { x: (sp.x + 1) / 2, y: (1 - sp.y) / 2, behind: sp.z > 1, label: 'İNİŞ' },
          gauge: { label: 'Motor', p: ship.throttle * 100 },
        });
        void mp;
      }
      // gölge kamerasını gemiyle taşı
      this.sun.target.position.set(p.x, groundY, p.z);
      this.sun.position.copy(this.sun.target.position).add(new THREE.Vector3(-0.75, 0.22, -0.45).normalize().multiplyScalar(300));
    } else if (this.stage === 'eva') {
      const p = g.player.pos;
      const d = Math.hypot(p.x - MONO.x, p.z - MONO.z);
      g.emit('hud', { items: [{ k: 'Sinyale', v: d.toFixed(0) + ' m' }] });
      this.sun.target.position.set(p.x, heightAt(p.x, p.z), p.z);
      this.sun.position.copy(this.sun.target.position).add(new THREE.Vector3(-0.75, 0.22, -0.45).normalize().multiplyScalar(300));
    }
    ship.update(dt, t);
    this.stars.position.copy(g.camera.position);
    if (g.player.seat) g.player.updateSeat(0, t);
  }
  crash() {
    const g = this.g;
    this.stage = 'crashed';
    this.ship.throttle = 0;
    g.player.shake = 1.6;
    g.flashT = 0.5;
    g.audio.clunk && g.audio.clunk();
    g.emit('hud', null);
    g.say(C7.crash, () => {
      g.emit('fade', 1);
      g.later(0.9, () => {
        this.resetShip();
        this.fastSaid = false;
        this.stage = 'land';
        g.emit('fade', 0);
      });
    });
  }
  landed(dz) {
    const g = this.g;
    this.stage = 'landed';
    this.ship.throttle = 0;
    g.emit('hud', null);
    g.emit('engineBtn', false);
    g.objective('');
    g.audio.engine(0.03);
    this.ring.visible = false;
    const lines = dz > 60 ? [{ s: 'kumru', t: 'Bölgenin biraz dışına indik ama sorun değil.' }, ...C7.landed] : C7.landed;
    g.say(lines, () => this.startEva());
  }
  startEva() {
    const g = this.g;
    g.emit('fade', 1);
    g.later(1.0, () => {
      this.stage = 'eva';
      const sp = this.ship.group.position;
      this.ship.setMode('dis');
      this.ship.ext.visible = true;
      this.ship.rig.visible = false;
      g.player.seat = null;
      g.emit('shipcam', null);
      g.player.groundFn = heightAt;
      g.player.slow = true;
      g.player.colliders = [];
      const start = new THREE.Vector3(sp.x + 4.5, 0, sp.z + 2);
      g.player.pos.set(start.x, heightAt(start.x, start.z), start.z);
      const d = MONO.clone().sub(start);
      g.player.yaw = Math.atan2(-d.x, -d.z);
      g.player.pitch = 0;
      g.player.eye = 1.75;
      g.interact.find((i) => i.id === 'mono').hidden = false;
      g.objective(C7.objectives.walk);
      g.emit('fade', 0);
      g.audio.engine(0);
      g.later(1.5, () => g.say(C7.eva, null));
    });
  }
  interact(f) {
    const g = this.g;
    if (f.id === 'mono' && this.stage === 'eva') {
      this.stage = 'end';
      g.player.locked = true;
      g.objective('');
      g.emit('hud', null);
      g.audio.korPulse(1.6);
      g.flashT = 0.6;
      g.say(C7.found, () => g.later(1.5, () => g.completeChapter(8)));
    }
  }
}
