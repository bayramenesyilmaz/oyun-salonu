// Ortak karakter çizimi: kalın çizgili çizgi film iskeleti.
// Kullanım: drawFighter(ctx, savaşçı, zaman, { x, y, face, scale }) — (x,y) ayakların yere bastığı nokta.
// Savaşçı alanları: ch (karakter), st, mv (hamle), mvT, y (yerden yükseklik), x, dT (yatma süresi).
import { CHARACTERS } from './roster.js';

const INK = '#141018';
const D = Math.PI / 180;
export const WLEN = { sword: 72, hammer: 70, bow: 0, staff: 74, spear: 104 };
const IDLE_W = { sword: -62, hammer: -82, bow: -4, staff: -78, spear: -22 };
const ARM = 31;
const LEG = 44;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => 1 - (1 - u) * (1 - u);

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function limb(c, x0, y0, x1, y1, w, col) {
  c.lineCap = 'round';
  c.strokeStyle = INK;
  c.lineWidth = w + 5;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
  c.strokeStyle = col;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}
function disc(c, x, y, r, fill, lw = 2.5) {
  c.fillStyle = fill;
  c.strokeStyle = INK;
  c.lineWidth = lw;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();
}

// ——— duruş ———
export function poseOf(f, t) {
  const wk = f.ch.weapon;
  const iw = IDLE_W[wk];
  const P = { lean: 4, hipY: -44, lf: 0.28, lb: -0.22, af: -28, ab: 55, w: iw, ext: 0, bob: Math.sin(t * 5.2) * 1.4, rot: 0, pull: 0, shield: 0, glow: 0, mood: 'fight', cup: false };
  const st = f.st;
  const air = (f.y || 0) > 4;

  if (st === 'walk') {
    const ph = (f.x || 0) * 0.055;
    P.lf = Math.sin(ph) * 0.62 + 0.1;
    P.lb = -Math.sin(ph) * 0.62 - 0.05;
    P.bob = -Math.abs(Math.sin(ph)) * 2.5;
    P.lean = 8;
    P.af = -34 + Math.sin(ph) * 6;
    P.ab = 50 - Math.sin(ph) * 8;
  }
  if (air && st !== 'atk' && st !== 'hurt' && st !== 'down' && st !== 'ko') {
    P.lf = 0.95;
    P.lb = -0.15;
    P.hipY = -50;
    P.af = -55;
    P.ab = -10;
    P.lean = 6;
  }
  if (st === 'block') {
    P.hipY = -38;
    P.lf = 0.5;
    P.lb = -0.4;
    P.af = -78;
    P.ab = -38;
    P.w = -88;
    P.lean = 8;
    P.shield = 1;
    P.mood = 'block';
  }
  if (st === 'hurt') {
    P.lean = -14;
    P.af = -125;
    P.ab = -100;
    P.w = -150;
    P.lf = 0.1;
    P.lb = -0.5;
    P.mood = 'hurt';
    if (air) P.rot = -0.9;
  }
  if (st === 'down' || st === 'ko') {
    const k = ease(clamp((f.dT || 0) / 0.2));
    P.rot = -k * (Math.PI / 2 - 0.1);
    P.mood = st === 'ko' ? 'ko' : 'hurt';
    P.af = -80;
    P.ab = -60;
    P.lean = 0;
    P.lf = 0.3;
    P.lb = -0.1;
  }
  if (st === 'win') {
    P.af = -135;
    P.ab = -140;
    P.w = -110;
    P.hipY = -44 - Math.abs(Math.sin(t * 6)) * 9;
    P.mood = 'win';
    P.lean = -2;
  }
  if (st === 'atk' && f.mv) atkPose(P, f, f.mv, f.mvT || 0, iw);
  return P;
}

