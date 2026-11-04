// Bölüm 3 — Gökyüzü: kokpit, kalkış, boşluk, Ay'a iniş ve Ay yürüyüşü
import { INK, glow, rr, rng } from './draw.js';
import { makeSky, drawLayer, canvas } from './bg.js';
import { drawLeylek } from './ship.js';
import { CHAPTER5, CHAPTER6, CHAPTER7 } from '../../kusyolu/game/story.js';
import { GOK } from './story.js';
import { shared, sky } from './scenes.js';

const CREW = ['elif', 'kaan', 'mert', 'zeynep'];

function hullBar(x, X, Y, label, v, col) {
  x.fillStyle = 'rgba(10,12,30,0.75)';
  rr(x, X, Y, 230, 30, 15);
  x.fill();
  x.fillStyle = '#cfd6e8';
  x.font = '700 14px Onest, system-ui, sans-serif';
  x.fillText(label, X + 14, Y + 20);
  x.fillStyle = '#2a2e44';
  rr(x, X + 84, Y + 10, 132, 10, 5);
  x.fill();
  x.fillStyle = col;
  rr(x, X + 84, Y + 10, 132 * Math.max(0, Math.min(1, v)), 10, 5);
  x.fill();
}

function stars(w, h, seed, n = 400) {
  const c = canvas(w, h),
    x = c.getContext('2d'),
    r = rng(seed);
  for (let i = 0; i < n; i++) {
    x.globalAlpha = 0.3 + r() * 0.7;
    x.fillStyle = r() < 0.2 ? '#ffe3b8' : '#fff';
    x.beginPath();
    x.arc(r() * w, r() * h, r() * 1.6 + 0.3, 0, 7);
    x.fill();
  }
  return c;
}

// =============================================================== KOKPİT
export class Kokpit {
  constructor(g) {
    this.key = 'kokpit';
    this.width = 1500;
    this.spawn = { x: 520, y: 620 };
    this.seq = ['guc', 'cati', 'kor', 'atesle'];
    this.idx = 0;
    this.roof = 0;
    this.rumble = 0;
    const S = this;
    const pos = { guc: 760, cati: 920, kor: 1080, atesle: 1240 };
    this.pos = pos;
    this.spots = this.seq.map((k) => ({
      x: pos[k],
      r: 70,
      label: CHAPTER5.switches[k].label,
      hy: 330,
      when: () => S.ready && S.idx < 4,
      use: () => S.press(g, k),
    }));
  }
  clampX(nx) {
    return Math.max(420, Math.min(1320, nx));
  }
  setup(g) {
    const seats = [180, 300, 420, 560];
    CREW.forEach((id, i) => g.addActor(id, seats[i] - 40, 620, { dir: 1, sit: true, z: 1 }));
    g.actors.mert.x = 200;
    g.sfx.loop('hum', 0.06);
  }
  async start(g) {
    await g.card('Kalkış', CHAPTER5.place, 2.4);
    await g.say(CHAPTER5.intro);
    this.ready = true;
    g.setObjective(CHAPTER5.objectives.seq(CHAPTER5.switches[this.seq[0]].label));
  }
  async press(g, k) {
    g.sfx.tone(520, 0.12, 0.15, 'square');
    if (k !== this.seq[this.idx]) {
      await g.say(CHAPTER5.wrong);
      return;
    }
    this.lit = { ...(this.lit || {}), [k]: true };
    this.idx++;
    if (k === 'cati') this.opening = true;
    if (k === 'atesle') {
      this.rumble = 1;
      g.sfx.loop('wind', 0.2);
      g.shake(0.8);
    }
    await g.say([CHAPTER5.switches[k].line]);
    if (this.idx < 4) g.setObjective(CHAPTER5.objectives.seq(CHAPTER5.switches[this.seq[this.idx]].label));
    else {
      g.setObjective('');
      g.shake(1.6);
      g.sfx.boom();
      await g.wait(1.2);
      g.next('kalkis');
    }
  }
  update(dt, g) {
    if (this.opening) this.roof = Math.min(1, this.roof + dt * 0.25);
    if (this.rumble) g.shake(0.25);
  }
  drawBg(x, cam) {
    x.fillStyle = '#0c0f1c';
    x.fillRect(0, 0, cam.w, cam.h);
  }
  drawWorld(x, cam, g) {
    const t = g.t;
    // gövde iç duvarı
    x.fillStyle = '#5a5856';
    x.fillRect(0, 140, this.width, 480);
    x.strokeStyle = 'rgba(0,0,0,0.28)';
    x.lineWidth = 3;
    for (let i = 0; i < this.width; i += 120) {
      x.beginPath();
      x.moveTo(i, 140);
      x.lineTo(i, 620);
      x.stroke();
    }
    x.fillStyle = '#3a3836';
    for (let i = 20; i < this.width; i += 40) {
      x.beginPath();
      x.arc(i, 156, 3, 0, 7);
      x.fill();
    }
    // tavan camı: önce depo çatısı, sonra gökyüzü
    x.fillStyle = '#0a1030';
    rr(x, 640, 160, 700, 150, 30);
    x.fill();
    x.save();
    x.beginPath();
    x.roundRect(640, 160, 700, 150, 30);
    x.clip();
    const o = this.roof;
    for (let i = 0; i < 40; i++) {
      x.fillStyle = '#fff';
      x.fillRect(650 + ((i * 97) % 680), 170 + ((i * 53) % 130), 2, 2);
    }
    x.fillStyle = '#6a7078';
    x.fillRect(640 - o * 360, 160, 350, 150);
    x.fillRect(990 + o * 360, 160, 350, 150);
    x.restore();
    x.strokeStyle = INK;
    x.lineWidth = 6;
    rr(x, 640, 160, 700, 150, 30);
    x.stroke();
    // koltuklar
    for (const sx of [140, 260, 380, 520]) {
      x.fillStyle = '#8a3a2a';
      x.strokeStyle = INK;
      x.lineWidth = 5;
      rr(x, sx - 70, 470, 22, 150, 8);
      x.fill();
      x.stroke();
      rr(x, sx - 70, 548, 100, 22, 8);
      x.fill();
      x.stroke();
    }
    // konsol
    x.fillStyle = '#2a2e3a';
    rr(x, 660, 420, 680, 200, 12);
    x.fill();
    x.stroke();
    for (let i = 0; i < 12; i++) {
      x.fillStyle = ['#7affc8', '#ffd27a', '#ff6a5a', '#6ab0ff'][i % 4];
      x.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + i * 0.3)));
      x.fillRect(690 + i * 52, 440, 20, 8);
    }
    x.globalAlpha = 1;
    for (const k of this.seq) {
      const X = this.pos[k];
      const on = this.lit && this.lit[k];
      const nextOne = this.seq[this.idx] === k;
      x.fillStyle = on ? '#7affc8' : k === 'atesle' ? '#c63a34' : '#d8a030';
      rr(x, X - 40, 480, 80, 60, 10);
      x.fill();
      x.strokeStyle = INK;
      x.lineWidth = 5;
      x.stroke();
      if (on) glow(x, X, 510, 70, '#7affc8', 0.5);
      if (nextOne && this.ready) glow(x, X, 510, 60, '#ffd27a', 0.25 + 0.2 * Math.sin(t * 5));
      x.fillStyle = '#e8ecf4';
      x.font = '800 13px Onest, system-ui, sans-serif';
      x.textAlign = 'center';
      x.fillText(CHAPTER5.switches[k].label, X, 572);
      x.textAlign = 'left';
    }
    x.fillStyle = '#3a3836';
    x.fillRect(-20, 620, this.width + 40, 200);
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(-20, 620);
    x.lineTo(this.width + 20, 620);
    x.stroke();
  }
}

