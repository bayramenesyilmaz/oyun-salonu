import * as THREE from 'three';
import { Game } from './Game.js';
import { Player } from './player.js';
import { buildHouse } from './house.js';
import { Nine } from './nine.js';
import { narrator } from './narrator.js';
import { LINES2, PAGE4, OBJECTIVES2, ITEMS2, DEATH2, SAY2 } from './story2.js';

// Bölüm 2 — Gülsüm. Aynı oyun motoru (oyuncu, ses, görüntü efektleri), başka bir dünya ve başka bir varlık.
const STAGES = ['sofra', 'testi', 'testi2', 'sit', 'dinner', 'blackout', 'corner', 'note', 'items', 'destur', 'dawn', 'end'];
const after = (a, b) => STAGES.indexOf(a) >= STAGES.indexOf(b);
const DAWN_SEC = 42;

export class Chapter2 extends Game {
  get saveKey() {
    return 'karakuyu2-save';
  }

  static hasSave() {
    return Game.hasSave('karakuyu2-save');
  }

  setupWorld(scene) {
    this.chapter = 2;
    scene.background = new THREE.Color(0x020306);
    scene.fog = new THREE.FogExp2(0x06080c, 0.03);
    scene.traverse((o) => {
      if (o.isHemisphereLight) this.hemi = o;
    });
    this.moon.intensity = 0;
    this.moon.castShadow = false;
    this.world = buildHouse(scene, this.T);
    this.player = new Player(this.camera, this.world, scene);
    this.nine = new Nine(scene, this.world, this.T);
    this.creature = this.nine;
    this.nineReady = this.nine.load('/karakuyu/nine.glb').catch((e) => console.error('nine', e));
    this.hum = null;
    this.dawnT = 0;
  }

  setupSpawn() {
    this.objective = OBJECTIVES2.sofra;
    this.player.setSpawn(0, 4.9, 0);
    this.applyFlags();
    this.placeNine();
  }

  freshFlags() {
    return { stage: 'sofra', items: {}, iron: 0, note: false, offered: false };
  }

  // ---------- Kayıt ----------
  saveCheckpoint() {
    const p = this.player;
    this.checkpoint = { flags: JSON.parse(JSON.stringify(this.flags)), pos: p.pos.clone(), yaw: p.yaw, objective: this.objective };
    try {
      const c = this.checkpoint;
      localStorage.setItem(this.saveKey, JSON.stringify({ ...c, pos: [c.pos.x, c.pos.z], t: Date.now() }));
    } catch { /* yok say */ }
  }

  continueSaved() {
    let d;
    try { d = JSON.parse(localStorage.getItem(this.saveKey)); } catch { d = null; }
    if (!d) return this.start();
    this.audio.init();
    this.checkpoint = { ...d, pos: new THREE.Vector3(d.pos[0], 0, d.pos[1]) };
    this.nineReady.then(() => this.restoreCheckpoint());
  }

  restoreCheckpoint() {
    const c = this.checkpoint;
    narrator.stop();
    this.speakId = (this.speakId || 0) + 1;
    this.timers = [];
    this.flags = JSON.parse(JSON.stringify(c.flags));
    this.flags.items = this.flags.items || {};
    // yarım kalmış ara sahneler kayıttan güvenli bir yere döner
    if (this.flags.stage === 'dinner') this.flags.stage = 'sit';
    if (this.flags.stage === 'blackout' || this.flags.stage === 'corner') this.flags.stage = 'note';
    this.objective = c.objective;
    this.player.setSpawn(c.pos.x, c.pos.z, c.yaw);
    this.player.frozen = false;
    this.player.eye = 1.65;
    this.applyFlags();
    this.placeNine();
    if (this.flags.stage === 'dawn') this.dawnT = DAWN_SEC;
    this.fear = 0;
    this.flash = 0;
    this.fade = 0;
    this.audio.restoreAmbience();
    this.ignoreUnlockUntil = performance.now() + 600;
    this.updateObjective();
    this.phase = 'playing';
    this.emit('phase', 'playing');
    this.clock.getDelta();
    this.lockPointer();
  }

  restart() {
    narrator.stop();
    this.flags = this.freshFlags();
    this.player.setSpawn(0, 4.9, 0);
    this.saveCheckpoint();
    this.restoreCheckpoint();
  }