function atkPose(P, f, mv, t, iw) {
  const { su, ac, rc } = mv;
  let w, e, k;
  if (t < su) {
    const u = ease(clamp(t / su));
    w = lerp(iw, mv.a0, u);
    e = lerp(0, mv.e0, u);
    k = u * 0.6;
    if (mv.kind === 'fin') P.glow = clamp(t / su);
  } else if (t < su + ac) {
    const u = (t - su) / ac;
    w = lerp(mv.a0, mv.a1, u);
    e = lerp(mv.e0, mv.e1, u);
    k = 1;
  } else {
    const u = ease(clamp((t - su - ac) / rc));
    let end = ((mv.a1 % 360) + 360) % 360;
    if (end > 180) end -= 360;
    w = lerp(end, iw, u);
    e = lerp(mv.e1, 0, u);
    k = 1 - u;
  }
  P.w = w;
  P.ext = e;
  P.lean = 6 + (mv.lean || 8) * k;
  P.lf = 0.5 * k + 0.2;
  P.lb = -0.45 * k - 0.15;
  P.mood = 'atk';
  const straight = mv.kind === 'thrust' || mv.kind === 'bash' || mv.kind === 'dash' || mv.kind === 'shoot' || mv.kind === 'vault';
  if (straight) {
    P.af = w;
    P.ab = f.ch.weapon === 'bow' ? 0 : 50;
  } else {
    P.af = w * 0.8 - 6;
    P.ab = 40 - k * 20;
  }
  if (mv.kind === 'shoot' || mv.kind === 'vault') {
    const pu = t < su ? t / su : t < su + ac ? 1 : 1 - clamp((t - su - ac) / (rc * 0.5));
    P.pull = 22 * clamp(pu);
    if (mv.kind === 'vault') {
      P.lf = 0.9;
      P.lb = -0.2;
      P.hipY = -50;
    }
  }
  if (mv.kind === 'heal') {
    P.cup = true;
    P.af = -105;
    P.ab = 70;
    P.w = 0;
    P.lean = 2;
    P.mood = 'calm';
  }
  if (mv.kind === 'counter') {
    P.shield = 1;
    P.af = -20;
    P.w = -70;
    P.hipY = -40;
    P.lf = 0.45;
    P.lb = -0.35;
    P.lean = 10;
  }
}

// ——— silahlar (kolun ucunda, +x yönüne bakar) ———
function wSword(c, ch) {
  limb(c, -9, 0, 4, 0, 5, '#8d6b4a');
  c.fillStyle = ch.colors.accent;
  c.strokeStyle = INK;
  c.lineWidth = 2.5;
  rr(c, 4, -9, 5, 18, 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(9, -4.5);
  c.lineTo(58, -4.5);
  c.lineTo(72, 0);
  c.lineTo(58, 4.5);
  c.lineTo(9, 4.5);
  c.closePath();
  c.fillStyle = '#e6edf5';
  c.fill();
  c.stroke();
  c.strokeStyle = '#9fb0c4';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(13, 0);
  c.lineTo(56, 0);
  c.stroke();
}
function wHammer(c, ch) {
  limb(c, -12, 0, 48, 0, 6, '#8d6b4a');
  c.fillStyle = '#8892a8';
  c.strokeStyle = INK;
  c.lineWidth = 3;
  rr(c, 38, -17, 30, 34, 5);
  c.fill();
  c.stroke();
  c.fillStyle = ch.colors.accent;
  rr(c, 38, -17, 8, 34, 3);
  c.fill();
  c.stroke();
}
function wStaff(c, ch) {
  limb(c, -48, 0, 72, 0, 6, '#c9a26b');
  c.fillStyle = ch.colors.accent;
  c.strokeStyle = INK;
  c.lineWidth = 2.5;
  rr(c, 62, -6, 12, 12, 3);
  c.fill();
  c.stroke();
  rr(c, -52, -6, 10, 12, 3);
  c.fill();
  c.stroke();
}
function wSpear(c, ch) {
  limb(c, -34, 0, 80, 0, 5, '#c9a26b');
  c.beginPath();
  c.moveTo(78, -8);
  c.lineTo(106, 0);
  c.lineTo(78, 8);
  c.closePath();
  c.fillStyle = '#e6edf5';
  c.strokeStyle = INK;
  c.lineWidth = 2.5;
  c.fill();
  c.stroke();
  c.fillStyle = ch.colors.accent;
  rr(c, 70, -4, 8, 8, 2);
  c.fill();
  c.stroke();
}
function wBow(c, ch, pull) {
  // yay: grip x=0, kollar ileri bombeli
  c.strokeStyle = INK;
  c.lineWidth = 8.5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-2, -36);
  c.quadraticCurveTo(24, 0, -2, 36);
  c.stroke();
  c.strokeStyle = '#a8693d';
  c.lineWidth = 4.5;
  c.beginPath();
  c.moveTo(-2, -36);
  c.quadraticCurveTo(24, 0, -2, 36);
  c.stroke();
  c.strokeStyle = '#f4f0e0';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-2, -36);
  c.lineTo(-2 - pull * 0.7, 0);
  c.lineTo(-2, 36);
  c.stroke();
  if (pull > 6) {
    c.strokeStyle = INK;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-2 - pull * 0.7, 0);
    c.lineTo(34, 0);
    c.stroke();
    c.strokeStyle = '#e6edf5';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-2 - pull * 0.7, 0);
    c.lineTo(34, 0);
    c.stroke();
    c.fillStyle = '#e6edf5';
    c.beginPath();
    c.moveTo(34, -4);
    c.lineTo(44, 0);
    c.lineTo(34, 4);
    c.fill();
  }
}
function wCup(c) {
  c.fillStyle = '#f4f0e0';
  c.strokeStyle = INK;
  c.lineWidth = 2.5;
  rr(c, 2, -9, 12, 12, 3);
  c.fill();
  c.stroke();
  c.beginPath();
  c.arc(15, -3, 4, -1.4, 1.4);
  c.stroke();
  c.fillStyle = '#d9a066';
  c.fillRect(4, -7, 8, 3);
}
function shield(c, ch, r = 18) {
  disc(c, 0, 0, r, ch.colors.accent, 3);
  disc(c, 0, 0, r * 0.62, '#f4f0e0', 2);
  disc(c, 0, 0, r * 0.22, ch.colors.accent, 2);
}

