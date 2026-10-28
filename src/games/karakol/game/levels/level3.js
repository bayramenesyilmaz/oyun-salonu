import * as THREE from 'three';
import { makeKit, smooth, gauss } from './kit.js';
import { civilianInteractions, updateEscort, timedAction, lockedDoor, at } from './common.js';
import { L3, DOCS } from '../story.js';

// BÖLÜM 3 — SON ÇAĞRI (eski krom madeni)
// Tesis (0,−40) çevresinde tel örgü; hangar batıda, ofis doğuda, maden girişi kuzeyde.
// Tahliye noktası güneyde (3,84).

const FAC = { x: 0, z: -40 };
const EVAC = { x: 3, z: 84 };
const roadX = (z) => 2.5 * Math.sin(z / 22);

export function heightAt(x, z) {
  const ax = Math.abs(x);
  let h = smooth(55, 120, ax) * (44 + 14 * Math.sin(z * 0.035 + (x > 0 ? 0.6 : 2.1)));
  h += smooth(-75, -150, z) * (55 + 10 * Math.sin(x * 0.05));
  h += smooth(115, 180, z) * (30 + 8 * Math.sin(x * 0.06));
  h += 1.1 * Math.sin(x * 0.06) * Math.cos(z * 0.05) + 0.45 * Math.sin(x * 0.15 - z * 0.09);
  h += 12 * gauss(x, z, -2, -95, 22, 14); // maden tepesi
  h += 4 * gauss(x, z, -30, 30, 10, 14) + 4.5 * gauss(x, z, 34, 40, 12, 12);
  const ff = smooth(46, 34, Math.hypot(x - FAC.x, (z - FAC.z) * 0.85));
  h = h * (1 - ff) + 0.25 * ff;
  const fe = smooth(16, 9, Math.hypot(x - EVAC.x, z - EVAC.z));
  h = h * (1 - fe) + 0.2 * fe;
  return h;
}

