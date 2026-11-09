// Lig Efsanesi maç motoru: 5'e 5 halı saha, Haxball tarzı disk fiziği.
// Takım 0 alttaki kaleyi korur, yukarı hücum eder. Takım 1 tersi.
// Aynı motor hem oynanan maçta hem de hızlı simülasyonda (ekran yok) kullanılır.

export const W = 400, H = 620, GW = 124, PR = 13, BR = 7;
const GX0 = W / 2 - GW / 2, GX1 = W / 2 + GW / 2;
const POSTS = [[GX0, 0], [GX1, 0], [GX0, H], [GX1, H]];

export const FORMS = {
  '1-2-1': [[0.5, 0.28], [0.22, 0.6], [0.78, 0.6], [0.5, 0.9]],
  '2-1-1': [[0.3, 0.26], [0.7, 0.26], [0.5, 0.58], [0.5, 0.9]],
  '2-2': [[0.3, 0.3], [0.7, 0.3], [0.3, 0.8], [0.7, 0.8]],
  '1-1-2': [[0.5, 0.26], [0.5, 0.55], [0.28, 0.88], [0.72, 0.88]],
  '3-1': [[0.2, 0.3], [0.5, 0.24], [0.8, 0.3], [0.5, 0.82]],
};
export const TACTICS = {
  dengeli: { push: 0.5, press: 1, n: 'Dengeli' },
  pres: { push: 0.75, press: 1.6, n: 'Önde pres' },
  kontra: { push: 0.3, press: 0.7, n: 'Kontra atak' },
  hucum: { push: 0.95, press: 1.2, n: 'Tam hücum' },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const len = (x, y) => Math.hypot(x, y) || 1e-6;
const rnd = (s) => (Math.random() * 2 - 1) * s;

// takım: { name, c1, c2, form, tactic, players: [ {n,num,pos,hiz,sut,pas,def,fit} x5 ] }  (0. oyuncu kaleci)
export function createMatch(A, B, opts = {}) {
  const m = {
    teams: [A, B], half: opts.half || 120, t: 0, score: [0, 0], ev: [], stats: { shots: [0, 0], poss: [0, 0], on: [0, 0] },
    human: [opts.humanA ? 1 : null, opts.humanB ? 1 : null], input: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
    pause: 1.2, kick: 0, over: false, ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, last: null, prev: null }, ps: [], flash: null, period: 1,
  };
  [A, B].forEach((T, t) => T.players.slice(0, 5).forEach((a, i) => {
    m.ps.push({ t, i, a, x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: t ? 1 : -1, cool: 0, hold: 0, fit: a.fit == null ? 100 : a.fit, goals: 0, ast: 0, touch: 0, kickT: 0 }); }));
  kickoff(m, 0);
  return m;
}

const side = (t) => (t ? -1 : 1); // hücum yönü: takım 0 için y azalır
const ownGoalY = (t) => (t ? 0 : H);
const oppGoalY = (t) => (t ? H : 0);

function home(m, p, attacking) {
  const T = m.teams[p.t];
  if (p.i === 0) return { x: W / 2, y: ownGoalY(p.t) + side(p.t) * -18 };
  const f = (FORMS[T.form] || FORMS['1-2-1'])[p.i - 1];
  const tac = TACTICS[T.tactic] || TACTICS.dengeli;
  let depth = f[1] * 0.5 + (attacking ? tac.push * 0.55 : 0.0); // 0 kale, .5 orta saha
  const by = p.t ? m.ball.y / H : 1 - m.ball.y / H; // topun bizim kaleye uzaklığı (0..1)
  depth += (by - 0.5) * 0.35;
  depth = clamp(depth, 0.1, 0.92);
  const y = p.t ? depth * H : H - depth * H;
  let x = f[0] * W * 0.86 + W * 0.07;
  x += (m.ball.x - W / 2) * 0.28;
  return { x: clamp(x, 24, W - 24), y };
}

function kickoff(m, t) {
  m.ball.x = W / 2; m.ball.y = H / 2; m.ball.vx = m.ball.vy = 0; m.ball.last = null; m.ball.prev = null;
  for (const p of m.ps) {
    const h = home(m, p, false);
    const half = p.t ? Math.min(h.y, H / 2 - 40) : Math.max(h.y, H / 2 + 40);
    p.x = h.x; p.y = p.i === 0 ? h.y : half; p.vx = p.vy = 0; p.hold = 0;
  }
  // başlama vuruşunu yapacak oyuncu topa yakın
  const k = m.ps.find((p) => p.t === t && p.i === 4) || m.ps.find((p) => p.t === t && p.i);
  if (k) { k.x = W / 2; k.y = H / 2 + side(t) * -(PR + BR + 2) * -1; }
  m.pause = 1.1;
}