// =============================================================== KALKIŞ
export class Kalkis {
  constructor(g) {
    this.key = 'kalkis';
    this.width = 2000;
    this.vehicle = true;
    this.spawn = { x: -500, y: 0 };
    this.alt = 0;
    this.sx = 0;
    this.hull = 1;
    this.obs = [];
    this.said = {};
    this.L = shared();
    this.st = stars(2000, 1400, 4);
    this.spawnT = 0;
    this.cool = 0;
  }
  setup(g) {
    g.player.hidden = true;
    g.sfx.loop('wind', 0.25);
  }
  async start(g) {
    g.setObjective(g.isTouch ? '◀ ▶ ile engellerden kaç' : 'A / D ile engellerden kaç');
    this.go = true;
  }
  say(g, k, lines) {
    if (this.said[k]) return;
    this.said[k] = true;
    g.runScript(() => g.say(lines));
  }
  update(dt, g) {
    if (!this.go) return;
    const I = g.input;
    const v = this.alt < 60 ? 2.6 : 3.4;
    if (!this.done) this.alt += dt * v;
    const ax = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    this.sx = Math.max(-1, Math.min(1, this.sx + ax * dt * 1.6));
    this.flame = 0.8 + Math.random() * 0.3;
    const A = this.alt;
    if (A > 2) this.say(g, 'ascent', CHAPTER5.ascent);
    if (A > 6) this.say(g, 'birds', GOK.birds);
    if (A > 14) this.say(g, 'plane', GOK.plane);
    if (A > 24) this.say(g, 'clouds', CHAPTER5.clouds);
    if (A > 62) this.say(g, 'high', CHAPTER5.high);
    g.sfx.loop('wind', 0.25 * Math.max(0, 1 - A / 80));
    // engeller
    this.spawnT -= dt;
    if (this.spawnT <= 0 && A < 92) {
      const kind = A < 14 ? 'bird' : A < 24 ? 'plane' : A < 40 ? 'balon' : A < 62 ? 'cloud' : 'junk';
      this.spawnT = kind === 'plane' ? 2.4 : kind === 'cloud' ? 0.8 : 1.1;
      this.obs.push({ kind, x: (Math.random() * 2 - 1) * 0.95, y: -0.15, vx: kind === 'plane' ? (Math.random() < 0.5 ? 0.25 : -0.25) : (Math.random() - 0.5) * 0.08, hit: false });
    }
    for (const o of this.obs) {
      o.y += dt * (o.kind === 'cloud' ? 0.7 : 0.42);
      o.x += o.vx * dt;
      const r = o.kind === 'plane' ? 0.16 : o.kind === 'cloud' ? 0 : 0.09;
      if (!o.hit && r && Math.abs(o.y - 0.62) < 0.08 && Math.abs(o.x - this.sx) < r + 0.07 && this.cool <= 0) {
        o.hit = true;
        this.hull -= o.kind === 'plane' ? 0.45 : 0.22;
        this.cool = 1;
        g.shake(1);
        g.sfx.thud();
        if (this.hull > 0) this.say(g, 'hit' + Math.floor(A / 10), GOK.hit);
      }
    }
    this.cool -= dt;
    this.obs = this.obs.filter((o) => o.y < 1.2);
    if (this.hull <= 0 && !this.failing) {
      this.failing = true;
      g.runScript(async () => {
        await g.say(GOK.hullFail);
        this.alt = Math.max(0, this.alt - 12);
        this.hull = 1;
        this.obs = [];
        this.failing = false;
      });
    }
    if (A >= 100 && !this.done) {
      this.done = true;
      g.runScript(async () => {
        g.setObjective('');
        g.sfx.stop('wind');
        await g.say(CHAPTER5.orbit);
        g.next('bosluk');
      });
    }
  }
  drawBg(x, cam, g) {
    const A = this.alt;
    const k = Math.min(1, A / 70);
    const top = lerpCol([60, 120, 200], [4, 6, 16], k),
      bot = lerpCol([240, 160, 120], [10, 14, 40], k);
    const gr = x.createLinearGradient(0, 0, 0, cam.h);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bot);
    x.fillStyle = gr;
    x.fillRect(0, 0, cam.w, cam.h);
    if (A > 30) {
      x.globalAlpha = Math.min(1, (A - 30) / 30);
      x.drawImage(this.st, 0, -((A * 6) % 400));
      x.globalAlpha = 1;
    }
    // şehir ve mahalle aşağıda kalır
    const yOff = A * 90;
    if (yOff < 900) {
      x.save();
      x.translate(0, yOff);
      drawLayer(x, this.L.far, { x: 300, y: 0, w: cam.w }, 0.2, cam.h - 460);
      drawLayer(x, this.L.near, { x: 300, y: 0, w: cam.w }, 0.4, cam.h - 520);
      x.fillStyle = '#6a7078';
      x.fillRect(cam.w / 2 - 340, cam.h - 120, 680, 140);
      x.restore();
    }
    // Dünya'nın eğriliği
    if (A > 75) {
      const e = (A - 75) / 25;
      x.fillStyle = '#2a6ab0';
      x.beginPath();
      x.ellipse(cam.w / 2, cam.h + 2200 - e * 300, 2600, 2400, 0, 0, 7);
      x.fill();
      x.strokeStyle = 'rgba(140,200,255,0.6)';
      x.lineWidth = 16;
      x.stroke();
    }
  }
  drawWorld() {}
  drawOverlay(x, cam, g) {
    const W = cam.w,
      H = cam.h;
    // bulutlar ve engeller
    for (const o of this.obs) {
      const X = W / 2 + o.x * W * 0.42,
        Y = o.y * H;
      x.strokeStyle = INK;
      x.lineWidth = 4;
      if (o.kind === 'bird') {
        for (let i = 0; i < 3; i++) {
          const bx = X + i * 34 - 34,
            by = Y + (i % 2) * 14,
            f = Math.sin(g.t * 12 + i) * 8;
          x.beginPath();
          x.moveTo(bx - 16, by - f);
          x.quadraticCurveTo(bx - 6, by - 10, bx, by);
          x.quadraticCurveTo(bx + 6, by - 10, bx + 16, by - f);
          x.stroke();
        }
      } else if (o.kind === 'plane') {
        x.fillStyle = '#e8ecf0';
        rr(x, X - 90, Y - 14, 180, 28, 14);
        x.fill();
        x.stroke();
        x.beginPath();
        x.moveTo(X - 10, Y);
        x.lineTo(X - 50, Y + 50);
        x.lineTo(X - 20, Y + 50);
        x.lineTo(X + 20, Y);
        x.closePath();
        x.fill();
        x.stroke();
        glow(x, X + (o.vx > 0 ? 90 : -90), Y, 20, '#ff4040', Math.sin(g.t * 8) > 0 ? 0.9 : 0.2);
      } else if (o.kind === 'balon') {
        x.fillStyle = '#f2f0ea';
        x.beginPath();
        x.arc(X, Y, 34, 0, 7);
        x.fill();
        x.stroke();
        x.beginPath();
        x.moveTo(X, Y + 34);
        x.lineTo(X, Y + 90);
        x.stroke();
        x.fillStyle = '#d8a030';
        rr(x, X - 10, Y + 90, 20, 16, 3);
        x.fill();
        x.stroke();
      } else if (o.kind === 'cloud') {
        x.fillStyle = 'rgba(240,244,255,0.75)';
        for (let i = 0; i < 4; i++) {
          x.beginPath();
          x.arc(X + i * 70 - 100, Y + (i % 2) * 20, 70, 0, 7);
          x.fill();
        }
      } else {
        x.fillStyle = '#8a8a90';
        x.save();
        x.translate(X, Y);
        x.rotate(g.t * 2);
        rr(x, -24, -18, 48, 36, 4);
        x.fill();
        x.stroke();
        x.restore();
      }
    }
    // Leylek (burnu yukarı)
    const sxp = W / 2 + this.sx * W * 0.42,
      syp = H * 0.62;
    x.save();
    x.translate(sxp + 41, syp);
    if (this.cool > 0 && Math.sin(g.t * 40) > 0) x.globalAlpha = 0.5;
    drawLeylek(x, 0, 0, 4, g.t, { scale: 0.36, rot: -Math.PI / 2, noLegs: true, lit: true, flame: this.flame || 1 });
    x.restore();
    x.globalAlpha = 1;
    hullBar(x, 16, H - 50, 'GÖVDE', this.hull, this.hull > 0.4 ? '#7affc8' : '#ff6a5a');
    x.fillStyle = 'rgba(10,12,30,0.75)';
    rr(x, W - 200, H - 50, 184, 30, 15);
    x.fill();
    x.fillStyle = '#cfd6e8';
    x.font = '700 15px Onest, system-ui, sans-serif';
    x.fillText(`İRTİFA  ${Math.round(this.alt * 4.2)} km`, W - 184, H - 30);
  }
}

