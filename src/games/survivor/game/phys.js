// Ortak fizik: kapsül benzeri oyuncu gövdesi (kutular + zemin fonksiyonu), top fiziği.
export const EYE = 1.62, PH = 1.8, PR = 0.38, GRAV = 30, JUMP = 10.2, WALK = 7.2, STEP = 0.5;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const TAU = Math.PI * 2;
export const angDiff = (a, b) => ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

// p: {x,y,z,vx,vy,vz,ground,on}; rd: {solids:[{x0,x1,y0,y1,z0,z1,mx,mz}], floorAt?(x,z)}
export function moveBody(p, dt, rd) {
  const S = rd.solids || [];
  // yatay: eksen eksen, basamak çıkma
  for (const ax of ['x', 'z']) {
    const d = (ax === 'x' ? p.vx : p.vz) * dt;
    if (!d) continue;
    const nx = ax === 'x' ? p.x + d : p.x, nz = ax === 'z' ? p.z + d : p.z;
    let blocked = false, lift = p.y;
    for (const b of S) {
      if (nx + PR > b.x0 && nx - PR < b.x1 && nz + PR > b.z0 && nz - PR < b.z1 && p.y < b.y1 - 0.001 && p.y + PH > b.y0 + 0.001) {
        if (b.y1 - p.y <= STEP && p.vy <= 0.5 && !b.wall) lift = Math.max(lift, b.y1);
        else { blocked = true; break; }
      }
    }
    if (blocked) { if (ax === 'x') p.vx = 0; else p.vz = 0; } else { if (ax === 'x') p.x = nx; else p.z = nz; if (lift > p.y) { p.y = lift; } }
  }
  // dikey
  p.vy -= GRAV * dt;
  const ny0 = p.y + p.vy * dt;
  let ny = ny0, top = -Infinity, on = null;
  const fl = rd.floorAt ? rd.floorAt(p.x, p.z) : null;
  if (fl != null && p.y >= fl - 0.2 && ny <= fl) top = fl;
  for (const b of S) {
    if (p.x + PR * 0.7 > b.x0 && p.x - PR * 0.7 < b.x1 && p.z + PR * 0.7 > b.z0 && p.z - PR * 0.7 < b.z1) {
      if (p.y >= b.y1 - 0.2 && ny <= b.y1 && b.y1 > top) { top = b.y1; on = b; }
    }
  }
  p.ground = false; p.on = null;
  if (p.vy <= 0 && top > -Infinity) { ny = top; p.vy = 0; p.ground = true; p.on = on; }
  else if (p.vy > 0) {
    for (const b of S) if (p.x + PR * 0.7 > b.x0 && p.x - PR * 0.7 < b.x1 && p.z + PR * 0.7 > b.z0 && p.z - PR * 0.7 < b.z1 && p.y + PH <= b.y0 + 0.1 && ny + PH > b.y0) { ny = b.y0 - PH; p.vy = 0; }
  }
  p.y = ny;
  if (p.on && (p.on.mx || p.on.mz)) { p.x += (p.on.mx || 0) * dt; p.z += (p.on.mz || 0) * dt; }
}

// Oyuncu hareketi: inp {wx,wz (dünya yönü, 0..1), jump}; kontrol kaybı (stun) varsa yok sayılır.
export function drive(p, inp, dt, rd, o = {}) {
  const speed = (o.speed || WALK) * (p.slow || 1);
  const ctl = !(p.stun > 0);
  if (p.stun > 0) p.stun -= dt;
  const acc = p.ground ? (o.acc || 14) : (o.air || 5);
  const tx = ctl ? inp.wx * speed : p.vx, tz = ctl ? inp.wz * speed : p.vz;
  if (ctl) { const k = Math.min(1, acc * dt); p.vx += (tx - p.vx) * k; p.vz += (tz - p.vz) * k; }
  else if (p.ground) { const f = Math.max(0, 1 - 2.2 * dt); p.vx *= f; p.vz *= f; }
  if (ctl && inp.jump && p.ground) { p.vy = o.jump || JUMP; p.ground = false; p.jumped = true; }
  const wasGround = p.ground;
  moveBody(p, dt, rd);
  p.landed = !wasGround && p.ground;
  p.sp = Math.hypot(p.vx, p.vz);
}