export function buildLevel3(game) {
  const { scene } = game;
  const kit = makeKit(game, heightAt, { seed: 33 });
  const { M, world, box, lights, interactables, markTargets, animated } = kit;
  const y0 = 0.1;

  kit.buildSky('dark');
  kit.buildTerrain(500, 210, 0);
  const road = [];
  for (let z = 100; z >= -14; z -= 2) road.push([roadX(z), z]);
  kit.buildRoad(road, 2.3);

  // ---------- Tel örgü ----------
  const chain = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.strokeStyle = 'rgba(170,175,180,0.9)';
    x.lineWidth = 2;
    for (let i = -64; i < 128; i += 12) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i + 64, 64);
      x.moveTo(i + 64, 0);
      x.lineTo(i, 64);
      x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const fenceMat = new THREE.MeshStandardMaterial({ map: chain, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.5 });
  function fence(x0, z0, x1, z1) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.PlaneGeometry(len, 2.4);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 1.2, uv.getY(i) * 2);
    g.rotateY(-Math.atan2(z1 - z0, x1 - x0));
    g.translate((x0 + x1) / 2, y0 + 1.2, (z0 + z1) / 2);
    const m = new THREE.Mesh(g, fenceMat);
    scene.add(m);
    const n = Math.ceil(len / 3);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      kit.cyl(M.pole, 0.05, 0.05, 2.6, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, y0, 6);
    }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    world.addBox(cx, cz, Math.max(0.2, Math.abs(x1 - x0)), Math.max(0.2, Math.abs(z1 - z0)), y0, 2.4, { bulletProof: false, tag: 'fence' });
  }
  // güney (kapı boşluğu x −3..3), doğu (yırtık z −41..−39), kuzey, batı
  fence(-32, -14, -3, -14);
  fence(3, -14, 32, -14);
  fence(32, -14, 32, -38.9);
  fence(32, -41.1, 32, -68);
  fence(-32, -68, 32, -68);
  fence(-32, -68, -32, -14);
  // kapı direkleri ve bariyer
  box(M.sandbag, 1.2, 1.1, 1.2, -4.2, -12.6, { y0, tile: 1.2 });
  box(M.sandbag, 1.2, 1.1, 1.2, 4.2, -12.6, { y0, tile: 1.2 });
  // yırtık tel: içe kıvrılmış parça
  {
    const g = new THREE.PlaneGeometry(1.4, 1.6);
    g.rotateY(Math.PI / 2 + 0.7);
    g.translate(31.5, y0 + 0.8, -40.6);
    scene.add(new THREE.Mesh(g, fenceMat));
  }

  // ---------- Hangar ----------
  const HG = { x0: -21, x1: -3, z0: -51, z1: -37, h: 6 };
  {
    const { x0, x1, z0, z1, h } = HG;
    const t = 0.3;
    box(M.metal, x1 - x0, h, t, (x0 + x1) / 2, z0, { y0, tile: 3 });
    box(M.metal, x1 - x0, h, t, (x0 + x1) / 2, z1, { y0, tile: 3 });
    box(M.metal, t, h, z1 - z0, x0, (z0 + z1) / 2, { y0, tile: 3 });
    // doğu yüzü: büyük kapı boşluğu (z −46..−42)
    box(M.metal, t, h, 5, x1, z0 + 2.5, { y0, tile: 3 });
    box(M.metal, t, h, 5, x1, z1 - 2.5, { y0, tile: 3 });
    box(M.metal, t, h - 4, 4, x1, -44, { y0: y0 + 4, collide: false, tile: 3 });
    box(M.metal, x1 - x0 + 0.6, 0.2, z1 - z0 + 0.6, (x0 + x1) / 2, (z0 + z1) / 2, { y0: y0 + h, collide: false, tile: 4 });
    // rehine odası A (kuzeybatı köşe): beton duvar, doğuda kilitli kapı
    box(M.plaster, 6, 3, 0.3, -18, -45, { y0, tile: 2 });
    box(M.plaster, 0.3, 3, 2.4, -15, -49.6, { y0, tile: 2 });
    box(M.plaster, 0.3, 3, 2.4, -15, -46.4, { y0, tile: 2 });
    box(M.plaster, 0.3, 0.9, 1.2, -15, -48, { y0: y0 + 2.1, collide: false, tile: 2 });
    // sandıklar, forklift, variller (siper)
    for (const [x, z] of [[-10, -40], [-8.5, -40.2], [-12, -48], [-6, -49], [-9, -45]]) box(M.darkWood, 1.3, 1.1, 1.3, x, z, { y0, tile: 1 });
    for (const [x, z] of [[-5, -38.5], [-19.5, -39], [-6.5, -38.3]]) kit.cyl(M.metal, 0.3, 0.3, 0.9, x, z, y0, 12), world.addBox(x, z, 0.62, 0.62, y0, 0.9);
    kit.vehicle(-15, -41, Math.PI / 2, M.dark, false);
  }
  const doorA = lockedDoor(kit, scene, { x: -15, z: -48, axis: 'z', w: 1.2, h: 2.1, y0 });

  // ---------- Ofis (telsiz odası) ----------
  kit.house(14, -50, 10, 8, 3, 'W', M.stone, true);
  box(M.darkWood, 1.6, 0.75, 0.8, 16.5, -52.6, { y0, tile: 1 });
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.35), new THREE.MeshStandardMaterial({ color: 0x2a2e26, roughness: 0.6, metalness: 0.4 }));
  radio.position.set(16.5, y0 + 0.92, -52.6);
  scene.add(radio);
  const radioLed = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff5030 }));
  radioLed.position.set(16.7, y0 + 0.96, -52.42);
  scene.add(radioLed);

  // ---------- Jeneratör kulübesi ----------
  const GEN = { x: 22, z: -24 };
  box(M.metal, 4, 2.6, 0.2, GEN.x, GEN.z - 1.6, { y0, tile: 2 });
  box(M.metal, 0.2, 2.6, 3.2, GEN.x + 2, GEN.z, { y0, tile: 2 });
  box(M.metal, 4.4, 0.15, 3.6, GEN.x, GEN.z, { y0: y0 + 2.6, collide: false, tile: 2 });
  box(M.olive, 1.8, 1.2, 1.0, GEN.x + 0.6, GEN.z - 0.4, { y0, tile: 1 });
  const genLed = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0x50ff60 }));
  genLed.position.set(GEN.x - 0.31, y0 + 1.0, GEN.z - 0.1);
  scene.add(genLed);

  // ---------- Maden girişi (rehine odası B) ----------
  {
    const bx = -2, bz = -62;
    box(M.plaster, 8, 3, 0.3, bx, bz - 3, { y0, tile: 2 });
    box(M.plaster, 0.3, 3, 6, bx - 4, bz, { y0, tile: 2 });
    box(M.plaster, 0.3, 3, 6, bx + 4, bz, { y0, tile: 2 });
    box(M.plaster, 3.4, 3, 0.3, bx - 2.3, bz + 3, { y0, tile: 2 });
    box(M.plaster, 3.4, 3, 0.3, bx + 2.3, bz + 3, { y0, tile: 2 });
    box(M.plaster, 1.2, 0.9, 0.3, bx, bz + 3, { y0: y0 + 2.1, collide: false, tile: 2 });
    box(M.roof, 8.6, 0.25, 6.6, bx, bz, { y0: y0 + 3, collide: false, tile: 2 });
    // ahşap maden ağzı (arkada, yamaçta)
    for (const sx of [-2, 2]) box(M.darkWood, 0.35, 3.6, 0.35, bx + sx, bz - 4.5, { y0, tile: 1 });
    box(M.darkWood, 4.6, 0.4, 0.4, bx, bz - 4.5, { y0: y0 + 3.6, collide: false, tile: 1 });
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.5), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    dark.position.set(bx, y0 + 1.8, bz - 4.6);
    scene.add(dark);
    // ray hattı ve vagon
    for (let i = 0; i < 6; i++) box(M.darkWood, 1.6, 0.08, 0.2, bx, bz + 5 + i * 1.2, { y0, collide: false, tile: 1 });
    box(M.metal, 1.4, 1.0, 2.2, bx + 5.5, bz + 6, { y0, tile: 1 });
  }
  const doorB = lockedDoor(kit, scene, { x: -2, z: -59, axis: 'x', w: 1.2, h: 2.1, y0 });

  // ---------- Işıklar (jeneratöre bağlı) ----------
  const facLights = [];
  for (const [x, z] of [[-6, -18], [10, -20], [-24, -30], [26, -46], [0, -52], [-24, -60], [10, -64]]) facLights.push(kit.lamp(x, z, 0xfff0d0, 16, 20, 5));
  // kapı projektörü
  const flood = new THREE.SpotLight(0xfff0d0, 420, 110, 0.22, 0.45, 1.1);
  const fpY = y0 + 6.5;
  kit.cyl(M.pole, 0.07, 0.06, 6.5, 6, -16, y0);
  flood.position.set(6, fpY, -16);
  scene.add(flood, flood.target);
  lights.push(flood);
  const fh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.3), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff0d0, emissiveIntensity: 0.8 }));
  fh.position.copy(flood.position);
  scene.add(fh);
  animated.push((dt, t) => {
    const a = Math.sin(t * 0.25) * 0.8;
    flood.target.position.set(6 + Math.sin(a) * 40, 0, -16 + Math.cos(a) * 40);
    fh.lookAt(flood.target.position);
  });
  const hangarLight = new THREE.PointLight(0xffc890, 5, 14, 1.6);
  hangarLight.position.set(-10, y0 + 5, -44);
  scene.add(hangarLight);
  lights.push(hangarLight);

  // ---------- Tahliye noktası ----------
  kit.truck(EVAC.x, EVAC.z, 0);
  kit.vehicle(-4, 88, 0, M.olive, true);

  // ---------- Kayalar ve bitki ----------
  for (const [x, z, s] of [[-10, 40, 1.5], [12, 30, 1.3], [-14, 10, 1.4], [16, 4, 1.2], [36, -20, 1.3], [40, -50, 1.5], [-38, -34, 1.4], [8, 58, 1.2], [-6, 66, 1.3], [24, 16, 1.1]]) kit.boulder(x, z, s);
  kit.buildVegetation({
    pines: 300,
    grass: 6000,
    area: [-240, 240, -220, 230],
    grassArea: [-80, 80, -90, 105],
    allow: (x, z, kind) => {
      if (Math.abs(x - roadX(z)) < (kind === 'pine' ? 7 : 2.8) && z > -16 && z < 105) return false;
      if (x > -36 && x < 36 && z < -10 && z > -72) return false;
      if (Math.hypot(x - EVAC.x, z - EVAC.z) < 12) return false;
      if (kind === 'pine') return Math.abs(x) > 52 || z < -78 || z > 118;
      return true;
    },
  });
  kit.buildDust(0xa8b0c0);

  // ---------- Karakterler ----------
  const enemies = [
    { id: 'f1', x: -2.5, z: -11.5, yaw: 0 },
    { id: 'f2', x: 2.5, z: -11.8, yaw: 0.3 },
    { id: 'f3', x: -24, z: -22, route: [[-24, -22], [24, -22], [24, -33], [-24, -33]] },
    { id: 'f4', x: -24, z: -57, route: [[-24, -57], [24, -57], [24, -64], [-24, -64]] },
    { id: 'f5', x: -0.5, z: -44, yaw: Math.PI / 2 },
    { id: 'f6', x: 7.5, z: -50, yaw: -Math.PI / 2 },
    { id: 'f7', x: -2, z: -56.5, yaw: 0 },
    { id: 'f8', x: 42, z: -12, route: [[42, -12], [42, -72], [-42, -74], [-42, -12]] },
  ];
  const civ = (id, name, x, z, sx, sz) => ({ id, name, x, z, yaw: 0, safeSpot: [sx, 0, sz] });
  const civilians = [
    civ('a1', 'Rehine — Gülay', -17, -49.5, 5.5, 79.5),
    civ('a2', 'Rehine — Kerem', -18.5, -47.5, 4.4, 79),
    civ('a3', 'Rehine — Nesrin', -17.5, -46.2, 3.2, 79.5),
    civ('murat', 'Murat', -1.5, -62.5, 2.0, 79),
    civ('b2', 'Rehine — Hamza', -3, -63.5, 0.8, 79.5),
    civ('b3', 'Rehine — Dilek', 0, -63, -0.4, 79),
  ];

  const coverPoints = kit.finalize();
  const roomA = ['a1', 'a2', 'a3'], roomB = ['murat', 'b2', 'b3'];

  const level = {
    id: 3,
    night: true,
    heightAt,
    world,
    bounds: { minX: -100, maxX: 100, minZ: -110, maxZ: 112 },
    spawn: { x: 0.5, z: 94, yaw: 0 },
    startWithGear: true,
    coverPoints,
    markTargets,
    interactables,
    lights,
    enemies,
    squad: { x: 2.5, z: 96, yaw: 0 },
    civilians,
    selim: null,
    docsTotal: 2,
    introLines: L3.intro,
    env: { bg: 0x0b0f16, fog: 0x0d111a, fogD: 0.0105, hemiSky: 0x5a6a88, hemi: 1.35, moon: 0x8a9ac0, moonI: 1.3, exposure: 1.65 },
    objectives: [
      { id: 'approach', text: 'Tesise yaklaş', at: at(heightAt, 0, -12) },
      { id: 'power', text: 'Jeneratörü kapat (doğu, kulübe)', optional: true, hidden: true, at: at(heightAt, GEN.x - 0.4, GEN.z - 0.4) },
      { id: 'find', text: 'Rehineleri bul', total: 6, hidden: true },
      { id: 'call', text: 'Telsiz odasından sahte çağrı yap (ofis)', optional: true, hidden: true, at: at(heightAt, 16.5, -52.6, 0.6) },
      { id: 'evac', text: 'Rehineleri güneydeki tahliye noktasına götür', total: 6, hidden: true, at: at(heightAt, EVAC.x, EVAC.z - 4) },
      { id: 'docs', text: 'Hikâye belgeleri', optional: true, hidden: true, total: 2, noScore: true },
    ],
    safeZone: (p) => Math.abs(p.x - EVAC.x) < 9 && p.z > 76 && p.z < 96,
    visionMul: () => (script.flags.power ? 1 : 0.62),
    update(dt, t) {
      for (const f of animated) f(dt, t, game.player.pos);
      radioLed.visible = !script.flags.callMade && Math.sin(t * 5) > 0;
      genLed.visible = script.flags.power;
    },
    onCivilianLost() {
      game.mission.stats.civiliansSaved = game.civilians.filter((c) => c.state === 'safe').length;
    },
    onRestore() {
      applyPower();
      script.flags.doorA ? doorA.openNow() : doorA.closeNow();
      script.flags.doorB ? doorB.openNow() : doorB.closeNow();
    },
    storyResult() {
      const m = game.civilians.find((c) => c.id === 'murat');
      return {
        ch3Saved: game.civilians.filter((c) => c.state === 'safe').length,
        muratSaved: !!m && m.state === 'safe',
        callMade: !!script.flags.callMade,
      };
    },
  };

  function applyPower() {
    const on = script.flags.power;
    for (const L of facLights) {
      L.light.intensity = on ? L.base : 0;
      L.bulb.visible = on;
    }
    flood.intensity = on ? 420 : 0;
    fh.material.emissiveIntensity = on ? 0.8 : 0;
    hangarLight.intensity = on ? 5 : 0.4;
  }

  kit.docs(
    [
      { id: 'vardiya', pos: new THREE.Vector3(-8, y0 + 1.22, -40) },
      { id: 'murat', pos: new THREE.Vector3(-4.5, y0 + 0.02, -63.5) },
    ],
    DOCS,
    level
  );

  civilianInteractions(game, level, { waitLine: [{ s: 'rehine', t: 'Tamam, burada bekliyoruz.' }], followLine: [{ s: 'rehine', t: 'Arkandayız.' }] });

  const found = () => game.civilians.filter((c) => c.state !== 'hiding').length;
  const openRoom = (ids, lines) => {
    for (const c of game.civilians) if (ids.includes(c.id) && c.state === 'hiding') c.join();
    game.mission.activate('find');
    game.mission.progress('find', found());
    game.mission.activate('evac');
    game.say(lines);
    game.checkpoint('room' + found());
  };

  interactables.push(
    {
      id: 'doorA',
      pos: doorA.pos,
      radius: 2.2,
      enabled: () => !script.flags.doorA,
      prompt: () => 'Kilidi kes',
      use: () =>
        timedAction(game, 'Kilit kesiliyor…', 2.4, () => {
          script.flags.doorA = true;
          doorA.openNow();
          game.audio.impact(doorA.pos, 'hard');
          game.say(L3.cut);
          openRoom(roomA, L3.roomA);
        }),
    },
    {
      id: 'doorB',
      pos: doorB.pos,
      radius: 2.2,
      enabled: () => !script.flags.doorB,
      prompt: () => 'Kilidi kes',
      use: () =>
        timedAction(game, 'Kilit kesiliyor…', 2.4, () => {
          script.flags.doorB = true;
          doorB.openNow();
          game.audio.impact(doorB.pos, 'hard');
          openRoom(roomB, game.story.hasanSaved ? L3.roomB : L3.roomBnoHasan);
        }),
    },
    {
      id: 'gen',
      pos: new THREE.Vector3(GEN.x + 0.1, y0 + 1, GEN.z - 0.4),
      radius: 2.4,
      enabled: () => script.flags.power,
      prompt: () => 'Jeneratörü kapat',
      use: () =>
        timedAction(game, 'Yakıt vanası kapatılıyor…', 1.8, () => {
          script.flags.power = false;
          applyPower();
          game.mission.activate('power');
          game.mission.complete('power');
          game.audio.ui('ok');
          game.say(L3.power);
          // birkaç nöbetçi ışığın neden söndüğüne bakmaya gelir
          for (const e of game.enemies) if (e.alive && e.state !== 'combat' && e.dist2D(new THREE.Vector3(GEN.x, 0, GEN.z)) < 30) e.hear(new THREE.Vector3(GEN.x, 0, GEN.z), 30);
          game.checkpoint('power');
        }),
    },
    {
      id: 'call',
      pos: new THREE.Vector3(16.5, y0 + 1.0, -52.6),
      radius: 2.2,
      enabled: () => !script.flags.callMade,
      prompt: () => 'Telsizden sahte çağrı yap',
      use: () =>
        timedAction(game, 'Kanal dört… çağrı yapılıyor', 2.6, () => {
          script.flags.callMade = true;
          game.mission.activate('call');
          game.mission.complete('call');
          game.say(L3.call);
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
    flags: { power: true, doorA: false, doorB: false, callMade: false, approached: false, knockA: false, knockB: false, kA: 3, kB: 6, ended: false },
    start() {
      game.squad.active = true;
      game.say(L3.start);
      game.hint(game.touch ? 'Karanlık senin tarafında: FENER kapalı, ÇÖMEL' : 'Fener kapalı (F), çömel (C): karanlıkta zor görülürsün', 7);
    },
    reloaded() {},
    marked() {},
    update(dt) {
      const P = game.player.pos, m = game.mission, f = this.flags;
      if (!f.approached && P.z < -5 && P.z > -80 && Math.abs(P.x) < 50) {
        f.approached = true;
        m.complete('approach');
        m.activate('power');
        m.activate('find');
        m.activate('call');
        game.checkpoint('fence');
      }
      // vuruş sesleri: rehineler işaret veriyor
      if (!f.doorA && P.z < 30) {
        f.kA -= dt;
        if (f.kA <= 0) {
          f.kA = 6;
          for (let i = 0; i < 6; i++) game.time.after(i < 3 ? i * 0.25 : 0.9 + (i - 3) * 0.5, () => game.audio.impact(new THREE.Vector3(-15.2, 1.2, -48), 'hard'));
          if (!f.knockA && P.distanceTo(doorA.pos) < 60) {
            f.knockA = true;
            game.say(L3.knock);
          }
        }
      }
      if (!f.doorB && f.knockA && P.z < 0) {
        f.kB -= dt;
        if (f.kB <= 0) {
          f.kB = 8;
          for (let i = 0; i < 3; i++) game.time.after(i * 0.4, () => game.audio.impact(new THREE.Vector3(-2, 1.0, -59.2), 'hard'));
          if (!f.knockB && P.distanceTo(doorB.pos) < 45) {
            f.knockB = true;
            game.say(L3.knock2);
          }
        }
      }
      const n = updateEscort(game, level);
      if (n) {
        const safe = game.civilians.filter((c) => c.state === 'safe').length;
        m.progress('evac', safe);
        game.checkpoint('safe' + safe);
      }
      const remaining = game.civilians.filter((c) => c.alive && c.state !== 'safe');
      if (!f.ended && !remaining.length && level.safeZone(P) && !game.squad.down) {
        f.ended = true;
        const lost = game.civilians.some((c) => !c.alive);
        if (!m.isDone('find')) m.complete('find');
        if (!lost) m.complete('evac');
        else m.fail('evac');
        game.time.after(1.5, () => game.endLevel(lost ? L3.endingLoss : L3.ending));
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
      { dur: 7, from: [60, 30, 20], to: [36, 18, -10], look0: [0, 2, -40], look1: [-8, 2, -44] },
      { dur: 6, from: [-10, 4, -30], to: [-12, 3, -36], look0: [-15, 1.5, -48], look1: [-15, 1.5, -48] },
      { dur: 6, from: [12, 6, 104], to: [4, 3, 100], look0: [3, 1.5, 84], look1: [0, 1.6, 94] },
    ],
    outro: [{ dur: 9, from: [12, 4, 76], to: [30, 24, 120], look0: [3, 1.5, 84], look1: [0, 0, -20] }],
  };
  return level;
}