function lerpCol(a, b, k) {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
}

// =============================================================== BOŞLUK
export class Bosluk {
  constructor(g) {
    this.key = 'bosluk';
    this.width = 2000;
    this.vehicle = true;
    this.spawn = { x: -500, y: 0 };
    this.phase = 'intro';
    this.burn = 0;
    this.sy = 0.5;
    this.hull = 1;
    this.rocks = [];
    this.st1 = stars(1600, 900, 11, 300);
    this.st2 = stars(1600, 900, 12, 160);
    this.scroll = 0;
    this.earth = 1;
    this.moon = 0;
    this.warp = 0;
  }
  setup(g) {
    g.player.hidden = true;
    g.sfx.loop('hum', 0.05);
  }
  async start(g) {
    await g.say(CHAPTER6.intro.slice(0, 2));
    await this.burnPhase(g, 'burn');
    await g.say(CHAPTER6.burnDone);
    this.warp = 1;
    g.sfx.whoosh();
    await g.say(CHAPTER6.jump);
    this.warp = 0;
    await this.rockPhase(g);
    await g.say(CHAPTER6.rocksDone);
    await g.say(CHAPTER6.retro);
    this.retro = true;
    await this.burnPhase(g, 'brake');
    await g.say(CHAPTER6.orbit);
    g.next('inis');
  }
  async burnPhase(g, kind) {
    this.phase = kind;
    this.burn = 0;
    g.cutscene = false;
    g.setObjective(GOK.burnTip(g.isTouch) + ' · %0');
    await g.until(() => this.burn >= 1);
    g.cutscene = true;
    g.setObjective('');
    this.phase = 'cruise';
  }
  async rockPhase(g) {
    await g.say(CHAPTER6.rocksWarn);
    for (;;) {
      this.phase = 'rocks';
      this.hull = 1;
      this.rocks = [];
      this.rockT = 0;
      this.hits = 0;
      g.cutscene = false;
      await g.until(() => this.rockT > 32 || this.hull <= 0.01);
      g.cutscene = true;
      this.phase = 'cruise';
      if (this.hull > 0.01) break;
      await g.say(CHAPTER6.rocksFail);
    }
    g.setObjective('');
  }
  update(dt, g) {
    const I = g.input;
    this.scroll += dt * (this.warp ? 2400 : this.phase === 'rocks' ? 420 : 160);
    if (this.phase === 'burn' || this.phase === 'brake') {
      if (I.act || I.up) {
        this.burn = Math.min(1, this.burn + dt / 3.2);
        this.flame = 1;
        if (!this.burnSnd) {
          this.burnSnd = true;
          g.sfx.loop('wind', 0.18);
        }
      } else {
        this.flame = 0;
        if (this.burnSnd) {
          this.burnSnd = false;
          g.sfx.stop('wind');
        }
      }
      if (g.test) this.burn = Math.min(1, this.burn + dt);
      g.setObjective(GOK.burnTip(g.isTouch) + ` · %${Math.round(this.burn * 100)}`);
      if (this.burn >= 1 && this.burnSnd) {
        this.burnSnd = false;
        g.sfx.stop('wind');
        this.flame = 0;
      }
    }
    if (this.phase === 'burn') this.earth = Math.max(0.4, 1 - this.burn * 0.3);
    if (this.warp) this.earth = Math.max(0.05, this.earth - dt * 0.25);
    if (this.phase === 'rocks' || this.retro) this.moon = Math.min(1, this.moon + dt * (this.retro ? 0.2 : 0.02));
    if (this.phase === 'rocks') {
      const dy = (I.down ? 1 : 0) - (I.up ? 1 : 0);
      this.sy = Math.max(0.12, Math.min(0.88, this.sy + dy * dt * 0.9));
      this.rockT += dt;
      g.setObjective(GOK.dodgeTip(g.isTouch) + ` · Gövde %${Math.max(0, Math.round(this.hull * 100))} · ${Math.max(0, Math.ceil(32 - this.rockT))} sn`);
      if (Math.random() < dt * (0.9 + this.rockT * 0.03))
        this.rocks.push({ x: 1.1, y: 0.1 + Math.random() * 0.8, r: 0.035 + Math.random() * 0.04, v: 0.35 + Math.random() * 0.25, rot: Math.random() * 6, glow: Math.random() < 0.15 });
      if (g.test && this.rocks.length) {
        // test: en yakın taştan kaç
        let best = this.sy,
          bs = -1;
        for (let c = 0.12; c <= 0.88; c += 0.04) {
          let d = 9;
          for (const r of this.rocks) if (r.x > 0.1 && r.x < 0.7) d = Math.min(d, Math.abs(r.y - c) - Math.abs(c - this.sy) * 0.3);
          if (d > bs) {
            bs = d;
            best = c;
          }
        }
        this.sy += Math.sign(best - this.sy) * Math.min(Math.abs(best - this.sy), dt * 0.9);
        this.sy = Math.max(0.12, Math.min(0.88, this.sy));
      }
      for (const r of this.rocks) {
        r.x -= r.v * dt;
        r.rot += dt;
        if (!r.hit && Math.abs(r.x - 0.22) < r.r + 0.06 && Math.abs(r.y - this.sy) < r.r * 1.7 + 0.04) {
          r.hit = true;
          this.hull -= 0.25;
          this.hits++;
          g.shake(1.1);
          g.sfx.thud();
          if (this.hits === 1) g.runScript(() => g.say(CHAPTER6.rockHit));
        }
      }
      this.rocks = this.rocks.filter((r) => r.x > -0.2);
    }
  }
  drawBg(x, cam, g) {
    x.fillStyle = '#03040c';
    x.fillRect(0, 0, cam.w, cam.h);
    const w = this.st1.width;
    const o1 = -((this.scroll * 0.2) % w),
      o2 = -((this.scroll * 0.5) % w);
    for (const [img, o] of [
      [this.st1, o1],
      [this.st2, o2],
    ])
      for (let px = o; px < cam.w; px += w) x.drawImage(img, px, 0, w, cam.h);
    if (this.warp) {
      x.strokeStyle = 'rgba(200,230,255,0.5)';
      x.lineWidth = 2;
      for (let i = 0; i < 80; i++) {
        const y = (i * 97) % cam.h,
          l = 100 + ((i * 53) % 300);
        const X = cam.w - ((this.scroll * (1 + (i % 3)) + i * 200) % (cam.w + 400));
        x.beginPath();
        x.moveTo(X, y);
        x.lineTo(X + l, y);
        x.stroke();
      }
    }
    // Dünya solda, Ay sağda
    const e = this.earth;
    if (e > 0.05) {
      const R = 420 * e;
      x.fillStyle = '#2a6ab0';
      x.beginPath();
      x.arc(cam.w * 0.12, cam.h * 0.6, R, 0, 7);
      x.fill();
      x.fillStyle = '#3a8a4a';
      for (let i = 0; i < 6; i++) {
        x.beginPath();
        x.ellipse(cam.w * 0.12 + Math.cos(i * 2.1) * R * 0.5, cam.h * 0.6 + Math.sin(i * 1.3) * R * 0.5, R * 0.22, R * 0.12, i, 0, 7);
        x.fill();
      }
      x.strokeStyle = 'rgba(140,200,255,0.5)';
      x.lineWidth = 10 * e;
      x.beginPath();
      x.arc(cam.w * 0.12, cam.h * 0.6, R + 4, 0, 7);
      x.stroke();
    }
    if (this.moon > 0) {
      const R = 40 + this.moon * 380;
      x.fillStyle = '#b8b8c0';
      x.beginPath();
      x.arc(cam.w * 0.9, cam.h * 0.4, R, 0, 7);
      x.fill();
      x.fillStyle = 'rgba(0,0,0,0.15)';
      for (let i = 0; i < 9; i++) {
        x.beginPath();
        x.arc(cam.w * 0.9 + Math.cos(i * 2.3) * R * 0.6, cam.h * 0.4 + Math.sin(i * 1.7) * R * 0.6, R * 0.1, 0, 7);
        x.fill();
      }
    }
  }
  drawWorld() {}
  drawOverlay(x, cam, g) {
    const W = cam.w,
      H = cam.h;
    for (const r of this.rocks) {
      const X = r.x * W,
        Y = r.y * H,
        R = r.r * H;
      if (r.glow) glow(x, X, Y, R * 2.5, '#6ab0ff', 0.5);
      x.fillStyle = r.glow ? '#6a80b0' : '#6a5a50';
      x.strokeStyle = INK;
      x.lineWidth = 4;
      x.save();
      x.translate(X, Y);
      x.rotate(r.rot);
      x.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2,
          rr2 = R * (0.8 + ((i * 37) % 10) / 30);
        i ? x.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : x.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
      }
      x.closePath();
      x.fill();
      x.stroke();
      x.restore();
    }
    const flame = this.warp ? 1.4 : this.flame || 0;
    x.save();
    x.translate(W * 0.22, this.sy * H + 40);
    if (this.retro) x.scale(-1, 1);
    drawLeylek(x, 0, 0, 4, g.t, { scale: 0.3, noLegs: true, lit: true, flame });
    x.restore();
    if (this.phase === 'rocks') hullBar(x, 16, H - 50, 'GÖVDE', this.hull, this.hull > 0.4 ? '#7affc8' : '#ff6a5a');
    if (this.phase === 'burn' || this.phase === 'brake') hullBar(x, 16, H - 50, this.phase === 'burn' ? 'ATEŞLEME' : 'FREN', this.burn, '#ffd27a');
  }
}