// ——— baş ve yüz ———
function head(c, f, P, time) {
  const col = f.ch.colors;
  disc(c, 0, -64, 17, col.skin, 3);
  const cap = (a0, a1, fill) => {
    c.fillStyle = fill;
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, -64, 17.6, Math.PI * a0, Math.PI * a1);
    c.closePath();
    c.fill();
    c.stroke();
  };
  const hat = f.ch.hat;
  if (hat === 'beanie') {
    cap(1.0, 2.0, col.hair);
    c.fillStyle = col.accent;
    rr(c, -17, -72, 34, 7, 3);
    c.fill();
    c.stroke();
    disc(c, 0, -83, 5, col.accent, 2.5);
  } else {
    cap(1.06, 1.94, col.hair);
  }
  if (hat === 'headband') {
    c.fillStyle = col.accent;
    c.strokeStyle = INK;
    c.lineWidth = 2.5;
    rr(c, -17, -75, 34, 6, 2);
    c.fill();
    c.stroke();
    const w = Math.sin(time * 9) * 3;
    c.beginPath();
    c.moveTo(-16, -73);
    c.lineTo(-34, -70 + w);
    c.lineTo(-28, -66 + w);
    c.lineTo(-16, -68);
    c.closePath();
    c.fill();
    c.stroke();
  }
  if (hat === 'ponytail') {
    const sw = Math.sin(time * 6) * 3;
    disc(c, -20, -70, 6, col.hair, 2.5);
    c.fillStyle = col.hair;
    c.strokeStyle = INK;
    c.lineWidth = 2.5;
    c.beginPath();
    c.ellipse(-27, -58 + sw, 5, 11, 0.4 + sw * 0.03, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    disc(c, -17, -71, 3.2, col.accent, 2);
  }
  if (hat === 'bun') {
    disc(c, -3, -85, 7, col.hair, 2.5);
    disc(c, -3, -79, 2.4, col.accent, 1.8);
  }
  // yüz
  const m = P.mood;
  c.strokeStyle = INK;
  c.fillStyle = INK;
  c.lineWidth = 2.2;
  c.lineCap = 'round';
  const ex1 = 3, ex2 = 12, ey = -64;
  if (hat === 'glasses') {
    c.fillStyle = '#ffffffb0';
    c.lineWidth = 2;
    for (const ex of [ex1 + 0.5, ex2]) {
      c.beginPath();
      c.arc(ex, ey, 5.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.beginPath();
    c.moveTo(ex1 + 5.7, ey);
    c.lineTo(ex2 - 5.2, ey);
    c.stroke();
    c.fillStyle = INK;
  }
  if (m === 'hurt') {
    for (const ex of [ex1, ex2]) {
      c.beginPath();
      c.moveTo(ex - 3, ey - 3);
      c.lineTo(ex + 2.5, ey);
      c.lineTo(ex - 3, ey + 3);
      c.stroke();
    }
  } else if (m === 'ko') {
    for (const ex of [ex1, ex2]) {
      c.beginPath();
      c.moveTo(ex - 3, ey - 3);
      c.lineTo(ex + 3, ey + 3);
      c.moveTo(ex + 3, ey - 3);
      c.lineTo(ex - 3, ey + 3);
      c.stroke();
    }
  } else if (m === 'win' || m === 'calm') {
    for (const ex of [ex1, ex2]) {
      c.beginPath();
      c.arc(ex, ey + 2, 3, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    }
  } else {
    const blink = Math.sin(time * 1.7 + (f.slot || 0) * 2) > 0.985;
    for (const ex of [ex1, ex2]) {
      if (blink) {
        c.beginPath();
        c.moveTo(ex - 2.5, ey);
        c.lineTo(ex + 2.5, ey);
        c.stroke();
      } else {
        c.beginPath();
        c.arc(ex, ey, hat === 'glasses' ? 1.6 : 2.3, 0, Math.PI * 2);
        c.fill();
      }
    }
    if (m === 'fight' || m === 'atk' || m === 'block') {
      c.beginPath();
      c.moveTo(ex1 - 3.5, ey - 6.5);
      c.lineTo(ex1 + 3.5, ey - 3.5);
      c.moveTo(ex2 - 3.5, ey - 3.5);
      c.lineTo(ex2 + 3.5, ey - 6.5);
      c.stroke();
    }
  }
  // ağız
  if (m === 'atk') {
    c.beginPath();
    c.ellipse(9, -52, 3.4, 2.8, 0, 0, Math.PI * 2);
    c.fillStyle = '#7a2a2a';
    c.fill();
    c.stroke();
  } else if (m === 'hurt' || m === 'ko') {
    c.beginPath();
    c.ellipse(9, -52, 2.4, 3.2, 0, 0, Math.PI * 2);
    c.fillStyle = '#7a2a2a';
    c.fill();
    c.stroke();
  } else if (m === 'win') {
    c.beginPath();
    c.arc(9, -54, 4.5, 0.15, Math.PI - 0.15);
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(5, -52);
    c.lineTo(12, -52.5);
    c.stroke();
  }
}

// ——— ana çizim ———
export function drawFighter(c, f, time, o = {}) {
  const S = o.scale ?? 1.1;
  const face = o.face ?? f.face ?? 1;
  const col = f.ch.colors;
  const wk = f.ch.weapon;
  const P = poseOf(f, time);
  c.save();
  c.translate(o.x ?? 0, o.y ?? 0);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  c.scale(face * S, S);

  if (P.glow > 0) {
    const g = P.glow;
    c.fillStyle = col.accent;
    c.globalAlpha = (o.alpha ?? 1) * (0.18 + 0.16 * Math.sin(time * 24));
    c.beginPath();
    c.arc(0, -62, 60 + 60 * g, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = o.alpha ?? 1;
  }
  if (o.rage) {
    c.fillStyle = '#ff3b30';
    c.globalAlpha = (o.alpha ?? 1) * (0.14 + 0.08 * Math.sin(time * 14));
    c.beginPath();
    c.arc(0, -60, 62, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = o.alpha ?? 1;
  }

  if (P.rot) {
    c.translate(0, -12);
    c.rotate(P.rot);
    c.translate(0, 12);
  }
  const hipY = P.hipY + P.bob;

  // bacaklar
  const legs = [
    [-5, P.lb],
    [5, P.lf],
  ];
  for (const [x0, a] of legs) {
    const fx = x0 + LEG * Math.sin(a);
    const fy = Math.min(0, hipY + LEG * Math.cos(a));
    limb(c, x0, hipY, fx, fy, 10, col.dark);
    c.fillStyle = INK;
    c.beginPath();
    c.ellipse(fx + 3, fy, 8, 4.2, 0, 0, Math.PI * 2);
    c.fill();
  }

  c.save();
  c.translate(0, hipY);
  c.rotate(P.lean * D);

  // arka kol
  const shB = [-5, -38];
  let hb;
  if (wk === 'bow' && P.pull > 0) {
    hb = [ARM * Math.cos(P.af * D) + 5 - P.pull * 0.7 - 2, -38 + ARM * Math.sin(P.af * D)];
  } else {
    hb = [shB[0] + ARM * Math.cos(P.ab * D), shB[1] + ARM * Math.sin(P.ab * D)];
  }
  limb(c, shB[0], shB[1], hb[0], hb[1], 8, col.body);
  disc(c, hb[0], hb[1], 6, col.skin, 2.5);
  if (wk === 'spear' && !P.shield) {
    c.save();
    c.translate(hb[0] + 2, hb[1]);
    shield(c, f.ch, 17);
    c.restore();
  }

  // gövde
  c.fillStyle = col.body;
  c.strokeStyle = INK;
  c.lineWidth = 3;
  rr(c, -13, -46, 26, 50, 10);
  c.fill();
  c.stroke();
  c.strokeStyle = col.dark;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-12, -4);
  c.lineTo(12, -4);
  c.stroke();
  c.strokeStyle = col.accent;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-9, -36);
  c.lineTo(9, -14);
  c.stroke();

  head(c, f, P, time);

  // ön kol + silah
  const shF = [5, -38];
  const reach = ARM + P.ext;
  const hf = [shF[0] + reach * Math.cos(P.af * D), shF[1] + reach * Math.sin(P.af * D)];
  limb(c, shF[0], shF[1], hf[0], hf[1], 8, col.body);
  c.save();
  c.translate(hf[0], hf[1]);
  c.rotate(P.w * D);
  if (P.cup) wCup(c);
  else if (wk === 'sword') wSword(c, f.ch);
  else if (wk === 'hammer') wHammer(c, f.ch);
  else if (wk === 'staff') wStaff(c, f.ch);
  else if (wk === 'spear') wSpear(c, f.ch);
  else if (wk === 'bow') wBow(c, f.ch, P.pull);
  c.restore();
  disc(c, hf[0], hf[1], 6.5, col.skin, 2.5);
  if (P.shield && wk === 'spear') {
    c.save();
    c.translate(hf[0] + 12, hf[1] + 2);
    shield(c, f.ch, 24);
    c.restore();
  }
  c.restore();
  c.restore();
}

// Kılıç/sopa savurmalarının izi (dünya koordinatlarında).
export function drawSwoosh(c, f, o = {}) {
  const mv = f.mv;
  if (!mv || f.st !== 'atk') return;
  const S = o.scale ?? 1.1;
  const face = o.face ?? f.face ?? 1;
  const t = f.mvT;
  if (t < mv.su || t > mv.su + mv.ac + 0.07) return;
  const wk = f.ch.weapon;
  const u = clamp((t - mv.su) / mv.ac, 0, 1);
  const cx = (o.x ?? 0) + face * 5 * S;
  const cy = (o.y ?? 0) - 82 * S;
  const fade = t > mv.su + mv.ac ? 1 - (t - mv.su - mv.ac) / 0.07 : 1;
  c.save();
  c.globalAlpha = 0.65 * fade;
  c.strokeStyle = '#ffffff';
  c.lineCap = 'round';
  const sweeping = mv.kind === 'slash' || mv.kind === 'smash' || mv.kind === 'spin' || mv.kind === 'fin';
  if (sweeping && WLEN[wk] > 0) {
    const R = (ARM + WLEN[wk] * 0.78) * S;
    const th1 = lerp(mv.a0, mv.a1, u);
    const th0 = lerp(mv.a0, mv.a1, Math.max(0, u - 0.7));
    const map = (th) => (face === 1 ? th * D : Math.PI - th * D);
    const A = map(th0);
    const B = map(th1);
    c.lineWidth = 13 * S;
    c.beginPath();
    if (Math.abs(th1 - th0) * D >= Math.PI * 2) c.arc(cx, cy, R, 0, Math.PI * 2);
    else c.arc(cx, cy, R, Math.min(A, B), Math.max(A, B));
    c.stroke();
  } else if (mv.kind === 'thrust' || mv.kind === 'bash' || mv.kind === 'dash') {
    const reach = (mv.reach || 80) * 0.9;
    c.lineWidth = 4 * S;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo((o.x ?? 0) + face * (reach * 0.35), cy + i * 9 * S);
      c.lineTo((o.x ?? 0) + face * reach, cy + i * 9 * S);
      c.stroke();
    }
  }
  c.restore();
}

// Menüde karakter kutusu için.
export function drawPortrait(c, chId, time, x, y, scale = 1.4, st = 'idle') {
  const ch = CHARACTERS[chId];
  drawFighter(c, { ch, st, y: 0, x: 0, mv: null, mvT: 0, dT: 1, slot: 0, face: 1 }, time, { x, y, scale, face: 1 });
}
