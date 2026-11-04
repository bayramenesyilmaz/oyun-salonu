// Kuşyolu 2D — Bölüm 1 sahneleri: Çatı → Apartman → Sokak → Arsa
import { INK, glow, rr, rng } from './draw.js';
import { makeSky, makeSkyline, drawLayer, Meteors, stringLights, canvas } from './bg.js';
import { C1, ROOF, STAIRS, STREET, ARSA } from './story.js';

const FRIENDS = ['elif', 'kaan', 'mert', 'zeynep'];

function chain(g, x, y, dir = 1) {
  let lead = g.player;
  FRIENDS.forEach((id, i) => {
    const a = g.addActor(id, x - dir * (i + 1) * 95, y, { dir, z: 4 - i });
    a.follow = lead;
    a.gap = 95;
    lead = a;
  });
}

export function sky(x, cam, img, k = 0.04) {
  x.drawImage(img, -Math.round(cam.x * k) - 40, -100 - Math.round(cam.y * 0.15));
}

// Ortak gece katmanları (bir kez üretilir)
let SHARED = null;
export function shared() {
  if (SHARED) return SHARED;
  SHARED = {
    sky: makeSky(3200, 980, 5),
    far: makeSkyline(2400, 460, 21, 'far'),
    near: makeSkyline(2600, 560, 33, 'near'),
    near2: makeSkyline(2600, 420, 47, 'near'),
  };
  return SHARED;
}