  beginPlay() {
    this.nineReady.then(() => {
      this.applyFlags();
      this.placeNine();
      super.beginPlay();
      this.later(0.8, () => this.speak(LINES2.welcome));
    });
  }

  // ---------- Dünya durumunu bayraklara göre kur ----------
  applyFlags() {
    const f = this.flags, R = this.world.refs, st = f.stage;
    const dark = after(st, 'blackout');
    this.world.setPower(!dark);
    this.player.noLantern = !dark;
    this.player.lanternOn = dark;
    if (this.hemi) {
      this.hemi.intensity = dark ? 0.5 : 0.55;
      this.hemi.color.set(dark ? 0x4a5c84 : 0xa89478);
      this.hemi.groundColor.set(dark ? 0x141018 : 0x2a2018);
    }
    this.scene.fog.density = dark ? 0.022 : 0.01;
    this.scene.fog.color.set(dark ? 0x0a0e16 : 0x100c08);
    R.wallSini.visible = !after(st, 'testi');
    R.sofraSet.visible = after(st, 'testi');
    R.sofraTesti.visible = after(st, 'sit');
    R.testi.visible = !after(st, 'testi2');
    for (const [id, m] of Object.entries(R.items)) {
      const vis = !f.items[id];
      m.traverse((o) => (o.visible = vis));
      m.visible = vis;
    }
    R.sandik.userData.glowOn = after(st, 'note') && !f.note;
    R.offer.salt.visible = R.offer.bread.visible = R.offer.scis.visible = !!f.offered;
    f.iron = f.items.makas && !f.offered && !f.repelUsed ? 1 : 0;
  }

  placeNine() {
    const n = this.nine, S = this.world.refs.spots, st = this.flags.stage;
    if (!n.model) return;
    n.prints.clear();
    n.frenzy = 0;
    n.root.position.y = 0;
    if (!after(st, 'dinner')) {
      n.setPossessed(false);
      n.setState('script');
      n.place(S.kitchenWork.x, S.kitchenWork.z, S.kitchenWork.yaw);
      n.faceYaw = S.kitchenWork.yaw;
      n.scriptClip = 'work';
      n.play('work', 0);
      this.stopHum();
    } else {
      n.setPossessed(true);
      const far = n.farFrom(this.player.pos);
      n.place(far[0], far[1], Math.random() * 6);
      n.setState(st === 'dawn' ? 'chase' : 'hunt');
      if (st === 'dawn') {
        n.frenzy = 1;
        n.lastSeen.copy(this.player.pos);
      }
      this.startHum();
    }
  }

  // ---------- Konuşma: altyazı + doğal ses (varsa) ----------
  speak(list, done) {
    const id = (this.speakId = (this.speakId || 0) + 1);
    const next = (i) => {
      if (id !== this.speakId) return;
      if (i >= list.length) {
        this.nine.speaking = false;
        done && done();
        return;
      }
      const [s, t] = list[i];
      const who = s === 'nine' ? 'Ninem: ' : s === 'cin' ? 'Ninem (başka bir sesle): ' : '';
      const ms = 1800 + t.length * 60;
      this.emit('toast', { text: who + t, ms, id: Math.random() });
      this.nine.speaking = s !== 'narrator';
      let fin = false;
      const go = () => {
        if (fin || id !== this.speakId) return;
        fin = true;
        this.nine.speaking = false;
        this.later(0.35, () => next(i + 1));
      };
      if (narrator.enabled && narrator.canSpeak) narrator.say(t, { voiceKey: s, pitch: s === 'cin' ? 0.35 : s === 'nine' ? 1.15 : 0.95, rate: s === 'cin' ? 0.75 : 1, onEnd: go });
      this.later(2.2 + t.length * 0.11, go);
    };
    next(0);
  }

  openNote(id) {
    if (id !== 'page4') return super.openNote(id);
    this.noteOpenedAt = performance.now();
    narrator.say(PAGE4.text, { pitch: 0.8 });
    this.phase = 'note';
    this.player.keys.clear();
    this.audio.paper();
    this.emit('note', { id, ...PAGE4 });
    this.emit('phase', 'note');
  }