// ---- top fiziği ----
export class Ball {
  constructor(o) { Object.assign(this, { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0.25, g: 18, life: 12, owner: null, lane: 0, rest: 0.45, fric: 0.75, dead: false, free: false }, o); }
  step(dt, rd) {
    this.life -= dt;
    this.vy -= this.g * dt;
    const dr = 1;
    this.vx *= dr; this.vz *= dr;
    this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
    const fl = rd.floorAt ? rd.floorAt(this.x, this.z) : 0;
    if (fl != null && this.y < fl + this.r) {
      this.y = fl + this.r;
      if (this.vy < -1.2) { this.vy = -this.vy * this.rest; this.vx *= this.fric; this.vz *= this.fric; } else { this.vy = 0; const f = Math.max(0, 1 - 2.2 * dt); this.vx *= f; this.vz *= f; }
    }
    for (const b of rd.solids || []) {
      if (this.x + this.r > b.x0 && this.x - this.r < b.x1 && this.z + this.r > b.z0 && this.z - this.r < b.z1 && this.y + this.r > b.y0 && this.y - this.r < b.y1) {
        const dx = Math.min(this.x + this.r - b.x0, b.x1 - (this.x - this.r)), dz = Math.min(this.z + this.r - b.z0, b.z1 - (this.z - this.r)), dy = Math.min(this.y + this.r - b.y0, b.y1 - (this.y - this.r));
        const m = Math.min(dx, dz, dy);
        if (m === dy) { if (this.y > (b.y0 + b.y1) / 2) { this.y = b.y1 + this.r; if (this.vy < 0) this.vy *= -this.rest; } else { this.y = b.y0 - this.r; if (this.vy > 0) this.vy *= -this.rest; } }
        else if (m === dx) { const left = this.x < (b.x0 + b.x1) / 2; this.x = left ? b.x0 - this.r : b.x1 + this.r; this.vx *= -this.rest; }
        else { const back = this.z < (b.z0 + b.z1) / 2; this.z = back ? b.z0 - this.r : b.z1 + this.r; this.vz *= -this.rest; }
      }
    }
    if (this.life <= 0 || this.y < -30) this.dead = true;
  }
}
// verilen hız ve açıyla topun gideceği yol (önizleme)
export function arc(o, v, g, n = 26, dt = 0.08) {
  const pts = []; let x = o[0], y = o[1], z = o[2], vx = v[0], vy = v[1], vz = v[2];
  for (let i = 0; i < n; i++) { vy -= g * dt; x += vx * dt; y += vy * dt; z += vz * dt; if (y < 0) break; pts.push([x, y, z]); }
  return pts;
}

// (x,z) noktasında, y'nin biraz üstüne kadar olan en yüksek zemin (yoksa null)
export function surface(rd, x, z, y, up = 0.6) {
  let top = null;
  const fl = rd.floorAt ? rd.floorAt(x, z) : null;
  if (fl != null && fl <= y + up) top = fl;
  for (const b of rd.solids || []) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.y1 <= y + up && (top == null || b.y1 > top)) top = b.y1;
  return top;
}
// başlangıç hızı + hedefe düşük açılı atış çözümü: [vx,vy,vz]
export function solveShot(o, t, speed, g) {
  const dx = t[0] - o[0], dz = t[2] - o[2], dy = t[1] - o[1], d = Math.hypot(dx, dz) || 0.001;
  const v2 = speed * speed, disc = v2 * v2 - g * (g * d * d + 2 * dy * v2);
  const th = disc >= 0 ? Math.atan2(v2 - Math.sqrt(disc), g * d) : Math.PI / 4;
  const c = Math.cos(th);
  return [dx / d * speed * c, Math.sin(th) * speed, dz / d * speed * c];
}
export const rngSeed = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
