import * as THREE from 'three';
import { V3 } from '../util.js';
import { makeSky, glowTex } from '../sky.js';
import { makeSmoke, cityLightsTexture } from '../props.js';
import { CHAPTER5 as C5 } from '../story.js';
import { loadDepo } from './depo.js';

const ORDER = ['guc', 'cati', 'kor', 'atesle'];
const RE = 6371; // km (uzay evresinde 1 birim = 1 km)
const ease = (x) => x * x * (3 - 2 * x);

// Bölüm 5 — Kalkış: kokpit, depo çatısı, mahallenin üstü, bulutlar, yörünge.
export class Chapter5 {
  constructor(g) {
    this.g = g;
    this.done = [];
    this.phase = 'A';
    this.t = 0;
  }
  async load() {
    const g = this.g;
    const d = (this.d = await loadDepo(g, { stages: 5, items: [], label: 'Leylek' }));
    for (let i = 0; i <= 5; i++) for (const o of d.stage[i]) o.visible = false;
    const meta = (this.meta = d.meta);
    g.progress(0.6, 'Kokpit');
    const km = (this.km = await g.json('kokpit.json'));
    const cp = await g.gltf('kokpit.glb');
    const rig = (this.rig = new THREE.Group());
    rig.add(cp.scene);
    g.tuneMaterials(cp.scene);
    this.base = V3(meta.cockpit).add(new THREE.Vector3(0, -1.35, 0));
    rig.position.copy(this.base);
    rig.rotation.y = THREE.MathUtils.degToRad((meta.ship.yaw || 18) - 90);
    g.scene.add(rig);
    // kabin ışıkları
    const red = new THREE.PointLight(0xff3a20, 3, 4, 2);
    red.position.set(0, 1.9, 1.0);
    const dash = new THREE.PointLight(0x60ffa0, 2.2, 3, 2);
    dash.position.set(0, 1.0, -0.6);
    const warm = new THREE.PointLight(0xffc890, 0.7, 4, 2);
    warm.position.set(0, 1.7, 0.2);
    rig.add(red, dash, warm);
    this.cabin = { red, dash, warm };
    // anahtarlar ve ışıkları
    this.leds = {};
    for (const k of ORDER) {
      this.leds[k] = g.groupNodes(cp.scene, `led_${k}__`).map((o) => {
        if (o.material) o.material = o.material.clone();
        return o;
      });
      const lp = V3(km.switches[k]);
      g.interact.push({ id: 'sw:' + k, pos: () => rig.localToWorld(lp.clone()), r: 1.8, label: C5.switches[k].label, cone: 0.975 });
    }
    // mürettebat koltuklarda
    const seats = km.seats;
    const crew = { elif: seats.copilot, kaan: seats.back0, mert: seats.back1, zeynep: seats.back2 };
    for (const [id, p] of Object.entries(crew)) {
      const n = await g.loadNPC(id, { p: [p[0], p[1] - 0.85, p[2]], yaw: 180, clip: 'sit' });
      g.scene.remove(n.root);
      rig.add(n.root);
      n.root.rotation.y = Math.PI;
      n.wantYaw = Math.PI;
    }
    // dizüstü bilgisayar camı kapatıyor: gizle; göz biraz yukarı ve geri
    rig.traverse((o) => {
      if (/classic_laptop|lid_floaters/.test(o.name)) o.visible = false;
    });
    g.player.seat = { rig, eye: V3(km.eye).add(new THREE.Vector3(0, 0.24, 0.12)), yawLim: 2.2 };
    g.player.yaw = 0;
    g.player.pitch = -0.05;
    this.dust = makeSmoke(V3(meta.ship.p).setY(0), { n: 160, rise: 6, drift: 3, alpha: 0, color: [0.55, 0.5, 0.45] });
    g.scene.add(this.dust.points);
    this.roofStart = {};
    for (const [k, arr] of Object.entries(d.roof)) for (const o of arr) this.roofStart[o.uuid] = o.position.clone();
    g.progress(1, '');
  }
  begin() {
    const g = this.g;
    g.card('Bölüm 5 · ' + C5.title, C5.place);
    this.stage = 'intro';
    g.later(3.2, () =>
      g.say(C5.intro, () => {
        this.stage = 'seq';
        g.objective(C5.objectives.seq(C5.switches[ORDER[0]].label));
      })
    );
  }
  setLed(k, ok) {
    for (const o of this.leds[k]) {
      if (!o.material || !o.material.emissive) continue;
      o.material.emissive.set(ok ? 0x30ff60 : 0xff3010);
      o.material.emissiveIntensity = ok ? 8 : 4;
    }
  }
  interact(f) {
    const g = this.g;
    if (!f.id.startsWith('sw:') || this.stage !== 'seq' || g.voice.busy) return;
    const k = f.id.slice(3);
    const want = ORDER[this.done.length];
    g.audio.switchClick();
    if (k !== want) {
      if (this.done.includes(k)) return;
      g.audio.beep(false);
      g.say(C5.wrong);
      return;
    }
    this.done.push(k);
    this.setLed(k, true);
    g.audio.beep(true);
    f.hidden = true;
    if (k === 'guc') {
      this.cabin.dash.intensity = 4;
      this.cabin.warm.intensity = 2.5;
    }
    if (k === 'cati') {
      this.roofT = 0;
      g.audio.shutter();
      g.later(1.8, () => g.audio.shutter());
    }
    if (k === 'kor') {
      g.audio.korPulse(1.5);
      g.flashT = 0.3;
      g.audio.engine(0.15);
    }
    g.say([C5.switches[k].line], () => {
      if (k === 'atesle') return this.launch();
      g.objective(C5.objectives.seq(C5.switches[ORDER[this.done.length]].label));
    });
    g.objective('');
  }
  launch() {
    const g = this.g;
    this.stage = 'launch';
    g.objective('');
    this.t = 0;
    g.audio.engine(0.7);
    g.player.shake = 0.8;
    this.dust.mat.uniforms.a.value = 0.35;
    for (const id of ['kaan', 'mert', 'zeynep', 'elif']) g.npcs[id] && g.npcs[id].setExpr({ wide: 0.5, brow: 0.5 });
    g.later(1.5, () => g.say(C5.ascent));
  }
  // ---------------- B: mahallenin üstü ----------------
  async toPhaseB() {
    const g = this.g;
    this.phase = 'B-load';
    g.emit('whiteflash', 1);
    const rig = this.rig;
    const npcs = g.npcs;
    // sahneyi değiştir, kokpiti ve mürettebatı taşı
    g.scene.remove(rig);
    g.scene = new THREE.Scene();
    g.renderPass.mainScene = g.scene;
    g.renderPass.scene = g.scene;
    g.emissives = [];
    g.tuneMaterials(rig);
    g.scene.add(rig);
    g.scene.environment = g.envTex;
    g.scene.environmentIntensity = 0.3;
    g.hemi = new THREE.HemisphereLight(0x2a3a66, 0x120c08, 0.25);
    g.scene.add(g.hemi);
    g.sky = makeSky(g.scene);
    const gl = await g.gltf('cati.glb');
    g.scene.add(gl.scene);
    g.tuneMaterials(gl.scene);
    const meta = await g.json('cati.json');
    for (const p of meta.lamps.slice(0, 8)) {
      const l = new THREE.PointLight(0xff8a3a, 60, 30, 2);
      l.position.copy(V3(p));
      g.scene.add(l);
    }
    const ct = cityLightsTexture(g.low ? 1024 : 2048, 7);
    ct.wrapS = ct.wrapT = THREE.RepeatWrapping;
    ct.repeat.set(8, 8);
    const city = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000), new THREE.MeshBasicMaterial({ map: ct, color: 0xffffff }));
    city.rotation.x = -Math.PI / 2;
    city.position.y = -0.6;
    g.scene.add(city);
    g.scene.fog = new THREE.FogExp2(0x0a0d18, 0.00009);
    g.camera.far = 90000;
    g.camera.updateProjectionMatrix();
    this.fog = g.scene.fog;
    rig.position.set(0, 30, 20);
    rig.rotation.set(0.2, 0, 0, 'YXZ');
    g.npcs = npcs;
    this.phase = 'B';
    this.t = 0;
    g.emit('whiteflash', 0);
  }
  // ---------------- C: yörünge ----------------
  toPhaseC() {
    const g = this.g;
    this.phase = 'C';
    this.t = 0;
    const rig = this.rig;
    g.scene.remove(rig);
    g.scene = new THREE.Scene();
    g.renderPass.mainScene = g.scene;
    g.renderPass.scene = g.scene;
    g.scene.background = new THREE.Color(0x000000);
    g.sky = null;
    g.emissives = [];
    g.tuneMaterials(rig);
    rig.position.set(0, 0, 0);
    g.scene.add(rig);
    g.camera.near = 0.05;
    g.camera.far = 90000;
    g.camera.updateProjectionMatrix();
    g.hemi = new THREE.HemisphereLight(0x223355, 0x000000, 0.05);
    g.hemiBase = 0.05;
    g.scene.add(g.hemi);
    // güneş: ufkun hemen altından, karşıdan doğuyor
    const sunDir = (this.sunDir = new THREE.Vector3(0.25, -0.02, -1).normalize());
    const sun = new THREE.DirectionalLight(0xfff2e0, 2.6);
    sun.position.copy(sunDir).multiplyScalar(100);
    g.scene.add(sun, sun.target);
    // Dünya
    const day = g.tex('space/earth.jpg');
    const night = g.tex('space/lights.jpg', false);
    const clouds = g.tex('space/clouds.jpg', false);
    const earthMat = new THREE.ShaderMaterial({
      uniforms: { day: { value: day }, night: { value: night }, clouds: { value: clouds }, sun: { value: sunDir } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform sampler2D day; uniform sampler2D night; uniform sampler2D clouds; uniform vec3 sun; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){ vec3 n=normalize(vN); float d=dot(n,sun);
          vec3 dc=texture2D(day,vUv).rgb; float cl=texture2D(clouds,vUv).r; vec3 nt=texture2D(night,vUv).rgb; float nl=clamp((nt.r-nt.b*0.6)*1.6,0.,1.);
          float lit=smoothstep(-0.1,0.2,d);
          vec3 col=mix(dc, vec3(1.0), cl*0.85)*(max(d,0.)*1.4+0.01)*lit;
          col+=vec3(1.0,0.7,0.36)*pow(nl,1.5)*(1.0-smoothstep(-0.15,0.05,d))*1.6*(1.0-cl*0.7);
          vec3 v=normalize(cameraPosition-vW); float rim=pow(1.-max(dot(n,v),0.),5.);
          col=mix(col, vec3(0.35,0.6,1.0)*1.3, rim*smoothstep(-0.3,0.3,d)*0.8);
          gl_FragColor=vec4(col,1.); }`,
    });
    const earth = (this.earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 160, 120), earthMat));
    // Türkiye (39°K, 33°D) tam altımızda olsun
    const lat = THREE.MathUtils.degToRad(39), lon = THREE.MathUtils.degToRad(33);
    const u = (lon + Math.PI) / (Math.PI * 2), th = Math.PI / 2 - lat;
    const dir = new THREE.Vector3(-Math.cos(u * Math.PI * 2) * Math.sin(th), Math.cos(th), Math.sin(u * Math.PI * 2) * Math.sin(th)).normalize();
    earth.quaternion.setFromUnitVectors(dir, new THREE.Vector3(0, 1, 0));
    g.scene.add(earth);
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(RE * 1.012, 120, 80),
      new THREE.ShaderMaterial({
        uniforms: { sun: { value: sunDir } },
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
        fragmentShader: `uniform vec3 sun; varying vec3 vN; varying vec3 vW; void main(){ vec3 v=normalize(cameraPosition-vW); vec3 n=-normalize(vN);
          float f=pow(1.-abs(dot(n,v)),3.0); float day=smoothstep(-0.35,0.35,dot(n,sun));
          vec3 c=mix(vec3(1.0,0.45,0.18), vec3(0.3,0.6,1.0), smoothstep(-0.05,0.35,dot(n,sun)));
          gl_FragColor=vec4(c*f*day*1.8, f*day); }`,
      })
    );
    earth.add(atmo);
    this.earthAlt = 95;
    earth.position.set(0, -(RE + this.earthAlt), 0);
    // güneş parıltısı ve Ay
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff4e0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sunSprite.position.copy(sunDir).multiplyScalar(60000);
    sunSprite.scale.setScalar(4000);
    g.scene.add(sunSprite);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(181, 64, 48), new THREE.MeshStandardMaterial({ map: g.tex('space/moon.jpg'), roughness: 1 }));
    moon.position.set(0.62, 0.22, -0.75).normalize().multiplyScalar(40000);
    g.scene.add(moon);
    // yıldızlar (tam küre)
    const N = 6000, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(80000);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, color: 0xdde6ff, depthWrite: false }));
    g.scene.add(this.stars);
    rig.rotation.set(0.5, 0, 0, 'YXZ');
    g.audio.engine(0.35);
    g.say(C5.high);
    g.emit('whiteflash', 0);
  }
  update(dt, t) {
    const g = this.g;
    // çatı açılır
    if (this.roofT !== undefined && this.roofT < 7 && this.phase === 'A') {
      this.roofT += dt;
      const k = ease(Math.min(1, this.roofT / 6));
      const r = this.d.roof;
      for (const [key, arr] of Object.entries(r)) {
        const off = key === 'M' ? 32 : key === 'A' ? -32 : 32;
        for (const o of arr) o.position.x = this.roofStart[o.uuid].x + off * ease(Math.min(1, Math.max(0, (this.roofT - (key === 'M' ? 0 : 1)) / 5)));
      }
    }
    this.dust && this.phase === 'A' && this.dust.update(dt);
    if (this.stage !== 'launch') return;
    this.t += dt;
    const rig = this.rig;
    // kalkışın ilk anlarında bakışı yumuşakça ön cama çevir
    if (this.phase === 'A' && this.t < 4) {
      const k = Math.min(1, dt * 1.6);
      g.player.yaw += (0 - g.player.yaw) * k;
      g.player.pitch += (0.1 - g.player.pitch) * k;
    }
    if (this.phase === 'A') {
      // yerden kalkış: titreşim, toz, yavaş yükseliş
      const k = Math.max(0, this.t - 1.2);
      rig.position.y = this.base.y + 0.5 * k * k * 0.45;
      g.player.shake = Math.max(g.player.shake, 0.55);
      g.audio.engine(Math.min(1, 0.6 + this.t * 0.06));
      g.flashT = Math.max(g.flashT, 0.12);
      if (rig.position.y > this.base.y + 17) this.toPhaseB();
    } else if (this.phase === 'B') {
      const s = this.t;
      const alt = 30 + 2700 * Math.pow(Math.min(1, s / 26), 2.1);
      rig.position.y = alt;
      rig.position.z = 20 - s * s * 2.2;
      rig.rotation.x = 0.2 + Math.min(0.45, s * 0.025);
      g.player.shake = Math.max(g.player.shake, 0.35);
      // bulut katmanı: sis yoğunlaşır ve beyazlaşır
      const c = THREE.MathUtils.clamp((alt - 900) / 1300, 0, 1);
      this.fog.density = 0.00009 + c * c * 0.006;
      this.fog.color.setRGB(0.04 + c * 0.45, 0.05 + c * 0.45, 0.09 + c * 0.45);
      if (c > 0 && !this.cloudSaid) {
        this.cloudSaid = true;
        g.say(C5.clouds);
      }
      if (alt > 2650 && !this.cWait) {
        this.cWait = true;
        g.emit('whiteflash', 1);
        g.later(0.8, () => this.toPhaseC());
      }
    } else if (this.phase === 'C') {
      const s = this.t;
      const alt = 95 + 325 * ease(Math.min(1, s / 30));
      this.earth.position.y = -(RE + alt);
      rig.rotation.x = THREE.MathUtils.lerp(0.5, -0.16, ease(Math.min(1, s / 26)));
      rig.rotation.y = -0.15 * ease(Math.min(1, s / 30));
      g.player.shake = Math.max(0, 0.3 - s * 0.02);
      g.audio.engine(Math.max(0, 0.35 - s * 0.02));
      this.stars.position.copy(g.camera.position);
      if (s > 27 && !this.orbitSaid) {
        this.orbitSaid = true;
        for (const id of ['kaan', 'mert', 'zeynep', 'elif']) g.npcs[id] && g.npcs[id].setExpr({ smile: 0.3, brow: 0.4 });
        g.say(C5.orbit, () => {
          this.stage = 'end';
          g.later(2.5, () => g.completeChapter(6));
        });
      }
    }
  }
}
