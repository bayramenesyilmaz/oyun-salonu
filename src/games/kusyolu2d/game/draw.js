// Kuşyolu 2D — çizgi film tarzı karakter ve yardımcı çizimler (tamamen kodla çizilir, dış görsel yok).

export const INK = '#141018';

export const STYLES = {
  arda: { top: '#c8402e', hair: '#3a2416', leg: '#2c2c44' },
  kaan: { top: '#2e5ac8', hair: '#2a1a10', cap: '#d23a2a', leg: '#30324a' },
  elif: { top: '#a8642e', hair: '#f0cc6a', pony: true, leg: '#3a3048', skin: '#f6cfac' },
  mert: { top: '#5b7a3a', hair: '#4a2c18', glasses: true, leg: '#2c2a26', big: 1.06 },
  zeynep: { top: '#2a2c3a', hair: '#1a1010', pony: true, long: true, leg: '#4a2a3a', skin: '#e9b98f' },
  nevin: { top: '#7a4a8a', hair: '#d86aa0', scarf: true, leg: '#5a3a5a', skin: '#efc29c', old: true, big: 1.02 },
  hayri: { top: '#7a6a52', hair: '#cfcfcf', leg: '#3a342c', skin: '#e3ad84', old: true, mustache: true, big: 1.04 },
  cocuk: { top: '#e8b62a', hair: '#3a2416', leg: '#2a4a8a', small: 0.72 },
};

export function rr(x, X, Y, w, h, r) {
  x.beginPath();
  x.roundRect(X, Y, w, h, r);
}

export function glow(x, cx, cy, rad, col, a = 0.5) {
  if (a <= 0 || rad <= 0) return;
  const q = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
  q.addColorStop(0, col);
  q.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalAlpha = a;
  x.fillStyle = q;
  x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  x.globalAlpha = 1;
}

function shape(x, f, fill) {
  x.fillStyle = fill;
  x.beginPath();
  f();
  x.fill();
  x.stroke();
}

// Bir uzvu kalçadan/omuzdan döndürerek çiz
function limb(x, px, py, ang, w, h, fill, footCol) {
  x.save();
  x.translate(px, py);
  x.rotate(ang);
  shape(x, () => x.roundRect(-w / 2, 0, w, h, w / 2), fill);
  if (footCol) shape(x, () => x.roundRect(-w / 2 - 1, h - 10, w + 9, 12, 6), footCol);
  x.restore();
}

