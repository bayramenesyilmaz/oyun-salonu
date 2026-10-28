import * as THREE from 'three';
import { buildLevel1, heightAt, roadX } from './level1.js';
import { timedAction, at } from './common.js';
import { L5, finalEnding } from '../story.js';

// BÖLÜM 5 — SON KARAKOL (final)
// Bölüm 1'in vadisi, bu kez sabah. Karakol (0,140) üç dalgaya karşı savunulur, sonra helikopter iner.

const POS = { x: -5, z: 114 }; // kapının önündeki kum torbası mevzisi
const HELI = { x: -8, z: 166 };

export function buildLevel5(game) {
  const story = game.story || {};
  const level = buildLevel1(game, { final: true });
  const scene = game.scene;
  const world = level.world;

  // Bölüm 1'in belgeleri ve atış hedefleri bu bölümde yok
  game.docsFound = new Set(['defter', 'telsiz', 'cizim']);
  level.syncDocs();

  // ---------- Kapı önü savunma hattı (kum torbaları) ----------
  {
    const bagMat = new THREE.MeshStandardMaterial({ map: game.T.sandbag, roughness: 1 });
    const bag = (x, z, w, d, ry = 0) => {
      const h = 1.05, y0 = heightAt(x, z) - 0.05;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bagMat);
      m.position.set(x, y0 + h / 2, z);
      m.rotation.y = ry;
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
      const cw = Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * d, cd = Math.abs(Math.sin(ry)) * w + Math.abs(Math.cos(ry)) * d;
      const b = world.addBox(x, z, cw, cd, y0, h);
      level.coverPoints.push({ p: new THREE.Vector3(x, heightAt(x, z + 1.2), z + 1.2), box: b, c: new THREE.Vector3(x, 0, z), low: true });
    };
    // iki yay: kapının solunda ve sağında
    for (const [cx, cz] of [[-5, 112.5], [6, 111.5]]) {
      bag(cx, cz, 3.2, 0.7);
      bag(cx - 1.9, cz + 0.9, 0.7, 2, 0.35);
      bag(cx + 1.9, cz + 0.9, 0.7, 2, -0.35);
    }
    bag(15, 116, 3, 0.7, -0.4);
    bag(-15, 117, 3, 0.7, 0.4);
  }

  // ---------- İniş alanı ve helikopter ----------
  {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32), new THREE.MeshStandardMaterial({ color: 0x5a5a50, roughness: 1 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(HELI.x, heightAt(HELI.x, HELI.z) + 0.05, HELI.z);
    scene.add(pad);
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.strokeStyle = '#e8e4d8';
    x.lineWidth = 8;
    x.beginPath();
    x.arc(64, 64, 54, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = '#e8e4d8';
    x.font = 'bold 80px sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('H', 64, 68);
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), transparent: true, roughness: 1 }));
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(HELI.x, heightAt(HELI.x, HELI.z) + 0.07, HELI.z);
    scene.add(mark);
  }
  const heli = new THREE.Group();
  const heliRotor = new THREE.Group();
  {
    const olive = new THREE.MeshStandardMaterial({ color: 0x5a6448, roughness: 0.6, metalness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.1, metalness: 0.8 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 4.2, 6, 14), olive);
    body.rotation.x = Math.PI / 2;
    body.position.y = 1.6;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), glass);
    nose.scale.set(1, 0.85, 1.2);
    nose.position.set(0, 1.7, 2.7);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 6, 10), olive);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 2.2, -5.2);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, 1.0), olive);
    fin.position.set(0, 3, -8);
    for (const sx of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 5), olive);
      skid.position.set(sx * 1.2, 0.1, 0.3);
      heli.add(skid);
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 8), olive);
    mast.position.y = 3.2;
    heliRotor.position.y = 3.55;
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 7.5), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      b.rotation.y = (i * Math.PI) / 2;
      b.position.z = 0;
      heliRotor.add(b);
    }
    heli.add(body, nose, tail, fin, mast, heliRotor);
    heli.traverse((o) => o.isMesh && (o.castShadow = true));
    heli.visible = false;
    scene.add(heli);
  }

  // ---------- Karakterler ----------
  const W = (id, wave, x, z) => ({ id, x, z, yaw: 0, dormant: true, wave, accuracy: 0.6 });
  const enemies = [
    W('w1a', 1, roadX(52) - 3, 52), W('w1b', 1, roadX(56) + 3, 56), W('w1c', 1, roadX(60) - 6, 60), W('w1d', 1, roadX(48) + 7, 48), W('w1e', 1, roadX(64), 64),
    W('w2a', 2, 52, 96), W('w2b', 2, 55, 102), W('w2c', 2, 49, 108), W('w2d', 2, 57, 90),
    W('w3a', 3, roadX(58) - 2, 58), W('w3b', 3, -48, 104), W('w3c', 3, -52, 112),
  ];
  if (!story.radioCut) enemies.push(W('w3d', 3, roadX(62) + 5, 62), W('w3e', 3, -46, 96));
  level.enemies = enemies;
  const civs = [];
  if (story.hasanSaved) civs.push({ id: 'hasan', name: 'Hasan Dayı', x: -3.5, z: 153.2, yaw: Math.PI, safeSpot: [-3.5, 0, 153.2] });
  if (story.muratSaved) civs.push({ id: 'murat', name: 'Murat', x: -2.2, z: 153.6, yaw: Math.PI, safeSpot: [-2.2, 0, 153.6] });
  level.civilians = civs;
  level.squad = { x: -15, z: 129, yaw: 0 };
  level.spawn = { x: 2, z: 136, yaw: Math.PI };
  level.startWithGear = true;
  level.docsTotal = 0;
  level.id = 5;
  level.night = false;
  level.introLines = L5.intro;
  level.env = { bg: 0x9aa8b8, fog: 0xb8b4ac, fogD: 0.0052, hemiSky: 0xd8e0f0, hemiGround: 0x7a6a50, hemi: 2.3, moon: 0xffe4c0, moonI: 3.2, exposure: 1.3 };

  const waveOf = (n) => game.enemies.filter((e) => e.def.wave === n);
  level.objectives = [
    { id: 'brief', text: 'Yüzbaşı Selim Er ile konuş', at: () => game.selimPos },
    { id: 'pos', text: 'Kapının önündeki kum torbası mevzisine geç', hidden: true, at: at(heightAt, POS.x, POS.z + 1.5) },
    { id: 'w1', text: 'Kuzey yolundan gelen saldırıyı püskürt', hidden: true, total: 5 },
    { id: 'w2', text: 'Dere yatağından sızanları durdur (doğu)', hidden: true, total: 4 },
    { id: 'w3', text: 'Son dalgayı karşıla', hidden: true, total: enemies.filter((e) => e.wave === 3).length },
    { id: 'heli', text: 'Helikopter inene kadar iniş alanını tut', hidden: true, at: at(heightAt, HELI.x, HELI.z, 1) },
    { id: 'squad', text: 'Kemal ayakta kalsın', optional: true },
  ];

  // ---------- Etkileşimler (Bölüm 1'inkiler yerine) ----------
  const inter = (level.interactables = []);
  inter.push(
    {
      id: 'selim',
      pos: new THREE.Vector3(game.selimPos.x, 1.4, game.selimPos.z),
      radius: 2.6,
      enabled: () => !game.mission.isDone('brief'),
      prompt: () => 'Yüzbaşı Selim Er ile konuş',
      use: () => script.brief(),
    },
    {
      id: 'ammo',
      pos: new THREE.Vector3(5.8, 0.7, 147.1),
      radius: 2.4,
      enabled: () => game.vm.reserve < 240,
      prompt: () => 'Cephane al',
      use: () =>
        timedAction(game, 'Şarjörler dolduruluyor…', 1.2, () => {
          game.vm.reserve = 240;
          game.audio.ui('ok');
          if (!script.flags.ammoSaid) {
            script.flags.ammoSaid = true;
            const h = game.civilians.find((c) => c.id === 'hasan');
            if (h) game.say(story.muratSaved ? L5.hasanAmmo : L5.hasanAmmoNoMurat);
            else game.say(L5.ammo);
          }
        }),
    },
    {
      id: 'kemal',
      pos: () => game.squad.pos.clone().setY(game.squad.pos.y + 0.5),
      radius: 2.4,
      enabled: () => game.squad.down,
      prompt: () => 'Kemal\'e ilk yardım yap',
      use: () => game.reviveSquad(),
    }
  );

  // ---------- Dalgalar ----------
  const approachFor = (e) =>
    e.def.x > 30
      ? new THREE.Vector3(34, 0, 108 + Math.random() * 10)
      : e.def.x < -30
        ? new THREE.Vector3(-34, 0, 106 + Math.random() * 10)
        : new THREE.Vector3(roadX(96) + (Math.random() - 0.5) * 16, 0, 92 + Math.random() * 8);
  function startWave(n) {
    script.flags.wave = n;
    script.flags.waveT = 0;
    game.mission.activate('w' + n);
    // düşmanlar karakolun dış hattına yönelir; duvarın arkasındaki oyuncuyla oradan çatışır
    for (const e of waveOf(n)) if (e.alive) e.wake(approachFor(e));
    game.say(n === 1 ? L5.w1 : n === 2 ? L5.w2 : story.radioCut ? [...L5.w3, ...L5.w3radio] : L5.w3);
    game.emitUI('banner', n === 3 ? 'SON DALGA' : `DALGA ${n}`);
  }
  // takılı kalanlar geri çekilir (sonsuz bekleme olmasın)
  function retreat(n) {
    for (const e of waveOf(n)) {
      if (!e.alive) continue;
      e.health = 0;
      e.state = 'dead';
      e.root.visible = false;
    }
    game.say(L5.retreat);
  }

  const script = {
    flags: { wave: 0, waveT: 0, breakT: 0, done: [false, false, false], heli: false, heliT: 0, ended: false, ammoSaid: false, posReached: false },
    start() {
      game.squad.active = true;
      game.say(L5.start);
      game.hint(game.touch ? 'E: Yüzbaşı ile konuş' : 'E: Yüzbaşı Selim Er ile konuş', 5);
    },
    brief() {
      game.mission.complete('brief');
      game.say(L5.brief, () => {
        game.mission.activate('pos');
        game.hint('Cephane: konteynerin yanındaki sandık (E)', 6);
      });
    },
    reloaded() {},
    marked() {},
    update(dt) {
      const P = game.player.pos, m = game.mission, f = this.flags;
      if (m.get('pos').active && !f.posReached && Math.hypot(P.x - POS.x, P.z - (POS.z + 1.5)) < 7) {
        f.posReached = true;
        m.complete('pos');
        game.say(L5.inPos);
        game.checkpoint('pos');
        f.breakT = 5;
      }
      if (f.posReached && f.wave < 3 && (f.wave === 0 || f.done[f.wave - 1])) {
        f.breakT -= dt;
        if (f.breakT <= 0) startWave(f.wave + 1);
      }
      if (f.wave > 0 && !f.done[f.wave - 1]) {
        const n = f.wave;
        f.waveT += dt;
        const list = waveOf(n);
        const dead = list.filter((e) => !e.alive).length;
        m.progress('w' + n, dead);
        if (f.waveT > 110 && dead < list.length) retreat(n);
        if (list.every((e) => !e.alive)) {
          f.done[n - 1] = true;
          if (!m.isDone('w' + n)) m.complete('w' + n);
          game.say(n === 1 ? L5.w1done : n === 2 ? L5.w2done : L5.w3done);
          f.breakT = 9;
          game.checkpoint('wave' + n);
          if (n === 3) {
            f.heli = true;
            f.heliT = 0;
            m.activate('heli');
            game.time.after(3, () => game.say(L5.heli));
          }
        }
      }
      if (f.heli && !f.ended) {
        f.heliT += dt;
        if (f.heliT > 26 && !game.squad.down) {
          f.ended = true;
          m.complete('heli');
          if (!game.mission.stats.squadDowned) m.complete('squad');
          game.endLevel(finalEnding(game.story || {}));
        }
      }
    },
    snapshot() {
      return JSON.parse(JSON.stringify(this.flags));
    },
    restore(fl) {
      this.flags = fl;
    },
  };
  level.script = script;
  level.wireTargetHit = () => {};
  level.onRestore = () => {
    // kapı açık, siviller sığınakta
    const bar = game.gateBar;
    if (bar && world.boxes.includes(bar.collider)) {
      world.remove(bar.collider);
      bar.mesh.position.x = -3.5;
      bar.mesh.geometry.translate(3.5, 0, 0);
      bar.mesh.rotation.z = 1.45;
    }
    for (const c of game.civilians) if (c.state === 'hiding') c.state = 'safe';
    // devam eden dalga kayıttan sonra yeniden başlar
    const f = script.flags;
    if (f.wave > 0 && !f.done[f.wave - 1]) for (const e of waveOf(f.wave)) if (e.alive) e.wake(approachFor(e));
  };
  level.storyResult = () => ({ finished: true });

  // ---------- Helikopter animasyonu ----------
  const baseUpdate = level.update;
  level.update = (dt, t) => {
    baseUpdate(dt, t);
    const f = script.flags;
    if (!f.heli) {
      heli.visible = false;
      return;
    }
    heli.visible = true;
    heliRotor.rotation.y += dt * 28;
    const k = Math.min(1, f.heliT / 24);
    const e = 1 - (1 - k) ** 3;
    const from = new THREE.Vector3(-160, 70, 40), to = new THREE.Vector3(HELI.x, heightAt(HELI.x, HELI.z), HELI.z);
    heli.position.lerpVectors(from, to, e);
    heli.position.y = to.y + (1 - e) * 70 + Math.sin(t * 2) * 0.15 * (1 - k);
    heli.rotation.y = Math.atan2(to.x - from.x, to.z - from.z) * (1 - k * 0.6);
    if (game.audio.ctx && Math.random() < dt * 14) game.audio.click(game.audio.ctx.currentTime, 90, 0.05 * (0.3 + e), 1);
  };

  level.cutscenes = {
    intro: [
      { dur: 7, from: [-60, 40, 210], to: [-24, 22, 170], look0: [0, 0, 140], look1: [0, 1, 135] },
      { dur: 6, from: [10, 8, 60], to: [4, 4, 80], look0: [0, 1, 40], look1: [0, 1, 122] },
      { dur: 6, from: [-2, 3, 160], to: [-1, 2.4, 152], look0: [-3, 1, 153], look1: [2, 1.6, 136] },
    ],
    outro: [
      { dur: 8, from: [8, 4, 176], to: [2, 3, 172], look0: [HELI.x, 2, HELI.z], look1: [HELI.x, 2, HELI.z] },
      { dur: 9, from: [-20, 6, 150], to: [-40, 40, 220], look0: [HELI.x, 2, HELI.z], look1: [0, 0, 60] },
    ],
  };
  return level;
}
