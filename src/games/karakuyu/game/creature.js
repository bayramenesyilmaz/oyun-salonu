import * as THREE from 'three';

// CİN ("bizden iyiler") — model, animasyon ve yapay zekâ.
// Dumansız ateşten: saçın arasından kor gibi gözler, ardında kıvılcım ve duman; ayakları ters basar.

export class Creature {
  constructor(scene, world, T) {
    this.world = world;
    this.grid = world.grid;
    this.root = new THREE.Group();
    this.root.visible = false;
    scene.add(this.root);
    this.buildModel(T);
    scene.add(this.sparks);

    this.pos = this.root.position;
    this.facing = 0; // yaw
    this.state = 'dormant';
    this.path = [];
    this.pathTimer = 0;
    this.target = new THREE.Vector3();
    this.lastKnown = new THREE.Vector3();
    this.suspicion = 0;
    this.lostTimer = 0;
    this.stateTimer = 0;
    this.waitTimer = 0;
    this.farTimer = 0;
    this.speed = 0;
    this.difficulty = 0;
    this.walkPhase = 0;
    this.stepAcc = 0;
    this.twitch = 0;
    this.lookTimer = 0;
    this.stalkDist = 6;
    this.stillTimer = 0;
    this.events = [];
    this.sawHide = false;
    this.canSeePlayer = false;
  }