  openJournal() {
    this.phase = 'journal';
    this.player.keys.clear();
    const f = this.flags;
    const pages = f.note ? [{ id: 'page4', ...PAGE4 }] : [];
    const lore = [];
    if (after(f.stage, 'note')) lore.push('Ninemin içindeki, kuyudan benimle gelen şey. Geri geri yürür, ayakları ters basar.');
    if (f.note) lore.push('Eşiğe tuz ve ekmek, kapının üstüne demir (makas). Sonra “destur” ve sabahı beklemek.', 'Makas bir kez korur: ona doğru tutarsan geri çekilir.', 'Yüklükte saklanılır. Işığa ve sese gelir.');
    const items = Object.keys(ITEMS2).filter((k) => f.items[k]).map((k) => ITEMS2[k].name);
    this.emit('journal', { pages, key: false, dials: [], lore, items, iron: f.iron || 0, offered: !!f.offered });
    this.emit('phase', 'journal');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  setObjective(text) {
    this.objective = text;
    this.emit('objective', text);
  }

  updateObjective() {
    const f = this.flags, st = f.stage;
    if (st === 'items') {
      const left = Object.keys(ITEMS2).filter((k) => !f.items[k]).map((k) => ITEMS2[k].name);
      this.setObjective(left.length ? OBJECTIVES2.items(left.join(', ')) : OBJECTIVES2.door);
    } else if (st === 'testi2') this.setObjective(OBJECTIVES2.testi);
    else if (st === 'dawn') this.setObjective(OBJECTIVES2.dawn);
    else if (OBJECTIVES2[st] !== undefined) this.setObjective(OBJECTIVES2[st]);
    else if (st === 'corner' || st === 'blackout') this.setObjective(OBJECTIVES2.blackout);
  }

  // ---------- Etkileşim ----------
  promptFor(id) {
    const f = this.flags, st = f.stage;
    if (id === '__unhide') return 'Çık';
    if (id === 'nine') {
      if (st === 'sofra' || st === 'testi' || st === 'testi2' || st === 'sit') return 'Ninenle konuş';
      if (st === 'blackout') return 'Nine?';
      return null;
    }
    if (id === 'sofra') {
      if (st === 'sofra') return 'Sofrayı kur';
      if (st === 'testi2') return 'Testiyi sofraya koy';
      if (st === 'sit') return 'Sofraya otur';
      return null;
    }
    if (id === 'musluk') return st === 'testi' ? 'Testiyi doldur' : null;
    if (id === 'sandik') return after(st, 'note') && !f.note ? 'Dedenin sandığını aç' : null;
    if (ITEMS2[id]) return after(st, 'note') && !f.items[id] ? ITEMS2[id].prompt : null;
    if (id.startsWith('hide_')) return after(st, 'note') ? 'Yüklüğe saklan' : null;
    if (id === 'esik') {
      if (st === 'destur') return '“Destur” de';
      if (st === 'items' && !f.offered) return f.items.tuz && f.items.ekmek && f.items.makas ? 'Tuzu ve ekmeği eşiğe koy, makası kapının üstüne as' : 'Eşik';
    }
    return null;
  }

  interact() {
    const fo = this.focus;
    if (!fo) return;
    const id = fo.id, f = this.flags, st = f.stage, R = this.world.refs, P = this.player, n = this.nine;
    if (this.player.frozen) return;
    if (id === '__unhide') {
      P.unhide();
      this.audio.creak(0.15, this.audio.sfx);
      this.emit('hidden', false);
      return;
    }
    if (id.startsWith('hide_') && after(st, 'note')) {
      const spot = R.hiding.find((s) => s.id === id);
      if (!spot) return;
      // saklanırken görüyorsa yerini bilir
      n.sawHide = n.state === 'chase' && n.canSee({ playerPos: P.pos, hidden: false, lantern: P.lanternOn }, n.pos.distanceTo(P.pos));
      P.hide(spot);
      this.hideSpot = spot;
      this.audio.creak(0.12, this.audio.sfx);
      this.emit('hidden', true);
      return;
    }
    if (id === 'nine') {
      if (st === 'sofra') this.speak(LINES2.hintSofra);
      else if (st === 'testi' || st === 'testi2') this.speak(LINES2.testi);
      else if (st === 'sit') this.speak(LINES2.hintSit);
      else if (st === 'blackout') this.startCorner();
      return;
    }
    if (id === 'sofra') {
      if (st === 'sofra') {
        f.stage = 'testi';
        this.applyFlags();
        this.audio.clunk();
        this.speak([...LINES2.sofra, ...LINES2.testi]);
        this.updateObjective();
      } else if (st === 'testi2') {
        f.stage = 'sit';
        this.applyFlags();
        this.audio.clunk();
        this.updateObjective();
        this.saveCheckpoint();
      } else if (st === 'sit') this.startDinner();
      return;
    }
    if (id === 'musluk' && st === 'testi') {
      f.stage = 'testi2';
      this.applyFlags();
      this.waterSound();
      this.speak(LINES2.testiDone);
      this.updateObjective();
      return;
    }
    if (id === 'sandik' && after(st, 'note') && !f.note) {
      f.note = true;
      if (f.stage === 'note') f.stage = 'items';
      this.applyFlags();
      this.openNote('page4');
      this.pendingAfterNote = () => {
        this.speak(LINES2.afterNote);
        this.updateObjective();
        this.saveCheckpoint();
      };
      return;
    }
    if (ITEMS2[id] && after(st, 'note') && !f.items[id]) {
      const it = ITEMS2[id];
      f.items[id] = true;
      this.applyFlags();
      this.audio.chime();
      this.toast(it.toast, 4200, it.toast);
      this.updateObjective();
      this.saveCheckpoint();
      return;
    }
    if (id === 'esik') {
      if (st === 'items' && !f.offered) {
        if (!(f.items.tuz && f.items.ekmek && f.items.makas)) {
          this.toast(f.note ? SAY2.needItems : SAY2.bolted, 3000, true);
          return;
        }
        f.offered = true;
        f.stage = 'destur';
        this.applyFlags();
        this.audio.chime();
        this.setObjective(OBJECTIVES2.destur);
        this.saveCheckpoint();
        return;
      }
      if (st === 'destur') this.startDawn();
    }
  }

  // ---------- Ara sahneler ----------
  fadeTo(v, dur, fn) {
    this.anims = this.anims || [];
    const s = this.fade;
    this.anims.push({ t: 0, dur, fn: (k) => {
      this.fade = s + (v - s) * k;
      if (k >= 1 && fn) {
        const f = fn;
        fn = null;
        f();
      }
    } });
  }

  startDinner() {
    const P = this.player, n = this.nine, S = this.world.refs.spots;
    this.flags.stage = 'dinner';
    P.frozen = true;
    this.setObjective('');
    this.fadeTo(1, 0.7, () => {
      P.setSpawn(S.sitPlayer.x, S.sitPlayer.z, S.sitPlayer.yaw);
      P.frozen = true;
      P.eye = 1.05;
      P.pitch = -0.12;
      n.setState('script');
      n.place(S.sitNine.x, S.sitNine.z, S.sitNine.yaw + Math.PI);
      n.faceYaw = S.sitNine.yaw + Math.PI;
      n.root.position.y = -0.36;
      n.scriptClip = 'sit';
      n.play('sit', 0);
      this.fadeTo(0, 0.9);
      this.later(1.2, () =>
        this.speak(LINES2.dinner, () => {
          // ekmeği almaya kalkar, mutfağa yürür
          n.root.position.y = 0;
          n.scriptClip = 'idle';
          n.play('idle', 0.5);
          P.frozen = false;
          this.later(0.8, () => {
            n.speed = 1.0;
            n.goTo(S.kitchenCorner.x, S.kitchenCorner.z, () => (n.faceYaw = S.kitchenCorner.yaw));
            this.later(5.5, () => this.blackout());
          });
        })
      );
    });
  }

  blackout() {
    const f = this.flags, n = this.nine, S = this.world.refs.spots;
    f.stage = 'blackout';
    this.applyFlags();
    this.audio.clunk();
    this.flash = 0.15;
    // görmediği anda köşeye yerleşir
    n.place(S.kitchenCorner.x, S.kitchenCorner.z, S.kitchenCorner.yaw);
    n.setPossessed(true);
    n.setState('corner');
    n.cornerYaw = S.kitchenCorner.yaw;
    n.cornerLook = false;
    this.startHum();
    this.speak(LINES2.blackout);
    this.updateObjective();
  }

  startCorner() {
    const f = this.flags, n = this.nine, P = this.player;
    if (f.stage !== 'blackout') return;
    f.stage = 'corner';
    P.frozen = true;
    n.lookAt = this.camera.position;
    n.cornerLook = true;
    this.audio.stinger();
    this.later(1.4, () =>
      this.speak(LINES2.corner, () => {
        P.frozen = false;
        n.cornerLook = false;
        this.flags.stage = 'note';
        this.player.shake = 0.6;
        this.audio.scream({ x: n.pos.x, y: 1.6, z: n.pos.z }, 0.7);
        this.setObjective(OBJECTIVES2.note);
        this.toast(SAY2.backward, 4200, true);
        this.saveCheckpoint();
        this.later(1.5, () => {
          n.setState('hunt');
          n.suspicion = 0.3;
        });
      })
    );
  }

  startDawn() {
    const f = this.flags, n = this.nine;
    f.stage = 'dawn';
    this.dawnT = DAWN_SEC;
    this.applyFlags();
    this.flash = 0.5;
    this.player.shake = 1;
    this.audio.rumble(3, 0.8);
    this.saveCheckpoint();
    this.speak(LINES2.destur);
    n.frenzy = 1;
    n.lastSeen.copy(this.player.pos);
    n.setState('chase');
    this.setObjective(OBJECTIVES2.dawn);
  }

  finishDawn() {
    const f = this.flags, n = this.nine;
    f.stage = 'end';
    this.audio.rooster();
    this.stopHum();
    n.setPossessed(false);
    n.setState('collapsed');
    this.flash = 0.3;
    for (const w of this.world.refs.windows) w.material.color.set(0x5a6a88);
    this.setObjective('');
    this.player.frozen = true;
    this.later(1.2, () => this.speak(LINES2.dawn, () => this.later(1.5, () => this.ending())));
  }

  ending() {
    this.clearSave();
    this.emit('endingKind', 'ch2');
    try {
      const k = JSON.parse(localStorage.getItem('karakuyu-endings') || '{}');
      k.ch2 = true;
      localStorage.setItem('karakuyu-endings', JSON.stringify(k));
    } catch { /* yok say */ }
    this.phase = 'ending';
    this.player.frozen = true;
    this.audio.silenceAll(3);
    this.anims = this.anims || [];
    this.anims.push({ t: 0, dur: 2.5, fn: (k) => (this.fade = k) });
    this.later(2.6, () => {
      this.emit('phase', 'ending');
      if (document.pointerLockElement) document.exitPointerLock();
    });
  }

  die() {
    if (this.phase === 'dead') return;
    this.phase = 'dead';
    this.speakId = (this.speakId || 0) + 1;
    this.player.keys.clear();
    if (this.player.hidden) {
      this.player.unhide();
      this.emit('hidden', false);
    }
    this.deathTimer = 0;
    const cam = this.camera, n = this.nine;
    const fwd = new THREE.Vector3();
    cam.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    n.setState('script');
    n.scriptClip = 'cin_idle';
    n.play('cin_idle', 0);
    n.place(cam.position.x + fwd.x * 0.62, cam.position.z + fwd.z * 0.62, Math.atan2(-fwd.x, -fwd.z));
    n.faceYaw = n.yaw;
    n.headTwistTarget = 0;
    n.headTwist = 0;
    this.player.lanternOn = true;
    this.player.shake = 3;
    this.flash = 1;
    this.audio.jumpscare();
    this.stopHum();
    narrator.stop();
    const line = DEATH2[Math.floor(Math.random() * DEATH2.length)];
    this.later(1.4, () => {
      this.audio.silenceAll(1);
      this.emit('phase', 'dead');
      this.emit('death', { line });
      if (document.pointerLockElement) document.exitPointerLock();
    });
  }

  repel() {
    const f = this.flags, n = this.nine;
    f.repelUsed = true;
    this.applyFlags();
    this.audio.ironRepel();
    this.flash = 0.8;
    this.player.shake = 0.9;
    n.stun(5);
    this.speak(LINES2.repel);
  }

  // ---------- Sesler ----------
  waterSound() {
    const a = this.audio;
    if (!a.ready) return;
    const ctx = a.ctx, t = ctx.currentTime;
    const s = a.noiseSrc(a.white, false);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.2);
    g.gain.setValueAtTime(0.18, t + 1.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    s.connect(f).connect(g).connect(a.sfx);
    s.start(t);
    s.stop(t + 2.3);
  }

  // Düğün türküsü mırıltısı: ninenin bulunduğu yerden gelir
  startHum() {
    const a = this.audio;
    if (!a.ready || this.hum) return;
    const ctx = a.ctx;
    const pan = a.makePanner();
    const g = ctx.createGain();
    g.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'triangle';
    o2.type = 'sine';
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 5.2;
    vg.gain.value = 4;
    vib.connect(vg);
    vg.connect(o1.frequency);
    vg.connect(o2.frequency);
    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g).connect(pan).connect(a.sfx);
    o1.start();
    o2.start();
    vib.start();
    this.hum = { o1, o2, vib, g, pan, idx: 0, t: 0 };
  }