const spd = (p) => (150 + p.a.hiz * 1.15) * (0.74 + 0.26 * p.fit / 100) * (p.i === 0 ? 0.8 : 1);
const near = (p, b) => len(p.x - b.x, p.y - b.y) < PR + BR + 5;

function kickBall(m, p, dx, dy, power, noise) {
  const b = m.ball, l = len(dx, dy);
  let ang = Math.atan2(dy / l, dx / l) + rnd(noise);
  b.vx = Math.cos(ang) * power; b.vy = Math.sin(ang) * power;
  b.lk = p; b.lkp = b.last && b.last !== p && b.last.t === p.t ? b.last : null; b.prev = b.last; b.last = p; b.act = 'k' + (p.i === 0 ? 'g' : ''); p.cool = 0.35; p.kickT = 0.18; p.touch++;
  if (m.onKick) m.onKick(power);
}

function shoot(m, p) {
  const gy = oppGoalY(p.t);
  const gk = m.ps.find((q) => q.t !== p.t && q.i === 0);
  const tx = gk && gk.x > W / 2 ? W / 2 - GW * 0.36 : W / 2 + GW * 0.36;
  const d = len(tx - p.x, gy - p.y);
  const acc = (1 - p.a.sut / 110) * 0.32 + d / 2600;
  m.stats.shots[p.t]++;
  kickBall(m, p, tx - p.x, gy - p.y, 430 + p.a.sut * 3.4, acc);
  const b = m.ball;
  const tt = (gy - p.y) / (b.vy || 1e-6), hx = p.x + b.vx * tt;
  if (hx > GX0 && hx < GX1) m.stats.on[p.t]++;
}

function bestPass(m, p, dirx, diry) {
  let best = null, bs = -1e9;
  for (const q of m.ps) {
    if (q.t !== p.t || q === p || q.i === 0) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = len(dx, dy);
    if (d < 40 || d > 340) continue;
    let s = -d * 0.15 + (side(p.t) * -1) * 0 + (p.t ? dy : -dy) * 0.8;
    if (dirx || diry) s += ((dx * dirx + dy * diry) / d) * 160;
    // rakip araya giriyor mu
    for (const o of m.ps) {
      if (o.t === p.t) continue;
      const tt = clamp(((o.x - p.x) * dx + (o.y - p.y) * dy) / (d * d), 0, 1);
      const cx = p.x + dx * tt, cy = p.y + dy * tt;
      const od = len(o.x - cx, o.y - cy);
      if (od < 26) s -= 260 - od * 6;
    }
    if (s > bs) { bs = s; best = q; }
  }
  return best;
}

function pass(m, p, q) {
  const d = len(q.x - p.x, q.y - p.y);
  const lead = 0.2;
  const tx = q.x + q.vx * lead, ty = q.y + q.vy * lead;
  kickBall(m, p, tx - p.x, ty - p.y, clamp(170 + d * 1.25, 200, 560), (1 - p.a.pas / 110) * 0.2);
}

