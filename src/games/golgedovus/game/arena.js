// Arka planlar: gece dojosu, akşam çatısı, bambu ormanı. Mantıksal alan 800×450, zemin y=372.
const INK = '#141018';

function band(c, y0, y1, col) {
  c.fillStyle = col;
  c.fillRect(-700, y0, 2200, y1 - y0);
}
function stroke(c, w = 3) {
  c.strokeStyle = INK;
  c.lineWidth = w;
  c.lineJoin = 'round';
  c.stroke();
}
function floor(c, g, top, mid, lines) {
  c.fillStyle = top;
  c.fillRect(-700, g, 2200, 500);
  c.fillStyle = mid;
  c.fillRect(-700, g + 26, 2200, 500);
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-700, g);
  c.lineTo(1500, g);
  c.stroke();
  c.strokeStyle = lines;
  c.lineWidth = 2;
  c.beginPath();
  for (let x = -700; x < 1500; x += 70) {
    c.moveTo(x, g + 26);
    c.lineTo(x - 18, g + 120);
  }
  c.moveTo(-700, g + 26);
  c.lineTo(1500, g + 26);
  c.stroke();
}

function dojo(c, t, g) {
  band(c, -300, 120, '#241b40');
  band(c, 120, 230, '#33275a');
  band(c, 230, g, '#47356f');
  c.fillStyle = '#f6e7a8';
  for (let i = 0; i < 28; i++) {
    const x = ((i * 137) % 900) - 50;
    const y = ((i * 71) % 170) + 4;
    c.globalAlpha = 0.5 + 0.4 * Math.sin(t * 2 + i);
    c.fillRect(x, y, 2.4, 2.4);
  }
  c.globalAlpha = 1;
  c.beginPath();
  c.arc(620, 96, 40, 0, 7);
  c.fillStyle = '#f6e7a8';
  c.fill();
  stroke(c);
  c.fillStyle = '#e3d28f';
  for (const [x, y, r] of [[606, 88, 7], [634, 108, 5], [626, 80, 3.5]]) {
    c.beginPath();
    c.arc(x, y, r, 0, 7);
    c.fill();
  }
  c.beginPath();
  c.moveTo(-700, g - 60);
  c.lineTo(-700, 200);
  c.lineTo(-300, 240);
  c.lineTo(-40, 150);
  c.lineTo(140, 250);
  c.lineTo(330, 170);
  c.lineTo(520, 260);
  c.lineTo(700, 160);
  c.lineTo(900, 250);
  c.lineTo(1500, 190);
  c.lineTo(1500, g - 60);
  c.closePath();
  c.fillStyle = '#2d2350';
  c.fill();
  stroke(c);
  c.beginPath();
  c.moveTo(-700, g);
  c.lineTo(-700, 300);
  c.quadraticCurveTo(-200, 270, 100, 300);
  c.quadraticCurveTo(400, 270, 700, 300);
  c.quadraticCurveTo(1100, 270, 1500, 300);
  c.lineTo(1500, g);
  c.closePath();
  c.fillStyle = '#251c42';
  c.fill();
  stroke(c);
  // pagoda
  for (let i = 0; i < 3; i++) {
    const w = 120 - i * 28;
    const y = 280 - i * 44;
    c.beginPath();
    c.moveTo(130 - w / 2 - 14, y);
    c.lineTo(130 + w / 2 + 14, y);
    c.lineTo(130 + w / 2 - 4, y - 18);
    c.lineTo(130 - w / 2 + 4, y - 18);
    c.closePath();
    c.fillStyle = '#4a1f33';
    c.fill();
    stroke(c, 2.5);
    c.fillStyle = '#1b1432';
    c.fillRect(130 - w / 2 + 10, y, w - 20, 26);
    c.strokeRect(130 - w / 2 + 10, y, w - 20, 26);
  }
  c.beginPath();
  c.moveTo(130, 172);
  c.lineTo(130, 150);
  stroke(c);
  // fenerler
  for (const lx of [40, 760]) {
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(lx, -40);
    c.lineTo(lx, 70);
    c.stroke();
    c.fillStyle = 'rgba(255,190,80,' + (0.16 + 0.05 * Math.sin(t * 7 + lx)) + ')';
    c.beginPath();
    c.arc(lx, 92, 46, 0, 7);
    c.fill();
    c.beginPath();
    c.ellipse(lx, 92, 17, 22, 0, 0, 7);
    c.fillStyle = '#e0675a';
    c.fill();
    stroke(c);
    c.strokeStyle = '#ffd166';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(lx - 11, 84);
    c.lineTo(lx + 11, 84);
    c.moveTo(lx - 12, 100);
    c.lineTo(lx + 12, 100);
    c.stroke();
  }
  floor(c, g, '#7a5a42', '#5e4331', 'rgba(20,16,24,0.45)');
}