// =============================================================== İNİŞ
export class Inis {
  constructor(g) {
    this.key = 'inis';
    this.width = 2000;
    this.vehicle = true;
    this.spawn = { x: -500, y: 0 };
    this.st = stars(1600, 900, 21, 260);
    this.reset();
  }
  reset() {
    this.alt = 320;
    this.vy = -8;
    this.vx = 2.4;
    this.px = -90;
    this.fuel = 1;
    this.state = 'fly';
  }
  setup(g) {
    g.player.hidden = true;
    g.sfx.loop('hum', 0.05);
  }
  async start(g) {
    await g.say(CHAPTER7.intro);
    await g.say(CHAPTER7.hint);
    for (;;) {
      this.reset();
      this.go = true;
      g.cutscene = false;
      g.setObjective(GOK.landTip(g.isTouch));
      await g.until(() => this.state !== 'fly');
      g.cutscene = true;
      this.go = false;
      if (this.state === 'landed') break;
      g.shake(1.4);
      g.sfx.boom();
      await g.say(CHAPTER7.crash);
    }
    g.setObjective('');
    g.sfx.stop('wind');
    await g.say(CHAPTER7.landed);
    g.next('ay');
  }
  update(dt, g) {
    if (!this.go || this.state !== 'fly') return;
    const I = g.input;
    let thrust = (I.up || I.act) && this.fuel > 0;
    let side = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    if (g.test) {
      // test pilotu: hedef hızı tut
      const want = this.alt > 70 ? -10 : this.alt > 25 ? -4.5 : -2.2;
      thrust = this.vy < want && this.fuel > 0;
      const e = this.px * 0.12 + this.vx;
      side = Math.abs(e) > 0.25 ? -Math.sign(e) : 0;
    }
    this.vy += (-3.2 + (thrust ? 6.6 : 0)) * dt;
    this.vx += side * 2.0 * dt;
    if (thrust || side) this.fuel = Math.max(0, this.fuel - dt * (thrust ? 0.032 : 0.01));
    this.alt += this.vy * dt;
    this.px += this.vx * dt;
    this.flame = thrust ? 0.9 + Math.random() * 0.2 : 0;
    this.side = side;
    g.sfx.loop('wind', thrust ? 0.16 : 0.001);
    if (this.alt < 120 && this.vy < -6 && !this.warned) {
      this.warned = true;
      g.runScript(() => g.say(CHAPTER7.fast));
    }
    if (this.alt <= 0) {
      this.alt = 0;
      const ok = Math.abs(this.vy) < 3 && Math.abs(this.vx) < 1.6 && Math.abs(this.px) < 60;
      this.state = ok ? 'landed' : 'crash';
      if (ok) g.sfx.thud();
    }
  }
  drawBg(x, cam, g) {
    x.fillStyle = '#020208';
    x.fillRect(0, 0, cam.w, cam.h);
    x.drawImage(this.st, 0, 0, cam.w, cam.h);
    // Dünya gökyüzünde
    x.fillStyle = '#2a6ab0';
    x.beginPath();
    x.arc(cam.w * 0.82, 120, 46, 0, 7);
    x.fill();
    x.fillStyle = 'rgba(0,0,0,0.55)';
    x.beginPath();
    x.arc(cam.w * 0.82 + 18, 120, 46, -Math.PI / 2, Math.PI / 2);
    x.fill();
  }
  drawWorld() {}
  drawOverlay(x, cam, g) {
    const W = cam.w,
      H = cam.h;
    const ground = H - 120;
    const k = (ground - 80) / 340; // piksel / metre
    // yüzey
    x.fillStyle = '#8a8a92';
    x.beginPath();
    x.moveTo(0, H);
    for (let X = 0; X <= W; X += 8) x.lineTo(X, ground + Math.sin(X * 0.02) * 6 + Math.sin(X * 0.07) * 3 + (Math.abs(X - W / 2) < 90 ? -Math.sin(X * 0.02) * 6 : 0));
    x.lineTo(W, H);
    x.fill();
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 10; i++) {
      x.beginPath();
      x.ellipse(((i * 211) % W) + 40, ground + 30 + ((i * 37) % 60), 50, 10, 0, 0, 7);
      x.fill();
    }
    // iniş bölgesi
    const padW = 120 * k * 1.6;
    x.fillStyle = '#7affc8';
    x.fillRect(W / 2 - padW / 2, ground - 2, padW, 6);
    glow(x, W / 2, ground, 90, '#7affc8', 0.3);
    // Leylek
    const sx = W / 2 + this.px * k * 1.6,
      sy = ground - this.alt * k;
    x.save();
    x.translate(sx + 30, sy - 101);
    drawLeylek(x, 0, 0, 4, g.t, { scale: 0.26, rot: -Math.PI / 2, lit: true, flame: this.flame || 0, noLegs: true });
    x.restore();
    // iniş ayakları
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(sx - 4, sy - 40);
    x.lineTo(sx - 34, sy);
    x.moveTo(sx + 26, sy - 40);
    x.lineTo(sx + 56, sy);
    x.stroke();
    if (this.state === 'crash') glow(x, sx, sy, 160, '#ffb050', 0.8);
    // gösterge
    x.fillStyle = 'rgba(10,12,30,0.8)';
    rr(x, 16, H - 150, 250, 134, 16);
    x.fill();
    x.font = '700 15px Onest, system-ui, sans-serif';
    const row = (i, lab, val, bad) => {
      x.fillStyle = '#aab0c8';
      x.fillText(lab, 32, H - 122 + i * 28);
      x.fillStyle = bad ? '#ff6a5a' : '#e8ecf4';
      x.fillText(val, 150, H - 122 + i * 28);
    };
    row(0, 'İRTİFA', `${Math.round(this.alt * 1.875)} m`);
    row(1, 'DİKEY HIZ', `${(this.vy * 0.66).toFixed(1)} m/s`, this.vy < -3);
    row(2, 'YATAY', `${(this.vx * 0.66).toFixed(1)} m/s`, Math.abs(this.vx) > 1.6);
    row(3, 'YAKIT', `%${Math.round(this.fuel * 100)}`, this.fuel < 0.2);
  }
}