function aiPlayer(m, p, poss, chaser, cover) {
  const b = m.ball, T = m.teams[p.t], tac = TACTICS[T.tactic] || TACTICS.dengeli;
  const gy = oppGoalY(p.t), dir = side(p.t) * -1; // dir: hücum yönünde y işareti (takım0 için -1)
  let tx, ty;
  if (p.i === 0) {
    const gl = ownGoalY(p.t);
    const threat = Math.abs(b.y - gl) < 150 && ((p.t === 0 && b.vy > 60) || (p.t === 1 && b.vy < -60) || Math.abs(b.y - gl) < 70);
    tx = clamp(b.x, GX0 + 8, GX1 - 8); ty = gl - dir * -1 * 0 + (p.t ? 16 : -16);
    if (threat && Math.abs(b.y - gl) < 95) { tx = b.x; ty = b.y; }
    // tahmini kesişim
    if (Math.abs(b.vy) > 80 && ((p.t === 0 && b.vy > 0) || (p.t === 1 && b.vy < 0))) {
      const tt = (ty - b.y) / b.vy; if (tt > 0 && tt < 1.5) tx = clamp(b.x + b.vx * tt, GX0 - 6, GX1 + 6);
    }
    if (near(p, b) && p.cool <= 0) {
      if (p.hold < 0.55) { p.hold += 1 / 60; b.vx = 0; b.vy = 0; b.x = p.x; b.y = p.y + dir * (PR + BR + 1); b.last = p; tx = p.x; ty = p.y; }
      else { const q = bestPass(m, p, 0, dir); if (q) pass(m, p, q); else kickBall(m, p, rnd(1), dir, 520, 0.4); p.hold = 0; }
    }
    return { tx, ty, sp: 1 };
  }
  if (p === chaser) {
    // topun arkasına geç ve kaleye doğru it (topu kendi kalesine itmemek için yandan dolaş)
    const gdx = W / 2 - b.x, gdy = gy - b.y, gl = len(gdx, gdy), gx = gdx / gl, gyy = gdy / gl;
    const rx = p.x - b.x, ry = p.y - b.y, proj = rx * gx + ry * gyy, lat = rx * -gyy + ry * gx;
    if (proj > -PR * 0.6) {
      const s2 = lat >= 0 ? 1 : -1;
      tx = b.x + -gyy * s2 * (PR + BR + 16) - gx * PR; ty = b.y + gx * s2 * (PR + BR + 16) - gyy * PR;
    } else if (Math.abs(lat) > PR * 0.8) { tx = b.x - gx * (PR + BR); ty = b.y - gyy * (PR + BR); }
    else { tx = b.x + gx * 8; ty = b.y + gyy * 8; }
    if (near(p, b) && p.cool <= 0) {
      const dg = len(W / 2 - p.x, gy - p.y);
      const pressed = m.ps.some((o) => o.t !== p.t && len(o.x - p.x, o.y - p.y) < 46 && (o.y - p.y) * dir > -6);
      const range = 150 + p.a.sut * 1.3;
      if (dg < range && Math.random() < 0.18 + p.a.sut / 300) shoot(m, p);
      else if (pressed && Math.random() < 0.08 + p.a.pas / 400) { const q = bestPass(m, p, 0, dir); if (q) pass(m, p, q); }
      else if (dg > range && Math.random() < 0.012 * (p.a.pas / 60)) { const q = bestPass(m, p, 0, dir); if (q && (q.y - p.y) * dir > 30) pass(m, p, q); }
    }
    return { tx, ty, sp: 1 };
  }
  const h = home(m, p, poss === p.t);
  tx = h.x; ty = h.y;
  if (p === cover && poss !== p.t) { const gl = ownGoalY(p.t); tx = (b.x + W / 2) / 2; ty = (b.y * 0.6 + gl * 0.4); }
  if (poss === p.t) {
    // boş alana koş
    tx += Math.sin(m.t * 0.7 + p.i * 2) * 26;
  } else if (poss !== null) {
    // en yakın rakibe biraz yaklaş (adam markajı)
    let best = null, bd = 1e9;
    for (const o of m.ps) if (o.t !== p.t && o.i) { const d = len(o.x - tx, o.y - ty); if (d < bd) { bd = d; best = o; } }
    if (best && bd < 120) { tx = tx * 0.5 + (best.x + 0) * 0.5; ty = ty * 0.5 + (best.y + (ownGoalY(p.t) - best.y) * 0.15) * 0.5; }
  }
  return { tx, ty, sp: 0.62 + 0.25 * tac.press * 0.6 };
}

