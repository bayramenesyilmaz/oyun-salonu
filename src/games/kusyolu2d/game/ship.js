// Leylek'in çizimi (yan görünüş). stage: 0 iskelet · 1 saclar · 2 çanak · 3 motor · 4 tam
import { INK, glow, rr } from './draw.js';

export function drawLeylek(x, cx, base, stage, t, o = {}) {
  const s = o.scale || 1;
  x.save();
  x.translate(cx, base);
  x.scale(s, s);
  if (o.rot) x.rotate(o.rot);
  x.lineJoin = 'round';
  const S = typeof stage === 'object' ? stage : { hull: stage >= 1, dish: stage >= 2, core: stage >= 3 };
  x.strokeStyle = INK;
  x.lineWidth = 6;
  const W = 620,
    H = 230;
  // gövde (dikey duran gemiyi yatay çiziyoruz: burun sağda)
  const hull = () => {
    x.beginPath();
    x.moveTo(-W / 2, -H + 40);
    x.lineTo(W / 2 - 120, -H + 30);
    x.quadraticCurveTo(W / 2 + 40, -H / 2, W / 2 - 120, -30);
    x.lineTo(-W / 2, -40);
    x.closePath();
  };
  // ayaklar
  if (!o.noLegs) {
    x.lineWidth = 8;
    for (const lx of [-W / 2 + 60, W / 2 - 200]) {
      x.beginPath();
      x.moveTo(lx, -50);
      x.lineTo(lx - 40, 0);
      x.moveTo(lx + 10, -50);
      x.lineTo(lx + 50, 0);
      x.stroke();
      x.fillStyle = '#555';
      rr(x, lx - 60, -8, 40, 8, 3);
      x.fill();
      rr(x, lx + 30, -8, 40, 8, 3);
      x.fill();
    }
    x.lineWidth = 6;
  }
  if (!S.hull) {
    // iskelet: kaburgalar
    x.strokeStyle = '#8a8a90';
    x.lineWidth = 8;
    hull();
    x.stroke();
    for (let i = 0; i < 8; i++) {
      const X = -W / 2 + 40 + i * 62;
      x.beginPath();
      x.moveTo(X, -H + 36);
      x.lineTo(X, -42);
      x.stroke();
    }
    x.strokeStyle = INK;
  } else {
    x.fillStyle = '#c8c0b0';
    hull();
    x.fill();
    x.stroke();
    // yamalı saclar
    const cols = ['#b8b0a0', '#a8a090', '#d0c8b8', '#9aa0a8'];
    x.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      x.fillStyle = cols[i % 4];
      const X = -W / 2 + 10 + i * 55;
      rr(x, X, -H + 46 + (i % 2) * 8, 50, H - 96, 4);
      x.fill();
      x.stroke();
    }
    // perçinler
    x.fillStyle = '#6a6460';
    for (let i = 0; i < 20; i++) {
      x.beginPath();
      x.arc(-W / 2 + 20 + i * 24, -H + 52, 2.5, 0, 7);
      x.fill();
    }
    x.lineWidth = 6;
    hull();
    x.stroke();
    // yazı
    x.fillStyle = '#c63a34';
    x.font = '900 44px Onest, system-ui, sans-serif';
    x.fillText('LEYLEK', -150, -100);
    x.fillStyle = INK;
    x.font = '700 16px Onest, system-ui, sans-serif';
    x.fillText('KIZILKAYA · TC-KSY-1', -146, -76);
  }
  // kokpit camı
  x.fillStyle = S.hull ? '#8ac8ff' : 'rgba(138,200,255,0.25)';
  x.beginPath();
  x.moveTo(W / 2 - 160, -H + 40);
  x.quadraticCurveTo(W / 2 - 20, -H + 60, W / 2 - 40, -H / 2 - 10);
  x.lineTo(W / 2 - 150, -H / 2 - 10);
  x.closePath();
  x.fill();
  x.stroke();
  if (o.lit) glow(x, W / 2 - 100, -H / 2 - 40, 90, '#ffe2a0', 0.4);
  // çanak anten
  if (S.dish) {
    x.save();
    x.translate(-60, -H + 34);
    x.fillStyle = '#e8e8ec';
    x.beginPath();
    x.moveTo(-50, -70);
    x.quadraticCurveTo(-60, -10, 0, 0);
    x.quadraticCurveTo(-10, -40, -50, -70);
    x.fill();
    x.stroke();
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(-20, -24);
    x.lineTo(16, -54);
    x.moveTo(0, 0);
    x.lineTo(4, 10);
    x.stroke();
    x.restore();
  }
  // motor
  x.fillStyle = '#5a5458';
  rr(x, -W / 2 - 50, -H + 60, 60, H - 120, 8);
  x.fill();
  x.stroke();
  rr(x, -W / 2 - 80, -H + 80, 34, H - 160, 6);
  x.fill();
  x.stroke();
  if (S.core) {
    // jeneratör + Kor ışığı
    const p = 0.6 + 0.4 * Math.sin(t * 4);
    glow(x, -W / 2 + 70, -H / 2 - 10, 80, '#7affc8', 0.5 * p);
    x.fillStyle = '#9effd8';
    x.beginPath();
    x.arc(-W / 2 + 70, -H / 2 - 10, 14, 0, 7);
    x.fill();
    x.stroke();
  }
  if (o.flame) {
    const f = o.flame;
    for (let i = 0; i < 6; i++) {
      x.globalAlpha = (0.7 - i * 0.1) * f;
      x.fillStyle = i < 2 ? '#fff2c0' : '#ffb050';
      x.beginPath();
      x.ellipse(-W / 2 - 100 - i * 40 * f, -H / 2 + (Math.random() - 0.5) * 8, 40 * f, 28 - i * 3, 0, 0, 7);
      x.fill();
    }
    x.globalAlpha = 1;
    glow(x, -W / 2 - 130, -H / 2, 200 * f, '#ff9a40', 0.6);
  }
  x.restore();
}
