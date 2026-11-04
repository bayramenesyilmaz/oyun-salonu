// Bölüm 2 — Leylek: depo, hurdalık, Kaan'ın çatısı, son gece
import { INK, glow, rr, rng } from './draw.js';
import { drawLayer, stringLights } from './bg.js';
import { drawLeylek } from './ship.js';
import { CHAPTER3, CHAPTER4 } from '../../kusyolu/game/story.js';
import { LEYLEK as T } from './story.js';
import { shared, sky } from './scenes.js';

const PARTS = ['jenerator', 'sac', 'telsiz', 'canak'];
const G = 620;

function flags(g) {
  const f = g.flags;
  f.parts ||= {};
  f.carry ||= [];
  f.prep ||= {};
  f.bye ||= {};
  return f;
}
function partsDone(g) {
  return PARTS.filter((p) => flags(g).parts[p]).length;
}
function partsObjective(g) {
  const f = flags(g);
  if (f.carry.length) return `Getirdiklerini Mert’e ver (${f.carry.map((c) => CHAPTER3.parts[c].label).join(', ')})`;
  return CHAPTER3.objectives.parts(partsDone(g));
}

function brickWall(x, x0, x1, y0, y1, col = '#6a4a3a') {
  x.fillStyle = col;
  x.fillRect(x0, y0, x1 - x0, y1 - y0);
  x.strokeStyle = 'rgba(0,0,0,0.22)';
  x.lineWidth = 2;
  for (let yy = y0; yy < y1; yy += 28) {
    const off = ((yy - y0) / 28) % 2 ? 30 : 0;
    for (let xx = x0 + off; xx < x1; xx += 60) x.strokeRect(xx, yy, 60, 28);
  }
}

