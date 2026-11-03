import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Gülsüm nine: Rocketbox modeli (MIT) + poz klipleri. Cin tuttuğunda:
//  - başı yana düşer, ani seğirmeler; köşeye dönük durup türkü mırıldanır
//  - sırtı dönük, geri geri yürür, başı tam arkaya döner (yüzü gittiği yöne bakar)
//  - ayak izleri ters basar (parmaklar geldiği yöne)
//  - görünce öne eğik, hızlı koşar
// Durumlar: script, corner, hunt, chase, search, watchHide, stunned, collapsed

const VIS = ['AA_VI_10_aa', 'AA_VI_11_E', 'AA_VI_13_O', 'AA_VI_01_PP', 'AA_VI_07_SS'];

export class Nine {
  constructor(scene, world, T) {
    this.scene = scene;
    this.world = world;
    this.grid = world.grid;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.pos = this.root.position;
    this.yaw = 0; // modelin baktığı yön (0 = +Z)
    this.state = 'script';
    this.possessed = false;
    this.path = null;
    this.speed = 1.2;
    this.backward = false;
    this.events = [];
    this.headTwist = 0; // 0..1 (1 = baş arkaya dönmüş)
    this.headTwistTarget = 0;
    this.lookAt = null;
    this.twitchT = 1;
    this.twitch = 0;
    this.twitchAxis = 1;
    this.stepAcc = 0;
    this.talk = 0;
    this.speaking = false;
    this.suspicion = 0;
    this.lostT = 0;
    this.lastSeen = new THREE.Vector3();
    this.stunT = 0;
    this.watchT = 0;
    this.frenzy = 0;
    // etkileşim için görünmez gövde
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.7, 8), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    hit.position.y = 0.85;
    hit.userData.interactId = 'nine';
    this.root.add(hit);
    this.hit = hit;
    // ıslak, ters ayak izleri
    this.prints = makePrints(scene);
    this.printSide = 0;
    this.printAcc = 0;
    this._astar = null;
  }

  async load(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    const model = (this.model = gltf.scene);
    this.root.add(model);
    this.mats = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false;
      const m = o.material;
      if (/opacity/.test(m.name)) {
        m.transparent = false;
        m.alphaTest = 0.45;
        m.side = THREE.DoubleSide;
      }
      m.envMapIntensity = 0.5;
      this.mats.push({ m, base: m.color.clone() });
    });
    this.meshes = [];
    model.traverse((o) => o.isMesh && o.morphTargetDictionary && this.meshes.push(o));
    const B = (n) => model.getObjectByName('Bip01_' + n) || model.getObjectByName('Bip01 ' + n);
    this.head = B('Head');
    this.neck = B('Neck');
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name] = c;
    this.play('idle', 0);
  }

  play(name, fade = 0.35, timeScale = 1) {
    const c = this.clips[name];
    if (!c) return;
    const a = this.mixer.clipAction(c);
    a.timeScale = timeScale;
    if (this.action === a) return;
    a.reset().play();
    a.setLoop(/walk|run/.test(name) ? THREE.LoopRepeat : name === 'collapse' ? THREE.LoopOnce : THREE.LoopPingPong, Infinity);
    a.clampWhenFinished = true;
    if (this.action && fade > 0) this.action.crossFadeTo(a, fade, false);
    else if (this.action) this.action.stop();
    this.action = a;
    this.clip = name;
  }

  place(x, z, yaw = 0) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.root.rotation.y = yaw;
    this.path = null;
  }

  // cin tutması görünümü: ten solar, gözler büyür
  setPossessed(on) {
    this.possessed = on;
    const pale = new THREE.Color(0x9fb0b4);
    for (const { m, base } of this.mats) {
      if (/head|body/.test(m.name)) m.color.copy(base).lerp(pale, on ? (/head/.test(m.name) ? 0.55 : 0.25) : 0);
      else m.color.copy(base);
    }
  }

  setState(s) {
    this.state = s;
    this.path = null;
    if (s === 'chase') this.lostT = 0;
  }

  // ---------- Yol bulma (0.25 m ızgara, A*) ----------
  nearestFree(i, j) {
    const g = this.grid;
    if (!g.isBlocked(i, j)) return [i, j];
    for (let r = 1; r < 8; r++)
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) if (!g.isBlocked(i + di, j + dj)) return [i + di, j + dj];
    return null;
  }

  findPath(tx, tz) {
    const g = this.grid;
    const s = this.nearestFree(...g.toCell(this.pos.x, this.pos.z));
    const e = this.nearestFree(...g.toCell(tx, tz));
    if (!s || !e) return [];
    const W = g.W, N = W * g.H;
    if (!this._astar) this._astar = { gs: new Float32Array(N), came: new Int32Array(N), closed: new Uint8Array(N) };
    const { gs, came, closed } = this._astar;
    gs.fill(Infinity);
    came.fill(-1);
    closed.fill(0);
    const start = s[1] * W + s[0], goal = e[1] * W + e[0];
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
          const l = c * 2 + 1, r = l + 1;
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
    const h = (i) => Math.hypot((i % W) - e[0], Math.floor(i / W) - e[1]);
    gs[start] = 0;
    push(start, h(start));
    let found = false, it = 0;
    while (heap.length && it++ < 6000) {
      const [, cur] = pop();
      if (cur === goal) {
        found = true;
        break;
      }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % W, cj = Math.floor(cur / W);
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di, nj = cj + dj;
          if (g.isBlocked(ni, nj)) continue;
          if (di && dj && (g.isBlocked(ci + di, cj) || g.isBlocked(ci, cj + dj))) continue;
          const n = nj * W + ni;
          const ng = gs[cur] + (di && dj ? 1.414 : 1);
          if (ng < gs[n]) {
            gs[n] = ng;
            came[n] = cur;
            push(n, ng + h(n));
          }
        }
    }
    if (!found) return [];
    const cells = [];
    for (let c = goal; c !== -1 && c !== start; c = came[c]) cells.push(c);
    cells.reverse();
    // görüş hattıyla sadeleştir
    const pts = cells.map((c) => new THREE.Vector3(...[g.center(c % W, Math.floor(c / W))].map(([x, z]) => [x, 0, z])[0]));
    const out = [];
    let from = this.pos.clone();
    for (let i = 0; i < pts.length; i++) {
      const nxt = pts[i + 1];
      if (nxt && this.walkable(from.x, from.z, nxt.x, nxt.z)) continue;
      out.push(pts[i]);
      from = pts[i];
    }
    return out;
  }

  walkable(ax, az, bx, bz) {
    const g = this.grid;
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (g.cell * 0.5));
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
      if (g.isBlocked(...g.toCell(x, z))) return false;
    }
    return true;
  }

  // görüş: duvarlar ve yüksek dolaplar keser
  los(ax, az, bx, bz) {
    const g = this.grid;
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (g.cell * 0.5));
    for (let k = 1; k < n; k++) {
      const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
      const [i, j] = g.toCell(x, z);
      if (!g.valid(i, j) || g.sight[j * g.W + i]) return false;
    }
    return true;
  }

  goTo(x, z, onArrive = null) {
    this.path = this.findPath(x, z);
    this.onArrive = onArrive;
    if (!this.path.length) {
      this.path = null;
      onArrive && onArrive();
    }
  }

  moveAlong(dt, speed) {
    if (!this.path || !this.path.length) return false;
    const tgt = this.path[0];
    const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z;
    const L = Math.hypot(dx, dz);
    const step = speed * dt;
    const moveYaw = Math.atan2(dx, dz);
    // geri geri yürürken sırtı gittiği yöne dönüktür
    this.turnTo(this.backward ? moveYaw + Math.PI : moveYaw, dt, 7);
    if (L <= step) {
      this.pos.x = tgt.x;
      this.pos.z = tgt.z;
      this.path.shift();
      if (!this.path.length) {
        this.path = null;
        const cb = this.onArrive;
        this.onArrive = null;
        cb && cb();
      }
    } else {
      this.pos.x += (dx / L) * step;
      this.pos.z += (dz / L) * step;
    }
    // ayak sesleri ve izler
    this.stepAcc += step;
    if (this.stepAcc > (speed > 2.5 ? 0.9 : 0.62)) {
      this.stepAcc = 0;
      this.events.push({ type: 'step', fast: speed > 2.5 });
      if (this.possessed) this.dropPrint(moveYaw);
    }
    return true;
  }

  turnTo(yaw, dt, rate) {
    let d = yaw - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * rate);
    this.root.rotation.y = this.yaw;
  }

  dropPrint(moveYaw) {
    this.printSide ^= 1;
    const side = this.printSide ? 0.11 : -0.11;
    const rx = Math.cos(moveYaw), rz = -Math.sin(moveYaw);
    // ters basan ayak: parmaklar gidilen yönün tersine
    this.prints.add(this.pos.x + rx * side, this.pos.z + rz * side, moveYaw + Math.PI, this.printSide);
  }

  // ---------- Yapay zekâ ----------
  update(dt, t, ctx) {
    this.events.length = 0;
    const P = ctx.playerPos;
    const dist = Math.hypot(P.x - this.pos.x, P.z - this.pos.z);
    this.prints.update(dt);
    if (this.stunT > 0) this.stunT -= dt;

    if (this.state === 'script') {
      if (this.path) {
        this.backward = false;
        this.moveAlong(dt, this.speed);
        this.play('walk', 0.3);
      } else if (this.scriptClip) this.play(this.scriptClip, 0.4);
      if (this.faceYaw !== undefined && !this.path) this.turnTo(this.faceYaw, dt, 5);
    } else if (this.state === 'corner') {
      this.play('cin_idle', 0.6);
      this.turnTo(this.cornerYaw, dt, 5);
    } else if (this.state === 'collapsed') {
      this.play('collapse', 0.8);
    } else {
      this.think(dt, t, ctx, dist);
    }

    this.animate(dt, t, ctx);
    return this.events;
  }

  canSee(ctx, dist) {
    if (ctx.hidden) return false;
    const P = ctx.playerPos;
    const range = ctx.lantern ? 10 : 5.5;
    if (dist > range) return false;
    if (!this.los(this.pos.x, this.pos.z, P.x, P.z)) return false;
    if (dist < 2.2) return true;
    // görüş yönü: geri yürürken omzunun üstünden, gittiği yöne bakar
    const fy = this.backward ? this.yaw + Math.PI : this.yaw;
    const fx = Math.sin(fy), fz = Math.cos(fy);
    const dot = ((P.x - this.pos.x) * fx + (P.z - this.pos.z) * fz) / Math.max(dist, 1e-3);
    return dot > (this.state === 'chase' ? -0.2 : 0.35);
  }

  think(dt, t, ctx, dist) {
    const P = ctx.playerPos;
    const sees = this.canSee(ctx, dist);
    const hears = !ctx.hidden && ((ctx.noise === 2 && dist < 9) || (ctx.noise === 1 && dist < 3.5));
    if (sees) this.lastSeen.copy(P);

    // yakaladı
    if (this.state !== 'stunned' && !ctx.hidden && dist < 0.85) {
      this.events.push({ type: 'caught' });
      return;
    }

    if (this.state === 'stunned') {
      this.backward = false;
      this.play('cin_run', 0.2, -0.8);
      if (!this.path) this.goTo(...this.farFrom(P));
      this.moveAlong(dt, 2.2);
      if (this.stunT <= 0) this.setState('hunt');
      return;
    }

    if (this.state === 'hunt') {
      if (!this.backward) this.twistSide = Math.random() < 0.5 ? -1 : 1;
      this.backward = true;
      this.headTwistTarget = 1;
      this.play('walk', 0.4, -0.85);
      if (!this.path) this.goTo(...this.nextWaypoint(P));
      this.moveAlong(dt, 1.05 + this.frenzy * 0.6);
      if (sees) this.suspicion += dt * (dist < 5 ? 2.2 : 1.1);
      else if (hears) this.suspicion += dt * 1.5;
      else this.suspicion = Math.max(0, this.suspicion - dt * 0.3);
      if (hears && !this.path) this.goTo(P.x, P.z);
      if (this.suspicion > 1 || (this.frenzy > 0 && sees)) {
        this.suspicion = 0;
        this.setState('chase');
        this.events.push({ type: 'chaseStart' });
      }
      return;
    }

    if (this.state === 'chase') {
      this.backward = false;
      this.headTwistTarget = 0;
      this.play('cin_run', 0.25, 1.15);
      if (sees) {
        this.lostT = 0;
        this.repath = (this.repath || 0) - dt;
        if (this.repath <= 0 || !this.path) {
          this.repath = 0.35;
          this.path = this.walkable(this.pos.x, this.pos.z, P.x, P.z) ? [P.clone()] : this.findPath(P.x, P.z);
        }
      } else {
        this.lostT += dt;
        if (!this.path) this.goTo(this.lastSeen.x, this.lastSeen.z);
        if (this.lostT > 3.5) {
          // saklandığı yeri gördüyse önünde bekler
          if (ctx.hidden && ctx.hideSpot && this.sawHide) {
            this.setState('watchHide');
            this.watchT = 7;
            this.goTo(ctx.hideSpot.front.x, ctx.hideSpot.front.z);
          } else this.setState('search');
        }
      }
      this.moveAlong(dt, 3.25 + this.frenzy * 0.5);
      return;
    }

    if (this.state === 'search') {
      this.backward = false;
      this.headTwistTarget = 0;
      this.play('walk', 0.3, 1);
      if (!this.path) {
        this.searchN = (this.searchN || 0) + 1;
        const a = Math.random() * Math.PI * 2;
        this.goTo(this.lastSeen.x + Math.cos(a) * 2, this.lastSeen.z + Math.sin(a) * 2);
      }
      this.moveAlong(dt, 1.5);
      if (sees) {
        this.setState('chase');
        this.events.push({ type: 'chaseStart' });
      } else if (this.searchN > 3) {
        this.searchN = 0;
        this.setState('hunt');
      }
      return;
    }

    if (this.state === 'watchHide') {
      this.backward = false;
      if (this.path) {
        this.play('walk', 0.3);
        this.moveAlong(dt, 1.4);
      } else {
        this.play('cin_idle', 0.5);
        if (ctx.hideSpot) this.turnTo(Math.atan2(ctx.hideSpot.inside.x - this.pos.x, ctx.hideSpot.inside.z - this.pos.z), dt, 4);
        this.watchT -= dt;
        if (this.watchT < 2 && !this.scratched) {
          this.scratched = true;
          this.events.push({ type: 'scratch' });
        }
        if (this.watchT <= 0 || !ctx.hidden) {
          this.scratched = false;
          this.sawHide = false;
          this.setState(ctx.hidden ? 'hunt' : 'chase');
        }
      }
    }
  }

  nextWaypoint(P) {
    const W = this.world.waypoints;
    // oyuncunun bulunduğu bölgeye eğilimli rastgele devriye
    let best = W[0], bs = -1e9;
    for (const w of W) {
      const dSelf = w.distanceTo(this.pos);
      if (dSelf < 1.5) continue;
      const s = -w.distanceTo(P) * (0.35 + this.frenzy * 0.5) + Math.random() * 6;
      if (s > bs) {
        bs = s;
        best = w;
      }
    }
    return [best.x, best.z];
  }

  farFrom(P) {
    let best = this.world.waypoints[0], bd = 0;
    for (const w of this.world.waypoints) {
      const d = w.distanceTo(P);
      if (d > bd) {
        bd = d;
        best = w;
      }
    }
    return [best.x, best.z];
  }

  stun(sec = 5) {
    this.stunT = sec;
    this.setState('stunned');
  }

  // ---------- Kemik oynatma: baş dönmesi, seğirme, konuşma ----------
  morph(name, v) {
    for (const m of this.meshes) {
      const i = m.morphTargetDictionary[name];
      if (i !== undefined) m.morphTargetInfluences[i] = v;
    }
  }

  animate(dt, t, ctx) {
    if (!this.mixer) return;
    this.mixer.update(dt);
    // köşede: gövde duvara dönük, baş oyuncuya kadar döner (çok fazla)
    if (this.state === 'corner' && this.lookAt) this.headTwistTarget = this.cornerLook ? 1 : 0;
    if (this.state === 'script' || this.state === 'collapsed') this.headTwistTarget = 0;
    this.headTwist += (this.headTwistTarget - this.headTwist) * Math.min(1, dt * (this.headTwistTarget > this.headTwist ? 1.6 : 3));

    // ani seğirmeler (yalnız cin tutmuşken)
    if (this.possessed) {
      this.twitchT -= dt;
      if (this.twitchT < 0) {
        this.twitchT = 0.6 + Math.random() * 2.4;
        this.twitch = 1;
        this.twitchAxis = Math.random() < 0.5 ? -1 : 1;
      }
      this.twitch = Math.max(0, this.twitch - dt * 9);
    } else this.twitch = 0;

    if (this.head) {
      let yawOff = 0, roll = 0, pitch = 0;
      if (this.headTwist > 0.001) {
        if (this.state === 'corner' && this.lookAt) {
          // oyuncuya doğru, gövdeye göre en fazla 170°
          const hp = new THREE.Vector3();
          this.head.updateWorldMatrix(true, false);
          this.head.getWorldPosition(hp);
          let a = Math.atan2(this.lookAt.x - hp.x, this.lookAt.z - hp.z) - this.yaw;
          a = Math.atan2(Math.sin(a), Math.cos(a));
          yawOff = THREE.MathUtils.clamp(a, -2.0, 2.0) * this.headTwist;
        } else yawOff = Math.PI * 0.7 * this.headTwist * (this.twistSide || 1);
      }
      if (this.possessed) {
        roll = 0.35 + this.twitch * 0.5 * this.twitchAxis + Math.sin(t * 1.7) * 0.05;
        pitch = this.twitch * 0.25 * this.twitchAxis;
      }
      if (yawOff || roll || pitch) {
        // karışım (mixer) yerel pozu yeni yazdı: dünya matrislerini tazele, yoksa dönüş her karede birikir
        this.head.updateWorldMatrix(true, false);
        const wq = new THREE.Quaternion();
        this.head.getWorldQuaternion(wq);
        const fwdYaw = this.yaw + yawOff;
        const fwd = new THREE.Vector3(Math.sin(fwdYaw), 0, Math.cos(fwdYaw));
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawOff);
        q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), roll));
        q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(fwd.z, 0, -fwd.x), pitch));
        const pq = new THREE.Quaternion();
        this.head.parent.getWorldQuaternion(pq);
        this.head.quaternion.copy(pq.invert().multiply(q.multiply(wq)));
      }
    }
    // dudak ve yüz
    const target = this.speaking ? 0.4 + 0.35 * Math.sin(t * 17) : 0;
    this.talk += (target - this.talk) * Math.min(1, dt * 16);
    this.visT = (this.visT || 0) - dt;
    if (this.visT < 0) {
      this.visT = 0.08 + Math.random() * 0.08;
      this.visIdx = Math.floor(Math.random() * VIS.length);
    }
    for (let i = 0; i < VIS.length; i++) this.morph(VIS[i], i === this.visIdx ? this.talk * 0.8 : 0);
    const pz = this.possessed ? 1 : 0;
    this.morph('AK_21_EyeWideLeft', pz * 0.9);
    this.morph('AK_22_EyeWideRight', pz * 0.9);
    this.morph('AK_25_JawOpen', this.talk * 0.25 + pz * (0.15 + this.twitch * 0.4));
    this.morph('AK_44_MouthSmileLeft', pz * 0.35);
    this.morph('AK_01_BrowDownLeft', pz * 0.6);
    this.morph('AK_02_BrowDownRight', pz * 0.6);
    this.morph('AK_09_EyeBlinkLeft', 0);
    this.morph('AK_10_EyeBlinkRight', 0);
  }
}