  stopHum() {
    const h = this.hum;
    if (!h) return;
    const t = this.audio.ctx.currentTime;
    h.g.gain.setTargetAtTime(0, t, 0.2);
    setTimeout(() => {
      try { h.o1.stop(); h.o2.stop(); h.vib.stop(); } catch { /* yok say */ }
    }, 900);
    this.hum = null;
  }

  updateHum(dt) {
    const h = this.hum, n = this.nine;
    if (!h) return;
    // Hicaz makamına yakın, yavaş bir ezgi (Hz)
    const MEL = [294, 311, 370, 392, 370, 311, 294, 262, 294, 0, 392, 440, 392, 370, 311, 294, 0, 0];
    h.t -= dt;
    const ctx = this.audio.ctx, t = ctx.currentTime;
    if (h.t <= 0) {
      h.idx = (h.idx + 1) % MEL.length;
      h.t = 0.42 + Math.random() * 0.12;
      const f = MEL[h.idx] * 0.5;
      if (f > 0) {
        h.o1.frequency.setTargetAtTime(f, t, 0.06);
        h.o2.frequency.setTargetAtTime(f * 2.003, t, 0.06);
      }
      h.note = f > 0;
    }
    const loud = n.state === 'chase' || n.speaking ? 0 : n.state === 'corner' ? 0.16 : 0.1;
    h.g.gain.setTargetAtTime(h.note ? loud : 0, t, 0.08);
    this.audio.setPanner(h.pan, n.pos.x, 1.5, n.pos.z);
  }