// =============================================================== DEPO
export class Depo {
  constructor(g) {
    this.key = 'depo';
    this.width = 2800;
    this.spawn = { x: 380, y: G };
    this.tune = null;
    this.holo = 0;
    const S = this;
    const f = () => flags(g);
    this.spots = [
      { x: 640, r: 90, label: 'Kor’a bak', when: () => f().c2 === 'intro', use: () => S.lookKor(g) },
      { x: 1180, r: 110, label: 'Mert’e parçaları ver', when: () => f().c2 === 'parts' && f().carry.length > 0, use: () => S.deliver(g) },
      { x: 1180, r: 110, label: 'Mert’le konuş', when: () => f().c2 === 'parts' && !f().carry.length, use: () => g.say(T.needMore(4 - partsDone(g))) },
      { x: 940, r: 100, label: 'Telsizi ayarla', when: () => f().c2 === 'parts' && !f().parts.telsiz && !f().carry.includes('telsiz'), use: () => S.tuneRadio(g) },
      { x: 260, r: 100, label: 'Mahalleye çık', when: () => f().c2 === 'parts' && S.exits(g).length > 0, use: () => S.leave(g) },
      // hazırlık
      { x: 2420, r: 90, label: CHAPTER4.items.su.label, when: () => f().c2 === 'prep' && !f().prep.su, use: () => S.prepItem(g, 'su') },
      { x: 2600, r: 90, label: CHAPTER4.items.harita.label, when: () => f().c2 === 'prep' && !f().prep.harita, use: () => S.prepItem(g, 'harita') },
      { x: 560, r: 90, label: CHAPTER4.items.defter.label, when: () => f().c2 === 'prep' && !f().prep.defter, use: () => S.prepItem(g, 'defter') },
      { x: 1460, r: 100, label: CHAPTER4.items.kor.label, when: () => f().c2 === 'prep' && !f().prep.kor && g.player.hold === 'kor', use: () => S.prepItem(g, 'kor') },
      { x: 660, r: 90, label: 'Kor’u al', when: () => f().c2 === 'prep' && !f().prep.kor && g.player.hold !== 'kor', use: () => S.pickKor(g) },
      ...['kaan', 'zeynep', 'mert', 'elif'].map((id) => ({
        id,
        get x() {
          return g.actors[id] ? g.actors[id].x : -999;
        },
        r: 90,
        label: 'Vedalaş',
        when: () => f().c2 === 'prep' && S.prepDone(g) && !f().bye[id],
        use: () => S.bye(g, id),
      })),
      { x: 1960, r: 100, label: T.boardTip, when: () => f().c2 === 'prep' && S.byeDone(g) && f().sms, use: () => S.board(g) },
    ];
  }
  exits(g) {
    const f = flags(g);
    const out = [];
    if (!f.parts.jenerator && !f.carry.includes('jenerator')) out.push({ id: 'hurdalik', text: 'Rıfat Usta’nın hurdalığı (jeneratör, saclar)' });
    if (!f.parts.canak && !f.carry.includes('canak')) out.push({ id: 'cati2', text: 'Kaan’ların çatısı (çanak anten)' });
    return out;
  }
  prepDone(g) {
    const p = flags(g).prep;
    return ['su', 'harita', 'defter', 'kor'].every((k) => p[k]);
  }
  byeDone(g) {
    const b = flags(g).bye;
    return ['kaan', 'zeynep', 'mert', 'elif'].every((k) => b[k]);
  }
  setup(g) {
    const f = flags(g);
    f.c2 ||= 'intro';
    g.addActor('mert', 1180, G, { dir: 1, z: 3 });
    g.addActor('zeynep', 960, G, { dir: -1, z: 2 });
    g.addActor('kaan', 2200, G, { dir: -1, z: 2 });
    g.addActor('elif', 760, G, { dir: -1, z: 2 });
    if (f.c2 === 'prep') {
      g.actors.elif.x = 2560;
      g.actors.kaan.x = 2280;
      g.actors.zeynep.x = 980;
      g.actors.mert.x = 1640;
    }
    g.player.hold = f.carry.length ? 'kutu' : null;
    g.sfx.loop('hum', 0.04);
    g.sfx.loop('city', 0.05);
  }
  stage(g) {
    const p = flags(g).parts;
    return { hull: !!p.sac, dish: !!p.canak, core: !!p.jenerator };
  }
  async start(g) {
    const f = flags(g);
    if (f.c2 === 'intro') {
      await g.card(CHAPTER3.place.split('·')[1]?.trim() || 'Ertesi gece', 'Eski vinç deposu', 2.4);
      await g.say(CHAPTER3.intro);
      g.setObjective(CHAPTER3.objectives.watch);
    } else if (f.c2 === 'parts') {
      g.setObjective(partsObjective(g));
      if (f.carry.length) await g.say(T.deliver);
    } else if (f.c2 === 'knock') {
      await this.knock(g);
    } else if (f.c2 === 'prep') {
      g.setObjective(this.prepObjective(g));
    }
  }
  async lookKor(g) {
    await g.player.goTo(560);
    g.player.dir = 1;
    await g.say(T.bench);
    this.holo = 0.01;
    g.sfx.whoosh();
    await g.say(CHAPTER3.map);
    await g.wait(0.6);
    this.holo = 0;
    await g.say(T.skeleton);
    await g.say(CHAPTER3.later);
    await g.say(T.where);
    flags(g).c2 = 'parts';
    g.save(this.key);
    g.setObjective(partsObjective(g));
  }
  async tuneRadio(g) {
    await g.say(T.tuneStart);
    const target = 0.25 + Math.random() * 0.6;
    this.tune = { v: target > 0.5 ? 0.08 : 0.92, target, hold: 0 };
    g.sfx.loop('wind', 0.12);
    g.setObjective(g.isTouch ? 'Telsiz: ◀ ▶ ile frekansı bul, hışırtı kesilince bekle' : 'Telsiz: A / D ile frekansı bul, hışırtı kesilince bekle');
    if (g.test) this.tune.v = target;
    await g.until(() => this.tune.hold > 1.4);
    g.sfx.stop('wind');
    g.sfx.ping();
    this.tune = null;
    await g.say(T.tuneDone);
    await g.say([CHAPTER3.parts.telsiz.line]);
    flags(g).carry.push('telsiz');
    g.player.hold = 'kutu';
    g.setObjective(partsObjective(g));
  }
  async leave(g) {
    const opts = [...this.exits(g), { id: 'kal', text: 'Vazgeç, depoda kal' }];
    const id = await g.choose(T.doorAsk, opts);
    if (id === 'kal') return;
    g.sfx.door();
    g.next(id);
  }
  async deliver(g) {
    const f = flags(g);
    const p = g.player;
    await p.goTo(1080);
    p.dir = 1;
    for (const c of f.carry) {
      f.parts[c] = true;
      g.sfx.thud();
      this.flashT = g.t;
      await g.say([CHAPTER3.parts[c].line]);
    }
    f.carry = [];
    p.hold = null;
    g.save(this.key);
    if (partsDone(g) >= 4) {
      f.c2 = 'knock';
      g.setObjective('');
      await g.wait(0.8);
      await this.knock(g);
    } else g.setObjective(partsObjective(g));
  }
  async knock(g) {
    const p = g.player;
    g.sfx.thud();
    await g.wait(0.3);
    g.sfx.thud();
    await g.say(CHAPTER3.knock);
    g.setObjective(CHAPTER3.objectives.door);
    await p.goTo(300);
    p.dir = -1;
    this.bekci = true;
    const id = await g.choose(CHAPTER3.choice.prompt, CHAPTER3.choice.options);
    const opt = CHAPTER3.choice.options.find((o) => o.id === id);
    await g.say(opt.reply);
    this.bekci = false;
    g.sfx.door();
    await g.say(T.afterKnock);
    await g.card(T.weeks, T.weeksSub, 2.8);
    const f = flags(g);
    f.c2 = 'prep';
    f.parts = { jenerator: true, sac: true, telsiz: true, canak: true };
    this.built = true;
    const A = g.actors;
    A.mert.x = 1640;
    A.elif.x = 2560;
    A.kaan.x = 2280;
    p.x = 1400;
    g.snapCamera();
    await g.say(CHAPTER3.done);
    await g.say(CHAPTER4.intro);
    await g.say(T.prepIntro);
    g.save(this.key);
    g.setObjective(this.prepObjective(g));
  }
  prepObjective(g) {
    const f = flags(g);
    if (!this.prepDone(g)) return CHAPTER4.objectives.prep(Object.keys(f.prep).length);
    if (!this.byeDone(g)) return CHAPTER4.objectives.bye(Object.keys(f.bye).length);
    return T.boardTip;
  }
  async pickKor(g) {
    g.player.hold = 'kor';
    g.sfx.ping();
    g.setObjective('Kor’u Leylek’teki yuvasına götür');
  }
  async prepItem(g, k) {
    const f = flags(g);
    f.prep[k] = true;
    g.sfx.ping();
    if (k === 'kor') {
      g.player.hold = null;
      this.flashT = g.t;
    }
    await g.say([CHAPTER4.items[k].line]);
    g.setObjective(this.prepObjective(g));
    if (this.prepDone(g)) g.save(this.key);
  }
  async bye(g, id) {
    const f = flags(g);
    const a = g.actors[id];
    a.dir = g.player.x > a.x ? 1 : -1;
    await g.say(CHAPTER4.farewell[id]);
    f.bye[id] = true;
    if (this.byeDone(g) && !f.sms) {
      g.setObjective('');
      await g.wait(0.8);
      g.msg({ from: CHAPTER4.sms.from, t: CHAPTER4.sms.t });
      await g.wait(2.5);
      await g.say(CHAPTER4.smsReply);
      f.sms = true;
      g.save(this.key);
    }
    g.setObjective(this.prepObjective(g));
  }
  async board(g) {
    const A = g.actors;
    await g.say(CHAPTER4.board);
    for (const id of ['kaan', 'zeynep', 'mert', 'elif']) A[id].goTo(1960);
    await g.player.goTo(1960);
    await g.player.tweenTo(1990, G - 140, 0.8);
    await g.fade(1, 1.2);
    g.sfx.stopLoops();
    g.chapterDone(2);
  }
  update(dt, g) {
    if (this.holo) this.holo = Math.min(1, this.holo + dt * 0.5);
    const tu = this.tune;
    if (tu) {
      const I = g.input;
      tu.v = Math.max(0, Math.min(1, tu.v + ((I.right ? 1 : 0) - (I.left ? 1 : 0)) * dt * 0.32));
      const sig = Math.max(0, 1 - Math.abs(tu.v - tu.target) * 6);
      tu.sig = sig;
      g.sfx.loop('wind', 0.14 * (1 - sig));
      if (sig > 0.88) tu.hold += dt;
      else tu.hold = 0;
    }
  }
  drawBg(x, cam) {
    x.fillStyle = '#1a1414';
    x.fillRect(0, 0, cam.w, cam.h);
  }
  drawWorld(x, cam, g) {
    const t = g.t,
      f = flags(g);
    brickWall(x, 0, this.width, 0, G);
    // üst pencereler (gece gökyüzü)
    for (let i = 0; i < 7; i++) {
      const wx = 120 + i * 390;
      x.fillStyle = '#1a2450';
      x.strokeStyle = INK;
      x.lineWidth = 5;
      rr(x, wx, 70, 200, 110, 4);
      x.fill();
      x.stroke();
      x.strokeStyle = '#3a3030';
      x.lineWidth = 4;
      for (let k = 1; k < 4; k++) {
        x.beginPath();
        x.moveTo(wx + k * 50, 70);
        x.lineTo(wx + k * 50, 180);
        x.stroke();
      }
      x.fillStyle = '#fff';
      for (let k = 0; k < 5; k++) x.fillRect(wx + ((k * 37 + i * 13) % 190), 80 + ((k * 23) % 90), 2, 2);
    }
    // vinç rayı
    x.fillStyle = '#d8a030';
    x.strokeStyle = INK;
    x.lineWidth = 5;
    rr(x, 0, 210, this.width, 28, 2);
    x.fill();
    x.stroke();
    const cx = 1700 + Math.sin(t * 0.2) * 40;
    rr(x, cx - 60, 238, 120, 40, 4);
    x.fill();
    x.stroke();
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(cx, 278);
    x.lineTo(cx, 330);
    x.stroke();
    // lambalar
    stringLights(x, 300, 2500, 260, 40, 16, t, 1);
    // kepenk
    x.fillStyle = '#8a9098';
    x.lineWidth = 5;
    x.strokeStyle = INK;
    rr(x, 140, 360, 240, 260, 2);
    x.fill();
    x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.35)';
    x.lineWidth = 2;
    for (let yy = 370; yy < 620; yy += 14) {
      x.beginPath();
      x.moveTo(140, yy);
      x.lineTo(380, yy);
      x.stroke();
    }
    if (this.bekci) {
      x.fillStyle = '#ffe9a8';
      x.globalAlpha = 0.5;
      x.fillRect(140, 590, 240, 30);
      x.globalAlpha = 1;
    }
    // tezgâh ve Kor
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.fillStyle = '#7a5a3a';
    rr(x, 480, 520, 260, 22, 4);
    x.fill();
    x.stroke();
    rr(x, 496, 542, 16, 78, 3);
    x.fill();
    x.stroke();
    rr(x, 708, 542, 16, 78, 3);
    x.fill();
    x.stroke();
    // mengene, aletler
    x.fillStyle = '#5a6a7a';
    rr(x, 500, 490, 50, 30, 4);
    x.fill();
    x.stroke();
    x.fillStyle = '#3a3a40';
    for (let i = 0; i < 6; i++) x.fillRect(520 + i * 30, 380, 6, 90);
    const korOnBench = f.c2 !== 'prep' || (!f.prep.kor && g.player.hold !== 'kor');
    if (korOnBench) {
      const b = 0.6 + 0.4 * Math.sin(t * 4);
      glow(x, 660, 505, 90 * b + 40, '#7affc8', 0.6);
      x.fillStyle = '#9effd8';
      x.beginPath();
      x.ellipse(660, 505, 20, 14, 0.3, 0, 7);
      x.fill();
      x.stroke();
    }
    if (f.c2 === 'prep' && !f.prep.defter) {
      x.fillStyle = '#7a3a2a';
      rr(x, 540, 500, 40, 20, 3);
      x.fill();
      x.stroke();
    }
    // yıldız haritası hologramı
    if (this.holo) {
      const h = this.holo;
      x.globalAlpha = h * 0.9;
      glow(x, 660, 360, 260, '#7affc8', 0.35 * h);
      x.strokeStyle = '#9effd8';
      x.lineWidth = 2;
      const pts = [
        [520, 300],
        [600, 260],
        [690, 320],
        [780, 250],
        [860, 290],
      ];
      x.beginPath();
      pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
      x.stroke();
      x.fillStyle = '#e8fff6';
      for (const [a, b] of pts) {
        x.beginPath();
        x.arc(a, b, 5, 0, 7);
        x.fill();
      }
      x.fillStyle = '#d8dce0';
      x.beginPath();
      x.arc(600, 260, 16, 0, 7);
      x.fill();
      x.setLineDash([8, 8]);
      x.beginPath();
      x.moveTo(600, 260);
      x.lineTo(1000, 120 - h * 40);
      x.stroke();
      x.setLineDash([]);
      x.globalAlpha = 1;
    }
    // Zeynep'in masası
    x.fillStyle = '#5a4a3a';
    rr(x, 860, 530, 200, 18, 4);
    x.fill();
    x.stroke();
    rr(x, 876, 548, 14, 72, 3);
    x.fill();
    x.stroke();
    rr(x, 1030, 548, 14, 72, 3);
    x.fill();
    x.stroke();
    x.fillStyle = '#22252e';
    rr(x, 900, 460, 90, 64, 6);
    x.fill();
    x.stroke();
    x.fillStyle = '#3a6ab0';
    x.fillRect(908, 468, 74, 46);
    x.fillStyle = '#9fd0ff';
    for (let i = 0; i < 4; i++) x.fillRect(914, 474 + i * 10, 20 + ((i * 17 + Math.floor(t * 2)) % 40), 4);
    glow(x, 945, 490, 70, '#6ab0ff', 0.35);
    if (!f.parts.telsiz) {
      x.fillStyle = '#4a4a3a';
      rr(x, 1000, 494, 50, 36, 4);
      x.fill();
      x.stroke();
      x.fillStyle = '#c84a2a';
      x.beginPath();
      x.arc(1036, 512, 6, 0, 7);
      x.fill();
    }
    // Leylek
    const built = f.c2 === 'prep' || this.built;
    drawLeylek(x, 1700, G, built ? 4 : this.stage(g), t, { lit: built });
    if (this.flashT && t - this.flashT < 1) glow(x, 1700, 500, 400, '#fff4c0', 0.5 * (1 - (t - this.flashT)));
    // iskele merdiveni
    x.strokeStyle = '#8a8a90';
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(1930, G);
    x.lineTo(2000, G - 180);
    x.moveTo(1970, G);
    x.lineTo(2040, G - 180);
    x.stroke();
    for (let k = 1; k < 7; k++) {
      x.beginPath();
      x.moveTo(1930 + k * 10, G - k * 26);
      x.lineTo(1970 + k * 10, G - k * 26);
      x.stroke();
    }
    // hazırlık yükleri
    if (f.c2 === 'prep') {
      if (!f.prep.su)
        for (let i = 0; i < 3; i++) {
          x.fillStyle = '#4a8ae0';
          x.strokeStyle = INK;
          x.lineWidth = 4;
          rr(x, 2380 + i * 30, G - 60, 26, 60, 6);
          x.fill();
          x.stroke();
        }
      if (!f.prep.harita) {
        x.fillStyle = '#e8d8a8';
        rr(x, 2570, G - 110, 60, 40, 3);
        x.fill();
        x.stroke();
      }
    }
    // zemin
    x.fillStyle = '#4a4440';
    x.fillRect(-20, G, this.width + 40, 200);
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(-20, G);
    x.lineTo(this.width + 20, G);
    x.stroke();
    x.fillStyle = 'rgba(255,220,140,0.06)';
    x.fillRect(-20, G + 4, this.width + 40, 20);
  }
  drawOverlay(x, cam, g) {
    const tu = this.tune;
    if (!tu) return;
    const W = 520,
      X = cam.w / 2 - W / 2,
      Y = 120;
    x.fillStyle = 'rgba(14,16,30,0.92)';
    rr(x, X, Y, W, 170, 18);
    x.fill();
    x.strokeStyle = '#ffd27a';
    x.lineWidth = 2;
    x.stroke();
    x.fillStyle = '#ffd27a';
    x.font = '700 18px Onest, system-ui, sans-serif';
    x.fillText('TELSİZ · FREKANS', X + 20, Y + 32);
    // ölçek
    x.strokeStyle = '#8a90a8';
    for (let i = 0; i <= 40; i++) {
      const xx = X + 30 + (i / 40) * (W - 60);
      x.beginPath();
      x.moveTo(xx, Y + 70);
      x.lineTo(xx, Y + (i % 5 ? 82 : 92));
      x.stroke();
    }
    const nx = X + 30 + tu.v * (W - 60);
    x.strokeStyle = '#ff5a4a';
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(nx, Y + 58);
    x.lineTo(nx, Y + 100);
    x.stroke();
    x.fillStyle = '#cfd6e8';
    x.font = '600 16px Onest, system-ui, sans-serif';
    x.fillText((88 + tu.v * 20).toFixed(1) + ' MHz', nx - 34, Y + 122);
    // sinyal
    const sig = tu.sig || 0;
    x.fillStyle = '#2a2e44';
    rr(x, X + 30, Y + 136, W - 60, 14, 7);
    x.fill();
    x.fillStyle = sig > 0.88 ? '#7affc8' : '#ffb35a';
    rr(x, X + 30, Y + 136, (W - 60) * sig, 14, 7);
    x.fill();
    // parazit
    for (let i = 0; i < 60 * (1 - sig); i++) {
      x.fillStyle = 'rgba(255,255,255,0.4)';
      x.fillRect(X + Math.random() * W, Y + Math.random() * 170, 2, 2);
    }
  }
}