// a: { x, y (ayak tabanı), dir, walk (faz), moving, sit, crouch, talk, t, hold, look (-1..1 baş eğimi), id }
export function drawChar(x, a) {
  const st = STYLES[a.style || a.id] || STYLES.arda;
  const skin = st.skin || '#f2c39a';
  const s = (st.big || 1) * (st.small || 1) * (a.scale || 1);
  const t = a.t || 0;
  x.save();
  x.translate(a.x, a.y);
  x.scale(a.dir < 0 ? -s : s, s);
  x.lineWidth = 5;
  x.strokeStyle = INK;
  x.lineJoin = 'round';

  // gölge
  x.fillStyle = 'rgba(0,0,0,0.28)';
  x.beginPath();
  x.ellipse(0, 0, 34, 7, 0, 0, Math.PI * 2);
  x.fill();

  const sw = a.moving ? Math.sin(a.walk || 0) : 0;
  const bob = a.moving ? Math.abs(Math.cos(a.walk || 0)) * 5 : Math.sin(t * 2.2) * 1.2;
  const crouch = a.crouch ? 34 : 0;
  const hipY = a.sit ? -60 : -56 + crouch - bob * 0.3;

  // bacaklar
  if (a.sit) {
    shape(x, () => x.roundRect(-20, -66, 48, 22, 10), st.leg);
    limb(x, 18, -50, 0, 18, 50, st.leg, INK);
  } else if (a.crouch) {
    limb(x, -6, hipY, -0.9, 17, 40, st.leg, INK);
    limb(x, 8, hipY, 0.9, 17, 40, st.leg, INK);
  } else {
    limb(x, -6, hipY, sw * 0.55, 17, 56, st.leg, INK);
    limb(x, 6, hipY, -sw * 0.55, 17, 56, st.leg, INK);
  }

  const by = hipY - 2 - bob;
  // arka kol
  limb(x, -6, by - 50, -sw * 0.6 + (a.crouch ? 0.5 : 0.08), 14, 44, st.top);
  // gövde
  shape(x, () => x.roundRect(-24, by - 58, 48, 62, 16), st.top);
  if (st.scarf) shape(x, () => x.roundRect(-26, by - 62, 52, 14, 7), st.hair);
  // ön kol (tutuyorsa öne uzat)
  const hold = a.hold;
  const armA = hold ? -1.25 : sw * 0.6 + (a.crouch ? -0.6 : -0.08);
  limb(x, 8, by - 50, armA, 15, 44, st.top);
  if (hold) {
    const hx = 8 + Math.sin(-armA) * 44,
      hy = by - 50 + Math.cos(armA) * 44;
    x.fillStyle = skin;
    x.beginPath();
    x.arc(hx, hy, 8, 0, Math.PI * 2);
    x.fill();
    x.stroke();
    if (hold === 'cay') {
      x.lineWidth = 3;
      shape(x, () => x.roundRect(hx - 6, hy - 26, 13, 22, 3), 'rgba(255,245,235,0.9)');
      x.fillStyle = '#b4541c';
      x.fillRect(hx - 3, hy - 18, 8, 12);
      x.lineWidth = 5;
    } else if (hold === 'kor') {
      const p = 0.6 + 0.4 * Math.sin(t * 4);
      x.restore();
      x.save();
      // parıltıyı dünyaya göre çiz (aynalama yok)
      const wx = a.x + (a.dir < 0 ? -hx : hx) * s,
        wy = a.y + (hy - 12) * s;
      glow(x, wx, wy, 70 * p + 30, '#7affc8', 0.6);
      x.fillStyle = '#9effd8';
      x.strokeStyle = INK;
      x.lineWidth = 4;
      x.beginPath();
      x.ellipse(wx, wy, 13 * s, 10 * s, 0.4, 0, Math.PI * 2);
      x.fill();
      x.stroke();
      x.translate(a.x, a.y);
      x.scale(a.dir < 0 ? -s : s, s);
      x.lineWidth = 5;
      x.strokeStyle = INK;
    } else if (hold === 'telefon') {
      shape(x, () => x.roundRect(hx - 4, hy - 22, 12, 20, 3), '#22252e');
      glow(x, hx + 2, hy - 12, 16, '#9fd0ff', 0.6);
    }
  } else {
    // el
    const hx = 8 + Math.sin(-armA) * 44,
      hy = by - 50 + Math.cos(armA) * 44;
    x.fillStyle = skin;
    x.beginPath();
    x.arc(hx, hy, 7, 0, Math.PI * 2);
    x.fill();
    x.stroke();
  }

  // baş
  const look = a.look || 0;
  const hy = by - 58 - 40 + (a.crouch ? 4 : 0);
  x.save();
  x.translate(0, hy);
  x.rotate(-look * 0.25);
  if (st.pony) shape(x, () => x.ellipse(-44, st.long ? 18 : 8, 14, st.long ? 34 : 24, 0.45 + Math.sin(t * 3) * 0.05, 0, Math.PI * 2), st.hair);
  shape(x, () => x.ellipse(0, 0, 44, 46, 0, 0, Math.PI * 2), skin);
  // saç
  if (!st.cap) {
    shape(
      x,
      () => {
        x.moveTo(-44, 4);
        x.quadraticCurveTo(-46, -52, 6, -48);
        x.quadraticCurveTo(44, -44, 44, -12);
        x.quadraticCurveTo(10, -26, -14, -16);
        x.quadraticCurveTo(-26, -4, -44, 4);
      },
      st.hair,
    );
  } else {
    shape(
      x,
      () => {
        x.moveTo(-46, -8);
        x.quadraticCurveTo(-40, -58, 10, -52);
        x.quadraticCurveTo(44, -44, 46, -14);
        x.closePath();
      },
      st.cap,
    );
    shape(x, () => x.roundRect(30, -20, 40, 10, 5), st.cap);
  }
  // kulak
  shape(x, () => x.ellipse(-12, 6, 7, 10, 0, 0, Math.PI * 2), skin);
  // göz
  const blink = (t + (a.seed || 0)) % 3.7 < 0.12;
  if (blink) {
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(11, -2);
    x.lineTo(30, -2);
    x.stroke();
  } else {
    x.fillStyle = '#fff';
    x.beginPath();
    x.ellipse(20, -2, 10, 13, 0, 0, Math.PI * 2);
    x.fill();
    x.stroke();
    x.fillStyle = INK;
    x.beginPath();
    x.arc(24, -2 - look * 5, 5, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(26, -5 - look * 5, 2, 0, Math.PI * 2);
    x.fill();
  }
  // kaş
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(10, -20 - (a.surprise ? 6 : 0));
  x.lineTo(30, -22 - (a.surprise ? 8 : 0));
  x.stroke();
  if (st.glasses) {
    x.beginPath();
    x.arc(20, -2, 15, 0, Math.PI * 2);
    x.stroke();
    x.beginPath();
    x.moveTo(5, -4);
    x.lineTo(-18, -6);
    x.stroke();
  }
  if (st.mustache) {
    x.fillStyle = st.hair;
    x.beginPath();
    x.ellipse(32, 14, 12, 5, 0.1, 0, Math.PI * 2);
    x.fill();
    x.stroke();
  }
  if (st.old) {
    x.lineWidth = 2.5;
    x.beginPath();
    x.arc(20, 12, 8, 0.3, 1.2);
    x.stroke();
  }
  // ağız
  x.lineWidth = 4;
  if (a.talk) {
    const o = 3 + Math.abs(Math.sin(t * 14)) * 7;
    x.fillStyle = '#6a2020';
    x.beginPath();
    x.ellipse(28, 22, 8, o, 0, 0, Math.PI * 2);
    x.fill();
    x.stroke();
  } else if (a.surprise) {
    x.fillStyle = '#6a2020';
    x.beginPath();
    x.ellipse(28, 22, 6, 8, 0, 0, Math.PI * 2);
    x.fill();
    x.stroke();
  } else {
    x.beginPath();
    x.arc(26, 18, 8, 0.2, 1.6);
    x.stroke();
  }
  x.restore();
  x.restore();
}

// Ekranda konuşma balonu / etkileşim ipucu
export function bubbleHint(x, X, Y, text, t) {
  x.font = '600 22px Onest, system-ui, sans-serif';
  const w = x.measureText(text).width + 34;
  const yy = Y + Math.sin(t * 3) * 4;
  x.fillStyle = 'rgba(12,14,30,0.85)';
  rr(x, X - w / 2, yy - 40, w, 40, 20);
  x.fill();
  x.strokeStyle = '#ffd27a';
  x.lineWidth = 2;
  x.stroke();
  x.fillStyle = '#ffe6b0';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, X, yy - 20);
  x.textAlign = 'left';
  x.textBaseline = 'alphabetic';
}

export function rng(seed) {
  let s = seed || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