  // ---------- Döngü ----------
  frame(dt, doRender = true) {
    if (this.phase === 'menu' || this.phase === 'intro' || this.phase === 'loading') {
      this.time += dt;
      const t = this.time;
      this.camera.position.set(Math.sin(t * 0.15) * 0.25, 1.62, 5.2);
      this.camera.lookAt(0, 1.45, -6);
      this.player.lantern.visible = false;
      this.world.update(dt, t);
      if (this.nine.model) this.nine.animate(dt, t, {});
      this.post.u.uTime.value = t;
      this.post.u.uFear.value = 0.06;
      if (doRender) this.post.composer.render(dt);
      return;
    }
    if (this.phase === 'dead') {
      this.time += dt;
      this.deathTimer += dt;
      this.player.shake = Math.max(this.player.shake, 1.2);
      this.nine.possessed = true;
      this.nine.animate(dt, this.time, {});
      this.fade = Math.min(1, Math.max(0, (this.deathTimer - 0.9) * 1.5));
      this.fear = 1;
      this.tickTimers(dt);
      this.finishFrame(dt, doRender);
      return;
    }
    if (this.phase === 'playing' || this.phase === 'ending') {
      this.time += dt;
      if (this.phase === 'playing') this.updatePlaying(dt, this.time);
      else this.player.update(dt, this.time);
      this.tickTimers(dt);
    }
    this.finishFrame(dt, doRender);
  }

