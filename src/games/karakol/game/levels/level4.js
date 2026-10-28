import * as THREE from 'three';
import { makeKit, smooth, gauss } from './kit.js';
import { civilianInteractions, updateEscort, timedAction, at } from './common.js';
import { L4, DOCS } from '../story.js';

// BÖLÜM 4 — TAHLİYE (Kurtboğazı köprüsü)
// Konvoy güneyde (0,120). Köprü (0,40), barikat (0,47). Yamaçlarda pusu. Taş ocağı doğuda (45,−30).

const CONVOY = { x: 0, z: 120 };
const QUARRY = { x: 45, z: -30 };
const BRIDGE_Z = 40;
const roadX = (z) => (z > 60 ? 0 : 2 * Math.sin((60 - z) / 30));

export function heightAt(x, z) {
  const ax = Math.abs(x);
  // dar boğaz: dik yamaçlar
  let h = smooth(34, 80, ax) * (40 + 12 * Math.sin(z * 0.04 + (x > 0 ? 1.3 : 0.4)));
  h += smooth(-110, -180, z) * 40 + smooth(160, 220, z) * 30;
  h += 0.8 * Math.sin(x * 0.07) * Math.cos(z * 0.06) + 0.4 * Math.sin(x * 0.17 + z * 0.1);
  // pusu sırtları
  h += 7 * gauss(x, z, -22, 30, 7, 10) + 6 * gauss(x, z, 22, 18, 7, 10);
  // kuru dere yatağı (köprünün altı)
  const dz = z - BRIDGE_Z;
  if (ax > 4.2) h -= 3.2 * Math.exp(-(dz * dz) / (2 * 2.6 * 2.6)) * smooth(4.2, 6.5, ax);
  // taş ocağı: düz çanak, yamaca kazılmış
  const fq = smooth(22, 14, Math.hypot(x - QUARRY.x, z - QUARRY.z));
  h = h * (1 - fq) + 0.4 * fq;
  // ocağa giden yan yol
  const sideDist = Math.abs(z - (-12 - (x - 6) * 0.45));
  if (x > 4 && x < 40) {
    const k = smooth(5, 2.5, sideDist);
    h = h * (1 - k) + 0.4 * k;
  }
  const fc = smooth(20, 12, Math.hypot(x - CONVOY.x, z - CONVOY.z));
  h = h * (1 - fc) + 0.2 * fc;
  return h;
}

