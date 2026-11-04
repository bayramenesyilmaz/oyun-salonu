// Bölüm 1 (devamı) — Kor: taşı mahalleden kimseye görünmeden depoya götür.
import { INK, glow, rr } from './draw.js';
import { drawLayer } from './bg.js';
import { fronts, sidewalk, road, lamp, car, dumpster, crates, flashlight } from './kit.js';
import { CHAPTER2 } from '../../kusyolu/game/story.js';
import { GECE } from './story.js';
import { shared, sky } from './scenes.js';

const G = 610;

export class Gece {
  constructor(g) {
    this.key = 'gece';
    this.width = 4700;
    this.spawn = { x: 220, y: G };
    this.canCrouch = true;
    this.L = shared();
    this.covers = [
      [430, 600, 'Çöp konteyneri'],
      [1640, 1900, 'Araba'],
      [2080, 2190, 'Kapı girintisi'],
      [2330, 2480, 'Konteyner'],
      [2960, 3140, 'Kasalar'],
      [3200, 3290, 'Kasalar'],
      [3620, 3800, 'Araba'],
    ];
    this.guards = [];
    this.pulseT = 0;
    this.pulseWarned = false;
    this.checkpoint = 220;
    this.section = 0;
    this.msgs = 0;
    const S = this;
    this.triggers = [
      { x0: 1300, x1: 1400, run: () => S.enter(g, 1) },
      { x0: 2650, x1: 2750, run: () => S.enter(g, 2) },
      { x0: 4000, x1: 4100, run: () => S.enter(g, 3) },
      { x0: 4380, x1: 4480, run: () => S.arrive(g) },
    ];
    this.spots = [];
  }
  setup(g) {
    const A = g.actors;
    g.player.hold = 'kor';
    g.addActor('kaan', 330, G, { dir: -1, z: 3 });
    g.addActor('mert', 400, G, { dir: -1, z: 2 });
    g.addActor('polis', 1150, G, { dir: -1, z: 1 });
    g.addActor('bekci', 1700, G, { dir: 1, z: 1 });
    g.addActor('polis2', 3330, G, { dir: -1, z: 1, style: 'polis' });
    this.guards = [
      { a: A.polis, kind: 'polis', range: 470, sus: 0, mode: 'stand', home: 1150, homeDir: -1 },
      { a: A.bekci, kind: 'bekci', range: 400, sus: 0, mode: 'patrol', p0: 1560, p1: 2560, wait: 0, home: 1700, homeDir: 1 },
      { a: A.polis2, kind: 'polis', range: 430, sus: 0, mode: 'radio', turnT: 0, busy: false, home: 3330, homeDir: -1 },
    ];
    for (const gd of this.guards) gd.a.speed = 110;
    g.sfx.loop('city', 0.1);
    g.sfx.loop('crickets', 0.03);
    g.sfx.loop('siren', 0.03);
  }
  get covered() {
    return this.coverAt(this.g.player.x);
  }
  coverAt(px) {
    return this.covers.find(([a, b]) => px > a && px < b);
  }
  hiddenP(g) {
    const p = g.player;
    return p.crouch && !!this.coverAt(p.x);
  }
  async start(g) {
    this.g = g;
    const A = g.actors;
    g.setObjective(CHAPTER2.objectives.wait);
    await g.wait(0.6);
    await g.say(CHAPTER2.intro);
    A.mert.goTo(-200).then(() => (A.mert.hidden = true));
    await A.kaan.goTo(1040);
    A.kaan.dir = 1;
    A.polis.dir = -1;
    await g.say(CHAPTER2.distract.slice(0, 2));
    g.setObjective(GECE.hideTip(g.isTouch));
    await g.say(CHAPTER2.distract.slice(2));
    // polis Kaan'la birlikte arsaya doğru yürür; Arda saklanmalı
    this.escort = true;
    const run = (this.runId = (this.runId || 0) + 1);
    A.polis.speed = 120;
    A.kaan.speed = 120;
    A.kaan.goTo(140);
    await g.wait(0.5);
    this.guards[0].mode = 'walk';
    A.polis.goTo(230).then(() => {
      if (run !== this.runId || this.caughtNow) return;
      A.polis.dir = -1;
      this.guards[0].mode = 'stand';
      this.guards[0].range = 180;
      this.escort = false;
    });
    // bu sırada oyuncu kontrol eder
    g.cutscene = false;
    await g.until(() => !this.escort || this.caughtNow);
    if (this.caughtNow) return;
    g.setObjective(CHAPTER2.objectives.go);
    g.msg({ from: 'Kaan', t: GECE.kaanMsg });
    this.checkpoint = 700;
    this.section = 1;
  }
  async enter(g, n) {
    this.checkpoint = [700, 1350, 2700, 4050][n];
    this.section = n;
    if (n === 1) {
      g.msg(CHAPTER2.messages[0]);
      await g.say(GECE.bekciSeen);
    }
    if (n === 2) {
      g.setObjective(CHAPTER2.objectives.alley);
      g.msg(CHAPTER2.messages[1]);
      await g.say(GECE.alley);
    }
    if (n === 3) {
      g.setObjective(CHAPTER2.objectives.door);
      g.msg(CHAPTER2.messages[2]);
    }
  }
  async arrive(g) {
    const A = g.actors;
    A.mert.x = 4420;
    A.mert.dir = -1;
    A.mert.hidden = false;
    this.done = true;
    await g.say([CHAPTER2.arrive[0]]);
    await g.player.goTo(4560);
    this.shutter = 1;
    g.sfx.door();
    await g.say(CHAPTER2.arrive.slice(1));
    await g.fade(1, 1.2);
    g.sfx.stopLoops();
    g.chapterDone(1);
  }
  async caught(g, gd) {
    if (this.caughtNow) return;
    this.caughtNow = true;
    g.cutscene = true;
    const p = g.player;
    p.crouch = false;
    gd.a.dir = p.x > gd.a.x ? 1 : -1;
    gd.a.surprise = true;
    g.sfx.thud();
    await g.say([CHAPTER2.caught[gd.kind]]);
    await g.fade(1, 0.6);
    // kontrol noktasına dön
    p.x = this.checkpoint;
    p.dir = 1;
    for (const q of this.guards) {
      q.sus = 0;
      q.a.surprise = false;
      q.a.target = null;
      if (this.section > 0 || q !== this.guards[0]) {
        q.a.x = q.home;
        q.a.dir = q.homeDir;
      }
    }
    if (this.section === 0) {
      // en baştan: polis yerine
      const A = g.actors;
      this.runId++;
      this.escort = false;
      this.guards[0].mode = 'stand';
      this.guards[0].range = 470;
      A.polis.x = 1150;
      A.polis.dir = -1;
      A.kaan.x = 330;
      A.kaan.target = null;
      p.x = 220;
    }
    g.snapCamera();
    g.fade(0, 0.6);
    await g.say(CHAPTER2.retry);
    this.caughtNow = false;
    g.cutscene = false;
    if (this.section === 0) {
      g.cutscene = true;
      await this.start(g);
    }
  }
  update(dt, g) {
    this.g = g;
    const p = g.player;
    const hidden = this.hiddenP(g);
    p.ghost = hidden ? 0.55 : 0;
    // Kor atışı: her 5 sn'de bir parlar
    this.pulseT += dt;
    const per = 5.2;
    const ph = this.pulseT % per;
    this.warn = ph > per - 1.2;
    const beat = ph < 0.5;
    if (beat && !this.beatDone && !this.done) {
      this.beatDone = true;
      g.sfx.tone(70, 0.4, 0.25, 'sine', 50);
      if (!hidden && this.section > 0) {
        for (const gd of this.guards) {
          const d = Math.abs(gd.a.x - p.x);
          if (d < 650) {
            gd.sus = Math.min(1.2, gd.sus + 0.55);
            gd.a.dir = p.x > gd.a.x ? 1 : -1;
          }
        }
        if (!this.pulseWarned) {
          this.pulseWarned = true;
          g.runScript(() => g.say(CHAPTER2.pulseWarn));
        }
      }
    }
    if (!beat) this.beatDone = false;
    // bekçi devriyesi, dönen polis
    for (const gd of this.guards) {
      const a = gd.a;
      if (this.caughtNow) continue;
      if (gd.mode === 'patrol' && a.target == null) {
        gd.wait -= dt;
        if (gd.wait <= 0) {
          const to = Math.abs(a.x - gd.p0) < 20 ? gd.p1 : gd.p0;
          a.target = to;
          gd.wait = 2.2;
        }
      } else if (gd.mode === 'radio') {
        // telsizle konuşurken duvara döner, kimseyi görmez
        gd.turnT += dt;
        const cyc = gd.turnT % 8;
        const busy = cyc > 4.2;
        if (busy !== gd.busy) {
          gd.busy = busy;
          a.dir = busy ? 1 : -1;
          a.hold = busy ? 'telefon' : null;
          if (busy) g.sfx.tone(1200, 0.15, 0.06, 'square');
        }
      }
      // görüş
      let see = false;
      if (!hidden && !g.loading && !gd.busy) {
        const dx = (p.x - a.x) * a.dir;
        if (dx > -30 && dx < gd.range) see = true;
      }
      if (this.done) see = false;
      if (see) gd.sus += dt * (1.2 + (1 - Math.abs(p.x - a.x) / gd.range) * 1.4);
      else gd.sus = Math.max(0, gd.sus - dt * 0.35);
      if (gd.sus >= 1 && !this.caughtNow) this.caught(g, gd);
      gd.see = see;
    }
  }
  drawBg(x, cam, g) {
    const L = this.L;
    sky(x, cam, L.sky);
    drawLayer(x, L.far, cam, 0.15, G - 460 + 10);
    drawLayer(x, L.near2, cam, 0.4, 600 - 420);
  }
  drawWorld(x, cam, g) {
    const t = g.t;
    fronts(x, [
      [-40, 520, '#8e7a6a'],
      [480, 420, '#a88a6a'],
      [900, 460, '#9aa0a8'],
      [1360, 380, '#b08a6a'],
      [1740, 520, '#a49a86'],
      [2260, 420, '#8a8e96'],
    ]);
    // ara sokak: duvar ve teller
    x.fillStyle = '#5a5048';
    x.strokeStyle = INK;
    x.lineWidth = 5;
    rr(x, 2700, 380, 1300, 240, 2);
    x.fill();
    x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.25)';
    x.lineWidth = 2;
    for (let yy = 400; yy < 610; yy += 30)
      for (let xx = 2700 + ((yy / 30) % 2) * 30; xx < 4000; xx += 60) x.strokeRect(xx, yy, 60, 30);
    x.fillStyle = '#e0d8c0';
    x.font = '700 26px Onest, system-ui, sans-serif';
    x.fillText('ARA SOKAK', 2760, 440);
    // depo
    x.fillStyle = '#6a7078';
    x.strokeStyle = INK;
    x.lineWidth = 5;
    rr(x, 4100, 300, 640, 320, 4);
    x.fill();
    x.stroke();
    x.fillStyle = '#2a3040';
    rr(x, 4130, 260, 580, 60, 4);
    x.fill();
    x.stroke();
    x.fillStyle = '#f2c84a';
    x.font = '800 30px Onest, system-ui, sans-serif';
    x.fillText('ESKİ VİNÇ DEPOSU', 4250, 302);
    // kepenk
    const open = this.shutter ? 0.6 : 0.08;
    x.fillStyle = '#ffd890';
    rr(x, 4440, 380, 220, 230, 2);
    x.fill();
    glow(x, 4550, 560, 200, '#ffc070', 0.25 + open * 0.4);
    x.fillStyle = '#8a9098';
    rr(x, 4440, 380, 220, 230 * (1 - open), 2);
    x.fill();
    x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.35)';
    x.lineWidth = 2;
    for (let yy = 390; yy < 380 + 230 * (1 - open); yy += 14) {
      x.beginPath();
      x.moveTo(4440, yy);
      x.lineTo(4660, yy);
      x.stroke();
    }
    sidewalk(x, this.width);
    for (const lx of [800, 1500, 2200, 3400]) lamp(x, lx, Math.sin(t * 7 + lx) > -0.9 ? 1 : 0);
    // siperler
    dumpster(x, 440);
    dumpster(x, 2335, 612, '#5a4a7a');
    crates(x, 2970);
    crates(x, 3195);
    x.fillStyle = '#4a3a2c';
    x.strokeStyle = INK;
    x.lineWidth = 5;
    rr(x, 2085, 420, 100, 190, 4);
    x.fill();
    x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.4)';
    x.fillRect(2090, 425, 90, 182);
    // siper ipucu: eğilince saklanabileceğin yerler hafifçe belli olsun
    const p = g.player;
    const cv = this.coverAt(p.x);
    if (cv && !p.crouch && !g.cutscene) {
      x.fillStyle = 'rgba(255,240,180,0.85)';
      x.font = '600 20px Onest, system-ui, sans-serif';
      x.textAlign = 'center';
      x.fillText(g.isTouch ? '⬇ basılı tut: saklan' : 'S basılı tut: saklan', (cv[0] + cv[1]) / 2, 520);
      x.textAlign = 'left';
    }
    // muhafızların ışığı
    for (const gd of this.guards) {
      const a = gd.a;
      if (a.hidden) continue;
      if (gd.busy) {
        x.fillStyle = 'rgba(10,12,30,0.8)';
        rr(x, a.x - 60, a.y - 300, 120, 34, 17);
        x.fill();
        x.fillStyle = '#9fd0ff';
        x.font = '700 18px Onest, system-ui, sans-serif';
        x.textAlign = 'center';
        x.fillText('telsizde…', a.x, a.y - 277);
        x.textAlign = 'left';
        continue;
      }
      const col = gd.sus > 0.5 ? '#ff9a7a' : '#fff4c0';
      flashlight(x, a.x + a.dir * 30, a.y - 120, a.dir, gd.range, gd.see ? 0.32 : 0.18, col);
    }
  }
  drawFront(x, cam, g) {
    road(x, this.width);
    car(x, 860, '#e0e4ea', 700, true, g.t);
    car(x, 1630, '#3a6ab0', 700);
    car(x, 3560, '#a03a30', 700);
    // şüphe göstergesi
    for (const gd of this.guards) {
      if (gd.sus <= 0.02 || gd.a.hidden) continue;
      const a = gd.a;
      const X = a.x,
        Y = a.y - 270;
      x.fillStyle = 'rgba(10,12,30,0.8)';
      x.beginPath();
      x.arc(X, Y, 26, 0, 7);
      x.fill();
      x.strokeStyle = gd.sus > 0.7 ? '#ff5a4a' : '#ffd27a';
      x.lineWidth = 6;
      x.beginPath();
      x.arc(X, Y, 26, -Math.PI / 2, -Math.PI / 2 + Math.min(1, gd.sus) * Math.PI * 2);
      x.stroke();
      x.fillStyle = '#fff';
      x.font = '800 28px Onest, system-ui, sans-serif';
      x.textAlign = 'center';
      x.fillText(gd.sus > 0.7 ? '!' : '?', X, Y + 10);
      x.textAlign = 'left';
    }
  }
  drawOverlay(x, cam, g) {
    // Kor atış uyarısı: ekran kenarında yeşil nabız
    const p = g.player;
    if (!p) return;
    const per = 5.2,
      ph = this.pulseT % per;
    const k = ph < 0.5 ? 1 - ph / 0.5 : this.warn ? (ph - (per - 1.2)) / 1.2 : 0;
    if (k > 0) {
      const sx = p.x - cam.x,
        sy = p.y - cam.y - 120;
      glow(x, sx, sy, 140 + k * 260, '#7affc8', (this.hiddenP(g) ? 0.15 : 0.45) * k);
    }
    if (this.warn && !this.done) {
      x.fillStyle = 'rgba(122,255,200,0.9)';
      x.font = '700 22px Onest, system-ui, sans-serif';
      x.textAlign = 'center';
      x.fillText('Kor atmak üzere!', cam.w / 2, 110);
      x.textAlign = 'left';
    }
  }
}
