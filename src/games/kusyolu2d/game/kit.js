// Sokak sahneleri için ortak çizim parçaları
import { INK, glow, rr } from './draw.js';

export function fronts(x, list, groundY = 610) {
  for (const f of list) {
    const [bx, bw, col] = f;
    const top = f[3] ?? 180 + ((bx * 7) % 90);
    x.fillStyle = col;
    x.strokeStyle = INK;
    x.lineWidth = 5;
    rr(x, bx + 6, top, bw - 12, groundY - top + 10, 4);
    x.fill();
    x.stroke();
    for (let yy = top + 30; yy < groundY - 180; yy += 100)
      for (let xx = bx + 40; xx < bx + bw - 80; xx += 110) {
        const on = ((xx * 13 + yy * 7) % 10) / 10 < (f.lit ?? 0.4);
        x.fillStyle = on ? '#ffd890' : '#2a3150';
        rr(x, xx, yy, 60, 70, 4);
        x.fill();
        x.stroke();
        if (on) glow(x, xx + 30, yy + 35, 70, '#ffc070', 0.22);
        x.fillStyle = 'rgba(0,0,0,0.25)';
        x.fillRect(xx - 6, yy + 70, 72, 8);
      }
  }
}

export function sidewalk(x, w, y = 606) {
  x.fillStyle = '#9a9490';
  x.fillRect(-20, y, w + 40, 40);
  x.strokeStyle = INK;
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(-20, y);
  x.lineTo(w + 20, y);
  x.stroke();
  x.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < w; i += 70) x.fillRect(i, y + 4, 3, 34);
}

export function road(x, w, y = 646) {
  x.fillStyle = '#2a2c34';
  x.fillRect(-20, y, w + 40, 120);
  x.fillStyle = '#d8d4c0';
  for (let i = 0; i < w; i += 160) x.fillRect(i, y + 44, 80, 6);
}

export function lamp(x, lx, p = 1) {
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
    x.globalAlpha = 0.14;
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
}

export function car(x, cx, col = '#d8a030', y = 690, police = false, t = 0) {
  x.strokeStyle = INK;
  x.lineWidth = 5;
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(cx, y);
  x.lineTo(cx, y - 50);
  x.quadraticCurveTo(cx + 40, y - 60, cx + 70, y - 90);
  x.lineTo(cx + 200, y - 94);
  x.quadraticCurveTo(cx + 240, y - 64, cx + 290, y - 54);
  x.lineTo(cx + 296, y);
  x.closePath();
  x.fill();
  x.stroke();
  x.fillStyle = '#9ac0e0';
  x.beginPath();
  x.moveTo(cx + 80, y - 82);
  x.lineTo(cx + 190, y - 84);
  x.lineTo(cx + 218, y - 58);
  x.lineTo(cx + 60, y - 56);
  x.closePath();
  x.fill();
  x.stroke();
  if (police) {
    x.fillStyle = '#1a2a6a';
    x.fillRect(cx + 4, y - 40, 290, 16);
    x.fillStyle = '#fff';
    x.font = '800 14px Onest, system-ui, sans-serif';
    x.fillText('POLİS', cx + 120, y - 27);
    const s = Math.sin(t * 9) > 0;
    x.fillStyle = s ? '#ff3030' : '#3060ff';
    rr(x, cx + 120, y - 108, 50, 14, 4);
    x.fill();
    x.stroke();
    glow(x, cx + 145, y - 100, 160, s ? '#ff3030' : '#3060ff', 0.45);
  }
  x.fillStyle = '#1a1a1a';
  for (const wx of [cx + 60, cx + 236]) {
    x.beginPath();
    x.arc(wx, y, 26, 0, 7);
    x.fill();
    x.stroke();
    x.fillStyle = '#888';
    x.beginPath();
    x.arc(wx, y, 10, 0, 7);
    x.fill();
    x.fillStyle = '#1a1a1a';
  }
}

export function dumpster(x, dx, y = 612, col = '#3a6a4a') {
  x.strokeStyle = INK;
  x.lineWidth = 5;
  x.fillStyle = col;
  rr(x, dx, y - 120, 150, 120, 6);
  x.fill();
  x.stroke();
  x.fillStyle = 'rgba(0,0,0,0.25)';
  rr(x, dx - 6, y - 132, 162, 18, 5);
  x.fill();
  x.stroke();
  x.fillStyle = '#222';
  for (const wx of [dx + 24, dx + 126]) {
    x.beginPath();
    x.arc(wx, y, 9, 0, 7);
    x.fill();
  }
}

export function crates(x, cx, y = 612) {
  x.strokeStyle = INK;
  x.lineWidth = 4;
  const box = (bx, by, w, h) => {
    x.fillStyle = '#9a7048';
    rr(x, bx, by, w, h, 3);
    x.fill();
    x.stroke();
    x.beginPath();
    x.moveTo(bx, by);
    x.lineTo(bx + w, by + h);
    x.moveTo(bx + w, by);
    x.lineTo(bx, by + h);
    x.stroke();
  };
  box(cx, y - 80, 80, 80);
  box(cx + 84, y - 70, 70, 70);
  box(cx + 30, y - 150, 70, 70);
}

// el feneri ışığı (yan görünüş)
export function flashlight(x, gx, gy, dir, range, a = 0.22, col = '#fff4c0') {
  const g = x.createLinearGradient(gx, 0, gx + dir * range, 0);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(255,244,192,0)');
  x.globalAlpha = a;
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(gx, gy);
  x.lineTo(gx + dir * range, gy - 120);
  x.lineTo(gx + dir * range, gy + 130);
  x.closePath();
  x.fill();
  x.globalAlpha = 1;
}
