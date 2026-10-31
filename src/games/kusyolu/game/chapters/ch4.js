import * as THREE from 'three';
import { V3 } from '../util.js';
import { makeKor } from '../props.js';
import { CHAPTER4 as C4 } from '../story.js';
import { loadDepo, placeKor } from './depo.js';

// Bölüm 4 — Hazırlık: son gece. Eşyalar, Kor'un yuvası, vedalar, Leylek'e biniş.
export class Chapter4 {
  constructor(g) {
    this.g = g;
    this.prep = new Set();
    this.bye = new Set();
    this.carryKor = false;
  }
  async load() {
    const g = this.g;
    const d = (this.d = await loadDepo(g, { stages: 5, items: ['su', 'harita', 'defter'], label: 'Son gece' }));
    const meta = (this.meta = d.meta);
    const kor = (g.kor = makeKor());
    placeKor(g, kor, V3(meta.korOnTable));
    kor.scale.setScalar(0.55);
    g.pulseMode = true;
    const ship = V3(meta.ship.p).setY(0);
    const npc = {
      zeynep: { p: meta.npc.zeynep.p, yaw: 0, clip: 'work' },
      mert: { p: [ship.x - 2.6, 0, ship.z + 3.2], yaw: 0 },
      elif: { p: [ship.x + 4.6, 0, ship.z + 3.0], yaw: 0 },
      kaan: { p: [ship.x - 6.5, 0, ship.z - 1.0], yaw: 0 },
    };
    await g.loadNPCs(npc);
    g.npcs.zeynep.faceTo(V3(meta.table), true);
    g.npcs.mert.faceTo(V3(meta.ship.p), true);
    g.npcs.elif.faceTo(V3(meta.ship.p).add(new THREE.Vector3(0, 0, -6)), true);
    g.npcs.kaan.faceTo(V3(meta.spawn), true);
    g.player.place(meta.spawn, 0);
    g.player.yaw = Math.atan2(-(ship.x - g.player.pos.x), -(ship.z - g.player.pos.z));
    for (const k of ['su', 'harita', 'defter']) g.interact.push({ id: 'item:' + k, pos: () => V3(meta.items[k]), r: 3.2, label: C4.items[k].label, cone: 0.9 });
    g.interact.push({ id: 'kor', pos: () => V3(meta.korOnTable), r: 2.2, label: 'Kor’u al' });
    g.interact.push({ id: 'slot', pos: () => V3(meta.korSlot), r: 3.0, label: C4.items.kor.label, hidden: true, cone: 0.85 });
    g.interact.push({ id: 'ladder', pos: () => V3(meta.ladder), r: 3.0, label: 'Leylek’e bin', hidden: true, cone: 0.85 });
    this.slotGlow = new THREE.PointLight(0xff8a30, 0, 6, 2);
    this.slotGlow.position.copy(V3(meta.korSlot));
    g.scene.add(this.slotGlow);
    g.progress(1, '');
  }
  begin() {
    const g = this.g;
    this.stage = 'prep';
    g.card('Bölüm 4 · ' + C4.title, C4.place);
    g.objective(C4.objectives.prep(0));
    g.later(3, () => g.say(C4.intro));
  }
  interact(f) {
    const g = this.g;
    if (f.id.startsWith('item:')) {
      const k = f.id.slice(5);
      f.hidden = true;
      for (const o of this.d.itemNodes[k]) o.visible = false;
      g.audio.clunk();
      this.prep.add(k);
      g.say([C4.items[k].line]);
      this.progress();
    } else if (f.id === 'kor' && !this.carryKor && !this.prep.has('kor')) {
      this.carryKor = true;
      f.hidden = true;
      g.scene.remove(g.kor);
      g.camera.add(g.kor);
      if (!g.scene.children.includes(g.camera)) g.scene.add(g.camera);
      g.kor.position.set(0.22, -0.26, -0.5);
      g.kor.scale.setScalar(0.42);
      g.korLight.position.set(0.2, -0.1, -0.3);
      g.camera.add(g.korLight);
      g.emit('carry', 'Kor');
      g.interact.find((i) => i.id === 'slot').hidden = false;
    } else if (f.id === 'slot' && this.carryKor) {
      this.carryKor = false;
      f.hidden = true;
      g.camera.remove(g.kor);
      g.camera.remove(g.korLight);
      g.kor.position.copy(V3(this.meta.korSlot));
      g.kor.scale.setScalar(0.5);
      g.scene.add(g.kor);
      g.korLight.position.copy(V3(this.meta.korSlot)).add(new THREE.Vector3(0, 0.3, 0));
      g.scene.add(g.korLight);
      g.emit('carry', null);
      g.audio.clunk();
      g.audio.korPulse(1.4);
      g.flashT = 0.5;
      this.slotGlow.intensity = 12;
      this.prep.add('kor');
      g.say([C4.items.kor.line]);
      this.progress();
    } else if (f.id === 'ladder' && this.stage === 'board') this.board();
  }
  progress() {
    const g = this.g;
    if (this.stage === 'prep') {
      if (this.prep.size >= 4) {
        this.stage = 'bye';
        g.later(2.5, () => g.objective(C4.objectives.bye(this.bye.size)));
      } else g.objective(C4.objectives.prep(this.prep.size));
    }
  }
  talk(id) {
    const g = this.g;
    if (this.stage !== 'bye' && this.stage !== 'board') {
      g.emit('hint', 'Önce hazırlıkları bitir.');
      return;
    }
    g.talkPose(id, true);
    g.npcs[id].setExpr({ smile: 0.2, brow: 0.3 });
    g.say(C4.farewell[id], () => {
      g.talkPose(id, false);
      if (this.stage !== 'bye') return;
      this.bye.add(id);
      g.objective(C4.objectives.bye(this.bye.size));
      if (this.bye.size >= 4) g.later(2, () => this.sms());
    });
  }
  sms() {
    const g = this.g;
    g.audio.beep(true);
    g.emit('message', C4.sms);
    g.later(4.5, () =>
      g.say(C4.smsReply, () => {
        this.stage = 'board';
        g.objective(C4.objectives.board);
        g.interact.find((i) => i.id === 'ladder').hidden = false;
        // arkadaşlar merdivene yürür ve gözden kaybolur
        for (const it of g.interact) if (it.id.startsWith('npc:')) it.hidden = true;
        const lad = V3(this.meta.ladder).setY(0);
        let k = 0;
        for (const id of ['kaan', 'zeynep', 'mert', 'elif']) {
          const n = g.npcs[id];
          g.later(k++ * 1.4, () => {
            n.play('idle');
            n.walkTo([lad.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, 0))], 1.5, () => (n.root.visible = false));
          });
        }
      })
    );
  }
  board() {
    const g = this.g;
    this.stage = 'end';
    g.player.locked = true;
    g.objective('');
    g.say(C4.board, () => {
      g.emit('fade', 1);
      g.later(1.0, () => g.completeChapter(5));
    });
  }
  update(dt, t) {
    const g = this.g;
    if (g.kor) {
      g.kor.userData.mat.uniforms.t.value = t;
      g.kor.userData.mat.uniforms.glow.value = 0.5 + (g.pulse || 0) * 1.8;
      g.korLight.intensity = 4 + (g.pulse || 0) * 12;
    }
    if (this.slotGlow.intensity > 0) this.slotGlow.intensity = 6 + (g.pulse || 0) * 10;
  }
}