// =============================================================== AY
export class Ay {
  constructor(g) {
    this.key = 'ay';
    this.width = 3800;
    this.spawn = { x: 520, y: 620 };
    this.jumpable = true;
    this.gravity = 700;
    this.jumpV = 560;
    this.st = makeSky(2400, 900, 31, [
      [0, '#000004'],
      [1, '#05050e'],
    ]);
    this.rocks = [
      [1200, 1320, 560],
      [1900, 2060, 540],
      [2500, 2600, 520],
    ];
    const S = this;
    this.triggers = [
      { x0: 1500, x1: 1600, run: () => g.say(GOK.monolith) },
      { x0: 3200, x1: 3300, run: () => S.found(g) },
    ];
  }
  terrain(x) {
    let y = 620 + Math.sin(x * 0.004) * 18 + Math.sin(x * 0.013) * 6;
    // kraterler
    for (const [c, w, d] of [
      [1650, 160, 60],
      [2300, 120, 50],
      [2900, 180, 70],
    ])
      if (Math.abs(x - c) < w) y += Math.cos(((x - c) / w) * (Math.PI / 2)) * d;
    return y;
  }
  groundAt(x, y) {
    let best = this.terrain(x);
    for (const [a, b, top] of this.rocks) if (x > a && x < b && top >= y - 6 && top < best) best = top;
    return best;
  }
  clampX(nx) {
    return Math.max(380, Math.min(this.width - 200, nx));
  }
  setup(g) {
    g.player.helmet = true;
    let lead = g.player;
    CREW.forEach((id, i) => {
      const a = g.addActor(id, 430 - i * 60, 620, { dir: 1, z: 4 - i });
      a.helmet = true;
      a.follow = lead;
      a.gap = 100;
      lead = a;
    });
    g.sfx.loop('hum', 0.03);
  }
  async start(g) {
    await g.say(GOK.helmets);
    await g.say(CHAPTER7.eva);
    g.setObjective(GOK.evaTip(g.isTouch));
  }
  async found(g) {
    g.setObjective('');
    this.open = true;
    g.sfx.whoosh();
    await g.say(CHAPTER7.found);
    await g.say(GOK.end);
    await g.fade(1, 1.6);
    g.sfx.stopLoops();
    g.chapterDone(3);
  }
  update(dt, g) {
    if (this.open) this.openK = Math.min(1, (this.openK || 0) + dt * 0.3);
  }
  drawBg(x, cam, g) {
    x.drawImage(this.st, -cam.x * 0.03, -100);
    // Dünya
    const ex = cam.w * 0.75,
      ey = 140;
    x.fillStyle = '#2a6ab0';
    x.beginPath();
    x.arc(ex, ey, 60, 0, 7);
    x.fill();
    x.fillStyle = '#3a8a4a';
    x.beginPath();
    x.ellipse(ex - 14, ey - 6, 18, 12, 0.4, 0, 7);
    x.fill();
    x.fillStyle = '#f0f4ff';
    x.fillRect(ex - 40, ey + 18, 30, 4);
    x.fillStyle = 'rgba(0,0,0,0.55)';
    x.beginPath();
    x.arc(ex + 24, ey, 60, -Math.PI / 2, Math.PI / 2);
    x.fill();
    // uzak tepeler
    x.fillStyle = '#4a4a52';
    x.beginPath();
    x.moveTo(0, cam.h);
    for (let X = 0; X <= cam.w; X += 20) x.lineTo(X, 520 + Math.sin((X + cam.x * 0.3) * 0.006) * 40 - cam.y * 0.3);
    x.lineTo(cam.w, cam.h);
    x.fill();
  }
  drawWorld(x, cam, g) {
    const t = g.t;
    // Leylek inmiş halde
    x.save();
    x.translate(330, 620 - 195);
    drawLeylek(x, 0, 0, 4, t, { scale: 0.5, rot: -Math.PI / 2, lit: true, noLegs: true });
    x.restore();
    x.strokeStyle = INK;
    x.lineWidth = 7;
    x.beginPath();
    x.moveTo(250, 520);
    x.lineTo(200, this.terrain(200));
    x.moveTo(320, 520);
    x.lineTo(370, this.terrain(370));
    x.stroke();
    // Kapı (dev Kor sütunu)
    const mx = 3420;
    const k = this.openK || 0;
    glow(x, mx, 420, 300 + k * 200, '#7affc8', 0.35 + k * 0.4);
    x.fillStyle = '#0e2a24';
    x.strokeStyle = INK;
    x.lineWidth = 6;
    rr(x, mx - 50, 160, 100, 470, 10);
    x.fill();
    x.stroke();
    x.fillStyle = '#9effd8';
    rr(x, mx - 12, 180, 24, 430, 12);
    x.fill();
    if (k > 0) {
      x.globalAlpha = k;
      x.fillStyle = '#e8fff6';
      rr(x, mx - 40, 200, 80, 400, 20);
      x.fill();
      x.globalAlpha = 1;
    }
    for (let i = 0; i < 24; i++) {
      const ph = (t * 0.4 + i * 0.07) % 1;
      x.fillStyle = `rgba(160,255,220,${1 - ph})`;
      x.beginPath();
      x.arc(mx + Math.sin(i * 3.1) * 40, 600 - ph * 520, 3, 0, 7);
      x.fill();
    }
    // zemin
    x.fillStyle = '#9a9aa2';
    x.beginPath();
    x.moveTo(-20, 900);
    for (let X = -20; X <= this.width + 20; X += 10) x.lineTo(X, this.terrain(X));
    x.lineTo(this.width + 20, 900);
    x.closePath();
    x.fill();
    x.strokeStyle = INK;
    x.lineWidth = 5;
    x.stroke();
    const r = rng(3);
    x.fillStyle = 'rgba(0,0,0,0.14)';
    for (let i = 0; i < 60; i++) {
      const X = r() * this.width;
      x.beginPath();
      x.ellipse(X, this.terrain(X) + 20 + r() * 80, 20 + r() * 40, 5 + r() * 6, 0, 0, 7);
      x.fill();
    }
    // kayalar
    for (const [a, b, top] of this.rocks) {
      x.fillStyle = '#7a7a84';
      x.strokeStyle = INK;
      x.lineWidth = 5;
      x.beginPath();
      x.moveTo(a, this.terrain(a) + 10);
      x.lineTo(a + 14, top + 8);
      x.quadraticCurveTo((a + b) / 2, top - 12, b - 14, top + 6);
      x.lineTo(b, this.terrain(b) + 10);
      x.closePath();
      x.fill();
      x.stroke();
    }
    // ayak izleri
    x.fillStyle = 'rgba(40,40,50,0.35)';
    for (let X = 560; X < Math.min(g.player.x, this.width); X += 48) x.fillRect(X, this.terrain(X) + 4, 14, 5);
  }
}