  buildModel(T) {
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x4f4c45, roughness: 0.32, metalness: 0.08, side: THREE.DoubleSide });
    const rag = new THREE.MeshStandardMaterial({ color: 0x35332e, roughness: 0.4, side: THREE.DoubleSide });
    const skin = new THREE.MeshStandardMaterial({ color: 0x6c7076, roughness: 0.38, metalness: 0.05 });
    const hairTex = T.hair.clone();
    hairTex.wrapS = THREE.RepeatWrapping;
    hairTex.repeat.set(4, 1);
    hairTex.generateMipmaps = false;
    hairTex.minFilter = THREE.LinearFilter;
    hairTex.needsUpdate = true;
    const hairMat = new THREE.MeshStandardMaterial({
      map: hairTex, color: 0x070708, roughness: 0.2, metalness: 0.15, alphaTest: 0.3, side: THREE.DoubleSide,
    });

    // Kefen: yırtık uçlu, buruşuk torna gövdesi
    const lathe = (pts, seg, noise, tear) => {
      const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, 0, Math.PI * 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const ang = Math.atan2(z, x);
        const n = 1 + Math.sin(ang * 9 + y * 6) * noise + (Math.random() - 0.5) * noise;
        p.setX(i, x * n);
        p.setZ(i, z * n);
        if (y < 0.05 && tear) p.setY(i, Math.abs(Math.sin(ang * 7)) * tear + Math.random() * 0.08);
      }
      g.computeVertexNormals();
      return g;
    };
    this.robe = new THREE.Group();
    this.robe.add(new THREE.Mesh(lathe([[0.44, 0], [0.34, 0.3], [0.25, 0.8], [0.2, 1.2], [0.18, 1.42]], 24, 0.06, 0.22), robeMat));
    const outer = new THREE.Mesh(lathe([[0.5, 0.25], [0.4, 0.5], [0.3, 0.95], [0.24, 1.25]], 20, 0.1, 0), rag);
    this.robe.add(outer);
    this.root.add(this.robe);

    // Üst gövde: öne kambur
    this.upper = new THREE.Group();
    this.upper.position.y = 1.3;
    this.upper.rotation.x = 0.4;
    this.root.add(this.upper);
    const chest = new THREE.Mesh(lathe([[0.22, 0], [0.2, 0.3], [0.16, 0.55]], 16, 0.05, 0), robeMat);
    this.upper.add(chest);
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), robeMat);
    shoulders.scale.set(1.4, 0.45, 0.85);
    shoulders.position.y = 0.52;
    this.upper.add(shoulders);

    // Uzun boyun + yana yatık baş
    this.head = new THREE.Group();
    this.head.position.set(0, 0.62, 0.05);
    this.upper.add(this.head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.34, 8).translate(0, 0.08, 0), skin);
    this.head.add(neck);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skin);
    skull.scale.set(0.88, 1.18, 1);
    skull.position.y = 0.3;
    this.head.add(skull);

    // Islak saç perdesi: yüzü tamamen örter, göğse kadar iner
    this.hair = [];
    const curtain = new THREE.CylinderGeometry(0.125, 0.21, 1.2, 22, 6, true);
    curtain.translate(0, -0.6, 0.02);
    const cp = curtain.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const y = cp.getY(i);
      const k = -y / 1.2;
      cp.setX(i, cp.getX(i) * (1 + (Math.random() - 0.5) * 0.2 * k));
      cp.setZ(i, cp.getZ(i) * (1 + (Math.random() - 0.5) * 0.2 * k) + Math.max(0, k) * 0.05);
      if (y < -1.1) cp.setY(i, y - Math.random() * 0.35);
    }
    curtain.computeVertexNormals();
    const hairMesh = new THREE.Mesh(curtain, hairMat);
    hairMesh.position.y = 0.42;
    hairMesh.userData.ph = 0;
    this.head.add(hairMesh);
    this.hair.push(hairMesh);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.2 }));
    cap.position.y = 0.32;
    cap.scale.set(1, 1.1, 1.05);
    this.head.add(cap);
    this.head.rotation.z = 0.35;

    // Dizlere inen, ince, uzun kollar
    this.arms = [];
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(s * 0.25, 0.47, 0);
      this.upper.add(shoulder);
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.66, 8).translate(0, -0.33, 0), skin);
      shoulder.add(upperArm);
      const elbow = new THREE.Group();
      elbow.position.y = -0.66;
      shoulder.add(elbow);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.018, 0.7, 8).translate(0, -0.35, 0), skin);
      elbow.add(fore);
      const hand = new THREE.Group();
      hand.position.y = -0.7;
      elbow.add(hand);
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.02).translate(0, -0.04, 0), skin);
      hand.add(palm);
      for (let f = 0; f < 4; f++) {
        const fg = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.003, 0.3, 4).translate(0, -0.15, 0), skin);
        fg.position.set((f - 1.5) * 0.017, -0.07, 0);
        fg.rotation.z = (f - 1.5) * 0.06;
        fg.rotation.x = 0.25;
        hand.add(fg);
      }
      shoulder.userData.splay = s * 0.14;
      this.arms.push({ shoulder, elbow, side: s });
    }

    // Kor gözler: ıslak saçın aralığından iki nokta
    this.eyes = [];
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.9 });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), eyeMat);
      e.position.set(s * 0.045, 0.31, 0.22);
      this.head.add(e);
      this.eyes.push(e);
    }
    this.eyeMat = eyeMat;
    // Ters ayaklar: kefenin altından topuk öne, parmaklar arkaya bakar
    for (const s of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.26).translate(0, 0.025, -0.08), skin);
      foot.position.set(s * 0.12, 0, 0.06);
      this.root.add(foot);
      for (let k = 0; k < 4; k++) {
        const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.09, 4).rotateX(Math.PI / 2), skin);
        toe.position.set(s * 0.12 + (k - 1.5) * 0.02, 0.015, -0.25);
        this.root.add(toe);
      }
    }
    // Kıvılcım ve duman: dumansız ateşten yaratılmış
    {
      const N = 40;
      const g = new THREE.BufferGeometry();
      this.sparkPos = new Float32Array(N * 3);
      this.sparkLife = new Float32Array(N);
      g.setAttribute('position', new THREE.BufferAttribute(this.sparkPos, 3));
      this.sparks = new THREE.Points(
        g,
        new THREE.PointsMaterial({ map: T.dot, size: 0.07, color: 0xff6a2a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      this.sparks.frustumCulled = false;
      this.sparkN = N;
      this.sparkI = 0;
    }

    // Soğuk, hafif ışık: çok yaklaşınca seçilir
    this.aura = new THREE.PointLight(0x5c7896, 0.9, 5, 1.5);
    this.aura.position.set(0, 1.6, 0.5);
    this.root.add(this.aura);

    this.root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.userData.isCreature = true;
      }
    });
    this.root.scale.set(1.0, 1.14, 1.0);
  }

  emit(type, data) {
    this.events.push({ type, data });
  }

  place(x, z, yaw = 0) {
    this.pos.set(x, this.world.heightAt(x, z), z);
    this.facing = yaw;
    this.path = [];
  }

  setState(s) {
    if (this.state === s) return;
    const prev = this.state;
    this.state = s;
    this.stateTimer = 0;
    this.path = [];
    this.pathTimer = 0;
    if (s === 'chase' && prev !== 'chase') this.emit('chaseStart');
    if (prev === 'chase' && s !== 'chase') this.emit('chaseEnd');
  }

  wake() {
    this.root.visible = true;
    this.setState('patrol');
  }

  // ---------- Izgara yardımcıları ----------
  los(ax, az, bx, bz) {
    // Bresenham: görüşü kesen hücre var mı?
    const g = this.grid;
    let [x0, y0] = g.toCell(ax, az);
    const [x1, y1] = g.toCell(bx, bz);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let n = 0;
    while (true) {
      if (n > 0 && !(x0 === x1 && y0 === y1) && g.valid(x0, y0) && g.sight[g.idx(x0, y0)]) return false;
      if (x0 === x1 && y0 === y1) return true;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
      if (++n > 300) return false;
    }
  }

  walkable(ax, az, bx, bz) {
    // iki nokta arası yürünebilir mi (yol düzleştirme)
    const g = this.grid;
    const d = Math.hypot(bx - ax, bz - az);
    const steps = Math.ceil(d / 0.4);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const [cx, cz] = g.toCell(ax + (bx - ax) * t, az + (bz - az) * t);
      if (g.isBlocked(cx, cz)) return false;
    }
    return true;
  }

  nearestFree(gx, gz) {
    const g = this.grid;
    if (!g.isBlocked(gx, gz)) return [gx, gz];
    for (let r = 1; r < 6; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++)
          if (!g.isBlocked(gx + dx, gz + dz)) return [gx + dx, gz + dz];
    return null;
  }

  findPath(tx, tz) {
    const g = this.grid;
    const s = this.nearestFree(...g.toCell(this.pos.x, this.pos.z));
    const e = this.nearestFree(...g.toCell(tx, tz));
    if (!s || !e) return [];
    const W = g.W;
    const start = g.idx(s[0], s[1]);
    let goal = g.idx(e[0], e[1]);
    if (!this._astar) {
      const N = W * g.H;
      this._astar = { gScore: new Float32Array(N), came: new Int32Array(N), closed: new Uint8Array(N) };
    }
    const { gScore, came, closed } = this._astar;
    gScore.fill(Infinity);
    came.fill(-1);
    closed.fill(0);
    // ikili yığın
    const heap = [];
    const push = (i, f) => {
      heap.push([f, i]);
      let c = heap.length - 1;
      while (c > 0) {
        const p = (c - 1) >> 1;
        if (heap[p][0] <= heap[c][0]) break;
        [heap[p], heap[c]] = [heap[c], heap[p]];
        c = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let c = 0;
        for (;;) {
          const l = 2 * c + 1, r = l + 1;
          let m = c;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === c) break;
          [heap[m], heap[c]] = [heap[c], heap[m]];
          c = m;
        }
      }
      return top;
    };
    const h = (i) => {
      const dx = Math.abs((i % W) - e[0]), dz = Math.abs(Math.floor(i / W) - e[1]);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    };
    gScore[start] = 0;
    push(start, h(start));
    let iter = 0;
    let best = start, bestH = h(start);
    while (heap.length && iter++ < 9000) {
      const [, cur] = pop();
      if (cur === goal) break;
      const hc = h(cur);
      if (hc < bestH) {
        bestH = hc;
        best = cur;
      }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % W, cz = Math.floor(cur / W);
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz;
          if (g.isBlocked(nx, nz)) continue;
          if (dx && dz && (g.isBlocked(cx + dx, cz) || g.isBlocked(cx, cz + dz))) continue;
          const ni = g.idx(nx, nz);
          const ng = gScore[cur] + (dx && dz ? 1.414 : 1);
          if (ng < gScore[ni]) {
            gScore[ni] = ng;
            came[ni] = cur;
            push(ni, ng + h(ni));
          }
        }
    }
    let reached = true;
    if (came[goal] === -1 && goal !== start) {
      // hedefe ulaşılamıyorsa en yakın noktaya git
      if (best === start) return [];
      goal = best;
      reached = false;
    }
    const cells = [];
    let c = goal;
    while (c !== -1 && c !== start) {
      cells.push(c);
      c = came[c];
    }
    cells.reverse();
    const pts = cells.map((i) => {
      const [x, z] = g.center(i % W, Math.floor(i / W));
      return new THREE.Vector3(x, 0, z);
    });
    // hedefin kendisi
    if (reached && !g.isBlocked(...g.toCell(tx, tz))) pts.push(new THREE.Vector3(tx, 0, tz));
    // düzleştir
    const out = [];
    let from = new THREE.Vector3(this.pos.x, 0, this.pos.z);
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.walkable(from.x, from.z, pts[j].x, pts[j].z)) j--;
      out.push(pts[j]);
      from = pts[j];
      i = j + 1;
    }
    return out;
  }

  moveAlong(dt, speed) {
    if (!this.path.length) return true;
    const p = this.path[0];
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) {
      this.path.shift();
      return this.path.length === 0;
    }
    const step = Math.min(d, speed * dt);
    this.pos.x += (dx / d) * step;
    this.pos.z += (dz / d) * step;
    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);
    this.turnTo(Math.atan2(dx, dz), dt, 6);
    this.speed = speed;
    return false;
  }

  turnTo(yaw, dt, rate) {
    let d = yaw - this.facing;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.facing += d * Math.min(1, dt * rate);
  }

  goTo(x, z) {
    this.target.set(x, 0, z);
    this.path = this.findPath(x, z);
  }

  pickWaypoint(playerPos) {
    const wps = this.world.waypoints;
    // oyuncuya yakın noktaları tercih et: baskı sürsün
    let best = null, bestScore = Infinity;
    for (let k = 0; k < 4; k++) {
      const w = wps[Math.floor(Math.random() * wps.length)];
      const dSelf = w.distanceTo(this.pos);
      if (dSelf < 4) continue;
      const score = w.distanceTo(playerPos) * (0.6 + Math.random() * 0.8);
      if (score < bestScore) {
        bestScore = score;
        best = w;
      }
    }
    return best || wps[0];
  }

  // ---------- Ana güncelleme ----------
  update(dt, t, ctx) {
    this.events.length = 0;
    this.speed = 0;
    this.stateTimer += dt;
    const P = ctx.playerPos;
    const dx = P.x - this.pos.x, dz = P.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    this.dist = dist;

    if (this.state === 'dormant' || this.state === 'apparition') {
      this.animate(dt, t, dist);
      if (this.state === 'apparition') this.turnTo(Math.atan2(dx, dz), dt, 2);
      return this.events;
    }

    if (this.state === 'stalk') {
      this.updateStalk(dt, t, ctx);
      this.animate(dt, t, dist);
      return this.events;
    }

    const diff = this.difficulty;
    const speeds = {
      patrol: 1.55 + diff * 0.15,
      investigate: 2.5 + diff * 0.2,
      chase: 4.35 + diff * 0.3,
      search: 1.9 + diff * 0.15,
    };

    // --- Algılama ---
    const hidden = !!ctx.hidden;
    let seeing = false;
    if (!hidden) {
      let range = ctx.lantern ? 22 : 10;
      if (ctx.crouch) range *= 0.7;
      if (this.state === 'chase') range *= 1.5;
      const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
      const dot = dist > 0.01 ? (fx * dx + fz * dz) / dist : 1;
      const inFov = dot > Math.cos(this.state === 'chase' ? 1.4 : 0.95);
      if (dist < range && (inFov || dist < 2.5) && this.los(this.pos.x, this.pos.z, P.x, P.z)) seeing = true;
      if (seeing) {
        const gain = dist < 4 ? 10 : 0.6 + 2.6 * (1 - dist / range);
        this.suspicion = Math.min(1.2, this.suspicion + dt * gain * (1 + diff * 0.2));
      }
      const hearing = [0, 5.5, 15][ctx.noise] * (1 + diff * 0.1);
      if (dist < hearing && this.state !== 'chase') {
        this.lastKnown.set(P.x, 0, P.z);
        if (this.state !== 'investigate' || this.stateTimer > 1.5) {
          this.setState('investigate');
          this.goTo(P.x, P.z);
          this.emit('heard');
        }
      }
    }
    if (!seeing) this.suspicion = Math.max(0, this.suspicion - dt * 0.25);
    this.canSeePlayer = seeing;

    if (this.suspicion >= 1 && this.state !== 'chase' && !hidden) {
      this.setState('chase');
    }

    // --- Durumlar ---
    switch (this.state) {
      case 'patrol': {
        if (this.waitTimer > 0) {
          this.waitTimer -= dt;
          this.turnTo(this.facing + Math.sin(t * 0.8) * 0.5, dt, 1);
        } else if (!this.path.length) {
          const w = this.pickWaypoint(P);
          this.goTo(w.x, w.z);
          if (!this.path.length) this.waitTimer = 1;
        } else if (this.moveAlong(dt, speeds.patrol)) {
          this.waitTimer = 1 + Math.random() * 2.5;
        }
        // çok uzaksa, görünmeden yaklaş
        if (dist > 40) this.farTimer += dt;
        else this.farTimer = 0;
        if (this.farTimer > 22) {
          this.farTimer = 0;
          this.relocateNear(P, ctx);
        }
        break;
      }
      case 'investigate': {
        if (this.moveAlong(dt, speeds.investigate) || this.stateTimer > 14) {
          this.setState('search');
          this.lastKnown.copy(this.pos);
        }
        break;
      }
      case 'chase': {
        if (seeing) {
          this.lastKnown.set(P.x, 0, P.z);
          this.lostTimer = 0;
        } else this.lostTimer += dt;

        if (hidden) {
          if (this.sawHide) {
            // saklandığını gördü: oraya git ve çıkar
            this.pathTimer -= dt;
            if (this.pathTimer <= 0) {
              this.goTo(P.x, P.z);
              this.pathTimer = 0.5;
            }
            this.moveAlong(dt, speeds.chase * 0.8);
            if (dist < 1.6) this.emit('caught', { fromHiding: true });
            break;
          }
          if (this.lostTimer > 0.5) {
            this.setState('search');
            break;
          }
        }
        this.pathTimer -= dt;
        if (this.pathTimer <= 0) {
          const tgt = seeing ? P : this.lastKnown;
          if (seeing && this.walkable(this.pos.x, this.pos.z, P.x, P.z)) this.path = [new THREE.Vector3(P.x, 0, P.z)];
          else this.goTo(tgt.x, tgt.z);
          this.pathTimer = seeing ? 0.15 : 0.45;
        }
        const reached = this.moveAlong(dt, speeds.chase);
        if (!seeing && (reached || this.lostTimer > 4.5)) this.setState('search');
        if (dist < 1.15 && !hidden) this.emit('caught', {});
        break;
      }
      case 'search': {
        if (!this.path.length) {
          if (this.waitTimer > 0) this.waitTimer -= dt;
          else {
            const a = Math.random() * Math.PI * 2, rr = 3 + Math.random() * 6;
            this.goTo(this.lastKnown.x + Math.cos(a) * rr, this.lastKnown.z + Math.sin(a) * rr);
            this.waitTimer = 0.8 + Math.random();
          }
        } else this.moveAlong(dt, speeds.search);
        if (this.stateTimer > 11) {
          this.setState('patrol');
          this.suspicion = 0;
        }
        break;
      }
    }
    this.animate(dt, t, dist);
    return this.events;
  }

  onPlayerHide(dist) {
    // kovalanırken çok yakında saklanmak işe yaramaz
    this.sawHide = this.state === 'chase' && this.canSeePlayer && dist < 3.2;
  }

  onPlayerUnhide() {
    this.sawHide = false;
  }

  relocateNear(P, ctx) {
    const wps = this.world.waypoints.filter((w) => {
      const d = w.distanceTo(new THREE.Vector3(P.x, 0, P.z));
      return d > 18 && d < 30 && !this.los(w.x, w.z, P.x, P.z);
    });
    if (wps.length) {
      const w = wps[Math.floor(Math.random() * wps.length)];
      this.place(w.x, w.z, Math.random() * 6);
      void ctx;
    }
  }

  // ---------- Final: "Arkana bakma" ----------
  startStalk(P, yaw) {
    this.setState('stalk');
    this.root.visible = true;
    this.stalkDist = 7;
    this.lookTimer = 0;
    this.stillTimer = 0;
    this.place(P.x + Math.sin(yaw) * 7, P.z + Math.cos(yaw) * 7, yaw + Math.PI);
  }

  updateStalk(dt, t, ctx) {
    const P = ctx.playerPos;
    // oyuncunun bakış yönünün tam arkası
    const bx = Math.sin(ctx.yaw), bz = Math.cos(ctx.yaw);
    if (ctx.moving) {
      this.stillTimer = 0;
      this.stalkDist = Math.min(6, this.stalkDist + dt * 0.4);
    } else {
      this.stillTimer += dt;
      if (this.stillTimer > 2.5) this.stalkDist -= dt * 0.55; // durursan yaklaşır
    }
    const want = new THREE.Vector3(P.x + bx * this.stalkDist, 0, P.z + bz * this.stalkDist);
    const k = Math.min(1, dt * 1.6);
    this.pos.x += (want.x - this.pos.x) * k;
    this.pos.z += (want.z - this.pos.z) * k;
    this.pos.y = this.world.heightAt(this.pos.x, this.pos.z);
    this.turnTo(Math.atan2(P.x - this.pos.x, P.z - this.pos.z), dt, 8);
    this.speed = ctx.moving ? 2.5 : 0.3;

    // oyuncu dönüp bakıyor mu?
    const cam = ctx.camPos, f = ctx.camFwd;
    const to = new THREE.Vector3(this.pos.x - cam.x, this.pos.y + 1.5 - cam.y, this.pos.z - cam.z);
    const d = to.length();
    to.normalize();
    if (to.dot(f) > Math.cos(0.62) && d < 16) {
      this.lookTimer += dt;
      if (this.lookTimer > 0.3) this.emit('lookedBack');
    } else this.lookTimer = Math.max(0, this.lookTimer - dt * 2);
    if (this.stalkDist < 1.3) this.emit('caught', { stalk: true });
  }

  // ---------- Animasyon ----------
  animate(dt, t, dist) {
    const moving = this.speed > 0.2;
    const fast = this.speed > 3;
    this.walkPhase += dt * (moving ? this.speed * 2.2 : 0.6);
    const ph = this.walkPhase;
    this.root.rotation.y = this.facing;
    this.robe.rotation.z = Math.sin(ph) * (moving ? 0.05 : 0.015);
    this.robe.children[1].rotation.y = Math.sin(t * 0.7) * 0.15;
    this.robe.position.y = moving ? Math.abs(Math.sin(ph)) * 0.05 : 0;
    this.upper.position.y = 1.3 + (moving ? Math.abs(Math.sin(ph)) * 0.05 : Math.sin(t * 1.1) * 0.01);
    this.upper.rotation.x = (fast ? 0.7 : 0.4) + Math.sin(t * 0.9) * 0.02;
    this.upper.rotation.z = Math.sin(ph * 0.5) * 0.06;

    // kafa seğirmesi
    this.twitch -= dt;
    if (this.twitch <= 0) {
      this.twitch = 0.4 + Math.random() * (fast ? 0.6 : 2.5);
      this.headTarget = new THREE.Euler((Math.random() - 0.2) * 0.4, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.9);
    }
    if (this.headTarget) {
      const k = Math.min(1, dt * 22);
      this.head.rotation.x += (this.headTarget.x - this.head.rotation.x) * k;
      this.head.rotation.y += (this.headTarget.y - this.head.rotation.y) * k;
      this.head.rotation.z += (0.35 + this.headTarget.z * 0.6 - this.head.rotation.z) * k;
    }

    for (const a of this.arms) {
      const swing = moving ? Math.sin(ph + (a.side > 0 ? Math.PI : 0)) * (fast ? 0.7 : 0.25) : Math.sin(t * 0.7 + a.side) * 0.05;
      a.shoulder.rotation.x = (fast ? -0.9 : -0.15) + swing;
      a.shoulder.rotation.z = a.shoulder.userData.splay * (fast ? 1.6 : 1) + Math.sin(t * 2.3 + a.side) * 0.03;
      a.elbow.rotation.x = fast ? -0.5 + Math.sin(ph * 2) * 0.2 : -0.12;
    }
    for (const h of this.hair) h.rotation.x = Math.sin(t * 1.4) * 0.03 + (fast ? -0.2 : 0);

    // kor gözler titrer, kovalarken parlar
    this.eyeMat.opacity = this.root.visible ? (fast ? 1 : 0.55 + Math.sin(t * 7) * 0.2) : 0;
    // kıvılcımlar yükselir
    if (this.root.visible && Math.random() < dt * (fast ? 40 : 12)) {
      const i = (this.sparkI = (this.sparkI + 1) % this.sparkN);
      this.sparkPos[i * 3] = this.pos.x + (Math.random() - 0.5) * 0.5;
      this.sparkPos[i * 3 + 1] = this.pos.y + 0.2 + Math.random() * 1.6;
      this.sparkPos[i * 3 + 2] = this.pos.z + (Math.random() - 0.5) * 0.5;
      this.sparkLife[i] = 1.2;
    }
    for (let i = 0; i < this.sparkN; i++) {
      if (this.sparkLife[i] <= 0) {
        this.sparkPos[i * 3 + 1] = -100;
        continue;
      }
      this.sparkLife[i] -= dt;
      this.sparkPos[i * 3 + 1] += dt * 0.9;
      this.sparkPos[i * 3] += Math.sin(t * 3 + i) * dt * 0.2;
    }
    this.sparks.geometry.attributes.position.needsUpdate = true;
    this.sparks.visible = this.root.visible;

    // aura: yakınken titrek
    this.aura.intensity = this.root.visible ? (0.7 + Math.sin(t * 9) * 0.15) * (this.auraBoost || 1) : 0;

    // adım sesleri
    if (moving) {
      this.stepAcc += this.speed * dt;
      if (this.stepAcc > (fast ? 1.6 : 1.2)) {
        this.stepAcc = 0;
        this.emit('step', { fast, dist });
      }
    }
  }
}