// =============================================================== ÇATI
export class Roof {
  constructor(g) {
    this.key = 'roof';
    this.width = 2600;
    this.spawn = { x: 300, y: 600 };
    this.L = shared();
    this.met = new Meteors();
    this.talked = {};
    this.count = 0;
    this.big = null;
    this.watching = false;
    this.pops = [];
    const S = this;
    this.spots = [
      ...FRIENDS.map((id) => ({
        id,
        get x() {
          return g.actors[id] ? g.actors[id].x : -999;
        },
        r: 100,
        label: 'Konuş',
        when: () => !S.boomed && g.actors[id],
        use: () => S.talk(g, id),
      })),
      { x: 2240, r: 110, label: 'Gökyüzüne bak', when: () => S.allTalked && !S.boomed, use: () => S.watch(g) },
      { x: 290, r: 90, label: 'Aşağı in', when: () => S.boomed && S.ready, use: () => S.down(g) },
    ];
  }
  setup(g) {
    g.addActor('mert', 1150, 600, { dir: 1, sit: true, z: 2 });
    g.addActor('zeynep', 1395, 600, { dir: -1, sit: true, z: 2 });
    g.addActor('kaan', 1720, 600, { dir: -1, z: 3 });
    g.addActor('elif', 2150, 600, { dir: 1, z: 3 });
    g.actors.elif.look = 0.8;
    g.sfx.loop('crickets', 0.04);
    g.sfx.loop('city', 0.08);
  }
  async start(g) {
    g.setObjective('');
    await g.wait(0.6);
    await g.say(C1.intro);
    g.setObjective(C1 && `Arkadaşlarınla konuş (0/4)`);
  }
  async talk(g, id) {
    const n = this.talked[id] || 0;
    const a = g.actors[id];
    const p = g.player;
    const side = p.x < a.x ? -1 : 1;
    if (Math.abs(p.x - a.x) < 80) await p.goTo(a.x + side * 90);
    p.dir = a.x > p.x ? 1 : -1;
    if (!a.sit) a.dir = p.x > a.x ? 1 : -1;
    const lk = a.look;
    a.look = 0;
    const set = C1.talk[id];
    if (n < set.length) await g.say(set[n]);
    else {
      const b = C1.idleBarks[id];
      await g.say([{ s: id, t: b[n % b.length] }]);
    }
    a.look = lk;
    if (id === 'mert' && !p.hold) {
      p.hold = 'cay';
      g.sfx.ping();
    }
    this.talked[id] = n + 1;
    const done = FRIENDS.filter((f) => this.talked[f]).length;
    if (!this.allTalked) g.setObjective(`Arkadaşlarınla konuş (${done}/4)`);
    if (done === 4 && !this.allTalked) {
      this.allTalked = true;
      await g.wait(0.4);
      await g.say(ROOF.allTalked);
      g.setObjective('Çatının ucuna, Elif’in yanına git ve gökyüzüne bak');
    }
  }
  async watch(g) {
    const p = g.player;
    await p.goTo(2235);
    p.dir = 1;
    p.look = 1;
    g.actors.elif.look = 1;
    this.watching = true;
    await g.say(ROOF.watchStart);
    this.met.rate = 1.1;
    g.setObjective(`Kayan yıldızı görünce ${g.isTouch ? 'ekrana dokun' : 'E’ye bas'} (0/5)`);
    g.onAct = () => {
      const m = this.met.list.find((m) => !m.counted && m.t < m.life * 0.95);
      if (!m) return;
      m.counted = true;
      this.count++;
      g.sfx.ping();
      const hx = m.x + m.vx * m.t,
        hy = m.y + m.vy * m.t;
      this.pops.push({ x: hx, y: hy, t: 0, txt: ROOF.counted[this.count - 1] });
      g.setObjective(`Kayan yıldızı görünce ${g.isTouch ? 'ekrana dokun' : 'E’ye bas'} (${this.count}/5)`);
    };
    // test modunda kendi kendine say
    if (g.test) {
      while (this.count < 5) {
        await g.until(() => this.met.list.some((m) => !m.counted));
        g.onAct();
      }
    }
    await g.until(() => this.count >= 5);
    g.onAct = null;
    this.met.rate = 0;
    g.setObjective('');
    await g.wait(1.2);
    await this.meteor(g);
  }
  async meteor(g) {
    const A = g.actors;
    this.big = { t: 0, d: 6.5 };
    g.sfx.whoosh();
    for (const id of FRIENDS) {
      A[id].surprise = true;
      A[id].look = 0.9;
      if (A[id].sit) {
        A[id].sit = false;
      }
    }
    g.player.surprise = true;
    A.mert.x -= 20;
    A.zeynep.x += 20;
    await g.say(C1.meteor);
    await g.until(() => this.big.t > 3.6);
    await g.say(C1.afterFlash);
    for (const a of [g.player, ...FRIENDS.map((f) => A[f])]) {
      a.crouch = true;
      a.look = 0;
    }
    if (g.player.hold === 'cay') {
      g.player.hold = null;
      g.sfx.thud();
    }
    await g.until(() => this.big.t >= this.big.d);
    g.flash = 1.4;
    await g.wait(0.7);
    g.sfx.boom();
    g.shake(1.8);
    this.boomT = g.t;
    await g.wait(2.4);
    for (const a of [g.player, ...FRIENDS.map((f) => A[f])]) {
      a.crouch = false;
      a.surprise = false;
    }
    this.boomed = true;
    await g.wait(0.5);
    await g.say(C1.afterBoom);
    // herkes Arda'nın peşine takılır
    let lead = g.player;
    FRIENDS.forEach((id, i) => {
      A[id].follow = lead;
      A[id].gap = 95;
      A[id].z = 4 - i;
      lead = A[id];
    });
    this.ready = true;
    g.setObjective('Çatı kapısından aşağı in');
  }
  async down(g) {
    await g.say(ROOF.door);
    g.sfx.door();
    g.next('stairs');
  }
  update(dt, g) {
    this.met.update(dt, g.viewW);
    if (this.big) this.big.t = Math.min(this.big.d, this.big.t + dt);
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 1.2);
  }
  drawBg(x, cam, g) {
    const L = this.L;
    sky(x, cam, L.sky);
    this.met.draw(x);
    for (const p of this.pops) {
      x.globalAlpha = 1 - p.t / 1.2;
      x.fillStyle = '#ffe08a';
      x.font = '700 26px Onest, system-ui, sans-serif';
      x.fillText(p.txt, p.x + 10, p.y - 10 - p.t * 30);
      x.globalAlpha = 1;
    }
    // büyük göktaşı: sol üstten sağ alta, büyüyerek binaların arkasına düşer
    if (this.big && this.big.t < this.big.d) {
      const k = this.big.t / this.big.d;
      const e = k * k;
      const hx = cam.w * (0.08 + 0.82 * e),
        hy = 40 + 420 * e;
      const R = 6 + 34 * e;
      const tx = hx - (120 + 400 * e),
        ty = hy - (40 + 200 * e);
      const gr = x.createLinearGradient(tx, ty, hx, hy);
      gr.addColorStop(0, 'rgba(120,255,200,0)');
      gr.addColorStop(1, 'rgba(210,255,240,0.95)');
      x.strokeStyle = gr;
      x.lineWidth = R * 1.3;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(tx, ty);
      x.lineTo(hx, hy);
      x.stroke();
      glow(x, hx, hy, R * 5 + 40, '#a8ffdc', 0.85);
      x.fillStyle = '#fff';
      x.beginPath();
      x.arc(hx, hy, R * 0.6, 0, 7);
      x.fill();
    }
    drawLayer(x, L.far, cam, 0.18, 600 - 460 + 20);
    // patlamadan sonra uzakta yükselen duman ve yeşil ışık
    if (this.boomT) {
      const age = g.t - this.boomT;
      const sx = cam.w * 0.86;
      glow(x, sx, 470, 260, '#7affc8', Math.max(0.12, 0.7 - age * 0.15));
      for (let i = 0; i < 9; i++) {
        const yy = 470 - ((age * 30 + i * 40) % 360);
        x.fillStyle = `rgba(60,64,90,${0.35 * (1 - (470 - yy) / 380)})`;
        x.beginPath();
        x.arc(sx + Math.sin(i + age) * 20 + (470 - yy) * 0.25, yy, 40 + (470 - yy) * 0.2, 0, 7);
        x.fill();
      }
    }
    drawLayer(x, L.near, cam, 0.45, 620 - 560);
  }
  drawWorld(x, cam, g) {
    const t = g.t;
    // çatı zemini
    x.fillStyle = '#8a7462';
    x.fillRect(-20, 600, this.width + 40, 300);
    x.fillStyle = '#a48a74';
    x.fillRect(-20, 594, this.width + 40, 14);
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(-20, 596);
    x.lineTo(this.width + 20, 596);
    x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < this.width; i += 90) x.fillRect(i, 612, 4, 120);
    // kenar duvarları
    for (const ex of [0, this.width - 40]) {
      x.fillStyle = '#9a8270';
      rr(x, ex, 500, 40, 110, 6);
      x.fill();
      x.stroke();
    }
    // merdiven kulübesi
    x.fillStyle = '#b8a48e';
    rr(x, 120, 380, 300, 222, 8);
    x.fill();
    x.stroke();
    x.fillStyle = '#7a5a40';
    rr(x, 110, 366, 320, 22, 6);
    x.fill();
    x.stroke();
    x.fillStyle = this.ready ? '#ffd890' : '#4a3a2c';
    rr(x, 250, 440, 84, 160, 6);
    x.fill();
    x.stroke();
    if (this.ready) glow(x, 292, 520, 120, '#ffc070', 0.35);
    x.fillStyle = '#ffe0a0';
    x.beginPath();
    x.arc(360, 420, 9, 0, 7);
    x.fill();
    glow(x, 360, 420, 50, '#ffb050', 0.5);
    // çamaşır ipi
    x.strokeStyle = '#d8d0c0';
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(520, 600);
    x.lineTo(520, 420);
    x.moveTo(940, 600);
    x.lineTo(940, 420);
    x.stroke();
    x.lineWidth = 2;
    x.strokeStyle = '#ddd';
    x.beginPath();
    x.moveTo(520, 430);
    x.quadraticCurveTo(730, 462, 940, 430);
    x.stroke();
    x.lineWidth = 4;
    x.strokeStyle = INK;
    const cloth = [
      [570, '#e86a5a', 60, 70],
      [650, '#f2f0ea', 70, 46],
      [740, '#5a9ad8', 56, 80],
      [820, '#f2d24a', 60, 52],
    ];
    for (const [cx, col, w, h] of cloth) {
      const sw = Math.sin(t * 1.5 + cx) * 4;
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(cx, 440);
      x.lineTo(cx + w, 442);
      x.lineTo(cx + w + sw, 442 + h);
      x.lineTo(cx + sw, 440 + h);
      x.closePath();
      x.fill();
      x.stroke();
    }
    // ampul dizisi
    stringLights(x, 980, 1820, 390, 70, 18, t, this.boomT ? 0.6 + 0.4 * Math.sin(t * 25) ** 2 : 1);
    // sandalyeler, kasa, çay
    const A = g.actors;
    const chair = (cx, d) => {
      x.save();
      x.translate(cx, 600);
      x.scale(d, 1);
      x.fillStyle = '#f2f0ea';
      x.strokeStyle = '#2a2a33';
      x.lineWidth = 4;
      rr(x, -30, -64, 60, 12, 4);
      x.fill();
      x.stroke();
      rr(x, -34, -150, 12, 98, 5);
      x.fill();
      x.stroke();
      rr(x, -26, -54, 8, 54, 3);
      x.fill();
      x.stroke();
      rr(x, 18, -54, 8, 54, 3);
      x.fill();
      x.stroke();
      x.restore();
    };
    chair(1150, 1);
    chair(1395, -1);
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.fillStyle = '#c63a34';
    rr(x, 1230, 548, 96, 52, 6);
    x.fill();
    x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.3)';
    x.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      x.beginPath();
      x.moveTo(1230 + i * 24, 552);
      x.lineTo(1230 + i * 24, 596);
      x.stroke();
    }
    x.strokeStyle = INK;
    x.lineWidth = 3;
    for (const X of [1246, 1270]) {
      x.fillStyle = 'rgba(255,240,230,0.85)';
      rr(x, X, 522, 14, 26, 3);
      x.fill();
      x.stroke();
      x.fillStyle = '#b4541c';
      x.fillRect(X + 3, 530, 8, 16);
    }
    x.fillStyle = '#d8dce0';
    rr(x, 1294, 510, 22, 38, 6);
    x.fill();
    x.stroke();
    x.fillStyle = '#c8ccd0';
    rr(x, 1298, 492, 14, 20, 5);
    x.fill();
    x.stroke();
    // Zeynep'in telefonu (sehpa)
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(1480, 600);
    x.lineTo(1492, 520);
    x.lineTo(1504, 600);
    x.moveTo(1492, 520);
    x.lineTo(1492, 600);
    x.stroke();
    x.fillStyle = '#22252e';
    rr(x, 1480, 492, 24, 30, 4);
    x.fill();
    x.stroke();
    if ((t * 1.2) % 2 < 1.2) {
      x.fillStyle = '#ff4040';
      x.beginPath();
      x.arc(1499, 498, 3, 0, 7);
      x.fill();
    }
    // güneş paneli + su deposu
    x.lineWidth = 4;
    x.fillStyle = '#2a4a7a';
    x.save();
    x.translate(1880, 520);
    x.rotate(-0.35);
    rr(x, 0, 0, 160, 54, 4);
    x.fill();
    x.stroke();
    x.strokeStyle = '#6a8ab8';
    x.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      x.beginPath();
      x.moveTo(i * 40, 2);
      x.lineTo(i * 40, 52);
      x.stroke();
    }
    x.restore();
    x.strokeStyle = INK;
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(1900, 560);
    x.lineTo(1900, 600);
    x.moveTo(2010, 520);
    x.lineTo(2010, 600);
    x.stroke();
    x.fillStyle = '#dfe4e8';
    rr(x, 2380, 410, 120, 150, 14);
    x.fill();
    x.stroke();
    x.fillStyle = '#b8c0c8';
    rr(x, 2370, 400, 140, 18, 8);
    x.fill();
    x.stroke();
    x.beginPath();
    x.moveTo(2400, 560);
    x.lineTo(2400, 600);
    x.moveTo(2480, 560);
    x.lineTo(2480, 600);
    x.stroke();
    // ampul ışık havuzu
    glow(x, 1300, 540, 380, '#ffa850', 0.13);
  }
}