function cati(c, t, g) {
  band(c, -300, 110, '#6d4a8f');
  band(c, 110, 200, '#c8667f');
  band(c, 200, 290, '#f2a35e');
  band(c, 290, g, '#f6c77a');
  c.beginPath();
  c.arc(250, 270, 56, 0, 7);
  c.fillStyle = '#ffe9a0';
  c.fill();
  stroke(c);
  const skyline = (seed, base, hmin, hmax, col, win) => {
    let x = -300;
    let i = 0;
    while (x < 1200) {
      const w = 60 + ((i * seed) % 50);
      const h = hmin + ((i * seed * 7) % (hmax - hmin));
      c.fillStyle = col;
      c.fillRect(x, base - h, w, h + 40);
      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.strokeRect(x, base - h, w, h + 40);
      if (win) {
        c.fillStyle = '#ffe9a0';
        for (let wy = base - h + 12; wy < base - 10; wy += 22) {
          for (let wx = x + 9; wx < x + w - 12; wx += 18) {
            if ((wx * 3 + wy * 5 + i) % 7 < 3) c.fillRect(wx, wy, 8, 11);
          }
        }
      }
      x += w + 6;
      i++;
    }
  };
  skyline(13, 320, 60, 150, '#7b4a76', false);
  skyline(17, 350, 40, 120, '#4a2f5d', true);
  // su deposu ve anten
  c.fillStyle = '#8d6b4a';
  c.fillRect(640, 262, 70, 54);
  c.strokeRect(640, 262, 70, 54);
  c.beginPath();
  c.moveTo(634, 262);
  c.lineTo(675, 238);
  c.lineTo(716, 262);
  c.closePath();
  c.fillStyle = '#6b4f3a';
  c.fill();
  stroke(c);
  c.beginPath();
  c.moveTo(120, 330);
  c.lineTo(120, 220);
  c.moveTo(100, 244);
  c.lineTo(140, 244);
  c.moveTo(106, 262);
  c.lineTo(134, 262);
  stroke(c, 3);
  // çatı
  floor(c, g, '#8e8499', '#6e6478', 'rgba(20,16,24,0.4)');
  c.fillStyle = '#b8b0c4';
  c.fillRect(-700, g - 8, 2200, 8);
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.strokeRect(-700, g - 8, 2200, 8);
}

function bambu(c, t, g) {
  band(c, -300, 160, '#a9d9c0');
  band(c, 160, 280, '#c9ecd0');
  band(c, 280, g, '#e3f5d8');
  c.fillStyle = 'rgba(255,255,255,0.55)';
  for (const [x, y, w] of [[80, 250, 220], [420, 220, 260], [700, 270, 180]]) {
    c.beginPath();
    c.ellipse(x + Math.sin(t * 0.3 + x) * 14, y, w / 2, 22, 0, 0, 7);
    c.fill();
  }
  const stalk = (x, w, col, h0) => {
    const sway = Math.sin(t * 0.8 + x * 0.05) * 5;
    c.fillStyle = col;
    c.fillRect(x + sway * 0.2, h0, w, g - h0 + 4);
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.strokeRect(x + sway * 0.2, h0, w, g - h0 + 4);
    for (let y = g - 54; y > h0; y -= 58) {
      c.fillStyle = '#3e8f4a';
      c.fillRect(x + sway * 0.2 - 3, y, w + 6, 7);
      c.strokeRect(x + sway * 0.2 - 3, y, w + 6, 7);
    }
    c.fillStyle = '#5fbf6a';
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.ellipse(x + w / 2 + sway + (k - 1) * 20, h0 + 10 + k * 14, 22, 7, k * 0.5 - 0.5, 0, 7);
      c.fill();
      stroke(c, 2);
    }
  };
  for (const x of [-60, 40, 150, 560, 660, 770, 860]) stalk(x, 22, '#7fcf86', -100);
  for (const x of [0, 100, 600, 720, 820]) stalk(x, 16, '#9be0a0', -60);
  floor(c, g, '#8f6f4a', '#6e5438', 'rgba(20,16,24,0.4)');
  c.fillStyle = '#5fa84f';
  c.fillRect(-700, g - 6, 2200, 8);
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.strokeRect(-700, g - 6, 2200, 8);
}

export const ARENAS = {
  dojo: { name: 'Gece Dojosu', draw: dojo },
  cati: { name: 'Akşam Çatısı', draw: cati },
  bambu: { name: 'Bambu Ormanı', draw: bambu },
};
export function drawArena(c, kind, t, ground) {
  (ARENAS[kind] || ARENAS.dojo).draw(c, t, ground);
}