// =============================================================== HURDALIK
export class Hurdalik {
  constructor(g) {
    this.key = 'hurdalik';
    this.width = 3200;
    this.spawn = { x: 200, y: G };
    this.jumpable = true;
    this.L = shared();
    this.plats = [
      [2180, 2400, 520],
      [2400, 2600, 430],
      [2600, 2800, 340],
      [1560, 1760, 540],
    ];
    this.searched = {};
    this.meowT = 0;
    const S = this;
    const st = () => (g.flags.hurda ||= {});
    this.spots = [
      { x: 520, r: 110, label: 'Rıfat Usta’yla konuş', when: () => !st().met, use: () => S.meet(g) },
      { x: 520, r: 110, label: 'Pamuk’u ver', when: () => st().cat && !st().gave, use: () => S.give(g) },
      { x: 1100, r: 80, label: 'Varile bak', when: () => st().met && !S.searched.v, use: () => S.search(g, 'v') },
      { x: 1660, y: 540, r: 90, label: 'Arabaya bak', when: () => st().met && !S.searched.c, use: () => S.search(g, 'c') },
      { x: 2700, y: 340, r: 90, label: 'Pamuk’u al', when: () => st().met && !st().cat, use: () => S.takeCat(g) },
      { x: 2740, y: 340, r: 60, label: 'Sacları al', hx: 2760, when: () => st().cat && !st().sac, use: () => S.takeSac(g) },
      { x: 180, r: 100, label: 'Depoya dön', when: () => st().gave, use: () => S.back(g) },
    ];
  }
  groundAt(x, y) {
    let best = G;
    for (const [a, b, top] of this.plats) if (x > a && x < b && top >= y - 6 && top < best) best = top;
    return best;
  }
  clampX(nx) {
    return Math.max(100, Math.min(this.width - 100, nx));
  }
  setup(g) {
    g.addActor('mert', 120, G, { dir: 1, z: 3 });
    g.actors.mert.follow = g.player;
    g.addActor('rifat', 560, G, { dir: -1, z: 1 });
    g.sfx.loop('crickets', 0.04);
    g.sfx.loop('wind', 0.04);
  }
  async start(g) {
    g.setObjective('Rıfat Usta’yı bul');
  }
  async meet(g) {
    await g.say(T.rifat1);
    g.flags.hurda.met = true;
    g.setObjective('Pamuk’u bul (miyavlamayı dinle)');
  }
  async search(g, k) {
    this.searched[k] = true;
    g.sfx.thud();
    await g.say(k === 'v' ? T.emptyBarrel : T.emptyCar);
    if (this.searched.v && this.searched.c) {
      await g.say(T.meow);
      g.setObjective(T.climbTip(g.isTouch));
    }
  }
  async takeCat(g) {
    g.flags.hurda.cat = true;
    g.player.hold = 'kedi';
    g.sfx.tone(900, 0.3, 0.1, 'triangle', 1300);
    await g.say(T.cat);
    await g.say(T.sacTop);
    g.setObjective('Sacları al, sonra Pamuk’u Rıfat Usta’ya götür');
  }
  async takeSac(g) {
    g.flags.hurda.sac = true;
    g.sfx.thud();
    g.setObjective('Pamuk’u Rıfat Usta’ya götür');
  }
  async give(g) {
    g.player.hold = null;
    g.flags.hurda.gave = true;
    await g.say(T.rifat2);
    g.flags.carry = [...(g.flags.carry || []), 'jenerator', 'sac'];
    g.player.hold = 'kutu';
    g.setObjective('Jeneratörü ve sacları depoya götür');
  }
  async back(g) {
    g.sfx.door();
    g.next('depo');
  }
  update(dt, g) {
    this.meowT -= dt;
    if (this.meowT <= 0 && g.flags.hurda?.met && !g.flags.hurda?.cat) {
      this.meowT = 4 + Math.random() * 3;
      const d = Math.abs(g.player.x - 2700);
      g.sfx.tone(780, 0.35, 0.12 * Math.max(0.15, 1 - d / 2600), 'triangle', 560);
      this.meowShow = g.t;
    }
  }
  drawBg(x, cam, g) {
    const L = this.L;
    sky(x, cam, L.sky);
    drawLayer(x, L.far, cam, 0.15, G - 460);
    drawLayer(x, L.near2, cam, 0.35, 600 - 420);
  }
  drawWorld(x, cam, g) {
    const t = g.t;
    const r = rng(9);
    // arka yığınlar
    for (let i = 0; i < 26; i++) {
      const X = r() * this.width,
        w = 120 + r() * 200,
        h = 80 + r() * 160;
      x.fillStyle = ['#4a4048', '#3a3a44', '#504438'][i % 3];
      x.beginPath();
      x.moveTo(X - w / 2, G);
      x.lineTo(X - w / 3, G - h);
      x.lineTo(X + w / 4, G - h * 0.8);
      x.lineTo(X + w / 2, G);
      x.fill();
    }
    // Rıfat'ın kulübesi
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.fillStyle = '#7a6a52';
    rr(x, 380, 420, 300, 200, 4);
    x.fill();
    x.stroke();
    x.fillStyle = '#a04030';
    x.beginPath();
    x.moveTo(360, 430);
    x.lineTo(530, 350);
    x.lineTo(700, 430);
    x.closePath();
    x.fill();
    x.stroke();
    x.fillStyle = '#ffd890';
    rr(x, 420, 460, 70, 60, 4);
    x.fill();
    x.stroke();
    glow(x, 455, 490, 90, '#ffc070', 0.4);
    x.fillStyle = '#2a3a6a';
    rr(x, 400, 300, 260, 40, 4);
    x.fill();
    x.stroke();
    x.fillStyle = '#ffe08a';
    x.font = '800 24px Onest, system-ui, sans-serif';
    x.fillText('RIFAT HURDA', 440, 328);
    // varil
    x.fillStyle = '#3a5a8a';
    rr(x, 1060, 520, 80, 100, 8);
    x.fill();
    x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.3)';
    x.beginPath();
    x.moveTo(1060, 550);
    x.lineTo(1140, 550);
    x.moveTo(1060, 590);
    x.lineTo(1140, 590);
    x.stroke();
    // ezilmiş araba platformları
    const carCol = ['#a04a3a', '#3a6aa0', '#5a8a4a', '#c8a040'];
    this.plats.forEach(([a, b, top], i) => {
      x.fillStyle = carCol[i % 4];
      x.strokeStyle = INK;
      x.lineWidth = 5;
      rr(x, a, top, b - a, G - top, 8);
      x.fill();
      x.stroke();
      x.fillStyle = 'rgba(0,0,0,0.2)';
      for (let yy = top + 26; yy < G; yy += 44) x.fillRect(a + 8, yy, b - a - 16, 6);
      x.fillStyle = '#9ac0e0';
      rr(x, a + 30, top + 8, 60, 14, 3);
      x.fill();
    });
    // tepedeki saclar + kedi
    const h = g.flags.hurda || {};
    if (!h.sac) {
      x.fillStyle = '#b8b0a0';
      x.strokeStyle = INK;
      x.lineWidth = 3;
      for (let k = 0; k < 4; k++) {
        rr(x, 2730 + k * 4, 340 - 14 - k * 10, 60, 10, 2);
        x.fill();
        x.stroke();
      }
    }
    if (!h.cat) {
      const cx = 2690,
        cy = 340;
      x.fillStyle = '#f2f0ea';
      x.strokeStyle = INK;
      x.lineWidth = 4;
      x.beginPath();
      x.ellipse(cx, cy - 16, 22, 14, 0, 0, 7);
      x.fill();
      x.stroke();
      x.beginPath();
      x.arc(cx - 20, cy - 30, 12, 0, 7);
      x.fill();
      x.stroke();
      x.beginPath();
      x.moveTo(cx - 30, cy - 38);
      x.lineTo(cx - 26, cy - 50);
      x.lineTo(cx - 20, cy - 40);
      x.moveTo(cx - 16, cy - 40);
      x.lineTo(cx - 12, cy - 50);
      x.lineTo(cx - 8, cy - 36);
      x.fill();
      x.stroke();
      if (this.meowShow && t - this.meowShow < 1.2) {
        x.fillStyle = '#fff';
        x.font = '800 22px Onest, system-ui, sans-serif';
        x.fillText('miyav', cx - 30, cy - 70 - (t - this.meowShow) * 20);
      }
    }
    // el arabası + jeneratör
    if (!h.gave) {
      x.fillStyle = '#c84a2a';
      x.strokeStyle = INK;
      x.lineWidth = 5;
      rr(x, 760, 520, 120, 80, 6);
      x.fill();
      x.stroke();
      x.fillStyle = '#ffd24a';
      x.font = '800 16px Onest, system-ui, sans-serif';
      x.fillText('5 kVA', 790, 566);
    }
    // zemin
    x.fillStyle = '#3a3228';
    x.fillRect(-20, G, this.width + 40, 200);
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(-20, G);
    x.lineTo(this.width + 20, G);
    x.stroke();
    for (let i = 0; i < 80; i++) {
      x.fillStyle = 'rgba(200,190,170,0.18)';
      x.fillRect(r() * this.width, G + 10 + r() * 60, 6 + r() * 10, 3);
    }
  }
}

