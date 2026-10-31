import * as THREE from 'three';
import { V3 } from '../util.js';
import { makeSky } from '../sky.js';
import { makeKor, makeSmoke } from '../props.js';
import { CHAPTER1 as C1, OBJECTIVES } from '../story.js';

// Bölüm 1 — Göktaşı: çatı (A) ve arsa (B)
export class Chapter1 {
  constructor(g) {
    this.g = g;
    this.talked = new Set();
    this.talkCount = {};
  }
  async load() {
    await this.loadCati();
  }
  async loadCati() {
    const g = this.g;
    g.clearLevel();
    this.level = 'cati';
    g.surface = 'concrete';
    g.progress(0.05, 'Gökyüzü');
    await g.loadEnv();
    const meta = (this.meta = await g.json('cati.json'));
    g.progress(0.15, 'Mahalle');
    const gl = await g.gltf('cati.glb');
    g.progress(0.55, 'Mahalle');
    g.scene.add(gl.scene);
    g.tuneMaterials(gl.scene);
    g.sky = makeSky(g.scene);
    g.setupLights({ shadowCenter: V3(meta.tea) });
    for (const p of meta.bulbs.slice(0, g.low ? 2 : 4)) {
      const l = new THREE.PointLight(0xffb070, 3.2, 9, 2);
      l.position.copy(V3(p));
      g.scene.add(l);
    }
    const dl = new THREE.PointLight(0xffc080, 4, 7, 2);
    dl.position.copy(V3(meta.door)).add(new THREE.Vector3(-1.2, 1.3, 0.2));
    g.scene.add(dl);
    const near = meta.lamps.map((p) => V3(p)).sort((a, b) => a.length() - b.length()).slice(0, g.low ? 2 : 5);
    for (const p of near) {
      const l = new THREE.PointLight(0xff8a3a, 60, 26, 2);
      l.position.copy(p);
      g.scene.add(l);
    }
    await g.loadNPCs(meta.npc);
    g.player.colliders = meta.colliders;
    g.player.place(meta.spawn, meta.spawnYaw);
    g.player.floorY = meta.roof;
    g.interact.push({ id: 'tea', pos: () => V3(meta.tea), r: 2.0, label: 'Çay al' });
    g.interact.push({ id: 'door', pos: () => V3(meta.door), r: 2.2, label: 'Aşağı in', hidden: true });
    g.progress(1, '');
  }
  begin() {
    const g = this.g;
    this.stage = 'intro';
    g.npcs.mert && g.npcs.mert.setExpr({ smile: 0.25 });
    g.npcs.zeynep && g.npcs.zeynep.setExpr({ smile: 0.15 });
    g.card('Bölüm 1 · ' + C1.title, C1.place);
    g.later(3.5, () => {
      g.say(C1.intro, () => {
        this.stage = 'talk';
        g.objective(OBJECTIVES.talk(0));
        this.meteorClock = 0;
      });
    });
  }
  talk(id) {
    const g = this.g;
    if (this.stage === 'talk' || this.stage === 'free') {
      const set = C1.talk[id];
      const k = this.talkCount[id] || 0;
      this.talkCount[id] = k + 1;
      const lines = set ? set[Math.min(k, set.length - 1)] : [];
      g.talkPose(id, true);
      g.say(lines, () => {
        g.talkPose(id, false);
        if (this.stage === 'talk') {
          this.talked.add(id);
          g.objective(OBJECTIVES.talk(this.talked.size));
          if (this.talked.size >= 3) g.later(4, () => this.startMeteor());
        }
      });
    } else if (this.level === 'arsa') {
      const b = C1.idleBarks[id];
      b && g.say([{ s: id, t: b[0] }]);
    }
  }
  interact(f) {
    const g = this.g;
    if (f.id === 'tea') {
      g.audio.cup();
      if (!this.teaDone) {
        this.teaDone = true;
        g.say([{ s: 'mert', t: 'Afiyet olsun, şekeri kendin atarsın artık.' }]);
      }
    } else if (f.id === 'door' && this.stage === 'door') this.goArsa();
    else if (f.id === 'kor' && this.stage === 'take') this.takeKor();
  }
  startMeteor() {
    const g = this.g;
    if (this.stage !== 'talk') return;
    this.stage = 'meteor';
    g.objective(OBJECTIVES.watch);
    g.voice.stop();
    const dirAt = (azDeg, elDeg, d) => {
      const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
      return new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)).multiplyScalar(d).add(new THREE.Vector3(0, this.meta.roof, 0));
    };
    const from = dirAt(38, 42, 420), to = dirAt(-14, 7, 330);
    g.player.locked = true;
    g.say(C1.meteor);
    g.later(1.2, () => {
      g.sky.startMeteor(from, to, 7.0);
      g.audio.hiss(7);
      g.player.lookOverride = { target: g.sky.meteorHead.position, w: 0 };
      g.lookRamp = 1;
      g.npcs.kaan && (g.npcs.kaan.play('point', 0.6), g.npcs.kaan.setExpr({ jaw: 0.25, wide: 0.7, brow: 0.6 }));
      g.npcs.elif && (g.npcs.elif.play('lookup', 0.6), g.npcs.elif.setExpr({ jaw: 0.15, brow: 0.5 }));
      for (const id of ['mert', 'zeynep']) g.npcs[id] && g.npcs[id].setExpr({ wide: 0.6, brow: 0.5 });
    });
    g.later(8.3, () => this.impactFlash());
  }
  impactFlash() {
    const g = this.g;
    g.flashT = 1;
    const imp = V3(this.meta.meteor.impact);
    g.flashL.position.copy(imp).add(new THREE.Vector3(0, 30, 0));
    g.flashL.target.position.set(0, this.meta.roof, 0);
    g.player.lookOverride = { target: imp.clone().add(new THREE.Vector3(0, 25, 0)), w: g.player.lookOverride ? g.player.lookOverride.w : 0.6 };
    g.later(0.6, () => g.say(C1.afterFlash));
    for (const id of ['mert', 'zeynep']) g.npcs[id] && g.npcs[id].play('idle', 0.4);
    g.later(6.5, () => this.boom());
  }
  boom() {
    const g = this.g;
    g.audio.boom();
    g.player.shake = 1.25;
    g.audio.carAlarm(0.6, 0, 14, 0.025);
    g.audio.carAlarm(1.4, 1, 16, 0.02);
    g.audio.carAlarm(2.3, 2, 12, 0.015);
    g.audio.dog(1.0, 0.05);
    g.audio.dog(2.6, 0.04);
    g.flickerT = 1.2;
    g.npcs.kaan && g.npcs.kaan.play('armsup', 0.2);
    g.npcs.elif && g.npcs.elif.play('idle', 0.4);
    g.later(3.0, () => {
      g.player.lookOverride = null;
      g.player.locked = false;
      for (const n of Object.values(g.npcs)) n.setExpr({ brow: 0.4 });
      g.npcs.kaan && g.npcs.kaan.play('idle', 0.6);
      g.say(C1.afterBoom, () => {
        this.stage = 'door';
        g.objective(OBJECTIVES.door);
        const d = g.interact.find((i) => i.id === 'door');
        if (d) d.hidden = false;
      });
    });
  }
  async goArsa() {
    const g = this.g;
    this.stage = 'transit';
    g.player.locked = true;
    g.emit('fade', 1);
    g.audio.runStairs(3.2);
    await new Promise((r) => setTimeout(r, 900));
    g.phase = 'loading';
    g.emit('phase', 'loading');
    try {
      await this.loadArsa();
    } catch (e) {
      console.error(e);
      g.emit('error', 'Arsa sahnesi yüklenemedi.');
      return;
    }
    g.phase = 'play';
    g.emit('phase', 'play');
    g.emit('fade', 0);
    g.player.locked = false;
    this.stage = 'crater';
    g.objective(OBJECTIVES.crater);
    g.say(C1.arsaIntro);
  }
  async loadArsa() {
    const g = this.g;
    g.clearLevel();
    this.level = 'arsa';
    g.surface = 'dirt';
    const meta = (this.meta = await g.json('arsa.json'));
    const gl = await g.gltf('arsa.glb');
    gl.scene.traverse((o) => {
      if (o.isMesh && /^burn/.test(o.name)) o.visible = false;
    });
    g.scene.add(gl.scene);
    g.tuneMaterials(gl.scene);
    g.sky = makeSky(g.scene);
    const crater = V3(meta.crater);
    g.setupLights({ shadowCenter: crater, moon: 0.3 });
    for (const p of meta.lamps.slice(0, g.low ? 2 : 4)) {
      const l = new THREE.PointLight(0xff8a3a, 70, 30, 2);
      l.position.copy(V3(p));
      g.scene.add(l);
    }
    const ground = [];
    gl.scene.traverse((o) => o.isMesh && /dry_ground|asphalt/.test(o.material.name || o.name) && ground.push(o));
    g.player.groundFn = g.groundRay(ground);
    const kor = (g.kor = makeKor());
    kor.position.copy(V3(meta.kor));
    g.scene.add(kor);
    g.korLight = new THREE.PointLight(0xff8a30, 18, 14, 2);
    g.korLight.position.copy(kor.position).add(new THREE.Vector3(0, 0.6, 0));
    g.scene.add(g.korLight);
    this.smoke = makeSmoke(crater);
    g.scene.add(this.smoke.points);
    await g.loadNPCs(meta.npc);
    for (const n of Object.values(g.npcs)) n.setExpr({ brow: 0.4, wide: 0.3 });
    g.player.colliders = meta.colliders;
    g.player.place(meta.spawn, meta.spawnYaw);
    g.interact.push({ id: 'kor', pos: () => kor.getWorldPosition(new THREE.Vector3()), r: 3.2, label: 'Taşı al', hidden: true });
  }
  takeKor() {
    const g = this.g;
    this.stage = 'taken';
    g.objective('');
    g.voice.stop();
    g.audio.korPulse(1.2);
    g.scene.remove(g.kor);
    g.camera.add(g.kor);
    g.kor.position.set(0.22, -0.24, -0.5);
    g.kor.scale.setScalar(0.45);
    if (!g.scene.children.includes(g.camera)) g.scene.add(g.camera);
    g.korLight.intensity = 6;
    g.camera.add(g.korLight);
    g.korLight.position.set(0.2, -0.1, -0.3);
    g.pulseMode = true;
    g.npcs.elif && g.npcs.elif.play('idle', 0.5);
    g.say(C1.take, () => {
      this.stage = 'end';
      g.completeChapter(2);
    });
    g.later(9, () => g.audio.siren(0, 24, 0.03));
  }
  update(dt, t) {
    const g = this.g;
    if (this.stage === 'talk') {
      this.meteorClock = (this.meteorClock || 0) + dt;
      if (this.meteorClock > 100) this.startMeteor();
    }
    if (this.level !== 'arsa') return;
    if (g.kor) {
      if (this.stage !== 'taken' && this.stage !== 'end') {
        const p = 0.5 + 0.5 * Math.sin(t * 2.4);
        g.kor.userData.mat.uniforms.glow.value = 0.6 + p * 0.8;
        if (g.korLight) g.korLight.intensity = 10 + p * 12;
      } else {
        g.kor.userData.mat.uniforms.glow.value = 0.5 + (g.pulse || 0) * 1.8;
        if (g.korLight) g.korLight.intensity = 3 + (g.pulse || 0) * 10;
        g.kor.rotation.y += dt * 0.3;
      }
      g.kor.userData.mat.uniforms.t.value = t;
    }
    this.smoke && this.smoke.update(dt, t);
    if (this.stage === 'crater' && g.player.pos.distanceTo(V3(this.meta.crater)) < 6.5) {
      this.stage = 'craterTalk';
      g.npcs.elif && g.npcs.elif.play('kneel', 0.6);
      g.say(C1.crater, () => {
        this.stage = 'take';
        g.objective(OBJECTIVES.take);
        const k = g.interact.find((i) => i.id === 'kor');
        if (k) k.hidden = false;
      });
    }
  }
}