export function step(m, dt = 1 / 60) {
  if (m.over) return;
  if (m.pause > 0) { m.pause -= dt; if (m.flash) m.flash.t -= dt; return; }
  const b = m.ball;
  m.t += dt;
  if (m.period === 1 && m.t >= m.half) { m.period = 2; kickoff(m, 1); m.flash = { txt: 'İkinci yarı', t: 1.5 }; m.pause = 1.6; return; }
  if (m.t >= m.half * 2) { m.over = true; return; }
  if (m.flash) { m.flash.t -= dt; if (m.flash.t <= 0) m.flash = null; }

  // top kimde
  let poss = null, pd = 40;
  for (const p of m.ps) { const d = len(p.x - b.x, p.y - b.y); if (d < pd) { pd = d; poss = p.t; } }
  if (poss !== null) m.stats.poss[poss] += dt;

  // insanlar için oyuncu seçimi; 1 sn dokunulmazsa oyuncuyu yapay zekâ sürer (telefonda rahatlık)
  m.idle = m.idle || [0, 0];
  for (let t = 0; t < 2; t++) {
    if (m.human[t] == null) continue;
    const ii = m.input[t];
    if (Math.hypot(ii.x, ii.y) > 0.15 || ii.k || ii.p) m.idle[t] = 0; else m.idle[t] += dt;
    const cur = m.ps.find((p) => p.t === t && p.i === m.human[t]);
    const inp = m.input[t];
    let best = null, bd = 1e9;
    for (const p of m.ps) if (p.t === t && p.i) { const d = len(p.x - b.x, p.y - b.y); if (d < bd) { bd = d; best = p; } }
    const cd = len(cur.x - b.x, cur.y - b.y);
    if (inp.sw) { inp.sw = 0; if (best && best !== cur) m.human[t] = best.i; else { const o = m.ps.filter((p) => p.t === t && p.i && p !== cur).sort((p, q) => len(p.x - b.x, p.y - b.y) - len(q.x - b.x, q.y - b.y))[0]; if (o) m.human[t] = o.i; } }
    else if (best && best !== cur && cd > bd + 70 && !near(cur, b) && (m.autoSw !== false)) m.human[t] = best.i;
  }

  // yapay zekâ hedefleri
  const chasers = [null, null], covers = [null, null];
  for (let t = 0; t < 2; t++) {
    const list = m.ps.filter((p) => p.t === t && p.i).map((p) => ({ p, d: len(p.x - b.x, p.y - b.y) - (p.t === poss ? 0 : 0) })).sort((u, v) => u.d - v.d);
    const hp = m.human[t] != null && m.idle[t] < 1 ? m.ps.find((p) => p.t === t && p.i === m.human[t]) : null;
    const ai = list.filter((o) => o.p !== hp);
    const hd = hp ? len(hp.x - b.x, hp.y - b.y) : 1e9;
    chasers[t] = ai[0] && ai[0].d < hd - 30 ? ai[0].p : null;
    if (!hp && ai[0]) chasers[t] = ai[0].p;
    covers[t] = (chasers[t] ? ai[1] : ai[0])?.p || null;
  }

  m._ch = chasers;
  for (const p of m.ps) {
    p.cool -= dt; p.kickT -= dt;
    const isH = m.human[p.t] != null && p.i === m.human[p.t] && m.idle[p.t] < 1;
    let ax = 0, ay = 0, sp = spd(p);
    if (isH) {
      const inp = m.input[p.t];
      const l = len(inp.x, inp.y);
      if (l > 0.15) { ax = inp.x / Math.max(1, l); ay = inp.y / Math.max(1, l); p.fx = inp.x / l; p.fy = inp.y / l; }
      if (inp.k && near(p, b) && p.cool <= 0) {
        inp.k = 0;
        let dx = p.fx, dy = p.fy;
        // hafif nişan yardımı: kaleye bakıyorsa kaleye
        const gy = oppGoalY(p.t), gdx = W / 2 - p.x, gdy = gy - p.y, gl = len(gdx, gdy);
        if ((dx * gdx + dy * gdy) / gl > 0.55 && gl < 330) { const tx = W / 2 + clamp(dx * 120, -GW * 0.38, GW * 0.38); dx = tx - p.x; dy = gy - p.y; m.stats.shots[p.t]++; }
        kickBall(m, p, dx, dy, 470 + p.a.sut * 3.4, (1 - p.a.sut / 110) * 0.08);
      } else if (inp.k && !near(p, b)) { inp.kq = (inp.kq || 0) + 1; if (inp.kq > 12) { inp.k = 0; inp.kq = 0; } }
      if (inp.p && near(p, b) && p.cool <= 0) { inp.p = 0; const q = bestPass(m, p, p.fx, p.fy); if (q) pass(m, p, q); else kickBall(m, p, p.fx, p.fy, 330, 0.05); }
      else if (inp.p && !near(p, b)) { inp.pq = (inp.pq || 0) + 1; if (inp.pq > 12) { inp.p = 0; inp.pq = 0; } }
    } else {
      const g = aiPlayer(m, p, poss, chasers[p.t], covers[p.t]);
      const dx = g.tx - p.x, dy = g.ty - p.y, d = len(dx, dy);
      const slow = d < 30 ? d / 30 : 1;
      ax = (dx / d) * slow; ay = (dy / d) * slow; sp *= g.sp;
      if (d > 4) { p.fx = dx / d; p.fy = dy / d; }
    }
    const k = 9;
    p.vx += (ax * sp - p.vx) * Math.min(1, k * dt); p.vy += (ay * sp - p.vy) * Math.min(1, k * dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = clamp(p.x, PR - 14, W - PR + 14); p.y = clamp(p.y, PR - 14, H - PR + 14);
    const v = len(p.vx, p.vy) / 260;
    p.fit = Math.max(20, p.fit - dt * (0.018 + v * 0.05) * (120 / m.half));
  }
  // oyuncu çarpışmaları
  for (let i = 0; i < m.ps.length; i++) for (let j = i + 1; j < m.ps.length; j++) {
    const p = m.ps[i], q = m.ps[j], dx = q.x - p.x, dy = q.y - p.y, d = len(dx, dy);
    if (d < PR * 2) { const o = (PR * 2 - d) / 2, nx = dx / d, ny = dy / d; p.x -= nx * o; p.y -= ny * o; q.x += nx * o; q.y += ny * o; }
  }
  // top - oyuncu (sıra her karede değişir ki iki takımdan biri hep avantajlı olmasın)
  m.fr = (m.fr || 0) + 1;
  const order = m.fr % 2 ? m.ps : m.ps.slice().reverse();
  for (const p of order) {
    const dx = b.x - p.x, dy = b.y - p.y, d = len(dx, dy);
    if (d < PR + BR) {
      const nx = dx / d, ny = dy / d;
      b.x = p.x + nx * (PR + BR); b.y = p.y + ny * (PR + BR);
      const pv = p.vx * nx + p.vy * ny, bv = b.vx * nx + b.vy * ny;
      // yapay zekâ oyuncusu topu kendi kalesine doğru itiyorsa yumuşak dokunur (gerçek oyuncu gibi kaçınır)
      const isH = m.human[p.t] != null && p.i === m.human[p.t] && m.idle[p.t] < 1;
      const toOwn = ny * (p.t ? -1 : 1);
      const k2 = !isH && toOwn > 0.3 ? 0.35 : 1.15;
      if (bv < pv * k2) { const add = pv * k2 - bv; b.vx += nx * add; b.vy += ny * add; }
      if (bv < 0) { b.vx -= nx * bv * 1.4; b.vy -= ny * bv * 1.4; }
      if (b.last !== p) { b.prev = b.last; b.last = p; } b.act = 'c' + (p.i === 0 ? 'g' : '') + (p === m._ch?.[p.t] ? 'h' : '') + p.i;
    }
  }
  // top hareketi
  b.x += b.vx * dt; b.y += b.vy * dt;
  const fr = Math.exp(-1.05 * dt); b.vx *= fr; b.vy *= fr;
  const sv = len(b.vx, b.vy); if (sv > 900) { b.vx *= 900 / sv; b.vy *= 900 / sv; }
  if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx) * 0.7; }
  if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx) * 0.7; }
  const inMouth = b.x > GX0 + 2 && b.x < GX1 - 2;
  if (!inMouth) {
    if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy) * 0.7; }
    if (b.y > H - BR) { b.y = H - BR; b.vy = -Math.abs(b.vy) * 0.7; }
  }
  for (const [px, py] of POSTS) {
    const dx = b.x - px, dy = b.y - py, d = len(dx, dy);
    if (d < BR + 5) { const nx = dx / d, ny = dy / d; b.x = px + nx * (BR + 5); b.y = py + ny * (BR + 5); const v = b.vx * nx + b.vy * ny; if (v < 0) { b.vx -= 1.7 * v * nx; b.vy -= 1.7 * v * ny; } }
  }
  if (inMouth || b.y < 0 || b.y > H) {
    b.x = clamp(b.x, GX0 + BR, GX1 - BR);
    if (b.y < -BR * 2) goal(m, 0);
    else if (b.y > H + BR * 2) goal(m, 1);
  }
}