// =============================================================== APARTMAN
const FH = 330;
const fy = (i) => 300 + i * FH; // kat zemini
// merdiven: i. kattan i+1'e
const STAIR = (i) => (i % 2 === 0 ? { top: 1230, bot: 930 } : { top: 270, bot: 570 });

export class Stairs {
  constructor(g) {
    this.key = 'stairs';
    this.width = 1500;
    this.spawn = { x: 1360, y: fy(0) };
    this.floor = 0;
    this.flicker = 0;
    this.nevinOpen = 0;
    const S = this;
    this.spots = [0, 1, 2, 3].map((i) => ({
      x: STAIR(i).top,
      y: fy(i),
      r: 80,
      label: 'Aşağı in',
      hy: fy(i) - 250,
      use: () => S.descend(g, i),
    }));
    this.spots.push({ x: 1180, y: fy(4), r: 90, label: 'Dışarı çık', use: () => S.exit(g) });
    this.triggers = [
      { x0: 650, x1: 900, y: fy(1), run: () => S.nevin(g) },
      { x0: 900, x1: 1300, y: fy(2), run: () => S.flick(g) },
      { x0: 200, x1: 900, y: fy(3), run: () => S.ece(g) },
    ];
    this.win = makeSky(1500, 1700, 9, [
      [0, '#0b1233'],
      [1, '#2a2f60'],
    ]);
  }
  setup(g) {
    g.player.dir = -1;
    chain(g, 1420, fy(0), -1);
    for (const f of FRIENDS) g.actors[f].x = 1410;
    // komşular
    g.addActor('nevin', 800, fy(1), { dir: 1, z: 1 });
    g.actors.nevin.hidden = true;
    g.addActor('cocuk', 520, fy(3), { dir: 1, z: 1 });
    g.actors.cocuk.hidden = true;
    g.sfx.loop('hum', 0.0);
  }
  camY(p) {
    return (p ? p.y : fy(0)) - 560;
  }
  clampX(nx, p) {
    return Math.max(90, Math.min(this.width - 90, nx));
  }
  groundAt(x, y) {
    return y;
  }
  async start(g) {
    g.setObjective('Apartmandan aşağı in');
  }
  async descend(g, i) {
    const s = STAIR(i);
    const p = g.player;
    await p.goTo(s.top);
    await p.tweenTo(s.bot, fy(i + 1), 1.25);
    this.floor = i + 1;
    g.sfx.thud();
  }
  // Arkadaşlar Arda'dan üst kattaysa kendi kendine merdivene yürüyüp iner
  update(dt, g) {
    const p = g.player;
    const pf = Math.round((p.y - 300) / FH);
    FRIENDS.forEach((id, k) => {
      const a = g.actors[id];
      if (!a || a.busy || a.tween) return;
      const f = Math.round((a.y - 300) / FH);
      if (f >= pf) return;
      a.busy = true;
      const s = STAIR(f);
      const keep = a.follow;
      a.follow = null;
      a.speed = 440;
      g.wait(0.2 + k * 0.3)
        .then(() => a.goTo(s.top))
        .then(() => a.tweenTo(s.bot, fy(f + 1), 1.1))
        .then(() => {
          a.speed = 260;
          a.follow = keep;
          a.busy = false;
        });
    });
  }
  async nevin(g) {
    const n = g.actors.nevin;
    g.sfx.door();
    this.nevinOpen = 1;
    n.hidden = false;
    n.surprise = true;
    await g.wait(0.4);
    await g.say(STAIRS.nevin);
    n.surprise = false;
    await g.wait(0.3);
    n.hidden = true;
    this.nevinOpen = 0;
    g.sfx.door();
  }
  async flick(g) {
    this.flicker = 1;
    g.sfx.loop('hum', 0.06);
    await g.say(STAIRS.flicker);
  }
  async ece(g) {
    const c = g.actors.cocuk;
    c.hidden = false;
    this.eceOpen = 1;
    g.sfx.door();
    await g.say(STAIRS.ece);
    c.hidden = true;
    this.eceOpen = 0;
    g.sfx.door();
  }
  async exit(g) {
    await g.say(STAIRS.exit);
    g.sfx.door();
    g.next('street');
  }
  power(i, t) {
    if (!this.flicker) return 1;
    const n = Math.sin(t * 31 + i * 7) * Math.sin(t * 13.7 + i);
    return n > 0.55 ? 0.15 : 1;
  }
  drawBg(x, cam) {
    x.fillStyle = '#0a0d1c';
    x.fillRect(0, 0, cam.w, cam.h);
  }
  drawWorld(x, cam, g) {
    const t = g.t;
    // dış gökyüzü (binanın iki yanı)
    x.drawImage(this.win, -cam.w, -200, this.width + cam.w * 2, 1900);
    for (let i = 0; i < 5; i++) {
      const y0 = fy(i) - FH + 40,
        y1 = fy(i);
      const pw = this.power(i, t);
      // duvar
      x.fillStyle = i % 2 ? '#d9c7a8' : '#d2bf9e';
      x.fillRect(60, y0, this.width - 120, FH - 40);
      // lambri
      x.fillStyle = '#8a6a4c';
      x.fillRect(60, y1 - 90, this.width - 120, 90);
      x.strokeStyle = 'rgba(0,0,0,0.25)';
      x.lineWidth = 2;
      for (let k = 80; k < this.width - 60; k += 60) {
        x.beginPath();
        x.moveTo(k, y1 - 90);
        x.lineTo(k, y1);
        x.stroke();
      }
      // daire kapıları
      const doors = i === 4 ? [] : [[i % 2 ? 1020 : 520], [i % 2 ? 800 : 700]];
      if (i === 1) doors.splice(0, 2, [800]);
      if (i === 3) doors.splice(0, 2, [520]);
      for (const [dx] of doors) {
        const open = (i === 1 && this.nevinOpen) || (i === 3 && this.eceOpen);
        x.fillStyle = open ? '#ffd890' : '#6a4a32';
        x.strokeStyle = INK;
        x.lineWidth = 4;
        rr(x, dx - 46, y1 - 200, 92, 200, 4);
        x.fill();
        x.stroke();
        if (open) glow(x, dx, y1 - 100, 140, '#ffc070', 0.4);
        else {
          x.fillStyle = '#e8c060';
          x.beginPath();
          x.arc(dx + 30, y1 - 100, 6, 0, 7);
          x.fill();
          x.fillStyle = '#c8b090';
          rr(x, dx - 22, y1 - 232, 44, 20, 3);
          x.fill();
          x.fillStyle = INK;
          x.font = '600 13px Onest, system-ui, sans-serif';
          x.textAlign = 'center';
          x.fillText(String((4 - i) * 2 + (dx > 760 ? 2 : 1)), dx, y1 - 217);
          x.textAlign = 'left';
        }
        x.fillStyle = '#7a3a3a';
        rr(x, dx - 40, y1 - 6, 80, 6, 2);
        x.fill();
      }
      if (i === 4) {
        // giriş kapısı
        x.fillStyle = '#3a4a5a';
        x.strokeStyle = INK;
        x.lineWidth = 5;
        rr(x, 1130, y1 - 230, 110, 230, 6);
        x.fill();
        x.stroke();
        x.fillStyle = 'rgba(140,180,255,0.5)';
        rr(x, 1148, y1 - 210, 74, 120, 4);
        x.fill();
        // posta kutuları
        x.fillStyle = '#9a9aa2';
        for (let k = 0; k < 8; k++) {
          rr(x, 660 + (k % 4) * 52, y1 - 240 + Math.floor(k / 4) * 44, 46, 38, 3);
          x.fill();
          x.stroke();
        }
      }
      // pencereler (dış duvarlarda)
      x.fillStyle = 'rgba(20,30,70,0.6)';
      // lamba
      x.fillStyle = '#eee';
      x.strokeStyle = INK;
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(750, y0);
      x.lineTo(750, y0 + 40);
      x.stroke();
      x.fillStyle = pw > 0.5 ? '#fff4d0' : '#6a6450';
      x.beginPath();
      x.arc(750, y0 + 50, 14, 0, 7);
      x.fill();
      x.stroke();
      glow(x, 750, y0 + 60, 380, '#ffe2a0', 0.32 * pw);
      if (pw < 0.5) {
        x.fillStyle = 'rgba(5,8,25,0.55)';
        x.fillRect(60, y0, this.width - 120, FH - 40);
      }
      // merdiven (arka duvarda)
      if (i < 4) {
        const s = STAIR(i);
        const n = 12;
        x.fillStyle = '#9a8a78';
        x.strokeStyle = INK;
        x.lineWidth = 3;
        for (let k = 0; k < n; k++) {
          const kx = s.top + ((s.bot - s.top) * k) / n;
          const ky = y1 + (FH * k) / n;
          const w = (s.bot - s.top) / n;
          x.beginPath();
          x.rect(Math.min(kx, kx + w), ky, Math.abs(w) + 1, FH / n + 1);
          x.fill();
          x.stroke();
        }
        // korkuluk
        x.strokeStyle = '#3a2a20';
        x.lineWidth = 6;
        x.beginPath();
        x.moveTo(s.top, y1 - 70);
        x.lineTo(s.bot, y1 + FH - 70);
        x.stroke();
      }
      // döşeme
      x.fillStyle = '#6a6460';
      x.fillRect(40, y1, this.width - 80, 40);
      x.strokeStyle = INK;
      x.lineWidth = 4;
      x.strokeRect(40, y1, this.width - 80, 40);
      if (i < 4) {
        const s = STAIR(i);
        x.fillStyle = '#9a8a78';
        x.fillRect(Math.min(s.top, s.bot) + 40, y1 + 4, Math.abs(s.bot - s.top) - 80, 32);
      }
      // kat numarası
      x.fillStyle = 'rgba(40,30,20,0.6)';
      x.font = '800 30px Onest, system-ui, sans-serif';
      x.fillText(i === 4 ? 'ZEMİN' : `${5 - i}. KAT`, 100, y0 + 50);
    }
    // dış duvarlar ve pencere boşlukları
    x.fillStyle = '#b89a7a';
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.fillRect(30, fy(0) - FH, 40, FH * 5 + 40);
    x.fillRect(this.width - 70, fy(0) - FH, 40, FH * 5 + 40);
    x.strokeRect(30, fy(0) - FH, 40, FH * 5 + 40);
    x.strokeRect(this.width - 70, fy(0) - FH, 40, FH * 5 + 40);
  }
}

