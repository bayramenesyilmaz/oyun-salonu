import * as THREE from 'three';

// Statik dünya: eksenlere hizalı kutular (AABB) + yükseklik fonksiyonu (arazi).
// Oyuncu/karakter çarpışması (daire–kutu), mermi ve görüş ışınları burada.

export class CollisionWorld {
  constructor(heightAt) {
    this.heightAt = heightAt;
    this.boxes = []; // {minX,maxX,minY,maxY,minZ,maxZ, solid, cover, tag}
    this.cell = 8;
    this.grid = new Map();
  }

  add(minX, maxX, minY, maxY, minZ, maxZ, opts = {}) {
    const b = { minX, maxX, minY, maxY, minZ, maxZ, solid: opts.solid !== false, tag: opts.tag || null, bulletProof: opts.bulletProof !== false };
    this.boxes.push(b);
    this.index(b);
    return b;
  }

  // Merkez + boyutla kutu (y tabanı verilir)
  addBox(cx, cz, w, d, y0, h, opts) {
    return this.add(cx - w / 2, cx + w / 2, y0, y0 + h, cz - d / 2, cz + d / 2, opts);
  }

  remove(b) {
    this.boxes = this.boxes.filter((x) => x !== b);
    this.rebuild();
  }

  rebuild() {
    this.grid.clear();
    this.boxes.forEach((b) => this.index(b));
  }

  key(ix, iz) {
    return ix * 73856093 ^ iz * 19349663;
  }

  index(b) {
    const c = this.cell;
    for (let ix = Math.floor(b.minX / c); ix <= Math.floor(b.maxX / c); ix++)
      for (let iz = Math.floor(b.minZ / c); iz <= Math.floor(b.maxZ / c); iz++) {
        const k = this.key(ix, iz);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(b);
      }
  }

  near(x, z, r) {
    const c = this.cell, out = new Set();
    for (let ix = Math.floor((x - r) / c); ix <= Math.floor((x + r) / c); ix++)
      for (let iz = Math.floor((z - r) / c); iz <= Math.floor((z + r) / c); iz++) {
        const list = this.grid.get(this.key(ix, iz));
        if (list) list.forEach((b) => out.add(b));
      }
    return out;
  }

  // Daire (karakter) çarpışmasını çöz. y: ayak yüksekliği, h: boy
  resolveCircle(p, radius, y, h = 1.7) {
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const b of this.near(p.x, p.z, radius + 1)) {
        if (!b.solid || b.maxY < y + 0.45 || b.minY > y + h) continue; // alçak engellerin üstünden adım at
        const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
        const dx = p.x - cx, dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        if (d2 < 1e-8) {
          const pens = [
            [p.x - b.minX + radius, -1, 0], [b.maxX - p.x + radius, 1, 0],
            [p.z - b.minZ + radius, 0, -1], [b.maxZ - p.z + radius, 0, 1],
          ].sort((a, c) => a[0] - c[0]);
          p.x += pens[0][1] * pens[0][0];
          p.z += pens[0][2] * pens[0][0];
        } else {
          const d = Math.sqrt(d2), push = radius - d;
          p.x += (dx / d) * push;
          p.z += (dz / d) * push;
        }
        moved = true;
      }
      if (!moved) break;
    }
  }

  // Ayak altındaki zemin: arazi veya üstüne çıkılabilen alçak kutu (rampa yok, basamak ≤ 0.45 m)
  groundAt(x, z, y, radius = 0.3) {
    let g = this.heightAt(x, z);
    for (const b of this.near(x, z, radius + 0.5)) {
      if (x < b.minX - radius * 0.5 || x > b.maxX + radius * 0.5 || z < b.minZ - radius * 0.5 || z > b.maxZ + radius * 0.5) continue;
      if (b.maxY <= y + 0.46 && b.maxY > g) g = b.maxY;
    }
    return g;
  }

  // Işın – kutu (slab yöntemi). En yakın isabet mesafesi veya Infinity
  rayBox(o, d, b, maxT) {
    let t0 = 0, t1 = maxT;
    const axes = [
      [o.x, d.x, b.minX, b.maxX],
      [o.y, d.y, b.minY, b.maxY],
      [o.z, d.z, b.minZ, b.maxZ],
    ];
    let nAxis = -1, nSign = 0;
    for (let i = 0; i < 3; i++) {
      const [oo, dd, mn, mx] = axes[i];
      if (Math.abs(dd) < 1e-9) {
        if (oo < mn || oo > mx) return null;
        continue;
      }
      let ta = (mn - oo) / dd, tb = (mx - oo) / dd;
      let s = -1;
      if (ta > tb) {
        [ta, tb] = [tb, ta];
        s = 1;
      }
      if (ta > t0) {
        t0 = ta;
        nAxis = i;
        nSign = s;
      }
      if (tb < t1) t1 = tb;
      if (t0 > t1) return null;
    }
    return { t: t0, axis: nAxis, sign: nSign };
  }

  // Dünyaya karşı ışın: kutular + arazi. {t, point, normal, kind}
  raycast(origin, dir, maxDist = 200, opts = {}) {
    let best = { t: maxDist, normal: null, kind: null, box: null };
    // kaba tarama: ışın boyunca hücreleri topla
    const step = this.cell * 0.9;
    const seen = new Set();
    for (let s = 0; s <= maxDist + step; s += step) {
      if (s > best.t + step) break;
      const x = origin.x + dir.x * s, z = origin.z + dir.z * s;
      for (const b of this.near(x, z, step)) {
        if (seen.has(b)) continue;
        seen.add(b);
        if (opts.ignoreSoft && !b.bulletProof) continue;
        const h = this.rayBox(origin, dir, b, best.t);
        if (h && h.t < best.t && h.t >= 0) {
          const n = new THREE.Vector3();
          if (h.axis >= 0) n.setComponent(h.axis, h.sign);
          best = { t: h.t, normal: n, kind: 'box', box: b };
        }
      }
    }
    // arazi: adım adım ilerle, geçişte ikiye bölerek incelt
    const ts = 0.6;
    let prevT = 0;
    let prevAbove = origin.y - this.heightAt(origin.x, origin.z);
    for (let t = ts; t <= best.t; t += ts) {
      const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t;
      const above = y - this.heightAt(x, z);
      if (above < 0 && prevAbove >= 0) {
        let a = prevT, c = t;
        for (let i = 0; i < 6; i++) {
          const m = (a + c) / 2;
          const yy = origin.y + dir.y * m;
          if (yy - this.heightAt(origin.x + dir.x * m, origin.z + dir.z * m) < 0) c = m;
          else a = m;
        }
        best = { t: c, normal: new THREE.Vector3(0, 1, 0), kind: 'terrain', box: null };
        break;
      }
      prevAbove = above;
      prevT = t;
    }
    if (best.kind === null) return null;
    best.point = origin.clone().addScaledVector(dir, best.t);
    return best;
  }

  // İki nokta arası görüş açık mı?
  lineOfSight(a, b) {
    const d = new THREE.Vector3().subVectors(b, a);
    const len = d.length();
    if (len < 0.01) return true;
    d.divideScalar(len);
    const h = this.raycast(a, d, len - 0.05);
    return !h;
  }
}