// =============================================================== KAAN'IN ÇATISI
export class Cati2 {
  constructor(g) {
    this.key = 'cati2';
    this.width = 1900;
    this.spawn = { x: 260, y: 600 };
    this.L = shared();
    this.screws = 0;
    const S = this;
    const st = () => (g.flags.cati ||= {});
    this.spots = [
      { x: 1500, r: 120, label: 'Çanağı sök', when: () => st().ok && !st().done, use: () => S.screw(g) },
      { x: 260, r: 100, label: 'Aşağı in', when: () => st().done, use: () => S.back(g) },
    ];
    this.triggers = [{ x0: 700, x1: 820, run: () => S.anne(g) }];
  }
  setup(g) {
    g.addActor('kaan', 160, 600, { dir: 1, z: 3 });
    g.actors.kaan.follow = g.player;
    g.addActor('anne', 980, 600, { dir: 1, z: 1 });
    g.sfx.loop('city', 0.08);
    g.sfx.loop('crickets', 0.03);
  }
  async start(g) {
    g.setObjective('Çatının ucundaki çanak antene git');
  }
  async anne(g) {
    const A = g.actors;
    A.anne.dir = -1;
    A.anne.surprise = true;
    await g.say(T.anne1);
    A.anne.surprise = false;
    const id = await g.choose(T.anneAsk, T.anneOpts);
    await g.say(T.anneOpts.find((o) => o.id === id).reply);
    g.flags.cati.ok = true;
    A.anne.dir = 1;
    g.setObjective(T.unscrew(0));
  }
  async screw(g) {
    this.screws++;
    g.sfx.tone(300 + this.screws * 80, 0.15, 0.15, 'square', 200);
    g.player.crouch = true;
    await g.wait(0.35);
    g.player.crouch = false;
    g.setObjective(T.unscrew(this.screws));
    if (this.screws >= 4) {
      g.flags.cati.done = true;
      g.sfx.thud();
      g.player.hold = 'kutu';
      await g.say(T.canakDone);
      await g.say([CHAPTER3.parts.canak.line]);
      g.flags.carry = [...(g.flags.carry || []), 'canak'];
      g.setObjective('Çanağı depoya götür');
    }
  }
  async back(g) {
    g.sfx.door();
    g.next('depo');
  }
  drawBg(x, cam, g) {
    const L = this.L;
    sky(x, cam, L.sky);
    drawLayer(x, L.far, cam, 0.18, 600 - 460 + 20);
    drawLayer(x, L.near, cam, 0.45, 620 - 560);
  }
  drawWorld(x, cam, g) {
    const t = g.t;
    x.fillStyle = '#7a6a5e';
    x.fillRect(-20, 600, this.width + 40, 300);
    x.fillStyle = '#9a8676';
    x.fillRect(-20, 594, this.width + 40, 14);
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(-20, 596);
    x.lineTo(this.width + 20, 596);
    x.stroke();
    // kapı kulübesi
    x.fillStyle = '#b0a090';
    rr(x, 120, 400, 260, 200, 8);
    x.fill();
    x.stroke();
    x.fillStyle = '#ffd890';
    rr(x, 220, 460, 80, 140, 6);
    x.fill();
    x.stroke();
    glow(x, 260, 530, 100, '#ffc070', 0.3);
    // çamaşır
    x.strokeStyle = '#ddd';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(820, 440);
    x.quadraticCurveTo(1000, 470, 1200, 440);
    x.stroke();
    x.strokeStyle = INK;
    x.lineWidth = 4;
    const cl = [
      [860, '#f2f0ea'],
      [940, '#e86a5a'],
      [1060, '#6aa0d8'],
      [1130, '#f2d24a'],
    ];
    for (const [cx, col] of cl) {
      const sw = Math.sin(t * 1.4 + cx) * 4;
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(cx, 448);
      x.lineTo(cx + 56, 450);
      x.lineTo(cx + 56 + sw, 520);
      x.lineTo(cx + sw, 518);
      x.closePath();
      x.fill();
      x.stroke();
    }
    x.lineWidth = 6;
    x.strokeStyle = '#d8d0c0';
    x.beginPath();
    x.moveTo(820, 600);
    x.lineTo(820, 430);
    x.moveTo(1200, 600);
    x.lineTo(1200, 430);
    x.stroke();
    x.fillStyle = '#5a8ad8';
    x.strokeStyle = INK;
    x.lineWidth = 4;
    rr(x, 1230, 560, 70, 40, 6);
    x.fill();
    x.stroke();
    // çanak anten
    const done = g.flags.cati?.done;
    x.strokeStyle = INK;
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(1500, 600);
    x.lineTo(1500, 470);
    x.stroke();
    if (!done) {
      x.save();
      x.translate(1500, 470);
      x.rotate(-0.4 + (this.screws || 0) * 0.04);
      x.fillStyle = '#e8e8ec';
      x.beginPath();
      x.moveTo(-70, -60);
      x.quadraticCurveTo(-80, 30, 0, 20);
      x.quadraticCurveTo(-20, -30, -70, -60);
      x.fill();
      x.stroke();
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(-30, -10);
      x.lineTo(30, -40);
      x.stroke();
      x.restore();
    }
    // su deposu
    x.fillStyle = '#dfe4e8';
    x.strokeStyle = INK;
    x.lineWidth = 4;
    rr(x, 1680, 430, 120, 140, 14);
    x.fill();
    x.stroke();
    x.beginPath();
    x.moveTo(1700, 570);
    x.lineTo(1700, 600);
    x.moveTo(1780, 570);
    x.lineTo(1780, 600);
    x.stroke();
  }
}
