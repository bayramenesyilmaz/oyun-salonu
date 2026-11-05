// Bot: hırsız ya da bekçi rolünü oynar. Algı kuralları oyuncununkiyle aynı (bekçi hırsızı yalnız görürse, duyarsa ya da alarm çalarsa bilir).
import { FY, HIDE, TRE, EXIT_X, danger, route } from './map.js';

export class Bot {
  constructor(m, slot) {
    this.m = m;
    this.slot = slot;
    this.reset();
  }
  reset() {
    this.wait = 0;
    this.hideT = 0;
    this.react = 0;
    this.wp = null;
    this.arrT = 0;
    this.searched = false;
    this.inp = { l: 0, r: 0, u: 0, d: 0, run: 0, act: 0 };
  }
  think() {
    const i = this.inp;
    i.l = i.r = i.u = i.d = i.run = i.act = 0;
    const m = this.m;
    const p = m.P[this.slot];
    if (m.phase !== 'play' || p.cl || p.sw > 0 || p.stun > 0) return i;
    return p.role === 't' ? this.thief(p, i, 1 / 60) : this.guard(p, i, 1 / 60);
  }
  thief(p, i, dt) {
    const m = this.m;
    const g = m.G;
    const gf = m.effFl(g);
    const gd = Math.abs(g.x - p.x);
    if (p.hidden) {
      this.hideT += dt;
      if (this.hideT > 1.5 && (gf !== p.fl || gd > 300)) i.u = 1;
      return i;
    }
    const sameF = gf === p.fl;
    if (sameF && gd < 340 && (g.face * (p.x - g.x) > 0 || gd < 120)) {
      let best = null;
      for (const h of HIDE) if (h.f === p.fl && Math.abs(h.x - p.x) < 280 && (!best || Math.abs(h.x - p.x) < Math.abs(best.x - p.x))) best = h;
      if (best) {
        if (Math.abs(best.x - p.x) < 10) {
          i.d = 1;
          this.hideT = 0;
        } else if (best.x > p.x) i.r = 1;
        else i.l = 1;
        return i;
      }
    }
    const tr = TRE[m.treasure];
    if (!p.carry && !m.stolen && p.fl === tr.f && Math.abs(tr.x - p.x) < 18) {
      i.act = 1;
      return i;
    }
    const goal = p.carry ? { x: EXIT_X - 6, f: 0 } : { x: tr.x, f: tr.f };
    const r = route(p.fl, p.x, goal.f, goal.x);
    const dx = r.x - p.x;
    if (Math.abs(dx) < 6) {
      if (r.climb) i[r.climb] = 1;
      return i;
    }
    const dir = dx > 0 ? 1 : -1;
    const unsafe = danger(p.x + dir * 55, p.fl, m.rt + 0.35) || danger(p.x + dir * 22, p.fl, m.rt + 0.12);
    if (unsafe && this.wait < 2.4) {
      this.wait += dt;
      return i;
    }
    if (!unsafe) this.wait = 0;
    if (dir > 0) i.r = 1;
    else i.l = 1;
    if (m.alarmT > 0 || Math.abs(gf - p.fl) > 0 || gd > 330) i.run = 1;
    return i;
  }
  pick() {
    const f = Math.floor(Math.random() * 3);
    if (Math.random() < 0.3) {
      const hs = HIDE;
      const h = hs[Math.floor(Math.random() * hs.length)];
      this.wp = { x: h.x, f: h.f, search: true };
    } else this.wp = { x: 80 + Math.random() * 640, f, search: false };
    this.arrT = 0;
    this.searched = false;
  }
  guard(p, i, dt) {
    const m = this.m;
    const t = m.T;
    const sees = m.guardSees();
    this.react = sees ? this.react + dt : 0;
    let goal = null;
    if (sees) goal = { x: t.x, f: m.effFl(t) };
    else if (m.alarmT > 0 && m.alarmT < 4.2 && m.alarmPos) goal = { x: m.alarmPos.x, f: m.alarmPos.f };
    else if (m.noise) goal = { x: m.noise.x, f: m.noise.f };
    else {
      if (!this.wp) this.pick();
      goal = this.wp;
    }
    if (sees && !t.cl && t.fl === p.fl && Math.abs(t.x - p.x) < 44 && this.react > 0.5) {
      const dir = t.x > p.x ? 1 : -1;
      if (p.face !== dir) {
        if (dir > 0) i.r = 1;
        else i.l = 1;
      } else i.act = 1;
      return i;
    }
    const r = route(p.fl, p.x, goal.f, goal.x);
    const dx = r.x - p.x;
    if (Math.abs(dx) < 8) {
      if (r.climb) {
        i[r.climb] = 1;
        return i;
      }
      if (goal === this.wp) {
        this.arrT += dt;
        if (this.wp.search && !this.searched && this.arrT > 0.2) {
          i.act = 1;
          this.searched = true;
        }
        if (this.arrT > 0.9) this.wp = null;
      }
      return i;
    }
    if (dx > 0) i.r = 1;
    else i.l = 1;
    return i;
  }
}