  tickTimers(dt) {
    if (this.timers) {
      for (const tm of this.timers) tm.t -= dt;
      const due = this.timers.filter((x) => x.t <= 0);
      this.timers = this.timers.filter((x) => x.t > 0);
      due.forEach((x) => x.fn());
    }
    if (this.anims) {
      for (const a of this.anims) {
        a.t += dt;
        a.fn(Math.min(1, a.t / a.dur));
      }
      this.anims = this.anims.filter((a) => a.t < a.dur);
    }
  }

  finishFrame(dt, doRender) {
    this.world.update(dt, this.time);
    this.flash = Math.max(0, this.flash - dt * 1.5);
    const u = this.post.u;
    u.uTime.value = this.time;
    u.uFear.value = this.fear;
    u.uFlash.value = this.flash;
    u.uFade.value = this.fade;
    if (doRender) this.post.composer.render(dt);
  }

  updatePlaying(dt, t) {
    const P = this.player, n = this.nine, f = this.flags;
    P.update(dt, t);
    if (P.frozen && f.stage === 'corner') {
      // ninenin yüzüne doğru çevril
      const hp = n.head ? n.head.getWorldPosition(new THREE.Vector3()) : n.pos.clone().setY(1.5);
      const want = Math.atan2(-(hp.x - P.pos.x), -(hp.z - P.pos.z));
      let d = want - P.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      P.yaw += d * Math.min(1, dt * 2.5);
      P.pitch += (-0.05 - P.pitch) * Math.min(1, dt * 2.5);
    }
    const evs = n.model
      ? n.update(dt, t, { playerPos: P.pos, hidden: P.hidden, hideSpot: this.hideSpot, lantern: P.lanternOn, noise: P.noise, crouch: P.crouch })
      : [];
    for (const e of evs) {
      if (e.type === 'caught') {
        if ((f.iron || 0) > 0) {
          this.repel();
          break;
        }
        return this.die();
      }
      if (e.type === 'chaseStart') {
        this.audio.scream({ x: n.pos.x, y: 1.6, z: n.pos.z }, 0.8);
        this.toast('Gördü beni. KAÇ.', 1800);
      }
      if (e.type === 'step') this.audio.creatureStep({ x: n.pos.x, y: 0.2, z: n.pos.z }, e.fast);
      if (e.type === 'scratch') {
        this.audio.creak(0.3, this.audio.sfx);
        this.toast('Yüklüğün kapağını tırnaklıyor. Nefesini tut.', 3000);
      }
    }
    // karanlıkta mutfağa girince ya da çok yaklaşınca köşe sahnesi
    if (f.stage === 'blackout' && n.model) {
      const d = n.pos.distanceTo(P.pos);
      if (d < 2.4 || (P.pos.x < -2.3 && P.pos.z > 0.2 && d < 4.2)) this.startCorner();
    }
    if (f.stage === 'dawn') {
      this.dawnT -= dt;
      const s = Math.max(0, Math.ceil(this.dawnT));
      if (s !== this._lastS) {
        this._lastS = s;
        this.setObjective(`${OBJECTIVES2.dawn} (${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')})`);
      }
      // pencereler yavaş yavaş ağarır
      const k = 1 - this.dawnT / DAWN_SEC;
      for (const w of this.world.refs.windows) w.material.color.setRGB(0.1 + k * 0.18, 0.16 + k * 0.2, 0.28 + k * 0.25);
      if (this.dawnT <= 0) this.finishDawn();
    }

    // korku
    let target = 0;
    const active = n.possessed && !['collapsed', 'script'].includes(n.state);
    if (active) {
      const d = n.pos.distanceTo(P.pos);
      target = Math.max(0, 1 - d / 12) * 0.7;
      if (n.state === 'chase') target = Math.max(target, 0.55) + 0.25;
      if (n.state === 'corner') target = Math.max(target, 0.4);
      if (P.hidden && n.state !== 'chase') target *= 0.8;
    }
    this.fear += (Math.min(1, target) - this.fear) * Math.min(1, dt * 2.5);
    P.flickerMul = this.fear > 0.35 ? (Math.random() < this.fear * 0.12 ? 0.15 : 1 - this.fear * 0.25) : 1;

    // ses
    const fwd = P.forward();
    this.audio.updateListener(this.camera.position, fwd);
    this.audio.updateCreature(n.pos, active && n.state === 'chase', n.state === 'chase');
    this.audio.setFear(this.fear, n.state === 'chase');
    this.updateHum(dt);

    this.focusTimer -= dt;
    if (this.focusTimer <= 0) {
      this.focusTimer = 0.08;
      this.updateFocus();
    }
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.emit('hud', {
        stamina: P.stamina,
        exhausted: P.exhausted,
        lantern: P.lanternOn && !P.noLantern,
        crouch: P.crouch,
        hidden: !!P.hidden,
        hideKind: P.hidden ? P.hidden.kind : null,
        fear: this.fear,
        chase: n.state === 'chase',
        iron: f.iron || 0,
      });
    }
  }
}
