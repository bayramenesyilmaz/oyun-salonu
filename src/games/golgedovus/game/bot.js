// Yapay zeka rakip: tuşlara basıyormuş gibi f.inp (basılı tutulanlar) ve f.pr (tek basış) alanlarını doldurur.
const LEVELS = {
  kolay: { react: 0.5, aggr: 0.4, block: 0.25, plan: 0.55, tick: 0.45 },
  orta: { react: 0.3, aggr: 0.65, block: 0.5, plan: 0.75, tick: 0.3 },
  zor: { react: 0.16, aggr: 0.9, block: 0.78, plan: 0.95, tick: 0.18 },
};

export class Bot {
  constructor(level = 'orta') {
    this.p = LEVELS[level] || LEVELS.orta;
    this.think = 0.3;
    this.dir = 0;
    this.dirT = 0;
    this.blockT = 0;
    this.plan = [];
    this.planT = 0;
    this.react = 0;
    this.saw = false;
  }

  update(f, o, dt) {
    const i = f.inp;
    const p = this.p;
    const dx = o.x - f.x;
    const dist = Math.abs(dx);
    const sgn = dx >= 0 ? 1 : -1;
    const M = f.ch.moves;
    const ranged = f.ch.weapon === 'bow';
    const reach = ranged ? 300 : Math.max(M.l1.reach, 70);
    const pref = ranged ? 290 : reach * 0.82;

    this.think -= dt;
    this.dirT -= dt;
    this.blockT -= dt;
    this.planT -= dt;

    // savunma: rakibin saldırısını fark et
    if (o.st === 'atk' && o.mv) {
      if (!this.saw) {
        this.saw = true;
        this.react = p.react * (0.6 + Math.random() * 0.8);
      }
      this.react -= dt;
      const danger = dist < (o.mv.reach || 0) + 55 || (o.mv.proj && dist < 420);
      if (this.react <= 0 && danger && o.mvT < o.mv.su + o.mv.ac && this.blockT <= 0 && !f.mv) {
        if (Math.random() < p.block) {
          this.blockT = 0.35 + Math.random() * 0.3;
        } else {
          this.blockT = -0.5;
        }
      }
    } else {
      this.saw = false;
    }
    // uçan ok/dalga: zıpla ya da kalkan
    if (!f.mv && f.y <= 0 && this.blockT <= 0) {
      for (const pj of this.m.proj) {
        if (pj.own === f.slot) continue;
        const d = (f.x - pj.x) * Math.sign(pj.vx || 0);
        if (d > 20 && d < 170 && Math.abs(pj.y - 60) < 90) {
          if (pj.low) {
            if (Math.random() < p.block + 0.2) f.pr.u = true;
          } else if (Math.random() < p.block) this.blockT = 0.4;
          break;
        }
      }
    }

    // plan sırası (kombo tuşları)
    if (this.plan.length && this.planT <= 0) {
      const k = this.plan.shift();
      f.pr[k] = true;
      this.planT = k === 'a' ? 0.17 : 0.2;
    }
    const busy = f.st === 'atk' || f.st === 'hurt' || f.st === 'down' || f.st === 'ko';
    if (f.st === 'hurt' || f.st === 'down' || f.st === 'ko') this.plan.length = 0;

    i.l = i.r = i.d = 0;
    if (this.blockT > 0 && !f.mv) i.d = 1;

    if (!busy && this.think <= 0 && !this.plan.length) {
      this.think = p.tick * (0.6 + Math.random() * 0.8);
      // bitiriş
      if (f.meter >= 100 && dist < 360 && o.st !== 'down' && o.st !== 'ko' && Math.random() < 0.8) {
        f.pr.s = true;
        return;
      }
      // özel
      if (f.scd <= 0) {
        const id = f.ch.id;
        if (id === 'arda' && dist > 150 && dist < 300) return void (f.pr.s = true);
        if (id === 'kaan' && dist > 200 && Math.random() < 0.6) return void (f.pr.s = true);
        if (id === 'elif' && dist < 120 && Math.random() < 0.7) return void (f.pr.s = true);
        if (id === 'mert' && f.hp < f.hpMax * 0.7 && dist > 240) return void (f.pr.s = true);
        if (id === 'zeynep' && o.st === 'atk' && dist < 140) return void (f.pr.s = true);
      }
      if (dist > pref + 35) {
        this.dir = sgn;
        this.dirT = 0.25 + Math.random() * 0.3;
        if (ranged && dist > 360 && f.y <= 0 && Math.random() < 0.5) {
          this.plan.push(Math.random() < 0.6 ? 'a' : 'b');
        }
      } else if (dist < pref - 30 && ranged) {
        this.dir = -sgn;
        this.dirT = 0.3;
      } else if (Math.random() < p.aggr) {
        if (ranged) {
          const r = Math.random();
          this.plan = r < 0.5 ? ['a', 'a', 'a'] : r < 0.8 ? ['a', 'a', 'b'] : ['b'];
        } else if (dist <= reach + 14) {
          const r = Math.random();
          if (Math.random() > p.plan) this.plan = ['a'];
          else this.plan = r < 0.4 ? ['a', 'a', 'a'] : r < 0.75 ? ['a', 'a', 'b'] : r < 0.9 ? ['b'] : ['a', 'b'];
        } else {
          this.dir = sgn;
          this.dirT = 0.2;
        }
        this.planT = 0.02;
      } else if (Math.random() < 0.18 && f.y <= 0) {
        f.pr.u = true;
        this.dir = sgn;
        this.dirT = 0.3;
      } else {
        this.dir = 0;
        this.dirT = 0.2;
      }
    }
    if (this.dirT > 0 && !busy && this.blockT <= 0) {
      if (this.dir > 0) i.r = 1;
      else if (this.dir < 0) i.l = 1;
    }
  }
}
