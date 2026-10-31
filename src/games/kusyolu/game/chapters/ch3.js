import * as THREE from 'three';
import { V3 } from '../util.js';
import { makeKor, makeSmoke } from '../props.js';
import { glowTex } from '../sky.js';
import { CHAPTER3 as C3 } from '../story.js';
import { loadDepo, placeKor } from './depo.js';

const PART_STAGE = { jenerator: 1, sac: 2, telsiz: 3, canak: 4 };

// Bölüm 3 — Depo: Kor'un yıldız haritası, parçaların toplanması, Leylek'in yapımı
export class Chapter3 {
  constructor(g) {
    this.g = g;
    this.delivered = [];
    this.carry = null;
  }
  async load() {
    const g = this.g;
    const d = (this.d = await loadDepo(g, { stages: -1, items: ['jenerator', 'sac', 'telsiz', 'canak', 'defter'], label: 'Depo' }));
    const meta = (this.meta = d.meta);
    const kor = (g.kor = makeKor());
    placeKor(g, kor, V3(meta.korOnTable));
    kor.scale.setScalar(0.55);
    g.pulseMode = true;
    await g.loadNPCs(meta.npc);
    // herkes masaya, Kor'a baksın
    const table = V3(meta.table);
    for (const id of ['mert', 'elif', 'kaan']) g.npcs[id].faceTo(table, true);
    g.npcs.zeynep.faceTo(table, true);
    g.player.place(meta.spawn, meta.spawnYaw);
    g.player.yaw = Math.atan2(-(table.x - g.player.pos.x), -(table.z - g.player.pos.z));
    for (const [k, p] of Object.entries(meta.items)) {
      if (!PART_STAGE[k]) continue;
      g.interact.push({ id: 'item:' + k, pos: () => V3(p), r: 3.2, label: `${C3.parts[k].label}: al`, hidden: true, cone: 0.9 });
    }
    g.interact.push({ id: 'door', pos: () => V3(meta.door), r: 3.0, label: 'Kapıyı aç', hidden: true, cone: 0.85 });
    g.interact.push({ id: 'kor', pos: () => V3(meta.korOnTable), r: 2.2, label: 'Kor’a bak', hidden: true });
    this.sparks = makeSmoke(V3(meta.ship.p), { n: 60, rise: 1.2, drift: 0.5, alpha: 0.0, color: [1, 0.7, 0.3] });
    g.progress(1, '');
  }
  begin() {
    const g = this.g;
    this.stage = 'intro';
    g.card('Bölüm 3 · ' + C3.title, C3.place);
    g.objective('');
    g.later(3, () =>
      g.say(C3.intro, () => {
        this.stage = 'watch';
        g.objective(C3.objectives.watch);
        g.interact.find((i) => i.id === 'kor').hidden = false;
      })
    );
  }
  showMap() {
    const g = this.g;
    this.stage = 'map';
    g.objective('');
    g.interact.find((i) => i.id === 'kor').hidden = true;
    g.audio.korPulse(1.3);
    g.flashT = 0.4;
    // yıldız haritası: masanın üstünde dönen ışık noktaları, Ay ve dışarı uzanan yol
    const c = V3(this.meta.table).add(new THREE.Vector3(0, 1.3, 0));
    const N = 900;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const arm = i % 3;
      const r = Math.pow(Math.random(), 0.7) * 1.4;
      const a = r * 3.2 + (arm * Math.PI * 2) / 3 + (Math.random() - 0.5) * 0.5;
      pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.12 * (1.5 - r), Math.sin(a) * r], i * 3);
      const w = Math.random();
      col.set([0.6 + w * 0.4, 0.75 + w * 0.2, 1.0], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: glowTex() });
    const map = (this.map = new THREE.Group());
    map.position.copy(c);
    map.add(new THREE.Points(geo, mat));
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff0d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    moon.position.set(0.35, 0.05, 0.2);
    moon.scale.setScalar(0.22);
    map.add(moon);
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push(new THREE.Vector3(0.35 + t * 1.6, 0.05 + Math.sin(t * 3) * 0.25, 0.2 - t * 0.9 + Math.sin(t * 6) * 0.1));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffa860, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
    map.add(line);
    g.scene.add(map);
    this.mapMats = [mat, moon.material, line.material];
    this.mapT = 0;
    const mapLight = (this.mapLight = new THREE.PointLight(0x8fb0ff, 0, 8, 2));
    mapLight.position.copy(c);
    g.scene.add(mapLight);
    g.player.lookOverride = { target: c, w: 0 };
    g.lookRamp = 0.7;
    for (const n of Object.values(g.npcs)) {
      n.lookTarget = c;
      n.setExpr({ wide: 0.5, brow: 0.5, jaw: 0.1 });
    }
    g.later(1.5, () =>
      g.say(C3.map, () => {
        g.player.lookOverride = null;
        this.timeSkip();
      })
    );
  }
  timeSkip() {
    const g = this.g;
    this.stage = 'skip';
    g.emit('fade', 1);
    g.later(1.2, () => {
      if (this.map) {
        g.scene.remove(this.map);
        this.map = null;
        this.mapLight.intensity = 0;
      }
      this.d.setStage(0);
      for (const n of Object.values(g.npcs)) {
        n.lookTarget = g.camera.position;
        n.setExpr({ smile: 0.1 });
      }
      const m = g.npcs.mert;
      m.root.position.copy(V3(this.meta.mertAtShip.p));
      m.faceTo(V3(this.meta.spawn), true);
      g.npcs.kaan.root.position.copy(V3(this.meta.ship.p).setY(0).add(new THREE.Vector3(2.2, 0, 3.2)));
      g.npcs.kaan.faceTo(V3(this.meta.ship.p), true);
      g.npcs.kaan.play('work');
      g.npcs.elif.root.position.copy(V3(this.meta.table).setY(0).add(new THREE.Vector3(-1.8, 0, -1.2)));
      g.npcs.elif.faceTo(V3(this.meta.ship.p), true);
      g.player.place(this.meta.spawn, 0);
      g.player.yaw = Math.atan2(-(m.root.position.x - g.player.pos.x), -(m.root.position.z - g.player.pos.z));
      g.emit('fade', 0);
      g.card('Üç hafta sonra', 'Her gece, okul ve iş çıkışı');
      g.later(3.8, () =>
        g.say(C3.later, () => {
          this.stage = 'parts';
          this.objective();
          for (const it of g.interact) if (it.id.startsWith('item:')) it.hidden = false;
        })
      );
    });
  }
  objective() {
    const g = this.g;
    if (this.carry) g.objective(C3.objectives.deliver(C3.parts[this.carry].label));
    else g.objective(C3.objectives.parts(this.delivered.length));
  }
  interact(f) {
    const g = this.g;
    if (f.id === 'kor' && this.stage === 'watch') return this.showMap();
    if (f.id.startsWith('item:') && this.stage === 'parts') {
      if (this.carry) {
        g.emit('hint', 'Elin dolu. Önce elindekini Mert’e götür.');
        return;
      }
      const k = f.id.slice(5);
      this.carry = k;
      for (const o of this.d.itemNodes[k]) o.visible = false;
      f.hidden = true;
      g.audio.clunk();
      g.emit('carry', C3.parts[k].label);
      g.player.slow = k === 'jenerator' || k === 'sac';
      this.objective();
      return;
    }
    if (f.id === 'door' && this.stage === 'knock') {
      this.stage = 'choice';
      g.audio.shutter();
      g.player.locked = true;
      g.emit('choice', { prompt: C3.choice.prompt, options: C3.choice.options.map((o) => ({ id: o.id, text: o.text })) });
    }
  }
  choose(id) {
    const g = this.g;
    const o = C3.choice.options.find((x) => x.id === id) || C3.choice.options[0];
    this.choice = o.id;
    try {
      localStorage.setItem('kusyolu-bekci', o.id);
    } catch {}
    g.say(o.reply, () => {
      g.player.locked = false;
      g.audio.shutter();
      this.stage = 'parts';
      g.interact.find((i) => i.id === 'door').hidden = true;
      this.objective();
    });
  }
  talk(id) {
    const g = this.g;
    if (id === 'mert' && this.carry && this.stage === 'parts') return this.deliver();
    if (this.stage === 'parts' && !this.carry && id === 'mert') {
      g.say([C3.later[1]]);
    }
  }
  deliver() {
    const g = this.g;
    const k = this.carry;
    this.carry = null;
    g.player.slow = false;
    g.emit('carry', null);
    this.delivered.push(k);
    this.d.setStage(Math.max(...this.delivered.map((x) => PART_STAGE[x]).concat(0)));
    // aşamaları sırayla değil, teslim edilenlere göre göster
    for (let i = 1; i <= 4; i++) {
      const has = this.delivered.some((x) => PART_STAGE[x] === i);
      for (const o of this.d.stage[i]) o.visible = has;
    }
    g.audio.weld(1.4);
    this.weldT = 1.4;
    g.npcs.mert.play('work', 0.3);
    g.later(1.6, () => g.npcs.mert.play('idle', 0.4));
    g.say([C3.parts[k].line], () => {
      if (this.delivered.length === 2 && !this.knocked) {
        this.knocked = true;
        g.later(1.5, () => this.knock());
      } else if (this.delivered.length === 4) this.finish();
    });
    this.objective();
  }
  knock() {
    const g = this.g;
    this.stage = 'knock';
    g.audio.knock();
    g.later(0.8, () => g.audio.knock());
    g.say(C3.knock, () => {
      g.objective(C3.objectives.door);
      g.interact.find((i) => i.id === 'door').hidden = false;
    });
  }
  finish() {
    const g = this.g;
    this.stage = 'done';
    g.objective('');
    this.d.setStage(5);
    g.flashT = 0.35;
    g.audio.korPulse(1);
    for (const n of Object.values(g.npcs)) n.setExpr({ smile: 0.35 });
    g.say(C3.done, () => {
      g.emit('fade', 1);
      g.later(1.0, () => g.completeChapter(4));
    });
  }
  update(dt, t) {
    const g = this.g;
    if (g.kor) {
      g.kor.userData.mat.uniforms.t.value = t;
      g.kor.userData.mat.uniforms.glow.value = 0.5 + (g.pulse || 0) * 1.8;
      g.korLight.intensity = 4 + (g.pulse || 0) * 14;
      g.kor.rotation.y += dt * 0.2;
    }
    if (this.map) {
      this.mapT += dt;
      const a = Math.min(1, this.mapT / 2.5);
      this.mapMats[0].opacity = a;
      this.mapMats[1].opacity = a;
      this.mapMats[2].opacity = Math.min(1, Math.max(0, (this.mapT - 3) / 2));
      this.map.rotation.y += dt * 0.12;
      this.mapLight.intensity = a * 6;
    }
    if (this.weldT > 0) {
      this.weldT -= dt;
      g.flashT = Math.max(g.flashT, 0.08 * Math.random());
    }
  }
}