// Islak ayak izleri: tek bir InstancedMesh, yavaşça kuruyup silinir
function makePrints(scene) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(255,255,255,0)';
  x.fillRect(0, 0, 64, 128);
  x.fillStyle = '#fff';
  // topuk ve taban
  x.beginPath();
  x.ellipse(32, 98, 15, 20, 0, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.ellipse(33, 55, 17, 24, -0.08, 0, Math.PI * 2);
  x.fill();
  // parmaklar
  [[20, 22, 6], [29, 16, 6.5], [38, 15, 6], [46, 19, 5.5], [52, 26, 5]].forEach(([px, py, r]) => {
    x.beginPath();
    x.arc(px, py, r, 0, Math.PI * 2);
    x.fill();
  });
  const tex = new THREE.CanvasTexture(c);
  const N = 90;
  const geo = new THREE.PlaneGeometry(0.12, 0.25);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a1612, transparent: true, alphaMap: tex, opacity: 0.75, roughness: 0.08, metalness: 0.2, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.renderOrder = 2;
  scene.add(mesh);
  const items = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let head = 0;
  return {
    mesh,
    add(px, pz, yaw, left) {
      const it = { x: px, z: pz, yaw, left, age: 0 };
      if (items.length < N) items.push(it);
      else items[head++ % N] = it;
    },
    clear() {
      items.length = 0;
      mesh.count = 0;
    },
    update(dt) {
      let k = 0;
      for (const it of items) {
        it.age += dt;
        const life = Math.max(0, 1 - it.age / 40);
        if (life <= 0) continue;
        q.setFromAxisAngle(up, it.yaw);
        s.set(it.left ? -life * 0.3 - 0.7 : life * 0.3 + 0.7, 1, life * 0.3 + 0.7);
        p.set(it.x, 0.008, it.z);
        m4.compose(p, q, s);
        mesh.setMatrixAt(k++, m4);
      }
      mesh.count = k;
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