// =============================================================== SOKAK
export class Street {
  constructor(g) {
    this.key = 'street';
    this.width = 3700;
    this.spawn = { x: 300, y: 610 };
    this.L = shared();
    const S = this;
    this.lamps = [520, 1140, 1760, 2380, 3000];
    this.triggers = [
      { x0: 1380, x1: 1480, run: () => S.hayri(g) },
      { x0: 2080, x1: 2180, run: () => S.dog(g) },
      { x0: 2650, x1: 2750, run: () => g.say(STREET.lamp) },
    ];
    this.spots = [{ x: 3420, r: 100, label: 'Çitin altından geç', use: () => S.fence(g) }];
    this.barkT = -10;
  }
  setup(g) {
    chain(g, 300, 610, 1);
    for (const f of FRIENDS) g.actors[f].x = 300 - 60;
    g.addActor('hayri', 1640, 610, { dir: -1, z: 0 });
    g.sfx.loop('city', 0.12);
    g.sfx.loop('crickets', 0.03);
  }
  async start(g) {
    g.setObjective('Sokağın sonundaki boş arsaya git');
    await g.wait(1.2);
    await g.say(STREET.start);
  }
  async hayri(g) {
    const h = g.actors.hayri;
    h.dir = -1;
    await g.say(STREET.hayri);
  }
  async dog(g) {
    this.barkT = g.t;
    g.sfx.bark();
    await g.wait(0.6);
    g.sfx.bark();
    await g.say(STREET.dog);
  }
  async fence(g) {
    await g.say(STREET.fence);
    const p = g.player;
    await p.goTo(3420);
    p.crouch = true;
    await p.tweenTo(3560, 610, 1.0);
    g.next('arsa');
  }
  lampPower(i, t) {
    const k = i / (this.lamps.length - 1);
    const n = Math.sin(t * (9 + i * 5)) * Math.sin(t * (3.3 + i));
    return n > 1 - k * 0.7 ? 0.1 : 1;
  }
  clampX(nx) {
    return Math.max(140, Math.min(3480, nx));
  }
  drawBg(x, cam, g) {
    const L = this.L;
    sky(x, cam, L.sky);
    drawLayer(x, L.far, cam, 0.15, 610 - 460 + 10);
    // uzaktaki duman (arsanın üstü)
    const smx = 3500 * 0.4 - cam.x * 0.4 + cam.w * 0.2;
    glow(x, smx + 300, 430, 300, '#7affc8', 0.25);
    for (let i = 0; i < 10; i++) {
      const yy = 470 - ((g.t * 25 + i * 38) % 380);
      x.fillStyle = `rgba(70,74,100,${0.4 * (1 - (470 - yy) / 400)})`;
      x.beginPath();
      x.arc(smx + 300 + Math.sin(i + g.t) * 20 + (470 - yy) * 0.2, yy, 50 + (470 - yy) * 0.2, 0, 7);
      x.fill();
    }
    drawLayer(x, L.near2, cam, 0.4, 600 - 420);
  }
  drawWorld(x, cam, g) {
    const t = g.t;
    // ön sıra binalar (sahnenin kendisi)
    const fronts = [
      [0, 420, '#c9a27e', 'Apartman'],
      [440, 380, '#b6876a'],
      [840, 520, '#9fa8b0'],
      [1380, 520, '#c7b48a', 'BAKKAL'],
      [1920, 300, '#a07a62'],
      [2240, 560, '#b0a08a'],
      [2820, 380, '#8e9a9e'],
    ];
    for (const [bx, bw, col, name] of fronts) {
      const top = 180 + ((bx * 7) % 90);
      x.fillStyle = col;
      x.strokeStyle = INK;
      x.lineWidth = 5;
      rr(x, bx + 6, top, bw - 12, 430 - top + 180, 4);
      x.fill();
      x.stroke();
      for (let yy = top + 30; yy < 430; yy += 100)
        for (let xx = bx + 40; xx < bx + bw - 80; xx += 110) {
          const on = ((xx * 13 + yy * 7) % 10) / 10 < 0.45;
          x.fillStyle = on ? '#ffd890' : '#2a3150';
          rr(x, xx, yy, 60, 70, 4);
          x.fill();
          x.stroke();
          if (on) glow(x, xx + 30, yy + 35, 70, '#ffc070', 0.25);
          x.fillStyle = 'rgba(0,0,0,0.25)';
          x.fillRect(xx - 6, yy + 70, 72, 8);
        }
      if (name === 'Apartman') {
        x.fillStyle = '#3a4a5a';
        rr(x, bx + 60, 430, 110, 180, 6);
        x.fill();
        x.stroke();
        x.fillStyle = '#ffd890';
        glow(x, bx + 115, 420, 60, '#ffc070', 0.6);
        x.fillStyle = INK;
        x.font = '700 20px Onest, system-ui, sans-serif';
        x.fillText('No: 14', bx + 80, 420);
      }
      if (name === 'BAKKAL') {
        x.fillStyle = '#ffe6a8';
        rr(x, bx + 60, 440, 260, 170, 4);
        x.fill();
        x.stroke();
        glow(x, bx + 190, 520, 220, '#ffd080', 0.45);
        // raflar
        x.fillStyle = '#8a5a3a';
        for (let k = 0; k < 3; k++) x.fillRect(bx + 70, 470 + k * 44, 240, 6);
        const cols = ['#e04a3a', '#3a8ae0', '#f0c030', '#4ab04a'];
        for (let k = 0; k < 24; k++) {
          x.fillStyle = cols[k % 4];
          x.fillRect(bx + 76 + (k % 8) * 29, 448 + Math.floor(k / 8) * 44, 18, 22);
        }
        // tente
        for (let k = 0; k < 9; k++) {
          x.fillStyle = k % 2 ? '#f2f0ea' : '#d23a2a';
          x.beginPath();
          x.moveTo(bx + 40 + k * 50, 404);
          x.lineTo(bx + 90 + k * 50, 404);
          x.lineTo(bx + 90 + k * 50, 434);
          x.quadraticCurveTo(bx + 65 + k * 50, 446, bx + 40 + k * 50, 434);
          x.closePath();
          x.fill();
          x.stroke();
        }
        x.fillStyle = '#2a3a6a';
        rr(x, bx + 120, 340, 280, 50, 6);
        x.fill();
        x.stroke();
        x.fillStyle = '#ffe08a';
        x.font = '800 30px Onest, system-ui, sans-serif';
        x.fillText('HAYRİ BAKKALİYE', bx + 134, 376);
        // kapı
        x.fillStyle = '#ffd890';
        rr(x, bx + 360, 440, 90, 170, 4);
        x.fill();
        x.stroke();
      }
    }
    // köpek ve bahçe çiti
    x.fillStyle = '#7a5a3a';
    for (let k = 0; k < 12; k++) {
      rr(x, 1930 + k * 24, 500, 18, 110, 3);
      x.fill();
      x.stroke();
    }
    const bark = g.t - this.barkT < 2.5;
    x.fillStyle = '#5a4030';
    x.beginPath();
    x.ellipse(2080, 488 + (bark ? Math.sin(g.t * 20) * 3 : 0), 34, 22, 0, 0, 7);
    x.fill();
    x.stroke();
    x.beginPath();
    x.ellipse(2120, 470 + (bark ? Math.sin(g.t * 20) * 3 : 0), 18, 16, 0, 0, 7);
    x.fill();
    x.stroke();
    if (bark) {
      x.fillStyle = '#fff';
      x.font = '800 26px Onest, system-ui, sans-serif';
      x.fillText('HAV!', 2140, 440 - ((g.t * 60) % 30));
    }
    // kaldırım
    x.fillStyle = '#9a9490';
    x.fillRect(-20, 606, this.width + 40, 40);
    x.strokeStyle = INK;
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(-20, 606);
    x.lineTo(this.width + 20, 606);
    x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < this.width; i += 70) x.fillRect(i, 610, 3, 34);
    // sokak lambaları
    this.lamps.forEach((lx, i) => {
      const p = this.lampPower(i, t);
      x.strokeStyle = INK;
      x.lineWidth = 5;
      x.fillStyle = '#3a3e4a';
      rr(x, lx - 6, 330, 12, 280, 4);
      x.fill();
      x.stroke();
      x.beginPath();
      x.moveTo(lx, 334);
      x.quadraticCurveTo(lx + 10, 300, lx + 50, 306);
      x.stroke();
      x.fillStyle = p > 0.5 ? '#fff2c0' : '#5a5440';
      rr(x, lx + 34, 300, 40, 16, 6);
      x.fill();
      x.stroke();
      if (p > 0.5) {
        x.globalAlpha = 0.16;
        x.fillStyle = '#ffe0a0';
        x.beginPath();
        x.moveTo(lx + 38, 316);
        x.lineTo(lx + 70, 316);
        x.lineTo(lx + 170, 640);
        x.lineTo(lx - 60, 640);
        x.closePath();
        x.fill();
        x.globalAlpha = 1;
        glow(x, lx + 54, 312, 60, '#ffe0a0', 0.6);
      }
    });
    // arsa çiti
    x.fillStyle = '#8a8070';
    x.strokeStyle = INK;
    x.lineWidth = 4;
    for (let k = 0; k < 8; k++) {
      const hx = 3320 + k * 52;
      x.fillStyle = k % 2 ? '#7a8a8a' : '#8a7a6a';
      rr(x, hx, 420, 50, k === 2 ? 130 : 190, 2);
      x.fill();
      x.stroke();
    }
    x.fillStyle = '#d23a2a';
    x.font = '800 20px Onest, system-ui, sans-serif';
    x.fillText('GİRMEK YASAKTIR', 3350, 470);
  }
  drawFront(x, cam, g) {
    // yol ve park etmiş araba (önde)
    x.fillStyle = '#2a2c34';
    x.fillRect(-20, 646, this.width + 40, 100);
    x.fillStyle = '#d8d4c0';
    for (let i = 0; i < this.width; i += 160) x.fillRect(i, 690, 80, 6);
    const cx = 980;
    const alarm = Math.sin(g.t * 8) > 0;
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.fillStyle = '#d8a030';
    x.beginPath();
    x.moveTo(cx, 690);
    x.lineTo(cx, 640);
    x.quadraticCurveTo(cx + 40, 630, cx + 70, 600);
    x.lineTo(cx + 200, 596);
    x.quadraticCurveTo(cx + 240, 626, cx + 290, 636);
    x.lineTo(cx + 296, 690);
    x.closePath();
    x.fill();
    x.stroke();
    x.fillStyle = '#9ac0e0';
    x.beginPath();
    x.moveTo(cx + 80, 608);
    x.lineTo(cx + 190, 606);
    x.lineTo(cx + 218, 632);
    x.lineTo(cx + 60, 634);
    x.closePath();
    x.fill();
    x.stroke();
    x.fillStyle = '#1a1a1a';
    for (const wx of [cx + 60, cx + 236]) {
      x.beginPath();
      x.arc(wx, 690, 26, 0, 7);
      x.fill();
      x.stroke();
      x.fillStyle = '#888';
      x.beginPath();
      x.arc(wx, 690, 10, 0, 7);
      x.fill();
      x.fillStyle = '#1a1a1a';
    }
    if (alarm) {
      glow(x, cx + 6, 650, 50, '#ffa020', 0.9);
      glow(x, cx + 290, 650, 50, '#ffa020', 0.9);
    }
  }
}