function goal(m, t) {
  m.score[t]++;
  const b = m.ball;
  let sc = b.last;
  // savunmadan seken şut: golü şutu atana yaz
  if (sc && sc.t !== t && b.act && b.act[0] === 'c' && b.lk && b.lk.t === t) { sc = b.lk; b.prev = b.lkp; }
  let txt;
  const min = Math.min(90, Math.round((m.t / (m.half * 2)) * 90));
  if (sc && sc.t === t) {
    sc.goals++;
    const as = b.prev && b.prev.t === t && b.prev !== sc ? b.prev : null;
    if (as) as.ast++;
    txt = `${sc.a.n}${as ? ' (asist ' + as.a.n + ')' : ''}`;
    m.ev.push({ t, min, n: sc.a.n, as: as ? as.a.n : null });
  } else {
    txt = `Kendi kalesine: ${sc ? sc.a.n : '?'}`;
    m.ev.push({ t, min, n: (sc ? sc.a.n : '?') + ' (k.k.)', own: true, act: b.act });
  }
  m.flash = { txt: 'GOL! ' + txt, t: 2.2, team: t };
  if (m.onGoal) m.onGoal(t);
  kickoff(m, 1 - t);
  m.pause = 2.2;
}

export function simulate(A, B, half = 120) {
  const m = createMatch(A, B, { half });
  const dt = 1 / 30; let guard = 0;
  while (!m.over && guard++ < 40000) step(m, dt);
  return m;
}

