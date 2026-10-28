import * as THREE from 'three';
import { makeKit, smooth, gauss } from './kit.js';
import { civilianInteractions, updateEscort, timedAction, at } from './common.js';
import { L2, DOCS } from '../story.js';

// BÖLÜM 2 — TERK EDİLMİŞ KÖY (Aşağıköy)
// Köy meydanı (0,−5). Tahliye kamyonu güneyde (3,106). Kuzey −Z.

const VILLAGE = { x: 0, z: -5 };
const TRUCK = { x: 3, z: 106 };
const roadX = (z) => 3 * Math.sin(z / 25);

export function heightAt(x, z) {
  const ax = Math.abs(x);
  let h = smooth(60, 130, ax) * (38 + 12 * Math.sin(z * 0.03 + (x > 0 ? 1.1 : 0.2)));
  h += smooth(-80, -170, z) * (45 + 10 * Math.sin(x * 0.04));
  h += smooth(140, 210, z) * (28 + 8 * Math.sin(x * 0.05));
  h += 1.2 * Math.sin(x * 0.05 + 0.4) * Math.cos(z * 0.045) + 0.5 * Math.sin(x * 0.14 + z * 0.08);
  h += 4 * gauss(x, z, 40, 50, 12, 16) + 3.5 * gauss(x, z, -42, 60, 12, 14);
  const fv = smooth(50, 36, Math.hypot(x - VILLAGE.x, z - VILLAGE.z));
  h = h * (1 - fv) + 0.3 * fv;
  const ft = smooth(18, 10, Math.hypot(x - TRUCK.x, z - TRUCK.z));
  h = h * (1 - ft) + 0.2 * ft;
  return h;
}

const HOUSES = [
  // x, z, w, d, h, door, intact, ruin, matKey
  [-22, -8, 10, 7, 3, 'E', false, false, 'plaster'], // okul
  [18, 6, 7, 6, 2.8, 'W', false, false, 'stone'], // Yusuf Amca'nın evi
  [-6, -30, 7, 6, 2.8, 'S', false, false, 'plaster'], // Seher'in saklandığı ev
  [6, -12, 8, 6, 3, 'S', true, false, 'stone'], // kahve
  [24, -22, 6, 5, 2.6, 'W', false, true, 'stone'],
  [-28, 18, 6, 5, 2.6, 'E', false, true, 'plaster'],
  [12, 26, 6, 5, 2.6, 'N', false, false, 'plaster'],
  [-14, 24, 6, 5, 2.6, 'S', false, true, 'stone'],
  [32, -2, 5, 5, 2.6, 'W', false, true, 'plaster'],
  [-34, -22, 6, 5, 2.6, 'E', false, false, 'stone'],
  [-10, 6, 5, 5, 2.6, 'N', false, true, 'plaster'],
];

