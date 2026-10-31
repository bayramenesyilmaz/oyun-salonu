import * as THREE from 'three';
import { V3 } from '../util.js';
import { makeSky } from '../sky.js';
import { makeKor, makeFlashlight } from '../props.js';
import { CHAPTER2 as C2 } from '../story.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Bölüm 2 — Kor: taşı mahalle sokaklarından depoya, polislere ve bekçiye görünmeden götür.
export class Chapter2 {
  constructor(g) {
    this.g = g;
    this.guards = [];
    this.cp = 0;
    this.hidden = true;
    this.leakT = 18;
    this.msgIdx = 0;
  }
  async load() {
    const g = this.g;
    g.clearLevel();
    g.surface = 'concrete';
    await g.loadEnv();
    g.progress(0.1, 'Sokaklar');
    const meta = (this.meta = await g.json('sokak.json'));
    const gl = await g.gltf('sokak.glb');
    g.progress(0.55, 'Sokaklar');
    g.scene.add(gl.scene);
    g.tuneMaterials(gl.scene);
    // polis çakarı: kendi animasyonumuz
    this.siren = g.emissives.filter((e) => /polis/.test(e.name));
    g.emissives = g.emissives.filter((e) => !/polis/.test(e.name));
    g.sky = makeSky(g.scene);
    g.setupLights({ shadowCenter: V3(meta.spawn), moon: 0.3, hemi: 0.2, span: 16 });
    const ground = [];
    gl.scene.traverse((o) => o.isMesh && /asphalt|pavers|dry_ground|curb/.test(o.material.name || '') && ground.push(o));
    g.player.groundFn = g.groundRay(ground);
    // sokak lambası havuzu: oyuncuya en yakın lambalara taşınır
    this.lamps = meta.lamps.map(V3);
    this.lampPool = [];
    for (let i = 0; i < (g.low ? 3 : 5); i++) {
      const l = new THREE.PointLight(0xff8a3a, 55, 24, 2);
      g.scene.add(l);
      this.lampPool.push(l);
    }
    const dl = new THREE.PointLight(0xffc080, 8, 10, 2);
    dl.position.copy(V3(meta.depoLamp));
    g.scene.add(dl);
    const pc = V3(meta.policeCar);
    this.redL = new THREE.PointLight(0xff2010, 0, 18, 2);
    this.blueL = new THREE.PointLight(0x2040ff, 0, 18, 2);
    this.redL.position.copy(pc).add(new THREE.Vector3(0, 0.3, 0.4));
    this.blueL.position.copy(pc).add(new THREE.Vector3(0, 0.3, -0.4));
    g.scene.add(this.redL, this.blueL);
    // karakterler
    await g.loadNPCs({ kaan: meta.kaan, mert: meta.mert });
    g.interact = g.interact.filter((i) => !i.id.startsWith('npc:'));
    for (const [gid, gd] of Object.entries(meta.guards)) {
      const npc = await g.loadNPC(gid, { p: gd.path[0], yaw: 0, clip: 'flashlight' }, gd.who);
      const fl = makeFlashlight();
      if (g.low) fl.userData.spot.castShadow = false;
      npc.attachFlashlight(fl);
      npc.lookTarget = null;
      this.guards.push({ id: gid, who: gd.who, npc, def: gd, idx: 0, waitT: gd.wait || 0, sus: 0, barked: false, state: 'patrol', home: V3(gd.path[0]) });
    }
    g.alias = { polis: 'p1', bekci: 'b1' };
    this.p1 = this.guards.find((x) => x.id === 'p1');
    this.p1.state = 'post';
    this.p1.npc.faceTo(V3(meta.spawn).add(new THREE.Vector3(-6, 0, 3)), true);
    for (const gd of this.guards) if (gd.state === 'patrol') this.nextLeg(gd);
    // eldeki Kor
    const kor = (g.kor = makeKor());
    g.camera.add(kor);
    kor.position.set(0.22, -0.26, -0.5);
    kor.scale.setScalar(0.42);
    g.korLight = new THREE.PointLight(0xff8a30, 0, 14, 2);
    g.camera.add(g.korLight);
    g.korLight.position.set(0.2, -0.1, -0.3);
    if (!g.scene.children.includes(g.camera)) g.scene.add(g.camera);
    g.pulseMode = true;
    g.player.colliders = meta.colliders;
    g.player.place(meta.spawn, meta.spawnYaw);
    this.setHidden(true, true);
    g.interact.push({ id: 'depo', pos: () => V3(meta.depoDoor).add(new THREE.Vector3(0, 1.3, 0)), r: 3.2, label: 'Kepenge vur', hidden: true, cone: 0.8 });
    g.progress(1, '');
  }
  begin() {
    const g = this.g;
    this.stage = 'intro';
    g.card('Bölüm 2 · ' + C2.title, C2.place);
    g.objective(C2.objectives.wait);
    g.emit('hideable', true);
    g.later(3, () => {
      g.say(C2.intro, () => {
        // Kaan polise gider; Mert ara sokağa doğru gider ve depoda bekler
        const k = g.npcs.kaan;
        k.walkTo([this.p1.npc.root.position.clone().add(new THREE.Vector3(-1.3, 0, -0.6))], 1.6, () => {
          k.faceTo(this.p1.npc.root.position);
          this.p1.npc.faceTo(k.root.position);
          this.p1.npc.lookTarget = k.root.position;
          g.say(C2.distract, () => this.sendP1ToPost());
        });
        const m = g.npcs.mert;
        m.walkTo([V3(this.meta.spawn).add(new THREE.Vector3(-3.5, 0, 3.4)), V3(this.meta.spawn).add(new THREE.Vector3(-4.5, 0, 10))], 1.8, () => {
          const md = this.meta.mertDoor;
          m.root.position.copy(V3(md.p));
          m.faceTo(V3(this.meta.depoDoor).add(new THREE.Vector3(0, 0, -6)), true);
          m.play('idle');
        });
        this.stage = 'sneak';
        g.objective(C2.objectives.go);
        g.emit('hint', 'Taşı saklamak / çıkarmak: Q · saklıyken yavaş yürürsün');
      });
    });
  }
  sendP1ToPost() {
    const g = this.g;
    const post = V3(this.meta.guards.p1.post);
    this.p1.npc.lookTarget = null;
    this.p1.npc.walkTo([post], 1.3, () => {
      this.p1.npc.faceTo(post.clone().add(new THREE.Vector3(0, 0, 8)));
    });
    g.npcs.kaan.walkTo([post.clone().add(new THREE.Vector3(1.2, 0, 0.6))], 1.3, () => g.npcs.kaan.faceTo(post.clone().add(new THREE.Vector3(0, 0, 8))));
    g.later(4, () => this.message());
  }
  message() {
    const m = C2.messages[this.msgIdx++];
    if (m) {
      this.g.emit('message', m);
      this.g.audio.ui();
    }
  }
  toggleHide() {
    if (this.stage === 'caught' || this.stage === 'end') return;
    this.setHidden(!this.hidden);
  }
  setHidden(h, silent) {
    const g = this.g;
    this.hidden = h;
    g.player.slow = h;
    g.kor.visible = !h;
    g.pulseAffects = !h;
    g.pulseMuted = h;
    if (!silent) g.audio.whoosh();
    g.emit('hidden', h);
  }
  nextLeg(gd) {
    const path = gd.def.path;
    if (path.length < 2) return;
    gd.idx = (gd.idx + 1) % path.length;
    gd.npc.walkTo([V3(path[gd.idx])], 1.15, () => {
      gd.waitT = gd.def.wait || 2;
      gd.state = 'wait';
    });
    gd.state = 'patrol';
  }
  // bakış hattı: yatay düzlemde göğüs hizasında engel var mı
  blocked(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z;
    for (const c of this.meta.colliders) {
      if (c.inv) continue;
      if (c.c[1] + c.h[1] < 1.15) continue;
      const minx = c.c[0] - c.h[0], maxx = c.c[0] + c.h[0], minz = c.c[2] - c.h[2], maxz = c.c[2] + c.h[2];
      let t0 = 0, t1 = 1;
      const clip = (p, q) => {
        if (Math.abs(p) < 1e-9) return q >= 0;
        const r = q / p;
        if (p < 0) {
          if (r > t1) return false;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return false;
          if (r < t1) t1 = r;
        }
        return true;
      };
      if (clip(-dx, a.x - minx) && clip(dx, maxx - a.x) && clip(-dz, a.z - minz) && clip(dz, maxz - a.z) && t0 < t1 && t0 < 0.97) return true;
    }
    return false;
  }
  nearLamp(p) {
    let best = 1e9;
    for (const l of this.lamps) {
      const d = (l.x - p.x) ** 2 + (l.z - p.z) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }
  detect(dt) {
    const g = this.g;
    const P = g.player.pos.clone().setY(g.player.pos.y + 1.2);
    const lit = this.nearLamp(P) < 7;
    const glow = this.hidden ? (this.leaking ? 1 : 0) : g.pulse || 0;
    let maxSus = 0;
    for (const gd of this.guards) {
      const n = gd.npc;
      const E = n.root.position.clone().setY(n.root.position.y + 1.6);
      const to = P.clone().sub(E);
      const d = to.length();
      const yaw = n.root.rotation.y;
      const F = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const ang = Math.acos(THREE.MathUtils.clamp(F.dot(to.clone().setY(0).normalize()), -1, 1));
      let range = lit ? 16 : 10;
      range += glow * 14;
      const inCone = ang < THREE.MathUtils.degToRad(46) || (glow > 0.3 && d < 11) || d < 2.0;
      let seen = d < range && inCone && !this.blocked(E, P);
      if (gd.state === 'busy') seen = seen && d < 4;
      if (seen) {
        const run = g.player.input.run && !g.player.slow ? 1.5 : 1;
        gd.sus += dt * (1.7 * (1 - d / range) + 0.35 + glow * 0.8) * run;
      } else gd.sus = Math.max(0, gd.sus - dt * 0.3);
      if (gd.sus > 0.35 && gd.state !== 'busy') {
        if (gd.state !== 'look') {
          gd.prev = gd.state;
          gd.state = 'look';
          n.path = null;
          n.play('flashlight', 0.3);
        }
        n.faceTo(g.player.pos);
        if (!gd.barked) {
          gd.barked = true;
          if (!g.voice.busy) g.say([{ s: gd.who, t: pick(C2.suspicious[gd.who]) }]);
        }
      } else if (gd.state === 'look' && gd.sus < 0.1) {
        gd.barked = false;
        gd.state = gd.prev === 'post' ? 'post' : 'wait';
        gd.waitT = 1.2;
        if (gd.state === 'post') n.faceTo(V3(this.meta.guards.p1.post).add(new THREE.Vector3(0, 0, 8)));
      }
      if (gd.sus >= 1) return this.caught(gd);
      maxSus = Math.max(maxSus, gd.sus);
    }
    g.emit('stealth', { sus: maxSus, lit, hidden: this.hidden });
  }
  caught(gd) {
    const g = this.g;
    this.stage = 'caught';
    g.player.locked = true;
    g.player.lookOverride = { target: gd.npc.root.position.clone().setY(gd.npc.root.position.y + 1.6), w: 0, commit: true };
    g.lookRamp = 1.1;
    gd.npc.faceTo(g.player.pos);
    if (gd.who === 'bekci') g.audio.whistle();
    g.say([C2.caught[gd.who]], () => {
      g.emit('fade', 1);
      g.later(1.0, () => this.reset());
    });
  }
  reset() {
    const g = this.g;
    const cp = this.meta.checkpoints[this.cp];
    g.player.place(cp, this.cp === 0 ? this.meta.spawnYaw : 0);
    g.player.lookOverride = null;
    g.player.locked = false;
    for (const gd of this.guards) {
      gd.sus = 0;
      gd.barked = false;
      if (gd.id === 'p1') {
        gd.state = 'post';
        gd.npc.path = null;
        gd.npc.root.position.copy(V3(this.meta.guards.p1.post));
        gd.npc.faceTo(V3(this.meta.guards.p1.post).add(new THREE.Vector3(0, 0, 8)), true);
        gd.npc.play('flashlight');
      } else {
        // devriyeyi oyuncudan uzak bir noktadan sürdür
        const far = gd.def.path.map(V3).reduce((a, b) => (a.distanceTo(g.player.pos) > b.distanceTo(g.player.pos) ? a : b));
        gd.npc.root.position.copy(far);
        gd.idx = gd.def.path.findIndex((p) => V3(p).equals(far));
        this.nextLeg(gd);
      }
    }
    this.setHidden(true, true);
    this.leakT = 18;
    this.stage = 'sneak';
    g.emit('fade', 0);
    g.say(C2.retry);
  }
  interact(f) {
    if (f.id === 'depo' && this.stage === 'sneak') this.arrive();
  }
  arrive() {
    const g = this.g;
    this.stage = 'end';
    g.player.locked = true;
    g.emit('stealth', null);
    g.emit('hideable', false);
    const m = g.npcs.mert;
    m.faceTo(g.player.pos);
    m.play('wave', 0.3);
    g.audio.shutter();
    g.say(C2.arrive, () => {
      g.emit('fade', 1);
      g.later(1.0, () => g.completeChapter(3));
    });
  }
  update(dt, t) {
    const g = this.g;
    const meta = this.meta;
    // çakar
    const ph = Math.floor(t * 3.2) % 2;
    for (const e of this.siren) e.m.emissiveIntensity = (/Kirmizi/.test(e.name) ? ph : 1 - ph) * 20;
    this.redL.intensity = ph * 22;
    this.blueL.intensity = (1 - ph) * 22;
    // lamba havuzu
    this._lampT = (this._lampT || 0) - dt;
    if (this._lampT < 0) {
      this._lampT = 0.5;
      const p = g.player.pos;
      const s = [...this.lamps].sort((a, b) => a.distanceToSquared(p) - b.distanceToSquared(p));
      this.lampPool.forEach((l, i) => s[i] && l.position.copy(s[i]));
    }
    // ay gölgesi oyuncuyu izler
    if (g.moonL) {
      g.moonL.target.position.copy(g.player.pos);
      g.moonL.position.copy(g.player.pos).add(new THREE.Vector3(-30, 60, 20));
    }
    // Kor ışığı
    const kor = g.kor;
    if (kor) {
      kor.userData.mat.uniforms.t.value = t;
      kor.userData.mat.uniforms.glow.value = 0.5 + (g.pulse || 0) * 1.8;
      g.korLight.intensity = this.hidden ? (this.leaking ? 14 : 0) : 3 + (g.pulse || 0) * 14;
    }
    if (this.stage !== 'sneak') return;
    // saklıyken bile taş arada bir sızar: önce uyarı, sonra kısa parlama
    this.leakT -= dt;
    if (this.hidden && this.leakT < 3 && !this.warned) {
      this.warned = true;
      g.emit('hint', 'Taş ısınıyor… birazdan ceketin altından parlayacak. Gözden uzak dur!');
    }
    if (this.leakT < 0 && !this.leaking) {
      this.leaking = true;
      g.audio.korPulse(1.0);
      g.flashT = Math.max(g.flashT, 0.25);
      if (!g.voice.busy) g.say([pick(C2.pulseWarn)]);
      g.later(1.3, () => {
        this.leaking = false;
        this.warned = false;
        this.leakT = 16 + Math.random() * 8;
      });
    }
    // devriyeler
    for (const gd of this.guards) {
      if (gd.state === 'wait') {
        gd.waitT -= dt;
        const n = gd.npc;
        n.root.rotation.y += Math.sin(t * 0.9 + gd.idx) * dt * 0.6;
        n.wantYaw = n.root.rotation.y;
        if (gd.waitT < 0) this.nextLeg(gd);
      }
      if (gd.id === 'p1' && gd.npc.path) gd.state = 'busy';
      else if (gd.id === 'p1' && gd.state === 'busy') gd.state = 'post';
    }
    this.detect(dt);
    // kontrol noktaları ve mesajlar
    const p = g.player.pos;
    if (this.cp < 1 && p.distanceTo(V3(meta.alleyIn)) < 3) {
      this.cp = 1;
      g.objective(C2.objectives.alley);
      this.message();
    }
    if (this.cp < 2 && p.distanceTo(V3(meta.alleyOut)) < 3) {
      this.cp = 2;
      g.objective(C2.objectives.door);
      this.message();
      const d = g.interact.find((i) => i.id === 'depo');
      d.hidden = false;
    }
    if (this.cp >= 2) g.interact.find((i) => i.id === 'depo').hidden = false;
  }
}