export function buildLevel4(game) {
  const { scene } = game;
  const story = game.story || {};
  const kit = makeKit(game, heightAt, { seed: 44 });
  const { M, world, box, lights, interactables, markTargets, animated } = kit;

  kit.buildSky('dawn');
  kit.buildTerrain(480, 220, 10);
  const road = [];
  for (let z = 140; z >= -130; z -= 2) road.push([roadX(z), z]);
  kit.buildRoad(road, 2.4);
  const side = [];
  for (let x = 4; x <= 40; x += 2) side.push([x, -12 - (x - 6) * 0.45]);
  kit.buildRoad(side, 1.8);

  // ---------- Köprü ----------
  {
    const deckY = 0.25;
    box(M.darkWood, 6.4, 0.25, 9, 0, BRIDGE_Z, { y0: deckY - 0.25, collide: false, tile: 2 });
    for (const sx of [-3.1, 3.1]) {
      box(M.metal, 0.12, 0.9, 9, sx, BRIDGE_Z, { y0: deckY, tile: 2 });
      for (const dz of [-4, 0, 4]) box(M.darkWood, 0.4, 3.6, 0.4, sx, BRIDGE_Z + dz, { y0: deckY - 3.4, collide: false, tile: 1 });
    }
  }

  // ---------- Barikat (kaldırılabilir) ----------
  const barricade = { group: new THREE.Group(), cols: [] };
  {
    const g = barricade.group;
    const logMat = new THREE.MeshStandardMaterial({ map: game.T.wood, color: 0x6a5240, roughness: 0.95 });
    for (let i = 0; i < 5; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 7.5, 10), logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (Math.random() - 0.5) * 0.25;
      log.position.set((Math.random() - 0.5) * 0.6, 0.35 + (i % 3) * 0.5, 47 + (i - 2) * 0.55);
      log.castShadow = log.receiveShadow = true;
      g.add(log);
    }
    const car = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.3, 2.0), M.burnt);
    car.position.set(1.8, 0.75, 49.4);
    car.rotation.y = 0.3;
    car.castShadow = true;
    g.add(car);
    scene.add(g);
    barricade.cols.push(world.addBox(0, 47, 8.4, 2.6, 0, 1.6, { tag: 'barricade' }));
    barricade.cols.push(world.addBox(1.8, 49.4, 4.2, 2.4, 0, 1.4, { tag: 'barricade' }));
  }
  const removeBarricade = (instant) => {
    for (const c of barricade.cols) if (world.boxes.includes(c)) world.remove(c);
    if (instant) barricade.group.position.x = -9;
    else game.tween(2.5, (k) => (barricade.group.position.x = -9 * k));
  };
  const restoreBarricade = () => {
    for (const c of barricade.cols) if (!world.boxes.includes(c)) world.boxes.push(c);
    world.rebuild();
    barricade.group.position.x = 0;
  };

  // ---------- Pusu mevzileri (kum torbası, kaya) ----------
  kit.sandbagRing(-21, 30, 1.8);
  kit.sandbagRing(22, 18, 1.8);
  for (const [x, z, s] of [[-14, 24, 1.3], [16, 26, 1.2], [-8, 58, 1.4], [9, 62, 1.2], [-10, 80, 1.5], [10, 92, 1.3], [-6, 100, 1.2], [8, 74, 1.1], [6, 34, 1.0], [-6, 34, 1.1], [30, -6, 1.3], [36, -20, 1.2]]) kit.boulder(x, z, s);

  // ---------- Taş ocağı ----------
  {
    const { x: qx, z: qz } = QUARRY;
    kit.truck(qx - 1, qz - 2, 1.2);
    kit.fireBarrel(qx - 6, qz + 4);
    for (const [x, z, w, d, h] of [[qx + 8, qz - 4, 3, 2.2, 2.2], [qx - 9, qz - 8, 2.6, 2.6, 1.8], [qx + 3, qz + 8, 3.4, 1.6, 1.6], [qx - 2, qz - 12, 4, 2, 2.4]]) box(M.stone, w, h, d, x, z, { tile: 1.5 });
    kit.vehicle(qx + 6, qz + 3, -0.6, M.dark, false);
    kit.tent(qx + 10, qz + 10, 4, 3, 2.2);
  }

  // ---------- Konvoy ----------
  kit.vehicle(-2, 116, 0, M.olive, true);
  kit.truck(2.6, 124, 0);
  kit.vehicle(-1.5, 132, 0, M.olive, true);

  // ---------- Bitki ----------
  kit.buildVegetation({
    pines: 360,
    grass: 7000,
    area: [-230, 230, -200, 230],
    grassArea: [-60, 70, -80, 140],
    allow: (x, z, kind) => {
      if (Math.abs(x - roadX(z)) < (kind === 'pine' ? 6 : 2.8)) return false;
      if (Math.hypot(x - QUARRY.x, z - QUARRY.z) < 20) return false;
      if (Math.hypot(x - CONVOY.x, z - CONVOY.z) < 16) return false;
      if (Math.abs(z - BRIDGE_Z) < 4) return false;
      if (kind === 'pine') return Math.abs(x) > 32 && Math.hypot(x - QUARRY.x, z - QUARRY.z) > 26;
      return true;
    },
  });
  kit.buildDust(0xe8d8c0);

  // ---------- Karakterler ----------
  const ambushIds = ['a1', 'a2', 'a3', 'a4', 'a5'];
  const enemies = [
    { id: 'a1', x: -20.5, z: 31, yaw: 0.2 },
    { id: 'a2', x: -23, z: 27, yaw: 0.4 },
    { id: 'a3', x: 21.5, z: 19, yaw: -0.2 },
    { id: 'a4', x: 24, z: 14, yaw: -0.4 },
    { id: 'a5', x: 4, z: 52, yaw: 0 },
    { id: 'k1', x: QUARRY.x - 5, z: QUARRY.z + 4, yaw: -1.2 },
    { id: 'k2', x: QUARRY.x + 4, z: QUARRY.z + 1, route: [[QUARRY.x + 4, QUARRY.z + 1], [QUARRY.x - 8, QUARRY.z + 2], [QUARRY.x - 4, QUARRY.z - 8]] },
    { id: 'r1', x: -2, z: -88, dormant: true },
    { id: 'r2', x: 2, z: -91, dormant: true },
    { id: 'r3', x: 0, z: -95, dormant: true },
  ];
  if (!story.radioCut) {
    enemies.push({ id: 'a6', x: -15, z: 22, yaw: 0.1 }, { id: 'a7', x: 17, z: 27, yaw: -0.1 });
    ambushIds.push('a6', 'a7');
  }
  if (!story.callMade) enemies.push({ id: 'k3', x: QUARRY.x - 1, z: QUARRY.z - 9, yaw: 0 }, { id: 'k4', x: QUARRY.x + 9, z: QUARRY.z - 2, yaw: -0.8 });
  const civ = (id, name, dx, dz, sx, sz) => ({ id, name, x: QUARRY.x + dx, z: QUARRY.z + dz, yaw: 0, safeSpot: [sx, 0, sz] });
  const civilians = [
    civ('q1', 'Rehine — Ayşe\'nin annesi Hatice', -3.8, -4.2, 5.6, 119),
    civ('q2', 'Rehine — Osman', -2.6, -5.2, 5.6, 121),
    civ('q3', 'Rehine — Leyla', -4.6, -2.6, 5.6, 123),
    civ('q4', 'Rehine — Cemal', -1.6, -6.4, 5.6, 125),
  ];

  markTargets.push(
    { id: 'barikat', label: 'Barikat', pos: new THREE.Vector3(0, 1.2, 47) },
    { id: 'pusu', label: 'Pusu mevzisi', pos: new THREE.Vector3(-21, heightAt(-21, 30) + 1.2, 30) }
  );

  const coverPoints = kit.finalize();

  const level = {
    id: 4,
    night: false,
    heightAt,
    world,
    bounds: { minX: -90, maxX: 90, minZ: -120, maxZ: 145 },
    spawn: { x: 1, z: 108, yaw: 0 },
    startWithGear: true,
    coverPoints,
    markTargets,
    interactables,
    lights,
    enemies,
    squad: { x: 3, z: 110, yaw: 0 },
    civilians,
    selim: null,
    docsTotal: 1,
    introLines: L4.intro,
    env: { bg: 0x8a8a96, fog: 0xa89a90, fogD: 0.0105, hemiSky: 0xd8c8c0, hemiGround: 0x5a4a38, hemi: 1.6, moon: 0xffc89a, moonI: 2.4, exposure: 1.05 },
    objectives: [
      { id: 'scout', text: 'Köprüyü dürbünle incele (barikat, pusu)', total: 2, at: at(heightAt, 0, 47, 1.2) },
      { id: 'clear', text: 'Yamaçlardaki pusuyu temizle', total: ambushIds.length, hidden: true, at: at(heightAt, -21, 30) },
      { id: 'hostages', text: 'Taş ocağındaki rehineleri kurtar (doğu)', total: 4, hidden: true, at: at(heightAt, QUARRY.x - 2, QUARRY.z - 4) },
      { id: 'evac', text: 'Rehineleri konvoya getir', total: 4, hidden: true, at: at(heightAt, CONVOY.x + 4, CONVOY.z) },
      { id: 'barricade', text: 'Barikatı kaldır (halat)', hidden: true, at: at(heightAt, 0, 45.6, 1) },
      { id: 'go', text: 'Konvoya dön: yola devam', hidden: true, at: at(heightAt, CONVOY.x, CONVOY.z - 6) },
      { id: 'docs', text: 'Hikâye belgeleri', optional: true, hidden: true, total: 1, noScore: true },
    ],
    safeZone: (p) => Math.abs(p.x - CONVOY.x) < 9 && p.z > 108 && p.z < 136,
    update(dt, t) {
      for (const f of animated) f(dt, t, game.player.pos);
    },
    onCivilianLost() {
      game.mission.stats.civiliansSaved = game.civilians.filter((c) => c.state === 'safe').length;
    },
    onRestore() {
      if (script.flags.barricade) removeBarricade(true);
      else restoreBarricade();
      // uyanmış takviyeleri kayıttan sonra yeniden uyandır
      if (script.flags.reinforce) for (const e of game.enemies) if (e.def.dormant && e.alive) e.wake(game.player.pos);
    },
    storyResult() {
      return { ch4Saved: game.civilians.filter((c) => c.state === 'safe').length, haticeSaved: game.civilians.find((c) => c.id === 'q1')?.state === 'safe' };
    },
  };

  kit.docs([{ id: 'konvoy', pos: new THREE.Vector3(QUARRY.x + 0.6, heightAt(QUARRY.x, QUARRY.z) + 0.1, QUARRY.z - 6.5) }], DOCS, level);

  civilianInteractions(game, level, {
    waitLine: [{ s: 'rehine', t: 'Burada bekliyoruz.' }],
    followLine: [{ s: 'rehine', t: 'Peşindeyiz.' }],
    onJoin: () => {
      // biri katılınca dördü birlikte gelir
      for (const c of game.civilians) if (c.state === 'hiding') c.join();
      game.mission.activate('hostages');
      game.mission.complete('hostages');
      game.mission.activate('evac');
      game.say(L4.hostages);
      if (game.civilians.find((c) => c.id === 'q1')?.alive) game.say(L4.ayseMother);
      game.checkpoint('hostages');
      // kriz: kuzeyden takviye
      game.time.after(6, () => {
        script.flags.reinforce = true;
        game.say(L4.reinforce);
        for (const e of game.enemies) if (e.def.dormant && e.alive) e.wake(game.player.pos);
      });
    },
  });

  interactables.push(
    {
      id: 'barricade',
      pos: new THREE.Vector3(-1, 1.0, 45.6),
      radius: 2.6,
      enabled: () => !script.flags.barricade && game.mission.get('barricade').active,
      prompt: () => 'Halatı barikata bağla',
      use: () =>
        timedAction(game, 'Halat bağlanıyor…', 3, () => {
          script.flags.barricade = true;
          removeBarricade(false);
          game.audio.rumble?.(2);
          game.mission.complete('barricade');
          game.say(L4.barricade);
          game.checkpoint('barricade');
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

  const script = {
    flags: { scouted: false, cleared: false, barricade: false, reinforce: false, ended: false, quarrySaid: false },
    start() {
      game.squad.active = true;
      game.say(L4.start);
      game.hint(game.touch ? 'DÜRBÜN → YAKINLAŞ: barikatı ve pusuyu işaretle' : '2: dürbün · sağ tık: yakınlaştır · barikatı ve pusuyu işaretle', 7);
    },
    reloaded() {},
    marked(id, count) {
      game.mission.progress('scout', count);
      if (count >= 2 && !this.flags.scouted) {
        this.flags.scouted = true;
        game.say(L4.scoutDone);
        game.mission.activate('clear');
        game.checkpoint('scout');
      }
    },
    update(dt) {
      const P = game.player.pos, m = game.mission, f = this.flags;
      // pusu kendiliğinden fark edilirse (çatışma) gözetleme adımını atla
      if (!f.scouted && game.enemies.some((e) => ambushIds.includes(e.id) && e.state === 'combat')) {
        f.scouted = true;
        m.complete('scout');
        m.activate('clear');
      }
      if (f.scouted && !f.cleared) {
        const dead = game.enemies.filter((e) => ambushIds.includes(e.id) && !e.alive).length;
        m.progress('clear', dead);
        if (dead >= ambushIds.length) {
          f.cleared = true;
          game.say(L4.clearDone);
          m.activate('barricade');
          m.activate('hostages');
          game.checkpoint('cleared');
          if (!f.quarrySaid) {
            f.quarrySaid = true;
            game.time.after(4, () => game.say(story.callMade ? [...L4.quarry, ...L4.quarryCall] : L4.quarry));
          }
        }
      }
      const n = updateEscort(game, level);
      if (n) m.progress('evac', game.civilians.filter((c) => c.state === 'safe').length);
      const remaining = game.civilians.filter((c) => c.alive && c.state !== 'safe');
      const hostagesDone = game.civilians.every((c) => c.state !== 'hiding') && !remaining.length;
      if (hostagesDone && f.barricade && !m.get('go').active) {
        m.activate('go');
        game.say(L4.allSafe);
      }
      if (!f.ended && hostagesDone && f.barricade && level.safeZone(P) && !game.squad.down) {
        f.ended = true;
        const lost = game.civilians.some((c) => !c.alive);
        if (!lost) m.complete('evac');
        else m.fail('evac');
        m.complete('go');
        game.time.after(1.5, () => game.endLevel(L4.ending));
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
  level.cutscenes = {
    intro: [
      { dur: 7, from: [-40, 30, 140], to: [-20, 18, 100], look0: [0, 0, 60], look1: [0, 1, 45] },
      { dur: 6, from: [10, 6, 60], to: [4, 3, 54], look0: [0, 1, 47], look1: [-21, 6, 30] },
      { dur: 6, from: [70, 20, -10], to: [60, 12, -24], look0: [45, 1, -30], look1: [44, 1, -32] },
    ],
    outro: [{ dur: 9, from: [12, 5, 100], to: [-10, 26, 40], look0: [0, 1, 118], look1: [0, 0, -40] }],
  };
  return level;
}