export function buildLevel2(game) {
  const { scene, T } = game;
  const kit = makeKit(game, heightAt, { seed: 22 });
  const { M, world, box, lights, interactables, markTargets, animated, r } = kit;

  kit.buildSky('night');
  kit.buildTerrain(520, 220, 0);
  const road = [];
  for (let z = 128; z >= -75; z -= 2) road.push([roadX(z), z]);
  kit.buildRoad(road, 2.3);

  // ---------- Köy ----------
  for (const [x, z, w, d, h, door, intact, ruin, mk] of HOUSES) kit.house(x, z, w, d, h, door, M[mk], intact, ruin);
  // okul tahtası ve sıralar
  box(M.dark, 2.2, 1.0, 0.06, -22, -11.2, { y0: 0.9, collide: false, tile: 1 });
  for (let i = 0; i < 3; i++) box(M.darkWood, 1.2, 0.7, 0.5, -20 + (i % 2) * 0.2, -9 + i * 1.6 - 1.5, { y0: 0.1, tile: 1 });
  // okul bayrak direği (bayraksız, paslı)
  kit.cyl(M.pole, 0.05, 0.04, 6, -15.5, -12.5);
  // kahve: masa, tabureler, telsiz
  box(M.darkWood, 1.4, 0.75, 0.8, 8, -13.6, { y0: 0.1, tile: 1 });
  box(M.darkWood, 1.0, 0.75, 0.8, 4.5, -13.2, { y0: 0.1, tile: 1 });
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.3), new THREE.MeshStandardMaterial({ color: 0x2a2e26, roughness: 0.6, metalness: 0.4 }));
  radio.position.set(8, 0.98, -13.6);
  scene.add(radio);
  const radioLed = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: 0x40ff60 }));
  radioLed.position.set(8.15, 1.02, -13.44);
  scene.add(radioLed);
  // çeşme
  box(M.stone, 2.2, 1.6, 0.6, 0, 4, { tile: 1.5 });
  box(M.stone, 2.4, 0.5, 1.1, 0, 4.8, { tile: 1.5 });
  // meydandaki ateş varilleri ve örgüt aracı
  kit.fireBarrel(-3, -6);
  kit.fireBarrel(2, -42);
  kit.vehicle(0, -48, 0.2, M.dark, false);
  kit.truck(-6, -52, -0.3);
  // bahçe duvarları, çit ve siperler
  for (const [x, z, w, d] of [[-14, -18, 10, 0.5], [14, -2, 0.5, 9], [-30, 4, 0.5, 12], [24, 16, 9, 0.5], [-18, -40, 12, 0.5], [10, -34, 0.5, 8], [28, -32, 8, 0.5]]) kit.lowWall(x, z, w, d, 1.1);
  for (const [x, z] of [[-6, 14], [8, -24], [-20, 4], [20, -10], [-12, -24], [4, 18], [26, 4]]) {
    kit.cyl(M.metal, 0.3, 0.3, 0.9, x, z, null, 12);
    world.addBox(x, z, 0.62, 0.62, heightAt(x, z), 0.9);
  }
  // kayalar
  for (const [x, z, s] of [[-8, 60, 1.4], [10, 72, 1.2], [-14, 84, 1.5], [14, 44, 1.3], [-20, 40, 1.2], [36, 30, 1.4], [-38, 36, 1.3], [6, 52, 1.1]]) kit.boulder(x, z, s);

  // ---------- Tahliye noktası ----------
  kit.truck(TRUCK.x, TRUCK.z, 0);
  kit.vehicle(-4, 109, 0, M.olive, true);
  const evacLight = new THREE.PointLight(0x9ac0ff, 4, 14, 1.6);
  evacLight.position.set(TRUCK.x, 3, TRUCK.z - 4);
  scene.add(evacLight);
  lights.push(evacLight);

  // ---------- Bitki örtüsü ----------
  const inHouse = (x, z) => HOUSES.some(([hx, hz, w, d]) => Math.abs(x - hx) < w / 2 + 0.6 && Math.abs(z - hz) < d / 2 + 0.6);
  kit.buildVegetation({
    pines: 380,
    grass: 8000,
    area: [-250, 250, -230, 250],
    grassArea: [-90, 90, -90, 125],
    allow: (x, z, kind) => {
      if (Math.abs(x - roadX(z)) < (kind === 'pine' ? 7 : 2.8) && z < 130) return false;
      if (Math.hypot(x - TRUCK.x, z - TRUCK.z) < 12) return false;
      if (kind === 'pine') return (Math.abs(x) > 55 || z < -75 || z > 140) && Math.hypot(x, z + 5) > 50;
      return !inHouse(x, z) && Math.hypot(x, z + 5) > 4;
    },
  });
  kit.buildDust();

  // ---------- Karakterler ----------
  const enemies = [
    { id: 'v1', x: -8, z: 8, route: [[-8, 8], [8, 8], [8, -18], [-8, -18]] },
    { id: 'v2', x: 26, z: 12, route: [[26, 12], [26, -28], [14, -30], [14, 14]] },
    { id: 'v3', x: 6, z: -7.5, yaw: 0 },
    { id: 'v4', x: -14, z: -2, yaw: -Math.PI / 2 },
    { id: 'v5', x: -34, z: 0, route: [[-34, 0], [-36, -30], [-16, -42], [-18, 12]] },
    { id: 'v6', x: 2, z: -44, yaw: 0.2 },
  ];
  const civilians = [
    { id: 'zehra', name: 'Zehra Teyze', x: -25, z: -9.6, yaw: Math.PI / 2, safeSpot: [5.5, 0, 101.5] },
    { id: 'ayse', name: 'Ayşe', x: -25.4, z: -8.2, yaw: Math.PI / 2, safeSpot: [4.4, 0, 101] },
    { id: 'yusuf', name: 'Yusuf Amca', x: 20, z: 7.5, yaw: -Math.PI / 2, safeSpot: [2.4, 0, 101.5] },
    { id: 'seher', name: 'Seher', x: -7.2, z: -31.5, yaw: 0, safeSpot: [1.2, 0, 101] },
  ];

  const coverPoints = kit.finalize();

  const level = {
    id: 2,
    night: true,
    heightAt,
    world,
    bounds: { minX: -110, maxX: 110, minZ: -110, maxZ: 135 },
    spawn: { x: 0.5, z: 114, yaw: 0 },
    startWithGear: true,
    coverPoints,
    markTargets,
    interactables,
    lights,
    enemies,
    squad: { x: 2.5, z: 116, yaw: 0 },
    civilians,
    selim: null,
    docsTotal: 3,
    introLines: L2.intro,
    env: { bg: 0x121822, fog: 0x141a24, fogD: 0.009, hemi: 1.35, moonI: 1.9 },
    lines: { civHurt: () => L2.civHurt },
    objectives: [
      { id: 'enter', text: 'Aşağıköy\'e gir', at: at(heightAt, 0, 25) },
      { id: 'find', text: 'Saklanan sivilleri bul', total: 4, hidden: true },
      { id: 'evac', text: 'Sivilleri tahliye kamyonuna götür', total: 4, hidden: true, at: at(heightAt, TRUCK.x, TRUCK.z - 4) },
      { id: 'radio', text: 'Örgütün telsizini sustur (kahve)', optional: true, hidden: true, at: at(heightAt, 8, -13.6, 0.5) },
      { id: 'docs', text: 'Hikâye belgeleri', optional: true, hidden: true, total: 3, noScore: true },
    ],
    safeZone: (p) => Math.abs(p.x - TRUCK.x) < 9 && p.z > 97 && p.z < 117,
    update(dt, t) {
      for (const f of animated) f(dt, t, game.player.pos);
      radioLed.visible = !script.flags.radioCut && Math.sin(t * 6) > 0;
    },
    onCivilianLost() {
      game.mission.stats.civiliansSaved = game.civilians.filter((c) => c.state === 'safe').length;
    },
    onRestore() {
      const a = game.civilians.find((c) => c.id === 'ayse');
      if (a) a.root.scale.setScalar(0.72);
    },
    storyResult() {
      const ayse = game.civilians.find((c) => c.id === 'ayse');
      return {
        ch2Saved: game.civilians.filter((c) => c.state === 'safe').length,
        ch2Ayse: !!ayse && ayse.state === 'safe',
        radioCut: !!script.flags.radioCut,
      };
    },
  };

  kit.docs(
    [
      { id: 'okul', pos: new THREE.Vector3(-21.2, 0.12, -10.2) },
      { id: 'kahve', pos: new THREE.Vector3(4.5, 0.87, -13.2) },
      { id: 'liste', pos: new THREE.Vector3(-4.6, 0.12, -31.4) },
    ],
    DOCS,
    level
  );

  const joinLines = { zehra: L2.zehra, ayse: L2.ayse, yusuf: L2.yusuf, seher: L2.seher };
  civilianInteractions(game, level, {
    waitLine: L2.civWait,
    followLine: L2.civFollow,
    onJoin: (c) => {
      game.say(joinLines[c.id]);
      // okuldakiler birlikte gelir
      if (c.id === 'zehra' || c.id === 'ayse') {
        const other = game.civilians.find((x) => x.id === (c.id === 'zehra' ? 'ayse' : 'zehra'));
        if (other && other.state === 'hiding') other.join();
      }
      const found = game.civilians.filter((x) => x.state !== 'hiding').length;
      game.mission.activate('find');
      game.mission.progress('find', found);
      game.mission.activate('evac');
      game.checkpoint('civ' + found);
      if (found === 1) game.hint('Siviller seni takip eder. E: bekle / gel · Kamyona götür', 6);
    },
  });

  interactables.push(
    {
      id: 'radio',
      pos: new THREE.Vector3(8, 1.0, -13.6),
      radius: 2.2,
      enabled: () => !script.flags.radioCut,
      prompt: () => 'Telsizin kablolarını sök',
      use: () =>
        timedAction(game, 'Kablolar sökülüyor…', 2.2, () => {
          script.flags.radioCut = true;
          game.mission.activate('radio');
          game.mission.complete('radio');
          game.say(L2.radio);
          game.audio.ui('ok');
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
    flags: { entered: false, knock: false, knockT: 0, radioHint: false, ended: false, firstSafe: false },
    start() {
      game.squad.active = true;
      game.say(L2.start);
      game.hint(game.touch ? 'Çömel ve fenerini kapalı tut · Siviller önce' : 'C: çömel · F: fener · G/T: Kemal komutları', 7);
    },
    reloaded() {},
    marked() {},
    update(dt) {
      const P = game.player.pos, m = game.mission, f = this.flags;
      if (!f.entered && P.z < 30) {
        f.entered = true;
        m.complete('enter');
        m.activate('find');
        m.activate('radio');
        game.say(L2.enter);
        game.checkpoint('village');
      }
      // okuldan gelen vuruş sesleri (ipucu)
      const z = game.civilians.find((c) => c.id === 'zehra');
      if (z && z.state === 'hiding' && f.entered) {
        f.knockT -= dt;
        if (f.knockT <= 0 && P.distanceTo(z.pos) < 40) {
          f.knockT = 5;
          for (let i = 0; i < 3; i++) game.time.after(i * 0.35, () => game.audio.impact(new THREE.Vector3(-24, 1.2, -9), 'hard'));
          if (!f.knock) {
            f.knock = true;
            game.say(L2.knock);
          }
        }
      }
      // tahliye
      const n = updateEscort(game, level);
      if (n) {
        const safe = game.civilians.filter((c) => c.state === 'safe').length;
        m.progress('evac', safe);
        if (!f.firstSafe) {
          f.firstSafe = true;
          game.say(L2.firstSafe);
        }
        game.checkpoint('safe' + safe);
      }
      const remaining = game.civilians.filter((c) => c.alive && c.state !== 'safe');
      if (!f.ended && !remaining.length && level.safeZone(P)) {
        if (game.squad.down) return;
        f.ended = true;
        const lost = game.civilians.some((c) => !c.alive);
        if (!lost) m.complete('evac');
        else m.fail('evac');
        if (!m.isDone('find')) m.complete('find');
        game.say(L2.allSafe);
        game.time.after(2.5, () => game.endLevel(lost ? L2.endingLoss : L2.ending));
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
      { dur: 7, from: [-60, 40, -80], to: [-30, 22, -30], look0: [0, 0, -5], look1: [0, 0, -5] },
      { dur: 6, from: [30, 6, -20], to: [10, 3, -10], look0: [-22, 1.5, -8], look1: [-22, 1.5, -8] },
      { dur: 6, from: [16, 8, 128], to: [6, 3, 120], look0: [3, 1.5, 106], look1: [0, 1.6, 113] },
    ],
    outro: [{ dur: 9, from: [12, 4, 98], to: [30, 22, 140], look0: [3, 1.5, 106], look1: [0, 0, 40] }],
  };
  return level;
}