// =============================================================== ARSA
export class Arsa {
  constructor(g) {
    this.key = 'arsa';
    this.width = 2400;
    this.spawn = { x: 200, y: 620 };
    this.L = shared();
    this.puffs = [];
    this.siren = 0;
    this.pulse = 0;
    const S = this;
    this.triggers = [{ x0: 1180, x1: 1300, run: () => S.near(g) }];
    this.spots = [{ x: 1600, r: 90, label: 'Taşı al', when: () => S.seen && !S.taken, use: () => S.take(g) }];
    this.r = rng(77);
  }
  groundAt(x) {
    let y = 620 + Math.sin(x * 0.01) * 4;
    if (x > 1340 && x < 1860) y += Math.sin((Math.PI * (x - 1340)) / 520) * 80;
    return y;
  }
  clampX(nx) {
    return Math.max(120, Math.min(this.width - 120, nx));
  }
  setup(g) {
    g.player.y = this.groundAt(200);
    chain(g, 200, 620, 1);
    for (const f of FRIENDS) g.actors[f].x = 120;
    g.sfx.loop('hum', 0.05);
    g.sfx.loop('crickets', 0.02);
  }
  async start(g) {
    g.setObjective('Dumanın çıktığı yere yaklaş');
    await g.wait(1.0);
    await g.say(C1.arsaIntro);
  }
  async near(g) {
    const A = g.actors;
    await g.say(C1.crater);
    this.seen = true;
    for (const f of FRIENDS) A[f].follow = null;
    A.elif.goTo(1300);
    A.mert.goTo(1220);
    A.kaan.goTo(1920);
    A.zeynep.goTo(1990);
    g.setObjective('Taşı al');
  }
  async take(g) {
    const p = g.player,
      A = g.actors;
    await p.goTo(1560);
    p.dir = 1;
    p.crouch = true;
    await g.wait(0.6);
    g.sfx.ping();
    p.hold = 'kor';
    this.taken = true;
    p.crouch = false;
    g.sfx.loop('hum', 0.14);
    await g.say(C1.take.slice(0, 1));
    this.pulse = 1;
    await g.say(C1.take.slice(1, 3));
    this.siren = 1;
    g.sfx.loop('siren', 0.08);
    for (const f of FRIENDS) A[f].surprise = true;
    await g.say(C1.take.slice(3));
    for (const f of FRIENDS) A[f].surprise = false;
    g.setObjective('');
    g.next('gece');
  }
  update(dt, g) {
    if (Math.random() < dt * 6)
      this.puffs.push({ x: 1600 + (Math.random() - 0.5) * 80, y: 690, t: 0, s: 20 + Math.random() * 20, d: 4 + Math.random() * 3 });
    for (const p of this.puffs) {
      p.t += dt;
      p.y -= dt * 40;
      p.x += dt * 14;
    }
    this.puffs = this.puffs.filter((p) => p.t < p.d);
  }
  beat(t) {
    // kalp atışı gibi iki vuruş
    const ph = (t * 1.1) % 1;
    return Math.exp(-((ph - 0.05) ** 2) / 0.002) + 0.7 * Math.exp(-((ph - 0.25) ** 2) / 0.002);
  }
  drawBg(x, cam, g) {
    const L = this.L;
    sky(x, cam, L.sky);
    drawLayer(x, L.far, cam, 0.15, 620 - 460);
    drawLayer(x, L.near2, cam, 0.35, 590 - 420);
    if (this.pulse) {
      const b = this.beat(g.t);
      // şehir ışıkları atışla birlikte söner
      x.fillStyle = `rgba(5,8,30,${0.55 * (1 - b)})`;
      x.fillRect(0, 0, cam.w, cam.h);
    }
  }
  drawWorld(x, cam, g) {
    const t = g.t;
    // arka çit (geldiğimiz yer)
    x.strokeStyle = INK;
    x.lineWidth = 4;
    for (let k = 0; k < 10; k++) {
      x.fillStyle = k % 2 ? '#5a6a6a' : '#6a5a4a';
      rr(x, -40 + k * 52, 430, 50, 200, 2);
      x.fill();
      x.stroke();
    }
    // zemin
    x.fillStyle = '#4a3e30';
    x.beginPath();
    x.moveTo(-20, 900);
    for (let X = -20; X <= this.width + 20; X += 10) x.lineTo(X, this.groundAt(X));
    x.lineTo(this.width + 20, 900);
    x.closePath();
    x.fill();
    x.lineWidth = 5;
    x.stroke();
    // otlar
    const r = rng(5);
    x.strokeStyle = '#4a6a3a';
    x.lineWidth = 3;
    for (let i = 0; i < 160; i++) {
      const X = r() * this.width;
      if (X > 1330 && X < 1870) continue;
      const Y = this.groundAt(X);
      const h = 14 + r() * 26;
      x.beginPath();
      x.moveTo(X, Y);
      x.quadraticCurveTo(X + 6, Y - h * 0.6, X + 4 + Math.sin(t + X) * 3, Y - h);
      x.stroke();
    }
    // hurda araba, lastikler, koltuk
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.fillStyle = '#7a5040';
    x.beginPath();
    x.moveTo(520, 620);
    x.lineTo(530, 560);
    x.lineTo(600, 530);
    x.lineTo(740, 530);
    x.lineTo(800, 566);
    x.lineTo(820, 620);
    x.closePath();
    x.fill();
    x.stroke();
    x.fillStyle = '#1a2030';
    x.beginPath();
    x.moveTo(610, 544);
    x.lineTo(730, 544);
    x.lineTo(770, 570);
    x.lineTo(590, 570);
    x.closePath();
    x.fill();
    x.stroke();
    x.fillStyle = '#222';
    for (const [tx, ty] of [
      [920, 600],
      [960, 600],
      [940, 576],
    ]) {
      x.beginPath();
      x.ellipse(tx, ty, 26, 14, 0, 0, 7);
      x.fill();
      x.stroke();
    }
    x.fillStyle = '#6a3a5a';
    rr(x, 1060, 560, 140, 50, 10);
    x.fill();
    x.stroke();
    rr(x, 1060, 526, 30, 84, 8);
    x.fill();
    x.stroke();
    // krater kenarı, sıcak toprak
    const b = this.beat(t);
    glow(x, 1600, 690, 260 + b * 60, '#7affc8', 0.35 + b * 0.2);
    x.fillStyle = '#2a201a';
    x.beginPath();
    x.ellipse(1600, 700, 80, 14, 0, 0, 7);
    x.fill();
    // kor (alınmadıysa)
    if (!this.taken) {
      glow(x, 1600, 688, 90 + b * 40, '#b0ffe0', 0.8);
      x.fillStyle = '#9effd8';
      x.strokeStyle = INK;
      x.lineWidth = 4;
      x.beginPath();
      x.ellipse(1600, 690, 22, 15, 0.3, 0, 7);
      x.fill();
      x.stroke();
      x.fillStyle = '#e8fff6';
      x.beginPath();
      x.ellipse(1594, 685, 7, 4, 0.3, 0, 7);
      x.fill();
    }
    // duman
    for (const p of this.puffs) {
      const k = p.t / p.d;
      x.fillStyle = `rgba(150,160,170,${0.28 * (1 - k)})`;
      x.beginPath();
      x.arc(p.x, p.y, p.s * (1 + k * 2.5), 0, 7);
      x.fill();
    }
    // kıvılcımlar
    for (let i = 0; i < 14; i++) {
      const ph = (t * 0.6 + i * 0.13) % 1;
      x.fillStyle = `rgba(180,255,220,${1 - ph})`;
      x.beginPath();
      x.arc(1600 + Math.sin(i * 4.1) * 70 * ph, 690 - ph * 160, 2.5, 0, 7);
      x.fill();
    }
  }
  drawOverlay(x, cam, g) {
    if (!this.siren) return;
    const s = Math.sin(g.t * 6);
    const col = s > 0 ? 'rgba(255,40,40,' : 'rgba(40,90,255,';
    const gr = x.createLinearGradient(0, 0, cam.w * 0.5, 0);
    gr.addColorStop(0, col + '0.35)');
    gr.addColorStop(1, col + '0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, cam.w, cam.h);
  }
}

void canvas;