// ---------- çizim ----------
export function snapshot(m) {
  return {
    p: m.ps.map((p) => [Math.round(p.x), Math.round(p.y), p.kickT > 0 ? 1 : 0]),
    b: [Math.round(m.ball.x), Math.round(m.ball.y)], s: m.score.slice(), t: Math.round(m.t * 10) / 10, h: m.human.slice(), f: m.flash ? m.flash.txt : '', o: m.over ? 1 : 0, half: m.half,
  };
}

export function draw(ctx, cw, ch, S, meta, view = {}) {
  const flip = !!view.flip;
  const sc = Math.min(cw / (W + 40), ch / (H + 56));
  const ox = (cw - W * sc) / 2, oy = (ch - H * sc) / 2;
  const X = (x) => ox + (flip ? W - x : x) * sc, Y = (y) => oy + (flip ? H - y : y) * sc;
  ctx.fillStyle = '#2f8f4e'; ctx.fillRect(0, 0, cw, ch);
  for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#3a9e58' : '#35975a'; ctx.fillRect(ox, oy + (H * sc * i) / 10, W * sc, (H * sc) / 10 + 1); }
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, W * sc, H * sc);
  ctx.beginPath(); ctx.moveTo(ox, oy + (H * sc) / 2); ctx.lineTo(ox + W * sc, oy + (H * sc) / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(ox + (W * sc) / 2, oy + (H * sc) / 2, 50 * sc, 0, 7); ctx.stroke();
  ctx.strokeRect(ox + (W / 2 - 90) * sc, oy, 180 * sc, 80 * sc); ctx.strokeRect(ox + (W / 2 - 90) * sc, oy + (H - 80) * sc, 180 * sc, 80 * sc);
  // kaleler
  for (const top of [true, false]) {
    const y0 = top ? oy - 22 * sc : oy + H * sc;
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(ox + GX0 * sc, y0, GW * sc, 22 * sc);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(ox + (GX0 + (GW * i) / 8) * sc, y0); ctx.lineTo(ox + (GX0 + (GW * i) / 8) * sc, y0 + 22 * sc); ctx.stroke(); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(ox + GX0 * sc, y0, GW * sc, 22 * sc);
  }
  // oyuncular
  const r = PR * sc;
  S.p.forEach((q, k) => {
    const t = k < 5 ? 0 : 1, i = k % 5, T = meta.teams[t];
    const x = X(q[0]), y = Y(q[1]);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, r, r * 0.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = i === 0 ? T.c2 : T.c1; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.lineWidth = q[2] ? 4 : 2.5; ctx.strokeStyle = q[2] ? '#fff' : i === 0 ? T.c1 : T.c2; ctx.stroke();
    ctx.fillStyle = i === 0 ? T.c1 : T.c2; ctx.font = `700 ${Math.round(r * 0.95)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(T.players[i].num || i + 1), x, y + 1);
    if (S.h[t] === i && (view.me == null || view.me === t)) {
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.stroke();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x - 6, y - r - 14); ctx.lineTo(x + 6, y - r - 14); ctx.lineTo(x, y - r - 7); ctx.fill();
    }
  });
  const bx = X(S.b[0]), by = Y(S.b[1]);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(bx + 2, by + 3, BR * sc, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, BR * sc, 0, 7); ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(bx, by, BR * sc * 0.35, 0, 7); ctx.fill();
  if (S.f) {
    ctx.fillStyle = 'rgba(20,14,50,.75)'; const w = Math.min(cw - 20, 330); ctx.fillRect(cw / 2 - w / 2, ch / 2 - 30, w, 60);
    ctx.fillStyle = '#ffd23f'; ctx.font = '700 20px system-ui'; ctx.textAlign = 'center'; ctx.fillText(S.f.length > 34 ? S.f.slice(0, 33) + '…' : S.f, cw / 2, ch / 2);
  }
}
